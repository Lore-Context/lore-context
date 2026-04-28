import { describe, expect, it } from "vitest";
import { createMemoryRecord } from "@lore/shared";
import { createLoreExport, exportLoreJson, exportLoreMarkdown, importLoreJson, importSimpleMarkdown } from "../src/index.js";

describe("createLoreExport", () => {
  it("wraps records in the Lore JSON envelope", () => {
    expect(createLoreExport([], new Date("2026-04-27T00:00:00.000Z"))).toEqual({
      format: "lore-memory-export",
      version: "0.1",
      exportedAt: "2026-04-27T00:00:00.000Z",
      memories: []
    });
  });
});

describe("Lore import/export", () => {
  it("round trips JSON exports", () => {
    const memory = {
      ...createMemoryRecord({
        content: "Always use Qwen.",
        sourceProvider: "agentmemory",
        sourceOriginalId: "am_1",
        now: new Date("2026-04-28T00:00:00.000Z")
      }),
      status: "confirmed" as const,
      validUntil: "2026-05-01T00:00:00.000Z",
      supersededBy: "mem_next",
      metadata: { importedFrom: "fixture" },
      lastUsedAt: "2026-04-29T00:00:00.000Z",
      useCount: 3
    };
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
      useCount: 3
    });
  });

  it("exports and imports simple markdown", () => {
    const memory = {
      ...createMemoryRecord({ content: "Use pnpm for package management.", memoryType: "procedure", scope: "repo", sourceProvider: "manual" }),
      status: "superseded" as const,
      supersededBy: "mem_new",
      riskTags: ["api_key"]
    };
    const markdown = exportLoreMarkdown([memory], new Date("2026-04-28T00:00:00.000Z"));

    expect(markdown).toContain("format: lore-memory-export");
    expect(importSimpleMarkdown(markdown)[0]).toMatchObject({
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
