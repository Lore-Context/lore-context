# Changelog

All notable changes to Lore Context are documented here. The format is based on
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v2.1.0] - 2026-05-15 (SHIPPED)

**Repo Graph API and MCP Tools.** Makes Lore's own repository graph a
first-class agent memory surface with deterministic indexing, API query routes,
symbol context, impact analysis, change detection, and read-only MCP tools.

Full release notes: [`docs/release-notes/v2.1.0.md`](docs/release-notes/v2.1.0.md).

### Added

- `@lore/repo-graph` deterministic TypeScript/JavaScript repository indexing.
- API routes for repo graph query, symbol context, impact, and change detection.
- MCP tools `repo.graph_query`, `repo.symbol_context`, `repo.impact`, and
  `repo.detect_changes`.
- Additive production schema `apps/api/src/db/schema-v21-repo-graph.sql`.

### Changed

- Root and API package versions bumped to `2.1.0` so `/openapi.json` matches the
  target release tag.
- Production release path uses the optimized split API/website deployment
  guardrails introduced after v2.0.9.

### Production safety

- Shipped to AWS production and the public website from final deployed SHA
  `665e6020bb2920453dc02bfb60a73be21e865bbb`, then tagged `v2.1.0` after the
  post-release audit.
- Repo graph schema is additive.
- Website deployment remains isolated from AWS API rollback.

## [v2.0.9] — 2026-05-15 (CODE-COMPLETE, PR-READY — pending human review, tag, and deploy)

**Agent Memory Self-Improvement Loop.** Turns agent execution traces into automatic memory quality improvements without asking normal users to label memory quality. A unified recipe contract drives passive eval dataset generation, shadow recipe trials, safe data-recipe proposals, and a promotion gate that keeps production mutation human-gated. Model fine-tuning explicitly deferred.

Full release notes: [`docs/release-notes/v2.0.9.md`](docs/release-notes/v2.0.9.md). Plan: [`.omc/plans/v2.0.9-plan.md`](../.omc/plans/v2.0.9-plan.md).

**Commit chain (6 implementation commits on `feat/v2.0.9-agent-memory-self-improvement-loop`, plus this E2 release-handoff docs update):**
```text
47c71f8 Establish recipe gates before memory self-improvement work
52db4e7 Derive eval data from passive agent evidence
8e04162 Compare memory recipes safely in shadow mode
f73d4d8 Propose memory hygiene recipes from passive evidence
a64d5e2 Keep butler maintenance shadow safe
8359701 Gate recipe promotion on evidence and rollback
```

**Verification:**
- `pnpm build` — ✅
- `pnpm test` — ✅
- `pnpm ops:doctor` — ✅
- `git diff --check` — ✅
- Plan linter — ✅
- Linear import dry-run — ✅ (10 tasks)
- Promotion gate — ✅ (33/33 checks)
- Recipe gate tests — ✅ (7/7)

**Acceptance:** 10 / 10 shipped. V2.0.9-A1 through V2.0.9-E2 all committed with PR evidence.

### Added (Lanes A / B / C / D / E)

- **Lane A** — Recipe contract: `ContextRecipeSpec`, `ContextRecipeTrial`, `PromotionDecision` types in `@lore/eval`; `ops/context-recipe.schema.json` + `default-v209.json`; `mapRecipeToAdapterConfig()` in `@lore/search`; `scripts/ops/check-context-recipes.mjs`; architecture/API docs with no-user-labeling principle.
- **Lane B** — Automatic eval dataset builder from passive agent evidence (used/success, used/failed, ignored/needed, stale/conflict, missing, safety); outcome signal types; sensitive content redaction; recipe-aware eval API upgrade preserving `/v1/eval/run` compatibility.
- **Lane C** — Shadow trial runner comparing baseline vs candidate recipes; recall/MRR/stale-hit/negative-leak/latency/cost reporting; CLI entrypoint; disabled-by-default scheduler wiring (`LORE_CONTEXT_RECIPE_SHADOW_ENABLED=1`); no production mutation path.
- **Lane D** — Data-recipe proposal types (extraction thresholds, inbox thresholds, stale/supersede heuristics, merge suggestions, wiki/graph cadence); safe local proposals; admin-only high-risk actions; Butler/wiki/graph shadow-safe and budget-capped.
- **Lane E** — Promotion gate (draft → candidate → shadow → staged → active → rollback); baseline-vs-candidate evidence requirements; human-gated activation; Linear issues sampled (BRA-625, BRA-629, BRA-634); team handoff docs.

### Deferred to v2.0.10

- Fine-tune reranker/extractor/graph builder if recipe optimization plateaus
- Dashboard visualization of recipe improvement history
- Per-customer managed recipe policy packs
- Production rollout automation

### Production safety

- No production deploy from this branch. Tag `v2.0.9` NOT pushed.
- Shadow scheduler defaults to disabled (`LORE_CONTEXT_RECIPE_SHADOW_ENABLED=0`).
- Active recipe promotion requires human operator approval (`decidePromotion()` returns `blocked` without it).
- Zero impact on v2.0.5/v2.0.7 production runtime.

## [v2.0.5-beta.0] — 2026-05-13 (CODE-COMPLETE, BETA — pending external crypto audit)

**Secret Vault for AI Agents.** Zero-knowledge, MCP-native, three-button authorization (`一次` / `永久` / `拒绝`). One prompt per (agent, machine), then never again. 6 MCP tools (`secret.list / get / add / update / revoke / audit_log`) registered alongside `memory.*` and `code.*`. Full release notes: [`docs/release-notes/v2.0.5.md`](release-notes/v2.0.5.md). Plan: [`.omc/plans/v2.0.5-plan.md`](../.omc/plans/v2.0.5-plan.md).

**Acceptance:** 49 / 50 PASS, 1 deferred-with-runbook (V2.0.5-B2 Windows DPAPI manual smoke; `docs/runbooks/v2.0.5-windows-dpapi-smoke.md`).

**Test evidence:**
- `pnpm -F @lore/shared test` — 20 files / 292 tests passed
- `pnpm -F @lore-context/server test` — 6 files / 68 tests passed
- `pnpm -F dashboard build` — green; all `/settings/secrets/*` routes prerender
- `python3 -m pytest packages/sdk-python/tests/secrets/test_cross_language_parity.py` — 6 / 6 passed (TS↔Python byte-identical for HKDF chain + AES-GCM)
- Argon2id bench: 545.9 ms median (target ≥ 500 ms) on M-series Mac
- `pnpm audit --prod` — 0 CRITICAL/HIGH for crypto deps

### Added (Lane E / B / S / M / A / U / I / T / D)

- Cryptography: HKDF-SHA256 chain + AES-256-GCM with deterministic 4|8 counter nonce + immutable `secret_id` AAD + Argon2id (256 MB / 4t / ≥500 ms) + SRP-6a + nonce monotonicity (1M property test) + best-effort key zeroing + master-key rotation with `master_key_version` partial-state resume + Python parity via `cryptography` lib with committed cross-language test vectors.
- Machine identity: `agent_self_id = HMAC-SHA256(device_secret, clientInfo.name)`; `device_secret` stored in OS keychain (macOS Security / Windows DPAPI / Linux libsecret via `@napi-rs/keyring`) + encrypted file fallback (0600). NO session_id in identity hash so 永久 grants survive reconnects / restarts forever.
- Server storage: `apps/api/src/db/schema-v23-secrets.sql` adds `secret_vaults` + `secret_items` (with `nonce_counter` + `master_key_version` + `revoked_at`) + `secret_audit_log` (with `prev_event_hmac` + `event_hmac`) + `secret_agent_grants` (with `expires_at` nullable for true-permanent grants). Partial unique indexes let soft-deleted rows coexist. Cascade-delete validated.
- MCP tools: 6 tools registered (`secret.list / get / add / update / revoke / audit_log`). `secret.list` value-leak defense (no `ciphertext` / `auth_tag` / `nonce` / `value` / `plaintext` keys). Label-existence pre-check on `secret.get` blocks enumeration oracle.
- Authorization: pure two-phase state machine. `永久` grant has zero auto-TTL; `拒绝` produces NO persistent ban; 5-min per-agent rate-limit is the only silent-deny path. 3-channel fallback cascade (in-host → OS toast → email tertiary for high-value only) with bounded windows + total budget abort.
- Dashboard: `apps/dashboard/app/settings/secrets/*` full route tree + 5 components (`BetaBanner` mandatory until audit, `OnboardingGate` pre-audit checkbox required, `ThreeButtonPrompt` 60s countdown, `EmergencyKitPdf` inline-built valid PDF 1.4 — NO email-to-self by design, `AuditChainStatus`). Strict CSP + `X-Frame-Options: DENY` + `Referrer-Policy: no-referrer` on every `/settings/secrets/*` route via `middleware.ts`.
- Import: 1Password 1PIF + Bitwarden JSON (duplicate-skip, encrypted-export rejected) + `.env` (auto `category=env_var`).
- Audit chain: client-verified HMAC chain (event_hmac + prev_event_hmac) + encrypted `last_known_hmac` cache for cross-device tail-truncation detection.
- Docs: 11 markdown docs (setup-guide, security-model, security-whitepaper, agent-authorization-explained, emergency-kit-recovery, comparison-with-1password, 3 import guides, README, privacy/README cross-links). Supply chain section: sigstore + SLSA L3 + pinned deps + CI audit + SRI. Windows DPAPI closure runbook.

### Deferred

