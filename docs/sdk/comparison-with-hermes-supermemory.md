# Lore Middleware vs Hermes-Hindsight / Supermemory / mem0 / Zep / Letta

Snapshot: 2026-05-13. URLs in this page were retrieved on that date; consult upstream repos for current state.

## Feature matrix

| Capability | mem0[^1] | Zep[^2] | Letta[^3] | Hermes-Hindsight[^4] | Supermemory plugin[^5] | Lore v2.0.2 | **Lore v2.0.3** |
|---|---|---|---|---|---|---|---|
| MCP tool exposure | ✅ | ✅ | n/a | ✅ | n/a | ✅ | ✅ |
| MCP `instructions` injection at session start | ❌ | ❌ | n/a | n/a | n/a | ✅ (Lane H) | ✅ inherited |
| SDK middleware: `pre_llm_call` auto-recall | ❌ | ❌ | ✅ self | ✅ | ✅ (plugin) | ❌ | **✅ Lane S/T** |
| SDK middleware: `post_llm_call` auto-retain | ❌ | ❌ | ✅ self | ✅ | ✅ (plugin) | ❌ | **✅ Lane S/T** |
| 3-mode operation (hybrid/context/tools) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | **✅ Lane S/T** |
| `memory.suggest` for non-middleware hosts | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ Lane U** |
| Verbatim preservation rules in capture | ❌ | ❌ | n/a | ❌ | n/a | ❌ | **✅ Lane W** |
| Tier-aware injection budgets | ❌ | ❌ | n/a | ❌ | n/a | ❌ | **✅ Lane X** |
| Works with ANY OpenAI-compatible client | ❌ Chrome ext only | ❌ | n/a | ❌ Hermes-only | ❌ Claude Code only | n/a | **✅ Lane S/T** |
| Python + TS parity | ✅ | ✅ | n/a | n/a (Hermes-only) | n/a | n/a | **✅ Lane S+T** |
| Open-source | ✅ | ✅ | ✅ | ✅ | partial | ✅ | ✅ |
| Hosted offering | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ Lore Cloud | ✅ Lore Cloud |

[^1]: https://github.com/mem0ai/mem0 — Python-first; no SDK-level wrapping middleware as of 2026-05-13.
[^2]: https://www.getzep.com/ — Python + TS clients; relies on explicit API calls / "knowledge graph add" rather than SDK wrapping.
[^3]: https://github.com/letta-ai/letta — Agent framework with self-managed memory; not a drop-in SDK middleware for OpenAI/Anthropic.
[^4]: https://hindsight.vectorize.io/sdks/integrations/hermes — Reference architecture for `pre_llm_call`/`post_llm_call` hooks; locked to Hermes Agent.
[^5]: https://supermemory.ai/docs/integrations/claude-code — Claude Code plugin only; auto-capture is plugin-level, not SDK-level.

## Why this matters

Hermes-Hindsight pioneered the pre/post LLM-call hook pattern but ships only as part of Hermes Agent (closed ecosystem). Supermemory generalized the same pattern but bound it to Claude Code's plugin surface. mem0 / Zep / Letta solve adjacent problems (vector store, knowledge graph) but don't ship an SDK wrapper.

**Lore v2.0.3 ships the most complete SDK-middleware layer in the agent-memory space**: works with any OpenAI-compatible SDK or Anthropic SDK, in any host, in any process. Plus `memory.suggest` (Lane U) gives non-middleware hosts (closed-source agents that can't pre-process LLM payloads) a one-call recommendation surface.

## What we don't claim parity on

- **Letta's actor / role memory model**: out of scope. Lore is iCloud-like (one account = one person).
- **mem0's "MemoryClient.add(messages, user_id, run_id)" abstraction**: Lore uses a single vault model — multi-user is not a v2.0.3 concern.
- **Zep's session graph projection**: Lore's butler does graph-style projection separately; not part of the SDK-middleware path.

## Migration paths

| From | Recommended Lore middleware mode | Notes |
|---|---|---|
| Hermes-Hindsight `hybrid` | Lore `hybrid` | Direct semantic match; 3-line wrap change |
| Hermes-Hindsight `context` | Lore `context` | Same |
| Hermes-Hindsight `tools` | Lore `tools` | Same |
| Supermemory plugin | Lore `hybrid` (SDK side) | Removes Claude Code dependency |
| mem0 explicit `memory.add()` | Lore `hybrid` (SDK side) | Drop the `memory.add()` calls; auto-retain handles it |
| Zep explicit calls | Lore `hybrid` (SDK side) | Same |

## Open questions for adopters

- **Do you need credential or PII redaction at the SDK middleware layer?** v2.0.3 ships **without** SDK-level redaction (deferred to v2.1 per critic-review of PR #209). If your workload pastes credentials into LLM conversations, set `mode: "tools"` on the middleware until v2.1 lands — auto-retain is OFF in tools mode. Server-side `/v1/memory/write` retains existing v1.x governance redaction, but that runs after bytes leave the client.
- **Do you need async OpenAI SDK?** v2.0.3 ships sync wrappers only on Python. Async is v2.1.
- **Do you need OpenAI Responses API?** Same answer: v2.1.

Source documents persisted at `docs/research/competitor-snapshots-2026-05-13/`.
