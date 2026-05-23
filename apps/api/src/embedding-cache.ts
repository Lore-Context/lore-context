// Lore v1.4 Lane A Phase 1 — Embedding cache (Redis + LRU fallback).
//
// Caches query-text → embedding vectors to avoid repeated GPU calls.
// Cache key: sha256(modelId + ':' + query) — vault_id intentionally omitted
// because query text is already tenant-scoped, and same query across vaults
// produces an identical embedding vector.
//
// Storage hierarchy:
//   1. In-process LRU (always active, max lruMaxEntries entries)
//   2. Redis (optional; falls back to LRU-only on connection error or timeout)
//
// On Redis failure the cache degrades silently to LRU-only and emits an OTel
// event `embedding.cache.degraded` so the alarm fires without blocking the
// request path.

import { createHash } from "node:crypto";

// ── OTel event shim ───────────────────────────────────────────────────────────
// Matches the lightweight OtelSpan interface used across this codebase
// (stream-spans-v13.ts pattern) without pulling in @opentelemetry/api.

export interface CacheSpan {
  setAttribute(key: string, value: string | number | boolean): unknown;
  addEvent?(name: string): unknown;
  end(): unknown;
}

export interface CacheTracer {
  startSpan(name: string): CacheSpan;
}

// ── Redis client interface ─────────────────────────────────────────────────────
// We accept any object that implements this minimal subset so tests can pass
// a plain in-memory stub and production can pass an ioredis client.

export interface RedisClient {
  get(key: string, options?: { signal?: AbortSignal }): Promise<string | null>;
  set(key: string, value: string, exSeconds: number): Promise<unknown>;
  quit(): Promise<unknown>;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface EmbeddingCacheConfig {
  /** Master switch. When false, get() always returns undefined, set() is no-op. */
  enabled: boolean;
  /** Optional pre-connected Redis client. Omit for LRU-only mode. */
  redisClient?: RedisClient;
  /** TTL for generic queries. Default 86400 (24 h). */
  defaultTtlSec: number;
  /**
   * TTL for queries containing named entities. Default 1800 (30 min).
   * v1.8 Q4: NER queries change shape often; shorter TTL reduces stale-hit risk
   * at low memory cost. Override via LORE_EMBEDDING_CACHE_TTL_NER.
   */
  namedEntityTtlSec: number;
  /**
   * TTL for canonical-entity queries (non-NER stable identifiers). Default 7200 (2 h).
   * v1.8 Q4: Canonical names are stable identifiers set at ingestion; longer TTL
   * reduces re-embedding cost with negligible staleness risk.
   * Override via LORE_EMBEDDING_CACHE_TTL_CANONICAL.
   */
  canonicalEntityTtlSec: number;
  /** Max entries in the in-process LRU. Default 10000. */
  lruMaxEntries: number;
  /** Model dimension — included in the cache key so model upgrades auto-bust. */
  modelId: string;
  /** Injected predicate: returns true when the query contains a named entity. */
  containsNamedEntity?: (query: string) => boolean;
  /** Clock injection for unit tests. */
  now?: () => number;
  /** OTel tracer for emitting cache events. Optional — no-op when absent. */
  tracer?: CacheTracer;
  /** Hard timeout (ms) for Redis get() calls. Default 20. */
  redisTimeoutMs?: number;
}

/** Build an EmbeddingCacheConfig from environment variables with safe defaults. */
export function readEmbeddingCacheConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: Partial<EmbeddingCacheConfig> = {},
): EmbeddingCacheConfig {
  return {
    enabled: env.LORE_EMBEDDING_CACHE_ENABLED === "1",
    defaultTtlSec: Number(env.LORE_EMBEDDING_CACHE_TTL_SEC ?? "86400"),
    // v1.8 Q4: NER queries change shape often; shorter TTL reduces stale-hit risk.
    namedEntityTtlSec: Number(env.LORE_EMBEDDING_CACHE_TTL_NER ?? "1800"),
    // v1.8 Q4: Canonical names are stable; longer TTL reduces re-embedding cost.
    canonicalEntityTtlSec: Number(env.LORE_EMBEDDING_CACHE_TTL_CANONICAL ?? "7200"),
    lruMaxEntries: 10000,
    modelId: env.LORE_EMBEDDING_MODEL ?? "qwen3-embedding-0.6b-1024",
    redisTimeoutMs: 20,
    ...overrides,
  };
}

