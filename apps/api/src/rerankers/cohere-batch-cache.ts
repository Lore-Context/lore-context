// Lore v1.8 Lane Q V1.8-Q5 — Cohere reranker batch+cache wrapper.
//
// Wraps a CohereClientLike (the `rerank` method shape) and adds:
//   1. In-memory LRU cache keyed by sha256(query + sorted candidate texts),
//      TTL and max-entries env-overridable.
//   2. Concurrent-request coalescing: a second caller with the same cache key
//      while the first is in flight reuses the in-flight Promise (same pattern
//      as EmbeddingCoalescer — see embedding-coalescer.ts).
//   3. Falls open on cache layer errors: any throw from cache bookkeeping falls
//      back to a plain client call. Cohere errors propagate normally.
//
// Metrics are exposed via metrics() for a future /health integration.
// The wrapper is NOT wired into the reranker factory in this PR.

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** Minimal shape of the Cohere rerank function this wrapper depends on. */
export interface CohereClientLike {
  rerank(query: string, documents: string[], topK: number): Promise<RerankResult[]>;
}

export interface RerankResult {
  index: number;
  document: string;
  relevanceScore: number;
}

export interface BatchCacheConfig {
  /** Underlying client to delegate to on cache miss. */
  client: CohereClientLike;
  /** Cache TTL in seconds. Default: env LORE_COHERE_CACHE_TTL_SEC ?? 300. */
  ttlSec?: number;
  /** Maximum LRU entries before evicting oldest. Default: env LORE_COHERE_CACHE_MAX ?? 1000. */
  maxEntries?: number;
  /** Clock injection for unit tests. Default: Date.now. */
  now?: () => number;
}

export interface BatchCacheMetrics {
  hits: number;
  misses: number;
  coalesced: number;
  evictions: number;
}

// ---------------------------------------------------------------------------
// Internal LRU cache node
// ---------------------------------------------------------------------------

interface CacheEntry {
  key: string;
  results: RerankResult[];
  expiresAt: number;
  /** Doubly-linked list pointers for O(1) LRU eviction. */
  prev: CacheEntry | null;
  next: CacheEntry | null;
}

// ---------------------------------------------------------------------------
// CohereBatchCache
// ---------------------------------------------------------------------------

export class CohereBatchCache {
  private readonly client: CohereClientLike;
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  // LRU doubly-linked list: head = most-recently-used, tail = least-recently-used.
  private readonly map = new Map<string, CacheEntry>();
  private head: CacheEntry | null = null;
  private tail: CacheEntry | null = null;

  // In-flight coalescing map: key → Promise<RerankResult[]>
  private readonly inflight = new Map<string, Promise<RerankResult[]>>();

  private _hits = 0;
  private _misses = 0;
  private _coalesced = 0;
  private _evictions = 0;

  constructor(config: BatchCacheConfig) {
    this.client = config.client;
    this.ttlMs =
      (config.ttlSec ?? Number(process.env["LORE_COHERE_CACHE_TTL_SEC"] ?? 300)) * 1000;
    this.maxEntries =
      config.maxEntries ?? Number(process.env["LORE_COHERE_CACHE_MAX"] ?? 1000);
    this.now = config.now ?? (() => Date.now());
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  rerank(query: string, documents: string[], topK: number): Promise<RerankResult[]> {
    const key = buildCacheKey(query, documents);

    // 1. Cache hit (fast path — no async needed).
    try {
      const cached = this._getCached(key);
      if (cached !== undefined) {
        this._hits++;
        return Promise.resolve(cached);
      }
    } catch {
      // Cache layer error → fall through to client call.
    }

    // 2. Coalesce onto an in-flight Promise if one exists for this key.
    const existing = this.inflight.get(key);
    if (existing !== undefined) {
      this._coalesced++;
      return existing;
    }

    // 3. Cache miss — start a new call and register it for coalescing.
    this._misses++;
    const promise = this._fetchAndCache(key, query, documents, topK);
    this.inflight.set(key, promise);

    // Remove from inflight map once settled (success or error).
    // The .catch(noop) suppresses unhandled-rejection warnings on the cleanup
    // chain; the original `promise` still rejects callers normally.
    promise.then(
      () => { if (this.inflight.get(key) === promise) this.inflight.delete(key); },
      () => { if (this.inflight.get(key) === promise) this.inflight.delete(key); }
    );

    return promise;
  }

  metrics(): BatchCacheMetrics {
    return {
      hits: this._hits,
      misses: this._misses,
      coalesced: this._coalesced,
      evictions: this._evictions,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async _fetchAndCache(
    key: string,
    query: string,
    documents: string[],
    topK: number
  ): Promise<RerankResult[]> {
    // Cohere errors propagate — not caught here.
    const results = await this.client.rerank(query, documents, topK);

    try {
      this._setCached(key, results);
    } catch {
      // Cache write failure → fall open (results already obtained).
    }

    return results;
  }

  private _getCached(key: string): RerankResult[] | undefined {
    const entry = this.map.get(key);
    if (entry === undefined) return undefined;
    if (this.now() >= entry.expiresAt) {
      // Expired — evict and return undefined.
      this._unlink(entry);
      this.map.delete(key);
      return undefined;
    }
    // Move to head (most recently used).
    this._moveToHead(entry);
    return entry.results;
  }

  private _setCached(key: string, results: RerankResult[]): void {
    // Overwrite existing entry if present.
    const existing = this.map.get(key);
    if (existing !== undefined) {
      existing.results = results;
      existing.expiresAt = this.now() + this.ttlMs;
      this._moveToHead(existing);
      return;
    }

    // Evict LRU entry if at capacity.
    if (this.map.size >= this.maxEntries) {
      this._evictLRU();
    }

    const entry: CacheEntry = {
      key,
      results,
      expiresAt: this.now() + this.ttlMs,
      prev: null,
      next: null,
    };
    this.map.set(key, entry);
    this._prepend(entry);
  }

  // ---- Doubly-linked list helpers -----------------------------------------

  private _prepend(entry: CacheEntry): void {
    entry.next = this.head;
    entry.prev = null;
    if (this.head !== null) this.head.prev = entry;
    this.head = entry;
    if (this.tail === null) this.tail = entry;
  }

  private _unlink(entry: CacheEntry): void {
    if (entry.prev !== null) entry.prev.next = entry.next;
    else this.head = entry.next;
    if (entry.next !== null) entry.next.prev = entry.prev;
    else this.tail = entry.prev;
    entry.prev = null;
    entry.next = null;
  }

  private _moveToHead(entry: CacheEntry): void {
    if (this.head === entry) return;
    this._unlink(entry);
    this._prepend(entry);
  }

  private _evictLRU(): void {
    if (this.tail === null) return;
    const lru = this.tail;
    this._unlink(lru);
    this.map.delete(lru.key);
    this._evictions++;
  }
}

// ---------------------------------------------------------------------------
// Cache key derivation
// ---------------------------------------------------------------------------

function buildCacheKey(query: string, documents: string[]): string {
  const sortedDocs = [...documents].sort().join("\0");
  return createHash("sha256")
    .update(query)
    .update("\x00")
    .update(sortedDocs)
    .digest("hex");
}
