// Lane A Phase 3.1 — resolveStreamTimeoutMs env autowire tests.
//
// Verifies safety bounds (50–30000 ms) and fallback to DEFAULT_STREAM_TIMEOUT_MS.

import { describe, expect, it } from "vitest";
import { DEFAULT_STREAM_TIMEOUT_MS, resolveStreamTimeoutMs } from "../src/index.js";

describe("resolveStreamTimeoutMs", () => {
  it("returns DEFAULT_STREAM_TIMEOUT_MS when env var is absent", () => {
    expect(resolveStreamTimeoutMs({})).toBe(DEFAULT_STREAM_TIMEOUT_MS);
  });

  it("returns parsed value when LORE_STREAM_TIMEOUT_MS=1500", () => {
    expect(resolveStreamTimeoutMs({ LORE_STREAM_TIMEOUT_MS: "1500" })).toBe(1500);
  });

  it("returns DEFAULT_STREAM_TIMEOUT_MS when value is non-numeric (invalid)", () => {
    expect(resolveStreamTimeoutMs({ LORE_STREAM_TIMEOUT_MS: "invalid" })).toBe(
      DEFAULT_STREAM_TIMEOUT_MS,
    );
  });

  it("returns DEFAULT_STREAM_TIMEOUT_MS when value is below safety floor (10 < 50)", () => {
    expect(resolveStreamTimeoutMs({ LORE_STREAM_TIMEOUT_MS: "10" })).toBe(
      DEFAULT_STREAM_TIMEOUT_MS,
    );
  });

  it("returns DEFAULT_STREAM_TIMEOUT_MS when value exceeds safety ceiling (99999 > 30000)", () => {
    expect(resolveStreamTimeoutMs({ LORE_STREAM_TIMEOUT_MS: "99999" })).toBe(
      DEFAULT_STREAM_TIMEOUT_MS,
    );
  });

  it("accepts the exact lower bound (50 ms)", () => {
    expect(resolveStreamTimeoutMs({ LORE_STREAM_TIMEOUT_MS: "50" })).toBe(50);
  });

  it("accepts the exact upper bound (30000 ms)", () => {
    expect(resolveStreamTimeoutMs({ LORE_STREAM_TIMEOUT_MS: "30000" })).toBe(30000);
  });
});
