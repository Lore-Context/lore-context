# Release Status

Last updated: 2026-05-23

This is the public-safe status snapshot for the open-source
`Lore-Context/lore-context` repository. It intentionally omits private
production hostnames, instance identifiers, account identifiers, Secrets
Manager names, release command IDs, and customer or benchmark data.

## v2.1.0

Status: **current open-core source line**

Public OSS scope:

- Repo Graph API and MCP tools.
- Code knowledge graph indexers.
- Context Query composition across memory, web, repo, and tool-trace evidence.
- Hybrid search, reranker abstraction, governance primitives, MIF import/export,
  eval framework, model gateway, and `agentmemory` adapter.
- SDK middleware packages plus generated SDK source previews for TypeScript,
  Python, Go, Java, and .NET.
- Browser extension capture scaffold.
- Dashboard customer workflow scaffold for apps, sources, inbox, memories,
  evidence, privacy, and developer setup.
- Local/private deployment docs and Docker Compose demo path.

Hosted commercial scope:

- AWS/Cloudflare production deployment automation.
- Hosted Google/Auth0 sign-in and personal-vault bootstrap.
- Billing, quotas, overage, abuse protection, and hosted subscription flows.
- Secret Vault runtime while crypto audit remains pending.
- Production release preflight, rollback, SSM, IaC, multi-region, and operator
  runbooks.

Public verification expectations:

- `pnpm install --frozen-lockfile`
- `pnpm build`
- `pnpm test`
- `pnpm openapi:check`
- `pnpm quickstart -- --dry-run --activation-report`
- `pnpm --filter @lore/browser-extension build`
- `pnpm --filter @lore/browser-extension test`
- `pnpm eval:recipe-shadow`
- Markdown link check and leak scan before public PR merge.

## v2.0.9

Status: **open-core memory self-improvement loop**

Public-safe scope:

- Context recipe types and default registry surfaces.
- Passive eval dataset generation from agent evidence.
- Shadow recipe runner and deterministic comparison reports.
- Disabled-by-default scheduler and human-gated promotion boundaries.
- Release notes and handoff docs without internal operator evidence.

Hosted/commercial operations remain private.

## Earlier Releases

Earlier public releases remain documented in `CHANGELOG.md` and
`docs/release-notes/`. Historical hosted-production details are intentionally
not reproduced in this public status file unless they are already safe for
open-source users and do not identify private infrastructure.
