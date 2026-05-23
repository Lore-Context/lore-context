<!-- markdownlint-disable MD013 MD060 -->

# Framework integration recipes

These recipes show how to integrate Lore when a first-party framework adapter is
not the right fit yet. Prefer the stable TypeScript/Python API SDKs or SDK
middleware when your runtime supports them; use REST/cURL for long-tail
languages until a first-party SDK is justified by demand.

## OpenAI Agents SDK

Use Lore middleware around the underlying OpenAI client when your agent runtime
allows you to provide a configured client. The middleware injects context before
model calls and retains the turn after model calls.

### TypeScript

```typescript
import OpenAI from "openai";
import { LoreContextApiClient } from "@lore-context/sdk";
import { withMemoryHooks } from "@lore-context/sdk-middleware";

const lore = new LoreContextApiClient({ token: process.env.LORE_API_KEY! });
const openai = withMemoryHooks(
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  lore,
  { mode: "hybrid", retain: { source: "openai-agents" } },
);

// Pass `openai` to the agent runtime as its OpenAI-compatible client.
```

### Python

```python
import os
from openai import OpenAI
from lore_context import LoreContextApiClient
from lore_context_middleware import with_memory_hooks

lore = LoreContextApiClient(token=os.environ["LORE_API_KEY"])
openai = with_memory_hooks(
    OpenAI(api_key=os.environ["OPENAI_API_KEY"]),
    lore,
    mode="hybrid",
    retain={"source": "openai-agents"},
)

# Pass `openai` to the agent runtime as its OpenAI-compatible client.
```

## LangChain and LangGraph

For LangChain/LangGraph, keep Lore outside the graph state machine unless your
application explicitly wants memory operations as graph nodes. The safest default
is a pre-model context lookup and a post-model retain operation at the edge of
your chain/graph.

### TypeScript pattern

```typescript
import { LoreContextApiClient } from "@lore-context/sdk";

const lore = new LoreContextApiClient({ token: process.env.LORE_API_KEY! });

export async function addLoreContext(userMessage: string) {
  const context = await lore.context.query({
    query: userMessage,
    mode: "memory",
    token_budget: 2048,
  });

  return [
    { role: "system", content: context.context_block ?? "" },
    { role: "user", content: userMessage },
  ];
}

export async function retainLoreTurn(user: string, assistant: string) {
  await lore.memory.write({
    content: { user, assistant },
    idempotency_key: crypto.randomUUID(),
    metadata: { source: "langgraph" },
  });
}
```

### Python pattern

```python
import uuid
from lore_context import LoreContextApiClient

lore = LoreContextApiClient(token=os.environ["LORE_API_KEY"])

async def add_lore_context(user_message: str):
    context = await lore.context.query(
        query=user_message,
        mode="memory",
        token_budget=2048,
    )
    return [
        {"role": "system", "content": getattr(context, "context_block", "") or ""},
        {"role": "user", "content": user_message},
    ]

async def retain_lore_turn(user: str, assistant: str):
    await lore.memory.write(
        content={"user": user, "assistant": assistant},
        idempotency_key=str(uuid.uuid4()),
        metadata={"source": "langgraph"},
    )
```

## REST and cURL fallback

Use REST when your language does not have a first-party SDK yet or when you need
a minimal smoke test in CI.

```bash
curl -sS https://api.lorecontext.com/v1/context/query \
  -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"What did we decide about the SDK release?","mode":"memory","token_budget":2048}'
```

```bash
curl -sS https://api.lorecontext.com/v1/memory/write \
  -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":{"user":"ship SDK docs","assistant":"added the matrix"},"idempotency_key":"example-001"}'
```

## OpenTelemetry correlation

Lore does not require OpenTelemetry, but production services should preserve
trace correlation when calling Lore. Forward your active trace ID in metadata and
record the Lore request ID from the response headers in your span attributes.

Recommended attributes:

| Attribute | Value |
|---|---|
| `lore.operation` | `context.query`, `memory.write`, or `memory.search` |
| `lore.vault_id` | The current vault or tenant identifier, if safe to expose internally |
| `lore.project_id` | The current project identifier |
| `lore.request_id` | Response request ID returned by Lore |

## Long-tail SDK deferrals

| Runtime | v2.0.7 recommendation | First-party SDK trigger |
|---|---|---|
| Ruby / Rails | REST/cURL or local OpenAPI generation. | Active Rails customer or partner integration. |
| PHP / Laravel | REST/cURL or local OpenAPI generation. | Active Laravel customer or partner integration. |
| Rust | REST/cURL or local OpenAPI generation. | Privacy-first local binary or agent-runtime demand. |
| Swift / Kotlin mobile | Backend proxy only. | Mobile key-management and consent model approved. |
| Dart / Flutter | Backend proxy only. | Mobile key-management and consent model approved. |
