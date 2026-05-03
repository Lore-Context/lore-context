import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCursorSession } from "../src/parsers/cursor.js";

const FIX_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "cursor");

async function loadFixture(name: string): Promise<string> {
  return readFile(path.join(FIX_DIR, name), "utf-8");
}

describe("parseCursorSession", () => {
  it("parses single-envelope JSON sessions and applies redaction", async () => {
    const content = await loadFixture("session-basic.json");
    const { session, warnings } = parseCursorSession({
      filePath: path.join(FIX_DIR, "session-basic.json"),
      content
    });

    expect(warnings).toEqual([]);
    expect(session.provider).toBe("cursor");
    expect(session.source.originalId).toBe("cursor-comp-42");
    expect(session.id).toBe("cursor:cursor-comp-42");
    expect(session.startedAt).toBe("2026-04-30T14:00:00.000Z");
    expect(session.endedAt).toBe("2026-04-30T14:01:30.000Z");
    expect(session.turns.length).toBeGreaterThanOrEqual(3);

    // First user turn must have its sk-cursor_* secret redacted.
    const firstUser = session.turns.find((t) => t.role === "user");
    expect(firstUser?.text ?? "").not.toContain("sk-cursor_AAAA");
    expect(session.redactionStats.secretsRemoved).toBeGreaterThanOrEqual(1);

    // Private envelope on the trailing assistant message must be stripped.
    expect(session.redactionStats.privateBlocksStripped).toBeGreaterThanOrEqual(1);

    // Tool use part embedded inside an assistant content array is captured.
    const assistantWithTool = session.turns.find(
      (t) => t.role === "assistant" && t.toolCalls && t.toolCalls.some((c) => c.name === "Read")
    );
    expect(assistantWithTool).toBeDefined();
  });

  it("parses JSONL sessions when no top-level envelope is present", async () => {
    const content = await loadFixture("session-jsonl.jsonl");
    const { session, warnings } = parseCursorSession({
      filePath: path.join(FIX_DIR, "session-jsonl.jsonl"),
      content
    });

    expect(warnings).toEqual([]);
    expect(session.provider).toBe("cursor");
    expect(session.turns.length).toBeGreaterThanOrEqual(3);
    // Session id falls back to filename when JSONL has no envelope id.
    expect(session.source.originalId).toBe("session-jsonl");
  });

  it("produces deterministic idempotency key across re-parses", async () => {
    const content = await loadFixture("session-basic.json");
    const a = parseCursorSession({ filePath: "x.json", content }).session.idempotencyKey;
    const b = parseCursorSession({ filePath: "y.json", content }).session.idempotencyKey;
    expect(a).toBe(b);
  });

  it("tolerates malformed JSONL lines without throwing", () => {
    const content = [
      '{"role":"user","text":"hi","timestamp":"2026-04-30T16:00:00.000Z"}',
      "this is not json",
      '{"role":"assistant","text":"hello","timestamp":"2026-04-30T16:00:01.000Z"}'
    ].join("\n");

    const { session, warnings } = parseCursorSession({ filePath: "/tmp/cursor.jsonl", content });
    expect(warnings.length).toBeGreaterThan(0);
    expect(session.turns.map((t) => t.text)).toEqual(["hi", "hello"]);
  });
});
