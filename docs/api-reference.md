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
- **Response 200**: OpenAPI 3.1 JSON for the current API surface. The current
  production runtime reports `2.1.0`.

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
- **Response 200**: `{ "hits": MemoryHit[], "backend": "lore-local"|"lore-hybrid"|"lore-v12-hybrid",
  "degraded": boolean, "engineVersion"?: "v12" }`

In production, the expected healthy path is `backend: "lore-v12-hybrid"`
with `engineVersion: "v12"` (the engine label is preserved because the
underlying schema family is shared across the v12+ line). The response
reflects the full seven-stream `HybridSearchOrchestrator` — Postgres FTS,
Postgres pgvector, Qdrant dense, Qdrant sparse, graph, temporal, and wiki —
with deterministic results when the same stream subset and timeouts are
supplied.
`MemorySearchInputV12.streams?` selects a per-request subset; `rerank?: boolean`
gates the optional `LocalCrossEncoderReranker` post-fusion pass. Qdrant remains
a derived index; RDS remains authoritative before a hit is returned.

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
  "agentmemory-export"|"external-mock", "project_id"?: string,
  "recipe_id"?: string, "recipe_spec"?: Partial<ContextRecipeSpec>,
  "recipe_trial_id"?: string }`
- **v12/v13 body**: `{ "engineVersion": "v12"|"v13", "recipe"?: string|object,
  "dataset": { "name": string, "version": string, "items": EvalCaseV12[] },
  "project_id"?: string }`. v12 defaults to `v12-postgres-hybrid`; v13
  defaults to `all-streams-on`.
- **Response 200**: `{ "evalRunId": string, "metrics": { "recallAt5": number,
  "precisionAt5": number, "mrr": number, "staleHitRate": number,
  "p95LatencyMs": number }, "provider": string,
  "engineVersion": "v11"|"v12"|"v13",
  "recipe"?: EvalRecipe, "diagnostics"?: { "backend": string, "vaultId": string,
  "candidateCount": number, "perItem": object[] } }`

> **v2.0.9+**: Optional recipe fields (`recipe_id`, `recipe_spec`,
> `recipe_trial_id`) link the eval run to a context recipe. When present, the
> response includes a `recipe` object alongside the existing `metrics` wrapper.
> Recipe spec validation produces `recipeWarnings` for unrecognized
> stream kinds or type mismatches but does not reject the request. Legacy
> requests without recipe fields are fully compatible and return the
> unchanged `{ evalRunId, metrics }` shape.

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
Record explicit feedback on a context query.
- **Auth**: writer+
- **Body**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "note"?: string }`

> **v2.0.9+**: This endpoint is **optional legacy input**. The primary learning
> signal in v2.0.9 comes from passive agent-observable signals (use counts,
> staleness, governance auto-decisions, supersede/contradiction chains). Normal
> users are not asked to label or score memory quality. This endpoint is
> preserved for backward compatibility with v1.x integrations that send
> explicit feedback.

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

> **v2.0.9+**: `contentPreview` is now redacted for **any** memory carrying
> `riskTags`, regardless of active/confirmed status. Previously, active or
> confirmed memories with risk tags leaked their content through the Evidence
> Ledger preview. This fix ensures sensitive-tagged content is never exposed
> in ledger views.

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

## Repo Graph (v2.1)

The repo graph surface exposes Lore's deterministic repository index — files,
symbols, imports, calls, routes, tests, and process hints — so agents ground
repository answers in a stable project-context contract. All routes are
read-only and return `503` when repo graph storage is not configured.

### `POST /v1/repo/graph/query`
Query repository graph files, symbols, and relations.
- **Auth**: reader+
- **Body**: `{ "query": string, "repo_id"?: string, "repo"?: string,
  "limit"?: number (1-100), "kind"?: string, "include_relations"?: boolean }`
- **Response 200**: repository graph query result.

### `POST /v1/repo/symbol/context`
Read definition, callers, callees, tests, and relations for one indexed symbol.
- **Auth**: reader+
- **Body**: requires one of `symbol_id` / `qname` / `name`, plus optional
  `file_path`, `repo_id`, `repo`, `kind`, `include_tests`.
- **Response 200**: repository symbol context.

### `POST /v1/repo/impact`
Analyze reverse graph impact for an indexed symbol or file.
- **Auth**: reader+
- **Body**: requires one of `symbol_id` / `qname` / `name` / `file_path`, plus
  optional `repo_id`, `repo`, `depth` (1-10), `limit` (1-500).
- **Response 200**: repository impact result.

### `POST /v1/repo/detect-changes`
Map unified diff hunks to indexed repo symbols and impacted tests.
- **Auth**: reader+
- **Body**: requires one of `diff_text` / `diff`, plus optional `repo_id`,
  `repo`, `base_ref`.
- **Response 200**: repository change impact result.

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
| `eval_run` | no | Run legacy or v12/v13 recipe eval against dataset |
| `trace_get` | no | Inspect trace by id |
| `repo.graph_query` | no | Query repository graph files, symbols, and relations |
| `repo.symbol_context` | no | Read definition, callers, callees, and tests for a symbol |
| `repo.impact` | no | Analyze reverse graph impact for a symbol or file |
| `repo.detect_changes` | no | Map diff hunks to indexed symbols and impacted tests |

