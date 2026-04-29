# Release Status

Last updated: 2026-04-29

This page is the public-safe release status snapshot for Lore Context. It records what is currently published and what the public alpha does not claim.

## Current public release

| Surface | Status |
|---|---|
| Current release | `v0.6.0-alpha` |
| Release type | Public alpha pre-release |
| GitHub release | `https://github.com/Lore-Context/lore-context/releases/tag/v0.6.0-alpha` |
| Release tag | `v0.6.0-alpha` at `4f0eadf369e99e364bd06b7d3228b84a9f7501b9` |
| Public `main` | release tag plus post-release closure, integration validation, and distribution commits |
| Latest verified distribution source | `1914718c3136fab2f7eed167445e97a910b62bb0` |
| MCP distribution CI | GitHub Actions run `25110357633`, success on `1914718c` |
| Website | `https://lorecontext.com/` and `https://www.lorecontext.com/` |
| AI-readable docs | `https://lorecontext.com/llms.txt`, `https://lorecontext.com/llms-full.txt` |
| Public API health | `https://api.lorecontext.com/health` returns `status: ok` |
| MCP Registry | `io.github.Lore-Context/lore-context-mcp`, active |
| MCP OCI image | `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.0`, public |

The release tag points at the original `v0.6.0-alpha` release commit. Public
`main` includes later release-closure, integration-validation, and distribution
fixes. Do not
rewrite the public tag unless a future release decision explicitly requires it.

## What v0.6 proves

- Lore can be discovered through public docs, website metadata, and AI-readable context files.
- Developers can run a local alpha path with `pnpm quickstart -- --dry-run --activation-report`.
- The API exposes OpenAPI, context query, Evidence Ledger, eval, governance, memory, and MIF surfaces.
- The website and generated docs are public-safe and exclude private runbooks, secrets, customer data, and internal planning folders.
- Distribution, launch, and design partner materials are ready for human review.
- Project-scoped Cursor and Qwen Code MCP configs are present in `.cursor/mcp.json`
  and `.qwen/settings.json`.
- MCP Registry metadata is valid in `server.json`; the OCI image is public on
  GHCR, and GitHub Actions run `25111065964` published the active Official MCP
  Registry listing.

## What v0.6 does not claim

- No public hosted SaaS signup.
- No billing or Stripe flow.
- No managed cloud sync.
- No remote MCP HTTP default path.
- No autonomous marketplace, HN, Reddit, Discord, or outreach submission.
- No third-party benchmark win without a cited, reproducible public report.

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
  workflow run `25111065964`; Registry API reports `active` and `isLatest: true`.
- Marketplace / hub listings beyond the Official MCP Registry still need
  human-reviewed schema checks; public-safe demo screenshots are available under
  `docs/distribution/assets/`.
- Show HN launch: draft is ready, but first submission was deferred by HN's
  new-account Show HN restriction; no thread URL exists yet.
- Public-safe eval report tested against design-partner data.
- 3-5 design partners with activation scorecards.
- v0.7 decision based on adoption evidence: private hosted alpha, remote MCP HTTP, enterprise/private-deployment hardening, or benchmark/report lane.
