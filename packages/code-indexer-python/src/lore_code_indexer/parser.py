"""
Tree-sitter wrapper with graceful fallback.

If a grammar binary is unavailable (manylinux wheel issues, missing native
libs, etc.) the parser logs a warning and returns an empty node list for
that language — the rest of the pipeline continues unaffected.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Language tag → (grammar module attr, node-types file) for each tier-1 language
_GRAMMAR_LOADERS: dict[str, str] = {
    "python": "tree_sitter_python",
    "typescript": "tree_sitter_typescript",
    "tsx": "tree_sitter_typescript",
    "javascript": "tree_sitter_typescript",
    "jsx": "tree_sitter_typescript",
    "go": "tree_sitter_go",
}


@dataclass
class ParseResult:
    language: str
    tree: Any  # tree_sitter.Tree | None
    source_bytes: bytes
    ok: bool
    error: str | None = None


def _load_language(lang_tag: str) -> Any:
    """Load a tree-sitter Language object. Returns None on failure."""
    module_name = _GRAMMAR_LOADERS.get(lang_tag)
    if not module_name:
        return None
    try:
        import importlib

        mod = importlib.import_module(module_name)
        # tree-sitter-python / go expose language() factory
        if hasattr(mod, "language"):
            from tree_sitter import Language

            return Language(mod.language())
        # tree-sitter-typescript exposes typescript() / tsx()
        if lang_tag in ("tsx",) and hasattr(mod, "language_tsx"):
            from tree_sitter import Language

            return Language(mod.language_tsx())
        if hasattr(mod, "language_typescript"):
            from tree_sitter import Language

            return Language(mod.language_typescript())
        logger.warning("Grammar module %s has no language() factory", module_name)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to load tree-sitter grammar for %s: %s", lang_tag, exc)
        return None


# Cache loaded Language objects (loading is expensive)
_lang_cache: dict[str, Any] = {}


def get_language(lang_tag: str) -> Any:
    if lang_tag not in _lang_cache:
        _lang_cache[lang_tag] = _load_language(lang_tag)
    return _lang_cache[lang_tag]


def parse_file(path: Path, lang_tag: str) -> ParseResult:
    """Parse *path* with the tree-sitter grammar for *lang_tag*.

    Falls back gracefully if the grammar binary is unavailable.
    """
    try:
        source = path.read_bytes()
    except OSError as exc:
        return ParseResult(language=lang_tag, tree=None, source_bytes=b"", ok=False, error=str(exc))

    lang = get_language(lang_tag)
    if lang is None:
        return ParseResult(
            language=lang_tag,
            tree=None,
            source_bytes=source,
            ok=False,
            error=f"Grammar for {lang_tag!r} not available — returning empty symbol list",
        )

    try:
        from tree_sitter import Parser

        parser = Parser(lang)
        tree = parser.parse(source)
        return ParseResult(language=lang_tag, tree=tree, source_bytes=source, ok=True)
    except Exception as exc:  # noqa: BLE001
        logger.warning("tree-sitter parse error for %s (%s): %s", path, lang_tag, exc)
        return ParseResult(language=lang_tag, tree=None, source_bytes=source, ok=False, error=str(exc))


def detect_language(path: Path) -> str | None:
    """Infer the language tag from the file extension."""
    ext_map: dict[str, str] = {
        ".py": "python",
        ".ts": "typescript",
        ".tsx": "tsx",
        ".js": "javascript",
        ".jsx": "jsx",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
        ".c": "c",
        ".cpp": "cpp",
        ".cc": "cpp",
        ".cxx": "cpp",
        ".cs": "csharp",
        ".rb": "ruby",
        ".php": "php",
    }
    return ext_map.get(path.suffix.lower())
