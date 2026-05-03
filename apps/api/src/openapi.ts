export const requiredOpenApiPaths = [
  "/health",
  "/openapi.json",
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-authorization-server",
  "/mcp",
  "/v1/context/query",
  "/v1/memory/write",
  "/v1/memory/{id}",
  "/v1/memory/{id}/supersede",
  "/v1/memory/search",
  "/v1/memory/list",
  "/v1/memory/forget",
  "/v1/memory/export",
  "/v1/memory/import",
  "/v1/governance/review-queue",
  "/v1/governance/memory/{id}/approve",
  "/v1/governance/memory/{id}/reject",
  "/v1/audit-logs",
  "/v1/events/ingest",
  "/v1/integrations/agentmemory/health",
  "/v1/integrations/agentmemory/sync",
  "/v1/traces",
  "/v1/traces/{trace_id}",
  "/v1/traces/{trace_id}/feedback",
  "/v1/evidence/ledger/{trace_id}",
  "/v1/evidence/ledgers",
  "/v1/eval/providers",
  "/v1/eval/run",
  "/v1/eval/runs",
  "/v1/eval/runs/{run_id}",
  "/v1/eval/report",
  "/v1/cloud/whoami",
  "/v1/cloud/install-token",
  "/v1/cloud/devices/pair",
  "/v1/cloud/tokens/revoke",
  "/v1/cloud/tokens/rotate",
  "/v1/cloud/vaults",
  "/v1/connectors",
  "/v1/connectors/{provider}/authorize",
  "/v1/connectors/{provider}/callback",
  "/v1/connectors/{provider}/webhook",
  "/v1/connectors/{connection_id}",
  "/v1/connectors/{connection_id}/sync",
  "/v1/connectors/{connection_id}/resync",
  "/v1/connectors/{connection_id}/pause",
  "/v1/connectors/{connection_id}/resume",
  "/v1/connectors/{connection_id}/disconnect",
  "/v1/connectors/{connection_id}/channels/renew",
  "/v1/capture/sources/{source_id}/heartbeat",
  "/v1/capture/jobs/{job_id}",
  "/v1/capture/sessions",
  "/v1/capture/sessions/{session_id}",
  "/v1/sources",
  "/v1/sources/{source_id}",
  "/v1/sources/{source_id}/pause",
  "/v1/sources/{source_id}/resume",
  "/v1/sources/{source_id}/checkpoints",
  "/v1/capture/events",
  "/v1/capture/session-deltas",
  "/v1/usage",
  "/v1/operator/usage",
  "/v1/memory-inbox",
  "/v1/memory-inbox/{candidate_id}/approve",
  "/v1/memory-inbox/{candidate_id}/reject",
  "/v1/recall/traces",
  "/v1/recall/traces/{trace_id}",
  "/v1/recall/traces/{trace_id}/feedback",
  "/auth/google/start",
  "/auth/google/callback",
  "/auth/logout",
  "/v1/me",
  "/v1/vault"
] as const;

