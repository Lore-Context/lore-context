// Lore v2.0.9 — Lane C1: Shadow Recipe Runner (BRA-628).
//
// Compares a baseline ContextRecipeSpec against a candidate recipe using
// the same eval/ablation metrics and dataset. Produces a structured
// ShadowComparisonReport without mutating any active recipe, promoting
// or demoting recipes, or writing to the recipe registry.
//
// Design invariants:
//   * Read-only — no recipe mutation, no promotion, no registry writes.
//   * Reuses existing metric primitives (recallAtK, reciprocalRank,
//     staleHitRate, percentile) from @lore/eval.
//   * Reuses existing AblationConfig shape from types-v12.ts for the
//     retrieval function interface.
//   * Does NOT duplicate RRF/fusion implementation; delegates to existing
//     SearchAdapterV14 + HybridSearchOrchestrator via the retrieval fn.
//   * Report fields match the stable contract: baseline and candidate
//     recipe IDs, datasetSha256, shadowMode true, recall, MRR,
//     staleHitRate, negativeHitRate, latency, stream coverage,
//     root-cause hints, and cost/budget/cap fields.

import type { ContextRecipeSpec } from "./context-recipes.js";
import type {
  AblationConfig,
  EvalDatasetV12,
  MemorySearchStreamKind,
  RootCauseHint,
} from "./types-v12.js";
import type { RetrievalFnV12 } from "./runner-v12.js";
import {
  recallAtK,
  precisionAtK,
  reciprocalRank,
  percentile,
} from "./index.js";

// ─────────────────────────────────────────────────────────────────────────
// ShadowComparisonReport — the stable report contract.
// ─────────────────────────────────────────────────────────────────────────

export interface ShadowCostEstimate {
  /** Estimated cost per-trial query (0-1 scale times streams). */
  budgetRatio: number;
  /** Cost cap ratio relative to baseline (1.0 = same). */
  capRatio: number;
  /** Number of streams enabled (proxy for compute budget). */
  streamBudget: number;
}

export interface ShadowRecipeMetrics {
  recall: number;
  precision: number;
  mrr: number;
  ndcg: number;
  staleHitRate: number;
  negativeHitRate: number;
  latencyP95Ms: number;
  streamCoverage: number;
}

