/**
 * AST walker — extracts SymbolRecord[] and RelationRecord[] from a ParseResult.
 *
 * Privacy invariant: signatures contain ONLY the declaration line up to (but NOT
 * including) the opening brace `{`. Function bodies are never included.
 * doc_comment text is extracted verbatim then passed through stripSecretPatterns().
 */

import type { AstNode, ParseResult } from "./parser.js";
import { stripSecretPatterns } from "@lore-context/sdk/code-graph-types";
import type { SymbolRecord, RelationRecord, SymbolKind, RelationKind } from "@lore-context/sdk/code-graph-types";

export type { SymbolRecord, RelationRecord };

/** Output from the walker for a single parsed file. */
export interface WalkResult {
  symbols: SymbolRecord[];
  relations: RelationRecord[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split source into lines for slice operations. */
function splitLines(source: string): string[] {
  return source.split("\n");
}

/**
 * Extract the signature of a node — the declaration line(s) up to but NOT
 * including the opening body brace `{`. For Python/Go this is the `def`/`func`
 * line up to `:` or `{`.
 *
 * MUST NOT include body content. We take the node text and strip everything
 * from the first `{` onward (for TS/JS/Go) or from `:` onward (Python).
 */
function extractSignature(nodeText: string, lang: string): string {
  // Remove body: everything from `{` to end
  let sig = nodeText;

  if (lang === "python") {
    // Python: stop before the trailing `:` that opens the body. Must scan at
    // paren-depth zero because parameter annotations contain `:` characters
    // (`def f(id: int, name: str) -> User:`). Using indexOf(":") would truncate
    // at the first parameter annotation; lastIndexOf(":") works for single-line
    // headers because the body-opening `:` is always the final colon outside any
    // bracket. We scan paren/bracket depth explicitly for both robustness.
    let depth = 0;
    let bodyColon = -1;
    for (let i = 0; i < sig.length; i++) {
      const ch = sig[i];
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      else if (ch === ":" && depth === 0) bodyColon = i;
    }
    if (bodyColon !== -1) {
      sig = sig.slice(0, bodyColon).trim();
    }
  } else {
    // TS/JS/Go/etc: stop before `{`
    const braceIdx = sig.indexOf("{");
    if (braceIdx !== -1) {
      sig = sig.slice(0, braceIdx).trim();
    }
  }

  // Normalize whitespace and truncate to 4096 chars (schema max)
  return sig.replace(/\s+/g, " ").trim().slice(0, 4096);
}

/**
 * Extract leading doc comment (JSDoc / Python docstring / Go block comment)
 * for a node. Returns empty string if none found.
 */
function extractDocComment(node: AstNode, source: string, lang: string): string {
  const lines = splitLines(source);
  const startLine = node.startPosition.row;

  // Look at the previous sibling or parent's previous children for comment nodes
  // For simplicity: scan backward from startLine for comment lines
  let commentLines: string[] = [];
  let i = startLine - 1;

  while (i >= 0) {
    const line = lines[i].trim();
    if (
      line.startsWith("//") ||
      line.startsWith("*") ||
      line.startsWith("/*") ||
      line.startsWith("*/") ||
      line.startsWith("#") ||
      line.startsWith('"""') ||
      line.startsWith("'''")
    ) {
      commentLines.unshift(lines[i]);
      i--;
    } else if (line === "") {
      // Allow one blank line between comment and declaration
      if (commentLines.length === 0) break;
      i--;
    } else {
      break;
    }
  }

  const raw = commentLines.join("\n").trim();
  if (!raw) return "";

  // Pass through secret pattern strip (P7)
  return stripSecretPatterns(raw).slice(0, 16384);
}

/** Build a qualified name from the current scope stack + symbol name. */
function buildQualifiedName(scopeStack: string[], name: string): string {
  return [...scopeStack, name].join(".").slice(0, 1024);
}

/** Check if a clean identifier name is valid for the wire schema. */
function isValidIdentifier(name: string): boolean {
  return /^[\p{L}_$][\p{L}\p{N}_$.<>,:\s\-\[\]]*$/u.test(name) && name.length >= 1 && name.length <= 1024;
}

// ---------------------------------------------------------------------------
// Language-specific walkers
// ---------------------------------------------------------------------------

interface WalkContext {
  symbols: SymbolRecord[];
  relations: RelationRecord[];
  source: string;
  lang: string;
  scopeStack: string[];
  filePath?: string;
}

function getNodeText(node: AstNode, source: string): string {
  const lines = splitLines(source);
  const startLine = node.startPosition.row;
  const endLine = node.endPosition.row;
  if (startLine === endLine) {
    return lines[startLine]?.slice(node.startPosition.column, node.endPosition.column) ?? "";
  }
  const parts: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    if (i === startLine) parts.push(lines[i]?.slice(node.startPosition.column) ?? "");
    else if (i === endLine) parts.push(lines[i]?.slice(0, node.endPosition.column) ?? "");
    else parts.push(lines[i] ?? "");
  }
  return parts.join("\n");
}

function addSymbol(ctx: WalkContext, node: AstNode, name: string, kind: SymbolKind, isExported: boolean): void {
  if (!isValidIdentifier(name)) return;
  const qname = buildQualifiedName(ctx.scopeStack, name);
  if (!isValidIdentifier(qname)) return;

  const nodeText = getNodeText(node, ctx.source);
  const signature = extractSignature(nodeText, ctx.lang);
  const doc_comment = extractDocComment(node, ctx.source, ctx.lang);

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

function addRelation(ctx: WalkContext, srcQname: string, dstQname: string, kind: RelationKind): void {
  if (!isValidIdentifier(srcQname) || !isValidIdentifier(dstQname)) return;
  ctx.relations.push({ src_qname: srcQname, dst_qname: dstQname, kind });
}

// ---------------------------------------------------------------------------
// TypeScript / JavaScript walker
// ---------------------------------------------------------------------------

function walkTS(node: AstNode, ctx: WalkContext): void {
  const currentScope = ctx.scopeStack.join(".");

  switch (node.type) {
    case "export_statement": {
      // Recurse into the exported declaration
      for (const child of node.namedChildren) {
        walkTS(child, ctx);
      }
      return;
    }
    case "function_declaration":
    case "function": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = isNodeExported(node);
        addSymbol(ctx, node, name, "function", isExported);
        const prevScope = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx, walkTS);
        ctx.scopeStack = prevScope;
        return;
      }
      break;
    }
    case "method_definition":
    case "method_signature": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        addSymbol(ctx, node, name, "method", false);
        const prevScope = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx, walkTS);
        ctx.scopeStack = prevScope;
        return;
      }
      break;
    }
    case "class_declaration":
    case "abstract_class_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = isNodeExported(node);
        addSymbol(ctx, node, name, "class", isExported);
        // Extract extends/implements relations
        extractClassHeritage(node, ctx, name);
        const prevScope = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx, walkTS);
        ctx.scopeStack = prevScope;
        return;
      }
      break;
    }
    case "interface_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = isNodeExported(node);
        addSymbol(ctx, node, name, "interface", isExported);
        extractInterfaceHeritage(node, ctx, name);
        const prevScope = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx, walkTS);
        ctx.scopeStack = prevScope;
        return;
      }
      break;
    }
    case "type_alias_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = isNodeExported(node);
        addSymbol(ctx, node, name, "type", isExported);
      }
      return; // Don't recurse into type bodies
    }
    case "enum_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = isNodeExported(node);
        addSymbol(ctx, node, name, "enum", isExported);
      }
      return;
    }
    case "lexical_declaration":
    case "variable_declaration": {
      // Extract const/let/var at module scope only (not inside functions)
      if (ctx.scopeStack.length === 0) {
        extractVariableDeclarators(node, ctx);
      }
      // Don't recurse — we don't want to extract inner call expressions as relations
      // from variable initializers (that would expose value context)
      return;
    }
    case "import_statement": {
      extractImportRelations(node, ctx, currentScope || "module");
      return;
    }
    case "call_expression": {
      // Only at top level or inside function/method (not in variable initializers at module scope)
      if (ctx.scopeStack.length > 0) {
        extractCallRelation(node, ctx, currentScope);
      }
      break;
    }
    default:
      break;
  }

  walkChildren(node, ctx, walkTS);
}