// ── Internal LRU ──────────────────────────────────────────────────────────────
// Simple Map-based LRU. Map preserves insertion order; on access we delete and
// re-insert to move the entry to tail. On eviction we remove from head.

interface LruEntry {
  embedding: number[];
  expiresAt: number; // epoch ms
}

class SimpleLru {
  private readonly map = new Map<string, LruEntry>();
  private readonly maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get(key: string, now: number): number[] | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < now) {
      this.map.delete(key);
      return undefined;
    }
    // Move to tail (most-recently-used).
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.embedding;
  }

  set(key: string, embedding: number[], ttlSec: number, now: number): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      // Evict the head (least-recently-used).
      const firstKey = this.map.keys().next().value as string;
      this.map.delete(firstKey);
    }
    this.map.set(key, { embedding, expiresAt: now + ttlSec * 1000 });
  }

  get size(): number {
    return this.map.size;
  }
}

// ── Key normalization ──────────────────────────────────────────────────────────
// Exported so tests can verify normalization behaviour independently.
//
// Rules (applied in order):
//   1. Trim leading/trailing whitespace.
//   2. Collapse internal whitespace sequences to a single space.
//   3. Lowercase.
//   4. Strip leading and trailing non-word characters (punctuation, symbols).
//   5. Guard: if result is empty, fall back to the original trimmed string.

export function normalizeEmbeddingCacheKey(input: string): string {
  if (input == null) {
    throw new TypeError("normalizeEmbeddingCacheKey: input must be a string");
  }
  const trimmed = input.trim();
  if (trimmed === "") return trimmed;
  const collapsed = trimmed.replace(/\s+/g, " ");
  const lowered = collapsed.toLowerCase();
  const stripped = lowered.replace(/^[^\w]+|[^\w]+$/g, "");
  return stripped.length > 0 ? stripped : trimmed;
}

// ── EmbeddingCache ─────────────────────────────────────────────────────────────

export interface CacheStats {
  hitRate: number;
  hits: number;
  misses: number;
  lruSize: number;
}

export class EmbeddingCache {
  private readonly cfg: EmbeddingCacheConfig;
  private readonly lru: SimpleLru;
  private hits = 0;
  private misses = 0;
  private redisAvailable: boolean;
  private closed = false;

