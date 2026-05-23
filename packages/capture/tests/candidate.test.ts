import { describe, expect, it } from "vitest";
import {
  sessionToCandidate,
  candidateIdFromKey,
  isCaptureInboxCandidate,
  explainNoMemoryFound,
  isNoMemoryCaptureRecord,
  inferNoMemoryReason
} from "../src/candidate.js";
import type { CapturedSessionV08 } from "../src/types-v08.js";

function makeSession(overrides: Partial<CapturedSessionV08> = {}): CapturedSessionV08 {
  return {
    provider: "claude_code",
    sourceOriginalId: "proj_abc123",
    vaultId: "v_test",
    deviceId: "dev_test",
    sourceId: "src_test",
    contentHash: "abc123def456",
    idempotencyKey: "cap_claude_code_proj_abc123_abc123def456",
    captureMode: "summary_only",
    redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
    turns: [],
    metadata: { sourcePath: "/home/user/project/.claude/sessions/abc.jsonl" },
    ...overrides
  };
}

describe("sessionToCandidate", () => {
  it("always produces state pending — never trusted memory", () => {
    const session = makeSession();
    const candidate = sessionToCandidate(session, { sourceId: "src_test" });
    expect(candidate.state).toBe("pending");
  });

  it("candidateType is session_summary", () => {
    const candidate = sessionToCandidate(makeSession(), { sourceId: "src_test" });
    expect(candidate.candidateType).toBe("session_summary");
  });

  it("idempotencyKey matches the session", () => {
    const session = makeSession();
    const candidate = sessionToCandidate(session, { sourceId: "src_test" });
    expect(candidate.idempotencyKey).toBe(session.idempotencyKey);
  });

  it("id is deterministic from idempotencyKey", () => {
    const session = makeSession();
    const a = sessionToCandidate(session, { sourceId: "src_test" });
    const b = sessionToCandidate(session, { sourceId: "src_test" });
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^cand_/);
  });

  it("sourceId, sourceProvider, sourceRef are set correctly", () => {
    const session = makeSession();
    const candidate = sessionToCandidate(session, { sourceId: "src_explicit" });
    expect(candidate.sourceId).toBe("src_explicit");
    expect(candidate.sourceProvider).toBe("claude_code");
    expect(candidate.sourceRef).toBe("proj_abc123");
  });

  it("uses custom title and excerpt when provided", () => {
    const candidate = sessionToCandidate(makeSession(), {
      sourceId: "src_test",
      title: "Custom Title",
      excerpt: "Custom excerpt text."
    });
    expect(candidate.title).toBe("Custom Title");
    expect(candidate.excerpt).toBe("Custom excerpt text.");
  });

  it("generates a default title containing provider name", () => {
    const candidate = sessionToCandidate(makeSession(), { sourceId: "src_test" });
    expect(candidate.title).toContain("Claude Code");
  });

  it("includes projectHint in title when present", () => {
    const session = makeSession({ projectHint: "my-cool-project" });
    const candidate = sessionToCandidate(session, { sourceId: "src_test" });
    expect(candidate.title).toContain("my-cool-project");
  });

  it("confidence is 0 for private_mode sessions", () => {
    const session = makeSession({ captureMode: "private_mode" });
    const candidate = sessionToCandidate(session, { sourceId: "src_test" });
    expect(candidate.confidence).toBe(0);
  });

  it("confidence increases with more assistant turns", () => {
    const fewTurns = makeSession({
      turns: [
        { role: "user", text: "hi" },
        { role: "assistant", text: "hello" }
      ]
    });
    const manyTurns = makeSession({
      turns: Array.from({ length: 12 }, (_, i) => ({
        role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
        text: `turn ${i}`
      }))
    });
    const few = sessionToCandidate(fewTurns, { sourceId: "src_test" });
    const many = sessionToCandidate(manyTurns, { sourceId: "src_test" });
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });

  it("excerpt is suppressed for private_mode", () => {
    const session = makeSession({ captureMode: "private_mode" });
    const candidate = sessionToCandidate(session, { sourceId: "src_test" });
    expect(candidate.excerpt).toContain("private");
  });

  it("excerpt uses first assistant turn text", () => {
    const session = makeSession({
      turns: [
        { role: "user", text: "What is 2+2?" },
        { role: "assistant", text: "The answer is four, computed by adding two integers." }
      ]
    });
    const candidate = sessionToCandidate(session, { sourceId: "src_test" });
    expect(candidate.excerpt).toContain("four");
  });

  it("expiresAt is in the future", () => {
    const now = new Date("2026-05-02T10:00:00Z");
    const candidate = sessionToCandidate(makeSession(), { sourceId: "src_test", now });
    const expires = new Date(candidate.expiresAt!);
    expect(expires.getTime()).toBeGreaterThan(now.getTime());
  });

  it("respects custom ttlMs", () => {
    const now = new Date("2026-05-02T10:00:00Z");
    const candidate = sessionToCandidate(makeSession(), {
      sourceId: "src_test",
      now,
      ttlMs: 1000 * 60 * 60 // 1 hour
    });
    const expires = new Date(candidate.expiresAt!);
    const diffMs = expires.getTime() - now.getTime();
    expect(diffMs).toBe(1000 * 60 * 60);
  });

  it("metadata carries key session fields", () => {
    const session = makeSession({
      captureMode: "summary_only",
      turns: [{ role: "user", text: "hi" }]
    });
    const candidate = sessionToCandidate(session, { sourceId: "src_test" });
    expect(candidate.metadata.captureMode).toBe("summary_only");
    expect(candidate.metadata.turnCount).toBe(1);
    expect(candidate.metadata.vaultId).toBe("v_test");
  });
});

