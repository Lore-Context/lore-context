/**
 * Go Tier-1 extractor.
 *
 * Extracts: functions, methods, type declarations (struct/interface), imports.
 * Package-aware: same-package symbol resolution — exported symbols (starting
 * with uppercase) are marked is_exported=true per Go convention.
 *
 * Call resolution: same-package function/method calls resolved when target is
 * declared in the same file. Cross-package is best-effort (raw call target kept).
 *
 * M2 note: Full LSP-style receiver-type resolution is DEFERRED (v2.0.4.1).
 */

import type { AstNode, ParseResult } from "../parser.js";
import type { SymbolRecord, RelationRecord, SymbolKind, RelationKind } from "../types.js";

export interface LangWalkResult {
  symbols: SymbolRecord[];
  relations: RelationRecord[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitLines(source: string): string[] {
  return source.split("\n");
}

function extractGoSignature(nodeText: string): string {
  const braceIdx = nodeText.indexOf("{");
  const sig = braceIdx !== -1 ? nodeText.slice(0, braceIdx).trim() : nodeText;
  return sig.replace(/\s+/g, " ").trim().slice(0, 4096);
}

function extractDocComment(node: AstNode, source: string): string {
  const lines = splitLines(source);
  const startLine = node.startPosition.row;
  const commentLines: string[] = [];
  let i = startLine - 1;
  while (i >= 0) {
    const line = lines[i].trim();
    if (line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) {
      commentLines.unshift(lines[i]);
      i--;
    } else if (line === "") {
      if (commentLines.length === 0) break;
      i--;
    } else {
      break;
    }
  }
  return commentLines.join("\n").trim().slice(0, 16384);
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

function isValidIdentifier(name: string): boolean {
  return /^[\p{L}_][\p{L}\p{N}_.<>/]*$/u.test(name) && name.length >= 1 && name.length <= 1024;
}

function buildQualifiedName(scopeStack: string[], name: string): string {
  return [...scopeStack, name].join(".").slice(0, 1024);
}

// ---------------------------------------------------------------------------
// Walk context
// ---------------------------------------------------------------------------

interface WalkCtx {
  symbols: SymbolRecord[];
  relations: RelationRecord[];
  source: string;
  scopeStack: string[];
  packageName: string;
  /** function/method names declared in this file for same-package resolution */
  declaredFuncs: Set<string>;
}

function addSym(ctx: WalkCtx, node: AstNode, name: string, kind: SymbolKind, isExported: boolean): void {
  if (!isValidIdentifier(name)) return;
  const qname = buildQualifiedName(ctx.scopeStack, name);
  if (!isValidIdentifier(qname)) return;
  const nodeText = getNodeText(node, ctx.source);
  const signature = extractGoSignature(nodeText);
  const doc_comment = extractDocComment(node, ctx.source);
  const sym: SymbolRecord = {
    name,
    qualified_name: qname,
    kind,
    start_line: node.startPosition.row,
    end_line: node.endPosition.row,
    start_col: node.startPosition.column,
    end_col: node.endPosition.column,
    is_exported: isExported,
  };
  if (signature) sym.signature = signature;
  if (doc_comment) sym.doc_comment = doc_comment;
  ctx.symbols.push(sym);
}

function addRel(ctx: WalkCtx, src: string, dst: string, kind: RelationKind): void {
  if (!isValidIdentifier(src) || !isValidIdentifier(dst)) return;
  ctx.relations.push({ src_qname: src, dst_qname: dst, kind });
}

// ---------------------------------------------------------------------------
// First pass: collect package name and all declared function/method names
// ---------------------------------------------------------------------------

function collectDeclarations(node: AstNode, ctx: WalkCtx): void {
  if (node.type === "package_clause") {
    const nameNode = node.namedChildren[0];
    if (nameNode) ctx.packageName = nameNode.text;
  }
  if (node.type === "function_declaration" || node.type === "method_declaration") {
    const nameNode = node.childForFieldName("name");
    if (nameNode) ctx.declaredFuncs.add(nameNode.text);
  }
  for (const child of node.namedChildren) {
    collectDeclarations(child, ctx);
  }
}

function resolveCallTarget(callTarget: string, ctx: WalkCtx): string {
  // If it's a dotted call like "pkg.Func", keep as-is
  if (callTarget.includes(".")) return callTarget;
  // If it matches a same-file declaration, qualify with package name
  if (ctx.packageName && ctx.declaredFuncs.has(callTarget)) {
    return `${ctx.packageName}.${callTarget}`;
  }
  return callTarget;
}

// ---------------------------------------------------------------------------
// Main walker
// ---------------------------------------------------------------------------

function walkChildren(node: AstNode, ctx: WalkCtx): void {
  for (const child of node.namedChildren) {
    walkNode(child, ctx);
  }
}

function walkNode(node: AstNode, ctx: WalkCtx): void {
  const currentScope = ctx.scopeStack.join(".");

  switch (node.type) {
    case "package_clause":
      // Already handled in first pass; skip
      return;

    case "function_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = /^[A-Z]/.test(name);
        addSym(ctx, node, name, "function", isExported);
        const prev = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx);
        ctx.scopeStack = prev;
        return;
      }
      break;
    }
    case "method_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = /^[A-Z]/.test(name);
        // Extract receiver type for qualified name
        const receiverNode = node.childForFieldName("receiver");
        let receiverType = "";
        if (receiverNode) {
          // receiver is like (r *MyType) — find the type name
          for (const child of receiverNode.namedChildren) {
            if (child.type === "parameter_declaration") {
              const typeNode = child.childForFieldName("type");
              if (typeNode) {
                receiverType = typeNode.text.replace(/^\*/, "").trim();
              }
            }
          }
        }
        const qualifiedMethodName = receiverType ? `${receiverType}.${name}` : name;
        if (!isValidIdentifier(qualifiedMethodName)) break;

        const qname = buildQualifiedName(ctx.scopeStack, qualifiedMethodName);
        const nodeText = getNodeText(node, ctx.source);
        const signature = extractGoSignature(nodeText);
        const doc_comment = extractDocComment(node, ctx.source);
        const sym: SymbolRecord = {
          name: qualifiedMethodName,
          qualified_name: qname,
          kind: "method",
          start_line: node.startPosition.row,
          end_line: node.endPosition.row,
          start_col: node.startPosition.column,
          end_col: node.endPosition.column,
          is_exported: isExported,
        };
        if (signature) sym.signature = signature;
        if (doc_comment) sym.doc_comment = doc_comment;
        ctx.symbols.push(sym);

        const prev = [...ctx.scopeStack];
        ctx.scopeStack.push(qualifiedMethodName);
        walkChildren(node, ctx);
        ctx.scopeStack = prev;
        return;
      }
      break;
    }
    case "type_declaration": {
      for (const child of node.namedChildren) {
        if (child.type === "type_spec") {
          const nameNode = child.childForFieldName("name");
          if (nameNode) {
            const name = nameNode.text;
            const isExported = /^[A-Z]/.test(name);
            const typeNode = child.childForFieldName("type");
            const kind: SymbolKind = typeNode?.type === "interface_type" ? "interface" : "type";
            addSym(ctx, child, name, kind, isExported);
          }
        }
      }
      return;
    }
    case "import_declaration": {
      const src = currentScope || ctx.packageName || "module";
      for (const child of node.namedChildren) {
        if (child.type === "import_spec_list") {
          for (const spec of child.namedChildren) {
            if (spec.type === "import_spec") {
              const pathNode = spec.childForFieldName("path");
              if (pathNode) {
                const target = pathNode.text.replace(/['"]/g, "");
                if (isValidIdentifier(target)) addRel(ctx, src, target, "imports");
              }
            }
          }
        } else if (child.type === "import_spec") {
          const pathNode = child.childForFieldName("path");
          if (pathNode) {
            const target = pathNode.text.replace(/['"]/g, "");
            if (isValidIdentifier(target)) addRel(ctx, src, target, "imports");
          }
        }
      }
      return;
    }
    case "call_expression": {
      if (ctx.scopeStack.length > 0) {
        const funcNode = node.childForFieldName("function");
        if (funcNode) {
          const rawTarget = funcNode.text;
          if (isValidIdentifier(rawTarget)) {
            const resolved = resolveCallTarget(rawTarget, ctx);
            addRel(ctx, currentScope, resolved, "calls");
          }
        }
      }
      break;
    }
    default:
      break;
  }
  walkChildren(node, ctx);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Extract symbols and relations from a Go ParseResult.
 * Returns empty arrays if rootNode is null (grammar unavailable).
 */
export function walkGo(parseResult: ParseResult): LangWalkResult {
  if (!parseResult.rootNode) return { symbols: [], relations: [] };

  const ctx: WalkCtx = {
    symbols: [],
    relations: [],
    source: parseResult.source,
    scopeStack: [],
    packageName: "",
    declaredFuncs: new Set(),
  };

  // First pass: collect package name and declared function names
  collectDeclarations(parseResult.rootNode, ctx);

  // Second pass: walk full AST
  walkNode(parseResult.rootNode, ctx);

  return { symbols: ctx.symbols, relations: ctx.relations };
}
