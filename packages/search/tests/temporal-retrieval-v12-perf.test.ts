// v1.4 Lane 0.5 — TemporalRetrievalProvider SQL call-count verification.
//
// Validates that the merged Steps 2+3 CTE eliminates the N+1 round-trip:
//   Old: 1 (seed) + N (per-entity relation-types) + 2N (winning + evidence) = 1+3N
//   New: 1 (seed) + 1 (winning CTE batch) + 1 (evidence batch) = 3 round-trips max
//
// Uses a MockPool that counts every query() call.

import { describe, expect, it } from "vitest";
import {
  TemporalRetrievalProvider,
  SQL_SEED_ENTITIES,
  SQL_WINNING_RELATIONS_BATCH,
  SQL_TOP_EVIDENCE_BATCH
} from "../src/temporal-retrieval-v12.js";
import type { PoolLikeV12, PoolQueryResultV12 } from "../src/index.js";

// ---------------------------------------------------------------------------
// CountingPool — records every query call for assertion.
// ---------------------------------------------------------------------------

class CountingPool implements PoolLikeV12 {
  calls: Array<{ text: string; params: ReadonlyArray<unknown> }> = [];

  private seedRows: Array<{ id: string }>;
  private winningRows: unknown[];
  private evidenceRows: unknown[];

  constructor(opts: {
    seedRows?: Array<{ id: string }>;
    winningRows?: unknown[];
    evidenceRows?: unknown[];
  } = {}) {
    this.seedRows = opts.seedRows ?? [];
    this.winningRows = opts.winningRows ?? [];
    this.evidenceRows = opts.evidenceRows ?? [];
  }

  async query<T = unknown>(
    text: string,
    params: ReadonlyArray<unknown> = []
  ): Promise<PoolQueryResultV12<T>> {
    this.calls.push({ text, params });

    if (text.includes("FROM memory_entities") && text.includes("ILIKE")) {
      return { rows: this.seedRows as T[] };
    }
    if (text.includes("ROW_NUMBER()") || text.includes("WITH ranked AS")) {
      return { rows: this.winningRows as T[] };
    }
    if (text.includes("FROM memory_relation_evidence") && text.includes("DISTINCT ON")) {
      return { rows: this.evidenceRows as T[] };
    }
    return { rows: [] };
  }
}

// ---------------------------------------------------------------------------
// Helper — build N seed entity rows + winning rows + evidence rows.
// ---------------------------------------------------------------------------

