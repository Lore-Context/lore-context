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
