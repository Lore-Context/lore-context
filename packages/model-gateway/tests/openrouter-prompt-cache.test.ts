// Lore v2.0.2 — Lane P US-P: OpenRouter prompt-cache acceptance tests.
//
// P3: mock fetch; invoke with enablePromptCache=true → request body contains
//     usage.prompt_cache === true.
// P3 negative: enablePromptCache=false or unset → body does NOT contain
//     usage.prompt_cache field.
// P4: mock cache_hit response → lore_llm_cache_hit_total counter is incremented.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OpenRouterProvider, getCacheHitCount, _resetCacheHitCounter } from "../src/providers/openrouter.js";
import type { HttpClient } from "../src/providers/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(overrides?: object) {
  return {
    prompt: "Are these two statements contradictory?",
    systemPrompt: "You are a contradiction detector.",
    maxTokens: 128,
    requestId: "test-req-cache",
    model: "anthropic/claude-sonnet-4-6",
    ...overrides,
  };
}

function makeSuccessBody(extraUsage?: Record<string, unknown>) {
  return {
    id: "gen-cache-test",
    model: "anthropic/claude-sonnet-4-6",
    choices: [
      {
        message: { role: "assistant", content: '{"is_conflict":false,"severity":"low","reason":"No contradiction."}' },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 120,
      completion_tokens: 20,
      total_tokens: 140,
      ...extraUsage,
    },
  };
}

/** Capture the last request body sent by the provider. */
function makeCaptureHttpClient(
  status: number,
  responseBody: object,
): { client: HttpClient; getLastBody: () => Record<string, unknown> | null } {
  let lastBody: Record<string, unknown> | null = null;
  const client: HttpClient = {
    async fetch(_url, init) {
      if (init.body) {
        try {
          lastBody = JSON.parse(init.body) as Record<string, unknown>;
        } catch {
          lastBody = null;
        }
      }
      const text = JSON.stringify(responseBody);
      return { status, ok: status >= 200 && status < 300, text: async () => text };
    },
  };
  return { client, getLastBody: () => lastBody };
}

// ---------------------------------------------------------------------------
// Test isolation — reset counter before/after each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  _resetCacheHitCounter();
});

afterEach(() => {
  _resetCacheHitCounter();
});

// ---------------------------------------------------------------------------
// P3 — enablePromptCache=true sets usage.prompt_cache in request body
// ---------------------------------------------------------------------------

describe("P3 — prompt_cache request body field", () => {
  it("sets usage.prompt_cache=true in request body when enablePromptCache=true", async () => {
    const { client, getLastBody } = makeCaptureHttpClient(200, makeSuccessBody());
    const provider = new OpenRouterProvider({ apiKey: "sk-or-test", httpClient: client });

    await provider.invoke(makeRequest({ enablePromptCache: true }));

    const body = getLastBody();
    expect(body).not.toBeNull();
    expect(body!["usage"]).toBeDefined();
    expect((body!["usage"] as Record<string, unknown>)["prompt_cache"]).toBe(true);
  });

  it("does NOT set usage.prompt_cache when enablePromptCache=false", async () => {
    const { client, getLastBody } = makeCaptureHttpClient(200, makeSuccessBody());
    const provider = new OpenRouterProvider({ apiKey: "sk-or-test", httpClient: client });

    await provider.invoke(makeRequest({ enablePromptCache: false }));

    const body = getLastBody();
    expect(body).not.toBeNull();
    // usage field should not be present at all, or not contain prompt_cache
    const usageField = body!["usage"] as Record<string, unknown> | undefined;
    expect(usageField?.["prompt_cache"]).toBeUndefined();
  });

  it("does NOT set usage.prompt_cache when enablePromptCache is unset", async () => {
    const { client, getLastBody } = makeCaptureHttpClient(200, makeSuccessBody());
    const provider = new OpenRouterProvider({ apiKey: "sk-or-test", httpClient: client });

    await provider.invoke(makeRequest());

    const body = getLastBody();
    expect(body).not.toBeNull();
    const usageField = body!["usage"] as Record<string, unknown> | undefined;
    expect(usageField?.["prompt_cache"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// P4 — cache_hit response increments lore_llm_cache_hit_total counter
// ---------------------------------------------------------------------------

describe("P4 — lore_llm_cache_hit_total counter", () => {
  it("starts at 0 after reset", () => {
    expect(getCacheHitCount()).toBe(0);
  });

  it("increments counter when response contains cache_read_input_tokens > 0", async () => {
    const cacheHitBody = makeSuccessBody({ cache_read_input_tokens: 95 });
    const { client } = makeCaptureHttpClient(200, cacheHitBody);
    const provider = new OpenRouterProvider({ apiKey: "sk-or-test", httpClient: client });

    expect(getCacheHitCount()).toBe(0);
    await provider.invoke(makeRequest({ enablePromptCache: true }));
    expect(getCacheHitCount()).toBe(1);
  });

  it("does NOT increment counter when response has cache_read_input_tokens=0", async () => {
    const noCacheBody = makeSuccessBody({ cache_read_input_tokens: 0 });
    const { client } = makeCaptureHttpClient(200, noCacheBody);
    const provider = new OpenRouterProvider({ apiKey: "sk-or-test", httpClient: client });

    await provider.invoke(makeRequest({ enablePromptCache: true }));
    expect(getCacheHitCount()).toBe(0);
  });

  it("does NOT increment counter when response has no cache usage fields", async () => {
    const { client } = makeCaptureHttpClient(200, makeSuccessBody());
    const provider = new OpenRouterProvider({ apiKey: "sk-or-test", httpClient: client });

    await provider.invoke(makeRequest());
    expect(getCacheHitCount()).toBe(0);
  });

  it("increments counter correctly across multiple calls with cache hits", async () => {
    const cacheHitBody = makeSuccessBody({ cache_read_input_tokens: 80 });
    const { client } = makeCaptureHttpClient(200, cacheHitBody);
    const provider = new OpenRouterProvider({ apiKey: "sk-or-test", httpClient: client });

    await provider.invoke(makeRequest({ enablePromptCache: true }));
    await provider.invoke(makeRequest({ enablePromptCache: true }));
    await provider.invoke(makeRequest({ enablePromptCache: true }));
    expect(getCacheHitCount()).toBe(3);
  });
});
