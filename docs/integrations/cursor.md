# Cursor

Status: REST API and local stdio MCP launcher are available. Use the JSON template below for Cursor MCP configuration.

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

Add Lore to Cursor's MCP JSON configuration:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/Users/shuanbaozhu/Desktop/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<optional API key>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

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
- If project-scoped keys fail, include a matching `project_id` in `memory_write` and `context_query`.
- If agentmemory is offline, keep using `context_query`, `memory_search`, and `trace_get`; raw agentmemory sync can wait.

## Notes

- The project plan groups Cursor with the first-wave MCP client docs.
- The stdio launcher now exposes high-level Lore tools and proxies them to `LORE_API_URL`; avoid raw `agentmemory` tools in Cursor.
