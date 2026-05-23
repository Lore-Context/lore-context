import type { Meter } from "@opentelemetry/api";
import { metrics } from "@opentelemetry/api";
import type { RerankerProvider } from "@lore/search";
import type { RerankResult } from "./cohere-client.js";
import { CohereRerankError, cohereRerank } from "./cohere-client.js";

const DEFAULT_PROVIDER = "stub";
const COHERE_TIMEOUT_MS = 800;
const ERROR_WINDOW_MS = 5 * 60 * 1000;
const ERROR_RATE_THRESHOLD = 0.05;

export interface Reranker {
  rerank(query: string, docs: string[], topK: number): Promise<RerankResult[]>;
}

export interface CreateRerankerOptions {
  env?: Record<string, string | undefined>;
  meter?: Pick<Meter, "createCounter" | "createHistogram">;
  now?: () => number;
  cohereRerankFn?: typeof cohereRerank;
}

type ProviderName = "stub" | "cohere";

interface Attempt {
  ts: number;
  failed: boolean;
}

function resolveProvider(env: Record<string, string | undefined>): ProviderName {
  const raw = env.LORE_RERANKER_PROVIDER?.trim().toLowerCase();
  if (!raw) return DEFAULT_PROVIDER;
  if (raw === "stub" || raw === "cohere") return raw;
  return DEFAULT_PROVIDER;
}

function createStubReranker(): Reranker {
  return {
    async rerank(_query, docs, topK) {
      return docs.slice(0, topK).map((document, index) => ({
        index,
        document,
        relevanceScore: Math.max(0, 1 - index * 0.000001),
      }));
    },
  };
}

function getStatusCode(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const status = (err as { status?: unknown; statusCode?: unknown; code?: unknown }).status
    ?? (err as { statusCode?: unknown }).statusCode
    ?? (err as { code?: unknown }).code;
  return typeof status === "number" ? status : undefined;
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof CohereRerankError && err.code === "timeout";
}

function isHttp5xx(err: unknown): boolean {
  const status = getStatusCode(err);
  if (typeof status === "number" && status >= 500 && status < 600) return true;
  if (err instanceof Error && err.cause) return isHttp5xx(err.cause);
  return err instanceof Error && /\b5\d\d\b/.test(err.message);
}

function createCohereFallbackReranker(options: Required<Pick<CreateRerankerOptions, "now" | "cohereRerankFn">> & {
  meter: Pick<Meter, "createCounter" | "createHistogram">;
}): Reranker {
  const stub = createStubReranker();
  const attempts: Attempt[] = [];
  const fallbackCounter = options.meter.createCounter("lore.reranker.fallback_triggered");
  const latencyHistogram = options.meter.createHistogram("lore.reranker.latency_ms");

  function prune(now: number): void {
    const cutoff = now - ERROR_WINDOW_MS;
    while (attempts.length > 0 && attempts[0]!.ts < cutoff) {
      attempts.shift();
    }
  }

  function errorRateBreached(now: number): boolean {
    prune(now);
    if (attempts.length === 0) return false;
    const failures = attempts.filter((attempt) => attempt.failed).length;
    return failures / attempts.length > ERROR_RATE_THRESHOLD;
  }

  async function fallback(query: string, docs: string[], topK: number, reason: string): Promise<RerankResult[]> {
    fallbackCounter.add(1, { reason });
    return stub.rerank(query, docs, topK);
  }

  return {
    async rerank(query, docs, topK) {
      const startedAt = options.now();
      if (errorRateBreached(startedAt)) {
        return fallback(query, docs, topK, "error_rate");
      }

      let timeoutId: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new CohereRerankError(`Cohere rerank timed out after ${COHERE_TIMEOUT_MS}ms`, { code: "timeout" }));
        }, COHERE_TIMEOUT_MS);
      });

      try {
        const result = await Promise.race([
          options.cohereRerankFn(query, docs, topK),
          timeout,
        ]);
        attempts.push({ ts: options.now(), failed: false });
        prune(options.now());
        return result;
      } catch (err) {
        attempts.push({ ts: options.now(), failed: true });
        prune(options.now());
        const reason = isTimeoutError(err) ? "timeout" : isHttp5xx(err) ? "http_5xx" : "error";
        return fallback(query, docs, topK, reason);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        latencyHistogram.record(options.now() - startedAt);
      }
    },
  };
}

export function createReranker(options: CreateRerankerOptions = {}): Reranker {
  const env = options.env ?? process.env;
  const provider = resolveProvider(env);
  if (provider === "stub") return createStubReranker();
  return createCohereFallbackReranker({
    meter: options.meter ?? metrics.getMeter("lore.reranker"),
    now: options.now ?? Date.now,
    cohereRerankFn: options.cohereRerankFn ?? cohereRerank,
  });
}

export function createRerankerProvider(options: CreateRerankerOptions = {}): RerankerProvider {
  const reranker = createReranker(options);
  return {
    name: `factory-${resolveProvider(options.env ?? process.env)}`,
    async rerank(input) {
      const documents = input.candidates.map((candidate) => candidate.text || candidate.itemId);
      const results = await reranker.rerank(input.query, documents, input.limit);
      return results.flatMap((result) => {
        const candidate = input.candidates[result.index];
        if (!candidate) return [];
        return [{
          itemId: candidate.itemId,
          chunkId: candidate.chunkId,
          score: result.relevanceScore,
          reason: "factory",
        }];
      });
    },
  };
}
