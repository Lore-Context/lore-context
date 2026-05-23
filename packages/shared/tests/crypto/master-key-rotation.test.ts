// Tests for Master Passphrase rotation (V2.0.5-E7 acceptance:
// rotation with partial-state recovery).

import { describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { derivePerSecretKey, deriveVaultMasterKey } from "../../src/crypto/hkdf-chain.js";
import { decrypt, encrypt } from "../../src/crypto/aes-gcm-counter.js";
import {
  RotationError,
  resumeRotation,
  rotateOne,
  runRotation,
  type RotationContext,
  type SecretRecord
} from "../../src/crypto/master-key-rotation.js";

function deriveVmk(label: string): Buffer {
  return deriveVaultMasterKey({
    accountKey: Buffer.from(label.padEnd(64, "0"), "utf8").subarray(0, 32),
    secretKey: Buffer.from("00112233445566778899aabbccddeeff", "hex")
  });
}

function makeSecret(plaintext: string, vmk: Buffer, vaultIdPrefix: Buffer, masterKeyVersion: number): SecretRecord {
  const secretId = randomUUID();
  const perSecretKey = derivePerSecretKey({ vaultMasterKey: vmk, secretId });
  const { ciphertext, authTag } = encrypt({
    plaintext,
    perSecretKey,
    vaultIdPrefix,
    nonceCounter: 1n,
    aad: secretId
  });
  return {
    secretId,
    ciphertext,
    authTag,
    nonceCounter: 1n,
    masterKeyVersion
  };
}

const VAULT_PREFIX = Buffer.from([0xde, 0xad, 0xbe, 0xef]);

describe("rotateOne", () => {
  it("re-encrypts a secret under new VMK and resets nonce_counter", () => {
    const oldVmk = deriveVmk("old");
    const newVmk = deriveVmk("new");
    const secret = makeSecret("hello world", oldVmk, VAULT_PREFIX, 1);

    const rotated = rotateOne(secret, {
      oldVaultMasterKey: oldVmk,
      newVaultMasterKey: newVmk,
      vaultIdPrefix: VAULT_PREFIX,
      oldMasterKeyVersion: 1,
      newMasterKeyVersion: 2
    });

    expect(rotated.masterKeyVersion).toBe(2);
    expect(rotated.nonceCounter).toBe(1n); // reset

    // New ciphertext is decryptable with new VMK + reset counter
    const newKey = derivePerSecretKey({ vaultMasterKey: newVmk, secretId: rotated.secretId });
    const pt = decrypt({
      ciphertext: rotated.ciphertext,
      authTag: rotated.authTag,
      perSecretKey: newKey,
      vaultIdPrefix: VAULT_PREFIX,
      nonceCounter: rotated.nonceCounter,
      aad: rotated.secretId
    });
    expect(pt.toString("utf8")).toBe("hello world");
  });

  it("rejects rotation if newMasterKeyVersion <= oldMasterKeyVersion", () => {
    const oldVmk = deriveVmk("old");
    const newVmk = deriveVmk("new");
    const secret = makeSecret("x", oldVmk, VAULT_PREFIX, 1);

    expect(() =>
      rotateOne(secret, {
        oldVaultMasterKey: oldVmk,
        newVaultMasterKey: newVmk,
        vaultIdPrefix: VAULT_PREFIX,
        oldMasterKeyVersion: 1,
        newMasterKeyVersion: 1
      })
    ).toThrowError(RotationError);
  });

  it("rejects stale version (secret.masterKeyVersion ≠ oldMasterKeyVersion)", () => {
    const oldVmk = deriveVmk("old");
    const newVmk = deriveVmk("new");
    const secret = makeSecret("x", oldVmk, VAULT_PREFIX, 0); // version 0, not 1
    expect(() =>
      rotateOne(secret, {
        oldVaultMasterKey: oldVmk,
        newVaultMasterKey: newVmk,
        vaultIdPrefix: VAULT_PREFIX,
        oldMasterKeyVersion: 1,
        newMasterKeyVersion: 2
      })
    ).toThrowError(/stale_version|masterKeyVersion=0/);
  });

  it("is idempotent: already-rotated secret returned unchanged", () => {
    const oldVmk = deriveVmk("old");
    const newVmk = deriveVmk("new");
    // Create at version 1, rotate to 2 once
    const v1 = makeSecret("x", oldVmk, VAULT_PREFIX, 1);
    const v2 = rotateOne(v1, {
      oldVaultMasterKey: oldVmk,
      newVaultMasterKey: newVmk,
      vaultIdPrefix: VAULT_PREFIX,
      oldMasterKeyVersion: 1,
      newMasterKeyVersion: 2
    });
    // Calling rotateOne again with the same target version: no-op
    const v2Again = rotateOne(
      {
        secretId: v2.secretId,
        ciphertext: v2.ciphertext,
        authTag: v2.authTag,
        nonceCounter: v2.nonceCounter,
        masterKeyVersion: v2.masterKeyVersion
      },
      {
        oldVaultMasterKey: oldVmk,
        newVaultMasterKey: newVmk,
        vaultIdPrefix: VAULT_PREFIX,
        oldMasterKeyVersion: 1,
        newMasterKeyVersion: 2
      }
    );
    expect(v2Again.ciphertext.equals(v2.ciphertext)).toBe(true);
    expect(v2Again.authTag.equals(v2.authTag)).toBe(true);
  });

  it("fails decrypt with wrong oldVaultMasterKey", () => {
    const realOld = deriveVmk("old");
    const wrongOld = deriveVmk("wrong");
    const newVmk = deriveVmk("new");
    const secret = makeSecret("x", realOld, VAULT_PREFIX, 1);

    expect(() =>
      rotateOne(secret, {
        oldVaultMasterKey: wrongOld,
        newVaultMasterKey: newVmk,
        vaultIdPrefix: VAULT_PREFIX,
        oldMasterKeyVersion: 1,
        newMasterKeyVersion: 2
      })
    ).toThrowError(/decryption with old VMK failed/);
  });
});

describe("runRotation full pipeline", () => {
  it("rotates 50 secrets and they all decrypt under new VMK", () => {
    const oldVmk = deriveVmk("old");
    const newVmk = deriveVmk("new");
    const ctx: RotationContext = {
      oldVaultMasterKey: oldVmk,
      newVaultMasterKey: newVmk,
      vaultIdPrefix: VAULT_PREFIX,
      oldMasterKeyVersion: 1,
      newMasterKeyVersion: 2
    };
    const plaintexts: Buffer[] = [];
    const secrets: SecretRecord[] = [];
    for (let i = 0; i < 50; i++) {
      const pt = randomBytes(32);
      plaintexts.push(pt);
      secrets.push(makeSecret(pt.toString("hex"), oldVmk, VAULT_PREFIX, 1));
    }

    const progress = runRotation(secrets, ctx);
    expect(progress.complete).toBe(true);
    expect(progress.lastSuccessfulIndex).toBe(49);
    expect(progress.newVaultMasterKeyVersion).toBe(2);

    for (let i = 0; i < 50; i++) {
      const r = progress.secrets[i];
      if (!("masterKeyVersion" in r) || r.masterKeyVersion !== 2) {
        throw new Error(`secret ${i} did not rotate`);
      }
      const newKey = derivePerSecretKey({ vaultMasterKey: newVmk, secretId: r.secretId });
      const pt = decrypt({
        ciphertext: r.ciphertext,
        authTag: r.authTag,
        perSecretKey: newKey,
        vaultIdPrefix: VAULT_PREFIX,
        nonceCounter: r.nonceCounter,
        aad: r.secretId
      });
      expect(pt.toString("utf8")).toBe(plaintexts[i].toString("hex"));
    }
  });

  it("invokes onProgress callback for each successful rotation", () => {
    const oldVmk = deriveVmk("old");
    const newVmk = deriveVmk("new");
    const ctx: RotationContext = {
      oldVaultMasterKey: oldVmk,
      newVaultMasterKey: newVmk,
      vaultIdPrefix: VAULT_PREFIX,
      oldMasterKeyVersion: 1,
      newMasterKeyVersion: 2
    };
    const secrets = Array.from({ length: 5 }, () => makeSecret("x", oldVmk, VAULT_PREFIX, 1));
    const calls: number[] = [];
    runRotation(secrets, ctx, (_r, i) => calls.push(i));
    expect(calls).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("resumeRotation (V2.0.5-E7 partial-state recovery)", () => {
  it("resumes from lastSuccessfulIndex + 1 after interruption", () => {
    const oldVmk = deriveVmk("old");
    const newVmk = deriveVmk("new");
    const ctx: RotationContext = {
      oldVaultMasterKey: oldVmk,
      newVaultMasterKey: newVmk,
      vaultIdPrefix: VAULT_PREFIX,
      oldMasterKeyVersion: 1,
      newMasterKeyVersion: 2
    };

    // 10 secrets, simulate crash after index 4 (first 5 rotated)
    const secrets = Array.from({ length: 10 }, () => makeSecret("plain", oldVmk, VAULT_PREFIX, 1));

    let crashAt = 4;
    let priorProgress;
    try {
      runRotation(secrets, ctx, (_r, i) => {
        if (i === crashAt) {
          // record state up to and including index 4, then "crash"
          priorProgress = {
            lastSuccessfulIndex: i,
            secrets: secrets.map((s, idx) =>
              idx <= i ? rotateOne(s, ctx) : s
            ),
            complete: false
          };
          throw new Error("simulated crash");
        }
      });
    } catch (err) {
      expect((err as Error).message).toBe("simulated crash");
    }
    expect(priorProgress).toBeDefined();
    expect(priorProgress!.lastSuccessfulIndex).toBe(4);

    // Resume — re-derive from the snapshot which has 5 rotated (idx 0..4) and 5 stale (idx 5..9)
    const final = resumeRotation(priorProgress!, ctx);
    expect(final.complete).toBe(true);
    expect(final.lastSuccessfulIndex).toBe(9);
    for (let i = 0; i < 10; i++) {
      const r = final.secrets[i];
      if (!("masterKeyVersion" in r) || r.masterKeyVersion !== 2) {
        throw new Error(`secret ${i} not at new version after resume`);
      }
    }
  });

  it("resume is idempotent if invoked when already complete", () => {
    const oldVmk = deriveVmk("old");
    const newVmk = deriveVmk("new");
    const ctx: RotationContext = {
      oldVaultMasterKey: oldVmk,
      newVaultMasterKey: newVmk,
      vaultIdPrefix: VAULT_PREFIX,
      oldMasterKeyVersion: 1,
      newMasterKeyVersion: 2
    };
    const secrets = Array.from({ length: 3 }, () => makeSecret("x", oldVmk, VAULT_PREFIX, 1));
    const first = runRotation(secrets, ctx);
    expect(first.complete).toBe(true);

    const again = resumeRotation(first, ctx);
    expect(again.complete).toBe(true);
    expect(again.lastSuccessfulIndex).toBe(first.lastSuccessfulIndex);
  });
});
