import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export type LoreMcpToolName =
  | "context_query"
  | "memory_write"
  | "memory_search"
  | "memory_forget"
  | "memory_list"
  | "memory_get"
  | "memory_update"
  | "memory_supersede"
  | "memory_export"
  | "eval_run"
  | "trace_get";

export interface McpToolDefinition {
  name: LoreMcpToolName;
  description: string;
  mutates: boolean;
  inputSchema: {
    type: "object";
    required?: string[];
    properties: Record<string, unknown>;
  };
}

export interface McpServerInfo {
  name: "lore-context-mcp-server";
  protocol: "mcp";
  tools: LoreMcpToolName[];
}

export type JsonRpcId = string | number;

export interface JsonRpcSuccessResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: Record<string, unknown>;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export interface LoreMcpRuntimeOptions {
  apiBaseUrl?: string;
  apiKey?: string;
  protocolVersion?: string;
  fetchImpl?: typeof fetch;
}

interface JsonRpcRequestLike {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

export function getMcpToolDefinitions(): McpToolDefinition[] {
  return [
    {
      name: "context_query",
      description: "Get agent-ready context from memory, web search, repo evidence and tool traces.",
      mutates: false,
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          project_id: { type: "string" },
          mode: { type: "string", enum: ["auto", "memory", "web", "repo", "tool_traces"] },
          sources: {
            type: "object",
            properties: {
              memory: { type: "boolean" },
              web: { type: "boolean" },
              repo: { type: "boolean" },
              tool_traces: { type: "boolean" }
            }
          },
          token_budget: { type: "number" },
          freshness: { type: "string", enum: ["none", "recent", "latest"] },
          writeback_policy: { type: "string", enum: ["explicit", "review_required", "safe_auto"] },
          include_sources: { type: "boolean" }
        }
      }
    },
    {
      name: "memory_write",
      description: "Save a user-approved or project-relevant memory with audit logging.",
      mutates: true,
      inputSchema: {
        type: "object",
        required: ["content", "scope"],
        properties: {
          content: { type: "string" },
          memory_type: { type: "string" },
          scope: { type: "string", enum: ["user", "project", "repo", "team", "org"] },
          project_id: { type: "string" }
        }
      }
    },
    {
      name: "memory_search",
      description: "Search visible Lore memories directly.",
      mutates: false,
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          project_id: { type: "string" },
          top_k: { type: "number" }
        }
      }
    },
    {
      name: "memory_forget",
      description: "Forget memories by explicit selector. Requires a reason and defaults to soft delete.",
      mutates: true,
      inputSchema: {
        type: "object",
        required: ["reason"],
        properties: {
          memory_ids: { type: "array", items: { type: "string" } },
          query: { type: "string" },
          reason: { type: "string" },
          hard_delete: { type: "boolean" }
        }
      }
    },
    {
      name: "memory_list",
      description: "List visible memories with pagination and filters.",
      mutates: false,
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          scope: { type: "string", enum: ["user", "project", "repo", "team", "org"] },
          status: { type: "string" },
          memory_type: { type: "string" },
          q: { type: "string" },
          limit: { type: "number" }
        }
      }
    },
    {
      name: "memory_get",
      description: "Read one visible Lore memory by id.",
      mutates: false,
      inputSchema: {
        type: "object",
        required: ["memory_id"],
        properties: {
          memory_id: { type: "string" }
        }
      }
    },
    {
      name: "memory_update",
      description: "Edit an existing memory. Risky content returns to the governance review queue.",
      mutates: true,
      inputSchema: {
        type: "object",
        required: ["memory_id"],
        properties: {
          memory_id: { type: "string" },
          content: { type: "string" },
          memory_type: { type: "string" },
          scope: { type: "string", enum: ["user", "project", "repo", "team", "org"] },
          project_id: { type: "string" },
          confidence: { type: "number" }
        }
      }
    },
    {
      name: "memory_supersede",
      description: "Create a new version of a memory and mark the previous one superseded.",
      mutates: true,
      inputSchema: {
        type: "object",
        required: ["memory_id", "content", "reason"],
        properties: {
          memory_id: { type: "string" },
          content: { type: "string" },
          reason: { type: "string" },
          memory_type: { type: "string" },
          scope: { type: "string", enum: ["user", "project", "repo", "team", "org"] },
          project_id: { type: "string" },
          confidence: { type: "number" }
        }
      }
    },
    {
      name: "memory_export",
      description: "Export visible memories as Lore JSON or Markdown.",
      mutates: false,
      inputSchema: {
        type: "object",
        properties: {
          format: { type: "string", enum: ["json", "markdown"] },
          project_id: { type: "string" }
        }
      }
    },
    {
      name: "eval_run",
      description: "Run retrieval evaluation over uploaded sessions and questions.",
      mutates: true,
      inputSchema: {
        type: "object",
        required: ["dataset"],
        properties: {
          dataset: { type: "object" },
          provider: { type: "string" }
        }
      }
    },
    {
      name: "trace_get",
      description: "Read a context or memory trace by id.",
      mutates: false,
      inputSchema: {
        type: "object",
        required: ["trace_id"],
        properties: {
          trace_id: { type: "string" }
        }
      }
    }
  ];
}

