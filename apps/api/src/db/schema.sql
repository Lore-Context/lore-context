CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  repo_url TEXT,
  default_visibility TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  agent_type TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_records (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  user_id TEXT REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  repo_id TEXT,
  agent_id TEXT REFERENCES agents(id),
  memory_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  content TEXT NOT NULL,
  normalized_subject TEXT,
  normalized_predicate TEXT,
  normalized_object TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  confidence NUMERIC NOT NULL DEFAULT 0.8,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  superseded_by TEXT,
  source_provider TEXT,
  source_original_id TEXT,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_embeddings (
  memory_id TEXT PRIMARY KEY REFERENCES memory_records(id) ON DELETE CASCADE,
  embedding vector(384),
  embedding_model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  user_id TEXT REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  agent_id TEXT REFERENCES agents(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  source_type TEXT NOT NULL,
  source_provider TEXT,
  source_original_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS context_traces (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  user_id TEXT REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  agent_id TEXT REFERENCES agents(id),
  query TEXT NOT NULL,
  route JSONB NOT NULL,
  memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  retrieved_memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  composed_memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ignored_memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  web_source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  repo_source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  latency_ms INTEGER,
  token_budget INTEGER,
  tokens_used INTEGER,
  feedback TEXT,
  feedback_at TIMESTAMPTZ,
  feedback_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  user_id TEXT REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  provider TEXT NOT NULL,
  dataset_name TEXT,
  input JSONB NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  actor_user_id TEXT REFERENCES users(id),
  actor_agent_id TEXT REFERENCES agents(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  before JSONB,
  after JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_records_project_status ON memory_records(project_id, status);
CREATE INDEX IF NOT EXISTS idx_memory_records_project_id ON memory_records(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_records_status ON memory_records(status);
CREATE INDEX IF NOT EXISTS idx_memory_records_created_at ON memory_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_records_content_gin ON memory_records USING GIN (to_tsvector('simple', content));
CREATE INDEX IF NOT EXISTS idx_memory_records_metadata_gin ON memory_records USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_context_traces_created_at ON context_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_traces_project_id ON context_traces(project_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);

CREATE INDEX IF NOT EXISTS idx_event_log_project_id ON event_log(project_id);
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eval_runs_project_id ON eval_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_created_at ON eval_runs(created_at DESC);

-- v0.7 cloud schema scaffolding (additive, idempotent).
-- Cloud tables are not wired into the v0.6 store yet; they exist so that
-- bridge, capture, profile, recall, and dashboard lanes can integrate
-- against a stable schema without blocking on auth/billing implementations.

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_identities (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS vaults (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  raw_archive_enabled BOOLEAN NOT NULL DEFAULT false,
  private_mode BOOLEAN NOT NULL DEFAULT false,
  capture_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  retention JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vault_members (
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vault_id, user_id)
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  label TEXT,
  platform TEXT,
  device_token_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS agent_connections (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vault_id, agent_type, device_id)
);

CREATE TABLE IF NOT EXISTS source_connections (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capture_sources (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  source_provider TEXT,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_heartbeat_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capture_sessions (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES capture_sources(id) ON DELETE SET NULL,
  source_provider TEXT,
  source_original_id TEXT,
  agent_type TEXT,
  capture_mode TEXT NOT NULL DEFAULT 'summary_only',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vault_id, source_provider, source_original_id)
);

CREATE TABLE IF NOT EXISTS capture_events (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES capture_sessions(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES capture_sources(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capture_jobs (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES capture_sessions(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 100,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_items (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  profile_type TEXT NOT NULL,
  item_type TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.6,
  source_memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  valid_until TIMESTAMPTZ,
  visibility TEXT NOT NULL DEFAULT 'private',
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_snapshots (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_meter_events (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  units NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delete_requests (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS exports (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  format TEXT NOT NULL DEFAULT 'mif-json',
  status TEXT NOT NULL DEFAULT 'pending',
  artifact_url TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_vaults_account_id ON vaults(account_id);
CREATE INDEX IF NOT EXISTS idx_vault_members_user_id ON vault_members(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_vault_id ON devices(vault_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_agent_connections_vault_id ON agent_connections(vault_id);
CREATE INDEX IF NOT EXISTS idx_source_connections_vault_id ON source_connections(vault_id);
CREATE INDEX IF NOT EXISTS idx_capture_sources_vault_id ON capture_sources(vault_id);
CREATE INDEX IF NOT EXISTS idx_capture_sources_status ON capture_sources(status);
CREATE INDEX IF NOT EXISTS idx_capture_sessions_vault_id ON capture_sessions(vault_id);
CREATE INDEX IF NOT EXISTS idx_capture_sessions_status ON capture_sessions(status);
CREATE INDEX IF NOT EXISTS idx_capture_jobs_status_priority ON capture_jobs(status, next_run_at, priority);
CREATE INDEX IF NOT EXISTS idx_capture_jobs_vault_id ON capture_jobs(vault_id);
CREATE INDEX IF NOT EXISTS idx_capture_events_session_id ON capture_events(session_id);
CREATE INDEX IF NOT EXISTS idx_profile_items_vault_type_status ON profile_items(vault_id, profile_type, status);
CREATE INDEX IF NOT EXISTS idx_profile_snapshots_vault_id ON profile_snapshots(vault_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_meter_events_vault_id ON usage_meter_events(vault_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_account_id ON subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_delete_requests_vault_id ON delete_requests(vault_id, status);
CREATE INDEX IF NOT EXISTS idx_exports_vault_id ON exports(vault_id, status);

-- v0.8 Personal Cloud Beta — persistence and tenancy hardening (additive,
-- idempotent). These additions replace the v0.7 in-memory cloud platform with
-- restart-safe Postgres storage. Tokens are stored as SHA-256 hashes; the
-- plaintext is returned to the caller exactly once at issuance.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS display_name TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email) WHERE email IS NOT NULL;

ALTER TABLE capture_sessions ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE TABLE IF NOT EXISTS cloud_users (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cloud_users_account ON cloud_users(account_id);

-- Single token table for install/device/service/agent kinds. The plaintext
-- token value never lives in this row: only its SHA-256 hash is stored.
CREATE TABLE IF NOT EXISTS cloud_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
  agent_id TEXT,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  single_use BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  rotated_from TEXT REFERENCES cloud_tokens(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cloud_tokens_vault_kind ON cloud_tokens(vault_id, kind);
CREATE INDEX IF NOT EXISTS idx_cloud_tokens_device_kind ON cloud_tokens(device_id, kind) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cloud_tokens_active ON cloud_tokens(kind, expires_at) WHERE revoked_at IS NULL;

-- v0.9 Auto-Capture Beta connector framework. These tables are additive and
-- provider-neutral: connector workers own OAuth state, checkpoints, sync jobs,
-- document summaries, webhook receipts, and error history without broadening
-- the v0.8 capture session contract.

CREATE TABLE IF NOT EXISTS connector_connections (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_connector_connections_vault_provider ON connector_connections(vault_id, provider, status);

CREATE TABLE IF NOT EXISTS connector_oauth_tokens (
  connection_id TEXT PRIMARY KEY REFERENCES connector_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connector_sync_jobs (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES connector_connections(id) ON DELETE CASCADE,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  documents_seen INTEGER NOT NULL DEFAULT 0,
  documents_upserted INTEGER NOT NULL DEFAULT 0,
  checkpoint_cursor TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_connector_sync_jobs_connection ON connector_sync_jobs(connection_id, created_at DESC);

CREATE TABLE IF NOT EXISTS connector_sync_checkpoints (
  connection_id TEXT PRIMARY KEY REFERENCES connector_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  cursor TEXT NOT NULL,
  document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connector_documents (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES connector_connections(id) ON DELETE CASCADE,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  url TEXT,
  parent_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  modified_at TIMESTAMPTZ NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_connector_documents_vault_provider ON connector_documents(vault_id, provider, modified_at DESC);

CREATE TABLE IF NOT EXISTS connector_webhook_events (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES connector_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  valid BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT NOT NULL,
  resource_id TEXT,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_connector_webhook_events_connection ON connector_webhook_events(connection_id, received_at DESC);

CREATE TABLE IF NOT EXISTS connector_errors (
  id TEXT PRIMARY KEY,
  connection_id TEXT REFERENCES connector_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_connector_errors_connection ON connector_errors(connection_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  actor_id TEXT,
  actor_kind TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_vault_id ON audit_events(vault_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);

CREATE INDEX IF NOT EXISTS idx_capture_sessions_content_hash ON capture_sessions(vault_id, content_hash) WHERE content_hash IS NOT NULL;

-- v0.9 Auto-Capture Beta — source registry, capture event/batch model,
-- usage/cost taxonomy, hosted MCP client registry. All additive and
-- idempotent. v0.8 rows survive untouched. The `capture_sources` table is
-- extended with display_name, permissions, raw_archive_policy, paused_at,
-- and revoked_at to support per-source authorization, pause enforcement at
-- ingestion, and raw-archive policy gating.

ALTER TABLE capture_sources ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE capture_sources ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE capture_sources ADD COLUMN IF NOT EXISTS raw_archive_policy TEXT NOT NULL DEFAULT 'summary_only';
ALTER TABLE capture_sources ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE capture_sources ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Per-source permission envelope. Multiple permission rows can apply to a
-- single source (host pattern, agent_id, tool, scope). Ingestion validates
-- the envelope before persisting events.
CREATE TABLE IF NOT EXISTS source_permissions (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES capture_sources(id) ON DELETE CASCADE,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  scope TEXT,
  value TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_source_permissions_source ON source_permissions(source_id);
CREATE INDEX IF NOT EXISTS idx_source_permissions_active ON source_permissions(source_id, permission_type) WHERE revoked_at IS NULL;

-- Per-source watcher checkpoints. The local bridge writes the offset/hash it
-- last uploaded so duplicate scanner runs do not re-ingest. Vault-scoped so
-- cross-vault checkpoint poisoning is impossible.
CREATE TABLE IF NOT EXISTS source_checkpoints (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES capture_sources(id) ON DELETE CASCADE,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  checkpoint_key TEXT NOT NULL,
  offset_value TEXT,
  content_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, checkpoint_key)
);
CREATE INDEX IF NOT EXISTS idx_source_checkpoints_vault ON source_checkpoints(vault_id);

-- Capture batches group capture_events that arrived together. Used by the
-- watcher to track upload acknowledgment and by the operator console to
-- spot abnormal batch sizes.
CREATE TABLE IF NOT EXISTS capture_batches (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES capture_sources(id) ON DELETE SET NULL,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  batch_kind TEXT NOT NULL DEFAULT 'capture_event',
  event_count INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received',
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vault_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_capture_batches_vault_received ON capture_batches(vault_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_capture_batches_source ON capture_batches(source_id);

-- Strengthen capture_events with per-event idempotency, redaction state, and
-- batch back-reference. v0.8 rows pre-date these columns; defaults keep the
-- migration safe.
ALTER TABLE capture_events ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES capture_batches(id) ON DELETE SET NULL;
ALTER TABLE capture_events ADD COLUMN IF NOT EXISTS external_event_id TEXT;
ALTER TABLE capture_events ADD COLUMN IF NOT EXISTS actor TEXT;
ALTER TABLE capture_events ADD COLUMN IF NOT EXISTS content_ref JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE capture_events ADD COLUMN IF NOT EXISTS redaction_state TEXT NOT NULL DEFAULT 'redacted';
ALTER TABLE capture_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_capture_events_idempotency
  ON capture_events(vault_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capture_events_vault_occurred ON capture_events(vault_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_capture_events_session_occurred ON capture_events(session_id, occurred_at);

-- Periodic snapshot of plan limits + observed usage. Used by /v1/usage and
-- /v1/operator/usage to render plan-cap state without recomputing every
-- read. Snapshots are append-only; the most recent row per vault is current.
CREATE TABLE IF NOT EXISTS usage_limit_snapshots (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  ingest_token_used NUMERIC NOT NULL DEFAULT 0,
  ingest_token_limit NUMERIC NOT NULL DEFAULT 0,
  recall_used NUMERIC NOT NULL DEFAULT 0,
  recall_limit NUMERIC NOT NULL DEFAULT 0,
  agent_count INTEGER NOT NULL DEFAULT 0,
  agent_limit INTEGER NOT NULL DEFAULT 0,
  raw_archive_enabled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_limit_snapshots_vault_observed
  ON usage_limit_snapshots(vault_id, observed_at DESC);

-- Hosted MCP client registry. Lane C (hosted MCP) wires this up; we provide
-- the schema so other lanes can refer to a stable shape.
CREATE TABLE IF NOT EXISTS hosted_mcp_clients (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  display_name TEXT,
  client_kind TEXT NOT NULL DEFAULT 'mcp',
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_hosted_mcp_clients_vault ON hosted_mcp_clients(vault_id);
CREATE INDEX IF NOT EXISTS idx_hosted_mcp_clients_active ON hosted_mcp_clients(vault_id, status) WHERE revoked_at IS NULL;

-- v1.0 Personal Cloud GA — Memory Inbox and Recall Evidence.
-- These additions support the transition from passive capture to user-approved
-- memory and source-aware recall.

CREATE TABLE IF NOT EXISTS memory_candidates (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES capture_sources(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES capture_sessions(id) ON DELETE SET NULL,
  external_event_id TEXT,
  content TEXT NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'project_fact',
  status TEXT NOT NULL DEFAULT 'pending',
  risk_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memory_candidates_vault_status ON memory_candidates(vault_id, status);

CREATE TABLE IF NOT EXISTS memory_review_actions (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  candidate_id TEXT REFERENCES memory_candidates(id) ON DELETE SET NULL,
  memory_id TEXT REFERENCES memory_records(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_kind TEXT NOT NULL DEFAULT 'user',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recall_traces (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  route_reason TEXT,
  latency_ms INTEGER,
  token_budget INTEGER,
  tokens_used INTEGER,
  feedback TEXT,
  feedback_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recall_traces_vault ON recall_traces(vault_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recall_trace_items (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL REFERENCES recall_traces(id) ON DELETE CASCADE,
  memory_id TEXT,
  candidate_id TEXT,
  disposition TEXT NOT NULL,
  confidence NUMERIC,
  risk_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_recall_trace_items_trace ON recall_trace_items(trace_id);
