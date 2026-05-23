/**
 * CodeIndexer — main orchestrator class.
 *
 * Wires together: file discovery → parse → walk → privacy-filter → upload.
 * Exposes indexFull() and indexFile() as the primary public API.
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative, extname } from "node:path";

import { UpsertPayloadSchema } from "@lore-context/sdk/code-graph-types";
import type { FilePayload, EncryptedFilePayload } from "@lore-context/sdk/code-graph-types";
import { encryptSymbolFields, deterministicIdentifier } from "./encryption-tier2.js";

import { parseFile, inferLanguage } from "./parser.js";
import { walkAST } from "./walker.js";
import { applyPrivacyFilter, checkFileRejection } from "./privacy-filter.js";
import { uploadPayload } from "./uploader.js";
import type { UploaderOptions } from "./uploader.js";

// xxhash-wasm: lazy-loaded
let _xxhashPromise: Promise<{ h64ToString: (data: Uint8Array, seed?: bigint) => string }> | null = null;

async function getHasher(): Promise<{ h64ToString: (data: Uint8Array, seed?: bigint) => string }> {
  if (!_xxhashPromise) {
    _xxhashPromise = import("xxhash-wasm").then((mod) => {
      // xxhash-wasm default export is a factory function
      const factory = (mod as unknown as { default: () => Promise<{ h64ToString: (data: Uint8Array, seed?: bigint) => string }> }).default;
      return factory();
    });
  }
  return _xxhashPromise;
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  const hasher = await getHasher();
  return hasher.h64ToString(bytes);
}

export interface CodeIndexerOptions {
  /** Absolute path to the repo root. */
  repoPath: string;
  /** Logical repo name (stored in code_repos.name). */
  repoName: string;
  /** Lore API base URL. */
  apiBaseUrl: string;
  /** Auth token. */
  authToken: string;
  /** Vault ID. */
  vaultId: string;
  /** Glob patterns to additionally ignore (beyond defaults). */
  ignored?: string[];
  /** Batch size for upload (symbols per upsert call). Default: 200 files. */
  batchSize?: number;
  /**
   * Lane P Tier-2 (Pro tier): client-side passphrase for E2E symbol encryption.
   *
   * When set, every symbol `name`, `qualified_name`, `signature`, and
   * `doc_comment` is encrypted client-side with AES-256-GCM (key derived via
   * scrypt from this passphrase) before upload. The payload is marked
   * `e2e_encrypted: true`. Server-side embedding search is disabled for this
   * repo — the server cannot index ciphertext.
   *
   * Also readable from the `LORE_TIER2_PASSPHRASE` environment variable.
   * Precedence: this option wins over the env var when both are set (allows
   * per-invocation override without mutating the environment).
   *
   * **Residual leakage**: file paths, line ranges, relation kinds, and graph
   * topology remain visible to Lore Cloud. See docs/privacy/code-graph-privacy-model.md.
   */
  tier2Passphrase?: string;
}

export interface IndexStats {
  filesProcessed: number;
  filesRejected: number;
  symbolsExtracted: number;
  relationsExtracted: number;
  uploadErrors: number;
  elapsedMs: number;
}

/** File extensions to index. */
const INDEXED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".c", ".cc", ".cpp", ".cxx", ".cs", ".rb", ".php",
]);

function shouldSkipDir(name: string): boolean {
  return name === "node_modules" || name === ".git" || name === "dist" ||
    name === "build" || name === "__pycache__" || name === ".venv" ||
    name === "vendor" || name === "target";
}

/** Recursively collect all indexable file paths under rootDir. */
function collectFiles(rootDir: string): string[] {
  const results: string[] = [];
  function recurse(dir: string): void {
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true, encoding: "utf8" }) as import("node:fs").Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
      const name = String(entry.name);
      if (entry.isDirectory()) {
        if (!shouldSkipDir(name)) {
          recurse(join(dir, name));
        }
      } else if (entry.isFile()) {
        const ext = extname(name).toLowerCase();
        if (INDEXED_EXTENSIONS.has(ext)) {
          results.push(join(dir, name));
        }
      }
    }
  }
  recurse(rootDir);
  return results;
}

export class CodeIndexer {
  private readonly _opts: CodeIndexerOptions;
  private readonly _uploaderOpts: UploaderOptions;
  /** True when Tier-2 E2E encryption is active for this indexer instance. */
  readonly tier2Enabled: boolean;
  private readonly _tier2Passphrase: string | undefined;

