# OSS vs Commercial Boundary

Last updated: 2026-05-10 (drafted in v1.9 Lane O)

This document declares the open-source / commercial boundary for every major
component in Lore Context. It is the authoritative reference for what code
ships under Apache License 2.0 to the public repository
`Lore-Context/lore-context` versus what stays in the private repository
`Lore-Context/lore-cloud` for commercial use only.

The principle: **Lore is an open-core control plane**. The memory engine, the
search engine, the dreaming butler, and the model gateway are open. The hosted
multi-tenant operations layer (partner activation, multi-region, audit
retention, secrets management, billing, abuse detection) is commercial.

## Component table

| # | Component | Lives at | Boundary | Rationale |
|---|---|---|---|---|
| 1 | **Hybrid search engine** (orchestrator-v12, 7 streams: dense, sparse, FTS, pgvector, graph, temporal, wiki) | `packages/search/src/` | **OSS — Apache 2.0** | Core memory retrieval is the canonical contribution to the dev community. Forkable. |
| 2 | **Embedding cache (LRU + Redis)** | `apps/api/src/embedding-cache.ts`, `packages/memory/embeddingCache.ts` | **OSS — Apache 2.0** | Generic infrastructure; not a moat. |
| 3 | **Bi-temporal API** (memory_records valid_time / transaction_time) | `apps/api/src/db/schema-v13-bitemporal.sql`, `packages/search/src/temporal-memory-v13.ts` | **OSS — Apache 2.0** | Schema + helpers; no commercial sensitivity. |
| 4 | **Reranker abstraction** (LocalCrossEncoder + Cohere factory) | `apps/api/src/rerankers/` | **OSS — Apache 2.0** | Abstraction is open; users provide their own Cohere API key. |
| 5 | **OpenTelemetry exporter** (per-stream spans) | `apps/api/src/observability/stream-spans-v13.ts` | **OSS — Apache 2.0** | Standard instrumentation; community benefits. |
| 6 | **Dreaming butler core** (4-phase: prune / merge / resolve / surface) | `apps/api/src/workers/butler-v18.ts`, `apps/api/src/conflict-detector-v18.ts` | **OSS — Apache 2.0** | Product-narrative differentiator; OSS amplifies adoption. |
| 7 | **OpenRouter task router + model gateway** (5-tier task→model routing) | `packages/model-gateway/src/` | **OSS — Apache 2.0** | Multi-provider abstraction is the dev-friendly flavor; users supply API keys. |
| 8 | **Eval framework** (LongMemEval-S, MTEB, ablation harness, gate scripts) | `packages/eval/src/`, `scripts/run-v*-eval.mjs`, `scripts/release/check-v13-prod-gate.mjs` | **OSS — Apache 2.0** | Reproducibility benefits the field. |
| 9 | **MIF (Memory Interchange Format)** | `packages/mif/src/` | **OSS — Apache 2.0** | Portability format; designed to be a standard. |
| 10 | **Governance primitives** (lifecycle: candidate / active / flagged / redacted / superseded / deleted) | `packages/governance/src/`, `apps/api/src/memory-lifecycle.ts` | **OSS — Apache 2.0** | Reference implementation; community can build on. |
| 11 | **Dashboard UI scaffold** (login, vault home, butler page, billing page, settings) | `apps/dashboard/` | **OSS — Apache 2.0** for scaffold; **commercial** for tenant-aware extensions | Self-host users get a working UI; commercial deploys layer multi-tenant tenancy on top. |
| 12 | **CLI** (`lore doctor`, `lore wiki-recompile`, dataset import/export) | `apps/cli/` | **OSS — Apache 2.0** | Developer ergonomics. |
| 13 | **Browser extension scaffold** | `apps/browser-extension/` | **OSS — Apache 2.0** for capture surface; **commercial** for cloud-sync hooks | Capture is open; sync to hosted Lore Cloud is commercial. |
| 14 | **MCP server** | `apps/mcp-server/` | **OSS — Apache 2.0** | Standard MCP protocol; open to encourage agent ecosystem. |
| --- | --- | --- | --- | --- |
| 15 | **Partner activation flow** (vault provisioning, invite tokens, per-vault rate limit) | `apps/api/src/cloud-store.ts`, `apps/api/src/auth/invite-tokens.ts` | **Commercial — private** | Multi-tenant isolation logic encodes operational know-how; not part of the OSS substrate. |
| 16 | **Multi-region deployment** (RDS replica, Qdrant snapshot, Cloudflare DNS failover) | `iac/multi-region/`, `apps/api/src/region-router.ts` | **Commercial — private** (deferred to v2.0) | Hosted operations only. |
| 17 | **Secrets management** (AWS Secrets Manager bootstrap, hard-fail mode, rotation Lambda) | `scripts/secrets/`, `iac/lambda/rotate-secrets/` | **Commercial — private** | AWS-specific operational implementation. |
| 18 | **Audit log retention** (search-audit-v14, trace-exporter-v14, retention policies) | `apps/api/src/search-audit-v14.ts`, `apps/api/src/trace-exporter-v14.ts` | **Commercial — private** | Compliance feature. |
| 19 | **Stripe billing** (customers, subscriptions, invoices, webhook, dunning, feature gating) | `apps/api/src/billing/`, `apps/api/src/db/schema-v19-billing.sql` | **Commercial — private** | Hosted SaaS revenue path; not relevant to OSS self-host. |
| 20 | **Auth0 / Google OAuth integration** | `apps/api/src/auth/auth0-adapter.ts`, `apps/api/src/auth/google-auth.ts` | **Commercial — private** | Hosted-only; OSS users provide their own auth. |
| 21 | **Abuse detection** (carding, spam onboarding, IP blocking) | `apps/api/src/abuse/` | **Commercial — private** | Tied to hosted billing protection; not useful in self-host. |
| 22 | **AWS-specific deployment automation** (release scripts, OIDC, ELB/ALB config, SSM commands) | `scripts/release/`, `.github/workflows/deploy-*.yml`, `iac/` | **Commercial — private** | AWS-specific; OSS users use their own infrastructure. |
| 23 | **Production observability runbooks** | `docs/deployment/v*-observability-runbook.md`, `scripts/observability/` | **Commercial — private** | Operational know-how; OSS users build their own. |
| 24 | **Symphony / Codex / Linear automation** | `.omc/symphony/`, `.omc/policies/`, `.omc/linear-tasks/` | **Commercial — private** | Internal release-engineering tooling. |

## Sync mechanism

The sync from private → public is automated via `scripts/oss-sync/sync.mjs`
(see Lane O-A3). The script reads `scripts/oss-sync/config.json` which
declares `ossPaths` (whitelist) and `excludePaths` (blacklist). Anything not
in `ossPaths` stays private by default.

## Adding a new component

When introducing a new top-level package or app under `packages/` or `apps/`,
the author MUST update this document with the boundary decision before
merging. Default: **commercial** unless explicitly justified for OSS.

## Future relaxations

The boundary is conservative by design. Components currently labeled
«commercial» may move to OSS in future releases if (a) the operational
know-how is no longer a moat, (b) community demand is concrete, or (c) the
component becomes a de-facto standard worth contributing.

## Trademark

The Lore Context name, logo, and visual identity are NOT covered by Apache
License 2.0. Derivative products may use the OSS code under Apache 2.0 but
must not represent themselves as «Lore» or use the Lore marks without
written permission.
