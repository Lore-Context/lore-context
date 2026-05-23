# Roadmap

Last updated: 2026-05-16

Lore Context ships through deliberate tiers: a historical public OSS alpha
(`v0.6.0-alpha`), a historical private personal-cloud RC (`v1.0.0-rc.0`), a
historical Public SaaS Beta Readiness pre-release (`v1.0.0-rc.2`), the
historical Graph-Augmented Hybrid Memory Engine beta (`v1.2.0-beta`), and
a rapid sequence of private-cloud releases from v1.3 through the current
production line at `v2.1.0`. They are not interchangeable in public copy.

## Current production focus: `v2.1.0 Repo Graph API and MCP Tools`

`v2.1.0` is deployed to AWS production from final SHA `665e6020bb29`
(2026-05-15). The release train used split API + website workflows, arm64-first
artifacts, staging smoke, and a post-release SSM closure audit. This is not
stable GA and Lore does not claim SOC 2 or HIPAA.

Theme: make Lore's own repository graph a first-class agent memory surface.
Agents can now ground repository answers in a stable project context contract
instead of ad hoc text search.

What `v2.1.0` shipped:

1. `@lore/repo-graph`: deterministic TypeScript/JavaScript repository indexer
   for files, symbols, imports, calls, routes, tests, and process hints.
2. API routes: `POST /v1/repo/graph/query`, `/v1/repo/symbol/context`,
   `/v1/repo/impact`, `/v1/repo/detect-changes`.
3. MCP tools: `repo.graph_query`, `repo.symbol_context`, `repo.impact`,
   `repo.detect_changes` — all read-only.
4. Additive Postgres schema `apps/api/src/db/schema-v21-repo-graph.sql`.
5. Provider-backed `context_query(repo)` evidence with an honest unavailable
   fallback when repo graph storage is not configured.

Production stack at v2.1.0: RDS PostgreSQL 16 truth store, AWS SQS worker
fan-out + DLQs, `memory-worker`, Qdrant `lore_memories_v12` derived index,
private Qwen3-Embedding-0.6B 1024-dim embedding service, 7-stream
`HybridSearchOrchestrator`, opt-in cross-encoder reranker, dreaming butler.

Explicit non-goals remain: stable GA declaration, surprise public billing,
SOC 2 / HIPAA / BYOC / BYOK claims, unsupported benchmark-win publication.

## v1.4 → v2.1 release evolution

Between the historical v1.3.0-beta and the current v2.1.0 production line,
the following releases shipped to `Lore-Context/lore-cloud`:

| Version | Theme |
|---|---|
| v1.4.0-beta | Production Quality Uplift — Redis ElastiCache embedding cache, `SearchAdapterV14`, 12 CloudWatch SLO alarms |
| v1.5.0-beta | Production Quality Truth-Up + Cleanup — main orphan cleanup, OTel exporter wiring, Qdrant `lore_memories_v12` env fix |
| v1.6.0-beta | Production Hardening + Secrets Beta — GitHub OIDC short-lived credentials, AWS Secrets Manager (9 production secrets), `SearchAuditRecorder` |
| v1.7.0 | Partner-Ramp Hardening — multi-tenant isolation fixes, partner onboarding funnel |
| v1.8.0 | Partner Activation + LLM-Augmented Memory Engine — Butler dreaming engine, OpenRouter mixed-model router, SES email triggers |
| v1.9.0 | SaaS Silent Ship + OSS Unlock — Auth0 + Stripe Checkout individual subscriptions (Free / Go / Plus / Pro), Apache 2.0 open-core boundary locked |
| v2.0.0 | PMF Closure — self-serve SaaS end-to-end, Stripe live cutover, Dashboard rebuild (Tailwind CSS 4.3 + shadcn/ui), Fern-generated SDK (npm + PyPI), Privacy v2 + ToS v2 |
| v2.0.1 | Commercial closure honesty patch — quota-engine, meter-reader, overage, auto-downgrade runtime code that v2.0.0 notes claimed but had not shipped |
| v2.0.2 | Butler v19 Anthropic Auto Dream parity, flag-default-OFF |
| v2.0.3 | SDK Middleware — `@lore-context/sdk-middleware` (npm) + `lore-context-middleware` (PyPI), `memory.suggest` MCP tool |
| v2.0.4 | Code Knowledge Graph |
| v2.0.5-beta.0 | Secret Vault for AI Agents — zero-knowledge MCP-native secrets, three-button authorization, Argon2id + AES-256-GCM (pending external crypto audit) |
| v2.0.9 | Agent Memory Self-Improvement Loop — passive eval dataset generation, shadow recipe trials, human-gated promotion gate (code-complete; not yet deployed to production) |
| v2.1.0 | Repo Graph API and MCP Tools (**current production line**) |

