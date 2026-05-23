/**
 * Lore v1.8 Lane G — OpenRouter provider adapter.
 * Updated v2.0.2 Lane P — prompt caching + lore_llm_cache_hit_total counter.
 *
 * Uses OpenRouter's OpenAI-compatible Chat Completions API. The model id must
 * come from the request so task routing can own model selection.
 */

import {
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type HttpClient,
  LlmProviderException,
} from "./types.js";

// ---------------------------------------------------------------------------
// Prometheus-compatible counter for prompt-cache hits.
// Uses a simple in-memory counter so there is no prom-client dependency.
// The /metrics HTTP endpoint in apps/api reads this via incrementCacheHitCounter
// and getCacheHitCount.
// ---------------------------------------------------------------------------

let _cacheHitCount = 0;

/** Increment the lore_llm_cache_hit_total counter (called when cache hit detected). */
export function incrementCacheHitCounter(): void {
  _cacheHitCount += 1;
}

/** Return the current value of lore_llm_cache_hit_total. */
export function getCacheHitCount(): number {
  return _cacheHitCount;
}

/** Reset the counter — exposed for test isolation only. */
export function _resetCacheHitCounter(): void {
  _cacheHitCount = 0;
}

const TIMEOUT_MS = 10_000;
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export interface OpenRouterProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  httpClient?: HttpClient;
}

export interface ProviderHealth {
  healthy: boolean;
  latencyMs: number;
}

export class OpenRouterProvider implements LlmProvider {
  readonly name = "openrouter";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpClient: HttpClient;

  constructor(configOrApiKey: OpenRouterProviderConfig | string = {}) {
    const config =
      typeof configOrApiKey === "string" ? { apiKey: configOrApiKey } : configOrApiKey;
    this.apiKey = config.apiKey ?? "";
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.httpClient = config.httpClient ?? globalFetchClient;
  }

  async invoke(request: LlmRequest): Promise<LlmResponse> {
    const startMs = Date.now();
    const model = request.model;
    if (!model) {
      throw new LlmProviderException({
        kind: "schema_invalid",
        reason: "openrouter_model_required",
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    messages.push({ role: "user", content: request.prompt });

    const body: Record<string, unknown> = {
      model,
      max_tokens: request.maxTokens,
      messages,
    };
    if (request.temperature !== undefined) {
      body["temperature"] = request.temperature;
    }
    if (request.stopSequences && request.stopSequences.length > 0) {
      body["stop"] = request.stopSequences;
    }
    // Lane P — prompt caching: set usage.prompt_cache=true when requested.
    // TODO: verify exact OpenRouter request body field against OpenRouter docs
    // before production flip; operator should test with curl against staging.
    if (request.enablePromptCache === true) {
      body["usage"] = { prompt_cache: true };
    }

    let response: { status: number; ok: boolean; text(): Promise<string> };
    try {
      response = await this.httpClient.fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${this.apiKey}`,
          "x-request-id": request.requestId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (isAbortError(err)) {
        throw new LlmProviderException({ kind: "timeout", ms: TIMEOUT_MS });
      }
      throw new LlmProviderException({ kind: "other", message: String(err) });
    } finally {
      clearTimeout(timer);
    }

    const latencyMs = Date.now() - startMs;
    const responseText = await safeReadText(response);

    if (!response.ok) {
      mapHttpError(response.status, responseText);
    }

    const data = parseJson(responseText);
    const text = extractText(data);
    const usage = extractUsage(data);

    // Lane P — detect prompt-cache hit from response and increment counter.
    if (hasCacheHit(data)) {
      incrementCacheHitCounter();
    }

    return {
      text,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs,
      providerName: this.name,
      modelId: extractModel(data) ?? model,
    };
  }

  async health(): Promise<ProviderHealth> {
    const startMs = Date.now();
    try {
      const response = await this.httpClient.fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          "authorization": `Bearer ${this.apiKey}`,
        },
      });
      const latencyMs = Date.now() - startMs;
      if (!response.ok) {
        return { healthy: false, latencyMs };
      }
      const data = parseJson(await safeReadText(response));
      return { healthy: hasModelList(data), latencyMs };
    } catch {
      return { healthy: false, latencyMs: Date.now() - startMs };
    }
  }
}

function mapHttpError(status: number, body: string): never {
  if (status === 402 || status === 429) {
    const retryAfter = parseRetryAfter(body);
    throw new LlmProviderException({
      kind: "rate_limit",
      status: status as 402 | 429,
      retryAfterSec: retryAfter,
    });
  }
  if (status === 401 || status === 403) {
    throw new LlmProviderException({ kind: "auth", status: status as 401 | 403 });
  }
  if (status >= 500) {
    throw new LlmProviderException({ kind: "server_error", status });
  }
  throw new LlmProviderException({ kind: "other", message: `HTTP ${status}: ${truncate(body, 200)}` });
}

function extractText(data: unknown): string {
  if (data && typeof data === "object") {
    const choices = (data as Record<string, unknown>)["choices"];
    if (Array.isArray(choices) && choices.length > 0) {
      const first = choices[0] as Record<string, unknown>;
      const message = first["message"] as Record<string, unknown> | undefined;
      if (message && typeof message["content"] === "string") {
        return message["content"];
      }
    }
  }
  return "";
}

function extractUsage(data: unknown): { inputTokens: number; outputTokens: number } {
  if (data && typeof data === "object") {
    const usage = (data as Record<string, unknown>)["usage"] as Record<string, unknown> | undefined;
    if (usage) {
      return {
        inputTokens: typeof usage["prompt_tokens"] === "number" ? usage["prompt_tokens"] : 0,
        outputTokens: typeof usage["completion_tokens"] === "number" ? usage["completion_tokens"] : 0,
      };
    }
  }
  return { inputTokens: 0, outputTokens: 0 };
}

/**
 * Detect a prompt-cache hit from an OpenRouter response.
 * OpenRouter reports cache usage in response.usage.cache_read_input_tokens
 * (Anthropic-backed models) or similar fields. We treat any positive
 * cache_read_input_tokens value as a cache hit.
 *
 * TODO: verify exact field name against OpenRouter docs before production flip.
 */
function hasCacheHit(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const usage = (data as Record<string, unknown>)["usage"] as Record<string, unknown> | undefined;
  if (!usage) return false;
  const cacheTokens = usage["cache_read_input_tokens"];
  return typeof cacheTokens === "number" && cacheTokens > 0;
}

function extractModel(data: unknown): string | undefined {
  if (data && typeof data === "object") {
    const model = (data as Record<string, unknown>)["model"];
    return typeof model === "string" ? model : undefined;
  }
  return undefined;
}

function hasModelList(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === "object" &&
      Array.isArray((data as Record<string, unknown>)["data"]),
  );
}

function parseRetryAfter(body: string): number | undefined {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const err = parsed["error"] as Record<string, unknown> | undefined;
    const val = err?.["retry_after"] ?? parsed["retry_after"];
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const n = Number.parseFloat(val);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    // ignore malformed error bodies
  }
  return undefined;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new LlmProviderException({ kind: "other", message: `invalid_json_response: ${truncate(text, 100)}` });
  }
}

async function safeReadText(response: { text(): Promise<string> }): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}...`;
}

const globalFetchClient: HttpClient = {
  async fetch(url, init) {
    const response = await globalThis.fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      signal: init.signal,
    });
    return {
      status: response.status,
      ok: response.ok,
      text: () => response.text(),
    };
  },
};
