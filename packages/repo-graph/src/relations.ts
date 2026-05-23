import path from "node:path";
import type { ParsedRepoFile, RepoFileNode, RepoProcessNode, RepoRelationEdge, RepoRelationKind, RepoSymbolNode } from "./types.js";
import { shortHash, stableId } from "./ids.js";

export function buildRelations(parsedFiles: ParsedRepoFile[]): { relations: RepoRelationEdge[]; processes: RepoProcessNode[] } {
  const filesByPath = new Map(parsedFiles.map((parsed) => [parsed.file.path, parsed.file]));
  const symbols = parsedFiles.flatMap((parsed) => parsed.symbols);
  const symbolsByName = buildSymbolNameIndex(symbols);
  const fileSymbolsByPath = new Map<string, RepoSymbolNode[]>();
  for (const symbol of symbols) {
    const current = fileSymbolsByPath.get(symbol.filePath) ?? [];
    current.push(symbol);
    fileSymbolsByPath.set(symbol.filePath, current);
  }

  const relations: RepoRelationEdge[] = [];
  const processes: RepoProcessNode[] = [];

  for (const parsed of parsedFiles) {
    const fileSymbol = parsed.symbols.find(isFileSymbol);
    for (const symbol of parsed.symbols.filter((symbol) => !isFileSymbol(symbol))) {
      relations.push(createRelation(parsed.file, "references", { targetSymbol: symbol, targetFile: parsed.file, confidence: 1, metadata: { repoRelationKind: "defines" } }));
      if (fileSymbol) {
        relations.push(createRelation(parsed.file, "references", { sourceSymbol: fileSymbol, targetSymbol: symbol, sourceFile: parsed.file, targetFile: parsed.file, confidence: 1, metadata: { repoRelationKind: "contains" } }));
      }
      if (symbol.kind === "method") {
        const className = typeof symbol.metadata.className === "string" ? symbol.metadata.className : undefined;
        const classSymbol = className ? findBestSymbol(symbolsByName.get(className) ?? [], parsed.file.path, ["class"]) : undefined;
        if (classSymbol) {
          relations.push(createRelation(parsed.file, "references", { sourceSymbol: classSymbol, targetSymbol: symbol, sourceFile: parsed.file, targetFile: parsed.file, confidence: 1, metadata: { repoRelationKind: "has_method" } }));
        }
      }
    }

    for (const importSite of parsed.imports) {
      const targetFile = resolveImportTarget(importSite.sourceFilePath, importSite.moduleSpecifier, filesByPath);
      relations.push(createRelation(parsed.file, "imports", { sourceFile: parsed.file, targetFile, confidence: targetFile ? 1 : 0.5, metadata: { moduleSpecifier: importSite.moduleSpecifier, importedNames: importSite.importedNames } }));
    }

    for (const callSite of parsed.callSites) {
      const target = findBestSymbol(symbolsByName.get(callSite.calleeName) ?? [], parsed.file.path, ["function", "method", "class"]);
      if (!target || target.id === callSite.callerSymbolId) {
        continue;
      }
      const sourceSymbol = callSite.callerSymbolId ? symbols.find((symbol) => symbol.id === callSite.callerSymbolId) : undefined;
      relations.push(createRelation(parsed.file, "calls", { sourceSymbol, targetSymbol: target, sourceFile: parsed.file, targetFile: filesByPath.get(target.filePath), confidence: sourceSymbol ? 0.9 : 0.7, metadata: { calleeName: callSite.calleeName, line: callSite.startLine } }));
    }

    for (const route of parsed.routeSites) {
      const routeSymbol = symbols.find((symbol) => symbol.id === route.routeSymbolId);
      const handlerSymbol = route.handlerName ? findBestSymbol(symbolsByName.get(route.handlerName) ?? [], parsed.file.path, ["function", "method"]) : undefined;
      if (routeSymbol) {
        relations.push(createRelation(parsed.file, "references", { sourceSymbol: routeSymbol, targetSymbol: handlerSymbol, sourceFile: parsed.file, targetFile: handlerSymbol ? filesByPath.get(handlerSymbol.filePath) : parsed.file, confidence: handlerSymbol ? 0.9 : 0.6, metadata: { repoRelationKind: "handles_route", method: route.method, path: route.routePath, handlerName: route.handlerName } }));
        processes.push(createProcess(parsed.file, "route_flow", routeSymbol.name, routeSymbol, handlerSymbol, handlerSymbol ? 2 : 1, { method: route.method, path: route.routePath }));
      }
    }

    for (const test of parsed.testSites) {
      const testSymbol = symbols.find((symbol) => symbol.id === test.testSymbolId);
      if (!testSymbol) {
        continue;
      }
      const importedTargetFiles = parsed.imports
        .map((importSite) => resolveImportTarget(importSite.sourceFilePath, importSite.moduleSpecifier, filesByPath))
        .filter((file): file is RepoFileNode => Boolean(file));
      const candidateTargets = importedTargetFiles.flatMap((file) => fileSymbolsByPath.get(file.path) ?? []).filter((symbol) => !isFileSymbol(symbol));
      for (const target of candidateTargets) {
        relations.push(createRelation(parsed.file, "references", { sourceSymbol: testSymbol, targetSymbol: target, sourceFile: parsed.file, targetFile: filesByPath.get(target.filePath), confidence: 0.8, metadata: { repoRelationKind: "tests", testName: test.name } }));
      }
      processes.push(createProcess(parsed.file, "test_flow", test.name, testSymbol, candidateTargets[0], candidateTargets.length > 0 ? 2 : 1, { targetCount: candidateTargets.length }));
    }
  }

  return { relations: dedupeRelations(relations), processes: dedupeProcesses(processes) };
}

