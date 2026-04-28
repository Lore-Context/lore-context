# Cherry Studio

Status: REST API and local stdio MCP launcher are available. Cherry Studio-specific packaging is still pending.

## Recommended Path

- Start with Lore REST for context assembly.
- Add MCP later only if Cherry Studio adopts a stable MCP client surface that benefits from the same small Lore tool set.

## Planned Setup Shape

- Use `POST /v1/context/query` as the default pre-prompt context step.
- Keep Lore write-back explicit through `POST /v1/memory/write`.
- Use `GET /v1/integrations/agentmemory/health` and `GET /v1/traces/:id` for operator visibility.

## Notes

- The product plan calls out Cherry Studio as an important ecosystem doc target, but does not define a bespoke protocol contract.
- This guide therefore stays API-first and aligned with the common Lore surface.
