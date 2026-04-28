# Lore Context Website

Standalone static implementation of the Lore Context marketing website.

## Commands

```bash
pnpm --filter @lore/website build
pnpm --filter @lore/website test
pnpm --filter @lore/website dev -- --port 4174
```

Build output is written to `apps/website/dist`.

## Design Source

The design handoff is saved at:

```text
docs/website/lore-context-website-design.md
```

The site intentionally avoids external runtime dependencies so it can be hosted
on Cloudflare Pages, S3/CloudFront, or any static server.
