import { describe, expect, it } from "vitest";
import { runShadowComparison } from "../src/shadow-runner.js";
import type { ContextRecipeSpec } from "../src/context-recipes.js";
import type { EvalCaseV12, EvalDatasetV12 } from "../src/types-v12.js";
import type { RetrievalFnV12 } from "../src/runner-v12.js";

// ═════════════════════════════════════════════════════════════════════════════
// Shared fixtures
// ═════════════════════════════════════════════════════════════════════════════

const BASELINE_SPEC: ContextRecipeSpec = {
  id: "baseline-v1",
  version: "1.0",
  label: "Baseline Recipe",
  description: "Test baseline for shadow comparison",
  enabledStreams: ["qdrant_dense", "postgres_fts"],
  weights: { qdrant_dense: 0.7, postgres_fts: 0.3 },
  temporalFilterEnabled: true,
  rerankerEnabled: false,
  perStreamTimeoutMs: 1000,
  candidateLimit: 80,
};

const CANDIDATE_SPEC: ContextRecipeSpec = {
  id: "candidate-v2",
  version: "2.0",
  label: "Candidate Recipe",
  description: "Test candidate for shadow comparison",
  enabledStreams: ["qdrant_dense", "qdrant_sparse", "postgres_pgvector"],
  weights: { qdrant_dense: 0.5, qdrant_sparse: 0.3, postgres_pgvector: 0.2 },
  temporalFilterEnabled: false,
  rerankerEnabled: true,
  perStreamTimeoutMs: null,
  candidateLimit: 100,
};

function makeDataset(): EvalDatasetV12 {
  return {
    name: "shadow-test",
    version: "1.0.0",
    items: [
      {
        id: "case-001",
        query: "query-alpha",
        expected_memory_ids: ["mem-001", "mem-002"],
        tags: ["semantic"],
        query_intent: "semantic",
      },
      {
        id: "case-002",
        query: "query-beta",
        expected_memory_ids: ["mem-003"],
        tags: ["keyword"],
        query_intent: "keyword",
      },
      {
        id: "case-003",
        query: "query-gamma",
        expected_memory_ids: ["mem-004", "mem-005"],
        tags: ["semantic"],
        query_intent: "semantic",
      },
      {
        id: "case-004",
        query: "query-delta",
        expected_memory_ids: [],
        tags: ["negative"],
        query_intent: "negative",
        negative_ids: ["mem-099"],
      },
      {
        id: "case-005",
        query: "query-epsilon",
        expected_memory_ids: ["mem-006"],
        tags: ["keyword"],
        query_intent: "keyword",
      },
    ],
  };
}

/**
 * Fake retrieval that returns different staleScore / streamsFired per config.
 *
 * Baseline (ablationConfig.id === "baseline-v1"):
 *   staleScores: case-003 mem-004 = 0.4 (≤0.5), case-004 mem-099 = 0.9 (>0.5)
 *   → staleHitRate = 1/8 = 0.125
 *   streamCounts: [1, 1, 3, 1, 2] → avg 1.6 → streamCoverage = 1.6/7 ≈ 0.229
 *
 * Candidate (ablationConfig.id === "candidate-v2"):
 *   staleScores: case-003 mem-004 = 0.7 (>0.5), case-004 mem-099 = 0.8 (>0.5)
 *   → staleHitRate = 2/8 = 0.25
 *   streamCounts: [3, 2, 3, 2, 2] → avg 2.4 → streamCoverage = 2.4/7 ≈ 0.343
 */
