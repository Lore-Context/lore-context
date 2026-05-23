/**
 * C++ Tier-2 extractor.
 *
 * Symbols: classes, structs, functions, methods, namespaces, enums.
 * Call extraction: skipped.
 * Grammar binary status: tree-sitter-cpp is NOT bundled. Install: npm install tree-sitter-cpp
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
  return /^[A-Za-z_:][A-Za-z0-9_:]*$/.test(name) && name.length >= 1 && name.length <= 1024;
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
  return [...scopeStack, name].join("::").slice(0, 1024);
}

function walkCppNode(
  node: AstNode,
  source: string,
  symbols: SymbolRecord[],
  relations: RelationRecord[],
  scopeStack: string[],
): void {
  switch (node.type) {
    case "class_specifier":
    case "struct_specifier": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const kind: SymbolKind = node.type === "class_specifier" ? "class" : "type";
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
          is_exported: true,
        };
        if (sig) sym.signature = sig;
        symbols.push(sym);
        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkCppNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0; scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "namespace_definition": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkCppNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0; scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "function_definition": {
      const declaratorNode = node.childForFieldName("declarator");
      if (declaratorNode) {
        // Could be function_declarator, pointer_declarator, etc.
        let nameNode: AstNode | null = declaratorNode;
        while (nameNode && nameNode.type !== "identifier" && nameNode.type !== "qualified_identifier") {
          nameNode = nameNode.childForFieldName("declarator") ?? nameNode.namedChildren[0] ?? null;
        }
        if (nameNode && isValidIdentifier(nameNode.text)) {
          const qname = buildQname(scopeStack, nameNode.text);
          const sig = extractSignature(getNodeText(node, source));
          const sym: SymbolRecord = {
            name: nameNode.text,
            qualified_name: qname,
            kind: scopeStack.length > 0 ? "method" : "function",
            start_line: node.startPosition.row,
            end_line: node.endPosition.row,
            start_col: node.startPosition.column,
            end_col: node.endPosition.column,
            is_exported: true,
          };
          if (sig) sym.signature = sig;
          symbols.push(sym);
        }
      }
      for (const child of node.namedChildren) walkCppNode(child, source, symbols, relations, scopeStack);
      return;
    }
    case "enum_specifier": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        symbols.push({
          name: nameNode.text,
          qualified_name: buildQname(scopeStack, nameNode.text),
          kind: "enum",
          start_line: node.startPosition.row,
          end_line: node.endPosition.row,
          start_col: node.startPosition.column,
          end_col: node.endPosition.column,
          is_exported: true,
        });
      }
      return;
    }
    default:
      break;
  }
  for (const child of node.namedChildren) walkCppNode(child, source, symbols, relations, scopeStack);
}

export function walkCpp(parseResult: ParseResult): LangWalkResult {
  if (!parseResult.rootNode) {
    return {
      symbols: [],
      relations: [],
      warning: parseResult.warning ?? "C++ grammar unavailable — install tree-sitter-cpp to enable parsing.",
    };
  }
  const symbols: SymbolRecord[] = [];
  const relations: RelationRecord[] = [];
  walkCppNode(parseResult.rootNode, parseResult.source, symbols, relations, []);
  return { symbols, relations };
}
