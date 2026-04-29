# Roadmap

Last updated: 2026-04-29

Lore Context is currently in public alpha.

## Current release: `v0.6.0-alpha`

Release status:

- Public release tag: `v0.6.0-alpha` at `4f0eadf369e99e364bd06b7d3228b84a9f7501b9`.
- Public `main`: release tag plus post-release closure, integration validation,
  distribution, adoption-validation, and HN launch-readiness commits.
- Latest verified launch-readiness source:
  `f7fe14234ca89c02397da230de3e27f90576c469`.
- Launch-readiness CI: GitHub Actions run `25115346417`, success on `f7fe142`.
- Website: `https://lorecontext.com/` and `https://www.lorecontext.com/` live.
- AI-readable docs: `/llms.txt` and `/llms-full.txt` live.
- Public API health: `https://api.lorecontext.com/health` returns ok.
- MCP Registry: `io.github.Lore-Context/lore-context-mcp` active; GHCR image
  `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.0` public.
- npm MCP server package: `@lore-context/server@0.6.0-alpha.0` public; fresh
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

## Current validation focus after v0.6

Theme:

**Adoption validation**

`v0.6` has shipped the Distribution and Trust Sprint. The current work is to
turn the release into adoption evidence:

See [adoption-validation.md](adoption-validation.md) for the live evidence
matrix.

1. **Clean activation timing**: repeat fresh clone to first `context.query` with real users.
2. **First ledger proof**: repeat fresh clone to first Evidence Ledger view with real users.
3. **Golden integrations**: repeat Claude Code, Cursor, and Qwen Code with fresh users.
4. **Public-safe trust demo**: run eval report redaction on design-partner data.
5. **Human-reviewed distribution**: use the completed Official MCP Registry listing as the baseline, then submit marketplace/hub drafts after screenshot/GIF and schema review.
6. **Design partner learning**: use scorecards to decide the v0.7 lane.

Explicit non-goals:

- No public hosted SaaS signup.
- No billing / Stripe.
- No managed cloud sync.
- No remote MCP HTTP as the default path.
- No fake benchmark claims.
- No public npm quickstart package claim until `@lore-context/quickstart` is
  actually published and verified from a fresh shell.
- No autonomous outreach posting or marketplace submission.

Success metrics:

- Fresh clone to first `context.query`: `<10 minutes`.
- Fresh clone to first Evidence Ledger view: `<15 minutes`.
- First 5 fresh-user quickstarts: `>=80%` success without maintainer help.
- Fresh-user repeats for Claude Code, Cursor, and Qwen Code.
- `/llms.txt` and docs bundle live on the website.
- Official MCP Registry active, plus at least 4 marketplace/plugin listing
  drafts ready for human submission.
- npm MCP server install path verified from a fresh directory.
- One public-safe trust demo report ready for launch.

## Candidate `v0.7` lanes

Decision depends on `v0.6` adoption evidence:

1. Private hosted alpha in the cloud component.
2. Remote MCP HTTP transport behind service tokens and a stronger threat model.
3. Enterprise/private-deployment hardening: backup/restore, observability, tenant admin, audit export.
4. Deeper backend comparison and migration workflows using MIF.

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
