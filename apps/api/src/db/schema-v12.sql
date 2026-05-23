-- Lore Context v1.2 — Graph-Augmented Hybrid Memory Engine schema.
--
-- This file is the v1.2 reset of the memory data model. v1.1 tables in
-- `schema.sql` (memory_records, memory_embeddings, recall_traces, …) remain
-- intact so that the v1.1 critical path keeps working while Lane A wires up the
-- new episode -> item -> chunk -> embedding -> graph evidence shape.
--
-- All statements are idempotent (CREATE … IF NOT EXISTS, ADD COLUMN IF NOT
-- EXISTS). v1.2 callers should apply both `schema.sql` and `schema-v12.sql`
-- (in that order) via `pnpm db:schema`.

-- pgvector is required for the 1024-dim Qwen3 embeddings used by v1.2.
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- 6.1 Episode → item → chunk → embedding ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS memory_episodes (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  account_id TEXT,
  project_id TEXT,
  source_provider TEXT NOT NULL,
  source_id TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redacted_text TEXT NOT NULL,
  raw_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  privacy_mode TEXT NOT NULL DEFAULT 'standard',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS memory_items (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  episode_id TEXT REFERENCES memory_episodes(id) ON DELETE SET NULL,
  project_id TEXT,
  memory_type TEXT NOT NULL,
  subject TEXT,
  predicate TEXT,
  object TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  confidence NUMERIC NOT NULL DEFAULT 0.75,
  importance NUMERIC NOT NULL DEFAULT 0.5,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  superseded_by TEXT,
  risk_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS memory_chunks (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  token_count INTEGER,
  ordinal INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 1024-dim Qwen3 embeddings (vs the legacy 384-dim memory_embeddings table).
-- The chunk_id PK enforces 1:1 with memory_chunks; backfill rewrites are safe.
CREATE TABLE IF NOT EXISTS memory_embeddings_v12 (
  chunk_id TEXT PRIMARY KEY REFERENCES memory_chunks(id) ON DELETE CASCADE,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding_version TEXT NOT NULL DEFAULT 'v12-qwen3-1024',
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6.1 Graph: entities, mentions, relations, evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS memory_entities (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0.75,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS memory_entity_mentions (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES memory_entities(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
  episode_id TEXT REFERENCES memory_episodes(id) ON DELETE SET NULL,
  mention_text TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_relations (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  source_entity_id TEXT NOT NULL REFERENCES memory_entities(id) ON DELETE CASCADE,
  target_entity_id TEXT NOT NULL REFERENCES memory_entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  fact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  confidence NUMERIC NOT NULL DEFAULT 0.75,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  invalidated_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_relation_evidence (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  relation_id TEXT NOT NULL REFERENCES memory_relations(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
  episode_id TEXT REFERENCES memory_episodes(id) ON DELETE SET NULL,
  evidence_text TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6.1 Wiki — derived high-confidence summarisation pages.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS memory_wiki_pages (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  project_id TEXT,
  topic TEXT NOT NULL,
  body TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.75,
  source_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  entity_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  generated_by TEXT NOT NULL DEFAULT 'wiki-compiler-v12',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- v1.3 Lane C — `wiki_embedding` 1024-dim pgvector column.
-- Idempotent ALTER so a fresh install (table just created above) and an
-- existing v1.2 RDS without the column both end up with the column present.
-- ADD COLUMN IF NOT EXISTS is a metadata-only operation in PostgreSQL 16+
-- when the new column is NULLABLE and has no default, so this does not
-- rewrite the existing memory_wiki_pages rows.
ALTER TABLE memory_wiki_pages ADD COLUMN IF NOT EXISTS wiki_embedding vector(1024);

-- ---------------------------------------------------------------------------
-- 8.3 Trace — per-recall stream evidence ledger.
--
-- recall_traces (v1.0/v1.1) lives in schema.sql; v1.2 adds dedicated
-- recall_traces_v12 and recall_trace_items_v12 so we can persist the new
-- per-stream metadata, lifecycle decisions, graph paths, wiki refs, and
-- reranker scores without overloading the v1.1 trace surface. Both schemas
-- co-exist; lanes that need only the v1.1 view can keep using the originals.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS recall_traces_v12 (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  project_id TEXT,
  query TEXT NOT NULL,
  valid_at TIMESTAMPTZ,
  engine_version TEXT NOT NULL DEFAULT 'v12',
  fusion_strategy TEXT NOT NULL DEFAULT 'weighted-rrf',
  reranker_provider TEXT,
  candidate_limit INTEGER NOT NULL DEFAULT 80,
  final_limit INTEGER NOT NULL DEFAULT 12,
  latency_ms INTEGER,
  token_budget INTEGER,
  tokens_used INTEGER,
  feedback TEXT,
  feedback_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recall_trace_items_v12 (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL REFERENCES recall_traces_v12(id) ON DELETE CASCADE,
  item_id TEXT,
  chunk_id TEXT,
  rank INTEGER NOT NULL,
  fused_score NUMERIC NOT NULL DEFAULT 0,
  reranker_score NUMERIC,
  disposition TEXT NOT NULL DEFAULT 'returned',
  reason TEXT,
  streams JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifecycle JSONB NOT NULL DEFAULT '{}'::jsonb,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6.2 Indexes — FTS GIN + pgvector HNSW + tenancy/lifecycle B-trees.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_memory_episodes_vault_occurred
  ON memory_episodes(vault_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_episodes_session
  ON memory_episodes(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memory_items_vault_status
  ON memory_items(vault_id, status);

CREATE INDEX IF NOT EXISTS idx_memory_items_project_status
  ON memory_items(project_id, status);

CREATE INDEX IF NOT EXISTS idx_memory_items_validity
  ON memory_items(vault_id, valid_from, valid_until);

-- FTS GIN over memory_items.content keeps lifecycle filters cheap (vault_id +
-- status + ts_rank_cd) for the Postgres FTS provider.
CREATE INDEX IF NOT EXISTS idx_memory_items_content_fts
  ON memory_items USING GIN (to_tsvector('simple', content));

-- FTS GIN over memory_chunks.chunk_text supports chunk-grained scoring needed
-- for fine-grained recall and reranker contexts.
CREATE INDEX IF NOT EXISTS idx_memory_chunks_text_fts
  ON memory_chunks USING GIN (to_tsvector('simple', chunk_text));

CREATE INDEX IF NOT EXISTS idx_memory_chunks_item
  ON memory_chunks(item_id, ordinal);

-- pgvector HNSW for 1024-dim cosine ANN queries against the v12 embeddings.
-- pgvector >= 0.5 is required for hnsw on vector_cosine_ops.
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_v12_hnsw
  ON memory_embeddings_v12
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_memory_embeddings_v12_vault
  ON memory_embeddings_v12(vault_id, item_id);

CREATE INDEX IF NOT EXISTS idx_memory_entities_lookup
  ON memory_entities(vault_id, canonical_name, entity_type);

CREATE INDEX IF NOT EXISTS idx_memory_entity_mentions_entity
  ON memory_entity_mentions(entity_id);

CREATE INDEX IF NOT EXISTS idx_memory_entity_mentions_item
  ON memory_entity_mentions(item_id);

CREATE INDEX IF NOT EXISTS idx_memory_relations_source
  ON memory_relations(vault_id, source_entity_id, relation_type, status);

CREATE INDEX IF NOT EXISTS idx_memory_relations_target
  ON memory_relations(vault_id, target_entity_id, relation_type, status);

CREATE INDEX IF NOT EXISTS idx_memory_relations_validity
  ON memory_relations(vault_id, valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_memory_relation_evidence_relation
  ON memory_relation_evidence(relation_id);

CREATE INDEX IF NOT EXISTS idx_memory_wiki_pages_project_status
  ON memory_wiki_pages(vault_id, project_id, status);

CREATE INDEX IF NOT EXISTS idx_memory_wiki_pages_topic_fts
  ON memory_wiki_pages USING GIN (to_tsvector('simple', topic || ' ' || body));

-- v1.3 Lane C — pgvector HNSW over wiki_embedding for cosine ANN.
-- IF NOT EXISTS guards both the fresh-install and the upgrade-from-v1.2 paths.
CREATE INDEX IF NOT EXISTS idx_memory_wiki_pages_embedding
  ON memory_wiki_pages USING hnsw (wiki_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_recall_traces_v12_vault_created
  ON recall_traces_v12(vault_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recall_trace_items_v12_trace
  ON recall_trace_items_v12(trace_id, rank);
