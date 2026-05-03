# Private Deployment

> **Generate keys with `openssl rand -hex 32` — never use the placeholders below in production.**

## Current Public Alpha Status

`v0.6.0-alpha` is published and the public API health endpoint is live at
`https://api.lorecontext.com/health`. This public document intentionally does
not record private AWS instance IDs, SSM command IDs, account identifiers, or
secret-bearing runbook details. Those belong in the private cloud repository and
internal operator notes.

Post-release documentation and distribution commits can be newer than the
deployed private-demo API application source when runtime code did not change.
Verify AWS production with SSM plus the public health endpoint before claiming a
new runtime deployment.

For the public-safe release snapshot, see
[release-status.md](../release-status.md).

This slice packages Lore for a private demo or internal team rollout without changing the application code paths. The deployment bundle consists of:

- `apps/api/Dockerfile`: REST API image.
- `apps/dashboard/Dockerfile`: standalone Next.js dashboard image.
- `Dockerfile`: optional MCP launcher image for stdio clients.
- `docs/deployment/compose.private-demo.yml`: copy-paste compose stack for Postgres, API, dashboard, and an on-demand MCP service.
- `examples/demo-dataset/**`: seed data for file-store, import, and eval flows.

## Recommended Topology

- `postgres`: durable store for shared or multi-operator demos.
- `api`: Lore REST API on an internal bridge network, published to loopback by default.
- `dashboard`: user-facing SaaS dashboard or protected operator UI, published to loopback by default and proxying to the API through `LORE_API_URL`.
- `mcp`: optional stdio container for Claude, Cursor, and Qwen operators who want a containerized launcher instead of `node apps/mcp-server/dist/index.js` on the host.

The compose stack intentionally keeps public exposure narrow. Postgres, API, and dashboard all bind to `127.0.0.1` by default through variableized port mappings.

## Preflight

1. Copy `.env.example` to a private runtime file such as `.env.private`.
2. Replace `POSTGRES_PASSWORD`.
3. Prefer `LORE_API_KEYS` over a single `LORE_API_KEY`.
4. For public SaaS mode, set Google OAuth vars and use a dashboard redirect URI such as `https://app.lorecontext.com/api/lore/auth/google/callback`.
5. Set `LORE_DASHBOARD_PUBLIC_SAAS=1` for the ordinary-user dashboard. In this mode the dashboard uses Lore session cookies and CSRF, not Basic Auth, and does not inject the admin API key into browser traffic.
6. For an internal operator dashboard, leave `LORE_DASHBOARD_PUBLIC_SAAS=0`, set `DASHBOARD_BASIC_AUTH_USER` and `DASHBOARD_BASIC_AUTH_PASS`, and set `LORE_DASHBOARD_ADMIN_PROXY=1` only when the dashboard must proxy admin API calls.
7. Set `MCP_LORE_API_KEY` to a `writer` or `reader` key depending on whether the client should mutate memory.

Example role separation:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_OAUTH_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>
GOOGLE_REDIRECT_URI=https://app.lorecontext.com/api/lore/auth/google/callback
SESSION_SECRET=<YOUR_32_BYTE_RANDOM_SECRET>
LORE_DASHBOARD_PUBLIC_SAAS=1
LORE_DASHBOARD_ADMIN_PROXY=0
DASHBOARD_LORE_API_KEY=
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
DASHBOARD_BASIC_AUTH_USER=
DASHBOARD_BASIC_AUTH_PASS=
```

## Start The Stack

Build and start the private demo stack from the repo root:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Health checks:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl -u "${DASHBOARD_BASIC_AUTH_USER}:${DASHBOARD_BASIC_AUTH_PASS}" \
  http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Seed Demo Data

For the Postgres-backed compose stack, import the packaged demo memories after the API is healthy:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Run the packaged eval request:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

If you want a zero-database single-host demo instead, point the API at the file-store snapshot:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## MCP Launcher Patterns

Preferred pattern:

- Run the MCP launcher close to the client.
- Point `LORE_API_URL` to the private API URL.
- Provide the smallest suitable API key to the launcher.

Host-based launcher:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Containerized launcher:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

The containerized launcher is useful for reproducible workstation setup, but it is still a stdio process, not a long-running public network service.

## Security Defaults

- Keep `API_BIND_HOST`, `DASHBOARD_BIND_HOST`, and `POSTGRES_BIND_HOST` on `127.0.0.1` unless an authenticated reverse proxy is already in front of the stack.
- Prefer `LORE_API_KEYS` with `reader` / `writer` / `admin` separation instead of reusing a single global admin key everywhere.
- Keep `LORE_DASHBOARD_ADMIN_PROXY=0` for public SaaS. Admin key injection is an internal-operator escape hatch, not a user onboarding path.
- Require `x-lore-csrf` for session-backed token issuance from the dashboard.
- Use project-scoped keys for demo clients. The packaged demo project id is `demo-private`.
- Keep `AGENTMEMORY_URL` on loopback and do not expose raw `agentmemory` directly.
- Leave `LORE_AGENTMEMORY_REQUIRED=0` unless the private deployment really depends on a live agentmemory runtime.
- Keep `LORE_POSTGRES_AUTO_SCHEMA=true` only for controlled internal environments. Once schema bootstrapping is part of your release process, you can pin it to `false`.

## v0.6 Private Alpha Direction

The `v0.6.0-alpha` public release remains local/private-deployment focused. Hosted
multi-tenant cloud sync is not part of this release.

Use the v0.6 public release to validate private alpha readiness before adding
cloud-only features:

```bash
pnpm quickstart -- --dry-run --activation-report
pnpm openapi:check
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
```

After a real `context.query`, inspect `GET /v1/evidence/ledger/:trace_id` or the
Dashboard Recent Traces evidence summary before exposing the workflow to a design
partner.

Private alpha work belongs outside the public open-core release and should focus on:

- tenant model: organization, project, user, API key scope;
- auth boundary: dashboard access, API-key lifecycle, admin invite policy;
- Cloudflare Access + AWS single-host Compose runbook;
- backup and restore drill for Postgres-backed deployments;
- basic health checks, structured logs, and alert checklist;
- customer data policy for memories, traces, eval datasets, support access, and deletion.

Do not add billing, self-serve signup, enterprise SSO, or public hosted dashboard
until design partners have validated the private alpha workflow.

## Files To Reuse

- Compose sample: [compose.private-demo.yml](compose.private-demo.yml)
- API image: [apps/api/Dockerfile](../../apps/api/Dockerfile)
- Dashboard image: [apps/dashboard/Dockerfile](../../apps/dashboard/Dockerfile)
- MCP image: [Dockerfile](../../Dockerfile)
- Demo data: [examples/demo-dataset/README.md](../../examples/demo-dataset/README.md)
