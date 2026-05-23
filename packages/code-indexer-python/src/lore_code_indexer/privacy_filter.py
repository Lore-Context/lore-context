"""
Privacy filter (Lane K K5 / Lane P P7).

Implements the client-side privacy enforcement layer. Only structural metadata
leaves the client — function bodies, string literals, variable values, and
in-body comments are never included in the wire payload.

Allowlist (what MAY leave the client):
  - Symbol names, qualified names
  - Function signatures (def line only, no body)
  - Doc comments (with secret-pattern stripping via P7 denylist)
  - Relative file paths + line/col ranges
  - Relations (A calls B, A imports B, …)
  - content_hash / ast_hash (hashes, never file contents)

Denylist (what MUST NOT leave the client):
  - Function bodies, string literals, variable values/initializers
  - In-body comments
  - Files matching .gitignore (always honored)
  - Hard-coded filename denylist (*.env, *.pem, *.key, etc.)
  - Files >500 KB
"""

from __future__ import annotations

import datetime
import hashlib
import logging
import re
from pathlib import Path
from typing import Sequence

from .parser import ParseResult, detect_language, parse_file
from .types import FilePayload, strip_secret_patterns
from .walker import walk

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# File-level denylist (hard-coded, not user-configurable)
# ---------------------------------------------------------------------------

_DENIED_SUFFIXES: frozenset[str] = frozenset(
    {
        ".env",
        ".envrc",
        ".pem",
        ".key",
        ".crt",
        ".cer",
        ".p12",
        ".pfx",
        ".p8",
    }
)

_DENIED_STEM_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^secrets?\.", re.IGNORECASE),
    re.compile(r"id_rsa", re.IGNORECASE),
    re.compile(r"credential", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"private.?key", re.IGNORECASE),
)

_MAX_FILE_BYTES = 500 * 1024  # 500 KB


def _is_denied_filename(path: Path) -> bool:
    """Return True if *path* matches any hard-coded denylist rule."""
    name = path.name.lower()
    suffix = path.suffix.lower()

    if suffix in _DENIED_SUFFIXES:
        return True

    for pattern in _DENIED_STEM_PATTERNS:
        if pattern.search(name):
            return True

    return False


# ---------------------------------------------------------------------------
# .gitignore support
# ---------------------------------------------------------------------------

def _load_gitignore_patterns(repo_root: Path) -> list[re.Pattern[str]]:
    """Parse top-level .gitignore and return compiled regex patterns."""
    gitignore = repo_root / ".gitignore"
    if not gitignore.exists():
        return []
    patterns: list[re.Pattern[str]] = []
    try:
        for raw_line in gitignore.read_text(encoding="utf-8", errors="replace").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            # Convert basic glob to regex (simplified)
            pat = re.escape(line).replace(r"\*\*", ".*").replace(r"\*", "[^/]*").replace(r"\?", ".")
            if not pat.startswith("/"):
                pat = "(?:^|.*/)?" + pat
            else:
                pat = pat.lstrip("/")
            patterns.append(re.compile(pat + r"(?:/.*)?$"))
    except Exception as exc:  # noqa: BLE001
        logger.debug("Could not parse .gitignore: %s", exc)
    return patterns


def _is_gitignored(relative_path: str, patterns: list[re.Pattern[str]]) -> bool:
    for pat in patterns:
        if pat.search(relative_path):
            return True
    return False


# ---------------------------------------------------------------------------
# Hashing helpers
# ---------------------------------------------------------------------------

def _xxhash_hex(data: bytes) -> str:
    """Return a 16-character hex digest using xxhash if available, else sha256."""
    try:
        import xxhash  # type: ignore[import]
        return xxhash.xxh3_64(data).hexdigest()
    except ImportError:
        return hashlib.sha256(data).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def filter_file(
    path: Path,
    repo_root: Path,
    gitignore_patterns: list[re.Pattern[str]] | None = None,
) -> FilePayload | None:
    """Process one source file and return a ``FilePayload``, or ``None`` to skip.

    Returns ``None`` when the file should be excluded (gitignored, denied
    filename, too large, unsupported language, or parse failure without
    graceful partial result).
    """
    if gitignore_patterns is None:
        gitignore_patterns = []

    # --- size gate ---
    try:
        size = path.stat().st_size
    except OSError:
        return None

    if size > _MAX_FILE_BYTES:
        logger.debug("Skipping %s: exceeds 500 KB (%d bytes)", path, size)
        return None

    # --- filename denylist ---
    if _is_denied_filename(path):
        logger.debug("Skipping %s: matched filename denylist", path)
        return None

    # --- gitignore ---
    try:
        rel = path.relative_to(repo_root).as_posix()
    except ValueError:
        rel = path.name

    if _is_gitignored(rel, gitignore_patterns):
        logger.debug("Skipping %s: gitignored", path)
        return None

    # --- language detection ---
    lang = detect_language(path)
    if lang is None:
        return None

    # Only proceed for languages that have a wire-format language tag
    _ALLOWED_LANG_TAGS = {
        "typescript", "javascript", "tsx", "jsx",
        "python", "go", "rust", "java", "c", "cpp",
        "csharp", "ruby", "php",
    }
    if lang not in _ALLOWED_LANG_TAGS:
        return None

    # --- parse ---
    result = parse_file(path, lang)
    source = result.source_bytes

    # --- hashes ---
    content_hash = _xxhash_hex(source)

    # AST hash: hash of the sexp if available, else same as content_hash
    if result.ok and result.tree is not None:
        try:
            sexp = result.tree.root_node.sexp()
            ast_hash = _xxhash_hex(sexp.encode() if isinstance(sexp, str) else sexp)
        except Exception:  # noqa: BLE001
            ast_hash = content_hash
    else:
        ast_hash = content_hash

    # --- symbols + relations (empty if parse failed) ---
    if result.ok and result.tree is not None:
        walk_result = walk(result.tree, source, lang, rel)
    else:
        from .walker import WalkResult
        walk_result = WalkResult()

    # --- apply P7 secret-pattern stripping to doc_comments ---
    cleaned_symbols = []
    for sym in walk_result.symbols:
        doc = sym.doc_comment
        if doc:
            doc = strip_secret_patterns(doc)
        # Rebuild with (potentially) cleaned doc_comment
        # Use model_copy to preserve strict validation
        cleaned_symbols.append(sym.model_copy(update={"doc_comment": doc or None}))

    # --- last_modified_at ---
    try:
        mtime = path.stat().st_mtime
        last_modified_at = datetime.datetime.fromtimestamp(mtime, tz=datetime.timezone.utc).isoformat()
    except OSError:
        last_modified_at = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()

    return FilePayload.model_validate(
        {
            "relative_path": rel,
            "language": lang,
            "content_hash": content_hash,
            "ast_hash": ast_hash,
            "last_modified_at": last_modified_at,
            "symbols": [s.model_dump() for s in cleaned_symbols],
            "relations": [r.model_dump() for r in walk_result.relations],
        }
    )


def filter_directory(
    repo_root: Path,
    paths: Sequence[Path] | None = None,
) -> list[FilePayload]:
    """Filter all source files under *repo_root* (or the given *paths* subset).

    Honors .gitignore automatically.
    """
    gitignore_patterns = _load_gitignore_patterns(repo_root)

    if paths is None:
        all_paths = [p for p in repo_root.rglob("*") if p.is_file()]
    else:
        all_paths = list(paths)

    payloads: list[FilePayload] = []
    for p in all_paths:
        payload = filter_file(p, repo_root, gitignore_patterns)
        if payload is not None:
            payloads.append(payload)

    return payloads
