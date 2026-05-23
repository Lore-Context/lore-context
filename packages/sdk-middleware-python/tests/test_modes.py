"""T5: 3 modes parity via shared golden fixtures from Lane S.

Loads tests/__snapshots__/middleware-modes/<mode>.golden.json (written by TS
Lane S test) and asserts the Python wrapper emits the exact same canonical
trace shape. This enforces cross-language parity at the audit-event level.
"""

from __future__ import annotations
import json
from pathlib import Path
from unittest.mock import MagicMock
import pytest

from lore_context_middleware import with_memory_hooks


# Path to the TS-side golden directory (shared resource).
THIS_DIR = Path(__file__).resolve().parent
TS_PKG_ROOT = THIS_DIR.parent.parent / "sdk-middleware-typescript"
GOLDEN_DIR = TS_PKG_ROOT / "tests" / "__snapshots__" / "middleware-modes"


def _make_mock_openai():
    def create_impl(**_kwargs):
        return {
            "id": "cc-test",
            "choices": [{"message": {"role": "assistant", "content": "ok"}, "index": 0}],
        }
    create = MagicMock(side_effect=create_impl)
    completions = MagicMock(); completions.create = create
    chat = MagicMock(); chat.completions = completions
    client = MagicMock(spec=["chat", "with_options"])
    client.chat = chat
    return client, create


def _capture_trace(mode: str) -> dict:
    events: list[dict] = []
    lore = MagicMock()
    lore.context_query.return_value = {"contextBlock": "User context."}
    lore.memory_write = MagicMock()
    client_inner, _create = _make_mock_openai()
    wrapped = with_memory_hooks(
        client_inner,
        lore,
        mode=mode,
        on_inject_audit=lambda e: events.append({"kind": "inject", "skipped": e.get("skipped", False), "reason": e.get("reason")}),
        on_retain_audit=lambda e: events.append({"kind": "retain", "skipped": e.get("skipped", False), "reason": e.get("reason")}),
    )
    wrapped.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello."}],
    )
    return {"mode": mode, "client_type": "openai", "events": events}


@pytest.mark.parametrize("mode", ["hybrid", "context", "tools"])
def test_python_trace_matches_ts_golden(mode):
    golden_path = GOLDEN_DIR / f"{mode}.golden.json"
    assert golden_path.exists(), f"Golden file missing: {golden_path}. Run TS vitest to regenerate."
    golden = json.loads(golden_path.read_text())

    trace = _capture_trace(mode)

    # Normalize: reason=None ↔ reason missing or null
    for ev in trace["events"]:
        if ev.get("reason") is None:
            ev["reason"] = None
    for ev in golden["events"]:
        if ev.get("reason") is None:
            ev["reason"] = None

    assert trace == golden, f"Python trace deviates from TS golden for mode={mode}:\nTS:     {json.dumps(golden, indent=2)}\nPython: {json.dumps(trace, indent=2)}"
