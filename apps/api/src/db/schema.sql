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
CREATE INDEX IF NOT EXISTS idx_context_traces_created_at ON context_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
