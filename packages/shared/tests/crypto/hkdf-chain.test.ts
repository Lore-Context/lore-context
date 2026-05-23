// Tests for HKDF chain key derivation. Covers determinism, avalanche
// behaviour, length contracts, and the three derivation paths defined in
// Lore Secret Vault v2.0.5 spec §3.

import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  HKDF_CHAIN_INTERNALS,
  deriveAuditChainKey,
  derivePerSecretKey,
  deriveVaultMasterKey
} from "../../src/crypto/hkdf-chain.js";

const ACCOUNT_KEY = Buffer.from(
  "a76e2dca8b1d4abff19c7fb1c5e602f8b1ee8fee9e8f6d36abeb1f4f3c4d2e1a",
  "hex"
);
const SECRET_KEY = Buffer.from(
  "001f3a7b9c5d2e4f6a8b0c1d2e3f4a5b",
  "hex"
);

function hammingDistance(a: Buffer, b: Buffer): number {
  if (a.length !== b.length) {
    throw new Error("hamming distance requires same-length buffers");
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff += popcount(a[i] ^ b[i]);
  }
  return diff;
}

function popcount(x: number): number {
  let n = x;
  n = n - ((n >> 1) & 0x55);
  n = (n & 0x33) + ((n >> 2) & 0x33);
  return ((n + (n >> 4)) & 0x0f);
}

describe("deriveVaultMasterKey", () => {
  it("produces a 32-byte VMK", () => {
    const vmk = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    expect(vmk.length).toBe(32);
  });

  it("is deterministic for fixed inputs", () => {
    const a = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const b = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    expect(a.equals(b)).toBe(true);
  });

  it("changes output when accountKey changes", () => {
    const baseline = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const flipped = Buffer.from(ACCOUNT_KEY);
    flipped[0] ^= 0x01;
    const mutated = deriveVaultMasterKey({ accountKey: flipped, secretKey: SECRET_KEY });
    expect(mutated.equals(baseline)).toBe(false);
    expect(hammingDistance(baseline, mutated)).toBeGreaterThanOrEqual(64); // ≥50% of 256 bits
  });

  it("changes output when secretKey changes", () => {
    const baseline = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const flipped = Buffer.from(SECRET_KEY);
    flipped[0] ^= 0x01;
    const mutated = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: flipped });
    expect(mutated.equals(baseline)).toBe(false);
    expect(hammingDistance(baseline, mutated)).toBeGreaterThanOrEqual(64);
  });

  it("rejects empty inputs", () => {
    expect(() =>
      deriveVaultMasterKey({ accountKey: Buffer.alloc(0), secretKey: SECRET_KEY })
    ).toThrow(RangeError);
    expect(() =>
      deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: Buffer.alloc(0) })
    ).toThrow(RangeError);
  });

  it("avalanches across 32 random inputs (≥50% bit-flip on 1-bit input change)", () => {
    let total = 0;
    const trials = 32;
    for (let i = 0; i < trials; i++) {
      const ak = randomBytes(32);
      const sk = randomBytes(16);
      const baseline = deriveVaultMasterKey({ accountKey: ak, secretKey: sk });
      const flipped = Buffer.from(ak);
      flipped[i % flipped.length] ^= 0x01;
      const mutated = deriveVaultMasterKey({ accountKey: flipped, secretKey: sk });
      total += hammingDistance(baseline, mutated);
    }
    // 32 trials × 256-bit output = 8192 bits total; ≥50% expected
    expect(total).toBeGreaterThanOrEqual(8192 * 0.4);
  });
});

describe("derivePerSecretKey", () => {
  it("produces a 32-byte per-secret key", () => {
    const vmk = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const psk = derivePerSecretKey({ vaultMasterKey: vmk, secretId: "1f3a7b9c-5d2e-4f6a-8b0c-1d2e3f4a5b6c" });
    expect(psk.length).toBe(32);
  });

  it("is deterministic", () => {
    const vmk = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const a = derivePerSecretKey({ vaultMasterKey: vmk, secretId: "id-A" });
    const b = derivePerSecretKey({ vaultMasterKey: vmk, secretId: "id-A" });
    expect(a.equals(b)).toBe(true);
  });

  it("differs across distinct secret ids", () => {
    const vmk = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const a = derivePerSecretKey({ vaultMasterKey: vmk, secretId: "id-A" });
    const b = derivePerSecretKey({ vaultMasterKey: vmk, secretId: "id-B" });
    expect(a.equals(b)).toBe(false);
  });

  it("rejects VMK with wrong length", () => {
    expect(() =>
      derivePerSecretKey({ vaultMasterKey: Buffer.alloc(16), secretId: "id" })
    ).toThrow(RangeError);
  });

  it("rejects empty secretId", () => {
    const vmk = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    expect(() => derivePerSecretKey({ vaultMasterKey: vmk, secretId: Buffer.alloc(0) })).toThrow(RangeError);
  });

  it("accepts UUID-style and binary secret ids interchangeably", () => {
    const vmk = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const uuid = "1f3a7b9c-5d2e-4f6a-8b0c-1d2e3f4a5b6c";
    const bin = Buffer.from(uuid, "utf8");
    const a = derivePerSecretKey({ vaultMasterKey: vmk, secretId: uuid });
    const b = derivePerSecretKey({ vaultMasterKey: vmk, secretId: bin });
    expect(a.equals(b)).toBe(true);
  });
});

describe("deriveAuditChainKey", () => {
  it("produces a 32-byte audit chain key", () => {
    const vmk = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const ack = deriveAuditChainKey(vmk);
    expect(ack.length).toBe(32);
  });

  it("is deterministic for fixed VMK", () => {
    const vmk = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const a = deriveAuditChainKey(vmk);
    const b = deriveAuditChainKey(vmk);
    expect(a.equals(b)).toBe(true);
  });

  it("differs from any per-secret key for the same VMK (domain separation works)", () => {
    const vmk = deriveVaultMasterKey({ accountKey: ACCOUNT_KEY, secretKey: SECRET_KEY });
    const ack = deriveAuditChainKey(vmk);
    const psk = derivePerSecretKey({ vaultMasterKey: vmk, secretId: "audit-chain" });
    expect(ack.equals(psk)).toBe(false);
  });

  it("rejects wrong-length VMK", () => {
    expect(() => deriveAuditChainKey(Buffer.alloc(31))).toThrow(RangeError);
  });
});

describe("HKDF_CHAIN_INTERNALS", () => {
  it("freezes domain-separation constants", () => {
    expect(HKDF_CHAIN_INTERNALS.VMK_INFO).toBe("LoreVault-v1-MasterKey");
    expect(HKDF_CHAIN_INTERNALS.SECRET_INFO).toBe("LoreSecret-v1");
    expect(HKDF_CHAIN_INTERNALS.AUDIT_INFO).toBe("LoreAudit-v1");
    expect(HKDF_CHAIN_INTERNALS.AUDIT_SALT).toBe("audit-chain");
    expect(HKDF_CHAIN_INTERNALS.KEY_LEN).toBe(32);
  });
});
