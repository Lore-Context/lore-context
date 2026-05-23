// Lane A1 — GraphRetrievalProvider unit tests.
//
// Pure-unit: no live Postgres required. A MockPool intercepts each SQL call
// by substring-matching the query text and returns canned rows. The pattern
// mirrors the FakePgPoolV12 in memory-search-v12.test.ts.
//
// Test coverage:
//   A1-1  Hit path: entity matched → relations walked → evidence emitted.
//   A1-2  Miss path: no entity matches → 0 hits.
//   A1-3  Vault isolation: cross-vault entity exists → 0 hits for different vaultId.
//   A1-4  Temporal exclusion: valid_until < validAt → relation skipped.
//   A1-5  Status filter: status='superseded' → relation skipped.
//   A1-6  Depth-2 walk: seed → A → B; both relations yield evidence.
//   A1-7  Missing vaultId throws.

import { describe, expect, it } from "vitest";
import {
  GraphRetrievalProvider,
  GRAPH_ENTITY_SEED_SQL,
  GRAPH_RELATIONS_SQL,
  GRAPH_EVIDENCE_SQL,
  type GraphRetrievalProviderConfig
} from "../src/graph-retrieval-v12.js";
import type { PoolLikeV12, PoolQueryResultV12 } from "../src/index.js";

// ---------------------------------------------------------------------------
// MockPool — routes queries by substring match to canned row arrays.
// ---------------------------------------------------------------------------

type QueryHandler = (params: ReadonlyArray<unknown>) => unknown[];

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
        return { rows: handler(params) as T[] };
      }
    }
    return { rows: [] };
  }
}

// ---------------------------------------------------------------------------
// Helper factories.
// ---------------------------------------------------------------------------

function makeProvider(
  pool: PoolLikeV12,
  overrides: Partial<GraphRetrievalProviderConfig> = {}
): GraphRetrievalProvider {
  return new GraphRetrievalProvider({ pool, ...overrides });
}

function makeInput(overrides: Partial<Parameters<GraphRetrievalProvider["search"]>[0]> = {}) {
  return {
    query: "Alice",
    vaultId: "vault-test",
    finalLimit: 10,
    ...overrides
  };
}

// Canonical seed row (entity table).
function seedRow(id: string) {
  return { id, confidence: "0.9" };
}

// Canonical relation row. All required fields present; status defaults to 'active'.
function relRow(
  opts: {
    relation_id: string;
    source: string;
    target: string;
    type?: string;
    confidence?: string;
    valid_from?: string | null;
    valid_until?: string | null;
    t_created?: string | null;
    t_expired?: string | null;
    status?: string;
    created_at?: string;
  }
) {
  return {
    relation_id: opts.relation_id,
    source_entity_id: opts.source,
    target_entity_id: opts.target,
    relation_type: opts.type ?? "knows",
    fact: `${opts.source} knows ${opts.target}`,
    status: opts.status ?? "active",
    confidence: opts.confidence ?? "0.8",
    valid_from: opts.valid_from ?? null,
    valid_until: opts.valid_until ?? null,
    t_created: opts.t_created ?? null,
    t_expired: opts.t_expired ?? null,
    created_at: opts.created_at ?? "2026-04-01T00:00:00Z"
  };
}

// Canonical evidence row.
function evRow(opts: {
  evidence_id: string;
  relation_id: string;
  item_id: string;
  confidence?: string;
}) {
  return {
    evidence_id: opts.evidence_id,
    relation_id: opts.relation_id,
    item_id: opts.item_id,
    evidence_text: "supporting text",
    confidence: opts.confidence ?? "0.85",
    created_at: "2026-04-01T00:00:00Z"
  };
}

// ---------------------------------------------------------------------------
// A1-1  Hit path.
// ---------------------------------------------------------------------------

