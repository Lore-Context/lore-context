// Lore Context v1.2 — Memory Store (Lane A foundation).
//
// This module owns the v1.2 episode -> item -> chunk -> embedding ledger plus
// the v12 recall-trace tables. Lane B (retrieval) and Lane C (graph/temporal)
// build their search providers on top of these methods; this file deliberately
// stays narrow and SQL-backed, with no in-memory hydrate.
//
// The v1.1 `PostgresLoreStore` (`apps/api/src/index.ts`) is preserved for the
// legacy `memory_records` path. v1.2 callers must construct a separate
// `PostgresMemoryStoreV12` so that engine v12 startup is O(1) regardless of
// row count, satisfying the M1 acceptance criterion: "v12 Postgres
// initialization does not require full memory hydrate."

import type { Pool, PoolClient } from "pg";
import { loadV12SchemaSql } from "./schema.js";

// ---------------------------------------------------------------------------
// Record shapes — mirror schema-v12.sql columns one-to-one. JSONB columns are
// surfaced as plain JS values; callers pass POJOs and the store handles
// serialization.
// ---------------------------------------------------------------------------

export interface MemoryEpisodeV12Record {
  id: string;
  vaultId: string;
  accountId?: string | null;
  projectId?: string | null;
  sourceProvider: string;
  sourceId?: string | null;
  sessionId?: string | null;
  eventType: string;
  occurredAt: string;
  ingestedAt?: string | null;
  redactedText: string;
  rawRef?: Record<string, unknown>;
  sourceRefs?: unknown[];
  privacyMode?: string;
  metadata?: Record<string, unknown>;
}

export type MemoryItemV12Status = "active" | "superseded" | "expired" | "redacted" | "deleted";

