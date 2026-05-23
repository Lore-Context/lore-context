import { describe, it, expect } from "vitest";
import { OpenRouterProvider } from "../src/providers/openrouter.js";
import { LlmProviderException } from "../src/providers/types.js";
import type { HttpClient } from "../src/providers/types.js";

function makeRequest(overrides?: object) {
  return {
    prompt: "Summarize: The quick brown fox.",
    systemPrompt: "You are a summarizer.",
    maxTokens: 128,
    requestId: "test-req-openrouter",
    model: "qwen/qwen3.6-flash",
    ...overrides,
  };
}

function makeHttpClient(status: number, body: object | string): HttpClient {
  return {
    async fetch(_url, _init) {
      const text = typeof body === "string" ? body : JSON.stringify(body);
      return {
        status,
        ok: status >= 200 && status < 300,
        text: async () => text,
      };
    },
  };
}

const successBody = {
  id: "gen-openrouter",
  model: "qwen/qwen3.6-flash",
  choices: [
    {
      message: { role: "assistant", content: "The fox is quick and brown." },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 30, completion_tokens: 15, total_tokens: 45 },
};

describe("OpenRouterProvider", () => {
  it("returns parsed response on 200", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "sk-or-test",
      httpClient: makeHttpClient(200, successBody),
    });

    const result = await provider.invoke(makeRequest());

    expect(result.providerName).toBe("openrouter");
    expect(result.text).toBe("The fox is quick and brown.");
    expect(result.inputTokens).toBe(30);
    expect(result.outputTokens).toBe(15);
    expect(result.modelId).toBe("qwen/qwen3.6-flash");
  });

  it("sends authorization header and request model from the request", async () => {
    const seen: { url: string; headers: Record<string, string>; body: unknown }[] = [];
    const httpClient: HttpClient = {
      async fetch(url, init) {
        seen.push({ url, headers: init.headers, body: JSON.parse(init.body) });
        return {
          status: 200,
          ok: true,
          text: async () => JSON.stringify(successBody),
        };
      },
    };
    const provider = new OpenRouterProvider({ apiKey: "sk-or-test", httpClient });

    await provider.invoke(makeRequest({ model: "google/gemini-3.1-flash-lite" }));

    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(seen[0].headers["authorization"]).toBe("Bearer sk-or-test");
    const body = seen[0].body as Record<string, unknown>;
    expect(body["model"]).toBe("google/gemini-3.1-flash-lite");
  });

  it("throws quota-exceeded typed error on HTTP 402", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "sk-or-test",
      httpClient: makeHttpClient(402, { error: { code: "insufficient_credits" } }),
    });

    await expect(provider.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException &&
        e.providerError.kind === "rate_limit" &&
        e.providerError.status === 402,
    );
  });

  it("throws rate-limit typed error on HTTP 429", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "sk-or-test",
      httpClient: makeHttpClient(429, { error: { code: "rate_limit_exceeded" } }),
    });

    await expect(provider.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException &&
        e.providerError.kind === "rate_limit" &&
        e.providerError.status === 429,
    );
  });

  it("health returns healthy true for model-list response", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "sk-or-test",
      httpClient: makeHttpClient(200, { data: [{ id: "qwen/qwen3.6-flash" }] }),
    });

    const result = await provider.health();

    expect(result.healthy).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