describe("GraphRetrievalProvider (A1-1) — hit path", () => {
  it("returns a hit when entity matched, relation walked, evidence emitted", async () => {
    const pool = new MockPool()
      .on("memory_entities", () => [seedRow("entity:alice")])
      .on("memory_relations", () => [
        relRow({ relation_id: "rel:1", source: "entity:alice", target: "entity:bob" })
      ])
      .on("memory_relation_evidence", () => [
        evRow({ evidence_id: "ev:1", relation_id: "rel:1", item_id: "item:evidence-1" })
      ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(makeInput());

    expect(hits).toHaveLength(1);
    expect(hits[0].itemId).toBe("item:evidence-1");
    expect(hits[0].streams.graph).toBeDefined();
    expect(hits[0].streams.graph!.score).toBeGreaterThan(0);
    expect(hits[0].streams.graph!.backend).toBe("graph-retrieval-v12");
    expect(hits[0].streams.graph!.path).toEqual(["entity:alice", "entity:bob"]);
    expect(hits[0].lifecycle.status).toBe("active");
    expect(hits[0].provenance.relationIds).toContain("rel:1");
  });

  it("assigns rank=0 to the top-scoring hit", async () => {
    const pool = new MockPool()
      .on("memory_entities", () => [seedRow("entity:alice")])
      .on("memory_relations", () => [
        relRow({ relation_id: "rel:1", source: "entity:alice", target: "entity:bob" })
      ])
      .on("memory_relation_evidence", () => [
        evRow({ evidence_id: "ev:1", relation_id: "rel:1", item_id: "item:top" })
      ]);

    const provider = makeProvider(pool);
    const hits = await provider.search(makeInput());
    expect(hits[0].streams.graph!.rank).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A1-2  Miss path.
// ---------------------------------------------------------------------------

describe("GraphRetrievalProvider (A1-2) — miss path", () => {
  it("returns 0 hits when no entity matches the query", async () => {
    const pool = new MockPool()
      .on("memory_entities", () => []) // no seeds
      .on("memory_relations", () => [])
      .on("memory_relation_evidence", () => []);

    const provider = makeProvider(pool);
    const hits = await provider.search(makeInput({ query: "UnknownXYZ" }));
    expect(hits).toHaveLength(0);
  });

  it("does not issue relation/evidence queries when seed is empty", async () => {
    const pool = new MockPool().on("memory_entities", () => []);

    const provider = makeProvider(pool);
    await provider.search(makeInput());

    const relationQueries = pool.captured.filter((c) => c.text.includes("memory_relations"));
    expect(relationQueries).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// A1-3  Vault isolation.
// ---------------------------------------------------------------------------

describe("GraphRetrievalProvider (A1-3) — vault isolation", () => {
  it("returns 0 hits when requesting vault-B while entity only lives in vault-A", async () => {
    // The MockPool simulates SQL vault filtering: the entity seed query
    // always passes vaultId=$1; we check that the pool receives 'vault-B'
    // and returns empty rows (as a real DB would for a cross-vault query).
    const pool = new MockPool()
      .on("memory_entities", (params) => {
        // Only return a row when vault matches 'vault-A'.
        if (params[0] === "vault-A") {
          return [seedRow("entity:alice")];
        }
        return [];
      })
      .on("memory_relations", () => [
        relRow({ relation_id: "rel:1", source: "entity:alice", target: "entity:bob" })
      ])
      .on("memory_relation_evidence", () => [
        evRow({ evidence_id: "ev:1", relation_id: "rel:1", item_id: "item:1" })
      ]);

    const providerB = makeProvider(pool);
    const hits = await providerB.search(makeInput({ vaultId: "vault-B" }));
    expect(hits).toHaveLength(0);

    // Confirm vaultId=vault-B was forwarded to the entity query.
    const seedCall = pool.captured.find((c) => c.text.includes("memory_entities"));
    expect(seedCall!.params[0]).toBe("vault-B");
  });

  it("forwards vaultId as first param on all SQL calls", async () => {
    const pool = new MockPool()
      .on("memory_entities", () => [seedRow("entity:alice")])
      .on("memory_relations", () => [
        relRow({ relation_id: "rel:1", source: "entity:alice", target: "entity:bob" })
      ])
      .on("memory_relation_evidence", () => [
        evRow({ evidence_id: "ev:1", relation_id: "rel:1", item_id: "item:1" })
      ]);

    const provider = makeProvider(pool);
    await provider.search(makeInput({ vaultId: "vault-secret" }));

    for (const call of pool.captured) {
      expect(call.params[0]).toBe("vault-secret");
    }
  });
});

// ---------------------------------------------------------------------------
// A1-4  Temporal exclusion.
// ---------------------------------------------------------------------------

describe("GraphRetrievalProvider (A1-4) — temporal exclusion", () => {
  it("skips a relation whose valid_until is before validAt", async () => {
    // The mock simulates the DB filtering: relations query receives validAt=$3
    // and we return empty when the relation is expired.
    const pool = new MockPool()
      .on("memory_entities", () => [seedRow("entity:alice")])
      .on("memory_relations", (params) => {
        const validAt = params[2] as string | null;
        if (!validAt) return [
          relRow({
            relation_id: "rel:expired",
            source: "entity:alice",
            target: "entity:bob",
            valid_until: "2025-01-01T00:00:00Z"
          })
        ];
        // Simulate DB filtering: skip relation whose valid_until < validAt.
        const validAtMs = Date.parse(validAt);
        const rows = [
          relRow({
            relation_id: "rel:expired",
            source: "entity:alice",
            target: "entity:bob",
            valid_until: "2025-01-01T00:00:00Z"
          })
        ];
        return rows.filter((r) => {
          if (r.valid_until && Date.parse(r.valid_until) < validAtMs) return false;
          return true;
        });
      })
      .on("memory_relation_evidence", () => []);

    const provider = makeProvider(pool);
    const hits = await provider.search(
      makeInput({ validAt: "2026-05-05T00:00:00Z" })
    );
    expect(hits).toHaveLength(0);

    // Confirm validAt was forwarded as third param to the relations query.
    const relCall = pool.captured.find((c) => c.text.includes("memory_relations"));
    expect(relCall!.params[2]).toBe("2026-05-05T00:00:00Z");
  });

  it("skips relations created after asOfSystemTime before graph scoring", async () => {
    const pool = new MockPool()
      .on("memory_entities", () => [seedRow("entity:alice")])
      .on("memory_relations", (params) => {
        const systemTime = params[3] as string | null;
        const rows = [
          relRow({
            relation_id: "rel:future",
            source: "entity:alice",
            target: "entity:future",
            confidence: "0.99",
            t_created: "2026-06-01T00:00:00Z"
          }),
          relRow({
            relation_id: "rel:visible",
            source: "entity:alice",
            target: "entity:visible",
            confidence: "0.50",
            t_created: "2026-01-01T00:00:00Z"
          })
        ];
        if (!systemTime) return rows;
        const systemTimeMs = Date.parse(systemTime);
        return rows.filter((r) => !r.t_created || Date.parse(r.t_created) <= systemTimeMs);
      })
      .on("memory_relation_evidence", (params) => {
        const relationIds = params[1] as string[];
        return relationIds.map((id) =>
          evRow({ evidence_id: `ev:${id}`, relation_id: id, item_id: `item:${id}` })
        );
      });

    const provider = makeProvider(pool);
    const hits = await provider.search(
      makeInput({ asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toEqual(["item:rel:visible"]);
    const relCall = pool.captured.find((c) => c.text.includes("memory_relations"));
    expect(relCall!.text).toContain("r.t_created <= $4::timestamptz");
    expect(relCall!.params[3]).toBe("2026-04-01T00:00:00Z");
  });

  it("skips relations expired at asOfSystemTime before graph scoring", async () => {
    const pool = new MockPool()
      .on("memory_entities", () => [seedRow("entity:alice")])
      .on("memory_relations", (params) => {
        const systemTime = params[3] as string | null;
        const rows = [
          relRow({
            relation_id: "rel:expired",
            source: "entity:alice",
            target: "entity:expired",
            confidence: "0.99",
            t_created: "2026-01-01T00:00:00Z",
            t_expired: "2026-03-01T00:00:00Z"
          }),
          relRow({
            relation_id: "rel:visible",
            source: "entity:alice",
            target: "entity:visible",
            confidence: "0.50",
            t_created: "2026-01-01T00:00:00Z",
            t_expired: null
          })
        ];
        if (!systemTime) return rows;
        const systemTimeMs = Date.parse(systemTime);
        return rows.filter((r) => !r.t_expired || Date.parse(r.t_expired) > systemTimeMs);
      })
      .on("memory_relation_evidence", (params) => {
        const relationIds = params[1] as string[];
        return relationIds.map((id) =>
          evRow({ evidence_id: `ev:${id}`, relation_id: id, item_id: `item:${id}` })
        );
      });

    const provider = makeProvider(pool);
    const hits = await provider.search(
      makeInput({ asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toEqual(["item:rel:visible"]);
    const relCall = pool.captured.find((c) => c.text.includes("memory_relations"));
    expect(relCall!.text).toContain("r.t_expired IS NULL OR r.t_expired > $4::timestamptz");
  });
});

// ---------------------------------------------------------------------------
// A1-5  Status filter.
// ---------------------------------------------------------------------------

describe("GraphRetrievalProvider (A1-5) — status filter", () => {
  it("skips relations with status='superseded'", async () => {
    const pool = new MockPool()
      .on("memory_entities", () => [seedRow("entity:alice")])
      .on("memory_relations", () => [
        // Simulate DB filtering by status='active': return no rows when all
        // candidate relations are superseded.
        // The SQL in GRAPH_RELATIONS_SQL already pins status='active', so the
        // real DB would return nothing. We mirror that here.
      ])
      .on("memory_relation_evidence", () => []);

    const provider = makeProvider(pool);
    const hits = await provider.search(makeInput());
    expect(hits).toHaveLength(0);

    // Confirm the SQL contains the status='active' predicate.
    const relCall = pool.captured.find?.((c) => c.text.includes("memory_relations"));
    if (relCall) {
      expect(relCall.text).toContain("status = 'active'");
    }
    expect(GRAPH_RELATIONS_SQL).toContain("status = 'active'");
  });

  it("GRAPH_RELATIONS_SQL only fetches active relations", () => {
    expect(GRAPH_RELATIONS_SQL).toContain("r.status = 'active'");
  });
});

// ---------------------------------------------------------------------------
// A1-6  Depth-2 walk.
// ---------------------------------------------------------------------------

describe("GraphRetrievalProvider (A1-6) — depth-2 walk", () => {
  it("emits evidence hits from both hop-1 and hop-2 relations", async () => {
    // Graph: seed=entity:alice -[rel:1]-> entity:bob -[rel:2]-> entity:carol
    // Depth-1 relation: rel:1 (alice → bob)
    // Depth-2 relation: rel:2 (bob → carol)
    // Both should yield evidence and hits.

    let callCount = 0;
    const pool = new MockPool()
      .on("memory_entities", () => [seedRow("entity:alice")])
      .on("memory_relations", (params) => {
        callCount++;
        const frontier = params[1] as string[];
        if (frontier.includes("entity:alice") && !frontier.includes("entity:bob")) {
          // Depth-1 call: return relation from alice to bob.
          return [relRow({ relation_id: "rel:1", source: "entity:alice", target: "entity:bob" })];
        }
        if (frontier.includes("entity:bob")) {
          // Depth-2 call: return relation from bob to carol.
          return [relRow({ relation_id: "rel:2", source: "entity:bob", target: "entity:carol" })];
        }
        return [];
      })
      .on("memory_relation_evidence", (params) => {
        const relationIds = params[1] as string[];
        const rows = [];
        if (relationIds.includes("rel:1")) {
          rows.push(evRow({ evidence_id: "ev:1", relation_id: "rel:1", item_id: "item:from-rel1" }));
        }
        if (relationIds.includes("rel:2")) {
          rows.push(evRow({ evidence_id: "ev:2", relation_id: "rel:2", item_id: "item:from-rel2" }));
        }
        return rows;
      });

    const provider = makeProvider(pool, { maxDepth: 2 });
    const hits = await provider.search(makeInput());

    const itemIds = hits.map((h) => h.itemId);
    expect(itemIds).toContain("item:from-rel1");
    expect(itemIds).toContain("item:from-rel2");
    expect(callCount).toBe(2); // two BFS rounds
  });

  it("does not walk beyond maxDepth", async () => {
    let relCallCount = 0;
    const pool = new MockPool()
      .on("memory_entities", () => [seedRow("entity:alice")])
      .on("memory_relations", () => {
        relCallCount++;
        return [relRow({ relation_id: `rel:${relCallCount}`, source: "entity:alice", target: `entity:hop${relCallCount}` })];
      })
      .on("memory_relation_evidence", () => [
        evRow({ evidence_id: "ev:1", relation_id: "rel:1", item_id: "item:1" })
      ]);

    const provider = makeProvider(pool, { maxDepth: 1 });
    await provider.search(makeInput());
    expect(relCallCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// A1-7  Missing vaultId.
// ---------------------------------------------------------------------------

describe("GraphRetrievalProvider (A1-7) — missing vaultId", () => {
  it("throws when vaultId is absent", async () => {
    const pool = new MockPool();
    const provider = makeProvider(pool);
    await expect(
      provider.search({ query: "test", vaultId: "" })
    ).rejects.toThrow(/vaultId/);
  });

  it("throws when vaultId is missing from the object", async () => {
    const pool = new MockPool();
    const provider = makeProvider(pool);
    await expect(
      // @ts-expect-error deliberate missing field for runtime test
      provider.search({ query: "test" })
    ).rejects.toThrow(/vaultId/);
  });
});

// ---------------------------------------------------------------------------
// SQL invariants — verify exported SQL constants contain vault + status guards.
// ---------------------------------------------------------------------------

describe("GraphRetrievalProvider — SQL invariants", () => {
  it("GRAPH_ENTITY_SEED_SQL is vault-scoped via $1", () => {
    expect(GRAPH_ENTITY_SEED_SQL).toContain("vault_id = $1");
  });

  it("GRAPH_RELATIONS_SQL is vault-scoped and status-filtered", () => {
    expect(GRAPH_RELATIONS_SQL).toContain("r.vault_id = $1");
    expect(GRAPH_RELATIONS_SQL).toContain("r.status = 'active'");
  });

  it("GRAPH_EVIDENCE_SQL is vault-scoped", () => {
    expect(GRAPH_EVIDENCE_SQL).toContain("e.vault_id = $1");
  });

  it("provider name is graph-retrieval-v12", () => {
    const pool = new MockPool();
    const provider = makeProvider(pool);
    expect(provider.name).toBe("graph-retrieval-v12");
  });
});
