/**
 * Rust Tier-2 extractor.
 *
 * Symbols only (functions, structs, enums, traits, impls). Call extraction
 * is best-effort and not guaranteed. If tree-sitter-rust grammar binary is
 * unavailable, returns empty symbol list with a warning (consistent with
 * parser.ts fallback pattern).
 *
 * Grammar binary status: tree-sitter-rust is NOT bundled in this package's
 * dependencies. Install it separately: npm install tree-sitter-rust
 * Gap documented in LANGUAGE_COVERAGE.md.
 */

import type { ParseResult } from "../parser.js";
import type { SymbolRecord, RelationRecord, SymbolKind } from "../types.js";

export interface LangWalkResult {
  symbols: SymbolRecord[];
  relations: RelationRecord[];
  /** Warning when grammar is unavailable. */
  warning?: string;
}

function isValidIdentifier(name: string): boolean {
  return /^[\p{L}_][\p{L}\p{N}_.<>]*$/u.test(name) && name.length >= 1 && name.length <= 1024;
}

function splitLines(source: string): string[] {
  return source.split("\n");
}

function extractSignature(nodeText: string): string {
  const braceIdx = nodeText.indexOf("{");
  const sig = braceIdx !== -1 ? nodeText.slice(0, braceIdx).trim() : nodeText;
  return sig.replace(/\s+/g, " ").trim().slice(0, 4096);
}

function getNodeText(node: import("../parser.js").AstNode, source: string): string {
  const lines = splitLines(source);
  const s = node.startPosition.row;
  const e = node.endPosition.row;
  if (s === e) return lines[s]?.slice(node.startPosition.column, node.endPosition.column) ?? "";
  const parts: string[] = [];
  for (let i = s; i <= e; i++) {
    if (i === s) parts.push(lines[i]?.slice(node.startPosition.column) ?? "");
    else if (i === e) parts.push(lines[i]?.slice(0, node.endPosition.column) ?? "");
    else parts.push(lines[i] ?? "");
  }
  return parts.join("\n");
}

function buildQualifiedName(scopeStack: string[], name: string): string {
  return [...scopeStack, name].join("::").slice(0, 1024);
}

/** Extract symbols from a Rust AST node recursively. */
function walkRustNode(
  node: import("../parser.js").AstNode,
  source: string,
  symbols: SymbolRecord[],
  relations: RelationRecord[],
  scopeStack: string[],
): void {
  switch (node.type) {
    case "function_item": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const qname = buildQualifiedName(scopeStack, nameNode.text);
        const sig = extractSignature(getNodeText(node, source));
        const sym: SymbolRecord = {
          name: nameNode.text,
          qualified_name: qname,
          kind: "function",
          start_line: node.startPosition.row,
          end_line: node.endPosition.row,
          start_col: node.startPosition.column,
          end_col: node.endPosition.column,
          is_exported: node.namedChildren.some(c => c.type === "visibility_modifier"),
        };
        if (sig) sym.signature = sig;
        symbols.push(sym);
        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkRustNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0;
        scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "struct_item":
    case "enum_item": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const kind: SymbolKind = node.type === "enum_item" ? "enum" : "type";
        const sym: SymbolRecord = {
          name: nameNode.text,
          qualified_name: buildQualifiedName(scopeStack, nameNode.text),
          kind,
          start_line: node.startPosition.row,
          end_line: node.endPosition.row,
          start_col: node.startPosition.column,
          end_col: node.endPosition.column,
          is_exported: node.namedChildren.some(c => c.type === "visibility_modifier"),
        };
        symbols.push(sym);
      }
      return;
    }
    case "trait_item": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const sym: SymbolRecord = {
          name: nameNode.text,
          qualified_name: buildQualifiedName(scopeStack, nameNode.text),
          kind: "interface",
          start_line: node.startPosition.row,
          end_line: node.endPosition.row,
          start_col: node.startPosition.column,
          end_col: node.endPosition.column,
          is_exported: node.namedChildren.some(c => c.type === "visibility_modifier"),
        };
        symbols.push(sym);
      }
      return;
    }
    case "impl_item": {
      // impl Block or impl Trait for Type — extract methods inside
      const typeNode = node.childForFieldName("type");
      const scopeName = typeNode?.text ?? "";
      if (scopeName && isValidIdentifier(scopeName)) {
        const prev = [...scopeStack];
        scopeStack.push(scopeName);
        for (const child of node.namedChildren) walkRustNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0;
        scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "mod_item": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkRustNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0;
        scopeStack.push(...prev);
        return;
      }
      break;
    }
    default:
      break;
  }
  for (const child of node.namedChildren) {
    walkRustNode(child, source, symbols, relations, scopeStack);
  }
}

/**
 * Extract symbols from a Rust ParseResult.
 * Returns empty arrays with warning if rootNode is null.
 */
export function walkRust(parseResult: ParseResult): LangWalkResult {
  if (!parseResult.rootNode) {
    return {
      symbols: [],
      relations: [],
      warning: parseResult.warning ?? "Rust grammar unavailable — install tree-sitter-rust to enable parsing.",
    };
  }
  const symbols: SymbolRecord[] = [];
  const relations: RelationRecord[] = [];
  walkRustNode(parseResult.rootNode, parseResult.source, symbols, relations, []);
  return { symbols, relations };
}
