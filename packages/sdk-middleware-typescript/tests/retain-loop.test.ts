/**
 * Tests for S8: retain-loop regression. Simulates a 10-turn conversation where
 * some assistant replies contain Lore's own inject markup (`<memory_capture>`
 * / `<recalled>`); middleware MUST pre-filter those before POSTing to
 * memoryWrite so the loop is broken at the client. Server-side dedup
 * (cosine + idempotency_key) is the second line of defense (out of scope for
 * this unit test).
 */
import { describe, it, expect, vi } from "vitest";
import { withMemoryHooks } from "../src/index.js";

describe("withMemoryHooks (S8) — retain-loop pre-filter", () => {
  it("10-turn conversation: turns with <memory_capture> in assistant reply are filtered, others retained", async () => {
    const contextQuerySpy = vi.fn().mockResolvedValue({ contextBlock: "Recall: ..." });
    const memoryWriteSpy = vi.fn().mockResolvedValue({ memoryId: "mem" });
    const onRetainAudit = vi.fn();

    let turnNumber = 0;
    const originalCreate = vi.fn().mockImplementation(async () => {
      turnNumber += 1;
      // Every 3rd turn pollutes assistant content with the loop marker;
      // expected: those turns get filtered by middleware (no memoryWrite).
      const content = turnNumber % 3 === 0
        ? `Here's what I recall: <memory_capture>seed</memory_capture> ...`
        : `Plain assistant reply for turn ${turnNumber}`;
      return {
        id: `chatcmpl-${turnNumber}`,
        choices: [{ message: { role: "assistant", content }, index: 0 }],
      };
    });
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      { contextQuery: contextQuerySpy, memoryWrite: memoryWriteSpy } as never,
      { mode: "hybrid", onRetainAudit },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    for (let i = 1; i <= 10; i++) {
      await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: `User question turn ${i}` }],
      });
      // Drain fire-and-forget retain
      await new Promise((r) => setTimeout(r, 5));
    }

    // 10 LLM calls made
    expect(originalCreate).toHaveBeenCalledTimes(10);

    // Out of 10 turns, 3 are loop-marker turns (3, 6, 9). Those MUST be filtered.
    // Expected memoryWrite calls = 7 (turns 1,2,4,5,7,8,10).
    expect(memoryWriteSpy).toHaveBeenCalledTimes(7);

    // Sublinear assertion: memory writes (7) < turn count (10).
    expect(memoryWriteSpy.mock.calls.length).toBeLessThan(10);

    // Filtered audit fires with reason='filtered_marker' for the 3 polluted turns.
    const filteredAudits = onRetainAudit.mock.calls.filter(
      (call) => (call[0] as { skipped: boolean; reason?: string }).reason === "filtered_marker",
    );
    expect(filteredAudits.length).toBe(3);
  });

  it("loop-marker in USER message also filters retention", async () => {
    const memoryWriteSpy = vi.fn().mockResolvedValue({ memoryId: "mem" });
    const onRetainAudit = vi.fn();
    const originalCreate = vi.fn().mockResolvedValue({
      id: "chatcmpl-x",
      choices: [{ message: { role: "assistant", content: "Hi back" }, index: 0 }],
    });
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      {
        contextQuery: vi.fn().mockResolvedValue({ contextBlock: "" }),
        memoryWrite: memoryWriteSpy,
      } as never,
      { mode: "hybrid", onRetainAudit },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Please remember <recalled>this</recalled> for later." }],
    });
    await new Promise((r) => setTimeout(r, 10));

    expect(memoryWriteSpy).not.toHaveBeenCalled();
    expect(onRetainAudit).toHaveBeenCalledWith(
      expect.objectContaining({ skipped: true, reason: "filtered_marker" }),
    );
  });

  it("every retain POST carries an idempotency_key (S8 server-side dedup support)", async () => {
    const memoryWriteSpy = vi.fn().mockResolvedValue({});
    const originalCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      {
        contextQuery: vi.fn().mockResolvedValue({ contextBlock: "" }),
        memoryWrite: memoryWriteSpy,
      } as never,
      { mode: "hybrid" },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    // 3 calls, 3 different idempotency_keys
    for (let i = 0; i < 3; i++) {
      await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: `turn ${i}` }],
      });
      await new Promise((r) => setTimeout(r, 5));
    }

    expect(memoryWriteSpy).toHaveBeenCalledTimes(3);
    const keys = memoryWriteSpy.mock.calls.map(
      (call) => (call[0] as { idempotency_key: string }).idempotency_key,
    );
    expect(new Set(keys).size).toBe(3);
    for (const k of keys) {
      expect(typeof k).toBe("string");
      expect(k.length).toBeGreaterThan(0);
    }
  });
});