JSON-RPC error codes:
- `-32602` Invalid params (zod validation failure)
- `-32603` Internal error (sanitized; original written to stderr)

Run with the official SDK transport:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## Context Recipes (v2.0.9 Wave 0)

The `@lore/eval` package exports context recipe types for programmatic use in
eval harnesses and gate scripts. These are pure TypeScript types — no REST API
endpoint is exposed.

### `ContextRecipeSpec`

Pre-configured retrieval knob surface:

```typescript
interface ContextRecipeSpec {
  id: string;                                              // e.g. "default-v209"
  version: string;                                         // e.g. "2.0.9"
  label: string;                                           // Human-readable label
  description: string;                                     // Prose description (≥10 chars)
  enabledStreams: MemorySearchStreamKind[];                // Active retrieval streams
  weights: Partial<Record<MemorySearchStreamKind, number>>;// Per-stream RRF weights
  temporalFilterEnabled: boolean;                          // Enable temporal validity filtering
  rerankerEnabled: boolean;                                // Enable post-fusion reranker
  rrfK?: number;                                           // RRF damping constant (default 60)
  perStreamTimeoutMs?: number | null;                      // Per-stream timeout; null = no timeout
  candidateLimit?: number;                                 // Max candidates per stream (default 80)
  finalLimit?: number;                                     // Final result count (default 10)
  minPipelineVersion?: string;                             // Minimum pipeline version required
}
```

### `ContextRecipeTrial`

Single eval run of a recipe against a dataset:

```typescript
interface ContextRecipeTrial {
  recipeId: string;
  trialId: string;
  timestamp: string;                                       // ISO-8601
  dataset: { name: string; version: string; itemCount: number };
  engineVersion: string;                                   // e.g. "v14"
  metrics: ContextRecipeTrialMetrics;                      // recallAtK, precisionAtK, mrr, ndcgAtK, negativeHitRate, latencyP95Ms
  perGroup: Record<string, { recallAtK, mrr, negativeHitRate?, caseCount }>;
  streamCandidateCounts?: Partial<Record<MemorySearchStreamKind, number>>;
  ablationConfigId?: string;
  datasetSha256?: string;
}
```

### `PromotionDecision`

Structured gate read-out comparing a trial recipe against the baseline:

```typescript
interface PromotionDecision {
  recipeId: string;
  trialId: string;
  baselineRecipeId: string;
  decision: "promote" | "reject" | "hold";
  reason: string;
  comparedMetrics: Record<string, { baseline: number; trial: number; delta: number }>;
  minUplift: number;
  timestamp: string;
  engineVersion: string;
}
```

### `decidePromotion()`

Pure function that compares trial metrics against a baseline and returns a
`PromotionDecision`. Uses the standard higher-is-better / lower-is-better
convention from the v1.2 gate.

### Passive Agent-Evidence Dataset Generator (v2.0.9+)

`generatePassiveEvalDataset()` builds `EvalDatasetV12` cases from passive agent
evidence traces (Evidence Ledger style inputs). Supports all six case types:

| Case Type | Description | Expected | Negative | Query Intent |
|---|---|---|---|---|
| `positive_recall` | Memory was used in context | Memory ID in top-K | None | `semantic` |
| `stale_memory` | Stale memory was correctly ignored | Empty (no stale in top-K) | Stale memory ID | `temporal` |
| `negative_leak` | Risky memory must not leak | Empty (no risky in top-K) | Risky memory ID | `negative` |
| `conflict_resolution` | Conflicting memory resolved | Winner memory ID | Conflicting memory ID | `relation` |
| `temporal_update` | Temporal-scoped recall | Memory ID at valid_at | None | `temporal` |
| `stream_coverage` | Cross-stream recall | Memory ID via streams | None | `semantic` |

The generator is deterministic: same inputs produce the same dataset with
SHA-256 hashed case IDs and content redaction via `redactSensitiveContent()`.
Project-scoped filtering is supported via the `projectId` option.

```typescript
import { generatePassiveEvalDataset } from "@lore/eval";

const { dataset, counts, datasetSha256 } = generatePassiveEvalDataset(traces, {
  projectId: "my-project",
  maxCasesPerType: 100,
});
```

### `mapRecipeToAdapterConfig()`

`@lore/search` export that maps `RecipeKnobs` to a partial
`SearchAdapterV14Config`. Does NOT duplicate fusion logic — the adapter owns
that.

### Recipe Artifacts

- **Schema**: `ops/context-recipe.schema.json` (JSON Schema draft-2020-12)
- **Default recipe**: `ops/context-recipes/default-v209.json`
- **Gate script**: `node scripts/ops/check-context-recipes.mjs [--promotion-gate]`

## OpenAPI

The formal OpenAPI 3.1 document is served from `GET /openapi.json` and verified by:

```bash
pnpm openapi:check
```

This prose reference remains the human-oriented companion.
