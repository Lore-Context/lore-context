# API Reference

Lore Context exposes a REST API under `/v1/*` and a stdio MCP server. This document
covers the REST surface. MCP tool names are listed at the end.

All examples assume:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Conventions

- All endpoints accept and return JSON.
- Authentication: `Authorization: Bearer <key>` header (or `x-lore-api-key`).
  `/health` and `/openapi.json` are unauthenticated.
- Roles: `reader < writer < admin`. Each endpoint lists its minimum role.
- Errors: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Rate limits: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  headers on every response. `429 Too Many Requests` includes a `Retry-After` header.
- All mutations are recorded in the audit log. Admin-only access via
  `/v1/audit-logs`.

## Health and Readiness

### `GET /health`
- **Auth**: none
- **Response 200**: `{ "status": "ok", "service": "lore-api", "timestamp": ISO-8601 }`

### `GET /openapi.json`
- **Auth**: none
- **Response 200**: OpenAPI 3.1 JSON for the v0.5 adoption API surface.

## Context

### `POST /v1/context/query`
Compose context from memory + web + repo + tool traces.

- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "mode"?: "auto"|"memory"|"web"|"repo"|"tool_traces", "sources"?: object,
  "include_sources"?: boolean }`
- **Response 200**: `{ "traceId": string, "contextBlock": string,
  "route": ContextRoute, "memoryHits": MemoryHit[], "webEvidence": WebEvidence[],
  "repoEvidence": WebEvidence[], "toolTraceEvidence": WebEvidence[],
  "warnings": string[], "confidence": number, "usage": { "memoryReads": number,
  "webSearches": number, "tokensUsed": number, "latencyMs": number } }`

## Memory

### `POST /v1/memory/write`
- **Auth**: writer+ (project-scoped writers must include matching `project_id`)
- **Body**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"user"|"repo"|"team"|"org", "confidence"?: number }`
- **Response 200**: `{ "memory": MemoryRecord, "reviewRequired": boolean }`

### `GET /v1/memory/:id`
- **Auth**: reader+
- **Response 200**: full memory record including governance state.

### `PATCH /v1/memory/:id`
Patch a memory in place (small corrections only).
- **Auth**: writer+
- **Body**: `{ "content"?: string, "memory_type"?: string, "scope"?: string,
  "project_id"?: string, "agent_id"?: string, "confidence"?: number }`
- **Response 200**: `{ "memory": MemoryRecord, "reviewRequired": boolean }`

### `POST /v1/memory/:id/supersede`
Create a new memory that replaces an old one.
- **Auth**: writer+
- **Body**: `{ "content": string, "reason": string }`
- **Response 200**: `{ "previous": MemoryRecord, "memory": MemoryRecord,
  "reviewRequired": boolean }`

### `POST /v1/memory/forget`
Soft delete by default; admin can hard delete.
- **Auth**: admin
- **Body**: `{ "memory_ids"?: string[], "query"?: string, "project_id"?: string,
  "top_k"?: number, "reason": string, "hard_delete"?: boolean }`
- **Response 200**: `{ "deleted": number, "memoryIds": string[], "hardDelete": boolean }`

### `POST /v1/memory/search`
Direct search without composition.
- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "top_k"?: number }`
- **Response 200**: `{ "hits": MemoryHit[] }`

### `GET /v1/memory/list`
- **Auth**: reader+
- **Query**: `project_id` (REQUIRED for scoped keys), `scope`, `status`,
  `memory_type`, `q`, `limit`
- **Response 200**: `{ "memories": MemoryRecord[] }`

### `GET /v1/memory/export`
Export memory as MIF v0.2 JSON.
- **Auth**: admin
- **Query**: `project_id`, `format` (`json` or `markdown`)
- **Response 200**: MIF envelope with `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Import a MIF v0.1 or v0.2 envelope.
- **Auth**: admin
- **Body**: MIF envelope as JSON string or object
- **Response 200**: `{ "imported": number, "memoryIds": string[] }`

## Governance

### `GET /v1/governance/review-queue`
- **Auth**: admin
- **Query**: `project_id`
- **Response 200**: `{ "memories": MemoryRecord[] }`

### `POST /v1/governance/memory/:id/approve`
Promote candidate memory to confirmed.
- **Auth**: admin
- **Body**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Promote candidate memory to deleted.
- **Auth**: admin
- **Body**: `{ "reason": string }`

