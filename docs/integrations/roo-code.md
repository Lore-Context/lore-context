# Roo Code

Status: REST API and local stdio MCP launcher are available. Roo Code-specific setup validation is still pending.

## Recommended Path

- Use the shared Lore MCP surface when Roo Code can act as an MCP client.
- Keep Lore as the context and governance layer above local memory storage.

## Planned Setup Shape

- Register Lore as an MCP server with a narrow allowlist.
- Start with `context_query`, `memory_search`, and `trace_get`.
- Add `memory_write` and `memory_forget` only when the agent workflow genuinely needs mutation.
- Prefer local `stdio`; use authenticated streamable HTTP only when a remote deployment is required.

## Notes

- Roo Code is listed alongside the core agent clients in the project architecture and setup pages.
- This makes it a better MCP fit than the API-first tools; the current repo now has a local stdio runtime entrypoint.
