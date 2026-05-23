import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseClaudeCodeJsonl } from "../src/parsers/claude-code.js";

const FIX_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "claude-code");

async function loadFixture(name: string): Promise<string> {
  return readFile(path.join(FIX_DIR, name), "utf-8");
}

describe("parseClaudeCodeJsonl", () => {
  it("parses canonical turns and applies redaction + private stripping", async () => {
    const content = await loadFixture("session-basic.jsonl");
    const { session, warnings } = parseClaudeCodeJsonl({
      filePath: path.join(FIX_DIR, "session-basic.jsonl"),
      content
    });

    expect(warnings).toEqual([]);
    expect(session.provider).toBe("claude-code");
    expect(session.source.originalId).toBe("c-abc-123");
    expect(session.id).toBe("claude-code:c-abc-123");
    expect(session.startedAt).toBe("2026-04-30T10:00:00.000Z");
    expect(session.endedAt).toBe("2026-04-30T10:00:03.000Z");
    expect(session.turns.length).toBe(4);

    const last = session.turns[session.turns.length - 1];
    expect(last.text).toContain("[REDACTED:anthropic]");
    expect(last.text).toContain("[PRIVATE_REMOVED]");
    expect(session.redactionStats.secretsRemoved).toBeGreaterThanOrEqual(1);
    expect(session.redactionStats.privateBlocksStripped).toBeGreaterThanOrEqual(1);

    const assistantTurn = session.turns.find((t) => t.role === "assistant");
    expect(assistantTurn?.toolCalls?.[0]?.name).toBe("Read");
  });

  it("tolerates malformed lines without throwing", async () => {
    const content = await loadFixture("session-malformed.jsonl");
    const { session, warnings } = parseClaudeCodeJsonl({
      filePath: path.join(FIX_DIR, "session-malformed.jsonl"),
      content
    });
    expect(warnings.length).toBeGreaterThan(0);
    // Both valid lines should still be captured.
    expect(session.turns.map((t) => t.text)).toEqual(["first valid", "second valid"]);
  });

  it("produces deterministic idempotency key across re-parses", async () => {
    const content = await loadFixture("session-basic.jsonl");
    const a = parseClaudeCodeJsonl({ filePath: "x.jsonl", content }).session.idempotencyKey;
    const b = parseClaudeCodeJsonl({ filePath: "y.jsonl", content }).session.idempotencyKey;
    expect(a).toBe(b);
  });
});
