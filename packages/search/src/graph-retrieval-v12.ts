// Lore Context v1.3 — Lane A1: GraphRetrievalProvider.
//
// This provider resolves seed entities from the query text, walks
// memory_relations up to maxDepth hops, and emits MemorySearchHitV12 records
// populated with streams.graph metadata.
//
// Security invariants:
//   * Every SQL read is vault-scoped via a $vaultId parameter.
//   * SQL is fully parameterised — no string concatenation.
//   * ensureVaultScoped() throws before any DB call when vaultId is absent.
//
// Scoring formula (see scoreRelation()):
//   score = w_edge * relation.confidence
//         + w_evidence * min(evidenceCount, 5) / 5
//         + w_recency * normalizedRecency(relation.created_at)
//   where w_edge=0.5, w_evidence=0.3, w_recency=0.2 and the three
//   components each live in [0, 1], so the composite lives in [0, 1].

import type {
  MemorySearchHitV12,
  MemorySearchInputV12,
  MemorySearchStreamMetadataV12,
  PoolLikeV12
} from "./memory-search-v12.js";
import { resolveSystemTimeParam } from "./temporal-system-time-filter.js";

// Re-export the ensureVaultScoped helper via a local re-implementation so this
// module stays free of imports that would break the package boundary. The logic
// is identical to the private helper in memory-search-v12.ts.
function ensureVaultScoped(input: MemorySearchInputV12): void {
  if (typeof input.vaultId !== "string" || input.vaultId.length === 0) {
    throw new Error(
      "MemorySearchInputV12.vaultId is required — every v12 retrieval read must be vault-scoped"
    );
  }
}

// ---------------------------------------------------------------------------
// SQL — entity seed resolution (FTS/ILIKE on canonical_name + aliases JSONB).
// ---------------------------------------------------------------------------

export const GRAPH_ENTITY_SEED_SQL = `\
SELECT id, confidence
FROM memory_entities
WHERE vault_id = $1
  AND (
    canonical_name ILIKE '%' || $2 || '%'
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(aliases) AS alias
      WHERE alias ILIKE '%' || $2 || '%'
    )
  )
LIMIT $3`;

// ---------------------------------------------------------------------------
// SQL — outbound + inbound relations from a set of entity ids.
// ---------------------------------------------------------------------------

export const GRAPH_RELATIONS_SQL = `\
SELECT
  r.id           AS relation_id,
  r.source_entity_id,
  r.target_entity_id,
  r.relation_type,
  r.fact,
  r.status,
  r.confidence,
  r.valid_from,
  r.valid_until,
  r.t_created,
  r.t_expired,
  r.created_at
FROM memory_relations r
WHERE r.vault_id = $1
  AND r.status = 'active'
  AND (r.source_entity_id = ANY($2::text[]) OR r.target_entity_id = ANY($2::text[]))
  AND ($3::timestamptz IS NULL OR r.valid_from IS NULL OR r.valid_from <= $3::timestamptz)
  AND ($3::timestamptz IS NULL OR r.valid_until IS NULL OR r.valid_until >= $3::timestamptz)
  AND ($4::timestamptz IS NULL OR r.t_created <= $4::timestamptz)
  AND ($4::timestamptz IS NULL OR r.t_expired IS NULL OR r.t_expired > $4::timestamptz)`;

// ---------------------------------------------------------------------------
// SQL — evidence rows for a set of relation ids (top 3 per relation by conf).
// ---------------------------------------------------------------------------

export const GRAPH_EVIDENCE_SQL = `\
SELECT DISTINCT ON (e.relation_id)
  e.id           AS evidence_id,
  e.relation_id,
  e.item_id,
  e.evidence_text,
  e.confidence,
  e.created_at
FROM memory_relation_evidence e
WHERE e.vault_id = $1
  AND e.relation_id = ANY($2::text[])
ORDER BY e.relation_id, e.confidence DESC`;

// ---------------------------------------------------------------------------
// Row types (internal).
// ---------------------------------------------------------------------------

interface EntitySeedRow {
  id: string;
  confidence: string | number;
}

