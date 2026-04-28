import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { AgentMemoryAdapter, SUPPORTED_AGENTMEMORY_RANGE } from "../src/index.js";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("validateUpstreamVersion", () => {
  it("reports compatible when version is within supported range", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => jsonResponse({ version: "0.9.5" })
    });

    const result = await adapter.validateUpstreamVersion();
    expect(result.compatible).toBe(true);
    expect(result.upstreamVersion).toBe("0.9.5");
    expect(result.required).toBe(SUPPORTED_AGENTMEMORY_RANGE);
    expect(result.warnings).toHaveLength(0);
  });

  it("reports incompatible with warning when version is below range (0.8.0)", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => jsonResponse({ version: "0.8.0" })
    });

    const result = await adapter.validateUpstreamVersion();
    expect(result.compatible).toBe(false);
    expect(result.upstreamVersion).toBe("0.8.0");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("0.8.0");
  });

  it("reports incompatible with warning when version is above range (0.11.0)", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => jsonResponse({ version: "0.11.0" })
    });

    const result = await adapter.validateUpstreamVersion();
    expect(result.compatible).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("reports incompatible with warning when upstream is unreachable", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => { throw new Error("connection refused"); }
    });

    const result = await adapter.validateUpstreamVersion();
    expect(result.compatible).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("reports compatible for version at lower boundary 0.9.0", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => jsonResponse({ version: "0.9.0" })
    });

    const result = await adapter.validateUpstreamVersion();
    expect(result.compatible).toBe(true);
  });

  it("reports incompatible for version at upper boundary 0.11.0 (exclusive)", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => jsonResponse({ version: "0.11.0" })
    });

    const result = await adapter.validateUpstreamVersion();
    expect(result.compatible).toBe(false);
  });
});

describe("LORE_AGENTMEMORY_REQUIRED=0 silent skip mode", () => {
  beforeEach(() => {
    process.env.LORE_AGENTMEMORY_REQUIRED = "0";
  });

  afterEach(() => {
    delete process.env.LORE_AGENTMEMORY_REQUIRED;
  });

  it("smartSearch returns empty array without calling fetch", async () => {
    let fetchCalled = false;
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => {
        fetchCalled = true;
        throw new Error("should not be called");
      }
    });

    const result = await adapter.smartSearch({ query: "test" });
    expect(result).toEqual([]);
    expect(fetchCalled).toBe(false);
  });

  it("getContext returns empty result without calling fetch", async () => {
    let fetchCalled = false;
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => {
        fetchCalled = true;
        throw new Error("should not be called");
      }
    });

    const result = await adapter.getContext({ query: "test" });
    expect(result.context).toBe("");
    expect(result.hits).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(fetchCalled).toBe(false);
  });

  it("exportAll returns empty without calling fetch", async () => {
    let fetchCalled = false;
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => {
        fetchCalled = true;
        throw new Error("should not be called");
      }
    });

    const result = await adapter.exportAll();
    expect(result.memories).toEqual([]);
    expect(fetchCalled).toBe(false);
  });

  it("forget still validates reason but returns empty result without calling fetch", async () => {
    let fetchCalled = false;
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => {
        fetchCalled = true;
        throw new Error("should not be called");
      }
    });

    // empty reason still throws
    await expect(adapter.forget({ memoryIds: ["m1"], reason: "" })).rejects.toMatchObject({
      code: "memory.reason_required"
    });

    // valid reason silently skips
    const result = await adapter.forget({ memoryIds: ["m1"], reason: "cleanup" });
    expect(result.deleted).toBe(0);
    expect(fetchCalled).toBe(false);
  });
});
