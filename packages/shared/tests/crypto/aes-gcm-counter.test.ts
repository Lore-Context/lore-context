// Tests for AES-256-GCM with deterministic counter nonce.
// Covers Lore Secret Vault v2.0.5 AC V2.0.5-E2 (round-trip 10k random) and
// V2.0.5-E3 (AAD substitution attack rejected 100%).

import { describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import {
  AEAD_INTERNALS,
  AeadError,
  decrypt,
  encrypt
} from "../../src/crypto/aes-gcm-counter.js";

const KEY = Buffer.from(
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "hex"
);
const PREFIX = Buffer.from([0xaa, 0xbb, 0xcc, 0xdd]);
const AAD_A = Buffer.from(randomUUID().replace(/-/g, ""), "hex");
const AAD_B = Buffer.from(randomUUID().replace(/-/g, ""), "hex");

describe("encrypt / decrypt round-trip", () => {
  it("encrypts and decrypts a short plaintext", () => {
    const { ciphertext, authTag } = encrypt({
      plaintext: "hello world",
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 1n,
      aad: AAD_A
    });
    expect(ciphertext.length).toBe("hello world".length);
    expect(authTag.length).toBe(AEAD_INTERNALS.AUTH_TAG_LEN);

    const pt = decrypt({
      ciphertext,
      authTag,
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 1n,
      aad: AAD_A
    });
    expect(pt.toString("utf8")).toBe("hello world");
  });

  it("handles binary plaintext including null bytes", () => {
    const bin = Buffer.concat([Buffer.from([0, 1, 2, 3]), randomBytes(64), Buffer.from([0])]);
    const { ciphertext, authTag } = encrypt({
      plaintext: bin,
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 42n,
      aad: AAD_A
    });
    const pt = decrypt({
      ciphertext,
      authTag,
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 42n,
      aad: AAD_A
    });
    expect(pt.equals(bin)).toBe(true);
  });

  it("handles long plaintext (8 KB)", () => {
    const bin = randomBytes(8 * 1024);
    const { ciphertext, authTag } = encrypt({
      plaintext: bin,
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 7n,
      aad: AAD_A
    });
    const pt = decrypt({
      ciphertext,
      authTag,
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 7n,
      aad: AAD_A
    });
    expect(pt.equals(bin)).toBe(true);
  });

  // V2.0.5-E2 acceptance: 10k random round-trip
  it("round-trips 10k random (plaintext, AAD, counter) tuples", () => {
    const trials = 10_000;
    for (let i = 0; i < trials; i++) {
      const pt = randomBytes(8 + Math.floor(Math.random() * 64));
      const aad = randomBytes(16);
      const counter = BigInt(i + 1);
      const { ciphertext, authTag } = encrypt({
        plaintext: pt,
        perSecretKey: KEY,
        vaultIdPrefix: PREFIX,
        nonceCounter: counter,
        aad
      });
      const got = decrypt({
        ciphertext,
        authTag,
        perSecretKey: KEY,
        vaultIdPrefix: PREFIX,
        nonceCounter: counter,
        aad
      });
      if (!got.equals(pt)) {
        throw new Error(`round-trip failed at trial ${i}`);
      }
    }
    expect(true).toBe(true);
  });
});

describe("AAD substitution attack (V2.0.5-E3)", () => {
  it("rejects decryption when AAD differs", () => {
    const { ciphertext, authTag } = encrypt({
      plaintext: "secret data",
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 1n,
      aad: AAD_A
    });
    expect(() =>
      decrypt({
        ciphertext,
        authTag,
        perSecretKey: KEY,
        vaultIdPrefix: PREFIX,
        nonceCounter: 1n,
        aad: AAD_B
      })
    ).toThrowError(AeadError);
  });

  // V2.0.5-E3 acceptance: 10k random distinct-AAD trials, 100% rejected
  it(
    "rejects 100% of 10k AAD-substitution attempts",
    () => {
      const trials = 10_000;
      let rejected = 0;
      for (let i = 0; i < trials; i++) {
        const pt = randomBytes(32);
        const aad1 = randomBytes(16);
        let aad2 = randomBytes(16);
        // ensure aad2 != aad1
        while (aad2.equals(aad1)) {
          aad2 = randomBytes(16);
        }
        const counter = BigInt(i + 1);
        const { ciphertext, authTag } = encrypt({
          plaintext: pt,
          perSecretKey: KEY,
          vaultIdPrefix: PREFIX,
          nonceCounter: counter,
          aad: aad1
        });
        try {
          decrypt({
            ciphertext,
            authTag,
            perSecretKey: KEY,
            vaultIdPrefix: PREFIX,
            nonceCounter: counter,
            aad: aad2
          });
        } catch (err) {
          if (err instanceof AeadError && err.code === "decrypt_failed") {
            rejected++;
          }
        }
      }
      expect(rejected).toBe(trials);
    },
    20_000
  );
});

describe("tamper detection", () => {
  it("rejects tampered ciphertext", () => {
    const { ciphertext, authTag } = encrypt({
      plaintext: "secret",
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 1n,
      aad: AAD_A
    });
    const tampered = Buffer.from(ciphertext);
    tampered[0] ^= 0x01;
    expect(() =>
      decrypt({
        ciphertext: tampered,
        authTag,
        perSecretKey: KEY,
        vaultIdPrefix: PREFIX,
        nonceCounter: 1n,
        aad: AAD_A
      })
    ).toThrowError(AeadError);
  });

  it("rejects tampered auth tag", () => {
    const { ciphertext, authTag } = encrypt({
      plaintext: "secret",
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 1n,
      aad: AAD_A
    });
    const tag = Buffer.from(authTag);
    tag[0] ^= 0x01;
    expect(() =>
      decrypt({
        ciphertext,
        authTag: tag,
        perSecretKey: KEY,
        vaultIdPrefix: PREFIX,
        nonceCounter: 1n,
        aad: AAD_A
      })
    ).toThrowError(AeadError);
  });

  it("rejects wrong nonceCounter (treated as different nonce)", () => {
    const { ciphertext, authTag } = encrypt({
      plaintext: "secret",
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 1n,
      aad: AAD_A
    });
    expect(() =>
      decrypt({
        ciphertext,
        authTag,
        perSecretKey: KEY,
        vaultIdPrefix: PREFIX,
        nonceCounter: 2n,
        aad: AAD_A
      })
    ).toThrowError(AeadError);
  });

  it("rejects wrong vaultIdPrefix", () => {
    const { ciphertext, authTag } = encrypt({
      plaintext: "secret",
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 1n,
      aad: AAD_A
    });
    const wrongPrefix = Buffer.from([0xff, 0xff, 0xff, 0xff]);
    expect(() =>
      decrypt({
        ciphertext,
        authTag,
        perSecretKey: KEY,
        vaultIdPrefix: wrongPrefix,
        nonceCounter: 1n,
        aad: AAD_A
      })
    ).toThrowError(AeadError);
  });

  it("rejects wrong key", () => {
    const { ciphertext, authTag } = encrypt({
      plaintext: "secret",
      perSecretKey: KEY,
      vaultIdPrefix: PREFIX,
      nonceCounter: 1n,
      aad: AAD_A
    });
    const wrongKey = randomBytes(32);
    expect(() =>
      decrypt({
        ciphertext,
        authTag,
        perSecretKey: wrongKey,
        vaultIdPrefix: PREFIX,
        nonceCounter: 1n,
        aad: AAD_A
      })
    ).toThrowError(AeadError);
  });
});

describe("input validation", () => {
  it("rejects key with wrong length on encrypt", () => {
    expect(() =>
      encrypt({
        plaintext: "x",
        perSecretKey: Buffer.alloc(16),
        vaultIdPrefix: PREFIX,
        nonceCounter: 1n,
        aad: AAD_A
      })
    ).toThrow(/perSecretKey must be 32 bytes/);
  });

  it("rejects vaultIdPrefix with wrong length", () => {
    expect(() =>
      encrypt({
        plaintext: "x",
        perSecretKey: KEY,
        vaultIdPrefix: Buffer.alloc(3),
        nonceCounter: 1n,
        aad: AAD_A
      })
    ).toThrow(/vaultIdPrefix must be 4 bytes/);
  });

  it("rejects empty AAD", () => {
    expect(() =>
      encrypt({
        plaintext: "x",
        perSecretKey: KEY,
        vaultIdPrefix: PREFIX,
        nonceCounter: 1n,
        aad: Buffer.alloc(0)
      })
    ).toThrow(/aad must be non-empty/);
  });

  it("rejects negative nonceCounter", () => {
    expect(() =>
      encrypt({
        plaintext: "x",
        perSecretKey: KEY,
        vaultIdPrefix: PREFIX,
        nonceCounter: -1n,
        aad: AAD_A
      })
    ).toThrow(/nonceCounter must fit in u64/);
  });

  it("rejects nonceCounter > 2^64-1", () => {
    expect(() =>
      encrypt({
        plaintext: "x",
        perSecretKey: KEY,
        vaultIdPrefix: PREFIX,
        nonceCounter: 0x1_0000_0000_0000_0000n,
        aad: AAD_A
      })
    ).toThrow(/nonceCounter must fit in u64/);
  });
});

describe("nonce construction", () => {
  it("produces deterministic nonce = prefix || counter_be64", () => {
    const nonce1 = AEAD_INTERNALS.buildNonce(PREFIX, 1n);
    const nonce2 = AEAD_INTERNALS.buildNonce(PREFIX, 2n);
    expect(nonce1.length).toBe(12);
    expect(nonce1.subarray(0, 4).equals(PREFIX)).toBe(true);
    expect(nonce1.subarray(4)).toEqual(Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]));
    expect(nonce2.subarray(4)).toEqual(Buffer.from([0, 0, 0, 0, 0, 0, 0, 2]));
  });

  it("encodes large counters big-endian correctly", () => {
    const nonce = AEAD_INTERNALS.buildNonce(PREFIX, 0x0102030405060708n);
    expect(nonce.subarray(4)).toEqual(
      Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])
    );
  });
});
