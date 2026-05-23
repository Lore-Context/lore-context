<!-- markdownlint-disable MD013 MD060 -->

# Lore Context — SDK docs

User-facing docs for the current Lore SDK surfaces:

- Generated API SDKs: `@lore-context/sdk` and `lore-context`
- LLM SDK middleware: `@lore-context/sdk-middleware` and `lore-context-middleware`
- Code knowledge graph indexers: `@lore-context/code-indexer` and `lore-context-code-indexer`
- MCP/server integration docs for agent tools that consume the code graph

Current stable package versions:

- `@lore-context/sdk@0.1.5`
- `lore-context@0.1.0`
- `@lore-context/sdk-middleware@0.1.0`
- `lore-context-middleware@0.1.0`
- `@lore-context/code-indexer@0.1.0`
- `lore-context-code-indexer@0.1.0`

Start with the [SDK matrix](./sdk-matrix.md) when choosing a package or release channel.

- [SDK package matrix](./sdk-matrix.md) — package, language, maturity, install command, supported scope, and release channel
- [Go SDK quickstart](./go-quickstart.md) — v2.0.7 beta API client examples and dry-run package verification
- TypeScript package README: `packages/sdk-typescript/README.md`
- Python package README: `packages/sdk-python/README.md`

## SDK middleware (v2.0.3+)

Use middleware when you already call an LLM SDK and want Lore memory injected before the model call and retained after the response.

| Doc | Audience |
|---|---|
| [middleware-quickstart.md](./middleware-quickstart.md) | 10-minute getting started for TS + Python |
| [middleware-modes.md](./middleware-modes.md) | When to use Hybrid vs Context vs Tools |
| [middleware-faq.md](./middleware-faq.md) | Token-budget overruns, retention loops, streaming, `with_options` |
| [migration-from-v2.0.2.md](./migration-from-v2.0.2.md) | 3-line migration recipe |
| [comparison-with-hermes-supermemory.md](./comparison-with-hermes-supermemory.md) | Feature matrix vs alternatives |
| [middleware-bench-baseline.md](./middleware-bench-baseline.md) | Z2 acceptance floor calibration |
| [sdk-matrix.md](./sdk-matrix.md) | Package versions, maturity, install commands, release channels, and v2.0.7 deferrals |

## Framework and fallback recipes

- [framework-fallback-recipes.md](./framework-fallback-recipes.md) — OpenAI Agents SDK, LangChain/LangGraph, REST/cURL, OpenTelemetry, and long-tail SDK deferrals.

## Code Knowledge Graph (v2.0.4)

- [Framework integration recipes](./framework-recipes.md) — OpenAI Agents SDK, LangChain/LangGraph, REST/cURL, OpenTelemetry correlation, and long-tail SDK deferrals

## Code Knowledge Graph (v2.0.4+)

- [OpenAI Agents SDK examples](./openai-agents.md)
- [LangChain and LangGraph examples](./langchain-langgraph.md)
- [REST/cURL fallback and OpenTelemetry guidance](./rest-curl-quickstart.md)
- [Go quickstart](./go-quickstart.md)
- [Java quickstart](./java-quickstart.md) and [Kotlin example](./kotlin-example.md)
- [.NET quickstart](./dotnet-quickstart.md)

## Code Knowledge Graph

The code knowledge graph indexes your repository's structural skeleton (symbol names, signatures, doc comments, call/import/inheritance relations) to Lore Cloud. Seven MCP tools let MCP-compliant agents query the graph instead of grepping source files.

- [Quickstart](./code-indexer-quickstart.md) — Install, run the first index, and verify in under 10 minutes
- [CLI Reference](./code-indexer-cli-reference.md) — Every flag of `lore-index`: `--full`, `--incremental`, `--since <sha>`, `install-git-hook`
- [MCP Tools Reference](./code-graph-mcp-tools.md) — All 7 tools with input schemas, return shapes, and examples
- [Claude Code Integration](./code-graph-integration-claude-code.md) — MCP server config and prompt examples for Claude Code
- [Cursor Integration](./code-graph-integration-cursor.md) — MCP server config and prompt examples for Cursor
- [Comparison with alternatives](./code-graph-vs-gitnexus.md) — Honest comparison against GitNexus, codebase-memory-mcp, Sourcegraph Cody, and Aider repo map

Privacy contract for the code knowledge graph: [Code Graph Privacy Model](../privacy/code-graph-privacy-model.md).

## Source of truth

- v2.0.7 SDK matrix: [sdk-matrix.md](./sdk-matrix.md)
- v2.0.3 plan: `docs/plans/v2.0.3-plan.md` (PR #206) — 39 acceptance criteria (S1-S10 / T1-T7 / U1-U5 / W1-W4 / X1-X4 / Y1-Y4 / Z1-Z5)
- v2.0.4 plan: `docs/plans/v2.0.4-plan.md` — Code Knowledge Graph across 8 lanes
- v2.0.7 SDK matrix and deferral ledger: `docs/sdk/sdk-matrix.md`
- API reference: `docs/api-reference.md`
- Getting started: `docs/getting-started.md`

Run `node scripts/sdk/check-sdk-matrix.mjs` after changing package versions or hand-authored SDK docs.
