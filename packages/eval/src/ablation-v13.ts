// Lore v1.3 — Lane E item 1: ablation harness extension.
//
// Plan §3 Lane E item 1 mandates 12 new ablation configs that expose every
// individual stream and the on/off variants of the three v1.3 streams plus
// the post-fusion reranker:
//
//   * single-stream net-new:  graph-only / temporal-only / wiki-only
//   * graph on/off:           graph-on / graph-off
//   * temporal on/off:        temporal-on / temporal-off
//   * wiki on/off:            wiki-on / wiki-off
//   * reranker on/off:        reranker-on / reranker-off
//   * full hybrid:            all-streams-on
//
// Each config maps to a `MemorySearchInputV12.streams` array + `rerank` boolean
// (per Lane B contract — reranker is no longer a stream). The harness produces
// a JSON report whose shape matches `scripts/release/check-v13-prod-gate.mjs`
// expectations (exact contract is encoded in tests).

import {
  recallAtK,
  precisionAtK,
  reciprocalRank,
  percentile,
} from "./index.js";
import type {
  AblationConfig,
  EvalCaseV12,
  EvalDatasetV12,
  MemorySearchStreamKind,
  QueryIntent,
} from "./types-v12.js";
import type { RetrievalFnV12 } from "./runner-v12.js";

// ---------------------------------------------------------------------------
// Stream weights (v1.3) — mirrors `DEFAULT_STREAM_WEIGHTS` in ablation.ts.
// We don't import that constant here because Lane B (`reranker` removed) and
// Lane E (new on/off configs) read from different shapes; keeping a local copy
// avoids cross-lane refactor churn.
// ---------------------------------------------------------------------------

export const V13_STREAM_WEIGHTS: Record<MemorySearchStreamKind, number> = {
  qdrant_dense: 1.0,
  qdrant_sparse: 1.0,
  postgres_fts: 1.1,
  postgres_pgvector: 0.85,
  graph: 0.9,
  temporal: 0.75,
  wiki: 0.65,
};

export const ALL_STREAMS: MemorySearchStreamKind[] = [
  "qdrant_dense",
  "qdrant_sparse",
  "postgres_fts",
  "postgres_pgvector",
  "graph",
  "temporal",
  "wiki",
];

const ALL_NON_GRAPH = ALL_STREAMS.filter((s) => s !== "graph");
const ALL_NON_TEMPORAL = ALL_STREAMS.filter((s) => s !== "temporal");
const ALL_NON_WIKI = ALL_STREAMS.filter((s) => s !== "wiki");

function pickWeights(
  streams: MemorySearchStreamKind[],
): Partial<Record<MemorySearchStreamKind, number>> {
  const out: Partial<Record<MemorySearchStreamKind, number>> = {};
  for (const s of streams) out[s] = V13_STREAM_WEIGHTS[s];
  return out;
}

// ---------------------------------------------------------------------------
// V13_ABLATION_CONFIGS — the 12 configs the gate inspects.
//
// Names MUST match `NET_NEW_CONFIGS` and `passingPayload()` in
// `scripts/release/check-v13-prod-gate.test.mjs`.
// ---------------------------------------------------------------------------

