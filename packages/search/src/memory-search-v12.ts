// Lore Context v1.2 — Lane B retrieval foundation.
//
// This module owns the v1.2 hybrid retrieval surface that the integration
// lane will mount onto API routes. It deliberately stays self-contained so
// `@lore/search` does not pick up a hard dependency on `pg` or
// `@qdrant/js-client-rest`: callers pass small adapter interfaces instead.
//
// Out of scope (defer per plan review):
//   * ParadeDB (FTS_DRIVER=paradedb) — native Postgres FTS only.
//   * Remote cross-encoder reranker — only the type seam is exposed.
//   * Wiki / graph / temporal stream providers — Lane C owns those.
//
// Security invariants enforced here:
//   * Every read path takes an authenticated `vaultId`; missing vault
//     scoping throws and tests cover the cross-vault leak path.
//   * SQL is parameterised — query terms and vectors never get concatenated
//     into the statement text.
//   * Lifecycle filters (status, valid_from / valid_until, superseded_by)
//     are applied at the SQL boundary so excluded rows never enter fusion.

import type {
  QdrantClientLike,
  QdrantFilter,
  QdrantMustCondition,
  QdrantScoredPoint
} from "./memory-search.js";
import {
  filterQdrantPointsBySystemTime,
  resolveSystemTimeParam
} from "./temporal-system-time-filter.js";

// ---------------------------------------------------------------------------
// v1.2 stream + hit shape (plan §7.1).
// ---------------------------------------------------------------------------

// v1.3 Lane B BREAKING CHANGE (plan §3 Lane B item 4):
// `reranker` is removed from the stream union — the reranker is now a
// post-fusion replacer, not a candidate-emitting stream contributor.
// On/off is signaled per-request via `MemorySearchInputV12.rerank?: boolean`.
export type MemorySearchStreamKindV12 =
  | "qdrant_dense"
  | "qdrant_sparse"
  | "postgres_fts"
  | "postgres_pgvector"
  | "graph"
  | "temporal"
  | "wiki";

export interface MemorySearchStreamMetadataV12 {
  rank: number;
  score: number;
  backend: string;
  reason?: string;
  path?: string[];
}

export interface MemorySearchHitLifecycleV12 {
  status: string;
  validFrom?: string | null;
  validUntil?: string | null;
  supersededBy?: string | null;
}

export interface MemorySearchHitProvenanceV12 {
  episodeIds: string[];
  sourceRefs: unknown[];
  relationIds?: string[];
  wikiPageIds?: string[];
}

export interface MemorySearchHitV12 {
  itemId: string;
  chunkId?: string;
  score: number;
  /** Internal candidate text for post-fusion rerankers; API hydration owns response content. */
  text?: string;
  streams: Partial<Record<MemorySearchStreamKindV12, MemorySearchStreamMetadataV12>>;
  lifecycle: MemorySearchHitLifecycleV12;
  provenance: MemorySearchHitProvenanceV12;
}

export interface MemorySearchInputV12 {
  query: string;
  vaultId: string;
  projectId?: string;
  allowedProjectIds?: string[];
  status?: string[];
  /** ISO-8601 timestamp; defaults to "now" when omitted. */
  validAt?: string;
  /** ISO-8601 system timestamp for bi-temporal "what the system knew then" filtering. */
  asOfSystemTime?: string;
  candidateLimit?: number;
  finalLimit?: number;
  /** When set, vectors are produced by this fn for the pgvector / dense streams. */
  embeddingFn?: (text: string) => Promise<number[]>;
  /**
   * v1.3 Lane B: per-request stream selection. When unset, the orchestrator
   * uses the installation default (env LORE_STREAMS_ENABLED). When set, the
   * orchestrator runs the intersection of the request and installation
   * defaults so `provenance.streams` only lists streams that actually ran.
   */
  streams?: MemorySearchStreamKindV12[];
  /**
   * v1.3 Lane B: post-fusion reranker on/off (plan §3 Lane B item 4).
   * When `true` AND a `RerankerProvider` is configured on the orchestrator,
   * the reranker takes the top-N fused candidates and returns reranked top-K.
   * Default: false; installation default may be flipped via LORE_RERANKER_ENABLED.
   */
  rerank?: boolean;
  /**
   * v1.4 Lane B Phase 1.7: optional per-stream event hook for diagnostics.
   * When provided, the orchestrator calls this once per stream after it
   * completes (ok / failed / timed_out). The handler must be synchronous
   * and allocation-light — it runs on the hot search path.
   * Default: undefined (no-op; the orchestrator falls back to its own hook).
   */
  onStreamEvent?: (event: import("./orchestrator-v12.js").StreamEvent) => void;
}

