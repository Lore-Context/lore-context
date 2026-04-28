# Upstream Runtime Notes

Lore Context does not bundle or fork upstream memory runtimes.

## agentmemory

- Role: local memory runtime and agent integration accelerator.
- Default URL: `http://127.0.0.1:3111`
- Health endpoint: `http://127.0.0.1:3111/agentmemory/health`
- Viewer URL: `http://127.0.0.1:3113`
- Local verification observed `agentmemory` version `0.9.3` on `2026-04-28`.

Lore currently wraps this runtime through `packages/agentmemory-adapter`. The API degrades cleanly when the runtime is offline and can sync exported memories when it is available.