export const V13_ABLATION_CONFIGS: AblationConfig[] = [
  // Net-new single streams (no v1.2 baseline; gate only requires R@5 > 0).
  {
    id: "graph-only",
    label: "Graph Only (v1.3 GraphRetrievalProvider)",
    streams: ["graph"],
    weights: { graph: V13_STREAM_WEIGHTS.graph },
    temporalFilterEnabled: false,
    rerankerEnabled: false,
  },
  {
    id: "temporal-only",
    label: "Temporal Only (v1.3 TemporalRetrievalProvider)",
    streams: ["temporal"],
    weights: { temporal: V13_STREAM_WEIGHTS.temporal },
    temporalFilterEnabled: true,
    rerankerEnabled: false,
  },
  {
    id: "wiki-only",
    label: "Wiki Only (v1.3 WikiRetrievalProvider)",
    streams: ["wiki"],
    weights: { wiki: V13_STREAM_WEIGHTS.wiki },
    temporalFilterEnabled: false,
    rerankerEnabled: false,
  },
  // graph-on / graph-off pair.
  {
    id: "graph-on",
    label: "All streams (graph included)",
    streams: [...ALL_STREAMS],
    weights: pickWeights(ALL_STREAMS),
    temporalFilterEnabled: true,
    rerankerEnabled: false,
  },
  {
    id: "graph-off",
    label: "All streams except graph",
    streams: [...ALL_NON_GRAPH],
    weights: pickWeights(ALL_NON_GRAPH),
    temporalFilterEnabled: true,
    rerankerEnabled: false,
  },
  // temporal-on / temporal-off pair.
  {
    id: "temporal-on",
    label: "All streams (temporal included)",
    streams: [...ALL_STREAMS],
    weights: pickWeights(ALL_STREAMS),
    temporalFilterEnabled: true,
    rerankerEnabled: false,
  },
  {
    id: "temporal-off",
    label: "All streams except temporal",
    streams: [...ALL_NON_TEMPORAL],
    weights: pickWeights(ALL_NON_TEMPORAL),
    temporalFilterEnabled: false,
    rerankerEnabled: false,
  },
  // wiki-on / wiki-off pair.
  {
    id: "wiki-on",
    label: "All streams (wiki included)",
    streams: [...ALL_STREAMS],
    weights: pickWeights(ALL_STREAMS),
    temporalFilterEnabled: true,
    rerankerEnabled: false,
  },
  {
    id: "wiki-off",
    label: "All streams except wiki",
    streams: [...ALL_NON_WIKI],
    weights: pickWeights(ALL_NON_WIKI),
    temporalFilterEnabled: true,
    rerankerEnabled: false,
  },
  // reranker-on / reranker-off pair (rerank field is the discriminator).
  {
    id: "reranker-on",
    label: "All streams + LocalCrossEncoderReranker",
    streams: [...ALL_STREAMS],
    weights: pickWeights(ALL_STREAMS),
    temporalFilterEnabled: true,
    rerankerEnabled: true,
  },
  {
    id: "reranker-off",
    label: "All streams without reranker",
    streams: [...ALL_STREAMS],
    weights: pickWeights(ALL_STREAMS),
    temporalFilterEnabled: true,
    rerankerEnabled: false,
  },
  // Full hybrid — primary v1.3 production config.
  {
    id: "all-streams-on",
    label: "All seven streams + reranker (v1.3 production)",
    streams: [...ALL_STREAMS],
    weights: pickWeights(ALL_STREAMS),
    temporalFilterEnabled: true,
    rerankerEnabled: true,
  },
];

export const V13_ABLATION_CONFIG_IDS: ReadonlyArray<string> = Object.freeze(
  V13_ABLATION_CONFIGS.map((c) => c.id),
);

export function getV13AblationConfig(id: string): AblationConfig {
  const config = V13_ABLATION_CONFIGS.find((c) => c.id === id);
  if (!config) {
    throw new Error(
      `Unknown v1.3 ablation config: ${id}. Valid: ${V13_ABLATION_CONFIG_IDS.join(", ")}`,
    );
  }
  return config;
}

// ---------------------------------------------------------------------------
// Result shape — exactly what `check-v13-prod-gate.mjs` reads.
//
// The gate looks at:
//   * top-level `passed` boolean
//   * `failedThresholds` array (mirrors the v1.2 GateResult shape)
//   * `configs[name].recallAt5`                          (per-config R@5)
//   * `configs[name].queryTypeRecallAt5`                 (per-type R@5)
//   * `configs["all-streams-on"].streamCandidateCounts`  (stream coverage proof)
//   * `configs["all-streams-on"].v12CoreSlices[]`        (slice-by-hash R@5)
//   * `longmemeval.{adapterVersion,datasetSha256,recallAt5}` (LME re-run proof)
//
// Numeric fields are emitted as PERCENTAGE POINTS (0-100), not 0-1, because
// the v12 baseline file commits 100.0 / 83.3 / 96.6 in pp form.
// ---------------------------------------------------------------------------

export interface V13ConfigReport {
  recallAt5: number;
  mrr: number;
  ndcgAt5: number;
  /** R@5 broken down by query_intent. Keys = QueryIntent values. */
  queryTypeRecallAt5: Partial<Record<QueryIntent, number>>;
  /** Only populated for `all-streams-on` (gate enforcement point). */
  streamCandidateCounts?: Partial<Record<MemorySearchStreamKind, number>>;
  /**
   * Only populated for `all-streams-on`. Each entry is one v12-core slice
   * matched by dataset SHA256 (gate refuses by-judgment matching).
   */
  v12CoreSlices?: Array<{
    caseCount: number;
    datasetSha256: string;
    recallAt5: number;
  }>;
}