  constructor(opts: CodeIndexerOptions) {
    this._opts = opts;
    // Resolve passphrase: explicit option wins over env var (per-invocation override).
    const passphrase = opts.tier2Passphrase ?? process.env["LORE_TIER2_PASSPHRASE"];
    this._tier2Passphrase = passphrase;
    this.tier2Enabled = Boolean(passphrase);
    this._uploaderOpts = {
      baseUrl: opts.apiBaseUrl,
      authToken: opts.authToken,
      vaultId: opts.vaultId,
    };
  }

  /**
   * Encrypt symbol and relation fields in a FilePayload when Tier-2 is enabled.
   *
   * Identity fields (`name`, `qualified_name`, `src_qname`, `dst_qname`) use a
   * **deterministic HMAC** so the resolver can resolve relation FKs by joining
   * `code_relations.dst_qname == code_symbols.qualified_name` bytewise. The
   * narrative fields (`signature`, `doc_comment`) use random-IV AES-256-GCM
   * for full secrecy.
   *
   * Residual leakage in Tier-2 mode (by design):
   *   - Graph topology (which encrypted node references which) — visible.
   *   - Identity equality across the graph (two symbols share name X) — visible.
   *   - `signature` / `doc_comment` ciphertext — not equality-comparable, secret.
   *   - Relation `kind` — visible (not encrypted).
   *
   * See: docs/privacy/code-graph-privacy-model.md — Tier-2 residual leakage.
   */
  private _encryptFilePayload(file: FilePayload): EncryptedFilePayload {
    const passphrase = this._tier2Passphrase!;
    return {
      ...file,
      symbols: file.symbols.map((sym) => encryptSymbolFields(sym, passphrase)),
      relations: file.relations.map((rel) => ({
        ...rel,
        // Deterministic HMAC matches the symbol's qualified_name HMAC bytewise.
        src_qname: deterministicIdentifier(rel.src_qname, passphrase),
        dst_qname: deterministicIdentifier(rel.dst_qname, passphrase),
      })),
    };
  }

