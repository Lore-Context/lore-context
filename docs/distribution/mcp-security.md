# MCP Security Posture

Status: draft source for registry and marketplace security notes.

Lore's public alpha should be listed as a local/private MCP stdio integration,
not as a public remote MCP service.

## Default Boundary

- MCP transport: stdio.
- API target: local or private Lore API.
- Authentication: Bearer API key.
- Authorization: `reader`, `writer`, and `admin` roles with optional
  `projectIds` scoping.
- Default recommendation: give agent clients the smallest role that works.
- Public remote MCP HTTP: not a v0.6 default.

## Tool Risk Classes

| Class | Tools | Recommended role | Notes |
|---|---|---|---|
| Read-only retrieval | `context_query`, `memory_search`, `memory_get`, `memory_list`, `trace_get` | reader | Safe default for most IDE assistants. |
| Memory writeback | `memory_write`, `memory_update`, `memory_supersede`, `eval_run` | writer | Use only for workflows where durable memory writeback is intended. |
| Administrative | `memory_forget`, `memory_export` | admin | Keep out of broad IDE tool allowlists. |

## Marketplace Security Copy

Lore Context runs locally by default. The MCP server is a stdio process that
forwards tool calls to a Lore API you operate. Do not expose the API publicly
without authentication, project scoping, rate limiting, and a deployment review.

For shared environments:

- use `LORE_API_KEYS` instead of one global key;
- scope client keys to specific project IDs;
- keep admin keys out of IDE plugins;
- prefer soft delete for normal forget flows;
- require explicit human review before publishing marketplace metadata;
- use demo data for screenshots and examples.

## Remote Transport Boundary

Remote MCP HTTP is intentionally outside the v0.6 default path. Before it becomes
a public recommendation, Lore needs:

- service-token authentication;
- origin and client allowlists;
- explicit threat model for remote tool invocation;
- audit events for remote sessions;
- rate limits per key and per client;
- documented revocation flow;
- regression tests for auth, CORS, and error sanitization.

## Redaction Boundary

Generated public docs, `llms.txt`, marketplace copy, screenshots, and benchmark
posts must not include:

- customer data;
- private traces;
- production memory exports;
- secrets or API keys;
- private hostnames;
- unpublished cloud runbooks;
- unsupported benchmark claims.