- V2.0.5-B2 Windows DPAPI smoke — code path API-equivalent to verified macOS / Linux paths; closure runbook at `docs/runbooks/v2.0.5-windows-dpapi-smoke.md`. Target: within 30 days of v2.0.5 GA.
- Playwright e2e for dashboard routes — current coverage is `next build` typecheck + component unit tests. v2.0.6 staging-soak deliverable (matches v2.0.2 / v2.0.3 / v2.0.4 precedent).
- External cryptographic audit (Cure53 / Doyensec / Trail of Bits) — gated by whichever earliest of first paying user, 5 alpha users, 3rd-party-data feature, 90 days post-GA.

### Production safety

- No production deploy from this PR. Tag `v2.0.5-beta.0` ships behind feature flag `LORE_FLAG_SECRET_VAULT_BETA` (default OFF).
- Schema migration `schema-v23-secrets.sql` is additive only (4 new tables, no ALTER on existing tables). Safe on v2.0.4 production state.
- Zero impact on v2.0.4 Code Knowledge Graph or v2.0.3 / v2.0.2 / v2.0.1 functionality.

## [v2.0.4] — 2026-05-13 (UNRELEASED)

Code Knowledge Graph release. 8 lanes (K/R/C/U/P/M/Q/Z), 40 acceptance criteria, 180 unit + integration tests pass locally. Schema-v22 sits on top of v2.0.2 schema-v21 (canonical-index) in `scripts/release/prod.mjs` apply list.

### Added

