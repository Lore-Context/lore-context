import { metrics } from "@opentelemetry/api";
import { log } from "./logger.js";
import type { EmbeddingCache } from "./embedding-cache.js";
import type { EmbeddingCoalescer } from "./embedding-coalescer.js";

// Embedding service client for Lore v1.1.
//
// Wraps the private embedding-service HTTP endpoint (HuggingFace TEI or vLLM)
// that runs Qwen/Qwen3-Embedding-0.6B at 1024 dimensions by default.
//
// Mock mode activates automatically when NODE_ENV=test or LORE_EMBEDDING_MOCK=1
// so tests never need a real model endpoint.

// ── Config ───────────────────────────────────────────────────────────────────

export interface EmbeddingConfig {
  provider: string;
  model: string;
  dim: number;
  baseUrl: string;
  queryInstruction: string;
  mockMode: boolean;
  timeoutMs: number;
}

export const DEFAULT_QUERY_INSTRUCTION =
  "Retrieve relevant Lore memory records for the user's current agent-context question. " +
  "Prefer durable preferences, decisions, project facts, source-backed memories, and recent non-expired facts.";

export function readEmbeddingConfig(env: NodeJS.ProcessEnv = process.env): EmbeddingConfig {
  const isMock =
    env.LORE_EMBEDDING_MOCK === "1" ||
    (env.NODE_ENV === "test" && env.LORE_EMBEDDING_MOCK !== "0");
  return {
    provider: env.LORE_EMBEDDING_PROVIDER ?? "qwen3",
    model: env.LORE_EMBEDDING_MODEL ?? "Qwen/Qwen3-Embedding-0.6B",
    dim: Number(env.LORE_EMBEDDING_DIM ?? "1024"),
    baseUrl: env.LORE_EMBEDDING_BASE_URL ?? "http://embedding-service:8080",
    queryInstruction: env.LORE_QUERY_INSTRUCTION ?? DEFAULT_QUERY_INSTRUCTION,
    mockMode: isMock,
    timeoutMs: Number(env.LORE_EMBEDDING_TIMEOUT_MS ?? "30000"),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmbedInput {
  id: string;
  text: string;
  isQuery?: boolean;
}

export interface EmbedResult {
  id: string;
  dense: number[];
  model: string;
  dim: number;
  durationMs: number;
  mock: boolean;
}

export class EmbeddingCircuitOpenError extends Error {
  constructor() {
    super("embedding service circuit is open");
    this.name = "EmbeddingCircuitOpenError";
  }
}

const EMBEDDING_FAILURE_WINDOW_MS = 10_000;
const EMBEDDING_FAILURE_THRESHOLD = 3;

const embeddingCircuitState = {
  count: 0,
  windowStart: 0,
  circuitOpen: false,
};

let embeddingServiceErrorsCounter:
  | ReturnType<ReturnType<typeof metrics.getMeter>["createCounter"]>
  | undefined;
let embeddingCircuitOpenCounter:
  | ReturnType<ReturnType<typeof metrics.getMeter>["createCounter"]>
  | undefined;

function embeddingCounter(name: string, description: string) {
  return metrics
    .getMeter("lore-api")
    .createCounter(name, { description });
}

function recordEmbeddingServiceFailure(now = Date.now()): void {
  embeddingServiceErrorsCounter ??= embeddingCounter(
    "lore.embedding.service.errors",
    "Embedding service call failures",
  );
  embeddingServiceErrorsCounter.add(1);

  if (
    embeddingCircuitState.windowStart === 0 ||
    now - embeddingCircuitState.windowStart > EMBEDDING_FAILURE_WINDOW_MS
  ) {
    embeddingCircuitState.windowStart = now;
    embeddingCircuitState.count = 0;
  }

  embeddingCircuitState.count += 1;

  if (
    !embeddingCircuitState.circuitOpen &&
    embeddingCircuitState.count >= EMBEDDING_FAILURE_THRESHOLD
  ) {
    embeddingCircuitState.circuitOpen = true;
    embeddingCircuitOpenCounter ??= embeddingCounter(
      "lore.embedding.circuit_open",
      "Embedding service circuit breaker open transitions",
    );
    embeddingCircuitOpenCounter.add(1);
  }
}

function resetEmbeddingFailures(): void {
  embeddingCircuitState.count = 0;
  embeddingCircuitState.windowStart = 0;
}

export function __resetEmbeddingCircuitForTests(): void {
  resetEmbeddingFailures();
  embeddingCircuitState.circuitOpen = false;
}

// ── Client ────────────────────────────────────────────────────────────────────

export class EmbeddingClient {
  private readonly config: EmbeddingConfig;

  constructor(config?: EmbeddingConfig) {
    this.config = config ?? readEmbeddingConfig();
  }

  async embedSingle(input: EmbedInput): Promise<EmbedResult> {
    const results = await this.embedBatch([input]);
    return results[0];
  }

  async embedBatch(inputs: EmbedInput[]): Promise<EmbedResult[]> {
    if (inputs.length === 0) return [];

    if (this.config.mockMode) {
      return inputs.map((inp) => this.mockResult(inp));
    }

    const t0 = Date.now();
    try {
      return await this.callService(inputs, t0);
    } catch (err) {
      log.error("embedding: batch failed", {
        model: this.config.model,
        count: inputs.length,
        error: String(err),
      });
      throw err;
    }
  }

  private async callService(inputs: EmbedInput[], t0: number): Promise<EmbedResult[]> {
    if (embeddingCircuitState.circuitOpen) {
      throw new EmbeddingCircuitOpenError();
    }

    const texts = inputs.map((inp) => {
      if (inp.isQuery) return `${this.config.queryInstruction}\n${inp.text}`;
      return inp.text;
    });

    let data: { data: Array<{ embedding: number[]; index: number }> };
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          input: texts,
          dimensions: this.config.dim,
          encoding_format: "float",
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`embedding service ${response.status}: ${body.slice(0, 200)}`);
      }

      data = await response.json() as {
        data: Array<{ embedding: number[]; index: number }>;
      };
    } catch (err) {
      recordEmbeddingServiceFailure();
      throw err;
    }
    resetEmbeddingFailures();

    const durationMs = Date.now() - t0;
    const sorted = [...data.data].sort((a, b) => a.index - b.index);

    return sorted.map((item, i) => ({
      id: inputs[i].id,
      dense: item.embedding,
      model: this.config.model,
      dim: this.config.dim,
      durationMs: Math.round(durationMs / inputs.length),
      mock: false,
    }));
  }

  private mockResult(inp: EmbedInput): EmbedResult {
    // Deterministic non-zero mock vector derived from input id for test assertions
    const seed = hashStrToSeed(inp.id);
    const dense = Array.from({ length: this.config.dim }, (_, i) =>
      Math.sin(seed + i) * 0.01
    );
    return {
      id: inp.id,
      dense,
      model: `mock/${this.config.model}`,
      dim: this.config.dim,
      durationMs: 0,
      mock: true,
    };
  }

  get model(): string { return this.config.model; }
  get dim(): number { return this.config.dim; }
  get isMock(): boolean { return this.config.mockMode; }
}

function hashStrToSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ── Cache-aware wrapper ────────────────────────────────────────────────────────
//
// embedQueryCached is an opt-in wrapper around an arbitrary fetcher function
// (typically EmbeddingClient.embedSingle) that adds a two-level cache lookup
// (LRU + optional Redis) before calling the GPU service.
//
// Existing callers of embedSingle/embedBatch are unaffected — this is purely
// additive. OTel attributes are emitted on the provided span when supplied.

export interface CachedEmbedSpan {
  setAttribute(key: string, value: string | number | boolean): unknown;
  end(): unknown;
}

export interface CachedEmbedOptions {
  /** Optional OTel span to record cache hit/miss attributes on. */
  span?: CachedEmbedSpan;
}

/**
 * Embed a single query string with cache look-up.
 *
 * @param query   Raw query text (no instruction prefix applied here).
 * @param cache   EmbeddingCache instance (handles Redis + LRU).
 * @param fetcher Async function that calls the GPU embedding service.
 * @param opts    Optional OTel span for attribute emission.
 * @returns       Dense embedding vector.
 */
export async function embedQueryCached(
  query: string,
  cache: EmbeddingCache,
  fetcher: (query: string) => Promise<number[]>,
  opts: CachedEmbedOptions = {},
): Promise<number[]> {
  const t0 = Date.now();

  const cached = await cache.get(query);
  if (cached !== undefined) {
    const latencyMs = Date.now() - t0;
    if (opts.span) {
      opts.span.setAttribute("embedding.cache.hit", true);
      opts.span.setAttribute("embedding.cache.latency_ms", latencyMs);
      opts.span.end();
    }
    return cached;
  }

  const tFetch0 = Date.now();
  const embedding = await fetcher(query);
  const missLatencyMs = Date.now() - tFetch0;

  await cache.set(query, embedding);

  if (opts.span) {
    opts.span.setAttribute("embedding.cache.hit", false);
    opts.span.setAttribute("embedding.cache.miss_latency_ms", missLatencyMs);
    opts.span.end();
  }

  return embedding;
}

// ── Cache + Coalescer wrapper (Phase 3.2) ─────────────────────────────────────
//
// embedQueryCachedAndCoalesced layers the Phase 1 cache on top of the Phase 2.3
// coalescer. Cache hit bypasses the coalescer entirely. Only cache misses enter
// the 50 ms coalescing window. This matches the composition documented in
// embedding-coalescer.ts:
//   embedQueryCachedAndCoalesced → cache.get → [hit? return] → coalescer.embedQueryWithMeta → cache.set

export interface CachedCoalescedConfig {
  cache: EmbeddingCache;
  coalescer: EmbeddingCoalescer;
}

export interface CachedCoalescedResult {
  embedding: number[];
  wasCoalesced: boolean;
}

/**
 * Embed a single query string with two-level cache + coalescer.
 *
 * - Cache hit → returns immediately, coalescer never invoked.
 * - Cache miss → delegates to coalescer (which deduplicates concurrent requests
 *   for the same query within the 50 ms window), then writes result to cache.
 *
 * Returns the embedding vector alongside a wasCoalesced flag for OTel telemetry.
 */
export async function embedQueryCachedAndCoalesced(
  query: string,
  config: CachedCoalescedConfig,
  opts: CachedEmbedOptions = {},
): Promise<CachedCoalescedResult> {
  const cached = await config.cache.get(query);
  if (cached !== undefined) {
    if (opts.span) {
      opts.span.setAttribute("embedding.cache.hit", true);
      opts.span.end();
    }
    return { embedding: cached, wasCoalesced: false };
  }

  // Capture pending_size before the await so we see the queue depth at enqueue time.
  const pendingSizeAtEnqueue = config.coalescer.stats().pendingMaps;
  const meta = await config.coalescer.embedQueryWithMeta(query);
  await config.cache.set(query, meta.embedding);

  if (opts.span) {
    opts.span.setAttribute("embedding.cache.hit", false);
    opts.span.setAttribute("embedding.coalesced", meta.wasCoalesced);
    opts.span.setAttribute("embedding.coalescer.pending_size", pendingSizeAtEnqueue);
    opts.span.end();
  }

  return meta;
}
