// V2.0.5-E parity: TS side pins to the same JSON oracle the Python parity
// suite consumes. If the TS implementation drifts from the committed
// vectors, this test fails — which is the canary that production agents
// (TS and Python) would also disagree on ciphertext bytes.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deriveAuditChainKey, derivePerSecretKey, deriveVaultMasterKey } from "../../src/crypto/hkdf-chain.js";
import { decrypt, encrypt } from "../../src/crypto/aes-gcm-counter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_PATH = join(__dirname, "cross-language-vectors.json");

interface EncryptVector {
  nonceCounter: number | string; // string permits u64-max which exceeds JS safe int
  plaintextUtf8?: string;
  plaintextHex?: string;
  ciphertextHex: string;
  authTagHex: string;
}

interface Vectors {
  schemaVersion: number;
  inputs: {
    accountKeyHex: string;
    secretKeyHex: string;
    secretIdHex: string;
    vaultIdPrefixHex: string;
    aadHex: string;
    plaintextUtf8: string;
  };
  expected: {
    vaultMasterKeyHex: string;
    perSecretKeyHex: string;
    auditChainKeyHex: string;
    encryptCounter0: EncryptVector;
    encryptCounter1: EncryptVector;
    encryptCounter42: EncryptVector;
    encryptCounterHigh: EncryptVector;
    encryptShortPlaintext: EncryptVector;
    encryptLongPlaintext: EncryptVector;
  };
}

function loadVectors(): Vectors {
  if (!existsSync(VECTORS_PATH)) {
    throw new Error(
      `Cross-language vectors missing at ${VECTORS_PATH}. ` +
        "Regenerate via `node packages/shared/scripts/gen-parity-vectors.mjs`."
    );
  }
  return JSON.parse(readFileSync(VECTORS_PATH, "utf-8")) as Vectors;
}

describe("V2.0.5-E parity: TS implementation must match committed vectors", () => {
  const v = loadVectors();
  const accountKey = Buffer.from(v.inputs.accountKeyHex, "hex");
  const secretKey = Buffer.from(v.inputs.secretKeyHex, "hex");
  const secretId = Buffer.from(v.inputs.secretIdHex, "hex");
  const vaultPrefix = Buffer.from(v.inputs.vaultIdPrefixHex, "hex");
  const aad = Buffer.from(v.inputs.aadHex, "hex");
  const plaintext = Buffer.from(v.inputs.plaintextUtf8, "utf8");

  it("vault master key matches committed hex", () => {
    const vmk = deriveVaultMasterKey({ accountKey, secretKey });
    expect(vmk.toString("hex")).toBe(v.expected.vaultMasterKeyHex);
  });

  it("per-secret key matches committed hex", () => {
    const vmk = deriveVaultMasterKey({ accountKey, secretKey });
    const perSecret = derivePerSecretKey({ vaultMasterKey: vmk, secretId });
    expect(perSecret.toString("hex")).toBe(v.expected.perSecretKeyHex);
  });

  it("audit chain key matches committed hex", () => {
    const vmk = deriveVaultMasterKey({ accountKey, secretKey });
    const auditKey = deriveAuditChainKey(vmk);
    expect(auditKey.toString("hex")).toBe(v.expected.auditChainKeyHex);
  });

  it.each([
    ["counter=0 (boundary)", v.expected.encryptCounter0],
    ["counter=1", v.expected.encryptCounter1],
    ["counter=42", v.expected.encryptCounter42],
    ["counter=u64-max-1 (high-bit)", v.expected.encryptCounterHigh],
    ["1-byte plaintext", v.expected.encryptShortPlaintext],
    ["256-byte multi-block plaintext", v.expected.encryptLongPlaintext]
  ] as ReadonlyArray<readonly [string, EncryptVector]>)(
    "AES-GCM %s matches committed ciphertext + tag",
    (_label, block) => {
    const vmk = deriveVaultMasterKey({ accountKey, secretKey });
    const perSecret = derivePerSecretKey({ vaultMasterKey: vmk, secretId });
    const pt = block.plaintextHex
      ? Buffer.from(block.plaintextHex, "hex")
      : Buffer.from(block.plaintextUtf8 ?? v.inputs.plaintextUtf8, "utf8");
    const { ciphertext, authTag } = encrypt({
      plaintext: pt,
      perSecretKey: perSecret,
      vaultIdPrefix: vaultPrefix,
      nonceCounter: BigInt(block.nonceCounter),
      aad
    });
    expect(ciphertext.toString("hex")).toBe(block.ciphertextHex);
    expect(authTag.toString("hex")).toBe(block.authTagHex);

    const roundTrip = decrypt({
      ciphertext,
      authTag,
      perSecretKey: perSecret,
      vaultIdPrefix: vaultPrefix,
      nonceCounter: BigInt(block.nonceCounter),
      aad
    });
    expect(roundTrip.equals(pt)).toBe(true);
  });
});
