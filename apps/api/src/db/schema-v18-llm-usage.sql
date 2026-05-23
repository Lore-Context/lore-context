-- v1.8 Lane G - per-vault per-task LLM daily usage rollup.
-- Applied by release operator before production deploy; not auto-applied here.

CREATE TABLE IF NOT EXISTS vault_llm_usage (
  id          BIGSERIAL PRIMARY KEY,
  vault_id    TEXT NOT NULL,
  task_id     TEXT NOT NULL,
  model       TEXT NOT NULL,
  day         DATE NOT NULL DEFAULT CURRENT_DATE,
  prompt_tokens      INTEGER NOT NULL DEFAULT 0,
  completion_tokens  INTEGER NOT NULL DEFAULT 0,
  cost_usd    NUMERIC(10, 6) NOT NULL DEFAULT 0,
  call_count  INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vault_id, task_id, model, day)
);

CREATE INDEX IF NOT EXISTS idx_vault_llm_usage_vault_day
  ON vault_llm_usage (vault_id, day);
