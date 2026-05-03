import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendMarker, buildMarker, defaultQueuePath, fingerprintCwd } from "../src/stop-hook.js";

describe("stop-hook marker", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "lore-stop-hook-"));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("builds a marker with stable fingerprint and no secrets", () => {
    const marker = buildMarker(
      {
        session_id: "sess-1",
        transcript_path: "/Users/me/.claude/projects/proj/sess-1.jsonl",
        cwd: "/Users/me/proj"
      },
      new Date("2026-04-30T14:00:00.000Z")
    );
    expect(marker).toEqual({
      schemaVersion: "1",
      agent: "claude-code",
      event: "stop",
      sessionId: "sess-1",
      transcriptPath: "/Users/me/.claude/projects/proj/sess-1.jsonl",
      cwd: "/Users/me/proj",
      cwdFingerprint: fingerprintCwd("/Users/me/proj"),
      recordedAt: "2026-04-30T14:00:00.000Z"
    });
  });

  it("tolerates missing fields", () => {
    const marker = buildMarker({}, new Date("2026-04-30T14:00:00.000Z"));
    expect(marker.sessionId).toBe("unknown");
    expect(marker.transcriptPath).toBeUndefined();
    expect(marker.cwd).toBeUndefined();
    expect(marker.cwdFingerprint).toBeUndefined();
  });

  it("appends to the queue file as JSONL and creates the parent dir", async () => {
    const queuePath = path.join(tmp, ".lore", "queue.jsonl");
    const m1 = buildMarker({ session_id: "a" }, new Date("2026-04-30T14:00:00.000Z"));
    const m2 = buildMarker({ session_id: "b" }, new Date("2026-04-30T14:00:01.000Z"));
    await appendMarker(queuePath, m1);
    await appendMarker(queuePath, m2);

    const content = await readFile(queuePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).sessionId).toBe("a");
    expect(JSON.parse(lines[1]).sessionId).toBe("b");
  });

  it("default queue path lives under ~/.lore/queue.jsonl", () => {
    expect(defaultQueuePath("/home/me")).toBe("/home/me/.lore/queue.jsonl");
  });
});
