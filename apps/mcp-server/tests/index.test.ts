import { describe, expect, it } from "vitest";
import { getMcpServerInfo, getMcpToolDefinitions, getMutatingToolNames, handleJsonRpcMessage } from "../src/index.js";

describe("getMcpServerInfo", () => {
  it("declares the small Lore MCP surface", () => {
    expect(getMcpServerInfo()).toMatchObject({
      name: "lore-context-mcp-server",
      protocol: "mcp"
    });
    expect(getMcpServerInfo().tools).toContain("context_query");
    expect(getMcpServerInfo().tools).not.toContain("agentmemory_raw" as never);
  });

  it("marks state-changing tools as mutating", () => {
    expect(getMutatingToolNames()).toEqual(["memory_write", "memory_forget", "memory_update", "memory_supersede", "eval_run"]);
  });

  it("requires a reason for memory_forget", () => {
    const forget = getMcpToolDefinitions().find((tool) => tool.name === "memory_forget");
    expect(forget?.inputSchema.required).toContain("reason");
    expect(forget?.inputSchema.properties).toMatchObject({
      hard_delete: { type: "boolean" }
    });
  });
});

describe("handleJsonRpcMessage", () => {
  it("initializes with the tools capability", async () => {
    const response = await handleJsonRpcMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "test", version: "0.0.0" }
      }
    });

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-11-25",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "lore-context-mcp-server" }
      }
    });
  });

  it("lists MCP tools with JSON schemas", async () => {
    const response = await handleJsonRpcMessage({ jsonrpc: "2.0", id: "tools", method: "tools/list" });

    expect(response).toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "context_query",
            inputSchema: expect.objectContaining({
              required: ["query"],
              properties: expect.objectContaining({
                mode: expect.objectContaining({ enum: ["auto", "memory", "web", "repo", "tool_traces"] }),
                sources: expect.objectContaining({ type: "object" })
              })
            })
          }),
          expect.objectContaining({
            name: "memory_supersede",
            inputSchema: expect.objectContaining({ required: ["memory_id", "content", "reason"] })
          })
        ])
      }
    });
  });

  it("proxies memory updates to version-aware REST endpoints", async () => {
    const seen: Array<{ url: string; method: string | undefined; body: string | undefined }> = [];
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "memory_update",
          arguments: { memory_id: "mem_1", content: "Updated memory" }
        }
      },
      {
        apiBaseUrl: "http://lore.local",
        fetchImpl: async (input, init) => {
          seen.push({
            url: String(input),
            method: init?.method,
            body: init?.body?.toString()
          });
          return new Response(JSON.stringify({ memory: { id: "mem_1", content: "Updated memory" } }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      }
    );

    expect(seen).toEqual([
      {
        url: "http://lore.local/v1/memory/mem_1",
        method: "PATCH",
        body: JSON.stringify({ content: "Updated memory" })
      }
    ]);
    expect(response).toMatchObject({
      result: {
        structuredContent: { memory: { id: "mem_1" } }
      }
    });
  });

  it("passes memory list filters through query parameters", async () => {
    const seen: string[] = [];
    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "memory_list",
          arguments: { project_id: "demo", status: "active", scope: "project", q: "Qwen", limit: 5 }
        }
      },
      {
        apiBaseUrl: "http://lore.local",
        fetchImpl: async (input) => {
          seen.push(String(input));
          return new Response(JSON.stringify({ memories: [] }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      }
    );

    expect(seen).toEqual(["http://lore.local/v1/memory/list?project_id=demo&scope=project&status=active&q=Qwen&limit=5"]);
  });

  it("passes memory export project filters through query parameters", async () => {
    const seen: string[] = [];
    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "memory_export",
          arguments: { format: "markdown", project_id: "demo" }
        }
      },
      {
        apiBaseUrl: "http://lore.local",
        fetchImpl: async (input) => {
          seen.push(String(input));
          return new Response(JSON.stringify({ memories: [] }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      }
    );

    expect(seen).toEqual(["http://lore.local/v1/memory/export?format=markdown&project_id=demo"]);
  });

  it("proxies tool calls to the Lore REST API", async () => {
    const seen: Array<{ url: string; body: string | undefined; authorization: string | null }> = [];
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "context_query",
          arguments: { query: "继续 Lore", project_id: "demo" }
        }
      },
      {
        apiBaseUrl: "http://lore.local/",
        apiKey: "dev-secret",
        fetchImpl: async (input, init) => {
          seen.push({
            url: String(input),
            body: init?.body?.toString(),
            authorization: new Headers(init?.headers).get("authorization")
          });
          return new Response(JSON.stringify({ traceId: "ctx_1", contextBlock: "Lore context block" }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      }
    );

    expect(seen).toEqual([
      {
        url: "http://lore.local/v1/context/query",
        body: JSON.stringify({ query: "继续 Lore", project_id: "demo" }),
        authorization: "Bearer dev-secret"
      }
    ]);
    expect(response).toMatchObject({
      result: {
        content: [{ type: "text", text: "Lore context block" }],
        structuredContent: { traceId: "ctx_1" }
      }
    });
  });

  it("returns protocol errors for unknown tools", async () => {
    const response = await handleJsonRpcMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "agentmemory_raw",
        arguments: {}
      }
    });

    expect(response).toMatchObject({
      error: {
        code: -32602,
        message: "Unknown Lore MCP tool"
      }
    });
  });
});
