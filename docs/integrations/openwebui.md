# OpenWebUI

Status: REST API and local stdio MCP launcher are available. Lore REST endpoints for context, memory, governance, traces, events and eval are available in the local API. API key RBAC and optional Postgres storage are implemented.

## Recommended Path

- Start with Lore REST and keep OpenWebUI as the user-facing chat or orchestration layer.
- Do not expose raw `agentmemory` endpoints or viewer pages through OpenWebUI.

## Planned Setup Shape

- Use `POST /v1/context/query` to fetch agent-ready context before model invocation.
- Use `POST /v1/memory/write` for explicit write-back flows.
- Use `GET /v1/traces/:id` to inspect why Lore returned a given context block.
- If OpenWebUI later adopts MCP cleanly, reuse the same small Lore MCP tool surface rather than adding a separate backend.

## Notes

- The product plan lists OpenWebUI in the ecosystem docs set, but not in the first-wave MCP client diagram.
- This guide therefore keeps OpenWebUI API-first.
