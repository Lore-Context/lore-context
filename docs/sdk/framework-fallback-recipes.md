# Framework fallback recipes

These v2.0.7 recipes are docs-only integration patterns for teams that want
Lore memory in existing agent stacks without waiting for a dedicated framework
adapter package. They use the stable TypeScript/Python SDK middleware packages
or direct REST calls; they do not add new provider middleware implementation.

## OpenAI Agents SDK

Use Lore before the agent run to gather memory, then retain the completed turn
after the run. Keep the wrapper outside the agent tool list so the model does
not need to decide when to call Lore.

### TypeScript pattern

```typescript
import { Agent, run } from "@openai/agents";
import { LoreContextApiClient } from "@lore-context/sdk";

const lore = new LoreContextApiClient({
  loreApiKey: process.env.LORE_API_KEY!,
  loreCsrf: process.env.LORE_CSRF!,
});

const agent = new Agent({ name: "Support agent" });

export async function runWithLore(userMessage: string) {
  const context = await lore.contextQuery({
    query: userMessage,
    mode: "hybrid",
  });

  const result = await run(agent, [
    {
      role: "system",
      content: `Relevant Lore memories:\n${JSON.stringify(context.memories)}`,
    },
    { role: "user", content: userMessage },
  ]);

  await lore.writeMemory({
    content: `User: ${userMessage}\nAssistant: ${result.finalOutput}`,
    source: "openai-agents-sdk",
  });

  return result;
}
```

### Python pattern

```python
import os
from agents import Agent, Runner
from lore_context import LoreContextClient

lore = LoreContextClient(
    lore_api_key=os.environ["LORE_API_KEY"],
    lore_csrf=os.environ["LORE_CSRF"],
)
agent = Agent(name="Support agent")

async def run_with_lore(user_message: str):
    context = lore.context_query(query=user_message, mode="hybrid")
    result = await Runner.run(
        agent,
        input=(
            "Relevant Lore memories:\n"
            f"{context}\n\nUser: {user_message}"
        ),
    )
    lore.write_memory(
        content=f"User: {user_message}\nAssistant: {result.final_output}",
        source="openai-agents-sdk",
    )
    return result
```

## LangChain and LangGraph

For LangChain/LangGraph, treat Lore as graph boundary context:

1. Query Lore in a pre-model node/runnable.
2. Inject returned memories as a system or state field.
3. Run the model/graph.
4. Retain the final user/assistant turn in a post-model node.

### LangChain TypeScript runnable

```typescript
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { LoreContextApiClient } from "@lore-context/sdk";

const lore = new LoreContextApiClient({
  loreApiKey: process.env.LORE_API_KEY!,
  loreCsrf: process.env.LORE_CSRF!,
});

const withLore = RunnableLambda.from(async (input: { question: string }) => {
  const context = await lore.contextQuery({ query: input.question });
  return { ...input, loreContext: context };
});

export const chain = RunnableSequence.from([
  withLore,
  async (state) => ({
    messages: [
      ["system", `Lore context: ${JSON.stringify(state.loreContext)}`],
      ["human", state.question],
    ],
  }),
]);
```

### LangGraph state node

```python
from typing import TypedDict
from lore_context import LoreContextClient

class GraphState(TypedDict):
    question: str
    lore_context: dict

lore = LoreContextClient(lore_api_key="...", lore_csrf="...")

def load_lore_context(state: GraphState) -> GraphState:
    return {
        **state,
        "lore_context": lore.context_query(query=state["question"]),
    }
```

## OpenTelemetry fallback

If a host already emits OpenTelemetry spans but cannot use SDK middleware, add
Lore identifiers as span attributes and use a small sidecar job to retain only
approved spans.

Recommended attributes:

- `lore.vault_id`
- `lore.project_id`
- `lore.trace_id`
- `lore.memory_retention` with values `off`, `candidate`, or `approved`

Do not put raw prompts, secrets, or full model responses in span attributes.
Store those in Lore only after the same redaction and consent policy used by
your normal memory-write path.

## REST and cURL fallback

Any language can integrate with Lore over HTTPS while waiting for a first-party
SDK. Keep credentials in environment variables and send writes only from trusted
server-side code.

```bash
curl -sS "$LORE_API_URL/v1/context/query" \
  -H "authorization: Bearer $LORE_TOKEN" \
  -H "x-lore-api-key: $LORE_API_KEY" \
  -H "x-lore-csrf: $LORE_CSRF" \
  -H "content-type: application/json" \
  --data '{"query":"What should this agent remember?","mode":"hybrid"}'
```

```bash
curl -sS "$LORE_API_URL/v1/memory/write" \
  -H "authorization: Bearer $LORE_TOKEN" \
  -H "x-lore-api-key: $LORE_API_KEY" \
  -H "x-lore-csrf: $LORE_CSRF" \
  -H "content-type: application/json" \
  --data '{"content":"User prefers Singapore time in reports","source":"rest"}'
```

## Long-tail SDK deferrals

| Language / platform | v2.0.7 status | Recommended fallback |
|---|---|---|
| Ruby / Rails | Deferred | Use REST/cURL from server-side jobs. |
| PHP / Laravel | Deferred | Use REST/cURL from queue workers or controllers. |
| Rust | Deferred | Use REST through `reqwest`; avoid local secret storage changes. |
| Swift / iOS | Deferred | Use a backend proxy; do not store Lore write keys on device. |
| Kotlin mobile | Deferred | Use a backend proxy; JVM server work is covered by Java SDK. |
| Dart / Flutter | Deferred | Use a backend proxy until mobile consent/key design exists. |

These deferrals are product decisions, not missing runtime capability. The REST
API remains the compatibility surface until demand justifies maintained SDKs.