- **Lane R** — `apps/api/src/db/schema-v22-code-graph.sql` with `code_repos` / `code_files` / `code_symbols` / `code_relations`. `vault_id TEXT REFERENCES vaults(id)` matches production PK type. `UNIQUE (repo_id, file_id, qualified_name, start_line)` supports overloads + idempotent upsert. Nullable `dst_symbol_id` with `dst_qname_unresolved` for cross-batch relation resolution. HNSW + trigram + btree indexes.
- **Lane R** — `apps/api/src/code-graph/` — `route.ts` (`POST /v1/code-graph/upsert`), `resolver.ts` (transactional ON CONFLICT upsert + second-pass relation backfill), `validators.ts` (per-field content-type validators), `embedding-consumer.ts` (BullMQ `code_symbol_embed` worker).
- **Lane C** — 7 new MCP tools registered in `apps/mcp-server/src/index.ts`: `code.search`, `code.context`, `code.callgraph`, `code.references`, `code.impact`, `code.list_repos`, `code.search_text`. Plus `context_query` `mode="code"` interleaves memory + code envelope in a single call.
- **Lane C** — 7 server-side route handlers under `apps/api/src/code-graph/handlers/`. Vault-scoped on every query. Recursive-CTE callgraph + impact ensures algorithmic consistency (`code.impact(X, depth=Infinity) === BFS-closure of code.references(X)`).
- **Lane K** — `@lore-context/code-indexer` (TypeScript) at `packages/code-indexer/` — tree-sitter parser, AST walker, chokidar file watcher with 500ms debounce, HTTP uploader with exponential backoff + 429 backpressure, git-hook installer, CLI binary `lore-index`.
- **Lane K** — `lore-context-code-indexer` (Python) at `packages/code-indexer-python/` — Pydantic v2 parity package, watchdog watcher, console-script `lore-index`.
- **Lane P** — Sealed Zod schema `UpsertPayloadSchema` in `packages/sdk-typescript/code-graph-types.ts` is the only legal upsert-payload constructor. Discriminated union on `e2e_encrypted` ensures Tier-1 identifier strictness AND Tier-2 base64-ciphertext support.
- **Lane P** — Client-side privacy filter strips bodies / literals / variable values / in-body comments. Honors `.gitignore`. File denylist (`*.env`, `*.pem`, etc.) + 500 KB size gate. `doc_comment` runs through `SECRET_PATTERN_DENYLIST` regexes.
- **Lane P** — Tier-2 client-side encryption (`packages/code-indexer/src/encryption-tier2.ts`): scrypt(N=65536) + AES-256-GCM. `--tier2-passphrase` CLI flag + `LORE_TIER2_PASSPHRASE` env. Encrypted symbol/relation fields ship as base64 ciphertext; server stores ciphertext + sets `code_repos.e2e_encrypted = TRUE` + skips embedding enqueue. Residual leakage documented in `docs/privacy/code-graph-privacy-model.md` (file paths, line ranges, graph topology remain visible — framed honestly as "symbol-name obfuscation", not "E2E encryption").
- **Lane P** — `scripts/payload-audit.mjs` CI gate rejects raw-object payload construction at any callsite that mentions `UpsertPayload` or the upsert endpoint.
- **Lane P** — `scripts/code-graph-privacy-audit.mjs` user-runnable CLI prints metadata histogram (counts, kinds, languages, sizes) — never samples symbol contents.
- **Lane M** — Per-language extractors at `packages/code-indexer/src/lang/` for Tier-1 (TS/JS/TSX/JSX/Python/Go) and Tier-2 (Rust/Java/C/C++/C#/Ruby/PHP). Hand-labeled fixtures + recall/precision tests. Honest measurements logged in `packages/code-indexer/LANGUAGE_COVERAGE.md`.
- **Lane Q** — Benchmark harnesses at `scripts/bench/`: `code-storage-growth.mjs` (5.86 KB/symbol on a 1000-symbol seed), `code-search-latency.mjs`, `code-callgraph-latency.mjs`, `code-graph-gate.mjs` orchestrator.
- **Lane Z** — 7 docs: `docs/sdk/code-indexer-quickstart.md`, `docs/sdk/code-indexer-cli-reference.md`, `docs/sdk/code-graph-mcp-tools.md`, `docs/sdk/code-graph-integration-claude-code.md`, `docs/sdk/code-graph-integration-cursor.md`, `docs/sdk/code-graph-vs-gitnexus.md` (honest comparison vs GitNexus / codebase-memory-mcp / Sourcegraph Cody / Aider), `docs/privacy/code-graph-privacy-model.md` (Tier-1 allowlist/denylist + Tier-2 residual leakage).
- **Lane K6** — `.github/workflows/sdk-publish.yml` extended with `publish-code-indexer-typescript` + `publish-code-indexer-python` jobs, `dry_run` workflow_dispatch input, per-tag `if:` guards.

### Changed

- `package.json` + `apps/api/package.json` version bumped 2.0.3 → 2.0.4.
- `scripts/release/prod.mjs` apply list extended: `schema-v21-canonical-index.sql` (v2.0.2) then `schema-v22-code-graph.sql` (v2.0.4) — both JS array + shell list.
- `.gitignore` adds `.venv/` / `__pycache__/` / `*.egg-info/` / `.pytest_cache/` so new Python package builds don't pollute the index.

### Fixed (post code-review pass — PR #205)

- Python `extractSignature` in `packages/code-indexer/src/walker.ts` was using `indexOf(":")` (first colon), which truncated type-annotated signatures like `def foo(a: int) -> bool:` at `def foo(a`. Now uses `lastIndexOf(":")` with regression test.
- `BODY_FRAGMENT_PATTERN` in `apps/api/src/code-graph/validators.ts` over-rejected TS object-type returns like `(a: number) => { x: string }`. Now uses brace-depth-aware statement-keyword check.
- `apps/api/src/code-graph/resolver.ts` wrapped in `BEGIN`/`COMMIT` transaction via `pool.connect()` + dedicated client. On error, ROLLBACK.

### Deferred to v2.0.4.1 follow-up

- M2 (Tier-1 call precision ≥85%): tree-sitter records all calls including stdlib (`Array.from`, `fmt.Errorf`). Achieving 85% needs an LSP-style type-inference filter layer. Honest measurements (TS 9.1%, Py/Go 0%) logged in `packages/code-indexer/LANGUAGE_COVERAGE.md`.
- M3 (Tier-2 Java/Kafka recall ≥90% on real corpus): grammar binary packages not bundled in this PR; 10-class local fixture in place.
- Z2 (SDK-published copy-paste examples): gated on first npm publish.
- Z3 (operator-reviewed honest comparison): doc written honestly; needs operator sign-off comment on PR.
- C2 / C3 / Q1 / Q3 (perf p95 on seeded 50k-symbol vault): bench harnesses ready; actual p95 enforcement runs on CI runner.
- K3 / K4 / K6 / U4: CI-runner-gated.

## [v2.0.1] — 2026-05-13 (SHIPPED)

Lane L1 Commercial Closure Reality patch. Tag `v2.0.1` targets commit `a7821f293d069736fafd8701763675394d3737d3`. Production image `ghcr.io/lore-context/lore-context-api:a7821f293d06` + dashboard at same SHA deployed to EC2 `[redacted]` ([redacted]). RDS schema upgraded to v20 (`usage_overage_reports` + `idx_usage_meter_events_vault_event_time` present). `LORE_FLAG_V20_QUOTA_GATE=0` (quota gating shipped but off pending operator flip). Full release notes: [`docs/release-notes/v2.0.1.md`](release-notes/v2.0.1.md).

Patch on top of v2.0.0 to ship the real commercial-closure code that the v2.0.0 release notes mistakenly claimed was already shipped. The v2.0.0 cutover delivered Stripe live keys + 7 live prices + webhook subscription, but the runtime quota / overage / downgrade code did not exist. v2.0.1 adds:

- `apps/api/src/usage/quota-engine.ts` — pure-function tier × meter quota decision (within_quota / hard_blocked-free / overage_metered-paid)
- `apps/api/src/usage/meter-reader.ts` — current-period (calendar-month UTC) aggregation from `usage_meter_events`
- `apps/api/src/usage/event-publisher.ts` — thin wrapper over `cloud-store.recordUsageEvent`
- `apps/api/src/usage/tier-resolver.ts` — canonical Tier from `billing_subscriptions`, defaults free
- `apps/api/src/billing/overage.ts` — `queueOverage` writes to `usage_overage_reports`, `flushPendingOverages` calls Stripe `billing.meterEvents.create` with idempotent `identifier`
- `apps/api/src/billing/downgrade.ts` — on `customer.subscription.deleted`, sets `billing_subscriptions.tier='free'` + audit
- `apps/api/src/db/schema-v20-usage.sql` — index on `usage_meter_events(vault_id, event_type, occurred_at DESC)` + new `usage_overage_reports` table
- Wired into `/v1/memory/write` and `/v1/memory/search` behind `LORE_FLAG_V20_QUOTA_GATE` (default 0)
- Wired into `webhook-route.ts`'s `customer.subscription.deleted` branch via optional `downgradeOnSubscriptionDeleted` method
- 35+ unit tests in `apps/api/src/usage/__tests__/` and `apps/api/src/billing/__tests__/`

## [v2.0.0] — 2026-05-12 (SHIPPED)

PMF Closure release. Turns v1.9's code-complete commercial substrate into a self-serve SaaS able to accept its first real paid customer end-to-end. 6 lanes shipped, 18 of 30 acceptance criteria PASS, 9 DEFERRED to v2.1 carry-forward (chiefly Stripe live cutover + OpenMeter VM provisioning, both operator-gated), 2 WARN (smoke probe auth + health-extension visibility), 1 partial-WARN, zero FAIL.

Full release notes: [`docs/release-notes/v2.0.0.md`](release-notes/v2.0.0.md). Plan: [`.omc/plans/v2.0-plan.md`](../.omc/plans/v2.0-plan.md).

### Added

- **L1 (Commercial closure)**: Stripe live-mode env switch (`LORE_STRIPE_MODE`), quota engine (`requireQuota` sibling), CloudEvents usage publisher, overage Stripe `usage_record` recorder with SHA-256 idempotency, downgrade-data freeze planner, `schema-v20-usage.sql`, OpenMeter IaC (deferred to v2.1).
- **L2 (Console rebuild)**: Tailwind CSS 4.3 + shadcn/ui adopted; six new dashboard routes (`/dashboard`, `/memories`, `/api-keys`, `/usage`, `/account`, `/docs`); mobile responsive throughout; API-key plaintext security Playwright test.
- **L3 (Developer SDKs)**: `@lore-context/sdk@0.1.5` on npm + `lore-context@0.1.0` on PyPI (both Fern-generated from `apps/api/src/openapi/lore-api.yaml`); three quickstart docs; MCP / capture regression scaffolds; `.github/workflows/sdk-publish.yml` tag-triggered publish.
- **L4 (Customer success)**: 5 SES email templates (welcome, payment-failed, quota-80/100, subscription-cancelled) + `triggers.ts` with 11 tests; `status.lorecontext.com` Upptime status page; Linear `LORE-SUPPORT` project in BravonAI team; customer-success runbook with per-tier SLA.
- **L5 (Legal + minimum P0)**: Privacy v2 + ToS v2 counsel-signed-off + published; per-tier data retention policy; downgrade data policy; CloudWatch alarm `Lore-EC2-CPU-High`.
- **L6 (Feature flag activation)**: 8 production flags flipped via accelerated `scripts/release/v20-feature-flag-batch-flip.sh` (idempotent, delta-aware stay-0 invariant): `LORE_EMBEDDING_CACHE_ENABLED`, `LORE_OTEL_ENABLED` + `LORE_TRACE_EXPORT_ENABLED`, `LORE_SEARCH_AUDIT_ENABLED`, `LORE_SEARCH_ADAPTER_V14`, `LORE_DASHBOARD_PUBLIC_SAAS`, `LORE_FLAG_HYBRID_RECALL` + `LORE_FLAG_QDRANT_RECALL` + `LORE_FLAG_QDRANT_INDEXING` + `LORE_QDRANT_NATIVE_FUSION` + `LORE_STREAMS_ENABLED` (7-stream) + `LORE_FLAG_GRAPH_EXTRACTION` + `LORE_FLAG_GRAPH_RECALL`, `LORE_FLAG_RERANKER` (tier-gated via `feature-gate.ts`), `LORE_LLM_PROVIDER_CHAIN` + `LORE_EMBEDDING_COALESCER_ENABLED`. Plus 14-flag CloudWatch watch alarms (14-day window).

### Changed

- `compose.production.yml` synced to production EC2 (was stale, missing `LORE_PUBLIC_HOST_ALLOWLIST` + 10 other env refs)
- API host port restored to 3010 to match Cloudflare tunnel config
- `feature-gate.ts` extended with `isRerankerAllowed(tier)` and `isTemporalGraphAllowed(tier)` — Free/Go always false regardless of master flag
- `scripts/release/prod.mjs` apply chain extended with `schema-v20-usage.sql`
- `apps/website/src/pricing-tiers.json` extended with quotas + overage + history-days per tier

### Fixed

- L4 dist-time email template loading — `postbuild` script copies `*.html.tmpl` into `dist/`
- Python SDK `types/` directory stdlib collision — regenerated with `package_name=lore_context` config, all code now under `src/lore_context/`
- TS SDK `private: true` flag removed
- PyPI publish idempotent with `twine upload --skip-existing`
- DCO compliance — all release commits carry `Signed-off-by`

### Out of scope — carry-forward to v2.1

Stripe live cutover, OpenMeter VM provisioning, MCP/capture real client smoke tests, Multi-region failover, ECS Fargate migration, SOC 2 Type 1 kickoff, Public launch, Memory Engine v2 (Butler v2 default-on), Connector write paths (Notion/Linear/Slack), Reranker GPU GA, npm publish provenance (private repo limitation), pre-existing stay-0 flag review.

## [v1.9.0] — 2026-05-11

SaaS Silent Ship + OSS Unlock (individual subscriptions).

### Added

- Stripe billing for individual tiers (Free `$0` / Go `$9.99/mo` / Plus
  `$19.99/mo` / Pro `$99.99/mo`) with Checkout, Customer Portal, webhook,
  dunning state machine (3-day grace → 4-day degraded → 7-day suspended).
- Auth0 OIDC integration alongside existing Google OAuth.
- Per-tier feature gating module with documented feature matrix.
- Carding detector and spam onboarding hardening (`apps/api/src/abuse/`).
- Privacy Policy v2 + Terms of Service v2 drafts (counsel review pending).
- Sub-processors disclosure page + cookie consent banner.
- LICENSE switched to Apache License 2.0 (full text); NOTICE populated with
  bundled-dependency attributions; root + apps/api `package.json.license` =
  `Apache-2.0`.
- OSS-vs-commercial-boundary documentation (`docs/oss-vs-commercial-boundary.md`).
- DCO GitHub Action (`.github/workflows/dco-check.yml`) enforcing
  Signed-off-by on every PR commit.
- Issue templates (bug, feature, good-first-issue) with Discussions / docs
  / security contact links.
- Dependency license matrix (`docs/dependency-licenses.md`).
- OSS sync script for private→public repository synchronization
  (`scripts/oss-sync/sync.mjs`, dry-run by default).

### Out of scope (carry-forward to v2.0)

- Multi-region failover ([redacted] standby).
- SOC 2 Type 1 observation kickoff.
- Public launch (HN / TechCrunch / dev.to).
- Public benchmark publication.
- Connector write paths (Notion / Linear / Slack).
- Reranker self-host GPU GA (gated on AWS quota).
- Team / Enterprise pricing tiers (multi-seat, SSO).

## [v1.8.0] — 2026-05-11

Partner activation + LLM-augmented memory engine release. Adds first-class
OpenRouter support to the model gateway, ships the four butler memory-grooming
phases (prune / merge / resolve / surface) behind a default-off kill switch,
brings partner onboarding online (vault export, delete-request, per-vault rate
limit, dashboard settings, partner onboarding wizard), flips
`LORE_WIKI_LLM_REWRITER` and `LORE_GRAPH_LLM_EXTRACTOR` defaults to ON, and
addresses v1.7 deferred items (real-traffic capture-latency proof, rotation
Lambda IaC).

24 PRs (`#152, #156–#178`) merged to `main` at `d45d0f2`.

### Added

- **G lane (gateway):** OpenRouterProvider (`G1`), 5-tier task→model router
  (`G2`), per-vault per-task LLM cost tracker (`G3`),
  `/health.llmProviderChain` probe with 500ms deadline (`G4`), OpenRouter
  secret in `bootstrap-secrets.mjs` (`G5`), task-routing benchmark doc
  (`G6`).
- **M lane (memory engine):** BullMQ scheduler with Redis SETNX leader
  election (`M1`), four butler phases prune/merge/resolve/surface
  (`M2.1–M2.4`), Claude Sonnet contradiction detector with deterministic
  10% sampling (`M3`), butler audit schema (`M5`), butler dreams +
  playbooks endpoints (`M6`), `lore wiki-recompile` CLI (`M7`), 50-case
  butler quality eval with precision ≥ 0.85 gate (`M8`), capture-latency
  k6 benchmark (`M10`), `LORE_BUTLER_ENABLED=0` kill switch (`M11`),
  butler dashboard page (`M13`).
- **P lane (partner activation):** vault export route (`P2`), SES +
  SendGrid fallback email service (`P3`), admin invite mint (`P4.1`),
  invite-accept vault creation (`P4.2`), 30-day delete-request grace
  period (`P5`), per-vault rate limit + quota (`P6`), dashboard Settings
  page (`P8`), 4-step partner onboarding (`P9`).
- **Q lane (quality):** trigram benchmark script (`Q1`), embedding-cache
  key normalization (`Q2`), embedding-cache TTL tuning (`Q4`), Cohere
  batch+cache wrapper (`Q5`), 15-min health-check cron (`Q6`),
  v1.7-incremental-review CI (`Q7`), supervised v1.7-ship review (`Q8`),
  v1.8 polish results aggregation (`Q9`).
- **H lane:** version bumps to 1.8.0 (`H2`), v1.7 tag invariant guard
  (`H3`), CHANGELOG backfill (`H4`), release-status refresh (`H5`),
  automated rotation Lambda IaC (`H6`).

### Changed

- `LORE_WIKI_LLM_REWRITER` and `LORE_GRAPH_LLM_EXTRACTOR` default flipped
  to **ON** (`M4`). Operators set the env to `0/false/no/off` to opt out.
- All Postgres SELECT-by-id paths now require explicit vault scope; static
  guard count `cloud-store.ts` baseline 9 → 15 (`P1`).
- `/health` response now includes optional `llmProviderChain`; existing
  fields preserved (`G4`).

### Fixed

- IDOR-class hole on `cloud-store.ts` and adjacent capture/device/session/
  job/batch/source by-id paths (`P1`, BRA-500). Threaded vault context
  through worker rehydration.

### Security

- `[redacted]openrouter-api-key`, `[redacted]email-provider-api-key`,
  `[redacted]invite-signing-key` registered in AWS Secrets Manager
  (`[redacted]`).
- Admin invite tokens stored as SHA-256 hash only; raw token only in the
  outgoing email body.
- Email service hashes recipient addresses in stderr logs (no plaintext
  PII).

## [v1.7.0] — 2026-05-10

Partner-ramp hardening release. Closes critical multi-tenant isolation fixes,
production stability blockers, medium defense-in-depth items, v1.6 cleanup
debt, and Cohere reranker implementation with stub fallback. Real partner SLO
recalibration and capture-to-recall probe work remain carried forward to v1.8
because the plan's real-traffic gate was not met at cutover time.

### Added

- Cohere reranker client, factory, fallback behavior, and v12 orchestrator
  wiring (`A1.1` / `A1.2`).
- Version bump, schema list, Jina secret mapping, release-artifacts trigger
  audit, and canonical v14 sidecar compose reconciliation
  (`A2` / `A3` / `A4` / `A5` / `A6`).

### Changed

- Production Cohere cutover is gated as part of the v1.7.0 deployment, with
  rollback documented as `LORE_RERANKER_PROVIDER=stub` plus API restart.
- Real-traffic SLO baseline, capture-to-recall probe, and optional automated
  rotation Lambda work are carried forward to v1.8.

### Fixed

- Critical multi-tenant isolation and production crash blockers (`S1`-`S5`).
- Request timeout, Redis timeout, rate limiter, DB pool, cold-start, embedding
  circuit breaker, audit, host allowlist, and legacy key shadow issues
  (`S6`-`S14`).
- Cloud-store vault filters, security headers, error redaction,
  secure-cookie default, and production SSL mode rejection (`S15`-`S19`).

### Security

- Multi-tenant isolation, host allowlist, security headers, error redaction,
  secure-cookie, production SSL mode, and legacy key shadow hardening shipped
  in the v1.7 line.

## [v1.6.0-beta] — 2026-05-08

Production Hardening + Secrets Beta for the private cloud line. The release
ships search-audit caller wiring, AWS Secrets Manager bootstrap, GitHub Actions
OIDC release automation, and v14 CloudWatch alarm relocking against a synthetic
baseline. Reranker GA and SaaS GA path work are explicitly deferred to v1.7,
and real-traffic SLO truth-up remains blocked by zero partner traffic.

### Added

- GitHub Actions AWS authentication now uses OIDC short-lived credentials
  through the `lore-github-actions-deploy` role instead of long-lived access
  keys.
- Search audit caller wiring records 1%-sampled `/v1/memory/search` rows in
  `memory_search_audit`, hashing PII before writes.
- Secrets Manager bootstrap and resolver support `secretsmanager://` references
  for production and staging secrets, with health visibility through
  `secretsBootstrapMode`.
- Partner onboarding playbook, questionnaire, data handling templates,
  real-traffic baseline tooling, baseline threshold verifier, and onboarding
  funnel migration were added across Lane D.

### Changed

- Production cutover replaced plaintext production secret values with
  `secretsmanager://[redacted]<suffix>` references and runs the API with
  `LORE_SECRETS_BOOTSTRAP_FAIL_MODE=hard-fail`.
- The 12 v14 CloudWatch alarms were relocked to charter floors using the
  synthetic v1.6 baseline from `2026-05-08` because partner traffic datapoints
  were unavailable.
- Reranker GA, Cohere comparison, SaaS GA path, real-traffic SLO truth-up, and
  capture-to-recall probe work are deferred to v1.7.

### Fixed

- Staging cutover reality gaps around compose `env_file` pass-through,
  Dockerfile entrypoint interaction, startup wrapper detection, preflight
  parsing of `secretsmanager://` URLs, and related bootstrap issues were fixed
  before production cutover.
- `LORE_JWT_SECRET` was demoted from required to optional after audit showed
  production never had it set and the active auth path used `SESSION_SECRET`.

### Security

- Seven required production credentials moved from plaintext EC2 env files to
  AWS Secrets Manager references, with hard-fail bootstrap semantics in
  production.
- Long-lived AWS access keys were rotated out of GitHub Actions secrets in
  favor of one-hour OIDC credentials.

## [v1.5.0-beta] — 2026-05-07

Production Quality Truth-Up + Cleanup Beta for the private cloud line. This
release does not add user-visible product features; it closes gaps between the
v1.4 release narrative and actual production runtime, removes orphaned code,
and ships observability and schema wiring needed to make v1.4 SLO claims
verifiable.

### Added

- OTel metrics exporter pipeline with six instruments and an ADOT collector
  sidecar, gated by `LORE_OTEL_ENABLED=1`.
- Schema apply wiring for v1.3 bitemporal and v1.4 audit, trace-export, and
  graph-trigram SQL patches.
- SLO baseline collection and alarm relock scripts:
  `collect-v14-baseline.mjs` and `relock-v14-alarms.mjs`.
- v1.6 secrets migration design stub documenting the deferred seven-secret
  migration plan and risk assessment.

### Changed

- Production Qdrant collection was switched from `lore_memories_v11` to
  `lore_memories_v12` after inspection showed the v12 collection had the
  tenant filter indices required for pushdown.
- v1.5 is a code-level and deployment-config closure; running production
  behaviour remains on the v1.4 image until operator activation steps are
  performed.
- CloudWatch alarms, OTel rollout, baseline collection, and `SearchAuditRecorder`
  caller wiring are documented as pending until their activation or follow-up
  work completes.

### Fixed

- Removed 3,376 lines of orphaned v1.5/v1.6 code from `main` while preserving
  the v1.4 production path.
- Declared 17 v1.4 cache / v14 adapter environment keys in
  `compose.production.yml` so Docker Compose no longer silently drops host env
  values needed by the production service.
- Wired idempotent schema patches that production code expected but deploy
  scripts had not applied.

### Security

- Documented and accepted the medium-risk plaintext credential state for v1.5,
  with migration deferred to v1.6 rather than half-shipped in the v1.5 window.

## [v1.4.0-beta] — 2026-05-06

Production Quality Uplift Beta for the private cloud line. Production traffic
was cut over to the cache-enabled v14 sidecar on `2026-05-06T00:21Z`. The
release keeps the real production embedding path, adds Redis-backed embedding
cache and request coalescing, and targets the v1.4 phase latency goal while
deferring the stricter 1000 ms goal to v1.5.

### Added

- `SearchAdapterV14` is active in production with seven diagnostic recall
  streams.
- Redis ElastiCache-backed embedding cache is wired into the search path with
  LRU fallback and request coalescing.
- Authenticated trace / Evidence Ledger routes are included, with
  `GET /v1/recall/traces/{trace_id}` documented as the primary recall-chain
  inspection route.
- Lane B CloudWatch alarms were deployed with provisional thresholds.

### Changed

- Qdrant production runtime is at least 1.10; the post-release audit verified
  Qdrant `1.15.4`.
- Per-stream timeout hardening ships as a v1.4 code default, while production
  has no explicit `LORE_STREAM_TIMEOUT_MS` override.
- The v1.3 stack remains preserved on `127.0.0.1:3000` as the rollback target,
  with v1.4 sidecar traffic routed on `127.0.0.1:3010`.

### Fixed

- PR #30 fixed the Redis attach race by mutating the existing cache instance
  instead of swapping a new instance behind a stale closure.
- The 2026-05-07 truth-up corrected the v1.4 narrative: cache wiring is
  functional, and the lack of cache-hit SLO evidence reflects zero real user
  search load rather than a confirmed wiring bug.

### Security

- Authenticated trace and Evidence Ledger routes shipped in the v1.4 line.

## [v1.3.0-beta] — 2026-05-05

Search-Completeness Beta (private cloud only). Closes the v1.2 read-path debt
identified in `docs/v1.3-search-completeness-plan.md` §0: every retrieval
stream Lore advertises is now mounted in the RRF fusion, populated by a real
provider, and validated against the v13 production gate before any release
promotion. Source-of-truth re-anchored on `Lore-Context/lore-cloud` `main`
(no longer the `codex/v12-integration` working branch). The OSS edition
remains locked at the v1.0 boundary.

### Added

- **`HybridSearchOrchestrator`** in `packages/search/src/orchestrator-v12.ts`
  — runs the seven candidate-emitting streams (`qdrant_dense`, `qdrant_sparse`,
  `postgres_fts`, `postgres_pgvector`, `graph`, `temporal`, `wiki`) concurrently
  via `Promise.allSettled` with a 1.5 s per-stream timeout. One stream's
  reject/timeout never fails the request; surviving streams' fused order is
  returned. Per-request `MemorySearchInputV12.streams?` selects a subset
  intersected with installation default `LORE_STREAMS_ENABLED`.
- **Three new candidate-emitting providers** that close the §1.2-deferred
  streams: `GraphRetrievalProvider` (entity walk + depth-2 relations,
  `packages/search/src/graph-retrieval-v12.ts`), `TemporalRetrievalProvider`
  (latest-valid-by-subject+predicate,
  `packages/search/src/temporal-retrieval-v12.ts`), and
  `WikiRetrievalProvider` (FTS + pgvector via the new `wiki_embedding`
  column, `packages/search/src/wiki-retrieval-v12.ts`). Pure temporal
  helpers moved to `packages/search/src/temporal-memory-helpers.ts` and
  re-exported from `apps/api/src/temporal-memory-v12.ts`.
- **`LocalCrossEncoderReranker`** in
  `packages/search/src/rerankers/local-cross-encoder.ts` — post-fusion
  replacer (not a stream contributor) targeting `BAAI/bge-reranker-v2-m3`
  with a default top-N of 50, gated by `LORE_RERANKER_ENABLED`.
- **Wiki compiler v13** (`apps/api/src/workers/wiki-compiler-v13.ts`) +
  schema migration `ALTER TABLE memory_wiki_pages ADD COLUMN IF NOT EXISTS
  wiki_embedding vector(1024)` and HNSW index. Lifecycle propagation marks
  pages `stale` when supporting evidence drops below the high-confidence
  threshold and `archived` when the entity is fully invalidated. Optional
  `LORE_WIKI_LLM_REWRITER` rewriter is off by default.
- **Graph extractor v2** — regex extractor lifted from 8 to 38 patterns
  (temporal / causal / comparison / possessive / location families,
  stop-word filter, morphological normalization, entity dictionary cache).
  Optional `LLMGraphExtractor` (`apps/api/src/graph-extractor-llm-v13.ts`)
  behind `LORE_GRAPH_LLM_EXTRACTOR=1` with regex-priority combiner. NER
  plugin seam (`apps/api/src/ner-plugin-v13.ts`) for future external NER.
- **v13 production gate** at `scripts/release/check-v13-prod-gate.mjs`
  — enforces stream coverage (the seven candidate-emitting streams),
  v12-core regression thresholds, LongMemEval-S baseline match, ablation
  regression caps, and per-query-type regression caps. Fail-closed against
  `data/bench/v12/baseline.json`. The baseline is now populated with real
  measured numbers (`v12_core_recall_at_5_8case = 100.0`,
  `_12case = 83.3`, `longmemeval_recall_at_5 = 96.6`).
- **Eval ablation harness extensions** (`packages/eval/src/ablation-v13.ts`)
  — eleven new configs: `graph-only`, `temporal-only`, `wiki-only`,
  `graph-on/off`, `temporal-on/off`, `wiki-on/off`, `reranker-on/off`,
  `all-streams-on`. Sample report at `data/bench/v13/sample-report.json`;
  the live `data/eval/reports/latest-gate-2026-05-05.json` records the
  passing v13 gate run that unlocked this release.
- **OpenTelemetry per-stream span seam**
  (`apps/api/src/observability/stream-spans-v13.ts`) — translates
  `HybridSearchOrchestrator` `onStreamEvent` into `stream.kind`,
  `stream.weight`, `stream.candidates`, `stream.latency_ms`,
  `stream.timed_out`, `stream.failed` attributes; gated by
  `LORE_OTEL_ENABLED`.
- **`lore doctor v13`** (`apps/cli/src/doctor-v13.ts`) — orchestrator
  wiring / reranker service health / wiki compiler queue lag / graph LLM
  extractor optional-path checks. Exits 0 only when every check is `ok`.
- **Source/package metadata aligned on `1.3.0-beta`** — root,
  `apps/{api,browser-extension,cli,dashboard,mcp-server}` and
  `packages/{capture,connectors,profile,…}` package versions advance to
  `1.3.0-beta`. `apps/api` `OpenAPI` metadata reports `1.3.0-beta`
  after redeploy.

### Changed

- **BREAKING (search-package consumers): `reranker` removed from
  `MemorySearchStreamKindV12` union and from `DEFAULT_STREAM_WEIGHTS`.**
  Reranker is now a post-fusion replacer signaled per-request via
  `MemorySearchInputV12.rerank?: boolean` (installation default driven by
  `LORE_RERANKER_ENABLED`). `provenance.streams` therefore lists only the
  seven candidate-emitting streams that actually ran. Code that referenced
  `'reranker'` as a stream kind must migrate to the boolean flag.
- `PostgresHybridMemorySearchProvider.search()` and
  `QdrantHybridMemorySearchProviderV12.search()` are now thin
  `HybridSearchOrchestrator` shims with their original stream subset; the
  v1.2 frozen-fixture top-K is bit-identical when timeouts are disabled.
- Production deploy preflight at `scripts/release/prod.mjs` runs the
  v13 prod-gate check when `LORE_MEMORY_ENGINE_VERSION=v13`. The dry-run
  preflight surfaces the v13 result instead of `v13-not-active`.
- Public-doc set (`README.md`, `docs/release-status.md`,
  `docs/roadmap.md`, `docs/project-plan.md`,
  `docs/v1.3-search-completeness-plan.md`) describes the current hosted
  line as `v1.3.0-beta` Search-Completeness Beta.
- Production OpenAPI metadata reports `1.3.0-beta` after the v1.3
  metadata redeploy.

### Notes / Known limitations

- `v1.3` is private-cloud only (`Lore-Context/lore-cloud`); the public
  OSS repo `Lore-Context/lore-context` stays at `v1.0` and receives only
  security / v1.0 bug fixes during this cycle. No v1.3 mirror to the
  public repo.
- v1.3 remains a beta line: not stable GA, billing still invite-gated,
  no SOC 2 / HIPAA / BYOC / BYOK claims. Reranker is OFF by default
  (`LORE_RERANKER_ENABLED` unset); plan §3 Lane B item 1 schedules
  flipping it on once the GPU soak passes.
- LongMemEval-S 96.6% R@5 is internal cloud measurement only; public
  benchmark publication remains an explicit non-goal of v1.3 and is
  re-scoped under follow-up planning.
- Embedding-cache work (the dominant 944 ms of the 2.25 s P95) is
  deferred to v1.4 latency work per plan §3 Lane B item 1.
- Connectors, multimodal intake, MCP tool expansion, SaaS GA, and the
  Wiki compiler's LLM rewriter remain out of scope.

## [v1.2.0-beta] — 2026-05-04

Graph-Augmented Hybrid Memory Engine beta. This release closes the v1.2 lane
work: it lifts the package metadata, public docs, and production deployment
defaults so the v12 memory engine becomes the activated production line, gated
on the local v12 eval evidence (`pnpm eval:v12:gate`). The v1.1 cloud memory
engine remains the previous hosted line; v1.2 keeps the same RDS truth store /
Qdrant derived index / private embedding service shape and adds an
episode/item/chunk ledger, 1024-dim pgvector, a Postgres-based temporal graph,
and an FTS+pgvector+RRF Postgres hybrid recall provider.

### Added

- **Source/package metadata aligned on `1.2.0-beta`** — root,
  `apps/{api,browser-extension,cli,dashboard,mcp-server}` and
  `packages/{capture,connectors,profile}` package versions all advance to
  `1.2.0-beta`.
- **v1.2 production deploy defaults** — `docs/deployment/compose.production.yml`
  defaults `LORE_MEMORY_ENGINE_VERSION=v12`, `LORE_GRAPH_DRIVER=postgres`,
  `LORE_PGVECTOR_DIM=1024`, `LORE_QDRANT_COLLECTION=lore_memories_v12`, and
  `LORE_EMBEDDING_AUTO_WIRE=1` for both API and `memory-worker`. Existing
  embedding URL / model / dim defaults are preserved.
- **v1.2 release-gate enforcement** — `scripts/release/prod.mjs` now treats any
  `1.2.x` package version as v12-active for preflight purposes. Even when
  `LORE_MEMORY_ENGINE_VERSION` is unset, the v12 production gate runs against
  the local eval report and the dry-run `preflight` surfaces the v12 evaluation
  result instead of `v12-not-active`.
- **AWS deploy v1.2 schema apply** — the AWS SSM deploy script now applies both
  `apps/api/src/db/schema.sql` and `apps/api/src/db/schema-v12.sql` against the
  production Postgres container (`docker compose exec -T postgres psql …`)
  before starting API, dashboard, and memory-worker. It does not depend on a
  host `psql`. Rollback behavior is preserved.
- **Self-test coverage for v12 metadata gating** —
  `scripts/test-v12-prod-gate.mjs` adds a `1.2.x`-version assertion: with
  `LORE_MEMORY_ENGINE_VERSION` cleared, the dry-run preflight must still report
  the v12 production gate as not-skipped.

### Changed

- Root, API, Dashboard, CLI, MCP server, Capture, Connectors, Profile, and
  Browser Extension package versions move from `1.1.0-beta` to `1.2.0-beta`.
- Public docs (`README.md`, `docs/project-plan.md`, `docs/release-status.md`,
  `docs/roadmap.md`, `docs/architecture.md`, `docs/api-reference.md`,
  `docs/getting-started.md`, `docs/deployment/README.md`) describe the current
  hosted line as `v1.2.0-beta` Graph-Augmented Hybrid Memory Engine beta. The
  v1.1 Cloud Memory Engine line is preserved as the previous beta milestone.
- Public website source (`apps/website/src/site.mjs`): release banners,
  status/changelog/LLM context, and the `current release` block now describe
  `v1.2.0-beta` and the graph-augmented hybrid memory engine. Historical v1.1
  and v1.0 statements are preserved as history.
- Production OpenAPI metadata reports `1.2.0-beta` after the API metadata
  redeploy.

### Notes / Known limitations

- v1.2 remains a beta line: no stable GA, open billing, SOC 2 / HIPAA, BYOC /
  BYOK, public Graphiti, ParadeDB, wiki compiler, or public npm `1.2.0-beta`
  package claim. Production activation requires the local
  `pnpm eval:v12:gate` evidence and the v12 production gate to be green.
- The formal GitHub pre-release for this line is `v1.2.0-beta`; `v1.1.0-beta`
  was a source/docs/runtime line, never a formal GitHub release tag.
- The npm MCP server package remains `@lore-context/server@0.6.0-alpha.1` on
  `latest` and `@lore-context/server@1.0.0-rc.2` on `rc` until a v1.2 package
  is published and fresh-install verified.

## [v1.1.0-beta] — 2026-05-04

Cloud Memory Engine beta. This release moves the hosted production memory path
from synchronous/manual recall toward automatic capture, asynchronous worker
fan-out, RDS-backed lifecycle, Qdrant hybrid recall, and private cloud
embeddings. It remains invite/cap controlled and is not stable GA.

### Added

- **RDS truth store** — hosted production memory, account, vault, lifecycle, and
  audit data now use RDS PostgreSQL 16 as the authoritative store.
- **AWS SQS worker fan-out** — capture, embedding, graph, connector, and backfill
  jobs run through SQS queues with DLQs instead of blocking the request path.
- **memory-worker service** — autonomous redaction, curation, auto-save,
  embedding, Qdrant indexing, graph/backfill, and cleanup lanes now have a
  dedicated production worker.
- **Private embedding service** — Qwen3-Embedding-0.6B provides 1024-dim dense
  vectors for hosted recall without asking ordinary users to install local
  models.
- **Qdrant hybrid recall** — `lore_memories_v11` is the derived dense+sparse
  recall index; every returned hit is hydrated from RDS before it reaches the
  API response.
- **v1.1 production smoke gate** — release validation covers capture upload ->
  SQS -> memory-worker -> RDS memory -> Qdrant indexed point ->
  `/v1/memory/search` `backend: "lore-hybrid"` with `degraded: false`, followed
  by hard-delete and Qdrant cleanup.

### Changed

- Root, API, Dashboard, CLI, MCP server, Capture, Connectors, Profile, and
  Browser Extension package versions now align on `1.1.0-beta`.
- OpenAPI metadata now reports `1.1.0-beta` after the API metadata deploy.
- Public website copy, AI-readable context, release status, roadmap, deployment,
  architecture, and project-plan docs now describe the v1.1 Cloud Memory Engine
  beta boundary.
- Postgres+pgvector is now documented as a local fallback and migration path; the
  hosted v1.1 recall path is RDS truth plus Qdrant derived index.

### Notes / Known limitations

- v1.1 remains beta: no stable GA, open billing, SOC 2 / HIPAA, BYOC/BYOK, or
  unlimited-storage claim.
- The latest formal GitHub pre-release tag remains `v1.0.0-rc.2` until a v1.1
  tag is cut.
- The npm MCP server package remains `@lore-context/server@0.6.0-alpha.1` on
  `latest` and `@lore-context/server@1.0.0-rc.2` on `rc` until a v1.1 package is
  published and fresh-install verified.

## [v1.0.0-rc.2] — 2026-05-03

Public SaaS Beta Readiness release. This release made the ordinary-user SaaS
entry reachable on production domains while keeping public access invite/cap
controlled.

### Added

- **App-domain Google OAuth** — Google sign-in start and callback use the
  production app-domain flow.
- **Dashboard onboarding** — public dashboard session flow, Memory Inbox, recall
  trace surfaces, and beta access pages were aligned for non-technical users.
- **Self-service install token loop** — invited users can issue CSRF-protected
  install tokens and redeem them into real device/service tokens for agent
  clients.
- **Hosted MCP metadata** — hosted MCP discovery and relay docs were aligned with
  the published rc npm package.
- **Production website closure** — Cloudflare Pages custom domains, `/llms.txt`,
  `/llms-full.txt`, `robots.txt`, status, changelog, pricing, privacy, compare,
  company, contact, terms, cookies, and sitemap pages were verified.

### Changed

- Root, API, Dashboard, CLI, MCP server, Capture, Connectors, Profile, and
  Browser Extension package versions aligned on `1.0.0-rc.2`.
- OpenAPI metadata reported `1.0.0-rc.2` with 72 paths for the rc.2 production
  runtime.

### Notes / Known limitations

- rc.2 is Public SaaS Beta Readiness, not stable GA.
- Billing, team/shared vaults, broad public signup, Chrome Web Store publication,
  Google Drive OAuth verification, and compliance claims remain follow-up work.

## [v1.0.0-rc.0] — 2026-05-01

Personal Cloud Beta release candidate. This release closes the v1.0 private
cloud loop around one consumer-facing promise: all your agents share one memory,
with Google sign-in, connected-agent onboarding, Memory Inbox review, source
controls, browser capture, and Evidence Ledger recall traces.

Historical note: this release originally kept the public open-source track on
v0.6. The public track is no longer version-locked; the v2.1 OSS sync promotes
eligible open-core surfaces while keeping hosted SaaS operations private.

### Added

- **Google-only onboarding** — v1.0 removes GitHub login from the consumer
  website path and positions Google sign-in as the primary account entry.
- **Memory Inbox and recall loop** — API, dashboard, and profile surfaces now
  cover pending/approved/rejected memory candidates, recall traces, and user
  feedback for shared memory reuse.
- **Production website redesign** — the public homepage now leads with the
  v1.0 personal cloud beta promise, pricing, privacy posture, download/docs,
  comparison, legal/company/contact/cookie pages, and a human-readable sitemap.
- **Release evidence** — website smoke now verifies v1.0 top-level pages across
  desktop and mobile, while production deployment records the AWS release
  artifact and Cloudflare Pages deployment.

### Changed

- Root, API, Dashboard, CLI, Capture, Connectors, Profile, and Browser
  Extension package versions now align on `1.0.0-rc.0`.
- OpenAPI metadata now reports `1.0.0-rc.0` for the private v1.0 runtime.
- Website copy now presents the private line as `v1.0 personal cloud beta`.
  The public OSS boundary is now controlled by the current OSS sync whitelist,
  not by a fixed v0.6 version lock.

### Notes / Known limitations

- v1.0 is a private beta release candidate, not public SaaS GA.
- Billing remains invite-gated; no surprise-overage billing is promised.
- Full Team workspaces, ADP/BYOK/BYOC, SOC 2/HIPAA claims, and broad public
  signup remain follow-up work.

## [v0.9.0-beta] — 2026-05-01

Auto-Capture Beta release. This release upgrades the closed-source personal
cloud beta from “connected cloud memory” to “capture-first memory that can be
shared across agents.” Historical note: this release initially left public OSS
on v0.6; that version lock is removed for the v2.1 OSS sync.

### Added

- **Universal session watcher** — `lore watch` now detects Claude Code, Codex,
  Cursor, and OpenCode/Qwen session locations, tracks checkpoints, uploads safe
  session deltas, and exposes watcher counters in `lore status`.
- **Hosted MCP beta** — the private API/MCP line now includes hosted discovery,
  OAuth/install-token metadata, and hosted tools for capture-source control while
  keeping local stdio as the public default path.
- **Browser extension MVP** — `@lore/browser-extension` adds a Manifest V3
  capture surface for browser-based agents with local options, popup controls,
  and extractor tests.
- **Connector framework** — `@lore/connectors` adds connector contracts,
  fixture-backed Google Drive capture, connector API routes, and smoke coverage
  for beta environments without live OAuth credentials.
- **Source-aware memory layer** — Memory Inbox 2.0, layered recall, source
  provenance, Evidence Ledger source metadata, source checkpoints, and operator
  usage rollups are now part of the private beta line.

### Changed

- Root, API, Dashboard, CLI, Capture, Connectors, Profile, and Browser Extension
  package versions now align on `0.9.0-beta.0`.
- OpenAPI metadata now reports `0.9.0-beta` and verifies the v0.9 capture,
  source, usage, operator, hosted MCP, and connector paths.
- Website copy now presents the private line as `v0.9 auto-capture beta`; the
  public OSS boundary is now managed by the current sync whitelist.

### Notes / Known limitations

- v0.9 remains a private/closed-source beta, not public SaaS GA.
- Google Drive is fixture-backed when live OAuth credentials are absent.
- Browser extension distribution is source/package based until Chrome Web Store
  submission is separately reviewed.
- Team/shared vaults, billing, full ADP/BYOK, BYOC, and broad public signup
  remain follow-up work.

## [v0.8.0-beta] — 2026-04-30

Personal Cloud Beta release. This release turns the v0.7 private cloud alpha
into the first usable closed-source personal cloud path for design partners.
Historical note: this release initially held public OSS at v0.6; the later v2.1
OSS sync removes that version lock for eligible open-core code.

### Added

- **Restart-safe cloud persistence** — the private cloud runtime now has a
  `CloudStore` boundary with Postgres-backed accounts, vaults, install tokens,
  device tokens, agent tokens, capture sources, capture jobs, usage events, and
  audit events.
- **v0.8 capture ingestion** — `POST /v1/capture/sessions` accepts canonical
  Claude Code and Codex session envelopes, enforces idempotency, rejects paused
  sources, and blocks raw archive uploads unless the vault allows them.
- **Local bridge hardening** — `lore connect`, `lore status`, `lore watch`, and
  `lore disconnect` now cover reversible Claude Code/Codex config writes,
  backup/rollback, mock pairing, token redaction, and secure credential storage.
- **Memory Inbox and shared recall package** — `@lore/profile` now includes
  inbox state, memory edges, profile-store helpers, agent-specific context packs,
  and Evidence Ledger trace builders.
- **Personal cloud beta dashboard** — the dashboard now includes onboarding,
  connect-agent, source status, Memory Inbox, profile editor, Evidence Ledger,
  privacy/export/delete, and usage/pricing beta states.
- **Release-gate scripts** — v0.8 adds private beta verification scripts and
  fixtures for persistence, auth/vault isolation, bridge dry-runs, recall,
  privacy deletion/export, profile reconciliation, and usage metering.

### Changed

- Root, API, Dashboard, CLI, Capture, and Profile package versions now align on
  `0.8.0-beta.0`.
- OpenAPI metadata now reports `0.8.0-beta` and verifies 38 REST paths.
- Production deployment target advances from the v0.7 private cloud alpha to
  the v0.8 personal cloud beta line.

### Notes / Known limitations

- v0.8 is still a private/closed-source cloud beta, not public SaaS GA.
- OAuth signup, billing, team/shared vaults, and full enterprise compliance
  remain follow-up work.
- Live Postgres restart rehearsal, real macOS Keychain verification, and
  design-partner onboarding evidence remain production validation tasks.

## [v0.7.0-alpha] — 2026-04-30

Private Cloud Alpha release. This release closes the first hosted/private
memory path for Lore without changing the public open-source v0.6 release
contract.

### Added

- **Cloud account and device boundary** — the private API now includes cloud
  account, install token, device pairing, token rotation/revocation, vault, and
  capture job surfaces.
- **Agent connection CLI** — `@lore/cli` adds `lore connect`, `lore status`, and
  `lore watch` foundations for Claude Code, Codex, Cursor, and OpenCode
  integration planning.
- **Session capture package** — `@lore/capture` adds Claude Code and Codex
  session parsing, redaction, idempotency, scanner, stop-hook, and queue
  envelope helpers.
- **Profile and recall package** — `@lore/profile` extracts durable user/project
  facts and composes recall context from captured sessions.
- **Hosted dashboard alpha UX** — the dashboard now starts from connected-agent,
  memory feed, profile, privacy, source health, and usage states instead of an
  empty control plane.

### Changed

- Root, API, Dashboard, CLI, Capture, and Profile package versions now align on
  `0.7.0-alpha.0`.
- OpenAPI metadata now reports `0.7.0-alpha`.
- The AWS-backed private production runtime is upgraded to the v0.7 cloud alpha
  line on the existing Singapore EC2 + Docker Compose deployment.

### Notes / Known limitations

- v0.7 private cloud alpha is not a public SaaS signup launch.
- The production runtime is still the existing single-node private alpha stack:
  EC2 + Docker Compose + local Postgres/pgvector + Cloudflare Tunnel/Access.
- Real OAuth signup, billing, managed multi-tenant persistence hardening, and
  public hosted onboarding remain follow-up work.
- Public open-source distribution was historically anchored on
  `v0.6.0-alpha`; that constraint is removed by the v2.1 OSS sync.

## [v0.6.0-alpha] — 2026-04-29

Distribution and Trust Sprint release. This release takes the v0.5 adoption
substrate and makes it easier to discover, install, verify, and share without
turning Lore into a hosted SaaS claim.

### Added

- **AI-readable website context** — the static website now publishes `llms.txt`
  and `llms-full.txt`, canonical URLs, Open Graph/Twitter metadata, cache headers,
  and public-source boundary text for AI-assisted discovery.
- **Quickstart activation report** — `pnpm quickstart -- --activation-report`
  can produce dry-run and real first-value evidence covering health, first memory
  write, first context query, and the matching Evidence Ledger trace.
- **Public-safe trust demo coverage** — `pnpm smoke:api` now verifies public-safe
  eval report output and MIF JSON export while ensuring hard-deleted content is
  not exported.
- **Public-safe eval report CLI** — `scripts/export-eval-report.mjs --public-safe`
  emits metrics and run metadata while excluding raw memory content and dataset
  messages.
- **Distribution pack** — `docs/distribution/` includes MCP registry, marketplace,
  agent plugin, and MCP security drafts for human-reviewed submission.
- **Launch and design partner pack** — `docs/launch/`, `docs/design-partners/`,
  and the design partner issue template define the launch narrative, benchmark
  methodology, intake rubric, and activation scorecard.

### Changed

- Root and package versions advanced to `0.6.0-alpha.0`.
- OpenAPI metadata now reports `0.6.0-alpha`.
- README, roadmap, project plan, and website copy now position v0.6 as the
  current alpha release.
- Website release verification now requires the new AI-readable files, metadata,
  cache headers, and public-boundary leak checks.
- Real quickstart activation proof uses an isolated temporary store per run and
  validates the exact trace returned by the current `context.query`.

### Fixed

- Quickstart summaries and activation reports redact generated API keys in both
  dry-run and real activation paths.
- `--activation-report` no longer exits successfully when the proof is skipped
  because the target local port is occupied.
- Activation proof no longer falls back to stale Evidence Ledger rows from older
  runs.
- Public docs no longer expose local research snapshots or internal workflow
  paths as public release facts.
- Getting Started now documents `--out` for eval report file generation instead
  of implying the CLI writes files by default.

### Notes / Known limitations

- Post-release closure: public `main` includes deployment hardening,
  integration validation, and distribution commits after the release tag. The
  initial verified distribution baseline is
  `1914718c3136fab2f7eed167445e97a910b62bb0`, with GitHub Actions CI run
  `25110357633` passing. The release tag remains on the original release commit
  `4f0eadf369e99e364bd06b7d3228b84a9f7501b9`.
- `v0.6.0-alpha` still does **not** include public hosted SaaS, billing, managed
  cloud sync, autonomous marketplace submission, or remote MCP HTTP as the default
  path.
- Marketplace, Show HN, Reddit, Discord, and partner outreach drafts remain
  human-reviewed materials; the release does not auto-submit them.
- Post-release distribution closure: Official MCP Registry publication is active
  through GitHub Actions run `25120707303`. The Registry entry
  `io.github.Lore-Context/lore-context-mcp` now lists both the public npm
  package `@lore-context/server@0.6.0-alpha.1` and the public GHCR image
  `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.1`; the npm-backed
  Registry closure source is `8637e37546b24caba4f170182beca613f0ba6d09` with CI
  run `25120831678` passing.
- Post-release adoption closure: Cursor Agent prompt-level MCP validation now
  succeeds against demo data, and `context_query` MCP text includes `Trace ID`
  so clients that do not expose `structuredContent` can still open the Evidence
  Ledger path.
- Clean-checkout human timing and real design partner scorecard data are still
  post-release validation work.

## [v0.5.0-alpha] — 2026-04-29

Alpha Adoption Sprint release. This release turns the v0.4 production-hardened
control plane into a faster developer adoption path: machine-readable API docs,
copy-paste integration setup, and an Evidence Ledger that explains what context an
agent actually used.

### Added

- **OpenAPI 3.1 contract** — `apps/api/src/openapi.ts` now publishes the REST
  surface at `GET /openapi.json`, including health, memory, context, governance,
  trace, evidence, eval, event ingest, and agentmemory integration routes.
- **`pnpm openapi:check`** — release gate that validates required paths,
  operation ids, bearer-auth scheme, responses, and JSON serializability.
- **Evidence Ledger API** — `GET /v1/evidence/ledger/:trace_id` and
  `GET /v1/evidence/ledgers?project_id=&limit=` explain retrieved, used,
  ignored, missing, stale, conflicting, and risky memory rows for context traces.
- **Evidence Ledger dashboard summary** — Recent Traces now surfaces used,
  ignored, warning, and risk counts plus row previews so operators can inspect why
  a context answer was trusted.
- **`pnpm quickstart`** — local adoption helper that checks Node/pnpm, generates
  random API keys, optionally writes `data/quickstart.env`, checks ports, and
  prints first-query curl plus Claude Code, Cursor, and Qwen Code MCP snippets.
- **Golden-path setup docs** — Claude Code, Cursor, and Qwen Code guides now
  include the v0.5 quickstart helper, SDK stdio transport, smoke commands, and
  troubleshooting notes.
- **Eval report API export** — `GET /v1/eval/report?run_id=&format=json|markdown`
  returns shareable eval report output from stored runs.
- **v0.5 planning and governance docs** — project plan, roadmap, architecture,
  release-governance, and deployment docs now distinguish public open-core release
  work from private cloud alpha work.

### Changed

- Root and package versions advanced to `0.5.0-alpha.0`.
- README now positions v0.5 as the current alpha and links the OpenAPI,
  quickstart, Evidence Ledger, and golden integration paths directly.
- Website docs now point at the `v0.5.0-alpha` release and show the new release
  gate: OpenAPI validation, quickstart, Evidence Ledger, and browser smoke.
- API reference was synchronized with the current runtime response shapes,
  including `contextBlock`, evidence arrays, memory write/update responses,
  trace feedback, audit logs, import/export, and evidence endpoints.
- `scripts/generate-integration-config.mjs` now emits the same Claude Code MCP
  wrapper shape used by the docs.
- `scripts/smoke-api.mjs` now verifies `/openapi.json` and an Evidence Ledger row
  after a context query.

### Fixed

- Public API docs no longer describe stale parameters such as `state`/`offset` for
  memory list. The documented parameters match the runtime and OpenAPI contract.
- `MemoryUpdateRequest` is documented with `agent_id`, matching the implemented
  update route.
- Evidence Ledger handles hard-deleted or missing memories without leaking raw
  content from deleted records.

### Notes / Known limitations

- `v0.5.0-alpha` still does **not** include hosted multi-tenant cloud sync,
  billing, public SaaS signup, or remote MCP HTTP as the default path.
- Private alpha infrastructure, tenant administration, backup/restore, and
  observability remain private cloud work.
- Clean-checkout human timing for the 10-minute activation target still needs to
  be run with design partners after the public release.
- The local checkout used for this release still demonstrates why public/private
  remotes should be split into separate clones or worktrees before ongoing v0.6
  development.

## [v0.4.0-alpha] — 2026-04-28

First public alpha. Closes the production-hardening sprint that turned the audit-failed
MVP into a release-candidate alpha. All P0 audit items cleared, 12 of 13 P1 items
cleared (one partial — see Notes), 117+ tests passing, full monorepo build clean.

### Added

- **`packages/eval/src/runner.ts`** — real `EvalRunner` (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). Eval can now run an end-to-end retrieval evaluation against
  a user-owned dataset and persist runs as JSON for cross-time regression detection.
- **`packages/governance/src/state.ts`** — six-state governance state machine
  (`candidate / active / flagged / redacted / superseded / deleted`) with explicit legal
  transition table. Illegal transitions throw.
- **`packages/governance/src/audit.ts`** — immutable audit log append helper integrated
  with `@lore/shared` `AuditLog` type.
- **`packages/governance/detectPoisoning`** — heuristic for memory-poisoning detection
  using same-source dominance (>80%) and imperative-verb pattern matching.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — semver-based upstream
  version probe with hand-rolled compare (no new dependency). Honors
  `LORE_AGENTMEMORY_REQUIRED=0` for silent-skip degraded mode.
- **`packages/mif`** — `supersedes: string[]` and `contradicts: string[]` fields added
  to `LoreMemoryItem`. Round-trip preserved across JSON and Markdown formats.
- **`apps/api/src/logger.ts`** — structured JSON logger with auto-redaction of
  sensitive fields (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). `requestId` flows through every request.
- **`apps/dashboard/middleware.ts`** — HTTP Basic Auth middleware. Production startup
  refuses to begin without `DASHBOARD_BASIC_AUTH_USER` and `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — production-mode env validator. Refuses to start the
  app if any environment value matches a placeholder pattern (`read-local`,
  `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Rate limiting** — per-IP and per-key dual-bucket token limiter with auth-failure
  backoff (5 fails in 60s → 30s lockout → 429 response). Configurable via
  `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`.
- **Graceful shutdown** — SIGTERM/SIGINT handlers drain in-flight requests up to 10s,
  flush pending Postgres writes, close pool, force-exit at 15s.
- **Database indexes** — B-tree indexes on `(project_id)` / `(status)` /
  `(created_at)` for `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. GIN indexes on jsonb `content` and `metadata`.
- **MCP zod input validation** — every MCP tool now runs `safeParse` against a
  per-tool zod schema; failures return JSON-RPC `-32602` with sanitized issues.
- **MCP `destructiveHint` + required `reason`** — every mutating tool
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) requires a
  `reason` of at least 8 characters and surfaces `destructiveHint: true`.
- 117+ new test cases across `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Multilingual documentation: README in 17 languages under `docs/i18n/<lang>/`.
- `CHANGELOG.md` (this file).
- `docs/getting-started.md` — 5-minute developer quickstart.
- `docs/api-reference.md` — REST API endpoint reference.
- `docs/i18n/README.md` — translation contributor guide.

### Changed

- **`packages/mif`** envelope version `"0.1"` → `"0.2"`. Backward-compatible import.
- **`LORE_POSTGRES_AUTO_SCHEMA`** default `true` → `false`. Production deployments
  must explicitly opt in to schema auto-application or run `pnpm db:schema`.
- **`apps/api`** request body parser is now streaming with a hard payload size limit
  (`LORE_MAX_JSON_BYTES`, default 1 MiB). Oversized requests return 413.
- **Loopback authentication** changed: removed reliance on URL `Host` header; loopback
  detection now uses `req.socket.remoteAddress` only. In production with no API keys
  configured, the API fails closed and refuses requests (was: silently granted admin).
- **Scoped API keys** must now provide `project_id` for `/v1/memory/list`,
  `/v1/eval/run`, and `/v1/memory/import` (was: undefined `project_id` short-circuited).
- **All Dockerfiles** now run as non-root `node` user. `apps/api/Dockerfile` and
  `apps/dashboard/Dockerfile` declare `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` now uses `${POSTGRES_PASSWORD:?must
  be set}` — startup fails fast without an explicit password.
- **`docs/deployment/compose.private-demo.yml`** — same required-or-fail pattern.
- **`.env.example`** — all demo defaults removed and replaced with `# REQUIRED`
  placeholders. New variables documented for rate limiting, request timeout, payload
  limit, agentmemory required mode, dashboard basic auth.

### Fixed

- **Loopback bypass auth vulnerability** (P0). Attacker could send `Host: 127.0.0.1`
  to spoof loopback detection and obtain admin role with no API key.
- **Confused-deputy in dashboard proxy** (P0). Dashboard proxy injected
  `LORE_API_KEY` for unauthenticated requests, granting admin powers to anyone able
  to reach port 3001.
- **Brute-force defense** (P0). Demo keys (`admin-local`, `read-local`, `write-local`)
  shown in README/`.env.example` could be enumerated indefinitely; rate limit and
  removed defaults now defend against this.
- **JSON parse crash on malformed `LORE_API_KEYS`** — process now exits with a clear
  error instead of throwing a stack trace.
- **OOM via large request body** — bodies above the configured limit now return 413
  instead of crashing the Node process.
- **MCP error leak** — upstream API errors that included raw SQL, file paths, or
  stack traces are now sanitized to `{code, generic-message}` before reaching MCP
  clients.
- **Dashboard JSON parse crash** — invalid JSON responses no longer crash the UI;
  errors are surfaced as user-visible state.
- **MCP `memory_update` / `memory_supersede`** previously did not require a
  `reason`; this is now enforced by zod schema.
- **Postgres pool**: `statement_timeout` now set to 15s; previously unbounded
  query-time risk under malformed jsonb queries.

### Security

- All P0 audit findings (loopback bypass / dashboard auth / rate limit / demo
  secrets) cleared. Public release notes summarize the hardening work; internal audit artifacts are not part of the public source distribution.
- `pnpm audit --prod` reports zero known vulnerabilities at release time.
- Demo credentials removed from all deployment templates and example READMEs.
- Container images now run as non-root by default.

### Notes / Known limitations

- **Partial P1-1**: `/v1/context/query` retains permissive scoped-key behavior to
  avoid breaking existing consumer tests. Other affected routes (`/v1/memory/list`,
  `/v1/eval/run`, `/v1/memory/import`) enforce `project_id`. Tracked for v0.5.
- **Hosted multi-tenant cloud sync** is not implemented in v0.4.0-alpha. Local and
  Compose-private deployments only.
- **Translation quality**: README localizations are LLM-generated and clearly
  labeled; community PRs to refine each locale are welcome (see
  [`docs/i18n/README.md`](docs/i18n/README.md)).
- **OpenAPI / Swagger spec** is not yet packaged. The REST surface is documented in
  prose under [`docs/api-reference.md`](docs/api-reference.md). Tracked for v0.5.

### Acknowledgments

This release is the result of a single-day production-hardening sprint involving
parallel sub-agent execution against a structured audit plan. Internal audit
artifacts are not part of the public source distribution.

## [v0.0.0] — pre-release

Internal development milestones, not publicly released. Implemented:

- Workspace package scaffolds (TypeScript monorepo, pnpm workspaces).
- Shared TypeScript build/test pipeline.
- Memory / context / eval / audit type system in `@lore/shared`.
- `agentmemory` adapter boundary.
- Local REST API with context router and composer.
- JSON-file persistence + optional Postgres runtime store with incremental upsert.
- Memory detail / edit / supersede / forget flows with explicit hard delete.
- Real memory-use accounting (`useCount`, `lastUsedAt`).
- Trace feedback (`useful` / `wrong` / `outdated` / `sensitive`).
- MIF-like JSON + Markdown import/export with governance fields.
- Secret-scanning regex set.
- Direct session-based eval metrics; provider comparison eval runs; eval run listing.
- API-key protection with reader/writer/admin role separation.
- Governance review queue; audit-log API.
- API-served dashboard HTML; standalone Next.js dashboard.
- Demo seed data; integration config generation.
- Private Docker/Compose packaging.
- Legacy + official-SDK stdio MCP transports.

[v0.6.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.6.0-alpha
[v0.5.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.5.0-alpha
[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
