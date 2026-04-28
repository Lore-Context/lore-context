# FastGPT

Status: REST API and local stdio MCP launcher are available. Lore REST endpoints for context, memory, governance, traces, events and eval are available in the local API. API key RBAC and optional Postgres storage are implemented.

## Recommended Path

- Integrate FastGPT through Lore REST first.
- Use Lore for context assembly and governance instead of binding FastGPT directly to raw `agentmemory`.

## Planned Setup Shape

- Call `POST /v1/context/query` before a FastGPT prompt or tool stage that needs remembered context.
- Use `POST /v1/memory/search` for operator-facing inspection tools.
- Use `POST /v1/memory/write` only for explicit write-back cases.
- Store the returned `trace_id` so FastGPT operators can inspect later via `GET /v1/traces/:id`.

## Notes

- The project plan treats FastGPT as a supported ecosystem integration, but leaves its transport specifics implied by the shared REST architecture.
- This guide keeps the contract narrow so the eventual implementation can stay stable.
