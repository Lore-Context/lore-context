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

// v1.4 Lane C Phase 1 — LLM provider abstraction + fallback orchestrator
export {
  type LlmRequest,
  type LlmResponse,
  type LlmProviderError,
  type LlmProvider,
  type HttpClient,
  LlmProviderException,
} from "./providers/types.js";

export { AnthropicAdapter, type AnthropicAdapterConfig } from "./providers/anthropic.js";
export { OpenAIAdapter, type OpenAIAdapterConfig } from "./providers/openai.js";
export { LocalQwenAdapter, type LocalQwenAdapterConfig } from "./providers/local-qwen.js";

export {
  FallbackOrchestrator,
  type FallbackConfig,
  type FallbackEvent,
} from "./fallback-orchestrator.js";

export {
  createGatewayWithFallback,
  type FallbackGatewayEnv,
} from "./gateway.js";

// v1.8 Lane G — V1.8-G4 health endpoint provider chain probe
export {
  getLlmProviderChainHealth,
  type LlmProviderChainHealth,
  type LlmProviderHealthInfo,
  type ProviderHealthCheckOptions,
} from "./gateway.js";

// v2.0.2 Lane P — prompt-cache hit counter (Prometheus lore_llm_cache_hit_total)
export {
  incrementCacheHitCounter,
  getCacheHitCount,
  _resetCacheHitCounter,
} from "./providers/openrouter.js";
