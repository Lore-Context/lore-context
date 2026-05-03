import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanClaudeCode, scanCodex } from "../src/scanner.js";

describe("scanner", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "lore-capture-"));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("discovers Claude Code JSONL files under project subdirs", async () => {
    const root = path.join(tmp, "claude", "projects");
    await mkdir(path.join(root, "proj-a"), { recursive: true });
    await mkdir(path.join(root, "proj-b"), { recursive: true });
    await writeFile(path.join(root, "proj-a", "s1.jsonl"), '{"role":"user"}\n');
    await writeFile(path.join(root, "proj-b", "s2.jsonl"), '{"role":"user"}\n');
    await writeFile(path.join(root, "proj-b", "ignore.txt"), "x");

    const found = await scanClaudeCode({ claudeCodeRoot: root });
    expect(found.map((f) => path.basename(f.path)).sort()).toEqual(["s1.jsonl", "s2.jsonl"]);
    expect(found.every((f) => f.provider === "claude-code")).toBe(true);
    expect(found[0].bucket).toMatch(/proj-/);
  });

  it("skips Claude Code files larger than the size cap", async () => {
    const root = path.join(tmp, "claude2");
    await mkdir(path.join(root, "p"), { recursive: true });
    await writeFile(path.join(root, "p", "big.jsonl"), "x".repeat(2048));

    const found = await scanClaudeCode({ claudeCodeRoot: root, maxFileBytes: 1024 });
    expect(found).toEqual([]);
  });

  it("returns empty list when Claude root does not exist", async () => {
    const found = await scanClaudeCode({ claudeCodeRoot: path.join(tmp, "missing") });
    expect(found).toEqual([]);
  });

  it("walks codex roots and finds .json/.jsonl recursively", async () => {
    const root = path.join(tmp, "codex");
    await mkdir(path.join(root, "2026-04"), { recursive: true });
    await writeFile(path.join(root, "2026-04", "a.json"), "{}");
    await writeFile(path.join(root, "2026-04", "b.jsonl"), '{"role":"user"}\n');
    await writeFile(path.join(root, "2026-04", "skip.md"), "ignored");

    const found = await scanCodex({ codexRoots: [root] });
    expect(found.map((f) => path.basename(f.path)).sort()).toEqual(["a.json", "b.jsonl"]);
  });
});
