# lore-context-middleware

Python SDK middleware for Lore Context — wraps `openai.OpenAI` / `anthropic.Anthropic` clients to auto-inject memory pre-LLM-call and auto-retain post-LLM-call without requiring the AI to call an MCP tool. Current package version: `0.1.0`.

## Install

```bash
pip install lore-context-middleware lore-context openai
```

## Quick start

```python
import os
from openai import OpenAI
from lore_context import LoreContextClient
from lore_context_middleware import with_memory_hooks

lore = LoreContextClient(
    token=os.environ.get("LORE_AUTH_TOKEN"),
    lore_api_key=os.environ["LORE_API_KEY"],
    lore_csrf=os.environ.get("LORE_CSRF", ""),
)
openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

client = with_memory_hooks(openai_client, lore, mode="hybrid")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What was that Postgres dump command?"}],
)
```

## Modes

| Mode | inject | retain | tools exposed |
|---|---|---|---|
| `hybrid` (default) | ✅ | ✅ | ✅ |
| `context` | ✅ | ✅ | ❌ |
| `tools` | ❌ | ❌ | ✅ |

See `docs/sdk/middleware-modes.md` in the lore-cloud repo for full mode semantics.

## Framework fallback recipes

For OpenAI Agents SDK, LangChain/LangGraph, REST/cURL, OpenTelemetry, and long-tail language fallback patterns, see `docs/sdk/framework-fallback-recipes.md` in this repository. These are docs-only recipes and do not add a new provider middleware implementation.

## License

MIT
