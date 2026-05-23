// Lore Context v1.3 — WikiRetrievalProvider (FTS + optional pgvector).
//
// Searches memory_wiki_pages using Postgres full-text search (topic + body).
// When an `embeddingFn` is supplied (Lane C), the provider also runs a
// pgvector cosine ANN over `wiki_embedding` (1024-dim, HNSW index
// `idx_memory_wiki_pages_embedding`) and fuses the two candidate lists
// inside the provider via fuseWeightedRRF before returning a single hit list.
//
// When no `embeddingFn` is supplied, the provider falls back to FTS-only —
// preserving the v1.3 Lane A3 behaviour and existing tests.
//
// Security invariants:
//   * vault_id scoping is enforced on every query — missing vault throws.
//   * SQL is fully parameterised; query terms and vectors are never concatenated.
//   * Only status='active' rows are returned; stale and archived are excluded.

import {
  fuseWeightedRRF,
  vectorLiteral,
  DEFAULT_STREAM_WEIGHTS,
  DEFAULT_RRF_K,
  type MemorySearchHitLifecycleV12,
  type MemorySearchHitProvenanceV12,
  type MemorySearchHitV12,
  type MemorySearchInputV12,
  type MemorySearchStreamMetadataV12,
  type PoolLikeV12,
  type WeightedRRFCandidate,
  type WeightedRRFStream
} from "./memory-search-v12.js";
import { resolveSystemTimeParam } from "./temporal-system-time-filter.js";

// ---------------------------------------------------------------------------
// SQL — FTS over (topic || ' ' || body). Score is ts_rank_cd of the simple
// dictionary so callers don't need to align stop-word lists across languages.
// ---------------------------------------------------------------------------

export const WIKI_FTS_SQL = `\
SELECT
  p.id          AS page_id,
  p.vault_id    AS vault_id,
  p.project_id  AS project_id,
  p.topic       AS topic,
  p.body        AS body,
  p.source_item_ids AS source_item_ids,
  ts_rank_cd(
    to_tsvector('simple', p.topic || ' ' || p.body),
    websearch_to_tsquery('simple', $1)
  ) AS score
FROM memory_wiki_pages p
WHERE p.vault_id = $2
  AND p.status = 'active'
  AND ($3::text IS NULL OR p.project_id = $3::text)
  AND ($4::text[] IS NULL OR array_length($4::text[], 1) IS NULL OR p.project_id = ANY($4::text[]))
  AND (
    $5::timestamptz IS NULL
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(p.source_item_ids) AS src(item_id)
      JOIN memory_items i
        ON i.id = src.item_id
       AND i.vault_id = p.vault_id
      WHERE i.t_created <= $5::timestamptz
        AND (i.t_expired IS NULL OR i.t_expired > $5::timestamptz)
    )
  )
  AND to_tsvector('simple', p.topic || ' ' || p.body) @@ websearch_to_tsquery('simple', $1)
ORDER BY score DESC
LIMIT $6`;

// ---------------------------------------------------------------------------
// SQL — pgvector cosine ANN over wiki_embedding. The HNSW index covers
// `vector_cosine_ops`; the `1 - (e <=> v)` projection turns cosine distance
// into a similarity score in [0, 1] for fusion alongside the FTS rank.
// Pages without an embedding are skipped (`wiki_embedding IS NOT NULL`).
// ---------------------------------------------------------------------------

export const WIKI_PGVECTOR_SQL = `\
SELECT
  p.id          AS page_id,
  p.vault_id    AS vault_id,
  p.project_id  AS project_id,
  p.topic       AS topic,
  p.body        AS body,
  p.source_item_ids AS source_item_ids,
  1 - (p.wiki_embedding <=> $1::vector) AS score
FROM memory_wiki_pages p
WHERE p.vault_id = $2
  AND p.status = 'active'
  AND p.wiki_embedding IS NOT NULL
  AND ($3::text IS NULL OR p.project_id = $3::text)
  AND ($4::text[] IS NULL OR array_length($4::text[], 1) IS NULL OR p.project_id = ANY($4::text[]))
  AND (
    $5::timestamptz IS NULL
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(p.source_item_ids) AS src(item_id)
      JOIN memory_items i
        ON i.id = src.item_id
       AND i.vault_id = p.vault_id
      WHERE i.t_created <= $5::timestamptz
        AND (i.t_expired IS NULL OR i.t_expired > $5::timestamptz)
    )
  )
ORDER BY p.wiki_embedding <=> $1::vector ASC
LIMIT $6`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WikiRetrievalProviderConfig {
  pool: PoolLikeV12;
  /** Override the default final result cap (default: 12). */
  finalLimit?: number;
  /**
   * Optional embedding fn. When supplied (and `input.embeddingFn` is not set
   * on a per-call basis), the provider runs both FTS and pgvector queries in
   * parallel and fuses inside the provider.
   */
  embeddingFn?: (text: string) => Promise<number[]>;
  /** Override the canonical RRF damping constant. Default: 60. */
  rrfK?: number;
}

