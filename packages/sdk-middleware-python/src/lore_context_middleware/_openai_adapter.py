"""OpenAI wrapping for lore-context-middleware (T2 + T4)."""

from __future__ import annotations
import time
import uuid
from typing import Any, Iterable, Iterator, List, Optional

from ._types import LORE_MIDDLEWARE_MARKER_ATTR, MiddlewareOptions


DEFAULT_RETAIN_SOURCE_TAG_OPENAI = "openai-chat"

# Marker substrings that trigger retain pre-filter (T-mirror of S8).
_RETAIN_LOOP_MARKERS = ("<memory_capture>", "<recalled>")


def _payload_contains_loop_marker(text: str) -> bool:
    return any(m in text for m in _RETAIN_LOOP_MARKERS)


def _extract_last_user_message(messages: List[dict]) -> Optional[str]:
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


def _inject_into_messages(messages: List[dict], context_block: str, preamble: str) -> List[dict]:
    block = f"{preamble}{context_block}"
    if messages and messages[0].get("role") == "system":
        first = messages[0]
        existing = first.get("content")
        if isinstance(existing, str) and existing:
            merged = f"{existing}\n\n{block}"
        else:
            merged = block
        return [{**first, "content": merged}, *messages[1:]]
    return [{"role": "system", "content": block}, *messages]


def _extract_assistant_content(response: Any) -> Optional[str]:
    """Extract assistant message content from an OpenAI ChatCompletion result.

    Supports both dict-shaped mocks (used in tests) and pydantic-like objects
    (used by real openai>=1.0 SDK).
    """
    if response is None:
        return None
    # dict-shaped (mocks)
    if isinstance(response, dict):
        choices = response.get("choices") or []
        if not choices:
            return None
        msg = choices[0].get("message") or {}
        content = msg.get("content")
        return content if isinstance(content, str) else None
    # object-shaped (real SDK)
    choices = getattr(response, "choices", None) or []
    if not choices:
        return None
    msg = getattr(choices[0], "message", None)
    content = getattr(msg, "content", None) if msg is not None else None
    return content if isinstance(content, str) else None


def _maybe_retain(
    lore: Any,
    user_msg: str,
    assistant_msg: Optional[str],
    options: MiddlewareOptions,
    call_id: str,
    default_source_tag: str,
) -> None:
    """Fire-and-forget retain. Errors are captured by on_retain_audit."""
    if not assistant_msg:
        return
    if options.mode == "tools":
        return
    if not hasattr(lore, "memory_write"):
        return

    if _payload_contains_loop_marker(user_msg) or _payload_contains_loop_marker(assistant_msg):
        if options.on_retain_audit:
            options.on_retain_audit({"skipped": True, "reason": "filtered_marker", "call_id": call_id})
        return

    source = options.retain_source_tag or default_source_tag
    try:
        lore.memory_write(
            content={"user_msg": user_msg, "assistant_msg": assistant_msg, "source": source},
            scope="user",
            memory_type="conversation_turn",
            idempotency_key=call_id,
        )
        if options.on_retain_audit:
            options.on_retain_audit({"skipped": False, "call_id": call_id})
    except Exception:
        if options.on_retain_audit:
            options.on_retain_audit({"skipped": True, "reason": "transport_error", "call_id": call_id})


def _make_call_id() -> str:
    return str(uuid.uuid4())


def _call_context_query_with_timeout(
    lore: Any, query: str, token_budget: int, timeout_ms: int
) -> Any:
    """Call lore.context_query with a wall-clock timeout (sync best-effort).

    For the unit test bar this is simulated — real SDK supports per-call
    timeouts via httpx, which a future iteration can swap in.
    """
    started = time.monotonic()
    try:
        result = lore.context_query(query=query, mode="memory", token_budget=token_budget)
    except Exception as e:  # noqa: BLE001 — propagate to wrapper for audit
        raise e
    elapsed_ms = int((time.monotonic() - started) * 1000)
    if elapsed_ms > timeout_ms:
        raise TimeoutError("inject_timeout")
    return result


