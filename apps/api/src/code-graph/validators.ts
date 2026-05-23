/**
 * Lore v2.0.4 — Lane P per-field content-type validators (P3/P7/P8)
 *
 * These validators run server-side on every incoming upsert payload to enforce
 * the "no function body / string literal / variable value leaves the client"
 * privacy invariant. They are the second enforcement layer (the first is the
 * client-side privacy filter in packages/code-indexer).
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane P P3/P7/P8
 */

import { SECRET_PATTERN_DENYLIST, type FilePayload } from "@lore-context/sdk/code-graph-types";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type ValidatorOk = { ok: true };
export type ValidatorFail = { ok: false; error: string; reason: string };
export type ValidatorResult = ValidatorOk | ValidatorFail;

const OK: ValidatorOk = { ok: true };

function fail(error: string, reason: string): ValidatorFail {
  return { ok: false, error, reason };
}

// ---------------------------------------------------------------------------
// P3 — validateSignature
//
// A signature MUST NOT contain function body fragments. Specifically, any
// occurrence of `{` followed (after optional whitespace/code) by `}` that
// looks like a block body — as opposed to a generic type parameter — is
// rejected.
//
// Allowed:
//   function foo<T, U>(a: T): U
//   def foo(a: int) -> str:
//   (a: number) => number
//   Map<string, number>
//   { key: string; value: number }   <- TS type literal  ALLOWED? No — see plan.
//   ...but: 'function foo() { return 42; }' is rejected.
//
// The rule: reject if there is a '{' that is followed by ANY content and then
// a '}', UNLESS the '{' is part of a generic type parameter (i.e., preceded by
// '<' or ',' in a way consistent with generics). We detect body fragments by
// looking for '{' that contains anything other than identifier/type tokens
// (i.e., contains keywords like 'return', 'var', 'let', 'const', 'if', 'for',
// literals, or statement-ending ';' before the closing '}'.
//
// Simpler + more reliable heuristic (per plan P3):
//   Reject any signature that contains `{` followed by non-whitespace content
//   before a matching `}`. This catches `{ return 42; }`, `{ console.log(); }`,
//   etc. It does NOT reject generic type params like `<T>` or arrow `=>`.
// ---------------------------------------------------------------------------

