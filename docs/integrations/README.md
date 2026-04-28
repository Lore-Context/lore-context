# Integration Guides

These guides document the Lore Context integration contract against the current local MVP.

## Current Repo Status

- The repo now includes a local REST API, context router/composer, optional JSON-file persistence, optional Postgres runtime store, traces, memory import/export, eval provider comparison, API-served dashboard HTML, standalone Next.js dashboard, and an `agentmemory` adapter boundary.
- `apps/mcp-server/src/index.ts` provides a runnable stdio JSON-RPC MCP launcher that proxies tools to the Lore REST API through `LORE_API_URL` and forwards `LORE_API_KEY` as a Bearer token when configured. It supports the legacy built-in stdio loop and the official `@modelcontextprotocol/sdk` stdio transport via `LORE_MCP_TRANSPORT=sdk`.
- The docs below are integration contracts. API-first integrations can use the local REST server today; MCP-capable clients can use the local stdio launcher after `pnpm build`.

## Shared Design

- MCP-capable clients should connect to a small Lore MCP server, not to raw `agentmemory`.
- API-first clients should call Lore REST endpoints, with `POST /v1/context/query` as the main read path.
- `POST /v1/context/query` accepts `mode`, `sources`, `freshness`, `token_budget`, `writeback_policy`, and `include_sources` so clients can force or disable memory/web/repo/tool-trace routing when needed.
- Lore wraps the local `agentmemory` runtime through `packages/agentmemory-adapter`.
- Local `agentmemory` is expected at `http://127.0.0.1:3111`.

## Available MCP Surface

- `context_query`
- `memory_write`
- `memory_search`
- `memory_forget`
- `memory_list`
- `memory_get`
- `memory_update`
- `memory_supersede`
- `memory_export`
- `eval_run`
- `trace_get`

## Available REST Surface

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` with optional `project_id`, `scope`, `status`, `memory_type`, `q`, and `limit`
- `GET /v1/memory/:id`
- `PATCH /v1/memory/:id`
- `POST /v1/memory/:id/supersede`
- `GET /v1/memory/export`
- `POST /v1/memory/import`
- `GET /v1/governance/review-queue`
- `POST /v1/governance/memory/:id/approve`
- `POST /v1/governance/memory/:id/reject`
- `POST /v1/events/ingest`
- `POST /v1/eval/run`
- `GET /v1/eval/providers`
- `GET /v1/eval/runs`
- `GET /v1/eval/runs/:id`
- `GET /v1/traces`
- `GET /v1/traces/:id`
- `POST /v1/traces/:id/feedback`
- `GET /v1/audit-logs`

## Local API Smoke

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

The automated smoke path is:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Local MCP Smoke

The MCP launcher reads newline-delimited JSON-RPC over stdin and writes only JSON-RPC messages to stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Do not launch this through `pnpm start` from an MCP client because package-manager banners would pollute stdout.

## Private Deployment Alignment

The private demo packaging in [docs/deployment/README.md](/Users/shuanbaozhu/Desktop/Lore/docs/deployment/README.md) assumes:

- Lore API and dashboard run as long-lived containers.
- Postgres is the default durable store for shared demos.
- The MCP launcher stays a stdio process close to the client, or runs as the optional `mcp` compose service on demand.
- Demo seeding comes from [examples/demo-dataset/import/lore-demo-memories.json](/Users/shuanbaozhu/Desktop/Lore/examples/demo-dataset/import/lore-demo-memories.json), while eval smoke comes from [examples/demo-dataset/eval/lore-demo-eval-request.json](/Users/shuanbaozhu/Desktop/Lore/examples/demo-dataset/eval/lore-demo-eval-request.json).

For private deployments, point client launchers at the private API URL and provide the smallest role that fits:

- `reader`: dashboard and read-only copilots.
- `writer`: agents that should write memory, feedback, or eval runs.
- `admin`: import, export, governance, audit, and forget flows.

## Deployment-Aware Client Templates

### Claude Code

Prefer a workstation-local stdio process that targets the private API:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY="${WRITE_KEY:?set WRITE_KEY}" \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

If you use the packaged MCP container instead of `node .../dist/index.js`, keep the same `LORE_API_URL` / `LORE_API_KEY` pair and run the stdio launcher via `docker compose run --rm mcp`.

### Cursor

Cursor-style MCP JSON should keep the launcher local and only change the API target and key:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_READER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Use a `writer` key only when Cursor workflows intentionally write back durable project memory.

### Qwen Code

Qwen-style `mcpServers` JSON follows the same boundary:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_WRITER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Use `reader` for search-only retrieval assistants and `writer` for agentic flows that need `memory_write`, `memory_update`, or `trace` feedback tools.

## Safe Defaults

- Prefer `stdio` locally for MCP; use authenticated streamable HTTP only when remote transport is required.
- Treat SSE as legacy compatibility, not the default path.
- Whitelist tools with `includeTools` or the client equivalent.
- Do not enable broad trust modes by default.
- Require `reason` on mutating operations.
- Keep `memory_forget` on soft delete unless an admin deliberately sets `hard_delete: true` for controlled removal.
- Use `LORE_API_KEYS` role separation for shared local or remote API exposure: `reader` for read-only clients, `writer` for agent writeback, and `admin` only for sync/import/export/forget/governance/audit operations. Add `projectIds` to scope client keys to the projects they may see or mutate.
- Keep `agentmemory` bound to `127.0.0.1`.
- Do not expose the raw `agentmemory` viewer or console publicly.
- Current live `agentmemory` 0.9.3 contract: `remember`, `export`, `audit`, and `forget(memoryId)` are usable for Lore sync/contract tests; `smart-search` searches observations and should not be treated as proof that newly remembered memory records are directly searchable.
