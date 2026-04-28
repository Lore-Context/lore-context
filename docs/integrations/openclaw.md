# OpenClaw

Status: REST API and local stdio MCP launcher are available. The repo does not yet include the OpenClaw migration flow.

## Recommended Path

- Use Lore as the shared context layer above local memory storage.
- Avoid building a bespoke OpenClaw-only memory plugin.

## Planned Setup Shape

- If OpenClaw is used as an MCP client, connect it to the same small Lore MCP surface as Qwen Code, Claude Code, and Cursor.
- If OpenClaw needs file-based portability, import `MEMORY.md` into Lore through the planned MIF-like pipeline.
- Keep mutating tools gated and audited.

## Lore Usage Pattern

- `context_query` should remain the main read path.
- `memory_search` is for direct inspection.
- `memory_write` and `memory_forget` should be reserved for explicit user-approved changes.

## Notes

- The product plan explicitly says OpenClaw memory plugins are not the first entry point.
- This doc therefore positions OpenClaw as a compatibility target, not as a custom Lore runtime.