function walkChildren(node: AstNode, ctx: WalkContext, walker: (n: AstNode, ctx: WalkContext) => void): void {
  for (const child of node.namedChildren) {
    walker(child, ctx);
  }
}

function isNodeExported(node: AstNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  return parent.type === "export_statement";
}

function extractClassHeritage(node: AstNode, ctx: WalkContext, className: string): void {
  const qname = buildQualifiedName(ctx.scopeStack, className);
  for (const child of node.namedChildren) {
    if (child.type === "class_heritage") {
      for (const clause of child.namedChildren) {
        if (clause.type === "extends_clause") {
          for (const id of clause.namedChildren) {
            if (id.type === "identifier" || id.type === "type_identifier") {
              if (isValidIdentifier(id.text)) {
                addRelation(ctx, qname, id.text, "extends");
              }
            }
          }
        }
        if (clause.type === "implements_clause") {
          for (const id of clause.namedChildren) {
            if (id.type === "type_identifier" || id.type === "identifier") {
              if (isValidIdentifier(id.text)) {
                addRelation(ctx, qname, id.text, "implements");
              }
            }
          }
        }
      }
    }
  }
}

function extractInterfaceHeritage(node: AstNode, ctx: WalkContext, ifaceName: string): void {
  const qname = buildQualifiedName(ctx.scopeStack, ifaceName);
  for (const child of node.namedChildren) {
    if (child.type === "extends_type_clause" || child.type === "extends_clause") {
      for (const id of child.namedChildren) {
        if (id.type === "type_identifier" || id.type === "identifier") {
          if (isValidIdentifier(id.text)) {
            addRelation(ctx, qname, id.text, "extends");
          }
        }
      }
    }
  }
}

