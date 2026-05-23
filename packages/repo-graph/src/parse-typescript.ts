import ts from "typescript";
import type {
  ParsedCallSite,
  ParsedImport,
  ParsedRepoFile,
  ParsedRouteSite,
  ParsedTestSite,
  RepoFileNode,
  RepoSymbolKind,
  RepoSymbolNode
} from "./types.js";
import { shortHash, stableId } from "./ids.js";

const ROUTE_METHODS = new Set(["get", "post", "put", "patch", "delete", "del", "options", "head", "all"]);
const TEST_CALLEES = new Set(["it", "test"]);

export function parseTypeScriptFile(file: RepoFileNode, sourceText: string): ParsedRepoFile {
  const sourceFile = ts.createSourceFile(file.path, sourceText, ts.ScriptTarget.Latest, true, file.path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const symbols: RepoSymbolNode[] = [createSymbol(file, "module", file.path, 1, Math.max(1, sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line + 1), undefined, true, { language: file.language, repoGraphKind: "file" })];
  const imports: ParsedImport[] = [];
  const callSites: ParsedCallSite[] = [];
  const routeSites: ParsedRouteSite[] = [];
  const testSites: ParsedTestSite[] = [];
  const scopeStack: RepoSymbolNode[] = [];
  const classStack: RepoSymbolNode[] = [];

  const addSymbol = (node: ts.Node, kind: RepoSymbolKind, name: string, exported = hasExportModifier(node), metadata: Record<string, unknown> = {}): RepoSymbolNode => {
    const { startLine, endLine } = getSpan(sourceFile, node);
    const symbol = createSymbol(file, kind, name, startLine, endLine, getSignature(node, sourceText), exported, metadata);
    symbols.push(symbol);
    return symbol;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(readImport(file, sourceFile, node));
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      const symbol = addSymbol(node, "function", node.name.text);
      withScope(symbol, () => ts.forEachChild(node, visit));
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer && isFunctionLikeInitializer(declaration.initializer)) {
          const symbol = addSymbol(declaration, "function", declaration.name.text, hasExportModifier(node));
          withScope(symbol, () => ts.forEachChild(declaration, visit));
        }
      }
    }

    if (ts.isClassDeclaration(node) && node.name) {
      const symbol = addSymbol(node, "class", node.name.text);
      const parentClass = classStack[classStack.length - 1];
      if (parentClass) {
        // Nested classes are rare, but keep traversal deterministic.
      }
      classStack.push(symbol);
      withScope(symbol, () => ts.forEachChild(node, visit));
      classStack.pop();
      return;
    }

    if (ts.isMethodDeclaration(node) && node.name) {
      const classSymbol = classStack[classStack.length - 1];
      const methodName = propertyNameText(node.name);
      const symbol = addSymbol(node, "method", classSymbol ? `${classSymbol.name}.${methodName}` : methodName, hasExportModifier(node), { className: classSymbol?.name });
      withScope(symbol, () => ts.forEachChild(node, visit));
      return;
    }

    if (ts.isInterfaceDeclaration(node)) {
      addSymbol(node, "interface", node.name.text);
    }

    if (ts.isTypeAliasDeclaration(node)) {
      addSymbol(node, "type", node.name.text);
    }

    if (ts.isCallExpression(node)) {
      const route = readRouteCall(file, sourceFile, node, addSymbol);
      if (route) {
        routeSites.push(route);
      }

      const testSite = readTestCall(file, sourceFile, node, addSymbol);
      if (testSite) {
        testSites.push(testSite);
      }

      const calleeName = callExpressionName(node.expression);
      if (calleeName) {
        callSites.push({
          sourceFileId: file.id,
          sourceFilePath: file.path,
          callerSymbolId: scopeStack[scopeStack.length - 1]?.id,
          calleeName,
          startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  const withScope = (symbol: RepoSymbolNode, fn: () => void): void => {
    scopeStack.push(symbol);
    fn();
    scopeStack.pop();
  };

  visit(sourceFile);

  return { file, sourceText, symbols: dedupeSymbols(symbols), imports, callSites, routeSites, testSites };
}

function createSymbol(
  file: RepoFileNode,
  kind: RepoSymbolKind,
  name: string,
  startLine: number,
  endLine: number,
  signature: string | undefined,
  exported: boolean,
  metadata: Record<string, unknown>
): RepoSymbolNode {
  const rangeHash = shortHash(`${file.path}:${name}:${kind}:${startLine}:${endLine}`);
  return {
    id: stableId("repo", file.repoId, "symbol", `${file.path}#${name}`, kind, rangeHash),
    projectId: file.projectId,
    repoId: file.repoId,
    fileId: file.id,
    filePath: file.path,
    name,
    kind,
    startLine,
    endLine,
    signature,
    exported,
    metadata
  };
}

function readImport(file: RepoFileNode, sourceFile: ts.SourceFile, node: ts.ImportDeclaration): ParsedImport {
  const importedNames: string[] = [];
  let defaultImport: string | undefined;
  let namespaceImport: string | undefined;
  const clause = node.importClause;
  if (clause?.name) {
    defaultImport = clause.name.text;
    importedNames.push(clause.name.text);
  }
  if (clause?.namedBindings) {
    if (ts.isNamespaceImport(clause.namedBindings)) {
      namespaceImport = clause.namedBindings.name.text;
      importedNames.push(namespaceImport);
    } else {
      for (const element of clause.namedBindings.elements) {
        importedNames.push(element.name.text);
      }
    }
  }
  return {
    sourceFileId: file.id,
    sourceFilePath: file.path,
    moduleSpecifier: (node.moduleSpecifier as ts.StringLiteral).text,
    importedNames,
    defaultImport,
    namespaceImport,
    startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
  };
}

function readRouteCall(
  file: RepoFileNode,
  sourceFile: ts.SourceFile,
  node: ts.CallExpression,
  addSymbol: (node: ts.Node, kind: RepoSymbolKind, name: string, exported?: boolean, metadata?: Record<string, unknown>) => RepoSymbolNode
): ParsedRouteSite | undefined {
  if (!ts.isPropertyAccessExpression(node.expression)) {
    return undefined;
  }
  const method = node.expression.name.text.toLowerCase();
  if (!ROUTE_METHODS.has(method)) {
    return undefined;
  }
  const [routeArg, handlerArg] = node.arguments;
  if (!routeArg || !ts.isStringLiteralLike(routeArg)) {
    return undefined;
  }

  const routePath = routeArg.text;
  const routeName = `${method.toUpperCase()} ${routePath}`;
  const handlerName = handlerArg ? expressionName(handlerArg) : undefined;
  const routeSymbol = addSymbol(node, "function", routeName, false, { repoGraphKind: "route", method: method.toUpperCase(), path: routePath, handlerName });
  return {
    sourceFileId: file.id,
    sourceFilePath: file.path,
    routeSymbolId: routeSymbol.id,
    method: method.toUpperCase(),
    routePath,
    handlerName,
    startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
  };
}

function readTestCall(
  file: RepoFileNode,
  sourceFile: ts.SourceFile,
  node: ts.CallExpression,
  addSymbol: (node: ts.Node, kind: RepoSymbolKind, name: string, exported?: boolean, metadata?: Record<string, unknown>) => RepoSymbolNode
): ParsedTestSite | undefined {
  const callee = callExpressionName(node.expression);
  if (!callee || !TEST_CALLEES.has(callee)) {
    return undefined;
  }
  const [nameArg] = node.arguments;
  if (!nameArg || !ts.isStringLiteralLike(nameArg)) {
    return undefined;
  }
  const testSymbol = addSymbol(node, "function", nameArg.text, false, { repoGraphKind: "test", framework: "vitest-or-node" });
  return {
    sourceFileId: file.id,
    sourceFilePath: file.path,
    testSymbolId: testSymbol.id,
    name: nameArg.text,
    startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
  };
}

function dedupeSymbols(symbols: RepoSymbolNode[]): RepoSymbolNode[] {
  const byId = new Map<string, RepoSymbolNode>();
  for (const symbol of symbols) {
    byId.set(symbol.id, symbol);
  }
  return [...byId.values()].sort((a, b) => a.filePath.localeCompare(b.filePath) || a.startLine - b.startLine || a.name.localeCompare(b.name));
}

function getSpan(sourceFile: ts.SourceFile, node: ts.Node): { startLine: number; endLine: number } {
  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  return { startLine, endLine };
}

function hasExportModifier(node: ts.Node): boolean {
  return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function getSignature(node: ts.Node, sourceText: string): string | undefined {
  const text = sourceText.slice(node.getStart(), node.getStart() + Math.min(160, node.getWidth())).split("{")[0]?.trim();
  return text && text.length > 0 ? text : undefined;
}

function isFunctionLikeInitializer(node: ts.Expression): boolean {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

function propertyNameText(name: ts.PropertyName): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return name.getText();
}

function callExpressionName(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return undefined;
}

function expressionName(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
    return "<inline>";
  }
  return undefined;
}
