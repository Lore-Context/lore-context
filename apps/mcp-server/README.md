# @lore-context/server

MCP stdio server for Lore Context. It proxies MCP tool calls to a running Lore
API through `LORE_API_URL`.

## Usage

```bash
LORE_API_URL=http://127.0.0.1:3000 \
LORE_MCP_TRANSPORT=sdk \
npx -y @lore-context/server@0.6.0-alpha.1
```

Optional environment variables:

- `LORE_API_URL`: Lore API base URL. Defaults in registry metadata to
  `http://127.0.0.1:3000` for npm installs.
- `LORE_API_KEY`: Bearer token for a protected Lore API.
- `LORE_MCP_TRANSPORT`: set to `sdk` for the official MCP SDK stdio transport.

This package does not start the Lore API. For a local API, clone the repository
and run:

```bash
pnpm quickstart -- --dry-run --activation-report
pnpm build
PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api
```
