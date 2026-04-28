# Getting Started

This guide walks you from zero to a running Lore Context instance with memory written,
context queried, and the dashboard reachable. Plan ~15 minutes total, ~5 minutes for the
core path.

## Prerequisites

- **Node.js** `>=22` (use `nvm`, `mise`, or your distro's package manager)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Optional) **Docker + Docker Compose** for the Postgres+pgvector path
- (Optional) **psql** if you prefer to apply the schema yourself

## 1. Clone and install

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
```

## 2. Fast local quickstart

`v0.5.0-alpha` adds a non-destructive quickstart helper. It checks Node/pnpm,
generates random local API keys, writes `data/quickstart.env`, and prints the first
`context.query` curl plus Claude Code, Cursor, and Qwen Code MCP snippets.

```bash
pnpm quickstart
```

For CI or docs validation without writing local env files:

```bash
pnpm quickstart -- --dry-run
```

After `pnpm quickstart`, start the API from the generated env:

```bash
source data/quickstart.env
PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api
```

Then seed demo data from another shell:

```bash
source data/quickstart.env
pnpm seed:demo
```

The script does not mutate global Claude Code, Cursor, or Qwen Code configuration.
It only prints config snippets that you can paste intentionally.

## 3. Generate real secrets manually

Lore Context refuses to start in production with placeholder values. Generate real keys
even for local development to keep your habits consistent.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

For multi-role local setups:

```bash
export READER_KEY=$(openssl rand -hex 32)
export WRITER_KEY=$(openssl rand -hex 32)
export ADMIN_KEY=$(openssl rand -hex 32)
export LORE_API_KEYS='[
  {"key":"'"$READER_KEY"'","role":"reader","projectIds":["demo"]},
  {"key":"'"$WRITER_KEY"'","role":"writer","projectIds":["demo"]},
  {"key":"'"$ADMIN_KEY"'","role":"admin"}
]'
```

## 4. Start the API manually (file-backed, no database)

The simplest path uses a local JSON file as the storage backend. Suitable for solo
development and smoke testing.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

In another shell, verify health:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Expected: `{"status":"ok",...}`.

## 5. Write your first memory

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{
    "content": "Use Postgres pgvector for Lore Context production storage.",
    "memory_type": "project_rule",
    "project_id": "demo",
    "scope": "project"
  }' | jq
```

Expected: a `200` response with the new memory's `id` and `governance.state` of either
`active` or `candidate` (the latter if the content matched a risk pattern such as a
secret).

## 6. Compose context

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{
    "query": "production storage",
    "project_id": "demo",
    "token_budget": 1200
  }' | jq
```

You should see a `contextBlock`, `memoryHits`, and a `traceId` that you can later use
to inspect routing, feedback, and the Evidence Ledger.

Inspect the Evidence Ledger for that trace:

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  http://127.0.0.1:3000/v1/evidence/ledger/<traceId> | jq
```

## 7. Start the dashboard

In a new terminal:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Open http://127.0.0.1:3001 in your browser. The browser will prompt for Basic Auth
credentials. Once authenticated, the dashboard renders memory inventory, traces, eval
results, and the governance review queue.

## 8. (Optional) Connect Claude Code via MCP

Add this to Claude Code's `claude_desktop_config.json` MCP servers section:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<paste your $LORE_API_KEY here>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Restart Claude Code. The Lore Context MCP tools (`context_query`, `memory_write`, etc.)
become available.

For other agent IDEs (Cursor, Qwen, Dify, FastGPT, etc.), see the integration matrix in
[docs/integrations/README.md](integrations/README.md).

## 9. (Optional) Switch to Postgres + pgvector

When you outgrow JSON-file storage:

```bash
docker compose up -d postgres
pnpm db:schema   # applies apps/api/src/db/schema.sql via psql
```

Then start the API with `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Run `pnpm smoke:postgres` to verify a write-restart-read round trip survives.

## 10. (Optional) Seed the demo dataset and run an eval

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

The eval report lands in `output/eval-reports/` as Markdown and JSON.

## Next Steps

- **Production deployment** — [docs/deployment/README.md](deployment/README.md)
- **API Reference** — [docs/api-reference.md](api-reference.md)
- **Architecture deep dive** — [docs/architecture.md](architecture.md)
- **Governance review workflow** — see the `Governance Flow` section in
  [docs/architecture.md](architecture.md)
- **Memory portability (MIF)** — `pnpm --filter @lore/mif test` shows round-trip examples
- **Contribute** — [CONTRIBUTING.md](../CONTRIBUTING.md)

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Another process is on port 3000 | `lsof -i :3000` to find it; or set `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Production mode without `DASHBOARD_BASIC_AUTH_USER/PASS` | Export the env vars or pass `LORE_DASHBOARD_DISABLE_AUTH=1` (dev only) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Any env matched `admin-local` / `change-me` / `demo` etc | Generate real values via `openssl rand -hex 32` |
| `429 Too Many Requests` | Rate limit triggered | Wait the cool-off window (default 30s after 5 auth failures); or set `LORE_RATE_LIMIT_DISABLED=1` in dev |
| `agentmemory adapter unhealthy` | Local agentmemory runtime not running | Start agentmemory or set `LORE_AGENTMEMORY_REQUIRED=0` for silent skip |
| MCP client sees `-32602 Invalid params` | Tool input failed zod schema validation | Check the `invalid_params` array in the error body |
| Dashboard 401 on every page | Wrong Basic Auth credentials | Re-export env vars and restart dashboard process |

## Getting Help

- File a bug: https://github.com/Lore-Context/lore-context/issues
- Security disclosure: see [SECURITY.md](../SECURITY.md)
- Contribute documentation: see [CONTRIBUTING.md](../CONTRIBUTING.md)