// Default to active+confirmed, mirroring the v1.1 Qdrant provider.
const DEFAULT_ACTIVE_STATUSES = ["active", "confirmed"] as const;

// k=60 is the canonical RRF damping constant used across the v1.x stack.
export const DEFAULT_RRF_K = 60;
export const DEFAULT_CANDIDATE_LIMIT = 80;
export const DEFAULT_FINAL_LIMIT = 12;

// ---------------------------------------------------------------------------
// Weighted Reciprocal Rank Fusion.
//
// score(item) = Σ_stream weight_stream / (k + rank_stream + 1)
//
// `rank_stream` is 0-indexed, so the top-1 candidate of a stream contributes
// `weight / (k + 1)`. Items that appear in multiple streams sum their
// contributions, which is what gives multi-stream evidence its boost.
// ---------------------------------------------------------------------------

export interface WeightedRRFCandidate {
  itemId: string;
  chunkId?: string;
  score: number;
  /** Optional source text carried only far enough for the post-fusion reranker. */
  text?: string;
}

export interface WeightedRRFStream {
  kind: MemorySearchStreamKindV12;
  backend: string;
  weight: number;
  candidates: WeightedRRFCandidate[];
}

export interface WeightedRRFInput {
  streams: WeightedRRFStream[];
  k?: number;
  limit?: number;
  /** Optional per-item lifecycle metadata to attach to the resulting hit. */
  lifecycleByItem?: Map<string, MemorySearchHitLifecycleV12>;
  /** Optional per-item provenance metadata to attach to the resulting hit. */
  provenanceByItem?: Map<string, MemorySearchHitProvenanceV12>;
}

// v1.3 Lane B BREAKING CHANGE (plan §3 Lane B item 4):
// `reranker: 1.0` removed — reranker is no longer a fusion stream.
export const DEFAULT_STREAM_WEIGHTS: Record<MemorySearchStreamKindV12, number> = {
  qdrant_dense: 1.0,
  qdrant_sparse: 1.0,
  postgres_fts: 1.1,
  postgres_pgvector: 0.85,
  graph: 0.9,
  temporal: 0.75,
  wiki: 0.65
};

/** Frozen list of the seven candidate-emitting streams in canonical order. */
export const ALL_STREAM_KINDS_V12: ReadonlyArray<MemorySearchStreamKindV12> = Object.freeze([
  "qdrant_dense",
  "qdrant_sparse",
  "postgres_fts",
  "postgres_pgvector",
  "graph",
  "temporal",
  "wiki"
]);

export function fuseWeightedRRF(input: WeightedRRFInput): MemorySearchHitV12[] {
  const k = input.k ?? DEFAULT_RRF_K;
  const limit = input.limit ?? DEFAULT_FINAL_LIMIT;

  type Entry = {
    itemId: string;
    chunkId?: string;
    fusedScore: number;
    text?: string;
    streams: Partial<Record<MemorySearchStreamKindV12, MemorySearchStreamMetadataV12>>;
  };

  const byItem = new Map<string, Entry>();

  for (const stream of input.streams) {
    if (stream.weight <= 0 || stream.candidates.length === 0) {
      continue;
    }
    // Track first-seen rank within this stream so duplicate chunks of the
    // same item don't double-credit a single stream.
    const seenInStream = new Set<string>();
    let rankInStream = 0;
    for (const candidate of stream.candidates) {
      if (seenInStream.has(candidate.itemId)) {
        continue;
      }
      seenInStream.add(candidate.itemId);
      const rank = rankInStream;
      rankInStream += 1;
      const contribution = stream.weight / (k + rank + 1);
      const existing = byItem.get(candidate.itemId);
      if (existing) {
        existing.fusedScore += contribution;
        existing.streams[stream.kind] = {
          rank,
          score: candidate.score,
          backend: stream.backend
        };
        // Prefer to surface a chunk id when one is present for any stream.
        if (!existing.chunkId && candidate.chunkId) {
          existing.chunkId = candidate.chunkId;
        }
        if (!existing.text && candidate.text?.trim()) {
          existing.text = candidate.text;
        }
      } else {
        byItem.set(candidate.itemId, {
          itemId: candidate.itemId,
          chunkId: candidate.chunkId,
          fusedScore: contribution,
          ...(candidate.text?.trim() ? { text: candidate.text } : {}),
          streams: {
            [stream.kind]: { rank, score: candidate.score, backend: stream.backend }
          }
        });
      }
    }
  }

  const ordered = [...byItem.values()].sort((a, b) => b.fusedScore - a.fusedScore);

  return ordered.slice(0, limit).map((entry) => ({
    itemId: entry.itemId,
    chunkId: entry.chunkId,
    score: entry.fusedScore,
    ...(entry.text ? { text: entry.text } : {}),
    streams: entry.streams,
    lifecycle:
      input.lifecycleByItem?.get(entry.itemId) ?? { status: "active" },
    provenance:
      input.provenanceByItem?.get(entry.itemId) ?? { episodeIds: [], sourceRefs: [] }
  }));
}