  constructor(config: EmbeddingCacheConfig) {
    this.cfg = config;
    this.lru = new SimpleLru(config.lruMaxEntries);
    this.redisAvailable = config.redisClient !== undefined;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async get(query: string): Promise<number[] | undefined> {
    if (!this.cfg.enabled) return undefined;

    const startedAt = Date.now();
    const span = this.cfg.tracer?.startSpan("embedding.cache.lookup");
    const key = this.cacheKey(query);
    const now = this.now();

    // 1. Try LRU first (zero network cost).
    const lruHit = this.lru.get(key, now);
    if (lruHit !== undefined) {
      this.hits++;
      span?.setAttribute("embedding.cache.hit", true);
      span?.end();
      return lruHit;
    }

    // 2. Try Redis with hard timeout.
    if (this.redisAvailable && this.cfg.redisClient) {
      const redisResult = await this.redisGet(key);
      if (redisResult !== null && redisResult !== undefined) {
        // Warm LRU so next request avoids Redis.
        const ttl = this.ttlFor(query);
        this.lru.set(key, redisResult, ttl, now);
        this.hits++;
        span?.setAttribute("embedding.cache.hit", true);
        span?.end();
        return redisResult;
      }
    }

    this.misses++;
    span?.setAttribute("embedding.cache.hit", false);
    span?.setAttribute("embedding.cache.miss_latency_ms", Date.now() - startedAt);
    span?.end();
    return undefined;
  }

  async set(query: string, embedding: number[]): Promise<void> {
    if (!this.cfg.enabled) return;

    const key = this.cacheKey(query);
    const ttl = this.ttlFor(query);
    const now = this.now();

    // Write to LRU unconditionally.
    this.lru.set(key, embedding, ttl, now);

    // Write to Redis if available.
    if (this.redisAvailable && this.cfg.redisClient) {
      await this.redisSet(key, embedding, ttl);
    }
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hitRate: total === 0 ? 0 : this.hits / total,
      hits: this.hits,
      misses: this.misses,
      lruSize: this.lru.size,
    };
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.cfg.redisClient) {
      await this.cfg.redisClient.quit().catch(() => {
        // Ignore quit errors — we are closing anyway.
      });
    }
  }

  /**
   * v1.4 Lane A Phase 4 race-fix: attach Redis client to an existing cache
   * instance instead of swapping the whole instance. Callers (production
   * startup wiring) instantiate the cache LRU-only synchronously, then attach
   * Redis once `resolveRedisClient` resolves. This avoids a closure-capture
   * race where downstream callers held a reference to the original LRU-only
   * instance while the swap-in instance lived in a different variable.
   *
   * Idempotent: calling with the same client twice has no effect. Calling
   * with a new client replaces the previous one and resets `redisAvailable`.
   */
  attachRedis(redisClient: RedisClient): void {
    if (this.closed) return;
    if (this.cfg.redisClient === redisClient) return;
    this.cfg.redisClient = redisClient;
    this.redisAvailable = true;
  }

  /** Test helper: returns true when a Redis client is wired and degradation has not fired. */
  isRedisWired(): boolean {
    return this.redisAvailable && this.cfg.redisClient !== undefined;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private cacheKey(query: string): string {
    const normalized = normalizeEmbeddingCacheKey(query);
    const payload = `${this.cfg.modelId}:${normalized}`;
    return `embedding:v1:${createHash("sha256").update(payload).digest("hex")}`;
  }

  private ttlFor(query: string): number {
    const isNer =
      typeof this.cfg.containsNamedEntity === "function"
        ? this.cfg.containsNamedEntity(query)
        : false;
    if (isNer) return this.cfg.namedEntityTtlSec;
    // Prefer canonicalEntityTtlSec for stable queries when present.
    return this.cfg.canonicalEntityTtlSec ?? this.cfg.defaultTtlSec;
  }

  private now(): number {
    return typeof this.cfg.now === "function" ? this.cfg.now() : Date.now();
  }

  private async redisGet(key: string): Promise<number[] | null | undefined> {
    const timeoutMs = this.cfg.redisTimeoutMs ?? 20;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const result = await Promise.race([
        this.cfg.redisClient!.get(key, { signal: ac.signal }),
        new Promise<null>((resolve) => {
          ac.signal.addEventListener("abort", () => resolve(null), { once: true });
        }),
      ]);
      if (result === null || result === undefined) return result;
      return JSON.parse(result) as number[];
    } catch (err) {
      if (
        err instanceof Error &&
        (err.name === "AbortError" || err.message === "AbortError")
      ) {
        return null;
      }
      this.onRedisDegraded();
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  private async redisSet(key: string, embedding: number[], ttlSec: number): Promise<void> {
    try {
      await this.cfg.redisClient!.set(key, JSON.stringify(embedding), ttlSec);
    } catch {
      this.onRedisDegraded();
    }
  }

  private onRedisDegraded(): void {
    this.redisAvailable = false;
    if (this.cfg.tracer) {
      const span = this.cfg.tracer.startSpan("embedding.cache.degraded");
      span.setAttribute("embedding.cache.degraded", true);
      if (typeof span.addEvent === "function") {
        span.addEvent("embedding.cache.degraded");
      }
      span.end();
    }
  }
}
