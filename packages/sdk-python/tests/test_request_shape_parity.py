"""BRA-594: prove TS/Python SDK request-shape parity for request builders.

The fixture is shared from scripts/sdk/request-shape-parity.json and mirrors the
expected wire format used in both SDKs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

import httpx
from lore_context import LoreContextClient


def _fixture() -> Dict[str, Any]:
    root = Path(__file__).resolve().parents[3]
    path = root / "scripts" / "sdk" / "request-shape-parity.json"
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _normalize_query_pairs(request: httpx.Request) -> list[tuple[str, str]]:
    return list(request.url.params.multi_items())


def test_context_query_wire_shape_matches_parity_fixture() -> None:
    case = _fixture()["cases"][0]
    captured: Dict[str, Any] = {}

    def handler(req: httpx.Request) -> httpx.Response:
        captured.update(
            {
                "method": req.method,
                "url": str(req.url),
                "body": req.read().decode("utf-8"),
                "headers": dict(req.headers),
                "query_pairs": _normalize_query_pairs(req),
            }
        )
        return httpx.Response(status_code=200, json={"result": "ok"}, request=req)

    transport = httpx.MockTransport(handler)
    client = LoreContextClient(
        base_url="https://api.lorecontext.test",
        lore_api_key="test-key",
        lore_csrf="test-csrf",
        httpx_client=httpx.Client(transport=transport),
        timeout=5.0,
    )

    client.context_query(
        query=case["input"]["request"]["query"],
        project_id=case["input"]["request"]["project_id"],
        token_budget=case["input"]["request"]["token_budget"],
        include_sources=case["input"]["request"]["include_sources"],
        mode=case["input"]["request"]["mode"],
        request_options={
            "additional_query_parameters": case["input"]["requestOptions"]["queryParams"],
        },
    )

    assert captured["method"] == case["expected"]["method"]
    assert captured['url'].split('?', 1)[0].endswith(f"/{case['expected']['path']}")
    assert captured["query_pairs"] == [tuple(item) for item in case["expected"]["query"]]
    assert json.loads(captured["body"]) == case["expected"]["body"]
    assert captured["headers"]["content-type"] == case["expected"]["headers"]["content-type"]
