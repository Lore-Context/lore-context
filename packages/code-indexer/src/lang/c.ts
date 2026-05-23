/**
 * C Tier-2 extractor.
 *
 * Symbols only: functions, structs, enums, typedefs. Call extraction skipped.
 * If tree-sitter grammar binary is unavailable, returns empty symbol list with a warning.
 *
 * Grammar binary status: tree-sitter-c is NOT bundled. Install: npm install tree-sitter-c
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
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && name.length >= 1 && name.length <= 1024;
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

function walkCNode(
  node: AstNode,
  source: string,
  symbols: SymbolRecord[],
  relations: RelationRecord[],
): void {
  switch (node.type) {
    case "function_definition": {
      // C: function_definition -> declarator -> identifier
      const declaratorNode = node.childForFieldName("declarator");
      if (declaratorNode) {
        // Navigate through pointer_declarator if present
        let nameNode: AstNode | null = declaratorNode;
        while (nameNode && nameNode.type !== "identifier") {
          nameNode = nameNode.childForFieldName("declarator") ?? nameNode.namedChildren[0] ?? null;
        }
        if (nameNode && isValidIdentifier(nameNode.text)) {
          const sig = extractSignature(getNodeText(node, source));
          const sym: SymbolRecord = {
            name: nameNode.text,
            qualified_name: nameNode.text,
            kind: "function",
            start_line: node.startPosition.row,
            end_line: node.endPosition.row,
            start_col: node.startPosition.column,
            end_col: node.endPosition.column,
            is_exported: true, // C has no access modifier; treat as exported
          };
          if (sig) sym.signature = sig;
          symbols.push(sym);
        }
      }
      // Recurse into body for nested definitions
      for (const child of node.namedChildren) walkCNode(child, source, symbols, relations);
      return;
    }
    case "struct_specifier":
    case "union_specifier": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const kind: SymbolKind = "type";
        symbols.push({
          name: nameNode.text,
          qualified_name: nameNode.text,
          kind,
          start_line: node.startPosition.row,
          end_line: node.endPosition.row,
          start_col: node.startPosition.column,
          end_col: node.endPosition.column,
          is_exported: true,
        });
      }
      return;
    }
    case "enum_specifier": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        symbols.push({
          name: nameNode.text,
          qualified_name: nameNode.text,
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
    case "type_definition": {
      // typedef struct Foo Foo_t;
      const nameNode = node.namedChildren[node.namedChildren.length - 1];
      if (nameNode && isValidIdentifier(nameNode.text)) {
        symbols.push({
          name: nameNode.text,
          qualified_name: nameNode.text,
          kind: "type",
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
  for (const child of node.namedChildren) walkCNode(child, source, symbols, relations);
}

export function walkC(parseResult: ParseResult): LangWalkResult {
  if (!parseResult.rootNode) {
    return {
      symbols: [],
      relations: [],
      warning: parseResult.warning ?? "C grammar unavailable — install tree-sitter-c to enable parsing.",
    };
  }
  const symbols: SymbolRecord[] = [];
  const relations: RelationRecord[] = [];
  walkCNode(parseResult.rootNode, parseResult.source, symbols, relations);
  return { symbols, relations };
}
