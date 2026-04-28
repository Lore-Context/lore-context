# Security Policy

Lore Context handles memory, traces, audit logs, and integration credentials. Treat
security reports as high priority.

## Reporting A Vulnerability

Do not open a public issue for suspected vulnerabilities, leaked secrets, auth
bypasses, data exposure, or tenant-isolation issues.

Preferred reporting path:

1. Use **GitHub private vulnerability reporting** for this repository when available.
2. If private reporting is unavailable, contact the maintainers privately and
   include:
   - affected version or commit,
   - reproduction steps,
   - expected impact,
   - whether any real secrets or personal data are involved.

We aim to acknowledge credible reports within 72 hours.

## Supported Versions

Lore Context is currently pre-1.0 alpha software. Security fixes target the `main`
branch first. Tagged releases may receive targeted patches when a public release is
actively used by downstream operators.

| Version | Supported |
|---|---|
| v0.4.x-alpha | ✅ Active |
| v0.3.x and earlier | ❌ Pre-release internal only |

## Built-In Hardening (v0.4.0-alpha)

The alpha ships with the following defense-in-depth controls. Operators should
verify these are active in their deployment.

### Authentication

- **API-key bearer tokens** (`Authorization: Bearer <key>` or
  `x-lore-api-key` header).
- **Role separation**: `reader` / `writer` / `admin`.
- **Per-project scoping**: `LORE_API_KEYS` JSON entries can include a
  `projectIds: ["..."]` allow-list; mutations require a matching `project_id`.
- **Empty-keys mode fails closed in production**: with `NODE_ENV=production` and no
  keys configured, the API refuses all requests.
- **Loopback bypass removed**: previous versions trusted `Host: 127.0.0.1`; v0.4 uses
  socket-level remote address only.

### Rate Limiting

- **Per-IP and per-key dual-bucket limiter** with auth-failure backoff.
- **Defaults**: 60 req/min per IP for unauth paths, 600 req/min per authenticated key.
- **5 auth failures within 60s → 30s lockout** (returns 429).
- Configurable: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (dev only).

### Dashboard Protection

- **HTTP Basic Auth middleware** (`apps/dashboard/middleware.ts`).
- **Production startup refuses to begin** without
  `DASHBOARD_BASIC_AUTH_USER` and `DASHBOARD_BASIC_AUTH_PASS`.
- `LORE_DASHBOARD_DISABLE_AUTH=1` is honored only outside production.
- Server-side admin-key fallback **removed**: a user must be authenticated via
  Basic Auth before the dashboard proxy injects upstream API credentials.

### Container Hardening

- All Dockerfiles run as non-root `node` user.
- `apps/api/Dockerfile` and `apps/dashboard/Dockerfile` declare `HEALTHCHECK`
  against `/health`.
- `apps/mcp-server` is stdio-only — no network listener — and does not declare a
  `HEALTHCHECK`.

### Secret Management

- **Zero hardcoded credentials.** All `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml`, and `.env.example` defaults use
  `${VAR:?must be set}` form — startup fails fast without explicit values.
- `scripts/check-env.mjs` rejects placeholder values
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) when `NODE_ENV=production`.
- All deployment docs and example READMEs have been scrubbed of literal demo
  credentials.

### Governance

- **Risk-tag scanning on every memory write**: API keys, AWS keys, JWT tokens,
  private keys, passwords, emails, phone numbers detected.
- **Six-state state machine** with explicit legal-transition table; illegal
  transitions throw.
- **Memory-poisoning heuristics**: same-source dominance + imperative-verb pattern
  matching → `suspicious` flag.
- **Immutable audit log** appended on every state transition.
- High-risk content auto-routed to `candidate` / `flagged` and held back from
  context composition until reviewed.

### MCP Hardening

- Every MCP tool input is **validated against a zod schema** before invocation.
  Validation failures return JSON-RPC `-32602` with sanitized issue list.
- **All mutating tools** require a `reason` string of at least 8 characters and
  surface `destructiveHint: true` in their schema.
- Upstream API errors are **sanitized** before being returned to MCP clients —
  raw SQL, file paths, and stack traces are scrubbed.

### Logging

- **Structured JSON output** with `requestId` correlation across handler chain.
- **Auto-redaction** of fields matching `content`, `query`, `memory`, `value`,
  `password`, `secret`, `token`, `key`. The actual content of memory records and
  queries is never written to logs.

### Data Boundaries

- The `agentmemory` adapter probes upstream version on init and warns on
  incompatibility. `LORE_AGENTMEMORY_REQUIRED=0` switches the adapter to silent
  degraded mode if the upstream is unreachable.
- `apps/api` request body parser enforces a `LORE_MAX_JSON_BYTES` cap (default 1
  MiB); oversized requests return 413.
- Postgres connection pool sets `statement_timeout: 15000` to bound query time.
- `LORE_REQUEST_TIMEOUT_MS` (default 30s) caps every request handler;
  timeouts return 504.

## Deployment Guidance

- Do not expose Lore remotely without configured `LORE_API_KEYS`.
- Prefer **role-separated** `reader` / `writer` / `admin` keys.
- **Always set** `DASHBOARD_BASIC_AUTH_USER` and `DASHBOARD_BASIC_AUTH_PASS` in
  production.
- **Generate keys with `openssl rand -hex 32`**. Never use the placeholder values
  shown in examples.
- Keep raw `agentmemory` endpoints private; access them only through Lore.
- Keep dashboard, governance, import/export, sync, and audit routes behind a
  network access-control layer (Cloudflare Access, AWS ALB, Tailscale ACL,
  similar) for any non-loopback exposure.
- **Run `node scripts/check-env.mjs` before starting the API in production.**
- **Never commit** production `.env` files, provider API keys, cloud credentials,
  eval data containing customer content, or private memory exports.

## Disclosure Timeline

For confirmed high-impact vulnerabilities:

- 0 days: report acknowledged.
- 7 days: triage and severity classification shared with reporter.
- 30 days: coordinated public disclosure (or extended by mutual agreement).
- 30+ days: CVE issuance for medium+ severity if applicable.

For lower-severity issues, expect resolution within the next minor release.

## Hardening Roadmap

Items planned for follow-up releases:

- **v0.5**: OpenAPI / Swagger spec; CI integration of `pnpm audit --high`,
  CodeQL static analysis, and dependabot.
- **v0.6**: Sigstore-signed container images, SLSA provenance, npm publish via
  GitHub OIDC instead of long-lived tokens.
- **v0.7**: At-rest encryption for `risk_tags`-flagged memory content via KMS
  envelope encryption.
