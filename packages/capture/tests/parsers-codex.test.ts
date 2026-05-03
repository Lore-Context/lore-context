import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCodexSession } from "../src/parsers/codex.js";

const FIX_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "codex");

async function loadFixture(name: string): Promise<string> {
  return readFile(path.join(FIX_DIR, name), "utf-8");
}

describe("parseCodexSession", () => {
  it("parses single-JSON envelope and redacts secrets in user text", async () => {
    const content = await loadFixture("session-envelope.json");
    const { session, warnings } = parseCodexSession({
      filePath: path.join(FIX_DIR, "session-envelope.json"),
      content
    });

    expect(warnings).toEqual([]);
    expect(session.provider).toBe("codex");
    expect(session.source.originalId).toBe("codex-sess-7");
    expect(session.startedAt).toBe("2026-04-30T12:00:00.000Z");
    expect(session.endedAt).toBe("2026-04-30T12:00:30.000Z");

    const userTurn = session.turns.find((t) => t.role === "user");
    expect(userTurn?.text).toContain("[REDACTED:github-pat]");
    expect(userTurn?.text).not.toContain("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345");

    // Tool calls should land in the canonical model.
    const toolTurn = session.turns.find((t) => t.toolCalls && t.toolCalls.length > 0);
    expect(toolTurn?.toolCalls?.[0]?.name).toBeTruthy();
  });

  it("falls back to JSONL parsing when content is multi-line", async () => {
    const content = await loadFixture("session-jsonl.jsonl");
    const { session } = parseCodexSession({
      filePath: path.join(FIX_DIR, "session-jsonl.jsonl"),
      content
    });

    expect(session.turns.length).toBe(2);
    const first = session.turns[0];
    // Private envelope replaced inline; remaining text after the envelope
    // is preserved so the model still has user intent.
    expect(first.text).toContain("[PRIVATE_REMOVED]");
    expect(first.text).toContain("Real ask: write tests.");
    expect(first.text).not.toContain("internal note hidden");
    expect(first.redacted).toBe(true);
    expect(session.redactionStats.privateBlocksStripped).toBe(1);
  });

  it("returns warnings for unparseable lines and still produces a session", () => {
    const broken = '{"role":"user","text":"ok"}\n{not-json\n{"role":"assistant","text":"second"}\n';
    const { session, warnings } = parseCodexSession({
      filePath: "/tmp/broken.jsonl",
      content: broken,
      sessionIdHint: "broken-1"
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(session.turns.length).toBe(2);
    expect(session.source.originalId).toBe("broken-1");
  });

  it("produces stable idempotency keys for identical content", () => {
    const content = '{"role":"user","text":"identical"}\n{"role":"assistant","text":"yes"}\n';
    const a = parseCodexSession({ filePath: "x", content, sessionIdHint: "s1" }).session.idempotencyKey;
    const b = parseCodexSession({ filePath: "x", content, sessionIdHint: "s1" }).session.idempotencyKey;
    expect(a).toBe(b);
  });
});
