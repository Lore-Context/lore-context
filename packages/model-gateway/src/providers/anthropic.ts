/**
 * Lore v1.4 Lane C Phase 1 — Anthropic provider adapter.
 *
 * Uses the Anthropic Messages API format (claude-sonnet-4-5 default).
 * httpClient is dependency-injected for unit testing — no real API calls are
 * made unless a real HttpClient backed by globalThis.fetch is passed in.
 *
 * ADR ref: docs/v1.4-lane-c-detailed-plan.md §A.4 Step A.1
 */

import {
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type HttpClient,
  LlmProviderException,
} from "./types.js";

const TIMEOUT_MS = 10_000;

export interface AnthropicAdapterConfig {
  apiKey?: string;
  baseUrl?: string;
  modelId?: string;
  httpClient?: HttpClient;
}

/**
 * Anthropic Messages API adapter.
 *
 * Request format: POST {baseUrl}/v1/messages
 * Auth header: x-api-key: {apiKey}, anthropic-version: 2023-06-01
 */
export class AnthropicAdapter implements LlmProvider {
  readonly name = "anthropic";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly modelId: string;
  private readonly httpClient: HttpClient;

  constructor(config: AnthropicAdapterConfig = {}) {
    this.apiKey = config.apiKey ?? "";
    this.baseUrl = (config.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "");
    this.modelId = config.modelId ?? "claude-sonnet-4-5";
    this.httpClient = config.httpClient ?? globalFetchClient;
  }

  async invoke(request: LlmRequest): Promise<LlmResponse> {
    const startMs = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      // Anthropic passes system prompt as a top-level field, not a message.
      // Handled below in the body.
    }
    messages.push({ role: "user", content: request.prompt });

    const body: Record<string, unknown> = {
      model: this.modelId,
      max_tokens: request.maxTokens,
      messages,
    };
    if (request.systemPrompt) {
      body["system"] = request.systemPrompt;
    }
    if (request.temperature !== undefined) {
      body["temperature"] = request.temperature;
    }
    if (request.stopSequences && request.stopSequences.length > 0) {
      body["stop_sequences"] = request.stopSequences;
    }

    let response: { status: number; ok: boolean; text(): Promise<string> };
    try {
      response = await this.httpClient.fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
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
    const text = extractAnthropicText(data);
    const usage = extractAnthropicUsage(data);

    return {
      text,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs,
      providerName: this.name,
      modelId: extractAnthropicModel(data) ?? this.modelId,
    };
  }
}

// ---- helpers ----

function mapHttpError(status: number, body: string): never {
  if (status === 429) {
    const retryAfter = parseRetryAfter(body);
    throw new LlmProviderException({ kind: "rate_limit", status: 429, retryAfterSec: retryAfter });
  }
  if (status === 401 || status === 403) {
    throw new LlmProviderException({ kind: "auth", status: status as 401 | 403 });
  }
  if (status >= 500) {
    throw new LlmProviderException({ kind: "server_error", status });
  }
  throw new LlmProviderException({ kind: "other", message: `HTTP ${status}: ${truncate(body, 200)}` });
}

function extractAnthropicText(data: unknown): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const content = d["content"];
    if (Array.isArray(content) && content.length > 0) {
      const first = content[0] as Record<string, unknown>;
      if (typeof first["text"] === "string") return first["text"];
    }
  }
  return "";
}

function extractAnthropicUsage(data: unknown): { inputTokens: number; outputTokens: number } {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const usage = d["usage"] as Record<string, unknown> | undefined;
    if (usage) {
      return {
        inputTokens: typeof usage["input_tokens"] === "number" ? usage["input_tokens"] : 0,
        outputTokens: typeof usage["output_tokens"] === "number" ? usage["output_tokens"] : 0,
      };
    }
  }
  return { inputTokens: 0, outputTokens: 0 };
}

function extractAnthropicModel(data: unknown): string | undefined {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    return typeof d["model"] === "string" ? d["model"] : undefined;
  }
  return undefined;
}

function parseRetryAfter(body: string): number | undefined {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const errField = parsed["error"];
    const errObj = errField && typeof errField === "object" ? (errField as Record<string, unknown>) : undefined;
    const val = parsed["retry_after"] ?? errObj?.["retry_after"];
    if (typeof val === "number") return val;
  } catch {
    // ignore
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
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/** Default HttpClient backed by globalThis.fetch. */
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
