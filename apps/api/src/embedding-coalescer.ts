// Lore v1.4 Lane A Phase 2.3 — Embedding request coalescer.
//
// Within a configurable time window (default 50 ms) multiple callers asking
// for the same query string share a single fetcher invocation. This eliminates
// redundant GPU calls when parallel agent-context queries arrive with the same
// text within the same request burst.
//
// Design invariants:
//   * Fetcher is called ONCE per unique query per window — second/third callers
//     wait on the same Promise.
//   * On fetcher reject all coalesced callers receive the same error. No retry.
//   * maxConcurrent limits in-flight distinct queries to prevent GPU saturation.
//     When the limit is reached new queries queue behind a semaphore.
//   * close() is idempotent; rejects any queued callers with a closed error.
//   * The pending map entry persists for windowMs after the Promise settles so
//     late arrivals within the window still coalesce rather than issuing a fresh
//     fetcher call.
//
// Composition with Phase 1 cache (docs/v1.4-embedding-cache.md):
//   embedQueryCached → coalescer.embedQuery → fetcher
//   Cache hit skips the coalescer entirely. Only cache misses enter the window.

export interface CoalescerConfig {
  /** Coalescing window in milliseconds. Default: 50. */
  windowMs?: number;
  /** Max in-flight distinct queries. Default: 32. */
  maxConcurrent?: number;
  /** The underlying embedding fetcher (e.g. GPU inference call). */
  fetcher: (query: string) => Promise<number[]>;
  /** Clock injection for unit tests. Default: Date.now. */
  now?: () => number;
}

export interface CoalescerStats {
  /** Total embedQuery() calls that were merged onto an existing in-flight Promise. */
  coalescedCount: number;
  /** Total embedQuery() calls that triggered a new fetcher invocation. */
  uniqueCount: number;
  /** Number of query keys currently in the pending map (in-flight + settling). */
  pendingMaps: number;
}

// ---------------------------------------------------------------------------
// EmbeddingCoalescer
// ---------------------------------------------------------------------------

export class EmbeddingCoalescer {
  private readonly windowMs: number;
  private readonly maxConcurrent: number;
  private readonly fetcher: (query: string) => Promise<number[]>;

  // Map from query → shared Promise. Entry is inserted synchronously before
  // any await so concurrent callers always find it.
  private readonly pending = new Map<string, Promise<number[]>>();
  // Cleanup timer handles keyed by query (post-settle window).
  private readonly cleanupHandles = new Map<string, ReturnType<typeof setTimeout>>();

  private inflight = 0;
  private readonly waitQueue: Array<() => void> = [];

  private closed = false;

  private _coalescedCount = 0;
  private _uniqueCount = 0;

  constructor(config: CoalescerConfig) {
    this.windowMs = config.windowMs ?? 50;
    this.maxConcurrent = config.maxConcurrent ?? 32;
    this.fetcher = config.fetcher;
  }

  /**
   * Embed a query and return both the vector and whether the request was
   * coalesced onto an existing in-flight Promise (Phase 3.3 OTel attribute).
   * The underlying fetcher is still called at most once per query per window.
   */
  async embedQueryWithMeta(query: string): Promise<{ embedding: number[]; wasCoalesced: boolean }> {
    const hadPending = this.pending.has(query);
    const embedding = await this.embedQuery(query);
    return { embedding, wasCoalesced: hadPending };
  }

  embedQuery(query: string): Promise<number[]> {
    if (this.closed) {
      return Promise.reject(new Error("EmbeddingCoalescer is closed"));
    }

    // Fast path — a pending entry exists; coalesce onto it synchronously.
    const existing = this.pending.get(query);
    if (existing !== undefined) {
      this._coalescedCount++;
      return existing;
    }

    // New query — create the shared Promise and register it synchronously so
    // any subsequent synchronous callers coalesce onto it before we await anything.
    this._uniqueCount++;

    const sharedPromise = this._runWithSlot(query);
    this.pending.set(query, sharedPromise);

    // Schedule post-settle cleanup (insert cleanup after promise settles).
    const windowMs = this.windowMs;
    const scheduleCleanup = () => {
      // Clear any existing cleanup timer for this query.
      const existing = this.cleanupHandles.get(query);
      if (existing !== undefined) clearTimeout(existing);
      const handle = setTimeout(() => {
        // Only delete if the current pending value is still our Promise.
        if (this.pending.get(query) === sharedPromise) {
          this.pending.delete(query);
        }
        this.cleanupHandles.delete(query);
      }, windowMs);
      this.cleanupHandles.set(query, handle);
    };

    sharedPromise.then(
      () => scheduleCleanup(),
      () => {
        // On error remove immediately — no benefit coalescing onto a failed fetch.
        if (this.pending.get(query) === sharedPromise) {
          this.pending.delete(query);
        }
        const h = this.cleanupHandles.get(query);
        if (h !== undefined) { clearTimeout(h); this.cleanupHandles.delete(query); }
      }
    );

    return sharedPromise;
  }

  private async _runWithSlot(query: string): Promise<number[]> {
    // Wait for a concurrency slot.
    await this._acquireSlot();

    if (this.closed) {
      this._releaseSlot();
      throw new Error("EmbeddingCoalescer is closed");
    }

    try {
      return await this.fetcher(query);
    } finally {
      this._releaseSlot();
    }
  }

  stats(): CoalescerStats {
    return {
      coalescedCount: this._coalescedCount,
      uniqueCount: this._uniqueCount,
      pendingMaps: this.pending.size
    };
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    // Clear all post-settle cleanup timers.
    for (const handle of this.cleanupHandles.values()) {
      clearTimeout(handle);
    }
    this.cleanupHandles.clear();
    this.pending.clear();

    // Drain the wait queue so blocked callers unblock and receive the closed error.
    for (const resolve of this.waitQueue.splice(0)) {
      resolve();
    }
  }

  // ---------------------------------------------------------------------------
  // Concurrency semaphore
  // ---------------------------------------------------------------------------

  private _acquireSlot(): Promise<void> {
    if (this.inflight < this.maxConcurrent) {
      this.inflight++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  private _releaseSlot(): void {
    const next = this.waitQueue.shift();
    if (next) {
      // Pass the slot directly to the next waiter without decrementing.
      next();
    } else {
      this.inflight--;
    }
  }
}
