/**
 * Lore v1.4 Lane C Phase 1 — Fallback Orchestrator.
 *
 * Implements the `anthropic → openai → local-qwen` chain with max 2 hops.
 * Cut-chain conditions: rate_limit, server_error, timeout, schema_invalid.
 * Non-cut conditions: auth (fail-fast — config error), other (unknown error).
 *
 * ADR ref: docs/v1.4-lane-c-detailed-plan.md §A.3 Decision + §A.4 Step A.2
 */

import {
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type LlmProviderError,
  LlmProviderException,
} from "./providers/types.js";

export interface FallbackEvent {
  requestId: string;
  fromProvider: string;
  toProvider: string;
  reason: LlmProviderError["kind"];
  /** 1-indexed attempt number (attempt 1 = first cut, i.e. moving from provider[0] to provider[1]) */
  attempt: number;
}

export interface FallbackConfig {
  providers: LlmProvider[];
  /** Max chain hops per request. ADR locks this at 2. */
  maxFallbacks: number;
  /** Optional hook fired on every chain cut. Used for OTel event emission. */
  onFallback?: (event: FallbackEvent) => void;
}

/**
 * Error kinds that trigger a chain cut (move to next provider).
 * `auth` and `other` do NOT trigger a cut — see ADR §A.3.
 */
const CUT_CHAIN_KINDS = new Set<LlmProviderError["kind"]>([
  "rate_limit",
  "server_error",
  "timeout",
  "schema_invalid",
]);

export class FallbackOrchestrator {
  private readonly providers: LlmProvider[];
  private readonly maxFallbacks: number;
  private readonly onFallback: ((event: FallbackEvent) => void) | undefined;

  private _fallbackCount = 0;
  private readonly _perProviderInvocations: Record<string, number> = {};

  constructor(config: FallbackConfig) {
    if (config.providers.length === 0) {
      throw new Error("FallbackOrchestrator requires at least one provider");
    }
    this.providers = config.providers;
    this.maxFallbacks = config.maxFallbacks;
    this.onFallback = config.onFallback;
  }

  async invoke(request: LlmRequest): Promise<LlmResponse> {
    let lastError: LlmProviderException | undefined;
    let fallbacksUsed = 0;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];

      try {
        const response = await provider.invoke(request);
        // Success — record invocation and return.
        this._perProviderInvocations[provider.name] =
          (this._perProviderInvocations[provider.name] ?? 0) + 1;
        return response;
      } catch (err) {
        if (!(err instanceof LlmProviderException)) {
          // Unexpected non-LlmProviderException — wrap as "other" and do NOT cut.
          throw new LlmProviderException({
            kind: "other",
            message: err instanceof Error ? err.message : String(err),
          });
        }

        lastError = err;
        const errorKind = err.providerError.kind;

        // auth and other: fail fast, do not cut the chain.
        if (!CUT_CHAIN_KINDS.has(errorKind)) {
          this._perProviderInvocations[provider.name] =
            (this._perProviderInvocations[provider.name] ?? 0) + 1;
          throw err;
        }

        // Record the invocation attempt.
        this._perProviderInvocations[provider.name] =
          (this._perProviderInvocations[provider.name] ?? 0) + 1;

        // Check if we can still fall over.
        if (fallbacksUsed >= this.maxFallbacks) {
          // Exhausted fallback budget — throw last error.
          throw lastError;
        }

        const nextProvider = this.providers[i + 1];
        if (!nextProvider) {
          // No more providers in chain.
          throw lastError;
        }

        // Emit fallback event.
        fallbacksUsed++;
        this._fallbackCount++;
        this.onFallback?.({
          requestId: request.requestId,
          fromProvider: provider.name,
          toProvider: nextProvider.name,
          reason: errorKind,
          attempt: fallbacksUsed,
        });
      }
    }

    // Should not be reachable, but satisfy TypeScript exhaustiveness.
    throw lastError ?? new LlmProviderException({ kind: "other", message: "no_providers" });
  }

  /** Aggregate stats since construction. Thread-safe for read (never resets). */
  stats(): { fallbackCount: number; perProviderInvocations: Record<string, number> } {
    return {
      fallbackCount: this._fallbackCount,
      perProviderInvocations: { ...this._perProviderInvocations },
    };
  }
}
