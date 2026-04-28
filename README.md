# Lore Context

Lore Context is an AI-agent context control plane. The current MVP is a local-first TypeScript monorepo for memory, context composition, evaluation, migration, governance, and MCP integration.

## Current Milestone

Phase 1 local MVP kernel.

## Current Status

- Implemented today: workspace package scaffolds, shared TypeScript build/test pipeline, Lore memory/context/eval/audit types, `agentmemory` adapter boundary, local REST API, context router/composer, JSON-file persistence, optional Postgres runtime store with incremental upsert flushing, memory detail/edit/supersede/forget flows with explicit hard delete, real memory-use accounting, trace feedback, governance-preserving MIF-like import/export, secret scanning, direct session-based eval metrics, provider comparison eval runs, eval run listing, API-key protection with reader/writer/admin roles, governance review queue, audit-log API, API-served dashboard HTML, standalone Next.js dashboard, demo seed data, integration config generation, private Docker/Compose packaging, and legacy plus official-SDK stdio MCP transports.
- Current repo health: `pnpm build` and `pnpm test` both pass at the workspace root on the latest verification run.
- `pnpm smoke:api` starts the built API, writes memory, composes context, renders the dashboard, restarts the API, and verifies persisted memory survives.
- `pnpm smoke:postgres` starts the local pgvector Postgres service, runs the API with `LORE_STORE_DRIVER=postgres`, writes memory, restarts the API, and verifies the memory survives through Postgres.
- `pnpm smoke:mcp` validates both the legacy JSON-RPC stdio transport and the official `@modelcontextprotocol/sdk` stdio transport.
- `pnpm smoke:dashboard` starts a temporary API and production Next dashboard, then uses Playwright Chromium to verify the operator UI renders memory, traces, and eval results.
- `pnpm smoke:agentmemory` validates the live local `agentmemory` contract when it is running, and records the current 0.9.3 behavior that smart-search searches observations rather than freshly remembered memories.
- `pnpm seed:demo` loads the packaged `demo-private` memory/eval dataset into a running local API; `pnpm eval:report` exports the latest eval run as Markdown or JSON.
- Planned but not implemented yet: managed cloud sync and hosted multi-tenant billing.
- Integration docs in [`docs/integrations/README.md`](docs/integrations/README.md) include runnable local MCP setup templates for Qwen-style `mcpServers` JSON, Claude Code, and Cursor.
- Private deployment docs and Compose packaging live in [`docs/deployment/README.md`](docs/deployment/README.md).

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres
pnpm smoke:agentmemory
pnpm seed:demo
pnpm run doctor
pnpm config:integrations
pnpm eval:report -- --project-id demo-private
pnpm clean
docker compose up -d postgres
pnpm db:schema
pnpm db:schema:dry-run
pnpm --filter @lore/api test
pnpm --filter @lore/mcp-server test
pnpm --filter @lore/agentmemory-adapter test
```

Run the local API:

```bash
pnpm build
PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api
```

Run the standalone Next.js dashboard after the API is up:

```bash
LORE_API_URL=http://127.0.0.1:3000 pnpm dev:dashboard
```

Run the local MCP launcher after the API is up:

```bash
LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Use the official MCP SDK stdio transport by setting `LORE_MCP_TRANSPORT=sdk`:

```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Do not wrap the MCP command in `pnpm start`; MCP stdio clients require stdout to contain only JSON-RPC messages.

Smoke test:

```bash
pnpm smoke:api
curl http://localhost:3000/health
curl -X POST http://localhost:3000/v1/memory/write \
  -H "Content-Type: application/json" \
  -d '{"content":"Use Qwen for Lore Context.","memory_type":"project_rule","project_id":"demo"}'
curl -X POST http://localhost:3000/v1/context/query \
  -H "Content-Type: application/json" \
  -d '{"query":"继续 Qwen 最新 文档","project_id":"demo","token_budget":1200}'
```

Optional local configuration starts from `.env.example`. Do not put production cloud keys or raw provider secrets in committed files.

Set `LORE_API_KEY` before any remote exposure. With no API keys configured, Lore only accepts unkeyed development traffic from loopback hosts. When a key is configured, every route except `/health` requires `Authorization: Bearer <key>` or `x-lore-api-key`; the legacy single key is treated as `admin`.

For local role separation, set `LORE_API_KEYS` to a JSON array:

```bash
LORE_API_KEYS='[{"key":"read-local","role":"reader","projectIds":["demo"]},{"key":"write-local","role":"writer","projectIds":["demo"]},{"key":"admin-local","role":"admin"}]'
```

The packaged private demo uses project id `demo-private`:

```bash
LORE_API_KEYS='[{"key":"read-local","role":"reader","projectIds":["demo-private"]},{"key":"write-local","role":"writer","projectIds":["demo-private"]},{"key":"admin-local","role":"admin"}]'
```

Roles:

- `reader`: dashboard, context query, search, memory list/detail, traces, eval results, integration health.
- `writer`: reader permissions plus memory write/update/supersede, events, eval runs, trace feedback.
- `admin`: all routes, including sync, import/export, soft or explicit hard delete, governance review, and audit logs.

Optional `projectIds` restricts a key to those projects. Scoped writer/admin keys must include an allowed `project_id` for mutating routes; scoped readers only see matching project memories, traces, eval runs, and audits. Full `agentmemory` sync requires an unscoped admin key because it can import cross-project data.

Postgres runtime storage is opt-in. The default remains in-memory or JSON-file storage. To run against Postgres:

```bash
docker compose up -d postgres
pnpm db:schema
LORE_STORE_DRIVER=postgres LORE_DATABASE_URL=postgres://lore:lore_dev_password@127.0.0.1:5432/lore_context PORT=3000 pnpm start:api
```

`pnpm db:schema` applies `apps/api/src/db/schema.sql` through `psql` using `LORE_DATABASE_URL`, `DATABASE_URL`, or the local docker-compose default. `pnpm smoke:postgres` does not require a local `psql`; it uses the API's auto-schema path against the Docker pgvector service.

Requirements:

- Node.js `>=22`
- pnpm `10.30.1`

## Structure

```text
apps/api
apps/dashboard
apps/mcp-server
apps/web
packages/shared
packages/agentmemory-adapter
packages/search
packages/mif
packages/eval
packages/governance
```

## Integration Docs

- [Integration overview](docs/integrations/README.md)
- [Qwen Code](docs/integrations/qwen-code.md)
- [Claude Code](docs/integrations/claude-code.md)
- [Cursor](docs/integrations/cursor.md)
- [OpenClaw](docs/integrations/openclaw.md)
- [Hermes](docs/integrations/hermes.md)
- [Dify](docs/integrations/dify.md)
- [FastGPT](docs/integrations/fastgpt.md)
- [Cherry Studio](docs/integrations/cherry-studio.md)
- [Roo Code](docs/integrations/roo-code.md)
- [OpenWebUI](docs/integrations/openwebui.md)

The detailed product plan is kept in `Lore_Context_项目计划书_2026-04-27.md`.
