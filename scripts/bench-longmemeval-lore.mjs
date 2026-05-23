#!/usr/bin/env node
/**
 * Lore LongMemEval-S retrieval benchmark.
 *
 * This runner follows the AgentMemory LongMemEval-S retrieval-only protocol:
 * each question builds a fresh index from its haystack sessions, searches with
 * the question text, and scores whether any gold session id appears in top-K.
 *
 * It is intentionally offline and public-safe. It does not call production and
 * does not use an LLM judge. The retrieval adapter uses Lore v12 weighted RRF
 * fusion with a Postgres-FTS-like lexical stream and an offline TF-IDF cosine
 * stream standing in for pgvector/dense retrieval so the scoring loop can be
 * reproduced without API keys or a model server.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const {
  fuseWeightedRRF,
  DEFAULT_STREAM_WEIGHTS
} = await import(join(ROOT, "packages/search/dist/index.js")).catch((error) => {
  console.error("ERROR: @lore/search dist not found. Run: pnpm --filter @lore/search build");
  console.error(String(error));
  process.exit(1);
});

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can",
  "could", "did", "do", "does", "for", "from", "had", "has", "have", "he",
  "her", "hers", "him", "his", "i", "if", "in", "into", "is", "it", "its",
  "me", "my", "of", "on", "or", "our", "ours", "she", "so", "that", "the",
  "their", "them", "then", "there", "they", "this", "to", "was", "we",
  "were", "what", "when", "where", "which", "who", "whom", "why", "will",
  "with", "would", "you", "your", "yours"
]);

const args = parseArgs(process.argv.slice(2));
const datasetPath = String(args.dataset ?? join(ROOT, "data/bench/longmemeval/longmemeval_s_cleaned.json"));
const outputDir = String(args.outputDir ?? join(ROOT, "data/bench/longmemeval"));
const mode = String(args.mode ?? "hybrid");
const limit = args.limit ? Number(args.limit) : undefined;
const candidateLimit = args.candidateLimit ? Number(args.candidateLimit) : 20;
const topK = Math.max(20, Number(args.k ?? 20));

if (!["fts", "dense", "hybrid"].includes(mode)) {
  throw new Error("--mode must be one of: fts, dense, hybrid");
}
if (!existsSync(datasetPath)) {
  throw new Error(`dataset missing at ${datasetPath}`);
}

const raw = JSON.parse(await readFile(datasetPath, "utf8"));
const abstentionTypes = new Set([
  "single-session-user_abs",
  "multi-session_abs",
  "knowledge-update_abs",
  "temporal-reasoning_abs"
]);
const entries = raw
  .filter((entry) => !abstentionTypes.has(entry.question_type))
  .slice(0, limit ?? raw.length);

console.log(`Lore LongMemEval-S benchmark`);
console.log(`dataset=${datasetPath}`);
console.log(`mode=${mode} questions=${entries.length} candidateLimit=${candidateLimit}`);

const results = [];
const totalStarted = performance.now();

for (let i = 0; i < entries.length; i += 1) {
  const entry = entries[i];
  const sessions = entry.haystack_sessions.map((turns, idx) => ({
    sessionId: entry.haystack_session_ids[idx],
    itemId: `session:${entry.haystack_session_ids[idx]}`,
    chunkId: `chunk:${entry.haystack_session_ids[idx]}`,
    text: sessionToText(turns)
  }));

  const started = performance.now();
  const rankedSessionIds = retrieve(entry.question, sessions, {
    mode,
    candidateLimit,
    topK
  });
  const latencyMs = performance.now() - started;
  const gold = new Set(entry.answer_session_ids);

  const result = {
    question_id: entry.question_id,
    question_type: entry.question_type,
    recall_any_at_5: recallAny(rankedSessionIds, entry.answer_session_ids, 5),
    recall_any_at_10: recallAny(rankedSessionIds, entry.answer_session_ids, 10),
    recall_any_at_20: recallAny(rankedSessionIds, entry.answer_session_ids, 20),
    ndcg_at_10: ndcg(rankedSessionIds, gold, 10),
    mrr: reciprocalRank(rankedSessionIds, gold),
    latency_ms: latencyMs,
    retrieved_session_ids: rankedSessionIds.slice(0, 10),
    gold_session_ids: entry.answer_session_ids
  };
  results.push(result);

  if ((i + 1) % 50 === 0 || i + 1 === entries.length) {
    const running = summarize(results);
    console.log(
      `[${i + 1}/${entries.length}] R@5=${pct(running.recall_any_at_5)} R@10=${pct(running.recall_any_at_10)} MRR=${pct(running.mrr)} p95=${Math.round(running.latency_p95_ms)}ms`
    );
  }
}

const summary = summarize(results);
const byType = summarizeByType(results);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputJson = join(outputDir, `lore-longmemeval-s-${mode}-${stamp}.json`);
const latestJson = join(outputDir, `latest-lore-longmemeval-s-${mode}.json`);
const outputMd = join(outputDir, `lore-longmemeval-s-${mode}-${stamp}.md`);
const latestMd = join(outputDir, `latest-lore-longmemeval-s-${mode}.md`);

await mkdir(outputDir, { recursive: true });
const payload = {
  system: "Lore v1.2 local retrieval adapter",
  mode,
  dataset: {
    name: "LongMemEval-S cleaned",
    source: "xiaowu0162/longmemeval-cleaned",
    path: datasetPath,
    raw_questions: raw.length,
    evaluated_questions: entries.length,
    abstention_excluded: raw.length - raw.filter((entry) => !abstentionTypes.has(entry.question_type)).length
  },
  methodology: {
    metric: "retrieval-only recall_any@K",
    fresh_index_per_question: true,
    session_granularity: true,
    lore_components: [
      "packages/search fuseWeightedRRF",
      "postgres_fts-like lexical stream",
      "postgres_pgvector-like offline tf-idf cosine stream"
    ]
  },
  summary,
  per_type: byType,
  per_question: results,
  elapsed_ms: performance.now() - totalStarted
};

const json = `${JSON.stringify(payload, null, 2)}\n`;
await writeFile(outputJson, json);
await writeFile(latestJson, json);
const markdown = renderMarkdown(payload);
await writeFile(outputMd, markdown);
await writeFile(latestMd, markdown);

console.log(`\n=== Lore LongMemEval-S (${mode}) ===`);
console.log(`Questions: ${entries.length}`);
console.log(`Recall@5:  ${pct(summary.recall_any_at_5)}`);
console.log(`Recall@10: ${pct(summary.recall_any_at_10)}`);
console.log(`Recall@20: ${pct(summary.recall_any_at_20)}`);
console.log(`NDCG@10:   ${pct(summary.ndcg_at_10)}`);
console.log(`MRR:       ${pct(summary.mrr)}`);
console.log(`Latency:   avg=${Math.round(summary.latency_avg_ms)}ms p50=${Math.round(summary.latency_p50_ms)}ms p95=${Math.round(summary.latency_p95_ms)}ms`);
console.log(`JSON:      ${outputJson}`);
console.log(`Markdown:  ${outputMd}`);

function retrieve(query, sessions, options) {
  const queryTerms = tokenize(query);
  const docs = sessions.map((session) => ({
    ...session,
    terms: tokenize(session.text)
  }));
  const df = documentFrequency(docs);
  const streams = [];

  if (options.mode === "fts" || options.mode === "hybrid") {
    streams.push({
      kind: "postgres_fts",
      backend: "lore-longmemeval-lexical",
      weight: DEFAULT_STREAM_WEIGHTS.postgres_fts,
      candidates: lexicalRank(queryTerms, docs, df, options.candidateLimit)
    });
  }

  if (options.mode === "dense" || options.mode === "hybrid") {
    streams.push({
      kind: "postgres_pgvector",
      backend: "lore-longmemeval-tfidf-cosine",
      weight: DEFAULT_STREAM_WEIGHTS.postgres_pgvector,
      candidates: tfidfCosineRank(queryTerms, docs, df, options.candidateLimit)
    });
  }

  const hits = fuseWeightedRRF({ streams, limit: options.topK });
  return hits.map((hit) => hit.itemId.replace(/^session:/, ""));
}

function lexicalRank(queryTerms, docs, df, limit) {
  const avgDocLen = docs.reduce((sum, doc) => sum + doc.terms.length, 0) / Math.max(1, docs.length);
  const querySet = new Set(queryTerms);
  const scored = docs.map((doc) => {
    const tf = termFrequency(doc.terms);
    let score = 0;
    for (const term of querySet) {
      score += bm25(term, tf.get(term) ?? 0, doc.terms.length, avgDocLen, docs.length, df.get(term) ?? 0);
    }
    score += phraseBoost(queryTerms, doc.text);
    return { itemId: doc.itemId, chunkId: doc.chunkId, score };
  });
  return scored
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.itemId.localeCompare(b.itemId))
    .slice(0, limit);
}

function tfidfCosineRank(queryTerms, docs, df, limit) {
  const queryVector = tfidfVector(queryTerms, queryTerms, df, docs.length);
  const scored = docs.map((doc) => ({
    itemId: doc.itemId,
    chunkId: doc.chunkId,
    score: cosine(queryVector, tfidfVector(doc.terms, queryTerms, df, docs.length))
  }));
  return scored
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.itemId.localeCompare(b.itemId))
    .slice(0, limit);
}

function tfidfVector(terms, vocabularyTerms, df, docCount) {
  const tf = termFrequency(terms);
  const vec = new Map();
  for (const term of new Set(vocabularyTerms)) {
    const freq = tf.get(term) ?? 0;
    if (freq === 0) continue;
    const idf = Math.log(1 + (docCount - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5));
    vec.set(term, (1 + Math.log(freq)) * idf);
  }
  return vec;
}

function cosine(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const value of a.values()) normA += value * value;
  for (const value of b.values()) normB += value * value;
  for (const [key, value] of a) dot += value * (b.get(key) ?? 0);
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

function bm25(term, freq, docLen, avgDocLen, docCount, docFreq) {
  if (freq <= 0) return 0;
  const k1 = 1.5;
  const b = 0.75;
  const idf = Math.log(1 + (docCount - docFreq + 0.5) / (docFreq + 0.5));
  return idf * ((freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (docLen / Math.max(1, avgDocLen)))));
}

function phraseBoost(queryTerms, text) {
  if (queryTerms.length < 2) return 0;
  const normalised = ` ${tokenize(text).join(" ")} `;
  let score = 0;
  for (let n = Math.min(5, queryTerms.length); n >= 2; n -= 1) {
    for (let i = 0; i <= queryTerms.length - n; i += 1) {
      const phrase = ` ${queryTerms.slice(i, i + n).join(" ")} `;
      if (normalised.includes(phrase)) score += n * 0.08;
    }
  }
  return score;
}

function documentFrequency(docs) {
  const df = new Map();
  for (const doc of docs) {
    for (const term of new Set(doc.terms)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  return df;
}

function termFrequency(terms) {
  const tf = new Map();
  for (const term of terms) tf.set(term, (tf.get(term) ?? 0) + 1);
  return tf;
}

function tokenize(value) {
  return String(value)
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .match(/[a-z0-9]+/g)?.map(stem).filter((term) => term.length > 1 && !STOPWORDS.has(term)) ?? [];
}

function stem(term) {
  if (term.length > 5 && term.endsWith("ies")) return `${term.slice(0, -3)}y`;
  if (term.length > 6 && term.endsWith("ing")) return term.slice(0, -3);
  if (term.length > 5 && term.endsWith("ed")) return term.slice(0, -2);
  if (term.length > 4 && term.endsWith("es")) return term.slice(0, -2);
  if (term.length > 4 && term.endsWith("s")) return term.slice(0, -1);
  return term;
}

function sessionToText(turns) {
  return turns.map((turn) => `${turn.role}: ${turn.content}`).join("\n");
}

function recallAny(retrievedSessionIds, goldSessionIds, k) {
  const topK = new Set(retrievedSessionIds.slice(0, k));
  return goldSessionIds.some((sessionId) => topK.has(sessionId)) ? 1 : 0;
}

function dcg(relevances, k) {
  let sum = 0;
  for (let i = 0; i < Math.min(k, relevances.length); i += 1) {
    sum += (relevances[i] ? 1 : 0) / Math.log2(i + 2);
  }
  return sum;
}

function ndcg(retrievedSessionIds, goldSessionIds, k) {
  const rels = retrievedSessionIds.slice(0, k).map((id) => goldSessionIds.has(id));
  const idealRels = Array.from({ length: Math.min(k, goldSessionIds.size) }, () => true);
  const ideal = dcg(idealRels, k);
  return ideal === 0 ? 0 : dcg(rels, k) / ideal;
}

function reciprocalRank(retrievedSessionIds, goldSessionIds) {
  for (let i = 0; i < retrievedSessionIds.length; i += 1) {
    if (goldSessionIds.has(retrievedSessionIds[i])) return 1 / (i + 1);
  }
  return 0;
}

function summarize(items) {
  const latencies = items.map((item) => item.latency_ms).sort((a, b) => a - b);
  return {
    questions: items.length,
    recall_any_at_5: mean(items.map((item) => item.recall_any_at_5)),
    recall_any_at_10: mean(items.map((item) => item.recall_any_at_10)),
    recall_any_at_20: mean(items.map((item) => item.recall_any_at_20)),
    ndcg_at_10: mean(items.map((item) => item.ndcg_at_10)),
    mrr: mean(items.map((item) => item.mrr)),
    latency_avg_ms: mean(latencies),
    latency_p50_ms: percentile(latencies, 50),
    latency_p95_ms: percentile(latencies, 95)
  };
}

function summarizeByType(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.question_type)) groups.set(item.question_type, []);
    groups.get(item.question_type).push(item);
  }
  return Object.fromEntries([...groups].map(([type, group]) => [type, summarize(group)]));
}

function mean(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const idx = Math.min(sortedValues.length - 1, Math.ceil((p / 100) * sortedValues.length) - 1);
  return sortedValues[idx];
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function renderMarkdown(payload) {
  const rows = Object.entries(payload.per_type)
    .sort((a, b) => b[1].questions - a[1].questions)
    .map(([type, s]) => `| ${type} | ${s.questions} | ${pct(s.recall_any_at_5)} | ${pct(s.recall_any_at_10)} | ${pct(s.mrr)} | ${Math.round(s.latency_p95_ms)} ms |`)
    .join("\n");
  return `# Lore LongMemEval-S Retrieval Benchmark

Date: ${new Date().toISOString()}

Method: retrieval-only \`recall_any@K\`, same session-hit definition used by AgentMemory's LongMemEval-S benchmark. Abstention question types are excluded. Each question builds a fresh session-level index from its haystack sessions.

System: ${payload.system}

Mode: \`${payload.mode}\`

| Metric | Value |
|---|---:|
| Questions | ${payload.summary.questions} |
| Recall@5 | ${pct(payload.summary.recall_any_at_5)} |
| Recall@10 | ${pct(payload.summary.recall_any_at_10)} |
| Recall@20 | ${pct(payload.summary.recall_any_at_20)} |
| NDCG@10 | ${pct(payload.summary.ndcg_at_10)} |
| MRR | ${pct(payload.summary.mrr)} |
| Avg latency | ${Math.round(payload.summary.latency_avg_ms)} ms |
| P50 latency | ${Math.round(payload.summary.latency_p50_ms)} ms |
| P95 latency | ${Math.round(payload.summary.latency_p95_ms)} ms |

## By Type

| Type | Count | Recall@5 | Recall@10 | MRR | P95 |
|---|---:|---:|---:|---:|---:|
${rows}

## Notes

- This is not the official LongMemEval QA score; it is retrieval recall over LongMemEval-S haystacks.
- This offline adapter uses Lore v12 RRF fusion from \`@lore/search\`.
- The dense stream is an offline TF-IDF cosine stream, not the production Qwen3 embedding endpoint.
`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [key, inline] = arg.slice(2).split("=", 2);
    if (inline !== undefined) parsed[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) parsed[key] = argv[++i];
    else parsed[key] = true;
  }
  return parsed;
}