## Previous production focus: `v1.3 Search-Completeness Beta` (private cloud, superseded)

The v1.3 line ran on AWS production from 2026-05-05 until the v2.x upgrade
cycle. The full plan lives in
[`docs/v1.3-search-completeness-plan.md`](v1.3-search-completeness-plan.md).

Theme: close the v1.2 read-path debt. Every retrieval stream Lore advertises
is mounted in the RRF fusion, populated by a real provider, and validated
against a fail-closed v13 release gate (`scripts/release/check-v13-prod-gate.mjs`).

What `v1.3` shipped:

1. `HybridSearchOrchestrator` running the seven candidate-emitting streams
   (Postgres FTS+pgvector, Qdrant dense+sparse, graph, temporal, wiki) with
   `Promise.allSettled` per-stream timeouts and bit-identical determinism vs
   v1.2 frozen fixtures.
2. New stream providers — `GraphRetrievalProvider`, `TemporalRetrievalProvider`,
   `WikiRetrievalProvider` (FTS + pgvector via the new `wiki_embedding`
   column).
3. `LocalCrossEncoderReranker` as a post-fusion replacer (off by default;
   gated by `LORE_RERANKER_ENABLED`). Reranker is no longer a stream
   contributor — `MemorySearchInputV12.rerank?: boolean` signals it.
4. Wiki compiler v13 with `wiki_embedding` column + HNSW index and
   lifecycle propagation.
5. Graph extractor v2 (8 → 38 regex patterns + opt-in LLM extractor +
   regex-priority combiner + NER plugin seam).
6. v13 prod-gate, OpenTelemetry per-stream span seam, and `lore doctor v13`
   CLI.

## Previous production focus: `v1.2 Graph-Augmented Hybrid Memory Engine beta`

The v1.2 source/package metadata moved to `1.2.0-beta` on 2026-05-04 and ran
in production on AWS Singapore until the v1.3 traffic swap on 2026-05-05.
The formal GitHub pre-release for this line is `v1.2.0-beta`. The
v1.2 production plan lives in
[`.omx/plans/lore-v1.2-graph-augmented-hybrid-memory-engine-plan.md`](../.omx/plans/lore-v1.2-graph-augmented-hybrid-memory-engine-plan.md).

Theme: make the hosted memory engine credible for ordinary users. Users should
sign in, connect one assistant, let Lore capture safely by default, and later get
accurate cross-agent recall without understanding MCP, install tokens, bearer
tokens, embeddings, graph internals, or model settings.

Closed production-engine capabilities now include:

1. RDS PostgreSQL 16 source of truth for cloud accounts, vaults, capture state,
   memory records, lifecycle state, and audit data.
2. Qdrant `lore_memories_v11` dense+sparse recall index with RDS hydration as
   the authoritative filter.
3. Private Qwen3-Embedding-0.6B embedding service for 1024-dim vectors.
4. AWS SQS queues and DLQs for capture, embedding, graph, connector, and
   backfill fan-out.
5. Standalone `memory-worker` production service for capture processing,
   autonomous curation, Qdrant indexing, and graph/backfill lanes.
6. Hybrid recall through `/v1/memory/search` returning `lore-hybrid` without
   degraded mode in the production smoke path.
7. v12 Postgres FTS + pgvector recall, v12 episode/item/chunk schema, temporal
   graph extraction, lifecycle propagation, and v12 eval/release gates.
8. Google sign-in start, dashboard root, hosted MCP metadata, API health, and
   website status page verified on public domains.

Explicit non-goals remain: stable GA, surprise public billing, local small-model
installation for default users, ten shallow connectors, team/shared vault
product, SOC 2 / HIPAA / BYOC / BYOK claims, and unsupported benchmark-win
claims.

## Historical v1.2 release scope

`v1.2.0-beta` was the Graph-Augmented Hybrid Memory Engine beta release scope,
superseded by v1.3 and later by v2.1. Production deployment was gated by the
v12 eval gate and preflight confirming v12 runtime exports.

