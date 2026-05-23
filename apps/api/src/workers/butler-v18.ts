// Lore v1.8 Lane M — V1.8-M2 Butler phases (BRA-490..493)
//
// Four maintenance phases executed by the scheduler-v18 butler-daily cron:
//
//   M2.1  prunePhase   — archive stale-14d/unread memory records
//   M2.2  mergePhase   — cosine ≥ 0.95 near-duplicate deduplication
//   M2.3  resolvePhase — LLM contradiction resolution via conflict-detector-v18
//   M2.4  surfacePhase — recall-theme playbook generation (deterministic clustering)
//
// Kill-switch: all phases check LORE_BUTLER_ENABLED === '1' and return
// { skipped: true, reason: 'kill-switch' } when not set.
//
// Phases never throw — errors surface as { ok: false, error: string }.
// A structured log line is emitted to stderr after each phase.
//
// THIS FILE MUST NOT be imported from apps/api/src/index.ts.
// The scheduler is wired in M6 behind LORE_BUTLER_ENABLED=1.

import { randomUUID } from "node:crypto";
import { log } from "../logger.js";
import {
  ConflictDetectorV18,
  type MemoryRecord,
} from "../conflict-detector-v18.js";

// ── Butler cron schedules (UTC) ────────────────────────────────────────────

export const BUTLER_CRON_SCHEDULES = {
  prune: "0 3 * * *",
  merge: "15 3 * * *",
  resolve: "30 3 * * *",
  surface: "45 3 * * *",
} as const;

// ── Postgres pool interface (injectable) ───────────────────────────────────

export interface DbPool {
  query<R = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
  /** Begin a transaction — returns a client with query + release */
  connect(): Promise<DbClient>;
}

export interface DbClient {
  query<R = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
  release(): void;
}

// ── Common result shape ────────────────────────────────────────────────────

export interface PhaseSkipped {
  skipped: true;
  reason: string;
}

export interface PhaseError {
  ok: false;
  error: string;
}

export interface PruneResult {
  ok: true;
  runId: string;
  decisionsCount: number;
  shadowed: boolean;
  vaultId: string;
}

export interface MergeResult {
  ok: true;
  runId: string;
  decisionsCount: number;
  shadowed: boolean;
  vaultId: string;
}

export interface ResolveResult {
  ok: true;
  runId: string;
  resolved: number;
  /** Count of shadowed resolve decisions — unlike other phase results whose
   *  shadowed field is a boolean reflecting overall shadow mode. */
  shadowed: number;
  vaultId: string;
}

export interface SurfaceResult {
  ok: true;
  runId: string;
  playbooksWritten: number;
  shadowed: boolean;
  vaultId: string;
}

// ── Dependency shapes ──────────────────────────────────────────────────────

export interface ButlerDeps {
  db: DbPool;
  now?: () => Date;
}

export interface MergeDeps extends ButlerDeps {
  /** Returns cosine similarity in [0,1] for two float arrays. */
  cosine?: (a: number[], b: number[]) => number;
}