export interface ShadowComparisonReport {
  /** Baseline recipe identifier. */
  baselineRecipeId: string;
  /** Candidate recipe identifier. */
  candidateRecipeId: string;
  /** SHA-256 of the dataset used for this comparison. */
  datasetSha256: string;
  /** Always true — marks this as a shadow-mode run. */
  shadowMode: true;
  /** Metrics for the baseline recipe. */
  baseline: ShadowRecipeMetrics;
  /** Metrics for the candidate recipe. */
  candidate: ShadowRecipeMetrics;
  /** Per-metric deltas (candidate - baseline). */
  deltas: Partial<Record<keyof ShadowRecipeMetrics, number>>;
  /** Cost estimates for budget/cap. */
  cost: {
    baseline: ShadowCostEstimate;
    candidate: ShadowCostEstimate;
  };
  /** Root-cause hints derived from metric regressions and stream gaps. */
  rootCauseHints: RootCauseHint[];
  /** ISO-8601 timestamp of the comparison run. */
  timestamp: string;
  /** Engine version for provenance. */
  engineVersion: string;
  /** Which stream kinds were enabled on each side. */
  streamDiff: {
    baselineStreams: MemorySearchStreamKind[];
    candidateStreams: MemorySearchStreamKind[];
    added: MemorySearchStreamKind[];
    removed: MemorySearchStreamKind[];
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Comparison options.
// ─────────────────────────────────────────────────────────────────────────

export interface RunShadowComparisonOptions {
  /** The dataset to evaluate against. */
  dataset: EvalDatasetV12;
  /** Retrieval function — same contract as runV13Ablation. */
  retrieve: RetrievalFnV12;
  /** Baseline recipe spec. */
  baselineSpec: ContextRecipeSpec;
  /** Candidate recipe spec. */
  candidateSpec: ContextRecipeSpec;
  /** SHA-256 of the dataset (required by contract). */
  datasetSha256: string;
  /** Top-K for metric calculations. Default: 5. */
  k?: number;
  /** Override now() for deterministic tests. */
  now?: () => Date;
}

// ─────────────────────────────────────────────────────────────────────────
// runShadowComparison — the main entry point.
// ─────────────────────────────────────────────────────────────────────────

export async function runShadowComparison(
  opts: RunShadowComparisonOptions,
): Promise<ShadowComparisonReport> {
  const k = opts.k ?? 5;
  const now = opts.now ?? (() => new Date());

  // Convert recipe specs to ablation configs for the retrieval interface.
  const baselineConfig = recipeToAblationConfig(opts.baselineSpec);
  const candidateConfig = recipeToAblationConfig(opts.candidateSpec);

  // Run both sides against the dataset.
  const [baselineResults, candidateResults] = await Promise.all([
    runRecipeComparison(opts.dataset, opts.retrieve, baselineConfig, k),
    runRecipeComparison(opts.dataset, opts.retrieve, candidateConfig, k),
  ]);

  // Compute aggregate metrics.
  const baseline = computeAggregateMetrics(baselineResults, k);
  const candidate = computeAggregateMetrics(candidateResults, k);

  // Compute deltas.
  const metricKeys: Array<keyof ShadowRecipeMetrics> = [
    "recall", "precision", "mrr", "ndcg",
    "staleHitRate", "negativeHitRate", "latencyP95Ms", "streamCoverage",
  ];
  const deltas: Partial<Record<keyof ShadowRecipeMetrics, number>> = {};
  for (const key of metricKeys) {
    const b = baseline[key];
    const c = candidate[key];
    if (typeof b === "number" && typeof c === "number") {
      deltas[key] = c - b;
    }
  }

  // Compute stream diff.
  const baselineStreams = [...baselineConfig.streams].sort();
  const candidateStreams = [...candidateConfig.streams].sort();
  const baselineSet = new Set(baselineStreams);
  const candidateSet = new Set(candidateStreams);
  const added = candidateStreams.filter((s) => !baselineSet.has(s));
  const removed = baselineStreams.filter((s) => !candidateSet.has(s));

  // Compute cost estimates.
  const baselineCost = estimateCost(opts.baselineSpec);
  const candidateCost = estimateCost(opts.candidateSpec);

  // Generate root-cause hints from regressions and stream gaps.
  const rootCauseHints = inferRootCauseHints(
    baseline,
    candidate,
    deltas,
    opts.baselineSpec,
    opts.candidateSpec,
  );

  return {
    baselineRecipeId: opts.baselineSpec.id,
    candidateRecipeId: opts.candidateSpec.id,
    datasetSha256: opts.datasetSha256,
    shadowMode: true,
    baseline,
    candidate,
    deltas,
    cost: {
      baseline: baselineCost,
      candidate: candidateCost,
    },
    rootCauseHints,
    timestamp: now().toISOString(),
    engineVersion: "v14",
    streamDiff: {
      baselineStreams,
      candidateStreams,
      added,
      removed,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Recipe → AblationConfig mapping (internal, avoids cross-package dep).
// ─────────────────────────────────────────────────────────────────────────

function recipeToAblationConfig(spec: ContextRecipeSpec): AblationConfig {
  const validStreams: MemorySearchStreamKind[] = [
    "qdrant_dense", "qdrant_sparse", "postgres_fts",
    "postgres_pgvector", "graph", "temporal", "wiki",
  ];
  const streams = (spec.enabledStreams ?? validStreams).filter(
    (s): s is MemorySearchStreamKind => validStreams.includes(s as MemorySearchStreamKind),
  );
  return {
    id: spec.id,
    label: spec.label,
    streams: streams.length > 0 ? streams : [...validStreams],
    weights: spec.weights as Partial<Record<MemorySearchStreamKind, number>> | undefined,
    temporalFilterEnabled: spec.temporalFilterEnabled,
    rerankerEnabled: spec.rerankerEnabled,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Per-item metric computation.
// ─────────────────────────────────────────────────────────────────────────

interface PerItemResult {
  recall: number;
  precision: number;
  rr: number;
  ndcg: number;
  latencyMs: number;
  /** Binary signals (0 or 1) for each top-K result: 1 when staleScore > 0.5. */
  staleScoreSignals: number[];
  isNegativeHit: boolean;
  streamCount: number;
  /** Number of negative_ids defined for this dataset case (0 = no negatives). */
  negativeIdsLength: number;
  /** Number of negative_ids that leaked into retrieved top-K. */
  negativeHitsCount: number;
}

async function runRecipeComparison(
  dataset: EvalDatasetV12,
  retrieve: RetrievalFnV12,
  config: AblationConfig,
  k: number,
): Promise<PerItemResult[]> {
  const out: PerItemResult[] = [];
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

    // Compute per-item metrics — mirrors ablation-v13.ts runConfig.
    const recall = isNegativeCase
      ? (negativeHits.length === 0 ? 1 : 0)
      : recallAtK(item.expected_memory_ids, retrievedIds, k);
    const rr = isNegativeCase
      ? (negativeHits.length === 0 ? 1 : 0)
      : reciprocalRank(item.expected_memory_ids, retrievedIds);
    const ndcg = isNegativeCase
      ? (negativeHits.length === 0 ? 1 : 0)
      : ndcgAtK(item.expected_memory_ids, retrievedIds, k);

    // Stale hit detection — matches runner-v12 semantics:
    // for each top-K result, record 1 when staleScore > 0.5, else 0.
    const staleScoreSignals = results.slice(0, k).map(
      (r) => ((r as { staleScore?: number }).staleScore ?? 0) > 0.5 ? 1 : 0,
    );

    const isNegativeHit = isNegativeCase && negativeHits.length > 0;

    // Stream count proxy: count unique streams from results (streamsFired + streams fallback).
    const streamCount = countUniqueStreams(results);

    // Track negative_ids metadata for runner-v12-compatible aggregate computation.
    const negativeIdsLength = (item.negative_ids ?? []).length;
    const negativeHitsCount = negativeHits.length;

    out.push({
      recall,
      precision: precisionAtK(item.expected_memory_ids, retrievedIds, k),
      rr,
      ndcg,
      latencyMs,
      staleScoreSignals,
      isNegativeHit,
      streamCount,
      negativeIdsLength,
      negativeHitsCount,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregate metrics from per-item results.
// ─────────────────────────────────────────────────────────────────────────

function computeAggregateMetrics(
  results: PerItemResult[],
  _k: number,
): ShadowRecipeMetrics {
  if (results.length === 0) {
    return {
      recall: 0, precision: 0, mrr: 0, ndcg: 0,
      staleHitRate: 0, negativeHitRate: 0, latencyP95Ms: 0, streamCoverage: 0,
    };
  }

  const recall = mean(results.map((r) => r.recall));
  const precision = mean(results.map((r) => r.precision));
  const mrr = mean(results.map((r) => r.rr));
  const ndcg = mean(results.map((r) => r.ndcg));

  // Stale hit rate — matches runner-v12 semantics:
  // proportion of all top-K results across all items with staleScore > 0.5.
  const allSignals = results.flatMap((r) => r.staleScoreSignals);
  const staleHitRateVal = allSignals.length > 0
    ? allSignals.reduce((s, v) => s + v, 0) / allSignals.length
    : 0;

  // Negative hit rate: average of (negativeHitsCount / negativeIdsLength)
  // across cases that have negative_ids, matching runner-v12 computeNegativeHitRate
  // semantics. Returns 0 when no cases define negative_ids.
  const casesWithNegIds = results.filter((r) => r.negativeIdsLength > 0);
  const negativeHitRateVal = casesWithNegIds.length > 0
    ? casesWithNegIds.reduce((s, r) => s + r.negativeHitsCount / r.negativeIdsLength, 0)
      / casesWithNegIds.length
    : 0;

  // Latency P95.
  const latencies = results.map((r) => r.latencyMs);
  const latencyP95Ms = percentile(latencies, 95);

  // Stream coverage: mean unique streams across items, normalized to 7.
  const streamCoverage = results.length > 0
    ? mean(results.map((r) => r.streamCount)) / 7
    : 0;

  return {
    recall,
    precision,
    mrr,
    ndcg,
    staleHitRate: staleHitRateVal,
    negativeHitRate: negativeHitRateVal,
    latencyP95Ms,
    streamCoverage,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Cost estimation from recipe spec.
// ─────────────────────────────────────────────────────────────────────────

function estimateCost(spec: ContextRecipeSpec): ShadowCostEstimate {
  const maxStreams = 7;
  const streamCount = spec.enabledStreams?.length ?? maxStreams;
  const streamBudget = streamCount;

  // Budget ratio: streams * (timeout multiplier).
  // Lower timeout = lower budget; null timeout = determinism mode (budget 1.0).
  const timeoutMs = spec.perStreamTimeoutMs;
  const timeoutRatio = timeoutMs === null || timeoutMs === undefined
    ? 1.0
    : Math.min(timeoutMs / 1500, 1.0); // 1500ms default baseline

  const budgetRatio = (streamCount / maxStreams) * timeoutRatio;

  // Cap ratio: candidateLimit / default (80).
  const defaultCandidateLimit = 80;
  const candidateLimit = spec.candidateLimit ?? defaultCandidateLimit;
  const capRatio = candidateLimit / defaultCandidateLimit;

  return {
    budgetRatio: Math.round(budgetRatio * 1000) / 1000,
    capRatio: Math.round(capRatio * 1000) / 1000,
    streamBudget,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Root-cause hint inference.
// ─────────────────────────────────────────────────────────────────────────

function inferRootCauseHints(
  _baseline: ShadowRecipeMetrics,
  _candidate: ShadowRecipeMetrics,
  deltas: Partial<Record<keyof ShadowRecipeMetrics, number>>,
  baselineSpec: ContextRecipeSpec,
  candidateSpec: ContextRecipeSpec,
): RootCauseHint[] {
  const hints: RootCauseHint[] = [];

  // Recall regression → possible temporal filter or missing stream.
  if ((deltas.recall ?? 0) < -0.02) {
    hints.push("temporal_filter_not_applied");
  }

  // Stale hit rate increase → candidate status leaking or superseded items.
  if ((deltas.staleHitRate ?? 0) > 0.02) {
    hints.push("candidate_status_leaked");
    hints.push("superseded_item_in_context");
  }

  // Negative hit rate increase → wrong vault or stream mismatch.
  if ((deltas.negativeHitRate ?? 0) > 0.01) {
    hints.push("wrong_vault_item_leaked");
  }

  // Stream coverage decrease → streams not firing.
  if ((deltas.streamCoverage ?? 0) < -0.05) {
    const baselineStreams = baselineSpec.enabledStreams ?? [];
    const candidateStreams = candidateSpec.enabledStreams ?? [];
    if (!candidateStreams.includes("postgres_fts") && baselineStreams.includes("postgres_fts")) {
      hints.push("fts_stream_not_fired");
    }
    if (!candidateStreams.includes("qdrant_dense") && baselineStreams.includes("qdrant_dense")) {
      hints.push("dense_stream_not_fired");
    }
    if (!candidateStreams.includes("graph") && baselineStreams.includes("graph")) {
      hints.push("graph_stream_not_fired");
    }
    if (!candidateStreams.includes("wiki") && baselineStreams.includes("wiki")) {
      hints.push("wiki_stream_not_fired");
    }
  }

  // Weight mismatch detection.
  if (baselineSpec.weights && candidateSpec.weights) {
    const baselineWeights = baselineSpec.weights ?? {};
    const candidateWeights = candidateSpec.weights ?? {};
    const allStreams = new Set([
      ...Object.keys(baselineWeights),
      ...Object.keys(candidateWeights),
    ]);
    let hasMismatch = false;
    for (const stream of allStreams) {
      const bw = (baselineWeights as Record<string, number>)[stream];
      const cw = (candidateWeights as Record<string, number>)[stream];
      if (bw !== undefined && cw !== undefined && Math.abs(bw - cw) > 0.01) {
        hasMismatch = true;
        break;
      }
    }
    if (hasMismatch) {
      hints.push("rrf_weight_mismatch");
    }
  }

  // Deduplicate.
  return [...new Set(hints)];
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers.
// ─────────────────────────────────────────────────────────────────────────

function ndcgAtK(relevant: string[], retrieved: string[], k: number): number {
  if (relevant.length === 0) return 0;
  const relevantSet = new Set(relevant);
  let dcg = 0;
  for (let i = 0; i < Math.min(k, retrieved.length); i++) {
    if (relevantSet.has(retrieved[i])) {
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

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function countUniqueStreams(results: Array<{ memoryId: string; streamsFired?: string[]; streams?: string[] }>): number {
  // Primary: streamsFired (runner-v12 contract). Fallback: streams (legacy compat).
  // When the retrieval fn doesn't provide stream info, use a minimum of 1.
  const allStreams = new Set<string>();
  for (const r of results) {
    const fired = r.streamsFired ?? r.streams;
    if (fired && fired.length > 0) {
      for (const s of fired) allStreams.add(s);
    }
  }
  return allStreams.size > 0 ? allStreams.size : 1;
}
