// AES-256-GCM encryption with deterministic counter nonce for Lore Secret
// Vault v2.0.5. Per spec §3.3, the 12-byte nonce is constructed from a
// 4-byte vault_id prefix plus an 8-byte big-endian counter that the server
// enforces monotonic per (vault_id, secret_id). The AAD is the immutable
// secret_id so label renames do NOT invalidate ciphertext.
//
// The auth_tag is returned separate from the ciphertext (Node convention
// when the auth tag is requested explicitly), matching how it is stored
// in secret_items.auth_tag and validated server-side via the GCM tag
// check that AAD substitution and ciphertext tampering both trigger.

import { createCipheriv, createDecipheriv } from "node:crypto";

const KEY_LEN = 32;
const NONCE_LEN = 12;
const VAULT_PREFIX_LEN = 4;
const COUNTER_LEN = 8;
const AUTH_TAG_LEN = 16;

export class AeadError extends Error {
  readonly code: "decrypt_failed" | "bad_length" | "bad_counter";
  constructor(code: "decrypt_failed" | "bad_length" | "bad_counter", message: string) {
    super(message);
    this.code = code;
    this.name = "AeadError";
  }
}

function buildNonce(vaultIdPrefix: Buffer, nonceCounter: bigint): Buffer {
  if (vaultIdPrefix.length !== VAULT_PREFIX_LEN) {
    throw new AeadError(
      "bad_length",
      `vaultIdPrefix must be ${VAULT_PREFIX_LEN} bytes, got ${vaultIdPrefix.length}`
    );
  }
  if (nonceCounter < 0n || nonceCounter > 0xffff_ffff_ffff_ffffn) {
    throw new AeadError("bad_counter", `nonceCounter must fit in u64, got ${nonceCounter}`);
  }
  const nonce = Buffer.allocUnsafe(NONCE_LEN);
  vaultIdPrefix.copy(nonce, 0, 0, VAULT_PREFIX_LEN);
  // 8 bytes big-endian counter
  for (let i = COUNTER_LEN - 1; i >= 0; i--) {
    nonce[VAULT_PREFIX_LEN + i] = Number(nonceCounter & 0xffn);
    nonceCounter >>= 8n;
  }
  return nonce;
}

function toBuf(v: Uint8Array | Buffer | string, label: string): Buffer {
  if (typeof v === "string") {
    return Buffer.from(v, "utf8");
  }
  if (Buffer.isBuffer(v)) {
    return v;
  }
  if (v instanceof Uint8Array) {
    return Buffer.from(v);
  }
  throw new TypeError(`${label} must be Buffer | Uint8Array | string`);
}

export interface EncryptInput {
  plaintext: Uint8Array | Buffer | string;
  perSecretKey: Uint8Array | Buffer;
  vaultIdPrefix: Uint8Array | Buffer;
  nonceCounter: bigint;
  aad: Uint8Array | Buffer | string;
}

export interface EncryptOutput {
  ciphertext: Buffer;
  authTag: Buffer;
}

export function encrypt({
  plaintext,
  perSecretKey,
  vaultIdPrefix,
  nonceCounter,
  aad
}: EncryptInput): EncryptOutput {
  const key = toBuf(perSecretKey, "perSecretKey");
  if (key.length !== KEY_LEN) {
    throw new AeadError("bad_length", `perSecretKey must be ${KEY_LEN} bytes, got ${key.length}`);
  }
  const prefix = toBuf(vaultIdPrefix, "vaultIdPrefix");
  const nonce = buildNonce(prefix, nonceCounter);
  const aadBuf = toBuf(aad, "aad");
  if (aadBuf.length === 0) {
    throw new AeadError("bad_length", "aad must be non-empty");
  }

  const cipher = createCipheriv("aes-256-gcm", key, nonce, { authTagLength: AUTH_TAG_LEN });
  cipher.setAAD(aadBuf);
  const pt = toBuf(plaintext, "plaintext");
  const part1 = cipher.update(pt);
  const part2 = cipher.final();
  const ciphertext = Buffer.concat([part1, part2]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, authTag };
}

export interface DecryptInput {
  ciphertext: Uint8Array | Buffer;
  authTag: Uint8Array | Buffer;
  perSecretKey: Uint8Array | Buffer;
  vaultIdPrefix: Uint8Array | Buffer;
  nonceCounter: bigint;
  aad: Uint8Array | Buffer | string;
}

export function decrypt({
  ciphertext,
  authTag,
  perSecretKey,
  vaultIdPrefix,
  nonceCounter,
  aad
}: DecryptInput): Buffer {
  const key = toBuf(perSecretKey, "perSecretKey");
  if (key.length !== KEY_LEN) {
    throw new AeadError("bad_length", `perSecretKey must be ${KEY_LEN} bytes, got ${key.length}`);
  }
  const tag = toBuf(authTag, "authTag");
  if (tag.length !== AUTH_TAG_LEN) {
    throw new AeadError("bad_length", `authTag must be ${AUTH_TAG_LEN} bytes, got ${tag.length}`);
  }
  const prefix = toBuf(vaultIdPrefix, "vaultIdPrefix");
  const nonce = buildNonce(prefix, nonceCounter);
  const aadBuf = toBuf(aad, "aad");
  if (aadBuf.length === 0) {
    throw new AeadError("bad_length", "aad must be non-empty");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, nonce, { authTagLength: AUTH_TAG_LEN });
  decipher.setAuthTag(tag);
  decipher.setAAD(aadBuf);
  const ct = toBuf(ciphertext, "ciphertext");
  try {
    const part1 = decipher.update(ct);
    const part2 = decipher.final();
    return Buffer.concat([part1, part2]);
  } catch (err) {
    // GCM auth failure is the only path that surfaces here for tampered
    // ciphertext / wrong aad / wrong key / wrong nonceCounter.
    throw new AeadError("decrypt_failed", "AES-256-GCM auth tag check failed");
  }
}

export const AEAD_INTERNALS = {
  KEY_LEN,
  NONCE_LEN,
  VAULT_PREFIX_LEN,
  COUNTER_LEN,
  AUTH_TAG_LEN,
  buildNonce
};
