"""Shared request-shape parity fixtures for TS/Python SDKs.

Validates that key API routes are present in the Python raw client implementation
so parity evidence is explicit in test code.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]

def _fixture_path() -> Path:
    return REPO_ROOT / "scripts" / "sdk" / "request-shape-fixtures.json"


def _py_raw_client_path() -> Path:
    return REPO_ROOT / "packages" / "sdk-python" / "src" / "lore_context" / "raw_client.py"


def _load_fixtures() -> list[dict]:
    with _fixture_path().open("r", encoding="utf-8") as f:
        return json.load(f)


def test_ts_python_request_shape_fixtures_are_present_in_python_raw_client() -> None:
    fixtures = _load_fixtures()
    source = _py_raw_client_path().read_text(encoding="utf-8")

    for fixture in fixtures:
        py_method = re.escape(fixture["pyMethod"])
        pattern = re.compile(rf"def {py_method}\(")
        assert pattern.search(source), f"missing python method: {fixture['pyMethod']}"
        assert f'"{fixture["path"]}"' in source, f"missing path: {fixture['path']}"
        assert f'method="{fixture["method"]}"' in source, f"missing method marker: {fixture['method']}"
