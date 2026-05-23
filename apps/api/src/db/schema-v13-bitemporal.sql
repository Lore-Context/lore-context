-- Lore Context v1.3 → v1.4 bi-temporal schema patch.
--
-- Purpose: add system-recorded timestamps (t_created / t_expired) to
-- memory_items and memory_relations, and enforce vault-scoped entity
-- canonicalization on memory_entities.
--
-- Design rationale (Zep paper arxiv 2501.13956 §3, Lane D §2):
--   - Business-validity dimensions (valid_from / valid_until / invalidated_by)
--     already exist from v1.2. They answer "when was this fact true in the
--     domain?" and are set by the application.
--   - System-recorded dimensions (t_created / t_expired) are NEW. They answer
--     "when did Lore first learn / stop believing this fact?" and are set only
--     by the database / ingestion layer — never mutated afterward.
--   - Keeping the two dimensions separate means a query can ask:
--       "What did Lore know on 2026-03-01 (systemTime) about events that were
--        valid in March 2026 (validTime)?" — time-travel at both axes.
--
-- All statements are idempotent via IF NOT EXISTS / IF EXISTS guards.
-- No destructive changes (no DROP, no ALTER COLUMN … TYPE, no TRUNCATE).
-- Apply after schema.sql and schema-v12.sql: pnpm db:schema.
--
-- PostgreSQL 16+ required for metadata-only ADD COLUMN on non-nullable cols
-- with a volatile default expression (t_created DEFAULT now()).

-- ============================================================================
-- SECTION 1 — memory_items: add t_created and t_expired
-- ============================================================================

-- Step 1a: add t_created as a nullable column so the UPDATE backfill below
-- can safely run on tables with millions of existing rows without requiring a
-- full rewrite in the same transaction.
ALTER TABLE memory_items
  ADD COLUMN IF NOT EXISTS t_created TIMESTAMPTZ;

-- Step 1b: backfill existing rows — set t_created = created_at wherever the
-- column is still NULL. This is a no-op on a fresh database (no rows exist yet)
-- and an O(rows) update on an upgrade path. Runs only against the rows that
-- need it, so repeated application is safe.
UPDATE memory_items
  SET t_created = created_at
  WHERE t_created IS NULL;

-- Step 1c: once backfill is done, enforce NOT NULL and set the server-side
-- default so new rows get t_created = now() automatically. The column is
-- intentionally not updated after insert — it records the system-knowledge
-- creation moment and must be immutable.
ALTER TABLE memory_items
  ALTER COLUMN t_created SET NOT NULL,
  ALTER COLUMN t_created SET DEFAULT now();

-- Step 1d: add t_expired as a nullable column. NULL means the system currently
-- believes the fact is still valid at the system level. A non-NULL value means
-- the system first discovered this fact had expired at that instant (set during
-- supersede / invalidate / lifecycle propagation runs). This is separate from
-- valid_until (which is a business-domain claim) — a fact can have
-- valid_until='2026-01-01' but t_expired=NULL if the system has not yet run
-- the lifecycle propagation pass.
ALTER TABLE memory_items
  ADD COLUMN IF NOT EXISTS t_expired TIMESTAMPTZ;

-- ============================================================================
-- SECTION 2 — memory_relations: add t_created and t_expired (same semantics)
-- ============================================================================

ALTER TABLE memory_relations
  ADD COLUMN IF NOT EXISTS t_created TIMESTAMPTZ;

UPDATE memory_relations
  SET t_created = created_at
  WHERE t_created IS NULL;

ALTER TABLE memory_relations
  ALTER COLUMN t_created SET NOT NULL,
  ALTER COLUMN t_created SET DEFAULT now();

ALTER TABLE memory_relations
  ADD COLUMN IF NOT EXISTS t_expired TIMESTAMPTZ;

-- ============================================================================
-- SECTION 3 — indexes for bi-temporal query patterns
-- ============================================================================

-- idx_memory_items_t_created: supports "show me everything the system knew
-- by time T" — i.e. t_created <= T. A full index (non-partial) is warranted
-- because every row has a t_created value and time-travel queries need to
-- scan arbitrary historical ranges.
CREATE INDEX IF NOT EXISTS idx_memory_items_t_created
  ON memory_items (t_created);

-- idx_memory_items_t_expired: supports "show me facts the system still
-- considers current at time T" — i.e. t_expired IS NULL OR t_expired > T.
-- Partial index on non-NULL values only: the vast majority of rows are
-- expected to have t_expired = NULL (still-believed facts); a partial index
-- keeps the index small and insertion cheap for the common hot path.
CREATE INDEX IF NOT EXISTS idx_memory_items_t_expired
  ON memory_items (t_expired)
  WHERE t_expired IS NOT NULL;

-- idx_memory_relations_t_created: same rationale as memory_items.
CREATE INDEX IF NOT EXISTS idx_memory_relations_t_created
  ON memory_relations (t_created);

-- idx_memory_relations_t_expired: same rationale as memory_items.
CREATE INDEX IF NOT EXISTS idx_memory_relations_t_expired
  ON memory_relations (t_expired)
  WHERE t_expired IS NOT NULL;

-- ============================================================================
-- SECTION 4 — vault-scoped entity canonicalization (plan §6A.4)
-- ============================================================================

-- Problem: the existing memory_entities table has no unique constraint on
-- (vault_id, normalized_name), only a lookup index. This means two different
-- vaults can share entity rows with the same normalized_name, and the graph
-- extractor can accidentally create cross-vault entity collisions.
--
-- Solution: create a UNIQUE index on (vault_id, normalized_name). Combined
-- with vault_id scoping on all graph queries this is the strongest isolation
-- guarantee short of row-level security.
--
-- Why CONCURRENTLY: production tables may have existing duplicate rows (from
-- before this migration). CONCURRENTLY allows the build to proceed without
-- locking the table for writes, and the IF NOT EXISTS guard makes it safe to
-- run on a fresh schema (the index simply does not exist yet so the build
-- completes immediately). If duplicates exist, the build will fail with a
-- unique-violation — resolve by deduplicating rows before applying this patch.
--
-- Note: memory_entities does not yet have a `normalized_name` column per
-- schema-v12.sql (it has `canonical_name`). The plan §6A.4 uses
-- `normalized_name` as the target. If your schema uses `canonical_name`,
-- swap the column name below. This patch uses `canonical_name` to match
-- the actual v1.2 schema.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_entities_vault_name
  ON memory_entities (vault_id, canonical_name);