function extractVariableDeclarators(node: AstNode, ctx: WalkContext): void {
  for (const child of node.namedChildren) {
    if (child.type === "variable_declarator") {
      const nameNode = child.childForFieldName("name");
      if (nameNode && (nameNode.type === "identifier")) {
        const name = nameNode.text;
        // Determine kind: const vs variable
        const declText = getNodeText(node, ctx.source);
        const kind: SymbolKind = declText.startsWith("const") ? "const" : "variable";
        addSymbol(ctx, node, name, kind, false);
      }
    }
  }
}

function extractImportRelations(node: AstNode, ctx: WalkContext, srcScope: string): void {
  // Get the module specifier (source path)
  const sourceNode = node.childForFieldName("source");
  if (!sourceNode) return;
  const moduleSpec = sourceNode.text.replace(/['"]/g, "");
  if (!isValidIdentifier(moduleSpec)) return;

  addRelation(ctx, srcScope || "module", moduleSpec, "imports");
}

function extractCallRelation(node: AstNode, ctx: WalkContext, srcScope: string): void {
  const funcNode = node.childForFieldName("function");
  if (!funcNode) return;

  let callTarget = "";
  if (funcNode.type === "identifier") {
    callTarget = funcNode.text;
  } else if (funcNode.type === "member_expression") {
    const obj = funcNode.childForFieldName("object");
    const prop = funcNode.childForFieldName("property");
    if (obj && prop) {
      callTarget = `${obj.text}.${prop.text}`;
    }
  }

  if (callTarget && isValidIdentifier(callTarget) && isValidIdentifier(srcScope)) {
    addRelation(ctx, srcScope, callTarget, "calls");
  }
}

// ---------------------------------------------------------------------------
// Python walker
// ---------------------------------------------------------------------------

function walkPython(node: AstNode, ctx: WalkContext): void {
  switch (node.type) {
    case "function_definition": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = !name.startsWith("_");
        addSymbol(ctx, node, name, "function", isExported);
        const prevScope = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx, walkPython);
        ctx.scopeStack = prevScope;
        return;
      }
      break;
    }
    case "class_definition": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = !name.startsWith("_");
        addSymbol(ctx, node, name, "class", isExported);
        // Extract base classes
        const argsNode = node.childForFieldName("superclasses");
        if (argsNode) {
          const qname = buildQualifiedName(ctx.scopeStack, name);
          for (const child of argsNode.namedChildren) {
            if (child.type === "identifier" && isValidIdentifier(child.text)) {
              addRelation(ctx, qname, child.text, "extends");
            }
          }
        }
        const prevScope = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx, walkPython);
        ctx.scopeStack = prevScope;
        return;
      }
      break;
    }
    case "import_statement":
    case "import_from_statement": {
      extractPythonImport(node, ctx);
      return;
    }
    case "call": {
      if (ctx.scopeStack.length > 0) {
        const funcNode = node.childForFieldName("function");
        if (funcNode) {
          const currentScope = ctx.scopeStack.join(".");
          const callTarget = funcNode.text;
          if (isValidIdentifier(callTarget) && isValidIdentifier(currentScope)) {
            addRelation(ctx, currentScope, callTarget, "calls");
          }
        }
      }
      break;
    }
    default:
      break;
  }
  walkChildren(node, ctx, walkPython);
}

