# lore-context-code-indexer

Python client for the Lore Context code knowledge graph. Package: `lore-context-code-indexer`; current package version: `0.1.0`. Parses your repository with Tree-sitter, extracts structural metadata (symbol names, signatures, doc comments, call/import/inheritance relations), and uploads it to Lore Cloud. Function bodies, string literals, and variable values never leave your machine — the privacy filter is enforced architecturally via Pydantic sealed types.

## Installation

```bash
pip install lore-context-code-indexer
```

For Tree-sitter grammar support (Tier-1 languages: Python, TypeScript, Go), the package installs `tree-sitter-python`, `tree-sitter-typescript`, and `tree-sitter-go` automatically. If a grammar binary fails to build on your platform, the indexer logs a warning and continues with an empty symbol list for that language — no crash.

## Quick Start

```bash
# Set your Lore Cloud credentials
export LORE_API_KEY=your_api_key
export LORE_API_URL=https://api.lore.dev   # optional; this is the default

# Full index of the current repository
lore-index --full

# Index only files changed since last commit (incremental)
lore-index --incremental

# Index files changed since a specific git SHA
lore-index --since abc1234

# Install a post-commit hook so every commit triggers an incremental index
lore-index install-git-hook
```

## Programmatic Use

```python
from lore_code_indexer import CodeIndexer, index_full

# One-shot full index
stats = index_full(
    repo_root="/path/to/my/repo",
    repo_name="my-repo",
    api_base_url="https://api.lore.dev",
    api_key="your_api_key",
)
print(f"Uploaded {stats.files_uploaded} files, {stats.symbols_total} symbols")

# Incremental index of specific files
with CodeIndexer(
    repo_root="/path/to/my/repo",
    repo_name="my-repo",
    api_base_url="https://api.lore.dev",
    api_key="your_api_key",
) as indexer:
    stats = indexer.index_paths([Path("src/auth.py"), Path("src/models.py")])
```

## Privacy Model

The indexer enforces a strict allowlist of what may leave the client. Allowed: symbol names, qualified names, signatures (def line only), doc comments (with secret-pattern redaction), relative file paths, line/column ranges, and relation edges. Forbidden: function bodies, string literals, variable values, in-body comments, and any file matching `.gitignore`, size >500 KB, or the hard-coded filename denylist (`*.env`, `*.pem`, `*.key`, `secrets.*`, `id_rsa*`, and names containing `credential`, `secret`, or `private-key`).

Secret patterns in doc comments (Stripe keys, GitHub tokens, AWS access keys, PEM blocks, Anthropic keys) are automatically redacted before upload with the sentinel `«[REDACTED:secret-pattern]»`. The Pydantic models use `extra='forbid'` (equivalent to Zod `.strict()`) so any attempt to smuggle extra fields raises `ValidationError` at construction time.

See `docs/privacy/code-graph-privacy-model.md` in the Lore Cloud repository for the full privacy contract including Tier-2 E2E encryption details.
