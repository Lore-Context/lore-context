#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export {
  type McpConnectionState,
  type McpConnectionInputs,
  type McpConnectionStatus,
  describeMcpConnectionStatus,
  summarizeMcpConnections
} from "./connection-status.js";

export type LoreMcpToolName =
  | "context_query"
  | "memory.add_candidate"
  | "memory.recall"
  | "memory.inbox_list"
  | "memory.inbox_approve"
  | "memory.inbox_reject"
  | "memory.delete"
  | "memory_write"
  | "memory_search"
  | "memory_forget"
  | "memory_list"
  | "memory_get"
  | "memory_update"
  | "memory_supersede"
  | "memory_export"
  | "source.pause"
  | "source.resume"
  | "evidence.trace_get"
  | "profile.get"
  | "profile.update_candidate"
  | "eval_run"
  | "trace_get";

export interface McpToolDefinition {
  name: LoreMcpToolName;
  description: string;
  mutates: boolean;
  /**
   * "default" tools are shown to all connected AI apps.
   * "advanced" tools are opt-in: enabled via LORE_MCP_ADVANCED_TOOLS=1 env var or
   * by passing { includeAdvanced: true } to getMcpToolDefinitions().
   * Ordinary users never need to know advanced tools exist.
   */
  tier: "default" | "advanced";
  inputSchema: {
    type: "object";
    required?: string[];
    properties: Record<string, unknown>;
  };
}

export interface McpToolOptions {
  /** Include advanced support/technical tools. Defaults to LORE_MCP_ADVANCED_TOOLS env var. */
  includeAdvanced?: boolean;
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
  /**
   * Opt-in to advanced support tools (e.g. evidence.trace_get, memory_supersede).
   * When undefined the runtime falls back to the LORE_MCP_ADVANCED_TOOLS env var
   * inside getMcpToolDefinitions(), which keeps stdio behavior unchanged while
   * letting hosted callers enable advanced mode per-request via header.
   */
  includeAdvanced?: boolean;
}

export interface HostedMcpHttpOptions extends LoreMcpRuntimeOptions {
  resourceUrl?: string;
  authorizationServerUrl?: string;
}

export const HOSTED_MCP_ENDPOINT_PATH = "/mcp";
export const HOSTED_MCP_PROTECTED_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";
export const HOSTED_MCP_AUTHORIZATION_SERVER_METADATA_PATH = "/.well-known/oauth-authorization-server";

export function getHostedMcpProtectedResourceMetadata(baseUrl: string | URL): Record<string, unknown> {
  const origin = normalizeOrigin(baseUrl);
  return {
    resource: `${origin}${HOSTED_MCP_ENDPOINT_PATH}`,
    resource_name: "Lore Hosted MCP",
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp.read", "mcp.write"],
    mcp_endpoint: `${origin}${HOSTED_MCP_ENDPOINT_PATH}`,
    documentation: "https://lorecontext.com/docs/hosted-mcp"
  };
}

