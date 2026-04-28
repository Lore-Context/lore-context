import { describe, expect, it } from "vitest";
import { createMemoryRecord } from "@lore/shared";
import {
  createLoreExport,
  exportLoreJson,
  exportLoreMarkdown,
  importLoreJson,
  importSimpleMarkdown,
  toLoreMemoryItem,
  type LoreMemoryItem
} from "../src/index.js";

function makeItem(overrides: Partial<LoreMemoryItem> = {}): LoreMemoryItem {
  return {
    ...createMemoryRecord({
      content: "Always use Qwen.",
      sourceProvider: "agentmemory",
      sourceOriginalId: "am_1",
      now: new Date("2026-04-28T00:00:00.000Z")
    }),
    supersedes: [],
    contradicts: [],
    ...overrides
  };
}

describe("createLoreExport", () => {
  it("wraps records in the Lore JSON envelope with version 0.2", () => {
    expect(createLoreExport([], new Date("2026-04-27T00:00:00.000Z"))).toEqual({
      format: "lore-memory-export",
      version: "0.2",
      exportedAt: "2026-04-27T00:00:00.000Z",
      memories: []
    });
  });
});

describe("toLoreMemoryItem", () => {
  it("wraps a MemoryRecord with empty supersedes/contradicts by default", () => {
    const record = createMemoryRecord({ content: "test" });
    const item = toLoreMemoryItem(record);
    expect(item.supersedes).toEqual([]);
    expect(item.contradicts).toEqual([]);
  });

  it("accepts supersedes and contradicts", () => {
    const record = createMemoryRecord({ content: "test" });
    const item = toLoreMemoryItem(record, { supersedes: ["mem_a"], contradicts: ["mem_b"] });
    expect(item.supersedes).toEqual(["mem_a"]);
    expect(item.contradicts).toEqual(["mem_b"]);
  });
});

describe("JSON round-trip with supersedes and contradicts", () => {
  it("preserves supersedes and contradicts through export → import", () => {
    const memory = makeItem({
      supersedes: ["mem_old_1", "mem_old_2"],
      contradicts: ["mem_conflict"],
      status: "confirmed",
      validUntil: "2026-05-01T00:00:00.000Z",
      supersededBy: "mem_next",
      metadata: { importedFrom: "fixture" },
      lastUsedAt: "2026-04-29T00:00:00.000Z",
      useCount: 3
    });

    const json = exportLoreJson([memory], new Date("2026-04-28T00:00:00.000Z"));
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("0.2");

    const imported = importLoreJson(json);
    expect(imported).toHaveLength(1);
    expect(imported[0].supersedes).toEqual(["mem_old_1", "mem_old_2"]);
    expect(imported[0].contradicts).toEqual(["mem_conflict"]);
    expect(imported[0].status).toBe("confirmed");
    expect(imported[0].supersededBy).toBe("mem_next");
    expect(imported[0].metadata).toEqual({ importedFrom: "fixture" });
    expect(imported[0].useCount).toBe(3);
  });

  it("imports v0.1 export (no supersedes/contradicts) with empty arrays", () => {
    const legacyExport = JSON.stringify({
      format: "lore-memory-export",
      version: "0.1",
      exportedAt: "2026-04-28T00:00:00.000Z",
      memories: [
        {
          id: "mem_legacy",
          content: "Legacy memory without new fields.",
          memoryType: "episode",
          scope: "project",
          visibility: "project",
          status: "active",
          confidence: 0.8,
          validFrom: "2026-04-28T00:00:00.000Z",
          validUntil: null,
          supersededBy: null,
          sourceRefs: [],
          riskTags: [],
          metadata: {},
          lastUsedAt: null,
          useCount: 0,
          createdAt: "2026-04-28T00:00:00.000Z",
          updatedAt: "2026-04-28T00:00:00.000Z"
        }
      ]
    });

    const imported = importLoreJson(legacyExport);
    expect(imported[0].supersedes).toEqual([]);
    expect(imported[0].contradicts).toEqual([]);
  });
});

describe("Markdown round-trip with supersedes and contradicts", () => {
  it("exports and imports supersedes/contradicts via markdown frontmatter fields", () => {
    const memory = makeItem({
      supersedes: ["mem_a", "mem_b"],
      contradicts: ["mem_c"],
      status: "superseded" as const,
      supersededBy: "mem_new",
      riskTags: ["api_key"],
      memoryType: "procedure",
      scope: "repo"
    } as Partial<LoreMemoryItem>);

    const markdown = exportLoreMarkdown([memory], new Date("2026-04-28T00:00:00.000Z"));

    expect(markdown).toContain("format: lore-memory-export");
    expect(markdown).toContain("version: 0.2");
    expect(markdown).toContain("Supersedes: mem_a, mem_b");
    expect(markdown).toContain("Contradicts: mem_c");

    const imported = importSimpleMarkdown(markdown);
    expect(imported).toHaveLength(1);
    expect(imported[0].supersedes).toEqual(["mem_a", "mem_b"]);
    expect(imported[0].contradicts).toEqual(["mem_c"]);
    expect(imported[0].memoryType).toBe("procedure");
    expect(imported[0].scope).toBe("repo");
    expect(imported[0].status).toBe("superseded");
    expect(imported[0].supersededBy).toBe("mem_new");
    expect(imported[0].riskTags).toEqual(["api_key"]);
  });

  it("handles empty supersedes/contradicts in markdown gracefully", () => {
    const memory = makeItem();
    const markdown = exportLoreMarkdown([memory]);
    const imported = importSimpleMarkdown(markdown);
    expect(imported[0].supersedes).toEqual([]);
    expect(imported[0].contradicts).toEqual([]);
  });
});

describe("Lore import/export (existing tests updated for v0.2)", () => {
  it("round trips JSON exports", () => {
    const memory = makeItem({
      status: "confirmed" as const,
      validUntil: "2026-05-01T00:00:00.000Z",
      supersededBy: "mem_next",
      metadata: { importedFrom: "fixture" },
      lastUsedAt: "2026-04-29T00:00:00.000Z",
      useCount: 3
    });

    const imported = importLoreJson(exportLoreJson([memory], new Date("2026-04-28T00:00:00.000Z")));
    expect(imported[0]).toMatchObject({
      id: memory.id,
      content: "Always use Qwen.",
      status: "confirmed",
      validUntil: "2026-05-01T00:00:00.000Z",
      supersededBy: "mem_next",
      sourceProvider: "agentmemory",
      sourceOriginalId: "am_1",
      metadata: { importedFrom: "fixture" },
      lastUsedAt: "2026-04-29T00:00:00.000Z",
      useCount: 3,
      supersedes: [],
      contradicts: []
    });
  });

  it("exports and imports simple markdown", () => {
    const memory = makeItem({
      ...createMemoryRecord({
        content: "Use pnpm for package management.",
        memoryType: "procedure",
        scope: "repo",
        sourceProvider: "manual"
      }),
      status: "superseded" as const,
      supersededBy: "mem_new",
      riskTags: ["api_key"],
      supersedes: [],
      contradicts: []
    });

    const markdown = exportLoreMarkdown([memory], new Date("2026-04-28T00:00:00.000Z"));
    expect(markdown).toContain("format: lore-memory-export");

    const result = importSimpleMarkdown(markdown);
    expect(result[0]).toMatchObject({
      content: expect.stringContaining("Use pnpm"),
      memoryType: "procedure",
      scope: "repo",
      status: "superseded",
      supersededBy: "mem_new",
      riskTags: ["api_key"],
      sourceProvider: "manual"
    });
  });
});
