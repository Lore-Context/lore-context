# Code Knowledge Graph — Privacy Model

This document is the customer-facing privacy contract for the Lore v2.0.4 Code Knowledge Graph. It covers what data leaves your machine, what Lore Cloud stores, and what residual information remains visible to Lore in each privacy tier.

This document is maintained under the Privacy v2 change-control process described in [Change control](#change-control). Any change to the allowlist, denylist, or residual-leakage statement requires a named reviewer and an incremented version stamp in the commit message.

**Current version:** 2.0.4-initial  
**Last reviewed:** 2026-05-13

---

## Enforcement model

Privacy in the code indexer is enforced architecturally, not by documentation promises.

The upload payload is constructed exclusively through `UpsertPayloadSchema.parse(...)` in `packages/sdk-typescript/code-graph-types.ts`. This Zod schema uses `.strict()` on every nested object, which means any attempt to include an unknown field — including a function body, string literal, or variable value — raises a `ZodError` at construction time and drops the file before upload. It is not possible to add a field to the payload without updating the schema and passing the CI gate (`pnpm payload:audit`).

The Python SDK uses equivalent Pydantic models with `extra='forbid'` (strict mode), which raises `ValidationError` on any extra field.

The server applies additional content-type-per-field validation on every incoming payload:

- `signature` fields are rejected if they contain embedded `{ ... }` body fragments (generic type parameters like `<T>` are allowed).
- `doc_comment` fields are rejected if they match the P7 secret-pattern regex denylist.
- `name` and `qualified_name` fields are validated as legal identifiers for the declared file language.

This means a buggy client that skips the client-side filter still cannot upload body content — the server rejects it with `400 code_graph.signature_invalid`.

---

## Tier-1 allowlist (default for all users)

These are the only fields that may appear in an upload payload. Every field listed here is explicitly present in the Zod schema in `packages/sdk-typescript/code-graph-types.ts`. No other fields are accepted.

### Repo-level fields

| Field | Type | Description |
|---|---|---|
| `repo.name` | `string` (identifier) | Logical repo name. Set via `LORE_REPO_NAME` or defaults to `basename(cwd)`. |
| `repo.primary_lang` | `string` (≤32 chars) | Dominant language of the repo (optional). |

### File-level fields (per `FilePayload`)

| Field | Type | Description |
|---|---|---|
| `relative_path` | `string` (≤4096 chars) | Repo-relative file path, e.g. `src/auth/login.ts`. Must not be an absolute path. |
| `language` | `enum` | One of: `typescript`, `javascript`, `tsx`, `jsx`, `python`, `go`, `rust`, `java`, `c`, `cpp`, `csharp`, `ruby`, `php`. |
| `content_hash` | `string` (16–64 hex chars) | XXH3 hex digest of the file body. The body itself is never transmitted. |
| `ast_hash` | `string` (16–64 hex chars) | XXH3 hex digest of the AST structural representation. |
| `last_modified_at` | `string` (ISO 8601 datetime) | File last-modified timestamp from `fs.statSync`. |
| `deleted` | `boolean` (optional) | `true` for deletion entries (file removed from repo). |

### Symbol-level fields (per `SymbolRecord`)

| Field | Type | Description |
|---|---|---|
| `name` | `string` (≤1024 chars, identifier regex) | Simple symbol name, e.g. `login`. |
| `qualified_name` | `string` (≤1024 chars, identifier regex) | Fully qualified name, e.g. `AuthService.login`. |
| `kind` | `enum` | One of: `function`, `method`, `class`, `interface`, `type`, `enum`, `const`, `module`, `variable`. |
| `signature` | `string` (≤4096 chars, optional) | Parameter list + return type only. No function body. |
| `doc_comment` | `string` (≤16384 chars, optional) | JSDoc / docstring / Doxygen text only. Secret patterns are redacted before upload (see P7 below). |
| `start_line` | `number` (integer ≥0) | Symbol start line. |
| `end_line` | `number` (integer ≥0) | Symbol end line. |
| `start_col` | `number` (integer ≥0, optional) | Symbol start column. |
| `end_col` | `number` (integer ≥0, optional) | Symbol end column. |
| `is_exported` | `boolean` | Whether the symbol is exported from its module. |
| `metadata` | `object` (optional) | Structural metadata only. Allowed keys: `language_specific`, `decorator_names` (string[]), `parameter_count` (number). No raw values. |

### Relation-level fields (per `RelationRecord`)

| Field | Type | Description |
|---|---|---|
| `src_qname` | `string` (≤1024 chars, identifier regex) | Source symbol qualified name. |
| `dst_qname` | `string` (≤1024 chars, identifier regex) | Destination symbol qualified name. |
| `kind` | `enum` | One of: `calls`, `imports`, `extends`, `implements`, `references`, `instantiates`, `overrides`. |
| `src_file_relative_path` | `string` (≤4096 chars, optional) | Source file path (for cross-file relations). |
| `dst_file_relative_path` | `string` (≤4096 chars, optional) | Destination file path (for cross-file relations). |

---

## Tier-1 denylist

The following categories are **forbidden** from appearing in any upload payload. The Zod schema's `.strict()` enforcement means these fields cannot be added without a schema change — they are rejected at construction time, not by a runtime check.

### Forbidden field categories

| Category | Examples | Enforcement |
|---|---|---|
| Function bodies | `body`, `source`, `function_body`, `source_bytes` | Not in schema — ZodError if present |
| String literals and variable values | `value`, `default_value`, `init`, `string_literal` | Not in schema — ZodError if present |
| In-body comments | `inline_comment`, `body_comment` | Not in schema — ZodError if present |
| Raw file contents | `content`, `file_contents`, `source_bytes` | Not in schema — ZodError if present |
| Test fixtures, env vars, config | Any file whose content is fixture data | Covered by path denylist below |

### Forbidden file path patterns

Files matching any of the following patterns are rejected before parsing. The check runs on both the filename and the full relative path.

| Pattern | Rationale |
|---|---|
| `*.env` | Environment files |
| `*.env.*` (e.g., `.env.production`) | Environment files with suffixes |
| `*.envrc` | direnv configuration |
| `*.pem` | PEM certificates and private keys |
| `*.key` | Key files |
| `*.crt` | Certificate files |
| `*.cer` | Certificate files |
| `*.pfx` | PKCS#12 key stores |
| `*.p12` | PKCS#12 key stores |
| `id_rsa` / `id_rsa.*` | SSH private keys |
| `id_dsa` / `id_dsa.*` | SSH private keys |
| `id_ecdsa` / `id_ecdsa.*` | SSH private keys |
| `id_ed25519` / `id_ed25519.*` | SSH private keys |
| `secrets.*` | Secret files by convention |
| Any filename containing `credential` (case-insensitive) | Credential files by convention |
| Any filename containing `private-key` or `private_key` (case-insensitive) | Private key files |
| Any filename containing `secret-key` or `secret_key` (case-insensitive) | Secret key files |
| `*.netrc` | netrc credentials |
| `*.htpasswd` | htpasswd credential files |

Additionally, files larger than **500 KB** are rejected before parsing. This limit prevents accidental indexing of generated or minified files.

Files listed in `.gitignore` are not indexed — the file watcher respects `.gitignore` via chokidar's `ignored` option, and the CLI walker skips common build/dependency directories (`node_modules`, `dist`, `build`, `.venv`, `vendor`, `target`, `__pycache__`).

### P7 secret-pattern denylist for doc comments

`doc_comment` fields are passed through `stripSecretPatterns()` before upload. Matched substrings are replaced with the sentinel `«[REDACTED:secret-pattern]»`. The server applies the same regex and rejects with `400` if any match survives (defense-in-depth).

The canonical regex list is defined in `packages/sdk-typescript/code-graph-types.ts::SECRET_PATTERN_DENYLIST`:

| Pattern | Matches |
|---|---|
| `sk[-_]live-or-test[-_][A-Za-z0-9]{10,}` | Stripe live/test secret keys |
| `sk[-_]proj[-_][A-Za-z0-9]{10,}` | Stripe project keys |
| `ghp_[A-Za-z0-9]{20,}` | GitHub personal access tokens |
| `github_pat_[A-Za-z0-9_]{20,}` | GitHub fine-grained PATs |
| `AKIA[0-9A-Z]{16}` | AWS access key IDs |
| `AIza[0-9A-Za-z_-]{20,}` | Google API keys |
| `-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----` | PEM blocks (private keys, certificates) |
| `sk-ant-[A-Za-z0-9_-]{20,}` | Anthropic API keys |
| `\b[a-f0-9]{40,128}\b` | High-entropy hex strings (heuristic; may have false positives) |

This list is intentionally narrow — high-precision, low-recall — to minimize false-positive churn. Patterns not on this list may still appear in doc comments. Users who store secrets in doc comments (this is bad practice) should also configure a secrets scanner such as `gitleaks` or `truffleHog` independently.

---

## Tier-2 residual leakage

Tier-2 is an opt-in Pro-tier feature that encrypts symbol names, signatures, and doc comments client-side before upload. The encryption is symbol-name obfuscation. It is **not** end-to-end encryption of your codebase.

When Tier-2 is enabled (`e2e_encrypted: true` in the payload):

- Every symbol `name`, `qualified_name`, `signature`, and `doc_comment` field is replaced with AES-256-GCM base64 ciphertext before upload. The plaintext never reaches the Lore API.
- Every relation `src_qname` and `dst_qname` field is also replaced with base64 ciphertext (the encrypted form of the symbol's `qualified_name`). Relation `kind` (calls/imports/extends/…) is **not** encrypted — this is part of the documented residual leakage.
- The encryption key is derived client-side from a user-controlled passphrase (scrypt; Argon2id planned for v2.0.4.1). The key never leaves the client.
- Server-side embedding search is disabled for Tier-2 repos (the server cannot embed ciphertext).
- `code.search` becomes client-mediated: the client downloads ciphertext blobs and decrypts locally.

**Wire format (Option A — discriminated union):** When `e2e_encrypted: true`, the payload uses `EncryptedSymbolRecordSchema` and `EncryptedRelationRecordSchema` (defined in `packages/sdk-typescript/code-graph-types.ts`) instead of the standard `SymbolRecordSchema` and `RelationRecordSchema`. The discriminated union ensures that the Tier-1 `IdentifierSchema` regex (which rejects base64 characters `+`, `/`, `=`) does not apply to Tier-2 payloads. The server applies `EncryptedSymbolRecordSchema`'s base64 regex validation to Tier-2 symbol fields, and skips per-field content-type validators (identifier/signature/secret-pattern checks) for encrypted repos.

**What remains visible to Lore Cloud in Tier-2 mode:**

| Data | Visible to Lore Cloud? | Notes |
|---|---|---|
| Symbol names / qualified names (plaintext) | No | Replaced with deterministic HMAC base64 |
| Symbol name / qname **equality** across the graph | **Yes — by design** | Same plaintext → same HMAC (required for relation resolution) |
| Signatures | No | Random-IV AES-256-GCM; no equality leak |
| Doc comments | No | Random-IV AES-256-GCM; no equality leak |
| Relative file paths | **Yes** | e.g., `apps/api/src/billing/stripe-client.ts` |
| Line ranges (start/end line) | **Yes** | Exact line numbers |
| Relation kinds | **Yes** | `calls`, `imports`, `extends`, etc. |
| Graph topology | **Yes** | Which encrypted symbol-node references which |
| File content hash / AST hash | **Yes** | Hashes only; not file contents |

The graph topology and file paths are sufficient for an adversary with database access to fingerprint the structure of the codebase and infer what the codebase does at a coarse level, even without decrypting any symbol names.

**Equality-leak trade-off (CRITICAL 6 fix, 2026-05-13):** Symbol `name` and `qualified_name`, and relation `src_qname` / `dst_qname`, are obfuscated via a **deterministic HMAC** (HMAC-SHA256 keyed by scrypt(passphrase, fixed-app-salt)). This means the same plaintext identifier produces the same ciphertext bytes across all calls and processes. The leak is required because the server's relation resolver must match `code_relations.dst_qname` to `code_symbols.qualified_name` bytewise to wire up the FK. Without deterministic obfuscation, every relation lands unresolved (`dst_symbol_id` NULL) and the graph is functionally broken in Tier-2 mode. The `signature` and `doc_comment` fields continue to use random-IV AES-256-GCM, so an attacker cannot tell whether two symbols share a signature or doc comment.

**Tier-2 is appropriate when:** you trust Lore not to exfiltrate your symbol names but want an additional layer of protection, and you accept that file paths, line ranges, and the call graph shape remain visible.

**Tier-2 is not appropriate when:** you need fully opaque storage (all structural metadata encrypted). This would require encrypting `code_relations` rows and serializing all edges as opaque identifiers. This capability is not available in v2.0.4 and is a v2.1 candidate item.

If you require a local-only deployment with no data leaving your machine at all, this product is not the right fit. Local-only alternatives are documented in [Code Graph vs alternatives](../sdk/code-graph-vs-gitnexus.md).

---

## Audit and transparency

Every upsert is logged with a payload summary (file count, symbol count, bytes) — no symbol contents are logged.

Running `pnpm code-graph:privacy-audit --vault <vault-id>` produces a human-readable report listing what categories of data are stored for a vault. The report shows symbol kind distribution, file language distribution, and relation kind distribution — not actual symbol names or file paths.

---

## Change control

This document is maintained under the Privacy v2 change-control process established in v1.9 Lane S.

Rules for updating this document:

1. Any change to the allowlist (adding or removing a permitted field) requires a PR with a named privacy reviewer listed in the commit message and PR body.
2. Any change to the denylist (adding or removing a rejected path pattern or secret-pattern regex) requires the same PR review, plus a corresponding update to `packages/sdk-typescript/code-graph-types.ts::SECRET_PATTERN_DENYLIST` and `packages/code-indexer/src/privacy-filter.ts::REJECT_FILENAME_PATTERNS`.
3. Any change to the Tier-2 residual-leakage statement requires operator approval (not just a developer PR).
4. The version stamp in the document header must be incremented on every merge.
5. `docs/privacy/README.md` must continue to link to this file after any rename.

The canonical implementation references for audit:

- Zod schema: `packages/sdk-typescript/code-graph-types.ts` — `UpsertPayloadSchema`, `SymbolRecordSchema`, `FilePayloadSchema`, `RelationRecordSchema`, `SECRET_PATTERN_DENYLIST`
- Client-side filter: `packages/code-indexer/src/privacy-filter.ts` — `REJECT_FILENAME_PATTERNS`, `checkFileRejection`, `applyPrivacyFilter`
- CI gate: `pnpm payload:audit` — asserts zero raw-object payload constructions at callsites
