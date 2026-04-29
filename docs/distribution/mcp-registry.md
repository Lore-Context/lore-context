# MCP Registry Metadata

Status: draft source, not submitted.

Use this as the canonical input when creating MCP registry, hub, or gallery
listings for Lore Context. Human review is required before submission.

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
  "runtime": "node>=22",
  "transport": "stdio",
  "command": "node apps/mcp-server/dist/index.js",
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

## Verification

Before submitting this metadata, run:

```bash
pnpm build
pnpm smoke:mcp
pnpm smoke:api
pnpm openapi:check
```

## Human Review Checklist

- Alpha status is visible.
- No claim of hosted public SaaS.
- No benchmark win claim without a linked public report.
- No secrets, local machine paths, private customer names, or private hostnames.
- Registry-specific schema validates.
- Listing URL resolves to the public repository and public website only.

