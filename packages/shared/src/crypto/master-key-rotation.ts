// Master Passphrase rotation ceremony for Lore Secret Vault v2.0.5.
//
// Per spec §3.4: rotating the Master Passphrase means deriving a new VMK
// (via Argon2id + HKDF — chained at the call site) and re-encrypting every
// secret's ciphertext with a per-secret key derived from the NEW VMK.
//
// Partial-state recovery (V2.0.5-E7 acceptance): the rotation table tracks
// `master_key_version` per row; if interrupted at item N, the resume path
// queries secret_items WHERE master_key_version < target_version and
// continues from N+1. This module provides the client-side ceremony
// helpers; server-side state lives in secret_vaults.rotation_in_progress
// and per-row master_key_version (Lane S schema).

import { derivePerSecretKey } from "./hkdf-chain.js";
import { decrypt, encrypt } from "./aes-gcm-counter.js";

export interface SecretRecord {
  secretId: string;
  ciphertext: Buffer;
  authTag: Buffer;
  nonceCounter: bigint;
  masterKeyVersion: number;
}

export interface RotatedSecret {
  secretId: string;
  ciphertext: Buffer;
  authTag: Buffer;
  nonceCounter: bigint; // always 1n after rotation (counter resets)
  masterKeyVersion: number; // new version
}

export interface RotationContext {
  oldVaultMasterKey: Buffer;
  newVaultMasterKey: Buffer;
  vaultIdPrefix: Buffer;
  oldMasterKeyVersion: number;
  newMasterKeyVersion: number;
}

export class RotationError extends Error {
  readonly code: "stale_version" | "decrypt_failed" | "bad_arg";
  constructor(code: "stale_version" | "decrypt_failed" | "bad_arg", message: string) {
    super(message);
    this.code = code;
    this.name = "RotationError";
  }
}

/** Re-encrypt one secret: decrypt with old VMK, encrypt with new VMK, reset nonce. */
export function rotateOne(secret: SecretRecord, ctx: RotationContext): RotatedSecret {
  if (ctx.newMasterKeyVersion <= ctx.oldMasterKeyVersion) {
    throw new RotationError(
      "bad_arg",
      `newMasterKeyVersion (${ctx.newMasterKeyVersion}) must exceed oldMasterKeyVersion (${ctx.oldMasterKeyVersion})`
    );
  }
  if (secret.masterKeyVersion >= ctx.newMasterKeyVersion) {
    // Already rotated to (or past) target — idempotent skip.
    return {
      secretId: secret.secretId,
      ciphertext: secret.ciphertext,
      authTag: secret.authTag,
      nonceCounter: secret.nonceCounter,
      masterKeyVersion: secret.masterKeyVersion
    };
  }
  if (secret.masterKeyVersion !== ctx.oldMasterKeyVersion) {
    throw new RotationError(
      "stale_version",
      `secret ${secret.secretId} has masterKeyVersion=${secret.masterKeyVersion}, ` +
        `expected oldMasterKeyVersion=${ctx.oldMasterKeyVersion}`
    );
  }

  const oldKey = derivePerSecretKey({
    vaultMasterKey: ctx.oldVaultMasterKey,
    secretId: secret.secretId
  });
  let plaintext: Buffer;
  try {
    plaintext = decrypt({
      ciphertext: secret.ciphertext,
      authTag: secret.authTag,
      perSecretKey: oldKey,
      vaultIdPrefix: ctx.vaultIdPrefix,
      nonceCounter: secret.nonceCounter,
      aad: secret.secretId
    });
  } catch (err) {
    throw new RotationError(
      "decrypt_failed",
      `decryption with old VMK failed for ${secret.secretId}`
    );
  }

  const newKey = derivePerSecretKey({
    vaultMasterKey: ctx.newVaultMasterKey,
    secretId: secret.secretId
  });
  const newNonceCounter = 1n;
  const { ciphertext, authTag } = encrypt({
    plaintext,
    perSecretKey: newKey,
    vaultIdPrefix: ctx.vaultIdPrefix,
    nonceCounter: newNonceCounter,
    aad: secret.secretId
  });

  // best-effort wipe of plaintext + derived keys
  plaintext.fill(0);
  oldKey.fill(0);
  newKey.fill(0);

  return {
    secretId: secret.secretId,
    ciphertext,
    authTag,
    nonceCounter: newNonceCounter,
    masterKeyVersion: ctx.newMasterKeyVersion
  };
}

export interface RotationProgress {
  /** Index into the secrets list of the last successfully rotated item. -1 if none yet. */
  lastSuccessfulIndex: number;
  /** Snapshot of all secrets, rotated ones replaced with new ciphertext + version. */
  secrets: (SecretRecord | RotatedSecret)[];
  /** True once every secret has masterKeyVersion === ctx.newMasterKeyVersion. */
  complete: boolean;
  /** When complete, the new vault-level master_key_version to commit. */
  newVaultMasterKeyVersion?: number;
}

/**
 * Run the full rotation in-memory and return a progress snapshot. The caller
 * persists each rotated row to the server one at a time; if the process is
 * interrupted, resumeRotation(...) picks up from `lastSuccessfulIndex + 1`
 * on the next call.
 *
 * onProgress is invoked after each successful item so the call site can
 * persist incrementally and update `progress.lastSuccessfulIndex` for the
 * resume path.
 */
export function runRotation(
  secrets: SecretRecord[],
  ctx: RotationContext,
  onProgress?: (rotated: RotatedSecret, index: number) => void
): RotationProgress {
  const out: (SecretRecord | RotatedSecret)[] = secrets.slice();
  let lastSuccessfulIndex = -1;
  for (let i = 0; i < secrets.length; i++) {
    const rotated = rotateOne(secrets[i], ctx);
    out[i] = rotated;
    lastSuccessfulIndex = i;
    onProgress?.(rotated, i);
  }
  return {
    lastSuccessfulIndex,
    secrets: out,
    complete: out.every(
      (s) =>
        ("masterKeyVersion" in s ? s.masterKeyVersion : 0) === ctx.newMasterKeyVersion
    ),
    newVaultMasterKeyVersion: ctx.newMasterKeyVersion
  };
}

/**
 * Resume rotation after a crash. `priorProgress.lastSuccessfulIndex` says
 * how far the previous run got. Items at-or-below that index that are
 * already at newMasterKeyVersion are skipped idempotently; items above
 * are rotated.
 */
export function resumeRotation(
  priorProgress: RotationProgress,
  ctx: RotationContext,
  onProgress?: (rotated: RotatedSecret, index: number) => void
): RotationProgress {
  const out: (SecretRecord | RotatedSecret)[] = priorProgress.secrets.slice();
  let lastSuccessfulIndex = priorProgress.lastSuccessfulIndex;
  for (let i = lastSuccessfulIndex + 1; i < out.length; i++) {
    const current = out[i] as SecretRecord;
    const rotated = rotateOne(current, ctx);
    out[i] = rotated;
    lastSuccessfulIndex = i;
    onProgress?.(rotated, i);
  }
  return {
    lastSuccessfulIndex,
    secrets: out,
    complete: out.every(
      (s) =>
        ("masterKeyVersion" in s ? s.masterKeyVersion : 0) === ctx.newMasterKeyVersion
    ),
    newVaultMasterKeyVersion: ctx.newMasterKeyVersion
  };
}
