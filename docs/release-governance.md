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

Publication record:

- Public commit: `4b03125`.
- Public tag: `v0.5.0-alpha`.
- GitHub Release: `https://github.com/Lore-Context/lore-context/releases/tag/v0.5.0-alpha`.
- GitHub Actions gate: `CI / build-test`, run `25067254659`, passed.
- Website: Cloudflare Pages project `lore-context`; `https://lorecontext.com/`
  and `https://www.lorecontext.com/` verified with v0.5 docs content.

## v0.6 governance task

`v0.6.0-alpha` adds AI-readable docs and distribution materials, so the governance
priority shifts from only separating remotes to also preventing public launch
artifacts from leaking internal planning, customer data, local research snapshots,
or credential-shaped values.

Release-gate requirements:

- `llms.txt` and `llms-full.txt` must be generated only from public repository
  material.
- Quickstart activation reports must redact generated API keys in both dry-run
  and real proof modes.
- Public-safe eval reports must exclude raw memory content and dataset messages.
- External research snapshots and private runbooks must remain ignored or outside
  the public checkout.

Publication record:

- Public release: `https://github.com/Lore-Context/lore-context/releases/tag/v0.6.0-alpha`.
- Public release tag: `v0.6.0-alpha` at `4f0eadf369e99e364bd06b7d3228b84a9f7501b9`.
- Public application closure source: `38fe564917de5756d8a937706a9e1120e2c26356`;
  GitHub Actions gate run `25102174056`, passed.
- Public `main` now also contains post-release integration validation, npm-backed
  MCP Registry, adoption validation, marketplace assets, HN launch-readiness,
  and status-doc refresh commits.
- MCP Registry publication: `io.github.Lore-Context/lore-context-mcp` active;
  `@lore-context/server@0.6.0-alpha.1` on npm and
  `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.1` on GHCR are the current
  public install paths; workflow run `25120707303` passed.
- Website: `https://lorecontext.com/` and `https://www.lorecontext.com/` verified with the `v0.8 cloud beta` marker while preserving the public `v0.6.0-alpha` open-source boundary.
- AI-readable docs: `/llms.txt`, `/llms-full.txt`, and `robots.txt` LLMs pointer verified.
- Public API health: `https://api.lorecontext.com/health` is bearer-auth
  protected in the current private cloud runtime.
- AWS-backed private cloud runtime: v0.8 production is deployed from
  `bb8e1a585fd0e13051fdd999e09dcacde5b79258`; API, Dashboard, and Postgres
  health are tracked in closed operator notes. Private instance IDs, SSM command
  IDs, and account details stay out of public docs.
- Public status snapshot: [release-status.md](release-status.md).

The remaining governance task after v0.6 is to clean up local workflow:

1. Create or verify separate public/private checkouts.
2. Confirm `git remote -v` in each checkout has only the intended push remote.
3. Enable GitHub branch protection and required CI for public `main`.
4. Enable secret scanning / push protection where available.
5. Document private-only deployment changes outside `lore-context`.
