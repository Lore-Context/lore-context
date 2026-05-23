import { describe, expect, it } from "vitest";
import {
  noopMemorySearchProvider,
  QdrantHybridMemorySearchProvider,
  type QdrantClientLike,
  type QdrantFilter,
  type QdrantScoredPoint
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Fake Qdrant client for unit tests (no real Qdrant required)
// ---------------------------------------------------------------------------

function makeFakeClient(opts: {
  denseResults?: QdrantScoredPoint[];
  sparseResults?: QdrantScoredPoint[];
  fusedResults?: QdrantScoredPoint[];
  denseError?: boolean;
  sparseError?: boolean;
  capturedFilters?: QdrantFilter[];
}): QdrantClientLike {
  return {
    async searchDense(_collection, _vectorName, _vector, filter, _limit) {
      if (opts.capturedFilters) {
        opts.capturedFilters.push(filter);
      }
      if (opts.denseError) {
        throw new Error("dense search failed");
      }
      return opts.denseResults ?? [];
    },
    async searchSparse(_collection, _vectorName, _sparse, _filter, _limit) {
      if (opts.sparseError) {
        throw new Error("sparse search failed");
      }
      return opts.sparseResults ?? [];
    },
    ...(opts.fusedResults !== undefined
      ? {
          async queryFused() {
            return opts.fusedResults!;
          }
        }
      : {})
  };
}

function fakeEmbeddingFn(text: string): Promise<number[]> {
  return Promise.resolve(text.split("").map((c) => c.charCodeAt(0) / 255));
}

function fakeSparseVectorizerFn(text: string): Promise<{ indices: number[]; values: number[] }> {
  const words = text.split(/\s+/);
  return Promise.resolve({
    indices: words.map((_, i) => i),
    values: words.map(() => 1.0)
  });
}

// ---------------------------------------------------------------------------
// noopMemorySearchProvider
// ---------------------------------------------------------------------------

describe("noopMemorySearchProvider", () => {
  it("returns empty hits without error", async () => {
    await expect(noopMemorySearchProvider.search({ query: "anything" })).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// QdrantHybridMemorySearchProvider – local RRF fusion
// ---------------------------------------------------------------------------

describe("QdrantHybridMemorySearchProvider – local RRF", () => {
  it("fuses dense and sparse results via RRF when queryFused not available", async () => {
    const client = makeFakeClient({
      denseResults: [
        { id: "mem:a", score: 0.9 },
        { id: "mem:b", score: 0.7 }
      ],
      sparseResults: [
        { id: "mem:b", score: 0.8 },
        { id: "mem:c", score: 0.6 }
      ]
    });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn,
      sparseVectorizerFn: fakeSparseVectorizerFn
    });

    const hits = await provider.search({ query: "project decision" });

    // mem:b appears in both streams and should rank high
    const ids = hits.map((h) => h.memoryId);
    expect(ids).toContain("mem:a");
    expect(ids).toContain("mem:b");
    expect(ids).toContain("mem:c");

    const bHit = hits.find((h) => h.memoryId === "mem:b")!;
    expect(bHit.streams.dense).toBeDefined();
    expect(bHit.streams.sparse).toBeDefined();
    expect(bHit.backend).toBe("lore-hybrid");
  });

  it("includes stream metadata for dense and sparse", async () => {
    const client = makeFakeClient({
      denseResults: [{ id: "mem:x", score: 0.85 }],
      sparseResults: [{ id: "mem:x", score: 0.70 }]
    });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn,
      sparseVectorizerFn: fakeSparseVectorizerFn,
      embeddingModel: "Qwen/Qwen3-Embedding-0.6B"
    });

    const hits = await provider.search({ query: "test" });
    expect(hits).toHaveLength(1);
    const hit = hits[0];
    expect(hit.streams.dense?.vectorName).toBe("dense_qwen3_1024");
    expect(hit.streams.dense?.embeddingModel).toBe("Qwen/Qwen3-Embedding-0.6B");
    expect(hit.streams.sparse?.vectorName).toBe("sparse_bm25");
    expect(hit.streams.sparse?.sparseModel).toBe("qdrant/bm25");
  });

  it("returns payload memory_id instead of Qdrant point id when present", async () => {
    const client = makeFakeClient({
      denseResults: [
        { id: "550e8400-e29b-41d4-a716-446655440000", score: 0.85, payload: { memory_id: "mem:real" } }
      ]
    });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn
    });

    const hits = await provider.search({ query: "payload id" });
    expect(hits[0].memoryId).toBe("mem:real");
  });

  it("handles dense-only (no sparse vectorizer)", async () => {
    const client = makeFakeClient({
      denseResults: [{ id: "mem:d", score: 0.9 }]
    });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn
    });

    const hits = await provider.search({ query: "dense only" });
    expect(hits).toHaveLength(1);
    expect(hits[0].streams.dense).toBeDefined();
    expect(hits[0].streams.sparse).toBeUndefined();
  });

  it("handles sparse-only (no embedding function)", async () => {
    const client = makeFakeClient({
      sparseResults: [{ id: "mem:s", score: 0.75 }]
    });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      sparseVectorizerFn: fakeSparseVectorizerFn
    });

    const hits = await provider.search({ query: "sparse only" });
    expect(hits).toHaveLength(1);
    expect(hits[0].streams.sparse).toBeDefined();
    expect(hits[0].streams.dense).toBeUndefined();
  });

  it("returns empty hits when no vectors configured", async () => {
    const client = makeFakeClient({});
    const provider = new QdrantHybridMemorySearchProvider({ client });
    const hits = await provider.search({ query: "nothing" });
    expect(hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// QdrantHybridMemorySearchProvider – native fusion
// ---------------------------------------------------------------------------

describe("QdrantHybridMemorySearchProvider – native Qdrant fusion", () => {
  it("uses queryFused when available and returns ordered results", async () => {
    const client = makeFakeClient({
      denseResults: [{ id: "mem:y", score: 0.6 }],
      sparseResults: [{ id: "mem:z", score: 0.5 }],
      fusedResults: [
        { id: "mem:y", score: 0.95 },
        { id: "mem:z", score: 0.80 }
      ]
    });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn,
      sparseVectorizerFn: fakeSparseVectorizerFn
    });

    const hits = await provider.search({ query: "fused" });
    expect(hits[0].memoryId).toBe("mem:y");
    expect(hits[1].memoryId).toBe("mem:z");
  });

  it("falls back to local RRF when queryFused throws", async () => {
    const client: QdrantClientLike = {
      async searchDense() {
        return [{ id: "mem:fallback", score: 0.8 }];
      },
      async searchSparse() {
        return [{ id: "mem:fallback", score: 0.7 }];
      },
      async queryFused() {
        throw new Error("fusion not supported");
      }
    };

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn,
      sparseVectorizerFn: fakeSparseVectorizerFn
    });

    const hits = await provider.search({ query: "fallback" });
    expect(hits).toHaveLength(1);
    expect(hits[0].memoryId).toBe("mem:fallback");
    expect(hits[0].backend).toBe("lore-hybrid");
  });
});

