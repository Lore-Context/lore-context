// Lore Context v1.4 — Lane 0: SearchAdapterV14 integration tests.
//
// Coverage (per spec):
//   V14-1   Default: 7 streams loaded → all 7 providers called.
//   V14-2   enabledStreams=["postgres_fts"] → only fts, 6 others not instantiated.
//   V14-3   qdrantClient=null → qdrant_dense + qdrant_sparse silently skipped.
//   V14-4   One stream throws → orchestrator allSettled, others still return.
//   V14-5   Per-stream timeout: timed-out stream dropped, timed_out event emitted.
//   V14-6   onStreamEvent: each active stream emits ok/timed_out/failed event.
//   V14-7   rerank=true with reranker → reranker called once.
//   V14-8   rerank=false → reranker NOT called.
//   V14-9   v1.3 byte-identical: enabledStreams=postgres only + timeout null.
//   V14-10  Empty vault → 0 hits + events still emit 0-candidate ok.
//   V14-11  Empty query → reasonable output (no crash).
//   V14-12  Vault isolation: different vaultId never leaks across calls.

import { describe, expect, it, vi } from "vitest";
import { SearchAdapterV14 } from "../src/search-adapter-v14.js";
import type {
  MemorySearchInputV12,
  MemorySearchStreamKindV12,
  PoolLikeV12,
  PoolQueryResultV12,
  RerankerCandidate,
  RerankerProvider,
  StreamProviderV12
} from "../src/index.js";
import type { StreamEvent } from "../src/orchestrator-v12.js";
import type { QdrantClientLike, QdrantFilter, QdrantScoredPoint } from "../src/memory-search.js";

// ---------------------------------------------------------------------------
// Helpers — mock pool that returns empty rows unless handlers are registered.
// ---------------------------------------------------------------------------

type QueryHandler = (sql: string, params: ReadonlyArray<unknown>) => unknown[];

class MockPool implements PoolLikeV12 {
  private handlers: Array<{ fragment: string; handler: QueryHandler }> = [];
  readonly captured: Array<{ text: string; params: ReadonlyArray<unknown> }> = [];

  on(fragment: string, handler: QueryHandler): this {
    this.handlers.push({ fragment, handler });
    return this;
  }

  async query<T = unknown>(
    text: string,
    params: ReadonlyArray<unknown> = []
  ): Promise<PoolQueryResultV12<T>> {
    this.captured.push({ text, params: [...params] });
    for (const { fragment, handler } of this.handlers) {
      if (text.includes(fragment)) {
        return { rows: handler(text, params) as T[] };
      }
    }
    return { rows: [] };
  }
}

// ---------------------------------------------------------------------------
// Helpers — mock Qdrant client.
// ---------------------------------------------------------------------------

class MockQdrantClient implements QdrantClientLike {
  readonly denseCalls: number[] = [];
  readonly sparseCalls: number[] = [];
  rejectDense = false;
  rejectSparse = false;

  async searchDense(
    _collection: string,
    _vectorName: string,
    _vector: number[],
    _filter: QdrantFilter,
    _limit: number
  ): Promise<QdrantScoredPoint[]> {
    this.denseCalls.push(Date.now());
    if (this.rejectDense) throw new Error("mock dense rejected");
    return [];
  }