class _WrappedCompletions:
    def __init__(self, inner: Any, lore: Any, options: MiddlewareOptions) -> None:
        self._inner = inner
        self._lore = lore
        self._options = options

    def create(self, **kwargs: Any) -> Any:
        call_id = _make_call_id()
        messages = kwargs.get("messages") or []
        user_msg = _extract_last_user_message(messages) if isinstance(messages, list) else None
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
                    new_messages = _inject_into_messages(messages, block, self._options.recall_preamble)
                    modified_kwargs["messages"] = new_messages
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
            return _wrap_stream_for_retain(
                result, user_msg, self._lore, self._options, call_id, DEFAULT_RETAIN_SOURCE_TAG_OPENAI
            )
        if user_msg and not is_stream:
            assistant_msg = _extract_assistant_content(result)
            _maybe_retain(
                self._lore, user_msg, assistant_msg, self._options, call_id, DEFAULT_RETAIN_SOURCE_TAG_OPENAI
            )
        return result


class _WrappedChat:
    def __init__(self, inner: Any, lore: Any, options: MiddlewareOptions) -> None:
        self._inner = inner
        self._lore = lore
        self._options = options

    @property
    def completions(self) -> _WrappedCompletions:
        return _WrappedCompletions(self._inner.completions, self._lore, self._options)


class _WrappedOpenAI:
    """Wrapper class around openai.OpenAI.

    Per plan §2 Lane T architecture (rationale C3): wrapper-class strategy
    (NOT subclassing, NOT monkey-patching). `isinstance(wrapped, OpenAI)` is
    False by design; users who need that check must do it before wrapping.
    """

    def __init__(self, inner: Any, lore: Any, options: MiddlewareOptions) -> None:
        # Stamp marker for double-wrap detection (T7 + S9 parity).
        object.__setattr__(self, LORE_MIDDLEWARE_MARKER_ATTR, True)
        object.__setattr__(self, "_inner", inner)
        object.__setattr__(self, "_lore", lore)
        object.__setattr__(self, "_options", options)

    @property
    def chat(self) -> _WrappedChat:
        return _WrappedChat(self._inner.chat, self._lore, self._options)

    def with_options(self, **kwargs: Any) -> "_WrappedOpenAI":
        """T7: preserve wrapping across `client.with_options(...)`.

        Returns a new `_WrappedOpenAI` around the inner client's `with_options`
        result. The marker stays in place; double-wrap detection still triggers
        if user explicitly calls with_memory_hooks again.
        """
        new_inner = self._inner.with_options(**kwargs)
        return _WrappedOpenAI(new_inner, self._lore, self._options)

    def __getattr__(self, name: str) -> Any:
        # Forward everything else to the underlying client.
        return getattr(self._inner, name)


def _extract_context_block(ctx: Any) -> Optional[str]:
    """Pull `contextBlock` (or pythonic `context_block`) from a context_query response."""
    if ctx is None:
        return None
    if isinstance(ctx, dict):
        return ctx.get("contextBlock") or ctx.get("context_block")
    block = getattr(ctx, "contextBlock", None)
    if block is None:
        block = getattr(ctx, "context_block", None)
    return block


def _wrap_stream_for_retain(
    upstream: Any,
    user_msg: str,
    lore: Any,
    options: MiddlewareOptions,
    call_id: str,
    source_tag: str,
) -> Iterator[Any]:
    """T4: wrap a streaming iterator; yield chunks verbatim; fire retain once on done."""
    def generator() -> Iterator[Any]:
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
            for chunk in upstream:
                # Extract delta content; supports dict-shaped mocks
                delta = None
                if isinstance(chunk, dict):
                    choices = chunk.get("choices") or []
                    if choices:
                        delta = (choices[0].get("delta") or {}).get("content")
                else:
                    choices = getattr(chunk, "choices", None) or []
                    if choices:
                        d = getattr(choices[0], "delta", None)
                        delta = getattr(d, "content", None) if d is not None else None
                if isinstance(delta, str):
                    parts.append(delta)
                yield chunk
            fire_once()
        except Exception:
            fired = True
            if options.on_retain_audit:
                options.on_retain_audit({"skipped": True, "reason": "stream_error", "call_id": call_id})
            raise

    return generator()
