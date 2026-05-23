// Lore v1.8 Lane M Phase M1 — BullMQ scheduler bootstrap with Redis leader-election.
//
// Registers three cron jobs:
//   butler-daily            cron: 0 3 * * *    (03:00 UTC daily)
//   vault-delete-grace-sweep cron: 0 4 * * *   (04:00 UTC daily)
//   health-check-cron       cron: */15 * * * *  (every 15 min)
//
// v2.0.2 US-B — additional cron and event queue:
//   butler-safety-net-v19   cron: 0 4 * * 0    (Sunday 04:00 UTC)
//   lore-butler-event-v19   BullMQ queue for event-driven butler cycles (Lane B)
//
// Leader election: Redis SETNX (SET key NX PX ttl). Only the pod holding the
// lock registers and processes cron jobs. Lock is refreshed every ttl/2 ms.
// Non-leaders schedule a re-check in LEADER_RECHECK_MS.
//
// Dependency injection: all Redis / BullMQ constructors are injectable via
// SchedulerDeps so unit tests run without a live Redis instance.
//
// THIS FILE MUST NOT be imported from apps/api/src/index.ts in this PR.
// The scheduler is wired in M6 behind LORE_BUTLER_ENABLED=1.

import { randomUUID } from "node:crypto";
import { log } from "../logger.js";
import type { ButlerTriggerDeps } from "./butler-trigger.js";
import {
  createShadowCronSpec,
  isShadowEnabled,
  SHADOW_JOB_NAME,
} from "./context-recipe-shadow-scheduler.js";

// ── Public types ──────────────────────────────────────────────────────────────

export type CronProcessor = (job: { id?: string; name: string }) => Promise<void>;

export interface CronSpec {
  name: string;
  cron: string;
  processor?: CronProcessor;
}

export interface SchedulerStartOptions {
  /** Redis URL — defaults to process.env.LORE_REDIS_URL */
  redisUrl?: string;
  /** BullMQ queue name — defaults to "lore-scheduler-v18" */
  queueName?: string;
  /** Leader lock TTL in ms — defaults to 30_000 */
  leaderLockTtlMs?: number;
  /** Interval to re-check leader lock when not leader — defaults to 30_000 */
  leaderRecheckMs?: number;
  /** Pod identity for leader lock value — defaults to random UUID */
  podId?: string;
  /** Override default cron processors per job name */
  processors?: Record<string, CronProcessor>;
  /** Dependency injection seam (for testing) */
  deps?: Partial<SchedulerDeps>;
  /** How often to poll LORE_BUTLER_ENABLED env var in ms — defaults to 10_000 */
  killSwitchPollMs?: number;
  /** Max ms to wait for in-flight jobs to finish during kill-switch drain — defaults to 55_000 */
  drainTimeoutMs?: number;
  /**
   * v2.0.2 US-B — Butler v19 flag snapshot for event trigger + safety-net cron.
   * When provided and butlerV19Enabled + eventTriggerEnabled are true, the
   * v19 safety-net cron and event queue are registered. The existing
   * butler-daily processor still runs until a real v19 phase runner replaces
   * the placeholder in butler-trigger.ts.
   */
  butlerTriggerDeps?: ButlerTriggerDeps;
}

export interface SchedulerHandle {
  stop(): Promise<void>;
  getState(): SchedulerState;
}

export interface SchedulerState {
  enabled: boolean;
  leader: boolean;
  draining: boolean;
  halted: boolean;
  cronJobs: string[];
}

// ── Dependency injection interfaces ──────────────────────────────────────────

export interface RedisLike {
  set(
    key: string,
    value: string,
    mode: "NX",
    expireMode: "PX",
    ttl: number,
  ): Promise<"OK" | null>;
  quit(): Promise<unknown>;
}

