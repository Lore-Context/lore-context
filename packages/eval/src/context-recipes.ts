// Lore v2.0.9 — Wave 0: Context Recipe types (BRA-625, BRA-626, BRA-633).
//
// Context Recipes are pre-configured retrieval parameter sets that can be
// trial-evaluated and promoted/demoted via a structured decision process.
// This file defines the core type vocabulary shared across the eval harness,
// the check-context-recipes.mjs gate script, and the recipe → adapter mapping.
//
// Design invariants:
//   * Types are JSON-serializable — the recipe spec and trial results are
//     stored as JSON artifacts.
//   * Metrics use 0-1 scale (not percentage points) to match the eval runner
//     convention. The gate script converts as needed.
//   * PromotionDecision is a read-out of a structured comparison; it does not
//     mutate state. State changes happen in the release process.

import type { MemorySearchStreamKind } from "./types-v12.js";

// ─────────────────────────────────────────────────────────────────────────
// ContextRecipeSpec — the knob surface for a retrieval recipe.
// This is the shape that `ops/context-recipes/default-v209.json` must
// satisfy and that `mapRecipeToAdapterConfig()` reads.
// ─────────────────────────────────────────────────────────────────────────

export interface ContextRecipeSpec {
  /** Unique recipe identifier. Convention: "default-v{version}" or descriptive slug. */
  id: string;
  /** Semver of the Lore release this recipe targets. */
  version: string;
  /** Human-readable label for reports and gates. */
  label: string;
  /** Short prose description of what this recipe optimises for. */
  description: string;
  /** Which of the 7 retrieval streams to activate. Default: all 7. */
  enabledStreams: MemorySearchStreamKind[];
  /** Per-stream RRF weights. Defaults to the v1.3 DEFAULT_STREAM_WEIGHTS. */
  weights: Partial<Record<MemorySearchStreamKind, number>>;
  /** Enable temporal validity filtering on memory hits. */
  temporalFilterEnabled: boolean;
  /** Enable post-fusion reranker (requires rerankerProvider at runtime). */
  rerankerEnabled: boolean;
  /** RRF damping constant. Default: 60. */
  rrfK?: number;
  /** Per-stream timeout in milliseconds. null = no timeout (determinism mode). */
  perStreamTimeoutMs?: number | null;
  /** Max candidates per stream before fusion. */
  candidateLimit?: number;
  /** Final result count after fusion + rerank. */
  finalLimit?: number;
  /**
   * Minimum pipeline version required. If the running eval harness or
   * adapter is below this version the recipe is skipped with a warning.
   */
  minPipelineVersion?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// ContextRecipeTrial — a single eval run of a recipe against a dataset.
// ─────────────────────────────────────────────────────────────────────────

export interface ContextRecipeTrialMetrics {
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  ndcgAtK: number;
  negativeHitRate: number;
  latencyP95Ms: number;
}

export interface ContextRecipeTrial {
  /** Points to ContextRecipeSpec.id. */
  recipeId: string;
  /** Unique trial run identifier. */
  trialId: string;
  /** ISO-8601 timestamp of the trial run. */
  timestamp: string;
  /** Dataset name and version used for this trial. */
  dataset: {
    name: string;
    version: string;
    itemCount: number;
  };
  /** Engine version that produced this trial (e.g. "v12", "v13", "v14"). */
  engineVersion: string;
  /** Overall metrics across all dataset items. */
  metrics: ContextRecipeTrialMetrics;
  /** Per-group aggregate metrics (keyed by query_intent or tag group). */
  perGroup: Record<string, {
    recallAtK: number;
    mrr: number;
    negativeHitRate?: number;
    caseCount: number;
  }>;
  /** Per-stream candidate counts (only meaningful when orchestrator is wired). */
  streamCandidateCounts?: Partial<Record<MemorySearchStreamKind, number>>;
  /** Ablation config used during this trial (for provenance). */
  ablationConfigId?: string;
  /**
   * SHA-256 of the dataset used. The gate matches on hash, not human judgment,
   * to prevent accidental dataset drift.
   */
  datasetSha256?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// PromotionDecision — structured gate read-out comparing a trial recipe
// against the current baseline.
// ─────────────────────────────────────────────────────────────────────────

export type PromotionVerdict = "promote" | "reject" | "hold";

export interface PromotionDecision {
  /** Recipe being evaluated for promotion. */
  recipeId: string;
  /** Trial that produced the evidence. */
  trialId: string;
  /** Current baseline/default recipe the trial is compared against. */
  baselineRecipeId: string;
  /** The decision: promote (replace baseline), reject (below baseline), or hold (need more data). */
  decision: PromotionVerdict;
  /** Human-readable explanation of the decision. */
  reason: string;
  /**
   * Per-metric comparison: baseline value, trial value, and signed delta.
   * Positive delta = improvement for recall/precision/MRR/NDCG;
   * negative delta = improvement for negativeHitRate/latencyP95Ms.
   */
  comparedMetrics: Record<string, {
    baseline: number;
    trial: number;
    delta: number;
  }>;
  /** Minimum uplift ratio required for promotion (e.g. 0.0 = no regression). */
  minUplift: number;
  /** ISO-8601 timestamp of the decision. */
  timestamp: string;
  /** Engine version that the baseline and trial ran on. */
  engineVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers — pure functions operating on recipe types (no side effects).
// ─────────────────────────────────────────────────────────────────────────

/**
 * Produce a PromotionDecision by comparing trial metrics against a baseline.
 * Uses the same convention as the v1.2 gate: higher is better for
 * recall/precision/MRR/NDCG; lower is better for negativeHitRate/latencyP95Ms.
 */
export function decidePromotion(opts: {
  recipeId: string;
  trialId: string;
  baselineRecipeId: string;
  trial: ContextRecipeTrialMetrics;
  baseline: ContextRecipeTrialMetrics;
  minUplift?: number;
  now?: () => Date;
}): PromotionDecision {
  const minUplift = opts.minUplift ?? 0.0;
  const now = opts.now ?? (() => new Date());

  const higherIsBetter = new Set(["recallAtK", "precisionAtK", "mrr", "ndcgAtK"]);
  const lowerIsBetter = new Set(["negativeHitRate", "latencyP95Ms"]);

  const allMetrics = new Set([
    ...Object.keys(opts.trial) as Array<keyof ContextRecipeTrialMetrics>,
    ...Object.keys(opts.baseline) as Array<keyof ContextRecipeTrialMetrics>,
  ]);

  const comparedMetrics: PromotionDecision["comparedMetrics"] = {};
  let anyRegression = false;
  let anyImprovement = false;

  for (const metric of allMetrics) {
    const baselineVal = Number((opts.baseline as unknown as Record<string, number>)[metric] ?? 0);
    const trialVal = Number((opts.trial as unknown as Record<string, number>)[metric] ?? 0);
    const delta = trialVal - baselineVal;

    comparedMetrics[metric] = { baseline: baselineVal, trial: trialVal, delta };

    if (Math.abs(delta) < 1e-9) continue;

    if (higherIsBetter.has(metric)) {
      if (delta < -minUplift) anyRegression = true;
      if (delta > minUplift) anyImprovement = true;
    } else if (lowerIsBetter.has(metric)) {
      if (delta > minUplift) anyRegression = true;
      if (delta < -minUplift) anyImprovement = true;
    }
  }

  let decision: PromotionVerdict;
  let reason: string;

  if (anyRegression) {
    decision = "reject";
    reason = `Trial regressed on one or more metrics against baseline "${opts.baselineRecipeId}".`;
  } else if (anyImprovement) {
    decision = "promote";
    reason = `Trial meets or exceeds baseline "${opts.baselineRecipeId}" on all metrics with measurable improvement.`;
  } else {
    decision = "hold";
    reason = `Trial is within tolerance of baseline "${opts.baselineRecipeId}" — no significant change detected. More data needed.`;
  }

  return {
    recipeId: opts.recipeId,
    trialId: opts.trialId,
    baselineRecipeId: opts.baselineRecipeId,
    decision,
    reason,
    comparedMetrics,
    minUplift,
    timestamp: now().toISOString(),
    engineVersion: "v14",
  };
}