Theme: make recall accurate and explainable by adding a proper Postgres FTS + pgvector
path, a temporal knowledge graph, and an eval gate that drives all weight decisions.

The canonical plan is
[`.omx/plans/lore-v1.2-graph-augmented-hybrid-memory-engine-plan.md`](../.omx/plans/lore-v1.2-graph-augmented-hybrid-memory-engine-plan.md).

What v1.2 fixes versus v1.1:

The four gaps v1.2 addresses: (1) the Postgres fallback still uses a full-table memory
hydrate + substring scoring instead of real FTS + pgvector; (2) `memory_embeddings` is
`vector(384)` but production embeddings are 1024-dim; (3) `handleGraphJob` is a stub
with no real entity/relation extraction; (4) the eval runner has no fixed dataset or CI
gate, so tuning is entirely subjective.

Completed development lanes:

| Lane | Focus | Gate |
|---|---|---|
| A | v12 schema + store skeleton; remove full-hydrate startup | `pnpm db:schema` idempotent; API starts without loading all memory rows |
| B | `PostgresHybridMemorySearchProvider` (FTS + pgvector + weighted RRF) + Qdrant v12 collection/payload | exact keyword hits FTS; semantic hits pgvector; Qdrant offline → Postgres fallback |
| C | Graph worker (deterministic extractor); `PostgresGraphProvider`; temporal validity | superseded facts excluded from context; relation query hits graph stream |
| D | Fixed eval dataset; ablation (dense/sparse/fts/pgvector/graph/hybrid); CI gate thresholds | `pnpm eval:v12` produces gate report; failures show per-case stream ranks |
| E | Doctor v12 checks; docs consistency | `pnpm doctor:v12:smoke` passes; docs match implementation decisions |
| F | Integration; merge; smoke; changelog | one-command local v12 smoke; production deploy gated by release preflight |

**Production deploy remains gated by:**

1. Eval gate green on `v12-core`.
2. Security blockers resolved: IDOR in by-id getters (B-1), lifecycle propagation (B-3), production activation gate (B-5), and schema reset guard (B-9).
3. Tenant isolation tests pass across all 7 retrieval streams.
4. Schema migration verified idempotent on staging RDS.
5. No real credentials in the v1.2 commit range.

**Explicitly deferred to v1.3 or later:**

- Graphiti service adapter (v1.2 uses PostgresGraphProvider only)
- ParadeDB BM25 (RDS-incompatible; native GIN meets v1.2 targets)
- Wiki compiler (schema slot reserved; compiler deferred until after eval gate)
- Cross-encoder reranker service (heuristic provider ships in v1.2)

## Historical cloud beta readiness: `v1.0.0-rc.2`

Release status:

- Public repo: `Lore-Context/lore-context`.
- Package line: `1.0.0-rc.2`.
- Public `main`: v1.0.0-rc.2 closure line with Google sign-in, Memory Inbox,
  shared recall, browser capture, production website redesign, app-domain OAuth
  callback, safety rails, observability, and release metadata.
- Release tag: `v1.0.0-rc.2` is the public SaaS beta readiness pre-release tag.
- AWS production: Singapore AWS runtime runs the cloud beta stack through
  Docker Compose at an artifact-backed `production-v1.0` release line; private
  instance IDs and host paths stay in closed operator notes. The active runtime
  has since moved to the v1.1 memory engine.
- Cloudflare Pages production: custom domains show the v1.0 homepage:
  `All your agents. One shared memory.`, root CTA `Request beta access`, and
  production deployment `97e0dc8c`.
- OpenAPI metadata: `1.0.0-rc.2` with 72 paths, including v0.9
  capture/source/connector foundations plus v1.0 Google sign-in, account/vault,
  Memory Inbox, recall, usage, operator, and hosted MCP surfaces.
- Google OAuth production runtime: `/auth/google/start` returns a real Google
  authorization-code URL; OpenAPI exposes `GET` and `POST`
  `/auth/google/callback`; Safari sign-in and `/v1/me` session reuse have been
  verified after the Set-Cookie bridge fix.
- Website closure: Pages deploy `97e0dc8c` is live on custom domains; root uses
  `Request beta access` as the ordinary-user entry, `/download` resolves to the
  beta access page, and `/llms.txt`, `/llms-full.txt`, and `robots.txt` are live.
