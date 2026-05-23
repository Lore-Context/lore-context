/**
 * Lore v2.0.4 — Lane P P4 Tier-2 client-side encryption.
 *
 * Pro-tier opt-in. Symbol `name` / `signature` / `doc_comment` fields are
 * encrypted client-side using a user-controlled passphrase; ciphertext is
 * the only thing that reaches Lore Cloud. Server-side embedding search is
 * disabled in Tier-2 (the server can't index ciphertext).
 *
 * **Residual leakage** — explicit by design (see docs/privacy/code-graph-privacy-model.md):
 *   - file paths (e.g., `apps/api/src/billing/stripe-client.ts`)
 *   - line/column ranges
 *   - relation `kind` (calls / imports / extends / …)
 *   - graph topology (which encrypted symbol references which)
 *
 * Customers reading this should treat Tier-2 as "symbol-name obfuscation
 * with graph topology visible", not "end-to-end encryption". The honest
 * framing prevents litigation risk under v1.9 Privacy v2 promises.
 *
 * **Crypto profile**:
 *   - Key derivation: `crypto.scrypt(passphrase, salt, 32, {N: 2**16, r: 8, p: 1})`
 *     Plan §2 Lane P specifies Argon2id; Node stdlib does not ship Argon2id,
 *     so the v2.0.4 implementation uses scrypt with comparable parameters.
 *     v2.0.4.1 swaps to Argon2id once the `argon2` package is added as a
 *     dependency (cost: ~120 KB native module). Both KDFs target ~64 MB
 *     RAM + ~250 ms wall-clock per derivation on a modern laptop.
 *   - Cipher: AES-256-GCM with 96-bit IV and 128-bit auth tag. The wire
 *     envelope is `salt(16) || iv(12) || ciphertext || tag(16)` base64-encoded.
 *
 * The key NEVER leaves the client. There is no key escrow, no recovery path.
 * Lost passphrase → lost graph access. This is the Pro-tier contract.
 *
 * @module @lore-context/code-indexer/encryption-tier2
 */

import { randomBytes, scryptSync, createCipheriv, createDecipheriv, createHmac } from "node:crypto";

const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32;
const TAG_BYTES = 16;
const SCRYPT_N = 1 << 16; // 65536
const SCRYPT_R = 8;
const SCRYPT_P = 1;

// ---------------------------------------------------------------------------
// Deterministic identifier salt
//
// For deterministic-HMAC identity fields, we need a *stable* salt so the same
// (plaintext, passphrase) tuple maps to the same ciphertext across calls AND
// across processes/machines. Using a fixed application-level salt is sound
// here because:
//   1. The HMAC key is derived from the user's passphrase (scrypt), which the
//      attacker does not have.
//   2. Equality leakage across the symbol graph is documented residual
//      leakage of Tier-2 (see docs/privacy/code-graph-privacy-model.md).
//   3. Per-invocation salt would defeat the purpose — the resolver needs
//      relation src/dst qnames to match symbol qnames bytewise.
//
// The string below is a stable, application-wide tag — it is NOT secret.
// ---------------------------------------------------------------------------

const DETERMINISTIC_ID_SALT = Buffer.from(
  "lore-code-graph-tier2-deterministic-identifier-salt-v1",
  "utf8",
);

/**
 * Derive a 32-byte AES key from a passphrase + salt via scrypt.
 *
 * Deterministic given (passphrase, salt): use the same salt for encrypt
 * and decrypt. Salt MUST be unique per ciphertext (we store it in the
 * envelope; do NOT reuse).
 */
export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 256 * 1024 * 1024, // 256 MB ceiling
  });
}

/**
 * Encrypt a UTF-8 string. Returns a base64 envelope:
 *   `base64(salt || iv || ciphertext || authTag)`
 *
 * The output is always longer than the input; do not use this for fields
 * subject to per-row size limits without checking the resulting envelope
 * length. (Practical sizes: salt(16) + iv(12) + tag(16) = 44 bytes of fixed
 * overhead + ~4/3 base64 expansion of ciphertext.)
 */
export function encryptString(plaintext: string, passphrase: string): string {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct1 = cipher.update(plaintext, "utf8");
  const ct2 = cipher.final();
  const tag = cipher.getAuthTag();
  const envelope = Buffer.concat([salt, iv, ct1, ct2, tag]);
  return envelope.toString("base64");
}

/**
 * Decrypt a base64 envelope produced by {@link encryptString}.
 *
 * Throws on tampered ciphertext (AES-GCM tag mismatch) or wrong passphrase.
 * The caller MUST handle the throw; never swallow — a silently-wrong
 * decrypt would corrupt the graph.
 */
