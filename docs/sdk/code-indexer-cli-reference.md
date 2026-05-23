# `lore-index` CLI Reference

Complete reference for the `lore-index` command-line tool shipped by `@lore-context/code-indexer` (TypeScript) and `lore-context-code-indexer` (Python). Both packages expose an identical CLI surface.

---

## Synopsis

```
lore-index --full
lore-index --incremental
lore-index --since <git-sha>
lore-index install-git-hook
lore-index --help
```

---

## Environment variables

All upload commands require these variables to be set. There are no CLI flags for credentials — use environment variables or your CI secrets store.

| Variable | Required | Default | Description |
|---|---|---|---|
| `LORE_AUTH_TOKEN` | Yes (TS SDK) | — | API key for authentication. Passed as `Authorization: Bearer <token>`. |
| `LORE_API_KEY` | Yes (Python SDK) | — | Same purpose as `LORE_AUTH_TOKEN`; the Python package uses this name. |
| `LORE_VAULT_ID` | Yes | — | Vault ID that uploaded symbols will be scoped to. |
| `LORE_API_URL` | No | `https://api.lorecontext.com` | Override the Lore API base URL. Use only for self-hosted deployments. |
| `LORE_REPO_NAME` | No | `basename` of current working directory | Logical repository name stored in `code_repos.name`. Changing this creates a second repo entry rather than updating the existing one. |

---

## Commands

### `lore-index --full`

Indexes the entire repository from the current working directory. Walks all files recursively, skipping `node_modules/`, `.git/`, `dist/`, `build/`, `__pycache__/`, `.venv/`, `vendor/`, and `target/`.

Files are batched in groups of 200 (default) and uploaded via `POST /v1/code-graph/upsert`. Upserts are idempotent — running `--full` twice on an unchanged repo is safe and produces no duplicate rows.

**Exit codes:** `0` on success, `1` if any upload error occurred (parse errors and privacy-filter rejections do not count as upload errors).

**Example:**

```bash
export LORE_AUTH_TOKEN=lore_abc123
export LORE_VAULT_ID=vault_xyz
npx lore-index --full
```

**Output:**

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

The `IndexStats` fields:

| Field | Type | Description |
|---|---|---|
| `filesProcessed` | `number` | Files successfully parsed and uploaded. |
| `filesRejected` | `number` | Files skipped by the privacy filter (size limit, denylist path patterns, or Zod schema rejection). Not an error. |
| `symbolsExtracted` | `number` | Total symbol records included in uploaded payloads. |
| `relationsExtracted` | `number` | Total relation records included in uploaded payloads. |
| `uploadErrors` | `number` | Number of upsert HTTP calls that returned a non-2xx status. |
| `elapsedMs` | `number` | Wall-clock time in milliseconds for the entire run. |

---

### `lore-index --incremental`

Indexes only files changed in the last commit (`git diff --name-only HEAD~1 HEAD`). Falls back to a full index if no previous commit exists (first commit) or if `git diff` returns an empty list.

Designed to be run from a git post-commit hook. Each changed file is indexed individually via `indexFile()`, so the command exits as soon as all changed files are processed.

**Exit codes:** Same as `--full`.

**Example (manual):**

```bash
npx lore-index --incremental
```

**Example (in a script after `git commit`):**

```bash
git commit -m "feat: add login endpoint"
npx lore-index --incremental
```

---

### `lore-index --since <git-sha>`

Indexes files changed between `<git-sha>` and `HEAD` (`git diff --name-only <sha> HEAD`). Useful for CI pipelines where you know the before-SHA of a push event.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `<git-sha>` | `string` | Yes | Any valid git commit SHA or ref (e.g., `abc1234`, `HEAD~5`, `origin/main`). |

**Exit codes:** `1` if `--since` is provided without a SHA argument. Otherwise same as `--full`.

**Examples:**

```bash
# Index all files changed since a specific commit
npx lore-index --since abc1234def567

# CI: index files changed in this push (GitHub Actions)
npx lore-index --since ${{ github.event.before }}

# Index files changed in the last 5 commits
npx lore-index --since HEAD~5
```

---

### `lore-index install-git-hook`

Writes a `post-commit` shell hook to `.git/hooks/post-commit` in the current working directory. The hook runs `lore-index --incremental` after every successful `git commit`.

The hook inherits `LORE_AUTH_TOKEN`, `LORE_VAULT_ID`, and `LORE_API_URL` from the shell environment at commit time. These must be set in your shell profile (e.g., `~/.zshrc`) for the hook to work without manual exports.

If `.git/hooks/post-commit` already exists, the command appends the `lore-index --incremental` invocation rather than overwriting the file, so existing hook logic is preserved.

**No environment variables required** for this subcommand — it only writes a file.

**Example:**

```bash
cd /path/to/my-repo
npx lore-index install-git-hook
# Writes: .git/hooks/post-commit
```

**To uninstall:** Remove the `lore-index --incremental` line from `.git/hooks/post-commit`, or delete the file if it was empty before installation.

**Windows note:** Native Windows git hooks are not supported in v2.0.4. Use WSL2 with a Linux shell to run the hook.

---

### `lore-index --help` / `lore-index -h`

Prints the usage message and exits with code `0`. Also triggered when no arguments are given.

---

## File discovery rules

The indexer processes files with these extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.py`, `.go`, `.rs`, `.java`, `.c`, `.cc`, `.cpp`, `.cxx`, `.cs`, `.rb`, `.php`.

These directories are always skipped regardless of content: `node_modules`, `.git`, `dist`, `build`, `__pycache__`, `.venv`, `vendor`, `target`.

Files are additionally rejected by the privacy filter if they match any of the path patterns in the [Tier-1 denylist](../privacy/code-graph-privacy-model.md#tier-1-denylist) or exceed 500 KB.

---

## Programmatic API (TypeScript)

The CLI is a thin wrapper over the `CodeIndexer` class. To embed indexing in your own tooling:

```typescript
import { CodeIndexer, indexFull } from "@lore-context/code-indexer";

// Class API — more control
const indexer = new CodeIndexer({
  repoPath: "/absolute/path/to/repo",   // required
  repoName: "my-repo",                  // required
  apiBaseUrl: "https://api.lorecontext.com",
  authToken: process.env.LORE_AUTH_TOKEN!,
  vaultId: process.env.LORE_VAULT_ID!,
  batchSize: 200,  // optional; default 200 files per upsert call
});

const stats = await indexer.indexFull();

// Convenience function — equivalent to new CodeIndexer(opts).indexFull()
const stats2 = await indexFull({
  repoPath: process.cwd(),
  repoName: "my-repo",
  apiBaseUrl: "https://api.lorecontext.com",
  authToken: process.env.LORE_AUTH_TOKEN!,
  vaultId: process.env.LORE_VAULT_ID!,
});
```

`CodeIndexerOptions` fields:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `repoPath` | `string` | Yes | — | Absolute path to the repository root. |
| `repoName` | `string` | Yes | — | Logical name stored in `code_repos.name`. |
| `apiBaseUrl` | `string` | Yes | — | Lore API base URL. |
| `authToken` | `string` | Yes | — | Bearer token for authentication. |
| `vaultId` | `string` | Yes | — | Vault ID for scoping uploads. |
| `ignored` | `string[]` | No | `[]` | Additional glob patterns to skip (passed to chokidar and the walker). |
| `batchSize` | `number` | No | `200` | Number of `FilePayload` records per upsert HTTP call. |
