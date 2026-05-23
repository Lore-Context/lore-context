// Lore v2.0.2 Lane I — Canonical index builder.
//
// Builds a per-vault canonical index of top-K memory episodes, scored by a
// composite formula that combines recency, recall frequency, lifecycle state,
// thematic relevance, and confidence.
//
// The output is UPSERT-ed into vault_canonical_index as a single JSONB array
// (schema-v21-canonical-index.sql). The phase is idempotent: deterministic
// ordering (score DESC, then id ASC) guarantees byte-for-byte JSONB equality
// on re-runs with no new data.
//
// Kill-switch: all exported functions check butlerFlags.canonicalIndexEnabled
// and return a skipped result when it is false. When butlerFlags.shadowMode is
// true the UPSERT is skipped but the result object is still computed (allows
// dry-run validation).

import { randomUUID } from "node:crypto";
import type { ButlerFlagSnapshot } from "../butler-flags.js";

// ── Deps injection surface ────────────────────────────────────────────────────

/** Minimal Postgres pool interface (matches DbPool in butler-v18.ts). */
export interface CanonicalIndexPg {
  query<R = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

/**
 * Minimal LLM invocation function type.
 * Matches the shape of FallbackOrchestrator.invoke / OpenRouterProvider.invoke.
 */
export type TaskRouteInvoke = (request: {
  prompt: string;
  systemPrompt?: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  requestId: string;
}) => Promise<{ text: string }>;

export interface CanonicalIndexDeps {
  pg: CanonicalIndexPg;
  llmInvoke: TaskRouteInvoke;
  butlerFlags: ButlerFlagSnapshot;
  /** Top themes from the surface phase for this vault (used in scoring). */
  vaultThemes: string[];
}

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface CanonicalEpisode {
  record_id: string;
  subject: string;
  one_line_summary: string;
  recall_hit_count: number;
  last_recall_at: string | null;
}

export interface CanonicalIndexResult {
  vaultId: string;
  episodes: CanonicalEpisode[];
}

export interface CanonicalIndexPhaseResult {
  ok: true;
  vaultId: string;
  episodeCount: number;
  shadowed: boolean;
}

export interface CanonicalIndexPhaseSkipped {
  skipped: true;
  reason: string;
}

export interface CanonicalIndexPhaseError {
  ok: false;
  error: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum episodes to include in the canonical index. */
const MAX_EPISODES = 100;

/** Model used for one-line summary generation (graph_extractor route). */
const SUMMARY_MODEL = "qwen/qwen3.6-flash";

// ── Scoring helpers ───────────────────────────────────────────────────────────

/**
 * Exponential recency decay: score decays to ~0.37 after HALF_LIFE_DAYS.
 * Returns a value in (0, 1].
 */
function recencyDecay(updatedAt: string | null | undefined): number {
  if (!updatedAt) return 0.5;
  const HALF_LIFE_DAYS = 30;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.exp(-ageDays / HALF_LIFE_DAYS);
}

interface MemoryItemDbRow {
  id: string;
  subject: string | null;
  content: string;
  status: string;
  confidence: string | number;
  use_count: string | number;
  last_used_at: string | null;
  updated_at: string | null;
}

function computeScore(
  row: MemoryItemDbRow,
  topThemes: Set<string>,
): number {
  const useCount = Number(row.use_count ?? 0);
  const confidence = Number(row.confidence ?? 0.75);
  const decay = recencyDecay(row.updated_at ?? null);

  // subject match against top-5 themes
  const subjectLower = (row.subject ?? "").toLowerCase();
  const inTopThemes = topThemes.size > 0 && subjectLower.length > 0
    ? [...topThemes].some((t) => subjectLower.includes(t.toLowerCase()))
    : false;

  return (
    useCount * decay
    + 2 * (row.status === "active" ? 1 : 0)
    + (inTopThemes ? 1 : 0)
    - (confidence < 0.5 ? 1 : 0)
  );
}

// ── One-line summary generation ───────────────────────────────────────────────

async function generateOneLiner(
  content: string,
  llmInvoke: TaskRouteInvoke,
): Promise<string> {
  const fallback = content.slice(0, 120);
  try {
    const resp = await llmInvoke({
      systemPrompt: "You are a memory summarizer. Respond with ONLY the summary — no preamble, no punctuation at the end, no quotes.",
      prompt: `Summarize this memory in ≤15 words:\n\n${content.slice(0, 800)}`,
      model: SUMMARY_MODEL,
      maxTokens: 40,
      temperature: 0,
      requestId: randomUUID(),
    });
    const text = (resp.text ?? "").trim();
    return text.length > 0 ? text : fallback;
  } catch {
    return fallback;
  }
}

// ── Core builder ──────────────────────────────────────────────────────────────

/**
 * Build the canonical index for a single vault.
 *
 * Queries memory_items for active records, scores them, selects top-K, and
 * generates one-line summaries via the graph_extractor LLM route.
 *
 * The ordering (score DESC, id ASC) is deterministic so that identical inputs
 * always produce an identical JSONB array (I4 idempotency guarantee).
 */
export async function buildCanonicalIndex(
  vaultId: string,
  deps: CanonicalIndexDeps,
): Promise<CanonicalIndexResult> {
  // Query all active memory_items for this vault
  const { rows } = await deps.pg.query<MemoryItemDbRow>(
    `SELECT id, subject, content, status, confidence, use_count, last_used_at, updated_at
     FROM memory_items
     WHERE vault_id = $1
       AND status = 'active'`,
    [vaultId],
  );

  // Build top-5 theme set for scoring
  const topThemes = new Set(deps.vaultThemes.slice(0, 5).map((t) => t.toLowerCase()));

  // Score and sort: score DESC, then id ASC for determinism
  const scored = rows
    .map((row) => ({ row, score: computeScore(row, topThemes) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.row.id < b.row.id ? -1 : 1;
    });

  // Take top K
  const topK = scored.slice(0, MAX_EPISODES);

  // Generate one-line summaries (sequential to avoid thundering the LLM)
  const episodes: CanonicalEpisode[] = [];
  for (const { row } of topK) {
    const summary = await generateOneLiner(row.content, deps.llmInvoke);
    episodes.push({
      record_id: row.id,
      subject: row.subject ?? "",
      one_line_summary: summary,
      recall_hit_count: Number(row.use_count ?? 0),
      last_recall_at: row.last_used_at ?? null,
    });
  }

  return { vaultId, episodes };
}

// ── Butler phase entry point ──────────────────────────────────────────────────

/**
 * Butler v19 canonical-index phase: build index and UPSERT into
 * vault_canonical_index. Returns a skipped result when the flag is off.
 *
 * @param runId  The butler_runs.id for the current run (for FK linkage).
 */
export async function canonicalIndexPhase(
  vaultId: string,
  runId: string,
  deps: CanonicalIndexDeps,
): Promise<CanonicalIndexPhaseResult | CanonicalIndexPhaseSkipped | CanonicalIndexPhaseError> {
  if (!deps.butlerFlags.canonicalIndexEnabled) {
    return { skipped: true, reason: "flag-off: LORE_BUTLER_CANONICAL_INDEX_ENABLED" };
  }

  try {
    const result = await buildCanonicalIndex(vaultId, deps);

    if (deps.butlerFlags.shadowMode) {
      // Shadow mode: compute but do NOT write to vault_canonical_index
      return { ok: true, vaultId, episodeCount: result.episodes.length, shadowed: true };
    }

    // Upsert into vault_canonical_index
    await deps.pg.query(
      `INSERT INTO vault_canonical_index (vault_id, episodes, generated_at, generated_by_run_id)
       VALUES ($1, $2::jsonb, NOW(), $3)
       ON CONFLICT (vault_id) DO UPDATE
         SET episodes            = EXCLUDED.episodes,
             generated_at        = EXCLUDED.generated_at,
             generated_by_run_id = EXCLUDED.generated_by_run_id`,
      [vaultId, JSON.stringify(result.episodes), runId],
    );

    return { ok: true, vaultId, episodeCount: result.episodes.length, shadowed: false };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
