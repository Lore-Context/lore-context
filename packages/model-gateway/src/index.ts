export type {
  ModelProviderKind,
  ModelTask,
  ModelProvenance,
  GenerationResult,
  TitleResult,
  SummaryResult,
  RedactionHint,
  DuplicateHint,
  StaleConflictHint,
  QueryRewriteResult,
  RerankResult,
  ModelProvider,
} from "./types.js";

export {
  type ModelBudget,
  type BudgetState,
  type BudgetCheckResult,
  DEFAULT_BUDGET,
  checkBudget,
} from "./budget.js";

export { NoopProvider } from "./providers/noop.js";
export { MockProvider } from "./providers/mock.js";
export {
  CloudProvider,
  type CloudProviderConfig,
  type CloudCallMeta,
} from "./providers/cloud.js";

export { ModelGateway, type ModelGatewayConfig } from "./gateway.js";

export {
  enrichCandidate,
  analyzeForDeduplication,
  enhanceRecall,
  type CandidateIntelligence,
  type DeduplicationResult,
  type RecallEnhancement,
} from "./intelligence.js";

export {
  type RedactionPattern,
  type RedactionResult,
  DEFAULT_REDACTION_PATTERNS,
  redactInputForModel,
  redactInputsForModel,
} from "./redaction.js";

export {
  type MetricsRecorder,
  type MetricsRecord,
  type MetricsSnapshot,
  InMemoryMetricsRecorder,
  emptySnapshot,
  provenanceToRecord,
} from "./metrics.js";

export {
  type ModelGatewayEnv,
  type ModelGatewayEnvStatus,
  createCloudProviderFromEnv,
  createModelGatewayFromEnv,
  describeModelGatewayEnv,
} from "./factory.js";
