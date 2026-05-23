import { describe, expect, it } from "vitest";
import { AgentMemoryAdapter, DEFAULT_AGENTMEMORY_URL, normalizeAgentMemoryUrl } from "../src/index.js";

describe("normalizeAgentMemoryUrl", () => {
  it("uses the local agentmemory default", () => {
    expect(normalizeAgentMemoryUrl()).toBe(DEFAULT_AGENTMEMORY_URL);
  });

  it("removes a trailing slash", () => {
    expect(normalizeAgentMemoryUrl("http://localhost:3111/")).toBe("http://localhost:3111");
  });
});

describe("AgentMemoryAdapter", () => {
  it("reports degraded health without throwing when the runtime is unavailable", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => {
        throw new Error("connection refused");
      }
    });

    await expect(adapter.health()).resolves.toMatchObject({
      status: "degraded",
      baseUrl: DEFAULT_AGENTMEMORY_URL
    });
  });

  it("maps search results into Lore memory hits", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async (url, init) => {
        expect(url).toBe("http://127.0.0.1:3111/agentmemory/smart-search");
        expect(init?.method).toBe("POST");
        return jsonResponse({
          hits: [
            {
              id: "abc",
              content: "Use Qwen for this project.",
              score: 0.91,
              memory_type: "project_rule",
              scope: "project"
            }
          ]
        });
      }
    });

    await expect(adapter.smartSearch({ query: "model", projectId: "demo" })).resolves.toEqual([
      expect.objectContaining({
        score: 0.91,
        backend: "agentmemory",
        memory: expect.objectContaining({
          id: "am_abc",
          content: "Use Qwen for this project.",
          memoryType: "project_rule",
          projectId: "demo"
        })
      })
    ]);
  });

  it("maps context, remember, export, and audit contracts", async () => {
    const seen: Array<{ url: string; method?: string; authorization?: string; body?: unknown }> = [];
    const adapter = new AgentMemoryAdapter({
      baseUrl: "http://localhost:3111",
      secret: "contract-secret",
      fetchImpl: async (url, init) => {
        seen.push({
          url,
          method: init?.method,
          authorization: new Headers(init?.headers).get("authorization") ?? undefined,
          body: init?.body ? JSON.parse(String(init.body)) : undefined
        });
        if (url.endsWith("/agentmemory/context")) {
          return jsonResponse({
            context_block: "Use Lore for governed memory.",
            hits: [{ id: "ctx", content: "Governed memory", score: 0.8 }],
            warnings: ["review stale hits"]
          });
        }
        if (url.endsWith("/agentmemory/remember")) {
          return jsonResponse({ memory: { id: "remembered" } });
        }
        if (url.endsWith("/agentmemory/export")) {
          return jsonResponse({ memories: [{ id: "exported", content: "Exported memory" }] });
        }
        if (url.endsWith("/agentmemory/audit?limit=5")) {
          return jsonResponse({ entries: [{ id: "audit_1", action: "remember", created_at: "2026-04-28T00:00:00.000Z" }] });
        }
        throw new Error(`unexpected url ${url}`);
      }
    });

    await expect(adapter.getContext({ query: "governed", projectId: "demo" })).resolves.toMatchObject({
      context: "Use Lore for governed memory.",
      warnings: ["review stale hits"],
      hits: [expect.objectContaining({ backend: "agentmemory" })]
    });
    await expect(adapter.remember({ content: "Save governed memory", projectId: "demo" })).resolves.toMatchObject({
      backendId: "remembered",
      memory: expect.objectContaining({
        id: "am_remembered",
        sourceProvider: "agentmemory",
        sourceOriginalId: "remembered"
      })
    });
    await expect(adapter.exportAll()).resolves.toMatchObject({
      memories: [expect.objectContaining({ id: "am_exported", content: "Exported memory" })]
    });
    await expect(adapter.getAudit({ limit: 5 })).resolves.toMatchObject([
      { id: "audit_1", action: "remember", createdAt: "2026-04-28T00:00:00.000Z" }
    ]);
    expect(seen.every((item) => item.authorization === "Bearer contract-secret")).toBe(true);
    expect(seen.map((item) => item.method)).toEqual(["POST", "POST", "GET", "GET"]);
  });

  it("requires a reason for forget operations", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => jsonResponse({})
    });

    await expect(adapter.forget({ memoryIds: ["mem_1"], reason: "" })).rejects.toMatchObject({
      code: "memory.reason_required"
    });
  });

  it("forgets actual agentmemory memory ids one at a time", async () => {
    const bodies: unknown[] = [];
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async (_url, init) => {
        bodies.push(init?.body ? JSON.parse(String(init.body)) : {});
        return jsonResponse({ deleted: 1, success: true });
      }
    });

    await expect(adapter.forget({ memoryIds: ["mem_a", "mem_b"], reason: "cleanup" })).resolves.toEqual({
      deleted: 2,
      backendIds: ["mem_a", "mem_b"]
    });
    expect(bodies).toEqual([
      expect.objectContaining({ memoryId: "mem_a", memory_id: "mem_a", reason: "cleanup" }),
      expect.objectContaining({ memoryId: "mem_b", memory_id: "mem_b", reason: "cleanup" })
    ]);
  });
});

