# Release Status

Last updated: 2026-05-03

This page records the public-safe open-source release snapshot plus the hosted
cloud runtime status. Public release claims and private operator details are
intentionally separated.

## Release tier overview

The Lore project ships through three deliberate tiers. They must not be
described interchangeably in public copy:

| Tier | Channel | Current line | Surface |
|---|---|---|---|
| Public OSS alpha | `Lore-Context/lore-context` (open core) | `v0.6.0-alpha` historical | local API, MCP stdio, dashboard, eval, MIF, governance, public docs |
| Private cloud RC | `Lore-Context/lore-cloud` (closed) | `v1.0.0-rc.0` historical | hosted API, dashboard, capture, hosted MCP, Memory Inbox |
| Public SaaS Beta Readiness | `Lore-Context/lore-context` (public pre-release) | `v1.0.0-rc.2` current | ordinary-user dashboard, automatic capture, recall, evidence, production smoke |

`v1.0.0-rc.2` is closed as Public SaaS Beta Readiness, not stable GA.
See [`.omx/plans/lore-v1-rc2-public-saas-beta-readiness-plan.md`](../.omx/plans/lore-v1-rc2-public-saas-beta-readiness-plan.md)
for the full lane-by-lane scope.

## Private cloud runtime

| Surface | Status |
|---|---|
| Cloud release | `v1.0.0-rc.2` |
| Root/API/Dashboard package line | `1.0.0-rc.2` |
| Public repository | `Lore-Context/lore-context` |
| Production runtime | AWS Singapore EC2 + Docker Compose + local Postgres/pgvector + Cloudflare Tunnel/Access |
| AWS instance | `ap-southeast-1` (instance ID kept in private operator notes) |
| Production branch on host | artifact-backed `production-v1.0` release directory |
| Production source | Runtime runs the `v1.0.0-rc.2` release line; specific release SHA and host paths stay in closed operator notes |
| API health | `https://api.lorecontext.com/health` returns `ok`; `/openapi.json` is public for API discovery; state-changing beta surfaces require bearer, session, or Cloudflare Access protection as applicable |
| Dashboard | Current production `https://app.lorecontext.com/` returns `200`; public-SaaS mode supports Google session cookies, CSRF-protected token issuance, and a signed-in user dashboard |
| v1.0 API proof | OpenAPI reports `1.0.0-rc.2` with 72 paths and includes Google sign-in start plus `GET`/`POST` callback, current-user/vault, capture/session, connector, source, usage, operator, hosted MCP, Memory Inbox, and recall beta paths |

`v1.0.0-rc.2` is Public SaaS Beta Readiness for capped beta access, not a public
SaaS GA claim. Billing is invite-gated. Team/shared vaults, full ADP/BYOK, BYOC,
SOC 2/HIPAA claims, Chrome Web Store distribution, and broad public signup
remain follow-up work.

### Public SaaS conversion work

`app.lorecontext.com` is now reachable over the public internet. The local P0
implementation that supports the ordinary-user dashboard is also live in
production:

- the dashboard runs with `LORE_DASHBOARD_PUBLIC_SAAS=1`;
- Google sign-in starts through the app-domain proxy so callback cookies belong
  to `app.lorecontext.com`;
- successful `/api/lore/auth/google/callback` responses redirect back to `/`;
- session cookies and `x-lore-csrf` are forwarded to the API without injecting
  the admin key into public browser traffic;
- a signed-in user can issue a CSRF-protected install token and redeem it into
  real `lct_device_` / `lct_service_` API tokens from the dashboard.

Verified on 2026-05-03 from a public client:

- `https://lorecontext.com/`, `https://www.lorecontext.com/`, and
  `https://app.lorecontext.com/` return `200`;
- `https://api.lorecontext.com/health` returns `200` for service `lore-api`;
- `https://api.lorecontext.com/openapi.json` returns OpenAPI `3.1.0` with API
  version `1.0.0-rc.2` with 72 paths;
- `https://app.lorecontext.com/api/lore/auth/google/start` returns `200` with a
  real Google authorization-code URL and app-domain callback
  `https://app.lorecontext.com/api/lore/auth/google/callback`;
- unauthenticated `https://api.lorecontext.com/v1/cloud/whoami` returns
  `401 cloud.token_required`, which is the correct protected-data response.