  async searchSparse(
    _collection: string,
    _vectorName: string,
    _sparse: { indices: number[]; values: number[] },
    _filter: QdrantFilter,
    _limit: number
  ): Promise<QdrantScoredPoint[]> {
    this.sparseCalls.push(Date.now());
    if (this.rejectSparse) throw new Error("mock sparse rejected");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers — mock reranker.
// ---------------------------------------------------------------------------

function makePassthroughReranker(): RerankerProvider & { calls: number } {
  const r = {
    name: "mock-reranker",
    calls: 0,
    async rerank(input: {
      query: string;
      candidates: RerankerCandidate[];
      limit: number;
    }) {
      r.calls += 1;
      return input.candidates.slice(0, input.limit).map((c) => ({
        itemId: c.itemId,
        chunkId: c.chunkId,
        score: c.score
      }));
    }
  };
  return r;
}

function makeInput(overrides: Partial<MemorySearchInputV12> = {}): MemorySearchInputV12 {
  return {
    query: "test query",
    vaultId: "vault-v14",
    candidateLimit: 20,
    finalLimit: 5,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// V14-1: Default 7 streams → all provider emit methods called (empty pool).
// ---------------------------------------------------------------------------

describe("V14-1 — default 7 streams all loaded", () => {
  it("calls postgres_fts, postgres_pgvector, graph, temporal, wiki streams when deps present", async () => {
    const pool = new MockPool();
    const qdrant = new MockQdrantClient();
    const embeddingFn = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const sparseVectorizerFn = vi.fn().mockResolvedValue({ indices: [1], values: [1.0] });
    const events: StreamEvent[] = [];

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: qdrant,
      embeddingFn,
      sparseVectorizerFn,
      perStreamTimeoutMs: null,
      onStreamEvent: (e) => events.push(e)
    });

    const hits = await adapter.search(makeInput());
    expect(hits).toBeInstanceOf(Array);

    // All 7 stream kinds should have emitted an event.
    const emittedKinds = new Set(events.map((e) => e.kind));
    expect(emittedKinds.has("postgres_fts")).toBe(true);
    expect(emittedKinds.has("postgres_pgvector")).toBe(true);
    expect(emittedKinds.has("qdrant_dense")).toBe(true);
    expect(emittedKinds.has("qdrant_sparse")).toBe(true);
    expect(emittedKinds.has("graph")).toBe(true);
    expect(emittedKinds.has("temporal")).toBe(true);
    expect(emittedKinds.has("wiki")).toBe(true);

    // Both Qdrant methods should have been called once.
    expect(qdrant.denseCalls.length).toBe(1);
    expect(qdrant.sparseCalls.length).toBe(1);
    // Embedding fn called for postgres_pgvector, qdrant_dense, and wiki (3 streams).
    expect(embeddingFn).toHaveBeenCalledTimes(3);
    // Sparse vectorizer called for qdrant_sparse.
    expect(sparseVectorizerFn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// V14-2: enabledStreams=["postgres_fts"] → only fts stream runs.
// ---------------------------------------------------------------------------

describe("V14-2 — enabledStreams limits loaded streams", () => {
  it("only loads postgres_fts when enabledStreams=['postgres_fts']", async () => {
    const pool = new MockPool();
    const qdrant = new MockQdrantClient();
    const embeddingFn = vi.fn().mockResolvedValue([0.1]);
    const events: StreamEvent[] = [];

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: qdrant,
      embeddingFn,
      enabledStreams: ["postgres_fts"],
      perStreamTimeoutMs: null,
      onStreamEvent: (e) => events.push(e)
    });

    await adapter.search(makeInput());

    // Only postgres_fts event should fire.
    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("postgres_fts");

    // Qdrant client should NOT have been called.
    expect(qdrant.denseCalls.length).toBe(0);
    expect(qdrant.sparseCalls.length).toBe(0);
    // No embedding calls (fts-only doesn't need embeddings).
    expect(embeddingFn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// V14-3: qdrantClient=null → qdrant_dense + qdrant_sparse silently skipped.
// ---------------------------------------------------------------------------

describe("V14-3 — qdrantClient=null skips Qdrant streams", () => {
  it("skips qdrant_dense and qdrant_sparse when qdrantClient is null", async () => {
    const pool = new MockPool();
    const embeddingFn = vi.fn().mockResolvedValue([0.1]);
    const events: StreamEvent[] = [];

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      embeddingFn,
      perStreamTimeoutMs: null,
      onStreamEvent: (e) => events.push(e)
    });

    await adapter.search(makeInput());

    const emittedKinds = new Set(events.map((e) => e.kind));
    expect(emittedKinds.has("qdrant_dense")).toBe(false);
    expect(emittedKinds.has("qdrant_sparse")).toBe(false);
    // Postgres streams still run.
    expect(emittedKinds.has("postgres_fts")).toBe(true);
    // pgvector runs (embeddingFn is available).
    expect(emittedKinds.has("postgres_pgvector")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// V14-4: One stream throws → orchestrator allSettled, others still return.
// ---------------------------------------------------------------------------

describe("V14-4 — one stream failure does not fail the request", () => {
  it("returns hits from surviving streams when qdrant dense rejects", async () => {
    const pool = new MockPool();
    const qdrant = new MockQdrantClient();
    qdrant.rejectDense = true;
    const embeddingFn = vi.fn().mockResolvedValue([0.1]);
    const sparseVectorizerFn = vi.fn().mockResolvedValue({ indices: [1], values: [1.0] });
    const events: StreamEvent[] = [];

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: qdrant,
      embeddingFn,
      sparseVectorizerFn,
      perStreamTimeoutMs: null,
      onStreamEvent: (e) => events.push(e)
    });

    // Should not throw even though dense rejects.
    const hits = await adapter.search(makeInput());
    expect(hits).toBeInstanceOf(Array);

    const denseEvent = events.find((e) => e.kind === "qdrant_dense");
    expect(denseEvent).toBeDefined();
    expect(denseEvent?.status).toBe("failed");

    // Other streams should still have ok events.
    const okEvents = events.filter((e) => e.status === "ok");
    expect(okEvents.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// V14-5: Per-stream timeout → timed-out stream dropped, timed_out event emitted.
// ---------------------------------------------------------------------------

describe("V14-5 — per-stream timeout causes timed_out event", () => {
  it("emits timed_out for a slow stream and does not fail the request", async () => {
    // Build adapter with only postgres_fts (controlled) and a fake slow provider
    // injected via a fresh orchestrator by patching via a hanging embeddingFn
    // on the pgvector stream.
    const pool = new MockPool();
    const embeddingFn = vi.fn().mockImplementation(
      () => new Promise<number[]>(() => { /* never resolves */ })
    );
    const events: StreamEvent[] = [];

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      embeddingFn,
      enabledStreams: ["postgres_fts", "postgres_pgvector"],
      perStreamTimeoutMs: 50,   // tight timeout so pgvector hangs
      onStreamEvent: (e) => events.push(e)
    });

    const start = Date.now();
    const hits = await adapter.search(makeInput());
    const elapsed = Date.now() - start;

    // Should complete well within the timeout ceiling (50ms + slack).
    expect(elapsed).toBeLessThan(2000);
    expect(hits).toBeInstanceOf(Array);

    const timedOutEvents = events.filter((e) => e.status === "timed_out");
    expect(timedOutEvents.length).toBeGreaterThanOrEqual(1);
    expect(timedOutEvents.some((e) => e.kind === "postgres_pgvector")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// V14-6: onStreamEvent fires for each active stream.
// ---------------------------------------------------------------------------

describe("V14-6 — onStreamEvent fires per stream", () => {
  it("emits exactly one event per enabled stream", async () => {
    const pool = new MockPool();
    const qdrant = new MockQdrantClient();
    const embeddingFn = vi.fn().mockResolvedValue([0.1]);
    const sparseVectorizerFn = vi.fn().mockResolvedValue({ indices: [1], values: [1.0] });
    const events: StreamEvent[] = [];

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: qdrant,
      embeddingFn,
      sparseVectorizerFn,
      perStreamTimeoutMs: null,
      onStreamEvent: (e) => events.push(e)
    });

    await adapter.search(makeInput());

    // All 7 streams should each emit exactly one event.
    const countByKind = new Map<string, number>();
    for (const e of events) {
      countByKind.set(e.kind, (countByKind.get(e.kind) ?? 0) + 1);
    }
    const expectedKinds: MemorySearchStreamKindV12[] = [
      "postgres_fts", "postgres_pgvector",
      "qdrant_dense", "qdrant_sparse",
      "graph", "temporal", "wiki"
    ];
    for (const kind of expectedKinds) {
      expect(countByKind.get(kind)).toBe(1);
    }
  });

  it("honors request-level onStreamEvent from MemorySearchInputV12", async () => {
    const pool = new MockPool();
    const qdrant = new MockQdrantClient();
    const embeddingFn = vi.fn().mockResolvedValue([0.1]);
    const sparseVectorizerFn = vi.fn().mockResolvedValue({ indices: [1], values: [1.0] });
    const events: StreamEvent[] = [];

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: qdrant,
      embeddingFn,
      sparseVectorizerFn,
      perStreamTimeoutMs: null
    });

    await adapter.search(makeInput({ onStreamEvent: (e) => events.push(e) }));

    const emittedKinds = new Set(events.map((e) => e.kind));
    expect(emittedKinds).toEqual(new Set([
      "postgres_fts",
      "postgres_pgvector",
      "qdrant_dense",
      "qdrant_sparse",
      "graph",
      "temporal",
      "wiki"
    ]));
  });
});

// ---------------------------------------------------------------------------
// V14-7: rerank=true → reranker called once with top-N fused candidates.
// ---------------------------------------------------------------------------

describe("V14-7 — rerank=true invokes the reranker", () => {
  it("calls the reranker when FTS candidates carry chunk text", async () => {
    const pool = new MockPool();
    pool.on("FROM memory_chunks c", () => [
      {
        item_id: "memory-1",
        chunk_id: "chunk-1",
        text: "memory one body",
        score: "0.9",
        status: "active",
        valid_from: null,
        valid_until: null,
        t_created: null,
        t_expired: null,
        superseded_by: null
      }
    ]);
    const reranker = makePassthroughReranker();

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      rerankerProvider: reranker,
      enabledStreams: ["postgres_fts"],
      perStreamTimeoutMs: null
    });

    await adapter.search(makeInput({ rerank: true }));
    expect(reranker.calls).toBe(1);
  });

  it("skips the reranker when fused candidates have no text content (BRA-532)", async () => {
    const pool = new MockPool();
    const reranker = makePassthroughReranker();

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      rerankerProvider: reranker,
      enabledStreams: ["postgres_fts"],
      perStreamTimeoutMs: null
    });

    await adapter.search(makeInput({ rerank: true }));
    expect(reranker.calls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// V14-8: rerank=false → reranker NOT called.
// ---------------------------------------------------------------------------

describe("V14-8 — rerank=false skips the reranker", () => {
  it("does not call the reranker when input.rerank is false", async () => {
    const pool = new MockPool();
    const reranker = makePassthroughReranker();

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      rerankerProvider: reranker,
      enabledStreams: ["postgres_fts"],
      perStreamTimeoutMs: null
    });

    await adapter.search(makeInput({ rerank: false }));
    expect(reranker.calls).toBe(0);
  });

  it("does not call the reranker when input.rerank is omitted", async () => {
    const pool = new MockPool();
    const reranker = makePassthroughReranker();

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      rerankerProvider: reranker,
      enabledStreams: ["postgres_fts"],
      perStreamTimeoutMs: null
    });

    await adapter.search(makeInput());
    expect(reranker.calls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// V14-9: byte-identical to v1.3 PostgresHybrid when enabledStreams=postgres
//        only + timeout disabled.
// ---------------------------------------------------------------------------

describe("V14-9 — byte-identical to PostgresHybrid in postgres-only mode", () => {
  it("returns same itemId order as direct FTS when only postgres_fts enabled", async () => {
    // Pool returns canned FTS rows.
    const pool = new MockPool();
    pool.on("memory_chunks", (_sql, _params) => [
      { item_id: "item-A", chunk_id: "chunk-A1", score: 0.9, status: "active", valid_from: null, valid_until: null, superseded_by: null },
      { item_id: "item-B", chunk_id: "chunk-B1", score: 0.7, status: "active", valid_from: null, valid_until: null, superseded_by: null }
    ]);

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      enabledStreams: ["postgres_fts"],
      perStreamTimeoutMs: null
    });

    const hits = await adapter.search(makeInput({ finalLimit: 10 }));

    // Top hit should be item-A (highest FTS score).
    expect(hits[0].itemId).toBe("item-A");
    expect(hits[1].itemId).toBe("item-B");
    expect(hits.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// V14-10: Empty vault → 0 hits + all stream events still emit.
// ---------------------------------------------------------------------------

describe("V14-10 — empty vault returns 0 hits", () => {
  it("returns empty array when pool returns no rows for any stream", async () => {
    const pool = new MockPool(); // no handlers → always returns []
    const qdrant = new MockQdrantClient();
    const embeddingFn = vi.fn().mockResolvedValue([0.1]);
    const sparseVectorizerFn = vi.fn().mockResolvedValue({ indices: [1], values: [1.0] });
    const events: StreamEvent[] = [];

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: qdrant,
      embeddingFn,
      sparseVectorizerFn,
      perStreamTimeoutMs: null,
      onStreamEvent: (e) => events.push(e)
    });

    const hits = await adapter.search(makeInput());
    expect(hits).toEqual([]);
    // Events still emitted (with candidateCount=0).
    expect(events.length).toBe(7);
    for (const e of events) {
      expect(e.status).toBe("ok");
      expect(e.candidateCount).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// V14-11: Empty query → no crash.
// ---------------------------------------------------------------------------

describe("V14-11 — empty query string does not crash", () => {
  it("handles empty query gracefully", async () => {
    const pool = new MockPool();

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      enabledStreams: ["postgres_fts"],
      perStreamTimeoutMs: null
    });

    const hits = await adapter.search(makeInput({ query: "" }));
    expect(hits).toBeInstanceOf(Array);
  });
});

// ---------------------------------------------------------------------------
// V14-12: Vault isolation — cross-vault leak does not happen.
// ---------------------------------------------------------------------------

describe("V14-12 — vault isolation", () => {
  it("never returns items from a different vault", async () => {
    const pool = new MockPool();
    // Only return rows for vault-X; vault-Y query should get nothing.
    pool.on("memory_chunks", (_sql, params) => {
      // params[1] is the vaultId
      if (params[1] === "vault-X") {
        return [
          { item_id: "item-X1", chunk_id: "chunk-X1", score: 0.8, status: "active", valid_from: null, valid_until: null, superseded_by: null }
        ];
      }
      return [];
    });

    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      enabledStreams: ["postgres_fts"],
      perStreamTimeoutMs: null
    });

    const hitsX = await adapter.search(makeInput({ vaultId: "vault-X" }));
    const hitsY = await adapter.search(makeInput({ vaultId: "vault-Y" }));

    expect(hitsX.some((h) => h.itemId === "item-X1")).toBe(true);
    expect(hitsY.length).toBe(0);

    // Ensure no vault-X items leaked into vault-Y results.
    expect(hitsY.some((h) => h.itemId === "item-X1")).toBe(false);
  });

  it("throws when vaultId is missing", async () => {
    const pool = new MockPool();
    const adapter = new SearchAdapterV14({
      pool,
      qdrantClient: null,
      enabledStreams: ["postgres_fts"],
      perStreamTimeoutMs: null
    });

    await expect(
      adapter.search({ query: "test", vaultId: "" } as MemorySearchInputV12)
    ).rejects.toThrow();
  });
});
