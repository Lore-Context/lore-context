// Lore Context v1.3 — Lane A2: TemporalRetrievalProvider.
//
// Implements the "latest valid by subject+predicate" retrieval stream that
// surfaces the most-recent active relation for each (source entity, relation
// type) group matched by the query. This closes the temporal stream debt
// described in v1.3 plan §3 Lane A item 2.
//
// Design assumptions:
//   "subject"   = source entity whose canonical_name matches the query (ILIKE).
//   "predicate" = relation_type on memory_relations.
//
// Score formula (documented per spec):
//   score = recency_weight * normalized_recency + confidence_weight * relation.confidence
//
//   normalized_recency = valid_from_epoch / NOW_epoch (clamped 0..1).
//   Newer valid_from always outranks older within same confidence tier.
//   Default weights: recency=0.6, confidence=0.4.
//
// SQL invariants:
//   - Every join is vault-scoped via vault_id = $vaultId.
//   - All query terms are parameterised — never concatenated into SQL.
//   - Active predicate: status='active' AND invalidated_by IS NULL
//     AND (valid_from IS NULL OR valid_from <= $validAt)
//     AND (valid_until IS NULL OR valid_until > $validAt)
//
// v1.4 Lane 0.5 — N+1 elimination:
//   Steps 2+3 (per-entity relation-type fan-out + per-group winning-relation
//   lookup) are merged into a single CTE query with ROW_NUMBER() window
//   function. Round-trips reduced from 1 + 3N → 2 (seed + winning CTE).
//
// No dependency on apps/api: uses PoolLikeV12 adapter pattern from
// packages/search/src/memory-search-v12.ts (line ~240).

import type {
  MemorySearchHitV12,
  MemorySearchInputV12,
  PoolLikeV12
} from "./memory-search-v12.js";

import { DEFAULT_FINAL_LIMIT } from "./memory-search-v12.js";
import { resolveSystemTimeParam } from "./temporal-system-time-filter.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface TemporalRetrievalProviderConfig {
  pool: PoolLikeV12;
  /** Max candidate (source_entity, relation_type) groups to evaluate. Default 20. */
  candidateLimit?: number;
  /** Score formula weights. Defaults: recency=0.6, confidence=0.4. */
  weights?: {
    recency?: number;
    confidence?: number;
  };
}

// ---------------------------------------------------------------------------
// Internal row shapes
// ---------------------------------------------------------------------------

interface EntityRow {
  id: string;
}

/**
 * Row returned by SQL_WINNING_RELATIONS_BATCH — one row per
 * (source_entity_id, relation_type) group, representing the winning relation.
 */
interface WinningRelationRow {
  id: string;
  source_entity_id: string;
  confidence: number | string;
  valid_from: string | null;
  valid_until: string | null;
  t_created?: string | null;
  t_expired?: string | null;
  status: string;
  invalidated_by: string | null;
}

interface EvidenceRow {
  relation_id: string;
  item_id: string;
  confidence: number | string;
}

// ---------------------------------------------------------------------------
// SQL — all parameterised, all vault-scoped.
// ---------------------------------------------------------------------------

/**
 * Step 1: resolve seed entity IDs from a query string via ILIKE on canonical_name.
 */
export const SQL_SEED_ENTITIES = `\
SELECT id
FROM memory_entities
WHERE vault_id = $1
  AND canonical_name ILIKE $2
LIMIT $3`;

/**
 * Steps 2+3 combined (v1.4 Lane 0.5 N+1 fix):
 *
 * For all seed entity IDs in $2, find the single winning relation per
 * (source_entity_id, relation_type) group using a ROW_NUMBER() window
 * function. Eliminates the previous 1+N round-trips (one per entity) and
 * reduces to a single DB call for the entire seed set.
 *
 * Active predicate (plan §7.5):
 *   status = 'active'
 *   invalidated_by IS NULL
 *   valid_from IS NULL OR valid_from <= $validAt
 *   valid_until IS NULL OR valid_until > $validAt
 *
 * Recency tie-break within each group: ORDER BY valid_from DESC NULLS LAST
 * (NULL valid_from = "always valid" = lowest priority so explicit timestamps win).
 *
 * Parameters:
 *   $1  vault_id  (text)
 *   $2  seed entity IDs (text[])
 *   $3  validAt (timestamptz | NULL)
 *   $4  systemTime (timestamptz | NULL)
 */
