# Distribution Submission Review

Last updated: 2026-04-29

This checklist keeps marketplace and registry submissions human-reviewed. Do not
submit to third-party sites from automation without final human approval.

## Current Readiness

| Surface | Current status | Submit now? | Blocker / next action |
|---|---|---:|---|
| Official MCP Registry | published | complete | `server.json` validates; GHCR image is public; workflow run `25111065964` published the active listing for `io.github.Lore-Context/lore-context-mcp`. |
| MCP hubs / community directories | draft-ready | human review first | Use public GitHub repo and website only; make alpha status visible. |
| GitHub topics / repository metadata | ready | human review first | Align with `agent-memory`, `mcp`, `governance`, `eval`, `observability`, `local-first`. |
| Cursor ecosystem copy | draft-ready | human review first | Cursor MCP discovery and tool listing are verified; prompt-level use still needs Cursor auth. |
| Qwen Code ecosystem copy | draft-ready | human review first | Qwen Code connected to Lore and invoked `mcp__lore__context_query`. |
| Vercel / Cloudflare / agent galleries | draft | no | Static website exists, but there is no public hosted SaaS or remote MCP HTTP endpoint. |
| Replit / StackBlitz / Gitpod | later | no | Needs a maintained one-click startup path. |

## Official MCP Registry Requirement

The official MCP Registry stores public metadata for public MCP servers. A Lore
submission should wait until at least one distribution path exists:

1. public npm package for the MCP server;
2. public OCI image for the MCP server; or
3. public remote MCP endpoint with an approved threat model.

Current distribution path is OCI and published:

- `server.json` describes `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.0`.
- The image label `io.modelcontextprotocol.server.name` matches
  `io.github.Lore-Context/lore-context-mcp`.
- `mcp-publisher validate` succeeds locally.
- GHCR package `lore-context-mcp` is public; anonymous Docker manifest lookup
  succeeds.
- Official Registry publish is performed by GitHub Actions with
  `packages: write` and MCP Registry `github-oidc`; run `25111065964` succeeded.

## Human Review Checklist

- Alpha status is visible.
- The listing points to `https://github.com/Lore-Context/lore-context` and
  `https://lorecontext.com`.
- No hosted SaaS, billing, managed sync, or benchmark-win claim is implied.
- No private repo, private host, local path, secret, customer name, or partner
  dataset appears in the listing.
- Screenshots or GIFs use demo data only.
- Registry-specific schema validates before submission.
- A person performs the final submit action for every new third-party surface.

## Assets Still Needed

- Dashboard screenshot showing Evidence Ledger and review queue with demo data.
- Terminal GIF or short recording of `pnpm quickstart -- --dry-run --activation-report`.
- Optional architecture screenshot from the public website.
