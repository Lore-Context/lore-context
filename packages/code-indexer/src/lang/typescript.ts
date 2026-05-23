/**
 * TypeScript / JavaScript / TSX / JSX Tier-1 extractor.
 *
 * Re-exports the walkTS logic from walker.ts as a named per-language module
 * so Lane M tests can import it directly.
 *
 * Call resolution: `obj.method()` → resolved to `ClassName.method` when the
 * class is declared in the same file (same-file only; cross-file is best-effort
 * label only, not type-inference-grade LSP resolution).
 *
 * M2 DEFERRED: Full LSP-style method-receiver-aware resolution (type inference
 * across files) is ~weeks of engineering. This module ships same-file resolution
 * only. Measured precision reported honestly in lang-tier1-precision.test.ts.
 */

import type { AstNode, ParseResult } from "../parser.js";
import type { SymbolRecord, RelationRecord, SymbolKind, RelationKind } from "../types.js";

export interface LangWalkResult {
  symbols: SymbolRecord[];
  relations: RelationRecord[];
}

// ---------------------------------------------------------------------------
// Helpers (duplicated from walker.ts to allow standalone import/testing)
// ---------------------------------------------------------------------------

function splitLines(source: string): string[] {
  return source.split("\n");
}

function extractSignature(nodeText: string): string {
  const braceIdx = nodeText.indexOf("{");
  let sig = braceIdx !== -1 ? nodeText.slice(0, braceIdx).trim() : nodeText;
  return sig.replace(/\s+/g, " ").trim().slice(0, 4096);
}