// ---------------------------------------------------------------------------
// Cross-vault filter isolation
// ---------------------------------------------------------------------------

describe("QdrantHybridMemorySearchProvider – payload filters", () => {
  it("applies vault_id filter before candidate IDs leave the provider", async () => {
    const capturedFilters: QdrantFilter[] = [];
    const client = makeFakeClient({
      denseResults: [{ id: "mem:v1", score: 0.9 }],
      capturedFilters
    });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn
    });

    await provider.search({ query: "secret", vaultId: "vault-abc" });

    expect(capturedFilters.length).toBeGreaterThan(0);
    const vaultCondition = capturedFilters[0].must?.find((c) => c.key === "vault_id");
    expect(vaultCondition?.match?.value).toBe("vault-abc");
  });

  it("applies status filter defaulting to active+confirmed", async () => {
    const capturedFilters: QdrantFilter[] = [];
    const client = makeFakeClient({ denseResults: [], capturedFilters });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn
    });

    await provider.search({ query: "test" });

    const statusCondition = capturedFilters[0]?.must?.find((c) => c.key === "status");
    expect(statusCondition?.match?.any).toEqual(["active", "confirmed"]);
  });

  it("applies project_id filter when provided", async () => {
    const capturedFilters: QdrantFilter[] = [];
    const client = makeFakeClient({ denseResults: [], capturedFilters });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn
    });

    await provider.search({ query: "project filter", projectId: "proj-xyz" });

    const projectCondition = capturedFilters[0]?.must?.find((c) => c.key === "project_id");
    expect(projectCondition?.match?.value).toBe("proj-xyz");
  });

  it("applies validity window filter when validAt provided", async () => {
    const capturedFilters: QdrantFilter[] = [];
    const client = makeFakeClient({ denseResults: [], capturedFilters });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn
    });

    const validAt = "2026-05-03T00:00:00.000Z";
    await provider.search({ query: "valid", validAt });

    const validCondition = capturedFilters[0]?.must?.find((c) => c.key === "valid_until");
    expect(validCondition?.range?.gte).toBe(validAt);
  });

  it("applies allowedProjectIds as any-match when no specific projectId given", async () => {
    const capturedFilters: QdrantFilter[] = [];
    const client = makeFakeClient({ denseResults: [], capturedFilters });

    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn
    });

    await provider.search({ query: "multi", allowedProjectIds: ["proj-a", "proj-b"] });

    const projectCondition = capturedFilters[0]?.must?.find((c) => c.key === "project_id");
    expect(projectCondition?.match?.any).toEqual(["proj-a", "proj-b"]);
  });
});

// ---------------------------------------------------------------------------
// Limit enforcement
// ---------------------------------------------------------------------------

describe("QdrantHybridMemorySearchProvider – limit", () => {
  it("respects limit parameter", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: `mem:${i}`,
      score: 1 - i * 0.01
    }));
    const client = makeFakeClient({ denseResults: many });
    const provider = new QdrantHybridMemorySearchProvider({
      client,
      embeddingFn: fakeEmbeddingFn
    });

    const hits = await provider.search({ query: "limit test", limit: 5 });
    expect(hits.length).toBeLessThanOrEqual(5);
  });
});