interface RelationRow {
  relation_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
  fact: string;
  status: string;
  confidence: string | number;
  valid_from: string | null;
  valid_until: string | null;
  t_created?: string | null;
  t_expired?: string | null;
  created_at: string;
}

interface EvidenceRow {
  evidence_id: string;
  relation_id: string;
  item_id: string;
  evidence_text: string;
  confidence: string | number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Config.
// ---------------------------------------------------------------------------

export interface GraphRetrievalProviderConfig {
  pool: PoolLikeV12;
  /** Maximum hop depth from seed entities. Default: 2. */
  maxDepth?: number;
  /** Maximum seed entities to resolve from the query. Default: 20. */
  candidateLimit?: number;
  /** Score blend weights (must sum to 1.0). Defaults: edge=0.5, evidence=0.3, recency=0.2. */
  weights?: {
    edge?: number;
    evidence?: number;
    recency?: number;
  };
}

// ---------------------------------------------------------------------------
// Scoring helper.
//
// score = w_edge   * relation.confidence              (edge weight in [0,1])
//       + w_evidence * min(evidenceCount, 5) / 5      (normalised evidence density)
//       + w_recency  * recencyNorm                    (newer created_at scores higher)
//
// recencyNorm uses an exponential decay:
//   recencyNorm = exp(- ageDays / 365)
// so a relation created today scores 1.0 and one created 365 days ago scores ~0.37.
// ---------------------------------------------------------------------------

function scoreRelation(
  confidence: number,
  evidenceCount: number,
  createdAt: string,
  weights: { edge: number; evidence: number; recency: number }
): number {
  const edgeComponent = confidence; // already in [0,1]
  const evidenceComponent = Math.min(evidenceCount, 5) / 5;
  const ageDays = (Date.now() - Date.parse(createdAt)) / (1000 * 60 * 60 * 24);
  const recencyComponent = Math.exp(-ageDays / 365);
  return (
    weights.edge * edgeComponent +
    weights.evidence * evidenceComponent +
    weights.recency * recencyComponent
  );
}

// ---------------------------------------------------------------------------
// GraphRetrievalProvider.
// ---------------------------------------------------------------------------

export class GraphRetrievalProvider {
  readonly name = "graph-retrieval-v12" as const;

  private readonly pool: PoolLikeV12;
  private readonly maxDepth: number;
  private readonly candidateLimit: number;
  private readonly weights: { edge: number; evidence: number; recency: number };

  constructor(config: GraphRetrievalProviderConfig) {
    this.pool = config.pool;
    this.maxDepth = config.maxDepth ?? 2;
    this.candidateLimit = config.candidateLimit ?? 20;
    this.weights = {
      edge: config.weights?.edge ?? 0.5,
      evidence: config.weights?.evidence ?? 0.3,
      recency: config.weights?.recency ?? 0.2
    };
  }

