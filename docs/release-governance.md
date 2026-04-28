# Release Governance

Last updated: 2026-04-29

This document defines how Lore Context separates public open-core development from
private hosted/cloud operations.

## Repository boundary

| Repository | Visibility | Purpose |
|---|---|---|
| `Lore-Context/lore-context` | Public | Open-core product: API, MCP server, dashboard, eval, governance, MIF, docs, website, local/private Compose |
| `Lore-Context/lore-cloud` | Private | Hosted deployment, infrastructure, billing, tenant admin, private runbooks, production/customer configuration |

## Local checkout rule

Do not use one everyday checkout with both public and private remotes for normal
development.

Recommended local layout:

```bash
~/Desktop/lore-context-public   # pushes only to origin = Lore-Context/lore-context
~/Desktop/lore-cloud-private    # pushes only to origin = Lore-Context/lore-cloud
```

If using worktrees, keep the push target explicit:

```bash
git worktree add ../lore-context-public main
git worktree add ../lore-cloud-private cloud-main
```

Each checkout should have exactly one default push remote.

## Public repository may contain

- Open-source source code.
- Public docs and localized docs.
- Public website source.
- Demo datasets that contain no customer data or secrets.
- Dockerfiles and Compose templates with placeholder-only environment values.
- Integration templates for local and private deployments.
- Release notes and public architecture docs.

## Public repository must not contain

- Customer data, memory exports, eval datasets, or traces.
- Cloudflare tokens, AWS account IDs, static AWS keys, production API keys.
- Internal launch plans that mention private customer details.
- Billing implementation and private tenant admin code.
- Private deployment hostnames that are not intentionally public.
- Incident runbooks with sensitive operational detail.

## Private repository may contain

- AWS / Cloudflare infrastructure code.
- Tenant model and private alpha deployment scripts.
- Backup and restore runbooks.
- Production dashboards and alerting configuration.
- Customer-specific configuration, only if encrypted or stored through secret managers.
- Billing experiments after the private alpha proves willingness to pay.

## Required release gates

Before pushing to public `main`:

```bash
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
```

Before tagging a public alpha:

- CI must pass on `main`.
- Secret scan must be clean.
- `CHANGELOG.md` must document the release.
- README and docs must not claim hosted cloud features that are not shipped.
- Public docs must link to `docs/project-plan.md` and `docs/roadmap.md`.

Before deploying private alpha:

- API and dashboard are behind Cloudflare Access or equivalent.
- API requires `LORE_API_KEYS`.
- Dashboard requires Basic Auth or stronger.
- Postgres backup and restore are documented.
- Demo project can be restored from backup.
- No raw `agentmemory` endpoint is public.

## Branch and tag policy

- Public `main` is protected.
- Public releases use semver tags such as `v0.5.0-alpha`.
- Private deployment tags may include internal suffixes, but must not be pushed to the public repository.
- Do not rewrite public history after a release unless a secret leak or legal takedown requires it.

## v0.5 governance task

`v0.5.0-alpha` was prepared from a public-history release branch because the
developer checkout still had both `origin` and `closed` remotes and identical
trees with different commit histories. This avoided a non-fast-forward public
push while preserving the private repository boundary.

The next governance task is still to clean up local workflow before v0.6 work:

1. Create or verify separate public/private checkouts.
2. Confirm `git remote -v` in each checkout has only the intended push remote.
3. Enable GitHub branch protection and required CI for public `main`.
4. Enable secret scanning / push protection where available.
5. Document any private-only deployment changes in `lore-cloud`, not `lore-context`.