export interface MemoryItemV12Record {
  id: string;
  vaultId: string;
  episodeId?: string | null;
  projectId?: string | null;
  memoryType: string;
  subject?: string | null;
  predicate?: string | null;
  object?: string | null;
  content: string;
  status?: MemoryItemV12Status;
  confidence?: number;
  importance?: number;
  validFrom?: string | null;
  validUntil?: string | null;
  supersededBy?: string | null;
  riskTags?: string[];
  sourceRefs?: unknown[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemoryChunkV12Record {
  id: string;
  vaultId: string;
  itemId: string;
  chunkText: string;
  tokenCount?: number | null;
  ordinal?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryEmbeddingV12Record {
  chunkId: string;
  vaultId: string;
  itemId: string;
  embedding: number[];
  embeddingModel: string;
  embeddingVersion?: string;
  contentHash: string;
  createdAt?: string;
}

export interface MemoryV12Hydration {
  itemId: string;
  vaultId: string;
  projectId?: string | null;
  memoryType: string;
  content: string;
  status: MemoryItemV12Status;
  confidence: number;
  importance: number;
  validFrom?: string | null;
  validUntil?: string | null;
  supersededBy?: string | null;
  riskTags: string[];
  sourceRefs: unknown[];
  metadata: Record<string, unknown>;
  episodeIds: string[];
  chunkIds: string[];
}

export interface MemoryV12HydrationScope {
  projectId?: string | null;
  allowedProjectIds?: readonly string[] | null;
}

// ---------------------------------------------------------------------------
// Lane C — Graph + Temporal records.
// Mirrors the memory_entities / memory_entity_mentions / memory_relations /
// memory_relation_evidence tables from schema-v12.sql. All shapes are
// vault-scoped: every method that reads or writes graph rows requires the
// authenticated vault id and silently drops cross-vault data.
// ---------------------------------------------------------------------------

export interface MemoryEntityV12Record {
  id: string;
  vaultId: string;
  name: string;
  canonicalName: string;
  entityType: string;
  aliases?: string[];
  confidence?: number;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MemoryEntityMentionV12Record {
  id: string;
  vaultId: string;
  entityId: string;
  itemId: string;
  episodeId?: string | null;
  mentionText: string;
  confidence?: number;
  createdAt?: string;
}

export type MemoryRelationV12Status = "active" | "invalidated" | "superseded" | "expired";

export interface MemoryRelationV12Record {
  id: string;
  vaultId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  fact: string;
  status?: MemoryRelationV12Status;
  confidence?: number;
  validFrom?: string | null;
  validUntil?: string | null;
  invalidatedBy?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemoryRelationEvidenceV12Record {
  id: string;
  vaultId: string;
  relationId: string;
  itemId: string;
  episodeId?: string | null;
  evidenceText: string;
  confidence?: number;
  createdAt?: string;
}

export interface InvalidateRelationV12Input {
  vaultId: string;
  relationId: string;
  invalidatedBy?: string | null;
  validUntil?: string | null;
  status?: Exclude<MemoryRelationV12Status, "active">;
  reason?: string | null;
}

export type MarkItemLifecycleV12Action = "delete" | "redact" | "supersede";

export interface MarkItemLifecycleV12Input {
  vaultId: string;
  itemId: string;
  action: MarkItemLifecycleV12Action;
  /** Required for `supersede`. Must reference another v12 item id. */
  supersededBy?: string | null;
  /** Optional reason persisted in metadata for audit / replay. */
  reason?: string | null;
  /** Override `now()` for deterministic tests. */
  now?: string;
}

export interface MarkItemLifecycleV12Result {
  itemId: string;
  status: MemoryItemV12Status;
  relationsInvalidated: number;
  evidenceMarked: number;
  /**
   * Number of `memory_embeddings_v12` rows removed for this (vault, item).
   * Embeddings are deleted rather than soft-marked because the schema has no
   * lifecycle column and a redact / delete must not leave semantic residue
   * that pgvector ANN could still surface.
   */
  embeddingsRemoved: number;
  /**
   * Number of `memory_wiki_pages` rows whose status was advanced from
   * `active` to `stale` because they cite this item in `source_item_ids`.
   * Wiki pages are not deleted — keeping the row preserves audit history.
   */
  wikiPagesMarked: number;
}

// ---------------------------------------------------------------------------
// Wiki page record — used by the in-memory store so tests can seed
// `memory_wiki_pages` rows that lifecycle propagation must invalidate. The
// production wiki compiler lives behind `LORE_WIKI_COMPILER` and is deferred
// to v1.3, so this record is intentionally narrow.
// ---------------------------------------------------------------------------

export type MemoryWikiPageV12Status = "active" | "stale" | "invalidated" | "archived";

export interface MemoryWikiPageV12Record {
  id: string;
  vaultId: string;
  projectId?: string | null;
  topic: string;
  body: string;
  confidence?: number;
  sourceItemIds: string[];
  entityIds?: string[];
  status?: MemoryWikiPageV12Status;
  generatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchGraphRelationsV12Input {
  vaultId: string;
  entityIds?: string[];
  sourceEntityIds?: string[];
  targetEntityIds?: string[];
  relationTypes?: string[];
  statuses?: MemoryRelationV12Status[];
  validAt?: string | null;
  limit?: number;
}

export interface ListGraphEvidenceV12Input {
  vaultId: string;
  relationId: string;
  limit?: number;
}

export type RecallTraceV12Disposition = "returned" | "filtered" | "duplicate" | "expired" | "superseded" | "low_confidence";

export interface RecallTraceV12ItemInput {
  itemId?: string | null;
  chunkId?: string | null;
  rank: number;
  fusedScore: number;
  rerankerScore?: number | null;
  disposition?: RecallTraceV12Disposition;
  reason?: string | null;
  streams?: Record<string, unknown>;
  lifecycle?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RecallTraceV12Input {
  id: string;
  vaultId: string;
  projectId?: string | null;
  query: string;
  validAt?: string | null;
  engineVersion?: string;
  fusionStrategy?: string;
  rerankerProvider?: string | null;
  candidateLimit?: number;
  finalLimit?: number;
  latencyMs?: number | null;
  tokenBudget?: number | null;
  tokensUsed?: number | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  items: RecallTraceV12ItemInput[];
}

// ---------------------------------------------------------------------------
// Public interface (Lane B/C consume this).
// ---------------------------------------------------------------------------

export interface MemoryStoreV12 {
  /**
   * Lazy initialization. Only opens the connection (and optionally applies
   * schema-v12.sql) — never paginates `memory_items` / `memory_chunks` into
   * memory.
   */
  ready(): Promise<void>;

  createMemoryEpisodeV12(record: MemoryEpisodeV12Record): Promise<MemoryEpisodeV12Record>;
  createMemoryItemV12(record: MemoryItemV12Record): Promise<MemoryItemV12Record>;
  createMemoryChunkV12(record: MemoryChunkV12Record): Promise<MemoryChunkV12Record>;
  saveMemoryEmbeddingV12(record: MemoryEmbeddingV12Record): Promise<void>;

  /**
   * Bulk hydrate items + chunk ids by item id, scoped to a single vault. Used
   * by retrieval providers to turn fused candidate ids into a render-ready
   * payload without loading the whole table.
   *
   * SECURITY: `vaultId` is mandatory — it MUST be derived from the
   * authenticated session, never from caller-supplied ids. Items belonging to
   * other vaults are silently dropped even if their id appears in `itemIds`.
   */
  listV12SearchHydrationByIds(
    vaultId: string,
    itemIds: string[],
    scope?: MemoryV12HydrationScope
  ): Promise<MemoryV12Hydration[]>;

  /**
   * Persist a recall trace and its per-stream items in a single transaction.
   */
  recordRecallTraceV12(input: RecallTraceV12Input): Promise<void>;

  /**
   * Lane F3 — narrow B-3 propagation primitive.
   *
   * Mark a single v12 memory item as deleted/redacted/superseded AND, in the
   * same transaction, invalidate every active relation whose evidence cites
   * that item. The dashboard / API delete-redact-supersede surface is
   * expected to call this method *before* sending an ack so callers cannot
   * observe an "already marked dead but graph still serves the fact"
   * window.
   *
   * Returns the counts of relations and evidence rows touched. Does NOT
   * propagate into pgvector embeddings or wiki pages — that propagation
   * remains pending and is reported by doctor B-3 until those wires land.
   *
   * SECURITY: vault id MUST come from the authenticated session. Cross-vault
   * ids must throw, just like the rest of the v12 store contract.
   */
  markItemLifecycleV12(input: MarkItemLifecycleV12Input): Promise<MarkItemLifecycleV12Result>;

  // -------------------------------------------------------------------------
  // Lane C — Graph + Temporal write/read paths.
  // -------------------------------------------------------------------------

  /**
   * Upsert an entity by `(vault_id, canonical_name, entity_type)`. Aliases are
   * merged additively; `last_seen_at` always advances; `first_seen_at` only
   * fills when previously null. Returns the persisted record.
   *
   * SECURITY: callers MUST pass the authenticated vault id; canonical lookup
   * is scoped by vault so two vaults can use the same canonical name without
   * colliding.
   */
  upsertEntityV12(record: MemoryEntityV12Record): Promise<MemoryEntityV12Record>;

  /** Persist a single entity mention. Idempotent on `id`. */
  addEntityMentionV12(record: MemoryEntityMentionV12Record): Promise<MemoryEntityMentionV12Record>;

  /** Insert a new relation row, or refresh confidence/metadata when the same
   *  `id` re-appears. Does NOT mutate validity columns — invalidation goes
   *  through `invalidateRelationV12`. */
  upsertRelationV12(record: MemoryRelationV12Record): Promise<MemoryRelationV12Record>;

  /**
   * Mark an existing relation as no longer active. Sets `valid_until`,
   * `status`, and (optionally) `invalidated_by`. Vault-scoped; throws if the
   * relation does not belong to `vaultId`.
   */
  invalidateRelationV12(input: InvalidateRelationV12Input): Promise<void>;

  /** Persist a single relation evidence row. Idempotent on `id`. */
  addRelationEvidenceV12(record: MemoryRelationEvidenceV12Record): Promise<MemoryRelationEvidenceV12Record>;

  /**
   * Search relations within a vault. Supports filtering by source/target/any
   * entity ids, relation_type, status, and validity at a point in time.
   * Returns up to `limit` rows, ordered by confidence then recency.
   */
  searchGraphRelationsV12(input: SearchGraphRelationsV12Input): Promise<MemoryRelationV12Record[]>;

  /** List evidence rows for a single relation, vault-scoped, newest first. */
  listGraphEvidenceV12(input: ListGraphEvidenceV12Input): Promise<MemoryRelationEvidenceV12Record[]>;
}

export interface PostgresMemoryStoreV12Options {
  pool: Pool;
  /** Apply `schema-v12.sql` on startup. Defaults to `false` (production-safe). */
  autoApplyV12Schema?: boolean;
  /** Override `now()` for deterministic tests. */
  now?: () => Date;
}

// ---------------------------------------------------------------------------
// Helpers — JSON normalisation and column defaults.
// ---------------------------------------------------------------------------

function nowIso(now: () => Date = () => new Date()): string {
  return now().toISOString();
}

function jsonOrEmpty(value: unknown, fallback: "{}" | "[]"): string {
  if (value === undefined || value === null) {
    return fallback;
  }
  return JSON.stringify(value);
}

// pgvector accepts the `[a,b,c]` literal form via parameterised text input.
function vectorLiteral(embedding: number[]): string {
  if (!Array.isArray(embedding)) {
    throw new TypeError("embedding must be an array of numbers");
  }
  if (embedding.length === 0) {
    throw new RangeError("embedding must be non-empty");
  }
  return `[${embedding.map((value) => {
    if (!Number.isFinite(value)) {
      throw new RangeError("embedding contains non-finite value");
    }
    return Number(value).toString();
  }).join(",")}]`;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string" || value.length === 0) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// PostgresMemoryStoreV12.
// ---------------------------------------------------------------------------

export class PostgresMemoryStoreV12 implements MemoryStoreV12 {
  private readonly pool: Pool;
  private readonly autoApplyV12Schema: boolean;
  private readonly now: () => Date;
  private readyPromise?: Promise<void>;

  constructor(options: PostgresMemoryStoreV12Options) {
    this.pool = options.pool;
    this.autoApplyV12Schema = options.autoApplyV12Schema ?? false;
    this.now = options.now ?? (() => new Date());
  }

  ready(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = this.initialize();
    }
    return this.readyPromise;
  }

  /**
   * Initialization is intentionally minimal: optionally apply schema, and
   * resolve. We do NOT read or count rows here, so startup latency is
   * independent of `memory_items` / `memory_chunks` size.
   */
  private async initialize(): Promise<void> {
    if (this.autoApplyV12Schema) {
      await this.pool.query(loadV12SchemaSql());
    }
  }

  async createMemoryEpisodeV12(record: MemoryEpisodeV12Record): Promise<MemoryEpisodeV12Record> {
    await this.ready();
    const ingestedAt = record.ingestedAt ?? nowIso(this.now);
    const stored: MemoryEpisodeV12Record = {
      ...record,
      ingestedAt,
      privacyMode: record.privacyMode ?? "standard",
      rawRef: record.rawRef ?? {},
      sourceRefs: record.sourceRefs ?? [],
      metadata: record.metadata ?? {}
    };
    await this.pool.query(
      `INSERT INTO memory_episodes (
         id, vault_id, account_id, project_id, source_provider, source_id,
         session_id, event_type, occurred_at, ingested_at, redacted_text,
         raw_ref, source_refs, privacy_mode, metadata
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11,
         $12::jsonb, $13::jsonb, $14, $15::jsonb
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        stored.id,
        stored.vaultId,
        stored.accountId ?? null,
        stored.projectId ?? null,
        stored.sourceProvider,
        stored.sourceId ?? null,
        stored.sessionId ?? null,
        stored.eventType,
        stored.occurredAt,
        ingestedAt,
        stored.redactedText,
        jsonOrEmpty(stored.rawRef, "{}"),
        jsonOrEmpty(stored.sourceRefs, "[]"),
        stored.privacyMode,
        jsonOrEmpty(stored.metadata, "{}")
      ]
    );
    return stored;
  }

  async createMemoryItemV12(record: MemoryItemV12Record): Promise<MemoryItemV12Record> {
    await this.ready();
    const created = record.createdAt ?? nowIso(this.now);
    const updated = record.updatedAt ?? created;
    const stored: MemoryItemV12Record = {
      ...record,
      status: record.status ?? "active",
      confidence: record.confidence ?? 0.75,
      importance: record.importance ?? 0.5,
      riskTags: record.riskTags ?? [],
      sourceRefs: record.sourceRefs ?? [],
      metadata: record.metadata ?? {},
      createdAt: created,
      updatedAt: updated
    };
    await this.pool.query(
      `INSERT INTO memory_items (
         id, vault_id, episode_id, project_id, memory_type,
         subject, predicate, object, content, status,
         confidence, importance, valid_from, valid_until, superseded_by,
         risk_tags, source_refs, metadata, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15,
         $16::jsonb, $17::jsonb, $18::jsonb, $19, $20
       )
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         memory_type = EXCLUDED.memory_type,
         status = EXCLUDED.status,
         confidence = EXCLUDED.confidence,
         importance = EXCLUDED.importance,
         valid_from = EXCLUDED.valid_from,
         valid_until = EXCLUDED.valid_until,
         superseded_by = EXCLUDED.superseded_by,
         risk_tags = EXCLUDED.risk_tags,
         source_refs = EXCLUDED.source_refs,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
      [
        stored.id,
        stored.vaultId,
        stored.episodeId ?? null,
        stored.projectId ?? null,
        stored.memoryType,
        stored.subject ?? null,
        stored.predicate ?? null,
        stored.object ?? null,
        stored.content,
        stored.status,
        stored.confidence,
        stored.importance,
        stored.validFrom ?? null,
        stored.validUntil ?? null,
        stored.supersededBy ?? null,
        jsonOrEmpty(stored.riskTags, "[]"),
        jsonOrEmpty(stored.sourceRefs, "[]"),
        jsonOrEmpty(stored.metadata, "{}"),
        created,
        updated
      ]
    );
    return stored;
  }

  async createMemoryChunkV12(record: MemoryChunkV12Record): Promise<MemoryChunkV12Record> {
    await this.ready();
    const stored: MemoryChunkV12Record = {
      ...record,
      ordinal: record.ordinal ?? 0,
      metadata: record.metadata ?? {}
    };
    await this.pool.query(
      `INSERT INTO memory_chunks (
         id, vault_id, item_id, chunk_text, token_count, ordinal, metadata
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7::jsonb
       )
       ON CONFLICT (id) DO UPDATE SET
         chunk_text = EXCLUDED.chunk_text,
         token_count = EXCLUDED.token_count,
         ordinal = EXCLUDED.ordinal,
         metadata = EXCLUDED.metadata`,
      [
        stored.id,
        stored.vaultId,
        stored.itemId,
        stored.chunkText,
        stored.tokenCount ?? null,
        stored.ordinal,
        jsonOrEmpty(stored.metadata, "{}")
      ]
    );
    return stored;
  }

  async saveMemoryEmbeddingV12(record: MemoryEmbeddingV12Record): Promise<void> {
    await this.ready();
    const created = record.createdAt ?? nowIso(this.now);
    await this.pool.query(
      `INSERT INTO memory_embeddings_v12 (
         chunk_id, vault_id, item_id, embedding, embedding_model,
         embedding_version, content_hash, created_at
       ) VALUES (
         $1, $2, $3, $4::vector, $5, $6, $7, $8
       )
       ON CONFLICT (chunk_id) DO UPDATE SET
         embedding = EXCLUDED.embedding,
         embedding_model = EXCLUDED.embedding_model,
         embedding_version = EXCLUDED.embedding_version,
         content_hash = EXCLUDED.content_hash,
         created_at = EXCLUDED.created_at`,
      [
        record.chunkId,
        record.vaultId,
        record.itemId,
        vectorLiteral(record.embedding),
        record.embeddingModel,
        record.embeddingVersion ?? "v12-qwen3-1024",
        record.contentHash,
        created
      ]
    );
  }

  async listV12SearchHydrationByIds(
    vaultId: string,
    itemIds: string[],
    scope: MemoryV12HydrationScope = {}
  ): Promise<MemoryV12Hydration[]> {
    if (!vaultId) {
      throw new Error("listV12SearchHydrationByIds requires a vaultId from the authenticated session");
    }
    if (itemIds.length === 0) return [];
    await this.ready();
    const projectId = scope.projectId?.trim() ? scope.projectId : null;
    const allowedProjectIds = projectId
      ? null
      : scope.allowedProjectIds && scope.allowedProjectIds.length > 0
        ? [...scope.allowedProjectIds]
        : null;
    const res = await this.pool.query(
      `SELECT
         i.id AS item_id,
         i.vault_id,
         i.project_id,
         i.memory_type,
         i.content,
         i.status,
         i.confidence,
         i.importance,
         i.valid_from,
         i.valid_until,
         i.superseded_by,
         i.risk_tags,
         i.source_refs,
         i.metadata,
         CASE WHEN i.episode_id IS NULL THEN '[]'::jsonb
              ELSE jsonb_build_array(i.episode_id) END AS episode_ids,
         COALESCE(
           jsonb_agg(c.id ORDER BY c.ordinal) FILTER (WHERE c.id IS NOT NULL),
           '[]'::jsonb
         ) AS chunk_ids
       FROM memory_items i
       LEFT JOIN memory_chunks c ON c.item_id = i.id AND c.vault_id = i.vault_id
       WHERE i.vault_id = $1
         AND i.id = ANY($2::text[])
         AND ($3::text IS NULL OR i.project_id = $3)
         AND ($4::text[] IS NULL OR i.project_id = ANY($4::text[]))
       GROUP BY i.id, i.vault_id, i.project_id, i.memory_type, i.content,
                i.status, i.confidence, i.importance, i.valid_from, i.valid_until,
                i.superseded_by, i.risk_tags, i.source_refs, i.metadata, i.episode_id`,
      [vaultId, itemIds, projectId, allowedProjectIds]
    );
    return res.rows.map((row) => rowToHydration(row as Record<string, unknown>));
  }

  async upsertEntityV12(record: MemoryEntityV12Record): Promise<MemoryEntityV12Record> {
    if (!record.vaultId) {
      throw new Error("upsertEntityV12 requires a vaultId from the authenticated session");
    }
    await this.ready();
    const now = nowIso(this.now);
    const stored: MemoryEntityV12Record = {
      ...record,
      aliases: record.aliases ?? [],
      confidence: record.confidence ?? 0.75,
      metadata: record.metadata ?? {},
      firstSeenAt: record.firstSeenAt ?? now,
      lastSeenAt: record.lastSeenAt ?? now
    };
    await this.pool.query(
      `INSERT INTO memory_entities (
         id, vault_id, name, canonical_name, entity_type,
         aliases, confidence, first_seen_at, last_seen_at, metadata
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6::jsonb, $7, $8, $9, $10::jsonb
       )
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         canonical_name = EXCLUDED.canonical_name,
         entity_type = EXCLUDED.entity_type,
         aliases = (
           SELECT COALESCE(jsonb_agg(DISTINCT alias), '[]'::jsonb)
           FROM jsonb_array_elements_text(memory_entities.aliases || EXCLUDED.aliases) AS alias
         ),
         confidence = GREATEST(memory_entities.confidence, EXCLUDED.confidence),
         first_seen_at = COALESCE(memory_entities.first_seen_at, EXCLUDED.first_seen_at),
         last_seen_at = GREATEST(
           COALESCE(memory_entities.last_seen_at, EXCLUDED.last_seen_at),
           EXCLUDED.last_seen_at
         ),
         metadata = memory_entities.metadata || EXCLUDED.metadata
       WHERE memory_entities.vault_id = EXCLUDED.vault_id`,
      [
        stored.id,
        stored.vaultId,
        stored.name,
        stored.canonicalName,
        stored.entityType,
        jsonOrEmpty(stored.aliases, "[]"),
        stored.confidence,
        stored.firstSeenAt,
        stored.lastSeenAt,
        jsonOrEmpty(stored.metadata, "{}")
      ]
    );
    return stored;
  }

  async addEntityMentionV12(record: MemoryEntityMentionV12Record): Promise<MemoryEntityMentionV12Record> {
    if (!record.vaultId) {
      throw new Error("addEntityMentionV12 requires a vaultId from the authenticated session");
    }
    await this.ready();
    const created = record.createdAt ?? nowIso(this.now);
    const stored: MemoryEntityMentionV12Record = {
      ...record,
      confidence: record.confidence ?? 0.75,
      createdAt: created
    };
    await this.pool.query(
      `INSERT INTO memory_entity_mentions (
         id, vault_id, entity_id, item_id, episode_id,
         mention_text, confidence, created_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        stored.id,
        stored.vaultId,
        stored.entityId,
        stored.itemId,
        stored.episodeId ?? null,
        stored.mentionText,
        stored.confidence,
        created
      ]
    );
    return stored;
  }

  async upsertRelationV12(record: MemoryRelationV12Record): Promise<MemoryRelationV12Record> {
    if (!record.vaultId) {
      throw new Error("upsertRelationV12 requires a vaultId from the authenticated session");
    }
    await this.ready();
    const now = nowIso(this.now);
    const created = record.createdAt ?? now;
    const updated = record.updatedAt ?? now;
    const stored: MemoryRelationV12Record = {
      ...record,
      status: record.status ?? "active",
      confidence: record.confidence ?? 0.75,
      metadata: record.metadata ?? {},
      createdAt: created,
      updatedAt: updated
    };
    await this.pool.query(
      `INSERT INTO memory_relations (
         id, vault_id, source_entity_id, target_entity_id, relation_type,
         fact, status, confidence, valid_from, valid_until,
         invalidated_by, metadata, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12::jsonb, $13, $14
       )
       ON CONFLICT (id) DO UPDATE SET
         fact = EXCLUDED.fact,
         confidence = GREATEST(memory_relations.confidence, EXCLUDED.confidence),
         metadata = memory_relations.metadata || EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at
       WHERE memory_relations.vault_id = EXCLUDED.vault_id`,
      [
        stored.id,
        stored.vaultId,
        stored.sourceEntityId,
        stored.targetEntityId,
        stored.relationType,
        stored.fact,
        stored.status,
        stored.confidence,
        stored.validFrom ?? null,
        stored.validUntil ?? null,
        stored.invalidatedBy ?? null,
        jsonOrEmpty(stored.metadata, "{}"),
        created,
        updated
      ]
    );
    return stored;
  }

  async invalidateRelationV12(input: InvalidateRelationV12Input): Promise<void> {
    if (!input.vaultId) {
      throw new Error("invalidateRelationV12 requires a vaultId from the authenticated session");
    }
    await this.ready();
    const now = nowIso(this.now);
    const validUntil = input.validUntil ?? now;
    const status = input.status ?? "invalidated";
    const result = await this.pool.query(
      `UPDATE memory_relations
         SET status = $3,
             valid_until = COALESCE(valid_until, $4),
             invalidated_by = COALESCE($5, invalidated_by),
             metadata = metadata || $6::jsonb,
             updated_at = $7
       WHERE id = $1 AND vault_id = $2`,
      [
        input.relationId,
        input.vaultId,
        status,
        validUntil,
        input.invalidatedBy ?? null,
        JSON.stringify({
          invalidation_reason: input.reason ?? null,
          invalidated_at: now
        }),
        now
      ]
    );
    if (typeof result.rowCount === "number" && result.rowCount === 0) {
      throw new Error(`relation ${input.relationId} not found in vault ${input.vaultId}`);
    }
  }

  async addRelationEvidenceV12(record: MemoryRelationEvidenceV12Record): Promise<MemoryRelationEvidenceV12Record> {
    if (!record.vaultId) {
      throw new Error("addRelationEvidenceV12 requires a vaultId from the authenticated session");
    }
    await this.ready();
    const created = record.createdAt ?? nowIso(this.now);
    const stored: MemoryRelationEvidenceV12Record = {
      ...record,
      confidence: record.confidence ?? 0.75,
      createdAt: created
    };
    await this.pool.query(
      `INSERT INTO memory_relation_evidence (
         id, vault_id, relation_id, item_id, episode_id,
         evidence_text, confidence, created_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        stored.id,
        stored.vaultId,
        stored.relationId,
        stored.itemId,
        stored.episodeId ?? null,
        stored.evidenceText,
        stored.confidence,
        created
      ]
    );
    return stored;
  }

  async searchGraphRelationsV12(input: SearchGraphRelationsV12Input): Promise<MemoryRelationV12Record[]> {
    if (!input.vaultId) {
      throw new Error("searchGraphRelationsV12 requires a vaultId from the authenticated session");
    }
    await this.ready();
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
    const sourceIds = input.sourceEntityIds ?? null;
    const targetIds = input.targetEntityIds ?? null;
    const eitherIds = input.entityIds ?? null;
    const types = input.relationTypes ?? null;
    const statuses = input.statuses ?? null;
    const validAt = input.validAt ?? null;
    const res = await this.pool.query(
      `SELECT id, vault_id, source_entity_id, target_entity_id, relation_type,
              fact, status, confidence, valid_from, valid_until,
              invalidated_by, metadata, created_at, updated_at
         FROM memory_relations
        WHERE vault_id = $1
          AND ($2::text[] IS NULL OR source_entity_id = ANY($2::text[]))
          AND ($3::text[] IS NULL OR target_entity_id = ANY($3::text[]))
          AND (
            $4::text[] IS NULL
            OR source_entity_id = ANY($4::text[])
            OR target_entity_id = ANY($4::text[])
          )
          AND ($5::text[] IS NULL OR relation_type = ANY($5::text[]))
          AND ($6::text[] IS NULL OR status = ANY($6::text[]))
          AND (
            $7::timestamptz IS NULL
            OR (
              (valid_from IS NULL OR valid_from <= $7::timestamptz)
              AND (valid_until IS NULL OR valid_until > $7::timestamptz)
            )
          )
        ORDER BY confidence DESC, updated_at DESC
        LIMIT $8`,
      [
        input.vaultId,
        sourceIds,
        targetIds,
        eitherIds,
        types,
        statuses,
        validAt,
        limit
      ]
    );
    return res.rows.map((row) => rowToRelation(row as Record<string, unknown>));
  }

  async listGraphEvidenceV12(input: ListGraphEvidenceV12Input): Promise<MemoryRelationEvidenceV12Record[]> {
    if (!input.vaultId) {
      throw new Error("listGraphEvidenceV12 requires a vaultId from the authenticated session");
    }
    await this.ready();
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
    const res = await this.pool.query(
      `SELECT id, vault_id, relation_id, item_id, episode_id,
              evidence_text, confidence, created_at
         FROM memory_relation_evidence
        WHERE vault_id = $1 AND relation_id = $2
        ORDER BY created_at DESC
        LIMIT $3`,
      [input.vaultId, input.relationId, limit]
    );
    return res.rows.map((row) => rowToRelationEvidence(row as Record<string, unknown>));
  }

  async recordRecallTraceV12(input: RecallTraceV12Input): Promise<void> {
    await this.ready();
    const created = input.createdAt ?? nowIso(this.now);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO recall_traces_v12 (
           id, vault_id, project_id, query, valid_at,
           engine_version, fusion_strategy, reranker_provider,
           candidate_limit, final_limit,
           latency_ms, token_budget, tokens_used,
           metadata, created_at
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8,
           $9, $10,
           $11, $12, $13,
           $14::jsonb, $15
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          input.id,
          input.vaultId,
          input.projectId ?? null,
          input.query,
          input.validAt ?? null,
          input.engineVersion ?? "v12",
          input.fusionStrategy ?? "weighted-rrf",
          input.rerankerProvider ?? null,
          input.candidateLimit ?? 80,
          input.finalLimit ?? 12,
          input.latencyMs ?? null,
          input.tokenBudget ?? null,
          input.tokensUsed ?? null,
          jsonOrEmpty(input.metadata, "{}"),
          created
        ]
      );
      let index = 0;
      for (const item of input.items) {
        index += 1;
        await client.query(
          `INSERT INTO recall_trace_items_v12 (
             id, trace_id, item_id, chunk_id, rank,
             fused_score, reranker_score, disposition, reason,
             streams, lifecycle, provenance, metadata, created_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9,
             $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14
           )`,
          [
            `${input.id}_${index}`,
            input.id,
            item.itemId ?? null,
            item.chunkId ?? null,
            item.rank,
            item.fusedScore,
            item.rerankerScore ?? null,
            item.disposition ?? "returned",
            item.reason ?? null,
            jsonOrEmpty(item.streams, "{}"),
            jsonOrEmpty(item.lifecycle, "{}"),
            jsonOrEmpty(item.provenance, "{}"),
            jsonOrEmpty(item.metadata, "{}"),
            created
          ]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async markItemLifecycleV12(input: MarkItemLifecycleV12Input): Promise<MarkItemLifecycleV12Result> {
    if (!input.vaultId) {
      throw new Error("markItemLifecycleV12 requires a vaultId from the authenticated session");
    }
    await this.ready();
    const now = input.now ?? nowIso(this.now);
    const status = lifecycleActionToItemStatus(input.action);
    const supersededBy = input.action === "supersede" ? (input.supersededBy ?? null) : null;
    if (input.action === "supersede" && !supersededBy) {
      throw new Error("markItemLifecycleV12: action='supersede' requires supersededBy");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const itemResult = await client.query(
        `UPDATE memory_items
            SET status = $3,
                superseded_by = COALESCE($4, superseded_by),
                valid_until = CASE WHEN $3 IN ('expired','superseded','deleted','redacted')
                                   THEN COALESCE(valid_until, $5::timestamptz)
                                   ELSE valid_until END,
                metadata = metadata || $6::jsonb,
                updated_at = $5
          WHERE id = $1 AND vault_id = $2`,
        [
          input.itemId,
          input.vaultId,
          status,
          supersededBy,
          now,
          JSON.stringify({
            lifecycle_action: input.action,
            lifecycle_reason: input.reason ?? null,
            lifecycle_at: now
          })
        ]
      );
      if (typeof itemResult.rowCount === "number" && itemResult.rowCount === 0) {
        await client.query("ROLLBACK");
        throw new Error(`memory item ${input.itemId} not found in vault ${input.vaultId}`);
      }

      // Invalidate every still-active relation whose evidence cites this item
      // (or whose mention cites it). Keep already-invalidated rows untouched.
      const relationResult = await client.query(
        `UPDATE memory_relations r
            SET status = 'invalidated',
                valid_until = COALESCE(r.valid_until, $3::timestamptz),
                metadata = r.metadata || $4::jsonb,
                updated_at = $3
          WHERE r.vault_id = $1
            AND r.status = 'active'
            AND r.id IN (
              SELECT relation_id FROM memory_relation_evidence
                WHERE vault_id = $1 AND item_id = $2
            )`,
        [
          input.vaultId,
          input.itemId,
          now,
          JSON.stringify({
            invalidation_reason: `lifecycle:${input.action}:${input.itemId}`,
            invalidated_at: now
          })
        ]
      );

      // Soft-delete-by-association marker on the evidence rows themselves so
      // graph readers can identify why a relation went away. We don't drop
      // evidence rows: tests assert auditability of the propagation.
      const evidenceResult = await client.query(
        `UPDATE memory_relation_evidence
            SET confidence = LEAST(confidence, 0.0)
          WHERE vault_id = $1 AND item_id = $2`,
        [input.vaultId, input.itemId]
      );

      // Embeddings carry no lifecycle column, so a redact/delete that left
      // them in place would still let pgvector ANN surface the deleted item
      // semantically. Drop them in the same transaction.
      const embeddingsResult = await client.query(
        `DELETE FROM memory_embeddings_v12
          WHERE vault_id = $1 AND item_id = $2`,
        [input.vaultId, input.itemId]
      );

      // Wiki pages cite source items in a JSONB text array. Any active page
      // whose `source_item_ids` contains this item must be marked stale so
      // recall does not return a high-confidence summary built on a now
      // dead/redacted source. Pages are not deleted — keeping the row
      // preserves audit + manual repair.
      const wikiResult = await client.query(
        `UPDATE memory_wiki_pages
            SET status = 'stale',
                updated_at = $3
          WHERE vault_id = $1
            AND status = 'active'
            AND source_item_ids @> jsonb_build_array($2::text)`,
        [input.vaultId, input.itemId, now]
      );

      await client.query("COMMIT");
      return {
        itemId: input.itemId,
        status,
        relationsInvalidated: typeof relationResult.rowCount === "number" ? relationResult.rowCount : 0,
        evidenceMarked: typeof evidenceResult.rowCount === "number" ? evidenceResult.rowCount : 0,
        embeddingsRemoved: typeof embeddingsResult.rowCount === "number" ? embeddingsResult.rowCount : 0,
        wikiPagesMarked: typeof wikiResult.rowCount === "number" ? wikiResult.rowCount : 0
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

function lifecycleActionToItemStatus(action: MarkItemLifecycleV12Action): MemoryItemV12Status {
  switch (action) {
    case "delete":
      return "deleted";
    case "redact":
      return "redacted";
    case "supersede":
      return "superseded";
  }
}

function rowToRelation(row: Record<string, unknown>): MemoryRelationV12Record {
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    sourceEntityId: String(row.source_entity_id),
    targetEntityId: String(row.target_entity_id),
    relationType: String(row.relation_type),
    fact: String(row.fact),
    status: (String(row.status) as MemoryRelationV12Status) ?? "active",
    confidence: Number(row.confidence ?? 0),
    validFrom: (row.valid_from as string | null) ?? null,
    validUntil: (row.valid_until as string | null) ?? null,
    invalidatedBy: (row.invalidated_by as string | null) ?? null,
    metadata: parseJsonObject(row.metadata),
    createdAt: (row.created_at as string | undefined) ?? undefined,
    updatedAt: (row.updated_at as string | undefined) ?? undefined
  };
}

function rowToRelationEvidence(row: Record<string, unknown>): MemoryRelationEvidenceV12Record {
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    relationId: String(row.relation_id),
    itemId: String(row.item_id),
    episodeId: (row.episode_id as string | null) ?? null,
    evidenceText: String(row.evidence_text),
    confidence: Number(row.confidence ?? 0),
    createdAt: (row.created_at as string | undefined) ?? undefined
  };
}

function rowToHydration(row: Record<string, unknown>): MemoryV12Hydration {
  const episodeIds = parseJsonArray(row.episode_ids).filter((v): v is string => typeof v === "string");
  const chunkIds = parseJsonArray(row.chunk_ids).filter((v): v is string => typeof v === "string");
  const riskTags = parseJsonArray(row.risk_tags).filter((v): v is string => typeof v === "string");
  return {
    itemId: String(row.item_id),
    vaultId: String(row.vault_id),
    projectId: (row.project_id as string | null) ?? null,
    memoryType: String(row.memory_type),
    content: String(row.content),
    status: String(row.status) as MemoryItemV12Status,
    confidence: Number(row.confidence ?? 0),
    importance: Number(row.importance ?? 0),
    validFrom: (row.valid_from as string | null) ?? null,
    validUntil: (row.valid_until as string | null) ?? null,
    supersededBy: (row.superseded_by as string | null) ?? null,
    riskTags,
    sourceRefs: parseJsonArray(row.source_refs),
    metadata: parseJsonObject(row.metadata),
    episodeIds,
    chunkIds
  };
}

// ---------------------------------------------------------------------------
// In-memory implementation — used by tests and local-only dev paths.
// Lifecycle filters and rich SQL behaviour belong on the Postgres path; this
// implementation is deliberately minimal but covers the v12 store contract.
// ---------------------------------------------------------------------------

export class InMemoryMemoryStoreV12 implements MemoryStoreV12 {
  private readonly episodes = new Map<string, MemoryEpisodeV12Record>();
  private readonly items = new Map<string, MemoryItemV12Record>();
  private readonly chunksByItem = new Map<string, MemoryChunkV12Record[]>();
  private readonly embeddings = new Map<string, MemoryEmbeddingV12Record>();
  private readonly traces = new Map<string, RecallTraceV12Input>();
  private readonly entities = new Map<string, MemoryEntityV12Record>();
  private readonly entityMentions = new Map<string, MemoryEntityMentionV12Record>();
  private readonly relations = new Map<string, MemoryRelationV12Record>();
  private readonly relationEvidence = new Map<string, MemoryRelationEvidenceV12Record>();
  private readonly wikiPages = new Map<string, MemoryWikiPageV12Record>();
  // v1.3 Lane C — sidecar map for the new `wiki_embedding` column. Kept
  // separate so the existing record shape stays narrow and the column can
  // remain NULLable.
  private readonly wikiEmbeddings = new Map<string, number[]>();

  async ready(): Promise<void> {
    return undefined;
  }

  async createMemoryEpisodeV12(record: MemoryEpisodeV12Record): Promise<MemoryEpisodeV12Record> {
    const stored: MemoryEpisodeV12Record = { ...record };
    this.episodes.set(stored.id, stored);
    return stored;
  }

  async createMemoryItemV12(record: MemoryItemV12Record): Promise<MemoryItemV12Record> {
    const created = record.createdAt ?? new Date().toISOString();
    const stored: MemoryItemV12Record = {
      ...record,
      status: record.status ?? "active",
      confidence: record.confidence ?? 0.75,
      importance: record.importance ?? 0.5,
      riskTags: record.riskTags ?? [],
      sourceRefs: record.sourceRefs ?? [],
      metadata: record.metadata ?? {},
      createdAt: created,
      updatedAt: record.updatedAt ?? created
    };
    this.items.set(stored.id, stored);
    return stored;
  }

  async createMemoryChunkV12(record: MemoryChunkV12Record): Promise<MemoryChunkV12Record> {
    const stored: MemoryChunkV12Record = {
      ...record,
      ordinal: record.ordinal ?? 0,
      metadata: record.metadata ?? {}
    };
    const chunks = this.chunksByItem.get(stored.itemId) ?? [];
    const next = [...chunks.filter((existing) => existing.id !== stored.id), stored].sort(
      (a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)
    );
    this.chunksByItem.set(stored.itemId, next);
    return stored;
  }

  async saveMemoryEmbeddingV12(record: MemoryEmbeddingV12Record): Promise<void> {
    this.embeddings.set(record.chunkId, { ...record, embedding: [...record.embedding] });
  }

  async listV12SearchHydrationByIds(
    vaultId: string,
    itemIds: string[],
    scope: MemoryV12HydrationScope = {}
  ): Promise<MemoryV12Hydration[]> {
    if (!vaultId) {
      throw new Error("listV12SearchHydrationByIds requires a vaultId from the authenticated session");
    }
    const projectId = scope.projectId?.trim() ? scope.projectId : null;
    const allowedProjectIds = projectId
      ? null
      : scope.allowedProjectIds && scope.allowedProjectIds.length > 0
        ? scope.allowedProjectIds
        : null;
    return itemIds
      .map((id) => this.items.get(id))
      .filter((item): item is MemoryItemV12Record => item !== undefined && item.vaultId === vaultId)
      .filter((item) => {
        if (projectId) return item.projectId === projectId;
        if (allowedProjectIds && allowedProjectIds.length > 0) {
          return item.projectId !== null && item.projectId !== undefined && allowedProjectIds.includes(item.projectId);
        }
        return true;
      })
      .map((item) => ({
        itemId: item.id,
        vaultId: item.vaultId,
        projectId: item.projectId ?? null,
        memoryType: item.memoryType,
        content: item.content,
        status: (item.status ?? "active") as MemoryItemV12Status,
        confidence: item.confidence ?? 0,
        importance: item.importance ?? 0,
        validFrom: item.validFrom ?? null,
        validUntil: item.validUntil ?? null,
        supersededBy: item.supersededBy ?? null,
        riskTags: [...(item.riskTags ?? [])],
        sourceRefs: [...(item.sourceRefs ?? [])],
        metadata: { ...(item.metadata ?? {}) },
        episodeIds: item.episodeId ? [item.episodeId] : [],
        chunkIds: (this.chunksByItem.get(item.id) ?? []).map((chunk) => chunk.id)
      }));
  }

  async recordRecallTraceV12(input: RecallTraceV12Input): Promise<void> {
    this.traces.set(input.id, {
      ...input,
      items: input.items.map((item) => ({ ...item }))
    });
  }

  async upsertEntityV12(record: MemoryEntityV12Record): Promise<MemoryEntityV12Record> {
    if (!record.vaultId) {
      throw new Error("upsertEntityV12 requires a vaultId from the authenticated session");
    }
    const now = new Date().toISOString();
    const existing = this.entities.get(record.id);
    const aliases = record.aliases ?? [];
    const merged: MemoryEntityV12Record = existing && existing.vaultId === record.vaultId
      ? {
          ...existing,
          name: record.name,
          canonicalName: record.canonicalName,
          entityType: record.entityType,
          aliases: Array.from(new Set([...(existing.aliases ?? []), ...aliases])),
          confidence: Math.max(existing.confidence ?? 0, record.confidence ?? 0.75),
          firstSeenAt: existing.firstSeenAt ?? record.firstSeenAt ?? now,
          lastSeenAt: maxDate(existing.lastSeenAt, record.lastSeenAt ?? now),
          metadata: { ...(existing.metadata ?? {}), ...(record.metadata ?? {}) }
        }
      : {
          ...record,
          aliases,
          confidence: record.confidence ?? 0.75,
          firstSeenAt: record.firstSeenAt ?? now,
          lastSeenAt: record.lastSeenAt ?? now,
          metadata: record.metadata ?? {}
        };
    this.entities.set(merged.id, merged);
    return merged;
  }

  async addEntityMentionV12(record: MemoryEntityMentionV12Record): Promise<MemoryEntityMentionV12Record> {
    if (!record.vaultId) {
      throw new Error("addEntityMentionV12 requires a vaultId from the authenticated session");
    }
    if (this.entityMentions.has(record.id)) {
      return this.entityMentions.get(record.id) as MemoryEntityMentionV12Record;
    }
    const stored: MemoryEntityMentionV12Record = {
      ...record,
      confidence: record.confidence ?? 0.75,
      createdAt: record.createdAt ?? new Date().toISOString()
    };
    this.entityMentions.set(stored.id, stored);
    return stored;
  }

  async upsertRelationV12(record: MemoryRelationV12Record): Promise<MemoryRelationV12Record> {
    if (!record.vaultId) {
      throw new Error("upsertRelationV12 requires a vaultId from the authenticated session");
    }
    const now = new Date().toISOString();
    const existing = this.relations.get(record.id);
    const merged: MemoryRelationV12Record = existing && existing.vaultId === record.vaultId
      ? {
          ...existing,
          fact: record.fact,
          confidence: Math.max(existing.confidence ?? 0, record.confidence ?? 0.75),
          metadata: { ...(existing.metadata ?? {}), ...(record.metadata ?? {}) },
          updatedAt: record.updatedAt ?? now
        }
      : {
          ...record,
          status: record.status ?? "active",
          confidence: record.confidence ?? 0.75,
          metadata: record.metadata ?? {},
          createdAt: record.createdAt ?? now,
          updatedAt: record.updatedAt ?? now
        };
    this.relations.set(merged.id, merged);
    return merged;
  }

  async invalidateRelationV12(input: InvalidateRelationV12Input): Promise<void> {
    if (!input.vaultId) {
      throw new Error("invalidateRelationV12 requires a vaultId from the authenticated session");
    }
    const existing = this.relations.get(input.relationId);
    if (!existing || existing.vaultId !== input.vaultId) {
      throw new Error(`relation ${input.relationId} not found in vault ${input.vaultId}`);
    }
    const now = new Date().toISOString();
    const next: MemoryRelationV12Record = {
      ...existing,
      status: input.status ?? "invalidated",
      validUntil: existing.validUntil ?? input.validUntil ?? now,
      invalidatedBy: existing.invalidatedBy ?? input.invalidatedBy ?? null,
      metadata: {
        ...(existing.metadata ?? {}),
        invalidation_reason: input.reason ?? null,
        invalidated_at: now
      },
      updatedAt: now
    };
    this.relations.set(next.id, next);
  }

  async addRelationEvidenceV12(record: MemoryRelationEvidenceV12Record): Promise<MemoryRelationEvidenceV12Record> {
    if (!record.vaultId) {
      throw new Error("addRelationEvidenceV12 requires a vaultId from the authenticated session");
    }
    if (this.relationEvidence.has(record.id)) {
      return this.relationEvidence.get(record.id) as MemoryRelationEvidenceV12Record;
    }
    const stored: MemoryRelationEvidenceV12Record = {
      ...record,
      confidence: record.confidence ?? 0.75,
      createdAt: record.createdAt ?? new Date().toISOString()
    };
    this.relationEvidence.set(stored.id, stored);
    return stored;
  }

  async searchGraphRelationsV12(input: SearchGraphRelationsV12Input): Promise<MemoryRelationV12Record[]> {
    if (!input.vaultId) {
      throw new Error("searchGraphRelationsV12 requires a vaultId from the authenticated session");
    }
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
    const validAt = input.validAt ?? null;
    const validAtMs = validAt ? Date.parse(validAt) : null;
    const sourceFilter = input.sourceEntityIds ? new Set(input.sourceEntityIds) : null;
    const targetFilter = input.targetEntityIds ? new Set(input.targetEntityIds) : null;
    const eitherFilter = input.entityIds ? new Set(input.entityIds) : null;
    const typeFilter = input.relationTypes ? new Set(input.relationTypes) : null;
    const statusFilter = input.statuses ? new Set(input.statuses) : null;

    const matches: MemoryRelationV12Record[] = [];
    for (const relation of this.relations.values()) {
      if (relation.vaultId !== input.vaultId) continue;
      if (sourceFilter && !sourceFilter.has(relation.sourceEntityId)) continue;
      if (targetFilter && !targetFilter.has(relation.targetEntityId)) continue;
      if (eitherFilter && !eitherFilter.has(relation.sourceEntityId) && !eitherFilter.has(relation.targetEntityId)) continue;
      if (typeFilter && !typeFilter.has(relation.relationType)) continue;
      if (statusFilter && !statusFilter.has((relation.status ?? "active") as MemoryRelationV12Status)) continue;
      if (validAtMs !== null) {
        const fromMs = relation.validFrom ? Date.parse(relation.validFrom) : null;
        const untilMs = relation.validUntil ? Date.parse(relation.validUntil) : null;
        if (fromMs !== null && fromMs > validAtMs) continue;
        if (untilMs !== null && untilMs <= validAtMs) continue;
      }
      matches.push({ ...relation, metadata: { ...(relation.metadata ?? {}) } });
    }
    matches.sort((a, b) => {
      const conf = (b.confidence ?? 0) - (a.confidence ?? 0);
      if (conf !== 0) return conf;
      const aTs = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bTs = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bTs - aTs;
    });
    return matches.slice(0, limit);
  }

  async listGraphEvidenceV12(input: ListGraphEvidenceV12Input): Promise<MemoryRelationEvidenceV12Record[]> {
    if (!input.vaultId) {
      throw new Error("listGraphEvidenceV12 requires a vaultId from the authenticated session");
    }
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
    return [...this.relationEvidence.values()]
      .filter((evidence) => evidence.vaultId === input.vaultId && evidence.relationId === input.relationId)
      .sort((a, b) => {
        const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bTs - aTs;
      })
      .slice(0, limit)
      .map((evidence) => ({ ...evidence }));
  }

  async markItemLifecycleV12(input: MarkItemLifecycleV12Input): Promise<MarkItemLifecycleV12Result> {
    if (!input.vaultId) {
      throw new Error("markItemLifecycleV12 requires a vaultId from the authenticated session");
    }
    const item = this.items.get(input.itemId);
    if (!item || item.vaultId !== input.vaultId) {
      throw new Error(`memory item ${input.itemId} not found in vault ${input.vaultId}`);
    }
    if (input.action === "supersede" && !input.supersededBy) {
      throw new Error("markItemLifecycleV12: action='supersede' requires supersededBy");
    }
    const now = input.now ?? new Date().toISOString();
    const status = lifecycleActionToItemStatus(input.action);
    const next: MemoryItemV12Record = {
      ...item,
      status,
      supersededBy: item.supersededBy ?? input.supersededBy ?? null,
      validUntil: status === "active" ? item.validUntil ?? null : item.validUntil ?? now,
      metadata: {
        ...(item.metadata ?? {}),
        lifecycle_action: input.action,
        lifecycle_reason: input.reason ?? null,
        lifecycle_at: now
      },
      updatedAt: now
    };
    this.items.set(next.id, next);

    let relationsInvalidated = 0;
    const relationIdsForItem = new Set<string>();
    for (const ev of this.relationEvidence.values()) {
      if (ev.vaultId === input.vaultId && ev.itemId === input.itemId) {
        relationIdsForItem.add(ev.relationId);
      }
    }
    for (const id of relationIdsForItem) {
      const relation = this.relations.get(id);
      if (!relation || relation.vaultId !== input.vaultId) continue;
      if ((relation.status ?? "active") !== "active") continue;
      this.relations.set(id, {
        ...relation,
        status: "invalidated",
        validUntil: relation.validUntil ?? now,
        metadata: {
          ...(relation.metadata ?? {}),
          invalidation_reason: `lifecycle:${input.action}:${input.itemId}`,
          invalidated_at: now
        },
        updatedAt: now
      });
      relationsInvalidated += 1;
    }

    let evidenceMarked = 0;
    for (const [id, ev] of this.relationEvidence) {
      if (ev.vaultId === input.vaultId && ev.itemId === input.itemId) {
        this.relationEvidence.set(id, { ...ev, confidence: 0 });
        evidenceMarked += 1;
      }
    }

    let embeddingsRemoved = 0;
    for (const [chunkId, em] of this.embeddings) {
      if (em.vaultId === input.vaultId && em.itemId === input.itemId) {
        this.embeddings.delete(chunkId);
        embeddingsRemoved += 1;
      }
    }

    let wikiPagesMarked = 0;
    for (const [pageId, page] of this.wikiPages) {
      if (page.vaultId !== input.vaultId) continue;
      const pageStatus = page.status ?? "active";
      if (pageStatus !== "active") continue;
      if (!page.sourceItemIds.includes(input.itemId)) continue;
      this.wikiPages.set(pageId, { ...page, status: "stale", updatedAt: now });
      wikiPagesMarked += 1;
    }

    return {
      itemId: input.itemId,
      status,
      relationsInvalidated,
      evidenceMarked,
      embeddingsRemoved,
      wikiPagesMarked
    };
  }

  // Test helpers — seed and inspect wiki pages so propagation tests can
  // assert that B-3 invalidation reaches the wiki layer in addition to graph
  // and embeddings.
  async createMemoryWikiPageV12(record: MemoryWikiPageV12Record): Promise<MemoryWikiPageV12Record> {
    if (!record.vaultId) {
      throw new Error("createMemoryWikiPageV12 requires a vaultId from the authenticated session");
    }
    const created = record.createdAt ?? new Date().toISOString();
    const stored: MemoryWikiPageV12Record = {
      ...record,
      confidence: record.confidence ?? 0.75,
      sourceItemIds: [...(record.sourceItemIds ?? [])],
      entityIds: [...(record.entityIds ?? [])],
      status: record.status ?? "active",
      generatedBy: record.generatedBy ?? "wiki-compiler-v12",
      createdAt: created,
      updatedAt: record.updatedAt ?? created
    };
    this.wikiPages.set(stored.id, stored);
    return stored;
  }

  // v1.3 Lane C — narrow read/write helpers used by WikiCompilerV13. These
  // intentionally mirror the WikiCompilerStoreV13 surface so InMemory tests
  // can drive the compiler without a separate adapter layer.
  async getEntityV12(vaultId: string, entityId: string): Promise<MemoryEntityV12Record | undefined> {
    if (!vaultId) {
      throw new Error("getEntityV12 requires a vaultId from the authenticated session");
    }
    const entity = this.entities.get(entityId);
    if (!entity || entity.vaultId !== vaultId) return undefined;
    return { ...entity, aliases: [...(entity.aliases ?? [])], metadata: { ...(entity.metadata ?? {}) } };
  }

  async listRelationsForEntityV13(vaultId: string, entityId: string): Promise<MemoryRelationV12Record[]> {
    if (!vaultId) {
      throw new Error("listRelationsForEntityV13 requires a vaultId from the authenticated session");
    }
    const out: MemoryRelationV12Record[] = [];
    for (const relation of this.relations.values()) {
      if (relation.vaultId !== vaultId) continue;
      if (relation.sourceEntityId !== entityId && relation.targetEntityId !== entityId) continue;
      out.push({ ...relation, metadata: { ...(relation.metadata ?? {}) } });
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  async listEvidenceForRelationV13(vaultId: string, relationId: string): Promise<MemoryRelationEvidenceV12Record[]> {
    if (!vaultId) {
      throw new Error("listEvidenceForRelationV13 requires a vaultId from the authenticated session");
    }
    return [...this.relationEvidence.values()]
      .filter((ev) => ev.vaultId === vaultId && ev.relationId === relationId)
      .map((ev) => ({ ...ev }));
  }

  async getWikiPageV13(vaultId: string, pageId: string): Promise<MemoryWikiPageV12Record | undefined> {
    if (!vaultId) {
      throw new Error("getWikiPageV13 requires a vaultId from the authenticated session");
    }
    const page = this.wikiPages.get(pageId);
    if (!page || page.vaultId !== vaultId) return undefined;
    return {
      ...page,
      sourceItemIds: [...(page.sourceItemIds ?? [])],
      entityIds: [...(page.entityIds ?? [])]
    };
  }

  async upsertWikiPageV13(record: MemoryWikiPageV12Record & { wikiEmbedding?: number[] | null }): Promise<MemoryWikiPageV12Record> {
    if (!record.vaultId) {
      throw new Error("upsertWikiPageV13 requires a vaultId from the authenticated session");
    }
    const existing = this.wikiPages.get(record.id);
    const created = existing?.createdAt ?? record.createdAt ?? new Date().toISOString();
    const stored: MemoryWikiPageV12Record = {
      ...record,
      confidence: record.confidence ?? 0.75,
      sourceItemIds: [...(record.sourceItemIds ?? [])],
      entityIds: [...(record.entityIds ?? [])],
      status: record.status ?? "active",
      generatedBy: record.generatedBy ?? "wiki-compiler-v13",
      createdAt: created,
      updatedAt: record.updatedAt ?? new Date().toISOString()
    };
    if (record.wikiEmbedding && Array.isArray(record.wikiEmbedding)) {
      this.wikiEmbeddings.set(stored.id, [...record.wikiEmbedding]);
    } else if (record.wikiEmbedding === null) {
      this.wikiEmbeddings.delete(stored.id);
    }
    this.wikiPages.set(stored.id, stored);
    return { ...stored };
  }

  async setWikiPageStatusV13(vaultId: string, pageId: string, status: MemoryWikiPageV12Status, updatedAt: string): Promise<void> {
    if (!vaultId) {
      throw new Error("setWikiPageStatusV13 requires a vaultId from the authenticated session");
    }
    const existing = this.wikiPages.get(pageId);
    if (!existing || existing.vaultId !== vaultId) return;
    this.wikiPages.set(pageId, { ...existing, status, updatedAt });
  }

  /** Test helper — inspect the wiki embedding (1024-dim vector) by page id. */
  inspectWikiEmbedding(pageId: string): number[] | undefined {
    const v = this.wikiEmbeddings.get(pageId);
    return v ? [...v] : undefined;
  }

  inspectWikiPage(id: string): MemoryWikiPageV12Record | undefined {
    return this.wikiPages.get(id);
  }

  inspectEmbedding(chunkId: string): MemoryEmbeddingV12Record | undefined {
    return this.embeddings.get(chunkId);
  }

  countEmbeddingsForItem(vaultId: string, itemId: string): number {
    let n = 0;
    for (const em of this.embeddings.values()) {
      if (em.vaultId === vaultId && em.itemId === itemId) n += 1;
    }
    return n;
  }

  // Test helpers — InMemory only.
  inspectTrace(id: string): RecallTraceV12Input | undefined {
    return this.traces.get(id);
  }

  countItems(): number {
    return this.items.size;
  }

  inspectEntity(id: string): MemoryEntityV12Record | undefined {
    return this.entities.get(id);
  }

  inspectRelation(id: string): MemoryRelationV12Record | undefined {
    return this.relations.get(id);
  }

  countEntities(): number {
    return this.entities.size;
  }

  countRelations(): number {
    return this.relations.size;
  }
}

function maxDate(a?: string | null, b?: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

// PoolClient is exported so test fakes can satisfy the tx-aware code path.
export type { PoolClient };
