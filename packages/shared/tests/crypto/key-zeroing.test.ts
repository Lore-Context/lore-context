// Tests for key zeroing helpers (V2.0.5-E6 best-effort zeroing).
// Documents both what we can verify (buffer fill on exit) and what we
// cannot (residual immutable String / GC-managed copies).

import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  isZeroed,
  secureWipe,
  withSecretBuffer,
  withSecretBufferAsync
} from "../../src/crypto/key-zeroing.js";

describe("secureWipe", () => {
  it("zeroes a 32-byte key", () => {
    const key = randomBytes(32);
    expect(isZeroed(key)).toBe(false);
    const { bytesWiped } = secureWipe(key);
    expect(bytesWiped).toBe(32);
    expect(isZeroed(key)).toBe(true);
  });

  it("zeroes Uint8Array (non-Buffer)", () => {
    const view = new Uint8Array(16);
    view.fill(0xff);
    secureWipe(view);
    expect(view.every((b) => b === 0)).toBe(true);
  });

  it("handles zero-length buffer", () => {
    const buf = Buffer.alloc(0);
    expect(secureWipe(buf).bytesWiped).toBe(0);
    expect(isZeroed(buf)).toBe(true);
  });

  it("rejects non-Uint8Array inputs", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => secureWipe("string" as any)).toThrow(TypeError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => secureWipe(42 as any)).toThrow(TypeError);
  });
});

describe("withSecretBuffer", () => {
  it("zeroes buffer after fn returns normally", () => {
    const key = randomBytes(32);
    const result = withSecretBuffer(key, (buf) => {
      expect(buf.length).toBe(32);
      return buf.length;
    });
    expect(result).toBe(32);
    expect(isZeroed(key)).toBe(true);
  });

  it("zeroes buffer even if fn throws", () => {
    const key = randomBytes(32);
    expect(() =>
      withSecretBuffer(key, () => {
        throw new Error("boom");
      })
    ).toThrow("boom");
    expect(isZeroed(key)).toBe(true);
  });

  it("forwards fn return value", () => {
    const key = randomBytes(32);
    const out = withSecretBuffer(key, () => "result-string");
    expect(out).toBe("result-string");
    expect(isZeroed(key)).toBe(true);
  });
});

describe("withSecretBufferAsync", () => {
  it("zeroes buffer after async fn resolves", async () => {
    const key = randomBytes(32);
    const result = await withSecretBufferAsync(key, async (buf) => {
      await new Promise((r) => setImmediate(r));
      return buf.length;
    });
    expect(result).toBe(32);
    expect(isZeroed(key)).toBe(true);
  });

  it("zeroes buffer when async fn rejects", async () => {
    const key = randomBytes(32);
    await expect(
      withSecretBufferAsync(key, async () => {
        await new Promise((r) => setImmediate(r));
        throw new Error("async boom");
      })
    ).rejects.toThrow("async boom");
    expect(isZeroed(key)).toBe(true);
  });
});

describe("documented limitation (V2.0.5-E6 acceptance)", () => {
  it("does NOT zero a String copy of the buffer (cannot wipe immutable copies)", () => {
    const key = randomBytes(32);
    const hexCopy = key.toString("hex"); // immutable copy lives in V8 heap
    secureWipe(key);
    expect(isZeroed(key)).toBe(true);
    // The hex copy is still readable — this is the accepted limit.
    expect(hexCopy.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(hexCopy)).toBe(true);
  });

  it("does NOT zero a Buffer.from copy (only the passed reference)", () => {
    const key = randomBytes(32);
    const copy = Buffer.from(key); // independent buffer
    secureWipe(key);
    expect(isZeroed(key)).toBe(true);
    expect(isZeroed(copy)).toBe(false); // copy not reachable from secureWipe(key)
  });
});
