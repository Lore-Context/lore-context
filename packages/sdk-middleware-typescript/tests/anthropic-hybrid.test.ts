/**
 * Tests for S3: withMemoryHooks wraps Anthropic; messages.create in hybrid mode
 * inject + retain wire through Lore client; response shape unchanged.
 */
import { describe, it, expect, vi } from "vitest";
import { withMemoryHooks } from "../src/index.js";

describe("withMemoryHooks (S3) — Anthropic hybrid mode", () => {
  it("calls contextQuery and injects contextBlock as Anthropic system param", async () => {
    const contextQuerySpy = vi.fn().mockResolvedValue({
      contextBlock: "User prefers Claude over GPT for prose.",
    });
    const mockLore = { contextQuery: contextQuerySpy };

    const originalCreate = vi.fn().mockResolvedValue({
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Sure, here's an essay." }],
      model: "claude-3-5-sonnet",
    });
    const mockAnthropic = {
      messages: { create: originalCreate },
    };

    const client = withMemoryHooks(
      mockAnthropic as unknown as Record<string, unknown>,
      mockLore as never,
      { mode: "hybrid" },
    ) as { messages: { create: (args: unknown) => Promise<{ id: string }> } };

    const response = await client.messages.create({
      model: "claude-3-5-sonnet",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Write me an essay about climate." }],
    });

    // contextQuery called once with user msg
    expect(contextQuerySpy).toHaveBeenCalledTimes(1);
    expect(contextQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "Write me an essay about climate.",
        mode: "memory",
      }),
    );

    // system param injected as string (no existing system → string form)
    const callArgs = originalCreate.mock.calls[0]?.[0] as { system?: string };
    expect(typeof callArgs.system).toBe("string");
    expect(callArgs.system).toContain("User prefers Claude over GPT for prose.");
    expect(callArgs.system).toContain("Relevant memories");

    // Response shape unchanged
    expect(response.id).toBe("msg_test");
  });

  it("appends to existing string system prompt", async () => {
    const mockLore = {
      contextQuery: vi.fn().mockResolvedValue({ contextBlock: "User is on staging." }),
    };
    const originalCreate = vi.fn().mockResolvedValue({});
    const mockAnthropic = { messages: { create: originalCreate } };

    const client = withMemoryHooks(
      mockAnthropic as unknown as Record<string, unknown>,
      mockLore as never,
      { mode: "hybrid" },
    ) as { messages: { create: (args: unknown) => Promise<unknown> } };

    await client.messages.create({
      model: "claude-3-5-sonnet",
      max_tokens: 100,
      system: "You are a helpful assistant.",
      messages: [{ role: "user", content: "Hi" }],
    });

    const callArgs = originalCreate.mock.calls[0]?.[0] as { system?: string };
    expect(typeof callArgs.system).toBe("string");
    expect(callArgs.system).toContain("You are a helpful assistant.");
    expect(callArgs.system).toContain("User is on staging.");
  });

  it("appends to existing array-of-text-blocks system", async () => {
    const mockLore = {
      contextQuery: vi.fn().mockResolvedValue({ contextBlock: "Project is acme-1.2" }),
    };
    const originalCreate = vi.fn().mockResolvedValue({});
    const mockAnthropic = { messages: { create: originalCreate } };

    const client = withMemoryHooks(
      mockAnthropic as unknown as Record<string, unknown>,
      mockLore as never,
      { mode: "hybrid" },
    ) as { messages: { create: (args: unknown) => Promise<unknown> } };

    await client.messages.create({
      model: "claude-3-5-sonnet",
      max_tokens: 100,
      system: [
        { type: "text", text: "Persona: senior staff engineer.", cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: "Status?" }],
    });

    const callArgs = originalCreate.mock.calls[0]?.[0] as { system: Array<{ type: string; text?: string }> };
    expect(Array.isArray(callArgs.system)).toBe(true);
    expect(callArgs.system.length).toBe(2);
    expect(callArgs.system[0]?.text).toContain("senior staff engineer");
    expect(callArgs.system[1]?.text).toContain("Project is acme-1.2");
  });

  it("skips inject when mode='tools'", async () => {
    const contextQuerySpy = vi.fn();
    const originalCreate = vi.fn().mockResolvedValue({});
    const mockAnthropic = { messages: { create: originalCreate } };

    const client = withMemoryHooks(
      mockAnthropic as unknown as Record<string, unknown>,
      { contextQuery: contextQuerySpy } as never,
      { mode: "tools" },
    ) as { messages: { create: (args: unknown) => Promise<unknown> } };

    await client.messages.create({
      model: "claude-3-5-sonnet",
      max_tokens: 100,
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(contextQuerySpy).not.toHaveBeenCalled();
    const callArgs = originalCreate.mock.calls[0]?.[0] as { system?: unknown };
    expect(callArgs.system).toBeUndefined();
  });

  it("Anthropic client is detected; OpenAI's chat.completions branch is NOT applied", async () => {
    const contextQuerySpy = vi.fn().mockResolvedValue({ contextBlock: "irrelevant" });
    const originalCreate = vi.fn().mockResolvedValue({ id: "msg_x" });
    // Hybrid client: has both messages.create AND chat.completions.create — but
    // OpenAI's `chat.completions.create` is the strong signal so this client is
    // treated as OpenAI-like. This matches the isAnthropicLikeClient predicate.
    const hybridClient = {
      messages: { create: originalCreate },
      chat: { completions: { create: vi.fn().mockResolvedValue({}) } },
    };

    const client = withMemoryHooks(
      hybridClient as unknown as Record<string, unknown>,
      { contextQuery: contextQuerySpy } as never,
      { mode: "hybrid" },
    );

    // messages.create on the hybrid client should NOT receive inject (since
    // isAnthropicLikeClient returns false when chat.completions exists)
    await (client as { messages: { create: (args: unknown) => Promise<unknown> } }).messages.create({
      model: "claude-3-5-sonnet",
      max_tokens: 100,
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(contextQuerySpy).not.toHaveBeenCalled();
  });
});
