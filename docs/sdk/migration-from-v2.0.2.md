# Migration from v2.0.2 to v2.0.3 (SDK Middleware)

> **TL;DR**: A 3-line change. Wrap your existing OpenAI / Anthropic client with `withMemoryHooks` and your code now auto-recalls + auto-retains on every turn.

## What changed in v2.0.3

- v2.0.2 shipped MCP-level instructions injection (Lane H) — memories are pre-loaded once at session start.
- v2.0.3 ships SDK-level middleware — memories are queried + injected on **every LLM turn**, and conversation turns are captured automatically.

Both layers compose: v2.0.2 boots your assistant with canonical context, v2.0.3 keeps that context fresh per turn.

## TypeScript: before / after

### Before (v2.0.2)
```typescript
import OpenAI from "openai";
import { LoreContextApiClient } from "@lore-context/sdk";

const lore = new LoreContextApiClient({ token: process.env.LORE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What's that command again?" }],
});
```

### After (v2.0.3)
```typescript
import OpenAI from "openai";
import { LoreContextApiClient } from "@lore-context/sdk";
import { withMemoryHooks } from "@lore-context/sdk-middleware";   // (1) NEW

const lore = new LoreContextApiClient({ token: process.env.LORE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = withMemoryHooks(openai, lore, { mode: "hybrid" }); // (2) NEW

const response = await client.chat.completions.create({           // (3) `client` ↔ `openai`
  model: "gpt-4o",
  messages: [{ role: "user", content: "What's that command again?" }],
});
```

Three lines: import, wrap, rename the reference. The rest of your code is untouched.

Expected output (with a vault containing prior backup-command context):
```
Use `pg_dump -Fc -f backup.dump dbname` — the same one we've been using in staging.
```

## Python: before / after

### Before
```python
from openai import OpenAI
from lore_context import LoreContextApiClient

lore = LoreContextApiClient(token=os.environ["LORE_API_KEY"])
openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

response = openai_client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's that command again?"}],
)
```

### After
```python
from openai import OpenAI
from lore_context import LoreContextApiClient
from lore_context_middleware import with_memory_hooks  # (1)

lore = LoreContextApiClient(token=os.environ["LORE_API_KEY"])
openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

client = with_memory_hooks(openai_client, lore, mode="hybrid")  # (2)

response = client.chat.completions.create(                       # (3)
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's that command again?"}],
)
```

## Common pitfalls

- **`isinstance(client, OpenAI)` returns False** after wrapping. If you have `isinstance` checks, do them on the inner client BEFORE wrapping. (Python wrapper-class design rationale: see plan §2 Lane T C3 fix.)
- **Double-wrapping throws.** Calling `withMemoryHooks` twice on the same client raises `LoreMiddlewareDoubleWrapError`. Wrap once at boot, share the result.
- **`recallMethod: "reflect"` does not exist yet.** v0.1.0 only supports `"facts"`. The `recallMethod` type union is narrowed to `"facts"` only; `"reflect"` lands in v2.1.
- **Tools mode is opt-in, not opt-out.** `mode: "tools"` disables auto-inject AND auto-retain. Most users want `"hybrid"` (the default).

## Rollback

If you need to undo the migration, just stop wrapping:

```typescript
- const client = withMemoryHooks(openai, lore, { mode: "hybrid" });
+ const client = openai;
```

No persistent state survives uninstalling the middleware. Captured memories remain in your vault (unchanged).
