import { describe, expect, it } from "vitest";
import { countApproxTokens, createMemoryRecord, packageInfo, stableMemoryId } from "../src/index.js";

describe("packageInfo", () => {
  it("builds package metadata", () => {
    expect(packageInfo("@lore/shared")).toEqual({
      name: "@lore/shared",
      version: "0.0.0"
    });
  });
});

describe("createMemoryRecord", () => {
  it("creates a stable active memory record with provenance fields", () => {
    const record = createMemoryRecord({
      content: "Use Qwen for this project.",
      memoryType: "project_rule",
      scope: "project",
      projectId: "demo",
      now: new Date("2026-04-28T00:00:00.000Z")
    });

    expect(record).toMatchObject({
      id: stableMemoryId("mem", "Use Qwen for this project."),
      content: "Use Qwen for this project.",
      memoryType: "project_rule",
      scope: "project",
      visibility: "project",
      status: "active",
      projectId: "demo",
      validFrom: "2026-04-28T00:00:00.000Z"
    });
  });

  it("keeps default scope and visibility consistent", () => {
    const record = createMemoryRecord({
      content: "Default memories are project visible.",
      now: new Date("2026-04-28T00:00:00.000Z")
    });

    expect(record).toMatchObject({
      scope: "project",
      visibility: "project"
    });
  });
});

describe("countApproxTokens", () => {
  it("uses a deterministic coarse token estimate", () => {
    expect(countApproxTokens("12345678")).toBe(2);
  });
});
