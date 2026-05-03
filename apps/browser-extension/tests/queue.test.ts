import { describe, expect, it } from "vitest";
import { drainQueue, enqueue, loadQueue, type KeyValueStore, type UploadFn } from "../src/queue.js";
import type { CaptureEvent } from "../src/types.js";

const FROZEN = new Date("2026-05-01T12:00:00.000Z");

function fakeStore(): KeyValueStore & { dump(): Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  return {
    async get<T>(key: string) {
      return data[key] as T | undefined;
    },
    async set<T>(key: string, value: T) {
      data[key] = value;
    },
    dump() {
      return data;
    }
  };
}

function event(): CaptureEvent {
  return {
    source_id: "ext_chatgpt",
    external_event_id: "evt-1",
    occurred_at: FROZEN.toISOString(),
    event_type: "session_delta",
    actor: "user",
    summary: "hi",
    capture_mode: "summary_only",
    source_url: "https://chatgpt.com/c/1",
    source_label: "ChatGPT",
    provider: "chatgpt"
  };
}

describe("queue.enqueue", () => {
  it("appends an envelope with attempts=0", async () => {
    const store = fakeStore();
    const queue = await enqueue(store, event(), FROZEN);
    expect(queue).toHaveLength(1);
    expect(queue[0].attempts).toBe(0);
    expect(queue[0].nextAttemptAt).toBe(FROZEN.toISOString());
  });
});

describe("queue.drainQueue", () => {
  it("uploads ready envelopes and removes successes", async () => {
    const store = fakeStore();
    await enqueue(store, event(), FROZEN);
    const upload: UploadFn = async () => ({ ok: true });
    const result = await drainQueue(store, upload, FROZEN);
    expect(result.uploaded).toBe(1);
    expect(result.remaining).toBe(0);
  });

  it("retries with exponential backoff on transient failure", async () => {
    const store = fakeStore();
    await enqueue(store, event(), FROZEN);
    const upload: UploadFn = async () => ({ ok: false, permanent: false, error: "timeout" });
    const r1 = await drainQueue(store, upload, FROZEN);
    expect(r1.remaining).toBe(1);
    const queue1 = await loadQueue(store);
    expect(queue1[0].attempts).toBe(1);
    expect(Date.parse(queue1[0].nextAttemptAt)).toBeGreaterThan(FROZEN.getTime());
  });

  it("skips envelopes whose nextAttemptAt is in the future", async () => {
    const store = fakeStore();
    await enqueue(store, event(), FROZEN);
    const upload: UploadFn = async () => ({ ok: false, permanent: false, error: "timeout" });
    await drainQueue(store, upload, FROZEN); // sets nextAttemptAt = +30s
    const stillEarly = new Date(FROZEN.getTime() + 1000);
    let attempts = 0;
    const counter: UploadFn = async () => {
      attempts += 1;
      return { ok: true };
    };
    const r = await drainQueue(store, counter, stillEarly);
    expect(attempts).toBe(0);
    expect(r.remaining).toBe(1);
  });

  it("drops envelopes after MAX_ATTEMPTS retries", async () => {
    const store = fakeStore();
    await enqueue(store, event(), FROZEN);
    const upload: UploadFn = async () => ({ ok: false, permanent: false, error: "timeout" });

    let now = FROZEN;
    for (let i = 0; i < 10; i += 1) {
      await drainQueue(store, upload, now);
      now = new Date(now.getTime() + 60 * 60 * 1000); // +1h
    }
    const final = await loadQueue(store);
    expect(final).toHaveLength(0);
  });

  it("drops permanent failures immediately", async () => {
    const store = fakeStore();
    await enqueue(store, event(), FROZEN);
    const upload: UploadFn = async () => ({ ok: false, permanent: true, error: "bad request" });
    const r = await drainQueue(store, upload, FROZEN);
    expect(r.remaining).toBe(0);
    expect(r.uploaded).toBe(0);
  });

  it("redacts tokens out of the lastError field", async () => {
    const store = fakeStore();
    await enqueue(store, event(), FROZEN);
    const upload: UploadFn = async () => ({ ok: false, permanent: false, error: "Bearer lct_device_abcdef1234567890XYZ failed" });
    await drainQueue(store, upload, FROZEN);
    const queue = await loadQueue(store);
    expect(queue[0].lastError).toContain("<redacted:");
    expect(queue[0].lastError).not.toContain("lct_device_abcdef");
  });
});
