# Adoption and Private Beta Validation

Last updated: 2026-05-01

This file tracks public-safe adoption evidence after the `v0.6.0-alpha` release
and private-beta validation after `v0.8.0-beta`. Do not add secrets, customer
data, private memory exports, raw transcripts, or partner names unless the
partner has explicitly approved being named.

## Current Evidence

| Area | Status | Evidence |
|---|---|---|
| Private cloud beta | Deployed | `v0.8.0-beta` is closed in `Lore-Context/lore-cloud`; private release and post-deploy evidence commits are recorded in closed operator notes; CI runs `25164511648` and `25165067958` passed |
| Production cloud runtime | Live and protected | AWS Singapore runtime runs the private beta line; API, Dashboard, and Postgres containers healthy; API/OpenAPI require bearer auth externally; Dashboard redirects through Cloudflare Access |
| Production website | Live with v0.8 beta marker | Cloudflare Pages deployment `https://ae146d38.lore-context.pages.dev`; `https://lorecontext.com/en/` and `https://www.lorecontext.com/en/` show `v0.8 cloud beta` |
| Public `main` | Post-release closure, distribution, adoption-validation, HN launch-readiness, npm-backed MCP Registry, and status-doc refresh commits are on `main`; npm-backed Registry closure source `8637e37546b24caba4f170182beca613f0ba6d09` | CI run `25120831678`, success |
| AI-readable docs | Live and redeployed | `/llms.txt`, `/llms-full.txt`, and `robots.txt` verified against current website build output |
| Public API health | Protected | `https://api.lorecontext.com/health` returns expected bearer-auth `401` without credentials in the current private cloud runtime |
| Clean checkout activation | Maintainer-run proof complete | fresh clone to first `context.query`: `10.13s`; first Evidence Ledger view: `10.13s` |
| Claude Code golden path | Actual client path complete | `claude mcp add/list/get` succeeded after the docs command order was fixed |
| Cursor golden path | Actual client path complete | `cursor-agent` `2026.04.28-e984b46` logged in, project `.cursor/mcp.json` discovered, `mcp enable/list/list-tools lore` listed 11 tools, and headless prompt-level `context_query` + `trace_get` succeeded against demo data. Evidence: trace `ctx_479d26d6-d0b2-48ba-9bbe-7b0ac943c145`, `MATCHED=true`, 2 retrieved / 2 used rows. |
| Qwen Code golden path | Actual client path complete | `@qwen-code/qwen-code` `0.15.5` installed; `qwen mcp list` connected to project `.qwen/settings.json`; Qwen Code non-interactive run used `mcp__lore__context_query` successfully against a temporary Lore API. |
| Show HN | Deferred | HN redirected the submitted draft to a new-account Show HN restriction page; no thread URL exists |
| HN launch website surfaces | Live on production domains | Homepage, `/quickstart/`, `/blog/v0-6-distribution-and-trust-sprint/`, `/benchmark/`, and `sitemap.xml` verified on `https://lorecontext.com` and `https://www.lorecontext.com` |
| npm MCP server package | Published and fresh-install verified | npm org `@lore-context` exists; `@lore-context/server@0.6.0-alpha.1` package page is public; `npm view` returns package metadata; `npm dist-tag ls` returns `alpha` and `latest`; fresh install from a temporary directory succeeded; the installed `lore-context-server` MCP SDK transport returned 11 tools from `tools/list`. |
| MCP Registry | Published | GHCR package `lore-context-mcp` is public; anonymous Docker manifest lookup succeeds for `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.1`; GitHub Actions run `25120707303` published `io.github.Lore-Context/lore-context-mcp`; Registry API returns `active`, `isLatest: true`, and publishedAt `2026-04-29T16:23:19.42298Z`. |
| Marketplace metadata | Draft with demo screenshots ready | copy is prepared and public-safe screenshots exist under `docs/distribution/assets/`; listings still need human final review and registry-specific schema checks before submission |
| npm quickstart package | Not claimed | `@lore-context/quickstart` is not part of the current release claim; public docs and launch copy use `git clone` plus `pnpm quickstart` |

## Client Validation Rules

A golden integration counts as complete only when a real client can use the
published instructions from a fresh user perspective.

| Client | Counts as complete | Does not count |
|---|---|---|
| Claude Code | `claude mcp add`, `claude mcp list`, and `claude mcp get lore` show the Lore server connected | direct MCP stdio script only |
| Cursor | Cursor or Cursor Agent can discover the Lore MCP server and list/use Lore tools from the documented config | `.cursor/mcp.json` syntax check or direct stdio script only |
| Qwen Code | `qwen mcp` / Qwen Code session can discover the Lore MCP server and list/use Lore tools from `.qwen/settings.json` or `qwen mcp add` | direct stdio script only |

## Open P0 Tasks

1. Run 20-50 private beta activation sessions using
   `docs/design-partners/intake.md` and
   `docs/design-partners/activation-scorecard.md`.
2. Track the v0.8 funnel for every beta user: account/invite -> `lore connect`
   -> `lore watch` -> first captured memory -> Memory Inbox action -> first
   cross-agent recall.
3. Re-run production launch page verification after any future website deploy:
   `/quickstart/`, `/blog/v0-6-distribution-and-trust-sprint/`, `/benchmark/`,
   and `sitemap.xml`.
4. Submit marketplace / MCP hub listings beyond the Official MCP Registry after
   human review of copy, screenshots, and registry-specific schemas.
5. Repeat Claude Code, Codex, Cursor, and Qwen Code golden paths with fresh users and
   record second-day retention.
6. Validate privacy controls in production: pause source, private mode, export,
   delete memory, delete source, and delete vault.

## Evidence Storage

- Store public-safe activation notes in `docs/design-partners/session-tracker.md`.
- Store raw private notes, named partner details, production data, and private
  cloud runbook evidence outside the public repository.
- Do not commit generated local API keys or `data/activation-report.json` if it
  contains environment-specific details.
