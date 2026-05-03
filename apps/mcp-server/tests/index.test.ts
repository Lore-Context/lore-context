import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAdvancedMcpToolNames,
  getDefaultMcpToolNames,
  getHostedMcpAuthorizationServerMetadata,
  getHostedMcpProtectedResourceMetadata,
  getHostedMcpWwwAuthenticateHeader,
  getMcpServerInfo,
  getMcpToolDefinitions,
  getMutatingToolNames,
  handleHostedMcpHttpRequest,
  handleJsonRpcMessage
} from "../src/index.js";

describe("getMcpServerInfo", () => {
  it("declares the small Lore MCP surface", () => {
    expect(getMcpServerInfo()).toMatchObject({
      name: "lore-context-mcp-server",
      protocol: "mcp"
    });
    expect(getMcpServerInfo().tools).toContain("context_query");
    expect(getMcpServerInfo().tools).not.toContain("agentmemory_raw" as never);
  });

  it("marks state-changing tools as mutating (full list with advanced tools)", () => {
    expect(getMutatingToolNames({ includeAdvanced: true })).toEqual([
      "memory.add_candidate",
      "memory.inbox_approve",
      "memory.inbox_reject",
      "memory.delete",
      "memory_write",
      "memory_forget",
      "memory_update",
      "memory_supersede",
      "source.pause",
      "source.resume",
      "profile.update_candidate",
      "eval_run"
    ]);
  });

  it("requires a reason for memory_forget (advanced tool)", () => {
    const forget = getMcpToolDefinitions({ includeAdvanced: true }).find((tool) => tool.name === "memory_forget");
    expect(forget?.inputSchema.required).toContain("reason");
    expect(forget?.inputSchema.properties).toMatchObject({
      hard_delete: { type: "boolean" }
    });
  });
});

