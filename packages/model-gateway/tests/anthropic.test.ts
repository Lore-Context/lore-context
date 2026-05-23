import { describe, it, expect } from "vitest";
import { AnthropicAdapter } from "../src/providers/anthropic.js";
import { LlmProviderException } from "../src/providers/types.js";
import type { HttpClient } from "../src/providers/types.js";

function makeRequest(overrides?: object) {
  return {
    prompt: "Extract entities from: Alice works at Acme Corp.",
    systemPrompt: "You are an entity extractor.",
    maxTokens: 256,
    requestId: "test-req-1",
    ...overrides,
  };
}

function makeHttpClient(
  status: number,
  body: object | string,
  opts?: { delay?: number },
): HttpClient {
  return {
    async fetch(_url, init) {
      if (opts?.delay) {
        await new Promise((r) => setTimeout(r, opts.delay));
      }
      // Respect abort signal.
      if (init.signal?.aborted) {
        const err = new Error("AbortError");
        err.name = "AbortError";
        throw err;
      }
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
  id: "msg_01",
  type: "message",
  model: "claude-sonnet-4-5",
  content: [{ type: "text", text: '{"entities":["Alice","Acme Corp"]}' }],
  usage: { input_tokens: 50, output_tokens: 20 },
};

describe("AnthropicAdapter", () => {
  it("returns parsed response on 200", async () => {
    const adapter = new AnthropicAdapter({
      apiKey: "sk-ant-test",
      httpClient: makeHttpClient(200, successBody),
    });
    const result = await adapter.invoke(makeRequest());
    expect(result.providerName).toBe("anthropic");
    expect(result.text).toContain("Alice");
    expect(result.inputTokens).toBe(50);
    expect(result.outputTokens).toBe(20);
    expect(result.modelId).toBe("claude-sonnet-4-5");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("throws rate_limit on HTTP 429", async () => {
    const adapter = new AnthropicAdapter({
      apiKey: "sk-ant-test",
      httpClient: makeHttpClient(429, { error: { type: "rate_limit_error" } }),
    });
    await expect(adapter.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "rate_limit",
    );
  });

  it("throws server_error on HTTP 500", async () => {
    const adapter = new AnthropicAdapter({
      apiKey: "sk-ant-test",
      httpClient: makeHttpClient(500, { error: "internal server error" }),
    });
    await expect(adapter.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "server_error",
    );
  });

  it("throws auth on HTTP 401", async () => {
    const adapter = new AnthropicAdapter({
      apiKey: "bad-key",
      httpClient: makeHttpClient(401, { error: { type: "authentication_error" } }),
    });
    await expect(adapter.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "auth",
    );
  });

  it("sends correct Anthropic Messages API headers and body shape", async () => {
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
    const adapter = new AnthropicAdapter({ apiKey: "sk-ant-test", httpClient });
    await adapter.invoke(makeRequest());
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toContain("/v1/messages");
    expect(seen[0].headers["x-api-key"]).toBe("sk-ant-test");
    expect(seen[0].headers["anthropic-version"]).toBe("2023-06-01");
    const b = seen[0].body as Record<string, unknown>;
    expect(b["system"]).toBe("You are an entity extractor.");
    expect(Array.isArray(b["messages"])).toBe(true);
  });
});