export const SQL_WINNING_RELATIONS_BATCH = `\
WITH ranked AS (
  SELECT
    id,
    source_entity_id,
    relation_type,
    confidence,
    valid_from,
    valid_until,
    t_created,
    t_expired,
    status,
    invalidated_by,
    ROW_NUMBER() OVER (
      PARTITION BY source_entity_id, relation_type
      ORDER BY valid_from DESC NULLS LAST
    ) AS rn
  FROM memory_relations
  WHERE vault_id = $1
    AND source_entity_id = ANY($2::text[])
    AND status = 'active'
    AND invalidated_by IS NULL
    AND ($3::timestamptz IS NULL OR valid_from IS NULL OR valid_from <= $3::timestamptz)
    AND ($3::timestamptz IS NULL OR valid_until IS NULL OR valid_until > $3::timestamptz)
    AND ($4::timestamptz IS NULL OR t_created <= $4::timestamptz)
    AND ($4::timestamptz IS NULL OR t_expired IS NULL OR t_expired > $4::timestamptz)
)
SELECT id, source_entity_id, confidence, valid_from, valid_until, status, invalidated_by
FROM ranked
WHERE rn = 1`;

/**
 * Step 4: retrieve the top-1 evidence item for each relation in a batch.
 * Uses DISTINCT ON (relation_id) ordered by confidence DESC to get the
 * best evidence per relation in a single round-trip.
 *
 * Parameters:
 *   $1  vault_id      (text)
 *   $2  relation IDs  (text[])
 */
export const SQL_TOP_EVIDENCE_BATCH = `\
SELECT DISTINCT ON (relation_id)
  relation_id,
  item_id,
  confidence
FROM memory_relation_evidence
WHERE vault_id = $1
  AND relation_id = ANY($2::text[])
ORDER BY relation_id, confidence DESC, created_at DESC`;

// ---------------------------------------------------------------------------
// TemporalRetrievalProvider
// ---------------------------------------------------------------------------

export class TemporalRetrievalProvider {
  readonly name = "temporal-retrieval-v12" as const;

  private readonly pool: PoolLikeV12;
  private readonly candidateLimit: number;
  private readonly recencyWeight: number;
  private readonly confidenceWeight: number;

  constructor(config: TemporalRetrievalProviderConfig) {
    this.pool = config.pool;
    this.candidateLimit = config.candidateLimit ?? 20;
    this.recencyWeight = config.weights?.recency ?? 0.6;
    this.confidenceWeight = config.weights?.confidence ?? 0.4;
  }

