// v1.4 Lane 0.5 — GraphRetrievalProvider trigram index specification tests.
//
// These tests verify that:
//   1. GRAPH_ENTITY_SEED_SQL uses ILIKE pattern matching (trigram-compatible).
//   2. The schema migration file exists and is idempotent (IF NOT EXISTS guard).
//   3. The migration targets the correct table and index name.
//   4. The migration creates a GIN index using gin_trgm_ops.
//
// No live Postgres required. The PostgreSQL query planner will automatically
// use idx_memory_entities_canonical_trgm for ILIKE '%pattern%' after the
// migration is applied — no SQL changes to graph-retrieval-v12.ts needed.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GRAPH_ENTITY_SEED_SQL } from "../src/graph-retrieval-v12.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve the schema migration file relative to the monorepo root.
const SCHEMA_PATH = resolve(
  __dirname,
  "../../../apps/api/src/db/schema-v14-graph-trigram.sql"
);

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf8");
}

// ---------------------------------------------------------------------------
// GRAPH_ENTITY_SEED_SQL — ILIKE compatibility assertions
// ---------------------------------------------------------------------------

describe("GraphRetrievalProvider — GRAPH_ENTITY_SEED_SQL trigram compatibility", () => {
  it("uses ILIKE for canonical_name lookup (trigram-acceleratable pattern)", () => {
    // PostgreSQL trigram index (gin_trgm_ops) accelerates ILIKE '%pattern%'.
    // The SQL must use ILIKE (not =, LIKE, or full-text) for the planner to
    // pick the GIN trigram index.
    expect(GRAPH_ENTITY_SEED_SQL).toMatch(/canonical_name\s+ILIKE/i);
  });

  it("uses a '%' || $2 || '%' bounded pattern — required for trigram index use", () => {
    // Trigram index is effective for patterns with at least 3 consecutive
    // literal characters. The '%' || $2 || '%' pattern satisfies this for
    // typical entity name queries (>3 chars).
    expect(GRAPH_ENTITY_SEED_SQL).toContain("'%' || $2 || '%'");
  });

  it("is vault-scoped via $1 (security invariant unchanged)", () => {
    expect(GRAPH_ENTITY_SEED_SQL).toContain("vault_id = $1");
  });
});

// ---------------------------------------------------------------------------
// Schema migration file assertions
// ---------------------------------------------------------------------------

describe("schema-v14-graph-trigram.sql — file existence and content", () => {
  it("migration file exists at apps/api/src/db/schema-v14-graph-trigram.sql", () => {
    expect(() => readSchema()).not.toThrow();
  });

  it("enables pg_trgm extension", () => {
    const sql = readSchema();
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  });

  it("creates index with IF NOT EXISTS guard (idempotent)", () => {
    const sql = readSchema();
    expect(sql).toContain("CREATE INDEX CONCURRENTLY IF NOT EXISTS");
    expect(sql).toContain("idx_memory_entities_canonical_trgm");
  });

  it("targets the correct table — memory_entities", () => {
    const sql = readSchema();
    expect(sql).toContain("ON memory_entities");
  });

  it("uses GIN index with gin_trgm_ops operator class", () => {
    const sql = readSchema();
    expect(sql).toContain("USING gin (canonical_name gin_trgm_ops)");
  });

  it("uses CONCURRENTLY to avoid blocking production reads/writes", () => {
    const sql = readSchema();
    expect(sql).toContain("CONCURRENTLY");
  });

  it("does NOT contain BEGIN or COMMIT (CONCURRENTLY incompatible with transactions)", () => {
    const sql = readSchema();
    // Strip SQL comments before checking.
    const stripped = sql.replace(/--[^\n]*/g, "");
    expect(stripped).not.toMatch(/\bBEGIN\b/i);
    expect(stripped).not.toMatch(/\bCOMMIT\b/i);
  });

  it("includes a COMMENT documenting the index purpose", () => {
    const sql = readSchema();
    expect(sql).toContain("COMMENT ON INDEX idx_memory_entities_canonical_trgm");
  });
});