export function getHostedMcpAuthorizationServerMetadata(baseUrl: string | URL): Record<string, unknown> {
  const origin = normalizeOrigin(baseUrl);
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/v1/cloud/devices/pair`,
    device_authorization_endpoint: `${origin}/v1/cloud/install-token`,
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "urn:ietf:params:oauth:grant-type:device_code",
      "lore:install_token"
    ],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp.read", "mcp.write"],
    lore_beta: {
      install_token_endpoint: `${origin}/v1/cloud/install-token`,
      pairing_endpoint: `${origin}/v1/cloud/devices/pair`,
      dynamic_client_registration: false
    }
  };
}

export function getHostedMcpWwwAuthenticateHeader(baseUrl: string | URL): string {
  const origin = normalizeOrigin(baseUrl);
  const metadataUrl = `${origin}${HOSTED_MCP_PROTECTED_RESOURCE_METADATA_PATH}`;
  return `Bearer realm="Lore Hosted MCP", resource_metadata="${metadataUrl}", scope="mcp.read mcp.write"`;
}

interface JsonRpcRequestLike {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

const REASON_FIELD = z.string().min(8, "reason must be at least 8 characters");
const MCP_SERVER_INSTRUCTIONS =
  "Use context_query for read-first context assembly. Start with a narrow token_budget and include_sources when source attribution matters. Use trace_get for provenance, stale hits, or conflicts. Use mutating memory tools only for explicit durable facts with a clear reason.";

export const toolSchemas = {
  context_query: z.object({
    query: z.string(),
    project_id: z.string().optional(),
    mode: z.enum(["auto", "memory", "web", "repo", "tool_traces"]).optional(),
    sources: z.object({
      memory: z.boolean().optional(),
      web: z.boolean().optional(),
      repo: z.boolean().optional(),
      tool_traces: z.boolean().optional()
    }).optional(),
    token_budget: z.number().optional(),
    freshness: z.enum(["none", "recent", "latest"]).optional(),
    writeback_policy: z.enum(["explicit", "review_required", "safe_auto"]).optional(),
    include_sources: z.boolean().optional()
  }),

  "memory.add_candidate": z.object({
    content: z.string(),
    scope: z.enum(["user", "project", "repo", "team", "org"]).default("project"),
    memory_type: z.string().optional(),
    project_id: z.string().optional(),
    confidence: z.number().optional()
  }),

  "memory.recall": z.object({
    query: z.string(),
    project_id: z.string().optional(),
    mode: z.enum(["auto", "memory", "web", "repo", "tool_traces"]).optional(),
    sources: z.object({
      memory: z.boolean().optional(),
      web: z.boolean().optional(),
      repo: z.boolean().optional(),
      tool_traces: z.boolean().optional()
    }).optional(),
    token_budget: z.number().optional(),
    freshness: z.enum(["none", "recent", "latest"]).optional(),
    writeback_policy: z.enum(["explicit", "review_required", "safe_auto"]).optional(),
    include_sources: z.boolean().optional()
  }),

  "memory.inbox_list": z.object({
    project_id: z.string().optional()
  }),

  "memory.inbox_approve": z.object({
    memory_id: z.string(),
    reason: z.string().optional(),
    reviewer: z.string().optional()
  }),

  "memory.inbox_reject": z.object({
    memory_id: z.string(),
    reason: REASON_FIELD,
    reviewer: z.string().optional()
  }),

  "memory.delete": z.object({
    reason: REASON_FIELD,
    memory_ids: z.array(z.string()).optional(),
    query: z.string().optional(),
    hard_delete: z.boolean().optional()
  }),

  memory_write: z.object({
    content: z.string(),
    scope: z.enum(["user", "project", "repo", "team", "org"]),
    memory_type: z.string().optional(),
    project_id: z.string().optional()
  }),

  memory_search: z.object({
    query: z.string(),
    project_id: z.string().optional(),
    top_k: z.number().optional()
  }),

  memory_forget: z.object({
    reason: REASON_FIELD,
    memory_ids: z.array(z.string()).optional(),
    query: z.string().optional(),
    hard_delete: z.boolean().optional()
  }),

  memory_list: z.object({
    project_id: z.string().optional(),
    scope: z.enum(["user", "project", "repo", "team", "org"]).optional(),
    status: z.string().optional(),
    memory_type: z.string().optional(),
    q: z.string().optional(),
    limit: z.number().optional()
  }),

  memory_get: z.object({
    memory_id: z.string()
  }),

  memory_update: z.object({
    memory_id: z.string(),
    reason: REASON_FIELD,
    content: z.string().optional(),
    memory_type: z.string().optional(),
    scope: z.enum(["user", "project", "repo", "team", "org"]).optional(),
    project_id: z.string().optional(),
    confidence: z.number().optional()
  }),

  memory_supersede: z.object({
    memory_id: z.string(),
    content: z.string(),
    reason: REASON_FIELD,
    memory_type: z.string().optional(),
    scope: z.enum(["user", "project", "repo", "team", "org"]).optional(),
    project_id: z.string().optional(),
    confidence: z.number().optional()
  }),

  memory_export: z.object({
    format: z.enum(["json", "markdown"]).optional(),
    project_id: z.string().optional()
  }),

  "source.pause": z.object({
    source_id: z.string(),
    reason: z.string().optional()
  }),

  "source.resume": z.object({
    source_id: z.string(),
    reason: z.string().optional()
  }),

  "evidence.trace_get": z.object({
    trace_id: z.string()
  }),

  "profile.get": z.object({
    project_id: z.string().optional()
  }),

  "profile.update_candidate": z.object({
    candidate_id: z.string().optional(),
    project_id: z.string().optional(),
    value: z.string(),
    reason: REASON_FIELD,
    profile_type: z.string().optional()
  }),

  eval_run: z.object({
    dataset: z.record(z.string(), z.unknown()),
    provider: z.string().optional()
  }),

  trace_get: z.object({
    trace_id: z.string()
  })
} satisfies Record<LoreMcpToolName, z.ZodTypeAny>;

export function getMcpToolDefinitions(options: McpToolOptions = {}): McpToolDefinition[] {
  const advancedEnabled = options.includeAdvanced ?? process.env.LORE_MCP_ADVANCED_TOOLS === "1";
  const all = getAllMcpToolDefinitions();
  return advancedEnabled ? all : all.filter((tool) => tool.tier === "default");
}

export function getDefaultMcpToolNames(): LoreMcpToolName[] {
  return getAllMcpToolDefinitions().filter((t) => t.tier === "default").map((t) => t.name);
}

export function getAdvancedMcpToolNames(): LoreMcpToolName[] {
  return getAllMcpToolDefinitions().filter((t) => t.tier === "advanced").map((t) => t.name);
}

function getAllMcpToolDefinitions(): McpToolDefinition[] {
  return [
    {
      name: "context_query",
      description: "Compose governed, agent-ready context for a user query from memory, web, repo evidence, and tool traces. Use this as the default read path before answering from Lore memory.",
      mutates: false,
      tier: "default",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "The task, question, or claim that needs governed context." },
          project_id: { type: "string", description: "Project namespace. Required when using project-scoped keys." },
          mode: { type: "string", enum: ["auto", "memory", "web", "repo", "tool_traces"], description: "Route selection. Use auto by default; force a mode only when the caller knows the needed source." },
          sources: {
            type: "object",
            description: "Optional source switches. Disable a source only when it would add noise or is unavailable.",
            properties: {
              memory: { type: "boolean" },
              web: { type: "boolean" },
              repo: { type: "boolean" },
              tool_traces: { type: "boolean" }
            }
          },
          token_budget: { type: "number", description: "Approximate output context budget. Start small and increase only when required evidence is missing." },
          freshness: { type: "string", enum: ["none", "recent", "latest"], description: "Use latest only when current-state or time-sensitive evidence is required." },
          writeback_policy: { type: "string", enum: ["explicit", "review_required", "safe_auto"], description: "Controls whether candidate writeback is allowed. Prefer explicit unless the user asked for durable capture." },
          include_sources: { type: "boolean", description: "Return source references for citation, audit, or debugging." }
        }
      }
    },
    {
      name: "memory.recall",
      description: "Hosted MCP recall entrypoint. Composes governed, agent-ready context and returns its trace id for audit.",
      mutates: false,
      tier: "default",
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
      name: "memory.add_candidate",
      description: "Add a beta memory candidate through governed memory writeback.",
      mutates: true,
      tier: "default",
      inputSchema: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string" },
          memory_type: { type: "string" },
          scope: { type: "string", enum: ["user", "project", "repo", "team", "org"], default: "project" },
          project_id: { type: "string" },
          confidence: { type: "number" }
        }
      }
    },
    {
      name: "memory.inbox_list",
      description: "List memory candidates currently waiting for governance review.",
      mutates: false,
      tier: "default",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string" }
        }
      }
    },
    {
      name: "memory.inbox_approve",
      description: "Approve a memory candidate from the governance review queue.",
      mutates: true,
      tier: "default",
      inputSchema: {
        type: "object",
        required: ["memory_id"],
        properties: {
          memory_id: { type: "string" },
          reason: { type: "string" },
          reviewer: { type: "string" }
        }
      }
    },
    {
      name: "memory.inbox_reject",
      description: "Reject a memory candidate from the governance review queue. Requires a reason.",
      mutates: true,
      tier: "default",
      inputSchema: {
        type: "object",
        required: ["memory_id", "reason"],
        properties: {
          memory_id: { type: "string" },
          reason: { type: "string", minLength: 8 },
          reviewer: { type: "string" }
        }
      }
    },
    {
      name: "memory.delete",
      description: "Delete memories by explicit selector. Requires a reason and defaults to soft delete.",
      mutates: true,
      tier: "default",
      inputSchema: {
        type: "object",
        required: ["reason"],
        properties: {
          memory_ids: { type: "array", items: { type: "string" } },
          query: { type: "string" },
          reason: { type: "string", minLength: 8 },
          hard_delete: { type: "boolean" }
        }
      }
    },
    {
      name: "memory_write",
      description: "Save a user-approved or project-relevant memory with audit logging.",
      mutates: true,
      tier: "default",
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
      tier: "default",
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
      tier: "advanced",
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
      tier: "advanced",
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
      tier: "advanced",
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
      tier: "advanced",
      inputSchema: {
        type: "object",
        required: ["memory_id", "reason"],
        properties: {
          memory_id: { type: "string" },
          reason: { type: "string", minLength: 8 },
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
      tier: "advanced",
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
      tier: "advanced",
      inputSchema: {
        type: "object",
        properties: {
          format: { type: "string", enum: ["json", "markdown"] },
          project_id: { type: "string" }
        }
      }
    },
    {
      name: "source.pause",
      description: "Pause a hosted capture source by writing a paused heartbeat.",
      mutates: true,
      tier: "default",
      inputSchema: {
        type: "object",
        required: ["source_id"],
        properties: {
          source_id: { type: "string" },
          reason: { type: "string" }
        }
      }
    },
    {
      name: "source.resume",
      description: "Resume a hosted capture source by writing an active heartbeat.",
      mutates: true,
      tier: "default",
      inputSchema: {
        type: "object",
        required: ["source_id"],
        properties: {
          source_id: { type: "string" },
          reason: { type: "string" }
        }
      }
    },
    {
      name: "evidence.trace_get",
      description: "Read an Evidence Ledger for a context trace id.",
      mutates: false,
      tier: "advanced",
      inputSchema: {
        type: "object",
        required: ["trace_id"],
        properties: {
          trace_id: { type: "string" }
        }
      }
    },
    {
      name: "profile.get",
      description: "Read the beta profile contract when the profile API is available.",
      mutates: false,
      tier: "advanced",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string" }
        }
      }
    },
    {
      name: "profile.update_candidate",
      description: "Submit a beta profile update candidate when the profile API is available.",
      mutates: true,
      tier: "advanced",
      inputSchema: {
        type: "object",
        required: ["value", "reason"],
        properties: {
          candidate_id: { type: "string" },
          project_id: { type: "string" },
          profile_type: { type: "string" },
          value: { type: "string" },
          reason: { type: "string", minLength: 8 }
        }
      }
    },
    {
      name: "eval_run",
      description: "Run retrieval evaluation over uploaded sessions and questions.",
      mutates: true,
      tier: "advanced",
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
      tier: "advanced",
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

export function getMcpServerInfo(options: McpToolOptions = {}): McpServerInfo {
  return {
    name: "lore-context-mcp-server",
    protocol: "mcp",
    tools: getMcpToolDefinitions(options).map((tool) => tool.name)
  };
}

export function getMutatingToolNames(options: McpToolOptions = {}): LoreMcpToolName[] {
  return getMcpToolDefinitions(options)
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
        instructions: MCP_SERVER_INSTRUCTIONS
      });

    case "ping":
      return jsonRpcResult(id, {});

    case "tools/list":
      return jsonRpcResult(id, {
        tools: getMcpToolDefinitions({ includeAdvanced: options.includeAdvanced }).map(toMcpTool)
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

export async function handleHostedMcpHttpRequest(request: Request, options: HostedMcpHttpOptions = {}): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === HOSTED_MCP_PROTECTED_RESOURCE_METADATA_PATH) {
    return hostedJson(getHostedMcpProtectedResourceMetadata(options.resourceUrl ?? url));
  }

  if (request.method === "GET" && url.pathname === HOSTED_MCP_AUTHORIZATION_SERVER_METADATA_PATH) {
    return hostedJson(getHostedMcpAuthorizationServerMetadata(options.authorizationServerUrl ?? url));
  }

  if (url.pathname !== HOSTED_MCP_ENDPOINT_PATH) {
    return hostedJson({ error: { code: "mcp.route_not_found", message: "hosted MCP route not found" } }, 404);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        allow: "POST, OPTIONS",
        "access-control-allow-headers": "authorization, content-type, mcp-protocol-version",
        "access-control-allow-methods": "POST, OPTIONS"
      }
    });
  }

  if (request.method !== "POST") {
    return hostedJson({ error: { code: "mcp.method_not_allowed", message: "hosted MCP requires POST" } }, 405, {
      allow: "POST, OPTIONS"
    });
  }

  let message: unknown;
  try {
    const text = await request.text();
    message = text.trim().length > 0 ? JSON.parse(text) : undefined;
  } catch (error) {
    return hostedJson(jsonRpcError(undefined, -32700, "Parse error", errorToData(error)), 400);
  }

  const advancedHeader = request.headers.get("x-lore-mcp-advanced");
  const includeAdvanced = options.includeAdvanced
    ?? (advancedHeader === "1" || advancedHeader?.toLowerCase() === "true" ? true : undefined);

  const response = await handleJsonRpcMessage(message, {
    apiBaseUrl: options.apiBaseUrl,
    apiKey: options.apiKey,
    protocolVersion: request.headers.get("mcp-protocol-version") ?? options.protocolVersion,
    fetchImpl: options.fetchImpl,
    includeAdvanced
  });

  if (!response) {
    return new Response(null, { status: 202 });
  }
  return hostedJson(response);
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
      instructions: MCP_SERVER_INSTRUCTIONS
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getMcpToolDefinitions({ includeAdvanced: options.includeAdvanced }).map(toMcpTool)
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
      destructiveHint: tool.mutates
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

  const rawArgs = isObject(params.arguments) ? params.arguments : {};
  const schema = toolSchemas[name];
  const parsed = schema.safeParse(rawArgs);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path, message: i.message }));
    throw new ProtocolError(-32602, JSON.stringify({ invalid_params: issues }));
  }
  const args = parsed.data as Record<string, unknown>;

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
    case "memory.recall":
      return fetchJson(fetchImpl, `${baseUrl}/v1/context/query`, "POST", args, apiKey);
    case "memory.add_candidate": {
      const body = { scope: "project", ...args };
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/write`, "POST", body, apiKey);
    }
    case "memory.inbox_list":
      return fetchJson(fetchImpl, `${baseUrl}/v1/governance/review-queue${toQueryStringForKeys(args, ["project_id"])}`, "GET", undefined, apiKey);
    case "memory.inbox_approve": {
      const memoryId = readRequiredStringArg(args, "memory_id");
      const body = { ...args };
      delete body.memory_id;
      return fetchJson(fetchImpl, `${baseUrl}/v1/governance/memory/${encodeURIComponent(memoryId)}/approve`, "POST", body, apiKey);
    }
    case "memory.inbox_reject": {
      const memoryId = readRequiredStringArg(args, "memory_id");
      const body = { ...args };
      delete body.memory_id;
      return fetchJson(fetchImpl, `${baseUrl}/v1/governance/memory/${encodeURIComponent(memoryId)}/reject`, "POST", body, apiKey);
    }
    case "memory.delete":
      return fetchJson(fetchImpl, `${baseUrl}/v1/memory/forget`, "POST", args, apiKey);
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
    case "source.pause":
    case "source.resume": {
      const sourceId = readRequiredStringArg(args, "source_id");
      const status = name === "source.pause" ? "paused" : "active";
      const body = {
        status,
        source_type: "hosted_mcp",
        source_provider: "hosted_mcp",
        metadata: {
          action: name,
          ...(typeof args.reason === "string" && args.reason.trim().length > 0 ? { reason: args.reason.trim() } : {})
        }
      };
      return fetchJson(fetchImpl, `${baseUrl}/v1/capture/sources/${encodeURIComponent(sourceId)}/heartbeat`, "POST", body, apiKey);
    }
    case "evidence.trace_get": {
      const traceId = readRequiredStringArg(args, "trace_id");
      return fetchJson(fetchImpl, `${baseUrl}/v1/evidence/ledger/${encodeURIComponent(traceId)}`, "GET", undefined, apiKey);
    }
    case "profile.get":
      return fetchJson(fetchImpl, `${baseUrl}/v1/profile${toQueryStringForKeys(args, ["project_id"])}`, "GET", undefined, apiKey);
    case "profile.update_candidate":
      return fetchJson(fetchImpl, `${baseUrl}/v1/profile/candidates`, "POST", args, apiKey);
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
    const rawError = typeof payload === "object" && payload && "error" in payload
      ? payload.error
      : text;
    console.error("[lore-mcp] upstream error", { status: response.status, url, error: rawError });
    const sanitizedMessage = sanitizeUpstreamError(response.status);
    const upstreamCode = typeof payload === "object" && payload && "error" in payload &&
      isObject(payload.error) && typeof payload.error.code === "string"
      ? payload.error.code
      : "internal_error";
    throw new UpstreamApiError(upstreamCode, sanitizedMessage, response.status);
  }

  return payload;
}

