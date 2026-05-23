/**
 * Lore v1.4 Lane C Phase 1 — LLM provider abstraction layer.
 *
 * Defines the uniform request/response contract used by all provider adapters
 * (Anthropic, OpenAI, local-qwen) and consumed by FallbackOrchestrator.
 *
 * ADR ref: docs/v1.4-lane-c-detailed-plan.md §A.1 – §A.4 Step A.1
 */

/** A single LLM invocation request. */
export interface LlmRequest {
  prompt: string;
  systemPrompt?: string;
  /** Provider model id selected by the task router. */
  model?: string;
  /** When set the caller expects the response text to be valid JSON matching
   *  this schema. JSON-schema validation is the caller's responsibility;
   *  FallbackOrchestrator treats `schema_invalid` errors as a cut-chain signal. */
  jsonSchema?: object;
  maxTokens: number;
  temperature?: number;
  stopSequences?: string[];
  /** Used for OTel correlation across the fallback chain. */
  requestId: string;
  /**
   * Lane P — when true, ask the provider to enable prompt caching for this
   * request. OpenRouter adapter sets `usage.prompt_cache: true` in the request
   * body when this flag is set. Controlled by LORE_OPENROUTER_PROMPT_CACHE env
   * var via butler-flags.ts `openrouterPromptCache` flag.
   *
   * TODO: verify exact OpenRouter request body field against OpenRouter docs
   * before production flip; operator should test with curl.
   */
  enablePromptCache?: boolean;
}

/** Successful LLM invocation result. */
export interface LlmResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** "anthropic" | "openai" | "local-qwen" */
  providerName: string;
  modelId: string;
}

/**
 * Discriminated union of all error kinds a provider can raise.
 * FallbackOrchestrator inspects `kind` to decide whether to cut the chain.
 */
export type LlmProviderError =
  | { kind: "rate_limit"; retryAfterSec?: number; status: 402 | 429 }
  | { kind: "server_error"; status: number }
  | { kind: "timeout"; ms: number }
  | { kind: "auth"; status: 401 | 403 }
  | { kind: "schema_invalid"; reason: string }
  | { kind: "other"; message: string };

/** Thrown by provider adapters; carries a structured `providerError` field. */
export class LlmProviderException extends Error {
  readonly providerError: LlmProviderError;

  constructor(providerError: LlmProviderError) {
    super(describeError(providerError));
    this.name = "LlmProviderException";
    this.providerError = providerError;
  }
}

/** Injectable fetch-like HTTP client — makes adapters unit-testable without
 *  real network calls. */
export interface HttpClient {
  fetch(
    url: string,
    init: {
      method: string;
      headers: Record<string, string>;
      body?: string;
      signal?: AbortSignal;
    },
  ): Promise<{ status: number; ok: boolean; text(): Promise<string> }>;
}

/** Core provider interface. Each adapter implements this. */
export interface LlmProvider {
  /** "anthropic" | "openai" | "local-qwen" */
  readonly name: string;
  /** Invoke the provider. Throws LlmProviderException on any failure. */
  invoke(request: LlmRequest): Promise<LlmResponse>;
}

// ---- helpers ----

function describeError(e: LlmProviderError): string {
  switch (e.kind) {
    case "rate_limit":
      return `llm_provider_rate_limit: HTTP ${e.status}${e.retryAfterSec != null ? ` (retry after ${e.retryAfterSec}s)` : ""}`;
    case "server_error":
      return `llm_provider_server_error: HTTP ${e.status}`;
    case "timeout":
      return `llm_provider_timeout: ${e.ms}ms`;
    case "auth":
      return `llm_provider_auth: HTTP ${e.status}`;
    case "schema_invalid":
      return `llm_provider_schema_invalid: ${e.reason}`;
    case "other":
      return `llm_provider_other: ${e.message}`;
  }
}
