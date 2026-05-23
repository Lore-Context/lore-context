"""
Walker tests — verifies symbol extraction and that no body bytes appear in signatures.
"""

import textwrap
import tempfile
from pathlib import Path

import pytest

from lore_code_indexer.parser import parse_file
from lore_code_indexer.walker import walk


_SIMPLE_PYTHON = textwrap.dedent("""\
    class Greeter:
        \"\"\"A simple greeter class.\"\"\"

        def greet(self, name: str) -> str:
            \"\"\"Return a greeting string.\"\"\"
            return f"Hello, {name}!"

        def _private(self) -> None:
            pass


    def standalone(x: int, y: int) -> int:
        \"\"\"Add two integers.\"\"\"
        return x + y
""")


@pytest.fixture()
def parsed_simple_python(tmp_path):
    src_file = tmp_path / "example.py"
    src_file.write_text(_SIMPLE_PYTHON, encoding="utf-8")
    result = parse_file(src_file, "python")
    return result, src_file


def test_walker_emits_expected_symbols(parsed_simple_python):
    result, src_file = parsed_simple_python
    if not result.ok:
        pytest.skip(f"tree-sitter Python grammar not available: {result.error}")

    walk_result = walk(result.tree, result.source_bytes, "python", "example.py")
    names = {s.name for s in walk_result.symbols}

    assert "Greeter" in names, f"Expected 'Greeter' in {names}"
    assert "greet" in names, f"Expected 'greet' in {names}"
    assert "standalone" in names, f"Expected 'standalone' in {names}"


def test_walker_no_body_in_signature(parsed_simple_python):
    """No body bytes must appear in any symbol's signature field (K5 invariant)."""
    result, src_file = parsed_simple_python
    if not result.ok:
        pytest.skip(f"tree-sitter Python grammar not available: {result.error}")

    walk_result = walk(result.tree, result.source_bytes, "python", "example.py")

    for sym in walk_result.symbols:
        if sym.signature is None:
            continue
        # Body bytes would include 'return' statements or multi-line body content
        assert "return f" not in sym.signature, (
            f"Body bytes found in signature of {sym.name!r}: {sym.signature!r}"
        )
        assert "return x + y" not in sym.signature, (
            f"Body bytes found in signature of {sym.name!r}: {sym.signature!r}"
        )
        # Signature must end at the def line (with ':')
        lines = sym.signature.strip().splitlines()
        # The last line of a valid Python signature ends with ':'
        last = lines[-1].rstrip()
        assert last.endswith(":"), (
            f"Signature of {sym.name!r} does not end with ':': {sym.signature!r}"
        )


def test_walker_method_kind(parsed_simple_python):
    """Methods inside a class should have kind='method', not 'function'."""
    result, src_file = parsed_simple_python
    if not result.ok:
        pytest.skip(f"tree-sitter Python grammar not available: {result.error}")

    walk_result = walk(result.tree, result.source_bytes, "python", "example.py")

    by_name = {s.name: s for s in walk_result.symbols}
    if "greet" in by_name:
        assert by_name["greet"].kind == "method", (
            f"Expected kind='method' for 'greet', got {by_name['greet'].kind!r}"
        )
    if "standalone" in by_name:
        assert by_name["standalone"].kind == "function", (
            f"Expected kind='function' for 'standalone', got {by_name['standalone'].kind!r}"
        )


def test_walker_line_numbers(parsed_simple_python):
    """start_line must be ≥ 0 and end_line ≥ start_line for all symbols."""
    result, src_file = parsed_simple_python
    if not result.ok:
        pytest.skip(f"tree-sitter Python grammar not available: {result.error}")

    walk_result = walk(result.tree, result.source_bytes, "python", "example.py")

    for sym in walk_result.symbols:
        assert sym.start_line >= 0, f"{sym.name!r} has negative start_line"
        assert sym.end_line >= sym.start_line, (
            f"{sym.name!r} end_line < start_line"
        )
