# Qwen Code

Status: REST API and local stdio MCP launcher are available. Use the `mcpServers` template below for Qwen Code-style MCP clients that accept stdio server JSON.

## Recommended Path

- Use Lore as a small MCP server in front of Lore REST and local `agentmemory`.
- Keep Qwen Code on the high-level Lore tools, not raw `agentmemory` endpoints.

## Local Setup

Start Lore first:

```bash
pnpm build
PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api
```

Register the MCP server:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/Users/shuanbaozhu/Desktop/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000"
      }
    }
  }
}
```

If `LORE_API_KEY` is configured on the API, add the same key under `env`.

Prefer a narrow client-side tool allowlist when Qwen Code exposes one:

```json
["context_query", "memory_search", "memory_get", "memory_list", "trace_get"]
```

## Lore Usage Pattern

- Use `context_query` as the default entry point for prompt context assembly.
- Add `memory_write` only for explicit user preferences or stable project rules.
- Use `trace_get` when debugging context quality or source attribution.
- Use `memory_update` or `memory_supersede` instead of overwriting durable facts outside Lore.

## Notes

- The project plan explicitly expects Qwen Code to be MCP-first.
- The MCP launcher must be started with `node .../dist/index.js`; do not wrap it in `pnpm start` because MCP stdio requires stdout to contain only JSON-RPC messages.
