# Code Knowledge Graph — MCP Tools Reference

Lore v2.0.4 ships seven MCP tools for querying the code knowledge graph. All tools are scoped to the vault associated with your API key — no explicit `vault_id` argument is needed. All tools forward their arguments as JSON to `POST /v1/code-graph/<endpoint>` on the Lore API and return the parsed response.

---

## Quick reference

| Tool | Purpose | Endpoint |
|---|---|---|
| `code.search` | Hybrid semantic + text search over symbols | `/v1/code-graph/search` |
| `code.context` | Symbol metadata + all incoming and outgoing relations | `/v1/code-graph/context` |
| `code.callgraph` | BFS call-chain subgraph from a given symbol | `/v1/code-graph/callgraph` |
| `code.references` | All symbols that reference a given target | `/v1/code-graph/references` |
| `code.impact` | Blast-radius closure of references up to depth N | `/v1/code-graph/impact` |
| `code.list_repos` | List all indexed repos in the vault | `/v1/code-graph/repos` |
| `code.search_text` | Regex search over symbol names and doc comments | `/v1/code-graph/search-text` |

Plus the extended `context_query` tool with `mode: "code"` for integrated memory + code retrieval.

---

## `code.search`

Hybrid search combining BM25 trigram matching on `name`, `qualified_name`, and `signature` with dense embedding (cosine similarity on 1024-dim Qwen3 vectors), re-ranked with Reciprocal Rank Fusion (RRF).

### Input

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | `string` | Yes | — | Natural-language or identifier query. |
| `repo` | `string` | No | All repos in vault | Restrict to a specific `code_repos.name`. |
| `top_k` | `number` | No | `20` | Number of results to return. |

### Return shape

```json
{
  "results": [
    {
      "qname": "AuthService.login",
      "kind": "method",
      "signature": "login(email: string, password: string): Promise<Session>",
      "doc_comment": "Authenticates a user and returns a session token.",
      "file_path": "src/auth/auth.service.ts",
      "start_line": 42,
      "end_line": 67,
      "score": 0.91
    }
  ]
}
```

### Example from Claude Code

```
Use code.search with query "user authentication login" in repo "my-repo" to find the login function.
```

Expected response (abbreviated): the `results` array lists the top-K matching symbols with file paths and line ranges you can navigate to directly.

### When to use

Use `code.search` when you know what functionality you're looking for but not the exact symbol name. It's the right starting point for exploration. For exact qualified-name lookup, use `code.context` directly.

---

## `code.context`

Returns the full structural context of a symbol: its metadata, every relation where it is the source (outgoing), and every relation where it is the target (incoming). Equivalent to a single-hop neighborhood in the code graph.

### Input

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `qname` | `string` | Yes | — | Qualified name of the symbol, e.g. `AuthService.login`. |
| `repo` | `string` | No | All repos in vault | Restrict lookup to a specific repo. |

### Return shape

```json
{
  "symbol": {
    "qname": "AuthService.login",
    "kind": "method",
    "signature": "login(email: string, password: string): Promise<Session>",
    "doc_comment": "Authenticates a user and returns a session token.",
    "file_path": "src/auth/auth.service.ts",
    "start_line": 42,
    "end_line": 67,
    "is_exported": true
  },
  "incoming": [
    {
      "src_qname": "UserController.handleLogin",
      "kind": "calls",
      "src_file_path": "src/api/user.controller.ts",
      "src_start_line": 88
    }
  ],
  "outgoing": [
    {
      "dst_qname": "SessionRepository.create",
      "kind": "calls",
      "dst_file_path": "src/session/session.repository.ts",
      "dst_start_line": 14
    }
  ]
}
```

`incoming` corresponds to rows in `code_relations` where `dst_symbol_id` is the target symbol. `outgoing` corresponds to rows where `src_symbol_id` is the target symbol.

### Example from Claude Code

```
Use code.context for qname "AuthService.login" to show me what calls it and what it calls.
```

### When to use

Use `code.context` when you have a specific symbol and need its full one-hop neighborhood. If you need a multi-hop call chain, use `code.callgraph`. If you only need the reverse direction (who calls it), use `code.references`.