- Public SaaS conversion: app-domain Google sign-in, the session-cookie
  dashboard, CSRF-protected self-service token issuance, and real
  `lct_device_` / `lct_service_` token generation are now reachable in
  production. As of 2026-05-03 the public dashboard at
  `https://app.lorecontext.com/` returns `200` and the proxy
  `https://app.lorecontext.com/api/lore/auth/google/start` returns a real
  Google authorization-code URL with app-domain callback. Public access remains
  invite/cap controlled while beta validation runs.
- Beta focus: ordinary users sign in with Google, connect agents, review
  automatically captured memory, and reuse the same memory across agents.
- Public boundary: this is Public SaaS Beta Readiness, not public SaaS GA.

Shipped in the beta line:

- Google-only account entry and personal-vault recovery posture.
- Postgres-backed cloud persistence boundary for accounts, vaults, device
  tokens, install tokens, capture sources, capture jobs, usage, and audit events.
- Canonical capture ingestion at `/v1/capture/sessions` with idempotency,
  paused-source rejection, and raw-archive policy checks.
- Reversible `lore connect/status/watch/disconnect` bridge for Claude Code and
  Codex with config backup/rollback and token redaction.
- Universal session watcher for Claude Code, Codex, Cursor, and OpenCode/Qwen
  session locations.
- Hosted MCP beta endpoints and source pause/resume controls.
- Browser extension MVP for web-agent capture.
- Connector framework with fixture-backed Google Drive capture when live OAuth
  credentials are absent.
- Memory Inbox, profile store, memory edges, agent context packs, and Evidence
  Ledger trace helpers with source provenance and recall evidence.
- Production website redesign with v1.0 top-level pages, pricing, privacy,
  download/docs, comparison, company/contact/terms/cookies, and sitemap.
- Dashboard beta UX for onboarding, agent connection, sources, Memory Inbox,
  profile editing, privacy/export/delete, Evidence Ledger, and usage/pricing.

Post-deploy beta validation:

- real Google OAuth callback and invite flow;
- real macOS Keychain and real agent runtime credential consumption;
- first design-partner onboarding loop and retention evidence;
- usage/cost guardrails under real capture volume;
- privacy controls under real source pause/export/delete workflows.

## Previous engine: `v1.1 Cloud Memory Engine`

`v1.1` turned the v1.0 capture-and-approve loop into an autonomous cloud memory
engine that ordinary users can trust without operating any of it. The
lane-by-lane plan lives in
[`.omx/plans/lore-v1.1-cloud-memory-engine-production-plan.md`](../.omx/plans/lore-v1.1-cloud-memory-engine-production-plan.md).

What changed versus v1.0 in production:

- Embeddings moved from in-API 384-dim placeholders to a private cloud
  Qwen3-Embedding-0.6B service producing 1024-dim dense vectors, with a
  graceful degraded mode when the embedding service is unavailable.
- Recall moved from Postgres-only similarity to **Qdrant hybrid recall**: a
  single Qdrant collection per environment with named vectors
  `dense_qwen3_1024` (cosine) + `sparse_bm25` (Qdrant native BM25), fused via
  reciprocal-rank-fusion with a payload filter that hard-isolates rows by
  `vault_id`/`account_id`/`project_id`. RDS `memory_records` remains the
  source of truth; Qdrant is the derived recall index, tracked through the
  `memory_index_documents` orchestration table.
- Capture became an **autonomous memory curator**: every observation runs
  through a deterministic redact → classify → score (importance / privacy
  risk / contradiction risk) → decide pipeline, optionally reinforced by a
  small model. The decision is one of `auto_save`, `auto_merge`,
  `auto_expire`, `inbox_review`, `discard`, all written to a
  `memory_decisions` audit log. Low-risk high-confidence observations skip
  the inbox; the Memory Inbox shows only the curator's exception queue.
- Memory lifecycle gained a **graph-lite** layer: extracted entities and
  relations decay, supersede, and get re-indexed alongside content vectors
  so recall stays consistent as the world changes.
- Worker fan-out moved to **AWS SQS** queues with DLQs; the API no longer does
  capture curation and indexing synchronously in the production path.
