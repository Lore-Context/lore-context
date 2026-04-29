# Roadmap

Last updated: 2026-04-29

Lore Context is currently in public alpha.

## Current release: `v0.6.0-alpha`

Release status:

- Public release tag: `v0.6.0-alpha` at `4f0eadf369e99e364bd06b7d3228b84a9f7501b9`.
- Public `main`: `38fe564917de5756d8a937706a9e1120e2c26356`.
- CI: GitHub Actions run `25102174056`, success.
- Website: `https://lorecontext.com/` and `https://www.lorecontext.com/` live.
- AI-readable docs: `/llms.txt` and `/llms-full.txt` live.
- Public API health: `https://api.lorecontext.com/health` returns ok.

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

Still validating:

- clean-checkout time from clone to first `context.query`;
- first Evidence Ledger view after a real agent workflow;
- golden-path integration completion with fresh users;
- public-safe eval report on design-partner data;
- second-day retention and willingness to pay for private deployment/support.

## Current validation focus after v0.6

Theme:

**Adoption validation**

`v0.6` has shipped the Distribution and Trust Sprint. The current work is to
turn the release into adoption evidence:

1. **Clean activation timing**: record fresh clone to first `context.query`.
2. **First ledger proof**: record fresh clone to first Evidence Ledger view.
3. **Golden integrations**: validate Claude Code, Cursor, and Qwen Code with fresh users.
4. **Public-safe trust demo**: run eval report redaction on design-partner data.
5. **Human-reviewed distribution**: submit MCP Registry and marketplace drafts only after review.
6. **Design partner learning**: use scorecards to decide the v0.7 lane.

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