function extractPythonImport(node: AstNode, ctx: WalkContext): void {
  const srcScope = ctx.scopeStack.join(".") || "module";
  for (const child of node.namedChildren) {
    if (child.type === "dotted_name" || child.type === "identifier") {
      const target = child.text;
      if (isValidIdentifier(target) && isValidIdentifier(srcScope)) {
        addRelation(ctx, srcScope, target, "imports");
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Go walker
// ---------------------------------------------------------------------------

function walkGo(node: AstNode, ctx: WalkContext): void {
  switch (node.type) {
    case "function_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = /^[A-Z]/.test(name);
        addSymbol(ctx, node, name, "function", isExported);
        const prevScope = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx, walkGo);
        ctx.scopeStack = prevScope;
        return;
      }
      break;
    }
    case "method_declaration": {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const isExported = /^[A-Z]/.test(name);
        addSymbol(ctx, node, name, "method", isExported);
        const prevScope = [...ctx.scopeStack];
        ctx.scopeStack.push(name);
        walkChildren(node, ctx, walkGo);
        ctx.scopeStack = prevScope;
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
            addSymbol(ctx, child, name, kind, isExported);
          }
        }
      }
      return;
    }
    case "import_declaration": {
      const srcScope = ctx.scopeStack.join(".") || "module";
      for (const child of node.namedChildren) {
        if (child.type === "import_spec_list") {
          for (const spec of child.namedChildren) {
            if (spec.type === "import_spec") {
              const pathNode = spec.childForFieldName("path");
              if (pathNode) {
                const target = pathNode.text.replace(/['"]/g, "");
                if (isValidIdentifier(target) && isValidIdentifier(srcScope)) {
                  addRelation(ctx, srcScope, target, "imports");
                }
              }
            }
          }
        }
      }
      return;
    }
    case "call_expression": {
      if (ctx.scopeStack.length > 0) {
        const funcNode = node.childForFieldName("function");
        if (funcNode) {
          const currentScope = ctx.scopeStack.join(".");
          const callTarget = funcNode.text;
          if (isValidIdentifier(callTarget) && isValidIdentifier(currentScope)) {
            addRelation(ctx, currentScope, callTarget, "calls");
          }
        }
      }
      break;
    }
    default:
      break;
  }
  walkChildren(node, ctx, walkGo);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk a ParseResult and extract SymbolRecord[] + RelationRecord[].
 * Returns empty arrays when parseResult.rootNode is null (missing grammar fallback).
 */
export function walkAST(parseResult: ParseResult): WalkResult {
  if (!parseResult.rootNode) {
    return { symbols: [], relations: [] };
  }

  const ctx: WalkContext = {
    symbols: [],
    relations: [],
    source: parseResult.source,
    lang: parseResult.language,
    scopeStack: [],
  };

  const lang = parseResult.language;

  if (lang === "typescript" || lang === "javascript" || lang === "tsx" || lang === "jsx") {
    walkTS(parseResult.rootNode, ctx);
  } else if (lang === "python") {
    walkPython(parseResult.rootNode, ctx);
  } else if (lang === "go") {
    walkGo(parseResult.rootNode, ctx);
  }
  // Tier-2 languages: rootNode will be null (grammar not loaded), so we never reach here.
  // If they somehow reach here with a rootNode, return empty (safe fallback).

  return { symbols: ctx.symbols, relations: ctx.relations };
}
