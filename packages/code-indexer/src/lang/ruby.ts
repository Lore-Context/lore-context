/**
 * Ruby Tier-2 extractor.
 *
 * Symbols: classes, modules, methods. Call extraction: skipped.
 * Grammar: tree-sitter-ruby is NOT bundled. Install: npm install tree-sitter-ruby
 * Gap documented in LANGUAGE_COVERAGE.md.
 *
 * Precision note: Ruby's dynamic dispatch (method_missing, send, respond_to?)
 * makes call-precision <85%. Tier-2 "symbols only" target is ≥90% recall.
 */

import type { AstNode, ParseResult } from "../parser.js";
import type { SymbolRecord, RelationRecord, SymbolKind } from "../types.js";

export interface LangWalkResult {
  symbols: SymbolRecord[];
  relations: RelationRecord[];
  warning?: string;
}

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_?!]*$/.test(name) && name.length >= 1 && name.length <= 1024;
}

function splitLines(source: string): string[] {
  return source.split("\n");
}

function getNodeText(node: AstNode, source: string): string {
  const lines = splitLines(source);
  const s = node.startPosition.row;
  const e = node.endPosition.row;
  if (s === e) return lines[s]?.slice(node.startPosition.column, node.endPosition.column) ?? "";
  return lines[s]?.slice(node.startPosition.column) ?? "";
}

function buildQname(scopeStack: string[], name: string): string {
  return [...scopeStack, name].join("::").slice(0, 1024);
}

function walkRubyNode(
  node: AstNode,
  source: string,
  symbols: SymbolRecord[],
  relations: RelationRecord[],
  scopeStack: string[],
): void {
  switch (node.type) {
    case "class":
    case "module": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const kind: SymbolKind = node.type === "module" ? "module" : "class";
        const qname = buildQname(scopeStack, nameNode.text);
        // superclass
        const superclassNode = node.childForFieldName("superclass");
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
        symbols.push(sym);
        if (superclassNode && isValidIdentifier(superclassNode.text)) {
          relations.push({ src_qname: qname, dst_qname: superclassNode.text, kind: "extends" });
        }
        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkRubyNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0; scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "method":
    case "singleton_method": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        if (isValidIdentifier(name)) {
          const isExported = !name.startsWith("_");
          const nodeText = getNodeText(node, source);
          const sym: SymbolRecord = {
            name,
            qualified_name: buildQname(scopeStack, name),
            kind: "method",
            start_line: node.startPosition.row,
            end_line: node.endPosition.row,
            start_col: node.startPosition.column,
            end_col: node.endPosition.column,
            is_exported: isExported,
          };
          if (nodeText) sym.signature = nodeText.slice(0, 4096);
          symbols.push(sym);
        }
      }
      // Don't recurse into method bodies
      return;
    }
    default:
      break;
  }
  for (const child of node.namedChildren) walkRubyNode(child, source, symbols, relations, scopeStack);
}

export function walkRuby(parseResult: ParseResult): LangWalkResult {
  if (!parseResult.rootNode) {
    return {
      symbols: [],
      relations: [],
      warning: parseResult.warning ?? "Ruby grammar unavailable — install tree-sitter-ruby to enable parsing.",
    };
  }
  const symbols: SymbolRecord[] = [];
  const relations: RelationRecord[] = [];
  walkRubyNode(parseResult.rootNode, parseResult.source, symbols, relations, []);
  return { symbols, relations };
}
