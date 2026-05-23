// Lane B retrieval foundation tests (test-strategy B-1..B-15 + cross-vault).
//
// Pure-unit: no live Postgres / Qdrant required. Pool + Qdrant adapters are
// faked; FTS rank and pgvector cosine are simulated by canned rows in the
// fake pool. Each test pins down one behavioural invariant from the v1.2
// security and quality contract.

import { describe, expect, it } from "vitest";
import {
  ALL_STREAM_KINDS_V12,
  DEFAULT_RRF_K,
  DEFAULT_STREAM_WEIGHTS,
  fuseWeightedRRF,
  POSTGRES_FTS_SQL,
  POSTGRES_PGVECTOR_SQL,
  PostgresHybridMemorySearchProvider,
  QDRANT_V12_COLLECTION_DEFAULT,
  QDRANT_V12_DENSE_VECTOR_NAME,
  QDRANT_V12_SPARSE_VECTOR_NAME,
  QdrantHybridMemorySearchProviderV12,
  type MemorySearchInputV12,
  type PoolLikeV12,
  type PoolQueryResultV12,
  type QdrantClientLike,
  type QdrantFilter,
  type QdrantScoredPoint
} from "../src/index.js";

// ---------------------------------------------------------------------------
// FakePgPoolV12 — captures every query for assertion. Rules-based simulator
// for FTS hit / miss and pgvector ANN ordering. We model FTS via simple
// lexeme-overlap and pgvector via pre-set rows.
// ---------------------------------------------------------------------------

interface FakeFtsCorpusEntry {
  itemId: string;
  chunkId: string;
  vaultId: string;
  projectId?: string | null;
  status: string;
  validFrom: string | null;
  validUntil: string | null;
  tCreated?: string | null;
  tExpired?: string | null;
  supersededBy: string | null;
  chunkText: string;
}

interface FakePgVectorCorpusEntry {
  itemId: string;
  chunkId: string;
  vaultId: string;
  projectId?: string | null;
  status: string;
  validFrom: string | null;
  validUntil: string | null;
  tCreated?: string | null;
  tExpired?: string | null;
  supersededBy: string | null;
  /** pre-computed cosine similarity to the test query (0..1). */
  similarityToQuery: number;
}

interface CapturedQuery {
  text: string;
  params: ReadonlyArray<unknown>;
}

class FakePgPoolV12 implements PoolLikeV12 {
  readonly captured: CapturedQuery[] = [];
  private fts: FakeFtsCorpusEntry[] = [];
  private pgvector: FakePgVectorCorpusEntry[] = [];

  seedFts(rows: FakeFtsCorpusEntry[]): void {
    this.fts = [...rows];
  }
  seedPgVector(rows: FakePgVectorCorpusEntry[]): void {
    this.pgvector = [...rows];
  }

  async query<T = unknown>(
    text: string,
    params: ReadonlyArray<unknown> = []
  ): Promise<PoolQueryResultV12<T>> {
    this.captured.push({ text, params: [...params] });
    if (text === POSTGRES_FTS_SQL) {
      return { rows: this.executeFts(params) as unknown as T[] };
    }
    if (text === POSTGRES_PGVECTOR_SQL) {
      return { rows: this.executePgVector(params) as unknown as T[] };
    }
    return { rows: [] };
  }

  private executeFts(params: ReadonlyArray<unknown>): unknown[] {
    const [rawQuery, vaultId, statuses, validAt] = params as [string, string, string[], string | null];
    const systemTime = params[4] as string | null;
    const projectId = params.length >= 8 ? (params[5] as string | null) : null;
    const allowedProjectIds = params.length >= 8 ? (params[6] as string[] | null) : null;
    const limit = params.length >= 8 ? (params[7] as number) : (params[5] as number);
    const tokens = lexemes(rawQuery);
    const validAtTime = validAt ? Date.parse(validAt) : null;
    const systemTimeMs = systemTime ? Date.parse(systemTime) : null;

    return this.fts
      .filter((row) => row.vaultId === vaultId)
      .filter((row) => statuses.includes(row.status))
      .filter((row) => row.supersededBy === null)
      .filter((row) => isAllowedProject(row.projectId, projectId, allowedProjectIds))
      .filter((row) => isWithinValidity(row.validFrom, row.validUntil, validAtTime))
      .filter((row) => isVisibleAtSystemTime(row.tCreated, row.tExpired, systemTimeMs))
      .map((row) => ({ row, score: ftsScore(row.chunkText, tokens) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ row, score }) => ({
        item_id: row.itemId,
        chunk_id: row.chunkId,
        score,
        status: row.status,
        valid_from: row.validFrom,
        valid_until: row.validUntil,
        superseded_by: row.supersededBy
      }));
  }