describe("hosted MCP HTTP helpers", () => {
  it("declares OAuth protected-resource and authorization-server metadata", () => {
    expect(getHostedMcpProtectedResourceMetadata("https://api.lorecontext.com/mcp")).toMatchObject({
      resource: "https://api.lorecontext.com/mcp",
      authorization_servers: ["https://api.lorecontext.com"],
      scopes_supported: expect.arrayContaining(["mcp.read", "mcp.write"])
    });
    expect(getHostedMcpAuthorizationServerMetadata("https://api.lorecontext.com/mcp")).toMatchObject({
      issuer: "https://api.lorecontext.com",
      token_endpoint: "https://api.lorecontext.com/v1/cloud/devices/pair",
      lore_beta: expect.objectContaining({
        dynamic_client_registration: false
      })
    });
    expect(getHostedMcpWwwAuthenticateHeader("https://api.lorecontext.com/mcp")).toContain(
      'resource_metadata="https://api.lorecontext.com/.well-known/oauth-protected-resource"'
    );
  });

  it("serves hosted MCP JSON-RPC over POST without starting stdio", async () => {
    const response = await handleHostedMcpHttpRequest(new Request("https://api.lorecontext.com/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-protocol-version": "2025-11-25"
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "memory.recall" }),
          expect.objectContaining({ name: "source.pause" })
        ])
      }
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

  it("lists MCP tools with JSON schemas (advanced mode includes all tools)", async () => {
    process.env.LORE_MCP_ADVANCED_TOOLS = "1";
    try {
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
            }),
            expect.objectContaining({
              name: "memory.recall",
              inputSchema: expect.objectContaining({ required: ["query"] })
            }),
            expect.objectContaining({
              name: "memory.inbox_reject",
              inputSchema: expect.objectContaining({ required: ["memory_id", "reason"] })
            }),
            expect.objectContaining({
              name: "evidence.trace_get",
              inputSchema: expect.objectContaining({ required: ["trace_id"] })
            })
          ])
        }
      });
    } finally {
      delete process.env.LORE_MCP_ADVANCED_TOOLS;
    }
  });

  it("proxies hosted beta inbox and evidence tools to existing REST endpoints", async () => {
    const seen: Array<{ url: string; method: string | undefined; body: string | undefined }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      seen.push({ url: String(input), method: init?.method, body: init?.body?.toString() });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "approve",
        method: "tools/call",
        params: {
          name: "memory.inbox_approve",
          arguments: { memory_id: "mem_c", reason: "reviewed by hosted MCP beta" }
        }
      },
      { apiBaseUrl: "http://lore.local", fetchImpl }
    );
    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "ledger",
        method: "tools/call",
        params: {
          name: "evidence.trace_get",
          arguments: { trace_id: "ctx_1" }
        }
      },
      { apiBaseUrl: "http://lore.local", fetchImpl }
    );

    expect(seen).toEqual([
      {
        url: "http://lore.local/v1/governance/memory/mem_c/approve",
        method: "POST",
        body: JSON.stringify({ reason: "reviewed by hosted MCP beta" })
      },
      {
        url: "http://lore.local/v1/evidence/ledger/ctx_1",
        method: "GET",
        body: undefined
      }
    ]);
  });

  it("proxies source pause and resume through capture heartbeats", async () => {
    const seen: Array<{ url: string; body: string | undefined }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      seen.push({ url: String(input), body: init?.body?.toString() });
      return new Response(JSON.stringify({ source: { id: "src_1", status: "paused" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "pause",
        method: "tools/call",
        params: {
          name: "source.pause",
          arguments: { source_id: "src_1", reason: "maintenance window" }
        }
      },
      { apiBaseUrl: "http://lore.local", fetchImpl }
    );
    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "resume",
        method: "tools/call",
        params: {
          name: "source.resume",
          arguments: { source_id: "src_1" }
        }
      },
      { apiBaseUrl: "http://lore.local", fetchImpl }
    );

    expect(seen).toEqual([
      {
        url: "http://lore.local/v1/capture/sources/src_1/heartbeat",
        body: JSON.stringify({
          status: "paused",
          source_type: "hosted_mcp",
          source_provider: "hosted_mcp",
          metadata: { action: "source.pause", reason: "maintenance window" }
        })
      },
      {
        url: "http://lore.local/v1/capture/sources/src_1/heartbeat",
        body: JSON.stringify({
          status: "active",
          source_type: "hosted_mcp",
          source_provider: "hosted_mcp",
          metadata: { action: "source.resume" }
        })
      }
    ]);
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
          arguments: { memory_id: "mem_1", content: "Updated memory", reason: "correcting factual error in stored memory" }
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
        body: JSON.stringify({ reason: "correcting factual error in stored memory", content: "Updated memory" })
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
        content: [{ type: "text", text: "Trace ID: ctx_1\n\nLore context block" }],
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

  it("returns -32602 when memory_write receives non-string content", async () => {
    const response = await handleJsonRpcMessage({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "memory_write",
        arguments: { content: 42, scope: "project" }
      }
    });

    expect(response).toMatchObject({
      error: {
        code: -32602
      }
    });
    const issues = JSON.parse((response as { error: { message: string } }).error.message).invalid_params;
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.some((i: { path: unknown[]; message: string }) => i.path.includes("content"))).toBe(true);
  });

  it("returns -32602 when memory_update is missing reason", async () => {
    const response = await handleJsonRpcMessage({
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: {
        name: "memory_update",
        arguments: { memory_id: "mem_x", content: "new content" }
      }
    });

    expect(response).toMatchObject({
      error: {
        code: -32602
      }
    });
    const issues = JSON.parse((response as { error: { message: string } }).error.message).invalid_params;
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.some((i: { path: unknown[]; message: string }) => i.path.includes("reason"))).toBe(true);
  });

  it("sanitizes upstream errors so response message contains no SQL or file paths", async () => {
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: {
          name: "context_query",
          arguments: { query: "test query" }
        }
      },
      {
        apiBaseUrl: "http://lore.local",
        fetchImpl: async () => {
          return new Response(
            JSON.stringify({ error: { code: "db_error", message: "SELECT * FROM memories WHERE id=$1 failed at /app/src/db.ts:42" } }),
            { status: 500, headers: { "content-type": "application/json" } }
          );
        }
      }
    );

    expect(response).toMatchObject({ result: { isError: true } });
    const text = (response as { result: { content: Array<{ text: string }> } }).result.content[0].text;
    expect(text).not.toMatch(/SELECT/i);
    expect(text).not.toMatch(/\/app\//);
    expect(text).toBe("operation failed");
  });
});