function makeFakeRetrieve(): RetrievalFnV12 {
  const baselineHits: Record<
    string,
    Array<{
      memoryId: string;
      score: number;
      staleScore?: number;
      streamsFired?: string[];
    }>
  > = {
    "query-alpha": [
      { memoryId: "mem-001", score: 0.95, staleScore: 0.1, streamsFired: ["qdrant_dense"] },
      { memoryId: "mem-002", score: 0.90, staleScore: 0.0 },
    ],
    "query-beta": [
      { memoryId: "mem-003", score: 0.85, staleScore: 0.2, streamsFired: ["postgres_fts"] },
    ],
    "query-gamma": [
      { memoryId: "mem-004", score: 0.80, staleScore: 0.4, streamsFired: ["qdrant_dense", "postgres_fts"] },
      { memoryId: "mem-005", score: 0.75, staleScore: 0.0, streamsFired: ["qdrant_sparse"] },
    ],
    "query-delta": [
      { memoryId: "mem-099", score: 0.50, staleScore: 0.9, streamsFired: ["graph"] },
      { memoryId: "mem-100", score: 0.40, staleScore: 0.0 },
    ],
    "query-epsilon": [
      { memoryId: "mem-006", score: 0.70, staleScore: 0.3, streamsFired: ["temporal", "wiki"] },
    ],
  };

  const candidateHits: Record<
    string,
    Array<{
      memoryId: string;
      score: number;
      staleScore?: number;
      streamsFired?: string[];
    }>
  > = {
    "query-alpha": [
      { memoryId: "mem-001", score: 0.95, staleScore: 0.1, streamsFired: ["qdrant_dense", "qdrant_sparse"] },
      { memoryId: "mem-002", score: 0.90, staleScore: 0.0, streamsFired: ["postgres_pgvector"] },
    ],
    "query-beta": [
      { memoryId: "mem-003", score: 0.85, staleScore: 0.2, streamsFired: ["postgres_fts", "postgres_pgvector"] },
    ],
    "query-gamma": [
      { memoryId: "mem-004", score: 0.80, staleScore: 0.7, streamsFired: ["qdrant_dense", "postgres_fts"] },
      { memoryId: "mem-005", score: 0.75, staleScore: 0.0, streamsFired: ["qdrant_sparse"] },
    ],
    "query-delta": [
      { memoryId: "mem-099", score: 0.50, staleScore: 0.8, streamsFired: ["graph", "temporal"] },
      { memoryId: "mem-100", score: 0.40, staleScore: 0.0 },
    ],
    "query-epsilon": [
      { memoryId: "mem-006", score: 0.70, staleScore: 0.3, streamsFired: ["temporal", "wiki"] },
    ],
  };

  return async (query, opts) => {
    const isCandidate = opts.ablationConfig?.id === CANDIDATE_SPEC.id;
    return (isCandidate ? candidateHits[query] : baselineHits[query]) ?? [];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SR-1 — stable report fields
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-1 — stable report fields", () => {
  it("contains baselineRecipeId, candidateRecipeId, datasetSha256", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-stable",
      k: 5,
    });

    expect(report.baselineRecipeId).toBe("baseline-v1");
    expect(report.candidateRecipeId).toBe("candidate-v2");
    expect(report.datasetSha256).toBe("sha256-stable");
  });

  it("reports shadowMode = true and valid ISO timestamp", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-stable",
      k: 5,
    });

    expect(report.shadowMode).toBe(true);
    expect(typeof report.timestamp).toBe("string");
    expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
    expect(report.engineVersion).toBe("v14");
  });

  it("baseline and candidate expose all ShadowRecipeMetrics keys", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-stable",
      k: 5,
    });

    const keys: Array<keyof typeof report.baseline> = [
      "recall", "precision", "mrr", "ndcg",
      "staleHitRate", "negativeHitRate", "latencyP95Ms", "streamCoverage",
    ];
    for (const key of keys) {
      expect(report.baseline).toHaveProperty(key);
      expect(typeof report.baseline[key]).toBe("number");
      expect(report.candidate).toHaveProperty(key);
      expect(typeof report.candidate[key]).toBe("number");
    }
  });

  it("deltas object contains all metric keys", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-stable",
      k: 5,
    });

    const metrics: Array<keyof typeof report.baseline> = [
      "recall", "precision", "mrr", "ndcg",
      "staleHitRate", "negativeHitRate", "latencyP95Ms", "streamCoverage",
    ];
    for (const m of metrics) {
      expect(report.deltas).toHaveProperty(m);
      expect(typeof report.deltas[m]).toBe("number");
    }
  });

  it("cost has baseline and candidate with budgetRatio, capRatio, streamBudget", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-stable",
      k: 5,
    });

    for (const side of ["baseline", "candidate"] as const) {
      expect(report.cost[side]).toHaveProperty("budgetRatio");
      expect(typeof report.cost[side].budgetRatio).toBe("number");
      expect(report.cost[side]).toHaveProperty("capRatio");
      expect(typeof report.cost[side].capRatio).toBe("number");
      expect(report.cost[side]).toHaveProperty("streamBudget");
      expect(typeof report.cost[side].streamBudget).toBe("number");
    }
  });

  it("streamDiff has four array fields", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-stable",
      k: 5,
    });

    expect(Array.isArray(report.streamDiff.baselineStreams)).toBe(true);
    expect(Array.isArray(report.streamDiff.candidateStreams)).toBe(true);
    expect(Array.isArray(report.streamDiff.added)).toBe(true);
    expect(Array.isArray(report.streamDiff.removed)).toBe(true);
  });

  it("rootCauseHints is an array", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-stable",
      k: 5,
    });

    expect(Array.isArray(report.rootCauseHints)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SR-2 — metric deltas / recall regression
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-2 — metric deltas and recall regression", () => {
  it("computes deltas as candidate - baseline for each metric", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-deltas",
      k: 5,
    });

    for (const key of ["recall", "precision", "mrr", "ndcg"] as const) {
      expect(report.deltas[key]).toBeCloseTo(
        report.candidate[key] - report.baseline[key],
        6,
      );
    }
  });

  it("reports negative recall delta when candidate misses expected results", async () => {
    const regressDataset: EvalDatasetV12 = {
      name: "regress",
      version: "1.0.0",
      items: [
        {
          id: "r1",
          query: "target",
          expected_memory_ids: ["mem-target"],
          tags: ["semantic"],
          query_intent: "semantic",
        },
      ],
    };

    const regressRetrieve: RetrievalFnV12 = async (query, opts) => {
      if (opts.ablationConfig?.id === BASELINE_SPEC.id) {
        return [{ memoryId: "mem-target", score: 0.9 }];
      }
      return [];
    };

    const report = await runShadowComparison({
      dataset: regressDataset,
      retrieve: regressRetrieve,
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-regress",
      k: 5,
    });

    // Baseline: recall = 1/1 = 1.0; Candidate: recall = 0/1 = 0 → delta = -1.0
    expect(report.baseline.recall).toBeCloseTo(1.0, 4);
    expect(report.candidate.recall).toBeCloseTo(0, 4);
    expect(report.deltas.recall).toBeLessThan(0);
    // recall regression < -0.02 triggers temporal_filter_not_applied
    expect(report.rootCauseHints).toContain("temporal_filter_not_applied");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SR-3 — stream diff
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-3 — stream diff between baseline and candidate", () => {
  it("reports correct added / removed streams based on spec.enabledStreams", async () => {
    const simpleDataset: EvalDatasetV12 = {
      name: "stream-diff",
      version: "1.0.0",
      items: [
        {
          id: "s1",
          query: "q",
          expected_memory_ids: ["mem-x"],
          tags: [],
          query_intent: "semantic",
        },
      ],
    };

    const retrieve: RetrievalFnV12 = async () => [{ memoryId: "mem-x", score: 1.0 }];
    const report = await runShadowComparison({
      dataset: simpleDataset,
      retrieve,
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-streamdiff",
      k: 5,
    });

    // Baseline: ["postgres_fts", "qdrant_dense"] (sorted)
    // Candidate: ["postgres_pgvector", "qdrant_dense", "qdrant_sparse"] (sorted)
    expect(report.streamDiff.baselineStreams).toEqual(["postgres_fts", "qdrant_dense"]);
    expect(report.streamDiff.candidateStreams).toEqual([
      "postgres_pgvector",
      "qdrant_dense",
      "qdrant_sparse",
    ]);
    expect(report.streamDiff.added).toEqual(["postgres_pgvector", "qdrant_sparse"]);
    expect(report.streamDiff.removed).toEqual(["postgres_fts"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SR-4 — rootCauseHints
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-4 — rootCauseHints", () => {
  it("includes hints when recipes differ and metrics show regression", async () => {
    // Use the shared fake retrieve which produces staleHitRate regression
    // (baseline 0.125 → candidate 0.25, delta = +0.125 > 0.02).
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-hints",
      k: 5,
    });

    // staleHitRate increase > 0.02 → both stale-related hints
    expect(report.rootCauseHints).toContain("candidate_status_leaked");
    expect(report.rootCauseHints).toContain("superseded_item_in_context");
  });

  it("returns empty hints when baseline and candidate are identical", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: BASELINE_SPEC,
      datasetSha256: "sha256-identical",
      k: 5,
    });

    // The fake retrieve maps candidate configs by id; with both specs identical
    // both sides get the same hits → deltas all 0 → no hints → no regression
    expect(report.rootCauseHints).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SR-5 — cost estimates
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-5 — cost estimates", () => {
  it("baseline: 2 streams, timeout=1000ms, limit=80", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-cost",
      k: 5,
    });

    // budgetRatio = (2/7) * min(1000/1500, 1.0) = 0.2857 * 0.6667 = 0.19
    expect(report.cost.baseline.budgetRatio).toBeCloseTo(0.19, 2);
    // capRatio = 80/80 = 1.0
    expect(report.cost.baseline.capRatio).toBeCloseTo(1.0, 2);
    expect(report.cost.baseline.streamBudget).toBe(2);
  });

  it("candidate: 3 streams, timeout=null (determinism), limit=100", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-cost",
      k: 5,
    });

    // budgetRatio = (3/7) * 1.0 = 0.4286 → rounds to 0.429
    expect(report.cost.candidate.budgetRatio).toBeCloseTo(0.429, 2);
    // capRatio = 100/80 = 1.25
    expect(report.cost.candidate.capRatio).toBeCloseTo(1.25, 2);
    expect(report.cost.candidate.streamBudget).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SR-6 — shadowMode invariant
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-6 — shadowMode invariant", () => {
  it("is always true regardless of dataset or retrieve", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-shadowmode",
      k: 5,
    });

    expect(report.shadowMode).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SR-7 — no mutation / no promotion fields
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-7 — no mutation or promotion fields", () => {
  it("report has no promotion-related or mutation-related fields", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-nopromo",
      k: 5,
    });

    // The ShadowComparisonReport is a pure observation artifact;
    // it must not contain promotion decision, verdict, or mutation flags.
    const reportKeys = Object.keys(report);
    expect(reportKeys).not.toContain("promotionDecision");
    expect(reportKeys).not.toContain("promotionVerdict");
    expect(reportKeys).not.toContain("mutation");
    expect(reportKeys).not.toContain("promoted");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SR-8 — negativeHitRate (runner-v12 semantics)
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-8 — negativeHitRate runner-v12 semantics", () => {
  it("computes negativeHitRate as avg of negativeHitsCount / negativeIdsLength", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-neghit",
      k: 5,
    });

    // Only case-004 has negative_ids = ["mem-099"].
    // case-004 retrieves mem-099 in top-K → negativeHitsCount = 1, negativeIdsLength = 1.
    // negativeHitRate = (1/1) / 1 = 1.0
    expect(report.baseline.negativeHitRate).toBeCloseTo(1.0, 4);
    expect(report.candidate.negativeHitRate).toBeCloseTo(1.0, 4);
  });

  it("returns 0 when no cases have negative_ids", async () => {
    const cleanDataset: EvalDatasetV12 = {
      name: "clean",
      version: "1.0.0",
      items: [
        { id: "c1", query: "no-neg", expected_memory_ids: ["mem-x"], tags: [], query_intent: "semantic" },
      ],
    };

    const cleanRetrieve: RetrievalFnV12 = async () => [{ memoryId: "mem-x", score: 1.0 }];

    const report = await runShadowComparison({
      dataset: cleanDataset,
      retrieve: cleanRetrieve,
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-clean",
      k: 5,
    });

    expect(report.baseline.negativeHitRate).toBe(0);
    expect(report.candidate.negativeHitRate).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SR-9 — staleHitRate uses staleScore > 0.5 (runner-v12 semantics)
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-9 — staleHitRate uses staleScore > 0.5", () => {
  it("computes staleHitRate from top-K staleScore signals, not negative_ids", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-stale",
      k: 5,
    });

    // Baseline: only case-004 has mem-099 with staleScore 0.9 (>0.5 → 1 signal).
    // Total 8 top-K results across 5 cases → 1/8 = 0.125.
    expect(report.baseline.staleHitRate).toBeCloseTo(0.125, 2);

    // Candidate: case-003 mem-004 staleScore 0.7 (>0.5 → 1), case-004 mem-099
    // staleScore 0.8 (>0.5 → 1). Total 8 top-K → 2/8 = 0.25.
    expect(report.candidate.staleHitRate).toBeCloseTo(0.25, 2);

    // staleHitRate is NOT the same as negativeHitRate — they measure different things.
    expect(report.baseline.staleHitRate).not.toBe(report.baseline.negativeHitRate);
  });

  it("returns 0 when no results have staleScore > 0.5", async () => {
    const pristineRetrieve: RetrievalFnV12 = async () => {
      return [
        { memoryId: "mem-001", score: 0.95, staleScore: 0.1 },
        { memoryId: "mem-002", score: 0.90, staleScore: 0.3 },
      ];
    };

    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: pristineRetrieve,
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-stale-zero",
      k: 5,
    });

    expect(report.baseline.staleHitRate).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SR-10 — streamCoverage uses streamsFired
