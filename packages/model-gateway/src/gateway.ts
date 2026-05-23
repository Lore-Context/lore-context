import type {
  ModelProvider,
  ModelProvenance,
  ModelTask,
  GenerationResult,
  TitleResult,
  SummaryResult,
  RedactionHint,
  DuplicateHint,
  StaleConflictHint,
  QueryRewriteResult,
  RerankResult,
} from "./types.js";
import {
  type ModelBudget,
  type BudgetState,
  DEFAULT_BUDGET,
  checkBudget,
} from "./budget.js";
import { NoopProvider } from "./providers/noop.js";
import {
  InMemoryMetricsRecorder,
  type MetricsRecorder,
  type MetricsSnapshot,
  type MetricsRecord,
} from "./metrics.js";

export interface ModelGatewayConfig {
  provider?: ModelProvider;
  budget?: Partial<ModelBudget>;
  disabled?: boolean;
  /**
   * Receives one MetricsRecord per model invocation (including budget
   * rejections and provider errors). Defaults to an InMemoryMetricsRecorder
   * accessible via getMetricsSnapshot() — operators can swap this out for a
   * Prometheus or OpenTelemetry adapter without touching call sites.
   */
  metricsRecorder?: MetricsRecorder;
}

interface ProviderCallMeta {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUnits?: number;
  inputRedactionMatchCount?: number;
}

