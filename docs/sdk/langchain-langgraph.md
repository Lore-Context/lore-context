# LangChain and LangGraph Recipes

Lore should sit at graph boundaries: retrieve context before the LLM node and write selected durable facts after human/tool confirmation.

## TypeScript boundary helper

```ts
import { LoreContextApiClient } from "@lore-context/sdk";

export async function loreContextForNode(lore: LoreContextApiClient, input: string) {
  const response = await lore.context.query({ query: input, mode: "hybrid", tokenBudget: 2048 });
  return response.contextBlock ?? "";
}
```

## Python boundary helper

```python
def lore_context_for_node(lore, user_input: str) -> str:
    response = lore.context.query(query=user_input, mode="hybrid", token_budget=2048)
    return getattr(response, "context_block", "") or ""
```

## Retention rule

Write after the graph reaches a stable decision. Avoid retaining every intermediate chain-of-thought, tool payload, or retry trace.
