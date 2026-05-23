"""Public types + error classes for lore-context-middleware."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Callable, Literal, Optional, TypedDict

# T7 / S9 parity: instances of the wrapper classes set this attribute to True.
# Calling `with_memory_hooks` on an already-wrapped client checks this attr
# and raises `LoreMiddlewareDoubleWrapError`.
LORE_MIDDLEWARE_MARKER_ATTR = "_lore_middleware_marker"


# v0.1.0 narrows recall_method to "facts" only; "reflect" lands in v2.1.
# Mirrors TS Lane S S10 type union.
#
# v0.1.0 surface deliberately omits flags whose implementation is not yet
# shipped (per critic review of PR #209): retain_every_n_turns sampling and
# retain_batch_window_ms debounce are carry-forward to v2.1. RetainAuditEvent
# also no longer includes the "redaction" reason value — the credential-
# redaction layer lands in v2.1's dedicated security lane (plan §10).
MiddlewareMode = Literal["hybrid", "context", "tools"]
RecallMethod = Literal["facts"]


class InjectAuditEvent(TypedDict, total=False):
    skipped: bool
    reason: Optional[str]
    episodes: list
    latency_ms: int
    call_id: str


class RetainAuditEvent(TypedDict, total=False):
    skipped: bool
    reason: Optional[str]
    memory_id: Optional[str]
    call_id: str


@dataclass
class MiddlewareOptions:
    """User-facing config for `with_memory_hooks`."""

    mode: MiddlewareMode = "hybrid"
    recall_max_tokens: int = 4096
    recall_preamble: str = "Relevant memories (prioritize when conflicting):\n"
    recall_method: RecallMethod = "facts"
    retain_source_tag: Optional[str] = None
    inject_timeout_ms: int = 2000
    on_inject_audit: Optional[Callable[[InjectAuditEvent], None]] = None
    on_retain_audit: Optional[Callable[[RetainAuditEvent], None]] = None


class LoreMiddlewareDoubleWrapError(Exception):
    """Raised when with_memory_hooks is applied to an already-wrapped client."""

    def __init__(self, message: str = "with_memory_hooks has already been applied to this client") -> None:
        super().__init__(message)


# Tier-aware budget defaults (parity with TS TIER_TOKEN_DEFAULTS).
TIER_TOKEN_DEFAULTS: dict[str, int] = {
    "free": 512,
    "go": 1024,
    "plus": 4096,
    "pro": 8192,
}
TIER_TOKEN_MAX = dict(TIER_TOKEN_DEFAULTS)
