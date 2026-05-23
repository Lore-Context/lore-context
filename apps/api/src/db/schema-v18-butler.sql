-- Schema version: v18-butler
-- Lane: V1.8-M5 (BRA-496)
-- Apply command: pnpm db:apply (operator-run; not automated)
-- Rollback: DROP TABLE IF EXISTS butler_playbooks, butler_decisions, butler_runs CASCADE;
-- Risk: additive-only migration; no existing table modified.
-- Inert when LORE_BUTLER_ENABLED=0 (default). Operators flip the env var
-- to enable Butler phases that read/write these tables.

-- vault_id is TEXT to match vaults(id) TEXT PRIMARY KEY in schema-v12.sql.
-- butler_runs.id stays UUID because butler_decisions.run_id references it
-- and decisions don't need cross-table compatibility with TEXT-id memory tables.
CREATE TABLE IF NOT EXISTS butler_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id      TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  run_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phase         TEXT NOT NULL CHECK (phase IN ('prune','merge','resolve','surface','full')),
  decisions_count INTEGER NOT NULL DEFAULT 0,
  llm_cost_usd  NUMERIC(10,6) NOT NULL DEFAULT 0,
  duration_ms   INTEGER,
  shadow_mode   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_butler_runs_vault_run_at ON butler_runs (vault_id, run_at DESC);

-- target_record_id is TEXT (no cross-table FK) because the target may be
-- a memory_items.id, entity id, or wiki page id depending on action; all
-- those are TEXT PKs. ON DELETE SET NULL semantics are preserved by the
-- application layer when the target record is removed.
CREATE TABLE IF NOT EXISTS butler_decisions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           UUID NOT NULL REFERENCES butler_runs(id) ON DELETE CASCADE,
  action           TEXT NOT NULL CHECK (action IN ('prune','merge','resolve','surface','merge_skipped_too_large','conflict_detector_input_sanitized')),
  target_record_id TEXT,
  llm_explanation  TEXT,
  shadowed         BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_butler_decisions_run_id ON butler_decisions (run_id);
CREATE INDEX IF NOT EXISTS idx_butler_decisions_target ON butler_decisions (target_record_id);

CREATE TABLE IF NOT EXISTS butler_playbooks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id       TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  theme_summary  TEXT NOT NULL,
  source         TEXT NOT NULL DEFAULT 'surface-v18',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_butler_playbooks_vault ON butler_playbooks (vault_id, created_at DESC);