describe("candidateIdFromKey", () => {
  it("starts with cand_", () => {
    expect(candidateIdFromKey("cap_claude_code_proj_abc")).toMatch(/^cand_/);
  });

  it("is deterministic", () => {
    const key = "cap_claude_code_xyz_0123456789abcdef";
    expect(candidateIdFromKey(key)).toBe(candidateIdFromKey(key));
  });

  it("strips cap_ prefix", () => {
    const id = candidateIdFromKey("cap_rest");
    expect(id).toBe("cand_rest");
  });
});

describe("explainNoMemoryFound (rc.2 Lane D)", () => {
  it("produces a no_memory_found record carrying source attribution", () => {
    const session = makeSession();
    const record = explainNoMemoryFound(session, {
      sourceId: "src_test",
      reason: "short_session"
    });
    expect(record.kind).toBe("no_memory_found");
    expect(record.sourceProvider).toBe("claude_code");
    expect(record.sourceRef).toBe(session.sourceOriginalId);
    expect(record.idempotencyKey).toBe(session.idempotencyKey);
    expect(record.message).toContain("too short");
  });

  it("private_mode reason yields a privacy-aware message", () => {
    const record = explainNoMemoryFound(makeSession({ captureMode: "private_mode" }), {
      sourceId: "src_test",
      reason: "private_mode"
    });
    expect(record.message.toLowerCase()).toContain("private");
    expect(record.message.toLowerCase()).toContain("device");
  });

  it("isNoMemoryCaptureRecord narrows correctly", () => {
    const record = explainNoMemoryFound(makeSession(), {
      sourceId: "src_test",
      reason: "duplicate"
    });
    expect(isNoMemoryCaptureRecord(record)).toBe(true);
    expect(isNoMemoryCaptureRecord(null)).toBe(false);
    expect(isNoMemoryCaptureRecord({ kind: "no_memory_found" })).toBe(false);
  });

  it("inferNoMemoryReason picks private_mode for private sessions", () => {
    expect(inferNoMemoryReason(makeSession({ captureMode: "private_mode" }))).toBe("private_mode");
  });

  it("inferNoMemoryReason picks short_session for empty sessions with no redaction", () => {
    expect(inferNoMemoryReason(makeSession({ turns: [] }))).toBe("short_session");
  });

  it("inferNoMemoryReason picks redacted_content when only redaction is left", () => {
    const session = makeSession({
      turns: [],
      redaction: { version: "v08.1", secretCount: 3, privateBlockCount: 0 }
    });
    expect(inferNoMemoryReason(session)).toBe("redacted_content");
  });

  it("inferNoMemoryReason picks provider_filtered for sessions with content but nothing useful", () => {
    const session = makeSession({
      turns: [
        { role: "user", text: "hi" },
        { role: "assistant", text: "ok" }
      ]
    });
    expect(inferNoMemoryReason(session)).toBe("provider_filtered");
  });
});

describe("isCaptureInboxCandidate", () => {
  it("returns true for a valid candidate", () => {
    const candidate = sessionToCandidate(makeSession(), { sourceId: "src_test" });
    expect(isCaptureInboxCandidate(candidate)).toBe(true);
  });

  it("returns false for null / non-object values", () => {
    expect(isCaptureInboxCandidate(null)).toBe(false);
    expect(isCaptureInboxCandidate(undefined)).toBe(false);
    expect(isCaptureInboxCandidate("string")).toBe(false);
    expect(isCaptureInboxCandidate(42)).toBe(false);
  });

  it("returns false when required fields are missing", () => {
    expect(isCaptureInboxCandidate({ id: "x" })).toBe(false);
    expect(isCaptureInboxCandidate({ id: "x", state: "pending" })).toBe(false);
  });
});
