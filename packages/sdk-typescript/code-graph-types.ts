/**
 * Lore v2.0.4 — Code Knowledge Graph wire-format types (Lane P P1)
 *
 * This module defines the **sealed** payload contract for uploading structural
 * metadata to `POST /v1/code-graph/upsert`. The Zod schemas use `.strict()`
 * everywhere — any unknown field at parse time throws `ZodError`, making
 * "no function body / string literal / variable value leaves the client" an
 * architectural invariant rather than a documentation promise.
 *
 * **DO NOT construct upload bodies via plain object literals.** Always call
 * `UpsertPayloadSchema.parse(...)` (or `.safeParse(...)`). The CI gate
 * `scripts/payload-audit.mjs` greps every callsite that posts to the upsert
 * endpoint and rejects raw-object construction.
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane P
 * See: docs/privacy/code-graph-privacy-model.md
 *
 * @module @lore-context/sdk/code-graph-types
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// FORBIDDEN field categories (documented for code reviewers + auditors).
// Every Zod object below uses .strict() so adding a new field anywhere in
// this hierarchy without updating the schema → ZodError at runtime.
// ---------------------------------------------------------------------------
//
// FORBIDDEN to transmit:
//   - function_body, body, source                  → function bodies
//   - string_literal, value, default_value, init   → string literals + variable values
//   - inline_comment, body_comment                 → in-body comments
//   - file_contents, content, source_bytes         → raw file bytes
//   - test_fixtures, env, config, secrets          → not source code
//
// ALLOWED structural fields are explicitly listed in each schema below.
// ---------------------------------------------------------------------------

/** Identifiers that the per-language validator must accept. */
export const IdentifierSchema = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^[\p{L}_$][\p{L}\p{N}_$.<>,:\s\-\[\]]*$/u, {
    message:
      "Identifier contains characters not valid in any Tier-1/Tier-2 language identifier or qualified name",
  });

/** Symbol kinds enumerated in schema-v22 code_symbols.kind CHECK constraint. */
export const SymbolKindSchema = z.enum([
  "function",
  "method",
  "class",
  "interface",
  "type",
  "enum",
  "const",
  "module",
  "variable",
]);
export type SymbolKind = z.infer<typeof SymbolKindSchema>;

/** Relation kinds enumerated in schema-v22 code_relations.relation_kind CHECK constraint. */
export const RelationKindSchema = z.enum([
  "calls",
  "imports",
  "extends",
  "implements",
  "references",
  "instantiates",
  "overrides",
]);
export type RelationKind = z.infer<typeof RelationKindSchema>;

/**
 * A single symbol record. ALL string fields are validated against the
 * per-field content-type rules at the server (P3/P8). Any attempt to add
 * a body/literal/value field fails `.strict()` parse.
 */
