# Claude Code

Status: REST API and local stdio MCP launcher are available. Lore is not replacing Claude Code's native memory files in the current repo state.

## Recommended Path

- Use Lore as an external MCP context layer.
- Keep Claude Code's own `CLAUDE.md` and auto-memory features separate from Lore's control plane.

## Local Setup

Start Lore first:

```bash
pnpm quickstart -- --dry-run
pnpm build
PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api
```

Register Lore as a project-scoped Claude Code MCP server:

```bash
claude mcp add --scope project lore \
  --env LORE_API_URL=http://127.0.0.1:3000 \
  --env LORE_MCP_TRANSPORT=sdk \
  -- node <path-to-lore-context>/apps/mcp-server/dist/index.js
```

If the API is protected with `LORE_API_KEY`, include it as another environment variable:

```bash
claude mcp add --scope project lore \
  --env LORE_API_URL=http://127.0.0.1:3000 \
  --env LORE_API_KEY="$LORE_API_KEY" \
  --env LORE_MCP_TRANSPORT=sdk \
  -- node <path-to-lore-context>/apps/mcp-server/dist/index.js
```

Check registration:

```bash
claude mcp list
claude mcp get lore
```

- Prefer read tools first: `context_query`, `memory_search`, `trace_get`.
- Add mutating tools only when the workflow truly needs write-back.
- Do not opt into broad trust-by-default behavior.

Smoke the path:

```bash
pnpm config:integrations
pnpm smoke:mcp
```

Troubleshooting:

- If stdout contains package-manager banners, run the built server with `node apps/mcp-server/dist/index.js`, not `pnpm`.
- If Claude says `Invalid environment variable format`, put the server name before the `--env` flags as shown above. Current Claude CLI treats `--env` as a variadic option.
- If Lore returns `401` or `403`, pass the same `LORE_API_KEY` that protects the API.
- If port `3000` is already in use, set `LORE_API_URL` to the API port you actually started.
- If project-scoped keys fail, include the matching `project_id` in write/query calls.
- If agentmemory is offline, use Lore's local memory paths or start with `LORE_AGENTMEMORY_REQUIRED=0` during local testing.

## Migration and Portability

- Import `CLAUDE.md` and Claude auto-memory files into Lore through the planned MIF-like import path.
- Treat Lore as the portable, auditable copy of long-lived context, not as a hidden replacement for Claude's built-in memory.

## Notes

- The plan calls out Claude Code as a compatibility integration, not the primary product surface.
- The REST API includes import/export paths; the stdio MCP runtime is available and proxies to `LORE_API_URL`.
