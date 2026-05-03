# Roadmap

Last updated: 2026-05-03

Lore Context ships through three deliberate tiers: a public OSS alpha
(`v0.6.0-alpha`), a private personal-cloud RC (`v1.0.0-rc.0`), and a planned
Public SaaS Beta Readiness version (`v1.0.0-rc.2`). They are not
interchangeable in public copy.

## Next planned version: `v1.0.0-rc.2 Public SaaS Beta Readiness`

`v1.0.0-rc.2` is the next planned version. It is not stable GA and not a
connector-breadth sprint. The full lane-by-lane plan lives in
[`.omx/plans/lore-v1-rc2-public-saas-beta-readiness-plan.md`](../.omx/plans/lore-v1-rc2-public-saas-beta-readiness-plan.md).

Theme: from live cloud beta to self-serve beta value. Ordinary users should be
able to sign in, connect one assistant, get an automatically captured memory,
review and approve it, and recall it from another assistant — without
understanding MCP, install tokens, bearer tokens, or JSON config.

P0 lanes for rc.2:

1. State and docs reconciliation: live endpoints, public/private boundary,
   distinct OSS/RC/Beta tiers.
2. Ordinary-user first-run and 3-minute first-agent activation.
3. Live Memory Inbox: every default control is a real API request, no
   "API pending" buttons in the primary path.
4. Real auto-capture from at least two of Claude Code, Codex, or Cursor into
   Memory Inbox.
5. Cloud model gateway with safe no-local-model fallback.
6. Hosted MCP as "AI app connection" by default; advanced tools behind an
   advanced/developer disclosure.
7. SaaS safety rails: tenant boundary tests, abuse/quota controls, feature
   flags, kill switches, consent and data-lifecycle copy, capped rollout,
   privacy-safe telemetry.
8. Production operations: backups, observability, support runbooks, and
   reconciled public docs.

Explicit non-goals for rc.2: stable GA, surprise public billing, local
small-model installation for default users, ten shallow connectors,
team/shared vault product, SOC 2 / HIPAA / BYOC / BYOK claims, full ADP, and
unsupported benchmark-win claims.

## Current private cloud beta: `v1.0.0-rc.0`

Release status:

- Private repo: `Lore-Context/lore-cloud`.
- Package line: `1.0.0-rc.0`.
- Private `main`: v1.0 closure line with Google sign-in, Memory Inbox, shared
  recall, browser capture, production website redesign, and the source-level
  OAuth callback/Set-Cookie parity fixes that are already live on AWS.
- Release tag: `v1.0.0-rc.0` is the private personal-cloud beta release tag.
- AWS production: Singapore AWS runtime runs the private beta stack through
  Docker Compose at an artifact-backed `production-v1.0` release line; private
  instance IDs and host paths stay in closed operator notes.
- Cloudflare Pages production: custom domains show the v1.0 homepage:
  `All your agents. One shared memory.`
- OpenAPI metadata: `1.0.0-rc.0`, including v0.9 capture/source/connector
  foundations plus v1.0 Google sign-in, account/vault, Memory Inbox, and recall
  surfaces.
- Google OAuth production runtime: `/auth/google/start` returns a real Google
  authorization-code URL; OpenAPI exposes `GET` and `POST`
  `/auth/google/callback`; Safari sign-in and `/v1/me` session reuse have been
  verified after the Set-Cookie bridge fix.
- Website follow-up: Pages deploy `e08c5588` is live on custom domains; root now
  uses `Request beta access` as the ordinary-user entry, `/download` shows the
  private beta access page, and local-model copy is removed from the v1.0 root
  proof text.
- Public SaaS conversion: app-domain Google sign-in, the session-cookie
  dashboard, CSRF-protected self-service token issuance, and real
  `lct_device_` / `lct_service_` token generation are now reachable in
  production. As of 2026-05-03 the public dashboard at
  `https://app.lorecontext.com/` returns `200` and the proxy
  `https://app.lorecontext.com/api/lore/auth/google/start` returns a real
  Google authorization-code URL. Public access remains invite/cap controlled
  while the rc.2 Public SaaS Beta Readiness work closes ordinary-user
  activation, Memory Inbox liveness, auto-capture, safety rails, and
  observability.
- Beta focus: ordinary users sign in with Google, connect agents, review
  automatically captured memory, and reuse the same memory across agents.
- Public boundary: this is a closed-source private beta for design partners, not
  public SaaS GA.

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

## Current release: `v0.6.0-alpha`

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
- JSON-file and Postgres+pgvector persistence.
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

## Current validation focus after v0.9

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
