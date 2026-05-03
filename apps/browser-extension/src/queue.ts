import type { CaptureEvent, QueuedCaptureEnvelope } from "./types.js";
import { redactString } from "./redaction.js";

/**
 * Persistent capture queue.
 *
 * v1.0 must survive service-worker shutdown. We hold the queue in
 * `chrome.storage.local`, never in module-scope variables. This module is
 * a pure helper so tests can inject a fake storage and a fake clock.
 */

export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

const QUEUE_KEY = "queue";
const MAX_ATTEMPTS = 6;
const BASE_BACKOFF_MS = 30 * 1000; // 30s
const MAX_BACKOFF_MS = 30 * 60 * 1000; // 30 min

export async function loadQueue(store: KeyValueStore): Promise<QueuedCaptureEnvelope[]> {
  return (await store.get<QueuedCaptureEnvelope[]>(QUEUE_KEY)) ?? [];
}

export async function saveQueue(store: KeyValueStore, queue: QueuedCaptureEnvelope[]): Promise<void> {
  await store.set(QUEUE_KEY, queue);
}

export async function enqueue(
  store: KeyValueStore,
  event: CaptureEvent,
  now: Date = new Date()
): Promise<QueuedCaptureEnvelope[]> {
  const queue = await loadQueue(store);
  const envelope: QueuedCaptureEnvelope = {
    event,
    attempts: 0,
    nextAttemptAt: now.toISOString()
  };
  queue.push(envelope);
  await saveQueue(store, queue);
  return queue;
}

export type UploadResult =
  | { ok: true }
  | { ok: false; permanent: boolean; error: string };

export type UploadFn = (event: CaptureEvent) => Promise<UploadResult>;

/**
 * Drain ready envelopes from the queue. Each envelope is attempted; on
 * success it's removed; on transient failure attempts is incremented and
 * `nextAttemptAt` is pushed out by exponential backoff capped at 30 min;
 * permanent failures are dropped after the retry cap.
 */
export async function drainQueue(
  store: KeyValueStore,
  uploadFn: UploadFn,
  now: Date = new Date()
): Promise<{ uploaded: number; remaining: number; lastError?: string }> {
  const queue = await loadQueue(store);
  const nowIso = now.toISOString();
  let uploaded = 0;
  let lastError: string | undefined;

  const next: QueuedCaptureEnvelope[] = [];

  for (const envelope of queue) {
    if (envelope.nextAttemptAt > nowIso) {
      next.push(envelope);
      continue;
    }
    const result = await uploadFn(envelope.event);
    if (result.ok) {
      uploaded += 1;
      continue;
    }

    const attempts = envelope.attempts + 1;
    const redacted = redactString(result.error);
    if (result.permanent || attempts >= MAX_ATTEMPTS) {
      lastError = redacted;
      // dropped — do not push back
      continue;
    }
    const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (attempts - 1), MAX_BACKOFF_MS);
    next.push({
      ...envelope,
      attempts,
      nextAttemptAt: new Date(now.getTime() + backoff).toISOString(),
      lastError: redacted,
      lastErrorAt: nowIso
    });
    lastError = redacted;
  }

  await saveQueue(store, next);
  return { uploaded, remaining: next.length, lastError };
}

export const __test__ = { QUEUE_KEY, BASE_BACKOFF_MS, MAX_BACKOFF_MS, MAX_ATTEMPTS };
