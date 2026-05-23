// Lane A2 — TemporalRetrievalProvider tests.
//
// Pure-unit: no live Postgres required. PoolLikeV12 is faked to simulate
// the SQL queries issued by TemporalRetrievalProvider. Each test pins one
// behavioural invariant from the v1.3 spec.
//
// v1.4 Lane 0.5: FakeTemporalPool updated to reflect the merged
// Steps 2+3 CTE (SQL_WINNING_RELATIONS_BATCH) that eliminated the N+1
// per-entity round-trip. Behavioural invariants are unchanged.

import { describe, expect, it } from "vitest";
import {
  TemporalRetrievalProvider,
  SQL_SEED_ENTITIES,
  SQL_WINNING_RELATIONS_BATCH,
  SQL_TOP_EVIDENCE_BATCH,
  type TemporalRetrievalProviderConfig
} from "../src/temporal-retrieval-v12.js";
import type { MemorySearchInputV12, PoolLikeV12, PoolQueryResultV12 } from "../src/index.js";

// ---------------------------------------------------------------------------
// Fake pool infrastructure
// ---------------------------------------------------------------------------

interface FakeEntity {
  id: string;
  vaultId: string;
  canonicalName: string;
}

interface FakeRelation {
  id: string;
  vaultId: string;
  sourceEntityId: string;
  relationType: string;
  confidence: number;
  validFrom: string | null;
  validUntil: string | null;
  tCreated?: string | null;
  tExpired?: string | null;
  status: string;
  invalidatedBy: string | null;
}

interface FakeEvidence {
  id: string;
  vaultId: string;
  relationId: string;
  itemId: string;
  confidence: number;
}

class FakeTemporalPool implements PoolLikeV12 {
  private entities: FakeEntity[] = [];
  private relations: FakeRelation[] = [];
  private evidence: FakeEvidence[] = [];

  /** Track every query call for assertion in perf tests. */
  readonly queryCalls: Array<{ text: string; params: ReadonlyArray<unknown> }> = [];

  seedEntities(rows: FakeEntity[]): void { this.entities = [...rows]; }
  seedRelations(rows: FakeRelation[]): void { this.relations = [...rows]; }
  seedEvidence(rows: FakeEvidence[]): void { this.evidence = [...rows]; }

  async query<T = unknown>(
    text: string,
    params: ReadonlyArray<unknown> = []
  ): Promise<PoolQueryResultV12<T>> {
    this.queryCalls.push({ text, params });

    // Route by SQL fragment patterns.
    if (text.includes("FROM memory_entities") && text.includes("ILIKE")) {
      return { rows: this.queryEntities(params) as unknown as T[] };
    }
    // v1.4 Lane 0.5: merged Steps 2+3 — batch winning relations via CTE.
    if (text.includes("WITH ranked AS") || text.includes("ROW_NUMBER()")) {
      return { rows: this.queryWinningRelationsBatch(params) as unknown as T[] };
    }
    // v1.4 Lane 0.5: batch evidence via DISTINCT ON.
    if (text.includes("FROM memory_relation_evidence") && text.includes("DISTINCT ON")) {
      return { rows: this.queryTopEvidenceBatch(params) as unknown as T[] };
    }
    return { rows: [] };
  }

  private queryEntities(params: ReadonlyArray<unknown>): unknown[] {
    const [vaultId, likePattern, limit] = params as [string, string, number];
    const term = (likePattern as string).replace(/%/g, "").toLowerCase();
    return this.entities
      .filter((e) => e.vaultId === vaultId && e.canonicalName.toLowerCase().includes(term))
      .slice(0, limit)
      .map((e) => ({ id: e.id }));
  }

