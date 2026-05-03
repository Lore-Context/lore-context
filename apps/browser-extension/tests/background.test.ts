import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { drainQueue, enqueue, loadQueue, type KeyValueStore, type UploadFn } from "../src/queue.js";
import {
  authorizeDomain,
  DEFAULT_STATE,
  isDomainAuthorized,
  isDomainCaptureBlocked,
  loadState,
  pauseDomain,
  saveState,
  setPrivateForDomain
} from "../src/state.js";
import type { CaptureEvent, ExtensionState } from "../src/types.js";

/**
 * These tests do not load the actual background.ts (it imports `chrome`
 * APIs that don't exist in vitest). Instead they exercise the same
 * orchestration the SW performs, against the same helpers.
 */

const FROZEN = new Date("2026-05-01T12:00:00.000Z");

function fakeStore(): KeyValueStore {
  const data: Record<string, unknown> = {};
  return {
    async get<T>(key: string) {
      return data[key] as T | undefined;
    },
    async set<T>(key: string, value: T) {
      data[key] = value;
    }
  };
}

function evt(overrides: Partial<CaptureEvent> = {}): CaptureEvent {
  return {
    source_id: "ext_chatgpt",
    external_event_id: "evt-1",
    occurred_at: FROZEN.toISOString(),
    event_type: "session_delta",
    actor: "user",
    summary: "hello",
    capture_mode: "summary_only",
    source_url: "https://chatgpt.com/c/1",
    source_label: "ChatGPT",
    provider: "chatgpt",
    metadata: { domain: "chatgpt.com" },
    ...overrides
  };
}

async function handle(store: KeyValueStore, event: CaptureEvent, now = FROZEN): Promise<void> {
  const state = await loadState(store);
  const domain = (event.metadata as { domain?: string } | undefined)?.domain ?? "";
  if (!isDomainAuthorized(state, domain)) return;
  if (isDomainCaptureBlocked(state, domain)) return;
  if (event.capture_mode === "raw_archive" && !state.rawArchiveEnabled) {
    event = { ...event, capture_mode: "summary_only", raw_content: undefined };
  }
  await enqueue(store, event, now);
}

describe("capture authorization gate", () => {
  it("drops events for unauthorized domains", async () => {
    const store = fakeStore();
    await saveState(store, DEFAULT_STATE);
    await handle(store, evt());
    expect(await loadQueue(store)).toHaveLength(0);
  });

  it("queues events for authorized domains", async () => {
    const store = fakeStore();
    let s: ExtensionState = authorizeDomain(DEFAULT_STATE, "chatgpt.com");
    await saveState(store, s);
    await handle(store, evt());
    expect(await loadQueue(store)).toHaveLength(1);
  });
});

describe("pause / private blocks upload", () => {
  it("does not queue when global pause is on", async () => {
    const store = fakeStore();
    let s = authorizeDomain(DEFAULT_STATE, "chatgpt.com");
    s = { ...s, isPaused: true };
    await saveState(store, s);
    await handle(store, evt());
    expect(await loadQueue(store)).toHaveLength(0);
  });

  it("does not queue when domain is paused", async () => {
    const store = fakeStore();
    let s = authorizeDomain(DEFAULT_STATE, "chatgpt.com");
    s = pauseDomain(s, "chatgpt.com");
    await saveState(store, s);
    await handle(store, evt());
    expect(await loadQueue(store)).toHaveLength(0);
  });

  it("does not queue when domain is private", async () => {
    const store = fakeStore();
    let s = authorizeDomain(DEFAULT_STATE, "claude.ai");
    s = setPrivateForDomain(s, "claude.ai", true);
    await saveState(store, s);
    await handle(store, evt({ metadata: { domain: "claude.ai" }, source_label: "Claude.ai", provider: "claude" }));
    expect(await loadQueue(store)).toHaveLength(0);
  });
});

describe("raw archive default off", () => {
  it("downgrades a raw_archive event to summary_only when not opted in", async () => {
    const store = fakeStore();
    const s = authorizeDomain(DEFAULT_STATE, "chatgpt.com");
    await saveState(store, s);
    await handle(store, evt({ capture_mode: "raw_archive", raw_content: "full transcript" }));
    const queue = await loadQueue(store);
    expect(queue).toHaveLength(1);
    expect(queue[0].event.capture_mode).toBe("summary_only");
    expect(queue[0].event.raw_content).toBeUndefined();
  });

  it("preserves raw_archive when opted in", async () => {
    const store = fakeStore();
    const s = { ...authorizeDomain(DEFAULT_STATE, "chatgpt.com"), rawArchiveEnabled: true };
    await saveState(store, s);
    await handle(store, evt({ capture_mode: "raw_archive", raw_content: "transcript" }));
    const queue = await loadQueue(store);
    expect(queue[0].event.capture_mode).toBe("raw_archive");
    expect(queue[0].event.raw_content).toBe("transcript");
  });
});

describe("queue retry survives transient failure", () => {
  it("requeues with bumped attempts after a transient error", async () => {
    const store = fakeStore();
    const s = authorizeDomain(DEFAULT_STATE, "chatgpt.com");
    await saveState(store, s);
    await handle(store, evt());

    const upload: UploadFn = async () => ({ ok: false, permanent: false, error: "timeout" });
    await drainQueue(store, upload, FROZEN);
    const queue = await loadQueue(store);
    expect(queue[0].attempts).toBe(1);
    expect(queue[0].nextAttemptAt > FROZEN.toISOString()).toBe(true);
  });
});
