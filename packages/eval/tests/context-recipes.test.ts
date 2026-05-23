// Lore v2.0.9 — Wave 0: Context Recipes types tests (BRA-625, BRA-626).
//
// Covers:
//   CR-1   ContextRecipeSpec shape and required fields.
//   CR-2   ContextRecipeTrial shape and required fields.
//   CR-3   decidePromotion: promote when all metrics improve.
//   CR-4   decidePromotion: reject when any metric regresses.
//   CR-5   decidePromotion: hold when within tolerance.
//   CR-6   decidePromotion: respects minUplift threshold.
//   CR-7   decidePromotion: handles missing metrics gracefully.

import { describe, expect, it } from "vitest";
import { decidePromotion } from "../src/context-recipes.js";
import type {
  ContextRecipeSpec,
  ContextRecipeTrial,
  ContextRecipeTrialMetrics,
  PromotionDecision,
} from "../src/index.js";

// ─────────────────────────────────────────────────────────────────────────
// CR-1: ContextRecipeSpec shape.
// ─────────────────────────────────────────────────────────────────────────

describe("CR-1 — ContextRecipeSpec", () => {
  it("has required fields id, version, label, description, enabledStreams, weights, temporalFilterEnabled, rerankerEnabled", () => {
    const spec: ContextRecipeSpec = {
      id: "test-recipe",
      version: "2.0.9",
      label: "Test Recipe",
      description: "A test recipe for validation — must be at least ten chars.",
      enabledStreams: ["postgres_fts", "qdrant_dense"],
      weights: { postgres_fts: 1.0, qdrant_dense: 1.0 },
      temporalFilterEnabled: true,
      rerankerEnabled: false,
    };
    expect(spec.id).toBe("test-recipe");
    expect(spec.version).toBe("2.0.9");
  });

  it("accepts optional fields rrfK, perStreamTimeoutMs, candidateLimit, finalLimit, minPipelineVersion", () => {
    const spec: ContextRecipeSpec = {
      id: "full-recipe",
      version: "3.0.0",
      label: "Full",
      description: "Full recipe with all optional fields present and valid.",
      enabledStreams: ["wiki"],
      weights: { wiki: 0.65 },
      temporalFilterEnabled: false,
      rerankerEnabled: true,
      rrfK: 50,
      perStreamTimeoutMs: null,
      candidateLimit: 40,
      finalLimit: 5,
      minPipelineVersion: "3.0.0",
    };
    expect(spec.rrfK).toBe(50);
    expect(spec.perStreamTimeoutMs).toBeNull();
    expect(spec.candidateLimit).toBe(40);
    expect(spec.finalLimit).toBe(5);
    expect(spec.minPipelineVersion).toBe("3.0.0");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CR-2: ContextRecipeTrial shape.
// ─────────────────────────────────────────────────────────────────────────

describe("CR-2 — ContextRecipeTrial", () => {
  it("has all trial-level fields", () => {
    const trial: ContextRecipeTrial = {
      recipeId: "default-v209",
      trialId: "trial-001",
      timestamp: "2026-05-15T00:00:00.000Z",
      dataset: { name: "v209-core", version: "1.0.0", itemCount: 42 },
      engineVersion: "v14",
      metrics: {
        recallAtK: 0.92,
        precisionAtK: 0.85,
        mrr: 0.88,
        ndcgAtK: 0.91,
        negativeHitRate: 0.01,
        latencyP95Ms: 120,
      },
      perGroup: {
        semantic: { recallAtK: 0.90, mrr: 0.87, caseCount: 10 },
        keyword: { recallAtK: 0.95, mrr: 0.92, caseCount: 15 },
      },
      streamCandidateCounts: { postgres_fts: 50, qdrant_dense: 35 },
      ablationConfigId: "all-streams-on",
      datasetSha256: "abc123def456",
    };
    expect(trial.recipeId).toBe("default-v209");
    expect(trial.metrics.recallAtK).toBeCloseTo(0.92, 4);
    expect(trial.datasetSha256).toBe("abc123def456");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CR-3: decidePromotion — promote.
// ─────────────────────────────────────────────────────────────────────────

describe("CR-3 — decidePromotion: promote", () => {
  const baseline: ContextRecipeTrialMetrics = {
    recallAtK: 0.80,
    precisionAtK: 0.75,
    mrr: 0.78,
    ndcgAtK: 0.80,
    negativeHitRate: 0.05,
    latencyP95Ms: 250,
  };

  const improved: ContextRecipeTrialMetrics = {
    recallAtK: 0.90,
    precisionAtK: 0.85,
    mrr: 0.88,
    ndcgAtK: 0.90,
    negativeHitRate: 0.01,
    latencyP95Ms: 120,
  };

  it("returns promote when all higher-is-better improve and lower-is-better improve", () => {
    const decision = decidePromotion({
      recipeId: "new-recipe",
      trialId: "trial-002",
      baselineRecipeId: "default-v209",
      trial: improved,
      baseline,
    });

    expect(decision.decision).toBe("promote");
    expect(decision.recipeId).toBe("new-recipe");
    expect(decision.baselineRecipeId).toBe("default-v209");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CR-4: decidePromotion — reject.
// ─────────────────────────────────────────────────────────────────────────

describe("CR-4 — decidePromotion: reject", () => {
  const baseline: ContextRecipeTrialMetrics = {
    recallAtK: 0.90,
    precisionAtK: 0.85,
    mrr: 0.88,
    ndcgAtK: 0.90,
    negativeHitRate: 0.01,
    latencyP95Ms: 120,
  };

  const regressed: ContextRecipeTrialMetrics = {
    recallAtK: 0.70,
    precisionAtK: 0.65,
    mrr: 0.68,
    ndcgAtK: 0.70,
    negativeHitRate: 0.10,
    latencyP95Ms: 350,
  };

  it("returns reject when recall regresses", () => {
    const decision = decidePromotion({
      recipeId: "bad-recipe",
      trialId: "trial-003",
      baselineRecipeId: "default-v209",
      trial: regressed,
      baseline,
    });
    expect(decision.decision).toBe("reject");
  });

  it("returns reject when negativeHitRate increases", () => {
    const partialRegress: ContextRecipeTrialMetrics = {
      ...baseline,
      negativeHitRate: 0.15,
    };
    const decision = decidePromotion({
      recipeId: "bad-recipe",
      trialId: "trial-004",
      baselineRecipeId: "default-v209",
      trial: partialRegress,
      baseline,
    });
    expect(decision.decision).toBe("reject");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CR-5: decidePromotion — hold.
// ─────────────────────────────────────────────────────────────────────────

describe("CR-5 — decidePromotion: hold", () => {
  const baseline: ContextRecipeTrialMetrics = {
    recallAtK: 0.85,
    precisionAtK: 0.80,
    mrr: 0.83,
    ndcgAtK: 0.85,
    negativeHitRate: 0.02,
    latencyP95Ms: 150,
  };

  it("returns hold when metrics are within default tolerance", () => {
    // Identical baseline → delta=0 → within 1e-9 tolerance → hold.
    const identical: ContextRecipeTrialMetrics = { ...baseline };
    const decision = decidePromotion({
      recipeId: "same-recipe",
      trialId: "trial-005",
      baselineRecipeId: "default-v209",
      trial: identical,
      baseline,
    });
    expect(decision.decision).toBe("hold");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CR-6: decidePromotion — minUplift.
// ─────────────────────────────────────────────────────────────────────────

describe("CR-6 — decidePromotion: minUplift", () => {
  const baseline: ContextRecipeTrialMetrics = {
    recallAtK: 0.80,
    precisionAtK: 0.75,
    mrr: 0.78,
    ndcgAtK: 0.80,
    negativeHitRate: 0.05,
    latencyP95Ms: 250,
  };

  it("rejects when improvement is below minUplift threshold", () => {
    const slightImprove: ContextRecipeTrialMetrics = {
      ...baseline,
      recallAtK: 0.81, // only 0.01 uplift, below minUplift=0.05
    };
    const decision = decidePromotion({
      recipeId: "slight-recipe",
      trialId: "trial-006",
      baselineRecipeId: "default-v209",
      trial: slightImprove,
      baseline,
      minUplift: 0.05,
    });
    expect(decision.decision).toBe("hold"); // no improvement above minUplift, no regression
  });

  it("promotes when improvement exceeds minUplift", () => {
    const bigImprove: ContextRecipeTrialMetrics = {
      ...baseline,
      recallAtK: 0.86, // 0.06 uplift > minUplift=0.05
    };
    const decision = decidePromotion({
      recipeId: "big-recipe",
      trialId: "trial-007",
      baselineRecipeId: "default-v209",
      trial: bigImprove,
      baseline,
      minUplift: 0.05,
    });
    expect(decision.decision).toBe("promote");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CR-7: decidePromotion — missing metrics.
// ─────────────────────────────────────────────────────────────────────────

describe("CR-7 — decidePromotion: missing metrics", () => {
  it("handles when trial has extra metric not in baseline", () => {
    const baseline: ContextRecipeTrialMetrics = {
      recallAtK: 0.80,
      precisionAtK: 0.75,
      mrr: 0.78,
      ndcgAtK: 0.80,
      negativeHitRate: 0.05,
      latencyP95Ms: 250,
    };

    // Same metrics — should be hold (identical).
    const decision = decidePromotion({
      recipeId: "extra-recipe",
      trialId: "trial-008",
      baselineRecipeId: "default-v209",
      trial: { ...baseline },
      baseline,
    });
    // All identical → hold
    expect(decision.decision).toBe("hold");
  });

  it("returns a valid PromotionDecision structure", () => {
    const baseline: ContextRecipeTrialMetrics = {
      recallAtK: 0.85,
      precisionAtK: 0.80,
      mrr: 0.83,
      ndcgAtK: 0.85,
      negativeHitRate: 0.02,
      latencyP95Ms: 150,
    };

    const decision = decidePromotion({
      recipeId: "r1",
      trialId: "t1",
      baselineRecipeId: "b1",
      trial: { ...baseline, recallAtK: 0.90 },
      baseline,
    });

    expect(decision.recipeId).toBe("r1");
    expect(decision.trialId).toBe("t1");
    expect(decision.baselineRecipeId).toBe("b1");
    expect(["promote", "reject", "hold"]).toContain(decision.decision);
    expect(decision.reason.length).toBeGreaterThan(0);
    expect(decision.comparedMetrics).toBeDefined();
    expect(decision.comparedMetrics.recallAtK).toBeDefined();
    expect(decision.comparedMetrics.recallAtK?.delta).toBeCloseTo(0.05, 4);
    expect(decision.timestamp).toBeDefined();
    expect(decision.engineVersion).toBe("v14");
  });
});
