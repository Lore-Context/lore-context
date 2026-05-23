-- Lore v2.1 — Repo graph compatibility schema.
--
-- v2.0.4 introduced the physical code graph tables as code_repos,
-- code_files, code_symbols, and code_relations. v2.1 standardizes the
-- agent/API contract as repo graph. To avoid duplicate storage and divergent
-- indexes, the repo_* read model below is a compatibility layer over the
-- existing code_* graph plus two native repo graph lifecycle tables.

CREATE TABLE IF NOT EXISTS repo_index_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id        TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  repo_id         UUID REFERENCES code_repos(id) ON DELETE CASCADE,
  repo_name       TEXT NOT NULL,
  root_path       TEXT,
  commit_sha      TEXT,
  status          TEXT NOT NULL CHECK (status IN ('running','succeeded','failed','cancelled')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  file_count      INT NOT NULL DEFAULT 0,
  symbol_count    INT NOT NULL DEFAULT 0,
  relation_count  INT NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_repo_index_runs_latest
  ON repo_index_runs (vault_id, repo_name, started_at DESC);

CREATE TABLE IF NOT EXISTS repo_processes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id           TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  repo_id            UUID REFERENCES code_repos(id) ON DELETE CASCADE,
  index_run_id       UUID REFERENCES repo_index_runs(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  process_type       TEXT NOT NULL CHECK (process_type IN ('route_flow','cli_flow','test_flow','worker_flow','module_flow')),
  entry_symbol_id    UUID REFERENCES code_symbols(id) ON DELETE SET NULL,
  terminal_symbol_id UUID REFERENCES code_symbols(id) ON DELETE SET NULL,
  step_count         INT NOT NULL DEFAULT 0,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repo_processes_repo_type
  ON repo_processes (repo_id, process_type);

CREATE OR REPLACE VIEW repo_files AS
SELECT
  cf.id,
  cr.vault_id,
  cr.id AS repo_id,
  cr.name AS repo_name,
  cf.relative_path AS path,
  cf.language,
  cf.content_hash,
  NULL::bigint AS size_bytes,
  (cf.relative_path ~ '(^|/)(__tests__|tests?|spec)(/|$)|[.-](test|spec)\.[cm]?[tj]sx?$') AS is_test,
  jsonb_build_object('ast_hash', cf.ast_hash, 'last_modified_at', cf.last_modified_at) AS metadata
FROM code_files cf
JOIN code_repos cr ON cr.id = cf.repo_id;

CREATE OR REPLACE VIEW repo_symbols AS
SELECT
  cs.id,
  cr.vault_id,
  cr.id AS repo_id,
  cr.name AS repo_name,
  cs.file_id,
  cs.name,
  cs.qualified_name AS qname,
  cs.kind,
  cs.start_line,
  cs.end_line,
  cs.signature,
  cs.is_exported AS exported,
  cs.metadata
FROM code_symbols cs
JOIN code_repos cr ON cr.id = cs.repo_id;

CREATE OR REPLACE VIEW repo_relations AS
SELECT
  rel.id,
  cr.vault_id,
  cr.id AS repo_id,
  cr.name AS repo_name,
  rel.src_symbol_id AS source_symbol_id,
  rel.dst_symbol_id AS target_symbol_id,
  rel.src_file_id AS source_file_id,
  rel.dst_file_id AS target_file_id,
  rel.relation_kind AS relation_type,
  1.0::double precision AS confidence,
  rel.metadata
FROM code_relations rel
JOIN code_repos cr ON cr.id = rel.repo_id;