export function getMcpServerInfo(): McpServerInfo {
  return {
    name: "lore-context-mcp-server",
    protocol: "mcp",
    tools: getMcpToolDefinitions().map((tool) => tool.name)
  };
}

export function getMutatingToolNames(): LoreMcpToolName[] {
  return getMcpToolDefinitions()
    .filter((tool) => tool.mutates)
    .map((tool) => tool.name);
}

export async function handleJsonRpcMessage(message: unknown, options: LoreMcpRuntimeOptions = {}): Promise<JsonRpcResponse | undefined> {
  if (!isObject(message)) {
    return jsonRpcError(undefined, -32600, "Invalid JSON-RPC message");
  }

  const request = message as JsonRpcRequestLike;
  const id = normalizeJsonRpcId(request.id);
  if (request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    return jsonRpcError(id, -32600, "Invalid JSON-RPC request");
  }

  const expectsResponse = id !== undefined;
  if (!expectsResponse) {
    return undefined;
  }

  switch (request.method) {
    case "initialize":
      return jsonRpcResult(id, {
        protocolVersion: readProtocolVersion(request.params, options),
        capabilities: {
          tools: {
            listChanged: false
          }
        },
        serverInfo: {
          name: "lore-context-mcp-server",
          title: "Lore Context",
          version: "0.0.0"
        },
        instructions: "Use context_query for read-first context assembly. Use mutating memory tools only for explicit durable facts."
      });

    case "ping":
      return jsonRpcResult(id, {});

    case "tools/list":
      return jsonRpcResult(id, {
        tools: getMcpToolDefinitions().map(toMcpTool)
      });

    case "tools/call":
      try {
        return jsonRpcResult(id, await callTool(request.params, options));
      } catch (error) {
        if (error instanceof ProtocolError) {
          return jsonRpcError(id, error.code, error.message);
        }
        return jsonRpcError(id, -32603, "Internal error", errorToData(error));
      }

    default:
      return jsonRpcError(id, -32601, `Method not found: ${request.method}`);
  }
}

export async function runStdioServer(options: LoreMcpRuntimeOptions = {}): Promise<void> {
  process.stdin.setEncoding("utf8");
  let buffer = "";

  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    lines
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        void handleStdioLine(line, options);
      });
  });
}

export async function runSdkStdioServer(options: LoreMcpRuntimeOptions = {}): Promise<void> {
  const server = new Server(
    {
      name: "lore-context-mcp-server",
      version: "0.0.0"
    },
    {
      capabilities: {
        tools: {
          listChanged: false
        }
      },
      instructions: "Use context_query for read-first context assembly. Use mutating memory tools only for explicit durable facts."
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getMcpToolDefinitions().map(toMcpTool)
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => callTool(request.params, options));

  await server.connect(new StdioServerTransport());
}

async function handleStdioLine(line: string, options: LoreMcpRuntimeOptions): Promise<void> {
  try {
    const response = await handleJsonRpcMessage(JSON.parse(line), options);
    if (response) {
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  } catch (error) {
    process.stdout.write(`${JSON.stringify(jsonRpcError(undefined, -32700, "Parse error", errorToData(error)))}\n`);
  }
}

function toMcpTool(tool: McpToolDefinition): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: {
      readOnlyHint: !tool.mutates,
      destructiveHint: tool.name === "memory_forget"
    }
  };
}

async function callTool(params: unknown, options: LoreMcpRuntimeOptions): Promise<Record<string, unknown>> {
  if (!isObject(params)) {
    throw new ProtocolError(-32602, "tools/call params must be an object");
  }

  const name = params.name;
  if (!isLoreToolName(name)) {
    throw new ProtocolError(-32602, "Unknown Lore MCP tool");
  }

  const args = isObject(params.arguments) ? params.arguments : {};

  try {
    const payload = await callLoreApi(name, args, options);
    return {
      content: [{ type: "text", text: renderToolText(name, payload) }],
      structuredContent: payload
    };
  } catch (error) {
    if (error instanceof ProtocolError) {
      throw error;
    }
    return {
      content: [{ type: "text", text: error instanceof Error ? error.message : "Tool call failed" }],
      structuredContent: { error: errorToData(error) },
      isError: true
    };
  }
}

