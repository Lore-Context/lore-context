import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { CapturedSessionV08 } from "./types-v08.js";

// Local upload queue (Workstream D — PRD §8.4 daemon storage).
//
// Why a local queue: the daemon must survive cloud outages, paused sources,
// and `lore status`-driven retries. Holding pending uploads in memory means
// we lose them on a process restart. Disk-backed JSONL would force one large
// file; per-envelope JSON files map naturally to retry semantics and are easy
// for an operator to inspect.
//
// File layout (under `queueDir`, default `~/.lore/queue/`):
//   <idempotencyKey>.json   — pending upload envelope
//
// Each file is a `QueueEnvelope` containing the canonical V08 session plus
// retry metadata. Atomic write via tempfile+rename to survive crashes.

export interface QueueEnvelope {
  schemaVersion: 1;
  // Same value as the V08 session payload, kept for fast lookup without
  // parsing the full session.
  idempotencyKey: string;
  session: CapturedSessionV08;
  enqueuedAt: string;
  attempts: number;
  // ISO 8601 timestamp of the next allowed retry.
  nextRunAt: string;
  lastError?: string;
}

export interface NextAttemptSchedule {
  attempts: number;
  // Optional override for unit tests; production uses exponential backoff.
  baseDelayMs?: number;
  capDelayMs?: number;
  now?: Date;
}

export function nextRunAt({ attempts, baseDelayMs = 5_000, capDelayMs = 5 * 60_000, now = new Date() }: NextAttemptSchedule): string {
  // Exponential backoff with cap. attempts 0 → baseDelayMs (5s),
  // 1 → 10s, 2 → 20s, ... capped at 5 min.
  const delay = Math.min(capDelayMs, baseDelayMs * Math.pow(2, Math.max(0, attempts)));
  return new Date(now.getTime() + delay).toISOString();
}

export function defaultQueueDir(homeDir: string = os.homedir()): string {
  return path.join(homeDir, ".lore", "queue");
}

export class UploadQueue {
  private readonly queueDir: string;

  constructor(queueDir?: string) {
    this.queueDir = queueDir ?? defaultQueueDir();
  }

  // Idempotently enqueue an envelope. If the same idempotency key is already
  // pending, the existing envelope is preserved (callers should never reset
  // attempts/nextRunAt by re-enqueuing — that would defeat backoff).
  async enqueue(session: CapturedSessionV08, now: Date = new Date()): Promise<QueueEnvelope> {
    await mkdir(this.queueDir, { recursive: true });
    const file = this.fileFor(session.idempotencyKey);
    const existing = await this.readIfExists(file);
    if (existing) return existing;
    const envelope: QueueEnvelope = {
      schemaVersion: 1,
      idempotencyKey: session.idempotencyKey,
      session,
      enqueuedAt: now.toISOString(),
      attempts: 0,
      nextRunAt: now.toISOString()
    };
    await writeAtomic(file, JSON.stringify(envelope, null, 2));
    return envelope;
  }

  // Return envelopes whose `nextRunAt <= now`, oldest first by `enqueuedAt`.
  async dueEnvelopes(now: Date = new Date()): Promise<QueueEnvelope[]> {
    const all = await this.list();
    return all
      .filter((env) => new Date(env.nextRunAt).getTime() <= now.getTime())
      .sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
  }

  async list(): Promise<QueueEnvelope[]> {
    let entries: string[];
    try {
      entries = await readdir(this.queueDir);
    } catch {
      return [];
    }
    const out: QueueEnvelope[] = [];
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      const env = await this.readIfExists(path.join(this.queueDir, name));
      if (env) out.push(env);
    }
    return out;
  }

  async size(): Promise<number> {
    const all = await this.list();
    return all.length;
  }

  // Mark success: drop the envelope. The scanner state file holds the
  // long-term "already uploaded" record; the queue is for in-flight work.
  async ack(idempotencyKey: string): Promise<void> {
    try {
      await unlink(this.fileFor(idempotencyKey));
    } catch {
      // already gone is fine
    }
  }

  async fail(idempotencyKey: string, error: string, now: Date = new Date()): Promise<QueueEnvelope | null> {
    const file = this.fileFor(idempotencyKey);
    const env = await this.readIfExists(file);
    if (!env) return null;
    env.attempts += 1;
    env.lastError = error;
    env.nextRunAt = nextRunAt({ attempts: env.attempts, now });
    await writeAtomic(file, JSON.stringify(env, null, 2));
    return env;
  }

  // Drop envelopes whose attempt count exceeds the dead-letter cap. Returns
  // dropped envelopes so the caller can surface them via `lore status`.
  async drainDeadLetters(maxAttempts: number): Promise<QueueEnvelope[]> {
    const all = await this.list();
    const dropped: QueueEnvelope[] = [];
    for (const env of all) {
      if (env.attempts >= maxAttempts) {
        dropped.push(env);
        await this.ack(env.idempotencyKey);
      }
    }
    return dropped;
  }

  private fileFor(idempotencyKey: string): string {
    // sanitize: idempotency keys are produced by `buildIdempotencyKey` and
    // contain only `[A-Za-z0-9_]`, but defend against future format drift.
    const safe = idempotencyKey.replace(/[^A-Za-z0-9_-]/g, "_");
    return path.join(this.queueDir, `${safe}.json`);
  }

  private async readIfExists(file: string): Promise<QueueEnvelope | null> {
    try {
      const raw = await readFile(file, "utf-8");
      const parsed = JSON.parse(raw) as QueueEnvelope;
      if (parsed && parsed.schemaVersion === 1 && parsed.idempotencyKey) return parsed;
      return null;
    } catch {
      return null;
    }
  }
}

async function writeAtomic(file: string, contents: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, contents, "utf-8");
  await rename(tmp, file);
}
