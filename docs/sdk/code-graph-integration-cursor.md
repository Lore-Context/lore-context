# Code Knowledge Graph — Cursor Integration

Connect the Lore MCP server to Cursor so the seven code-graph tools are available in Cursor's AI features.

## Prerequisites

- Cursor 0.42 or later (MCP support is available from this version)
- Lore MCP server running locally or accessible via URL
- A Lore API key with code-graph access

---

## Step 1 — Configure the MCP server in Cursor

Cursor reads MCP server configuration from `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in the project root (per-project). Per-project configuration takes precedence.

### Per-project configuration (recommended)

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/path/to/lore-cloud/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Global configuration

To make Lore available in all Cursor projects, edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/path/to/lore-cloud/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

After saving, restart Cursor or reload the window (`Cmd+Shift+P` → "Reload Window") for the MCP server to be picked up.

---

## Step 2 — Verify the connection

Open Cursor's AI panel (Cmd+L or the chat sidebar). Ask:

```
Use code.list_repos to show me what code repos are indexed in my vault.
```

If the MCP server is connected, Cursor's AI will call the tool and return the list. If you see "tool not found", check the Cursor MCP settings panel under Settings → MCP to confirm the server appears with a green status indicator.

---

## Step 3 — Index your repository

Before querying, run the initial full index from your repo root in a terminal:

```bash
export LORE_AUTH_TOKEN=your_api_key_here
export LORE_VAULT_ID=your_vault_id_here
npx lore-index --full
```

See the [quickstart](./code-indexer-quickstart.md) for git hook setup so the index stays current automatically.

---

## Using the tools in Cursor

Invoke code-graph tools through natural-language prompts in the Cursor AI chat panel.

**Search for a function:**

```
Use code.search to find every function related to "user authentication" in repo "my-repo".
```

**Understand a symbol:**

```
Use code.context for qname "AuthService.login" to show me what calls it and what it calls.
```

**Trace a call chain:**

```
Use code.callgraph for qname "AuthService.login" with depth 3 to show me the full downstream call tree.
```

**Find all callers:**

```
Use code.references for qname "Logger.log" to find every function that calls it.
```

**Assess blast radius before a refactor:**

```
Use code.impact for qname "Logger.log" with depth 5 so I can see how many symbols would be affected if I change its signature.
```

**Exact name search:**

```
Use code.search_text with pattern "handlePayment" to find all symbols with that name.
```

---

## Kickstart example

The same workflow as Claude Code — find call sites, assess refactor risk:

```
Claude, use code.search to find every function that calls Logger.log in this repo.
Then use code.impact for qname "Logger.log" with depth 3 to show me the blast radius if I rename it.
```

---

## Workflow tip: combine with Cursor's native @ context

You can use Lore code-graph tools alongside Cursor's `@file` and `@codebase` references in the same prompt. For example:

```
@file src/auth/auth.service.ts
Use code.context for qname "AuthService.login" to augment the file I've shared with its call graph context.
```

This gives Cursor's AI both the raw file content and the structured graph context in a single turn.

---

## Staleness check

Before relying on code-graph results in a long session:

```
Use code.list_repos and tell me when "my-repo" was last indexed.
```

If the index is stale relative to your current branch, run `npx lore-index --incremental` in a terminal to update.
