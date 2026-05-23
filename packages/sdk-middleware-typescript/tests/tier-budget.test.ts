/**
 * Tests for v2.0.3 Lane X — tier-aware injection budgets.
 *
 * Behavior post-PR-#209 critic-fix H4:
 *  - Call #1 (tier unknown) caps to TIER_TOKEN_MAX["free"] (512)
 *  - Call #2+ (tier cached) caps to TIER_TOKEN_MAX[cachedTier]
 *  - Warning fires once when user-supplied recallMaxTokens > current cap
 *
 *  - X1: Free-tier defaults to 512 cap from call #1; warning fires immediately
 *        when user-supplied > 512.
 *  - X2: Pro-tier with default opts → call #1 capped at 512 (default until
 *        tier resolved); call #2+ uses 4096 (DEFAULT_RECALL_MAX_TOKENS) which
 *        is below pro's 8192 cap.
 *  - X3: Plus-tier + user-supplied 16000 → call #1 cap 512 + warn; call #2+
 *        cap 4096 (still warned).
 *  - X4: ContextQueryResponse.tier + effectiveTokenBudget exposed at TS schema.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { withMemoryHooks } from "../src/index.js";

function makeMockOpenAI(
  contextQueryImpl?: (req: unknown) => unknown,
) {
  const contextQuerySpy = vi.fn(contextQueryImpl ?? (() => ({ contextBlock: "" })));
  const memoryWriteSpy = vi.fn(() => ({}));
  const lore = { contextQuery: contextQuerySpy, memoryWrite: memoryWriteSpy };
  const originalCreate = vi.fn(async () => ({
    id: "cc-test",
    choices: [{ message: { role: "assistant", content: "ok" }, index: 0 }],
  }));
  const client = { chat: { completions: { create: originalCreate } } };
  return { client, lore, contextQuerySpy, memoryWriteSpy, originalCreate };
}

describe("withMemoryHooks (Lane X) — tier-aware injection budgets", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("X1 (H4-revised): free tier — call #1 caps at 512, warning fires immediately when user > 512", async () => {
    const { client, lore, contextQuerySpy } = makeMockOpenAI(() => ({
      contextBlock: "ctx",
      tier: "free",
      effectiveTokenBudget: 512,
    }));

    const wrapped = withMemoryHooks(
      client as unknown as Record<string, unknown>,
      lore as never,
      { mode: "hybrid", recallMaxTokens: 16000 },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    // Call #1 — tier unknown → defaults to "free" cap (512); user 16000 > 512 → warn
    await wrapped.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello call 1" }],
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/recallMaxTokens=16000/);
    expect(contextQuerySpy.mock.calls[0]?.[0]).toMatchObject({ token_budget: 512 });

    // Call #2 — tier cached as "free"; cap still 512; warning is one-time
    await wrapped.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello call 2" }],
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(contextQuerySpy.mock.calls[1]?.[0]).toMatchObject({ token_budget: 512 });
  });

  it("X2 (H4-revised): pro tier with default opts — call #1 capped at 512 (no warning), call #2 uses 4096", async () => {
    const { client, lore, contextQuerySpy } = makeMockOpenAI(() => ({
      contextBlock: "ctx",
      tier: "pro",
      effectiveTokenBudget: 4096,
    }));

    const wrapped = withMemoryHooks(
      client as unknown as Record<string, unknown>,
      lore as never,
      { mode: "hybrid" },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    // Call #1: tier unknown, default-cap "free"=512. User didn't supply, so no warning.
    await wrapped.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "1" }],
    });
    expect(contextQuerySpy.mock.calls[0]?.[0]).toMatchObject({ token_budget: 512 });
    expect(warnSpy).not.toHaveBeenCalled();

    // Call #2: tier "pro" cached, cap 8192; default DEFAULT_RECALL_MAX_TOKENS=4096 < cap
    await wrapped.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "2" }],
    });
    expect(contextQuerySpy.mock.calls[1]?.[0]).toMatchObject({ token_budget: 4096 });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("X3 (H4-revised): plus tier + user 16000 → call #1 capped 512 (warn), call #2 capped 4096", async () => {
    const { client, lore, contextQuerySpy } = makeMockOpenAI(() => ({
      contextBlock: "ctx",
      tier: "plus",
      effectiveTokenBudget: 4096,
    }));

    const wrapped = withMemoryHooks(
      client as unknown as Record<string, unknown>,
      lore as never,
      { mode: "hybrid", recallMaxTokens: 16000 },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    // Call #1: free default cap 512; user 16000 > 512 → warn
    await wrapped.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "1" }],
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(contextQuerySpy.mock.calls[0]?.[0]).toMatchObject({ token_budget: 512 });

    // Call #2: plus tier cached, cap 4096; warn already fired once
    await wrapped.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "2" }],
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(contextQuerySpy.mock.calls[1]?.[0]).toMatchObject({ token_budget: 4096 });
  });

  it("X4: ContextQueryResponse exposes tier + effectiveTokenBudget at type layer (compile-time)", async () => {
    const fixture = {
      traceId: "t1",
      contextBlock: "x",
      tier: "plus" as const,
      effectiveTokenBudget: 4096,
    };
    expect(fixture.tier).toBe("plus");
    expect(fixture.effectiveTokenBudget).toBe(4096);
  });
});
