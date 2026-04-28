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
  `/health` is the only unauthenticated route.
- Roles: `reader < writer < admin`. Each endpoint lists its minimum role.
- Errors: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Rate limits: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  headers on every response. `429 Too Many Requests` includes a `Retry-After` header.
- All mutations are recorded in the audit log. Admin-only access via
  `/v1/governance/audit-log`.

## Health and Readiness

### `GET /health`
- **Auth**: none
- **Response 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Context

### `POST /v1/context/query`
Compose context from memory + web + repo + tool traces.

- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Response 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Memory

### `POST /v1/memory/write`
- **Auth**: writer+ (project-scoped writers must include matching `project_id`)
- **Body**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Response 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Auth**: reader+
- **Response 200**: full memory record including governance state.

### `POST /v1/memory/:id/update`
Patch a memory in place (small corrections only).
- **Auth**: writer+
- **Body**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Create a new memory that replaces an old one.
- **Auth**: writer+
- **Body**: `{ "content": string, "reason": string }`
- **Response 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Soft delete by default; admin can hard delete.
- **Auth**: writer+ (soft) / admin (hard)
- **Body**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Direct search without composition.
- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Auth**: reader+
- **Query**: `project_id` (REQUIRED for scoped keys), `state`, `limit`, `offset`
- **Response 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Export memory as MIF v0.2 JSON.
- **Auth**: admin
- **Query**: `project_id`, `format` (`json` or `markdown`)
- **Response 200**: MIF envelope with `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Import a MIF v0.1 or v0.2 envelope.
- **Auth**: admin (or scoped writer with explicit `project_id`)
- **Body**: MIF envelope as JSON string or object
- **Response 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Governance

### `GET /v1/governance/review-queue`
- **Auth**: admin
- **Response 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Promote candidate/flagged → active.
- **Auth**: admin
- **Body**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Promote candidate/flagged → deleted.
- **Auth**: admin
- **Body**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Auth**: admin
- **Query**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Response 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **Auth**: reader+
- **Response 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Auth**: writer+ (project-scoped writers must include matching `project_id`)
- **Body**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Response 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

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
- **Body**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Auth**: reader+
- **Query**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Inspect a single context-query trace.
- **Auth**: reader+

### `POST /v1/traces/:trace_id/feedback`
Record feedback on a context query.
- **Auth**: writer+
- **Body**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

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

A formal OpenAPI 3.0 spec is tracked for v0.5. Until then, this prose reference is
authoritative.