---

## `code.callgraph`

BFS traversal of `calls` relations starting from a given symbol, up to the specified depth. The server executes a recursive CTE bounded by `depth`.

### Input

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `qname` | `string` | Yes | — | Root symbol to start from. |
| `depth` | `number` | No | `2` | BFS depth, 1–5. Depth 1 = direct callees only. |
| `repo` | `string` | No | All repos in vault | Restrict to a specific repo. |

### Return shape

```json
{
  "nodes": [
    {
      "qname": "AuthService.login",
      "kind": "method",
      "file_path": "src/auth/auth.service.ts",
      "start_line": 42
    },
    {
      "qname": "SessionRepository.create",
      "kind": "method",
      "file_path": "src/session/session.repository.ts",
      "start_line": 14
    }
  ],
  "edges": [
    {
      "src_qname": "AuthService.login",
      "dst_qname": "SessionRepository.create",
      "kind": "calls"
    }
  ]
}
```

### Example from Claude Code

```
Use code.callgraph for qname "AuthService.login" with depth 3 to show me the full call chain.
```

### When to use

Use `code.callgraph` to understand what a function eventually calls — useful for understanding side effects and dependency scope. For the reverse direction (what calls a given function, transitively), use `code.impact`.

---

## `code.references`

Reverse-index lookup: all symbols that have a `code_relations` row pointing at the given target. Returns the same `Reference` shape as `incoming[]` from `code.context`, but without the symbol metadata.

### Input

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `qname` | `string` | Yes | — | Target symbol to find references to. |
| `repo` | `string` | No | All repos in vault | Restrict to a specific repo. |

### Return shape

```json
{
  "references": [
    {
      "src_qname": "UserController.handleLogin",
      "kind": "calls",
      "src_file_path": "src/api/user.controller.ts",
      "src_start_line": 88
    },
    {
      "src_qname": "AdminController.impersonate",
      "kind": "calls",
      "src_file_path": "src/api/admin.controller.ts",
      "src_start_line": 201
    }
  ]
}
```

### Example from Claude Code

```
Use code.references for qname "Logger.log" to find every symbol that calls it.
```

### When to use