function buildFixture(n: number) {
  const seedRows = Array.from({ length: n }, (_, i) => ({ id: `entity:${i}` }));
  const winningRows = Array.from({ length: n }, (_, i) => ({
    id: `rel:${i}`,
    source_entity_id: `entity:${i}`,
    confidence: 0.8,
    valid_from: "2025-01-01T00:00:00Z",
    valid_until: null,
    status: "active",
    invalidated_by: null
  }));
  const evidenceRows = Array.from({ length: n }, (_, i) => ({
    relation_id: `rel:${i}`,
    item_id: `item:${i}`,
    confidence: 0.75
  }));
  return { seedRows, winningRows, evidenceRows };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TemporalRetrievalProvider — SQL call count (N+1 elimination)", () => {
  it("makes exactly 3 DB round-trips for 10 seed entities (was 1+3N=31)", async () => {
    const { seedRows, winningRows, evidenceRows } = buildFixture(10);
    const pool = new CountingPool({ seedRows, winningRows, evidenceRows });
    const provider = new TemporalRetrievalProvider({ pool });

    await provider.search({ query: "alice", vaultId: "vault-A" });

    // Must be exactly 3: seed + winning-CTE batch + evidence batch.
    expect(pool.calls).toHaveLength(3);
  });

  it("makes exactly 3 DB round-trips for 20 seed entities (was 1+3N=61)", async () => {
    const { seedRows, winningRows, evidenceRows } = buildFixture(20);
    const pool = new CountingPool({ seedRows, winningRows, evidenceRows });
    const provider = new TemporalRetrievalProvider({ pool });

    await provider.search({ query: "entity", vaultId: "vault-perf" });

    expect(pool.calls).toHaveLength(3);
  });

  it("makes exactly 1 DB round-trip when seed returns 0 entities", async () => {
    const pool = new CountingPool({ seedRows: [] });
    const provider = new TemporalRetrievalProvider({ pool });

    await provider.search({ query: "unknown", vaultId: "vault-A" });

    // Only the seed query fires; winning + evidence are skipped.
    expect(pool.calls).toHaveLength(1);
  });

  it("makes exactly 2 DB round-trips when winning batch returns 0 rows", async () => {
    const pool = new CountingPool({
      seedRows: [{ id: "entity:0" }],
      winningRows: [],
      evidenceRows: []
    });
    const provider = new TemporalRetrievalProvider({ pool });

    await provider.search({ query: "alice", vaultId: "vault-A" });

    // Seed fires, winning-CTE fires (returns empty), evidence skipped.
    expect(pool.calls).toHaveLength(2);
  });

  it("call 1 uses SQL_SEED_ENTITIES (ILIKE entity lookup)", async () => {
    const { seedRows, winningRows, evidenceRows } = buildFixture(5);
    const pool = new CountingPool({ seedRows, winningRows, evidenceRows });
    const provider = new TemporalRetrievalProvider({ pool });

    await provider.search({ query: "alice", vaultId: "vault-A" });

    expect(pool.calls[0].text).toBe(SQL_SEED_ENTITIES);
  });

  it("call 2 uses SQL_WINNING_RELATIONS_BATCH (ROW_NUMBER CTE)", async () => {
    const { seedRows, winningRows, evidenceRows } = buildFixture(5);
    const pool = new CountingPool({ seedRows, winningRows, evidenceRows });
    const provider = new TemporalRetrievalProvider({ pool });

    await provider.search({ query: "alice", vaultId: "vault-A" });

    expect(pool.calls[1].text).toBe(SQL_WINNING_RELATIONS_BATCH);
  });

  it("call 3 uses SQL_TOP_EVIDENCE_BATCH (DISTINCT ON evidence)", async () => {
    const { seedRows, winningRows, evidenceRows } = buildFixture(5);
    const pool = new CountingPool({ seedRows, winningRows, evidenceRows });
    const provider = new TemporalRetrievalProvider({ pool });

    await provider.search({ query: "alice", vaultId: "vault-A" });

    expect(pool.calls[2].text).toBe(SQL_TOP_EVIDENCE_BATCH);
  });

  it("winning-CTE call receives all seed IDs as array param", async () => {
    const n = 5;
    const { seedRows, winningRows, evidenceRows } = buildFixture(n);
    const pool = new CountingPool({ seedRows, winningRows, evidenceRows });
    const provider = new TemporalRetrievalProvider({ pool });

    await provider.search({ query: "alice", vaultId: "vault-A" });

    const winningCall = pool.calls[1];
    // $2 should be the full array of seed IDs — no per-entity fan-out.
    const seedIdsSent = winningCall.params[1] as string[];
    expect(Array.isArray(seedIdsSent)).toBe(true);
    expect(seedIdsSent).toHaveLength(n);
    expect(seedIdsSent).toContain("entity:0");
    expect(seedIdsSent).toContain("entity:4");
  });

  it("SQL_WINNING_RELATIONS_BATCH contains ROW_NUMBER window function", () => {
    expect(SQL_WINNING_RELATIONS_BATCH).toContain("ROW_NUMBER()");
    expect(SQL_WINNING_RELATIONS_BATCH).toContain("PARTITION BY source_entity_id, relation_type");
    expect(SQL_WINNING_RELATIONS_BATCH).toContain("ORDER BY valid_from DESC NULLS LAST");
  });

  it("SQL_WINNING_RELATIONS_BATCH uses ANY($2::text[]) — batch not per-entity", () => {
    expect(SQL_WINNING_RELATIONS_BATCH).toContain("ANY($2::text[])");
  });

  it("SQL_TOP_EVIDENCE_BATCH uses DISTINCT ON and ANY — batch not per-relation", () => {
    expect(SQL_TOP_EVIDENCE_BATCH).toContain("DISTINCT ON (relation_id)");
    expect(SQL_TOP_EVIDENCE_BATCH).toContain("ANY($2::text[])");
  });
});
