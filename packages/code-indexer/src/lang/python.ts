/**
 * Python Tier-1 extractor.
 *
 * Extracts: functions, methods, classes, imports.
 * Call resolution: `instance.method()` resolved to class method in same file
 * when the class is declared in the same file (same-file only).
 *
 * M2 note: Full LSP-style type-inference call resolution is DEFERRED (v2.0.4.1).
 * Precision measured honestly in lang-tier1-precision.test.ts.
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

function extractPythonSignature(nodeText: string): string {
  // Python: stop before the `:` that opens the body
  const colonIdx = nodeText.indexOf(":");
  const sig = colonIdx !== -1 ? nodeText.slice(0, colonIdx).trim() : nodeText;
  return sig.replace(/\s+/g, " ").trim().slice(0, 4096);
}

function extractDocComment(node: AstNode, source: string): string {
  const lines = splitLines(source);
  const startLine = node.startPosition.row;
  const commentLines: string[] = [];
  let i = startLine - 1;
  while (i >= 0) {
    const line = lines[i].trim();
    if (line.startsWith("#") || line.startsWith('"""') || line.startsWith("'''")) {
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
  return /^[\p{L}_][\p{L}\p{N}_.<>]*$/u.test(name) && name.length >= 1 && name.length <= 1024;
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
  /** class name → set of method names for same-file call resolution */
  classMethodMap: Map<string, Set<string>>;
}

function addSym(ctx: WalkCtx, node: AstNode, name: string, kind: SymbolKind, isExported: boolean): void {
  if (!isValidIdentifier(name)) return;
  const qname = buildQualifiedName(ctx.scopeStack, name);
  if (!isValidIdentifier(qname)) return;
  const nodeText = getNodeText(node, ctx.source);
  const signature = extractPythonSignature(nodeText);
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
// First pass: collect class → method map for same-file call resolution
// ---------------------------------------------------------------------------

function collectClassMethods(node: AstNode, ctx: WalkCtx): void {
  if (node.type === "class_definition") {
    const nameNode = node.childForFieldName("name");
    if (nameNode) {
      const methods = new Set<string>();
      collectMethodsInBody(node, methods);
      ctx.classMethodMap.set(nameNode.text, methods);
    }
  }
  for (const child of node.namedChildren) {
    collectClassMethods(child, ctx);
  }
}

function collectMethodsInBody(node: AstNode, methods: Set<string>): void {
  if (node.type === "function_definition") {
    const nameNode = node.childForFieldName("name");
    if (nameNode) methods.add(nameNode.text);
  }
  for (const child of node.namedChildren) {
    collectMethodsInBody(child, methods);
  }
}

function resolveCallTarget(callTarget: string, ctx: WalkCtx): string {
  const dotIdx = callTarget.lastIndexOf(".");
  if (dotIdx === -1) return callTarget;
  const methodName = callTarget.slice(dotIdx + 1);
  for (const [className, methods] of ctx.classMethodMap) {
    if (methods.has(methodName)) {
      return `${className}.${methodName}`;
    }
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
    case "function_definition": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        // In Python, public = not starting with _ (convention)
        const isExported = !name.startsWith("_");
        // If inside a class, kind is "method"
        const kind: SymbolKind = ctx.scopeStack.length > 0 &&
          ctx.symbols.some(s => s.name === ctx.scopeStack[ctx.scopeStack.length - 1] && s.kind === "class")
          ? "method"
          : "function";
        addSym(ctx, node, name, kind, isExported);
        const prev = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx);
        ctx.scopeStack = prev;
        return;
      }
      break;
    }
    case "class_definition": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = !name.startsWith("_");
        addSym(ctx, node, name, "class", isExported);
        // Extract base classes
        const superclasses = node.childForFieldName("superclasses");
        if (superclasses) {
          const qname = buildQualifiedName(ctx.scopeStack, name);
          for (const child of superclasses.namedChildren) {
            if (child.type === "identifier" && isValidIdentifier(child.text)) {
              addRel(ctx, qname, child.text, "extends");
            }
          }
        }
        const prev = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx);
        ctx.scopeStack = prev;
        return;
      }
      break;
    }
    case "import_statement": {
      extractPythonImport(node, ctx, currentScope || "module");
      return;
    }
    case "import_from_statement": {
      extractPythonFromImport(node, ctx, currentScope || "module");
      return;
    }
    case "call": {
      if (ctx.scopeStack.length > 0) {
        const funcNode = node.childForFieldName("function");
        if (funcNode) {
          let rawTarget = funcNode.text;
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

function extractPythonImport(node: AstNode, ctx: WalkCtx, srcScope: string): void {
  for (const child of node.namedChildren) {
    if (child.type === "dotted_name" || child.type === "identifier") {
      const target = child.text;
      if (isValidIdentifier(target)) addRel(ctx, srcScope, target, "imports");
    }
  }
}

function extractPythonFromImport(node: AstNode, ctx: WalkCtx, srcScope: string): void {
  // from X import Y — record X as the module
  const moduleNode = node.childForFieldName("module_name") ?? node.namedChildren[0];
  if (moduleNode) {
    const target = moduleNode.text;
    if (isValidIdentifier(target)) addRel(ctx, srcScope, target, "imports");
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Extract symbols and relations from a Python ParseResult.
 * Returns empty arrays if rootNode is null (grammar unavailable).
 */
export function walkPython(parseResult: ParseResult): LangWalkResult {
  if (!parseResult.rootNode) return { symbols: [], relations: [] };

  const ctx: WalkCtx = {
    symbols: [],
    relations: [],
    source: parseResult.source,
    scopeStack: [],
    classMethodMap: new Map(),
  };

  // First pass: collect class→method map for same-file call resolution
  collectClassMethods(parseResult.rootNode, ctx);

  // Second pass: walk full AST
  walkNode(parseResult.rootNode, ctx);

  return { symbols: ctx.symbols, relations: ctx.relations };
}
