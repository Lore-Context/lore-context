# Changelog

All notable changes to Lore Context are documented here. The format is based on
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

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
  work from private `lore-cloud` alpha work.

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
  observability remain private `Lore-Context/lore-cloud` work.
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

[v0.5.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.5.0-alpha
[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
