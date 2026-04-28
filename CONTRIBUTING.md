# Contributing To Lore Context

Thanks for improving Lore Context. This project is an alpha-stage AI-agent context
control plane, so changes should preserve local-first operation, auditability, and
deployment safety.

## Development Setup

Requirements:

- Node.js 22 or newer
- pnpm 10.30.1

Common commands:

```bash
pnpm install
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres
pnpm run doctor
```

## Pull Request Expectations

- Keep changes focused and reversible.
- Add tests for behavior changes.
- Run `pnpm build` and `pnpm test` before requesting review.
- Run the relevant smoke test when changing API, dashboard, MCP, Postgres, import/export,
  eval, or deployment behavior.
- Do not commit generated build output, local stores, `.env` files, credentials, or
  private customer data.

## Commit Messages

Use the Lore commit protocol: the first line should explain why the change was made.
Add useful trailers when they clarify constraints, tests, risk, or rejected alternatives.

Example:

```text
Prevent unkeyed remote memory writes

Remote deployments need a hard auth boundary before public exposure, so the API now
requires configured keys outside loopback development.

Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test
Not-tested: Cloudflare Access integration
```
