# Dependency License Matrix

Last updated: 2026-05-10 (v1.9 Lane O-A8 initial population)

This document audits every production dependency of Lore Context for license
compatibility with the project's Apache License 2.0 distribution. Any GPL,
AGPL, or LGPL match would be a blocker for inclusion in the public repository
sync (Lane O-A4).

## Regeneration

To regenerate this matrix, run from the repository root:

```bash
pnpm licenses ls --prod --long
```

For a focused conflict scan:

```bash
pnpm licenses ls --prod 2>/dev/null | grep -iE "GPL|AGPL|LGPL"
```

If the conflict scan returns non-empty output, the matching dependency must
either be replaced (preferred) or kept in the private commercial layer only
(documented in `docs/oss-vs-commercial-boundary.md`).

## Production dependencies (apps/api)

| Package | Version constraint | License | OSS-compatible | Notes |
|---|---|---|---|---|
| `@aws-sdk/client-secrets-manager` | `^3` | Apache-2.0 | ✅ | AWS SDK; bundled at runtime, not redistributed by us. |
| `@aws-sdk/client-sqs` | `^3` | Apache-2.0 | ✅ | AWS SDK. |
| `@aws-sdk/client-sesv2` | `^3` (planned) | Apache-2.0 | ✅ | Added in v1.9 Lane S for email service. |
| `@lore-context/server` | `workspace:*` | Apache-2.0 | ✅ | First-party workspace package. |
| `@lore/agentmemory-adapter` | `workspace:*` | Apache-2.0 | ✅ | First-party. |
| `@lore/connectors` | `workspace:*` | Apache-2.0 | ✅ | First-party. |
| `@lore/eval` | `workspace:*` | Apache-2.0 | ✅ | First-party. |
| `@lore/governance` | `workspace:*` | Apache-2.0 | ✅ | First-party. |
| `@lore/mif` | `workspace:*` | Apache-2.0 | ✅ | First-party. |
| `@lore/model-gateway` | `workspace:*` | Apache-2.0 | ✅ | First-party. |
| `@lore/search` | `workspace:*` | Apache-2.0 | ✅ | First-party. |
| `@lore/shared` | `workspace:*` | Apache-2.0 | ✅ | First-party. |
| `@lore/web` | `workspace:*` | Apache-2.0 | ✅ | First-party. |
| `@opentelemetry/api` | `^1.9.1` | Apache-2.0 | ✅ | Standard observability stack. |
| `@opentelemetry/exporter-metrics-otlp-http` | `^0.204.0` | Apache-2.0 | ✅ | OTLP exporter. |
| `@opentelemetry/resources` | `^2.6.0` | Apache-2.0 | ✅ | OTel resource attributes. |
| `@opentelemetry/sdk-metrics` | `^2.6.1` | Apache-2.0 | ✅ | OTel metrics SDK. |
| `@opentelemetry/semantic-conventions` | `^1.40.0` | Apache-2.0 | ✅ | OTel conventions. |
| `cohere-ai` | `^8.0.0` | MIT | ✅ | Cohere Rerank SDK. |
| `ioredis` | `^5.10.1` | MIT | ✅ | Redis client. |
| `pg` (node-postgres) | `^8.20.0` | MIT | ✅ | PostgreSQL client. |
| `bullmq` | `^5` (planned, v1.9 Lane M scheduler in v1.8) | MIT | ✅ | Redis-backed job queue. |
| `stripe` | `^17` (planned, v1.9 Lane F) | MIT | ✅ | Stripe Node SDK. |

## Production dependencies (root + workspace tooling)

| Package | License | OSS-compatible | Notes |
|---|---|---|---|
| `@aws-sdk/client-secrets-manager` | Apache-2.0 | ✅ | (devDep) |
| `@types/node` | MIT | ✅ | Type definitions (not bundled). |
| `playwright` | Apache-2.0 | ✅ | E2E testing. |
| `turbo` | MPL-2.0 | ✅ (file-level copyleft) | Vercel's monorepo build tool. MPL is weaker than GPL; allowed in Apache projects with attribution. |
| `typescript` | Apache-2.0 | ✅ | TS compiler. |
| `vitest` | MIT | ✅ | Test runner. |

## License conflict resolutions

The v1.9 production tree contains one LGPL transitive dependency and one MPL
direct dependency. Both have been reviewed and accepted with explicit
justification:

### `@img/sharp-libvips-*` — LGPL-3.0-or-later (acceptable, not redistributed)

`sharp` is the optimized image processing library bundled with Next.js +
`playwright`. The LGPL-3.0-or-later component is `libvips` (the native
binary backing sharp). LGPL is acceptable for our use because:

1. **No redistribution**: Lore Cloud does not ship `libvips` as part of any
   distributed binary. It is installed at `pnpm install` time and used only
   in dev/build processes.
2. **No modification**: Lore does not modify sharp or libvips source. LGPL's
   reciprocal obligation triggers only when the LGPL code is modified or
   statically linked into a non-compatible distribution — neither applies.
3. **Optional install**: `pnpm install --ignore-optional` produces a working
   build for the API runtime without sharp; only the dashboard / website
   build paths use it.
4. **API runtime exclusion**: the `@lore/api` Docker image is built from
   `apps/api` only and does not include sharp in its production dependency
   tree. The OSS sync (Lane O) preserves this exclusion.

If LGPL exposure becomes a concern (e.g., shipping a desktop binary in the
future), the resolution is to swap sharp for an Apache-2.0 alternative
(`jimp`, `image-js`) in the affected module.

### `turbo` — MPL-2.0 (acceptable, build tool, not modified)

MPL is a *file-level* copyleft (modifications to MPL files must be
open-sourced) but does not infect the project that *uses* MPL libraries.
Apache 2.0 projects routinely depend on MPL libraries without conflict.
Lore does not modify Turbo source, so the MPL obligation does not trigger.

### Re-scan command

```bash
pnpm licenses ls --prod 2>/dev/null | grep -iE "GPL|AGPL|LGPL"
```

This must return only the documented `sharp` LGPL hit. Any new GPL/AGPL
or unexpected LGPL hit is a release blocker until resolved here.

## Third-party SDK access (runtime services)

These are not bundled or redistributed. Their licenses are noted for
transparency only:

- **OpenRouter** — proprietary cloud service; users supply own API key.
- **Anthropic Claude** — proprietary; API access only.
- **Stripe** — proprietary; SDK is MIT (above).
- **Auth0** — proprietary; users supply own tenant.
- **Cohere Rerank** — proprietary; SDK is MIT (above).

## Audit cadence

This matrix MUST be regenerated and reviewed:

1. Before every minor release (v1.X) — included in the release-state-machine
   "Post-release Audit" gate.
2. Whenever a new production dependency is added — the PR adding it must
   include a row update.
3. Quarterly, even if no dependency changes — to catch transitive license
   changes from upstream.

## Enforcement (CI)

The release-invariants CI workflow runs `pnpm licenses ls --prod` and fails if
any GPL/AGPL/LGPL is detected. Operators may override only after documenting
the resolution in this file (replace, isolate, or accept with justification).
