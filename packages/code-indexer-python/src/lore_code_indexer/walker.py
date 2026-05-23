"""
Symbol + relation extractor.

Walks a tree-sitter parse tree and emits ``SymbolRecord`` and
``RelationRecord`` objects suitable for inclusion in a ``FilePayload``.

Signature rule (K5 invariant): signatures MUST NOT include the function body.
Only the ``def`` line up to (and including) the closing ``):``, ``):`` or
``):`` is captured — never the body bytes.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .types import RelationKind, RelationRecord, SymbolKind, SymbolRecord

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# node-type → SymbolKind mapping (Python grammar node names)
# ---------------------------------------------------------------------------

_PYTHON_KIND_MAP: dict[str, SymbolKind] = {
    "function_definition": "function",
    "async_function_definition": "function",
    "class_definition": "class",
    "decorated_definition": "function",  # resolved below
}

_TS_KIND_MAP: dict[str, SymbolKind] = {
    "function_declaration": "function",
    "function": "function",
    "arrow_function": "function",
    "method_definition": "method",
    "class_declaration": "class",
    "class": "class",
    "interface_declaration": "interface",
    "type_alias_declaration": "type",
    "enum_declaration": "enum",
    "lexical_declaration": "const",
    "variable_declaration": "variable",
    "export_statement": "function",  # resolved below
}

_GO_KIND_MAP: dict[str, SymbolKind] = {
    "function_declaration": "function",
    "method_declaration": "method",
    "type_declaration": "type",
    "type_spec": "class",
    "var_declaration": "variable",
    "const_declaration": "const",
    "short_var_declaration": "variable",
}


@dataclass
class WalkResult:
    symbols: list[SymbolRecord] = field(default_factory=list)
    relations: list[RelationRecord] = field(default_factory=list)


def _node_text(node: Any, source: bytes) -> str:
    return source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")


def _first_line_text(node: Any, source: bytes) -> str:
    """Return only the first line of a node's source text."""
    text = _node_text(node, source)
    return text.split("\n", 1)[0]


def _extract_python_signature(node: Any, source: bytes) -> str:
    """Extract a Python function/class signature (def/class line only, no body)."""
    text = _node_text(node, source)
    lines = text.split("\n")
    # The signature is everything up to and including the first line that ends
    # the parameter list (contains '):' or ends with ':')
    sig_lines: list[str] = []
    paren_depth = 0
    for line in lines:
        sig_lines.append(line)
        paren_depth += line.count("(") - line.count(")")
        if paren_depth <= 0 and line.rstrip().endswith(":"):
            break
        if len(sig_lines) > 20:
            # Safety valve: signature shouldn't span >20 lines
            break
    return "\n".join(sig_lines)


def _extract_docstring(node: Any, source: bytes) -> str | None:
    """Extract the leading docstring from a Python function/class node, if any."""
    try:
        body = None
        for child in node.children:
            if child.type == "block":
                body = child
                break
        if body is None:
            return None
        for child in body.children:
            if child.type == "expression_statement":
                for sub in child.children:
                    if sub.type == "string":
                        raw = _node_text(sub, source)
                        # Strip surrounding quotes
                        for q in ('"""', "'''", '"', "'"):
                            if raw.startswith(q) and raw.endswith(q) and len(raw) > 2 * len(q):
                                return raw[len(q) : -len(q)]
                        return raw
            break  # Only check the first statement
    except Exception:  # noqa: BLE001
        pass
    return None


def _is_exported_python(node: Any) -> bool:
    """Python has no export keyword; treat names not starting with _ as exported."""
    return True  # resolved by caller based on name


def _walk_python(tree: Any, source: bytes, file_qname_prefix: str) -> WalkResult:
    result = WalkResult()
    import_targets: list[str] = []

    def visit(node: Any, class_stack: list[str]) -> None:
        ntype = node.type

        if ntype in ("import_statement", "import_from_statement"):
            # Collect imports as relation targets
            for child in node.children:
                if child.type in ("dotted_name", "aliased_import"):
                    import_targets.append(_node_text(child, source).split(" as ")[0].strip())
            for child in node.children:
                visit(child, class_stack)
            return

        if ntype in ("function_definition", "async_function_definition", "class_definition"):
            # Extract name
            name_node = next((c for c in node.children if c.type == "identifier"), None)
            if name_node is None:
                for child in node.children:
                    visit(child, class_stack)
                return

            name = _node_text(name_node, source)
            kind: SymbolKind = "class" if ntype == "class_definition" else "function"
            if class_stack:
                kind = "method" if kind == "function" else "class"
                qname = ".".join(class_stack + [name])
            else:
                qname = f"{file_qname_prefix}.{name}" if file_qname_prefix else name

            sig = _extract_python_signature(node, source)
            doc = _extract_docstring(node, source)

            is_exported = not name.startswith("_")

            try:
                result.symbols.append(
                    SymbolRecord(
                        name=name,
                        qualified_name=qname,
                        kind=kind,
                        signature=sig[:4096] if sig else None,
                        doc_comment=doc[:16384] if doc else None,
                        start_line=node.start_point[0],
                        end_line=node.end_point[0],
                        start_col=node.start_point[1],
                        end_col=node.end_point[1],
                        is_exported=is_exported,
                    )
                )
            except Exception as exc:  # noqa: BLE001
                logger.debug("Skipping symbol %r: %s", name, exc)

            new_stack = class_stack + [name] if ntype == "class_definition" else class_stack
            for child in node.children:
                visit(child, new_stack)
            return

        for child in node.children:
            visit(child, class_stack)

    visit(tree.root_node, [])

    # Emit import relations for the first symbol in the file (module-level)
    if result.symbols and import_targets:
        for target in import_targets:
            try:
                result.relations.append(
                    RelationRecord(
                        src_qname=result.symbols[0].qualified_name,
                        dst_qname=target.replace("-", "_"),
                        kind="imports",
                    )
                )
            except Exception:  # noqa: BLE001
                pass

    return result


def walk(
    tree: Any,
    source: bytes,
    language: str,
    file_relative_path: str,
) -> WalkResult:
    """Walk *tree* and return all symbols + relations found.

    Falls back to an empty result for unsupported grammars.
    """
    # Derive a module-level qualified-name prefix from the file path
    from pathlib import Path as _Path

    stem = _Path(file_relative_path).stem.replace("-", "_").replace(" ", "_")

    if language == "python":
        return _walk_python(tree, source, stem)
    # For other grammars (TS, Go, etc.) we return an empty result until
    # those walkers are implemented — graceful fallback.
    logger.debug("Walker not implemented for language %r — returning empty result", language)
    return WalkResult()