  /**
   * Simulates the SQL_WINNING_RELATIONS_BATCH CTE:
   * For each (source_entity_id, relation_type) group in the seed set,
   * return the single relation with the latest valid_from (DESC NULLS LAST).
   */
  private queryWinningRelationsBatch(params: ReadonlyArray<unknown>): unknown[] {
    const [vaultId, seedIds, validAtParam, systemTimeParam] = params as [
      string,
      string[],
      string | null,
      string | null | undefined
    ];
    const validAt = validAtParam ? Date.parse(validAtParam) : null;
    const systemTime = systemTimeParam ? Date.parse(systemTimeParam) : null;

    // Filter candidates: active, not invalidated, within temporal bounds.
    const candidates = this.relations.filter((r) => {
      if (r.vaultId !== vaultId) return false;
      if (!seedIds.includes(r.sourceEntityId)) return false;
      if (r.status !== "active") return false;
      if (r.invalidatedBy !== null) return false;
      if (systemTime !== null) {
        if (r.tCreated !== null && r.tCreated !== undefined && Date.parse(r.tCreated) > systemTime) return false;
        if (r.tExpired !== null && r.tExpired !== undefined && Date.parse(r.tExpired) <= systemTime) return false;
      }
      if (validAt !== null) {
        if (r.validFrom !== null && Date.parse(r.validFrom) > validAt) return false;
        if (r.validUntil !== null && Date.parse(r.validUntil) <= validAt) return false;
      }
      return true;
    });

    // Group by (sourceEntityId, relationType), pick winner per group.
    const groups = new Map<string, FakeRelation>();
    for (const r of candidates) {
      const key = `${r.sourceEntityId}|${r.relationType}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, r);
      } else {
        // valid_from DESC NULLS LAST: explicit timestamp beats null; newer beats older.
        const aFrom = r.validFrom ? Date.parse(r.validFrom) : -Infinity;
        const bFrom = existing.validFrom ? Date.parse(existing.validFrom) : -Infinity;
        if (aFrom > bFrom) groups.set(key, r);
      }
    }

    return [...groups.values()].map((r) => ({
      id: r.id,
      source_entity_id: r.sourceEntityId,
      confidence: r.confidence,
      valid_from: r.validFrom,
      valid_until: r.validUntil,
      status: r.status,
      invalidated_by: r.invalidatedBy
    }));
  }

  /**
   * Simulates SQL_TOP_EVIDENCE_BATCH (DISTINCT ON relation_id ORDER BY confidence DESC):
   * returns the best evidence row for each relation_id in the supplied set.
   */
  private queryTopEvidenceBatch(params: ReadonlyArray<unknown>): unknown[] {
    const [vaultId, relationIds] = params as [string, string[]];

    const best = new Map<string, FakeEvidence>();
    for (const ev of this.evidence) {
      if (ev.vaultId !== vaultId) continue;
      if (!relationIds.includes(ev.relationId)) continue;
      const existing = best.get(ev.relationId);
      if (!existing || ev.confidence > existing.confidence) {
        best.set(ev.relationId, ev);
      }
    }

    return [...best.values()].map((e) => ({
      relation_id: e.relationId,
      item_id: e.itemId,
      confidence: e.confidence
    }));
  }
}

function makeInput(overrides: Partial<MemorySearchInputV12> = {}): MemorySearchInputV12 {
  return {
    query: "Alice",
    vaultId: "vault-A",
    finalLimit: 10,
    ...overrides
  };
}

function makeProvider(
  pool: PoolLikeV12,
  config: Partial<TemporalRetrievalProviderConfig> = {}
): TemporalRetrievalProvider {
  return new TemporalRetrievalProvider({ pool, ...config });
}

// ---------------------------------------------------------------------------
// Tests — hit path
// ---------------------------------------------------------------------------

describe("TemporalRetrievalProvider — hit path", () => {
  it("two active relations with same (source, relation_type): newer valid_from wins", async () => {
    const pool = new FakeTemporalPool();
    pool.seedEntities([
      { id: "entity:alice", vaultId: "vault-A", canonicalName: "alice" }
    ]);
    pool.seedRelations([
      {
        id: "rel:old",
        vaultId: "vault-A",
        sourceEntityId: "entity:alice",
        relationType: "works_at",
        confidence: 0.8,
        validFrom: "2024-01-01T00:00:00Z",
        validUntil: null,
        status: "active",
        invalidatedBy: null
      },
      {
        id: "rel:new",
        vaultId: "vault-A",
        sourceEntityId: "entity:alice",
        relationType: "works_at",
        confidence: 0.75,
        validFrom: "2025-06-01T00:00:00Z",
        validUntil: null,
        status: "active",
        invalidatedBy: null
      }
    ]);
    pool.seedEvidence([
      {
        id: "ev:old",
        vaultId: "vault-A",
        relationId: "rel:old",
        itemId: "item:old-evidence",
        confidence: 0.8
      },
      {
        id: "ev:new",
        vaultId: "vault-A",
        relationId: "rel:new",
        itemId: "item:new-evidence",
        confidence: 0.75
      }
    ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(makeInput({ query: "alice" }));

    // Newer relation (rel:new) should win → evidence item:new-evidence
    expect(hits).toHaveLength(1);
    expect(hits[0].itemId).toBe("item:new-evidence");
    expect(hits[0].streams.temporal).toBeDefined();
    expect(hits[0].streams.temporal!.backend).toBe("temporal-retrieval-v12");
    expect(hits[0].streams.temporal!.rank).toBe(0);
  });

  it("filters relations created after asOfSystemTime before choosing winners", async () => {
    const pool = new FakeTemporalPool();
    pool.seedEntities([{ id: "entity:alice", vaultId: "vault-A", canonicalName: "alice" }]);
    pool.seedRelations([
      {
        id: "rel:future",
        vaultId: "vault-A",
        sourceEntityId: "entity:alice",
        relationType: "works_at",
        confidence: 0.99,
        validFrom: "2026-06-01T00:00:00Z",
        validUntil: null,
        tCreated: "2026-06-01T00:00:00Z",
        status: "active",
        invalidatedBy: null
      },
      {
        id: "rel:visible",
        vaultId: "vault-A",
        sourceEntityId: "entity:alice",
        relationType: "works_at",
        confidence: 0.5,
        validFrom: "2026-01-01T00:00:00Z",
        validUntil: null,
        tCreated: "2026-01-01T00:00:00Z",
        status: "active",
        invalidatedBy: null
      }
    ]);
    pool.seedEvidence([
      { id: "ev:future", vaultId: "vault-A", relationId: "rel:future", itemId: "item:future", confidence: 0.99 },
      { id: "ev:visible", vaultId: "vault-A", relationId: "rel:visible", itemId: "item:visible", confidence: 0.5 }
    ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(
      makeInput({ query: "alice", asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toEqual(["item:visible"]);
    const relCall = pool.queryCalls.find((c) => c.text.includes("WITH ranked AS"));
    expect(relCall!.text).toContain("t_created <= $4::timestamptz");
    expect(relCall!.params[3]).toBe("2026-04-01T00:00:00Z");
  });

  it("filters relations expired at asOfSystemTime before choosing winners", async () => {
    const pool = new FakeTemporalPool();
    pool.seedEntities([{ id: "entity:alice", vaultId: "vault-A", canonicalName: "alice" }]);
    pool.seedRelations([
      {
        id: "rel:expired",
        vaultId: "vault-A",
        sourceEntityId: "entity:alice",
        relationType: "works_at",
        confidence: 0.99,
        validFrom: "2026-01-01T00:00:00Z",
        validUntil: null,
        tCreated: "2026-01-01T00:00:00Z",
        tExpired: "2026-03-01T00:00:00Z",
        status: "active",
        invalidatedBy: null
      },
      {
        id: "rel:visible",
        vaultId: "vault-A",
        sourceEntityId: "entity:alice",
        relationType: "works_at",
        confidence: 0.5,
        validFrom: "2026-01-01T00:00:00Z",
        validUntil: null,
        tCreated: "2026-01-01T00:00:00Z",
        tExpired: null,
        status: "active",
        invalidatedBy: null
      }
    ]);
    pool.seedEvidence([
      { id: "ev:expired", vaultId: "vault-A", relationId: "rel:expired", itemId: "item:expired", confidence: 0.99 },
      { id: "ev:visible", vaultId: "vault-A", relationId: "rel:visible", itemId: "item:visible", confidence: 0.5 }
    ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(
      makeInput({ query: "alice", asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toEqual(["item:visible"]);
    const relCall = pool.queryCalls.find((c) => c.text.includes("WITH ranked AS"));
    expect(relCall!.text).toContain("t_expired IS NULL OR t_expired > $4::timestamptz");
  });

  it("keeps current temporal behaviour when asOfSystemTime is undefined", async () => {
    const pool = new FakeTemporalPool();
    pool.seedEntities([{ id: "entity:alice", vaultId: "vault-A", canonicalName: "alice" }]);
    pool.seedRelations([
      {
        id: "rel:future",
        vaultId: "vault-A",
        sourceEntityId: "entity:alice",
        relationType: "works_at",
        confidence: 0.9,
        validFrom: "2026-06-01T00:00:00Z",
        validUntil: null,
        tCreated: "2026-06-01T00:00:00Z",
        status: "active",
        invalidatedBy: null
      }
    ]);
    pool.seedEvidence([
      { id: "ev:future", vaultId: "vault-A", relationId: "rel:future", itemId: "item:future", confidence: 0.9 }
    ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(makeInput({ query: "alice" }));

    expect(hits.map((h) => h.itemId)).toEqual(["item:future"]);
  });
});

// ---------------------------------------------------------------------------
// Tests — miss path
// ---------------------------------------------------------------------------

describe("TemporalRetrievalProvider — miss path", () => {
  it("returns 0 hits when no entity matches the query", async () => {
    const pool = new FakeTemporalPool();
    pool.seedEntities([
      { id: "entity:bob", vaultId: "vault-A", canonicalName: "bob" }
    ]);
    pool.seedRelations([
      {
        id: "rel:bob",
        vaultId: "vault-A",
        sourceEntityId: "entity:bob",
        relationType: "works_at",
        confidence: 0.9,
        validFrom: null,
        validUntil: null,
        status: "active",
        invalidatedBy: null
      }
    ]);
    pool.seedEvidence([
      {
        id: "ev:bob",
        vaultId: "vault-A",
        relationId: "rel:bob",
        itemId: "item:bob-evidence",
        confidence: 0.9
      }
    ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(makeInput({ query: "alice" }));
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — vault isolation
// ---------------------------------------------------------------------------

describe("TemporalRetrievalProvider — vault isolation", () => {
  it("cross-vault relation is excluded when querying vault-A", async () => {
    const pool = new FakeTemporalPool();
    pool.seedEntities([
      { id: "entity:alice", vaultId: "vault-A", canonicalName: "alice" },
      { id: "entity:alice-b", vaultId: "vault-B", canonicalName: "alice" }
    ]);
    pool.seedRelations([
      {
        id: "rel:cross-vault",
        vaultId: "vault-B",
        sourceEntityId: "entity:alice-b",
        relationType: "owns",
        confidence: 0.95,
        validFrom: null,
        validUntil: null,
        status: "active",
        invalidatedBy: null
      }
    ]);
    pool.seedEvidence([
      {
        id: "ev:cross",
        vaultId: "vault-B",
        relationId: "rel:cross-vault",
        itemId: "item:secret",
        confidence: 0.95
      }
    ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(makeInput({ query: "alice", vaultId: "vault-A" }));
    expect(hits).toHaveLength(0);
    expect(hits.map((h) => h.itemId)).not.toContain("item:secret");
  });

  it("rejects empty vaultId — security invariant", async () => {
    const pool = new FakeTemporalPool();
    const provider = makeProvider(pool);
    await expect(provider.search(makeInput({ vaultId: "" }))).rejects.toThrow(/vaultId/);
  });
});

// ---------------------------------------------------------------------------
// Tests — supersededBy chain
// ---------------------------------------------------------------------------

describe("TemporalRetrievalProvider — supersededBy chain", () => {
  it("relation with invalidated_by set is skipped", async () => {
    const pool = new FakeTemporalPool();
    pool.seedEntities([
      { id: "entity:carol", vaultId: "vault-A", canonicalName: "carol" }
    ]);
    pool.seedRelations([
      {
        id: "rel:invalidated",
        vaultId: "vault-A",
        sourceEntityId: "entity:carol",
        relationType: "lives_in",
        confidence: 0.9,
        validFrom: "2023-01-01T00:00:00Z",
        validUntil: null,
        status: "active",
        invalidatedBy: "rel:replacement"
      }
    ]);
    pool.seedEvidence([
      {
        id: "ev:inv",
        vaultId: "vault-A",
        relationId: "rel:invalidated",
        itemId: "item:old-city",
        confidence: 0.9
      }
    ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(makeInput({ query: "carol" }));
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — validAt before any valid_from
// ---------------------------------------------------------------------------

describe("TemporalRetrievalProvider — validAt before any valid_from", () => {
  it("returns 0 hits when validAt is before all relations' valid_from", async () => {
    const pool = new FakeTemporalPool();
    pool.seedEntities([
      { id: "entity:dave", vaultId: "vault-A", canonicalName: "dave" }
    ]);
    pool.seedRelations([
      {
        id: "rel:future",
        vaultId: "vault-A",
        sourceEntityId: "entity:dave",
        relationType: "works_at",
        confidence: 0.8,
        validFrom: "2027-01-01T00:00:00Z",
        validUntil: null,
        status: "active",
        invalidatedBy: null
      }
    ]);
    pool.seedEvidence([
      {
        id: "ev:future",
        vaultId: "vault-A",
        relationId: "rel:future",
        itemId: "item:future-evidence",
        confidence: 0.8
      }
    ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(
      makeInput({ query: "dave", validAt: "2025-01-01T00:00:00Z" })
    );
    expect(hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — valid_until < validAt
// ---------------------------------------------------------------------------

describe("TemporalRetrievalProvider — valid_until < validAt", () => {
  it("expired relation (valid_until before validAt) is excluded", async () => {
    const pool = new FakeTemporalPool();
    pool.seedEntities([
      { id: "entity:eve", vaultId: "vault-A", canonicalName: "eve" }
    ]);
    pool.seedRelations([
      {
        id: "rel:expired",
        vaultId: "vault-A",
        sourceEntityId: "entity:eve",
        relationType: "member_of",
        confidence: 0.85,
        validFrom: "2020-01-01T00:00:00Z",
        validUntil: "2023-12-31T23:59:59Z",
        status: "active",
        invalidatedBy: null
      }
    ]);
    pool.seedEvidence([
      {
        id: "ev:expired",
        vaultId: "vault-A",
        relationId: "rel:expired",
        itemId: "item:expired-evidence",
        confidence: 0.85
      }
    ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(
      makeInput({ query: "eve", validAt: "2026-01-01T00:00:00Z" })
    );
    expect(hits).toHaveLength(0);
  });
});