### `GET /v1/audit-logs`
- **Auth**: admin
- **Query**: `limit`
- **Response 200**: `{ "auditLogs": AuditLog[] }`

## Eval

### `GET /v1/eval/providers`
- **Auth**: reader+
- **Response 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "label": string, "source": string, "notes": string }] }`

### `POST /v1/eval/run`
- **Auth**: writer+ (project-scoped writers must include matching `project_id`)
- **Body**: `{ "dataset": EvalDataset, "provider"?: "lore-local"|
  "agentmemory-export"|"external-mock", "project_id"?: string }`
- **Response 200**: `{ "evalRunId": string, "metrics": { "recallAt5": number,
  "precisionAt5": number, "mrr": number, "staleHitRate": number,
  "p95LatencyMs": number } }`

### `GET /v1/eval/runs`
List saved eval runs.
- **Auth**: reader+
- **Query**: `project_id`, `limit`
- **Response 200**: `{ "evalRuns": EvalRunRecord[] }`

### `GET /v1/eval/runs/:run_id`
Fetch a saved eval run.
- **Auth**: reader+

### `GET /v1/eval/report`
Render the latest eval as Markdown or JSON.
- **Auth**: reader+
- **Query**: `project_id`, `format` (`md`|`json`)

## Events and Traces

### `POST /v1/events/ingest`
Push agent telemetry into Lore.
- **Auth**: writer+
- **Body**: `{ "event_type": string, "project_id"?: string, "payload"?: object }`
- **Response 200**: `{ "eventId": string }`

### `GET /v1/traces`
- **Auth**: reader+
- **Query**: `project_id`, `limit`

### `GET /v1/traces/:trace_id`
Inspect a single context-query trace.
- **Auth**: reader+

### `POST /v1/traces/:trace_id/feedback`
Record feedback on a context query.
- **Auth**: writer+
- **Body**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "note"?: string }`

## Evidence Ledger

### `GET /v1/evidence/ledger/:trace_id`
Inspect a context trace as an evidence ledger.

- **Auth**: reader+
- **Response 200**: `{ "ledger": { "traceId": string, "query": string,
  "summary": { "retrieved": number, "composed": number, "ignored": number,
  "warnings": number, "riskTags": string[], "staleCount": number,
  "conflictCount": number }, "rows": [...] } }`

Rows include `memoryId`, `contentPreview`, `disposition` (`used`, `ignored`,
`blocked`, or `missing`), lifecycle `status`, `confidence`, `sourceRefs`,
`riskTags`, and row-level warnings. Hard-deleted memory ids are returned as
missing rows without raw content.

### `GET /v1/evidence/ledgers`
List recent evidence ledgers.

- **Auth**: reader+
- **Query**: `project_id`, `limit`
- **Response 200**: `{ "ledgers": EvidenceLedger[] }`

## Integrations

### `GET /v1/integrations/agentmemory/health`
Check agentmemory upstream + version compatibility.
- **Auth**: reader+
- **Response 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Pull memory from agentmemory into Lore.
- **Auth**: admin (unscoped — sync crosses projects)
- **Body**: `{ "project_id"?: string, "dry_run"?: boolean }`

## MCP Server (stdio)

The MCP server exposes the following tools. Each tool's `inputSchema` is a zod-validated
JSON Schema. Mutating tools require a `reason` string of at least 8 characters.

| Tool | Mutates | Description |
|---|---|---|
| `context_query` | no | Compose context for a query |
| `memory_write` | yes | Write a new memory |
| `memory_search` | no | Direct search without composition |
| `memory_get` | no | Fetch by id |
| `memory_list` | no | List memories with filters |
| `memory_update` | yes | Patch in place |
| `memory_supersede` | yes | Replace with new version |
| `memory_forget` | yes | Soft or hard delete |
| `memory_export` | no | Export MIF envelope |
| `eval_run` | no | Run eval against dataset |
| `trace_get` | no | Inspect trace by id |

JSON-RPC error codes:
- `-32602` Invalid params (zod validation failure)
- `-32603` Internal error (sanitized; original written to stderr)

Run with the official SDK transport:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

The formal OpenAPI 3.1 document is served from `GET /openapi.json` and verified by:

```bash
pnpm openapi:check
```

This prose reference remains the human-oriented companion.