  async search(input: MemorySearchInputV12): Promise<MemorySearchHitV12[]> {
    ensureVaultScoped(input);

    const vaultId = input.vaultId;
    const validAt = input.validAt ?? null;
    const systemTime = resolveSystemTimeParam(input);
    const finalLimit = input.finalLimit ?? DEFAULT_FINAL_LIMIT;

    // Step 1: seed entity IDs from the query.
    const likePattern = `%${escapeLike(input.query)}%`;
    const entityResult = await this.pool.query<EntityRow>(
      SQL_SEED_ENTITIES,
      [vaultId, likePattern, this.candidateLimit]
    );
    const seedIds = entityResult.rows.map((r) => r.id);

    if (seedIds.length === 0) {
      return [];
    }

    // Steps 2+3 combined: one CTE query returns the winning relation per
    // (source_entity_id, relation_type) group across all seed entities.
    // Previously: 1 + N + 2N round-trips. Now: 1 round-trip.
    const winningResult = await this.pool.query<WinningRelationRow>(
      SQL_WINNING_RELATIONS_BATCH,
      [vaultId, seedIds, validAt, systemTime]
    );

    if (winningResult.rows.length === 0) {
      return [];
    }

    // Step 4: batch-fetch top evidence for all winning relations.
    const winningRelationIds = winningResult.rows.map((r) => r.id);
    const evidenceResult = await this.pool.query<EvidenceRow>(
      SQL_TOP_EVIDENCE_BATCH,
      [vaultId, winningRelationIds]
    );

    // Index evidence by relation_id for O(1) lookup.
    const evidenceByRelationId = new Map<string, EvidenceRow>();
    for (const ev of evidenceResult.rows) {
      evidenceByRelationId.set(ev.relation_id, ev);
    }

    // Score each winning relation that has evidence.
    const nowEpoch = validAt ? Date.parse(validAt) : Date.now();

    interface ScoredHit {
      itemId: string;
      score: number;
      relValidFrom: string | null;
      relValidUntil: string | null;
      relStatus: string;
      relInvalidatedBy: string | null;
    }

    const scoredHits: ScoredHit[] = [];

    for (const rel of winningResult.rows) {
      const evidence = evidenceByRelationId.get(rel.id);
      if (!evidence) continue;

      const score = this.computeScore(rel, Number(evidence.confidence), nowEpoch);
      scoredHits.push({
        itemId: evidence.item_id,
        score,
        relValidFrom: rel.valid_from,
        relValidUntil: rel.valid_until,
        relStatus: rel.status,
        relInvalidatedBy: rel.invalidated_by
      });
    }

    if (scoredHits.length === 0) {
      return [];
    }

    // Sort by score desc and cap at finalLimit.
    scoredHits.sort((a, b) => b.score - a.score);
    const top = scoredHits.slice(0, finalLimit);

    return top.map((hit, rank) => ({
      itemId: hit.itemId,
      score: hit.score,
      streams: {
        temporal: {
          rank,
          score: hit.score,
          backend: "temporal-retrieval-v12"
        }
      },
      lifecycle: {
        status: hit.relStatus,
        validFrom: hit.relValidFrom ?? null,
        validUntil: hit.relValidUntil ?? null,
        supersededBy: hit.relInvalidatedBy ?? null
      },
      provenance: {
        episodeIds: [],
        sourceRefs: []
      }
    }));
  }

  /**
   * Score formula:
   *   score = recency_weight * normalized_recency + confidence_weight * relation.confidence
   *
   * normalized_recency = valid_from_epoch / now_epoch (clamped 0..1).
   * When valid_from is NULL the record has "always been valid" — we assign
   * normalized_recency = 0 so explicit timestamps win.
   */
  private computeScore(
    rel: WinningRelationRow,
    evidenceConfidence: number,
    nowEpoch: number
  ): number {
    const confidence = Number(rel.confidence);
    let normalizedRecency = 0;
    if (rel.valid_from !== null) {
      const fromEpoch = Date.parse(rel.valid_from);
      normalizedRecency = Number.isFinite(fromEpoch)
        ? Math.max(0, Math.min(1, fromEpoch / nowEpoch))
        : 0;
    }
    // Use evidence confidence as the relation confidence signal since it
    // captures how strongly the source item supports this relation.
    const effectiveConfidence = Number.isFinite(evidenceConfidence)
      ? Math.max(0, Math.min(1, evidenceConfidence))
      : Math.max(0, Math.min(1, confidence));
    return this.recencyWeight * normalizedRecency + this.confidenceWeight * effectiveConfidence;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureVaultScoped(input: MemorySearchInputV12): void {
  if (typeof input.vaultId !== "string" || input.vaultId.length === 0) {
    throw new Error(
      "MemorySearchInputV12.vaultId is required — every v12 retrieval read must be vault-scoped"
    );
  }
}

/**
 * Escape special LIKE pattern characters so user query text is treated as a
 * literal substring match rather than a pattern.
 */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}