Reaching the public dashboard is no longer the gating step. The rc.2 Public SaaS
Beta Readiness scope has passed its local, CI, AWS, and Cloudflare closure
checks. Public access stays invite/cap controlled and the product is described as
Public SaaS Beta Readiness, not stable GA.

### v1.0 closure evidence

| Check | Evidence |
|---|---|
| Public release tag | `v1.0.0-rc.2` in `Lore-Context/lore-context` |
| Public PR and CI | PR merge to `main` passed GitHub CI before production deployment |
| Local CI | Local closure gates passed: `pnpm openapi:check`, `pnpm --filter @lore/website test`, `pnpm build`, `pnpm test`, `pnpm smoke:api`, `pnpm smoke:mcp`, `pnpm smoke:dashboard`, `pnpm audit --prod`, `git diff --check` |
| Cloudflare Pages | Production deployment `https://97e0dc8c.lore-context.pages.dev`; custom domains `https://lorecontext.com/` and `https://www.lorecontext.com/` show the `Request beta access` CTA; `/download`, `/llms.txt`, `/llms-full.txt`, and `/robots.txt` verify over public HTTPS |
| AWS deploy | Rehearsal, deploy, env alignment, and post-deploy checks succeeded; private SSM command IDs stay in closed operator notes |
| AWS verify | Post-deploy checks confirmed healthy containers, app-domain OAuth callback, OpenAPI version, and release state; private SSM command IDs and host paths stay in closed operator notes |
| Host state | Active release line is healthy; API, Dashboard, and Postgres containers healthy. Specific release SHA and host paths stay in closed operator notes |
| External API proof | `https://api.lorecontext.com/openapi.json` reports `1.0.0-rc.2` with 72 paths and includes Google sign-in start, `GET`/`POST` callback, Memory Inbox, recall trace, capture, source, connector, usage, operator, and hosted MCP surfaces |
| External protection | `https://api.lorecontext.com/health` returns `ok`; unauthenticated `/v1/cloud/whoami` returns `401 cloud.token_required`; dashboard root returns `200`; callback-denied path redirects to `/?auth_error=400` |
| Website source fix | `pnpm --filter @lore/website test` passed after release metadata alignment; live Pages deploy `97e0dc8c` verified on root, `www`, `/download`, LLM docs, and `robots.txt` |

## Current public release

| Surface | Status |
|---|---|
| Current release | `v1.0.0-rc.2` |
| Release type | Public SaaS Beta Readiness pre-release |
| GitHub release | `https://github.com/Lore-Context/lore-context/releases/tag/v1.0.0-rc.2` |
| Release tag | `v1.0.0-rc.2` |
| Public `main` | rc.2 public SaaS beta readiness closure plus earlier post-release closure, integration validation, MCP Registry, adoption validation, marketplace assets, HN launch-readiness, and status-doc refresh commits |
| npm-backed Registry closure source | `8637e37546b24caba4f170182beca613f0ba6d09`; GitHub Actions run `25120831678`, success |
| MCP distribution baseline | `1914718c3136fab2f7eed167445e97a910b62bb0`; GitHub Actions run `25110357633`, success |
| Adoption closure source | `1a64980682216d715d0da40a37ee03b0a752f9e9`; GitHub Actions run `25112973276`, success |
| Website | `https://lorecontext.com/` and `https://www.lorecontext.com/` |
| AI-readable docs | `https://lorecontext.com/llms.txt`, `https://lorecontext.com/llms-full.txt` |
| Public API health | `https://api.lorecontext.com/health` is public; private cloud data surfaces remain auth-gated |
| npm MCP server package | `@lore-context/server@0.6.0-alpha.1`, public and fresh-install verified |
| MCP Registry | `io.github.Lore-Context/lore-context-mcp`, active; lists npm and OCI package entries |
| MCP OCI image | `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.1`, public |
| Launch website surfaces | Live: homepage refresh plus `/quickstart/`, `/blog/v0-6-distribution-and-trust-sprint/`, `/benchmark/`, and sitemap verified after the current Cloudflare Pages production deploy |
| Launch-readiness source | `f7fe14234ca89c02397da230de3e27f90576c469`; GitHub Actions run `25115346417`, success |
| AWS-backed public API runtime | Healthy at the public health endpoint; private AWS instance, SSM, and account details stay in closed operator notes |

