// Lore v2.0.2 US-B — Event-driven butler trigger (Lane B).
//
// Implements:
//   B1  Redis INCR counter per vault on every memory_write (≤5ms p99 overhead)
//   B2  Enqueue BullMQ delayed job when counter ≥ MIN_NEW + 24h elapsed + not enqueued
//   B3  Deduplication via butler:enqueued:<vaultId> NX key
//   B4  On job completion: DEL counter + SET last_run EX 86400 + DEL enqueued
//   B5  Redis unavailable → RDS fallback gating (butler_runs SELECT)
//   B6  Safety-net cron (Sunday 04:00 UTC) — enqueue stale vaults
//   B7  Load test harness stub (STAGING-REQUIRED, .skip)
//   B8  LORE_BUTLER_FORCE_RUN_ALL=1 → bypass gating in safety-net sweep
//
// NOTE: runAllButlerPhases is a stub — Lane M will replace with real phase runner.
// All exported functions use dependency injection for testability.

import { log } from "../logger.js";
import type { RedisClientV19 } from "../redis-client-v14.js";
import type { ButlerFlagSnapshot } from "../butler-flags.js";

// Re-export so consumers can import from a single location.
export type { RedisClientV19 } from "../redis-client-v14.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const REDIS_PREFIX_NEW_RECORDS = "butler:new_records:";
const REDIS_PREFIX_LAST_RUN = "butler:last_run:";
const REDIS_PREFIX_ENQUEUED = "butler:enqueued:";

const LAST_RUN_TTL_SECONDS = 86400; // 24h

// Jitter window: 0–6 hours (in seconds / ms)
const JITTER_WINDOW_SECONDS = 6 * 60 * 60; // 21600
const JITTER_WINDOW_MS = JITTER_WINDOW_SECONDS * 1000;

function getMinNewMemories(): number {
  return parseInt(process.env.LORE_BUTLER_MIN_NEW_MEMORIES ?? "20", 10);
}

// ── Dependency interfaces ─────────────────────────────────────────────────────

export interface ButlerQueueLike {
  add(
    name: string,
    data: Record<string, unknown>,
    opts: { delay: number },
  ): Promise<unknown>;
}

export interface ButlerTriggerDeps {
  redis: RedisClientV19;
  butlerQueue: ButlerQueueLike;
  pgQuery: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  butlerFlags: ButlerFlagSnapshot;
}

// ── Stub phase runner (Lane M will replace) ───────────────────────────────────

/**
 * Placeholder for future v19 phase orchestration.
 *
 * It intentionally throws so the event-triggered path cannot mark a vault as
 * successfully processed until a real phase runner is wired. This preserves
 * the existing v18 daily Butler path and prevents false last_run markers.
 */
async function runAllButlerPhases(
  vaultId: string,
  _shadowMode: boolean,
): Promise<void> {
  log.info("[butler-trigger] runAllButlerPhases stub invoked", { vaultId, _shadowMode });
  throw new Error(`butler-v19 phase runner is not wired for vault ${vaultId}`);
}

// ── maybeTriggerButler ────────────────────────────────────────────────────────

/**
 * Called after every successful memory_write. Increments per-vault Redis counter
 * and, when threshold + gating conditions are met, enqueues a delayed BullMQ job.
 *
 * Non-fatal: any error is caught and logged; the caller (memory_write handler)
 * must never fail due to trigger errors.
 */
export async function maybeTriggerButler(
  vaultId: string,
  deps: ButlerTriggerDeps,
): Promise<void> {
  const { redis, butlerQueue, butlerFlags } = deps;

  // Gate 1: feature flags
  if (!butlerFlags.eventTriggerEnabled || !butlerFlags.butlerV19Enabled) {
    return;
  }

  try {
    // B1: INCR counter
    const counter = await redis.incr(`${REDIS_PREFIX_NEW_RECORDS}${vaultId}`);

    // Gate 2: below threshold
    const minNew = getMinNewMemories();
    if (counter < minNew) {
      return;
    }

    // B1: EXISTS last_run (counts as 2nd Redis call per write for B1 assertion)
    // Gate 3: ran within 24h
    const lastRunExists = await redis.exists(`${REDIS_PREFIX_LAST_RUN}${vaultId}`);
    if (lastRunExists === 1) {
      return;
    }

    // B3: SET NX — deduplication guard
    const enqueuedKey = `${REDIS_PREFIX_ENQUEUED}${vaultId}`;
    const acquired = await redis.setNxEx(enqueuedKey, "1", JITTER_WINDOW_SECONDS + 60);
    if (acquired === null) {
      // Already enqueued
      return;
    }

    // B2: enqueue delayed job with uniform random jitter in [0, 6h)
    const delay = Math.floor(Math.random() * JITTER_WINDOW_MS);
    try {
      await butlerQueue.add("butler-event", { vaultId }, { delay });
    } catch (err) {
      await redis.del(enqueuedKey).catch(() => undefined);
      throw err;
    }

    log.info("[butler-trigger] enqueued butler-event job", { vaultId, delayMs: delay });
  } catch (err) {
    // B5: Redis unavailable — fall back to RDS-based gating
    log.warn("[butler-trigger] Redis error, falling back to RDS gating", { vaultId, err: String(err) });
    await maybeTriggerButlerWithRdsFallback(vaultId, deps);
  }
}

