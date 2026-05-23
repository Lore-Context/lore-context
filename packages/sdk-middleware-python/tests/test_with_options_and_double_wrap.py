"""T7 + S9-parity: client.with_options preservation + double-wrap detection."""

from __future__ import annotations
from unittest.mock import MagicMock
import pytest

from lore_context_middleware import with_memory_hooks, LoreMiddlewareDoubleWrapError
from lore_context_middleware._types import LORE_MIDDLEWARE_MARKER_ATTR


def _make_mock_openai_with_options():
    def create_impl(**_kwargs):
        return {"id": "cc-x", "choices": [{"message": {"role": "assistant", "content": "ok"}, "index": 0}]}
    create = MagicMock(side_effect=create_impl)
    completions = MagicMock(); completions.create = create
    chat = MagicMock(); chat.completions = completions
    inner = MagicMock(spec=["chat", "with_options"])
    inner.chat = chat
    # `with_options` returns a fresh inner with same shape
    inner.with_options = MagicMock()
    new_inner = MagicMock(spec=["chat", "with_options"])
    new_inner.chat = chat
    new_inner.with_options = MagicMock(return_value=new_inner)
    inner.with_options.return_value = new_inner
    return inner


def test_with_options_returns_wrapped_client():
    lore = MagicMock()
    inner = _make_mock_openai_with_options()
    wrapped = with_memory_hooks(inner, lore, mode="hybrid")

    new_wrapped = wrapped.with_options(timeout=10.0)

    # The result is still a wrapped client carrying the marker.
    assert getattr(new_wrapped, LORE_MIDDLEWARE_MARKER_ATTR, False) is True
    # Inner with_options was called once with our kwarg.
    inner.with_options.assert_called_once_with(timeout=10.0)


def test_double_wrap_raises_on_already_wrapped():
    lore = MagicMock()
    inner = _make_mock_openai_with_options()
    wrapped_once = with_memory_hooks(inner, lore, mode="hybrid")

    with pytest.raises(LoreMiddlewareDoubleWrapError):
        with_memory_hooks(wrapped_once, lore, mode="hybrid")


def test_double_wrap_after_with_options_also_raises():
    lore = MagicMock()
    inner = _make_mock_openai_with_options()
    wrapped_once = with_memory_hooks(inner, lore, mode="hybrid")
    after_opts = wrapped_once.with_options(timeout=5)

    with pytest.raises(LoreMiddlewareDoubleWrapError):
        with_memory_hooks(after_opts, lore, mode="hybrid")


def test_unwrappable_client_raises_type_error():
    lore = MagicMock()
    # A plain object with no chat.completions.create and no messages.create
    junk = object()
    with pytest.raises(TypeError):
        with_memory_hooks(junk, lore)
