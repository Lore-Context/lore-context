export type RepoGraphLanguage = "typescript" | "tsx" | "javascript" | "jsx";

export type RepoSymbolKind = "function" | "method" | "class" | "interface" | "type" | "enum" | "const" | "module" | "variable";

export type RepoRelationKind = "imports" | "calls" | "extends" | "implements" | "references" | "instantiates" | "overrides";

export type RepoProcessKind = "route_flow" | "cli_flow" | "test_flow" | "worker_flow" | "module_flow";

export interface RepoIndexOptions {
  repoId: string;
  projectId: string;
  rootDir: string;
  commitSha?: string;
  maxFileSizeBytes?: number;
}

export interface RepoFileNode {
  id: string;
  projectId: string;
  repoId: string;
  path: string;
  language: RepoGraphLanguage;
  contentHash: string;
  sizeBytes: number;
  isTest: boolean;
  metadata: Record<string, unknown>;
}

export interface RepoSymbolNode {
  id: string;
  projectId: string;
  repoId: string;
  fileId: string;
  filePath: string;
  name: string;
  kind: RepoSymbolKind;
  startLine: number;
  endLine: number;
  signature?: string;
  exported: boolean;
  metadata: Record<string, unknown>;
}

export interface RepoRelationEdge {
  id: string;
  projectId: string;
  repoId: string;
  relationType: RepoRelationKind;
  sourceFileId?: string;
  targetFileId?: string;
  sourceSymbolId?: string;
  targetSymbolId?: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface RepoProcessNode {
  id: string;
  projectId: string;
  repoId: string;
  name: string;
  processType: RepoProcessKind;
  entrySymbolId?: string;
  terminalSymbolId?: string;
  stepCount: number;
  metadata: Record<string, unknown>;
}

export interface RepoIndexArtifact {
  indexRun: {
    id: string;
    projectId: string;
    repoId: string;
    rootPath: string;
    commitSha?: string;
    status: "succeeded";
    fileCount: number;
    symbolCount: number;
    relationCount: number;
    metadata: Record<string, unknown>;
  };
  files: RepoFileNode[];
  symbols: RepoSymbolNode[];
  relations: RepoRelationEdge[];
  processes: RepoProcessNode[];
}

export interface ParsedRepoFile {
  file: RepoFileNode;
  sourceText: string;
  symbols: RepoSymbolNode[];
  imports: ParsedImport[];
  callSites: ParsedCallSite[];
  routeSites: ParsedRouteSite[];
  testSites: ParsedTestSite[];
}

export interface ParsedImport {
  sourceFileId: string;
  sourceFilePath: string;
  moduleSpecifier: string;
  importedNames: string[];
  defaultImport?: string;
  namespaceImport?: string;
  startLine: number;
}

export interface ParsedCallSite {
  sourceFileId: string;
  sourceFilePath: string;
  callerSymbolId?: string;
  calleeName: string;
  startLine: number;
}

export interface ParsedRouteSite {
  sourceFileId: string;
  sourceFilePath: string;
  routeSymbolId: string;
  method: string;
  routePath: string;
  handlerName?: string;
  startLine: number;
}

export interface ParsedTestSite {
  sourceFileId: string;
  sourceFilePath: string;
  testSymbolId: string;
  name: string;
  startLine: number;
}
