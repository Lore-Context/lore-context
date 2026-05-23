"""T4: streaming retain fires once on iterator completion; idempotency_key reused."""

from __future__ import annotations
from unittest.mock import MagicMock
from lore_context_middleware import with_memory_hooks


def _make_stream(parts: list[str]):
    """Build a generator of OpenAI-style streaming chunks."""
    for p in parts:
        yield {
            "id": "cc-stream",
            "object": "chat.completion.chunk",
            "choices": [{"delta": {"content": p}, "index": 0, "finish_reason": None}],
        }
    yield {
        "id": "cc-stream",
        "object": "chat.completion.chunk",
        "choices": [{"delta": {}, "index": 0, "finish_reason": "stop"}],
    }


def test_streaming_yields_chunks_and_retains_once():
    lore = MagicMock()
    lore.context_query.return_value = {"contextBlock": "ctx"}
    memory_write = MagicMock()
    lore.memory_write = memory_write

    def create_impl(**_kwargs):
        return _make_stream(["Hello", " ", "world."])

    create = MagicMock(side_effect=create_impl)
    completions = MagicMock()
    completions.create = create
    chat = MagicMock()
    chat.completions = completions
    client_inner = MagicMock(spec=["chat", "with_options"])
    client_inner.chat = chat

    wrapped = with_memory_hooks(client_inner, lore, mode="hybrid")
    stream = wrapped.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Say hello."}],
        stream=True,
    )

    chunks = list(stream)
    assert len(chunks) == 4
    assert chunks[0]["choices"][0]["delta"]["content"] == "Hello"
    assert chunks[3]["choices"][0]["finish_reason"] == "stop"

    # Retain fired exactly once with accumulated content
    assert memory_write.call_count == 1
    kwargs = memory_write.call_args.kwargs
    assert kwargs["content"]["user_msg"] == "Say hello."
    assert kwargs["content"]["assistant_msg"] == "Hello world."
    assert kwargs["content"]["source"] == "openai-chat"
    assert isinstance(kwargs["idempotency_key"], str)


def test_stream_error_skips_retain():
    lore = MagicMock()
    lore.context_query.return_value = {"contextBlock": ""}
    memory_write = MagicMock()
    lore.memory_write = memory_write

    audits: list[dict] = []

    def error_stream():
        yield {"choices": [{"delta": {"content": "partial"}, "index": 0, "finish_reason": None}]}
        raise RuntimeError("network drop")

    def create_impl(**_kwargs):
        return error_stream()

    create = MagicMock(side_effect=create_impl)
    completions = MagicMock()
    completions.create = create
    chat = MagicMock()
    chat.completions = completions
    client_inner = MagicMock(spec=["chat", "with_options"])
    client_inner.chat = chat

    wrapped = with_memory_hooks(
        client_inner,
        lore,
        mode="hybrid",
        on_retain_audit=lambda e: audits.append(e),
    )
    stream = wrapped.chat.completions.create(
        model="gpt-4o", messages=[{"role": "user", "content": "Hi"}], stream=True
    )

    try:
        list(stream)
        raised = False
    except RuntimeError as e:
        raised = str(e) == "network drop"
    assert raised

    assert memory_write.call_count == 0
    assert any(a.get("reason") == "stream_error" for a in audits)
