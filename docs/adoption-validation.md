# v0.6 Adoption Validation

Last updated: 2026-04-29

This file tracks adoption evidence after the `v0.6.0-alpha` release. It is
public-safe: do not add secrets, customer data, private memory exports, or
partner names unless the partner has explicitly approved being named.

## Current Evidence

| Area | Status | Evidence |
|---|---|---|
| Public `main` | `3795c8af99bd2152aeee8abd868becfaeff214c8` | GitHub Actions run `25107479571`, success |
| Production website | Live | `https://lorecontext.com/` and `https://www.lorecontext.com/` show `v0.6.0-alpha` |
| AI-readable docs | Live and redeployed | `/llms.txt`, `/llms-full.txt`, and `robots.txt` verified against current website build output |
| Public API health | Live | `https://api.lorecontext.com/health` returns `status: ok` |
| Clean checkout activation | Maintainer-run proof complete | fresh clone to first `context.query`: `10.13s`; first Evidence Ledger view: `10.13s` |
| Claude Code golden path | Actual client path complete | `claude mcp add/list/get` succeeded after the docs command order was fixed |
| Cursor golden path | Actual MCP client management path complete; agent prompt blocked on auth | `cursor-agent` installed via Cursor CLI, project `.cursor/mcp.json` discovered, `cursor-agent mcp enable/list/list-tools lore` listed 11 Lore tools. Full prompt-level use still needs Cursor login or `CURSOR_API_KEY`. |
| Qwen Code golden path | Actual client path complete | `@qwen-code/qwen-code` `0.15.5` installed; `qwen mcp list` connected to project `.qwen/settings.json`; Qwen Code non-interactive run used `mcp__lore__context_query` successfully against a temporary Lore API. |
| Show HN | Deferred | HN redirected the submitted draft to a new-account Show HN restriction page; no thread URL exists |
| MCP Registry | Metadata valid; OCI publish workflow prepared | `server.json` validates with `mcp-publisher validate`; local OCI image `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.0` builds and lists Lore tools. Local GHCR push is blocked by token scope, so `.github/workflows/publish-mcp-registry.yml` publishes via GitHub Actions `packages: write` and MCP Registry OIDC. Server namespace must remain `io.github.Lore-Context/*` to match registry auth. |
| Marketplace metadata | Draft, needs review assets | copy is prepared, but listings should not be submitted until screenshots/GIFs and registry-specific schemas are reviewed |

## Client Validation Rules

A golden integration counts as complete only when a real client can use the
published instructions from a fresh user perspective.

| Client | Counts as complete | Does not count |
|---|---|---|
| Claude Code | `claude mcp add`, `claude mcp list`, and `claude mcp get lore` show the Lore server connected | direct MCP stdio script only |
| Cursor | Cursor or Cursor Agent can discover the Lore MCP server and list/use Lore tools from the documented config | `.cursor/mcp.json` syntax check or direct stdio script only |
| Qwen Code | `qwen mcp` / Qwen Code session can discover the Lore MCP server and list/use Lore tools from `.qwen/settings.json` or `qwen mcp add` | direct stdio script only |

## Open P0 Tasks

1. Finish Cursor prompt-level validation after Cursor login or `CURSOR_API_KEY`
   is available. MCP discovery and tool listing are already complete.
2. Run the MCP Registry/GHCR workflow and verify the public package URL plus
   official registry listing.
3. Run 3-5 design partner activation sessions using
   `docs/design-partners/intake.md` and
   `docs/design-partners/activation-scorecard.md`.
4. Produce at least one public-safe screenshot or terminal GIF before submitting
   marketplace listings.

## Evidence Storage

- Store public-safe activation notes in `docs/design-partners/session-tracker.md`.
- Store raw private notes, named partner details, production data, and private
  cloud runbook evidence outside the public repository.
- Do not commit generated local API keys or `data/activation-report.json` if it
  contains environment-specific details.
