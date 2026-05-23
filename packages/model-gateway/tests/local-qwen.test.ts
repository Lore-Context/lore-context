import { describe, it, expect, vi } from "vitest";
import { LocalQwenAdapter } from "../src/providers/local-qwen.js";
import { LlmProviderException } from "../src/providers/types.js";
import type { HttpClient } from "../src/providers/types.js";

function makeRequest(overrides?: object) {
  return {
    prompt: "What is the capital of France?",
    maxTokens: 64,
    requestId: "test-req-3",
    ...overrides,
  };
}

const successBody = {
  model: "qwen2.5-7b-instruct",
  choices: [
    {
      message: { role: "assistant", content: "Paris." },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

describe("LocalQwenAdapter", () => {
  it("returns parsed response on 200", async () => {
    const httpClient: HttpClient = {
      async fetch() {
        return {
          status: 200,
          ok: true,
          text: async () => JSON.stringify(successBody),
        };
      },
    };
    const adapter = new LocalQwenAdapter({ baseUrl: "http://localhost:8000", httpClient });
    const result = await adapter.invoke(makeRequest());
    expect(result.providerName).toBe("local-qwen");
    expect(result.text).toBe("Paris.");
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });

  it("throws server_error on HTTP 500", async () => {
    const httpClient: HttpClient = {
      async fetch() {
        return {
          status: 500,
          ok: false,
          text: async () => JSON.stringify({ error: "internal error" }),
        };
      },
    };
    const adapter = new LocalQwenAdapter({ baseUrl: "http://localhost:8000", httpClient });
    await expect(adapter.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "server_error",
    );
  });

  it("throws timeout when fetch takes longer than 10s (AbortError simulation)", async () => {
    // Simulate the abort signal being fired after a brief delay.
    const httpClient: HttpClient = {
      async fetch(_url, init) {
        // Wait until aborted.
        await new Promise<void>((_resolve, reject) => {
          const check = setInterval(() => {
            if (init.signal?.aborted) {
              clearInterval(check);
              const err = new Error("AbortError");
              err.name = "AbortError";
              reject(err);
            }
          }, 5);
          // Also set a safety fallback.
          setTimeout(() => {
            clearInterval(check);
            const err = new Error("AbortError");
            err.name = "AbortError";
            reject(err);
          }, 200);
        });
        // Never reached.
        return { status: 200, ok: true, text: async () => "" };
      },
    };

    // Override the internal timeout to fire very quickly (use fake timers).
    vi.useFakeTimers();
    const adapter = new LocalQwenAdapter({ baseUrl: "http://localhost:8000", httpClient });
    const invokePromise = adapter.invoke(makeRequest());
    // Advance timers past the 10s timeout.
    vi.advanceTimersByTime(11_000);
    vi.useRealTimers();

    await expect(invokePromise).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "timeout",
    );
  });
});
