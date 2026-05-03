# MCP Registry Metadata

Status: published to the Official MCP Registry on 2026-04-29.

Use this as the canonical input when maintaining the Official MCP Registry
listing or creating MCP hub / gallery listings for Lore Context. Human review is
required before submitting any additional third-party listing.

## Official Registry Readiness

The official MCP Registry is for publicly accessible MCP servers. Server
metadata must point to a public install method, such as an npm package, public
OCI image, or public remote server.

Current publication paths:

- `server.json` lists both npm and OCI package entries.
- npm package: `@lore-context/server@0.6.0-alpha.1`.
- OCI image: `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.1`.
- MCP server name: `io.github.Lore-Context/lore-context-mcp`.
- `mcp-publisher validate` succeeds locally.
- npm org `@lore-context` exists; the package page is public; `npm view` returns
  package metadata; `npm dist-tag ls` returns `alpha` and `latest`; fresh
  install from a temporary directory succeeded; the installed
  `lore-context-server` returned 11 tools from MCP `tools/list`.
- The public repository workflow `publish-mcp-registry.yml` builds, smokes,
  pushes the GHCR image, authenticates with `github-oidc`, and publishes the
  registry entry. The private cloud repository records the status but does not
  own the public Registry publication workflow.
- GitHub Actions run `25120707303` succeeded.
- GHCR package `lore-context-mcp` is public, and anonymous Docker manifest
  lookup succeeds.
- Official Registry search returns `active`, `isLatest: true`, and
  `publishedAt: 2026-04-29T16:23:19.42298Z`.

## Listing

```json
{
  "name": "Lore Context",
  "slug": "lore-context",
  "summary": "Local-first control plane for AI-agent memory, eval, governance, and Evidence Ledger traces.",
  "description": "Lore Context gives MCP-compatible agents a governed memory path: query durable context, write memory with policy checks, inspect Evidence Ledger traces, run evals on your own data, and export/import memory through a portable MIF-style format.",
  "category": ["agent-memory", "mcp", "eval", "governance", "observability"],
  "license": "Apache-2.0",
  "repository": "https://github.com/Lore-Context/lore-context",
  "website": "https://lorecontext.com",
  "runtime": "npm / OCI / node>=22",
  "transport": "stdio",
  "npm": "@lore-context/server@0.6.0-alpha.1",
  "image": "ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.1",
  "environment": {
    "LORE_API_URL": "http://127.0.0.1:3000",
    "LORE_API_KEY": "<reader-or-writer-key>",
    "LORE_MCP_TRANSPORT": "sdk"
  }
}
```

## Tool Surface

| Tool | Purpose | Suggested role |
|---|---|---|
| `context_query` | Compose governed context for an agent answer | reader |
| `memory_search` | Search memory without composing a full context block | reader |
| `memory_get` | Inspect one memory record | reader |
| `memory_list` | Filter memory inventory | reader |
| `memory_write` | Propose or confirm new memory | writer |
| `memory_update` | Update existing memory fields | writer |
| `memory_supersede` | Replace a stale memory with a new version | writer |
| `memory_forget` | Soft-delete by default, hard-delete only by explicit admin action | admin |
| `memory_export` | Export MIF-style memory with provenance | admin |
| `eval_run` | Run retrieval eval on a supplied dataset | writer |
| `trace_get` | Inspect trace and Evidence Ledger data | reader |

## Setup Copy

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install
pnpm quickstart -- --dry-run --activation-report
pnpm build
PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api
```

In the MCP client, point the server command at:

```bash
node /absolute/path/to/lore-context/apps/mcp-server/dist/index.js
```

For an npm-based client install:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
LORE_MCP_TRANSPORT=sdk \
npx -y @lore-context/server@0.6.0-alpha.1
```

## Verification

Before submitting a new version of this metadata, run:

```bash
pnpm build
pnpm smoke:mcp
pnpm smoke:api
pnpm openapi:check
/tmp/mcp-publisher validate
```

## Human Review Checklist

- Alpha status is visible.
- No claim of hosted public SaaS.
- No benchmark win claim without a linked public report.
- No secrets, local machine paths, private customer names, or private hostnames.
- Registry-specific schema validates.
- Listing URL resolves to the public repository and public website only.