// Statement keywords whose presence inside a `{ ... }` block flags it as a
// function-body fragment (rather than a TS object-type literal).
//
// The TS object-type literal `{ a: string; b: number }` uses `;` as a *type
// member separator*, NOT a statement terminator. To distinguish:
//   - TS type literal: every `;` separates a `key: type` pair; no leading
//     statement keyword (`return`, `let`, `const`, etc.) appears.
//   - Function body: contains `return ;`, `let `, `const `, `var `,
//     control-flow keywords with `(` (e.g. `if (`, `for (`, `while (`,
//     `switch (`), a statement-terminator `;` followed by another statement,
//     `=>` returning a block, or a call expression like `foo(`/`console.log(`.
//
// We walk the string brace-depth-aware (skipping string literals delimited by
// `'`, `"`, or `` ` ``) and inspect each top-level `{...}` block's contents.
// A trailing-comma in `{ a: string, b: number, }` is a type literal — no
// statement keyword in sight, so we accept it.
const STATEMENT_KEYWORD_RES: RegExp[] = [
  /\breturn\b/,
  /\blet\s+\w/,        // `let x`
  /\bconst\s+\w/,      // `const x`
  /\bvar\s+\w/,
  /\bif\s*\(/,
  /\bfor\s*\(/,
  /\bwhile\s*\(/,
  /\bswitch\s*\(/,
  /\bthrow\b/,
  /\bawait\b/,
  /\bdo\s*\{/,
  /\btry\s*\{/,
  /\byield\b/,
  // Statement-terminator semicolon: a `;` NOT immediately followed by an
  // identifier+`:` (type literal members use `; key: type` form). We accept
  // `; key: type` as a type-literal continuation and only reject otherwise.
];

/**
 * Returns true if the given block contents (the bytes between matching
 * top-level `{` and `}`) look like a function body rather than a TS object
 * type literal.
 *
 * Heuristics:
 *   1. Any statement keyword (return, let, const, var, if, for, while, …) →
 *      function body.
 *   2. A function-call expression at top level — `identifier(` not appearing
 *      after a type-position marker like `:` or `=>` (call expressions are
 *      executable code, never type-literal members).
 *   3. A statement-terminator `;` whose preceding token is a value expression
 *      (call/literal/identifier without `key: value` shape).
 */
function blockLooksLikeFunctionBody(inner: string): boolean {
  for (const re of STATEMENT_KEYWORD_RES) {
    if (re.test(inner)) return true;
  }
  // Detect top-level call expression: `identifier(` where identifier is NOT
  // followed by `: returntype` (which would make it a method signature in a
  // type literal). We walk the inner string, skipping nested {} and strings.
  let depth = 0;
  let i = 0;
  while (i < inner.length) {
    const c = inner[i]!;
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < inner.length && inner[i] !== quote) {
        if (inner[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === "{") { depth++; i++; continue; }
    if (c === "}") { depth--; i++; continue; }
    // Only inspect tokens at depth 0 of the block we're scanning
    if (depth === 0) {
      // Match an identifier (possibly dotted: console.log) immediately followed
      // by `(` — that's a call expression, which means executable code.
      const m = /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/.exec(inner.slice(i));
      if (m) {
        // Reject false positives: type-literal members are written as
        // `key: ReturnType<T>` or `key(args): ReturnType` (method signature).
        // The latter has form `name(...)` with `:` after `)`. We only catch
        // calls that are NOT followed by `:` after their closing paren.
        let parenDepth = 1;
        let j = i + m[0].length;
        while (j < inner.length && parenDepth > 0) {
          const cc = inner[j]!;
          if (cc === '"' || cc === "'" || cc === "`") {
            const quote = cc;
            j++;
            while (j < inner.length && inner[j] !== quote) {
              if (inner[j] === "\\") j++;
              j++;
            }
          } else if (cc === "(") parenDepth++;
          else if (cc === ")") parenDepth--;
          j++;
        }
        // Look past the closing paren for `:` (TS method signature) or `=>` (TS function type member).
        let k = j;
        while (k < inner.length && /\s/.test(inner[k]!)) k++;
        if (k < inner.length && (inner[k] === ":" || (inner[k] === "=" && inner[k + 1] === ">"))) {
          // Method signature in type literal — OK, advance past it
          i = j;
          continue;
        }
        // Otherwise this is a top-level call expression → function body
        return true;
      }
    }
    i++;
  }
  // Statement-terminator semicolon detection: scan again, this time keying on
  // `;` and inspecting what preceded it. A `;` whose nearest preceding non-
  // whitespace token sequence does NOT look like `key: type` is a statement.
  depth = 0;
  i = 0;
  while (i < inner.length) {
    const c = inner[i]!;
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < inner.length && inner[i] !== quote) {
        if (inner[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === "{") { depth++; i++; continue; }
    if (c === "}") { depth--; i++; continue; }
    if (depth === 0 && c === ";") {
      // Look back from i-1 over whitespace and find what preceded.
      let k = i - 1;
      while (k >= 0 && /\s/.test(inner[k]!)) k--;
      if (k < 0) { i++; continue; }
      // If the preceding token includes `:` somewhere on the same "statement"
      // (since last `;` or block start), treat as type member. Otherwise, the
      // `;` ends a value-expression statement → function body.
      // Find statement boundary: nearest preceding `;` or beginning of inner.
      let start = i - 1;
      let parenDepth = 0;
      while (start >= 0) {
        const ch = inner[start]!;
        if (ch === ")") parenDepth++;
        else if (ch === "(") parenDepth--;
        else if (ch === ";" && parenDepth === 0) { start++; break; }
        if (start === 0) break;
        start--;
      }
      const segment = inner.slice(Math.max(start, 0), i);
      // Type member shape: `identifier ?: type` or `identifier: type`. Heuristic:
      // segment contains a top-level `:` and NO top-level `=`, `(`, or call
      // expression. Strip generic-brackets content to avoid `<K, V>` confusion.
      const seg = segment.replace(/<[^<>]*>/g, ""); // crude generic strip
      const hasColon = /:/.test(seg);
      const hasAssign = /[^=]=[^=]|=$|^=/.test(seg);
      const hasCall = /[A-Za-z_$][\w$]*\s*\(/.test(seg);
      if (hasColon && !hasAssign && !hasCall) {
        i++;
        continue; // looks like a type member separator
      }
      return true;
    }
    i++;
  }
  return false;
}

/**
 * Walks the signature string and returns true if any top-level `{ ... }`
 * block looks like a function body. String literals (delimited by `'`, `"`,
 * `` ` ``) are skipped so `";"` inside a literal can't be mistaken for a
 * statement terminator.
 */
function containsBodyFragment(s: string): boolean {
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i]!;
    // Skip string literals (incl. template strings — we don't honor ${} for
    // simplicity; if a template literal contains a body fragment in a signature
    // string, we'd reject it, which is fine.)
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < n && s[i] !== quote) {
        if (s[i] === "\\") i++; // skip escape
        i++;
      }
      i++;
      continue;
    }
    if (c === "{") {
      // Walk to matching `}` with depth tracking.
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        const cc = s[j]!;
        if (cc === '"' || cc === "'" || cc === "`") {
          const quote = cc;
          j++;
          while (j < n && s[j] !== quote) {
            if (s[j] === "\\") j++;
            j++;
          }
          j++;
          continue;
        }
        if (cc === "{") depth++;
        else if (cc === "}") depth--;
        if (depth === 0) break;
        j++;
      }
      const inner = s.slice(i + 1, j);
      if (blockLooksLikeFunctionBody(inner)) return true;
      i = j + 1;
      continue;
    }
    i++;
  }
  return false;
}

export function validateSignature(s: string, _lang?: string): ValidatorResult {
  if (containsBodyFragment(s)) {
    return fail(
      "code_graph.signature_invalid",
      `Signature appears to contain a function body fragment ('{...}' block with statements detected). ` +
        `Only the function declaration, parameter list, and return type are allowed. ` +
        `Got: ${s.slice(0, 120)}`,
    );
  }
  return OK;
}

// ---------------------------------------------------------------------------
// P7 — validateDocComment
//
// Rejects doc_comment values that still contain secret patterns after the
// client-side stripSecretPatterns() pass (defense-in-depth).
//
// Code examples in fenced blocks (``` ... ```) that happen to contain `{}`
// characters are allowed — the secret pattern check applies to the full string,
// not filtered by fences.
// ---------------------------------------------------------------------------

export function validateDocComment(s: string): ValidatorResult {
  for (const re of SECRET_PATTERN_DENYLIST) {
    // Reset lastIndex since patterns use the `g` flag
    re.lastIndex = 0;
    if (re.test(s)) {
      re.lastIndex = 0;
      return fail(
        "code_graph.doc_comment_secret_detected",
        `doc_comment appears to contain a secret token matching a known pattern. ` +
          `Strip secrets from doc comments before uploading.`,
      );
    }
    re.lastIndex = 0;
  }
  return OK;
}

// ---------------------------------------------------------------------------
// P8 — validateIdentifier
//
// Asserts that a name/qualified_name looks like a valid identifier per the
// language in question. The SDK-level IdentifierSchema already runs a regex,
// but this provides an additional language-aware check.
// ---------------------------------------------------------------------------

// Per-language identifier rules (simplified — the goal is to block free-form
// prose or code snippets in name fields, not to implement a full parser).
const IDENTIFIER_PATTERNS: Record<string, RegExp> = {
  // TS/JS/TSX/JSX: allows dotted paths, angle brackets for generics, optional [],
  typescript: /^[\w$][\w$.<>[\], \-:?|&]*$/,
  javascript: /^[\w$][\w$.<>[\], \-:?|&]*$/,
  tsx: /^[\w$][\w$.<>[\], \-:?|&]*$/,
  jsx: /^[\w$][\w$.<>[\], \-:?|&]*$/,
  // Python: dotted names (module.Class.method), dunder OK
  python: /^[_a-zA-Z][\w]*(\.[_a-zA-Z][\w]*)*$/,
  // Go: PkgPath.TypeName
  go: /^[_a-zA-Z][\w]*(\/[_a-zA-Z][\w]*)*(\.[_a-zA-Z][\w]*)*$/,
  // Others: permissive but no whitespace-only or empty
  rust: /^[_a-zA-Z][\w::<>, \-]*$/,
  java: /^[_a-zA-Z$][\w$.]*((<[\w$., [\]]+>))?$/,
  c: /^[_a-zA-Z][\w]*(\.[_a-zA-Z][\w]*)*$/,
  cpp: /^[_a-zA-Z][\w::<>, *&]*$/,
  csharp: /^[_a-zA-Z][\w.<>, \[\]]*$/,
  ruby: /^[_a-zA-Z][\w.?!]*$/,
  php: /^[_a-zA-Z\\][\w\\]*$/,
};

const FALLBACK_IDENTIFIER_PATTERN = /^[\w$][\w$.<>[\], \-:?|&./\\]*$/;

export function validateIdentifier(s: string, lang?: string): ValidatorResult {
  const pattern: RegExp = (lang !== undefined && lang !== "" ? IDENTIFIER_PATTERNS[lang] : undefined) ?? FALLBACK_IDENTIFIER_PATTERN;
  if (!pattern.test(s)) {
    return fail(
      "code_graph.identifier_invalid",
      `Identifier '${s.slice(0, 80)}' does not match the expected format for language '${lang ?? "unknown"}'. ` +
        `Only symbol names and qualified paths are allowed (no source code).`,
    );
  }
  return OK;
}

// ---------------------------------------------------------------------------
// Composite — validateFilePayload
//
// Runs all of the above validators on every symbol in a file payload.
// Returns the first error encountered, or {ok: true} if all pass.
//
// When e2eEncrypted=true the symbol name/qualified_name/signature/doc_comment
// fields contain AES-256-GCM base64 ciphertext — they are not identifiers or
// signatures and must bypass the per-field content-type validators. The
// EncryptedSymbolRecordSchema in the SDK already validated them as base64
// strings upstream (Zod parse), so we only need to skip the identifier /
// signature / secret-pattern checks here.
// ---------------------------------------------------------------------------

export function validateFilePayload(
  file: FilePayload,
  e2eEncrypted = false,
): ValidatorResult {
  // When Tier-2 E2E encryption is active, symbol name/qname/signature/doc_comment
  // are ciphertext blobs — skip content-type validation for those fields.
  if (e2eEncrypted) {
    return OK;
  }

  for (const symbol of file.symbols) {
    const nameResult = validateIdentifier(symbol.name, file.language);
    if (!nameResult.ok) return nameResult;

    const qnameResult = validateIdentifier(symbol.qualified_name, file.language);
    if (!qnameResult.ok) return qnameResult;

    if (symbol.signature !== undefined) {
      const sigResult = validateSignature(symbol.signature, file.language);
      if (!sigResult.ok) return sigResult;
    }

    if (symbol.doc_comment !== undefined) {
      const docResult = validateDocComment(symbol.doc_comment);
      if (!docResult.ok) return docResult;
    }
  }
  return OK;
}
