// V2.0.5-E1: Argon2id key-stretching for the Master Passphrase → Account Key
// step in the 2SKD hierarchy (spec §3.1).
//
// Parameters per spec: memory = 256 MB, iterations = 4, parallelism = 1,
// hashLength = 32. Target derivation time ≥ 500ms on a 2024-era laptop CPU
// — the bench script (scripts/argon2-bench.mjs) verifies this.
//
// The `argon2` npm package is a native binding to the reference C
// implementation; on linux/macOS it builds from source or uses prebuilt
// binaries. On Windows it requires a VC++ build chain.

import * as argon2 from "argon2";

export interface Argon2idParams {
  memoryKb: number;
  iterations: number;
  parallelism: number;
  hashLength: number;
}

export const DEFAULT_ARGON2ID_PARAMS: Argon2idParams = {
  memoryKb: 262144, // 256 MB
  iterations: 5,
  parallelism: 1,
  hashLength: 32
};

export const ARGON2ID_HARDENED_PARAMS: Argon2idParams = {
  memoryKb: 1048576, // 1 GB — opt-in for desktop with the helper
  iterations: 4,
  parallelism: 1,
  hashLength: 32
};

export interface DeriveInput {
  passphrase: string;
  /** Secret Key acts as the Argon2id salt (per spec §3.1 — 2SKD pattern). */
  secretKey: Uint8Array | Buffer;
  params?: Argon2idParams;
}

/**
 * Derive the Account Key from Master Passphrase + Secret Key via Argon2id.
 * Output is the 32-byte input to the downstream HKDF (deriveVaultMasterKey
 * in hkdf-chain.ts).
 */
export async function deriveAccountKey(input: DeriveInput): Promise<Buffer> {
  if (input.passphrase.length === 0) {
    throw new RangeError("passphrase must be non-empty");
  }
  const salt = Buffer.isBuffer(input.secretKey)
    ? input.secretKey
    : Buffer.from(input.secretKey);
  if (salt.length === 0) {
    throw new RangeError("secretKey (salt) must be non-empty");
  }
  const params = input.params ?? DEFAULT_ARGON2ID_PARAMS;

  // argon2.hash with `raw: true` returns the binary digest (not encoded
  // string), which is what we need for the HKDF ikm input.
  const out = (await argon2.hash(input.passphrase, {
    type: argon2.argon2id,
    salt,
    memoryCost: params.memoryKb,
    timeCost: params.iterations,
    parallelism: params.parallelism,
    hashLength: params.hashLength,
    raw: true
  })) as Buffer;

  if (out.length !== params.hashLength) {
    throw new Error(
      `argon2 produced ${out.length} bytes, expected ${params.hashLength}`
    );
  }
  return out;
}

/**
 * Benchmark: time deriveAccountKey N trials, return median ms.
 * Used by scripts/argon2-bench.mjs to verify V2.0.5-E1 acceptance
 * (≥ 500ms on a 2024-era laptop).
 */
export async function benchDeriveAccountKey(
  params: Argon2idParams,
  trials = 3
): Promise<{ medianMs: number; samplesMs: number[] }> {
  const samples: number[] = [];
  // Use a fixed passphrase + salt so all trials measure the same work.
  const passphrase = "benchmark-passphrase-of-reasonable-length-12345";
  const salt = Buffer.alloc(16, 0xab);
  for (let i = 0; i < trials; i++) {
    const start = performance.now();
    await deriveAccountKey({ passphrase, secretKey: salt, params });
    samples.push(performance.now() - start);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return { medianMs: median, samplesMs: samples };
}

export function isAcceptableDerivationTime(medianMs: number): boolean {
  return medianMs >= 500;
}