// ─────────────────────────────────────────────────────────────────────────────

describe("SR-10 — streamCoverage uses streamsFired", () => {
  it("counts unique streams from streamsFired field", async () => {
    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: makeFakeRetrieve(),
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-streamcov",
      k: 5,
    });

    // Baseline: per-case unique streams avg ~1.6, /7 → ~0.229
    expect(report.baseline.streamCoverage).toBeGreaterThan(0);
    expect(report.baseline.streamCoverage).toBeCloseTo(0.229, 2);

    // Candidate has more streams per case (qdrant_sparse, postgres_pgvector added).
    // Per-case avg ~2.4, /7 → ~0.343
    expect(report.candidate.streamCoverage).toBeGreaterThan(
      report.baseline.streamCoverage,
    );
    expect(report.candidate.streamCoverage).toBeCloseTo(0.343, 2);
  });

  it("falls back to streams field when streamsFired is absent", async () => {
    const legacyRetrieve: RetrievalFnV12 = async () => {
      return [
        { memoryId: "mem-001", score: 0.95, streams: ["postgres_fts", "graph"] },
      ];
    };

    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: legacyRetrieve,
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-legacy-streams",
      k: 5,
    });

    // Should count streams from the legacy `streams` field.
    expect(report.baseline.streamCoverage).toBeGreaterThan(0);
  });

  it("defaults to 1 when no stream info available", async () => {
    const bareRetrieve: RetrievalFnV12 = async () => {
      return [{ memoryId: "mem-001", score: 0.95 }];
    };

    const report = await runShadowComparison({
      dataset: makeDataset(),
      retrieve: bareRetrieve,
      baselineSpec: BASELINE_SPEC,
      candidateSpec: CANDIDATE_SPEC,
      datasetSha256: "sha256-bare",
      k: 5,
    });

    // Each case returns 1 unique stream → mean / 7 = 1/7 ≈ 0.143
    expect(report.baseline.streamCoverage).toBeCloseTo(0.143, 2);
  });
});
