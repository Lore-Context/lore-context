import { describe, expect, it } from "vitest";
import {
  CAPTURE_REDACTION_VERSION,
  providerFromWire,
  providerToWire,
  toWireSession
} from "../src/types-v08.js";
import type { CaptureSession } from "../src/types.js";

const session: CaptureSession = {
  id: "claude-code:s1",
  provider: "claude-code",
  source: { provider: "claude-code", originalId: "s1", path: "/transcripts/s1.jsonl", cwd: "/repo" },
  startedAt: "2026-04-30T10:00:00.000Z",
  endedAt: "2026-04-30T10:05:00.000Z",
  turns: [
    { index: 0, role: "user", text: "How do I deploy?", startedAt: "2026-04-30T10:00:00.000Z" },
    { index: 1, role: "assistant", text: "Run pnpm build then deploy.", toolCalls: [{ name: "Bash", status: "ok" }] },
    { index: 2, role: "user", text: "", private: true }
  ],
  idempotencyKey: "cap_claude-code_aaaaaaaaaaaaaaaa_bbbbbbbbbbbbbbbb",
  redactionStats: { secretsRemoved: 1, privateBlocksStripped: 1, turnsAffected: 2 },
  metadata: { captureMode: "summary_only", extractorVersion: "0.7.0-alpha.0", rawArchiveLocal: false }
};

describe("provider mapping", () => {
  it("converts between v0.7 hyphen and v0.8 snake_case", () => {
    expect(providerToWire("claude-code")).toBe("claude_code");
    expect(providerToWire("codex")).toBe("codex");
    expect(providerFromWire("claude_code")).toBe("claude-code");
    expect(providerFromWire("opencode")).toBe("opencode");
  });
});

describe("toWireSession", () => {
  it("builds the v0.8 envelope and drops private turns", () => {
    const wire = toWireSession(session, {
      vaultId: "v1",
      deviceId: "d1",
      sourceId: "src_claude_default",
      projectHint: "proj-X",
      branch: "main",
      repoFingerprint: "abc123"
    });

    expect(wire.provider).toBe("claude_code");
    expect(wire.vaultId).toBe("v1");
    expect(wire.deviceId).toBe("d1");
    expect(wire.sourceId).toBe("src_claude_default");
    expect(wire.captureMode).toBe("summary_only");
    expect(wire.idempotencyKey).toBe(session.idempotencyKey);
    expect(wire.contentHash).toBe("bbbbbbbbbbbbbbbb");
    expect(wire.redaction).toEqual({
      version: CAPTURE_REDACTION_VERSION,
      secretCount: 1,
      privateBlockCount: 1
    });
    expect(wire.turns).toHaveLength(2);
    expect(wire.turns[1].toolName).toBe("Bash");
    expect(wire.metadata.cwd).toBe("/repo");
    expect(wire.metadata.sourcePath).toBe("/transcripts/s1.jsonl");
    expect(wire.metadata.extractorVersion).toBe("0.7.0-alpha.0");
    expect(wire.projectHint).toBe("proj-X");
    expect(wire.branch).toBe("main");
  });

  it("flags raw_archive when explicitly requested", () => {
    const wire = toWireSession(session, {
      vaultId: "v1",
      deviceId: "d1",
      sourceId: "s",
      rawArchive: true
    });
    expect(wire.captureMode).toBe("raw_archive");
    expect(wire.turns).toHaveLength(2);
  });

  it("strips turn bodies in private mode but keeps redaction stats", () => {
    const wire = toWireSession(session, {
      vaultId: "v1",
      deviceId: "d1",
      sourceId: "s",
      privateMode: true
    });
    expect(wire.captureMode).toBe("private_mode");
    expect(wire.turns).toEqual([]);
    expect(wire.redaction.privateBlockCount).toBe(1);
  });
});