- Current production stack: EC2 + Docker Compose for `api`, `dashboard`,
  `memory-worker`, local Qdrant, and tunnel-facing services; RDS PostgreSQL 16
  as the source-of-truth database; private EC2 embedding service; AWS SQS for
  fan-out. ECS Fargate remains the next infrastructure migration target, not
  the current runtime.

Feature flags gate the rollout: `LORE_FLAG_CAPTURE_WORKER`,
`LORE_FLAG_AUTO_MEMORY_CURATOR`, `LORE_FLAG_AUTO_SAVE_LOW_RISK`,
`LORE_FLAG_MEMORY_INBOX_EXCEPTIONS_ONLY`, `LORE_FLAG_QDRANT_INDEXING`,
`LORE_FLAG_QDRANT_RECALL`, `LORE_FLAG_HYBRID_RECALL`,
`LORE_FLAG_GRAPH_EXTRACTION`, `LORE_FLAG_GRAPH_RECALL`, and
`LORE_FLAG_RERANKER`. Curator and recall flags default off so existing
v1.0-rc.2 installs continue to behave identically until operators opt in.

Release gates run via `pnpm release:smoke:v11` and
`pnpm release:verify:v11` and cover capture worker health, safe-vs-sensitive
auto-save routing, inbox approval materialising memories, Qdrant collection
and index coverage, hybrid-recall fixture parity, rollback flags, schema
bootstrap, and RDS / Qdrant restore proofs. Operator runbooks live in
`docs/deployment/v11-{ecs,rds,qdrant,sqs,embedding-service,observability}-runbook.md`.

Explicit non-goals for v1.1: cross-account memory sharing, surprise public
billing for the new compute, reranker-on-by-default, GA claims for the graph
layer, BYO model gateway integrations.

## Historical public release: `v0.6.0-alpha`

Release status:

- Public release tag: `v0.6.0-alpha` at `4f0eadf369e99e364bd06b7d3228b84a9f7501b9`.
- Public `main`: release tag plus post-release closure, integration validation,
  distribution, adoption-validation, npm-backed MCP Registry, and HN
  launch-readiness plus status-doc refresh commits.
- Verified npm-backed Registry closure source:
  `8637e37546b24caba4f170182beca613f0ba6d09`.
- npm-backed Registry closure CI: GitHub Actions run `25120831678`, success on
  `8637e37`.
- Launch-readiness source:
  `f7fe14234ca89c02397da230de3e27f90576c469`.
- Launch-readiness CI: GitHub Actions run `25115346417`, success on `f7fe142`.
- Website: `https://lorecontext.com/` and `https://www.lorecontext.com/` live.
- AI-readable docs: `/llms.txt` and `/llms-full.txt` live.
- Public API health: `https://api.lorecontext.com/health` is public in the
  current private cloud runtime; private cloud data surfaces remain auth-gated.
- MCP Registry: `io.github.Lore-Context/lore-context-mcp` active; Registry
  lists npm `@lore-context/server@0.6.0-alpha.1` and OCI
  `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.1`.
- npm MCP server package: `@lore-context/server@0.6.0-alpha.1` public; fresh
  install and MCP `tools/list` verified.
- HN launch pages: `/quickstart/`, `/blog/v0-6-distribution-and-trust-sprint/`,
  and `/benchmark/` are live on production domains.

See [release-status.md](release-status.md)
for the public-safe release snapshot.

Shipped:

- REST API with API-key auth, role separation, rate limiting, structured logging, and graceful shutdown.
- OpenAPI 3.1 document exposed at `/openapi.json` and verified by `pnpm openapi:check`.
- `pnpm quickstart` for local API keys, environment checks, first-query curl, and MCP config snippets.
- MCP stdio server using both legacy and official SDK transports.
- Next.js dashboard behind HTTP Basic Auth.
- Evidence Ledger API and Dashboard summary for retrieved, used, ignored, missing, stale, conflicting, and risky memory evidence.
- JSON-file persistence and Postgres+pgvector local fallback.
- Governance state machine, risk scanning, poisoning heuristics, and immutable audit log.
- Eval runner with Recall@K, Precision@K, MRR, stale-hit rate, p95 latency, and JSON/Markdown report export.
- MIF v0.2 import/export with supersession and contradiction fields.
- Docker Compose private deployment.
- Golden integration docs for Claude Code, Cursor, and Qwen Code.
- Public website and public alpha release notes.
- AI-readable website context at `/llms.txt` and `/llms-full.txt`.
- Redacted quickstart activation reports for dry-run and real first-value proof.
- Public-safe eval report CLI and smoke coverage for eval/MIF export.
- Distribution, launch, and design partner intake materials for human-reviewed release work.
- Public launch pages for quickstart, v0.6 changelog narrative, and benchmark methodology.

