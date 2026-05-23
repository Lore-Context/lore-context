import { describe, expect, it } from "vitest";
import { buildEvidenceLedger, composeRecallContext } from "../src/index.js";
import { FROZEN_NOW, activeMemory, buildHit } from "./fixtures.js";

describe("EvidenceLedger v0.9 fields", () => {
  it("attaches retrievalLayer, sourceRef, sourceTimestamp from per-memory maps", () => {
    const m1 = activeMemory("first", { id: "mem_1" });
    const m2 = activeMemory("second", { id: "mem_2" });
    const recall = composeRecallContext({
      query: "x",
      vaultId: "v1",
      memoryHits: [buildHit(m1, 0.9), buildHit(m2, 0.5)],
      now: FROZEN_NOW
    });

    const trace = buildEvidenceLedger({
      vaultId: "v1",
      query: "x",
      response: recall,
      consideredHits: [buildHit(m1, 0.9), buildHit(m2, 0.5)],
      requestingClient: "claude_code",
      layerByMemoryId: { mem_1: "pinned_memory", mem_2: "connector_doc" },
      sourceRefByMemoryId: { mem_2: "drive:doc-42" },
      sourceTimestampByMemoryId: { mem_1: "2026-04-30T00:00:00Z", mem_2: "2026-04-29T00:00:00Z" },
      now: FROZEN_NOW
    });

    expect(trace.requestingClient).toBe("claude_code");
    const e1 = trace.entries.find((e) => e.memoryId === "mem_1");
    const e2 = trace.entries.find((e) => e.memoryId === "mem_2");
    expect(e1?.retrievalLayer).toBe("pinned_memory");
    expect(e1?.sourceTimestamp).toBe("2026-04-30T00:00:00Z");
    expect(e2?.retrievalLayer).toBe("connector_doc");
    expect(e2?.sourceRef).toBe("drive:doc-42");
  });

  it("entries without v0.9 maps still build (backward compat)", () => {
    const m = activeMemory("a", { id: "mem_a" });
    const recall = composeRecallContext({
      query: "x",
      vaultId: "v1",
      memoryHits: [buildHit(m, 0.9)],
      now: FROZEN_NOW
    });
    const trace = buildEvidenceLedger({
      vaultId: "v1",
      query: "x",
      response: recall,
      consideredHits: [buildHit(m, 0.9)],
      now: FROZEN_NOW
    });
    expect(trace.entries[0].retrievalLayer).toBeUndefined();
    expect(trace.requestingClient).toBeUndefined();
  });
});
