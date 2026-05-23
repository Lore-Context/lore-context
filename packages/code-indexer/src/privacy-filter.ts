/**
 * Privacy gate — central enforcement layer between the walker output and the wire payload.
 *
 * Responsibilities (per plan §2 Lane P):
 *  1. Reject files by path pattern before parsing (secrets, keys, .env, .pem, …).
 *  2. Reject oversized files (>500KB).
 *  3. Strip function bodies, string literals, variable values, in-body comments
 *     BEFORE constructing the payload (handled by the walker — this module trusts
 *     the walker's SymbolRecord[] which already contains only structural metadata).
 *  4. Pass every doc_comment through stripSecretPatterns() (P7).
 *  5. Construct the final FilePayload by calling UpsertPayloadSchema.parse({...})
 *     — the strict schema is the architectural guarantee (P1). Any unknown field
 *     at construction time → ZodError → the file is dropped.
 *
 * IMPORTANT: Do NOT pass raw source file contents into this module. Only pass
 * the structured SymbolRecord[] + RelationRecord[] output from the walker.
 */

import { statSync } from "node:fs";
import { basename } from "node:path";

import {
  UpsertPayloadSchema,
  FilePayloadSchema,
  stripSecretPatterns,
} from "@lore-context/sdk/code-graph-types";
import type { FilePayload, SymbolRecord, RelationRecord } from "@lore-context/sdk/code-graph-types";
import type { LanguageTag } from "./parser.js";

// ---------------------------------------------------------------------------
// File rejection patterns (P2 / Lane P)
// ---------------------------------------------------------------------------

/** Filename / path patterns that are ALWAYS rejected regardless of content. */
const REJECT_FILENAME_PATTERNS: RegExp[] = [
  /\.env$/i,
  /\.env\.\w+$/i,
  /\.envrc$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.crt$/i,
  /\.cer$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /id_rsa(\.\w+)?$/i,
  /id_dsa(\.\w+)?$/i,
  /id_ecdsa(\.\w+)?$/i,
  /id_ed25519(\.\w+)?$/i,
  /secrets?\.\w+$/i,
  /credential/i,
  /private[-_]key/i,
  /secret[-_]key/i,
  /\.netrc$/i,
  /\.htpasswd$/i,
];

/** Maximum file size in bytes (500 KB). */
const MAX_FILE_SIZE_BYTES = 500 * 1024;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Result of the privacy filter — either an accepted payload or a rejection reason. */
export type FilterResult =
  | { accepted: true; payload: FilePayload }
  | { accepted: false; reason: string };

/**
 * Determine if a file path should be rejected before any parsing.
 * Returns a rejection reason string if rejected, or null if accepted.
 *
 * Checks:
 *  - Filename / path matches REJECT_FILENAME_PATTERNS
 *  - File size > MAX_FILE_SIZE_BYTES (if fsPath is provided for disk check)
 *  - .gitignore is honored by the caller (chokidar uses it via ignored option)
 */
export function checkFileRejection(
  relativePath: string,
  fsPath?: string
): string | null {
  const name = basename(relativePath);

  for (const pattern of REJECT_FILENAME_PATTERNS) {
    if (pattern.test(name) || pattern.test(relativePath)) {
      return `Rejected: path matches secret-file pattern (${pattern.source})`;
    }
  }

  if (fsPath) {
    try {
      const stat = statSync(fsPath);
      if (stat.size > MAX_FILE_SIZE_BYTES) {
        return `Rejected: file size ${stat.size} bytes exceeds ${MAX_FILE_SIZE_BYTES} byte limit`;
      }
    } catch {
      // If we can't stat, allow through (file may be virtual in tests)
    }
  }

  return null;
}

/**
 * Apply P7 secret-pattern stripping to all doc_comment fields in a SymbolRecord[].
 * Returns a new array with stripped doc_comments (immutable — never mutates input).
 */
function applyDocCommentStripping(symbols: SymbolRecord[]): SymbolRecord[] {
  return symbols.map((sym) => {
    if (!sym.doc_comment) return sym;
    const stripped = stripSecretPatterns(sym.doc_comment);
    if (stripped === sym.doc_comment) return sym;
    return { ...sym, doc_comment: stripped };
  });
}

/**
 * Build a validated FilePayload from walker output.
 *
 * ALWAYS calls `FilePayloadSchema.parse(...)` — the strict schema is the
 * architectural guarantee (P1). ZodError means the file is dropped.
 *
 * @param relativePath   Repo-relative file path (e.g. "src/auth/login.ts")
 * @param language       Language tag from the wire-format enum
 * @param contentHash    XXH3 hex digest of the file body (16-64 hex chars)
 * @param astHash        XXH3 hex digest of the AST representation
 * @param lastModifiedAt ISO 8601 datetime string
 * @param symbols        Structural-only SymbolRecord[] from the walker
 * @param relations      RelationRecord[] from the walker
 * @param deleted        True for deletion entries
 */
export function buildFilePayload(params: {
  relativePath: string;
  language: LanguageTag;
  contentHash: string;
  astHash: string;
  lastModifiedAt: string;
  symbols: SymbolRecord[];
  relations: RelationRecord[];
  deleted?: boolean;
}): FilterResult {
  const strippedSymbols = applyDocCommentStripping(params.symbols);

  // UpsertPayloadSchema.parse() is the architectural guarantee (P1 sealed schema).
  // Any attempt to pass an unknown field or a body fragment will ZodError here.
  try {
    const rawPayload = {
      relative_path: params.relativePath,
      language: params.language,
      content_hash: params.contentHash,
      ast_hash: params.astHash,
      last_modified_at: params.lastModifiedAt,
      symbols: strippedSymbols,
      relations: params.relations,
      ...(params.deleted ? { deleted: true } : {}),
    };

    // Validate through the sealed schema — this is the P1 architectural invariant.
    const payload = FilePayloadSchema.parse(rawPayload);
    return { accepted: true, payload };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { accepted: false, reason: `Schema validation failed: ${msg}` };
  }
}

/**
 * Full privacy gate entry point — combines rejection check + payload construction.
 *
 * @param relativePath   Repo-relative file path
 * @param fsPath         Absolute filesystem path (used for size check; optional)
 * @param language       Language tag
 * @param contentHash    XXH3 hex of file body
 * @param astHash        XXH3 hex of AST
 * @param lastModifiedAt ISO 8601 datetime
 * @param symbols        Walker output SymbolRecord[] (structural only — no bodies)
 * @param relations      Walker output RelationRecord[]
 */
export function applyPrivacyFilter(params: {
  relativePath: string;
  fsPath?: string;
  language: LanguageTag;
  contentHash: string;
  astHash: string;
  lastModifiedAt: string;
  symbols: SymbolRecord[];
  relations: RelationRecord[];
  deleted?: boolean;
}): FilterResult {
  const rejection = checkFileRejection(params.relativePath, params.fsPath);
  if (rejection) {
    return { accepted: false, reason: rejection };
  }

  return buildFilePayload(params);
}