Still validating:

- clean-checkout time from clone to first `context.query` with real users
  (maintainer-run machine proof is already under 10 minutes);
- first Evidence Ledger view after a real agent workflow with real users
  (maintainer-run machine proof is already under 15 minutes);
- golden-path integration completion with fresh users: Claude Code actual CLI
  path is complete; Cursor actual-client prompt-level tool use is complete;
  Qwen Code actual-client tool use is complete;
- public-safe eval report on design-partner data;
- marketplace / hub submissions beyond the Official MCP Registry;
- Show HN retry after the account can post Show HNs;
- repeat production verification for the current HN launch pages after each website deploy;
- second-day retention and willingness to pay for private deployment/support.

## Historical validation focus after v0.9

Theme:

**Private beta activation, retention, and cost validation**

`v0.9` has shipped the Auto-Capture Beta runtime. The current work is to turn
the deployed beta into user evidence:

See [adoption-validation.md](adoption-validation.md) for the live evidence
matrix.

1. **Beta onboarding**: account/invite -> install token -> `lore connect` -> first source connected.
2. **Capture proof**: first real Claude Code/Codex session captured after explicit authorization.
3. **Memory control**: Memory Inbox approve/edit/delete and source pause/export/delete work for real users.
4. **Cross-agent recall**: at least two agents reuse the same vault memory with Evidence Ledger trace.
5. **Cost proof**: usage caps and operator views catch abnormal capture/query volume.
6. **Design partner learning**: use beta scorecards to decide whether v0.10
   should prioritize team vaults, ADP/BYOK, BYOC, billing, or connector depth.

Explicit non-goals:

- No stable GA claim.
- No broad public self-serve SaaS signup.
- No surprise overage billing.
- No remote MCP HTTP as the default path.
- No fake benchmark claims.
- No public npm quickstart package claim until `@lore-context/quickstart` is
  actually published and verified from a fresh shell.
- No autonomous outreach posting or marketplace submission.

Success metrics:

- Beta user to connected agent: `<10 minutes`.
- Beta user to first captured memory: `<15 minutes`.
- Beta user to first cross-agent recall: `<30 minutes`.
- First 20 beta users: `>=70%` complete connect + capture without maintainer screen-share.
- Fresh-user repeats for Claude Code, Codex, Cursor, and Qwen Code.
- `/llms.txt` and docs bundle live on the website.
- Official MCP Registry active, plus at least 4 marketplace/plugin listing
  drafts ready for human submission.
- npm MCP server install path verified from a fresh directory.
- One public-safe beta trust demo report ready for launch.

## Shipped `v0.9`: Auto-Capture Beta

The v0.9 lane is documented in
[v0.9-auto-capture-beta-plan.md](v0.9-auto-capture-beta-plan.md).

Theme:

**Capture first, control always, recall everywhere.**

Shipped P0 scope:

1. Universal session auto-capture through `lore watch`.
2. Hosted MCP endpoint with OAuth/install-token auth.
3. Chrome extension MVP for ChatGPT, Claude.ai, Gemini, and Perplexity.
4. Connector framework plus one production-grade connector: Google Drive if
   OAuth credentials are ready, Notion otherwise.
5. Memory Inbox 2.0 with approve/edit/reject/delete and sensitive/conflict/stale
   labels.
6. Source-aware recall and Evidence Ledger upgrade.
7. Free/Personal/Pro usage limits with graceful throttling and no surprise
   overage billing.

Deferred:

- full public GA;
- Stripe billing launch;
- full team/shared vault product;
- SAML/OIDC enterprise admin;
- BYOC or full Advanced Data Protection;
- broad connector catalog.

## Long-term direction

Lore should stay an open-core control plane, not a memory database.

Open core:

- local API;
- MCP server;
- dashboard;
- eval;
- MIF import/export;
- governance primitives;
- integration docs;
- public launch/demo materials that do not contain customer data.

Commercial/private layer:

- hosted sync;
- tenant administration;
- backup/restore;
- production observability;
- private deployment runbooks;
- enterprise controls;
- support and design-partner operations.