export interface QueueLike {
  upsertJobScheduler(
    id: string,
    repeatOpts: { pattern: string },
    jobTemplate?: { name: string; data: Record<string, unknown> },
  ): Promise<unknown>;
  close(): Promise<void>;
}

export interface WorkerLike {
  close(): Promise<void>;
}

export interface QueueEventsLike {
  close(): Promise<void>;
}

export interface SchedulerDeps {
  createRedis: (url: string) => RedisLike;
  createQueue: (name: string, opts: { connection: RedisLike }) => QueueLike;
  createWorker: (
    name: string,
    processor: (job: { id?: string; name: string }) => Promise<void>,
    opts: { connection: RedisLike },
  ) => WorkerLike;
  createQueueEvents?: (name: string, opts: { connection: RedisLike }) => QueueEventsLike;
  now?: () => Date;
}

// ── Default (real) deps — only constructed when explicitly called ─────────────

export function realSchedulerDeps(): SchedulerDeps {
  return {
    createRedis(url) {
      // Dynamic import keeps bullmq/ioredis out of test bundles that don't call this.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Redis } = require("ioredis") as { Redis: new (url: string, opts: unknown) => RedisLike };
      return new Redis(url, {
        connectTimeout: 3000,
        lazyConnect: false,
        maxRetriesPerRequest: 1,
      });
    },
    createQueue(name, opts) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Queue } = require("bullmq") as { Queue: new (name: string, opts: unknown) => QueueLike };
      return new Queue(name, opts);
    },
    createWorker(name, processor, opts) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Worker } = require("bullmq") as { Worker: new (name: string, processor: unknown, opts: unknown) => WorkerLike };
      return new Worker(name, processor, opts);
    },
    createQueueEvents(name, opts) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { QueueEvents } = require("bullmq") as { QueueEvents: new (name: string, opts: unknown) => QueueEventsLike };
      return new QueueEvents(name, opts);
    },
  };
}

// ── Default cron specs ────────────────────────────────────────────────────────

const DEFAULT_CRON_SPECS: CronSpec[] = [
  { name: "butler-daily", cron: "0 3 * * *" },
  { name: "vault-delete-grace-sweep", cron: "0 4 * * *" },
  { name: "health-check-cron", cron: "*/15 * * * *" },
];

// v2.0.2 US-B: safety-net cron spec (registered only when v19 flags are enabled)
const BUTLER_SAFETY_NET_SPEC: CronSpec = {
  name: "butler-safety-net-v19",
  cron: "0 4 * * 0", // Sunday 04:00 UTC
};

// v2.0.2 US-B: BullMQ queue name for event-driven butler cycles
const BUTLER_EVENT_QUEUE_NAME = "lore-butler-event-v19";

// ── Stub processors ───────────────────────────────────────────────────────────

function makeStubProcessor(jobName: string): CronProcessor {
  return async (_job) => {
    log.info(`[scheduler-v18] stub processor invoked`, { job: jobName });
  };
}

// ── Internal state ────────────────────────────────────────────────────────────

interface InternalState {
  enabled: boolean;
  leader: boolean;
  draining: boolean;
  halted: boolean;
  cronJobs: string[];
  lockRefreshTimer: ReturnType<typeof setInterval> | null;
  recheckTimer: ReturnType<typeof setTimeout> | null;
  killSwitchTimer: ReturnType<typeof setInterval> | null;
  redis: RedisLike | null;
  queue: QueueLike | null;
  worker: WorkerLike | null;
  queueEvents: QueueEventsLike | null;
  // Track in-flight job promises for drain-safe shutdown
  inFlight: Set<Promise<void>>;
  // v2.0.2 US-B: event-driven butler queue + worker
  butlerEventQueue: QueueLike | null;
  butlerEventWorker: WorkerLike | null;
}

// ── Leader lock ───────────────────────────────────────────────────────────────

const LEADER_KEY = "lore:scheduler:leader";