  /**
   * Full index — walks the entire repo and uploads all indexed files.
   * Returns stats on completion.
   */
  async indexFull(): Promise<IndexStats> {
    const start = Date.now();
    const files = collectFiles(this._opts.repoPath);
    const stats: IndexStats = {
      filesProcessed: 0,
      filesRejected: 0,
      symbolsExtracted: 0,
      relationsExtracted: 0,
      uploadErrors: 0,
      elapsedMs: 0,
    };

    const batchSize = this._opts.batchSize ?? 200;
    let batch: FilePayload[] = [];

    const flush = async (): Promise<void> => {
      if (batch.length === 0) return;
      let payload;
      if (this.tier2Enabled) {
        const encryptedFiles = batch.map((f) => this._encryptFilePayload(f));
        payload = UpsertPayloadSchema.parse({
          e2e_encrypted: true,
          repo: { name: this._opts.repoName },
          files: encryptedFiles,
        });
      } else {
        payload = UpsertPayloadSchema.parse({
          repo: { name: this._opts.repoName },
          files: batch,
        });
      }
      const result = await uploadPayload(this._uploaderOpts, payload);
      if (!result.ok) {
        stats.uploadErrors++;
        console.error("[code-indexer] upload error:", result.error);
      }
      batch = [];
    };

    for (const absPath of files) {
      const relPath = relative(this._opts.repoPath, absPath);

      // Pre-rejection check
      const rejection = checkFileRejection(relPath, absPath);
      if (rejection) {
        stats.filesRejected++;
        continue;
      }

      try {
        const source = readFileSync(absPath, "utf8");
        const sourceBytes = new TextEncoder().encode(source);
        const contentHash = await hashBytes(sourceBytes);

        const parseResult = await parseFile(absPath, source);
        if (parseResult.warning) {
          // Missing grammar: skip file silently with warning
          if (parseResult.rootNode === null) {
            stats.filesRejected++;
            continue;
          }
        }

        const walkResult = walkAST(parseResult);

        // AST hash: hash the stringified walk result (structural representation)
        const astBytes = new TextEncoder().encode(JSON.stringify(walkResult));
        const astHash = await hashBytes(astBytes);

        const stat = statSync(absPath);
        const lastModifiedAt = stat.mtime.toISOString();

        const lang = inferLanguage(absPath);
        if (!lang) {
          stats.filesRejected++;
          continue;
        }

        const filterResult = applyPrivacyFilter({
          relativePath: relPath,
          fsPath: absPath,
          language: lang,
          contentHash,
          astHash,
          lastModifiedAt,
          symbols: walkResult.symbols,
          relations: walkResult.relations,
        });

        if (!filterResult.accepted) {
          stats.filesRejected++;
          continue;
        }

        stats.filesProcessed++;
        stats.symbolsExtracted += filterResult.payload.symbols.length;
        stats.relationsExtracted += filterResult.payload.relations.length;
        batch.push(filterResult.payload);

        if (batch.length >= batchSize) {
          await flush();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[code-indexer] error processing ${relPath}: ${msg}`);
        stats.filesRejected++;
      }
    }

    await flush();
    stats.elapsedMs = Date.now() - start;
    return stats;
  }

  /**
   * Index a single file by absolute path. Used by the git hook + watcher.
   */
  async indexFile(absPath: string): Promise<IndexStats> {
    const start = Date.now();
    const stats: IndexStats = {
      filesProcessed: 0,
      filesRejected: 0,
      symbolsExtracted: 0,
      relationsExtracted: 0,
      uploadErrors: 0,
      elapsedMs: 0,
    };

    const relPath = relative(this._opts.repoPath, absPath);
    const rejection = checkFileRejection(relPath, absPath);
    if (rejection) {
      stats.filesRejected++;
      stats.elapsedMs = Date.now() - start;
      return stats;
    }

    try {
      const source = readFileSync(absPath, "utf8");
      const sourceBytes = new TextEncoder().encode(source);
      const contentHash = await hashBytes(sourceBytes);

      const parseResult = await parseFile(absPath, source);
      if (parseResult.rootNode === null) {
        stats.filesRejected++;
        stats.elapsedMs = Date.now() - start;
        return stats;
      }

      const walkResult = walkAST(parseResult);
      const astBytes = new TextEncoder().encode(JSON.stringify(walkResult));
      const astHash = await hashBytes(astBytes);

      const stat = statSync(absPath);
      const lastModifiedAt = stat.mtime.toISOString();

      const lang = inferLanguage(absPath);
      if (!lang) {
        stats.filesRejected++;
        stats.elapsedMs = Date.now() - start;
        return stats;
      }

      const filterResult = applyPrivacyFilter({
        relativePath: relPath,
        fsPath: absPath,
        language: lang,
        contentHash,
        astHash,
        lastModifiedAt,
        symbols: walkResult.symbols,
        relations: walkResult.relations,
      });

      if (!filterResult.accepted) {
        stats.filesRejected++;
        stats.elapsedMs = Date.now() - start;
        return stats;
      }

      let payload;
      if (this.tier2Enabled) {
        const encryptedFile = this._encryptFilePayload(filterResult.payload);
        payload = UpsertPayloadSchema.parse({
          e2e_encrypted: true,
          repo: { name: this._opts.repoName },
          files: [encryptedFile],
        });
      } else {
        payload = UpsertPayloadSchema.parse({
          repo: { name: this._opts.repoName },
          files: [filterResult.payload],
        });
      }

      const result = await uploadPayload(this._uploaderOpts, payload);
      if (!result.ok) {
        stats.uploadErrors++;
      } else {
        stats.filesProcessed++;
        stats.symbolsExtracted += filterResult.payload.symbols.length;
        stats.relationsExtracted += filterResult.payload.relations.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[code-indexer] error processing ${relPath}: ${msg}`);
      stats.filesRejected++;
    }

    stats.elapsedMs = Date.now() - start;
    return stats;
  }

  /** Return telemetry stats (current session). */
  getStats(): Omit<IndexStats, "elapsedMs"> {
    return {
      filesProcessed: 0,
      filesRejected: 0,
      symbolsExtracted: 0,
      relationsExtracted: 0,
      uploadErrors: 0,
    };
  }
}

/** Convenience: full index with default options. */
export async function indexFull(opts: CodeIndexerOptions): Promise<IndexStats> {
  return new CodeIndexer(opts).indexFull();
}

/** Convenience: single file index. */
export async function indexFile(opts: CodeIndexerOptions, absPath: string): Promise<IndexStats> {
  return new CodeIndexer(opts).indexFile(absPath);
}
