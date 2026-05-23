import { promises as fs } from "node:fs";
import path from "node:path";
import type { RepoFileNode, RepoGraphLanguage } from "./types.js";
import { sha256, stableId } from "./ids.js";

const DEFAULT_MAX_FILE_SIZE_BYTES = 512 * 1024;
const IGNORE_DIRS = new Set([".git", "node_modules", "dist", ".next", "coverage", ".turbo", ".cache", "build"]);
const LANGUAGE_BY_EXT = new Map<string, RepoGraphLanguage>([
  [".ts", "typescript"],
  [".tsx", "tsx"],
  [".js", "javascript"],
  [".jsx", "jsx"],
  [".mjs", "javascript"],
  [".cjs", "javascript"]
]);

export interface ScanOptions {
  rootDir: string;
  repoId: string;
  projectId: string;
  maxFileSizeBytes?: number;
}

export interface ScannedRepoFile {
  file: RepoFileNode;
  absolutePath: string;
  sourceText: string;
}

export async function scanRepoFiles(options: ScanOptions): Promise<ScannedRepoFile[]> {
  const rootDir = path.resolve(options.rootDir);
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const files: ScannedRepoFile[] = [];
  await walk(rootDir, async (absolutePath) => {
    const ext = path.extname(absolutePath);
    if (absolutePath.endsWith(".d.ts") || !LANGUAGE_BY_EXT.has(ext)) {
      return;
    }

    const stat = await fs.stat(absolutePath);
    if (!stat.isFile() || stat.size > maxFileSizeBytes) {
      return;
    }

    const sourceText = await fs.readFile(absolutePath, "utf8");
    if (sourceText.includes("\u0000")) {
      return;
    }

    const relativePath = normalizePath(path.relative(rootDir, absolutePath));
    files.push({
      absolutePath,
      sourceText,
      file: {
        id: stableId("repo", options.repoId, "file", relativePath),
        projectId: options.projectId,
        repoId: options.repoId,
        path: relativePath,
        language: LANGUAGE_BY_EXT.get(ext) ?? "javascript",
        contentHash: sha256(sourceText),
        sizeBytes: stat.size,
        isTest: isTestPath(relativePath),
        metadata: {}
      }
    });
  });

  return files.sort((a, b) => a.file.path.localeCompare(b.file.path));
}

export function isTestPath(relativePath: string): boolean {
  return /(^|\/)(__tests__|tests?)\//.test(relativePath) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(relativePath);
}

export function normalizePath(input: string): string {
  return input.split(path.sep).join("/");
}

async function walk(dir: string, visit: (absolutePath: string) => Promise<void>): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        await walk(path.join(dir, entry.name), visit);
      }
      continue;
    }
    if (entry.isFile()) {
      await visit(path.join(dir, entry.name));
    }
  }
}
