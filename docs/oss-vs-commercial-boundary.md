# OSS vs Commercial Boundary

Last updated: 2026-05-23 (v2.1 open-capability alignment)

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
| 2 | **Embedding cache and coalescer** | `apps/api/src/embedding-cache.ts`, `apps/api/src/embedding-coalescer.ts` | **OSS — Apache 2.0** | Generic infrastructure; not a moat. |
| 3 | **Bi-temporal API** (memory_records valid_time / transaction_time) | `apps/api/src/db/schema-v13-bitemporal.sql`, `packages/search/src/temporal-memory-v13.ts` | **OSS — Apache 2.0** | Schema + helpers; no commercial sensitivity. |
| 4 | **Reranker abstraction** (LocalCrossEncoder + Cohere factory) | `apps/api/src/rerankers/` | **OSS — Apache 2.0** | Abstraction is open; users provide their own Cohere API key. |
| 5 | **OpenTelemetry exporter** (per-stream spans) | `apps/api/src/observability/stream-spans-v13.ts` | **OSS — Apache 2.0** | Standard instrumentation; community benefits. |
| 6 | **Dreaming butler core** (4-phase: prune / merge / resolve / surface) | `apps/api/src/workers/butler-v18.ts`, `apps/api/src/conflict-detector-v18.ts` | **OSS — Apache 2.0** | Product-narrative differentiator; OSS amplifies adoption. |
| 7 | **OpenRouter task router + model gateway** (5-tier task→model routing) | `packages/model-gateway/src/` | **OSS — Apache 2.0** | Multi-provider abstraction is the dev-friendly flavor; users supply API keys. |
| 8 | **Eval framework** (LongMemEval-S, MTEB, ablation harness, local shadow recipe fixtures) | `packages/eval/src/`, `scripts/run-v*-eval.mjs`, `scripts/eval/run-recipe-shadow.mjs` | **OSS — Apache 2.0** | Reproducibility benefits the field. Production release gates remain private. |
| 9 | **MIF (Memory Interchange Format)** | `packages/mif/src/` | **OSS — Apache 2.0** | Portability format; designed to be a standard. |
| 10 | **Governance primitives** (lifecycle: candidate / active / flagged / redacted / superseded / deleted) | `packages/governance/src/` | **OSS — Apache 2.0** | Reference implementation; community can build on. |
| 11 | **Dashboard customer workflow scaffold** (overview, apps, sources, inbox, memories, evidence, privacy, developer) | `apps/dashboard/app/{apps,sources,inbox,memories,evidence,privacy,developer}/`, shared dashboard components/libs/tests | **OSS — Apache 2.0** for non-commercial scaffold; **commercial** for tenant-aware extensions | Self-host users get a working UI; billing, hosted onboarding, secret settings, and tenant admin remain private. |
| 12 | **CLI** (`lore doctor`, `lore wiki-recompile`, dataset import/export) | `apps/cli/` | **OSS — Apache 2.0** | Developer ergonomics. |
| 13 | **Browser extension scaffold** | `apps/browser-extension/` | **OSS — Apache 2.0** for capture surface; **commercial** for cloud-sync hooks | Capture is open; sync to hosted Lore Cloud is commercial. |
| 14 | **MCP server** | `apps/mcp-server/` | **OSS — Apache 2.0** | Standard MCP protocol; open to encourage agent ecosystem. |
| 15 | **Generated API SDK source previews** | `packages/sdk-typescript/`, `packages/sdk-python/`, `packages/sdk-go/`, `packages/sdk-java/`, `packages/sdk-dotnet/` | **OSS — Apache 2.0** except Python Secret Vault crypto paths | Client source should match public docs. `packages/sdk-python/src/lore_context/secrets/` and `packages/sdk-python/tests/secrets/` stay private until the Secret Vault crypto audit is complete. |
| 16 | **Public release, privacy, and legal docs** | `docs/release-status.md`, `docs/privacy/`, `docs/legal/` | **OSS — Apache 2.0 / public docs** | Public links must resolve and must distinguish self-host OSS from hosted SaaS terms. |
| --- | --- | --- | --- | --- |
| 17 | **Partner activation flow** (vault provisioning, invite tokens, per-vault rate limit) | `apps/api/src/cloud-store.ts`, `apps/api/src/auth/invite-tokens.ts` | **Commercial — private** | Multi-tenant isolation logic encodes operational know-how; not part of the OSS substrate. |
| 18 | **Multi-region deployment** (RDS replica, Qdrant snapshot, Cloudflare DNS failover) | `iac/multi-region/`, `apps/api/src/region-router.ts` | **Commercial — private** | Hosted operations only. |
| 19 | **Secrets management and Secret Vault runtime** (AWS Secrets Manager bootstrap, hard-fail mode, rotation Lambda, MCP secret tools, Python crypto mirror) | `scripts/secrets/`, `apps/api/src/secrets/`, `apps/mcp-server/src/secrets/`, `packages/sdk-python/src/lore_context/secrets/` | **Commercial — private until audit** | AWS-specific operational implementation and unaudited Secret Vault crypto must not be presented as OSS production-ready. |
| 20 | **Audit log retention** (search-audit-v14, trace-exporter-v14, retention policies) | `apps/api/src/search-audit-v14.ts`, `apps/api/src/trace-exporter-v14.ts` | **Commercial — private** | Compliance feature. |
| 21 | **Stripe billing, usage quota, and overage metering** | `apps/api/src/billing/`, `apps/api/src/usage/`, `apps/api/src/db/schema-v19-billing.sql`, `apps/api/src/db/schema-v20-usage.sql` | **Commercial — private** | Hosted SaaS revenue path; usage code imports billing tier and Stripe overage semantics. |
| 22 | **Auth0 / Google OAuth integration** | `apps/api/src/auth/auth0-adapter.ts`, `apps/api/src/google-auth.ts` | **Commercial — private** | Hosted-only; OSS users provide their own auth. |
| 23 | **Abuse detection** (carding, spam onboarding, IP blocking) | `apps/api/src/abuse/` | **Commercial — private** | Tied to hosted billing protection; not useful in self-host. |
| 24 | **AWS-specific deployment automation** (release scripts, OIDC, ELB/ALB config, SSM commands) | `scripts/release/`, `.github/workflows/deploy-*.yml`, `iac/` | **Commercial — private** | AWS-specific; OSS users use their own infrastructure. |
| 25 | **Production observability runbooks** | `docs/deployment/v*-observability-runbook.md`, `scripts/observability/` | **Commercial — private** | Operational know-how; OSS users build their own. |
| 26 | **Symphony / Codex / Linear automation** | `.omc/symphony/`, `.omc/policies/`, `.omc/linear-tasks/` | **Commercial — private** | Internal release-engineering tooling. |

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
