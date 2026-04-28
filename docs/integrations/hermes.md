# Hermes

Status: REST API and local stdio MCP launcher are available. Hermes-specific bridge packaging is still pending.

## Recommended Path

- Use Lore as the external context control plane for Hermes projects.
- Do not create a Hermes-only memory subsystem.

## Planned Setup Shape

- Prefer the shared Lore MCP surface when Hermes can consume MCP.
- Fall back to Lore REST when Hermes is operating through its own tool or workflow layer.
- Keep Lore responsible for context assembly, provenance, and audit, while Hermes remains the execution surface.

## Lore Usage Pattern

- `context_query` is the default way to enrich a Hermes task with memory, web, repo, and trace evidence.
- `memory_write` is for explicit project defaults or user-confirmed preferences.
- `trace_get` is the debugging path when Hermes output needs source attribution.

## Notes

- The plan mentions Hermes as a supported ecosystem integration, not as a bespoke plugin product.
- This guide is intentionally narrow so it stays consistent with that control-plane design.
