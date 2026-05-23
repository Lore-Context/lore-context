# Lore Context Website

Standalone static implementation of the Lore Context marketing website. The
production site is generated from `src/site.mjs` so locale routes, legal pages,
SEO files, and the homepage are reproducible from tracked source.

## Commands

```bash
pnpm --filter @lore/website build
pnpm --filter @lore/website smoke
pnpm --filter @lore/website test
pnpm --filter @lore/website dev -- --port 4174
```

Build output is written to `apps/website/dist`.

The site intentionally avoids external runtime dependencies and remote assets so
it can be hosted on Cloudflare Pages, S3/CloudFront, or any static server.

## v2.0.8 Production Website Contract

v2.0.8 keeps the current static generator instead of migrating to Fumadocs or
Unmint during the release. The immediate goal is a production-grade marketing
and developer trust surface: clickable CTAs, pricing, docs, API/MCP examples,
status boundaries, and a verifier that catches broken links and unsafe claims.

- Button contract: `docs/website/v2.0.8-button-contract.md`
- Framework decision: `docs/website/v2.0.8-framework-decision.md`
- Primary verification: `node apps/website/scripts/verify.mjs`

Fumadocs/Unmint remain a v2.0.9 docs spike candidate only after the static
surface reaches parity and the verifier covers the generated route map.

## Supported Locales

`en`, `ko`, `ja`, `zh-hans`, `zh-hant`, `vi`, `es`, `pt`, `ru`, `tr`, `de`,
`fr`, `it`, `el`, `pl`, `uk`, and `id`.
