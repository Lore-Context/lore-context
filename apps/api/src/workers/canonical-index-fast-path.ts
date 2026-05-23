// Lore v2.0.2 Lane I — Canonical-index fast-path for /v1/memory/search.
//
// Before the 7-stream fusion pipeline runs, the search handler calls
// tryCanonicalFastPath(). If the flag is off (LORE_CANONICAL_FAST_PATH_ENABLED
// default 0) this function returns null immediately, preserving v2.0.1
// byte-identical behavior.
//
// When enabled, it performs:
//   1. Single PK lookup on vault_canonical_index for the vault.
//   2. In-memory BM25-style token-overlap scoring against each episode's
//      subject + one_line_summary.
//   3. If any episode scores >= minScore (default 0.7), fetch the full
//      memory_items rows for the matched record_ids and return them.
//   4. On no hit, return null so the caller falls through to the 7-stream path.
//
// Acceptance criteria wired here:
//   I6  (STAGING-REQUIRED): fast-path p50 <= 80ms — tested in staging only
//   I7: flag=0 → return null → caller uses full pipeline (no regression)
//   I8: on hit → returns { records, topScore } which the caller wraps with
//       metadata.fast_path: "canonical_index"

import type { ButlerFlagSnapshot } from "../butler-flags.js";

// ── Deps ──────────────────────────────────────────────────────────────────────

/** Minimal Postgres pool surface required by tryCanonicalFastPath. */
export interface FastPathPg {
  query<R = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

export interface FastPathDeps {
  pg: FastPathPg;
  butlerFlags: ButlerFlagSnapshot;
  /** Minimum BM25-style score for a fast-path hit. Default 0.7. */
  minScore?: number;
  /** Exact project scope requested by the caller. Mirrors the normal v12 path. */
  projectId?: string | null;
  /** Allowed project scope for scoped API keys. Ignored when projectId is set. */
  allowedProjectIds?: string[];
}

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface FastPathMemoryRecord {
  id: string;
  vault_id: string;
  subject: string | null;
  content: string;
  status: string;
  confidence: number;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  project_id?: string | null;
}

export interface FastPathHit {
  records: FastPathMemoryRecord[];
  topScore: number;
}

// ── Canonical episode shape (mirrors JSONB stored in vault_canonical_index) ───

interface CanonicalEpisodeRow {
  record_id: string;
  subject: string;
  one_line_summary: string;
  recall_hit_count: number;
  last_recall_at: string | null;
}

// ── BM25-style token-overlap scoring ─────────────────────────────────────────

/** Tokenize text into lowercase, stop-word-free tokens of length >= 2. */
function tokenize(text: string): Set<string> {
  const STOP = new Set(["a","an","the","is","in","it","of","to","and","or","for","on","at","by","be","as"]);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));
  return new Set(tokens);
}

/**
 * Jaccard-like overlap score: |intersection| / |union|.
 * Returns a value in [0, 1].
 */
function overlapScore(queryTokens: Set<string>, episodeTokens: Set<string>): number {
  if (queryTokens.size === 0 || episodeTokens.size === 0) return 0;
  let intersect = 0;
  for (const t of queryTokens) {
    if (episodeTokens.has(t)) intersect++;
  }
  const union = queryTokens.size + episodeTokens.size - intersect;
  return intersect / union;
}

// ── Main fast-path function ───────────────────────────────────────────────────

/**
 * Try the canonical-index fast-path for a search query.
 *
 * Returns a FastPathHit when canonicalFastPathEnabled=true and at least one
 * episode scores >= minScore. Returns null in all other cases so the caller
 * falls through to the full 7-stream pipeline.
 *
 * I7 guarantee: when canonicalFastPathEnabled=false (default), this function
 * returns null immediately without any DB queries — search behavior is
 * byte-identical to v2.0.1.
 */
export async function tryCanonicalFastPath(
  vaultId: string,
  query: string,
  deps: FastPathDeps,
): Promise<FastPathHit | null> {
  // I7: flag=0 → immediate null (no DB queries, no behavior change)
  if (!deps.butlerFlags.canonicalFastPathEnabled) {
    return null;
  }

  const minScore = deps.minScore ?? 0.7;

  // Step 1: single PK lookup on vault_canonical_index
  let episodes: CanonicalEpisodeRow[];
  try {
    const { rows } = await deps.pg.query<{ episodes: CanonicalEpisodeRow[] }>(
      `SELECT episodes FROM vault_canonical_index WHERE vault_id = $1`,
      [vaultId],
    );
    if (rows.length === 0 || !Array.isArray(rows[0].episodes)) {
      return null;
    }
    episodes = rows[0].episodes;
  } catch {
    // On any DB error, fall through to the full pipeline
    return null;
  }

  if (episodes.length === 0) return null;

  // Step 2: in-memory token-overlap scoring
  const queryTokens = tokenize(query);
  let topScore = 0;
  const matchedIds: string[] = [];

  for (const ep of episodes) {
    const episodeText = `${ep.subject ?? ""} ${ep.one_line_summary ?? ""}`;
    const episodeTokens = tokenize(episodeText);
    const score = overlapScore(queryTokens, episodeTokens);
    if (score >= minScore) {
      matchedIds.push(ep.record_id);
      if (score > topScore) topScore = score;
    }
  }

  // Step 3: no hits → fall through
  if (matchedIds.length === 0) return null;

  // Step 4: fetch full memory_items rows for matched record_ids
  try {
    // Build parameterized $1, $2, ... placeholders starting after vaultId ($1)
    const placeholders = matchedIds.map((_, i) => `$${i + 2}`).join(", ");
    const params: unknown[] = [vaultId, ...matchedIds];
    const projectId = deps.projectId ?? null;
    const allowedProjectIds =
      projectId === null && deps.allowedProjectIds && deps.allowedProjectIds.length > 0
        ? deps.allowedProjectIds
        : null;
    const projectFilterIndex = params.length + 1;
    const allowedFilterIndex = params.length + 2;
    params.push(projectId, allowedProjectIds);

    const { rows } = await deps.pg.query<FastPathMemoryRecord>(
      `SELECT id, vault_id, project_id, subject, content, status,
              confidence::float AS confidence,
              use_count,
              last_used_at, created_at, updated_at
       FROM memory_items
       WHERE vault_id = $1
         AND id IN (${placeholders})
         AND status = 'active'
         AND ($${projectFilterIndex}::text IS NULL OR project_id = $${projectFilterIndex})
         AND ($${allowedFilterIndex}::text[] IS NULL OR project_id = ANY($${allowedFilterIndex}::text[]))`,
      params,
    );

    if (rows.length === 0) return null;

    return { records: rows, topScore };
  } catch {
    return null;
  }
}
