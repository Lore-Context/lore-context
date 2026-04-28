export const requiredOpenApiPaths = [
  "/health",
  "/openapi.json",
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
  "/v1/eval/report"
] as const;

export const requiredOpenApiOperations = [
  ["get", "/health"],
  ["get", "/openapi.json"],
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
  ["get", "/v1/eval/report"]
] as const;

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Lore Context API",
    version: "0.5.0-alpha",
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