Use `code.references` when you want a flat list of direct callers. Use `code.impact` when you want the full transitive closure (all symbols that would be affected if this symbol's signature changed).

---

## `code.impact`

Blast-radius analysis: the transitive closure of `code.references` up to depth N. Useful for assessing the risk of modifying a symbol.

The server uses the same recursive CTE as `code.references` but drives it to the requested depth. The invariant `code.impact(X, depth=∞) == BFS closure of code.references(X)` is enforced by the implementation. Results are capped at 500 symbols per page; use `cursor` for pagination.

### Input

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `qname` | `string` | Yes | — | Target symbol to analyze. |
| `depth` | `number` | No | `5` | Maximum BFS depth. Use a high number (e.g., `99`) for full closure. |
| `repo` | `string` | No | All repos in vault | Restrict to a specific repo. |
| `cursor` | `string` | No | — | Pagination cursor from a previous response. |

### Return shape

```json
{
  "symbols": [
    {
      "qname": "UserController.handleLogin",
      "kind": "method",
      "file_path": "src/api/user.controller.ts",
      "start_line": 88,
      "depth_from_target": 1
    }
  ],
  "total": 47,
  "cursor": "eyJvZmZzZXQiOjUwMH0="
}
```

`total` is the count of all matching symbols before pagination. If `total > 500`, use the returned `cursor` in a subsequent call to fetch the next page.

### Example from Claude Code

```
Use code.impact for qname "Logger.log" with depth 5 to show me how many symbols would be affected if I changed its signature.
```

### When to use

Use `code.impact` before modifying a widely-used symbol to understand the blast radius. A `total` above ~50 suggests the change requires broad test coverage or a careful migration plan.

---

## `code.list_repos`

Lists all code repos indexed in the current vault. The `last_indexed_at` field is the staleness signal — there is no separate `code.is_stale` tool.

### Input

No arguments. The vault is resolved from the API key.

### Return shape

```json
{
  "repos": [
    {
      "name": "my-repo",
      "primary_lang": "typescript",
      "total_files": 342,
      "total_symbols": 4891,
      "total_relations": 7204,
      "last_indexed_at": "2026-05-13T18:42:00Z",
      "e2e_encrypted": false
    }
  ]
}
```

To compute staleness locally: `Date.now() - new Date(last_indexed_at).getTime() > thresholdMs`. A repo is stale if its `last_indexed_at` predates your most recent `git commit` by more than the acceptable lag for your workflow.

### Example from Claude Code

```
Use code.list_repos to show me what's indexed and when it was last updated.
```

### When to use

Call `code.list_repos` at the start of a session to confirm the repo is indexed and not stale before issuing search or context queries.

---

## `code.search_text`

Lightweight regex/grep over `name` and `doc_comment` columns using the Postgres `~` operator. Faster than `code.search` for exact-string or simple-regex queries, and does not require the embedding worker to have run.

Important: this tool searches only symbol names and doc comments. Function bodies are not stored in the database — this is an architectural privacy invariant, not a missing feature.

### Input

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `pattern` | `string` | Yes | — | POSIX regular expression (Postgres `~` operator syntax). Case-sensitive by default; prefix with `(?i)` for case-insensitive. |
| `repo` | `string` | No | All repos in vault | Restrict to a specific repo. |
| `limit` | `number` | No | `50` | Maximum number of results. |

### Return shape

```json
{
  "results": [
    {
      "qname": "Logger.log",
      "kind": "method",
      "name": "log",
      "doc_comment": "Logs a message at the INFO level.",
      "file_path": "src/logger/logger.ts",
      "start_line": 18,
      "end_line": 24
    }
  ]
}
```

### Example from Claude Code

```
Use code.search_text with pattern "Logger\\.log" to find every symbol named "log" in the Logger namespace.
```

### When to use

Use `code.search_text` for exact identifier lookup or simple patterns. Use `code.search` when you want semantic matching (e.g., "functions that authenticate users" rather than a literal string).

---

## `context_query` with `mode: "code"`

The existing `context_query` MCP tool gains a `mode: "code"` value in v2.0.4. When invoked, it runs `code.search` → fetches `code.context` for each top hit → interleaves the result with the standard memory context response. This is the recommended way to get unified memory + code context in a single call.

### Input (code mode)

| Argument | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | Yes | Natural-language query. |
| `mode` | `"code"` | Yes | Set to `"code"` to activate code graph retrieval. |
| `repo` | `string` | No | Restrict code search to a specific repo. |
| `top_k` | `number` | No | Number of code symbols to include (default 10). |

### Return shape

The response envelope follows the standard `context_query` shape with an additional `code_context` field:

```json
{
  "memory_context": [ ... ],
  "code_context": [
    {
      "symbol": { "qname": "AuthService.login", "kind": "method", ... },
      "incoming": [ ... ],
      "outgoing": [ ... ]
    }
  ]
}
```

### Example from Claude Code

```
Use context_query with mode "code" and query "user authentication flow" to get both memory and code context about how login works.
```

### When to use

Use `context_query mode="code"` when you want to combine what the AI has remembered about a topic (conversation memory) with the structural code context for that topic. Use the individual `code.*` tools when you need precise control over what is retrieved.

---

## Error handling

All tools raise an error with a human-readable message when the API returns a non-2xx status:

| HTTP status | Error message |
|---|---|
| 400 | `bad request` |
| 401 / 403 | `permission denied` |
| 404 | `not found` |
| 409 | `conflict` |
| 422 | `unprocessable request` |
| Other | `operation failed` |

If a tool returns `not found` for a `qname` you expect to exist, confirm with `code.list_repos` that the repo has been indexed recently. The symbol may not yet be in the graph if the indexer has not run since that symbol was added.

---

## Vault scoping

All tools enforce vault isolation server-side via the caller's API key. You cannot query symbols from a different vault, even if you know a `qname` that exists there. Two vaults using the same symbol names never interfere with each other.