function nextHour(from = new Date()): Date {
  const d = new Date(from);
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

function nextDay(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class ModelGateway {
  private readonly provider: ModelProvider;
  private readonly budget: ModelBudget;
  private state: BudgetState;
  private readonly metricsRecorder: MetricsRecorder;
  private readonly inMemoryRecorder?: InMemoryMetricsRecorder;

  constructor(config: ModelGatewayConfig = {}) {
    this.provider = config.disabled
      ? new NoopProvider()
      : (config.provider ?? new NoopProvider());
    this.budget = { ...DEFAULT_BUDGET, ...config.budget };
    this.state = {
      jobsThisHour: 0,
      jobsToday: 0,
      hourResetAt: nextHour().toISOString(),
      dayResetAt: nextDay().toISOString(),
    };
    if (config.metricsRecorder) {
      this.metricsRecorder = config.metricsRecorder;
    } else {
      this.inMemoryRecorder = new InMemoryMetricsRecorder();
      this.metricsRecorder = this.inMemoryRecorder;
    }
  }

  get isEnabled(): boolean {
    return this.provider.available;
  }

  get providerKind(): string {
    return this.provider.kind;
  }

  /**
   * Returns an aggregate view of jobs run by this gateway when using the
   * default in-memory recorder. Operators wiring a custom recorder should
   * read metrics from their own backend instead.
   */
  getMetricsSnapshot(): MetricsSnapshot | null {
    return this.inMemoryRecorder ? this.inMemoryRecorder.getSnapshot() : null;
  }

  getBudgetState(): BudgetState {
    return { ...this.state };
  }

  private resetIfNeeded(): void {
    const now = new Date();
    if (now >= new Date(this.state.hourResetAt)) {
      this.state.jobsThisHour = 0;
      this.state.hourResetAt = nextHour(now).toISOString();
    }
    if (now >= new Date(this.state.dayResetAt)) {
      this.state.jobsToday = 0;
      this.state.dayResetAt = nextDay(now).toISOString();
    }
  }

  private buildProvenance(start: number, task: ModelTask, meta?: ProviderCallMeta, error?: string): ModelProvenance {
    return {
      provider: this.provider.kind,
      task,
      model: meta?.model,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      inputTokens: meta?.inputTokens,
      outputTokens: meta?.outputTokens,
      costUnits: meta?.costUnits,
      inputRedactionMatchCount: meta?.inputRedactionMatchCount,
      ...(error ? { error } : {}),
    };
  }

  private record(record: MetricsRecord): void {
    try {
      this.metricsRecorder.recordJob(record);
    } catch {
      // Metrics recorders must never break the model path.
    }
  }

  private async run<T>(
    task: ModelTask,
    inputText: string,
    fallback: T,
    fn: () => Promise<{ value: T; meta?: ProviderCallMeta }>,
  ): Promise<GenerationResult<T>> {
    const inputBytes = Buffer.byteLength(inputText, "utf8");
    if (!this.provider.available) {
      const provenance = this.buildProvenance(Date.now(), task);
      this.record({
        task,
        provider: this.provider.kind,
        ok: false,
        fallback: true,
        durationMs: 0,
        inputBytes,
      });
      return { ok: false, value: fallback, fallback: true, provenance };
    }

    this.resetIfNeeded();
    const budgetCheck = checkBudget(inputBytes, this.budget, this.state);
    if (!budgetCheck.allowed) {
      const provenance = this.buildProvenance(Date.now(), task, undefined, budgetCheck.reason);
      this.record({
        task,
        provider: this.provider.kind,
        ok: false,
        fallback: true,
        durationMs: 0,
        inputBytes,
        budgetRejected: true,
        error: budgetCheck.reason,
      });
      return {
        ok: false,
        value: fallback,
        fallback: true,
        error: budgetCheck.reason,
        provenance,
      };
    }

    const start = Date.now();
    this.state.jobsThisHour++;
    this.state.jobsToday++;
    try {
      const { value, meta } = await fn();
      const provenance = this.buildProvenance(start, task, meta);
      this.record({
        task,
        provider: this.provider.kind,
        ok: true,
        fallback: false,
        durationMs: provenance.durationMs,
        inputBytes,
        inputTokens: meta?.inputTokens,
        outputTokens: meta?.outputTokens,
        costUnits: meta?.costUnits,
        redactionMatchCount: meta?.inputRedactionMatchCount,
      });
      return { ok: true, value, fallback: false, provenance };
    } catch (err) {
      this.state.jobsThisHour--;
      this.state.jobsToday--;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const provenance = this.buildProvenance(start, task, undefined, errorMessage);
      this.record({
        task,
        provider: this.provider.kind,
        ok: false,
        fallback: true,
        durationMs: provenance.durationMs,
        inputBytes,
        error: errorMessage,
      });
      return {
        ok: false,
        value: fallback,
        fallback: true,
        error: errorMessage,
        provenance,
      };
    }
  }

  generateTitle(text: string): Promise<GenerationResult<TitleResult>> {
    return this.run("title", text, { title: "", confidence: 0 }, async () => {
      const value = await this.provider.generateTitle(text);
      return { value, meta: extractCloudMeta(this.provider) };
    });
  }

  generateSummary(text: string, maxChars?: number): Promise<GenerationResult<SummaryResult>> {
    return this.run("summary", text, { summary: "", confidence: 0 }, async () => {
      const value = await this.provider.generateSummary(text, maxChars);
      return { value, meta: extractCloudMeta(this.provider) };
    });
  }

  detectRedactionHints(text: string): Promise<GenerationResult<RedactionHint[]>> {
    return this.run("redaction_hints", text, [], async () => {
      const value = await this.provider.detectRedactionHints(text);
      return { value, meta: extractCloudMeta(this.provider) };
    });
  }

  detectDuplicates(
    candidate: string,
    existing: string[],
  ): Promise<GenerationResult<DuplicateHint[]>> {
    return this.run("duplicates", candidate, [], async () => {
      const value = await this.provider.detectDuplicates(candidate, existing);
      return { value, meta: extractCloudMeta(this.provider) };
    });
  }

  detectStaleConflict(
    candidate: string,
    context: string[],
  ): Promise<GenerationResult<StaleConflictHint[]>> {
    return this.run("stale_conflict", candidate, [], async () => {
      const value = await this.provider.detectStaleConflict(candidate, context);
      return { value, meta: extractCloudMeta(this.provider) };
    });
  }

  rewriteQuery(query: string): Promise<GenerationResult<QueryRewriteResult>> {
    return this.run(
      "rewrite_query",
      query,
      { rewritten: query, expansions: [], confidence: 0 },
      async () => {
        const value = await this.provider.rewriteQuery(query);
        return { value, meta: extractCloudMeta(this.provider) };
      },
    );
  }

  rerank(
    query: string,
    candidates: Array<{ id: string; text: string }>,
  ): Promise<GenerationResult<RerankResult[]>> {
    const passThroughRanking = candidates.map((c, i) => ({
      id: c.id,
      score: 1 - i * 0.01,
      reason: "passthrough",
    }));
    return this.run("rerank", query, passThroughRanking, async () => {
      const value = await this.provider.rerank(query, candidates);
      return { value, meta: extractCloudMeta(this.provider) };
    });
  }
}

// Optional capability: providers that expose `consumeLastMeta()` (currently
// just CloudProvider) feed token usage, cost, and pre-model redaction counts
// into ModelProvenance. NoopProvider and MockProvider don't implement it, so
// the gateway records zero usage for them.
interface MetaCapableProvider {
  consumeLastMeta(): ProviderCallMeta | undefined;
}

function hasConsumeLastMeta(provider: ModelProvider): provider is ModelProvider & MetaCapableProvider {
  return typeof (provider as Partial<MetaCapableProvider>).consumeLastMeta === "function";
}

function extractCloudMeta(provider: ModelProvider): ProviderCallMeta | undefined {
  if (!hasConsumeLastMeta(provider)) return undefined;
  return provider.consumeLastMeta();
}

// ---- v1.4 Lane C Phase 1 — Fallback gateway factory ----

import { AnthropicAdapter } from "./providers/anthropic.js";
import { OpenAIAdapter } from "./providers/openai.js";
import { OpenRouterProvider } from "./providers/openrouter.js";
import { LocalQwenAdapter } from "./providers/local-qwen.js";
import { FallbackOrchestrator, type FallbackConfig, type FallbackEvent } from "./fallback-orchestrator.js";
import type { LlmProvider } from "./providers/types.js";

/** Environment variables read by createGatewayWithFallback(). */
export interface FallbackGatewayEnv {
  /** Comma-separated provider chain. Default: "openrouter,anthropic,openai,local-qwen" */
  LORE_LLM_PROVIDER_CHAIN?: string;
  LORE_OPENROUTER_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  LORE_LLM_ANTHROPIC_ENDPOINT?: string;
  LORE_LLM_ANTHROPIC_MODEL?: string;
  OPENAI_API_KEY?: string;
  LORE_LLM_OPENAI_ENDPOINT?: string;
  LORE_LLM_OPENAI_MODEL?: string;
  LORE_LOCAL_LLM_URL?: string;
  LORE_LLM_LOCAL_MODEL?: string;
}

/**
 * Factory that builds a FallbackOrchestrator from environment variables.
 *
 * Chain order is driven by LORE_LLM_PROVIDER_CHAIN (default "openrouter,anthropic,openai,local-qwen").
 * The onFallback hook emits an OTel-style event: llm.fallback.activated.
 *
 * This function does NOT modify the existing ModelGateway — it is an additive
 * export that Phase 2 will wire into the actual LLM call sites.
 *
 * ADR ref: docs/v1.4-lane-c-detailed-plan.md §A.4 Step A.7
 */
export function createGatewayWithFallback(
  env: FallbackGatewayEnv = readFallbackEnv(),
  overrides?: Partial<FallbackConfig>,
): FallbackOrchestrator {
  const chainEnv = env.LORE_LLM_PROVIDER_CHAIN ?? "openrouter,anthropic,openai,local-qwen";
  const providerNames = chainEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const providers: LlmProvider[] = providerNames.map((name) =>
    buildProvider(name, env),
  );

  const defaultOnFallback = (event: FallbackEvent): void => {
    // OTel-style structured event — compatible with stream-spans-v13 adapter pattern.
    // In Phase 2, this will be wired to a real OTel tracer via the adapter.
    // Metric: llm.fallback.count; Event: llm.fallback.activated
    const record: Record<string, string | number> = {
      "llm.fallback.from": event.fromProvider,
      "llm.fallback.to": event.toProvider,
      "llm.fallback.reason": event.reason,
      "llm.fallback.attempt": event.attempt,
      "llm.request_id": event.requestId,
    };
    // Emit to stderr as structured JSON so log aggregators can pick it up.
    // Replace with a real OTel span event in Phase 2.
    try {
      process.stderr.write(
        JSON.stringify({ event: "llm.fallback.activated", ...record }) + "\n",
      );
    } catch {
      // Never let the OTel hook break the model path.
    }
  };

  return new FallbackOrchestrator({
    providers,
    maxFallbacks: 2,
    onFallback: overrides?.onFallback ?? defaultOnFallback,
    ...overrides,
  });
}

function buildProvider(name: string, env: FallbackGatewayEnv): LlmProvider {
  switch (name) {
    case "openrouter":
      return new OpenRouterProvider({
        apiKey: env.LORE_OPENROUTER_API_KEY,
      });
    case "anthropic":
      return new AnthropicAdapter({
        apiKey: env.ANTHROPIC_API_KEY,
        baseUrl: env.LORE_LLM_ANTHROPIC_ENDPOINT,
        modelId: env.LORE_LLM_ANTHROPIC_MODEL,
      });
    case "openai":
      return new OpenAIAdapter({
        apiKey: env.OPENAI_API_KEY,
        baseUrl: env.LORE_LLM_OPENAI_ENDPOINT,
        modelId: env.LORE_LLM_OPENAI_MODEL,
      });
    case "local-qwen":
      return new LocalQwenAdapter({
        baseUrl: env.LORE_LOCAL_LLM_URL,
        modelId: env.LORE_LLM_LOCAL_MODEL,
      });
    default:
      throw new Error(`Unknown provider name in LORE_LLM_PROVIDER_CHAIN: "${name}"`);
  }
}

function readFallbackEnv(): FallbackGatewayEnv {
  const e = (typeof process !== "undefined" && process?.env ? process.env : {}) as Record<
    string,
    string | undefined
  >;
  return {
    LORE_LLM_PROVIDER_CHAIN: e["LORE_LLM_PROVIDER_CHAIN"],
    LORE_OPENROUTER_API_KEY: e["LORE_OPENROUTER_API_KEY"],
    ANTHROPIC_API_KEY: e["ANTHROPIC_API_KEY"],
    LORE_LLM_ANTHROPIC_ENDPOINT: e["LORE_LLM_ANTHROPIC_ENDPOINT"],
    LORE_LLM_ANTHROPIC_MODEL: e["LORE_LLM_ANTHROPIC_MODEL"],
    OPENAI_API_KEY: e["OPENAI_API_KEY"],
    LORE_LLM_OPENAI_ENDPOINT: e["LORE_LLM_OPENAI_ENDPOINT"],
    LORE_LLM_OPENAI_MODEL: e["LORE_LLM_OPENAI_MODEL"],
    LORE_LOCAL_LLM_URL: e["LORE_LOCAL_LLM_URL"],
    LORE_LLM_LOCAL_MODEL: e["LORE_LLM_LOCAL_MODEL"],
  };
}

// ---- v1.8 Lane G — V1.8-G4 health endpoint provider chain probe ----

/** Per-provider configured/healthy snapshot for the /health endpoint. */
export interface LlmProviderHealthInfo {
  configured: boolean;
  healthy: boolean;
  latencyMs?: number;
}

/** Aggregate provider-chain health for /health.llmProviderChain. */
export interface LlmProviderChainHealth {
  healthy: boolean;
  openrouter: LlmProviderHealthInfo;
  anthropic: LlmProviderHealthInfo;
  openai: LlmProviderHealthInfo;
  "local-qwen": LlmProviderHealthInfo;
}

export interface ProviderHealthCheckOptions {
  /** Per-probe deadline. Default 500ms. The /health route reuses this as the
   *  outer call deadline so a slow upstream can never delay /health. */
  timeoutMs?: number;
  /** Test seam — when set, replace the OpenRouter probe entirely. */
  openrouterProbe?: () => Promise<boolean>;
}

/**
 * Probe each LLM provider in the chain and return a structured snapshot
 * suitable for the /health endpoint. Never throws — failures are surfaced
 * as healthy=false. Never exposes API key values.
 *
 * Decisions:
 *   * `configured` is purely an env-presence check (cheap, deterministic).
 *   * `healthy` requires `configured=true` AND a successful upstream probe
 *     when one is available. OpenRouter exposes a real `health()` probe
 *     (HTTP GET /models). For Anthropic/OpenAI/local-qwen we have not
 *     wired probe endpoints yet (out of scope per Linear V1.8-G4) — they
 *     report `healthy = configured`, which keeps the contract honest:
 *     we never claim the chain is healthy when the active provider is
 *     unconfigured.
 *   * The aggregate `.healthy` is true when at least one provider in the
 *     chain is healthy, which matches FallbackOrchestrator's behavior.
 *   * Timeouts surface as `healthy=false` rather than rejecting — the
 *     /health route must always return ≤ 1s.
 */
export async function getLlmProviderChainHealth(
  env: FallbackGatewayEnv = readFallbackEnv(),
  options: ProviderHealthCheckOptions = {},
): Promise<LlmProviderChainHealth> {
  const timeoutMs = options.timeoutMs ?? 500;
  const openrouterConfigured = isNonEmpty(env.LORE_OPENROUTER_API_KEY);
  const anthropicConfigured = isNonEmpty(env.ANTHROPIC_API_KEY);
  const openaiConfigured = isNonEmpty(env.OPENAI_API_KEY);
  const localQwenConfigured = isNonEmpty(env.LORE_LOCAL_LLM_URL);

  const openrouter = await probeOpenRouter(env, openrouterConfigured, timeoutMs, options);

  const anthropic: LlmProviderHealthInfo = {
    configured: anthropicConfigured,
    healthy: anthropicConfigured,
  };
  const openai: LlmProviderHealthInfo = {
    configured: openaiConfigured,
    healthy: openaiConfigured,
  };
  const localQwen: LlmProviderHealthInfo = {
    configured: localQwenConfigured,
    healthy: localQwenConfigured,
  };

  const healthy =
    openrouter.healthy || anthropic.healthy || openai.healthy || localQwen.healthy;

  return {
    healthy,
    openrouter,
    anthropic,
    openai,
    "local-qwen": localQwen,
  };
}

function isNonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

async function probeOpenRouter(
  env: FallbackGatewayEnv,
  configured: boolean,
  timeoutMs: number,
  options: ProviderHealthCheckOptions,
): Promise<LlmProviderHealthInfo> {
  if (!configured) {
    return { configured: false, healthy: false };
  }
  const startMs = Date.now();
  try {
    if (options.openrouterProbe) {
      const healthy = await withDeadline(options.openrouterProbe(), timeoutMs);
      return { configured: true, healthy, latencyMs: Date.now() - startMs };
    }
    const provider = new OpenRouterProvider({ apiKey: env.LORE_OPENROUTER_API_KEY });
    const result = await withDeadline(provider.health(), timeoutMs);
    return {
      configured: true,
      healthy: result.healthy,
      latencyMs: Date.now() - startMs,
    };
  } catch {
    return { configured: true, healthy: false, latencyMs: Date.now() - startMs };
  }
}

function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`health_probe_timeout: ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
