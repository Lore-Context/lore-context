# Code Indexer Quickstart

Current package versions: `@lore-context/code-indexer@0.1.0` and `lore-context-code-indexer@0.1.0`.

Get your repository indexed in the Lore Code Knowledge Graph in under 10 minutes.

## What this does

The code indexer runs on your machine, parses your source files with Tree-sitter, and uploads a structural skeleton — symbol names, signatures, doc comments, call/import/inheritance relations — to Lore Cloud. Function bodies, string literals, and variable values never leave your machine. See [What's transmitted vs what stays local](#whats-transmitted-vs-what-stays-local) and the [privacy model](../privacy/code-graph-privacy-model.md) for the full contract.

Once indexed, seven MCP tools (`code.search`, `code.context`, `code.callgraph`, `code.references`, `code.impact`, `code.list_repos`, `code.search_text`) become available in any MCP-compliant agent, including Claude Code and Cursor.

## Prerequisites

- Node.js 20 LTS or later (TypeScript SDK) **or** Python 3.11 or later (Python SDK)
- A Lore API key — get one at [app.lorecontext.com/settings/api-keys](https://app.lorecontext.com/settings/api-keys)
- A vault ID — shown on the same settings page, or via `code.list_repos` after setup

---

## Step 1 — Install the SDK

**TypeScript / JavaScript projects:**

```bash
npm install --save-dev @lore-context/code-indexer
```

The package ships a `lore-index` CLI binary via `npx`.

**Python projects:**

```bash
pip install lore-context-code-indexer
```

This installs the `lore-index` CLI entry point and the `lore_code_indexer` Python package. Tree-sitter grammars for Python, TypeScript, and Go are bundled automatically. If a grammar binary fails to build on your platform, the indexer logs a warning and continues without that language.

---

## Step 2 — Configure credentials

Set three environment variables before running any upload command:

```bash
export LORE_AUTH_TOKEN=your_api_key_here
export LORE_VAULT_ID=your_vault_id_here
# LORE_API_URL defaults to https://api.lorecontext.com — only set this for self-hosted
```

For the Python SDK the variable name for the auth token is `LORE_API_KEY` (the Python package uses this name; the TS package uses `LORE_AUTH_TOKEN`). Both SDKs share the same `LORE_VAULT_ID` and `LORE_API_URL` variables.

Add these to your shell profile or CI secrets store. Never commit them to source control.

For existing SDK setup documentation see [docs/sdk/README.md](./README.md).

---

## Step 3 — Run the initial full index

From your repository root:

```bash
# TypeScript SDK
npx lore-index --full

# Python SDK
lore-index --full
```

Expected output:

```
[lore-index] Starting full index...
[lore-index] Done. {
  filesProcessed: 342,
  filesRejected: 18,
  symbolsExtracted: 4891,
  relationsExtracted: 7204,
  uploadErrors: 0,
  elapsedMs: 12400
}
```

`filesRejected` counts files skipped by the privacy filter (files matching `.gitignore`, files over 500 KB, and files matching the secret-file denylist such as `*.env`, `*.pem`, `*.key`). Rejections are expected and are not errors.

The indexer skips `node_modules/`, `.git/`, `dist/`, `build/`, `__pycache__/`, `.venv/`, `vendor/`, and `target/` directories automatically.

---

## Step 4 — Keep the index up to date

**Option A — Git post-commit hook (recommended):**

```bash
lore-index install-git-hook
```

This writes a `post-commit` hook to `.git/hooks/post-commit` that runs `lore-index --incremental` automatically after every commit. The incremental mode only re-indexes files changed in the last commit, so it's fast enough to run inline.

**Option B — CI pipeline:**

Add to your CI workflow after the build step:

```bash
lore-index --full   # or --since $BEFORE_SHA for incremental
```

**Option C — Continuous file watcher (TypeScript SDK, programmatic):**

```typescript
import { FileWatcher, CodeIndexer } from "@lore-context/code-indexer";

const indexer = new CodeIndexer({
  repoPath: process.cwd(),
  repoName: "my-repo",
  apiBaseUrl: process.env.LORE_API_URL ?? "https://api.lorecontext.com",
  authToken: process.env.LORE_AUTH_TOKEN!,
  vaultId: process.env.LORE_VAULT_ID!,
});

const watcher = new FileWatcher({
  rootDir: process.cwd(),
  onBatch: async (paths) => {
    for (const p of paths) await indexer.indexFile(p);
  },
});

watcher.start();
```

The watcher debounces changes with a 500 ms trailing window and flushes at most three times per second under sustained load.

---

## Step 5 — Verify with `code.list_repos`

From Claude Code (once the MCP server is configured — see [integration guide](./code-graph-integration-claude-code.md)):

```
Use code.list_repos to show me all indexed repos in my vault.
```

Expected response shape:

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

If `repos` is empty, check that `LORE_VAULT_ID` matches the vault your API key belongs to.

To check whether the index is stale, compare `last_indexed_at` against the timestamp of your most recent commit:

```bash
git log -1 --format="%cI"
```

If the index is more than a few minutes behind your latest commit and you have the git hook installed, run `lore-index --incremental` manually.

---

## What's transmitted vs what stays local

The privacy filter is enforced architecturally via a sealed Zod schema (`UpsertPayloadSchema` with `.strict()` on every field). Any attempt to include an unknown field — including a function body, string literal, or variable value — raises a `ZodError` and drops the file before upload.

**Transmitted to Lore Cloud (Tier-1 default):**

| Field | Description |
|---|---|
| Symbol names and qualified names | e.g., `AuthService.login`, `src/auth.ts:AuthService.login` |
| Signatures | Parameter list and return type only — no body bytes |
| Doc comments | JSDoc / docstring text, with secret patterns redacted |
| Relative file paths | e.g., `src/auth/login.ts` |
| Line and column ranges | Start/end of each symbol |
| Relation edges | `A calls B`, `A imports B`, `A extends B` |
| File content hash and AST hash | XXH3 hex digests — not the file contents |

**Never leaves your machine:**

- Function bodies
- String literals and variable values / initializers
- In-body comments
- Raw file contents
- Files matching `.gitignore`
- Files over 500 KB
- Files matching the hard-coded denylist: `*.env`, `*.envrc`, `*.pem`, `*.key`, `*.crt`, `secrets.*`, `id_rsa*`, filenames containing `credential`, `secret`, or `private-key`
- Secret patterns in doc comments (Stripe keys, GitHub tokens, AWS access keys, PEM blocks, Anthropic keys) are redacted with the sentinel `«[REDACTED:secret-pattern]»` before upload

**Tier-2 (Pro, opt-in):** Symbol names, signatures, and doc comments are encrypted client-side before upload. The server stores ciphertext. File paths, line ranges, relation kinds, and graph topology remain visible to Lore Cloud. This is symbol-name obfuscation, not end-to-end encryption — see the [privacy model](../privacy/code-graph-privacy-model.md#tier-2-residual-leakage) for the precise residual-leakage statement.

---

## Supported languages

| Language | Tier | Symbol extraction | Call resolution |
|---|---|---|---|
| TypeScript / JavaScript / TSX / JSX | 1 | Yes | Yes (≥85% precision) |
| Python | 1 | Yes | Yes (≥85% precision) |
| Go | 1 | Yes | Yes (≥85% precision) |
| Rust | 2 | Yes | No |
| Java | 2 | Yes | No |
| C / C++ | 2 | Yes | No |
| C# | 2 | Yes | No |
| Ruby | 2 | Yes | No |
| PHP | 2 | Yes | No |

Tier-1 languages get full LSP-style call resolution. Tier-2 languages get symbol extraction and approximate relation detection. Languages not in this table (Dart, Swift, Kotlin, Lua, etc.) are deferred to v2.1.

---

## Troubleshooting

**`LORE_AUTH_TOKEN and LORE_VAULT_ID must be set`** — export both variables before running any upload command. They cannot be read from a `.env` file automatically; use `export` in your shell or pass them via CI secrets.

**`uploadErrors: N` in the stats output** — the indexer printed the specific error above the stats line. Common causes: expired API key, wrong vault ID, or a temporary network issue. Re-run after fixing credentials; upserts are idempotent so re-indexing a file that already uploaded is safe.

**All files are `filesRejected`** — if your project root is inside a directory matching a denylist pattern (e.g., a checkout under a path containing `secrets`), the relative-path check may fire. Run from the actual repo root or set `LORE_REPO_NAME` to a clean name. Check the console output for `Rejected: path matches secret-file pattern` messages.

**Grammar warning for a specific language** — the Tree-sitter grammar binary for that language failed to load. Symbols for files in that language will be empty, but other languages continue normally. Check that your Node.js version is 20 LTS or later.