// ── maybeTriggerButlerWithRdsFallback ─────────────────────────────────────────

/**
 * B5 fallback: Redis is unavailable. Use butler_runs table to decide whether
 * to enqueue. Writes are never blocked by this path.
 */
export async function maybeTriggerButlerWithRdsFallback(
  vaultId: string,
  deps: ButlerTriggerDeps,
): Promise<void> {
  const { butlerQueue, pgQuery, butlerFlags } = deps;

  if (!butlerFlags.eventTriggerEnabled || !butlerFlags.butlerV19Enabled) {
    return;
  }

  try {
    // Check last run via RDS
    const result = await pgQuery(
      `SELECT run_at FROM butler_runs WHERE vault_id = $1 ORDER BY run_at DESC LIMIT 1`,
      [vaultId],
    );

    if (result.rows.length > 0) {
      const row = result.rows[0] as { run_at: string };
      const lastRunAt = new Date(row.run_at).getTime();
      const now = Date.now();
      if (now - lastRunAt < LAST_RUN_TTL_SECONDS * 1000) {
        // Ran within 24h
        return;
      }
    }

    // Enqueue with jitter (no dedup guard possible without Redis)
    const delay = Math.floor(Math.random() * JITTER_WINDOW_MS);
    await butlerQueue.add("butler-event", { vaultId }, { delay });
    log.info("[butler-trigger] RDS-fallback enqueued butler-event job", { vaultId, delayMs: delay });
  } catch (err) {
    // Log but never throw — memory_write must succeed regardless
    log.warn("[butler-trigger] RDS-fallback also failed (non-fatal)", { vaultId, err: String(err) });
  }
}

// ── butlerEventJobProcessor ───────────────────────────────────────────────────

/**
 * BullMQ processor for butler-event jobs.
 * B4: on success DEL counter + SET last_run EX 86400 + DEL enqueued (in order).
 */
export async function butlerEventJobProcessor(
  job: { data: { vaultId: string } },
  deps: ButlerTriggerDeps,
): Promise<void> {
  const { vaultId } = job.data;
  const { redis, butlerFlags } = deps;

  log.info("[butler-trigger] processing butler-event job", { vaultId });

  try {
    await runAllButlerPhases(vaultId, butlerFlags.shadowMode);

    // B4: success — clean up Redis state in defined order
    await redis.del(`${REDIS_PREFIX_NEW_RECORDS}${vaultId}`);
    await redis.set(`${REDIS_PREFIX_LAST_RUN}${vaultId}`, "1", LAST_RUN_TTL_SECONDS);
    await redis.del(`${REDIS_PREFIX_ENQUEUED}${vaultId}`);

    log.info("[butler-trigger] butler-event job completed", { vaultId });
  } catch (err) {
    // On failure: preserve counter so threshold re-triggers naturally
    log.warn("[butler-trigger] butler-event job failed, preserving counter", {
      vaultId,
      err: String(err),
    });
    throw err;
  }
}

// ── safetyNetSweep ────────────────────────────────────────────────────────────

/**
 * B6/B8: Safety-net sweep — run Sunday 04:00 UTC.
 * Finds vaults with active memory_items that have no recent butler run,
 * and enqueues them. When LORE_BUTLER_FORCE_RUN_ALL=1, enqueues all active
 * vaults regardless of last run time (B8).
 */
export async function safetyNetSweep(
  deps: ButlerTriggerDeps,
): Promise<{ enqueued: number }> {
  const { butlerQueue, pgQuery } = deps;
  const forceAll = process.env.LORE_BUTLER_FORCE_RUN_ALL === "1";

  let rows: { vault_id: string }[];

  if (forceAll) {
    // B8: enqueue all active vaults unconditionally
    const result = await pgQuery(
      `SELECT DISTINCT vault_id
       FROM memory_items
       WHERE status = 'active'`,
    );
    rows = result.rows as { vault_id: string }[];
  } else {
    // B6: vaults with active records AND (never run OR last run > 7 days ago)
    const result = await pgQuery(
      `SELECT DISTINCT mr.vault_id
       FROM memory_items mr
       LEFT JOIN butler_runs br ON br.vault_id = mr.vault_id
         AND br.run_at > NOW() - INTERVAL '7 days'
       WHERE mr.status = 'active'
         AND br.vault_id IS NULL`,
    );
    rows = result.rows as { vault_id: string }[];
  }

  let enqueued = 0;
  for (const row of rows) {
    const delay = Math.floor(Math.random() * JITTER_WINDOW_MS);
    try {
      await butlerQueue.add("butler-event", { vaultId: row.vault_id }, { delay });
      enqueued++;
    } catch (err) {
      log.warn("[butler-trigger] safetyNetSweep: failed to enqueue vault", {
        vaultId: row.vault_id,
        err: String(err),
      });
    }
  }

  log.info("[butler-trigger] safetyNetSweep complete", { enqueued, forceAll });
  return { enqueued };
}
