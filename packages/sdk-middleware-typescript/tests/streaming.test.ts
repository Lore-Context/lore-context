/**
 * Tests for S4: streaming chat completion. Chunks pass through unchanged; retain
 * fires exactly once on stream-complete; idempotency_key carried.
 */
import { describe, it, expect, vi } from "vitest";
import { withMemoryHooks } from "../src/index.js";

function mockStreamingChunks(parts: string[]): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const p of parts) {
        yield {
          id: "chatcmpl-stream",
          object: "chat.completion.chunk",
          choices: [{ delta: { content: p }, index: 0, finish_reason: null }],
        };
      }
      yield {
        id: "chatcmpl-stream",
        object: "chat.completion.chunk",
        choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
      };
    },
  };
}

describe("withMemoryHooks (S4) — streaming OpenAI", () => {
  it("streams chunks unchanged AND fires retain exactly once after stream-complete with accumulated content", async () => {
    const contextQuerySpy = vi.fn().mockResolvedValue({ contextBlock: "ctx" });
    const memoryWriteSpy = vi.fn().mockResolvedValue({ memoryId: "mem-stream" });
    const originalCreate = vi.fn().mockImplementation(async () => mockStreamingChunks(["Hello", " ", "world."]));
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      { contextQuery: contextQuerySpy, memoryWrite: memoryWriteSpy } as never,
      { mode: "hybrid" },
    ) as { chat: { completions: { create: (args: unknown) => Promise<AsyncIterable<unknown>> } } };

    const stream = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Say hello." }],
      stream: true,
    });

    const chunks: unknown[] = [];
    for await (const chunk of stream) chunks.push(chunk);

    // 3 content chunks + 1 finish chunk = 4
    expect(chunks.length).toBe(4);
    expect(chunks[0]).toMatchObject({ choices: [{ delta: { content: "Hello" } }] });
    expect(chunks[3]).toMatchObject({ choices: [{ finish_reason: "stop" }] });

    // Allow microtask drain
    await new Promise((r) => setTimeout(r, 20));

    // Retain fired exactly once with accumulated content
    expect(memoryWriteSpy).toHaveBeenCalledTimes(1);
    const writeArgs = memoryWriteSpy.mock.calls[0]?.[0] as {
      content: { user_msg: string; assistant_msg: string; source: string };
      idempotency_key: string;
    };
    expect(writeArgs.content.user_msg).toBe("Say hello.");
    expect(writeArgs.content.assistant_msg).toBe("Hello world.");
    expect(writeArgs.content.source).toBe("openai-chat");
    expect(typeof writeArgs.idempotency_key).toBe("string");
  });

  it("on stream error mid-flight, retain is skipped with reason='stream_error'", async () => {
    const onRetainAudit = vi.fn();
    const memoryWriteSpy = vi.fn();

    async function* errorStream(): AsyncGenerator<unknown> {
      yield {
        choices: [{ delta: { content: "partial" }, index: 0, finish_reason: null }],
      };
      throw new Error("network drop");
    }
    const originalCreate = vi.fn().mockImplementation(async () => ({ [Symbol.asyncIterator]: errorStream }));

    const mockOpenAI = { chat: { completions: { create: originalCreate } } };
    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      {
        contextQuery: vi.fn().mockResolvedValue({ contextBlock: "" }),
        memoryWrite: memoryWriteSpy,
      } as never,
      { mode: "hybrid", onRetainAudit },
    ) as { chat: { completions: { create: (args: unknown) => Promise<AsyncIterable<unknown>> } } };

    const stream = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
      stream: true,
    });

    let caught: Error | null = null;
    try {
      for await (const _ of stream) {
        // consume
      }
    } catch (e) {
      caught = e as Error;
    }
    expect(caught?.message).toBe("network drop");
    expect(memoryWriteSpy).not.toHaveBeenCalled();
    expect(onRetainAudit).toHaveBeenCalledWith(
      expect.objectContaining({ skipped: true, reason: "stream_error" }),
    );
  });

  it("streaming + tools mode: retain NOT fired even when stream completes successfully", async () => {
    const memoryWriteSpy = vi.fn();
    const originalCreate = vi.fn().mockImplementation(async () => mockStreamingChunks(["ok"]));
    const mockOpenAI = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      mockOpenAI as unknown as Record<string, unknown>,
      {
        contextQuery: vi.fn(),
        memoryWrite: memoryWriteSpy,
      } as never,
      { mode: "tools" },
    ) as { chat: { completions: { create: (args: unknown) => Promise<AsyncIterable<unknown>> } } };

    const stream = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello" }],
      stream: true,
    });
    for await (const _ of stream) {
      // drain
    }
    await new Promise((r) => setTimeout(r, 20));

    expect(memoryWriteSpy).not.toHaveBeenCalled();
  });
});
