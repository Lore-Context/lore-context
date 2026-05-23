#!/usr/bin/env node
// V2.0.5-E parity: generate cross-language test vectors used by the
// Python parity suite. The JSON file at
// `packages/shared/tests/crypto/cross-language-vectors.json` is the
// oracle — TS produces the values here, Python reproduces them.
//
// This script intentionally reimplements the chain inline using only
// `node:crypto` primitives so it can run without compiling the .ts
// sources. The TS implementation in `src/crypto/hkdf-chain.ts` and
// `src/crypto/aes-gcm-counter.ts` is the production reference; any
// drift between this script and the TS source is caught by the TS unit
// tests that exercise the same fixed inputs against the production
// modules.
import { hkdfSync, createCipheriv } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sharedRoot = join(__dirname, "..");

const VMK_INFO = Buffer.from("LoreVault-v1-MasterKey", "utf8");
const SECRET_INFO = Buffer.from("LoreSecret-v1", "utf8");
const AUDIT_INFO = Buffer.from("LoreAudit-v1", "utf8");
const AUDIT_SALT = Buffer.from("audit-chain", "utf8");

function hkdf32(ikm, salt, info) {
  return Buffer.from(hkdfSync("sha256", ikm, salt, info, 32));
}

function buildNonce(prefix, counter) {
  if (prefix.length !== 4) throw new Error(`prefix must be 4 bytes, got ${prefix.length}`);
  const nonce = Buffer.alloc(12);
  prefix.copy(nonce, 0);
  const c = typeof counter === "bigint" ? counter : BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    nonce[4 + i] = Number((c >> BigInt((7 - i) * 8)) & 0xffn);
  }
  return nonce;
}

function encryptAesGcm(plaintext, key, nonce, aad) {
  const cipher = createCipheriv("aes-256-gcm", key, nonce, { authTagLength: 16 });
  cipher.setAAD(aad);
  const part1 = cipher.update(plaintext);
  const part2 = cipher.final();
  return { ciphertext: Buffer.concat([part1, part2]), authTag: cipher.getAuthTag() };
}

const hex = (b) => Buffer.from(b).toString("hex");

const ACCOUNT_KEY = Buffer.from("a".repeat(64), "hex"); // 32 bytes
const SECRET_KEY = Buffer.from("b".repeat(32), "hex"); // 16 bytes
const SECRET_ID = Buffer.from("01020304050607080910111213141516", "hex"); // 16 bytes
const VAULT_PREFIX = Buffer.from("deadbeef", "hex"); // 4 bytes
const AAD = SECRET_ID;
const PLAINTEXT = Buffer.from("hunter2-github-token-example", "utf8");

const vmk = hkdf32(ACCOUNT_KEY, SECRET_KEY, VMK_INFO);
const perSecret = hkdf32(vmk, SECRET_ID, SECRET_INFO);
const auditKey = hkdf32(vmk, AUDIT_SALT, AUDIT_INFO);

// Boundary counter values + plaintext shapes for cross-language regression coverage:
//   counter=0      — schema default; never used in production but easy to mis-handle
//   counter=1      — first real encryption
//   counter=42     — mid-range
//   counter=u64-max−1 — high-bit set, catches signed/unsigned bugs
// Plus an empty-ish plaintext (one byte) and a 256-byte multi-block plaintext.
const PLAINTEXT_SHORT = Buffer.from("x", "utf8"); // 1 byte
const PLAINTEXT_LONG = Buffer.alloc(256);
for (let i = 0; i < 256; i++) PLAINTEXT_LONG[i] = (i * 31 + 7) & 0xff; // deterministic
const enc0 = encryptAesGcm(PLAINTEXT, perSecret, buildNonce(VAULT_PREFIX, 0), AAD);
const enc1 = encryptAesGcm(PLAINTEXT, perSecret, buildNonce(VAULT_PREFIX, 1), AAD);
const enc42 = encryptAesGcm(PLAINTEXT, perSecret, buildNonce(VAULT_PREFIX, 42), AAD);
const encHigh = encryptAesGcm(
  PLAINTEXT,
  perSecret,
  buildNonce(VAULT_PREFIX, "18446744073709551614"),
  AAD
);
const encShort = encryptAesGcm(PLAINTEXT_SHORT, perSecret, buildNonce(VAULT_PREFIX, 1), AAD);
const encLong = encryptAesGcm(PLAINTEXT_LONG, perSecret, buildNonce(VAULT_PREFIX, 1), AAD);

const vectors = {
  schemaVersion: 1,
  description:
    "Lore v2.0.5 cross-language crypto parity vectors. TS emits, Python verifies via cryptography lib (RFC 5869 HKDF-SHA256 + AES-256-GCM with deterministic 4|8 nonce + immutable secret_id as AAD).",
  generatedAt: new Date().toISOString(),
  inputs: {
    accountKeyHex: hex(ACCOUNT_KEY),
    secretKeyHex: hex(SECRET_KEY),
    secretIdHex: hex(SECRET_ID),
    vaultIdPrefixHex: hex(VAULT_PREFIX),
    aadHex: hex(AAD),
    plaintextUtf8: PLAINTEXT.toString("utf8")
  },
  expected: {
    vaultMasterKeyHex: hex(vmk),
    perSecretKeyHex: hex(perSecret),
    auditChainKeyHex: hex(auditKey),
    encryptCounter0: {
      nonceCounter: 0,
      plaintextUtf8: PLAINTEXT.toString("utf8"),
      ciphertextHex: hex(enc0.ciphertext),
      authTagHex: hex(enc0.authTag)
    },
    encryptCounter1: {
      nonceCounter: 1,
      plaintextUtf8: PLAINTEXT.toString("utf8"),
      ciphertextHex: hex(enc1.ciphertext),
      authTagHex: hex(enc1.authTag)
    },
    encryptCounter42: {
      nonceCounter: 42,
      plaintextUtf8: PLAINTEXT.toString("utf8"),
      ciphertextHex: hex(enc42.ciphertext),
      authTagHex: hex(enc42.authTag)
    },
    encryptCounterHigh: {
      nonceCounter: "18446744073709551614",
      plaintextUtf8: PLAINTEXT.toString("utf8"),
      ciphertextHex: hex(encHigh.ciphertext),
      authTagHex: hex(encHigh.authTag)
    },
    encryptShortPlaintext: {
      nonceCounter: 1,
      plaintextHex: PLAINTEXT_SHORT.toString("hex"),
      ciphertextHex: hex(encShort.ciphertext),
      authTagHex: hex(encShort.authTag)
    },
    encryptLongPlaintext: {
      nonceCounter: 1,
      plaintextHex: PLAINTEXT_LONG.toString("hex"),
      ciphertextHex: hex(encLong.ciphertext),
      authTagHex: hex(encLong.authTag)
    }
  }
};

const outPath = join(sharedRoot, "tests/crypto/cross-language-vectors.json");
writeFileSync(outPath, JSON.stringify(vectors, null, 2) + "\n");
process.stdout.write(`wrote ${outPath}\n`);
