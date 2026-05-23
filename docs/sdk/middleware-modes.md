# SDK Middleware Modes

The middleware ships three modes — `hybrid`, `context`, `tools` — that change how much agency the AI keeps over memory operations.

| Mode | pre_llm_call inject | post_llm_call retain | Lore MCP tools exposed to model |
|---|---|---|---|
| `hybrid` (default) | ✅ | ✅ | ✅ |
| `context` | ✅ | ✅ | ❌ |
| `tools` | ❌ | ❌ | ✅ |

> **"Tools exposed to model"** is controlled by the MCP server, not the SDK middleware. Setting `mode: "context"` on the middleware does NOT, by itself, hide tools — your MCP client / server configuration must also drop them from the `tools/list` advertised to the model.
>
> The middleware's job in each mode is purely the inject/retain wiring described in the table above.

## When to use which

### `hybrid` — the default
Pick this when you want **maximum recall** and **maximum AI agency**. The middleware auto-injects relevant memory on every turn, AND the AI sees Lore's MCP tools (`memory.search`, `memory.create`, etc.) so it can call them when auto-inject isn't enough.

Pays a small token overhead for tool definitions. Recommended for agents in production.

### `context` — fully automatic
Pick this when you want **all the memory magic to happen invisibly**. Auto-inject + auto-retain are on, but the AI doesn't see any memory tools — to the model, your assistant just happens to remember things. Useful when:
- You're shipping a consumer-facing assistant where exposing tool calls would be noisy
- You want a deterministic prompt structure and don't want the AI choosing when to recall

### `tools` — legacy / explicit
Equivalent to v2.0.2 behavior. The middleware adds **nothing** beyond passing through your LLM calls; the AI must explicitly call `memory.search` / `memory.create` etc. to interact with Lore. Pick this for migration or when auto-recall pollutes context for your workload.

In `tools` mode the AI **can still call** `memory.write` etc. — automatic retention is off, but AI-initiated retention is on.

## Token budget per mode

Token budget for inject is capped per subscription tier (see Lane X in plan):

| Tier | default `recallMaxTokens` | hard max |
|---|---|---|
| Free | 512 | 512 |
| Go | 1024 | 1024 |
| Plus | 4096 | 4096 |
| Pro | 8192 | 8192 |

If `mode: "tools"` is set, this budget is irrelevant (no inject). For other modes, your supplied `recallMaxTokens` is capped server-side; the middleware emits a one-time warning if you exceeded the cap.

## Copy-pasteable example: switching modes at runtime

```typescript
const baseClient = new OpenAI();
const lore = new LoreContextApiClient({ token: KEY });

const everyTurn = withMemoryHooks(baseClient, lore, { mode: "hybrid" });
const automaticOnly = withMemoryHooks(baseClient, lore, { mode: "context" });
const legacy = withMemoryHooks(baseClient, lore, { mode: "tools" });
```

You can wrap the same underlying client three different ways. The wrapping is non-mutating; the original `baseClient` is unchanged.