export const SymbolRecordSchema = z
  .object({
    name: IdentifierSchema,
    qualified_name: IdentifierSchema,
    kind: SymbolKindSchema,
    /**
     * Function signature only — no body bytes. The server validator
     * (`apps/api/src/code-graph/validators.ts::validateSignature`) rejects
     * payloads containing `{ ... }` body fragments (generic type params
     * `<T>` are allowed).
     */
    signature: z.string().max(4096).optional(),
    /**
     * Doc-comment text — JSDoc / docstring / Doxygen. The server validator
     * (`validateDocComment`) rejects payloads matching the P7 secret-pattern
     * regex denylist (sk_(live|test)_, ghp_, AKIA, -----BEGIN ... -----).
     */
    doc_comment: z.string().max(16384).optional(),
    start_line: z.number().int().min(0),
    end_line: z.number().int().min(0),
    start_col: z.number().int().min(0).optional(),
    end_col: z.number().int().min(0).optional(),
    is_exported: z.boolean(),
    /**
     * Structural metadata only. Keys allowed: `language_specific`,
     * `decorator_names` (string[]), `parameter_count` (number). NO raw values.
     */
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();
export type SymbolRecord = z.infer<typeof SymbolRecordSchema>;

/**
 * A single relation record. Targets may be unresolved (cross-batch) — the
 * server stores `dst_qname_unresolved` and resolves in a second pass.
 */
export const RelationRecordSchema = z
  .object({
    src_qname: IdentifierSchema,
    dst_qname: IdentifierSchema,
    kind: RelationKindSchema,
    /** Optional file-level reference (for cross-file relations). */
    src_file_relative_path: z.string().max(4096).optional(),
    dst_file_relative_path: z.string().max(4096).optional(),
  })
  .strict();
export type RelationRecord = z.infer<typeof RelationRecordSchema>;

/** Per-file payload chunk. */
export const FilePayloadSchema = z
  .object({
    relative_path: z
      .string()
      .min(1)
      .max(4096)
      // Defense-in-depth — reject anything that looks like an absolute path
      // that could leak host filesystem layout. Indexer uses repo-relative.
      .refine((p) => !p.startsWith("/") && !/^[A-Z]:\\/i.test(p), {
        message: "relative_path must be repo-relative, not absolute",
      }),
    /** Tier-1 + Tier-2 language tag from Lane M coverage matrix. */
    language: z.enum([
      "typescript",
      "javascript",
      "tsx",
      "jsx",
      "python",
      "go",
      "rust",
      "java",
      "c",
      "cpp",
      "csharp",
      "ruby",
      "php",
    ]),
    /** XXH3 hex digest of the file BODY — never the body itself. */
    content_hash: z.string().regex(/^[0-9a-f]{16,64}$/, {
      message: "content_hash must be a hex digest, not file contents",
    }),
    ast_hash: z.string().regex(/^[0-9a-f]{16,64}$/, {
      message: "ast_hash must be a hex digest",
    }),
    last_modified_at: z.string().datetime(),
    symbols: z.array(SymbolRecordSchema),
    relations: z.array(RelationRecordSchema),
    /** True for deletion entries (file removed from the repo). */
    deleted: z.boolean().optional(),
  })
  .strict();
export type FilePayload = z.infer<typeof FilePayloadSchema>;

/**
 * Tier-2 encrypted symbol record schema.
 *
 * When `e2e_encrypted=true` in the outer payload, the sensitive string fields
 * (`name`, `qualified_name`, `signature`, `doc_comment`) contain AES-256-GCM
 * ciphertext encoded as base64 (see encryption-tier2.ts). The base64 alphabet
 * includes `+`, `/`, and `=` which are rejected by `IdentifierSchema`, so
 * encrypted symbol records use this looser schema for those fields.
 *
 * Structural fields (`kind`, `start_line`, `end_line`, `start_col`, `end_col`,
 * `is_exported`, `metadata`) pass through with the same constraints as Tier-1.
 *
 * The envelope format produced by encryptString() is:
 *   base64(salt[16] || iv[12] || ciphertext || authTag[16])
 * Minimum encoded length: ceil((16+12+0+16)*4/3) = 60 chars (no plaintext).
 * Practical minimum for a 1-char plaintext: ceil(45*4/3) = 60 chars.
 * The ≥20-char base64 regex below is a loose lower-bound that accepts
 * deterministicIdentifier() output (HMAC-SHA256 base64 = ~44 chars) as well as
 * full encryptString() envelopes.
 */
/**
 * Tier-2 encrypted relation record schema.
 *
 * In Tier-2 mode, `src_qname` and `dst_qname` contain the encrypted (base64)
 * form of the source/destination `qualified_name` values. The graph topology
 * (which encrypted node refers to which) remains visible to Lore Cloud —
 * this is documented as residual leakage in docs/privacy/code-graph-privacy-model.md.
 *
 * The `kind` field is NOT encrypted — relation kinds (calls/imports/extends/…)
 * are considered graph topology and are part of the documented residual leakage.
 */
export const EncryptedRelationRecordSchema = z
  .object({
    src_qname: z
      .string()
      .min(20)
      .max(8192)
      .regex(/^[A-Za-z0-9+/]{20,}={0,2}$/, {
        message: "Encrypted src_qname must be a base64 ciphertext envelope",
      }),
    dst_qname: z
      .string()
      .min(20)
      .max(8192)
      .regex(/^[A-Za-z0-9+/]{20,}={0,2}$/, {
        message: "Encrypted dst_qname must be a base64 ciphertext envelope",
      }),
    kind: RelationKindSchema,
    src_file_relative_path: z.string().max(4096).optional(),
    dst_file_relative_path: z.string().max(4096).optional(),
  })
  .strict();
export type EncryptedRelationRecord = z.infer<typeof EncryptedRelationRecordSchema>;

export const EncryptedSymbolRecordSchema = z
  .object({
    name: z
      .string()
      .min(20)
      .max(8192) // base64 expansion: up to ~6× original; allow headroom
      .regex(/^[A-Za-z0-9+/]{20,}={0,2}$/, {
        message: "Encrypted name must be a base64 ciphertext envelope",
      }),
    qualified_name: z
      .string()
      .min(20)
      .max(8192)
      .regex(/^[A-Za-z0-9+/]{20,}={0,2}$/, {
        message: "Encrypted qualified_name must be a base64 ciphertext envelope",
      }),
    kind: SymbolKindSchema,
    signature: z
      .string()
      .min(20)
      .max(65536) // signatures can be large; encrypted form is larger
      .regex(/^[A-Za-z0-9+/]{20,}={0,2}$/, {
        message: "Encrypted signature must be a base64 ciphertext envelope",
      })
      .optional(),
    doc_comment: z
      .string()
      .min(20)
      .max(65536)
      .regex(/^[A-Za-z0-9+/]{20,}={0,2}$/, {
        message: "Encrypted doc_comment must be a base64 ciphertext envelope",
      })
      .optional(),
    start_line: z.number().int().min(0),
    end_line: z.number().int().min(0),
    start_col: z.number().int().min(0).optional(),
    end_col: z.number().int().min(0).optional(),
    is_exported: z.boolean(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();
export type EncryptedSymbolRecord = z.infer<typeof EncryptedSymbolRecordSchema>;

/** Per-file payload chunk for Tier-2 (encrypted symbol names). */
export const EncryptedFilePayloadSchema = z
  .object({
    relative_path: z
      .string()
      .min(1)
      .max(4096)
      .refine((p) => !p.startsWith("/") && !/^[A-Z]:\\/i.test(p), {
        message: "relative_path must be repo-relative, not absolute",
      }),
    language: z.enum([
      "typescript",
      "javascript",
      "tsx",
      "jsx",
      "python",
      "go",
      "rust",
      "java",
      "c",
      "cpp",
      "csharp",
      "ruby",
      "php",
    ]),
    content_hash: z.string().regex(/^[0-9a-f]{16,64}$/, {
      message: "content_hash must be a hex digest, not file contents",
    }),
    ast_hash: z.string().regex(/^[0-9a-f]{16,64}$/, {
      message: "ast_hash must be a hex digest",
    }),
    last_modified_at: z.string().datetime(),
    symbols: z.array(EncryptedSymbolRecordSchema),
    /**
     * Relations in Tier-2 use encrypted qnames for src/dst references.
     * The relation `kind` (calls/imports/extends/…) is NOT encrypted —
     * graph topology is documented residual leakage.
     */
    relations: z.array(EncryptedRelationRecordSchema),
    deleted: z.boolean().optional(),
  })
  .strict();
export type EncryptedFilePayload = z.infer<typeof EncryptedFilePayloadSchema>;

/**
 * The full upsert wire body. THIS is the only legal payload shape; the CI
 * gate `pnpm payload:audit` enforces that all callsites use
 * `UpsertPayloadSchema.parse(rawObject)` rather than building objects raw.
 *
 * When `e2e_encrypted: true`, the payload uses `EncryptedFilePayloadSchema`
 * for `files[].symbols` — a discriminated union ensures the correct schema
 * is applied based on the encryption flag (Option A from Lane P design).
 */
export const UpsertPayloadSchema = z.discriminatedUnion("e2e_encrypted", [
  // Tier-2: encrypted symbol fields
  z
    .object({
      e2e_encrypted: z.literal(true),
      repo: z
        .object({
          name: IdentifierSchema,
          primary_lang: z.string().max(32).optional(),
        })
        .strict(),
      files: z.array(EncryptedFilePayloadSchema),
    })
    .strict(),
  // Tier-1: plaintext (default — e2e_encrypted=false or absent)
  z
    .object({
      e2e_encrypted: z.literal(false).optional(),
      repo: z
        .object({
          name: IdentifierSchema,
          primary_lang: z.string().max(32).optional(),
        })
        .strict(),
      files: z.array(FilePayloadSchema),
    })
    .strict(),
]);
export type UpsertPayload = z.infer<typeof UpsertPayloadSchema>;

/**
 * Convenience constructor that throws on any invalid input — the ONLY
 * recommended way to build a wire payload. Raw object literals at upsert
 * call sites are rejected by `pnpm payload:audit`.
 */
export function buildUpsertPayload(input: unknown): UpsertPayload {
  return UpsertPayloadSchema.parse(input);
}

/**
 * Privacy filter regex denylist for P7. doc_comment fields are passed through
 * `stripSecretPatterns()` before upload; matched substrings are replaced with
 * `«[REDACTED:secret-pattern]»`.
 *
 * The regex set is intentionally narrow — high-precision, low-recall — to
 * minimize false-positive churn while catching the most common leaks.
 * See docs/privacy/code-graph-privacy-model.md for the canonical list.
 */
export const SECRET_PATTERN_DENYLIST: readonly RegExp[] = Object.freeze([
  /sk[-_](live|test)[-_][A-Za-z0-9]{10,}/g,
  /sk[-_](proj)[-_][A-Za-z0-9]{10,}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z_\-]{20,}/g,
  // PEM blocks: BEGIN PRIVATE KEY / BEGIN RSA PRIVATE KEY / etc.
  /-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----/g,
  // OpenAI-style and Anthropic-style prefixed keys.
  /sk-ant-[A-Za-z0-9_\-]{20,}/g,
  // Generic high-entropy hex secrets (32-128 chars). Heuristic only.
  /\b[a-f0-9]{40,128}\b/gi,
]) as readonly RegExp[];

/**
 * Strip every match of {@link SECRET_PATTERN_DENYLIST} from a doc-comment
 * string. Replacement is a fixed sentinel so reviewers can audit grep output.
 *
 * This is the client-side P7 enforcement; the server runs the same regex on
 * incoming `doc_comment` fields and rejects with 400 if any match remains
 * (defense-in-depth — a buggy client cannot leak even if it skips this step).
 */
export function stripSecretPatterns(input: string): string {
  let out = input;
  for (const re of SECRET_PATTERN_DENYLIST) {
    out = out.replace(re, "«[REDACTED:secret-pattern]»");
  }
  return out;
}
