# OpenAI Agents SDK Recipes

Use Lore as the memory/context source before the model call and retain durable decisions after the run.

## TypeScript

```ts
import { LoreContextApiClient } from "@lore-context/sdk";

const lore = new LoreContextApiClient({ token: process.env.LORE_API_KEY! });

export async function buildInstructions(userGoal: string) {
  const context = await lore.context.query({ query: userGoal, mode: "memory", tokenBudget: 2048 });
  return `Use this Lore context before acting:
${context.contextBlock ?? ""}`;
}
```

## Python

```python
from lore_context import LoreContextClient

lore = LoreContextClient(api_key=os.environ["LORE_API_KEY"])
context = lore.context.query(query=user_goal, mode="memory", token_budget=2048)
instructions = f"Use this Lore context before acting:
{context.context_block or ''}"
```

Retain only durable decisions, not raw secrets or private payloads.
