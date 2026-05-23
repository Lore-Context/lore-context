"""
Python schema definitions — part of mixed-language fixture.
"""

from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class SymbolRecord:
    """Wire-format symbol record (mirrors TypeScript SymbolRecord)."""

    name: str
    qualified_name: str
    kind: str
    start_line: int
    end_line: int
    is_exported: bool
    signature: Optional[str] = None
    doc_comment: Optional[str] = None


@dataclass
class RelationRecord:
    """Wire-format relation record."""

    src_qname: str
    dst_qname: str
    kind: str


@dataclass
class FilePayload:
    """Payload for a single indexed file."""

    relative_path: str
    language: str
    content_hash: str
    symbols: List[SymbolRecord] = field(default_factory=list)
    relations: List[RelationRecord] = field(default_factory=list)
