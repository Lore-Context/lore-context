// HKDF-SHA256 key derivation chain for Lore Secret Vault v2.0.5.
// Implements the three-step hierarchy from spec §3.1 / §3.2 / §3.6:
//   Account Key   = Argon2id(passphrase, salt=Secret Key, ...)   [Argon2id step lives elsewhere]
//   Vault Master  = HKDF-SHA256(ikm=Account Key, salt=Secret Key, info="LoreVault-v1-MasterKey", L=32)
//   Per-Secret    = HKDF-SHA256(ikm=VMK,         salt=secret_id,   info="LoreSecret-v1",         L=32)
//   Audit Chain   = HKDF-SHA256(ikm=VMK,         salt="audit-chain", info="LoreAudit-v1",         L=32)
//
// All inputs are byte buffers. All outputs are 32-byte buffers. Inputs are
// validated for length where the spec requires fixed sizes.

import { hkdfSync } from "node:crypto";

const VMK_INFO = "LoreVault-v1-MasterKey";
const SECRET_INFO = "LoreSecret-v1";
const AUDIT_INFO = "LoreAudit-v1";
const AUDIT_SALT = "audit-chain";
const KEY_LEN = 32;

function toBuffer(input: Uint8Array | Buffer | string, label: string): Buffer {
  if (typeof input === "string") {
    return Buffer.from(input, "utf8");
  }
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (input instanceof Uint8Array) {
    return Buffer.from(input);
  }
  throw new TypeError(`${label} must be Buffer | Uint8Array | string`);
}

function hkdf32(ikm: Buffer, salt: Buffer, info: string): Buffer {
  const out = hkdfSync("sha256", ikm, salt, Buffer.from(info, "utf8"), KEY_LEN);
  return Buffer.from(out);
}

export interface DeriveVaultMasterKeyInput {
  accountKey: Uint8Array | Buffer;
  secretKey: Uint8Array | Buffer;
}

export function deriveVaultMasterKey({ accountKey, secretKey }: DeriveVaultMasterKeyInput): Buffer {
  const ikm = toBuffer(accountKey, "accountKey");
  const salt = toBuffer(secretKey, "secretKey");
  if (ikm.length === 0) {
    throw new RangeError("accountKey must be non-empty");
  }
  if (salt.length === 0) {
    throw new RangeError("secretKey must be non-empty");
  }
  return hkdf32(ikm, salt, VMK_INFO);
}

export interface DerivePerSecretKeyInput {
  vaultMasterKey: Uint8Array | Buffer;
  secretId: Uint8Array | Buffer | string;
}

export function derivePerSecretKey({ vaultMasterKey, secretId }: DerivePerSecretKeyInput): Buffer {
  const ikm = toBuffer(vaultMasterKey, "vaultMasterKey");
  const salt = toBuffer(secretId, "secretId");
  if (ikm.length !== KEY_LEN) {
    throw new RangeError(`vaultMasterKey must be ${KEY_LEN} bytes, got ${ikm.length}`);
  }
  if (salt.length === 0) {
    throw new RangeError("secretId must be non-empty");
  }
  return hkdf32(ikm, salt, SECRET_INFO);
}

export function deriveAuditChainKey(vaultMasterKey: Uint8Array | Buffer): Buffer {
  const ikm = toBuffer(vaultMasterKey, "vaultMasterKey");
  if (ikm.length !== KEY_LEN) {
    throw new RangeError(`vaultMasterKey must be ${KEY_LEN} bytes, got ${ikm.length}`);
  }
  return hkdf32(ikm, Buffer.from(AUDIT_SALT, "utf8"), AUDIT_INFO);
}

export const HKDF_CHAIN_INTERNALS = {
  VMK_INFO,
  SECRET_INFO,
  AUDIT_INFO,
  AUDIT_SALT,
  KEY_LEN
};
