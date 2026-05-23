"""T3: with_memory_hooks wraps anthropic client; messages.create parity with T2."""

from __future__ import annotations
from unittest.mock import MagicMock
from lore_context_middleware import with_memory_hooks


def _make_mock_anthropic(create_return=None):
    create = MagicMock(
        return_value=create_return
        or {
            "id": "msg_test",
            "type": "message",
            "role": "assistant",
            "content": [{"type": "text", "text": "Here's an essay."}],
            "model": "claude-3-5-sonnet",
        }
    )
    messages = MagicMock()
    messages.create = create
    client = MagicMock(spec=["messages", "with_options"])
    client.messages = messages
    return client, create


def test_inject_into_anthropic_system_string():
    lore = MagicMock()
    lore.context_query.return_value = {"contextBlock": "User prefers Claude for prose."}
    lore.memory_write = MagicMock()

    client_inner, create = _make_mock_anthropic()
    wrapped = with_memory_hooks(client_inner, lore, mode="hybrid")
    response = wrapped.messages.create(
        model="claude-3-5-sonnet",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Write me an essay about climate."}],
    )

    assert lore.context_query.call_count == 1
    assert lore.context_query.call_args.kwargs["query"] == "Write me an essay about climate."

    kwargs = create.call_args.kwargs
    assert isinstance(kwargs["system"], str)
    assert "User prefers Claude for prose." in kwargs["system"]
    assert "Relevant memories" in kwargs["system"]
    assert response["id"] == "msg_test"


def test_appends_to_existing_string_system():
    lore = MagicMock()
    lore.context_query.return_value = {"contextBlock": "User is on staging."}
    lore.memory_write = MagicMock()

    client_inner, create = _make_mock_anthropic()
    wrapped = with_memory_hooks(client_inner, lore, mode="hybrid")
    wrapped.messages.create(
        model="claude-3-5-sonnet",
        max_tokens=100,
        system="You are a helpful assistant.",
        messages=[{"role": "user", "content": "Hi"}],
    )

    sys = create.call_args.kwargs["system"]
    assert isinstance(sys, str)
    assert "You are a helpful assistant." in sys
    assert "User is on staging." in sys


def test_appends_to_array_system():
    lore = MagicMock()
    lore.context_query.return_value = {"contextBlock": "Project is acme-1.2"}
    lore.memory_write = MagicMock()

    client_inner, create = _make_mock_anthropic()
    wrapped = with_memory_hooks(client_inner, lore, mode="hybrid")
    wrapped.messages.create(
        model="claude-3-5-sonnet",
        max_tokens=100,
        system=[
            {"type": "text", "text": "Persona: senior staff engineer.", "cache_control": {"type": "ephemeral"}},
        ],
        messages=[{"role": "user", "content": "Status?"}],
    )

    sys = create.call_args.kwargs["system"]
    assert isinstance(sys, list)
    assert len(sys) == 2
    assert "senior staff engineer" in sys[0]["text"]
    assert "Project is acme-1.2" in sys[1]["text"]


def test_tools_mode_skips_inject():
    lore = MagicMock()
    client_inner, create = _make_mock_anthropic()
    wrapped = with_memory_hooks(client_inner, lore, mode="tools")
    wrapped.messages.create(
        model="claude-3-5-sonnet",
        max_tokens=100,
        messages=[{"role": "user", "content": "Hi"}],
    )

    assert lore.context_query.call_count == 0
    assert "system" not in create.call_args.kwargs or create.call_args.kwargs["system"] is None