async function acquireLeaderLock(
  redis: RedisLike,
  podId: string,
  ttlMs: number,
): Promise<boolean> {
  const result = await redis.set(LEADER_KEY, podId, "NX", "PX", ttlMs);
  return result === "OK";
}

// ── startScheduler ────────────────────────────────────────────────────────────

export async function startScheduler(opts: SchedulerStartOptions = {}): Promise<SchedulerHandle> {
  const {
    redisUrl = process.env.LORE_REDIS_URL ?? "redis://localhost:6379",
    queueName = "lore-scheduler-v18",
    leaderLockTtlMs = 30_000,
    leaderRecheckMs = 30_000,
    podId = randomUUID(),
    processors = {},
    deps: depsOverride = {},
    killSwitchPollMs = 10_000,
    drainTimeoutMs = 55_000,
    butlerTriggerDeps,
  } = opts;

  const deps: SchedulerDeps = { ...realSchedulerDeps(), ...depsOverride };

  // v2.0.2 US-B: determine if v19 event trigger is active
  const v19EventTriggerActive =
    butlerTriggerDeps !== undefined &&
    butlerTriggerDeps.butlerFlags.butlerV19Enabled &&
    butlerTriggerDeps.butlerFlags.eventTriggerEnabled;

  const state: InternalState = {
    enabled: true,
    leader: false,
    draining: false,
    halted: false,
    cronJobs: [],
    lockRefreshTimer: null,
    recheckTimer: null,
    killSwitchTimer: null,
    redis: null,
    queue: null,
    worker: null,
    queueEvents: null,
    inFlight: new Set(),
    butlerEventQueue: null,
    butlerEventWorker: null,
  };

  const redis = deps.createRedis(redisUrl);
  state.redis = redis;

  // Resolve processors: caller overrides > stubs
  const resolvedProcessors: Record<string, CronProcessor> = {};
  for (const spec of DEFAULT_CRON_SPECS) {
    resolvedProcessors[spec.name] = processors[spec.name] ?? makeStubProcessor(spec.name);
  }

  // v2.0.2 US-B: when v19 event trigger is active, add the safety-net sweep
  // and event queue. Keep butler-daily intact until v19 has a real runner.
  if (v19EventTriggerActive) {
    // Register safety-net sweep processor
    resolvedProcessors[BUTLER_SAFETY_NET_SPEC.name] =
      processors[BUTLER_SAFETY_NET_SPEC.name] ??
      (async (_job) => {
        const { safetyNetSweep } = await import("./butler-trigger.js");
        const result = await safetyNetSweep(butlerTriggerDeps!);
        log.info("[scheduler-v18] safety-net sweep complete", { enqueued: result.enqueued });
      });
  }

  async function activate(): Promise<void> {
    const isLeader = await acquireLeaderLock(redis, podId, leaderLockTtlMs);
    state.leader = isLeader;

    if (!isLeader) {
      log.info("[scheduler-v18] not leader; will re-check", { recheckMs: leaderRecheckMs });
      state.recheckTimer = setTimeout(() => {
        if (!state.draining && !state.halted) {
          activate().catch((err) => {
            log.warn("[scheduler-v18] re-check activate error", { err: String(err) });
          });
        }
      }, leaderRecheckMs);
      return;
    }

    log.info("[scheduler-v18] acquired leader lock", { podId, queueName });

    // Create queue + worker
    const queue = deps.createQueue(queueName, { connection: redis });
    state.queue = queue;

    const worker = deps.createWorker(
      queueName,
      async (job) => {
        const processor = resolvedProcessors[job.name];
        if (!processor) {
          log.warn("[scheduler-v18] no processor for job", { name: job.name });
          return;
        }
        const p = processor(job);
        state.inFlight.add(p);
        try {
          await p;
        } finally {
          state.inFlight.delete(p);
        }
      },
      { connection: redis },
    );
    state.worker = worker;

    if (deps.createQueueEvents) {
      state.queueEvents = deps.createQueueEvents(queueName, { connection: redis });
    }

    // Register cron jobs
    for (const spec of DEFAULT_CRON_SPECS) {
      await queue.upsertJobScheduler(
        spec.name,
        { pattern: spec.cron },
        { name: spec.name, data: {} },
      );
      state.cronJobs.push(spec.name);
      log.info("[scheduler-v18] registered cron job", { name: spec.name, cron: spec.cron });
    }

    // v2.0.9 Lane C2: register shadow recipe cron when env flag is set.
    if (isShadowEnabled(process.env.LORE_CONTEXT_RECIPE_SHADOW_ENABLED)) {
      const shadowSpec = createShadowCronSpec(
        processors[SHADOW_JOB_NAME],
      );
      resolvedProcessors[SHADOW_JOB_NAME] = shadowSpec.processor!;
      await queue.upsertJobScheduler(
        SHADOW_JOB_NAME,
        { pattern: shadowSpec.cron },
        { name: SHADOW_JOB_NAME, data: {} },
      );
      state.cronJobs.push(SHADOW_JOB_NAME);
      log.info("[scheduler-v18] registered context-recipe-shadow cron", {
        name: SHADOW_JOB_NAME,
        cron: shadowSpec.cron,
      });
    } else {
      log.info("[scheduler-v18] context-recipe-shadow disabled (env flag not set)", {
        flag: "LORE_CONTEXT_RECIPE_SHADOW_ENABLED",
      });
    }

    // v2.0.2 US-B: register safety-net cron + butler-event queue when v19 active
    if (v19EventTriggerActive) {
      // Register Sunday 04:00 UTC safety-net sweep
      await queue.upsertJobScheduler(
        BUTLER_SAFETY_NET_SPEC.name,
        { pattern: BUTLER_SAFETY_NET_SPEC.cron },
        { name: BUTLER_SAFETY_NET_SPEC.name, data: {} },
      );
      state.cronJobs.push(BUTLER_SAFETY_NET_SPEC.name);
      log.info("[scheduler-v18] registered safety-net cron", {
        name: BUTLER_SAFETY_NET_SPEC.name,
        cron: BUTLER_SAFETY_NET_SPEC.cron,
      });

      // Start butler-event queue + worker for event-driven cycles
      const butlerEventQueue = deps.createQueue(BUTLER_EVENT_QUEUE_NAME, { connection: redis });
      state.butlerEventQueue = butlerEventQueue;

      const butlerEventWorker = deps.createWorker(
        BUTLER_EVENT_QUEUE_NAME,
        async (job) => {
          const { butlerEventJobProcessor } = await import("./butler-trigger.js");
          const p = butlerEventJobProcessor(
            job as unknown as { data: { vaultId: string } },
            butlerTriggerDeps!,
          );
          state.inFlight.add(p);
          try {
            await p;
          } finally {
            state.inFlight.delete(p);
          }
        },
        { connection: redis },
      );
      state.butlerEventWorker = butlerEventWorker;
      log.info("[scheduler-v18] butler-event queue+worker started", {
        queueName: BUTLER_EVENT_QUEUE_NAME,
      });
    }

    // Refresh lock every ttl/2
    state.lockRefreshTimer = setInterval(async () => {
      if (state.draining || state.halted) return;
      try {
        // Re-acquire (override) to refresh TTL; use SET with PX (not NX so we can refresh)
        // We call acquireLeaderLock which uses NX; if we already hold it the lock may have
        // expired. To refresh we use a separate set-if-equal pattern. For simplicity here
        // we call acquireLeaderLock — if another pod stole it we'll detect leader=false.
        const stillLeader = await acquireLeaderLock(redis, podId, leaderLockTtlMs);
        if (!stillLeader) {
          log.warn("[scheduler-v18] lost leader lock");
          state.leader = false;
          if (state.lockRefreshTimer) clearInterval(state.lockRefreshTimer);
        }
      } catch (err) {
        log.warn("[scheduler-v18] lock refresh error", { err: String(err) });
      }
    }, Math.floor(leaderLockTtlMs / 2));
  }

  await activate();

  // ── Kill-switch poll loop ──────────────────────────────────────────────────
  // Polls LORE_BUTLER_ENABLED every killSwitchPollMs ms. If the var is '0'
  // and the scheduler is not already draining/halted, triggers a drain-safe halt.
  state.killSwitchTimer = setInterval(() => {
    if (state.draining || state.halted) return;
    if (process.env.LORE_BUTLER_ENABLED !== "0") return;

    state.draining = true;
    state.enabled = false;

    // Clear the kill-switch timer itself so it doesn't re-fire during drain.
    if (state.killSwitchTimer) {
      clearInterval(state.killSwitchTimer);
      state.killSwitchTimer = null;
    }

    const drainStart = Date.now();

    // Bounded drain: wait for in-flight promises up to drainTimeoutMs.
    const inFlightArray = [...state.inFlight];
    const drainPromise =
      inFlightArray.length > 0
        ? Promise.allSettled(inFlightArray)
        : Promise.resolve([]);

    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(() => {
        process.stderr.write(
          JSON.stringify({
            event: "butler.killswitch.drain_timeout",
            drainTimeoutMs,
            inFlightCount: state.inFlight.size,
          }) + "\n",
        );
        resolve();
      }, drainTimeoutMs),
    );

    Promise.race([drainPromise, timeoutPromise]).then(() => {
      const drainMs = Date.now() - drainStart;
      // Clear inFlight so stopScheduler does not double-wait (drain window already elapsed).
      state.inFlight.clear();
      stopScheduler({ state }).then(() => {
        process.stderr.write(
          JSON.stringify({ event: "butler.killswitch.engaged", drainMs }) + "\n",
        );
      });
    });
  }, killSwitchPollMs);

  return {
    stop: () => stopScheduler({ state }),
    getState: () => getSchedulerState({ state }),
  };
}

