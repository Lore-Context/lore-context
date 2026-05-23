<div align="center">

# Lore Context

**The control plane for AI-agent memory, eval, and governance.**

Know what every agent remembered, used, and should forget — before memory becomes production risk.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Getting Started](docs/getting-started.md) · [Website Quickstart](https://lorecontext.com/quickstart/) · [Benchmark Methodology](https://lorecontext.com/benchmark/) · [API Reference](docs/api-reference.md) · [Architecture](docs/architecture.md) · [Project Plan](docs/project-plan.md) · [Release Status](docs/release-status.md) · [Roadmap](docs/roadmap.md) · [Integrations](docs/integrations/README.md) · [Deployment](docs/deployment/README.md) · [Changelog](CHANGELOG.md)

🌐 **Read this in your language**: [English](README.md) · [简体中文](docs/i18n/zh-CN/README.md) · [繁體中文](docs/i18n/zh-TW/README.md) · [日本語](docs/i18n/ja/README.md) · [한국어](docs/i18n/ko/README.md) · [Tiếng Việt](docs/i18n/vi/README.md) · [Español](docs/i18n/es/README.md) · [Português](docs/i18n/pt/README.md) · [Русский](docs/i18n/ru/README.md) · [Türkçe](docs/i18n/tr/README.md) · [Deutsch](docs/i18n/de/README.md) · [Français](docs/i18n/fr/README.md) · [Italiano](docs/i18n/it/README.md) · [Ελληνικά](docs/i18n/el/README.md) · [Polski](docs/i18n/pl/README.md) · [Українська](docs/i18n/uk/README.md) · [Bahasa Indonesia](docs/i18n/id/README.md)

Localized docs may lag the current English release notes; the canonical v2.1
docs are the English README and `docs/` set.

</div>

---

## What is Lore Context

Lore Context is an **open-core control plane** for AI-agent memory: it composes context across memory, search, repository graphs, and tool traces; evaluates retrieval quality on your own datasets; routes governance review for sensitive content; and exports memory as a portable interchange format you can move between backends.

It does not try to be another memory database. The unique value is what sits on top of memory:

- **Context Query** — single endpoint composes memory + web + repo + tool traces, returns a graded context block with provenance.
- **Memory Eval** — runs Recall@K, Precision@K, MRR, stale-hit-rate, p95 latency on datasets you own; persists runs and diffs them for regression detection.
- **Governance Review** — six-state lifecycle (`candidate / active / flagged / redacted / superseded / deleted`), risk-tag scanning, poisoning heuristics, immutable audit log.
- **MIF-like Portability** — JSON + Markdown export/import preserving `provenance / validity / confidence / source_refs / supersedes / contradicts`. Works as a migration format between memory backends.
- **Repo Graph** — deterministic repository indexing (files, symbols, imports, calls, routes, tests) exposed as API routes and read-only MCP tools so agents ground repository answers in a stable project-context contract.
- **Multi-Agent Adapter** — first-class `agentmemory` integration with version probe + degraded-mode fallback; clean adapter contract for additional runtimes.

## When to use it

| Use Lore Context when... | Use a memory database (agentmemory, Mem0, Supermemory) when... |
|---|---|
| You need to **prove** what your agent remembered, why, and whether it was used | You just need raw memory storage |
| You run multiple agents (Claude Code, Cursor, Qwen, Hermes, Dify) and want shared trustable context | You're building a single agent and OK with a vendor-locked memory tier |
| You require local or private deployment for compliance | You prefer a hosted SaaS |
| You need eval on your own datasets, not vendor benchmarks | Vendor benchmarks are sufficient signal |
| You want to migrate memory between systems | You don't plan to ever switch backends |

## Quick Start

```bash
# 1. Clone + install
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Run the quickstart helper and inspect the activation report
pnpm quickstart -- --dry-run --activation-report

# 3. Generate a real API key (do not use placeholders in any environment beyond local-only dev)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Start the API (file-backed, no Postgres required)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Write a memory
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Query context, then inspect the returned traceId in the Evidence Ledger
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

For the public website quickstart, see
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). For full
setup (Postgres, Docker Compose, Dashboard, MCP integration), see
[docs/getting-started.md](docs/getting-started.md).

The canonical alpha quickstart is `git clone` + `pnpm quickstart`. Lore does
not currently publish or claim a public `@lore-context/quickstart` npm package.
The MCP stdio server is published separately as
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
for registry and client distribution, and the SDK middleware ships as
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) and `lore-context-middleware` (PyPI).

For AI-readable discovery, the website publishes `/llms.txt` and `/llms-full.txt`
from public documentation only. The Official MCP Registry entry is published,
and additional distribution drafts live under [docs/distribution](docs/distribution/).
Launch drafts live under [docs/launch](docs/launch/), and design partner intake
under [docs/design-partners](docs/design-partners/). The public benchmark page
is a reproducible methodology and small smoke-run report, not a competitive
benchmark-win claim.

## Architecture

The diagram below shows the full open-core plus hosted-production shape. In the
public OSS repo, local file/Postgres deployment is supported directly; hosted
Google sign-in, AWS SQS workers, private embeddings, billing, and multi-tenant
operations are commercial hosted-cloud surfaces.

```text
                       ┌───────────────────────────────────────────────┐
  MCP/REST clients ─► │ apps/api  (auth + rate limit + evidence)       │
  (Claude Code,       │   ├── Memory Inbox / lifecycle / audit         │
   Codex, Cursor,     │   ├── capture ingestion + recall hydration     │
   OpenCode...)       │   ├── context query (memory/web/repo/traces)   │
                       │   ├── repo graph query / symbol / impact       │
                       │   ├── Google sign-in + hosted MCP metadata     │
                       │   └── OpenAPI + usage + operator surfaces      │
                       └───────────────┬───────────────────────────────┘
                                       │
                         capture / embedding / graph jobs
                                       ▼
                       ┌───────────────────────────────────────────────┐
                       │ memory-worker  (AWS SQS + DLQ fan-out)        │
                       │   ├── auto redaction / curation / save        │
                       │   ├── dreaming butler (prune/merge/resolve)    │
                       │   ├── private Qwen3 embedding service         │
                       │   └── Qdrant dense+sparse indexing            │
                       └───────────────┬───────────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
          RDS PostgreSQL 16      Qdrant derived index   apps/dashboard
          truth store + audit    lore_memories_v12      user-facing SaaS
```

For detail, see [docs/architecture.md](docs/architecture.md).

## What's in v2.1.0

`v2.1.0` is the **Repo Graph API and MCP Tools** release. It makes Lore's own
repository graph a first-class agent memory surface: deterministic
TypeScript/JavaScript repository indexing for files, symbols, imports, calls,
routes, tests, and process hints, exposed through API routes and read-only MCP
tools so agents ground repository answers in a stable project-context contract
instead of ad hoc text search.

v2.1.0 is the current open-core source line. The hosted Lore Cloud production
line also runs v2.1.0 on the commercial AWS/Qdrant/private-embedding substrate,
but hosted operations, billing, production release automation, and Secret Vault
runtime stay in `Lore-Context/lore-cloud`.

| Capability | Status | Where |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ OSS + hosted production | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Code knowledge graph indexer | ✅ OSS + hosted production | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query composing memory + web + repo + tool traces | ✅ OSS + hosted production | `apps/api`, `docs/api-reference.md` |
| 7-stream `HybridSearchOrchestrator` (FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ OSS + hosted production | `packages/search` |
| Cross-encoder reranker (post-fusion, opt-in) | ✅ OSS, provider key required | `apps/api/src/rerankers/` |
| Dreaming butler memory consolidation (prune / merge / resolve / surface) | ✅ OSS, flag-gated | `apps/api/src/workers/butler-v18.ts` |
| Agent memory self-improvement loop + context recipes | ✅ OSS, human-gated promotion | `packages/eval`, `packages/search` |
| SDK middleware (auto-inject + auto-retain for OpenAI / Anthropic clients) | ✅ Published | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Generated SDK source previews | ✅ OSS source preview | `packages/sdk-python`, `packages/sdk-go`, `packages/sdk-java`, `packages/sdk-dotnet` |
| Browser extension capture scaffold | ✅ OSS scaffold | `apps/browser-extension` |
| Secret vault for AI agents (MCP-native, three-button authorization) | Hosted beta, pending crypto audit | commercial runtime in `Lore-Context/lore-cloud` |
| Cloud Memory Engine: RDS truth store + SQS worker fan-out + Qdrant index | Hosted production | commercial hosted cloud |
| Private Qwen3-Embedding-0.6B 1024-dim vector service | Hosted production | commercial hosted cloud |
| Automatic capture ingestion and Memory Inbox exceptions | ✅ OSS + hosted production | `apps/api`, `packages/capture`, `apps/dashboard` |
| Google sign-in + personal vault bootstrap | Hosted production | commercial hosted cloud |
| Commercial SaaS: individual subscriptions, billing, quota gating | Hosted production | `Lore-Context/lore-cloud` |
| REST API with API-key auth (reader/writer/admin) | ✅ OSS + hosted production | `apps/api` |
| OpenAPI 3.1 contract at `/openapi.json` (reports `2.1.0`) | ✅ OSS + hosted production | `apps/api/src/openapi.ts` |
| MCP stdio server (legacy + official SDK transport) | ✅ OSS + hosted production | `apps/mcp-server` |
| Next.js dashboard customer workflow scaffold | ✅ OSS scaffold + hosted production | `apps/dashboard` |
| Evidence Ledger API + Dashboard summary | ✅ OSS + hosted production | `apps/api`, `apps/dashboard` |
| Governance state machine + audit log | ✅ OSS + hosted production | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ OSS + hosted production | `packages/eval` |
| MIF v0.2 import/export with `supersedes` + `contradicts` | ✅ OSS | `packages/mif` |
| Model gateway (multi-provider task→model routing) | ✅ OSS | `packages/model-gateway` |
| `agentmemory` adapter with version probe + degraded mode | ✅ OSS | `packages/agentmemory-adapter` |
| Rate limiting, structured JSON logging with field redaction | ✅ OSS + hosted production | `apps/api` |
| Docker Compose private deployment | ✅ OSS self-host | `docker-compose.yml`, `docs/deployment/` |
| `pnpm quickstart` local adoption helper + activation report | ✅ OSS | `scripts/lore-quickstart.mjs` |
| Official MCP Registry + distribution / launch / design-partner docs | ✅ OSS docs | `server.json`, `docs/distribution/`, `docs/launch/` |

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## Current release status

`v2.1.0` is the current source, hosted production, and release line. It deployed
to AWS production and the public website through the optimized release flow:
immutable arm64-first artifacts, staging API smoke, production API deploy,
isolated website deploy, post-release audit, and tag/release closure. External
checks confirm `https://api.lorecontext.com/health` returns `status=ok`,
`/openapi.json` reports `2.1.0`, and `https://lorecontext.com/status.html`
contains `v2.1.0`.

Production keeps the v1.1+ RDS / SQS / memory-worker / Qdrant cloud shape, uses
`lore_memories_v12` as the Qdrant collection, keeps 1024-dim pgvector for the
Postgres path, and adds the additive repo graph schema
(`apps/api/src/db/schema-v21-repo-graph.sql`).

See [docs/release-status.md](docs/release-status.md) for the current public-safe
status snapshot and [docs/release-notes/v2.1.0.md](docs/release-notes/v2.1.0.md)
for the full release notes.

## Release focus

The v2.1 release makes Lore's repository graph a first-class agent memory
surface. The goal is to let agents answer "where is X defined", "what calls
this", and "what breaks if I change this" against a deterministic, stable
project-context contract rather than ad hoc text search:

- `@lore/repo-graph` — deterministic TypeScript/JavaScript repository indexing
  for files, symbols, imports, calls, routes, tests, and process hints.
- API routes: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact`, and `POST /v1/repo/detect-changes`.
- MCP tools: `repo.graph_query`, `repo.symbol_context`, `repo.impact`, and
  `repo.detect_changes` (read-only).
- `context_query(repo)` now uses provider-backed repo graph evidence when
  available, with an honest unavailable fallback when repo graph storage is not
  configured.
- The repo graph Postgres schema is additive — it sits on top of the existing
  production schema and is applied during production/staging schema setup.

Root and API package versions report `2.1.0` so `/openapi.json` matches the
release tag. The release train uses the optimized split API/website deployment
guardrails introduced after v2.0.9.

See [docs/project-plan.md](docs/project-plan.md), [docs/roadmap.md](docs/roadmap.md), and [docs/release-governance.md](docs/release-governance.md).

## Integrations

Lore Context speaks MCP and REST and integrates with most agent IDEs and chat frontends:

| Tool | Setup guide |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](docs/integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](docs/integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](docs/integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](docs/integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](docs/integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](docs/integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](docs/integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](docs/integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](docs/integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](docs/integrations/openwebui.md) |
| Other / generic MCP | [docs/integrations/README.md](docs/integrations/README.md) |

## Deployment

| Mode | Use when | Doc |
|---|---|---|
| **Local file-backed** | Solo dev, prototype, smoke testing | This README, Quick Start above |
| **Local Postgres+pgvector** | Single-node local fallback and migration testing | [docs/deployment/README.md](docs/deployment/README.md) |
| **Docker Compose private** | Self-hosted team deployment, isolated network | [docs/deployment/compose.private-demo.yml](docs/deployment/compose.private-demo.yml) |
| **Hosted cloud** | RDS / SQS / memory-worker / Qdrant / private embedding plus the graph-augmented hybrid recall stack and commercial SaaS substrate | [docs/release-status.md](docs/release-status.md) |

All deployment paths require explicit secrets. Local/private paths require
`POSTGRES_PASSWORD`, `LORE_API_KEYS`, and dashboard auth. Hosted deployments also
need RDS, SQS, Qdrant, embedding-service, OAuth, tunnel configuration, and the
production runtime exports. The `scripts/check-env.mjs` script refuses production
startup if any value matches a placeholder pattern.

## Security

v2.1.0 keeps the local/private deployment posture and the hosted cloud
guardrails for ordinary-user access:

- **Authentication**: API-key bearer tokens with role separation (`reader`/`writer`/`admin`) and per-project scoping. Empty-keys mode fails closed in production.
- **Rate limiting**: per-IP + per-key dual bucket with auth-failure backoff (429 after 5 fails in 60s, 30s lockout).
- **Dashboard**: Google session flow for the hosted product; HTTP Basic Auth remains available for local/private operator deployments.
- **Containers**: all Dockerfiles run as non-root `node` user; HEALTHCHECK on api + dashboard.
- **Secrets**: zero hardcoded credentials; all defaults are required-or-fail variables. `scripts/check-env.mjs` rejects placeholder values in production.
- **Governance**: PII / API key / JWT / private-key regex scanning on writes; risk-tagged content auto-routed to review queue; immutable audit log on every state transition.
- **Memory poisoning**: heuristic detection on consensus + imperative-verb patterns.
- **MCP**: zod schema validation on every tool input; mutating tools require `reason` (≥8 chars) and surface `destructiveHint: true`; upstream errors sanitized before client return.
- **Worker isolation**: capture, embedding, graph, connector, and backfill jobs run through AWS SQS queues with DLQs; Qdrant is a derived index and RDS remains authoritative.
- **Logging**: structured JSON with auto-redaction of `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key` fields.

Vulnerability disclosures: [SECURITY.md](SECURITY.md).

## Project structure

```text
apps/
  api/                # REST control plane + Postgres + governance + eval + repo graph
  dashboard/          # Next.js dashboard scaffold; hosted Google session stays commercial
  mcp-server/         # MCP stdio server (legacy + official SDK transports)
  cli/                # lore CLI (doctor, wiki-recompile, dataset import/export)
  browser-extension/  # Capture surface scaffold
  web/                # Server-side HTML renderer (no-JS fallback UI)
  website/            # Marketing site (handled separately)
packages/
  shared/             # Shared types, errors, ID/token utilities
  agentmemory-adapter # Bridge to upstream agentmemory + version probe
  search/             # 7-stream HybridSearchOrchestrator + recipe adapter
  repo-graph/         # Deterministic repository indexing (v2.1)
  code-indexer/       # Code knowledge graph indexer (TypeScript/JavaScript)
  code-indexer-python # Code knowledge graph indexer (Python)
  capture/            # Capture ingestion primitives
  connectors/         # External source connectors
  model-gateway/      # Multi-provider task→model routing
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + metric primitives + context recipes
  governance/         # State machine + risk scan + poisoning + audit
  profile/            # Vault / account profile types
  sdk-typescript/     # TypeScript client SDK
  sdk-python/         # Python client SDK
  sdk-go/ sdk-java/ sdk-dotnet/   # Additional language SDKs
  sdk-middleware-typescript/      # Auto-inject + auto-retain middleware (npm)
  sdk-middleware-python/          # Auto-inject + auto-retain middleware (PyPI)
docs/
  i18n/<lang>/        # Localized README in 17 languages
  integrations/       # Agent-IDE integration guides
  deployment/         # Local and Docker Compose private deployment docs
  legal/              # Privacy / Terms / Cookies (Singapore law)
scripts/
  check-env.mjs       # Production-mode env validation
  smoke-*.mjs         # End-to-end smoke tests
  apply-postgres-schema.mjs
```

## Requirements

- Node.js `>=22`
- pnpm `10.30.1`
- (Optional local fallback) Postgres 16 with pgvector
- (Hosted/advanced) RDS PostgreSQL 16, AWS SQS, Qdrant, and private embedding service

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, commit message protocol, and review expectations.

For documentation translations, see the [i18n contributor guide](docs/i18n/README.md).

## Operated by

Lore Context is operated by **REDLAND PTE. LTD.** (Singapore, UEN 202304648K). Company profile, legal terms, and data handling are documented under [`docs/legal/`](docs/legal/).

## License

The Lore Context repository is licensed under [Apache License 2.0](LICENSE). Individual packages under `packages/*` declare MIT to enable downstream consumption. See [NOTICE](NOTICE) for upstream attribution.

## Acknowledgments

Lore Context builds on top of [agentmemory](https://github.com/agentmemory/agentmemory) as a local memory runtime. Upstream contract details and version-compatibility policy are documented in [UPSTREAM.md](UPSTREAM.md).
