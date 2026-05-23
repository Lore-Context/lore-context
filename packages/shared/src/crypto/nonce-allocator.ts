// Client-side monotonic counter allocator for AES-GCM nonce.
//
// Per Lore Secret Vault v2.0.5 spec §3.3, the server enforces
// nonce_counter > existing_max via SQL invariant; this allocator is the
// client-side optimistic counter. Each `next(secretId)` increments the
// per-secret counter and returns it. On a server-side 409 (race), the
// caller refetches max and calls `bumpTo(secretId, serverMax)` to align
// before retrying.
//
// Counters are bigint (u64). Per spec, the practical ceiling is 2^64-1
// which is unreachable in human-scale usage; AES-GCM-counter (12-byte
// nonce = 4-byte vault prefix + 8-byte counter) gives each secret its
// own 2^64 counter space.

const MAX_COUNTER = 0xffff_ffff_ffff_ffffn;

export class NonceAllocatorError extends Error {
  readonly code: "exhausted" | "rewind" | "bad_arg";
  constructor(code: "exhausted" | "rewind" | "bad_arg", message: string) {
    super(message);
    this.code = code;
    this.name = "NonceAllocatorError";
  }
}

function normalizeSecretId(secretId: string | Uint8Array | Buffer): string {
  if (typeof secretId === "string") {
    if (secretId.length === 0) {
      throw new NonceAllocatorError("bad_arg", "secretId must be non-empty");
    }
    return secretId;
  }
  if (Buffer.isBuffer(secretId) || secretId instanceof Uint8Array) {
    if (secretId.length === 0) {
      throw new NonceAllocatorError("bad_arg", "secretId must be non-empty");
    }
    return Buffer.from(secretId).toString("hex");
  }
  throw new NonceAllocatorError("bad_arg", "secretId must be string | Buffer | Uint8Array");
}

export class NonceAllocator {
  private readonly state = new Map<string, bigint>();

  /** Allocate the next counter for a given secret_id, starting at 1. */
  next(secretId: string | Uint8Array | Buffer): bigint {
    const key = normalizeSecretId(secretId);
    const current = this.state.get(key) ?? 0n;
    const next = current + 1n;
    if (next > MAX_COUNTER) {
      throw new NonceAllocatorError(
        "exhausted",
        `nonce counter exhausted for ${key} — refusing to wrap`
      );
    }
    this.state.set(key, next);
    return next;
  }

  /** Peek current counter without advancing. Returns 0n if never allocated. */
  peek(secretId: string | Uint8Array | Buffer): bigint {
    const key = normalizeSecretId(secretId);
    return this.state.get(key) ?? 0n;
  }

  /**
   * Align local counter to a server-known max (after 409 race) so the next
   * `next()` returns max+1. Refuses to rewind a counter that is already
   * higher than max (would invite nonce reuse).
   */
  bumpTo(secretId: string | Uint8Array | Buffer, max: bigint): void {
    if (max < 0n || max > MAX_COUNTER) {
      throw new NonceAllocatorError("bad_arg", `bumpTo max out of range: ${max}`);
    }
    const key = normalizeSecretId(secretId);
    const current = this.state.get(key) ?? 0n;
    if (max < current) {
      throw new NonceAllocatorError(
        "rewind",
        `refusing to rewind counter for ${key}: current=${current} new=${max}`
      );
    }
    this.state.set(key, max);
  }

  /** Reset a single secret's counter — only for tests or vault rotation. */
  reset(secretId: string | Uint8Array | Buffer): void {
    const key = normalizeSecretId(secretId);
    this.state.delete(key);
  }

  /** Internal — number of tracked secrets. */
  get size(): number {
    return this.state.size;
  }
}

export const NONCE_ALLOCATOR_INTERNALS = {
  MAX_COUNTER
};