  async search(input: MemorySearchInputV12): Promise<MemorySearchHitV12[]> {
    ensureVaultScoped(input);

    const vaultId = input.vaultId;
    const validAtParam = input.validAt ?? null;
    const systemTimeParam = resolveSystemTimeParam(input);
    const finalLimit = input.finalLimit ?? 12;

    // ------------------------------------------------------------------
    // Step 1: Resolve seed entity IDs from the query text.
    // ------------------------------------------------------------------
    const seedResult = await this.pool.query<EntitySeedRow>(GRAPH_ENTITY_SEED_SQL, [
      vaultId,
      input.query,
      this.candidateLimit
    ]);

    if (seedResult.rows.length === 0) {
      return [];
    }

    const seedIds = [...new Set(seedResult.rows.map((r) => r.id))];

    // ------------------------------------------------------------------
    // Step 2: BFS up to maxDepth, collecting relation rows.
    //
    // Cycle detection key: `${source_entity_id}|${target_entity_id}|${relation_type}`
    // so we skip revisiting the same directed edge, but allow different
    // relation types between the same entity pair.
    // ------------------------------------------------------------------
    const visitedEdges = new Set<string>();
    const collectedRelations: RelationRow[] = [];

    let frontier = new Set<string>(seedIds);

    for (let depth = 0; depth < this.maxDepth && frontier.size > 0; depth++) {
      const frontierArray = [...frontier];

      const relResult = await this.pool.query<RelationRow>(GRAPH_RELATIONS_SQL, [
        vaultId,
        frontierArray,
        validAtParam,
        systemTimeParam
      ]);

      const nextFrontier = new Set<string>();

      for (const row of relResult.rows) {
        const edgeKey = `${row.source_entity_id}|${row.target_entity_id}|${row.relation_type}`;
        if (visitedEdges.has(edgeKey)) {
          continue;
        }
        visitedEdges.add(edgeKey);
        collectedRelations.push(row);

        // Expand frontier with the "other" end of the edge.
        const other = frontier.has(row.source_entity_id)
          ? row.target_entity_id
          : row.source_entity_id;
        if (!seedIds.includes(other)) {
          nextFrontier.add(other);
        }
      }

      frontier = nextFrontier;
    }

    if (collectedRelations.length === 0) {
      return [];
    }

    // ------------------------------------------------------------------
    // Step 3: Fetch evidence rows for all collected relations.
    // ------------------------------------------------------------------
    const relationIds = [...new Set(collectedRelations.map((r) => r.relation_id))];

    const evidenceResult = await this.pool.query<EvidenceRow>(GRAPH_EVIDENCE_SQL, [
      vaultId,
      relationIds
    ]);

    // Group evidence by relation_id.
    const evidenceByRelation = new Map<string, EvidenceRow[]>();
    for (const ev of evidenceResult.rows) {
      const list = evidenceByRelation.get(ev.relation_id);
      if (list) {
        list.push(ev);
      } else {
        evidenceByRelation.set(ev.relation_id, [ev]);
      }
    }

    // ------------------------------------------------------------------
    // Step 4: Build MemorySearchHitV12 for each relation × evidence.
    //
    // Each relation's evidence rows yield individual hits keyed by item_id.
    // When multiple relations share the same item_id we keep the hit with
    // the highest score (last-write-wins is fine because we sort below).
    // ------------------------------------------------------------------
    const hitsByItemId = new Map<
      string,
      MemorySearchHitV12
    >();

    for (const rel of collectedRelations) {
      const evidenceRows = evidenceByRelation.get(rel.relation_id) ?? [];
      const evidenceCount = evidenceRows.length;

      const relScore = scoreRelation(
        Number(rel.confidence),
        evidenceCount,
        rel.created_at,
        this.weights
      );

      const path = [rel.source_entity_id, rel.target_entity_id];

      if (evidenceCount === 0) {
        // No evidence rows — skip this relation (nothing to surface as a hit).
        continue;
      }

      for (const ev of evidenceRows) {
        const existing = hitsByItemId.get(ev.item_id);
        if (existing && existing.score >= relScore) {
          continue;
        }

        const streamMeta: MemorySearchStreamMetadataV12 = {
          rank: 0, // will be assigned after sorting
          score: relScore,
          backend: "graph-retrieval-v12",
          reason: rel.fact,
          path
        };

        hitsByItemId.set(ev.item_id, {
          itemId: ev.item_id,
          score: relScore,
          ...(ev.evidence_text?.trim() ? { text: ev.evidence_text } : {}),
          streams: {
            graph: streamMeta
          },
          lifecycle: {
            status: rel.status,
            validFrom: rel.valid_from ?? null,
            validUntil: rel.valid_until ?? null
          },
          provenance: {
            episodeIds: [],
            sourceRefs: [],
            relationIds: [rel.relation_id]
          }
        });
      }
    }

    // ------------------------------------------------------------------
    // Step 5: Sort by score descending, assign ranks, return top N.
    // ------------------------------------------------------------------
    const sorted = [...hitsByItemId.values()].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, finalLimit);

    for (let i = 0; i < top.length; i++) {
      const hit = top[i];
      if (hit.streams.graph) {
        hit.streams.graph.rank = i;
      }
    }

    return top;
  }
}
