/**
 * Java Tier-2 extractor.
 *
 * Symbols only: classes, interfaces, enums, methods, constructors.
 * Call extraction is best-effort. If tree-sitter-java grammar binary is
 * unavailable, returns empty symbol list with a warning.
 *
 * Grammar binary status: tree-sitter-java is NOT bundled in this package's
 * dependencies. Install separately: npm install tree-sitter-java
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
  return /^[\p{L}_$][\p{L}\p{N}_$.<>]*$/u.test(name) && name.length >= 1 && name.length <= 1024;
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

function buildQualifiedName(scopeStack: string[], name: string): string {
  return [...scopeStack, name].join(".").slice(0, 1024);
}

function hasModifier(node: AstNode, modifier: string): boolean {
  return node.namedChildren.some(
    c => c.type === "modifiers" && c.namedChildren.some(m => m.text === modifier)
  );
}

function walkJavaNode(
  node: AstNode,
  source: string,
  symbols: SymbolRecord[],
  relations: RelationRecord[],
  scopeStack: string[],
): void {
  switch (node.type) {
    case "class_declaration":
    case "interface_declaration":
    case "enum_declaration":
    case "annotation_type_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const kindMap: Record<string, SymbolKind> = {
          class_declaration: "class",
          interface_declaration: "interface",
          enum_declaration: "enum",
          annotation_type_declaration: "interface",
        };
        const kind = kindMap[node.type] ?? "class";
        const isExported = hasModifier(node, "public");
        const qname = buildQualifiedName(scopeStack, nameNode.text);
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

        // Extract superclass / interfaces
        const superclassNode = node.childForFieldName("superclass");
        if (superclassNode) {
          const superName = superclassNode.text.replace(/^extends\s+/, "").trim();
          if (isValidIdentifier(superName) && isValidIdentifier(qname)) {
            relations.push({ src_qname: qname, dst_qname: superName, kind: "extends" });
          }
        }
        const ifaceNode = node.childForFieldName("interfaces");
        if (ifaceNode) {
          for (const child of ifaceNode.namedChildren) {
            if (child.type === "type_identifier" || child.type === "identifier") {
              const ifName = child.text.trim();
              if (isValidIdentifier(ifName) && isValidIdentifier(qname)) {
                relations.push({ src_qname: qname, dst_qname: ifName, kind: "implements" });
              }
            }
          }
        }

        const prev = [...scopeStack];
        scopeStack.push(nameNode.text);
        for (const child of node.namedChildren) walkJavaNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0;
        scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "method_declaration":
    case "constructor_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isValidIdentifier(nameNode.text)) {
        const isExported = hasModifier(node, "public");
        const kind: SymbolKind = node.type === "constructor_declaration" ? "method" : "method";
        const qname = buildQualifiedName(scopeStack, nameNode.text);
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
        for (const child of node.namedChildren) walkJavaNode(child, source, symbols, relations, scopeStack);
        scopeStack.length = 0;
        scopeStack.push(...prev);
        return;
      }
      break;
    }
    case "import_declaration": {
      // import com.example.ClassName;
      const pathNode = node.namedChildren.find(c => c.type === "scoped_identifier" || c.type === "identifier");
      if (pathNode) {
        const target = pathNode.text;
        const src = scopeStack.join(".") || "module";
        if (isValidIdentifier(target) && isValidIdentifier(src)) {
          relations.push({ src_qname: src, dst_qname: target, kind: "imports" });
        }
      }
      return;
    }
    default:
      break;
  }
  for (const child of node.namedChildren) {
    walkJavaNode(child, source, symbols, relations, scopeStack);
  }
}

/**
 * Extract symbols from a Java ParseResult.
 * Returns empty arrays with warning if rootNode is null.
 */
export function walkJava(parseResult: ParseResult): LangWalkResult {
  if (!parseResult.rootNode) {
    return {
      symbols: [],
      relations: [],
      warning: parseResult.warning ?? "Java grammar unavailable — install tree-sitter-java to enable parsing.",
    };
  }
  const symbols: SymbolRecord[] = [];
  const relations: RelationRecord[] = [];
  walkJavaNode(parseResult.rootNode, parseResult.source, symbols, relations, []);
  return { symbols, relations };
}
