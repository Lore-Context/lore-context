-- v1.4 Lane 0.5 — graph stream entity seed acceleration
--
-- Adds a trigram GIN index on memory_entities.canonical_name to speed up
-- the ILIKE '%pattern%' lookup in GraphRetrievalProvider (GRAPH_ENTITY_SEED_SQL).
-- PostgreSQL query planner will automatically prefer this index over a seq scan
-- for trigram-compatible LIKE/ILIKE patterns without any SQL changes.
--
-- Requires: pg_trgm extension (standard in RDS PostgreSQL 13+, Aurora PostgreSQL 13+).
--
-- Safety: CREATE INDEX CONCURRENTLY does not take an Access Exclusive lock and
-- will not block reads or writes. It cannot run inside an explicit transaction.
-- The IF NOT EXISTS guard makes this script idempotent.
--
-- Expected effect (staging baseline 2026-05-05):
--   graph stream entity seed p95: ~306ms → ~240ms
--   (ILIKE seq scan on canonical_name eliminated for selectivity > 1%)
--
-- Run via psql, not inside BEGIN/COMMIT:
--   psql $DATABASE_URL -f schema-v14-graph-trigram.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_memory_entities_canonical_trgm
  ON memory_entities USING gin (canonical_name gin_trgm_ops);

-- Optional: alias JSONB trigram index. Deferred — alias lookups are less
-- frequent and storage cost needs evaluation against per-vault cardinality.
-- Uncomment when storage budget allows:
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS
--   idx_memory_entities_aliases_trgm
--   ON memory_entities USING gin (aliases jsonb_path_ops);

COMMENT ON INDEX idx_memory_entities_canonical_trgm IS
  'v1.4 Lane 0.5: accelerates GraphRetrievalProvider GRAPH_ENTITY_SEED_SQL ILIKE %pattern% entity seed lookup. Eliminates seq scan on canonical_name for >1% selectivity patterns.';