async function callLoreApi(name: LoreMcpToolName, args: Record<string, unknown>, options: LoreMcpRuntimeOptions): Promise<unknown> {
  const baseUrl = normalizeBaseUrl(options.apiBaseUrl ?? process.env.LORE_API_URL ?? "http://127.0.0.1:3000");
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = options.apiKey ?? process.env.LORE_API_KEY;

  switch (name) {
    case "context_query":
      return fetchJson(fetchImpl, `${baseUrl}/v1/context/query`, "POST", args, apiKey);
    case "memory_write":
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/write`, "POST", args, apiKey);
    case "memory_search":
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/search`, "POST", args, apiKey);
    case "memory_forget":
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/forget`, "POST", args, apiKey);
    case "memory_list":
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/list${toQueryString(args)}`, "GET", undefined, apiKey);
    case "memory_get": {
      const memoryId = readRequiredStringArg(args, "memory_id");
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/${encodeURIComponent(memoryId)}`, "GET", undefined, apiKey);
    }
    case "memory_update": {
      const memoryId = readRequiredStringArg(args, "memory_id");
      const body = { ...args };
      delete body.memory_id;
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/${encodeURIComponent(memoryId)}`, "PATCH", body, apiKey);
    }
    case "memory_supersede": {
      const memoryId = readRequiredStringArg(args, "memory_id");
      const body = { ...args };
      delete body.memory_id;
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/${encodeURIComponent(memoryId)}/supersede`, "POST", body, apiKey);
    }
    case "memory_export": {
      const format = typeof args.format === "string" ? args.format : "json";
      const projectId = typeof args.project_id === "string" && args.project_id.trim().length > 0
        ? `&project_id=${encodeURIComponent(args.project_id.trim())}`
        : "";
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/export?format=${encodeURIComponent(format)}${projectId}`, "GET", undefined, apiKey);
    }
    case "eval_run":
      return fetchJson(fetchImpl, `${baseUrl}/v1/eval/run`, "POST", args, apiKey);
    case "trace_get": {
      const traceId = typeof args.trace_id === "string" ? args.trace_id : "";
      if (!traceId) {
        throw new Error("trace_id is required");
      }
      return fetchJson(fetchImpl, `${baseUrl}/v1/traces/${encodeURIComponent(traceId)}`, "GET", undefined, apiKey);
    }
  }
}

async function fetchJson(fetchImpl: typeof fetch, url: string, method: "GET" | "POST" | "PATCH", body?: unknown, apiKey?: string): Promise<unknown> {
  const headers = new Headers();
  if (method !== "GET") {
    headers.set("content-type", "application/json");
  }
  if (apiKey) {
    headers.set("authorization", `Bearer ${apiKey}`);
  }

  const response = await fetchImpl(url, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body ?? {})
  });
  const text = await response.text();
  const payload = parseMaybeJson(text);

  if (!response.ok) {
    throw new Error(typeof payload === "object" && payload && "error" in payload ? JSON.stringify(payload.error) : text);
  }

  return payload;
}

function renderToolText(name: LoreMcpToolName, payload: unknown): string {
  if (name === "context_query" && isObject(payload) && typeof payload.contextBlock === "string") {
    return payload.contextBlock;
  }
  return JSON.stringify(payload, null, 2);
}

function readProtocolVersion(params: unknown, options: LoreMcpRuntimeOptions): string {
  if (options.protocolVersion) {
    return options.protocolVersion;
  }
  if (isObject(params) && typeof params.protocolVersion === "string") {
    return params.protocolVersion;
  }
  return "2025-11-25";
}

function normalizeJsonRpcId(id: unknown): JsonRpcId | undefined {
  return typeof id === "string" || typeof id === "number" ? id : undefined;
}

function jsonRpcResult(id: JsonRpcId, result: Record<string, unknown>): JsonRpcSuccessResponse {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: JsonRpcId | undefined, code: number, message: string, data?: unknown): JsonRpcErrorResponse {
  return {
    jsonrpc: "2.0",
    ...(id === undefined ? {} : { id }),
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  };
}

function parseMaybeJson(text: string): unknown {
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function readRequiredStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function toQueryString(args: Record<string, unknown>): string {
  const params = new URLSearchParams();
  ["project_id", "scope", "status", "memory_type", "q", "limit"].forEach((key) => {
    const value = args[key];
    if (typeof value === "string" && value.trim().length > 0) {
      params.set(key, value.trim());
    } else if (typeof value === "number" && Number.isFinite(value)) {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

function isLoreToolName(value: unknown): value is LoreMcpToolName {
  return typeof value === "string" && getMcpToolDefinitions().some((tool) => tool.name === value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorToData(error: unknown): unknown {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return error;
}

class ProtocolError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
    this.name = "ProtocolError";
  }
}

if (process.argv[1]?.endsWith("/dist/index.js")) {
  if (process.env.LORE_MCP_TRANSPORT === "sdk") {
    await runSdkStdioServer();
  } else {
    await runStdioServer();
  }
}