export const requiredOpenApiOperations = [
  ["get", "/health"],
  ["get", "/openapi.json"],
  ["get", "/.well-known/oauth-protected-resource"],
  ["get", "/.well-known/oauth-authorization-server"],
  ["post", "/mcp"],
  ["post", "/v1/context/query"],
  ["post", "/v1/memory/write"],
  ["get", "/v1/memory/{id}"],
  ["patch", "/v1/memory/{id}"],
  ["post", "/v1/memory/{id}/supersede"],
  ["post", "/v1/memory/search"],
  ["get", "/v1/memory/list"],
  ["post", "/v1/memory/forget"],
  ["get", "/v1/memory/export"],
  ["post", "/v1/memory/import"],
  ["get", "/v1/governance/review-queue"],
  ["post", "/v1/governance/memory/{id}/approve"],
  ["post", "/v1/governance/memory/{id}/reject"],
  ["get", "/v1/audit-logs"],
  ["post", "/v1/events/ingest"],
  ["get", "/v1/integrations/agentmemory/health"],
  ["post", "/v1/integrations/agentmemory/sync"],
  ["get", "/v1/traces"],
  ["get", "/v1/traces/{trace_id}"],
  ["post", "/v1/traces/{trace_id}/feedback"],
  ["get", "/v1/evidence/ledger/{trace_id}"],
  ["get", "/v1/evidence/ledgers"],
  ["get", "/v1/eval/providers"],
  ["post", "/v1/eval/run"],
  ["get", "/v1/eval/runs"],
  ["get", "/v1/eval/runs/{run_id}"],
  ["get", "/v1/eval/report"],
  ["get", "/v1/cloud/whoami"],
  ["post", "/v1/cloud/install-token"],
  ["post", "/v1/cloud/devices/pair"],
  ["post", "/v1/cloud/tokens/revoke"],
  ["post", "/v1/cloud/tokens/rotate"],
  ["get", "/v1/cloud/vaults"],
  ["get", "/v1/connectors"],
  ["post", "/v1/connectors/{provider}/authorize"],
  ["post", "/v1/connectors/{provider}/callback"],
  ["post", "/v1/connectors/{provider}/webhook"],
  ["get", "/v1/connectors/{connection_id}"],
  ["patch", "/v1/connectors/{connection_id}"],
  ["delete", "/v1/connectors/{connection_id}"],
  ["post", "/v1/connectors/{connection_id}/sync"],
  ["post", "/v1/connectors/{connection_id}/resync"],
  ["post", "/v1/connectors/{connection_id}/pause"],
  ["post", "/v1/connectors/{connection_id}/resume"],
  ["post", "/v1/connectors/{connection_id}/disconnect"],
  ["post", "/v1/connectors/{connection_id}/channels/renew"],
  ["post", "/v1/capture/sources/{source_id}/heartbeat"],
  ["get", "/v1/capture/jobs/{job_id}"],
  ["post", "/v1/capture/sessions"],
  ["get", "/v1/capture/sessions/{session_id}"],
  ["get", "/v1/sources"],
  ["post", "/v1/sources"],
  ["get", "/v1/sources/{source_id}"],
  ["patch", "/v1/sources/{source_id}"],
  ["post", "/v1/sources/{source_id}/pause"],
  ["post", "/v1/sources/{source_id}/resume"],
  ["post", "/v1/sources/{source_id}/checkpoints"],
  ["get", "/v1/sources/{source_id}/checkpoints"],
  ["post", "/v1/capture/events"],
  ["post", "/v1/capture/session-deltas"],
  ["get", "/v1/usage"],
  ["get", "/v1/operator/usage"],
  ["get", "/v1/memory-inbox"],
  ["post", "/v1/memory-inbox/{candidate_id}/approve"],
  ["post", "/v1/memory-inbox/{candidate_id}/reject"],
  ["get", "/v1/recall/traces"],
  ["get", "/v1/recall/traces/{trace_id}"],
  ["post", "/v1/recall/traces/{trace_id}/feedback"],
  ["get", "/auth/google/start"],
  ["get", "/auth/google/callback"],
  ["post", "/auth/google/callback"],
  ["post", "/auth/logout"],
  ["get", "/v1/me"],
  ["get", "/v1/vault"]
] as const;

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Lore Context API",
    version: "1.0.0-rc.2",
    description: "Local-first AI agent context control plane for memory, traces, eval, governance, and Evidence Ledger inspection."
  },
  servers: [
    {
      url: "http://127.0.0.1:3000",
      description: "Local development API"
    }
  ],
  security: [{ bearerAuth: [] }, { loreApiKey: [] }],
  paths: {
    "/health": {
      get: {
        operationId: "getHealth",
        summary: "Read service health",
        security: [],
        responses: {
          "200": jsonResponse("API health", { $ref: "#/components/schemas/HealthResponse" })
        }
      }
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenApiDocument",
        summary: "Read the machine-readable OpenAPI contract",
        security: [],
        responses: {
          "200": jsonResponse("OpenAPI document", { type: "object", additionalProperties: true })
        }
      }
    },
    "/.well-known/oauth-protected-resource": {
      get: {
        operationId: "getHostedMcpProtectedResourceMetadata",
        summary: "Read hosted MCP OAuth protected-resource metadata",
        security: [],
        responses: {
          "200": jsonResponse("Hosted MCP protected-resource metadata", { type: "object", additionalProperties: true })
        }
      }
    },
    "/.well-known/oauth-authorization-server": {
      get: {
        operationId: "getHostedMcpAuthorizationServerMetadata",
        summary: "Read hosted MCP authorization-server metadata",
        security: [],
        responses: {
          "200": jsonResponse("Hosted MCP authorization-server metadata", { type: "object", additionalProperties: true })
        }
      }
    },
    "/mcp": {
      post: {
        operationId: "hostedMcpJsonRpc",
        summary: "Run hosted MCP JSON-RPC over HTTP",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest({ type: "object", additionalProperties: true }),
        responses: {
          "200": jsonResponse("MCP JSON-RPC response", { type: "object", additionalProperties: true }),
          "401": {
            description: "Missing or invalid hosted MCP bearer token; WWW-Authenticate points to OAuth metadata",
            headers: {
              "WWW-Authenticate": {
                schema: { type: "string" }
              }
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/v1/context/query": {
      post: {
        operationId: "contextQuery",
        summary: "Compose agent context and write a trace",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        requestBody: jsonRequest({ $ref: "#/components/schemas/ContextQueryRequest" }),
        responses: {
          "200": jsonResponse("Composed context", { $ref: "#/components/schemas/ContextQueryResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/memory/write": {
      post: {
        operationId: "memoryWrite",
        summary: "Write governed memory",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        requestBody: jsonRequest({ $ref: "#/components/schemas/MemoryWriteRequest" }),
        responses: {
          "200": jsonResponse("Written memory", { $ref: "#/components/schemas/MemoryWriteResponse" })
        }
      }
    },
    "/v1/memory/{id}": {
      get: {
        operationId: "memoryGet",
        summary: "Read memory by id",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [pathParam("id", "Memory id")],
        responses: {
          "200": jsonResponse("Memory detail", objectSchema({ memory: { $ref: "#/components/schemas/MemoryRecord" } })),
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      patch: {
        operationId: "memoryUpdate",
        summary: "Patch a memory in place",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [pathParam("id", "Memory id")],
        requestBody: jsonRequest({ $ref: "#/components/schemas/MemoryUpdateRequest" }),
        responses: {
          "200": jsonResponse("Updated memory", { $ref: "#/components/schemas/MemoryWriteResponse" })
        }
      }
    },
    "/v1/memory/{id}/supersede": {
      post: {
        operationId: "memorySupersede",
        summary: "Create a successor memory and archive the old one",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [pathParam("id", "Memory id")],
        requestBody: jsonRequest({
          type: "object",
          required: ["content", "reason"],
          properties: {
            content: { type: "string" },
            reason: { type: "string" },
            project_id: { type: "string" }
          }
        }),
        responses: {
          "200": jsonResponse("Supersede result", objectSchema({
            previous: { $ref: "#/components/schemas/MemoryRecord" },
            memory: { $ref: "#/components/schemas/MemoryRecord" },
            reviewRequired: { type: "boolean" }
          }))
        }
      }
    },
    "/v1/memory/search": {
      post: {
        operationId: "memorySearch",
        summary: "Search memory without composing context",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        requestBody: jsonRequest({
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string" },
            project_id: { type: "string" },
            top_k: { type: "integer", minimum: 1, maximum: 100 }
          }
        }),
        responses: {
          "200": jsonResponse("Memory hits", objectSchema({ hits: arrayOf({ $ref: "#/components/schemas/MemoryHit" }) }))
        }
      }
    },
    "/v1/memory/list": {
      get: {
        operationId: "memoryList",
        summary: "List memories visible to the caller",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [
          queryParam("project_id", "Filter by project id"),
          queryParam("scope", "Filter by memory scope"),
          queryParam("status", "Filter by memory lifecycle status"),
          queryParam("memory_type", "Filter by memory type"),
          queryParam("q", "Filter by memory content substring"),
          queryParam("limit", "Maximum rows", "integer")
        ],
        responses: {
          "200": jsonResponse("Memory list", objectSchema({ memories: arrayOf({ $ref: "#/components/schemas/MemoryRecord" }) }))
        }
      }
    },
    "/v1/memory/export": {
      get: {
        operationId: "memoryExport",
        summary: "Export memory as MIF JSON or Markdown",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [queryParam("project_id", "Project id"), queryParam("format", "json or markdown")],
        responses: {
          "200": {
            description: "MIF export",
            content: {
              "application/json": { schema: { type: "object", additionalProperties: true } },
              "text/markdown": { schema: { type: "string" } }
            }
          }
        }
      }
    },
    "/v1/memory/import": {
      post: {
        operationId: "memoryImport",
        summary: "Import MIF memory",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [queryParam("project_id", "Project id")],
        requestBody: jsonRequest({ type: "object", additionalProperties: true }),
        responses: {
          "200": jsonResponse("Import result", objectSchema({
            imported: { type: "integer" },
            memoryIds: arrayOf({ type: "string" })
          }))
        }
      }
    },
    "/v1/memory/forget": {
      post: {
        operationId: "memoryForget",
        summary: "Soft or hard delete memories",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        requestBody: jsonRequest({
          type: "object",
          required: ["reason"],
          properties: {
            memory_ids: arrayOf({ type: "string" }),
            query: { type: "string" },
            project_id: { type: "string" },
            reason: { type: "string" },
            hard_delete: { type: "boolean", default: false }
          }
        }),
        responses: {
          "200": jsonResponse("Forget result", objectSchema({
            deleted: { type: "integer" },
            memoryIds: arrayOf({ type: "string" }),
            hardDelete: { type: "boolean" }
          }))
        }
      }
    },
    "/v1/governance/review-queue": {
      get: {
        operationId: "governanceReviewQueue",
        summary: "List candidate or flagged memory requiring review",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [queryParam("project_id", "Project id")],
        responses: {
          "200": jsonResponse("Review queue", objectSchema({ memories: arrayOf({ $ref: "#/components/schemas/MemoryRecord" }) }))
        }
      }
    },
    "/v1/governance/memory/{id}/approve": {
      post: {
        operationId: "governanceMemoryApprove",
        summary: "Approve a candidate or flagged memory",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [pathParam("id", "Memory id")],
        requestBody: jsonRequest({ type: "object", properties: { reason: { type: "string" }, reviewer: { type: "string" } } }),
        responses: {
          "200": jsonResponse("Approved memory", objectSchema({ memory: { $ref: "#/components/schemas/MemoryRecord" } }))
        }
      }
    },
    "/v1/governance/memory/{id}/reject": {
      post: {
        operationId: "governanceMemoryReject",
        summary: "Reject a candidate or flagged memory",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [pathParam("id", "Memory id")],
        requestBody: jsonRequest({ type: "object", required: ["reason"], properties: { reason: { type: "string" }, reviewer: { type: "string" } } }),
        responses: {
          "200": jsonResponse("Rejected memory", objectSchema({ memory: { $ref: "#/components/schemas/MemoryRecord" } }))
        }
      }
    },
    "/v1/audit-logs": {
      get: {
        operationId: "auditLogList",
        summary: "List audit log entries",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [queryParam("limit", "Maximum rows", "integer")],
        responses: {
          "200": jsonResponse("Audit logs", objectSchema({ auditLogs: arrayOf({ $ref: "#/components/schemas/AuditLog" }) }))
        }
      }
    },
    "/v1/events/ingest": {
      post: {
        operationId: "eventsIngest",
        summary: "Ingest agent telemetry event",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        requestBody: jsonRequest({
          type: "object",
          required: ["event_type"],
          properties: {
            event_type: { type: "string" },
            project_id: { type: "string" },
            payload: { type: "object", additionalProperties: true }
          }
        }),
        responses: {
          "200": jsonResponse("Event result", objectSchema({ eventId: { type: "string" } }))
        }
      }
    },
    "/v1/integrations/agentmemory/health": {
      get: {
        operationId: "agentmemoryHealth",
        summary: "Read agentmemory adapter health",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        responses: {
          "200": jsonResponse("agentmemory health", { type: "object", additionalProperties: true })
        }
      }
    },
    "/v1/integrations/agentmemory/sync": {
      post: {
        operationId: "agentmemorySync",
        summary: "Sync memory from agentmemory",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        responses: {
          "200": jsonResponse("Sync result", objectSchema({
            status: { type: "string" },
            importedMemories: { type: "integer" },
            warnings: arrayOf({ type: "string" })
          }))
        }
      }
    },
    "/v1/traces": {
      get: {
        operationId: "traceList",
        summary: "List context traces",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [queryParam("project_id", "Filter by project id"), queryParam("limit", "Maximum rows", "integer")],
        responses: {
          "200": jsonResponse("Trace list", objectSchema({ traces: arrayOf({ $ref: "#/components/schemas/ContextTrace" }) }))
        }
      }
    },
    "/v1/traces/{trace_id}/feedback": {
      post: {
        operationId: "traceFeedback",
        summary: "Record feedback on a trace",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [pathParam("trace_id", "Trace id")],
        requestBody: jsonRequest({
          type: "object",
          required: ["feedback"],
          properties: {
            feedback: { enum: ["useful", "wrong", "outdated", "sensitive"] },
            note: { type: "string" }
          }
        }),
        responses: {
          "200": jsonResponse("Updated trace", objectSchema({ trace: { $ref: "#/components/schemas/ContextTrace" } }))
        }
      }
    },
    "/v1/traces/{trace_id}": {
      get: {
        operationId: "traceGet",
        summary: "Read one context trace",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [pathParam("trace_id", "Trace id")],
        responses: {
          "200": jsonResponse("Trace detail", objectSchema({ trace: { $ref: "#/components/schemas/ContextTrace" } })),
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/v1/evidence/ledger/{trace_id}": {
      get: {
        operationId: "evidenceLedgerGet",
        summary: "Read Evidence Ledger for one trace",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [pathParam("trace_id", "Trace id")],
        responses: {
          "200": jsonResponse("Evidence Ledger", objectSchema({ ledger: { $ref: "#/components/schemas/EvidenceLedger" } })),
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/v1/evidence/ledgers": {
      get: {
        operationId: "evidenceLedgerList",
        summary: "List recent Evidence Ledgers",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [queryParam("project_id", "Filter by project id"), queryParam("limit", "Maximum rows", "integer")],
        responses: {
          "200": jsonResponse("Evidence Ledger list", objectSchema({ ledgers: arrayOf({ $ref: "#/components/schemas/EvidenceLedger" }) }))
        }
      }
    },
    "/v1/eval/providers": {
      get: {
        operationId: "evalProviders",
        summary: "List eval providers",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        responses: {
          "200": jsonResponse("Eval providers", objectSchema({ providers: arrayOf({ $ref: "#/components/schemas/EvalProvider" }) }))
        }
      }
    },
    "/v1/eval/run": {
      post: {
        operationId: "evalRun",
        summary: "Run retrieval evaluation",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        requestBody: jsonRequest({
          type: "object",
          required: ["dataset"],
          properties: {
            provider: { type: "string", default: "lore-local" },
            project_id: { type: "string" },
            dataset: { type: "object", additionalProperties: true }
          }
        }),
        responses: {
          "200": jsonResponse("Eval result", objectSchema({
            evalRunId: { type: "string" },
            metrics: { $ref: "#/components/schemas/EvalMetrics" }
          }))
        }
      }
    },
    "/v1/eval/runs": {
      get: {
        operationId: "evalRunList",
        summary: "List eval runs",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [queryParam("project_id", "Project id"), queryParam("limit", "Maximum rows", "integer")],
        responses: {
          "200": jsonResponse("Eval runs", objectSchema({ evalRuns: arrayOf({ $ref: "#/components/schemas/EvalRunRecord" }) }))
        }
      }
    },
    "/v1/eval/runs/{run_id}": {
      get: {
        operationId: "evalRunGet",
        summary: "Read one eval run",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [pathParam("run_id", "Eval run id")],
        responses: {
          "200": jsonResponse("Eval run", objectSchema({ evalRun: { $ref: "#/components/schemas/EvalRunRecord" } }))
        }
      }
    },
    "/v1/eval/report": {
      get: {
        operationId: "evalReport",
        summary: "Render latest eval report",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [queryParam("project_id", "Project id"), queryParam("format", "md or json")],
        responses: {
          "200": {
            description: "Eval report",
            content: {
              "text/markdown": { schema: { type: "string" } },
              "application/json": { schema: objectSchema({ evalRun: { $ref: "#/components/schemas/EvalRunRecord" }, publicSafe: { type: "boolean" } }) }
            }
          }
        }
      }
    },
    "/v1/cloud/install-token": {
      post: {
        operationId: "cloudIssueInstallToken",
        summary: "Issue a single-use install token for local bridge pairing. Admin keys, loopback calls, and signed-in web sessions with CSRF may issue tokens.",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }, { loreSession: [], loreCsrf: [] }],
        requestBody: jsonRequest({
          type: "object",
          properties: {
            vault_id: { type: "string" },
            account_id: { type: "string" }
          }
        }),
        responses: {
          "200": jsonResponse("Install token", { $ref: "#/components/schemas/CloudInstallTokenResponse" }),
          "401": jsonResponse("No valid web session", { $ref: "#/components/schemas/ErrorResponse" }),
          "403": jsonResponse("Admin permission or CSRF required", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/cloud/devices/pair": {
      post: {
        operationId: "cloudPairDevice",
        summary: "Redeem an install token for device and service tokens",
        security: [],
        requestBody: jsonRequest({
          type: "object",
          required: ["install_token"],
          properties: {
            install_token: { type: "string" },
            device_label: { type: "string" },
            platform: { type: "string" }
          }
        }),
        responses: {
          "200": jsonResponse("Device paired", { $ref: "#/components/schemas/CloudPairResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/cloud/tokens/revoke": {
      post: {
        operationId: "cloudRevokeToken",
        summary: "Revoke a cloud token",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        requestBody: jsonRequest({
          type: "object",
          properties: {
            token: { type: "string" }
          }
        }),
        responses: {
          "200": jsonResponse("Revoke result", objectSchema({
            revoked: { type: "boolean" },
            tokenId: { type: "string" },
            kind: { type: "string" }
          }))
        }
      }
    },
    "/v1/cloud/tokens/rotate": {
      post: {
        operationId: "cloudRotateToken",
        summary: "Rotate the presented device or service token",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": jsonResponse("Rotated token", { $ref: "#/components/schemas/CloudRotatedToken" }),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/cloud/whoami": {
      get: {
        operationId: "cloudWhoAmI",
        summary: "Identify the cloud caller",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": jsonResponse("Cloud identity", { $ref: "#/components/schemas/CloudWhoAmIResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/cloud/vaults": {
      get: {
        operationId: "cloudListVaults",
        summary: "List vaults visible to the caller",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": jsonResponse("Vault list", objectSchema({
            vaults: arrayOf({ $ref: "#/components/schemas/CloudVault" })
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors": {
      get: {
        operationId: "connectorList",
        summary: "List connector providers and vault-scoped connections",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": jsonResponse("Connector list", objectSchema({
            providers: arrayOf({ $ref: "#/components/schemas/ConnectorProvider" }),
            connections: arrayOf({ $ref: "#/components/schemas/ConnectorConnection" })
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors/{provider}/authorize": {
      post: {
        operationId: "connectorAuthorize",
        summary: "Create a connector OAuth authorization URL",
        description: "v1.0 Google Drive connector OAuth is separate from Google sign-in. When live credentials are absent the route returns private-beta credential status instead of pretending Drive is live.",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("provider", "Connector provider id")],
        requestBody: jsonRequest({
          type: "object",
          properties: {
            redirect_uri: { type: "string" },
            state: { type: "string" },
            folder_id: { type: "string" },
            scope: { $ref: "#/components/schemas/ConnectorScope" }
          }
        }),
        responses: {
          "200": jsonResponse("Authorization URL", { $ref: "#/components/schemas/ConnectorAuthorizationUrl" }),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors/{provider}/callback": {
      post: {
        operationId: "connectorCallback",
        summary: "Complete a connector OAuth callback",
        description: "Fixture-backed private-beta callback. Non-fixture live callbacks fail closed until Google Drive OAuth credentials and token encryption are configured.",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("provider", "Connector provider id")],
        requestBody: jsonRequest({
          type: "object",
          required: ["code"],
          properties: {
            code: { type: "string" },
            state: { type: "string" },
            redirect_uri: { type: "string" },
            display_name: { type: "string" },
            folder_id: { type: "string" },
            scope: { $ref: "#/components/schemas/ConnectorScope" }
          }
        }),
        responses: {
          "201": jsonResponse("Connector connection", objectSchema({
            connection: { $ref: "#/components/schemas/ConnectorConnection" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors/{provider}/webhook": {
      post: {
        operationId: "connectorWebhook",
        summary: "Verify and record a connector webhook",
        security: [],
        parameters: [pathParam("provider", "Connector provider id")],
        requestBody: jsonRequest({
          type: "object",
          required: ["connection_id"],
          properties: {
            connection_id: { type: "string" }
          },
          additionalProperties: true
        }),
        responses: {
          "202": jsonResponse("Webhook accepted", { $ref: "#/components/schemas/ConnectorWebhookResult" }),
          "401": jsonResponse("Webhook rejected", { $ref: "#/components/schemas/ConnectorWebhookResult" })
        }
      }
    },
    "/v1/connectors/{connection_id}": {
      get: {
        operationId: "connectorStatusGet",
        summary: "Read connector connection status, checkpoint, and document candidates",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("connection_id", "Connector connection id")],
        responses: {
          "200": jsonResponse("Connector status", objectSchema({
            connection: { $ref: "#/components/schemas/ConnectorConnection" },
            checkpoint: { type: "object", additionalProperties: true },
            documents: arrayOf({ type: "object", additionalProperties: true })
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      },
      patch: {
        operationId: "connectorStatusPatch",
        summary: "Pause or resume a connector connection",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("connection_id", "Connector connection id")],
        requestBody: jsonRequest({
          type: "object",
          required: ["status"],
          properties: {
            status: { enum: ["active", "paused"] }
          }
        }),
        responses: {
          "200": jsonResponse("Connector connection", objectSchema({
            connection: { $ref: "#/components/schemas/ConnectorConnection" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { $ref: "#/components/responses/Unauthorized" }
        }
      },
      delete: {
        operationId: "connectorDelete",
        summary: "Revoke a connector or delete its source data",
        security: [{ bearerAuth: [] }],
        parameters: [
          pathParam("connection_id", "Connector connection id"),
          queryParam("delete_source_data", "Delete stored connector document summaries", "boolean")
        ],
        requestBody: jsonRequest({
          type: "object",
          properties: {
            delete_source_data: { type: "boolean" }
          }
        }),
        responses: {
          "200": jsonResponse("Connector revoke/delete result", objectSchema({
            connection: { $ref: "#/components/schemas/ConnectorConnection" },
            deletedDocuments: { type: "integer" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors/{connection_id}/sync": {
      post: {
        operationId: "connectorSync",
        summary: "Run a connector backfill or incremental sync",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("connection_id", "Connector connection id")],
        requestBody: jsonRequest({
          type: "object",
          properties: {
            mode: { enum: ["backfill", "incremental"] }
          }
        }),
        responses: {
          "202": jsonResponse("Connector sync result", { $ref: "#/components/schemas/ConnectorSyncResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors/{connection_id}/resync": {
      post: {
        operationId: "connectorResync",
        summary: "Run a manual Google Drive resync/backfill",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("connection_id", "Connector connection id")],
        responses: {
          "202": jsonResponse("Connector resync result", { $ref: "#/components/schemas/ConnectorSyncResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors/{connection_id}/pause": {
      post: {
        operationId: "connectorPause",
        summary: "Pause a connector connection",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("connection_id", "Connector connection id")],
        responses: {
          "200": jsonResponse("Connector connection", objectSchema({
            connection: { $ref: "#/components/schemas/ConnectorConnection" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors/{connection_id}/resume": {
      post: {
        operationId: "connectorResume",
        summary: "Resume a paused connector connection",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("connection_id", "Connector connection id")],
        responses: {
          "200": jsonResponse("Connector connection", objectSchema({
            connection: { $ref: "#/components/schemas/ConnectorConnection" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors/{connection_id}/disconnect": {
      post: {
        operationId: "connectorDisconnect",
        summary: "Disconnect a connector and revoke stored connector tokens",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("connection_id", "Connector connection id")],
        requestBody: jsonRequest({
          type: "object",
          properties: {
            delete_source_data: { type: "boolean" }
          }
        }),
        responses: {
          "200": jsonResponse("Connector disconnect result", objectSchema({
            connection: { $ref: "#/components/schemas/ConnectorConnection" },
            deletedDocuments: { type: "integer" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/connectors/{connection_id}/channels/renew": {
      post: {
        operationId: "connectorRenewChannel",
        summary: "Renew Google Drive push notification channel metadata",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("connection_id", "Connector connection id")],
        responses: {
          "200": jsonResponse("Connector connection with renewed channel", objectSchema({
            connection: { $ref: "#/components/schemas/ConnectorConnection" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/capture/sources/{source_id}/heartbeat": {
      post: {
        operationId: "captureSourceHeartbeat",
        summary: "Record a capture source heartbeat (vault-scoped)",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("source_id", "Capture source id")],
        requestBody: jsonRequest({
          type: "object",
          properties: {
            source_type: { type: "string" },
            source_provider: { type: "string" },
            source_ref: { type: "string" },
            status: { enum: ["active", "paused", "error"] },
            error: { type: ["string", "null"] },
            metadata: { type: "object", additionalProperties: true }
          }
        }),
        responses: {
          "200": jsonResponse("Heartbeat result", objectSchema({
            source: { $ref: "#/components/schemas/CaptureSource" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/capture/jobs/{job_id}": {
      get: {
        operationId: "captureJobGet",
        summary: "Read a capture job (vault-scoped)",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("job_id", "Capture job id")],
        responses: {
          "200": jsonResponse("Capture job", objectSchema({
            job: { $ref: "#/components/schemas/CaptureJob" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/v1/capture/sessions": {
      post: {
        operationId: "captureSessionIngest",
        summary: "Upload a captured agent session for ingestion",
        description: "V0.9 capture pipeline. Idempotent on `idempotency_key`. Rejects raw_archive uploads when the vault disallows it. Rejects when the source is paused, in private mode, or unavailable.",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest({
          type: "object",
          required: [
            "provider",
            "source_original_id",
            "source_id",
            "content_hash",
            "idempotency_key",
            "redaction"
          ],
          properties: {
            provider: { enum: ["claude_code", "codex", "cursor", "opencode"] },
            source_original_id: { type: "string" },
            source_id: { type: "string" },
            content_hash: { type: "string" },
            idempotency_key: { type: "string" },
            capture_mode: { enum: ["summary_only", "raw_archive", "private_mode"] },
            started_at: { type: "string", format: "date-time" },
            ended_at: { type: "string", format: "date-time" },
            redaction: {
              type: "object",
              required: ["version", "secret_count", "private_block_count"],
              properties: {
                version: { type: "string" },
                secret_count: { type: "integer", minimum: 0 },
                private_block_count: { type: "integer", minimum: 0 }
              }
            },
            turn_summary: arrayOf({
              type: "object",
              properties: {
                role: { enum: ["user", "assistant", "tool", "system"] },
                text: { type: "string" }
              }
            }),
            raw_turns: arrayOf({ type: "object", additionalProperties: true }),
            metadata: { type: "object", additionalProperties: true }
          }
        }),
        responses: {
          "200": jsonResponse("Idempotent duplicate accepted", { $ref: "#/components/schemas/CaptureIngestResponse" }),
          "202": jsonResponse("Session accepted for ingestion", { $ref: "#/components/schemas/CaptureIngestResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Unauthorized" },
          "409": jsonResponse("Source paused or raw_archive not allowed", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/capture/sessions/{session_id}": {
      get: {
        operationId: "captureSessionGet",
        summary: "Read a captured session (vault-scoped)",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("session_id", "Captured session id")],
        responses: {
          "200": jsonResponse("Captured session", objectSchema({
            session: { $ref: "#/components/schemas/CapturedSession" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/v1/sources": {
      get: {
        operationId: "v09SourcesList",
        summary: "List capture sources visible to the caller's vault",
        security: [{ bearerAuth: [] }],
        parameters: [
          queryParam("limit", "Maximum sources to return", "integer"),
          queryParam("status", "Filter by source status (active, paused, private_mode, revoked, error)")
        ],
        responses: {
          "200": jsonResponse("Source list", objectSchema({
            sources: arrayOf({ $ref: "#/components/schemas/V09Source" })
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      },
      post: {
        operationId: "v09SourcesRegister",
        summary: "Register a capture source for the caller's vault",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest({ $ref: "#/components/schemas/V09SourceRegisterRequest" }),
        responses: {
          "201": jsonResponse("Source registered", objectSchema({ source: { $ref: "#/components/schemas/V09Source" } })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/sources/{source_id}": {
      get: {
        operationId: "v09SourceGet",
        summary: "Read a source",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("source_id", "Source id")],
        responses: {
          "200": jsonResponse("Source", objectSchema({ source: { $ref: "#/components/schemas/V09Source" } })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      patch: {
        operationId: "v09SourceUpdate",
        summary: "Update display name / raw archive policy / metadata",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("source_id", "Source id")],
        requestBody: jsonRequest({ $ref: "#/components/schemas/V09SourceUpdateRequest" }),
        responses: {
          "200": jsonResponse("Updated source", objectSchema({ source: { $ref: "#/components/schemas/V09Source" } })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/v1/sources/{source_id}/pause": {
      post: {
        operationId: "v09SourcePause",
        summary: "Pause a source. Subsequent ingestion is rejected with 409.",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("source_id", "Source id")],
        responses: {
          "200": jsonResponse("Paused source", objectSchema({ source: { $ref: "#/components/schemas/V09Source" } })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/v1/sources/{source_id}/resume": {
      post: {
        operationId: "v09SourceResume",
        summary: "Resume a paused source",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("source_id", "Source id")],
        responses: {
          "200": jsonResponse("Resumed source", objectSchema({ source: { $ref: "#/components/schemas/V09Source" } })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/v1/sources/{source_id}/checkpoints": {
      get: {
        operationId: "v09SourceCheckpointList",
        summary: "List source watcher checkpoints",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("source_id", "Source id")],
        responses: {
          "200": jsonResponse("Checkpoint list", objectSchema({
            checkpoints: arrayOf({ $ref: "#/components/schemas/V09SourceCheckpoint" })
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      },
      post: {
        operationId: "v09SourceCheckpointSave",
        summary: "Upsert a watcher checkpoint",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("source_id", "Source id")],
        requestBody: jsonRequest({ $ref: "#/components/schemas/V09SourceCheckpointSaveRequest" }),
        responses: {
          "200": jsonResponse("Checkpoint upserted", objectSchema({
            checkpoint: { $ref: "#/components/schemas/V09SourceCheckpoint" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/capture/events": {
      post: {
        operationId: "v09CaptureEventsIngest",
        summary: "Ingest a batch of canonical capture events for one source",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest({ $ref: "#/components/schemas/V09CaptureEventBatchRequest" }),
        responses: {
          "202": jsonResponse("Batch accepted", { $ref: "#/components/schemas/V09CaptureEventBatchResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Unauthorized" },
          "409": jsonResponse("Source rejected the batch (paused, private_mode, revoked, error)", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/capture/session-deltas": {
      post: {
        operationId: "v09CaptureSessionDeltas",
        summary: "Ingest incremental session deltas for an existing session",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest({ $ref: "#/components/schemas/V09SessionDeltaRequest" }),
        responses: {
          "202": jsonResponse("Deltas accepted", objectSchema({
            accepted: { type: "integer" },
            deduped: { type: "integer" }
          })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": jsonResponse("Source rejected the deltas", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/usage": {
      get: {
        operationId: "v09Usage",
        summary: "Read vault usage and current plan-limit snapshot",
        security: [{ bearerAuth: [] }],
        parameters: [queryParam("limit", "Recent usage events to include", "integer")],
        responses: {
          "200": jsonResponse("Usage summary", { $ref: "#/components/schemas/V09UsageSummary" }),
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/operator/usage": {
      get: {
        operationId: "v09OperatorUsage",
        summary: "Cross-vault usage rollup. Operator/admin api-key only.",
        security: [{ bearerAuth: [] }, { loreApiKey: [] }],
        parameters: [queryParam("limit", "Maximum vault rows", "integer")],
        responses: {
          "200": jsonResponse("Operator rollup", objectSchema({
            rows: arrayOf({ $ref: "#/components/schemas/V09OperatorUsageRow" })
          })),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/v1/memory-inbox": {
      get: {
        operationId: "v10MemoryInboxList",
        summary: "List Memory Inbox candidates for the authenticated vault.",
        security: [{ bearerAuth: [] }],
        parameters: [
          queryParam("status", "Optional candidate status filter"),
          queryParam("limit", "Maximum candidates to return", "integer")
        ],
        responses: {
          "200": jsonResponse("Memory candidates", objectSchema({
            candidates: arrayOf({ $ref: "#/components/schemas/V10MemoryCandidate" })
          })),
          "401": jsonResponse("No session", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/memory-inbox/{candidate_id}/approve": {
      post: {
        operationId: "v10MemoryInboxApprove",
        summary: "Approve a Memory Inbox candidate for future recall.",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("candidate_id", "Memory candidate id")],
        responses: {
          "200": jsonResponse("Candidate approved", objectSchema({
            candidate: { $ref: "#/components/schemas/V10MemoryCandidate" }
          })),
          "401": jsonResponse("No session", { $ref: "#/components/schemas/ErrorResponse" }),
          "404": jsonResponse("Candidate not found", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/memory-inbox/{candidate_id}/reject": {
      post: {
        operationId: "v10MemoryInboxReject",
        summary: "Reject a Memory Inbox candidate so it is not reused.",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("candidate_id", "Memory candidate id")],
        responses: {
          "200": jsonResponse("Candidate rejected", objectSchema({
            candidate: { $ref: "#/components/schemas/V10MemoryCandidate" }
          })),
          "401": jsonResponse("No session", { $ref: "#/components/schemas/ErrorResponse" }),
          "404": jsonResponse("Candidate not found", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/recall/traces": {
      get: {
        operationId: "v10RecallTraceList",
        summary: "List recall Evidence Ledger traces for the authenticated vault.",
        security: [{ bearerAuth: [] }],
        parameters: [queryParam("limit", "Maximum traces to return", "integer")],
        responses: {
          "200": jsonResponse("Recall traces", objectSchema({
            traces: arrayOf({ $ref: "#/components/schemas/V10RecallTrace" })
          })),
          "401": jsonResponse("No session", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/recall/traces/{trace_id}": {
      get: {
        operationId: "v10RecallTraceGet",
        summary: "Inspect a single recall trace and its retrieved memory items.",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("trace_id", "Recall trace id")],
        responses: {
          "200": jsonResponse("Recall trace detail", objectSchema({
            trace: { $ref: "#/components/schemas/V10RecallTrace" },
            items: arrayOf({ $ref: "#/components/schemas/V10RecallTraceItem" })
          })),
          "401": jsonResponse("No session", { $ref: "#/components/schemas/ErrorResponse" }),
          "404": jsonResponse("Trace not found", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/recall/traces/{trace_id}/feedback": {
      post: {
        operationId: "v10RecallTraceFeedback",
        summary: "Attach user feedback to a recall trace.",
        security: [{ bearerAuth: [] }],
        parameters: [pathParam("trace_id", "Recall trace id")],
        requestBody: jsonRequest({
          type: "object",
          required: ["feedback"],
          properties: { feedback: { type: "string" } },
          additionalProperties: false
        }),
        responses: {
          "200": jsonResponse("Feedback recorded", objectSchema({ success: { type: "boolean" } })),
          "401": jsonResponse("No session", { $ref: "#/components/schemas/ErrorResponse" }),
          "404": jsonResponse("Trace not found", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/auth/google/start": {
      get: {
        operationId: "v10AuthGoogleStart",
        summary: "Begin Google OIDC sign-in. Returns the authorization URL and sets a state cookie.",
        security: [],
        responses: {
          "200": jsonResponse("Authorization start", { $ref: "#/components/schemas/V10GoogleAuthStartResponse" }),
          "503": jsonResponse("Auth disabled (env not configured)", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/auth/google/callback": {
      get: {
        operationId: "v10AuthGoogleRedirectCallback",
        summary: "Complete browser Google OAuth sign-in with an authorization code.",
        security: [],
        parameters: [
          queryParam("code", "Google OAuth authorization code returned to the redirect URI."),
          queryParam("state", "Opaque OAuth state that must match the state cookie."),
          queryParam("error", "Google OAuth error value when the user denies or Google rejects the request.")
        ],
        responses: {
          "200": jsonResponse("Sign-in succeeded", { $ref: "#/components/schemas/V10GoogleAuthCallbackResponse" }),
          "400": jsonResponse("Bad input or OAuth state mismatch", { $ref: "#/components/schemas/ErrorResponse" }),
          "401": jsonResponse("ID token rejected (signature, audience, issuer, or expiry)", { $ref: "#/components/schemas/ErrorResponse" }),
          "503": jsonResponse("Auth disabled (env not configured)", { $ref: "#/components/schemas/ErrorResponse" })
        }
      },
      post: {
        operationId: "v10AuthGoogleCallback",
        summary: "Verify Google ID token, create or reuse account/identity/vault, and set a session cookie.",
        security: [],
        requestBody: jsonRequest({ $ref: "#/components/schemas/V10GoogleAuthCallbackRequest" }),
        responses: {
          "200": jsonResponse("Sign-in succeeded", { $ref: "#/components/schemas/V10GoogleAuthCallbackResponse" }),
          "400": jsonResponse("Bad input", { $ref: "#/components/schemas/ErrorResponse" }),
          "401": jsonResponse("ID token rejected (signature, audience, issuer, or expiry)", { $ref: "#/components/schemas/ErrorResponse" }),
          "503": jsonResponse("Auth disabled (env not configured)", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/auth/logout": {
      post: {
        operationId: "v10AuthLogout",
        summary: "Revoke the current web session. Requires CSRF header on session cookies.",
        security: [{ loreSession: [], loreCsrf: [] }],
        responses: {
          "200": jsonResponse("Logged out", objectSchema({ ok: { type: "boolean" } })),
          "403": jsonResponse("CSRF mismatch", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/me": {
      get: {
        operationId: "v10Me",
        summary: "Return the authenticated account, vault, and identity for the current session.",
        security: [{ loreSession: [] }],
        responses: {
          "200": jsonResponse("Current user", { $ref: "#/components/schemas/V10MeResponse" }),
          "401": jsonResponse("No session", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    },
    "/v1/vault": {
      get: {
        operationId: "v10MyVault",
        summary: "Return the personal vault for the current session.",
        security: [{ loreSession: [] }],
        responses: {
          "200": jsonResponse("Personal vault", { $ref: "#/components/schemas/V10VaultResponse" }),
          "401": jsonResponse("No session", { $ref: "#/components/schemas/ErrorResponse" })
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer"
      },
      loreApiKey: {
        type: "apiKey",
        in: "header",
        name: "x-lore-api-key"
      },
      loreSession: {
        type: "apiKey",
        in: "cookie",
        name: "lore_session"
      },
      loreCsrf: {
        type: "apiKey",
        in: "header",
        name: "x-lore-csrf"
      }
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid API key",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      }
    },
    schemas: {
      HealthResponse: objectSchema({
        status: { const: "ok" },
        service: { const: "lore-api" },
        timestamp: { type: "string", format: "date-time" }
      }),
      ContextQueryRequest: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          project_id: { type: "string" },
          token_budget: { type: "integer", minimum: 1 },
          include_sources: { type: "boolean" },
          mode: { enum: ["auto", "memory", "web", "repo", "tool_traces"] }
        }
      },
      ContextQueryResponse: objectSchema({
        traceId: { type: "string" },
        contextBlock: { type: "string" },
        route: { $ref: "#/components/schemas/ContextRoute" },
        memoryHits: arrayOf({ $ref: "#/components/schemas/MemoryHit" }),
        webEvidence: arrayOf({ $ref: "#/components/schemas/WebEvidence" }),
        repoEvidence: arrayOf({ $ref: "#/components/schemas/WebEvidence" }),
        toolTraceEvidence: arrayOf({ $ref: "#/components/schemas/WebEvidence" }),
        warnings: arrayOf({ type: "string" }),
        confidence: { type: "number" },
        usage: objectSchema({
          memoryReads: { type: "integer" },
          webSearches: { type: "integer" },
          tokensUsed: { type: "integer" },
          latencyMs: { type: "integer" }
        })
      }),
      ContextRoute: objectSchema({
        memory: { type: "boolean" },
        web: { type: "boolean" },
        repo: { type: "boolean" },
        toolTraces: { type: "boolean" },
        reason: { type: "string" }
      }),
      ContextTrace: objectSchema({
        id: { type: "string" },
        projectId: { type: "string" },
        query: { type: "string" },
        route: { $ref: "#/components/schemas/ContextRoute" },
        retrievedMemoryIds: arrayOf({ type: "string" }),
        composedMemoryIds: arrayOf({ type: "string" }),
        ignoredMemoryIds: arrayOf({ type: "string" }),
        warnings: arrayOf({ type: "string" }),
        latencyMs: { type: "number" },
        tokenBudget: { type: "number" },
        tokensUsed: { type: "number" },
        feedback: { enum: ["useful", "wrong", "outdated", "sensitive"] },
        createdAt: { type: "string", format: "date-time" }
      }),
      MemoryWriteRequest: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string" },
          memory_type: { type: "string" },
          project_id: { type: "string" },
          agent_id: { type: "string" },
          scope: { type: "string" },
          confidence: { type: "number" }
        }
      },
      MemoryUpdateRequest: {
        type: "object",
        properties: {
          content: { type: "string" },
          memory_type: { type: "string" },
          project_id: { type: "string" },
          agent_id: { type: "string" },
          scope: { type: "string" },
          confidence: { type: "number" }
        }
      },
      MemoryWriteResponse: objectSchema({
        memory: { $ref: "#/components/schemas/MemoryRecord" },
        reviewRequired: { type: "boolean" }
      }),
      MemoryRecord: objectSchema({
        id: { type: "string" },
        projectId: { type: "string" },
        memoryType: { type: "string" },
        scope: { type: "string" },
        visibility: { type: "string" },
        content: { type: "string" },
        status: { enum: ["candidate", "active", "confirmed", "superseded", "expired", "deleted"] },
        confidence: { type: "number" },
        sourceRefs: arrayOf({ $ref: "#/components/schemas/SourceRef" }),
        riskTags: arrayOf({ type: "string" }),
        metadata: { type: "object", additionalProperties: true },
        useCount: { type: "integer" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }),
      MemoryHit: objectSchema({
        memory: { $ref: "#/components/schemas/MemoryRecord" },
        score: { type: "number" },
        highlights: arrayOf({ type: "string" })
      }),
      WebEvidence: objectSchema({
        id: { type: "string" },
        title: { type: "string" },
        url: { type: "string" },
        snippet: { type: "string" },
        source: { type: "string" },
        fetchedAt: { type: "string", format: "date-time" }
      }),
      SourceRef: objectSchema({
        type: { type: "string" },
        id: { type: "string" },
        path: { type: "string" },
        url: { type: "string" },
        excerpt: { type: "string" }
      }),
      EvidenceLedger: objectSchema({
        traceId: { type: "string" },
        query: { type: "string" },
        projectId: { type: "string" },
        route: { $ref: "#/components/schemas/ContextRoute" },
        traceWarnings: arrayOf({ type: "string" }),
        summary: { $ref: "#/components/schemas/EvidenceLedgerSummary" },
        rows: arrayOf({ $ref: "#/components/schemas/EvidenceLedgerRow" }),
        actions: arrayOf({ type: "string" }),
        createdAt: { type: "string", format: "date-time" }
      }),
      EvidenceLedgerSummary: objectSchema({
        retrieved: { type: "integer" },
        composed: { type: "integer" },
        ignored: { type: "integer" },
        warnings: { type: "integer" },
        riskTags: arrayOf({ type: "string" }),
        staleCount: { type: "integer" },
        conflictCount: { type: "integer" }
      }),
      EvidenceLedgerRow: objectSchema({
        memoryId: { type: "string" },
        contentPreview: { type: "string" },
        disposition: { enum: ["used", "ignored", "blocked", "missing"] },
        status: { type: "string" },
        confidence: { type: ["number", "null"] },
        sourceRefs: arrayOf({ $ref: "#/components/schemas/SourceRef" }),
        riskTags: arrayOf({ type: "string" }),
        warnings: arrayOf({ type: "string" })
      }),
      EvalProvider: objectSchema({
        id: { type: "string" },
        label: { type: "string" },
        source: { type: "string" },
        notes: { type: "string" }
      }),
      EvalRunRecord: objectSchema({
        id: { type: "string" },
        provider: { type: "string" },
        projectId: { type: "string" },
        metrics: { $ref: "#/components/schemas/EvalMetrics" },
        status: { const: "completed" },
        createdAt: { type: "string", format: "date-time" }
      }),
      EvalMetrics: objectSchema({
        recallAt5: { type: "number" },
        precisionAt5: { type: "number" },
        mrr: { type: "number" },
        staleHitRate: { type: "number" },
        p95LatencyMs: { type: "number" }
      }),
      AuditLog: objectSchema({
        id: { type: "string" },
        action: { type: "string" },
        resourceType: { type: "string" },
        resourceId: { type: "string" },
        metadata: { type: "object", additionalProperties: true },
        createdAt: { type: "string", format: "date-time" }
      }),
      ErrorResponse: objectSchema({
        error: objectSchema({
          code: { type: "string" },
          message: { type: "string" },
          status: { type: "integer" }
        })
      }),
      CloudAccount: objectSchema({
        id: { type: "string" },
        name: { type: "string" },
        plan: { type: "string" },
        createdAt: { type: "string", format: "date-time" }
      }),
      CloudVault: objectSchema({
        id: { type: "string" },
        accountId: { type: "string" },
        name: { type: "string" },
        plan: { type: "string" },
        rawArchiveEnabled: { type: "boolean" },
        privateMode: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" }
      }),
      CloudDevice: objectSchema({
        id: { type: "string" },
        vaultId: { type: "string" },
        accountId: { type: "string" },
        label: { type: "string" },
        platform: { type: "string" },
        status: { enum: ["active", "revoked"] },
        pairedAt: { type: "string", format: "date-time" },
        lastSeenAt: { type: "string", format: "date-time" }
      }),
      CloudInstallTokenResponse: objectSchema({
        installToken: { type: "string" },
        tokenId: { type: "string" },
        vaultId: { type: "string" },
        accountId: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
        singleUse: { type: "boolean" }
      }),
      CloudPairResponse: objectSchema({
        deviceId: { type: "string" },
        vaultId: { type: "string" },
        accountId: { type: "string" },
        deviceToken: { type: "string" },
        deviceTokenExpiresAt: { type: "string", format: "date-time" },
        serviceToken: { type: "string" },
        serviceTokenExpiresAt: { type: "string", format: "date-time" },
        scopes: objectSchema({
          device: arrayOf({ type: "string" }),
          service: arrayOf({ type: "string" })
        })
      }),
      CloudRotatedToken: objectSchema({
        tokenId: { type: "string" },
        token: { type: "string" },
        kind: { type: "string" },
        vaultId: { type: "string" },
        accountId: { type: "string" },
        deviceId: { type: "string" },
        scopes: arrayOf({ type: "string" }),
        expiresAt: { type: "string", format: "date-time" }
      }),
      CloudWhoAmIResponse: objectSchema({
        account: { $ref: "#/components/schemas/CloudAccount" },
        vault: { $ref: "#/components/schemas/CloudVault" },
        device: { $ref: "#/components/schemas/CloudDevice" },
        tokenKind: { type: "string" },
        scopes: arrayOf({ type: "string" })
      }),
      ConnectorProvider: objectSchema({
        provider: { enum: ["google_drive"] },
        label: { type: "string" },
        auth: { const: "oauth2" },
        liveCredentials: { type: "boolean" },
        privateBeta: { type: "boolean" },
        credentialStatus: { enum: ["configured", "missing"] },
        credentialEnv: arrayOf({ type: "string" }),
        missingCredentialEnv: arrayOf({ type: "string" }),
        signInScopes: arrayOf({ type: "string" }),
        scopes: arrayOf({ type: "string" }),
        fixtureBacked: { type: "boolean" }
      }),
      ConnectorScope: objectSchema({
        type: { enum: ["drive", "folder", "page", "database"] },
        id: { type: "string" },
        displayName: { type: "string" }
      }),
      ConnectorConnection: objectSchema({
        id: { type: "string" },
        vaultId: { type: "string" },
        accountId: { type: "string" },
        provider: { enum: ["google_drive"] },
        displayName: { type: "string" },
        status: { enum: ["active", "paused", "revoked", "deleted", "error"] },
        scope: { $ref: "#/components/schemas/ConnectorScope" },
        permissions: { type: "object", additionalProperties: true },
        metadata: { type: "object", additionalProperties: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        lastSyncedAt: { type: ["string", "null"], format: "date-time" },
        revokedAt: { type: ["string", "null"], format: "date-time" },
        deletedAt: { type: ["string", "null"], format: "date-time" },
        lastError: { type: ["string", "null"] }
      }),
      ConnectorAuthorizationUrl: objectSchema({
        provider: { enum: ["google_drive"] },
        authorizationUrl: { type: "string" },
        state: { type: "string" },
        scopes: arrayOf({ type: "string" }),
        signInScopes: arrayOf({ type: "string" }),
        fixtureBacked: { type: "boolean" },
        privateBeta: { type: "boolean" },
        credentialStatus: { enum: ["configured", "missing"] },
        credentialEnv: arrayOf({ type: "string" }),
        missingCredentialEnv: arrayOf({ type: "string" })
      }),
      ConnectorDocumentSummary: objectSchema({
        schemaVersion: { const: "v0.9.connector.summary" },
        provider: { enum: ["google_drive"] },
        connectionId: { type: "string" },
        externalId: { type: "string" },
        title: { type: "string" },
        mimeType: { type: "string" },
        excerpt: { type: "string" },
        contentHash: { type: "string" },
        sourceRefs: arrayOf({ type: "object", additionalProperties: true }),
        metadata: { type: "object", additionalProperties: true }
      }),
      ConnectorSyncResponse: objectSchema({
        sync: objectSchema({
          connectionId: { type: "string" },
          provider: { enum: ["google_drive"] },
          mode: { enum: ["backfill", "incremental"] },
          job: { type: "object", additionalProperties: true },
          checkpoint: { type: "object", additionalProperties: true },
          inbox: objectSchema({
            accepted: { type: "integer" },
            deduped: { type: "integer" }
          }),
          documents: arrayOf(objectSchema({
            id: { type: "string" },
            externalId: { type: "string" },
            title: { type: "string" },
            mimeType: { type: "string" },
            modifiedAt: { type: "string", format: "date-time" },
            summary: { $ref: "#/components/schemas/ConnectorDocumentSummary" },
            candidate: { type: "object", additionalProperties: true }
          }))
        })
      }),
      ConnectorWebhookResult: objectSchema({
        accepted: { type: "boolean" },
        reason: { type: "string" },
        event: { type: "object", additionalProperties: true }
      }),
      CaptureSource: objectSchema({
        id: { type: "string" },
        vaultId: { type: "string" },
        deviceId: { type: "string" },
        sourceType: { type: "string" },
        sourceProvider: { type: ["string", "null"] },
        sourceRef: { type: ["string", "null"] },
        status: { enum: ["active", "paused", "error"] },
        lastHeartbeatAt: { type: "string", format: "date-time" },
        lastError: { type: ["string", "null"] },
        metadata: { type: "object", additionalProperties: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }),
      CaptureJob: objectSchema({
        id: { type: "string" },
        vaultId: { type: "string" },
        sessionId: { type: "string" },
        type: { type: "string" },
        status: { enum: ["pending", "running", "completed", "failed"] },
        attempts: { type: "integer" },
        payload: { type: "object", additionalProperties: true },
        error: { type: ["string", "null"] },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        lockedBy: { type: ["string", "null"] },
        lockedAt: { type: ["string", "null"], format: "date-time" },
        nextRunAt: { type: ["string", "null"], format: "date-time" }
      }),
      CapturedSession: objectSchema({
        id: { type: "string" },
        vaultId: { type: "string" },
        sourceId: { type: "string" },
        deviceId: { type: ["string", "null"] },
        provider: { enum: ["claude_code", "codex", "cursor", "opencode"] },
        sourceOriginalId: { type: "string" },
        contentHash: { type: "string" },
        idempotencyKey: { type: "string" },
        captureMode: { enum: ["summary_only", "raw_archive", "private_mode"] },
        startedAt: { type: ["string", "null"], format: "date-time" },
        endedAt: { type: ["string", "null"], format: "date-time" },
        redaction: objectSchema({
          version: { type: "string" },
          secretCount: { type: "integer", minimum: 0 },
          privateBlockCount: { type: "integer", minimum: 0 }
        }),
        receivedAt: { type: "string", format: "date-time" }
      }),
      CaptureIngestResponse: objectSchema({
        session: { $ref: "#/components/schemas/CapturedSession" },
        job: objectSchema({
          id: { type: "string" },
          type: { type: "string" },
          status: { enum: ["pending", "running", "completed", "failed"] },
          attempts: { type: "integer" },
          nextRunAt: { type: ["string", "null"], format: "date-time" }
        }),
        duplicate: { type: "boolean" }
      }),
      V09Source: objectSchema({
        id: { type: "string" },
        vaultId: { type: "string" },
        deviceId: { type: ["string", "null"] },
        sourceType: { type: "string" },
        sourceProvider: { type: ["string", "null"] },
        sourceRef: { type: ["string", "null"] },
        displayName: { type: ["string", "null"] },
        rawArchivePolicy: { enum: ["none", "metadata_only", "summary_only", "encrypted_raw", "plain_raw_for_beta_debug"] },
        status: { enum: ["active", "paused", "private_mode", "revoked", "error"] },
        pausedAt: { type: ["string", "null"], format: "date-time" },
        lastHeartbeatAt: { type: ["string", "null"], format: "date-time" },
        lastError: { type: ["string", "null"] },
        metadata: { type: "object", additionalProperties: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }),
      V09SourceRegisterRequest: {
        type: "object",
        required: ["source_provider"],
        properties: {
          source_id: { type: "string" },
          source_type: { type: "string" },
          source_provider: { type: "string" },
          source_ref: { type: "string" },
          display_name: { type: "string" },
          raw_archive_policy: { enum: ["none", "metadata_only", "summary_only", "encrypted_raw", "plain_raw_for_beta_debug"] },
          permissions: arrayOf({ $ref: "#/components/schemas/V09SourcePermissionEnvelope" }),
          metadata: { type: "object", additionalProperties: true }
        }
      },
      V09SourceUpdateRequest: {
        type: "object",
        properties: {
          display_name: { type: "string" },
          raw_archive_policy: { enum: ["none", "metadata_only", "summary_only", "encrypted_raw", "plain_raw_for_beta_debug"] },
          metadata: { type: "object", additionalProperties: true }
        }
      },
      V09SourcePermissionEnvelope: {
        type: "object",
        required: ["permission_type", "value"],
        properties: {
          permission_type: { type: "string" },
          scope: { type: "string" },
          value: { type: "string" },
          metadata: { type: "object", additionalProperties: true }
        }
      },
      V09SourceCheckpoint: objectSchema({
        id: { type: "string" },
        sourceId: { type: "string" },
        vaultId: { type: "string" },
        checkpointKey: { type: "string" },
        offsetValue: { type: ["string", "null"] },
        contentHash: { type: ["string", "null"] },
        metadata: { type: "object", additionalProperties: true },
        updatedAt: { type: "string", format: "date-time" }
      }),
      V09SourceCheckpointSaveRequest: {
        type: "object",
        required: ["checkpoint_key"],
        properties: {
          checkpoint_key: { type: "string" },
          offset_value: { type: "string" },
          content_hash: { type: "string" },
          metadata: { type: "object", additionalProperties: true }
        }
      },
      V09CaptureEvent: objectSchema({
        external_event_id: { type: ["string", "null"] },
        event_type: { type: "string" },
        occurred_at: { type: ["string", "null"], format: "date-time" },
        actor: { type: ["string", "null"] },
        content_ref: { type: "object", additionalProperties: true },
        redaction_state: { enum: ["redacted", "raw_allowed", "metadata_only"] },
        idempotency_key: { type: ["string", "null"] },
        session_id: { type: ["string", "null"] },
        payload: { type: "object", additionalProperties: true }
      }),
      V09CaptureEventBatchRequest: {
        type: "object",
        required: ["source_id", "events"],
        properties: {
          source_id: { type: "string" },
          batch_idempotency_key: { type: "string" },
          events: arrayOf({ $ref: "#/components/schemas/V09CaptureEvent" })
        }
      },
      V09CaptureEventBatchResponse: objectSchema({
        batch: objectSchema({
          id: { type: "string" },
          vaultId: { type: "string" },
          sourceId: { type: ["string", "null"] },
          deviceId: { type: ["string", "null"] },
          batchKind: { type: "string" },
          eventCount: { type: "integer" },
          bytes: { type: "integer" },
          status: { enum: ["received", "processing", "applied", "rejected"] },
          idempotencyKey: { type: ["string", "null"] },
          metadata: { type: "object", additionalProperties: true },
          receivedAt: { type: "string", format: "date-time" }
        }),
        accepted: { type: "integer" },
        deduped: { type: "integer" },
        eventIds: arrayOf({ type: "string" })
      }),
      V09SessionDeltaRequest: {
        type: "object",
        required: ["source_id", "session_id", "deltas"],
        properties: {
          source_id: { type: "string" },
          session_id: { type: "string" },
          deltas: arrayOf({
            type: "object",
            required: ["idempotency_key", "payload"],
            properties: {
              idempotency_key: { type: "string" },
              occurred_at: { type: "string", format: "date-time" },
              payload: { type: "object", additionalProperties: true }
            }
          })
        }
      },
      V09UsageLimitSnapshot: objectSchema({
        id: { type: "string" },
        vaultId: { type: "string" },
        accountId: { type: ["string", "null"] },
        plan: { enum: ["free", "personal", "pro", "team_beta"] },
        periodStart: { type: "string", format: "date-time" },
        periodEnd: { type: "string", format: "date-time" },
        ingestTokenUsed: { type: "number" },
        ingestTokenLimit: { type: "number" },
        recallUsed: { type: "number" },
        recallLimit: { type: "number" },
        agentCount: { type: "integer" },
        agentLimit: { type: "integer" },
        rawArchiveEnabled: { type: "boolean" },
        observedAt: { type: "string", format: "date-time" }
      }),
      V09UsageSummary: objectSchema({
        plan: { enum: ["free", "personal", "pro", "team_beta"] },
        snapshot: { $ref: "#/components/schemas/V09UsageLimitSnapshot" },
        events: arrayOf({
          type: "object",
          properties: {
            id: { type: "string" },
            vaultId: { type: "string" },
            eventType: { type: "string" },
            units: { type: "number" },
            occurredAt: { type: "string", format: "date-time" }
          }
        })
      }),
      V09OperatorUsageRow: objectSchema({
        vaultId: { type: "string" },
        accountId: { type: ["string", "null"] },
        plan: { type: "string" },
        ingestTokenUsed: { type: "number" },
        recallUsed: { type: "number" },
        captureEventCount: { type: "number" },
        lastEventAt: { type: ["string", "null"], format: "date-time" }
      }),
      V10MemoryCandidate: objectSchema({
        id: { type: "string" },
        vaultId: { type: "string" },
        sourceId: { type: ["string", "null"] },
        sessionId: { type: ["string", "null"] },
        externalEventId: { type: ["string", "null"] },
        content: { type: "string" },
        memoryType: { type: "string" },
        status: { type: "string" },
        riskTags: arrayOf({ type: "string" }),
        confidence: { type: "number" },
        metadata: { type: "object", additionalProperties: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }),
      V10RecallTrace: objectSchema({
        id: { type: "string" },
        vaultId: { type: "string" },
        query: { type: "string" },
        routeReason: { type: ["string", "null"] },
        latencyMs: { type: ["number", "null"] },
        tokenBudget: { type: ["number", "null"] },
        tokensUsed: { type: ["number", "null"] },
        feedback: { type: ["string", "null"] },
        feedbackAt: { type: ["string", "null"], format: "date-time" },
        metadata: { type: "object", additionalProperties: true },
        createdAt: { type: "string", format: "date-time" }
      }),
      V10RecallTraceItem: objectSchema({
        id: { type: "string" },
        traceId: { type: "string" },
        memoryId: { type: ["string", "null"] },
        candidateId: { type: ["string", "null"] },
        disposition: { type: "string" },
        confidence: { type: ["number", "null"] },
        riskTags: arrayOf({ type: "string" }),
        reason: { type: ["string", "null"] },
        metadata: { type: "object", additionalProperties: true }
      }),
      V10GoogleAuthStartResponse: objectSchema({
        authorizationUrl: { type: "string" },
        state: { type: "string" },
        scopes: arrayOf({ type: "string" })
      }),
      V10GoogleAuthCallbackRequest: {
        type: "object",
        required: ["id_token", "state"],
        properties: {
          id_token: { type: "string", description: "Google OIDC id_token (JWT). In production the JWT signature is verified against Google's JWKS. In mock mode, accepts a base64url JSON claims blob." },
          state: { type: "string", description: "Opaque OAuth state that must match the state cookie." }
        }
      },
      V10GoogleAuthCallbackResponse: objectSchema({
        account: objectSchema({
          id: { type: "string" },
          email: { type: ["string", "null"] },
          displayName: { type: ["string", "null"] },
          plan: { type: "string" }
        }),
        vault: objectSchema({
          id: { type: "string" },
          name: { type: "string" },
          plan: { type: "string" },
          rawArchiveEnabled: { type: "boolean" },
          privateMode: { type: "boolean" }
        }),
        identity: objectSchema({
          id: { type: "string" },
          provider: { const: "google" },
          providerUserId: { type: "string" },
          email: { type: ["string", "null"] }
        }),
        session: objectSchema({
          tokenId: { type: "string" },
          expiresAt: { type: "string", format: "date-time" }
        }),
        csrfToken: { type: "string" },
        createdNew: { type: "boolean" }
      }),
      V10MeResponse: objectSchema({
        account: objectSchema({
          id: { type: "string" },
          email: { type: ["string", "null"] },
          displayName: { type: ["string", "null"] },
          plan: { type: "string" }
        }),
        vault: objectSchema({
          id: { type: "string" },
          name: { type: "string" },
          plan: { type: "string" }
        }),
        identity: { type: ["object", "null"], additionalProperties: true },
        session: objectSchema({
          tokenKind: { type: "string" },
          scopes: arrayOf({ type: "string" })
        })
      }),
      V10VaultResponse: objectSchema({
        vault: objectSchema({
          id: { type: "string" },
          accountId: { type: "string" },
          name: { type: "string" },
          plan: { type: "string" },
          rawArchiveEnabled: { type: "boolean" },
          privateMode: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" }
        })
      })
    }
  }
} as const;

function jsonRequest(schema: unknown) {
  return {
    required: true,
    content: {
      "application/json": {
        schema
      }
    }
  };
}

function jsonResponse(description: string, schema: unknown) {
  return {
    description,
    content: {
      "application/json": {
        schema
      }
    }
  };
}

function objectSchema(properties: Record<string, unknown>) {
  return {
    type: "object",
    properties,
    additionalProperties: false
  };
}

function arrayOf(items: unknown) {
  return {
    type: "array",
    items
  };
}

function pathParam(name: string, description: string) {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: { type: "string" }
  };
}

function queryParam(name: string, description: string, type = "string") {
  return {
    name,
    in: "query",
    required: false,
    description,
    schema: { type }
  };
}