function extractDocComment(node: AstNode, source: string): string {
  const lines = splitLines(source);
  const startLine = node.startPosition.row;
  const commentLines: string[] = [];
  let i = startLine - 1;
  while (i >= 0) {
    const line = lines[i].trim();
    if (
      line.startsWith("//") ||
      line.startsWith("*") ||
      line.startsWith("/*") ||
      line.startsWith("*/")
    ) {
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
  return /^[\p{L}_$][\p{L}\p{N}_$.<>,:\s\-\[\]]*$/u.test(name) && name.length >= 1 && name.length <= 1024;
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
  /** class name → method names declared in that class (for same-file resolution) */
  classMethodMap: Map<string, Set<string>>;
}

function addSym(ctx: WalkCtx, node: AstNode, name: string, kind: SymbolKind, isExported: boolean): void {
  if (!isValidIdentifier(name)) return;
  const qname = buildQualifiedName(ctx.scopeStack, name);
  if (!isValidIdentifier(qname)) return;
  const nodeText = getNodeText(node, ctx.source);
  const signature = extractSignature(nodeText);
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

function isExported(node: AstNode): boolean {
  return node.parent?.type === "export_statement";
}

// ---------------------------------------------------------------------------
// First pass: collect class → method map for same-file call resolution
// ---------------------------------------------------------------------------

function collectClassMethods(node: AstNode, ctx: WalkCtx): void {
  if (node.type === "class_declaration" || node.type === "abstract_class_declaration") {
    const nameNode = node.childForFieldName("name");
    if (nameNode) {
      const className = nameNode.text;
      const methods = new Set<string>();
      collectMethodsInClass(node, methods);
      ctx.classMethodMap.set(className, methods);
    }
  }
  for (const child of node.namedChildren) {
    collectClassMethods(child, ctx);
  }
}

function collectMethodsInClass(node: AstNode, methods: Set<string>): void {
  if (node.type === "method_definition" || node.type === "method_signature") {
    const nameNode = node.childForFieldName("name");
    if (nameNode) methods.add(nameNode.text);
  }
  for (const child of node.namedChildren) {
    collectMethodsInClass(child, methods);
  }
}

/**
 * Resolve `obj.method(...)` call target to a qualified class method name
 * if the class is declared in the same file. Returns the original target
 * if no same-file resolution is possible.
 */
function resolveCallTarget(callTarget: string, ctx: WalkCtx): string {
  // callTarget is like "this.method" or "instance.method"
  const dotIdx = callTarget.lastIndexOf(".");
  if (dotIdx === -1) return callTarget;
  const methodName = callTarget.slice(dotIdx + 1);
  // Search all classes for this method name
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
    case "export_statement": {
      for (const child of node.namedChildren) walkNode(child, ctx);
      return;
    }
    case "function_declaration":
    case "function": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        addSym(ctx, node, nameNode.text, "function", isExported(node));
        const prev = [...ctx.scopeStack];
        ctx.scopeStack.push(nameNode.text);
        walkChildren(node, ctx);
        ctx.scopeStack = prev;
        return;
      }
      break;
    }
    case "method_definition":
    case "method_signature": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        addSym(ctx, node, nameNode.text, "method", false);
        const prev = [...ctx.scopeStack];
        ctx.scopeStack.push(nameNode.text);
        walkChildren(node, ctx);
        ctx.scopeStack = prev;
        return;
      }
      break;
    }
    case "class_declaration":
    case "abstract_class_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        addSym(ctx, node, name, "class", isExported(node));
        extractClassHeritage(node, ctx, name);
        const prev = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx);
        ctx.scopeStack = prev;
        return;
      }
      break;
    }
    case "interface_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        addSym(ctx, node, name, "interface", isExported(node));
        extractInterfaceHeritage(node, ctx, name);
        const prev = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx);
        ctx.scopeStack = prev;
        return;
      }
      break;
    }
    case "type_alias_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) addSym(ctx, node, nameNode.text, "type", isExported(node));
      return;
    }
    case "enum_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) addSym(ctx, node, nameNode.text, "enum", isExported(node));
      return;
    }
    case "lexical_declaration":
    case "variable_declaration": {
      if (ctx.scopeStack.length === 0) extractVarDeclarators(node, ctx);
      return;
    }
    case "import_statement": {
      const sourceNode = node.childForFieldName("source");
      if (sourceNode) {
        const mod = sourceNode.text.replace(/['"]/g, "");
        if (isValidIdentifier(mod)) addRel(ctx, currentScope || "module", mod, "imports");
      }
      return;
    }
    case "call_expression": {
      if (ctx.scopeStack.length > 0) {
        const funcNode = node.childForFieldName("function");
        if (funcNode) {
          let rawTarget = "";
          if (funcNode.type === "identifier") {
            rawTarget = funcNode.text;
          } else if (funcNode.type === "member_expression") {
            const obj = funcNode.childForFieldName("object");
            const prop = funcNode.childForFieldName("property");
            if (obj && prop) rawTarget = `${obj.text}.${prop.text}`;
          }
          if (rawTarget && isValidIdentifier(rawTarget)) {
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

function extractClassHeritage(node: AstNode, ctx: WalkCtx, className: string): void {
  const qname = buildQualifiedName(ctx.scopeStack, className);
  for (const child of node.namedChildren) {
    if (child.type === "class_heritage") {
      for (const clause of child.namedChildren) {
        if (clause.type === "extends_clause") {
          for (const id of clause.namedChildren) {
            if ((id.type === "identifier" || id.type === "type_identifier") && isValidIdentifier(id.text)) {
              addRel(ctx, qname, id.text, "extends");
            }
          }
        }
        if (clause.type === "implements_clause") {
          for (const id of clause.namedChildren) {
            if ((id.type === "type_identifier" || id.type === "identifier") && isValidIdentifier(id.text)) {
              addRel(ctx, qname, id.text, "implements");
            }
          }
        }
      }
    }
  }
}

function extractInterfaceHeritage(node: AstNode, ctx: WalkCtx, ifaceName: string): void {
  const qname = buildQualifiedName(ctx.scopeStack, ifaceName);
  for (const child of node.namedChildren) {
    if (child.type === "extends_type_clause" || child.type === "extends_clause") {
      for (const id of child.namedChildren) {
        if ((id.type === "type_identifier" || id.type === "identifier") && isValidIdentifier(id.text)) {
          addRel(ctx, qname, id.text, "extends");
        }
      }
    }
  }
}

function extractVarDeclarators(node: AstNode, ctx: WalkCtx): void {
  for (const child of node.namedChildren) {
    if (child.type === "variable_declarator") {
      const nameNode = child.childForFieldName("name");
      if (nameNode && nameNode.type === "identifier") {
        const declText = getNodeText(node, ctx.source);
        const kind: SymbolKind = declText.startsWith("const") ? "const" : "variable";
        addSym(ctx, node, nameNode.text, kind, false);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Extract symbols and relations from a TypeScript/JavaScript/TSX/JSX ParseResult.
 * Returns empty arrays if rootNode is null (grammar unavailable).
 */
export function walkTypescript(parseResult: ParseResult): LangWalkResult {
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
