# Code Knowledge Graph — Claude Code Integration

Connect the Lore MCP server to Claude Code so the seven code-graph tools are available in every Claude Code session.

## Prerequisites

- Lore MCP server running locally or accessible via URL (see deployment docs)
- A Lore API key with code-graph access
- Claude Code installed (`npm install -g @anthropic-ai/claude-code` or the macOS app)

---

## Step 1 — Configure the MCP server

### Per-project configuration (recommended)

Create or edit `.claude/mcp.json` in your project root:

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

Replace `/path/to/lore-cloud/apps/mcp-server/dist/index.js` with the actual path to the compiled MCP server binary. If you are using the hosted Lore MCP server (when available), use the `url` form instead:

```json
{
  "mcpServers": {
    "lore": {
      "url": "https://mcp.lore-context.com",
      "headers": {
        "Authorization": "Bearer your_api_key_here"
      }
    }
  }
}
```

### Global configuration

To make Lore available in all Claude Code sessions, add the same block to `~/.claude.json` under `mcpServers`:

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

---

## Step 2 — Index your repository

Before querying, run the initial full index from your repo root:

```bash
export LORE_AUTH_TOKEN=your_api_key_here
export LORE_VAULT_ID=your_vault_id_here
npx lore-index --full
```

See the [quickstart](./code-indexer-quickstart.md) for full setup instructions including the git hook for automatic incremental updates.

---

## Step 3 — Verify the connection

Open a Claude Code session in your project directory. Ask Claude:

```
Use code.list_repos to show me what code repos are indexed in my vault.
```

If the MCP server is connected, Claude will call the tool and show you the indexed repos. If you see a tool-not-found error, check that the MCP server process started (look at the Claude Code MCP panel or run `claude mcp list`).

---

## Using the tools in Claude Code

Once connected, you invoke the code-graph tools through natural-language prompts. Claude Code translates your intent into the appropriate tool call.

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

**Combined memory and code context:**

```
Use context_query with mode "code" and query "billing and payment processing" to get both conversation memory and code context about how payments work.
```

---

## Kickstart example

A complete workflow — find every call site of a function, understand its context, and assess refactor risk:

```
Claude, use code.search to find every function that calls Logger.log in this repo.
Then use code.impact for qname "Logger.log" with depth 3 to show me the blast radius if I rename it.
```

Claude will execute both tool calls in sequence and return a combined answer showing the direct callers and the transitive impact set with counts.

---

## Staleness check

Before starting a session that depends on the code graph being current:

```
Use code.list_repos and tell me when "my-repo" was last indexed.
```

If the `last_indexed_at` timestamp is older than your most recent commit, run `npx lore-index --incremental` in a terminal to update before continuing.
