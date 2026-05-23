#!/usr/bin/env node
/**
 * run-recipe-shadow.mjs
 *
 * Deterministic local shadow comparison fixture. Runs a shadow comparison
 * between a baseline and candidate ContextRecipeSpec against a fixed
 * in-memory dataset and a deterministic retrieval function.
 *
 * No network, no DB, no live services, no recipe mutation.
 *
 * Usage:
 *   node scripts/eval/run-recipe-shadow.mjs
 *
 * Output: JSON to stdout with baselineRecipeId, candidateRecipeId,
 * datasetSha256, shadowMode, metrics, cost, and rootCauseHints.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// ── Load eval package from build output ──────────────────────────────────────
const pkg = await import(join(ROOT, "packages/eval/dist/index.js")).catch(() => {
  console.error("ERROR: packages/eval dist not found. Run: pnpm --filter @lore/eval build");
  process.exit(1);
});
const { runShadowComparison } = pkg;

// ── Deterministic fixtures ───────────────────────────────────────────────────

const BASELINE_SPEC = {
  id: "default-v209",
  version: "2.0.9",
  label: "Default v2.0.9",
  description: "Default baseline recipe for v2.0.9 production.",
  enabledStreams: ["postgres_fts", "qdrant_dense", "graph", "wiki", "temporal"],
  weights: { postgres_fts: 1.1, qdrant_dense: 1.0, graph: 0.9, wiki: 0.65, temporal: 0.75 },
  temporalFilterEnabled: true,
  rerankerEnabled: false,
  rrfK: 60,
  candidateLimit: 80,
  finalLimit: 10,
};

const CANDIDATE_SPEC = {
  id: "experimental-v210",
  version: "2.1.0",
  label: "Experimental v2.1.0",
  description: "Candidate recipe with more streams and different weights.",
  enabledStreams: ["postgres_fts", "qdrant_dense", "qdrant_sparse", "graph", "wiki", "temporal", "postgres_pgvector"],
  weights: { postgres_fts: 1.2, qdrant_dense: 1.0, qdrant_sparse: 0.9, graph: 0.8, wiki: 0.7, temporal: 0.6, postgres_pgvector: 0.85 },
  temporalFilterEnabled: true,
  rerankerEnabled: true,
  rrfK: 55,
  candidateLimit: 100,
  finalLimit: 15,
};

const NOW = new Date("2026-05-15T00:00:00.000Z");

const DATASET = {
  name: "v209-shadow-fixture",
  version: "1.0.0",
  items: [
    {
      id: "case-001",
      query: "production database config",
      expected_memory_ids: ["mem-001", "mem-002"],
      tags: ["semantic"],
      query_intent: "semantic",
    },
    {
      id: "case-002",
      query: "api key rotation policy",
      expected_memory_ids: ["mem-003"],
      tags: ["keyword"],
      query_intent: "keyword",
    },
    {
      id: "case-003",
      query: "temporal state migration",
      expected_memory_ids: ["mem-004", "mem-005"],
      tags: ["temporal"],
      query_intent: "temporal",
    },
    {
      id: "case-004",
      query: "nonexistent topic",
      expected_memory_ids: [],
      negative_ids: ["mem-099"],
      tags: ["negative"],
      query_intent: "negative",
    },
    {
      id: "case-005",
      query: "graph entity relationships",
      expected_memory_ids: ["mem-006"],
      tags: ["relation"],
      query_intent: "relation",
    },
  ],
};

function makeFakeRetrieve() {
  return async (query, _opts) => {
    const opts = _opts || {};
    const recipeId = opts?.ablationConfig?.id ?? "unknown";
    const k = opts?.k ?? 5;

    // Baseline recipe: perfect retrieval.
    if (recipeId === "default-v209") {
      if (query === "production database config")
        return [{ memoryId: "mem-001", score: 0.95 }, { memoryId: "mem-002", score: 0.90 }];
      if (query === "api key rotation policy")
        return [{ memoryId: "mem-003", score: 0.92 }];
      if (query === "temporal state migration")
        return [{ memoryId: "mem-004", score: 0.88 }, { memoryId: "mem-005", score: 0.85 }];
      if (query === "nonexistent topic")
        return [{ memoryId: "mem-099", score: 0.40 }];
      if (query === "graph entity relationships")
        return [{ memoryId: "mem-006", score: 0.91 }];
      return [];
    }

    // Candidate recipe: better in some areas, worse in others.
    if (recipeId === "experimental-v210") {
      if (query === "production database config")
        return [{ memoryId: "mem-001", score: 0.97 }, { memoryId: "mem-002", score: 0.93 }];
      if (query === "api key rotation policy")
        return [{ memoryId: "mem-003", score: 0.95 }];
      if (query === "temporal state migration")
        return [{ memoryId: "mem-004", score: 0.86 }, { memoryId: "mem-999", score: 0.30 }];
      if (query === "nonexistent topic")
        return [{ memoryId: "mem-099", score: 0.50 }, { memoryId: "mem-098", score: 0.30 }];
      if (query === "graph entity relationships")
        return [{ memoryId: "mem-006", score: 0.94 }];
      return [];
    }

    return [];
  };
}

// ── Run ───────────────────────────────────────────────────────────────────────

let report;
try {
  report = await runShadowComparison({
    dataset: DATASET,
    retrieve: makeFakeRetrieve(),
    baselineSpec: BASELINE_SPEC,
    candidateSpec: CANDIDATE_SPEC,
    datasetSha256: "abc123sha256",
    k: 5,
    now: () => NOW,
  });
} catch (err) {
  console.error("ERROR: runShadowComparison threw:", err);
  process.exit(1);
}

// ── Output ────────────────────────────────────────────────────────────────────

const output = {
  baselineRecipeId: report.baselineRecipeId,
  candidateRecipeId: report.candidateRecipeId,
  datasetSha256: report.datasetSha256,
  shadowMode: report.shadowMode,
  metrics: {
    baseline: report.baseline,
    candidate: report.candidate,
    deltas: report.deltas,
  },
  cost: report.cost,
  rootCauseHints: report.rootCauseHints,
};

process.stdout.write(JSON.stringify(output, null, 2) + "\n");