interface WikiPageRow {
  page_id: string;
  vault_id: string;
  project_id: string;
  topic: string;
  body?: string | null;
  source_item_ids: unknown;
  score: number | string;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class WikiRetrievalProvider {
  readonly name = "wiki-retrieval-v12";

  private readonly pool: PoolLikeV12;
  private readonly defaultFinalLimit: number;
  private readonly defaultEmbeddingFn: ((text: string) => Promise<number[]>) | undefined;
  private readonly rrfK: number;

  constructor(config: WikiRetrievalProviderConfig) {
    this.pool = config.pool;
    this.defaultFinalLimit = config.finalLimit ?? 12;
    this.defaultEmbeddingFn = config.embeddingFn;
    this.rrfK = config.rrfK ?? DEFAULT_RRF_K;
  }

  async search(input: MemorySearchInputV12): Promise<MemorySearchHitV12[]> {
    // Security invariant: every v12 read must be vault-scoped.
    if (typeof input.vaultId !== "string" || input.vaultId.length === 0) {
      throw new Error(
        "MemorySearchInputV12.vaultId is required — every v12 retrieval read must be vault-scoped"
      );
    }

    const finalLimit = input.finalLimit ?? this.defaultFinalLimit;

    // Project filter: exact match takes priority over allowedProjectIds.
    const projectIdParam: string | null = input.projectId ?? null;
    const allowedProjectIdsParam: string[] | null =
      projectIdParam === null && input.allowedProjectIds && input.allowedProjectIds.length > 0
        ? [...input.allowedProjectIds]
        : null;
    const systemTimeParam = resolveSystemTimeParam(input);

    const ftsParams: unknown[] = [
      input.query,
      input.vaultId,
      projectIdParam,
      allowedProjectIdsParam,
      systemTimeParam,
      finalLimit
    ];

    const embeddingFn = input.embeddingFn ?? this.defaultEmbeddingFn;

    if (!embeddingFn) {
      // FTS-only fallback — preserves the v1.3 Lane A3 behaviour.
      const result = await this.pool.query<WikiPageRow>(WIKI_FTS_SQL, ftsParams);
      return result.rows.map((row, rank) => rowToHit(row, rank, "fts-only"));
    }

    // FTS + pgvector — run both in parallel, fuse via weighted RRF.
    const vector = await embeddingFn(input.query);
    const literal = vectorLiteral(vector);
    const pgvectorParams: unknown[] = [
      literal,
      input.vaultId,
      projectIdParam,
      allowedProjectIdsParam,
      systemTimeParam,
      finalLimit
    ];

    const [ftsResult, pgvectorResult] = await Promise.all([
      this.pool.query<WikiPageRow>(WIKI_FTS_SQL, ftsParams),
      this.pool.query<WikiPageRow>(WIKI_PGVECTOR_SQL, pgvectorParams)
    ]);

    return fuseWikiCandidates({
      ftsRows: ftsResult.rows,
      pgvectorRows: pgvectorResult.rows,
      finalLimit,
      rrfK: this.rrfK
    });
  }
}

// ---------------------------------------------------------------------------
// Fusion helper — single fused list with provenance.wikiPageIds aggregated
// across both streams. Uses fuseWeightedRRF from memory-search-v12.
// ---------------------------------------------------------------------------

interface FuseWikiInput {
  ftsRows: ReadonlyArray<WikiPageRow>;
  pgvectorRows: ReadonlyArray<WikiPageRow>;
  finalLimit: number;
  rrfK: number;
}

function fuseWikiCandidates(input: FuseWikiInput): MemorySearchHitV12[] {
  // Build a per-itemId lookup so we can re-attach provenance + lifecycle to
  // the fused output. We deliberately use the wiki provider's stream kind
  // (`wiki`) for both streams since the fusion is private to this provider —
  // upstream Lane B treats the whole provider as a single `wiki` stream.
  const lifecycleByItem = new Map<string, MemorySearchHitLifecycleV12>();
  const provenanceByItem = new Map<string, MemorySearchHitProvenanceV12>();
  const pageIdsByItem = new Map<string, Set<string>>();

  function recordRow(row: WikiPageRow): WeightedRRFCandidate {
    const score = Number(row.score);
    const sourceItemIds = parseSourceItemIds(row.source_item_ids);
    const itemId = sourceItemIds.length > 0 ? sourceItemIds[0] : `wiki:${row.page_id}`;
    if (!lifecycleByItem.has(itemId)) {
      lifecycleByItem.set(itemId, { status: "active" });
    }
    const pageSet = pageIdsByItem.get(itemId) ?? new Set<string>();
    pageSet.add(row.page_id);
    pageIdsByItem.set(itemId, pageSet);
    const text = wikiRowText(row);
    return { itemId, score, ...(text ? { text } : {}) };
  }

  const ftsCandidates: WeightedRRFCandidate[] = input.ftsRows.map((row) => recordRow(row));
  const pgvectorCandidates: WeightedRRFCandidate[] = input.pgvectorRows.map((row) => recordRow(row));

  // Build provenance from the deduped page-id sets.
  for (const [itemId, pageSet] of pageIdsByItem) {
    provenanceByItem.set(itemId, {
      episodeIds: [],
      sourceRefs: [],
      wikiPageIds: [...pageSet]
    });
  }

  // Use postgres-fts and postgres-pgvector relative weights as a sane
  // default mirroring the cross-stream baselines in DEFAULT_STREAM_WEIGHTS.
  // Both contributions land under the `wiki` stream key in the resulting
  // hits via remapStreamsToWiki below.
  const streams: WeightedRRFStream[] = [
    {
      kind: "postgres_fts",
      backend: "wiki-fts",
      weight: DEFAULT_STREAM_WEIGHTS.postgres_fts,
      candidates: ftsCandidates
    },
    {
      kind: "postgres_pgvector",
      backend: "wiki-pgvector",
      weight: DEFAULT_STREAM_WEIGHTS.postgres_pgvector,
      candidates: pgvectorCandidates
    }
  ];

  const fused = fuseWeightedRRF({
    streams,
    k: input.rrfK,
    limit: input.finalLimit,
    lifecycleByItem,
    provenanceByItem
  });

  // Remap the temporary stream keys (`postgres_fts` / `postgres_pgvector`)
  // onto the public `wiki` stream key so consumers see this provider as a
  // single `wiki` stream contributor — the orchestrator owns cross-stream
  // fusion. We preserve the best (lowest) rank seen across the two internal
  // streams and surface it as the wiki backend metadata.
  return fused.map((hit) => {
    const wikiMeta = pickBestStreamMetadata(hit.streams);
    return {
      itemId: hit.itemId,
      chunkId: hit.chunkId,
      score: hit.score,
      streams: { wiki: wikiMeta },
      lifecycle: hit.lifecycle,
      provenance: hit.provenance
    };
  });
}

function pickBestStreamMetadata(
  streams: Partial<Record<string, MemorySearchStreamMetadataV12>>
): MemorySearchStreamMetadataV12 {
  const fts = streams.postgres_fts;
  const pg = streams.postgres_pgvector;
  if (fts && pg) {
    // Use fts as backend label when both fired; rank is the better (smaller).
    return {
      rank: Math.min(fts.rank, pg.rank),
      score: Math.max(fts.score, pg.score),
      backend: "wiki-retrieval-v12"
    };
  }
  if (fts) return { rank: fts.rank, score: fts.score, backend: "wiki-retrieval-v12" };
  if (pg) return { rank: pg.rank, score: pg.score, backend: "wiki-retrieval-v12" };
  return { rank: 0, score: 0, backend: "wiki-retrieval-v12" };
}

// ---------------------------------------------------------------------------
// Per-row → MemorySearchHitV12 (FTS-only path).
// ---------------------------------------------------------------------------

function rowToHit(row: WikiPageRow, rank: number, backend: string): MemorySearchHitV12 {
  const score = Number(row.score);

  // Derive itemId from source_item_ids[0] when available.
  const sourceItemIds = parseSourceItemIds(row.source_item_ids);
  const itemId = sourceItemIds.length > 0 ? sourceItemIds[0] : `wiki:${row.page_id}`;

  return {
    itemId,
    score,
    ...(wikiRowText(row) ? { text: wikiRowText(row) } : {}),
    streams: {
      wiki: {
        rank,
        score,
        backend: backend === "fts-only" ? "wiki-retrieval-v12" : backend
      }
    },
    lifecycle: {
      status: "active"
    },
    provenance: {
      episodeIds: [],
      sourceRefs: [],
      wikiPageIds: [row.page_id]
    }
  };
}

function wikiRowText(row: WikiPageRow): string | undefined {
  const parts = [row.topic, row.body].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0
  );
  if (parts.length === 0) return undefined;
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse source_item_ids JSONB column value into a string array.
 * Handles null, undefined, pre-parsed arrays, and JSON string representations.
 */
function parseSourceItemIds(raw: unknown): string[] {
  if (raw === null || raw === undefined) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string");
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string");
      }
    } catch {
      // Not valid JSON — treat as empty.
    }
  }
  return [];
}