describe("AgentMemory 0.9.4 compatibility", () => {
  it("remember always returns candidate:true so imports go to Memory Inbox", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => jsonResponse({ id: "backend_1" })
    });

    const result = await adapter.remember({ content: "test memory", projectId: "demo" });
    expect(result.candidate).toBe(true);
    expect(result.backendId).toBe("backend_1");
  });

  it("remember in silent mode also returns candidate:true", async () => {
    const original = process.env.LORE_AGENTMEMORY_REQUIRED;
    process.env.LORE_AGENTMEMORY_REQUIRED = "0";
    try {
      const adapter = new AgentMemoryAdapter({
        fetchImpl: async () => { throw new Error("should not be called"); }
      });
      const result = await adapter.remember({ content: "silent" });
      expect(result.candidate).toBe(true);
    } finally {
      if (original === undefined) delete process.env.LORE_AGENTMEMORY_REQUIRED;
      else process.env.LORE_AGENTMEMORY_REQUIRED = original;
    }
  });

  it("importAll returns candidate:true", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => jsonResponse({ imported: 3, skipped: 1, warnings: [] })
    });

    const result = await adapter.importAll({ memories: [] });
    expect(result.candidate).toBe(true);
    expect(result.imported).toBe(3);
  });

  it("getConfigFlags returns parsed flags from /agentmemory/config/flags", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async (url) => {
        expect(url).toContain("/agentmemory/config/flags");
        return jsonResponse({ flags: { hookEnabled: true, maxMemories: 100, model: "qwen2.5" } });
      }
    });

    const result = await adapter.getConfigFlags();
    expect(result.flags).toEqual({ hookEnabled: true, maxMemories: 100, model: "qwen2.5" });
  });

  it("getConfigFlags returns empty flags when server unavailable", async () => {
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async () => { throw new Error("connection refused"); }
    });

    await expect(adapter.getConfigFlags()).rejects.toMatchObject({ code: "agentmemory.unavailable" });
  });

  it("getConfigFlags in silent mode returns empty flags without calling fetch", async () => {
    const original = process.env.LORE_AGENTMEMORY_REQUIRED;
    process.env.LORE_AGENTMEMORY_REQUIRED = "0";
    try {
      let fetchCalled = false;
      const adapter = new AgentMemoryAdapter({
        fetchImpl: async () => { fetchCalled = true; throw new Error("should not be called"); }
      });
      const result = await adapter.getConfigFlags();
      expect(result.flags).toEqual({});
      expect(fetchCalled).toBe(false);
    } finally {
      if (original === undefined) delete process.env.LORE_AGENTMEMORY_REQUIRED;
      else process.env.LORE_AGENTMEMORY_REQUIRED = original;
    }
  });

  it("replaySession posts to /agentmemory/sessions/load and returns candidate:true", async () => {
    const seen: Array<{ url: string; body: unknown }> = [];
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async (url, init) => {
        seen.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
        return jsonResponse({ loaded: 2, skipped: 0, warnings: [] });
      }
    });

    const result = await adapter.replaySession({
      sessions: [{ id: "s1" }, { id: "s2" }],
      projectId: "demo"
    });

    expect(result.replayed).toBe(2);
    expect(result.candidate).toBe(true);
    expect(seen[0].url).toContain("/agentmemory/sessions/load");
    expect(seen[0].body).toMatchObject({ project_id: "demo", sessions: [{ id: "s1" }, { id: "s2" }] });
  });

  it("replaySession in silent mode returns candidate:true without calling fetch", async () => {
    const original = process.env.LORE_AGENTMEMORY_REQUIRED;
    process.env.LORE_AGENTMEMORY_REQUIRED = "0";
    try {
      let fetchCalled = false;
      const adapter = new AgentMemoryAdapter({
        fetchImpl: async () => { fetchCalled = true; throw new Error("should not be called"); }
      });
      const result = await adapter.replaySession({ sessions: [] });
      expect(result.candidate).toBe(true);
      expect(result.replayed).toBe(0);
      expect(fetchCalled).toBe(false);
    } finally {
      if (original === undefined) delete process.env.LORE_AGENTMEMORY_REQUIRED;
      else process.env.LORE_AGENTMEMORY_REQUIRED = original;
    }
  });

  it("getSessions fetches /agentmemory/sessions with query params", async () => {
    const seen: string[] = [];
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async (url) => {
        seen.push(url);
        return jsonResponse({ sessions: [{ id: "sess_1", project_id: "demo", created_at: "2026-04-01T00:00:00Z" }] });
      }
    });

    const sessions = await adapter.getSessions({ projectId: "demo", limit: 5 });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe("sess_1");
    expect(sessions[0].projectId).toBe("demo");
    expect(seen[0]).toContain("/agentmemory/sessions");
    expect(seen[0]).toContain("project_id=demo");
    expect(seen[0]).toContain("limit=5");
  });

  it("getProfile fetches /agentmemory/sessions/profile", async () => {
    const seen: string[] = [];
    const adapter = new AgentMemoryAdapter({
      fetchImpl: async (url) => {
        seen.push(url);
        return jsonResponse({ profile: { preferredLanguage: "TypeScript", workStyle: "TDD" } });
      }
    });

    const result = await adapter.getProfile({ projectId: "demo" });
    expect(result.profile).toMatchObject({ preferredLanguage: "TypeScript" });
    expect(seen[0]).toContain("/agentmemory/sessions/profile");
    expect(seen[0]).toContain("project_id=demo");
  });
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}
