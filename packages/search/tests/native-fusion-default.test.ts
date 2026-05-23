// Lane A Phase 2.1 — Qdrant native fusion default-on tests.
//
// Verifies:
//   (a) When LORE_QDRANT_NATIVE_FUSION is not set, native fusion is enabled.
//   (b) When LORE_QDRANT_NATIVE_FUSION=0, native fusion is disabled and the
//       provider falls back to local RRF.

import { describe, expect, it } from "vitest";
import {
  QdrantHybridMemorySearchProviderV12,
  resolveNativeFusionEnabled,
  type MemorySearchInputV12,
  type QdrantClientLike,
  type QdrantFilter,
  type QdrantScoredPoint
} from "../src/index.js";

function makeInput(overrides: Partial<MemorySearchInputV12> = {}): MemorySearchInputV12 {
  return {
    query: "native fusion test",
    vaultId: "vault-A",
    candidateLimit: 50,
    finalLimit: 10,
    ...overrides
  };
}

function asciiEmbedding(text: string): Promise<number[]> {
  return Promise.resolve(text.split("").map((c) => c.charCodeAt(0) / 255));
}

interface FusionCallRecord {
  called: boolean;
}

function makeFakeClientWithFusion(record: FusionCallRecord): QdrantClientLike {
  return {
    async searchDense(
      _collection: string,
      _vectorName: string,
      _vector: number[],
      _filter: QdrantFilter,
      _limit: number
    ): Promise<QdrantScoredPoint[]> {
      return [{ id: "pt-dense", score: 0.8, payload: { item_id: "item:dense" } }];
    },
    async searchSparse(
      _collection: string,
      _vectorName: string,
      _sparse: { indices: number[]; values: number[] },
      _filter: QdrantFilter,
      _limit: number
    ): Promise<QdrantScoredPoint[]> {
      return [{ id: "pt-sparse", score: 0.7, payload: { item_id: "item:sparse" } }];
    },
    async queryFused(
      _collection: string,
      _denseVectorName: string,
      _denseVector: number[],
      _sparseVectorName: string,
      _sparse: { indices: number[]; values: number[] },
      _filter: QdrantFilter,
      _limit: number
    ): Promise<QdrantScoredPoint[]> {
      record.called = true;
      return [{ id: "pt-fused", score: 0.95, payload: { item_id: "item:fused" } }];
    }
  };
}

// ---------------------------------------------------------------------------
// resolveNativeFusionEnabled — unit tests for the env helper.
// ---------------------------------------------------------------------------

describe("resolveNativeFusionEnabled", () => {
  it("returns true when env var is absent", () => {
    expect(resolveNativeFusionEnabled({})).toBe(true);
  });

  it("returns true when env var is set to '1'", () => {
    expect(resolveNativeFusionEnabled({ LORE_QDRANT_NATIVE_FUSION: "1" })).toBe(true);
  });

  it("returns false when env var is set to '0'", () => {
    expect(resolveNativeFusionEnabled({ LORE_QDRANT_NATIVE_FUSION: "0" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (a) Native fusion is ON by default (no env var set).
// ---------------------------------------------------------------------------

describe("QdrantHybridMemorySearchProviderV12 — native fusion default ON", () => {
  it("(a) calls queryFused when env is absent (default on)", async () => {
    const record: FusionCallRecord = { called: false };
    const client = makeFakeClientWithFusion(record);
    const provider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding,
      sparseVectorizerFn: async (text) => ({
        indices: text.split("").map((_, i) => i),
        values: text.split("").map(() => 1)
      }),
      // Pass an empty env to simulate "env var not set"
      env: {}
    });
    const hits = await provider.search(makeInput());
    expect(record.called).toBe(true);
    expect(hits[0].itemId).toBe("item:fused");
  });

  it("(b) does NOT call queryFused when LORE_QDRANT_NATIVE_FUSION=0", async () => {
    const record: FusionCallRecord = { called: false };
    const client = makeFakeClientWithFusion(record);
    const provider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding,
      sparseVectorizerFn: async (text) => ({
        indices: text.split("").map((_, i) => i),
        values: text.split("").map(() => 1)
      }),
      env: { LORE_QDRANT_NATIVE_FUSION: "0" }
    });
    const hits = await provider.search(makeInput());
    expect(record.called).toBe(false);
    // Falls back to local RRF — both dense and sparse items appear
    expect(hits.length).toBeGreaterThan(0);
    const itemIds = hits.map((h) => h.itemId);
    expect(itemIds.some((id) => id === "item:dense" || id === "item:sparse")).toBe(true);
  });
});
