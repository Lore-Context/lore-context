/**
 * PHP Tier-2 extractor.
 *
 * Symbols: classes, interfaces, traits, functions, methods. Call extraction: skipped.
 * Grammar: tree-sitter-php is NOT bundled. Install: npm install tree-sitter-php
 * Gap documented in LANGUAGE_COVERAGE.md.
 *
 * Precision note: PHP's dynamic dispatch (__call, variable variables) makes
 * call-precision low. Tier-2 target is ≥90% recall on symbols only.
 */

import type { AstNode, ParseResult } from "../parser.js";
import type { SymbolRecord, RelationRecord, SymbolKind } from "../types.js";

export interface LangWalkResult {
  symbols: SymbolRecord[];
  relations: RelationRecord[];
  warning?: string;
}

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_\\][A-Za-z0-9_\\]*$/.test(name) && name.length >= 1 && name.length <= 1024;
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
  return [...scopeStack, name].join("\\").slice(0, 1024);
}

function hasModifier(node: AstNode, modifier: string): boolean {
  return node.namedChildren.some(c => (c.type === "visibility_modifier" || c.type === "modifier") && c.text === modifier);
}

function walkPhpNode(
  node: AstNode,
  source: string,
  symbols: SymbolRecord[],
  relations: RelationRecord[],
  scopeStack: string[],
): void {
  switch (node.type) {
    case "class_declaration":
    case "interface_declaration":
    case "trait_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const kindMap: Record<string, SymbolKind> = {
          class_declaration: "class",
          interface_declaration: "interface",
          trait_declaration: "class",
        };
        const kind = kindMap[node.type] ?? "class";
        const isExported = !hasModifier(node, "private");
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

        // extends
        const extendsNode = node.childForFieldName("base_clause");
        if (extendsNode) {
          const baseNameNode = extendsNode.namedChildren.find(c => c.type === "named_type" || c.type === "name");
          if (baseNameNode && isValidIdentifier(baseNameNode.text)) {
            relations.push({ src_qname: qname, dst_qname: baseNameNode.text, kind: "extends" });
          }
        }

        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkPhpNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0; scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "function_definition":
    case "method_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const isExported = !hasModifier(node, "private");
        const kind: SymbolKind = node.type === "method_declaration" ? "method" : "function";
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
        return;
      }
      break;
    }
    case "namespace_definition":
    case "namespace_use_declaration": {
      const nameNode = node.childForFieldName("name") ?? node.namedChildren[0];
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkPhpNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0; scopeStack.push(...prev);
        return;
      }
      break;
    }
    default:
      break;
  }
  for (const child of node.namedChildren) walkPhpNode(child, source, symbols, relations, scopeStack);
}

export function walkPhp(parseResult: ParseResult): LangWalkResult {
  if (!parseResult.rootNode) {
    return {
      symbols: [],
      relations: [],
      warning: parseResult.warning ?? "PHP grammar unavailable — install tree-sitter-php to enable parsing.",
    };
  }
  const symbols: SymbolRecord[] = [];
  const relations: RelationRecord[] = [];
  walkPhpNode(parseResult.rootNode, parseResult.source, symbols, relations, []);
  return { symbols, relations };
}
