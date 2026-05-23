# lore-context

Generated Python SDK for the Lore Context API. Package: `lore-context`; current package version: `0.1.0`.

## Install

```bash
pip install lore-context
```

## Quick start

## Install

```bash
pip install lore-context
```

## Quick start

```python
import os
from lore_context import LoreContextClient

client = LoreContextClient(
    token=os.environ.get("LORE_AUTH_TOKEN"),
    lore_api_key=os.environ["LORE_API_KEY"],
    lore_csrf=os.environ.get("LORE_CSRF", ""),
)

health = client.get_health()
print(health.status)
```

## Notes

- `token` is sent as `Authorization: Bearer <token>` when endpoint auth requires it.
- `lore_api_key` and `lore_csrf` mirror the generated API header surface. Use an empty CSRF value only for endpoints/environments that do not require it.
- For middleware around OpenAI/Anthropic calls, install `lore-context-middleware` alongside this package.
