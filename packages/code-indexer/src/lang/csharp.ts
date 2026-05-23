/**
 * C# Tier-2 extractor.
 *
 * Symbols: namespaces, classes, interfaces, enums, methods, properties.
 * Call extraction: skipped.
 * Grammar: tree-sitter-c-sharp is NOT bundled. Install: npm install tree-sitter-c-sharp
 * Gap documented in LANGUAGE_COVERAGE.md.
 */

import type { AstNode, ParseResult } from "../parser.js";
import type { SymbolRecord, RelationRecord, SymbolKind } from "../types.js";

export interface LangWalkResult {
  symbols: SymbolRecord[];
  relations: RelationRecord[];
  warning?: string;
}

function isValidIdentifier(name: string): boolean {
  return /^[\p{L}_@][\p{L}\p{N}_.<>]*$/u.test(name) && name.length >= 1 && name.length <= 1024;
}

function splitLines(source: string): string[] {
  return source.split("\n");
}

function extractSignature(nodeText: string): string {
  const braceIdx = nodeText.indexOf("{");
  const sig = braceIdx !== -1 ? nodeText.slice(0, braceIdx).trim() : nodeText;
  return sig.replace(/\s+/g, " ").trim().slice(0, 4096);
}

function getNodeText(node: AstNode, source: string): string {
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

function buildQname(scopeStack: string[], name: string): string {
  return [...scopeStack, name].join(".").slice(0, 1024);
}

function hasAccessModifier(node: AstNode, modifier: string): boolean {
  return node.namedChildren.some(c => c.type === "modifier" && c.text === modifier);
}

function walkCsNode(
  node: AstNode,
  source: string,
  symbols: SymbolRecord[],
  relations: RelationRecord[],
  scopeStack: string[],
): void {
  switch (node.type) {
    case "namespace_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkCsNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0; scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "class_declaration":
    case "interface_declaration":
    case "struct_declaration":
    case "enum_declaration":
    case "record_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const kindMap: Record<string, SymbolKind> = {
          class_declaration: "class",
          interface_declaration: "interface",
          struct_declaration: "type",
          enum_declaration: "enum",
          record_declaration: "class",
        };
        const kind = kindMap[node.type] ?? "class";
        const isExported = hasAccessModifier(node, "public");
        const qname = buildQname(scopeStack, nameNode.text);
        const sig = extractSignature(getNodeText(node, source));
        const sym: SymbolRecord = {
          name: nameNode.text,
          qualified_name: qname,
          kind,
          start_line: node.startPosition.row,
          end_line: node.endPosition.row,
          start_col: node.startPosition.column,
          end_col: node.endPosition.column,
          is_exported: isExported,
        };
        if (sig) sym.signature = sig;
        symbols.push(sym);
        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkCsNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0; scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "method_declaration":
    case "constructor_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const isExported = hasAccessModifier(node, "public");
        const qname = buildQname(scopeStack, nameNode.text);
        const sig = extractSignature(getNodeText(node, source));
        const sym: SymbolRecord = {
          name: nameNode.text,
          qualified_name: qname,
          kind: "method",
          start_line: node.startPosition.row,
          end_line: node.endPosition.row,
          start_col: node.startPosition.column,
          end_col: node.endPosition.column,
          is_exported: isExported,
        };
        if (sig) sym.signature = sig;
        symbols.push(sym);
        return;
      }
      break;
    }
    case "property_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const isExported = hasAccessModifier(node, "public");
        symbols.push({
          name: nameNode.text,
          qualified_name: buildQname(scopeStack, nameNode.text),
          kind: "variable",
          start_line: node.startPosition.row,
          end_line: node.endPosition.row,
          start_col: node.startPosition.column,
          end_col: node.endPosition.column,
          is_exported: isExported,
        });
        return;
      }
      break;
    }
    default:
      break;
  }
  for (const child of node.namedChildren) walkCsNode(child, source, symbols, relations, scopeStack);
}

export function walkCsharp(parseResult: ParseResult): LangWalkResult {
  if (!parseResult.rootNode) {
    return {
      symbols: [],
      relations: [],
      warning: parseResult.warning ?? "C# grammar unavailable — install tree-sitter-c-sharp to enable parsing.",
    };
  }
  const symbols: SymbolRecord[] = [];
  const relations: RelationRecord[] = [];
  walkCsNode(parseResult.rootNode, parseResult.source, symbols, relations, []);
  return { symbols, relations };
}