export interface ResolveDeps extends ButlerDeps {
  detector: ConflictDetectorV18;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isButlerEnabled(): boolean {
  return process.env.LORE_BUTLER_ENABLED === "1";
}

function isShadowMode(): boolean {
  return process.env.LORE_BUTLER_SHADOW_MODE === "1";
}

function nowMs(now?: () => Date): number {
  return (now ?? (() => new Date()))().getTime();
}

/** Emit a structured stderr log line per phase. */
function emitPhaseLog(fields: {
  phase: string;
  vaultId: string;
  durationMs: number;
  decisionsCount: number;
  ok: boolean;
  error?: string;
}): void {
  process.stderr.write(
    JSON.stringify({ event: "butler.phase.complete", ...fields }) + "\n",
  );
}

/** Cosine similarity for two equal-length float arrays. */
function defaultCosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Stop-word list for surface-phase keyword clustering. */
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "in", "it", "of", "to", "and", "or", "for",
  "on", "at", "by", "be", "as", "are", "was", "with", "that", "this",
  "from", "have", "has", "had", "do", "does", "did", "not", "but", "what",
  "how", "when", "where", "who", "can", "will", "would", "could", "should",
  "i", "me", "my", "you", "your", "we", "our", "he", "she", "they", "their",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

// ── M2.1 — Prune phase ─────────────────────────────────────────────────────
//
// Archives memory_records that are:
//   • lifecycle_state = 'stale'
//   • stale_since <= NOW() - 14 days
//   • recall_hit_count = 0

export async function prunePhase(
  vaultId: string,
  deps: ButlerDeps,
): Promise<PruneResult | PhaseSkipped | PhaseError> {
  if (!isButlerEnabled()) {
    return { skipped: true, reason: "kill-switch" };
  }

  const startMs = nowMs(deps.now);
  const runId = randomUUID();
  const shadow = isShadowMode();
  const client = await deps.db.connect();

  try {
    // Insert butler_runs row (duration_ms NULL = running)
    await client.query(
      `INSERT INTO butler_runs (id, vault_id, phase, decisions_count, shadow_mode, duration_ms)
       VALUES ($1, $2, 'prune', 0, $3, NULL)`,
      [runId, vaultId, shadow],
    );

    // Find stale records to prune
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM memory_records
       WHERE vault_id = $1
         AND lifecycle_state = 'stale'
         AND stale_since <= NOW() - INTERVAL '14 days'
         AND recall_hit_count = 0`,
      [vaultId],
    );

    // Archive each and write a decision.
    // Shadow mode: record the decision but do NOT mutate memory_records.
    for (const row of rows) {
      if (!shadow) {
        await client.query(
          `UPDATE memory_records
           SET lifecycle_state = 'archived',
               archived_by = 'butler-v18',
               archived_at = NOW()
           WHERE id = $1`,
          [row.id],
        );
      }
      await client.query(
        `INSERT INTO butler_decisions (run_id, action, target_record_id, llm_explanation, shadowed)
         VALUES ($1, 'prune', $2, 'stale-14d-no-recall', $3)`,
        [runId, row.id, shadow],
      );
    }

    const decisionsCount = rows.length;
    const durationMs = nowMs(deps.now) - startMs;

    // Update butler_runs: finalize with decisions_count + duration_ms
    await client.query(
      `UPDATE butler_runs
       SET decisions_count = $1, duration_ms = $2
       WHERE id = $3`,
      [decisionsCount, durationMs, runId],
    );

    client.release();
    emitPhaseLog({ phase: "prune", vaultId, durationMs, decisionsCount, ok: true });
    return { ok: true, runId, decisionsCount, shadowed: shadow, vaultId };
  } catch (err) {
    const durationMs = nowMs(deps.now) - startMs;
    const error = String(err);
    try {
      await client.query(
        `UPDATE butler_runs SET duration_ms = $1 WHERE id = $2`,
        [durationMs, runId],
      );
    } catch {
      // best-effort
    }
    client.release();
    emitPhaseLog({ phase: "prune", vaultId, durationMs, decisionsCount: 0, ok: false, error });
    return { ok: false, error };
  }
}

// ── M2.2 — Merge phase ─────────────────────────────────────────────────────
//
// Detects near-duplicate memory_records (cosine ≥ 0.95, same vault, both active).
// Retains the record with higher confidence_score; marks the other merged_into.
// Skips vaults with > 10,000 active records (O(n²) guard).

const MERGE_COSINE_THRESHOLD = 0.95;
const MERGE_MAX_ACTIVE_RECORDS = 10_000;

export async function mergePhase(
  vaultId: string,
  deps: MergeDeps,
): Promise<MergeResult | PhaseSkipped | PhaseError> {
  if (!isButlerEnabled()) {
    return { skipped: true, reason: "kill-switch" };
  }

  const startMs = nowMs(deps.now);
  const runId = randomUUID();
  const shadow = isShadowMode();
  const cosine = deps.cosine ?? defaultCosine;
  const client = await deps.db.connect();

  try {
    await client.query(
      `INSERT INTO butler_runs (id, vault_id, phase, decisions_count, shadow_mode, duration_ms)
       VALUES ($1, $2, 'merge', 0, $3, NULL)`,
      [runId, vaultId, shadow],
    );

    // Fetch active records with embeddings
    const { rows: records } = await client.query<{
      id: string;
      confidence_score: number;
      embedding: number[] | null;
    }>(
      `SELECT id, confidence_score, embedding
       FROM memory_records
       WHERE vault_id = $1
         AND lifecycle_state = 'active'
         AND embedding IS NOT NULL`,
      [vaultId],
    );

    let decisionsCount = 0;

    // O(n²) guard
    if (records.length > MERGE_MAX_ACTIVE_RECORDS) {
      await client.query(
        `INSERT INTO butler_decisions (run_id, action, llm_explanation, shadowed)
         VALUES ($1, 'merge_skipped_too_large', $2, $3)`,
        [runId, `vault has ${records.length} active records — skipping merge (limit ${MERGE_MAX_ACTIVE_RECORDS})`, shadow],
      );
      decisionsCount = 1;
    } else {
      // Track which records are already merged so we skip them
      const merged = new Set<string>();

      for (let i = 0; i < records.length; i++) {
        if (merged.has(records[i].id)) continue;
        for (let j = i + 1; j < records.length; j++) {
          if (merged.has(records[j].id)) continue;

          const embA = records[i].embedding!;
          const embB = records[j].embedding!;
          if (embA.length !== embB.length) continue;

          const sim = cosine(embA, embB);
          if (sim < MERGE_COSINE_THRESHOLD) continue;

          // Retain the record with higher confidence_score
          const winner =
            records[i].confidence_score >= records[j].confidence_score
              ? records[i]
              : records[j];
          const loser =
            winner.id === records[i].id ? records[j] : records[i];

          // Shadow mode: record the decision but do NOT mutate memory_records.
          if (!shadow) {
            await client.query(
              `UPDATE memory_records
               SET lifecycle_state = 'merged_into',
                   merged_into_id = $1,
                   merged_by = 'butler-v18'
               WHERE id = $2`,
              [winner.id, loser.id],
            );
          }
          await client.query(
            `INSERT INTO butler_decisions (run_id, action, target_record_id, llm_explanation, shadowed)
             VALUES ($1, 'merge', $2, 'cosine-dedup-0.95', $3)`,
            [runId, loser.id, shadow],
          );
          merged.add(loser.id);
          decisionsCount++;
        }
      }
    }

    const durationMs = nowMs(deps.now) - startMs;
    await client.query(
      `UPDATE butler_runs SET decisions_count = $1, duration_ms = $2 WHERE id = $3`,
      [decisionsCount, durationMs, runId],
    );

    client.release();
    emitPhaseLog({ phase: "merge", vaultId, durationMs, decisionsCount, ok: true });
    return { ok: true, runId, decisionsCount, shadowed: shadow, vaultId };
  } catch (err) {
    const durationMs = nowMs(deps.now) - startMs;
    const error = String(err);
    try {
      await client.query(
        `UPDATE butler_runs SET duration_ms = $1 WHERE id = $2`,
        [durationMs, runId],
      );
    } catch {
      // best-effort
    }
    client.release();
    emitPhaseLog({ phase: "merge", vaultId, durationMs, decisionsCount: 0, ok: false, error });
    return { ok: false, error };
  }
}

// ── M2.3 — Resolve phase ───────────────────────────────────────────────────
//
// For each pair of active records sharing the same subject, calls
// ConflictDetectorV18.detect(). On confirmed contradiction (severity != 'low'):
//   • Calls temporalSupersede path (UPDATE memory_records + audit_events)
//   • Inserts butler_decisions row with action='resolve'
//   • Shadow mode: records the decision but does NOT call supersede

export async function resolvePhase(
  vaultId: string,
  deps: ResolveDeps,
): Promise<ResolveResult | PhaseSkipped | PhaseError> {
  if (!isButlerEnabled()) {
    return { skipped: true, reason: "kill-switch" };
  }

  const startMs = nowMs(deps.now);
  const runId = randomUUID();
  const shadow = isShadowMode();
  const client = await deps.db.connect();

  try {
    await client.query(
      `INSERT INTO butler_runs (id, vault_id, phase, decisions_count, shadow_mode, duration_ms)
       VALUES ($1, $2, 'resolve', 0, $3, NULL)`,
      [runId, vaultId, shadow],
    );

    // Fetch candidate pairs: same subject, both active
    const { rows: candidates } = await client.query<{
      id: string;
      content: string;
      subject: string;
    }>(
      `SELECT id, content, subject
       FROM memory_records
       WHERE vault_id = $1
         AND lifecycle_state = 'active'
         AND subject IS NOT NULL
       ORDER BY subject, created_at`,
      [vaultId],
    );

    // Group by subject
    const bySubject = new Map<string, typeof candidates>();
    for (const rec of candidates) {
      const group = bySubject.get(rec.subject) ?? [];
      group.push(rec);
      bySubject.set(rec.subject, group);
    }

    let resolved = 0;
    let shadowed = 0;

    for (const group of bySubject.values()) {
      // Check pairs within same subject
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const recA: MemoryRecord = { id: group[i].id, content: group[i].content, vaultId };
          const recB: MemoryRecord = { id: group[j].id, content: group[j].content, vaultId };

          let detection;
          try {
            detection = await deps.detector.detect(recA, recB);
          } catch (err) {
            log.warn("[butler-v18] conflict detector threw; skipping pair", {
              pairA: recA.id,
              pairB: recB.id,
              error: String(err),
            });
            continue;
          }

          if (!detection.is_conflict || detection.severity === "low") continue;

          if (shadow) {
            // Shadow mode: record decision but do NOT supersede
            await client.query(
              `INSERT INTO butler_decisions (run_id, action, target_record_id, llm_explanation, shadowed)
               VALUES ($1, 'resolve', $2, $3, true)`,
              [runId, recB.id, detection.reason],
            );
            shadowed++;
          } else {
            // Temporal supersede: mark older record superseded
            await client.query(
              `UPDATE memory_records
               SET lifecycle_state = 'superseded',
                   superseded_by_id = $1,
                   superseded_at = NOW()
               WHERE id = $2`,
              [recA.id, recB.id],
            );
            // Audit event
            await client.query(
              `INSERT INTO audit_events (id, vault_id, event_type, payload, created_at)
               VALUES ($1, $2, 'resolved_by_butler', $3::jsonb, NOW())`,
              [
                randomUUID(),
                vaultId,
                JSON.stringify({ runId, keepId: recA.id, supersededId: recB.id, reason: detection.reason }),
              ],
            );
            await client.query(
              `INSERT INTO butler_decisions (run_id, action, target_record_id, llm_explanation, shadowed)
               VALUES ($1, 'resolve', $2, $3, false)`,
              [runId, recB.id, detection.reason],
            );
            resolved++;
          }
        }
      }
    }

    const decisionsCount = resolved + shadowed;
    const durationMs = nowMs(deps.now) - startMs;
    await client.query(
      `UPDATE butler_runs SET decisions_count = $1, duration_ms = $2 WHERE id = $3`,
      [decisionsCount, durationMs, runId],
    );

    client.release();
    emitPhaseLog({ phase: "resolve", vaultId, durationMs, decisionsCount, ok: true });
    return { ok: true, runId, resolved, shadowed, vaultId };
  } catch (err) {
    const durationMs = nowMs(deps.now) - startMs;
    const error = String(err);
    try {
      await client.query(
        `UPDATE butler_runs SET duration_ms = $1 WHERE id = $2`,
        [durationMs, runId],
      );
    } catch {
      // best-effort
    }
    client.release();
    emitPhaseLog({ phase: "resolve", vaultId, durationMs, decisionsCount: 0, ok: false, error });
    return { ok: false, error };
  }
}

// ── M2.4 — Surface phase ───────────────────────────────────────────────────
//
// Scans recall_traces for the past 30 days, clusters queries by shared
// keyword co-occurrence (≥ 2 significant tokens, stop-word filtered).
// Emits one butler_playbooks row per theme cluster that has ≥ 3 queries.
// Deterministic — no LLM required.

const SURFACE_MIN_SHARED_TOKENS = 2;
const SURFACE_MIN_QUERIES_PER_THEME = 3;

export async function surfacePhase(
  vaultId: string,
  deps: ButlerDeps,
): Promise<SurfaceResult | PhaseSkipped | PhaseError> {
  if (!isButlerEnabled()) {
    return { skipped: true, reason: "kill-switch" };
  }

  const startMs = nowMs(deps.now);
  const runId = randomUUID();
  const shadow = isShadowMode();
  const client = await deps.db.connect();

  try {
    await client.query(
      `INSERT INTO butler_runs (id, vault_id, phase, decisions_count, shadow_mode, duration_ms)
       VALUES ($1, $2, 'surface', 0, $3, NULL)`,
      [runId, vaultId, shadow],
    );

    // Fetch recent recall traces
    const { rows: traces } = await client.query<{ query_text: string; hit_count: number }>(
      `SELECT query_text, COUNT(*) AS hit_count
       FROM recall_traces
       WHERE vault_id = $1
         AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY query_text
       ORDER BY hit_count DESC
       LIMIT 200`,
      [vaultId],
    );

    // Build token sets per query
    const queryTokens: Array<{ query: string; tokens: Set<string>; hitCount: number }> = [];
    for (const t of traces) {
      const tokens = new Set(tokenize(t.query_text));
      if (tokens.size > 0) {
        queryTokens.push({ query: t.query_text, tokens, hitCount: Number(t.hit_count) });
      }
    }

    // Greedy clustering: group queries that share ≥ SURFACE_MIN_SHARED_TOKENS tokens
    const assigned = new Set<number>();
    const clusters: Array<{ keywords: string[]; queries: string[] }> = [];

    for (let i = 0; i < queryTokens.length; i++) {
      if (assigned.has(i)) continue;
      const cluster = [i];
      const clusterTokens = new Set(queryTokens[i].tokens);

      for (let j = i + 1; j < queryTokens.length; j++) {
        if (assigned.has(j)) continue;
        // Count shared tokens with ANY existing cluster member
        let shared = 0;
        for (const t of queryTokens[j].tokens) {
          if (clusterTokens.has(t)) shared++;
        }
        if (shared >= SURFACE_MIN_SHARED_TOKENS) {
          cluster.push(j);
          for (const t of queryTokens[j].tokens) clusterTokens.add(t);
        }
      }

      if (cluster.length >= SURFACE_MIN_QUERIES_PER_THEME) {
        cluster.forEach((idx) => assigned.add(idx));
        // Keywords = tokens appearing in the most cluster members
        const tokenFreq = new Map<string, number>();
        for (const idx of cluster) {
          for (const t of queryTokens[idx].tokens) {
            tokenFreq.set(t, (tokenFreq.get(t) ?? 0) + 1);
          }
        }
        const keywords = [...tokenFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t]) => t);
        const queries = cluster.map((idx) => queryTokens[idx].query);
        clusters.push({ keywords, queries });
      }
    }

    let playbooksWritten = 0;
    for (const cluster of clusters) {
      const themeSummary = [
        `## Theme: ${cluster.keywords.join(", ")}`,
        "",
        `Recurring queries (${cluster.queries.length}):`,
        ...cluster.queries.slice(0, 10).map((q) => `- ${q}`),
      ].join("\n");

      // Shadow mode: record the decision but do NOT insert into butler_playbooks.
      if (!shadow) {
        await client.query(
          `INSERT INTO butler_playbooks (vault_id, theme_summary, source)
           VALUES ($1, $2, 'surface-v18')`,
          [vaultId, themeSummary],
        );
      }
      await client.query(
        `INSERT INTO butler_decisions (run_id, action, llm_explanation, shadowed)
         VALUES ($1, 'surface', 'theme-cluster-deterministic', $2)`,
        [runId, shadow],
      );
      playbooksWritten++;
    }

    const durationMs = nowMs(deps.now) - startMs;
    await client.query(
      `UPDATE butler_runs SET decisions_count = $1, duration_ms = $2 WHERE id = $3`,
      [playbooksWritten, durationMs, runId],
    );

    client.release();
    emitPhaseLog({ phase: "surface", vaultId, durationMs, decisionsCount: playbooksWritten, ok: true });
    return { ok: true, runId, playbooksWritten, shadowed: shadow, vaultId };
  } catch (err) {
    const durationMs = nowMs(deps.now) - startMs;
    const error = String(err);
    try {
      await client.query(
        `UPDATE butler_runs SET duration_ms = $1 WHERE id = $2`,
        [durationMs, runId],
      );
    } catch {
      // best-effort
    }
    client.release();
    emitPhaseLog({ phase: "surface", vaultId, durationMs, decisionsCount: 0, ok: false, error });
    return { ok: false, error };
  }
}