// ---------------------------------------------------------------------------
// Reranker provider seam (plan §8.2). v1.2 ships only the type — Lane B
// implements the heuristic provider in a follow-up; remote cross-encoder
// rerankers stay deferred per plan-review §6.
// ---------------------------------------------------------------------------

export interface RerankerCandidate {
  itemId: string;
  chunkId?: string;
  score: number;
  text: string;
  streams: Partial<Record<MemorySearchStreamKindV12, MemorySearchStreamMetadataV12>>;
}

export interface RerankerProvider {
  name: string;
  rerank(input: {
    query: string;
    candidates: RerankerCandidate[];
    limit: number;
  }): Promise<Array<{ itemId: string; chunkId?: string; score: number; reason?: string }>>;
}

// ---------------------------------------------------------------------------
// PoolLike — a minimal `pg.Pool` subset so the search package never needs to
// import `pg`. Every adapter (api worker, dashboard SSR, tests) supplies its
// own implementation.
// ---------------------------------------------------------------------------

export interface PoolQueryResultV12<T = unknown> {
  rows: T[];
}

export interface PoolLikeV12 {
  query<T = unknown>(
    text: string,
    params?: ReadonlyArray<unknown>
  ): Promise<PoolQueryResultV12<T>>;
}

// ---------------------------------------------------------------------------
// Internal helpers.
// ---------------------------------------------------------------------------

export function vectorLiteral(embedding: ReadonlyArray<number>): string {
  if (!Array.isArray(embedding)) {
    throw new TypeError("embedding must be an array of numbers");
  }
  if (embedding.length === 0) {
    throw new RangeError("embedding must be non-empty");
  }
  // pgvector accepts the `[a,b,c]` literal form via parameterised text input.
  return `[${embedding
    .map((value) => {
      if (!Number.isFinite(value)) {
        throw new RangeError("embedding contains non-finite value");
      }
      return Number(value).toString();
    })
    .join(",")}]`;
}

function resolveStatuses(input: MemorySearchInputV12): readonly string[] {
  return input.status && input.status.length > 0 ? input.status : DEFAULT_ACTIVE_STATUSES;
}

export function ensureVaultScoped(input: MemorySearchInputV12): void {
  if (typeof input.vaultId !== "string" || input.vaultId.length === 0) {
    throw new Error(
      "MemorySearchInputV12.vaultId is required — every v12 retrieval read must be vault-scoped"
    );
  }
}

// ---------------------------------------------------------------------------
// Postgres FTS + pgvector hybrid provider (plan §7.2).
// ---------------------------------------------------------------------------

export const POSTGRES_FTS_SQL = `\
SELECT
  i.id AS item_id,
  c.id AS chunk_id,
  c.chunk_text AS text,
  ts_rank_cd(
    to_tsvector('simple', c.chunk_text),
    websearch_to_tsquery('simple', $1)
  ) AS score,
  i.status AS status,
  i.valid_from AS valid_from,
  i.valid_until AS valid_until,
  i.t_created AS t_created,
  i.t_expired AS t_expired,
  i.superseded_by AS superseded_by
FROM memory_chunks c
JOIN memory_items i
  ON i.id = c.item_id
 AND i.vault_id = c.vault_id
WHERE c.vault_id = $2
  AND i.vault_id = $2
  AND i.status = ANY($3::text[])
  AND i.superseded_by IS NULL
  AND ($4::timestamptz IS NULL OR i.valid_from IS NULL OR i.valid_from <= $4::timestamptz)
  AND ($4::timestamptz IS NULL OR i.valid_until IS NULL OR i.valid_until >= $4::timestamptz)
  AND ($5::timestamptz IS NULL OR i.t_created <= $5::timestamptz)
  AND ($5::timestamptz IS NULL OR i.t_expired IS NULL OR i.t_expired > $5::timestamptz)
  AND ($6::text IS NULL OR i.project_id = $6)
  AND ($7::text[] IS NULL OR i.project_id = ANY($7::text[]))
  AND to_tsvector('simple', c.chunk_text) @@ websearch_to_tsquery('simple', $1)
ORDER BY score DESC
LIMIT $8`;