export function decryptString(envelopeB64: string, passphrase: string): string {
  const envelope = Buffer.from(envelopeB64, "base64");
  if (envelope.length < SALT_BYTES + IV_BYTES + TAG_BYTES) {
    throw new Error("encryption-tier2: envelope too short to contain salt+iv+tag");
  }
  const salt = envelope.subarray(0, SALT_BYTES);
  const iv = envelope.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const tag = envelope.subarray(envelope.length - TAG_BYTES);
  const ciphertext = envelope.subarray(SALT_BYTES + IV_BYTES, envelope.length - TAG_BYTES);
  const key = deriveKey(passphrase, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt1 = decipher.update(ciphertext);
  const pt2 = decipher.final();
  return Buffer.concat([pt1, pt2]).toString("utf8");
}

/**
 * Deterministic HMAC-based identifier obfuscation for Tier-2 queryable fields.
 *
 * CRITICAL — equality-leak by design. The output is base64(HMAC-SHA256(key, plaintext))
 * where `key` is derived from the passphrase via scrypt against a fixed
 * application salt {@link DETERMINISTIC_ID_SALT}. The same (plaintext,
 * passphrase) pair produces the same output across all calls and processes.
 *
 * **Why this exists**: the v22 symbol/relation graph requires `code_symbols.qualified_name`
 * to match `code_relations.src_qname` / `dst_qname` bytewise so the resolver
 * can wire up relation FKs. Random-IV AES-GCM (see {@link encryptString})
 * produces a fresh ciphertext per call, which makes relation resolution
 * impossible in Tier-2 mode.
 *
 * **Privacy trade-off**: equality across the graph is visible to Lore Cloud —
 * i.e. an adversary with database access can see that two symbols share the
 * same encrypted name, and that a relation's dst matches a particular symbol.
 * This is exactly the documented residual leakage of Tier-2 (graph topology +
 * symbol-identity equality). Use {@link encryptString} for fully secret fields
 * like `signature` and `doc_comment` where this leakage is unacceptable.
 *
 * See: docs/privacy/code-graph-privacy-model.md — Tier-2 residual leakage.
 */
export function deterministicIdentifier(plaintext: string, passphrase: string): string {
  const key = scryptSync(passphrase, DETERMINISTIC_ID_SALT, KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 256 * 1024 * 1024,
  });
  const mac = createHmac("sha256", key).update(plaintext, "utf8").digest();
  return mac.toString("base64");
}

/**
 * Encrypt the sensitive fields of a SymbolRecord-shaped object. Returns a
 * new object where:
 *   - `name`, `qualified_name`  → deterministic HMAC base64 (equality-preserving,
 *     required for relation resolution).
 *   - `signature`, `doc_comment` → random-IV AES-256-GCM envelope (no equality
 *     leak; fully secret).
 *
 * Structural fields (kind, lines, is_exported, metadata) pass through unchanged.
 *
 * The split is intentional: only the identity fields (name/qualified_name)
 * need to round-trip identically across calls so the server can resolve
 * `code_relations` FKs. The narrative fields can — and should — use the
 * full random-IV scheme so an attacker with DB access cannot tell whether
 * two symbols have the same signature or doc comment.
 */
export function encryptSymbolFields<
  T extends {
    name: string;
    qualified_name: string;
    signature?: string;
    doc_comment?: string;
  },
>(symbol: T, passphrase: string): T {
  return {
    ...symbol,
    name: deterministicIdentifier(symbol.name, passphrase),
    qualified_name: deterministicIdentifier(symbol.qualified_name, passphrase),
    signature: symbol.signature ? encryptString(symbol.signature, passphrase) : undefined,
    doc_comment: symbol.doc_comment ? encryptString(symbol.doc_comment, passphrase) : undefined,
  };
}

/**
 * Inverse of {@link encryptSymbolFields} for the *secret* fields only.
 *
 * Because `name` and `qualified_name` are now HMAC outputs (one-way), they
 * CANNOT be decrypted back to plaintext. They are returned unchanged. Callers
 * who need plaintext display names must maintain a local plaintext-to-hash
 * map keyed by their own copy of the source.
 *
 * `signature` and `doc_comment` are decrypted normally (AES-GCM).
 *
 * This is a behavior change from earlier Tier-2 implementations and is
 * documented as the Tier-2 equality-leakage trade-off.
 */
export function decryptSymbolFields<
  T extends {
    name: string;
    qualified_name: string;
    signature?: string;
    doc_comment?: string;
  },
>(symbol: T, passphrase: string): T {
  return {
    ...symbol,
    // name / qualified_name are HMAC outputs — one-way. Return as-is.
    name: symbol.name,
    qualified_name: symbol.qualified_name,
    signature: symbol.signature ? decryptString(symbol.signature, passphrase) : undefined,
    doc_comment: symbol.doc_comment ? decryptString(symbol.doc_comment, passphrase) : undefined,
  };
}