function buildSymbolNameIndex(symbols: RepoSymbolNode[]): Map<string, RepoSymbolNode[]> {
  const index = new Map<string, RepoSymbolNode[]>();
  for (const symbol of symbols) {
    const names = new Set([symbol.name, symbol.name.split(".").at(-1) ?? symbol.name]);
    for (const name of names) {
      const current = index.get(name) ?? [];
      current.push(symbol);
      index.set(name, current);
    }
  }
  return index;
}

function findBestSymbol(symbols: RepoSymbolNode[], preferredPath: string, kinds: string[]): RepoSymbolNode | undefined {
  return symbols
    .filter((symbol) => kinds.includes(symbol.kind))
    .sort((a, b) => Number(b.filePath === preferredPath) - Number(a.filePath === preferredPath) || Number(b.exported) - Number(a.exported) || a.filePath.localeCompare(b.filePath))[0];
}

function isFileSymbol(symbol: RepoSymbolNode): boolean {
  return symbol.kind === "module" && symbol.metadata.repoGraphKind === "file";
}

function resolveImportTarget(sourcePath: string, specifier: string, filesByPath: Map<string, RepoFileNode>): RepoFileNode | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }
  const sourceDir = path.posix.dirname(sourcePath);
  const base = path.posix.normalize(path.posix.join(sourceDir, specifier));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/index.jsx`];
  return candidates.map((candidate) => filesByPath.get(candidate)).find(Boolean);
}

function createRelation(
  fallbackFile: RepoFileNode,
  relationType: RepoRelationKind,
  input: {
    sourceFile?: RepoFileNode;
    targetFile?: RepoFileNode;
    sourceSymbol?: RepoSymbolNode;
    targetSymbol?: RepoSymbolNode;
    confidence: number;
    metadata?: Record<string, unknown>;
  }
): RepoRelationEdge {
  const sourceFile = input.sourceFile ?? fallbackFile;
  const metadata = input.metadata ?? {};
  const hash = shortHash(JSON.stringify({ relationType, sourceFileId: sourceFile.id, targetFileId: input.targetFile?.id, sourceSymbolId: input.sourceSymbol?.id, targetSymbolId: input.targetSymbol?.id, metadata }));
  return {
    id: stableId("repo", fallbackFile.repoId, "relation", relationType, hash),
    projectId: fallbackFile.projectId,
    repoId: fallbackFile.repoId,
    relationType,
    sourceFileId: sourceFile.id,
    targetFileId: input.targetFile?.id,
    sourceSymbolId: input.sourceSymbol?.id,
    targetSymbolId: input.targetSymbol?.id,
    confidence: input.confidence,
    metadata
  };
}

function createProcess(
  file: RepoFileNode,
  processType: RepoProcessNode["processType"],
  name: string,
  entrySymbol?: RepoSymbolNode,
  terminalSymbol?: RepoSymbolNode,
  stepCount = 1,
  metadata: Record<string, unknown> = {}
): RepoProcessNode {
  return {
    id: stableId("repo", file.repoId, "process", processType, shortHash(`${name}:${entrySymbol?.id ?? ""}:${terminalSymbol?.id ?? ""}`)),
    projectId: file.projectId,
    repoId: file.repoId,
    name,
    processType,
    entrySymbolId: entrySymbol?.id,
    terminalSymbolId: terminalSymbol?.id,
    stepCount,
    metadata
  };
}

function dedupeRelations(relations: RepoRelationEdge[]): RepoRelationEdge[] {
  return [...new Map(relations.map((relation) => [relation.id, relation])).values()].sort((a, b) => a.id.localeCompare(b.id));
}

function dedupeProcesses(processes: RepoProcessNode[]): RepoProcessNode[] {
  return [...new Map(processes.map((process) => [process.id, process])).values()].sort((a, b) => a.id.localeCompare(b.id));
}
