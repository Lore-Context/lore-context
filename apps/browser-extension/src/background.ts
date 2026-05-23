import { drainQueue, enqueue, type KeyValueStore, type UploadFn } from "./queue.js";
import { redactForLog } from "./redaction.js";
import {
  DEFAULT_STATE,
  isDomainAuthorized,
  isDomainCaptureBlocked,
  loadState,
  saveState
} from "./state.js";
import type { CaptureEvent } from "./types.js";

/**
 * Service worker entry. v1.0 must:
 *   - never persist state in module-scope (SW can shut down anytime);
 *   - never log device tokens (use redactForLog);
 *   - keep the queue in chrome.storage.local so it survives restart.
 */

const chromeStore: KeyValueStore = {
  async get<T>(key: string) {
    const data = await chrome.storage.local.get(key);
    return data[key] as T | undefined;
  },
  async set<T>(key: string, value: T) {
    await chrome.storage.local.set({ [key]: value });
  }
};

const SYNC_ALARM = "lore-sync-retry";
const SYNC_INTERVAL_MIN = 5;

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chromeStore.get("state");
  if (!existing) {
    await chromeStore.set("state", DEFAULT_STATE);
    await chromeStore.set("queue", []);
  }
  console.log("Lore Extension installed.");
});

chrome.runtime.onMessage.addListener((message: { type: string; event?: CaptureEvent }, _sender, sendResponse) => {
  if (message?.type === "CAPTURE_EVENT" && message.event) {
    void handleCaptureEvent(message.event)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String((error as Error)?.message ?? error) }));
    return true;
  }
  return false;
});

chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MIN });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) {
    void runSync();
  }
});

export async function handleCaptureEvent(event: CaptureEvent): Promise<void> {
  const state = await loadState(chromeStore);
  const domain = (event.metadata as { domain?: string } | undefined)?.domain ?? "";

  if (!isDomainAuthorized(state, domain)) {
    console.log("Lore: capture skipped (domain not authorized)", redactForLog({ domain }));
    return;
  }
  if (isDomainCaptureBlocked(state, domain)) {
    console.log("Lore: capture skipped (paused/private)", redactForLog({ domain }));
    return;
  }
  if (event.capture_mode === "raw_archive" && !state.rawArchiveEnabled) {
    // Defense-in-depth: drop raw_archive events the user did not opt in for.
    console.log("Lore: capture downgraded to summary_only (raw_archive disabled)");
    event.capture_mode = "summary_only";
    delete event.raw_content;
  }

  await enqueue(chromeStore, event);
  await runSync();
}

export async function runSync(uploadFn: UploadFn = noopUpload): Promise<void> {
  const state = await loadState(chromeStore);
  if (!state.deviceToken) {
    // No token paired yet — leave events queued so they upload after pairing.
    return;
  }
  const result = await drainQueue(chromeStore, uploadFn);
  const nextState = { ...state };
  if (result.uploaded > 0) nextState.lastCaptureAt = new Date().toISOString();
  if (result.lastError) {
    nextState.lastError = result.lastError;
    nextState.lastErrorAt = new Date().toISOString();
  }
  await saveState(chromeStore, nextState);
  console.log("Lore: sync run", redactForLog({ uploaded: result.uploaded, remaining: result.remaining }));
}

/**
 * Default uploader is a no-op: the cloud lane will inject a real fetch with
 * Authorization headers and idempotency keys. Keeping this null-object means
 * the queue logic can be exercised in tests without HTTP.
 */
async function noopUpload(): Promise<{ ok: true }> {
  return { ok: true };
}

export const __test__ = { chromeStore, handleCaptureEvent, runSync };
