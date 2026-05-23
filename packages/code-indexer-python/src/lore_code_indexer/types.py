"""
Lore v2.0.4 — Code Knowledge Graph wire-format types (Lane K Python parity).

Pydantic v2 models mirror the TypeScript Zod schemas in
packages/sdk-typescript/code-graph-types.ts 1:1. All models use
``ConfigDict(extra='forbid')`` — equivalent to Zod's ``.strict()`` — so any
unknown field at parse time raises ``ValidationError``, enforcing the
"no function body / string literal / variable value leaves the client"
architectural invariant.

See: docs/plans/v2.0.4-plan.md §2 Lane K + Lane P
See: docs/privacy/code-graph-privacy-model.md
"""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# Enumerated kinds — mirror TS Zod z.enum([...]) literals
# ---------------------------------------------------------------------------

SymbolKind = Literal[
    "function",
    "method",
    "class",
    "interface",
    "type",
    "enum",
    "const",
    "module",
    "variable",
]

RelationKind = Literal[
    "calls",
    "imports",
    "extends",
    "implements",
    "references",
    "instantiates",
    "overrides",
]

Language = Literal[
    "typescript",
    "javascript",
    "tsx",
    "jsx",
    "python",
    "go",
    "rust",
    "java",
    "c",
    "cpp",
    "csharp",
    "ruby",
    "php",
]

# ---------------------------------------------------------------------------
# Identifier validator (mirrors TS IdentifierSchema regex)
# ---------------------------------------------------------------------------

_IDENTIFIER_RE = re.compile(
    r"^[\w_$][\w\d_$.<>,:\s\-\[\]]*$",
    re.UNICODE,
)
_HEX_DIGEST_RE = re.compile(r"^[0-9a-f]{16,64}$")


def _validate_identifier(v: str) -> str:
    if not v or len(v) > 1024:
        raise ValueError("Identifier must be 1–1024 characters")
    if not _IDENTIFIER_RE.match(v):
        raise ValueError(
            "Identifier contains characters not valid in any Tier-1/Tier-2 language"
        )
    return v


# ---------------------------------------------------------------------------
# Privacy: SECRET_PATTERN_DENYLIST + strip_secret_patterns
# Mirrors TS SECRET_PATTERN_DENYLIST / stripSecretPatterns exactly.
# ---------------------------------------------------------------------------

SECRET_PATTERN_DENYLIST: tuple[re.Pattern[str], ...] = (
    re.compile(r"sk[-_](live|test)[-_][A-Za-z0-9]{10,}"),
    re.compile(r"sk[-_](proj)[-_][A-Za-z0-9]{10,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"AIza[0-9A-Za-z_\-]{20,}"),
    re.compile(r"-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----"),
    re.compile(r"sk-ant-[A-Za-z0-9_\-]{20,}"),
    # Generic high-entropy hex secrets (32–128 chars). Heuristic only.
    re.compile(r"\b[a-f0-9]{40,128}\b", re.IGNORECASE),
)

_REDACTED_SENTINEL = "«[REDACTED:secret-pattern]»"


def strip_secret_patterns(s: str) -> str:
    """Replace every match of SECRET_PATTERN_DENYLIST with a fixed sentinel.

    Mirrors TS ``stripSecretPatterns()`` behaviour: each pattern applied in
    order; the sentinel itself is never matched by subsequent patterns.
    """
    out = s
    for pattern in SECRET_PATTERN_DENYLIST:
        out = pattern.sub(_REDACTED_SENTINEL, out)
    return out


# ---------------------------------------------------------------------------
# Wire-format models
# ---------------------------------------------------------------------------


class SymbolRecord(BaseModel):
    """A single symbol record — mirrors TS ``SymbolRecordSchema``.

    ALL string fields are validated against per-field content-type rules at
    the server (P3/P8). Any attempt to add a body/literal/value field fails
    ``extra='forbid'`` parse.
    """

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=1024)
    qualified_name: str = Field(..., min_length=1, max_length=1024)
    kind: SymbolKind
    # Function signature only — no body bytes.
    signature: str | None = Field(default=None, max_length=4096)
    # Doc-comment text — JSDoc / docstring / Doxygen.
    doc_comment: str | None = Field(default=None, max_length=16384)
    start_line: int = Field(..., ge=0)
    end_line: int = Field(..., ge=0)
    start_col: int | None = Field(default=None, ge=0)
    end_col: int | None = Field(default=None, ge=0)
    is_exported: bool
    # Structural metadata only. No raw values.
    metadata: dict[str, Any] | None = None

    @field_validator("name", "qualified_name")
    @classmethod
    def _validate_identifier_field(cls, v: str) -> str:
        return _validate_identifier(v)


class RelationRecord(BaseModel):
    """A single relation record — mirrors TS ``RelationRecordSchema``."""

    model_config = ConfigDict(extra="forbid")

    src_qname: str = Field(..., min_length=1, max_length=1024)
    dst_qname: str = Field(..., min_length=1, max_length=1024)
    kind: RelationKind
    src_file_relative_path: str | None = Field(default=None, max_length=4096)
    dst_file_relative_path: str | None = Field(default=None, max_length=4096)

    @field_validator("src_qname", "dst_qname")
    @classmethod
    def _validate_identifier_field(cls, v: str) -> str:
        return _validate_identifier(v)


class FilePayload(BaseModel):
    """Per-file payload chunk — mirrors TS ``FilePayloadSchema``."""

    model_config = ConfigDict(extra="forbid")

    relative_path: str = Field(..., min_length=1, max_length=4096)
    language: Language
    # XXH3 hex digest of the file body — NEVER the body itself.
    content_hash: str = Field(..., pattern=r"^[0-9a-f]{16,64}$")
    ast_hash: str = Field(..., pattern=r"^[0-9a-f]{16,64}$")
    last_modified_at: str  # ISO-8601 datetime string
    symbols: list[SymbolRecord]
    relations: list[RelationRecord]
    # True for deletion entries (file removed from the repo).
    deleted: bool | None = None

    @field_validator("relative_path")
    @classmethod
    def _no_absolute_path(cls, v: str) -> str:
        if v.startswith("/") or re.match(r"^[A-Za-z]:[\\]", v):
            raise ValueError("relative_path must be repo-relative, not absolute")
        return v


class _RepoMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=1024)
    primary_lang: str | None = Field(default=None, max_length=32)

    @field_validator("name")
    @classmethod
    def _validate_identifier_field(cls, v: str) -> str:
        return _validate_identifier(v)


class UpsertPayload(BaseModel):
    """Full upsert wire body — mirrors TS ``UpsertPayloadSchema``.

    This is the ONLY legal payload shape. Construct via
    ``UpsertPayload.model_validate({...})`` — Pydantic's strict mode
    (``extra='forbid'``) enforces no unknown fields.
    """

    model_config = ConfigDict(extra="forbid")

    repo: _RepoMeta
    files: list[FilePayload]
    # Lane P Tier-2 encryption envelope marker.
    e2e_encrypted: bool | None = None
