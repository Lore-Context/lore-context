-- Lore v2.0.4 — Code Knowledge Graph (Lane R)
-- Author: Claude Opus 4.7 — 2026-05-13 (ralph implementation of docs/plans/v2.0.4-plan.md)
--
-- Apply order: AFTER schema-v21-canonical-index.sql (v2.0.2 Lane I). If v21 is
-- missing at apply time, prod.mjs apply chain will fail at v22; this is intentional
-- (external-dep §1 row 1 in plan; do NOT renumber until v21 actually ships).
--
-- Privacy invariant: every column in this schema stores STRUCTURAL metadata only
-- (names, signatures, doc comments, file paths, hashes). Function bodies, string
-- literals, and variable initializers MUST NEVER be written here. The client-side
-- privacy filter (packages/code-indexer/src/privacy-filter.ts) + server-side
-- per-field validators (apps/api/src/code-graph/validators.ts) are the two
-- enforcement layers; this schema is the *storage* layer and trusts both.
--
-- See: docs/plans/v2.0.4-plan.md §2 Lane R + Lane P
-- See: docs/privacy/code-graph-privacy-model.md

-- pg_trgm enables idx_code_symbols_repo_qname_trgm. If not creatable on RDS,
-- drop the trigram index — btree exact + prefix on qualified_name is the
-- fallback per plan §3 pre-mortem row 3.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- code_repos — logical "repo" alias within a vault. One vault may hold many.
-- =============================================================================
CREATE TABLE IF NOT EXISTS code_repos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id        TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  primary_lang    TEXT,                            -- Inferred from file count; nullable until first index
  total_files     INT  NOT NULL DEFAULT 0,
  total_symbols   INT  NOT NULL DEFAULT 0,
  total_relations INT  NOT NULL DEFAULT 0,
  last_indexed_at TIMESTAMPTZ,
  e2e_encrypted   BOOL NOT NULL DEFAULT FALSE,     -- Lane P Tier-2 opt-in
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vault_id, name)
);

CREATE INDEX IF NOT EXISTS idx_code_repos_vault ON code_repos (vault_id);

-- =============================================================================
-- code_files — one row per source file. content_hash is the wire hash of the
-- file body (XXH3 hex), NEVER the body itself.
-- =============================================================================
CREATE TABLE IF NOT EXISTS code_files (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id          UUID NOT NULL REFERENCES code_repos(id) ON DELETE CASCADE,
  relative_path    TEXT NOT NULL,
  language         TEXT NOT NULL,
  content_hash     TEXT NOT NULL,
  ast_hash         TEXT NOT NULL,
  last_modified_at TIMESTAMPTZ NOT NULL,
  UNIQUE (repo_id, relative_path)
);

CREATE INDEX IF NOT EXISTS idx_code_files_repo ON code_files (repo_id);

-- =============================================================================
-- code_symbols — one row per symbol (function / class / method / interface / …).
--
-- UNIQUE (repo_id, file_id, qualified_name, start_line) supports overloads
-- (C++ method overloads, Python conditional defs, TS declaration merging):
-- same qname is allowed at different start_lines. This makes idempotent upsert
-- structurally enforceable via ON CONFLICT.
-- =============================================================================
CREATE TABLE IF NOT EXISTS code_symbols (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id        UUID NOT NULL REFERENCES code_repos(id) ON DELETE CASCADE,
  file_id        UUID NOT NULL REFERENCES code_files(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN (
                   'function','method','class','interface','type',
                   'enum','const','module','variable'
                 )),
  name           TEXT NOT NULL,
  qualified_name TEXT NOT NULL,
  signature      TEXT,                            -- Validated server-side: no body fragments
  doc_comment    TEXT,                            -- Validated server-side: no secret-pattern regex matches
  start_line     INT NOT NULL,
  end_line       INT NOT NULL,
  start_col      INT,
  end_col        INT,
  is_exported    BOOL NOT NULL DEFAULT FALSE,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding      vector(1024),                    -- Qwen3-Embedding-0.6B; nullable until worker fills it
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repo_id, file_id, qualified_name, start_line)
);

CREATE INDEX IF NOT EXISTS idx_code_symbols_repo_name
  ON code_symbols (repo_id, name);

-- Trigram index supports fuzzy qualified-name search (code.search_text).
CREATE INDEX IF NOT EXISTS idx_code_symbols_repo_qname_trgm
  ON code_symbols USING gin (qualified_name gin_trgm_ops);

-- HNSW on embedding for code.search dense-vector path. If HNSW not creatable
-- on RDS, swap to IVFFlat per plan §3 pre-mortem row 3.
CREATE INDEX IF NOT EXISTS idx_code_symbols_embedding_hnsw
  ON code_symbols USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_code_symbols_repo_kind
  ON code_symbols (repo_id, kind);

-- =============================================================================
-- code_relations — one row per A→B edge.
--
-- dst_symbol_id is nullable: at upsert time, a relation may target a symbol
-- whose file hasn't been uploaded yet (cross-file/cross-language reference).
-- The unresolved qualified name is stored in dst_qname_unresolved and a
-- second-pass resolver backfills dst_symbol_id once the target is upserted.
-- =============================================================================
CREATE TABLE IF NOT EXISTS code_relations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id               UUID NOT NULL REFERENCES code_repos(id) ON DELETE CASCADE,
  src_symbol_id         UUID NOT NULL REFERENCES code_symbols(id) ON DELETE CASCADE,
  dst_symbol_id         UUID REFERENCES code_symbols(id) ON DELETE CASCADE,
  dst_qname_unresolved  TEXT,                      -- Populated when dst_symbol_id IS NULL
  relation_kind         TEXT NOT NULL CHECK (relation_kind IN (
                          'calls','imports','extends','implements',
                          'references','instantiates','overrides'
                        )),
  src_file_id           UUID,
  dst_file_id           UUID,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Either resolved OR pending — not both, not neither.
  CHECK (
    (dst_symbol_id IS NOT NULL AND dst_qname_unresolved IS NULL) OR
    (dst_symbol_id IS NULL     AND dst_qname_unresolved IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_code_relations_src
  ON code_relations (src_symbol_id);

-- Partial index — dst lookups skip the pending rows.
CREATE INDEX IF NOT EXISTS idx_code_relations_dst
  ON code_relations (dst_symbol_id) WHERE dst_symbol_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_code_relations_repo_kind
  ON code_relations (repo_id, relation_kind);

-- Index supporting the second-pass resolver: find all pending edges in a repo
-- whose unresolved qname matches a newly-upserted symbol.
CREATE INDEX IF NOT EXISTS idx_code_relations_pending_qname
  ON code_relations (repo_id, dst_qname_unresolved)
  WHERE dst_qname_unresolved IS NOT NULL;
