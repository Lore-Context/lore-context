# @lore-context/sdk-middleware

SDK middleware for Lore Context — wraps OpenAI / Anthropic / OpenRouter SDK clients to auto-inject memory pre-LLM-call and auto-retain post-LLM-call without requiring the AI to call an MCP tool. Current package version: `0.1.0`.

## Install

```bash
pnpm add @lore-context/sdk-middleware @lore-context/sdk openai
```

## Quick start

```typescript
import OpenAI from "openai";
import { LoreContextApiClient } from "@lore-context/sdk";
import { withMemoryHooks } from "@lore-context/sdk-middleware";

const lore = new LoreContextApiClient({
  token: process.env.LORE_AUTH_TOKEN!,
  loreApiKey: process.env.LORE_API_KEY ?? "",
  loreCsrf: process.env.LORE_CSRF ?? "",
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = withMemoryHooks(openai, lore, { mode: "hybrid" });

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What was that Postgres dump command?" }],
});
```

## Modes

| Mode | inject | retain | tools exposed |
|---|---|---|---|
| `hybrid` (default) | ✅ | ✅ | ✅ |
| `context` | ✅ | ✅ | ❌ |
| `tools` | ❌ | ❌ | ✅ |

See `docs/sdk/middleware-modes.md` in the lore-cloud repo for full mode semantics.

## Framework fallback recipes

For OpenAI Agents SDK, LangChain/LangGraph, REST/cURL, OpenTelemetry, and long-tail language fallback patterns, see `docs/sdk/framework-fallback-recipes.md` in this repository. These are docs-only recipes and do not add a new provider middleware implementation.

## License

MIT — see `LICENSE`.
