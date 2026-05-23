/**
 * Tests for S9: double-wrap detection via Symbol.for marker.
 */
import { describe, it, expect, vi } from "vitest";
import {
  withMemoryHooks,
  LoreMiddlewareDoubleWrapError,
  LORE_MIDDLEWARE_MARKER,
} from "../src/index.js";

describe("withMemoryHooks (S9) — double-wrap detection", () => {
  it("first wrap succeeds, second wrap on same proxy throws LoreMiddlewareDoubleWrapError", () => {
    const mockLore = { contextQuery: vi.fn().mockResolvedValue({ contextBlock: "" }) };
    const mockOpenAI = {
      chat: { completions: { create: vi.fn() } },
    };

    const wrappedOnce = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      mockLore as never,
    );

    // Wrapped proxy carries the marker
    expect((wrappedOnce as Record<symbol, unknown>)[LORE_MIDDLEWARE_MARKER]).toBe(true);

    // Re-wrapping must throw
    expect(() =>
      withMemoryHooks(wrappedOnce as Record<string, unknown>, mockLore as never),
    ).toThrowError(LoreMiddlewareDoubleWrapError);
  });

  it("double-wrap error has expected name and message", () => {
    const err = new LoreMiddlewareDoubleWrapError();
    expect(err.name).toBe("LoreMiddlewareDoubleWrapError");
    expect(err.message).toMatch(/already been applied/i);
  });
});