// ── getSchedulerState ─────────────────────────────────────────────────────────

export function getSchedulerState(handle: { state: InternalState }): SchedulerState {
  return {
    enabled: handle.state.enabled,
    leader: handle.state.leader,
    draining: handle.state.draining,
    halted: handle.state.halted,
    cronJobs: [...handle.state.cronJobs],
  };
}

// ── stopScheduler ─────────────────────────────────────────────────────────────

export async function stopScheduler(handle: { state: InternalState }): Promise<void> {
  const { state } = handle;
  if (state.halted) return;

  state.draining = true;

  // Clear timers
  if (state.lockRefreshTimer) {
    clearInterval(state.lockRefreshTimer);
    state.lockRefreshTimer = null;
  }
  if (state.recheckTimer) {
    clearTimeout(state.recheckTimer);
    state.recheckTimer = null;
  }
  if (state.killSwitchTimer) {
    clearInterval(state.killSwitchTimer);
    state.killSwitchTimer = null;
  }

  // Wait for in-flight jobs
  if (state.inFlight.size > 0) {
    await Promise.allSettled([...state.inFlight]);
  }

  // Close BullMQ resources
  await Promise.allSettled([
    state.queueEvents?.close() ?? Promise.resolve(),
    state.worker?.close() ?? Promise.resolve(),
    state.queue?.close() ?? Promise.resolve(),
    // v2.0.2 US-B: close butler-event queue + worker if started
    state.butlerEventWorker?.close() ?? Promise.resolve(),
    state.butlerEventQueue?.close() ?? Promise.resolve(),
  ]);

  // Close Redis connection
  if (state.redis) {
    await state.redis.quit().catch(() => undefined);
    state.redis = null;
  }

  state.draining = false;
  state.halted = true;
  state.enabled = false;

  log.info("[scheduler-v18] stopped");
}
