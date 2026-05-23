"""
lore-context-middleware — Python SDK middleware for Lore Context.

See plan §2 Lane T for full architecture; this package provides the
`with_memory_hooks` factory which wraps OpenAI/Anthropic Python SDK clients
with pre-LLM-call auto-inject + post-LLM-call auto-retain.

v0.1.0 ships sync wrappers for `openai.OpenAI` and `anthropic.Anthropic` only.
Async variants and Responses API support land in v2.1 (per plan §10).
"""

from ._types import (
    MiddlewareOptions,
    MiddlewareMode,
    LoreMiddlewareDoubleWrapError,
    LORE_MIDDLEWARE_MARKER_ATTR,
)
from ._middleware import with_memory_hooks

__all__ = [
    "with_memory_hooks",
    "MiddlewareOptions",
    "MiddlewareMode",
    "LoreMiddlewareDoubleWrapError",
    "LORE_MIDDLEWARE_MARKER_ATTR",
]

__version__ = "0.1.0rc1"
