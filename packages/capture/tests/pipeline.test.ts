import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decideUpload, processQueueOnce } from "../src/pipeline.js";
import { ScannerState } from "../src/scanner-state.js";
import { UploadQueue } from "../src/upload-queue.js";
import type { CapturedSessionV08 } from "../src/types-v08.js";

function session(idempotencyKey: string, overrides: Partial<CapturedSessionV08> = {}): CapturedSessionV08 {
  return {
    provider: "claude_code",
    sourceOriginalId: "abc",
    vaultId: "v1",
    deviceId: "d1",
    sourceId: "src",
    contentHash: "hash",
    idempotencyKey,
    captureMode: "summary_only",
    redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
    turns: [],
    metadata: { sourcePath: "/p/s.jsonl" },
    ...overrides
  };
}

describe("decideUpload — legacy 3-state status", () => {
  it("skips paused sources", () => {
    expect(
      decideUpload({ sourceStatus: "paused", vaultRawArchiveEnabled: false, sessionMode: "summary_only" })
    ).toEqual({ action: "skip", reason: "source paused" });
  });

  it("skips raw_archive when vault disallows it", () => {
    expect(
      decideUpload({ sourceStatus: "active", vaultRawArchiveEnabled: false, sessionMode: "raw_archive" })
    ).toEqual({ action: "skip", reason: "vault does not allow raw_archive" });
  });

  it("uploads private_mode markers", () => {
    expect(
      decideUpload({ sourceStatus: "active", vaultRawArchiveEnabled: false, sessionMode: "private_mode" })
    ).toEqual({ action: "upload", reason: "private mode marker" });
  });

  it("uploads default summary_only sessions", () => {
    expect(
      decideUpload({ sourceStatus: "active", vaultRawArchiveEnabled: false, sessionMode: "summary_only" })
    ).toEqual({ action: "upload", reason: "default" });
  });
});

describe("decideUpload — rc.1 6-state CaptureSourceState", () => {
  it("uploads from active state", () => {
    expect(
      decideUpload({ sourceStatus: "active", vaultRawArchiveEnabled: true, sessionMode: "summary_only" })
    ).toEqual({ action: "upload", reason: "default" });
  });

  it("uploads from degraded state (reduced quality but still capturing)", () => {
    expect(
      decideUpload({ sourceStatus: "degraded", vaultRawArchiveEnabled: false, sessionMode: "summary_only" })
    ).toEqual({ action: "upload", reason: "default" });
  });

  it("skips from paused state", () => {
    const result = decideUpload({ sourceStatus: "paused", vaultRawArchiveEnabled: false, sessionMode: "summary_only" });
    expect(result.action).toBe("skip");
    expect(result.reason).toContain("paused");
  });

  it("skips from disconnected state", () => {
    const result = decideUpload({ sourceStatus: "disconnected", vaultRawArchiveEnabled: false, sessionMode: "summary_only" });
    expect(result.action).toBe("skip");
    expect(result.reason).toContain("disconnected");
  });

  it("skips from awaiting_authorization state", () => {
    const result = decideUpload({ sourceStatus: "awaiting_authorization", vaultRawArchiveEnabled: false, sessionMode: "summary_only" });
    expect(result.action).toBe("skip");
    expect(result.reason).toContain("awaiting_authorization");
  });

  it("private source state uploads a structural marker regardless of session mode", () => {
    const result = decideUpload({ sourceStatus: "private", vaultRawArchiveEnabled: false, sessionMode: "summary_only" });
    expect(result.action).toBe("upload");
    expect(result.reason).toContain("private mode marker");
  });

  it("private_mode session uploads a marker regardless of source state", () => {
    const result = decideUpload({ sourceStatus: "active", vaultRawArchiveEnabled: false, sessionMode: "private_mode" });
    expect(result.action).toBe("upload");
    expect(result.reason).toContain("private mode marker");
  });
});

describe("processQueueOnce", () => {
  let dir: string;
  let queue: UploadQueue;
  let state: ScannerState;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "lore-pipeline-"));
    queue = new UploadQueue(path.join(dir, "queue"));
    state = new ScannerState(path.join(dir, "scanner-state.json"));
    await state.load();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("uploads, records state, and acks the queue on success", async () => {
    await queue.enqueue(session("k1"));
    const calls: string[] = [];
    const result = await processQueueOnce({
      queue,
      state,
      uploader: async (env) => {
        calls.push(env.idempotencyKey);
        return { sessionId: "sess_1", jobId: "job_1", status: "pending", duplicate: false };
      }
    });
    expect(calls).toEqual(["k1"]);
    expect(result.uploaded).toHaveLength(1);
    expect(state.has("k1")).toBe(true);
    expect(state.get("k1")?.cloudJobId).toBe("job_1");
    expect(await queue.size()).toBe(0);
  });

  it("requeues with backoff on failure and dead-letters past the cap", async () => {
    await queue.enqueue(session("k2"));
    const fail: typeof processQueueOnce = (opts) =>
      processQueueOnce({
        ...opts,
        uploader: async () => {
          throw new Error("boom");
        }
      });
    // 3 failures with maxAttempts=3 → drained.
    await fail({ queue, state, uploader: async () => { throw new Error("boom"); }, maxAttempts: 99 });
    await fail({ queue, state, uploader: async () => { throw new Error("boom"); }, maxAttempts: 99, now: new Date(Date.now() + 60_000) });
    const result3 = await fail({
      queue,
      state,
      uploader: async () => { throw new Error("boom"); },
      maxAttempts: 3,
      now: new Date(Date.now() + 600_000)
    });
    expect(result3.deadLettered.map((e) => e.idempotencyKey)).toEqual(["k2"]);
    expect(state.has("k2")).toBe(false);
    expect(await queue.size()).toBe(0);
  });

  it("respects maxPerTick", async () => {
    await queue.enqueue(session("k3"));
    await queue.enqueue(session("k4"));
    const result = await processQueueOnce({
      queue,
      state,
      uploader: async () => ({ sessionId: "s", jobId: "j", status: "pending", duplicate: false }),
      maxPerTick: 1
    });
    expect(result.uploaded).toHaveLength(1);
    expect(await queue.size()).toBe(1);
  });
});
