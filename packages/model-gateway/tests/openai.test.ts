import { describe, it, expect } from "vitest";
import { OpenAIAdapter } from "../src/providers/openai.js";
import { LlmProviderException } from "../src/providers/types.js";
import type { HttpClient } from "../src/providers/types.js";

function makeRequest(overrides?: object) {
  return {
    prompt: "Summarize: The quick brown fox.",
    systemPrompt: "You are a summarizer.",
    maxTokens: 128,
    requestId: "test-req-2",
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
  id: "chatcmpl-abc",
  model: "gpt-4o-mini",
  choices: [
    {
      message: { role: "assistant", content: "The fox is quick and brown." },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 30, completion_tokens: 15, total_tokens: 45 },
};

describe("OpenAIAdapter", () => {
  it("returns parsed response on 200", async () => {
    const adapter = new OpenAIAdapter({
      apiKey: "sk-openai-test",
      httpClient: makeHttpClient(200, successBody),
    });
    const result = await adapter.invoke(makeRequest());
    expect(result.providerName).toBe("openai");
    expect(result.text).toBe("The fox is quick and brown.");
    expect(result.inputTokens).toBe(30);
    expect(result.outputTokens).toBe(15);
    expect(result.modelId).toBe("gpt-4o-mini");
  });

  it("throws rate_limit on HTTP 429", async () => {
    const adapter = new OpenAIAdapter({
      apiKey: "sk-openai-test",
      httpClient: makeHttpClient(429, { error: { code: "rate_limit_exceeded" } }),
    });
    await expect(adapter.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "rate_limit",
    );
  });

  it("throws server_error on HTTP 503", async () => {
    const adapter = new OpenAIAdapter({
      apiKey: "sk-openai-test",
      httpClient: makeHttpClient(503, { error: "service unavailable" }),
    });
    await expect(adapter.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "server_error",
    );
  });

  it("throws auth on HTTP 403", async () => {
    const adapter = new OpenAIAdapter({
      apiKey: "bad-key",
      httpClient: makeHttpClient(403, { error: { code: "insufficient_permissions" } }),
    });
    await expect(adapter.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "auth",
    );
  });

  it("sends correct Chat Completions headers and body shape", async () => {
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
    const adapter = new OpenAIAdapter({ apiKey: "sk-openai-test", httpClient });
    await adapter.invoke(makeRequest());
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toContain("/v1/chat/completions");
    expect(seen[0].headers["authorization"]).toBe("Bearer sk-openai-test");
    const b = seen[0].body as Record<string, unknown>;
    const msgs = b["messages"] as Array<{ role: string; content: string }>;
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });
});
