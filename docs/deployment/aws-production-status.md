# AWS Production Status

Last public-safe refresh: 2026-05-03 Asia/Jakarta

This public file records the release boundary for Lore's hosted private beta
runtime. It intentionally omits private AWS instance identifiers, SSM command
IDs, host paths, account identifiers, release artifact paths, and credential or
runbook details. Those details belong only in the closed cloud repository and
operator notes.

## Public-Safe Runtime Summary

| Surface | Public-safe state |
|---|---|
| Runtime region | AWS Singapore region |
| Management | AWS Systems Manager in closed operator workflow |
| Deployment shape | Docker Compose private beta runtime with API, Dashboard, and Postgres/pgvector |
| Public API health | `https://api.lorecontext.com/health` returns `ok`; `/openapi.json` is public for API discovery |
| Private data surfaces | Bearer/session/Cloudflare Access protected as applicable |
| Dashboard | `https://app.lorecontext.com/` supports invite/cap-controlled public-SaaS beta mode |
| Public release boundary | Public SaaS Beta Readiness, not stable GA |

## Current Public SaaS Cutover State

The dashboard public-mode cutover has been deployed and was verified from a
public client on 2026-05-03:

- `https://lorecontext.com/`, `https://www.lorecontext.com/`, and
  `https://app.lorecontext.com/` returned `200`.
- `https://api.lorecontext.com/health` returned `200` for service `lore-api`.
- `https://api.lorecontext.com/openapi.json` returned OpenAPI `3.1.0`.
- `https://app.lorecontext.com/api/lore/auth/google/start` returned `200` with
  a real Google authorization-code URL on the app domain.
- unauthenticated `https://api.lorecontext.com/v1/cloud/whoami` returned
  `401 cloud.token_required`, the correct protected-data response.

The production runtime is configured for the ordinary-user dashboard path:

- dashboard public mode enabled;
- admin proxy disabled for public browser traffic;
- Google OAuth callback routed through the app-domain dashboard proxy;
- public browser traffic does not receive an injected admin API key;
- ordinary-user root and Google auth routes are reachable without exposing
  internal operator paths.

Reachability is no longer the blocker. The remaining widening gate is the
`v1.0.0-rc.2` Public SaaS Beta Readiness closure: ordinary-user onboarding,
Memory Inbox liveness, two-client auto-capture, safety rails, activation
telemetry, backups, support, and public-safe documentation consistency. Public
access stays invite/cap controlled until those operational gates pass.

## Production Deployment Evidence Boundary

Closed operator evidence confirms the private beta runtime has passed deploy,
OAuth callback, Set-Cookie, container health, OpenAPI, and symlink/release
checks. Public documents should summarize those results without publishing:

- EC2 instance IDs;
- SSM command IDs;
- host release paths;
- private release artifact SHAs;
- private environment paths;
- account identifiers;
- credential-bearing runbooks.

Use this public file only as a release-status pointer. For real production
operations, use the closed `lore-cloud` repository and the private operator
notes for the current SSM command history, instance target, release artifact,
environment, rollback, and post-deploy evidence.

## Public SaaS Cutover Checklist

The dashboard public-mode flip, the API redirect URI, and the Cloudflare Access
policy must move in lockstep. Doing them out of order can cause the first
public sign-in to fail with an OAuth state mismatch or land on an unintended
Access challenge.

Pre-flight:

- Confirm Google OAuth credentials and a sufficiently long session secret are
  present in the private production environment.
- Confirm Google mock auth is disabled in production.
- Confirm the Google OAuth client allows the app-domain dashboard callback URI.

Lockstep flip:

1. Keep ordinary-user root and Google auth paths reachable while retaining
   protection for operator-only paths.
2. Keep the production dashboard in public-SaaS mode with admin proxy disabled.
3. Keep the Google redirect URI on the app-domain dashboard proxy callback.
4. Recreate only the necessary API/Dashboard services; keep durable Postgres
   data intact unless a migration explicitly requires otherwise.
5. Verify Google start, denied callback, OpenAPI version, API health, dashboard
   reachability, and a real test-user sign-in.

Rollback:

1. Restore the previous Access policy.
2. Disable public-SaaS dashboard mode and restore the prior redirect URI.
3. Recreate API/Dashboard services.
4. Confirm the dashboard has returned to the prior protected state.

The cutover is reversible when these controls are kept together. Treat any
production deploy or widening action as operator-controlled and evidence-backed.
