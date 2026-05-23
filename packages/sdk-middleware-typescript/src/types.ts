/**
 * @lore-context/sdk-middleware — public types
 *
 * Acceptance refs:
 *  - V2.0.3-S10: recallMethod type union is narrowed to "facts" only in v0.1.0.
 *                "reflect" is v2.1 carry-forward (see plan §10).
 *
 * v0.1.0 surface deliberately omits flags whose implementation is not yet
 * shipped (per critic review of PR #209):
 *  - retainEveryNTurns: planned sampling knob — not implemented; carry-forward
 *  - retainBatchWindowMs: planned debounce window — not implemented; carry-forward
 *  - RetainAuditEvent.reason "redaction": planned credential redaction —
 *    not implemented; carry-forward to v2.1 (per plan §10 dedicated security lane).
 */

export type MiddlewareMode = "hybrid" | "context" | "tools";

export type RecallMethod = "facts";

export interface MiddlewareOptions {
  mode?: MiddlewareMode;
  recallMaxTokens?: number;
  recallPreamble?: string;
  recallMethod?: RecallMethod;
  retainSourceTag?: string;
  injectTimeoutMs?: number;
  onInjectAudit?: (info: InjectAuditEvent) => void;
  onRetainAudit?: (info: RetainAuditEvent) => void;
}

export interface InjectAuditEvent {
  skipped: boolean;
  reason?: "timeout" | "lore_unreachable" | "mode_disabled" | "empty_result";
  episodes?: { record_id: string; score: number }[];
  latencyMs?: number;
  callId?: string;
}

export interface RetainAuditEvent {
  skipped: boolean;
  reason?: "stream_error" | "filtered_marker" | "transport_error";
  memoryId?: string;
  callId?: string;
}

export class LoreMiddlewareDoubleWrapError extends Error {
  constructor(message: string = "withMemoryHooks has already been applied to this client") {
    super(message);
    this.name = "LoreMiddlewareDoubleWrapError";
  }
}

export const LORE_MIDDLEWARE_MARKER: unique symbol = Symbol.for("lore-context/middleware-applied");

export type SubscriptionTier = "free" | "go" | "plus" | "pro";

export const TIER_TOKEN_DEFAULTS: Record<SubscriptionTier, number> = {
  free: 512,
  go: 1024,
  plus: 4096,
  pro: 8192,
};
export const TIER_TOKEN_MAX: Record<SubscriptionTier, number> = TIER_TOKEN_DEFAULTS;
