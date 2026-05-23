import path from "node:path";
import { buildRelations } from "./relations.js";
import { scanRepoFiles } from "./scan.js";
import { parseTypeScriptFile } from "./parse-typescript.js";
import { stableId, shortHash } from "./ids.js";
import type { RepoIndexArtifact, RepoIndexOptions } from "./types.js";

export type * from "./types.js";
export { scanRepoFiles, isTestPath } from "./scan.js";
export { parseTypeScriptFile } from "./parse-typescript.js";
export { buildRelations } from "./relations.js";

export async function indexRepository(options: RepoIndexOptions): Promise<RepoIndexArtifact> {
  const rootDir = path.resolve(options.rootDir);
  const scannedFiles = await scanRepoFiles({
    rootDir,
    repoId: options.repoId,
    projectId: options.projectId,
    maxFileSizeBytes: options.maxFileSizeBytes
  });
  const parsedFiles = scannedFiles.map((scanned) => parseTypeScriptFile(scanned.file, scanned.sourceText));
  const { relations, processes } = buildRelations(parsedFiles);
  const files = parsedFiles.map((parsed) => parsed.file);
  const symbols = parsedFiles.flatMap((parsed) => parsed.symbols);
  const inputHash = shortHash(files.map((file) => `${file.path}:${file.contentHash}`).join("|"));

  return {
    indexRun: {
      id: stableId("repo", options.repoId, "index_run", options.commitSha ?? "working-tree", inputHash),
      projectId: options.projectId,
      repoId: options.repoId,
      rootPath: rootDir,
      commitSha: options.commitSha,
      status: "succeeded",
      fileCount: files.length,
      symbolCount: symbols.length,
      relationCount: relations.length,
      metadata: { languageScope: ["typescript", "tsx", "javascript", "jsx"], generatedBy: "@lore/repo-graph" }
    },
    files,
    symbols: symbols.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.startLine - b.startLine || a.id.localeCompare(b.id)),
    relations,
    processes
  };
}