  private executePgVector(params: ReadonlyArray<unknown>): unknown[] {
    const [, vaultId, statuses, validAt] = params as [string, string, string[], string | null];
    const systemTime = params[4] as string | null;
    const projectId = params.length >= 8 ? (params[5] as string | null) : null;
    const allowedProjectIds = params.length >= 8 ? (params[6] as string[] | null) : null;
    const limit = params.length >= 8 ? (params[7] as number) : (params[5] as number);
    const validAtTime = validAt ? Date.parse(validAt) : null;
    const systemTimeMs = systemTime ? Date.parse(systemTime) : null;
    return this.pgvector
      .filter((row) => row.vaultId === vaultId)
      .filter((row) => statuses.includes(row.status))
      .filter((row) => row.supersededBy === null)
      .filter((row) => isAllowedProject(row.projectId, projectId, allowedProjectIds))
      .filter((row) => isWithinValidity(row.validFrom, row.validUntil, validAtTime))
      .filter((row) => isVisibleAtSystemTime(row.tCreated, row.tExpired, systemTimeMs))
      .sort((a, b) => b.similarityToQuery - a.similarityToQuery)
      .slice(0, limit)
      .map((row) => ({
        item_id: row.itemId,
        chunk_id: row.chunkId,
        score: row.similarityToQuery,
        status: row.status,
        valid_from: row.validFrom,
        valid_until: row.validUntil,
        superseded_by: row.supersededBy
      }));
  }
}

function lexemes(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function ftsScore(text: string, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const haystack = lexemes(text);
  let hits = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) hits += 1;
  }
  return hits / queryTokens.length;
}

function isWithinValidity(
  validFrom: string | null,
  validUntil: string | null,
  validAt: number | null
): boolean {
  if (validAt === null) return true;
  if (validFrom !== null && Date.parse(validFrom) > validAt) return false;
  if (validUntil !== null && Date.parse(validUntil) < validAt) return false;
  return true;
}

function isVisibleAtSystemTime(
  tCreated: string | null | undefined,
  tExpired: string | null | undefined,
  systemTime: number | null
): boolean {
  if (systemTime === null) return true;
  if (tCreated !== null && tCreated !== undefined && Date.parse(tCreated) > systemTime) return false;
  if (tExpired !== null && tExpired !== undefined && Date.parse(tExpired) <= systemTime) return false;
  return true;
}

function isAllowedProject(
  rowProjectId: string | null | undefined,
  projectId: string | null,
  allowedProjectIds: string[] | null
): boolean {
  if (projectId) return rowProjectId === projectId;
  if (allowedProjectIds && allowedProjectIds.length > 0) {
    return rowProjectId !== null && rowProjectId !== undefined && allowedProjectIds.includes(rowProjectId);
  }
  return true;
}

function makeInput(overrides: Partial<MemorySearchInputV12> = {}): MemorySearchInputV12 {
  return {
    query: "embedding",
    vaultId: "vault-A",
    candidateLimit: 50,
    finalLimit: 10,
    ...overrides
  };
}

function asciiEmbedding(text: string): Promise<number[]> {
  return Promise.resolve(text.split("").map((c) => c.charCodeAt(0) / 255));
}

// ---------------------------------------------------------------------------
// fuseWeightedRRF (B-10).
// ---------------------------------------------------------------------------

describe("fuseWeightedRRF (B-10)", () => {
  it("computes Σ(weight / (k + rank + 1)) per item", () => {
    // Two streams, weight 1.0, k=60.
    // item-A: rank 0 in stream-x, rank 1 in stream-y → 1/61 + 1/62.
    // item-B: rank 1 in stream-x → 1/62.
    const fused = fuseWeightedRRF({
      streams: [
        {
          kind: "postgres_fts",
          backend: "postgres-fts",
          weight: 1,
          candidates: [
            { itemId: "A", score: 0.9 },
            { itemId: "B", score: 0.5 }
          ]
        },
        {
          kind: "postgres_pgvector",
          backend: "postgres-pgvector",
          weight: 1,
          candidates: [
            { itemId: "C", score: 0.8 },
            { itemId: "A", score: 0.4 }
          ]
        }
      ],
      k: DEFAULT_RRF_K,
      limit: 10
    });

    const aHit = fused.find((h) => h.itemId === "A")!;
    const bHit = fused.find((h) => h.itemId === "B")!;
    const cHit = fused.find((h) => h.itemId === "C")!;
    const expectedA = 1 / 61 + 1 / 62;
    const expectedB = 1 / 62;
    const expectedC = 1 / 61;
    expect(aHit.score).toBeCloseTo(expectedA, 6);
    expect(bHit.score).toBeCloseTo(expectedB, 6);
    expect(cHit.score).toBeCloseTo(expectedC, 6);
    // A appears in both streams and must outrank B and C.
    expect(fused[0].itemId).toBe("A");
  });

  it("respects per-stream weights and the limit cap", () => {
    const fused = fuseWeightedRRF({
      streams: [
        {
          kind: "qdrant_dense",
          backend: "qwen3",
          weight: 2,
          candidates: [{ itemId: "X", score: 0.9 }]
        }
      ],
      k: DEFAULT_RRF_K,
      limit: 1
    });
    expect(fused).toHaveLength(1);
    expect(fused[0].score).toBeCloseTo(2 / 61, 6);
  });
});

