// Best-effort key zeroing helpers for Lore Secret Vault v2.0.5.
//
// **Documented limitation (V2.0.5-E6 acceptance + security-whitepaper.md):**
// JavaScript / Python GC cannot guarantee that immutable String / Bytes
// copies of key material are wiped from heap. Calling `buffer.fill(0)` only
// zeroes the underlying ArrayBuffer of *this* Buffer reference; any prior
// `.toString()`, `Buffer.from()`, or implicit copy may still hold residual
// bytes elsewhere in V8 heap until GC. We treat this as an accepted limit
// matching 1Password's own published acknowledgment (white paper §2.6).
//
// The mitigation we DO provide:
//   1. Crypto helpers receive Buffer (mutable) and avoid intermediate String
//   2. session timeout = subprocess restart (operator-level), planned in
//      apps/mcp-server design
//   3. `withSecretBuffer(buffer, fn)` makes the fill-on-exit pattern
//      idiomatic so call sites don't forget

export interface SecureWipeResult {
  bytesWiped: number;
}

/** Zero a buffer synchronously. Returns count of bytes overwritten. */
export function secureWipe(target: Buffer | Uint8Array): SecureWipeResult {
  if (!(target instanceof Uint8Array)) {
    throw new TypeError("secureWipe target must be Buffer | Uint8Array");
  }
  const len = target.length;
  for (let i = 0; i < len; i++) {
    target[i] = 0;
  }
  return { bytesWiped: len };
}

/**
 * Run `fn(buffer)` then zero the buffer regardless of whether `fn` throws.
 * Use this in call sites that derive a key, use it once, and need to wipe.
 *
 * NOTE: any return value of `fn` that is itself derived from the buffer
 * may carry residue. Prefer void return from `fn`.
 */
export function withSecretBuffer<T>(
  buffer: Buffer,
  fn: (buf: Buffer) => T
): T {
  try {
    return fn(buffer);
  } finally {
    secureWipe(buffer);
  }
}

/** Async variant for `fn` that returns a Promise. */
export async function withSecretBufferAsync<T>(
  buffer: Buffer,
  fn: (buf: Buffer) => Promise<T>
): Promise<T> {
  try {
    return await fn(buffer);
  } finally {
    secureWipe(buffer);
  }
}

/** True iff every byte of buffer is zero. */
export function isZeroed(buffer: Buffer | Uint8Array): boolean {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] !== 0) {
      return false;
    }
  }
  return true;
}