export const POSTGRES_PGVECTOR_SQL = `\
SELECT
  i.id AS item_id,
  e.chunk_id AS chunk_id,
  c.chunk_text AS text,
  1 - (e.embedding <=> $1::vector) AS score,
  i.status AS status,
  i.valid_from AS valid_from,
  i.valid_until AS valid_until,
  i.t_created AS t_created,
  i.t_expired AS t_expired,
  i.superseded_by AS superseded_by
FROM memory_embeddings_v12 e
JOIN memory_items i
  ON i.id = e.item_id
 AND i.vault_id = e.vault_id
LEFT JOIN memory_chunks c
  ON c.id = e.chunk_id
 AND c.item_id = e.item_id
 AND c.vault_id = e.vault_id
WHERE e.vault_id = $2
  AND i.status = ANY($3::text[])
  AND i.superseded_by IS NULL
  AND ($4::timestamptz IS NULL OR i.valid_from IS NULL OR i.valid_from <= $4::timestamptz)
  AND ($4::timestamptz IS NULL OR i.valid_until IS NULL OR i.valid_until >= $4::timestamptz)
  AND ($5::timestamptz IS NULL OR i.t_created <= $5::timestamptz)
  AND ($5::timestamptz IS NULL OR i.t_expired IS NULL OR i.t_expired > $5::timestamptz)
  AND ($6::text IS NULL OR i.project_id = $6)
  AND ($7::text[] IS NULL OR i.project_id = ANY($7::text[]))
ORDER BY e.embedding <=> $1::vector ASC
LIMIT $8`;

export interface PostgresHybridMemorySearchProviderConfig {
  pool: PoolLikeV12;
  /** Override default RRF k for tests / tuning. */
  rrfK?: number;
  /** Per-stream RRF weights; defaults to plan §8.1 baselines. */
  weights?: Partial<Record<MemorySearchStreamKindV12, number>>;
  /** Default embedding fn used when input does not provide one. */
  embeddingFn?: (text: string) => Promise<number[]>;
}

interface FtsRow {
  item_id: string;
  chunk_id: string;
  text?: string | null;
  score: number | string;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  t_created?: string | null;
  t_expired?: string | null;
  superseded_by: string | null;
}

interface PgVectorRow extends FtsRow {}

function rowToCandidate(row: FtsRow): WeightedRRFCandidate {
  return {
    itemId: row.item_id,
    chunkId: row.chunk_id,
    score: Number(row.score),
    ...(row.text?.trim() ? { text: row.text } : {})
  };
}

function rowsToLifecycleMap(
  rows: ReadonlyArray<FtsRow>
): Map<string, MemorySearchHitLifecycleV12> {
  const map = new Map<string, MemorySearchHitLifecycleV12>();
  for (const row of rows) {
    if (!map.has(row.item_id)) {
      map.set(row.item_id, {
        status: row.status,
        validFrom: row.valid_from ?? null,
        validUntil: row.valid_until ?? null,
        supersededBy: row.superseded_by ?? null
      });
    }
  }
  return map;
}

function resolveProjectScopeParams(input: MemorySearchInputV12): readonly [string | null, string[] | null] {
  const projectId = input.projectId?.trim() ? input.projectId : null;
  const allowedProjectIds = projectId
    ? null
    : input.allowedProjectIds && input.allowedProjectIds.length > 0
      ? input.allowedProjectIds
      : null;
  return [projectId, allowedProjectIds];
}

export class PostgresHybridMemorySearchProvider {
  readonly name = "postgres-hybrid-v12";

  private readonly pool: PoolLikeV12;
  private readonly rrfK: number;
  private readonly weights: Record<MemorySearchStreamKindV12, number>;
  private readonly defaultEmbeddingFn: ((text: string) => Promise<number[]>) | undefined;

  constructor(config: PostgresHybridMemorySearchProviderConfig) {
    this.pool = config.pool;
    this.rrfK = config.rrfK ?? DEFAULT_RRF_K;
    this.weights = { ...DEFAULT_STREAM_WEIGHTS, ...(config.weights ?? {}) };
    this.defaultEmbeddingFn = config.embeddingFn;
  }

