# SDK Middleware Quickstart

> 10-minute getting-started guide for `@lore-context/sdk-middleware` (TypeScript) and `lore-context-middleware` (Python).
> Version: 0.1.0 (stable).

## What it does

The SDK middleware wraps your existing OpenAI / Anthropic SDK client so that **every LLM call** auto-injects relevant memories into the prompt and auto-retains the conversation turn — without your AI needing to call an MCP tool.

```
your code → withMemoryHooks(client) → openai.chat.completions.create({...})
                  │
                  ├─ pre_llm_call:  contextQuery(query) → inject as system msg
                  ├─ underlying SDK call
                  └─ post_llm_call: memoryWrite({user, assistant}) (fire-and-forget)
```

## Install

### TypeScript
```bash
pnpm add @lore-context/sdk-middleware @lore-context/sdk openai
# or anthropic instead of openai
```

### Python
```bash
pip install lore-context-middleware lore-context openai
# or anthropic instead of openai
```

## OpenAI hello-world

### TypeScript
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
console.log(response.choices[0].message.content);
```

### Python
```python
import os
from openai import OpenAI
from lore_context import LoreContextClient
from lore_context_middleware import with_memory_hooks

lore = LoreContextClient(
    token=os.environ.get("LORE_AUTH_TOKEN"),
    lore_api_key=os.environ["LORE_API_KEY"],
    lore_csrf=os.environ.get("LORE_CSRF", ""),
)
client = with_memory_hooks(OpenAI(api_key=os.environ["OPENAI_API_KEY"]), lore, mode="hybrid")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What was that Postgres dump command?"}],
)
print(response.choices[0].message.content)
```

## Anthropic hello-world

### TypeScript
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { LoreContextApiClient } from "@lore-context/sdk";
import { withMemoryHooks } from "@lore-context/sdk-middleware";

const lore = new LoreContextApiClient({
  token: process.env.LORE_AUTH_TOKEN!,
  loreApiKey: process.env.LORE_API_KEY ?? "",
  loreCsrf: process.env.LORE_CSRF ?? "",
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const client = withMemoryHooks(anthropic, lore, { mode: "hybrid" });

const response = await client.messages.create({
  model: "claude-3-5-sonnet-latest",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Pick up where we left off." }],
});
```

### Python
```python
import os
from anthropic import Anthropic
from lore_context import LoreContextClient
from lore_context_middleware import with_memory_hooks

lore = LoreContextClient(
    token=os.environ.get("LORE_AUTH_TOKEN"),
    lore_api_key=os.environ["LORE_API_KEY"],
    lore_csrf=os.environ.get("LORE_CSRF", ""),
)
client = with_memory_hooks(Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"]), lore, mode="hybrid")

response = client.messages.create(
    model="claude-3-5-sonnet-latest",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Pick up where we left off."}],
)
```

## What just happened

For every call:

1. The middleware extracted the latest user message
2. Called `lore.contextQuery({ query: "...", mode: "memory", token_budget: 4096 })`
3. Took the returned `contextBlock` and:
   - For OpenAI: prepended (or appended to existing) a `role: "system"` message
   - For Anthropic: set / appended to the `system` parameter
4. Called the underlying SDK with the modified payload
5. After the response, fired `lore.memoryWrite({ content: {user, assistant}, idempotency_key: "<uuid>" })` so the turn is captured

If Lore is unreachable, inject is **silently skipped** after a 2s timeout. Your LLM call always proceeds.

## Cost overhead

Per turn, in `hybrid` mode on a Plus-tier API key, expect:

- ~$0.0006 typical (inject hits canonical_index fast-path; retain batched)
- ~$0.003 worst case (cold canonical_index; full graph extract on retain)

See `docs/sdk/middleware-bench-baseline.md` for numbers measured against the v2.0.2 baseline.

## Next steps

- [middleware-modes.md](./middleware-modes.md) — Hybrid vs Context vs Tools
- [middleware-faq.md](./middleware-faq.md) — token-budget overruns, retention loops, streaming
- [migration-from-v2.0.2.md](./migration-from-v2.0.2.md) — typically a 3-line change
- [comparison-with-hermes-supermemory.md](./comparison-with-hermes-supermemory.md) — feature matrix vs alternatives
