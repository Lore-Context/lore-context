# Dify

Status: REST API and local stdio MCP launcher are available. Lore REST endpoints for context, memory, governance, traces, events and eval are available in the local API. API key RBAC and optional Postgres storage are implemented.

## Recommended Path

- Start with Lore REST, not MCP.
- Treat Lore as the context and memory service that sits beside Dify flows and agents.

## Planned Setup Shape

- Call `POST /v1/context/query` before the Dify prompt or workflow step that needs cross-session context.
- Use `POST /v1/memory/write` only after explicit user confirmation or a clearly durable project fact.
- Use `GET /v1/traces/:id` when an operator needs to audit what Lore returned.

## Request Design

- Pass `query`, `user_id`, `project_id`, and `agent_id`.
- Set `sources.memory`, `sources.web`, `sources.repo`, and `sources.tool_traces` explicitly.
- Use `token_budget` and `writeback_policy` to keep the response bounded and auditable.

## Notes

- The plan lists Dify in the ecosystem docs set, but does not define a Dify-specific MCP contract.
- This guide therefore keeps Dify API-first and aligned to the shared Lore REST surface.