  async search(input: MemorySearchInputV12): Promise<MemorySearchHitV12[]> {
    // v1.3 Lane B (plan §3 Lane B item 2): collapsed into a thin shim over
    // the HybridSearchOrchestrator. There is now exactly one fusion code
    // path in the codebase. Bit-identical determinism is guaranteed when
    // timeouts do not fire and the same stream set is used.
    //
    // Lazy-import the orchestrator to avoid circular module evaluation.
    const { HybridSearchOrchestrator } = await import("./orchestrator-v12.js");
    const ftsStream = createPostgresFtsStreamProvider({
      pool: this.pool,
      weight: this.weights.postgres_fts
    });
    const streamProviders = [ftsStream];
    const embeddingFn = input.embeddingFn ?? this.defaultEmbeddingFn;
    if (embeddingFn) {
      streamProviders.push(
        createPostgresPgVectorStreamProvider({
          pool: this.pool,
          weight: this.weights.postgres_pgvector,
          embeddingFn
        })
      );
    }
    const orchestrator = new HybridSearchOrchestrator({
      providers: streamProviders,
      k: this.rrfK,
      // Disable per-stream timeouts inside the legacy shim so determinism
      // matches the v1.2 fixtures exactly.
      streamTimeoutMs: null,
      onStreamEvent: input.onStreamEvent
    });
    return orchestrator.search(input);
  }
}

// ---------------------------------------------------------------------------
// Postgres stream-provider factories used by the orchestrator and by the
// PostgresHybridMemorySearchProvider shim. They each emit a single stream
// of WeightedRRFCandidate (one for FTS, one for pgvector).
// ---------------------------------------------------------------------------

export interface PostgresFtsStreamProviderConfig {
  pool: PoolLikeV12;
  weight?: number;
}

export interface PostgresPgVectorStreamProviderConfig {
  pool: PoolLikeV12;
  weight?: number;
  embeddingFn: (text: string) => Promise<number[]>;
}

export interface StreamEmitResult {
  candidates: WeightedRRFCandidate[];
  weight: number;
  lifecycleByItem?: Map<string, MemorySearchHitLifecycleV12>;
  provenanceByItem?: Map<string, MemorySearchHitProvenanceV12>;
}

export interface StreamProviderV12 {
  readonly kind: MemorySearchStreamKindV12;
  readonly backend: string;
  emit(input: MemorySearchInputV12): Promise<StreamEmitResult>;
}

export function createPostgresFtsStreamProvider(
  config: PostgresFtsStreamProviderConfig
): StreamProviderV12 {
  const weight = config.weight ?? DEFAULT_STREAM_WEIGHTS.postgres_fts;
  return {
    kind: "postgres_fts",
    backend: "postgres-fts",
    async emit(input) {
      const candidateLimit = input.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
      const statuses = resolveStatuses(input);
      const validAtParam = input.validAt ?? null;
      const systemTimeParam = resolveSystemTimeParam(input);
      const [projectId, allowedProjectIds] = resolveProjectScopeParams(input);
      const params = [
        input.query,
        input.vaultId,
        statuses,
        validAtParam,
        systemTimeParam,
        projectId,
        allowedProjectIds,
        candidateLimit
      ] as const;
      const result = await config.pool.query<FtsRow>(
        POSTGRES_FTS_SQL,
        params as unknown as unknown[]
      );
      return {
        candidates: result.rows.map(rowToCandidate),
        weight,
        lifecycleByItem: rowsToLifecycleMap(result.rows)
      };
    }
  };
}

export function createPostgresPgVectorStreamProvider(
  config: PostgresPgVectorStreamProviderConfig
): StreamProviderV12 {
  const weight = config.weight ?? DEFAULT_STREAM_WEIGHTS.postgres_pgvector;
  return {
    kind: "postgres_pgvector",
    backend: "postgres-pgvector",
    async emit(input) {
      const candidateLimit = input.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
      const statuses = resolveStatuses(input);
      const validAtParam = input.validAt ?? null;
      const systemTimeParam = resolveSystemTimeParam(input);
      const embeddingFn = input.embeddingFn ?? config.embeddingFn;
      const vector = await embeddingFn(input.query);
      const literal = vectorLiteral(vector);
      const [projectId, allowedProjectIds] = resolveProjectScopeParams(input);
      const params = [
        literal,
        input.vaultId,
        statuses,
        validAtParam,
        systemTimeParam,
        projectId,
        allowedProjectIds,
        candidateLimit
      ] as const;
      const result = await config.pool.query<PgVectorRow>(
        POSTGRES_PGVECTOR_SQL,
        params as unknown as unknown[]
      );
      return {
        candidates: result.rows.map(rowToCandidate),
        weight,
        lifecycleByItem: rowsToLifecycleMap(result.rows)
      };
    }
  };
}

