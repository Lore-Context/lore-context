"""
Privacy filter — doc comment secret-pattern stripping (K5 / P7).

Fixture: function whose docstring contains ``api_key = "sk_live_abc..."``.
Asserts the function name is preserved but the secret pattern is stripped.
"""

import textwrap
import tempfile
from pathlib import Path

from lore_code_indexer.privacy_filter import filter_file


_FIXTURE_SOURCE = textwrap.dedent("""\
    def authenticate(user_id: str) -> str:
        \"\"\"Authenticate a user and return a session token.

        Example usage::

            api_key = "sk_live_abcdefghijklmnopqrst"
            token = authenticate(user_id="u_123")

        Returns the session token string.
        \"\"\"
        return _generate_token(user_id)
""")


def test_function_name_preserved_secret_stripped():
    """Function name must be in payload; secret key in docstring must be gone."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)
        src_file = root / "auth.py"
        src_file.write_text(_FIXTURE_SOURCE, encoding="utf-8")

        payload = filter_file(src_file, root)
        assert payload is not None

        symbol_names = {s.name for s in payload.symbols}
        assert "authenticate" in symbol_names, (
            f"Function name 'authenticate' missing from payload symbols: {symbol_names}"
        )

        # The raw secret value must not appear
        payload_json = payload.model_dump_json()
        assert "sk_live_abcdefghijklmnopqrst" not in payload_json, (
            "Secret in docstring leaked into payload JSON"
        )

        # The doc comment itself should exist but be redacted
        for sym in payload.symbols:
            if sym.name == "authenticate" and sym.doc_comment:
                assert "sk_live_" not in sym.doc_comment, (
                    f"Secret not stripped from doc_comment: {sym.doc_comment!r}"
                )
                assert "REDACTED" in sym.doc_comment, (
                    "Expected REDACTED sentinel in stripped doc_comment"
                )
