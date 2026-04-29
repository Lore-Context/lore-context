# Roadmap

Last updated: 2026-04-29

Lore Context is currently in public alpha.

## Current release: `v0.6.0-alpha`

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

Still validating:

- clean-checkout time from clone to first `context.query`;
- first Evidence Ledger view after a real agent workflow;
- golden-path integration completion with fresh users;
- public-safe eval report on design-partner data;
- second-day retention and willingness to pay for private deployment/support.

## Current validation focus

Theme:

**Distribution and Trust Sprint**

`v0.6` makes the v0.5 substrate easier to discover, install, verify, and launch. The shipped release covers:

1. **AI-readable docs**: publish `llms.txt` / `llms-full.txt`, improve website metadata, keep 17-locale site verification deterministic.
2. **One-command activation**: quickstart now supports a redacted dry-run report and a real first-value report with API health, first memory write, first `context.query`, and first Evidence Ledger milestones.
3. **Trust demo pack**: API smoke now verifies public-safe eval report output and MIF JSON export in the end-to-end path.
4. **MCP registry and marketplace metadata**: human-reviewed registry, marketplace, agent plugin, and MCP security drafts live under `docs/distribution/`.
5. **Launch content**: Show HN, Evidence Ledger, Governance, and benchmark methodology drafts live under `docs/launch/`.
6. **Design partner intake**: intake notes, scorecard, and GitHub issue template are ready for human use.

Explicit non-goals:

- No public hosted SaaS signup.
- No billing / Stripe.
- No managed cloud sync.
- No remote MCP HTTP as the default path.
- No fake benchmark claims.
- No autonomous outreach posting or marketplace submission.

Success metrics:

- Fresh clone to first `context.query`: `<10 minutes`.
- Fresh clone to first Evidence Ledger view: `<15 minutes`.
- First 5 fresh-user quickstarts: `>=80%` success without maintainer help.
- `/llms.txt` and docs bundle live on the website.
- MCP Registry and at least 4 marketplace/plugin listing drafts ready for human submission.
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