function sanitizeUpstreamError(status: number): string {
  if (status === 404) return "not found";
  if (status === 403) return "permission denied";
  if (status === 401) return "permission denied";
  if (status === 400) return "bad request";
  if (status === 409) return "conflict";
  if (status === 422) return "unprocessable request";
  return "operation failed";
}

class UpstreamApiError extends Error {
  constructor(readonly upstreamCode: string, message: string, readonly status: number) {
    super(message);
    this.name = "UpstreamApiError";
  }
}

function renderToolText(name: LoreMcpToolName, payload: unknown): string {
  if ((name === "context_query" || name === "memory.recall") && isObject(payload) && typeof payload.contextBlock === "string") {
    const traceId = typeof payload.traceId === "string" ? payload.traceId : "";
    return traceId ? `Trace ID: ${traceId}\n\n${payload.contextBlock}` : payload.contextBlock;
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

function hostedJson(payload: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeOrigin(value: string | URL): string {
  const url = value instanceof URL ? value : new URL(value);
  return url.origin.replace(/\/+$/, "");
}

function readRequiredStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function toQueryString(args: Record<string, unknown>): string {
  return toQueryStringForKeys(args, ["project_id", "scope", "status", "memory_type", "q", "limit"]);
}

function toQueryStringForKeys(args: Record<string, unknown>, keys: string[]): string {
  const params = new URLSearchParams();
  keys.forEach((key) => {
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
  return typeof value === "string" && getAllMcpToolDefinitions().some((tool) => tool.name === value);
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

function isCliEntrypoint(): boolean {
  const invokedPath = process.argv[1];
  if (!invokedPath) return false;
  const modulePath = fileURLToPath(import.meta.url);
  try {
    return realpathSync(invokedPath) === realpathSync(modulePath);
  } catch {
    return invokedPath === modulePath || invokedPath.endsWith("/dist/index.js");
  }
}

if (isCliEntrypoint()) {
  if (process.env.LORE_MCP_TRANSPORT === "sdk") {
    await runSdkStdioServer();
  } else {
    await runStdioServer();
  }
}
