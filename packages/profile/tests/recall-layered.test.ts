import { describe, expect, it } from "vitest";
import { composeLayeredRecall, type LayeredHit } from "../src/index.js";
import { FROZEN_NOW, activeMemory, buildHit } from "./fixtures.js";

describe("composeLayeredRecall - source trust ranking", () => {
  it("ranks pinned_memory above browser_summary at the same raw score", () => {
    const pinned = activeMemory("pinned: must use pnpm", { id: "mem_pinned" });
    const browser = activeMemory("browser: random page mentions npm", { id: "mem_browser" });
    const hits: LayeredHit[] = [
      { layer: "browser_summary", hit: buildHit(browser, 0.8) },
      { layer: "pinned_memory", hit: buildHit(pinned, 0.8) }
    ];
    const response = composeLayeredRecall({
      query: "package manager",
      vaultId: "v1",
      hits,
      now: FROZEN_NOW
    });
    expect(response.items[0].text).toContain("pinned");
    expect(response.appliedTrust.mem_pinned).toBeGreaterThan(response.appliedTrust.mem_browser);
  });

  it("respects per-request trust overrides", () => {
    const pinned = activeMemory("pinned content", { id: "mem_pinned" });
    const recent = activeMemory("recent content", { id: "mem_recent" });
    const hits: LayeredHit[] = [
      { layer: "pinned_memory", hit: buildHit(pinned, 0.5) },
      { layer: "recent_session", hit: buildHit(recent, 0.5) }
    ];
    const response = composeLayeredRecall({
      query: "x",
      vaultId: "v1",
      hits,
      // de-trust pinned to 0.1 so recent_session wins
      trustOverrides: { pinned_memory: 0.1, recent_session: 0.9 },
      now: FROZEN_NOW
    });
    expect(response.items[0].text).toContain("recent");
  });

  it("annotates each item with its retrieval layer", () => {
    const proj = activeMemory("project decision", { id: "mem_proj" });
    const conn = activeMemory("connector doc snippet", { id: "mem_conn" });
    const hits: LayeredHit[] = [
      { layer: "project_memory", hit: buildHit(proj, 0.9) },
      { layer: "connector_doc", hit: buildHit(conn, 0.7), sourceRef: "drive:abc" }
    ];
    const response = composeLayeredRecall({
      query: "x",
      vaultId: "v1",
      hits,
      now: FROZEN_NOW
    });
    expect(response.itemLayers).toHaveLength(response.items.length);
    expect(response.itemLayers).toContain("project_memory");
    expect(response.itemLayers).toContain("connector_doc");
  });

  it("enforces token budget like base composer", () => {
    const big = activeMemory("a".repeat(2000), { id: "mem_big" });
    const response = composeLayeredRecall({
      query: "x",
      vaultId: "v1",
      tokenBudget: 50,
      hits: [{ layer: "browser_summary", hit: buildHit(big, 1) }],
      now: FROZEN_NOW
    });
    expect(response.truncated).toBe(true);
  });

  it("clamps trust overrides outside [0,1]", () => {
    const m = activeMemory("content", { id: "mem_x" });
    const response = composeLayeredRecall({
      query: "x",
      vaultId: "v1",
      hits: [{ layer: "browser_summary", hit: buildHit(m, 0.5) }],
      trustOverrides: { browser_summary: 5 },
      now: FROZEN_NOW
    });
    expect(response.appliedTrust.mem_x).toBeLessThanOrEqual(1);
    expect(response.appliedTrust.mem_x).toBeGreaterThanOrEqual(0);
  });
});