The release tag points at the original `v0.6.0-alpha` release commit. Public
`main` includes later release-closure, integration-validation, distribution,
adoption-closure, npm-backed MCP Registry, and launch-readiness fixes. Do not
rewrite the public tag unless a future release decision explicitly requires it.

## What v0.6 proves

- Lore can be discovered through public docs, website metadata, and AI-readable context files.
- Developers can run a local alpha path with `pnpm quickstart -- --dry-run --activation-report`.
- The API exposes OpenAPI, context query, Evidence Ledger, eval, governance, memory, and MIF surfaces.
- The website and generated docs are public-safe and exclude private runbooks, secrets, customer data, and internal planning folders.
- Distribution, launch, and design partner materials are ready for human review.
- The public website has HN-ready quickstart, v0.6 changelog narrative, and
  benchmark methodology pages that avoid unsupported benchmark-win claims.
- Project-scoped Cursor and Qwen Code MCP configs are present in `.cursor/mcp.json`
  and `.qwen/settings.json`.
- MCP Registry metadata is valid in `server.json`; the Official Registry listing
  is active and exposes both public install paths: npm
  `@lore-context/server@0.6.0-alpha.1` and GHCR OCI
  `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.1`. GitHub Actions run
  `25120707303` published the active listing.
- The AWS-backed public API health endpoint and OpenAPI document are live. The
  deployed API application source can remain older than docs/distribution-only
  commits when runtime code did not change.

## What v0.6 does not claim

- No public hosted SaaS signup.
- No billing or Stripe flow.
- No managed cloud sync.
- No remote MCP HTTP default path.
- No autonomous marketplace, HN, Reddit, Discord, or outreach submission.
- No third-party benchmark win without a cited, reproducible public report.
- No published `@lore-context/quickstart` npm package claim; the canonical alpha
  activation path remains `git clone` plus `pnpm quickstart`.

## Next validation focus

See [adoption-validation.md](adoption-validation.md) for the current evidence
matrix and open validation tasks.

- Fresh clone to first `context.query` in less than 10 minutes: maintainer-run
  clean checkout proof completed at `10.13s`; repeat with real users.
- Fresh clone to first Evidence Ledger view in less than 15 minutes:
  maintainer-run clean checkout proof completed at `10.13s`; repeat with real
  users.
- Claude Code fresh-user golden-path verification: actual CLI add/list/get path
  completed after a documentation fix.
- Cursor fresh-user golden-path verification: actual Cursor Agent prompt-level
  `context_query` and `trace_get` completed after CLI login. Headless validation
  used `--model auto` and `--force` against demo data because the free plan only
  allows Auto and MCP calls require explicit approval.
- Qwen Code fresh-user golden-path verification: `qwen mcp list` connects to
  Lore, and a Qwen Code non-interactive run successfully invoked
  `mcp__lore__context_query` against a temporary Lore API.
- MCP Registry: completed. `server.json` validates locally; GHCR image publish
  and Official Registry publish succeeded through the `Publish MCP Registry`
  workflow run `25120707303`; Registry API reports `active` and `isLatest: true`.
- npm MCP server package: `@lore-context/server@0.6.0-alpha.1` published on
  npm with `alpha` and `latest` dist-tags. Fresh install from a temporary
  directory succeeded, and the installed `lore-context-server` MCP SDK transport
  returned 11 tools from `tools/list`.
- Marketplace / hub listings beyond the Official MCP Registry still need
  human-reviewed schema checks; public-safe demo screenshots are available under
  `docs/distribution/assets/`.
- Show HN launch: draft is ready, but first submission was deferred by HN's
  new-account Show HN restriction; no thread URL exists yet.
- HN launch readiness pages: production `https://lorecontext.com/quickstart/`,
  `/blog/v0-6-distribution-and-trust-sprint/`, `/benchmark/`, and sitemap were
  verified after the current Cloudflare Pages deploy; repeat this check after
  every future website redeploy.
- Public-safe eval report tested against design-partner data.
- 3-5 design partners with activation scorecards.
- v0.7 decision based on adoption evidence: private hosted alpha, remote MCP HTTP, enterprise/private-deployment hardening, or benchmark/report lane.
