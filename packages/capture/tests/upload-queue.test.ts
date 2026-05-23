import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UploadQueue, nextRunAt } from "../src/upload-queue.js";
import type { CapturedSessionV08 } from "../src/types-v08.js";

function makeSession(idempotencyKey: string): CapturedSessionV08 {
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
    metadata: {}
  };
}

describe("UploadQueue", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "lore-upload-queue-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("enqueues an envelope idempotently and is durable on disk", async () => {
    const q = new UploadQueue(dir);
    const env1 = await q.enqueue(makeSession("cap_claude_code_a_b"));
    const env2 = await q.enqueue(makeSession("cap_claude_code_a_b"));
    expect(env1).toEqual(env2);
    expect(await q.size()).toBe(1);

    const reloaded = new UploadQueue(dir);
    expect(await reloaded.size()).toBe(1);

    const onDisk = JSON.parse(
      await readFile(path.join(dir, "cap_claude_code_a_b.json"), "utf-8")
    );
    expect(onDisk.session.idempotencyKey).toBe("cap_claude_code_a_b");
    expect(onDisk.attempts).toBe(0);
  });

  it("returns due envelopes oldest-first and skips ones not yet due", async () => {
    const q = new UploadQueue(dir);
    const t0 = new Date("2026-04-30T10:00:00Z");
    const t1 = new Date("2026-04-30T10:00:01Z");
    await q.enqueue(makeSession("cap_a"), t0);
    await q.enqueue(makeSession("cap_b"), t1);

    const dueNow = await q.dueEnvelopes(t1);
    expect(dueNow.map((e) => e.idempotencyKey)).toEqual(["cap_a", "cap_b"]);

    // Bump cap_a's nextRunAt into the future via fail()
    await q.fail("cap_a", "boom", t1);
    const dueAfterFail = await q.dueEnvelopes(t1);
    expect(dueAfterFail.map((e) => e.idempotencyKey)).toEqual(["cap_b"]);
  });

  it("ack drops the envelope file", async () => {
    const q = new UploadQueue(dir);
    await q.enqueue(makeSession("cap_x"));
    await q.ack("cap_x");
    expect(await q.size()).toBe(0);
    // Second ack is a no-op.
    await q.ack("cap_x");
  });

  it("fail increments attempts and applies exponential backoff", async () => {
    const q = new UploadQueue(dir);
    const t0 = new Date("2026-04-30T10:00:00Z");
    await q.enqueue(makeSession("cap_y"), t0);

    const f1 = await q.fail("cap_y", "err1", t0);
    expect(f1?.attempts).toBe(1);
    expect(f1?.lastError).toBe("err1");

    const f2 = await q.fail("cap_y", "err2", t0);
    expect(f2?.attempts).toBe(2);
    expect(new Date(f2!.nextRunAt).getTime()).toBeGreaterThan(new Date(f1!.nextRunAt).getTime());
  });

  it("drainDeadLetters removes envelopes past the attempt cap", async () => {
    const q = new UploadQueue(dir);
    await q.enqueue(makeSession("cap_z"));
    await q.fail("cap_z", "boom");
    await q.fail("cap_z", "boom");
    await q.fail("cap_z", "boom");
    const dropped = await q.drainDeadLetters(3);
    expect(dropped.map((e) => e.idempotencyKey)).toEqual(["cap_z"]);
    expect(await q.size()).toBe(0);
  });
});

describe("nextRunAt", () => {
  it("caps backoff at the configured ceiling", () => {
    const now = new Date("2026-04-30T10:00:00Z");
    const big = nextRunAt({ attempts: 100, baseDelayMs: 5000, capDelayMs: 60_000, now });
    expect(new Date(big).getTime() - now.getTime()).toBeLessThanOrEqual(60_000);
  });
});
