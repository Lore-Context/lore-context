# Changelog

All notable changes to Lore Context are documented here. The format is based on
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v1.0.0-rc.0] — 2026-05-01

Personal Cloud Beta release candidate. This release closes the v1.0 private
cloud loop around one consumer-facing promise: all your agents share one memory,
with Google sign-in, connected-agent onboarding, Memory Inbox review, source
controls, browser capture, and Evidence Ledger recall traces.

The public open-source release remains anchored on v0.6 unless a separate
public release decision is made.

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
- Website copy now presents the private line as `v1.0 personal cloud beta`
  while preserving the public `v0.6.0-alpha` open-source boundary.

### Notes / Known limitations

- v1.0 is a private beta release candidate, not public SaaS GA.
- Billing remains invite-gated; no surprise-overage billing is promised.
- Full Team workspaces, ADP/BYOK/BYOC, SOC 2/HIPAA claims, and broad public
  signup remain follow-up work.

## [v0.9.0-beta] — 2026-05-01

Auto-Capture Beta release. This release upgrades the closed-source personal
cloud beta from “connected cloud memory” to “capture-first memory that can be
shared across agents.” The public open-source release remains anchored on v0.6
unless a separate public release decision is made.

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
- Website copy now presents the private line as `v0.9 auto-capture beta` while
  preserving the public `v0.6.0-alpha` open-source boundary.

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
The public open-source release remains anchored on v0.6 unless a separate public
release decision is made.

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
- Public open-source distribution remains anchored on `v0.6.0-alpha` until a
  separate public release decision is made.

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