// ---------------------------------------------------------------------------
// Qdrant v12 hybrid provider (plan §7.3).
//
// The default collection is `lore_memories_v12`; payloads expose item_id and
// chunk_id (instead of the v1.1 memory_id). When the supplied client
// implements `queryFused` (Qdrant >=1.10 Query API with prefetch + fusion
// rrf), we route there; otherwise the provider runs dense + sparse in
// parallel and applies local RRF, matching the v1.1 fallback shape.
// ---------------------------------------------------------------------------

export const QDRANT_V12_COLLECTION_DEFAULT = "lore_memories_v12";
export const QDRANT_V12_DENSE_VECTOR_NAME = "dense_qwen3_1024";
export const QDRANT_V12_SPARSE_VECTOR_NAME = "sparse_bm25";

export interface QdrantHybridMemorySearchProviderV12Config {
  client: QdrantClientLike;
  collection?: string;
  embeddingFn?: (text: string) => Promise<number[]>;
  sparseVectorizerFn?: (text: string) => Promise<{ indices: number[]; values: number[] }>;
  embeddingModel?: string;
  rrfK?: number;
  weights?: Partial<Record<MemorySearchStreamKindV12, number>>;
  /**
   * Override native-fusion behaviour for this instance. When omitted the
   * value is read from `LORE_QDRANT_NATIVE_FUSION` env at search() time.
   * Default (env absent / not "0"): true (Qdrant >=1.10 Query API).
   * Set to false or `LORE_QDRANT_NATIVE_FUSION=0` to revert to local RRF.
   */
  useNativeFusion?: boolean;
  /** Inject process.env for testing; defaults to process.env. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Read the LORE_QDRANT_NATIVE_FUSION env flag.
 * Default: true (native fusion ON). Set to "0" to disable.
 */
export function resolveNativeFusionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.LORE_QDRANT_NATIVE_FUSION !== "0";
}

function buildV12Filter(input: MemorySearchInputV12): QdrantFilter {
  const must: QdrantMustCondition[] = [];

  // vault_id is mandatory (security invariant — see ensureVaultScoped).
  must.push({ key: "vault_id", match: { value: input.vaultId } });

  if (input.projectId) {
    must.push({ key: "project_id", match: { value: input.projectId } });
  } else if (input.allowedProjectIds && input.allowedProjectIds.length > 0) {
    must.push({ key: "project_id", match: { any: input.allowedProjectIds } });
  }

  const statuses = resolveStatuses(input) as readonly string[];
  must.push({ key: "status", match: { any: [...statuses] } });

  if (input.validAt) {
    // valid_until >= validAt — items with no expiry pass via Qdrant payload
    // sentinel value "infinity" or by omitting valid_until at write time.
    must.push({ key: "valid_until", range: { gte: input.validAt } });
  }

  if (input.asOfSystemTime) {
    must.push({ key: "t_created", range: { lte: input.asOfSystemTime } });
  }

  return { must };
}

interface NormalisedQdrantPoint {
  itemId: string;
  chunkId?: string;
  score: number;
  payload: Record<string, unknown> | undefined;
}

function normalisePoint(point: QdrantScoredPoint): NormalisedQdrantPoint {
  const payload = point.payload;
  const itemIdFromPayload =
    typeof payload?.item_id === "string" ? (payload.item_id as string) : undefined;
  const chunkIdFromPayload =
    typeof payload?.chunk_id === "string" ? (payload.chunk_id as string) : undefined;
  return {
    itemId: itemIdFromPayload ?? String(point.id),
    chunkId: chunkIdFromPayload,
    score: Number(point.score ?? 0),
    payload
  };
}

function pointsToCandidates(
  points: ReadonlyArray<QdrantScoredPoint>
): WeightedRRFCandidate[] {
  return points.map((p) => {
    const norm = normalisePoint(p);
    const text = qdrantPayloadText(norm.payload);
    return {
      itemId: norm.itemId,
      chunkId: norm.chunkId,
      score: norm.score,
      ...(text ? { text } : {})
    };
  });
}

