# @lore-context/server

MCP stdio server for Lore Context. It proxies MCP tool calls to a running Lore
API through `LORE_API_URL`.

## Hosted SaaS usage

Use this mode when the Lore dashboard gives you an `lct_service_...` connection
token for `https://api.lorecontext.com/mcp`.

The source package line is `1.1.0-beta`. Until the v1.1 npm package is actually
published and fresh-install verified, use the already published rc package.

```bash
LORE_HOSTED_MCP_URL=https://api.lorecontext.com/mcp \
LORE_API_KEY=lct_service_xxx \
LORE_MCP_TRANSPORT=sdk \
npx -y @lore-context/server@1.0.0-rc.2
```

## Local API usage

```bash
LORE_API_URL=http://127.0.0.1:3000 \
LORE_MCP_TRANSPORT=sdk \
npx -y @lore-context/server@1.0.0-rc.2
```

Optional environment variables:

- `LORE_API_URL`: Lore API base URL. Defaults in registry metadata to
  `http://127.0.0.1:3000` for npm installs.
- `LORE_API_KEY`: Bearer token for a protected Lore API.
- `LORE_HOSTED_MCP_URL`: remote hosted MCP endpoint. When set, stdio requests
  are relayed to that endpoint instead of calling a local Lore API directly.
- `LORE_MCP_TRANSPORT`: set to `sdk` for the official MCP SDK stdio transport.

This package does not start the Lore API. For a local API, clone the repository
and run:

```bash
pnpm quickstart -- --dry-run --activation-report
pnpm build
PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api
```
