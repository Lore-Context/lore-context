"""
Privacy filter integration test (K5).

Fixture: Python source containing ``API_KEY = "sk_live_test_abc123"``.
Asserts the symbol "API_KEY" appears in the payload but the secret bytes are absent.
"""

import textwrap
import tempfile
from pathlib import Path

from lore_code_indexer.privacy_filter import filter_file


_FIXTURE_SOURCE = textwrap.dedent("""\
    # This module stores an API key constant.

    API_KEY = "sk_live_test_abc123456789"

    def fetch_data(url: str) -> dict:
        \"\"\"Fetch data from the given URL.\"\"\"
        import httpx
        response = httpx.get(url, headers={"Authorization": f"Bearer {API_KEY}"})
        return response.json()
""")


def test_api_key_symbol_present_secret_absent():
    """Symbol 'fetch_data' should be in payload; secret bytes must not appear."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)
        src_file = root / "module.py"
        src_file.write_text(_FIXTURE_SOURCE, encoding="utf-8")

        payload = filter_file(src_file, root)

        assert payload is not None, "filter_file returned None unexpectedly"

        # The function name must be present
        symbol_names = {s.name for s in payload.symbols}
        assert "fetch_data" in symbol_names, f"Expected 'fetch_data' in {symbol_names}"

        # The secret value must not appear anywhere in the payload
        payload_json = payload.model_dump_json()
        assert "sk_live_test_abc123456789" not in payload_json, (
            "Secret bytes leaked into payload JSON"
        )
        assert "sk_live_" not in payload_json, (
            "Partial secret bytes leaked into payload JSON"
        )


def test_secret_in_variable_value_not_in_signature():
    """Variable initializer value must never appear in the signature field."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)
        src_file = root / "config.py"
        src_file.write_text(_FIXTURE_SOURCE, encoding="utf-8")

        payload = filter_file(src_file, root)
        assert payload is not None

        for sym in payload.symbols:
            if sym.signature:
                assert "sk_live_test_abc123456789" not in sym.signature, (
                    f"Secret in signature of {sym.name!r}: {sym.signature!r}"
                )
            if sym.doc_comment:
                assert "sk_live_test_abc123456789" not in sym.doc_comment, (
                    f"Secret in doc_comment of {sym.name!r}"
                )
