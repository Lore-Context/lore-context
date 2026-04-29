# Cursor

Status: REST API and local stdio MCP launcher are available. Cursor Agent MCP
discovery is verified: `cursor-agent mcp enable/list/list-tools lore` discovers
the project config and lists 11 Lore tools. Prompt-level tool use is verified:
on 2026-04-29, `cursor-agent --print --model auto --force --approve-mcps`
called Lore `context_query`, returned trace
`ctx_479d26d6-d0b2-48ba-9bbe-7b0ac943c145`, matched seeded demo memory, and
then called `trace_get` with 2 retrieved / 2 used rows.

## Recommended Path

- Integrate Cursor through the same small Lore MCP surface used by other coding agents.
- Keep Cursor on Lore's high-level tools instead of exposing raw `agentmemory`.

## Local Setup

Start Lore first:

```bash
pnpm quickstart -- --dry-run
pnpm build
PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api
```

Add Lore to Cursor's project MCP JSON configuration at `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["<path-to-lore-context>/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<optional API key>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

This repository includes that project config with the relative command
`node apps/mcp-server/dist/index.js`.

If Cursor exposes per-server tool filtering, keep the default allowlist small:

```json
["context_query", "memory_search", "memory_get", "memory_list", "trace_get"]
```

## Lore Usage Pattern

- `context_query` is the main context assembly path.
- `memory_write` is for explicit, durable project facts only.
- `trace_get` is the debugging path for stale hits, conflicts, or missing provenance.
- `memory_supersede` is the safe path when a durable fact changes.

Smoke the path:

```bash
pnpm config:integrations
pnpm smoke:mcp
```

Troubleshooting:

- If Cursor shows JSON-RPC parse errors, run `node apps/mcp-server/dist/index.js` directly so stdout is JSON-RPC only.
- If Lore returns `401` or `403`, add `LORE_API_KEY` under the MCP server `env`.
- If port `3000` is already occupied, update both `LORE_API_URL` and the API start command.
- If `http://127.0.0.1:3000/health` does not return `{"service":"lore-api"}`,
  Cursor is pointing at the wrong local service. Use another port for Lore and
  update `.cursor/mcp.json` before validating.
- If project-scoped keys fail, include a matching `project_id` in `memory_write` and `context_query`.
- If agentmemory is offline, keep using `context_query`, `memory_search`, and `trace_get`; raw agentmemory sync can wait.
- If the desktop app works but the CLI cannot list MCP tools, record the exact
  Cursor version and whether `cursor-agent` is installed before counting the
  path as complete.
- If `cursor-agent` can list tools but prompt use fails with authentication,
  run `cursor-agent login` or set `CURSOR_API_KEY`; MCP discovery is already
  proven in that state.
- Cursor Agent Free plans require `--model auto`; named models fail with
  `Named models unavailable`.
- Headless prompt runs may reject MCP calls until a user approval mode is chosen.
  Use interactive approval, or use `--force` for an intentional local validation
  run against demo data.

## Notes

- The project plan groups Cursor with the first-wave MCP client docs.
- The stdio launcher now exposes high-level Lore tools and proxies them to `LORE_API_URL`; avoid raw `agentmemory` tools in Cursor.
