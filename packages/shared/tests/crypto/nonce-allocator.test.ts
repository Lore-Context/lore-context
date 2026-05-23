// Tests for client-side monotonic nonce counter allocator.
// AC V2.0.5-E4: 1M property test, 0 duplicate counters for same secret_id.

import { describe, expect, it } from "vitest";
import {
  NONCE_ALLOCATOR_INTERNALS,
  NonceAllocator,
  NonceAllocatorError
} from "../../src/crypto/nonce-allocator.js";

describe("NonceAllocator.next", () => {
  it("returns 1n for the first allocation of a secret_id", () => {
    const alloc = new NonceAllocator();
    expect(alloc.next("secret-A")).toBe(1n);
  });

  it("returns monotonic increasing counters per secret_id", () => {
    const alloc = new NonceAllocator();
    expect(alloc.next("secret-A")).toBe(1n);
    expect(alloc.next("secret-A")).toBe(2n);
    expect(alloc.next("secret-A")).toBe(3n);
  });

  it("tracks distinct counters per secret_id", () => {
    const alloc = new NonceAllocator();
    expect(alloc.next("secret-A")).toBe(1n);
    expect(alloc.next("secret-B")).toBe(1n);
    expect(alloc.next("secret-A")).toBe(2n);
    expect(alloc.next("secret-B")).toBe(2n);
    expect(alloc.next("secret-C")).toBe(1n);
  });

  it("accepts Buffer secret_id and produces same counter space as hex string", () => {
    const alloc = new NonceAllocator();
    const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const hex = "01020304";
    expect(alloc.next(buf)).toBe(1n);
    expect(alloc.next(hex)).toBe(2n);
    expect(alloc.peek(buf)).toBe(2n);
  });

  it("rejects empty secret_id", () => {
    const alloc = new NonceAllocator();
    expect(() => alloc.next("")).toThrow(NonceAllocatorError);
    expect(() => alloc.next(Buffer.alloc(0))).toThrow(NonceAllocatorError);
  });

  it("refuses to wrap past 2^64-1", () => {
    const alloc = new NonceAllocator();
    alloc.bumpTo("near-max", NONCE_ALLOCATOR_INTERNALS.MAX_COUNTER);
    expect(() => alloc.next("near-max")).toThrowError(/exhausted/);
  });
});

describe("NonceAllocator.peek", () => {
  it("returns 0n for an unseen secret_id", () => {
    const alloc = new NonceAllocator();
    expect(alloc.peek("never-seen")).toBe(0n);
  });

  it("returns the last allocated counter without advancing", () => {
    const alloc = new NonceAllocator();
    alloc.next("secret-A");
    alloc.next("secret-A");
    expect(alloc.peek("secret-A")).toBe(2n);
    expect(alloc.peek("secret-A")).toBe(2n); // idempotent
    expect(alloc.next("secret-A")).toBe(3n);
  });
});

describe("NonceAllocator.bumpTo", () => {
  it("aligns local counter to server max so next() returns max+1", () => {
    const alloc = new NonceAllocator();
    alloc.next("secret-A"); // counter = 1n
    alloc.bumpTo("secret-A", 100n);
    expect(alloc.next("secret-A")).toBe(101n);
  });

  it("refuses to rewind (would risk nonce reuse)", () => {
    const alloc = new NonceAllocator();
    alloc.next("secret-A");
    alloc.next("secret-A");
    alloc.next("secret-A"); // counter = 3n
    expect(() => alloc.bumpTo("secret-A", 1n)).toThrowError(/rewind/);
  });

  it("rejects out-of-range max", () => {
    const alloc = new NonceAllocator();
    expect(() => alloc.bumpTo("secret-A", -1n)).toThrowError(/out of range/);
    expect(() =>
      alloc.bumpTo("secret-A", NONCE_ALLOCATOR_INTERNALS.MAX_COUNTER + 1n)
    ).toThrowError(/out of range/);
  });
});

describe("NonceAllocator.reset", () => {
  it("removes the counter for a single secret_id", () => {
    const alloc = new NonceAllocator();
    alloc.next("secret-A");
    alloc.next("secret-A");
    expect(alloc.peek("secret-A")).toBe(2n);
    alloc.reset("secret-A");
    expect(alloc.peek("secret-A")).toBe(0n);
    expect(alloc.next("secret-A")).toBe(1n);
  });
});

// V2.0.5-E4 acceptance: monotonicity property test.
// The plan calls for 1M iterations; that takes ~1-3 seconds in JS.
describe("NonceAllocator monotonicity property (V2.0.5-E4, 1M iterations)", () => {
  it(
    "produces 1,000,000 strictly-increasing distinct counters for one secret_id with zero duplicates",
    () => {
      const alloc = new NonceAllocator();
      const iterations = 1_000_000;
      let previous = 0n;
      let duplicates = 0;
      let nonMonotonic = 0;
      for (let i = 0; i < iterations; i++) {
        const c = alloc.next("hot-secret");
        if (c === previous) {
          duplicates++;
        }
        if (c <= previous) {
          nonMonotonic++;
        }
        previous = c;
      }
      expect(duplicates).toBe(0);
      expect(nonMonotonic).toBe(0);
      expect(previous).toBe(BigInt(iterations));
    },
    20_000
  );

  it(
    "produces independent monotonic sequences across 100 secret_ids over 10k allocations each (1M total)",
    () => {
      const alloc = new NonceAllocator();
      const secrets = Array.from({ length: 100 }, (_, i) => `secret-${i}`);
      const iterationsPer = 10_000;
      const seen = new Map<string, Set<string>>();
      for (const s of secrets) seen.set(s, new Set());
      for (let i = 0; i < iterationsPer; i++) {
        for (const s of secrets) {
          const c = alloc.next(s);
          const set = seen.get(s)!;
          const key = c.toString();
          if (set.has(key)) {
            throw new Error(`duplicate ${key} for ${s} at iter ${i}`);
          }
          set.add(key);
        }
      }
      // Every secret should have advanced to exactly iterationsPer
      for (const s of secrets) {
        expect(alloc.peek(s)).toBe(BigInt(iterationsPer));
      }
    },
    30_000
  );
});