function qdrantPayloadText(payload: Record<string, unknown> | undefined): string | undefined {
  if (!payload) return undefined;
  for (const key of ["text", "chunk_text", "content", "body"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

export class QdrantHybridMemorySearchProviderV12 {
  readonly name = "qdrant-hybrid-v12";

  private readonly client: QdrantClientLike;
  private readonly collection: string;
  private readonly embeddingFn: ((text: string) => Promise<number[]>) | undefined;
  private readonly sparseVectorizerFn:
    | ((text: string) => Promise<{ indices: number[]; values: number[] }>)
    | undefined;
  private readonly embeddingModel: string;
  private readonly rrfK: number;
  private readonly weights: Record<MemorySearchStreamKindV12, number>;
  private readonly useNativeFusion: boolean | undefined;
  private readonly env: NodeJS.ProcessEnv;

  constructor(config: QdrantHybridMemorySearchProviderV12Config) {
    this.client = config.client;
    this.collection = config.collection ?? QDRANT_V12_COLLECTION_DEFAULT;
    this.embeddingFn = config.embeddingFn;
    this.sparseVectorizerFn = config.sparseVectorizerFn;
    this.embeddingModel = config.embeddingModel ?? "Qwen/Qwen3-Embedding-0.6B";
    this.rrfK = config.rrfK ?? DEFAULT_RRF_K;
    this.weights = { ...DEFAULT_STREAM_WEIGHTS, ...(config.weights ?? {}) };
    this.useNativeFusion = config.useNativeFusion;
    this.env = config.env ?? process.env;
  }

  async search(input: MemorySearchInputV12): Promise<MemorySearchHitV12[]> {
    // v1.3 Lane B (plan §3 Lane B item 2): collapsed into a thin shim over
    // the HybridSearchOrchestrator. The Qdrant Query API native-fusion fast
    // path is preserved as a Qdrant-specific optimisation and is *not* an
    // additional RRF code path — fusion via Qdrant's Query API is server-side.
    ensureVaultScoped(input);

    const candidateLimit = input.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
    const finalLimit = input.finalLimit ?? DEFAULT_FINAL_LIMIT;
    const filter = buildV12Filter(input);
    const embeddingFn = input.embeddingFn ?? this.embeddingFn;

    // First gather dense + sparse parallel results (used either for native
    // fusion stream-metadata, or as the orchestrator's stream emissions).
    const [denseResults, sparseResults] = await Promise.all([
      embeddingFn
        ? embeddingFn(input.query).then((vec) =>
            this.client.searchDense(
              this.collection,
              QDRANT_V12_DENSE_VECTOR_NAME,
              vec,
              filter,
              candidateLimit
            )
          )
        : Promise.resolve([] as QdrantScoredPoint[]),
      this.sparseVectorizerFn
        ? this.sparseVectorizerFn(input.query).then((sv) =>
            this.client.searchSparse(
              this.collection,
              QDRANT_V12_SPARSE_VECTOR_NAME,
              sv,
              filter,
              candidateLimit
            )
          )
        : Promise.resolve([] as QdrantScoredPoint[])
    ]);
    const systemTime = resolveSystemTimeParam(input);
    const filteredDenseResults = filterQdrantPointsBySystemTime(denseResults, systemTime);
    const filteredSparseResults = filterQdrantPointsBySystemTime(sparseResults, systemTime);

    // Native fusion fast path — enabled by default (Qdrant >=1.10 Query API).
    // Disable via LORE_QDRANT_NATIVE_FUSION=0 or config.useNativeFusion=false.
    const nativeFusionEnabled =
      this.useNativeFusion !== undefined
        ? this.useNativeFusion
        : resolveNativeFusionEnabled(this.env);
    if (!systemTime && nativeFusionEnabled && this.client.queryFused && embeddingFn && this.sparseVectorizerFn) {
      try {
        const [queryVec, sparseVec] = await Promise.all([
          embeddingFn(input.query),
          this.sparseVectorizerFn(input.query)
        ]);
        const fusedNativePoints = await this.client.queryFused(
          this.collection,
          QDRANT_V12_DENSE_VECTOR_NAME,
          queryVec,
          QDRANT_V12_SPARSE_VECTOR_NAME,
          sparseVec,
          filter,
          candidateLimit
        );
        return this.assembleNativeFusionHits(
          fusedNativePoints,
          filteredDenseResults,
          filteredSparseResults,
          finalLimit
        );
      } catch {
        // Fall through to the orchestrator-mediated local-RRF path (B-14).
      }
    }

    // Local-RRF path via the orchestrator — single fusion code path.
    const { HybridSearchOrchestrator } = await import("./orchestrator-v12.js");
    const providers: StreamProviderV12[] = [];
    if (embeddingFn) {
      providers.push(
        createPrecomputedQdrantStreamProvider({
          kind: "qdrant_dense",
          backend: this.embeddingModel,
          weight: this.weights.qdrant_dense,
          points: filteredDenseResults
        })
      );
    }
    if (this.sparseVectorizerFn) {
      providers.push(
        createPrecomputedQdrantStreamProvider({
          kind: "qdrant_sparse",
          backend: "qdrant/bm25",
          weight: this.weights.qdrant_sparse,
          points: filteredSparseResults
        })
      );
    }
    const orchestrator = new HybridSearchOrchestrator({
      providers,
      k: this.rrfK,
      streamTimeoutMs: null,
      onStreamEvent: input.onStreamEvent
    });
    return orchestrator.search(input);
  }

  private assembleNativeFusionHits(
    fusedPoints: ReadonlyArray<QdrantScoredPoint>,
    denseResults: ReadonlyArray<QdrantScoredPoint>,
    sparseResults: ReadonlyArray<QdrantScoredPoint>,
    finalLimit: number
  ): MemorySearchHitV12[] {
    const denseIndex = new Map<string, { rank: number; score: number }>();
    const sparseIndex = new Map<string, { rank: number; score: number }>();
    denseResults.forEach((p, rank) => {
      const key = normalisePoint(p).itemId;
      if (!denseIndex.has(key)) {
        denseIndex.set(key, { rank, score: Number(p.score ?? 0) });
      }
    });
    sparseResults.forEach((p, rank) => {
      const key = normalisePoint(p).itemId;
      if (!sparseIndex.has(key)) {
        sparseIndex.set(key, { rank, score: Number(p.score ?? 0) });
      }
    });

    const seen = new Set<string>();
    const hits: MemorySearchHitV12[] = [];
    for (let i = 0; i < fusedPoints.length && hits.length < finalLimit; i += 1) {
      const norm = normalisePoint(fusedPoints[i]);
      if (seen.has(norm.itemId)) continue;
      seen.add(norm.itemId);

      const streams: Partial<Record<MemorySearchStreamKindV12, MemorySearchStreamMetadataV12>> = {};
      const denseHit = denseIndex.get(norm.itemId);
      if (denseHit) {
        streams.qdrant_dense = {
          rank: denseHit.rank,
          score: denseHit.score,
          backend: this.embeddingModel
        };
      }
      const sparseHit = sparseIndex.get(norm.itemId);
      if (sparseHit) {
        streams.qdrant_sparse = {
          rank: sparseHit.rank,
          score: sparseHit.score,
          backend: "qdrant/bm25"
        };
      }
      // If the fused result is the only signal (e.g. dense or sparse-only on
      // an older client), still record the dense stream so the trace can
      // explain the hit.
      if (!denseHit && !sparseHit) {
        streams.qdrant_dense = {
          rank: i,
          score: norm.score,
          backend: this.embeddingModel,
          reason: "native-rrf"
        };
      }

      hits.push({
        itemId: norm.itemId,
        chunkId: norm.chunkId,
        score: norm.score,
        streams,
        lifecycle: { status: "active" },
        provenance: { episodeIds: [], sourceRefs: [] }
      });
    }
    return hits;
  }
}

// ---------------------------------------------------------------------------
// Qdrant stream-provider factory — wraps already-fetched dense or sparse
// QdrantScoredPoint[] into a StreamProviderV12 the orchestrator consumes.
// Used by the QdrantHybridMemorySearchProviderV12 shim when falling back
// from the native Qdrant fusion path to local RRF.
// ---------------------------------------------------------------------------

export interface PrecomputedQdrantStreamProviderConfig {
  kind: "qdrant_dense" | "qdrant_sparse";
  backend: string;
  weight: number;
  points: ReadonlyArray<QdrantScoredPoint>;
}

export function createPrecomputedQdrantStreamProvider(
  config: PrecomputedQdrantStreamProviderConfig
): StreamProviderV12 {
  return {
    kind: config.kind,
    backend: config.backend,
    async emit(input) {
      const points = filterQdrantPointsBySystemTime(config.points, input.asOfSystemTime);
      return {
        candidates: pointsToCandidates(points),
        weight: config.weight
      };
    }
  };
}
