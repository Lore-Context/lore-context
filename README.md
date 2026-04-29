<div align="center">

# Lore Context

**The control plane for AI-agent memory, eval, and governance.**

Know what every agent remembered, used, and should forget — before memory becomes production risk.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.6.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Getting Started](docs/getting-started.md) · [API Reference](docs/api-reference.md) · [Architecture](docs/architecture.md) · [Project Plan](docs/project-plan.md) · [Release Status](docs/release-status.md) · [Roadmap](docs/roadmap.md) · [Integrations](docs/integrations/README.md) · [Deployment](docs/deployment/README.md) · [Changelog](CHANGELOG.md)

🌐 **Read this in your language**: [English](README.md) · [简体中文](docs/i18n/zh-CN/README.md) · [繁體中文](docs/i18n/zh-TW/README.md) · [日本語](docs/i18n/ja/README.md) · [한국어](docs/i18n/ko/README.md) · [Tiếng Việt](docs/i18n/vi/README.md) · [Español](docs/i18n/es/README.md) · [Português](docs/i18n/pt/README.md) · [Русский](docs/i18n/ru/README.md) · [Türkçe](docs/i18n/tr/README.md) · [Deutsch](docs/i18n/de/README.md) · [Français](docs/i18n/fr/README.md) · [Italiano](docs/i18n/it/README.md) · [Ελληνικά](docs/i18n/el/README.md) · [Polski](docs/i18n/pl/README.md) · [Українська](docs/i18n/uk/README.md) · [Bahasa Indonesia](docs/i18n/id/README.md)

Localized docs may lag the current English release notes; the canonical v0.6 docs are the English README and `docs/` set.

</div>

---

## What is Lore Context

Lore Context is an **open-core control plane** for AI-agent memory: it composes context across memory, search, and tool traces; evaluates retrieval quality on your own datasets; routes governance review for sensitive content; and exports memory as a portable interchange format you can move between backends.

It does not try to be another memory database. The unique value is what sits on top of memory:

- **Context Query** — single endpoint composes memory + web + repo + tool traces, returns a graded context block with provenance.
- **Memory Eval** — runs Recall@K, Precision@K, MRR, stale-hit-rate, p95 latency on datasets you own; persists runs and diffs them for regression detection.
- **Governance Review** — six-state lifecycle (`candidate / active / flagged / redacted / superseded / deleted`), risk-tag scanning, poisoning heuristics, immutable audit log.
- **MIF-like Portability** — JSON + Markdown export/import preserving `provenance / validity / confidence / source_refs / supersedes / contradicts`. Works as a migration format between memory backends.
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
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 6. Query context, then inspect the returned traceId in the Evidence Ledger
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

For full setup (Postgres, Docker Compose, Dashboard, MCP integration), see [docs/getting-started.md](docs/getting-started.md).

For AI-readable discovery, the website publishes `/llms.txt` and `/llms-full.txt`
from public documentation only. The Official MCP Registry entry is published,
and additional distribution drafts live under [docs/distribution](docs/distribution/).
Launch drafts live under [docs/launch](docs/launch/), and design partner intake
under [docs/design-partners](docs/design-partners/).

## Architecture

```text
                       ┌─────────────────────────────────────────────┐
   MCP clients ──────► │ apps/api  (REST + auth + rate limit + logs) │
   (Claude Code,       │   ├── context router (memory/web/repo/tool) │
    Cursor, Qwen,      │   ├── context composer                      │
    Dify, Hermes...)   │   ├── governance + audit                    │
                       │   ├── eval runner                           │
                       │   └── MIF import/export                     │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adapter     packages/search
           (incremental        (version-probed,        (BM25 / hybrid
            persistence)        degraded-mode safe)     pluggable)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   protected by Basic Auth   │
                       │   memory · traces · eval    │
                       │   governance review queue   │
                       └─────────────────────────────┘
```

For detail, see [docs/architecture.md](docs/architecture.md).

## What's in v0.6.0-alpha

| Capability | Status | Where |
|---|---|---|
| REST API with API-key auth (reader/writer/admin) | ✅ Production | `apps/api` |
| OpenAPI 3.1 contract at `/openapi.json` | ✅ Production | `apps/api/src/openapi.ts` |
| `pnpm quickstart` local adoption helper | ✅ Alpha | `scripts/lore-quickstart.mjs` |
| Quickstart activation report with redacted first-value proof | ✅ Alpha | `scripts/lore-quickstart.mjs` |
| AI-readable docs (`/llms.txt`, `/llms-full.txt`) | ✅ Alpha | `apps/website` |
| MCP stdio server (legacy + official SDK transport) | ✅ Production | `apps/mcp-server` |
| Next.js dashboard with HTTP Basic Auth gating | ✅ Production | `apps/dashboard` |
| Evidence Ledger API + Dashboard summary | ✅ Alpha | `apps/api`, `apps/dashboard` |
| Postgres + pgvector incremental persistence | ✅ Optional | `apps/api/src/db/` |
| Governance state machine + audit log | ✅ Production | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Production | `packages/eval` |
| Eval report export (`json` / `markdown`) | ✅ Alpha | `GET /v1/eval/report` |
| Public-safe eval report CLI | ✅ Alpha | `scripts/export-eval-report.mjs` |
| MIF v0.2 import/export with `supersedes` + `contradicts` | ✅ Production | `packages/mif` |
| `agentmemory` adapter with version probe + degraded mode | ✅ Production | `packages/agentmemory-adapter` |
| Rate limiting (per-IP + per-key with backoff) | ✅ Production | `apps/api` |
| Structured JSON logging with sensitive-field redaction | ✅ Production | `apps/api/src/logger.ts` |
| Docker Compose private deployment | ✅ Production | `docker-compose.yml` |
| Demo dataset + smoke tests + Playwright UI test | ✅ Production | `examples/`, `scripts/` |
| Official MCP Registry + distribution docs, launch drafts, design partner intake | ✅ Alpha | `server.json`, `docs/distribution/`, `docs/launch/`, `docs/design-partners/` |
| Hosted multi-tenant cloud sync | ⏳ Roadmap | — |