describe("MCP tool surface tiers", () => {
  beforeEach(() => {
    delete process.env.LORE_MCP_ADVANCED_TOOLS;
  });

  afterEach(() => {
    delete process.env.LORE_MCP_ADVANCED_TOOLS;
  });

  it("default surface contains only core tools — no advanced tools exposed", () => {
    const defaultNames = getDefaultMcpToolNames();
    expect(defaultNames).toContain("context_query");
    expect(defaultNames).toContain("memory.recall");
    expect(defaultNames).toContain("memory.add_candidate");
    expect(defaultNames).toContain("memory.inbox_list");
    expect(defaultNames).toContain("memory.inbox_approve");
    expect(defaultNames).toContain("memory.inbox_reject");
    expect(defaultNames).toContain("memory.delete");
    expect(defaultNames).toContain("memory_write");
    expect(defaultNames).toContain("memory_search");
    expect(defaultNames).toContain("source.pause");
    expect(defaultNames).toContain("source.resume");

    // advanced tools must NOT appear in the default surface
    expect(defaultNames).not.toContain("memory_forget");
    expect(defaultNames).not.toContain("memory_list");
    expect(defaultNames).not.toContain("memory_get");
    expect(defaultNames).not.toContain("memory_update");
    expect(defaultNames).not.toContain("memory_supersede");
    expect(defaultNames).not.toContain("memory_export");
    expect(defaultNames).not.toContain("evidence.trace_get");
    expect(defaultNames).not.toContain("profile.get");
    expect(defaultNames).not.toContain("eval_run");
    expect(defaultNames).not.toContain("trace_get");
  });

  it("advanced surface contains all tools when includeAdvanced:true", () => {
    const advancedNames = getAdvancedMcpToolNames();
    expect(advancedNames).toContain("memory_forget");
    expect(advancedNames).toContain("memory_list");
    expect(advancedNames).toContain("evidence.trace_get");
    expect(advancedNames).toContain("eval_run");

    const allNames = getMcpToolDefinitions({ includeAdvanced: true }).map((t) => t.name);
    expect(allNames).toContain("context_query");
    expect(allNames).toContain("memory_forget");
    expect(allNames.length).toBeGreaterThan(getDefaultMcpToolNames().length);
  });

  it("getMcpToolDefinitions() without options returns only default tools", () => {
    const tools = getMcpToolDefinitions();
    const names = tools.map((t) => t.name);
    expect(names).not.toContain("memory_list");
    expect(names).not.toContain("eval_run");
    expect(names).toContain("context_query");
  });

  it("LORE_MCP_ADVANCED_TOOLS=1 env var enables advanced tools via getMcpToolDefinitions()", () => {
    process.env.LORE_MCP_ADVANCED_TOOLS = "1";
    const names = getMcpToolDefinitions().map((t) => t.name);
    expect(names).toContain("memory_list");
    expect(names).toContain("eval_run");
    expect(names).toContain("context_query");
  });

  it("getMcpServerInfo() tools list respects default tier filter", () => {
    const info = getMcpServerInfo();
    expect(info.tools).toContain("context_query");
    expect(info.tools).not.toContain("memory_list");
  });

  it("getMcpServerInfo({ includeAdvanced:true }) includes advanced tools", () => {
    const info = getMcpServerInfo({ includeAdvanced: true });
    expect(info.tools).toContain("memory_list");
    expect(info.tools).toContain("eval_run");
  });

  it("getMutatingToolNames() only includes default mutating tools by default", () => {
    const mutating = getMutatingToolNames();
    expect(mutating).toContain("memory.add_candidate");
    expect(mutating).toContain("source.pause");
    expect(mutating).not.toContain("memory_forget");
    expect(mutating).not.toContain("eval_run");
  });

  it("tools/list MCP response contains only default tools when advanced mode is off", async () => {
    const response = await handleJsonRpcMessage({ jsonrpc: "2.0", id: "tl", method: "tools/list" });
    const tools = (response as { result: { tools: Array<{ name: string }> } }).result.tools;
    const names = tools.map((t) => t.name);
    expect(names).toContain("context_query");
    expect(names).not.toContain("memory_list");
    expect(names).not.toContain("eval_run");
  });
});
