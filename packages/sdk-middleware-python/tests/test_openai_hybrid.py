"""T2: with_memory_hooks wraps openai client; hybrid mode auto-injects + retains."""

from __future__ import annotations
from unittest.mock import MagicMock
from lore_context_middleware import with_memory_hooks


def _make_mock_openai(create_return=None, default_return=None):
    create = MagicMock(
        return_value=create_return
        or {
            "id": "chatcmpl-test",
            "choices": [{"message": {"role": "assistant", "content": "Use pg_dump."}, "index": 0}],
        }
    )
    completions = MagicMock()
    completions.create = create
    chat = MagicMock()
    chat.completions = completions
    client = MagicMock()
    client.chat = chat
    # Strip messages so isinstance check disambiguates from anthropic
    del client.messages
    return client, create


def test_inject_via_context_query_and_system_message_added():
    context_query = MagicMock(return_value={"contextBlock": "User likes Postgres backups."})
    memory_write = MagicMock(return_value={"memoryId": "mem-1"})
    lore = MagicMock()
    lore.context_query = context_query
    lore.memory_write = memory_write

    client_inner, create = _make_mock_openai()
    wrapped = with_memory_hooks(client_inner, lore, mode="hybrid")
    response = wrapped.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "What was that Postgres dump command?"}],
    )

    # context_query called once with user message
    assert context_query.call_count == 1
    kwargs = context_query.call_args.kwargs
    assert kwargs["query"] == "What was that Postgres dump command?"
    assert kwargs["mode"] == "memory"

    # System message injected at index 0
    call_args = create.call_args.kwargs
    msgs = call_args["messages"]
    assert len(msgs) == 2
    assert msgs[0]["role"] == "system"
    assert "User likes Postgres backups." in msgs[0]["content"]
    assert "Relevant memories" in msgs[0]["content"]

    # Response shape unchanged
    assert response["id"] == "chatcmpl-test"


def test_appends_to_existing_system_message():
    lore = MagicMock()
    lore.context_query.return_value = {"contextBlock": "Recall: prefer pg_dump."}
    lore.memory_write = MagicMock()

    client_inner, create = _make_mock_openai()
    wrapped = with_memory_hooks(client_inner, lore, mode="hybrid")
    wrapped.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a database expert."},
            {"role": "user", "content": "How do I back up?"},
        ],
    )

    msgs = create.call_args.kwargs["messages"]
    assert len(msgs) == 2
    assert msgs[0]["role"] == "system"
    assert "You are a database expert." in msgs[0]["content"]
    assert "Recall: prefer pg_dump." in msgs[0]["content"]


def test_tools_mode_skips_inject_and_retain():
    lore = MagicMock()
    client_inner, create = _make_mock_openai()
    wrapped = with_memory_hooks(client_inner, lore, mode="tools")
    wrapped.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "Hi"}])

    assert lore.context_query.call_count == 0
    assert lore.memory_write.call_count == 0
    msgs = create.call_args.kwargs["messages"]
    assert len(msgs) == 1  # no inject


def test_retain_carries_idempotency_key():
    lore = MagicMock()
    lore.context_query.return_value = {"contextBlock": "ctx"}
    memory_write = MagicMock()
    lore.memory_write = memory_write

    client_inner, _create = _make_mock_openai()
    wrapped = with_memory_hooks(client_inner, lore, mode="hybrid")
    wrapped.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "Hello"}])

    assert memory_write.call_count == 1
    kwargs = memory_write.call_args.kwargs
    assert "idempotency_key" in kwargs and isinstance(kwargs["idempotency_key"], str) and len(kwargs["idempotency_key"]) > 0
    assert kwargs["scope"] == "user"
    assert kwargs["memory_type"] == "conversation_turn"
    assert kwargs["content"]["user_msg"] == "Hello"
