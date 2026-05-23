"""with_memory_hooks dispatcher — picks the right wrapper class."""

from __future__ import annotations
from typing import Any, Optional

from ._anthropic_adapter import _WrappedAnthropic
from ._openai_adapter import _WrappedOpenAI
from ._types import (
    LORE_MIDDLEWARE_MARKER_ATTR,
    LoreMiddlewareDoubleWrapError,
    MiddlewareOptions,
)


def _is_openai_like(client: Any) -> bool:
    chat = getattr(client, "chat", None)
    completions = getattr(chat, "completions", None) if chat is not None else None
    create = getattr(completions, "create", None) if completions is not None else None
    return callable(create)


def _is_anthropic_like(client: Any) -> bool:
    if _is_openai_like(client):
        return False
    messages = getattr(client, "messages", None)
    create = getattr(messages, "create", None) if messages is not None else None
    return callable(create)


def with_memory_hooks(client: Any, lore: Any, /, **option_kwargs: Any) -> Any:
    """Wrap an OpenAI or Anthropic client with Lore memory middleware.

    Parameters mirror MiddlewareOptions dataclass fields (mode, recall_max_tokens,
    retain_every_n_turns, retain_source_tag, on_inject_audit, on_retain_audit, etc.).

    Raises:
        LoreMiddlewareDoubleWrapError: if `client` was already wrapped.
        TypeError: if `client` is neither OpenAI-like nor Anthropic-like.
    """
    # T7 / S9 parity — Double-wrap detection
    if getattr(client, LORE_MIDDLEWARE_MARKER_ATTR, False) is True:
        raise LoreMiddlewareDoubleWrapError()

    options = MiddlewareOptions(**option_kwargs) if option_kwargs else MiddlewareOptions()

    if _is_openai_like(client):
        return _WrappedOpenAI(client, lore, options)
    if _is_anthropic_like(client):
        return _WrappedAnthropic(client, lore, options)
    raise TypeError(
        "with_memory_hooks: client is neither OpenAI-like (has chat.completions.create) "
        "nor Anthropic-like (has messages.create). Got: " + repr(client)
    )
