/**
 * Tests for S5: Lore unreachable >2s → inject silently skipped, LLM call
 * proceeds, audit callback fires with reason='timeout'.
 */
import { describe, it, expect, vi } from "vitest";
import { withMemoryHooks } from "../src/index.js";

describe("withMemoryHooks (S5) — inject timeout", () => {
  it("aborts inject after the configured timeout; LLM call proceeds with original messages", async () => {
    // Lore.contextQuery hangs forever
    const contextQuerySpy = vi.fn().mockImplementation(
      () => new Promise(() => {
        /* never resolves */
      }),
    );
    const mockLore = { contextQuery: contextQuerySpy };

    const originalCreate = vi.fn().mockResolvedValue({
      id: "chatcmpl-after-timeout",
      choices: [{ message: { role: "assistant", content: "ok" }, index: 0 }],
    });
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const onInjectAudit = vi.fn();

    // Lower the timeout to 80ms so the test runs fast — production default is 2000ms (per S5/§4)
    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      mockLore as never,
      { mode: "hybrid", injectTimeoutMs: 80, onInjectAudit },
    ) as { chat: { completions: { create: (args: unknown) => Promise<{ id: string }> } } };

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Anything?" }],
    });

    // Inject was attempted but never completed
    expect(contextQuerySpy).toHaveBeenCalledTimes(1);

    // LLM call still went through with ORIGINAL messages (no inject)
    const callArgs = originalCreate.mock.calls[0]?.[0] as { messages: Array<{ role: string }> };
    expect(callArgs.messages.length).toBe(1);
    expect(callArgs.messages[0]?.role).toBe("user");

    // Response unchanged
    expect(response.id).toBe("chatcmpl-after-timeout");

    // Audit reports timeout
    expect(onInjectAudit).toHaveBeenCalledWith(
      expect.objectContaining({ skipped: true, reason: "timeout" }),
    );
  });

  it("on transport error (lore_unreachable), inject is skipped with reason='lore_unreachable'", async () => {
    const contextQuerySpy = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const mockLore = { contextQuery: contextQuerySpy };
    const originalCreate = vi.fn().mockResolvedValue({ choices: [] });
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };
    const onInjectAudit = vi.fn();

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      mockLore as never,
      { mode: "hybrid", onInjectAudit },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(onInjectAudit).toHaveBeenCalledWith(
      expect.objectContaining({ skipped: true, reason: "lore_unreachable" }),
    );
    // LLM call still proceeded
    expect(originalCreate).toHaveBeenCalledTimes(1);
  });
});
