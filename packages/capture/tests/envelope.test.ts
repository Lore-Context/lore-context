import { describe, expect, it } from "vitest";
import { buildEnvelope, summarizeSession } from "../src/envelope.js";
import type { CaptureSession } from "../src/types.js";

const baseSession: CaptureSession = {
  id: "claude-code:s1",
  provider: "claude-code",
  source: { provider: "claude-code", originalId: "s1" },
  startedAt: "2026-04-30T10:00:00.000Z",
  endedAt: "2026-04-30T10:01:00.000Z",
  turns: [
    { index: 0, role: "user", text: "How do I deploy?" },
    { index: 1, role: "assistant", text: "Use `pnpm build` first." },
    { index: 2, role: "user", text: "", private: true }
  ],
  idempotencyKey: "cap_x",
  redactionStats: { secretsRemoved: 0, privateBlocksStripped: 1, turnsAffected: 1 },
  metadata: { captureMode: "summary_only", extractorVersion: "test", rawArchiveLocal: false }
};

describe("buildEnvelope", () => {
  it("defaults to summary-only and omits raw turns", () => {
    const env = buildEnvelope(baseSession, { vaultId: "v1", deviceId: "d1", capturedAt: "2026-04-30T10:01:30.000Z" });
    expect(env.captureMode).toBe("summary_only");
    expect(env.rawTurns).toBeUndefined();
    expect(env.summary).toContain("USER:");
    expect(env.summary).toContain("ASSISTANT:");
    expect(env.summary).not.toContain("private");
    expect(env.turnCount).toBe(3);
    expect(env.idempotencyKey).toBe("cap_x");
  });

  it("includes raw turns only when raw_archive is explicitly opted in", () => {
    const env = buildEnvelope(baseSession, { rawArchive: true });
    expect(env.captureMode).toBe("raw_archive");
    expect(env.rawTurns).toHaveLength(3);
  });
});

describe("summarizeSession", () => {
  it("respects char budget and skips private turns", () => {
    const summary = summarizeSession(baseSession, 40);
    expect(summary.length).toBeLessThanOrEqual(41);
    expect(summary).not.toContain("PRIVATE");
  });
});