// ---------------------------------------------------------------------------
// PostgresHybridMemorySearchProvider — FTS (B-1, B-2, B-3, B-4, B-5).
// ---------------------------------------------------------------------------

describe("PostgresHybridMemorySearchProvider — FTS (B-1, B-2, B-3, B-4, B-5)", () => {
  it("[B-1] returns chunks whose lexemes match the websearch_to_tsquery term", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:fts-hit",
        chunkId: "chunk:fts-hit",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "Qdrant collection uses vector name dense_qwen3_1024 in production"
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool });
    const hits = await provider.search(makeInput({ query: "dense_qwen3_1024" }));
    expect(hits).toHaveLength(1);
    expect(hits[0].itemId).toBe("item:fts-hit");
    expect(hits[0].chunkId).toBe("chunk:fts-hit");
    expect(hits[0].streams.postgres_fts).toBeDefined();
    expect(hits[0].streams.postgres_fts!.score).toBeGreaterThan(0);
  });

  it("[B-2] returns no hits when the query has no lexeme overlap", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:irrelevant",
        chunkId: "chunk:irrelevant",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "ONNX runtime is used for offline embeddings"
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool });
    const hits = await provider.search(makeInput({ query: "zebra migration" }));
    expect(hits).toEqual([]);
  });

  it("[B-3] passes the query term as a parameter and never inlines it into SQL", async () => {
    const pool = new FakePgPoolV12();
    const provider = new PostgresHybridMemorySearchProvider({ pool });
    const sneaky = "lore'; DROP TABLE memory_items;--";
    await provider.search(makeInput({ query: sneaky }));

    const ftsCall = pool.captured.find((c) => c.text === POSTGRES_FTS_SQL);
    expect(ftsCall).toBeDefined();
    expect(ftsCall!.text).not.toContain("DROP TABLE");
    expect(ftsCall!.text).not.toContain(sneaky);
    expect(ftsCall!.text).toContain("websearch_to_tsquery('simple', $1)");
    expect(ftsCall!.params[0]).toBe(sneaky);
    expect(ftsCall!.params[1]).toBe("vault-A");
  });

  it("[B-4] vault_id from the input is used as the WHERE predicate", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:vault-B-only",
        chunkId: "chunk:vault-B-only",
        vaultId: "vault-B",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "secret cross-tenant fact about embeddings"
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool });
    const hits = await provider.search(
      makeInput({ vaultId: "vault-A", query: "embeddings" })
    );
    expect(hits).toEqual([]);
    const ftsCall = pool.captured.find((c) => c.text === POSTGRES_FTS_SQL);
    expect(ftsCall!.params[1]).toBe("vault-A");
  });

  it("scopes FTS candidates to the requested project before fusion", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:proj-A",
        chunkId: "chunk:proj-A",
        vaultId: "vault-A",
        projectId: "proj-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "embeddings belong to project A"
      },
      {
        itemId: "item:proj-B",
        chunkId: "chunk:proj-B",
        vaultId: "vault-A",
        projectId: "proj-B",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "embeddings belong to project B"
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool });

    const hits = await provider.search(makeInput({ projectId: "proj-A", query: "embeddings" }));

    expect(hits.map((hit) => hit.itemId)).toEqual(["item:proj-A"]);
    const ftsCall = pool.captured.find((c) => c.text === POSTGRES_FTS_SQL);
    expect(ftsCall!.text).toContain("i.project_id = $6");
    expect(ftsCall!.params[5]).toBe("proj-A");
    expect(ftsCall!.params[6]).toBeNull();
    expect(ftsCall!.params[7]).toBe(50);
  });

  it("scopes FTS candidates to allowed projects when no explicit project is requested", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:proj-A",
        chunkId: "chunk:proj-A",
        vaultId: "vault-A",
        projectId: "proj-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "embeddings belong to an allowed project"
      },
      {
        itemId: "item:proj-B",
        chunkId: "chunk:proj-B",
        vaultId: "vault-A",
        projectId: "proj-B",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "embeddings belong to a disallowed project"
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool });

    const hits = await provider.search(makeInput({ allowedProjectIds: ["proj-A"], query: "embeddings" }));

    expect(hits.map((hit) => hit.itemId)).toEqual(["item:proj-A"]);
    const ftsCall = pool.captured.find((c) => c.text === POSTGRES_FTS_SQL);
    expect(ftsCall!.params[5]).toBeNull();
    expect(ftsCall!.params[6]).toEqual(["proj-A"]);
  });

  it("[B-5] superseded items are filtered before fusion", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:superseded",
        chunkId: "chunk:superseded",
        vaultId: "vault-A",
        status: "superseded",
        validFrom: null,
        validUntil: null,
        supersededBy: "item:replacement",
        chunkText: "deprecated embeddings configuration"
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool });
    const hits = await provider.search(makeInput({ query: "embeddings" }));
    expect(hits).toEqual([]);
    const ftsCall = pool.captured.find((c) => c.text === POSTGRES_FTS_SQL);
    expect(ftsCall!.text).toContain("i.status = ANY($3::text[])");
    expect(ftsCall!.text).toContain("i.superseded_by IS NULL");
    expect(ftsCall!.params[2]).toEqual(["active", "confirmed"]);
  });

  it("filters out FTS rows created after asOfSystemTime before fusion", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:future-created",
        chunkId: "chunk:future-created",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        tCreated: "2026-06-01T00:00:00Z",
        supersededBy: null,
        chunkText: "embedding configuration future row"
      },
      {
        itemId: "item:visible",
        chunkId: "chunk:visible",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        tCreated: "2026-01-01T00:00:00Z",
        supersededBy: null,
        chunkText: "embedding configuration visible row"
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool });

    const hits = await provider.search(
      makeInput({ query: "embedding configuration", asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toEqual(["item:visible"]);
    const ftsCall = pool.captured.find((c) => c.text === POSTGRES_FTS_SQL);
    expect(ftsCall!.text).toContain("i.t_created <= $5::timestamptz");
    expect(ftsCall!.params[4]).toBe("2026-04-01T00:00:00Z");
  });

  it("filters out FTS rows expired at asOfSystemTime before fusion", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:expired-system",
        chunkId: "chunk:expired-system",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        tCreated: "2026-01-01T00:00:00Z",
        tExpired: "2026-03-01T00:00:00Z",
        supersededBy: null,
        chunkText: "embedding configuration expired row"
      },
      {
        itemId: "item:visible",
        chunkId: "chunk:visible",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        tCreated: "2026-01-01T00:00:00Z",
        tExpired: null,
        supersededBy: null,
        chunkText: "embedding configuration visible row"
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool });

    const hits = await provider.search(
      makeInput({ query: "embedding configuration", asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toEqual(["item:visible"]);
    const ftsCall = pool.captured.find((c) => c.text === POSTGRES_FTS_SQL);
    expect(ftsCall!.text).toContain("i.t_expired IS NULL OR i.t_expired > $5::timestamptz");
  });

  it("keeps current FTS behaviour when asOfSystemTime is undefined", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:future-created",
        chunkId: "chunk:future-created",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        tCreated: "2026-06-01T00:00:00Z",
        supersededBy: null,
        chunkText: "embedding configuration future row"
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool });

    const hits = await provider.search(makeInput({ query: "embedding configuration" }));

    expect(hits.map((h) => h.itemId)).toEqual(["item:future-created"]);
    const ftsCall = pool.captured.find((c) => c.text === POSTGRES_FTS_SQL);
    expect(ftsCall!.params[4]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PostgresHybridMemorySearchProvider — pgvector (B-6, B-7, B-8).
// ---------------------------------------------------------------------------

describe("PostgresHybridMemorySearchProvider — pgvector (B-6, B-7, B-8)", () => {
  it("[B-6] issues a pgvector ANN query using `<=> $1::vector` against memory_embeddings_v12", async () => {
    const pool = new FakePgPoolV12();
    const provider = new PostgresHybridMemorySearchProvider({
      pool,
      embeddingFn: asciiEmbedding
    });
    await provider.search(makeInput({ query: "vec" }));
    const annCall = pool.captured.find((c) => c.text === POSTGRES_PGVECTOR_SQL);
    expect(annCall).toBeDefined();
    expect(annCall!.text).toContain("memory_embeddings_v12 e");
    expect(annCall!.text).toContain("e.embedding <=> $1::vector");
    // First param is the vector literal; format `[..]`.
    expect(typeof annCall!.params[0]).toBe("string");
    expect((annCall!.params[0] as string).startsWith("[")).toBe(true);
  });

  it("scopes pgvector candidates to the requested project before fusion", async () => {
    const pool = new FakePgPoolV12();
    pool.seedPgVector([
      {
        itemId: "item:proj-A",
        chunkId: "chunk:proj-A",
        vaultId: "vault-A",
        projectId: "proj-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.81
      },
      {
        itemId: "item:proj-B",
        chunkId: "chunk:proj-B",
        vaultId: "vault-A",
        projectId: "proj-B",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.99
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({
      pool,
      embeddingFn: asciiEmbedding
    });

    const hits = await provider.search(makeInput({ projectId: "proj-A", query: "vec" }));

    expect(hits.map((hit) => hit.itemId)).toEqual(["item:proj-A"]);
    const annCall = pool.captured.find((c) => c.text === POSTGRES_PGVECTOR_SQL);
    expect(annCall!.text).toContain("i.project_id = $6");
    expect(annCall!.params[5]).toBe("proj-A");
    expect(annCall!.params[6]).toBeNull();
    expect(annCall!.params[7]).toBe(50);
  });

  it("[B-7] preserves Postgres ORDER BY result ordering — closer cosine ranks higher", async () => {
    const pool = new FakePgPoolV12();
    pool.seedPgVector([
      {
        itemId: "item:far",
        chunkId: "chunk:far",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.41
      },
      {
        itemId: "item:close",
        chunkId: "chunk:close",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.92
      },
      {
        itemId: "item:mid",
        chunkId: "chunk:mid",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.66
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({
      pool,
      embeddingFn: asciiEmbedding
    });
    const hits = await provider.search(makeInput({ query: "config" }));
    expect(hits.map((h) => h.itemId)).toEqual([
      "item:close",
      "item:mid",
      "item:far"
    ]);
  });

  it("[B-8] expired items (valid_until before validAt) are filtered", async () => {
    const pool = new FakePgPoolV12();
    pool.seedPgVector([
      {
        itemId: "item:expired",
        chunkId: "chunk:expired",
        vaultId: "vault-A",
        status: "active",
        validFrom: "2025-12-01T00:00:00Z",
        validUntil: "2026-01-01T00:00:00Z",
        supersededBy: null,
        similarityToQuery: 0.99
      },
      {
        itemId: "item:current",
        chunkId: "chunk:current",
        vaultId: "vault-A",
        status: "active",
        validFrom: "2026-04-01T00:00:00Z",
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.5
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({
      pool,
      embeddingFn: asciiEmbedding
    });
    const hits = await provider.search(
      makeInput({ query: "config", validAt: "2026-05-04T00:00:00Z" })
    );
    expect(hits.map((h) => h.itemId)).toEqual(["item:current"]);
    const annCall = pool.captured.find((c) => c.text === POSTGRES_PGVECTOR_SQL);
    expect(annCall!.text).toContain("i.valid_until >= $4::timestamptz");
  });

  it("filters pgvector rows by asOfSystemTime before fusion", async () => {
    const pool = new FakePgPoolV12();
    pool.seedPgVector([
      {
        itemId: "item:future-created",
        chunkId: "chunk:future-created",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        tCreated: "2026-06-01T00:00:00Z",
        supersededBy: null,
        similarityToQuery: 0.99
      },
      {
        itemId: "item:visible",
        chunkId: "chunk:visible",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        tCreated: "2026-01-01T00:00:00Z",
        supersededBy: null,
        similarityToQuery: 0.5
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({ pool, embeddingFn: asciiEmbedding });

    const hits = await provider.search(
      makeInput({ query: "config", asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toContain("item:visible");
    expect(hits.map((h) => h.itemId)).not.toContain("item:future-created");
    const annCall = pool.captured.find((c) => c.text === POSTGRES_PGVECTOR_SQL);
    expect(annCall!.text).toContain("i.t_created <= $5::timestamptz");
    expect(annCall!.params[4]).toBe("2026-04-01T00:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// PostgresHybridMemorySearchProvider — hybrid fusion + provenance (B-9).
// ---------------------------------------------------------------------------

describe("PostgresHybridMemorySearchProvider — hybrid fusion (B-9)", () => {
  it("[B-9] runs FTS and pgvector in parallel and surfaces both stream keys for items in both", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:both",
        chunkId: "chunk:fts",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "hybrid retrieval combines FTS and pgvector"
      }
    ]);
    pool.seedPgVector([
      {
        itemId: "item:both",
        chunkId: "chunk:vec",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.65
      },
      {
        itemId: "item:vec-only",
        chunkId: "chunk:vec-only",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.95
      }
    ]);
    const provider = new PostgresHybridMemorySearchProvider({
      pool,
      embeddingFn: asciiEmbedding
    });
    const hits = await provider.search(makeInput({ query: "hybrid retrieval" }));

    expect(hits[0].itemId).toBe("item:both");
    expect(hits[0].streams.postgres_fts).toBeDefined();
    expect(hits[0].streams.postgres_pgvector).toBeDefined();

    const vecOnly = hits.find((h) => h.itemId === "item:vec-only");
    expect(vecOnly?.streams.postgres_pgvector).toBeDefined();
    expect(vecOnly?.streams.postgres_fts).toBeUndefined();

    expect(hits[0].lifecycle.status).toBe("active");
  });

  it("rejects calls with empty vaultId — security invariant", async () => {
    const pool = new FakePgPoolV12();
    const provider = new PostgresHybridMemorySearchProvider({ pool });
    await expect(provider.search(makeInput({ vaultId: "" }))).rejects.toThrow(
      /vaultId/
    );
  });
});

// ---------------------------------------------------------------------------
// QdrantHybridMemorySearchProviderV12 (B-11..B-15).
// ---------------------------------------------------------------------------

interface FakeQdrantClientOptions {
  denseResults?: QdrantScoredPoint[];
  sparseResults?: QdrantScoredPoint[];
  fusedResults?: QdrantScoredPoint[];
  fusionThrows?: boolean;
  capturedFilters?: QdrantFilter[];
  capturedCollections?: string[];
  capturedLimits?: number[];
  capturedFusionCalls?: Array<{
    collection: string;
    denseVectorName: string;
    sparseVectorName: string;
    limit: number;
  }>;
}

function makeFakeQdrantClient(opts: FakeQdrantClientOptions): QdrantClientLike {
  return {
    async searchDense(collection, _vectorName, _vector, filter, limit) {
      opts.capturedCollections?.push(collection);
      opts.capturedFilters?.push(filter);
      opts.capturedLimits?.push(limit);
      return opts.denseResults ?? [];
    },
    async searchSparse(collection, _vectorName, _sparse, filter, limit) {
      opts.capturedCollections?.push(collection);
      opts.capturedFilters?.push(filter);
      opts.capturedLimits?.push(limit);
      return opts.sparseResults ?? [];
    },
    ...(opts.fusedResults !== undefined || opts.fusionThrows
      ? {
          async queryFused(
            collection,
            denseVectorName,
            _denseVector,
            sparseVectorName,
            _sparse,
            _filter,
            limit
          ) {
            opts.capturedFusionCalls?.push({
              collection,
              denseVectorName,
              sparseVectorName,
              limit
            });
            if (opts.fusionThrows) {
              throw new Error("Query API not supported");
            }
            return opts.fusedResults!;
          }
        }
      : {})
  };
}

describe("QdrantHybridMemorySearchProviderV12 (B-11..B-15)", () => {
  it("[B-11] defaults to lore_memories_v12 and respects collection override", async () => {
    const capturedCollections: string[] = [];
    const client = makeFakeQdrantClient({
      denseResults: [
        { id: "pt-1", score: 0.8, payload: { item_id: "item:x", chunk_id: "chunk:x" } }
      ],
      capturedCollections
    });

    const defaultProvider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding
    });
    await defaultProvider.search(makeInput({ query: "default collection" }));
    expect(capturedCollections[0]).toBe(QDRANT_V12_COLLECTION_DEFAULT);
    expect(capturedCollections[0]).toBe("lore_memories_v12");

    capturedCollections.length = 0;
    const overrideProvider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding,
      collection: "lore_memories_v12_test"
    });
    await overrideProvider.search(makeInput({ query: "override" }));
    expect(capturedCollections[0]).toBe("lore_memories_v12_test");
  });

  it("[B-12] uses the Query API (queryFused) when both dense + sparse vectorisers are supplied", async () => {
    const capturedFusionCalls: FakeQdrantClientOptions["capturedFusionCalls"] = [];
    const client = makeFakeQdrantClient({
      denseResults: [
        { id: "pt-fused", score: 0.7, payload: { item_id: "item:fused", chunk_id: "chunk:fused" } }
      ],
      sparseResults: [],
      fusedResults: [
        { id: "pt-fused", score: 0.95, payload: { item_id: "item:fused", chunk_id: "chunk:fused" } }
      ],
      capturedFusionCalls
    });

    const provider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding,
      sparseVectorizerFn: async (text) => ({
        indices: text.split("").map((_, i) => i),
        values: text.split("").map(() => 1)
      })
    });
    const hits = await provider.search(makeInput({ query: "qdrant fusion" }));
    expect(capturedFusionCalls).toHaveLength(1);
    expect(capturedFusionCalls![0].collection).toBe(QDRANT_V12_COLLECTION_DEFAULT);
    expect(capturedFusionCalls![0].denseVectorName).toBe(QDRANT_V12_DENSE_VECTOR_NAME);
    expect(capturedFusionCalls![0].sparseVectorName).toBe(QDRANT_V12_SPARSE_VECTOR_NAME);
    expect(hits[0].itemId).toBe("item:fused");
    expect(hits[0].chunkId).toBe("chunk:fused");
  });

  it("[B-13] surfaces item_id and chunk_id from the Qdrant payload", async () => {
    const client = makeFakeQdrantClient({
      denseResults: [
        {
          id: "qdrant-uuid-1",
          score: 0.9,
          payload: {
            vault_id: "vault-A",
            project_id: "proj-1",
            item_id: "item:payload",
            chunk_id: "chunk:payload",
            status: "active",
            valid_from: "2026-04-01T00:00:00Z",
            valid_until: "2027-04-01T00:00:00Z"
          }
        }
      ]
    });
    const provider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding
    });
    const hits = await provider.search(makeInput({ query: "payload" }));
    expect(hits).toHaveLength(1);
    expect(hits[0].itemId).toBe("item:payload");
    expect(hits[0].chunkId).toBe("chunk:payload");
    // Falls back to point id when payload is absent.
    const clientNoPayload = makeFakeQdrantClient({
      denseResults: [{ id: "raw-id", score: 0.5 }]
    });
    const fallback = new QdrantHybridMemorySearchProviderV12({
      client: clientNoPayload,
      embeddingFn: asciiEmbedding
    });
    const fallbackHits = await fallback.search(makeInput({ query: "payload" }));
    expect(fallbackHits[0].itemId).toBe("raw-id");
    expect(fallbackHits[0].chunkId).toBeUndefined();
  });

  it("[B-14] falls back to local RRF when queryFused throws", async () => {
    const client = makeFakeQdrantClient({
      denseResults: [
        { id: "pt-d", score: 0.8, payload: { item_id: "item:fallback" } }
      ],
      sparseResults: [
        { id: "pt-s", score: 0.6, payload: { item_id: "item:fallback" } }
      ],
      fusionThrows: true
    });
    const provider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding,
      sparseVectorizerFn: async () => ({ indices: [0], values: [1] })
    });
    const hits = await provider.search(makeInput({ query: "fallback" }));
    expect(hits).toHaveLength(1);
    expect(hits[0].itemId).toBe("item:fallback");
    expect(hits[0].streams.qdrant_dense).toBeDefined();
    expect(hits[0].streams.qdrant_sparse).toBeDefined();
  });

  it("[B-15] candidateLimit feeds Qdrant; finalLimit caps returned hits", async () => {
    const capturedLimits: number[] = [];
    const denseResults = Array.from({ length: 30 }, (_, i) => ({
      id: `pt-${i}`,
      score: 1 - i * 0.01,
      payload: { item_id: `item:${i}` }
    }));
    const client = makeFakeQdrantClient({ denseResults, capturedLimits });
    const provider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding
    });
    const hits = await provider.search(
      makeInput({ query: "candidates", candidateLimit: 80, finalLimit: 5 })
    );
    expect(capturedLimits[0]).toBe(80);
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  it("filters Qdrant dense points by payload system time before local RRF", async () => {
    const capturedFilters: QdrantFilter[] = [];
    const client = makeFakeQdrantClient({
      denseResults: [
        {
          id: "pt-future",
          score: 0.99,
          payload: {
            vault_id: "vault-A",
            item_id: "item:future-created",
            t_created: "2026-06-01T00:00:00Z"
          }
        },
        {
          id: "pt-visible",
          score: 0.5,
          payload: {
            vault_id: "vault-A",
            item_id: "item:visible",
            t_created: "2026-01-01T00:00:00Z",
            t_expired: null
          }
        },
        {
          id: "pt-expired",
          score: 0.8,
          payload: {
            vault_id: "vault-A",
            item_id: "item:expired-system",
            t_created: "2026-01-01T00:00:00Z",
            t_expired: "2026-03-01T00:00:00Z"
          }
        }
      ],
      capturedFilters
    });
    const provider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding,
      useNativeFusion: false
    });

    const hits = await provider.search(
      makeInput({ query: "qdrant time", asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toEqual(["item:visible"]);
    expect(capturedFilters[0].must).toContainEqual({
      key: "t_created",
      range: { lte: "2026-04-01T00:00:00Z" }
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-vault leak — must hold for *every* v12 read path.
// ---------------------------------------------------------------------------

describe("v12 cross-vault leak protection", () => {
  it("postgres provider: vault-A query never returns vault-B rows even when ids overlap", async () => {
    const pool = new FakePgPoolV12();
    pool.seedFts([
      {
        itemId: "item:shared",
        chunkId: "chunk:vault-A",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "vault A version of the embedding configuration"
      },
      {
        itemId: "item:shared",
        chunkId: "chunk:vault-B",
        vaultId: "vault-B",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        chunkText: "vault B leak with embedding configuration"
      }
    ]);
    pool.seedPgVector([
      {
        itemId: "item:shared",
        chunkId: "chunk:vault-A-vec",
        vaultId: "vault-A",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.5
      },
      {
        itemId: "item:shared",
        chunkId: "chunk:vault-B-vec",
        vaultId: "vault-B",
        status: "active",
        validFrom: null,
        validUntil: null,
        supersededBy: null,
        similarityToQuery: 0.99
      }
    ]);

    const provider = new PostgresHybridMemorySearchProvider({
      pool,
      embeddingFn: asciiEmbedding
    });

    const hitsA = await provider.search(
      makeInput({ vaultId: "vault-A", query: "embedding configuration" })
    );
    expect(hitsA.length).toBeGreaterThan(0);
    for (const hit of hitsA) {
      // Every chunk surfaced to vault-A must trace back to a vault-A row.
      expect([
        "chunk:vault-A",
        "chunk:vault-A-vec"
      ]).toContain(hit.chunkId);
    }

    const hitsB = await provider.search(
      makeInput({ vaultId: "vault-B", query: "embedding configuration" })
    );
    for (const hit of hitsB) {
      expect([
        "chunk:vault-B",
        "chunk:vault-B-vec"
      ]).toContain(hit.chunkId);
    }

    // Pool received vault-A and vault-B as different params on different calls.
    const ftsCalls = pool.captured.filter((c) => c.text === POSTGRES_FTS_SQL);
    expect(ftsCalls.some((c) => c.params[1] === "vault-A")).toBe(true);
    expect(ftsCalls.some((c) => c.params[1] === "vault-B")).toBe(true);
  });

  it("qdrant provider: vault_id is always required and forwarded on every call", async () => {
    const capturedFilters: QdrantFilter[] = [];
    const client = makeFakeQdrantClient({
      denseResults: [{ id: "pt-1", score: 0.8, payload: { item_id: "item:x" } }],
      sparseResults: [{ id: "pt-2", score: 0.7, payload: { item_id: "item:y" } }],
      capturedFilters
    });
    const provider = new QdrantHybridMemorySearchProviderV12({
      client,
      embeddingFn: asciiEmbedding,
      sparseVectorizerFn: async () => ({ indices: [0], values: [1] })
    });

    await provider.search(makeInput({ vaultId: "vault-secret" }));
    expect(capturedFilters.length).toBeGreaterThan(0);
    for (const filter of capturedFilters) {
      const vaultClause = filter.must?.find((c) => c.key === "vault_id");
      expect(vaultClause?.match?.value).toBe("vault-secret");
    }

    // Empty vault is rejected at the type seam.
    await expect(provider.search(makeInput({ vaultId: "" }))).rejects.toThrow(/vaultId/);
  });
});

// ---------------------------------------------------------------------------
// v1.3 Lane B BREAKING CHANGE — `reranker` removed from stream union/weights.
// ---------------------------------------------------------------------------

describe("v1.3 Lane B breaking change", () => {
  it("DEFAULT_STREAM_WEIGHTS no longer contains `reranker`", () => {
    const keys = Object.keys(DEFAULT_STREAM_WEIGHTS);
    expect(keys).not.toContain("reranker");
    expect(keys).toEqual([
      "qdrant_dense",
      "qdrant_sparse",
      "postgres_fts",
      "postgres_pgvector",
      "graph",
      "temporal",
      "wiki"
    ]);
  });

  it("ALL_STREAM_KINDS_V12 lists exactly the seven candidate-emitting streams", () => {
    expect([...ALL_STREAM_KINDS_V12]).toEqual([
      "qdrant_dense",
      "qdrant_sparse",
      "postgres_fts",
      "postgres_pgvector",
      "graph",
      "temporal",
      "wiki"
    ]);
  });
});

// ---------------------------------------------------------------------------
// v1.3 Lane B back-compat — PostgresHybridMemorySearchProvider returns
// byte-identical hits across 3 back-to-back runs via the new orchestrator
// shim. This is the §7A.2 frozen-fixture regression test.
// ---------------------------------------------------------------------------

describe("PostgresHybridMemorySearchProvider — orchestrator shim back-compat", () => {
  it("returns bit-identical hits across 3 runs (frozen fixtures, no timeout)", async () => {
    const seedFts = (pool: FakePgPoolV12) => {
      pool.seedFts([
        {
          itemId: "item:both",
          chunkId: "chunk:fts",
          vaultId: "vault-A",
          status: "active",
          validFrom: null,
          validUntil: null,
          supersededBy: null,
          chunkText: "hybrid retrieval combines FTS and pgvector"
        },
        {
          itemId: "item:fts-only",
          chunkId: "chunk:fts-only",
          vaultId: "vault-A",
          status: "active",
          validFrom: null,
          validUntil: null,
          supersededBy: null,
          chunkText: "fts-only signal hybrid retrieval"
        }
      ]);
    };
    const seedPgVector = (pool: FakePgPoolV12) => {
      pool.seedPgVector([
        {
          itemId: "item:both",
          chunkId: "chunk:vec",
          vaultId: "vault-A",
          status: "active",
          validFrom: null,
          validUntil: null,
          supersededBy: null,
          similarityToQuery: 0.65
        },
        {
          itemId: "item:vec-only",
          chunkId: "chunk:vec-only",
          vaultId: "vault-A",
          status: "active",
          validFrom: null,
          validUntil: null,
          supersededBy: null,
          similarityToQuery: 0.95
        }
      ]);
    };

    const runOnce = async () => {
      const pool = new FakePgPoolV12();
      seedFts(pool);
      seedPgVector(pool);
      const provider = new PostgresHybridMemorySearchProvider({
        pool,
        embeddingFn: asciiEmbedding
      });
      return provider.search(makeInput({ query: "hybrid retrieval" }));
    };

    const r1 = await runOnce();
    const r2 = await runOnce();
    const r3 = await runOnce();
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    expect(JSON.stringify(r2)).toBe(JSON.stringify(r3));
    // Sanity — at least the both-streams winner is in the top.
    expect(r1[0].itemId).toBe("item:both");
  });
});

describe("QdrantHybridMemorySearchProviderV12 — orchestrator shim back-compat", () => {
  it("falls back to orchestrator on queryFused throw and produces stable hits", async () => {
    const buildClient = (): QdrantClientLike =>
      makeFakeQdrantClient({
        denseResults: [
          { id: "pt-d", score: 0.8, payload: { item_id: "item:fallback" } }
        ],
        sparseResults: [
          { id: "pt-s", score: 0.6, payload: { item_id: "item:fallback" } }
        ],
        fusionThrows: true
      });

    const runOnce = async () => {
      const provider = new QdrantHybridMemorySearchProviderV12({
        client: buildClient(),
        embeddingFn: asciiEmbedding,
        sparseVectorizerFn: async () => ({ indices: [0], values: [1] })
      });
      return provider.search(makeInput({ query: "fallback" }));
    };

    const r1 = await runOnce();
    const r2 = await runOnce();
    const r3 = await runOnce();
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    expect(JSON.stringify(r2)).toBe(JSON.stringify(r3));
    expect(r1[0].itemId).toBe("item:fallback");
    expect(r1[0].streams.qdrant_dense).toBeDefined();
    expect(r1[0].streams.qdrant_sparse).toBeDefined();
  });
});
