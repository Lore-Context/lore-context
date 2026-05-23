export { runEval, persistRun, loadRuns, diffRuns } from "./runner.js";
export type { EvalDataset, RetrievalFn, EvalRunResult } from "./runner.js";

export {
  runEvalV12,
  applyGate,
  persistRunV12,
  computeNegativeHitRate,
} from "./runner-v12.js";
export type {
  EvalDatasetV12,
  EvalCaseV12,
  EvalRunResultV12,
  PerItemV12,
  RetrievalFnV12,
} from "./runner-v12.js";

export { mockEmbed, cosineSimilarity, rankByCosine, MOCK_EMBED_DIM } from "./mock-embed.js";

export { ABLATION_CONFIGS, DEFAULT_STREAM_WEIGHTS, getAblationConfig } from "./ablation.js";

// v1.3 Lane E — eval ablation harness extensions.
export {
  V13_ABLATION_CONFIGS,
  V13_ABLATION_CONFIG_IDS,
  V13_STREAM_WEIGHTS,
  ALL_STREAMS,
  getV13AblationConfig,
  runV13Ablation,
  latencyP95,
} from "./ablation-v13.js";
export type {
  V13AblationReport,
  V13ConfigReport,
  V13LongMemEvalReport,
  RunV13AblationOpts,
} from "./ablation-v13.js";

export type {
  QueryIntent,
  MemorySearchStreamKind,
  AblationConfig,
  GateConfig,
  GateThreshold,
  FailedThreshold,
  GroupMetrics,
  RootCauseHint,
} from "./types-v12.js";

export {
  redactSensitiveContent,
  isRedactionClean,
  checkNoLocalModelTerms,
  checkNoMcpTerminology,
  runCloudModelFallbackHarness,
  REDACTION_PLACEHOLDER,
} from "./guardrails.js";
export type {
  RedactionResult,
  LocalModelCheckResult,
  McpTerminologyCheckResult,
  FallbackHarnessResult,
  CloudModelStatus,
} from "./guardrails.js";

export {
  PERF_TARGETS,
  buildCaptureAckReport,
  buildCandidateGenerationReport,
  buildRecallApiReport,
  buildRc1PerformanceGate,
} from "./performance.js";
export type {
  CaptureAckSample,
  CaptureAckLatencyReport,
  CandidateGenerationSample,
  CandidateGenerationReport,
  RecallApiSample,
  RecallApiLatencyReport,
  Rc1PerformanceGate,
} from "./performance.js";

export {
  BETA_FUNNEL_STAGES,
  buildUserFunnelProgress,
  buildBetaFunnelReport,
} from "./beta-funnel.js";
export type {
  BetaFunnelStage,
  ControlActionKind,
  BetaFunnelEvent,
  UserFunnelProgress,
  BetaFunnelReport,
} from "./beta-funnel.js";

// v2.0.9 Wave 0 — Context Recipes (BRA-625, BRA-626).
export type {
  ContextRecipeSpec,
  ContextRecipeTrial,
  ContextRecipeTrialMetrics,
  PromotionDecision,
  PromotionVerdict,
} from "./context-recipes.js";
export { decidePromotion } from "./context-recipes.js";

// v2.0.9 Lane B1 — Passive Agent-Evidence Dataset Generator (BRA-627).
export {
  generatePassiveEvalDataset,
  deterministicCaseId,
  hashJson,
  redactContent,
  ALL_PASSIVE_CASE_TYPES,
} from "./passive-eval-generator.js";
export type {
  PassiveCaseType,
  PassiveEvidenceEntry,
  PassiveEvidenceTrace,
  PassiveEvalGeneratorOptions,
  GeneratedDataset,
} from "./passive-eval-generator.js";

// v2.0.9 Lane C1 — Shadow Recipe Runner (BRA-628).
export { runShadowComparison } from "./shadow-runner.js";
export type {
  ShadowComparisonReport,
  ShadowRecipeMetrics,
  ShadowCostEstimate,
  RunShadowComparisonOptions,
} from "./shadow-runner.js";

export function recallAtK(relevantIds: string[], retrievedIds: string[], k: number): number {
  if (relevantIds.length === 0) {
    return 0;
  }

  const relevant = new Set(relevantIds);
  const hits = retrievedIds.slice(0, k).filter((id) => relevant.has(id)).length;
  return hits / relevant.size;
}

export function precisionAtK(relevantIds: string[], retrievedIds: string[], k: number): number {
  if (k <= 0) {
    return 0;
  }

  const relevant = new Set(relevantIds);
  const hits = retrievedIds.slice(0, k).filter((id) => relevant.has(id)).length;
  return hits / k;
}

export function reciprocalRank(relevantIds: string[], retrievedIds: string[]): number {
  const relevant = new Set(relevantIds);
  const index = retrievedIds.findIndex((id) => relevant.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
}

export function meanReciprocalRank(cases: Array<{ relevantIds: string[]; retrievedIds: string[] }>): number {
  if (cases.length === 0) {
    return 0;
  }

  return cases.reduce((sum, item) => sum + reciprocalRank(item.relevantIds, item.retrievedIds), 0) / cases.length;
}

export function staleHitRate(hits: Array<{ stale: boolean }>): number {
  if (hits.length === 0) {
    return 0;
  }

  return hits.filter((hit) => hit.stale).length / hits.length;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}
