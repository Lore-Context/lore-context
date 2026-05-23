# @lore-context/code-indexer

TypeScript client and CLI for the Lore Context code knowledge graph. It indexes repository structure locally and uploads only privacy-filtered metadata: symbol names, signatures, doc comments, file paths, line ranges, and graph relations.

## Install

```bash
pnpm add @lore-context/code-indexer
```

## Quick start

```bash
export LORE_API_KEY=your_api_key
pnpm exec lore-index --full
pnpm exec lore-index --incremental
pnpm exec lore-index install-git-hook
```

The indexer must not upload function bodies, string literals, variable values, `.env` files, private keys, or files denied by `.gitignore`. See `docs/sdk/code-indexer-quickstart.md` and `docs/privacy/code-graph-privacy-model.md` for the full developer and privacy contract.
