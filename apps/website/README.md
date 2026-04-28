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

## Supported Locales

`en`, `ko`, `ja`, `zh-hans`, `zh-hant`, `vi`, `es`, `pt`, `ru`, `tr`, `de`,
`fr`, `it`, `el`, `pl`, `uk`, and `id`.