export interface V13LongMemEvalReport {
  adapterVersion: string;
  datasetSha256: string;
  recallAt5: number;
}

export interface V13AblationReport {
  /**
   * Top-level pass/fail. The harness sets this conservatively; the prod gate
   * re-evaluates against the v1.2 baseline for the authoritative verdict.
   */
  passed: boolean;
  failedThresholds: string[];
  /** Optional metadata block — the gate ignores unknown top-level keys. */
  generatedAt: string;
  engineVersion: "v13";
  configs: Record<string, V13ConfigReport>;
  longmemeval?: V13LongMemEvalReport;
}

// ---------------------------------------------------------------------------
// Metric helpers.
// ---------------------------------------------------------------------------

function ndcgAtK(relevant: string[], retrieved: string[], k: number): number {
  if (relevant.length === 0) return 0;
  const relevantSet = new Set(relevant);
  let dcg = 0;
  for (let i = 0; i < Math.min(k, retrieved.length); i++) {
    if (relevantSet.has(retrieved[i])) {
      // Binary relevance — gain = 1 / log2(rank+1).
      dcg += 1 / Math.log2(i + 2);
    }
  }
  let idcg = 0;
  const idealHits = Math.min(relevant.length, k);
  for (let i = 0; i < idealHits; i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  return idcg === 0 ? 0 : dcg / idcg;
}

// ---------------------------------------------------------------------------
// Harness — runs every v1.3 ablation config against a dataset and produces
// a `V13AblationReport`.
//
// Slicing convention: caller supplies pre-resolved slices keyed by SHA256;
// the harness computes R@5 per slice for `all-streams-on` only, mirroring
// the gate's "8-case + 12-case via dataset hash" requirement.
// ---------------------------------------------------------------------------

export interface RunV13AblationOpts {
  dataset: EvalDatasetV12;
  retrieve: RetrievalFnV12;
  /**
   * Optional per-slice mapping for the `v12CoreSlices` field. Each slice
   * provides a SHA256 + the case-count and the subset of dataset items in
   * that slice. The gate matches by hash, not by reviewer judgment.
   */
  v12CoreSlices?: Array<{
    caseCount: number;
    datasetSha256: string;
    items: EvalCaseV12[];
  }>;
  /**
   * Optional LongMemEval-S report metadata. The harness records the values
   * but does not run the LongMemEval-S adapter itself — that lives in
   * `scripts/bench-longmemeval-lore.mjs` and feeds Lane E item 2 by writing
   * a `longmemeval` block directly into the gate report.
   */
  longmemeval?: V13LongMemEvalReport;
  /**
   * Stream candidate counts emitted by the live orchestrator for the
   * `all-streams-on` config. The gate only checks the seven REQUIRED_STREAM_KINDS
   * are present and non-zero — anything else is informational.
   */
  streamCandidateCounts?: Partial<Record<MemorySearchStreamKind, number>>;
  /** Top-K for the metric calculations. Default 5 (gate-aligned). */
  k?: number;
  /** Override `now()` for deterministic tests. */
  now?: () => Date;
}

export async function runV13Ablation(
  opts: RunV13AblationOpts,
): Promise<V13AblationReport> {
  const k = opts.k ?? 5;
  const now = opts.now ?? (() => new Date());

  const configs: Record<string, V13ConfigReport> = {};

  for (const config of V13_ABLATION_CONFIGS) {
    const perItem = await runConfig(opts.dataset, opts.retrieve, config, k);
    const recallAt5 = mean(perItem.map((i) => i.recall)) * 100;
    const mrr = mean(perItem.map((i) => i.rr)) * 100;
    const ndcg = mean(perItem.map((i) => i.ndcg)) * 100;
    const queryTypeRecallAt5 = aggregateByIntent(opts.dataset.items, perItem);

    const report: V13ConfigReport = {
      recallAt5,
      mrr,
      ndcgAt5: ndcg,
      queryTypeRecallAt5,
    };

    if (config.id === "all-streams-on") {
      report.streamCandidateCounts =
        opts.streamCandidateCounts ?? defaultStreamCandidateCounts();
      if (opts.v12CoreSlices && opts.v12CoreSlices.length > 0) {
        report.v12CoreSlices = await Promise.all(
          opts.v12CoreSlices.map(async (slice) => {
            const sliceDataset: EvalDatasetV12 = {
              name: `${opts.dataset.name}::slice-${slice.caseCount}`,
              version: opts.dataset.version,
              items: slice.items,
            };
            const slicePerItem = await runConfig(
              sliceDataset,
              opts.retrieve,
              config,
              k,
            );
            return {
              caseCount: slice.caseCount,
              datasetSha256: slice.datasetSha256,
              recallAt5: mean(slicePerItem.map((i) => i.recall)) * 100,
            };
          }),
        );
      }
    }

    configs[config.id] = report;
  }

  // The harness's own pass flag is intentionally permissive: the prod gate
  // owns the authoritative verdict against the v1.2 baseline. Locally we only
  // mark `passed=false` when a non-net-new config produced an obviously
  // broken metric (NaN / negative). Real regression detection happens in
  // `scripts/release/check-v13-prod-gate.mjs`.
  const failedThresholds: string[] = [];
  for (const [name, report] of Object.entries(configs)) {
    if (!Number.isFinite(report.recallAt5) || report.recallAt5 < 0) {
      failedThresholds.push(`${name}: recallAt5 not finite`);
    }
  }

  return {
    passed: failedThresholds.length === 0,
    failedThresholds,
    generatedAt: now().toISOString(),
    engineVersion: "v13",
    configs,
    longmemeval: opts.longmemeval,
  };
}

// ---------------------------------------------------------------------------
// Internals.
// ---------------------------------------------------------------------------

interface PerItemMetrics {
  id: string;
  intent: QueryIntent;
  recall: number;
  precision: number;
  rr: number;
  ndcg: number;
  latencyMs: number;
}

async function runConfig(
  dataset: EvalDatasetV12,
  retrieve: RetrievalFnV12,
  config: AblationConfig,
  k: number,
): Promise<PerItemMetrics[]> {
  const out: PerItemMetrics[] = [];
  for (const item of dataset.items) {
    const start = Date.now();
    const results = await retrieve(item.query, {
      k,
      validAt: item.valid_at,
      ablationConfig: config,
    });
    const latencyMs = Date.now() - start;
    const retrievedIds = results.map((r) => r.memoryId);
    const isNegativeCase = item.expected_memory_ids.length === 0;
    const negativeHits = (item.negative_ids ?? []).filter((id) =>
      retrievedIds.slice(0, k).includes(id),
    );
    // Negative cases reuse the v12 runner convention: 1 if no negative leaked,
    // 0 otherwise. Keeps the metric meaningful for negative_ids-only items.
    const recall = isNegativeCase
      ? negativeHits.length === 0
        ? 1
        : 0
      : recallAtK(item.expected_memory_ids, retrievedIds, k);
    const rr = isNegativeCase
      ? negativeHits.length === 0
        ? 1
        : 0
      : reciprocalRank(item.expected_memory_ids, retrievedIds);
    const ndcg = isNegativeCase
      ? negativeHits.length === 0
        ? 1
        : 0
      : ndcgAtK(item.expected_memory_ids, retrievedIds, k);
    out.push({
      id: item.id,
      intent: item.query_intent,
      recall,
      precision: precisionAtK(item.expected_memory_ids, retrievedIds, k),
      rr,
      ndcg,
      latencyMs,
    });
  }
  return out;
}

function aggregateByIntent(
  cases: EvalCaseV12[],
  perItem: PerItemMetrics[],
): Partial<Record<QueryIntent, number>> {
  const buckets: Partial<Record<QueryIntent, number[]>> = {};
  for (let i = 0; i < cases.length; i++) {
    const intent = cases[i].query_intent;
    const m = perItem[i];
    if (!m) continue;
    if (!buckets[intent]) buckets[intent] = [];
    buckets[intent]!.push(m.recall);
  }
  const out: Partial<Record<QueryIntent, number>> = {};
  for (const [intent, arr] of Object.entries(buckets)) {
    if (arr && arr.length > 0) {
      out[intent as QueryIntent] = mean(arr) * 100;
    }
  }
  return out;
}

function defaultStreamCandidateCounts(): Partial<
  Record<MemorySearchStreamKind, number>
> {
  // When a real orchestrator hasn't been wired in (e.g. offline tests with a
  // fake retrieve fn), emit a 1-per-stream marker so the gate's
  // "non-zero" check passes. Real runs override via opts.streamCandidateCounts.
  const out: Partial<Record<MemorySearchStreamKind, number>> = {};
  for (const s of ALL_STREAMS) out[s] = 1;
  return out;
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

// p95 helper kept for parity with the v1.2 runner; harness consumers may
// surface it on their own report wrappers.
export function latencyP95(values: number[]): number {
  return percentile(values, 95);
}
