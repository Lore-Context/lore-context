# Qwen Code

Status: REST API and local stdio MCP launcher are available. Qwen Code actual
client validation is complete for MCP discovery and one tool call:
`qwen mcp list` connects to Lore, and a non-interactive Qwen Code run invoked
`mcp__lore__context_query` against a temporary Lore API.

## Recommended Path

- Use Lore as a small MCP server in front of Lore REST and local `agentmemory`.
- Keep Qwen Code on the high-level Lore tools, not raw `agentmemory` endpoints.

## Local Setup

Start Lore first:

```bash
pnpm quickstart -- --dry-run
pnpm build
PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api
```

Register the MCP server in project scope at `.qwen/settings.json`:

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
      },
      "includeTools": ["context_query", "memory_search", "memory_get", "memory_list", "trace_get"],
      "timeout": 30000
    }
  }
}
```

This repository includes that project config with the relative command
`node apps/mcp-server/dist/index.js`.

If `LORE_API_KEY` is configured on the API, add the same key under `env`.

Qwen Code also supports registering servers with the CLI. Use the JSON file
when doing copy-paste validation because it is easier to inspect and review.

Prefer a narrow client-side tool allowlist:

```json
["context_query", "memory_search", "memory_get", "memory_list", "trace_get"]
```

## Lore Usage Pattern

- Use `context_query` as the default entry point for prompt context assembly.
- Add `memory_write` only for explicit user preferences or stable project rules.
- Use `trace_get` when debugging context quality or source attribution.
- Use `memory_update` or `memory_supersede` instead of overwriting durable facts outside Lore.

Smoke the path:

```bash
pnpm config:integrations
pnpm smoke:mcp
```

Troubleshooting:

- If Qwen Code reports invalid JSON-RPC, avoid `pnpm start`; MCP stdio should run `node apps/mcp-server/dist/index.js`.
- If Lore returns `401` or `403`, pass `LORE_API_KEY` in the MCP `env`.
- If port `3000` is unavailable, set `LORE_API_URL` to the live API port.
- If project-scoped keys fail, include the expected `project_id` in tool calls.
- If agentmemory is offline, start with Lore's local memory/search tools and defer sync.
- If Qwen Code shows the server as disconnected, verify the absolute command
  path, `cwd`, environment variables, and timeout in `.qwen/settings.json`.
- If a non-interactive prompt needs to exercise tools, pass
  `--allowed-mcp-server-names lore` and an auth method such as OpenRouter or an
  OpenAI-compatible endpoint.

## Notes

- The project plan explicitly expects Qwen Code to be MCP-first.
- The MCP launcher must be started with `node .../dist/index.js`; do not wrap it in `pnpm start` because MCP stdio requires stdout to contain only JSON-RPC messages.
