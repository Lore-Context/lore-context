/**
 * Tests for S2: withMemoryHooks wraps OpenAI; chat completion in hybrid mode
 * auto-injects via contextQuery; response shape unchanged.
 */
import { describe, it, expect, vi } from "vitest";
import { withMemoryHooks } from "../src/index.js";

describe("withMemoryHooks (S2) — OpenAI hybrid mode", () => {
  it("calls contextQuery on chat.completions.create and injects contextBlock as system message", async () => {
    const contextQuerySpy = vi.fn().mockResolvedValue({
      contextBlock: "User likes Postgres backups.",
    });
    const mockLore = { contextQuery: contextQuerySpy };

    const originalCreate = vi.fn().mockResolvedValue({
      id: "chatcmpl-test",
      object: "chat.completion",
      choices: [{ message: { role: "assistant", content: "Use pg_dump." }, index: 0 }],
    });
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      mockLore as never,
      { mode: "hybrid" },
    ) as { chat: { completions: { create: (args: unknown) => Promise<{ id: string; choices: Array<{ message: { content: string } }> }> } } };

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "What was that Postgres dump command?" }],
    });

    // Spy assertion
    expect(contextQuerySpy).toHaveBeenCalledTimes(1);
    expect(contextQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "What was that Postgres dump command?",
        mode: "memory",
      }),
    );

    // Injected system message asserted
    const callArgs = originalCreate.mock.calls[0]?.[0] as { messages: Array<{ role: string; content: string }> };
    expect(callArgs.messages.length).toBe(2);
    expect(callArgs.messages[0]?.role).toBe("system");
    expect(callArgs.messages[0]?.content).toContain("User likes Postgres backups.");
    expect(callArgs.messages[0]?.content).toContain("Relevant memories");

    // Response shape unchanged
    expect(response.id).toBe("chatcmpl-test");
    expect(response.choices[0]?.message?.content).toBe("Use pg_dump.");
  });

  it("appends to existing system message instead of prepending", async () => {
    const mockLore = {
      contextQuery: vi.fn().mockResolvedValue({ contextBlock: "Recall: prefer pg_dump." }),
    };
    const originalCreate = vi.fn().mockResolvedValue({ choices: [] });
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      mockLore as never,
      { mode: "hybrid" },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a database expert." },
        { role: "user", content: "How do I back up?" },
      ],
    });

    const callArgs = originalCreate.mock.calls[0]?.[0] as { messages: Array<{ role: string; content: string }> };
    expect(callArgs.messages.length).toBe(2); // length unchanged
    expect(callArgs.messages[0]?.role).toBe("system");
    expect(callArgs.messages[0]?.content).toContain("You are a database expert.");
    expect(callArgs.messages[0]?.content).toContain("Recall: prefer pg_dump.");
  });

  it("skips inject when mode='tools' (legacy)", async () => {
    const contextQuerySpy = vi.fn();
    const originalCreate = vi.fn().mockResolvedValue({ choices: [] });
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      { contextQuery: contextQuerySpy } as never,
      { mode: "tools" },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(contextQuerySpy).not.toHaveBeenCalled();
    const callArgs = originalCreate.mock.calls[0]?.[0] as { messages: unknown[] };
    expect(callArgs.messages.length).toBe(1);
  });

  it("preserves response when contextBlock is empty (no inject, no skip-as-error)", async () => {
    const onInjectAudit = vi.fn();
    const mockLore = { contextQuery: vi.fn().mockResolvedValue({ contextBlock: "" }) };
    const originalCreate = vi.fn().mockResolvedValue({ choices: [] });
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      mockLore as never,
      { mode: "hybrid", onInjectAudit },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
    });

    const callArgs = originalCreate.mock.calls[0]?.[0] as { messages: unknown[] };
    expect(callArgs.messages.length).toBe(1); // no inject
    expect(onInjectAudit).toHaveBeenCalledWith(
      expect.objectContaining({ skipped: true, reason: "empty_result" }),
    );
  });
});
