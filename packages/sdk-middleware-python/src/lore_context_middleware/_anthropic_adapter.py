"""Anthropic wrapping for lore-context-middleware (T3)."""

from __future__ import annotations
import time
from typing import Any, List, Optional, Union

from ._openai_adapter import (
    _call_context_query_with_timeout,
    _extract_context_block,
    _make_call_id,
    _maybe_retain,
)
from ._types import LORE_MIDDLEWARE_MARKER_ATTR, MiddlewareOptions


DEFAULT_RETAIN_SOURCE_TAG_ANTHROPIC = "anthropic-messages"


def _extract_last_user_message_anthropic(messages: List[dict]) -> Optional[str]:
    for msg in reversed(messages):
        if msg.get("role") == "user":
            content = msg.get("content")
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                texts = [
                    p.get("text", "")
                    for p in content
                    if isinstance(p, dict) and p.get("type") == "text"
                ]
                joined = "\n".join(t for t in texts if t)
                return joined or None
            return None
    return None


def _inject_into_anthropic_system(
    existing: Union[str, List[dict], None], context_block: str, preamble: str
) -> Union[str, List[dict]]:
    block = f"{preamble}{context_block}"
    if existing is None:
        return block
    if isinstance(existing, str):
        return f"{existing}\n\n{block}" if existing else block
    if isinstance(existing, list):
        return [*existing, {"type": "text", "text": block}]
    return block


def _extract_anthropic_assistant_content(response: Any) -> Optional[str]:
    if response is None:
        return None
    if isinstance(response, dict):
        content = response.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            texts = [
                p.get("text", "")
                for p in content
                if isinstance(p, dict) and p.get("type") == "text"
            ]
            return "\n".join(t for t in texts if t) or None
        return None
    content = getattr(response, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        texts = []
        for p in content:
            if isinstance(p, dict) and p.get("type") == "text":
                texts.append(p.get("text", ""))
            elif hasattr(p, "type") and getattr(p, "type") == "text":
                texts.append(getattr(p, "text", ""))
        return "\n".join(t for t in texts if t) or None
    return None


class _WrappedMessages:
    def __init__(self, inner: Any, lore: Any, options: MiddlewareOptions) -> None:
        self._inner = inner
        self._lore = lore
        self._options = options

    def create(self, **kwargs: Any) -> Any:
        call_id = _make_call_id()
        messages = kwargs.get("messages") or []
        user_msg = _extract_last_user_message_anthropic(messages) if isinstance(messages, list) else None
        modified_kwargs = dict(kwargs)

        inject_enabled = self._options.mode in ("hybrid", "context")
        if inject_enabled and user_msg:
            started = time.monotonic()
            try:
                ctx = _call_context_query_with_timeout(
                    self._lore, user_msg, self._options.recall_max_tokens, self._options.inject_timeout_ms
                )
                block = _extract_context_block(ctx)
                if block:
                    new_system = _inject_into_anthropic_system(
                        kwargs.get("system"), block, self._options.recall_preamble
                    )
                    modified_kwargs["system"] = new_system
                    if self._options.on_inject_audit:
                        self._options.on_inject_audit({
                            "skipped": False,
                            "latency_ms": int((time.monotonic() - started) * 1000),
                            "call_id": call_id,
                        })
                else:
                    if self._options.on_inject_audit:
                        self._options.on_inject_audit({
                            "skipped": True,
                            "reason": "empty_result",
                            "latency_ms": int((time.monotonic() - started) * 1000),
                            "call_id": call_id,
                        })
            except TimeoutError:
                if self._options.on_inject_audit:
                    self._options.on_inject_audit({
                        "skipped": True,
                        "reason": "timeout",
                        "latency_ms": int((time.monotonic() - started) * 1000),
                        "call_id": call_id,
                    })
            except Exception:  # noqa: BLE001
                if self._options.on_inject_audit:
                    self._options.on_inject_audit({
                        "skipped": True,
                        "reason": "lore_unreachable",
                        "latency_ms": int((time.monotonic() - started) * 1000),
                        "call_id": call_id,
                    })

        result = self._inner.create(**modified_kwargs)

        is_stream = bool(modified_kwargs.get("stream"))
        if user_msg and is_stream:
            return _wrap_anthropic_stream_for_retain(
                result, user_msg, self._lore, self._options, call_id, DEFAULT_RETAIN_SOURCE_TAG_ANTHROPIC
            )
        if user_msg and not is_stream:
            assistant_msg = _extract_anthropic_assistant_content(result)
            _maybe_retain(
                self._lore,
                user_msg,
                assistant_msg,
                self._options,
                call_id,
                DEFAULT_RETAIN_SOURCE_TAG_ANTHROPIC,
            )
        return result


def _wrap_anthropic_stream_for_retain(
    upstream: Any,
    user_msg: str,
    lore: Any,
    options: MiddlewareOptions,
    call_id: str,
    source_tag: str,
):
    """Mirror of _wrap_stream_for_retain (OpenAI path) for Anthropic's
    MessageStreamEvent shape.

    Yields chunks verbatim while accumulating `delta.text` from
    content_block_delta events with delta.type == "text_delta". Fires retain
    exactly once on iterator completion; on stream error emits
    onRetainAudit({skipped:true, reason:"stream_error"}).
    """
    def generator():
        parts: list[str] = []
        fired = False

        def fire_once() -> None:
            nonlocal fired
            if fired:
                return
            fired = True
            accumulated = "".join(parts)
            if not accumulated:
                if options.on_retain_audit:
                    options.on_retain_audit({"skipped": True, "reason": "stream_error", "call_id": call_id})
                return
            _maybe_retain(lore, user_msg, accumulated, options, call_id, source_tag)

        try:
            for evt in upstream:
                # Anthropic streaming event shape:
                #   {type: "content_block_delta", delta: {type: "text_delta", text: "..."}}
                if isinstance(evt, dict):
                    if evt.get("type") == "content_block_delta":
                        delta = evt.get("delta") or {}
                        if isinstance(delta, dict) and delta.get("type") == "text_delta":
                            text = delta.get("text")
                            if isinstance(text, str):
                                parts.append(text)
                else:
                    typ = getattr(evt, "type", None)
                    if typ == "content_block_delta":
                        delta = getattr(evt, "delta", None)
                        if delta is not None and getattr(delta, "type", None) == "text_delta":
                            text = getattr(delta, "text", None)
                            if isinstance(text, str):
                                parts.append(text)
                yield evt
            fire_once()
        except Exception:
            fired = True
            if options.on_retain_audit:
                options.on_retain_audit({"skipped": True, "reason": "stream_error", "call_id": call_id})
            raise

    return generator()


class _WrappedAnthropic:
    """Wrapper class around anthropic.Anthropic (parity with _WrappedOpenAI)."""

    def __init__(self, inner: Any, lore: Any, options: MiddlewareOptions) -> None:
        object.__setattr__(self, LORE_MIDDLEWARE_MARKER_ATTR, True)
        object.__setattr__(self, "_inner", inner)
        object.__setattr__(self, "_lore", lore)
        object.__setattr__(self, "_options", options)

    @property
    def messages(self) -> _WrappedMessages:
        return _WrappedMessages(self._inner.messages, self._lore, self._options)

    def with_options(self, **kwargs: Any) -> "_WrappedAnthropic":
        new_inner = self._inner.with_options(**kwargs)
        return _WrappedAnthropic(new_inner, self._lore, self._options)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._inner, name)
