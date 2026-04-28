# Security Policy

Lore Context handles memory, traces, audit logs, and integration credentials. Treat
security reports as high priority.

## Reporting A Vulnerability

Do not open a public issue for suspected vulnerabilities, leaked secrets, auth bypasses,
data exposure, or tenant isolation issues.

Preferred reporting path:

1. Use GitHub private vulnerability reporting for this repository when available.
2. If private reporting is unavailable, contact the maintainers privately and include:
   - affected version or commit,
   - reproduction steps,
   - expected impact,
   - whether any real secrets or personal data are involved.

We aim to acknowledge credible reports within 72 hours.

## Supported Versions

Lore Context is currently pre-1.0 alpha software. Security fixes target the `main`
branch first. Tagged releases may receive targeted patches when a public release is
actively used by downstream operators.

## Deployment Guidance

- Do not expose Lore remotely without `LORE_API_KEY` or `LORE_API_KEYS`.
- Prefer role-separated `reader`, `writer`, and `admin` keys.
- Keep raw `agentmemory` endpoints private.
- Keep dashboard, governance, import/export, sync, and audit routes behind an access
  control layer for remote deployments.
- Never commit production `.env` files, provider API keys, cloud credentials, eval data
  containing customer content, or private memory exports.
