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

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}
