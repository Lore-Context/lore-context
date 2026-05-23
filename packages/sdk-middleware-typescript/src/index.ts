/**
 * @lore-context/sdk-middleware
 *
 * Public entry point. Real implementation lives in `./middleware.ts`.
 */

export {
  withMemoryHooks,
} from "./middleware.js";

export type {
  MiddlewareMode,
  RecallMethod,
  MiddlewareOptions,
  InjectAuditEvent,
  RetainAuditEvent,
  SubscriptionTier,
} from "./types.js";

export {
  LoreMiddlewareDoubleWrapError,
  LORE_MIDDLEWARE_MARKER,
  TIER_TOKEN_DEFAULTS,
  TIER_TOKEN_MAX,
} from "./types.js";

export {
  MiddlewareMetricsRegistry,
  createMetricsRegistry,
} from "./metrics.js";
