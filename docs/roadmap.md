# Roadmap

Last updated: 2026-04-29

Lore Context is currently in public alpha.

## Current release: `v0.5.0-alpha`

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

## Activation phase: `v0.5` design partners

Theme:

**Alpha Adoption Sprint: get real agent users to first value in 10 minutes.**

Now validating:

- clean-checkout time from clone to first `context.query`;
- first Evidence Ledger view after a real agent workflow;
- Claude Code, Cursor, and Qwen Code setup success with copy-paste configs;
- whether users run eval and return on day two;
- willingness to pay for managed hosting, private deployment, or support.

Explicit non-goals:

- No public hosted SaaS signup.
- No billing / Stripe.
- No managed cloud sync.
- No remote MCP HTTP as the default path.
- No deep end-to-end work for non-golden integrations.

## Candidate next release: `v0.6.0-alpha`

Decision depends on `v0.5` design partner evidence.

Possible lanes:

1. Hosted sync and private team dashboard.
2. Remote MCP HTTP transport behind service tokens.
3. Enterprise/private-deployment hardening.
4. Deeper backend comparison and migration workflows.

The `v0.6` decision should be made only after the `v0.5` metrics are reviewed:

- time to first `context.query`;
- first Evidence Ledger view;
- golden-path integration completion;
- second-day retention;
- private-alpha willingness to pay.

## Long-term direction

Lore should stay an open-core control plane, not a memory database.

Open core:

- local API;
- MCP server;
- dashboard;
- eval;
- MIF import/export;
- governance primitives;
- integration docs.

Commercial/private layer:

- hosted sync;
- tenant administration;
- backup/restore;
- production observability;
- private deployment runbooks;
- enterprise controls;
- support and design-partner operations.