See [CHANGELOG.md](CHANGELOG.md) for the full v0.6.0-alpha release notes.

## Current release status

`v0.6.0-alpha` is published as a public alpha pre-release. The release tag points
to `4f0eadf369e99e364bd06b7d3228b84a9f7501b9`; public `main` includes the
release-closure, integration-validation, and distribution commits with passing
CI. The production website, AI-readable docs, public API health endpoint, GHCR
MCP image, and Official MCP Registry listing are live.

See [docs/release-status.md](docs/release-status.md) for the current public-safe
status snapshot.

## Release focus

The v0.6 release is the **Distribution and Trust Sprint**. The goal is not more
memory storage features; it is making the v0.5 substrate easier to discover,
install, verify, and share without leaking local secrets or private data.

Shipped v0.6 work:

- AI-readable website docs at `/llms.txt` and `/llms-full.txt`;
- canonical, Open Graph, Twitter, and static header metadata for public docs;
- `pnpm quickstart -- --activation-report` with redacted dry-run and real first-value proof;
- stricter activation proof that fails instead of skipping when the target port is occupied;
- public-safe eval reporting and smoke coverage for eval export plus MIF JSON export;
- Official MCP Registry publication plus distribution metadata drafts for marketplace listings and agent plugins;
- launch content drafts and design partner intake/scorecard workflow.

It deliberately does not claim public SaaS, billing, managed sync, remote MCP HTTP,
or benchmark wins.

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
| **Local Postgres+pgvector** | Production-grade single-node, semantic search at scale | [docs/deployment/README.md](docs/deployment/README.md) |
| **Docker Compose private** | Self-hosted team deployment, isolated network | [docs/deployment/compose.private-demo.yml](docs/deployment/compose.private-demo.yml) |
| **Hosted cloud** | Future private roadmap, not a public alpha claim | — |

All deployment paths require explicit secrets: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. The `scripts/check-env.mjs` script refuses production startup if any value matches a placeholder pattern.

## Security

v0.6.0-alpha keeps the v0.5 adoption baseline and adds distribution-facing
AI-readable docs, activation evidence, public-safe reports, and launch materials. The
security posture remains appropriate for local and private alpha deployments:

- **Authentication**: API-key bearer tokens with role separation (`reader`/`writer`/`admin`) and per-project scoping. Empty-keys mode fails closed in production.
- **Rate limiting**: per-IP + per-key dual bucket with auth-failure backoff (429 after 5 fails in 60s, 30s lockout).
- **Dashboard**: HTTP Basic Auth middleware. Refuses to start in production without `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Containers**: all Dockerfiles run as non-root `node` user; HEALTHCHECK on api + dashboard.
- **Secrets**: zero hardcoded credentials; all defaults are required-or-fail variables. `scripts/check-env.mjs` rejects placeholder values in production.
- **Governance**: PII / API key / JWT / private-key regex scanning on writes; risk-tagged content auto-routed to review queue; immutable audit log on every state transition.
- **Memory poisoning**: heuristic detection on consensus + imperative-verb patterns.
- **MCP**: zod schema validation on every tool input; mutating tools require `reason` (≥8 chars) and surface `destructiveHint: true`; upstream errors sanitized before client return.
- **Logging**: structured JSON with auto-redaction of `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key` fields.

Vulnerability disclosures: [SECURITY.md](SECURITY.md).

## Project structure

```text
apps/
  api/                # REST API + Postgres + governance + eval (TypeScript)
  dashboard/          # Next.js 16 dashboard with Basic Auth middleware
  mcp-server/         # MCP stdio server (legacy + official SDK transports)
  web/                # Server-side HTML renderer (no-JS fallback UI)
  website/            # Marketing site (handled separately)
packages/
  shared/             # Shared types, errors, ID/token utilities
  agentmemory-adapter # Bridge to upstream agentmemory + version probe
  search/             # Pluggable search providers (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + metric primitives
  governance/         # State machine + risk scan + poisoning + audit
docs/
  i18n/<lang>/        # Localized README in 17 languages
  integrations/       # 11 agent-IDE integration guides
  deployment/         # Local + Postgres + Docker Compose
  legal/              # Privacy / Terms / Cookies (Singapore law)
scripts/
  check-env.mjs       # Production-mode env validation
  smoke-*.mjs         # End-to-end smoke tests
  apply-postgres-schema.mjs
```

## Requirements

- Node.js `>=22`
- pnpm `10.30.1`
- (Optional) Postgres 16 with pgvector for semantic-search-grade memory

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, commit message protocol, and review expectations.

For documentation translations, see the [i18n contributor guide](docs/i18n/README.md).

## Operated by

Lore Context is operated by **REDLAND PTE. LTD.** (Singapore, UEN 202304648K). Company profile, legal terms, and data handling are documented under [`docs/legal/`](docs/legal/).

## License

The Lore Context repository is licensed under [Apache License 2.0](LICENSE). Individual packages under `packages/*` declare MIT to enable downstream consumption. See [NOTICE](NOTICE) for upstream attribution.

## Acknowledgments

Lore Context builds on top of [agentmemory](https://github.com/agentmemory/agentmemory) as a local memory runtime. Upstream contract details and version-compatibility policy are documented in [UPSTREAM.md](UPSTREAM.md).
