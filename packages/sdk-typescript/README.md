# @lore-context/sdk

Generated TypeScript SDK for the Lore Context API.

## Install

```bash
pnpm add @lore-context/sdk
```

## Quick start

```typescript
import { LoreContextApiClient } from "@lore-context/sdk";

const lore = new LoreContextApiClient({
  token: process.env.LORE_AUTH_TOKEN!,
  loreApiKey: process.env.LORE_API_KEY ?? "",
  loreCsrf: process.env.LORE_CSRF ?? "",
});

const health = await lore.getHealth();
console.log(health.status);
```

## Notes

- `token` is sent as `Authorization: Bearer <token>`.
- `loreApiKey` and `loreCsrf` mirror the generated API header surface. Use empty strings only for endpoints/environments that do not require those headers.
- For middleware around OpenAI/Anthropic calls, use `@lore-context/sdk-middleware` with this package.
