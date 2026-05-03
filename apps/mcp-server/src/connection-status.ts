/**
 * Doctor-style connection-status primitives. Pure functions used by the
 * dashboard, hosted MCP layer, and CLI doctor flow to render the user-visible
 * "is the AI app connected" surface without exposing raw logs first.
 *
 * Design contract:
 *   - These are protocol/capability primitives. They never call MCP tools or
 *     reveal tokens. The dashboard supplies opaque booleans (token expired?
 *     helper running? source paused?) and gets a localized label + remediation.
 *   - Each state must remain stable across renders so screenshots and copy
 *     audits can rely on it.
 *   - Ordinary users never see "MCP" or "stdio" in the label or hint.
 */

export type McpConnectionState =
  | "connected"
  | "connecting"
  | "unauthenticated"
  | "token_expired"
  | "helper_not_running"
  | "source_paused"
  | "reconnect_needed"
  | "rate_limited"
  | "service_degraded"
  | "unknown";

export interface McpConnectionInputs {
  /** True when a hosted service token has been issued and is still cached. */
  hasServiceToken?: boolean;
  /** True when the cached token's expiry is in the past. */
  tokenExpired?: boolean;
  /**
   * For locally-running helpers (Claude Code, Codex, Cursor adapter): is the
   * helper process actually running? When the dashboard cannot probe the
   * helper, leave undefined.
   */
  helperRunning?: boolean;
  /** True when the connected source is paused by the user. */
  sourcePaused?: boolean;
  /** Last reconnection error (e.g. "network", "auth_revoked"). */
  lastReconnectError?: string;
  /** Operator-set: hosted service is in maintenance / degraded mode. */
  serviceDegraded?: boolean;
  /** Recent rate-limit signal from the API. */
  rateLimited?: boolean;
  /** True while the dashboard is actively negotiating connection. */
  isNegotiating?: boolean;
}

export interface McpConnectionStatus {
  state: McpConnectionState;
  /** Short user-facing label, no MCP jargon. */
  label: string;
  /** One-sentence remediation hint, plain language. */
  hint: string;
  /**
   * Opaque action key the dashboard can route to a specific handler:
   *   none | reconnect | resume_source | start_helper | sign_in | wait
   */
  action: "none" | "reconnect" | "resume_source" | "start_helper" | "sign_in" | "wait";
  /** True when the agent can write/recall right now. */
  isHealthy: boolean;
}

/**
 * Resolve raw signals into a single user-facing status. Order matters — most
 * actionable / blocking states are checked first so the dashboard always
 * surfaces the most helpful next step.
 */
export function describeMcpConnectionStatus(input: McpConnectionInputs): McpConnectionStatus {
  const i = input ?? {};

  if (i.serviceDegraded) {
    return {
      state: "service_degraded",
      label: "Service is recovering",
      hint: "Lore is in degraded mode. Capture and recall may pause briefly. No action needed.",
      action: "wait",
      isHealthy: false,
    };
  }

  if (!i.hasServiceToken) {
    return {
      state: "unauthenticated",
      label: "Sign in to connect",
      hint: "Sign in with Google to connect your AI app.",
      action: "sign_in",
      isHealthy: false,
    };
  }

  if (i.tokenExpired) {
    return {
      state: "token_expired",
      label: "Reconnect needed",
      hint: "Your connection expired. Click reconnect to restore it.",
      action: "reconnect",
      isHealthy: false,
    };
  }

  if (i.helperRunning === false) {
    return {
      state: "helper_not_running",
      label: "Helper is not running",
      hint: "Start the AI app helper to capture new context. Existing memories remain available.",
      action: "start_helper",
      isHealthy: false,
    };
  }

  if (i.sourcePaused) {
    return {
      state: "source_paused",
      label: "Capture is paused",
      hint: "Resume capture to record new context from this AI app.",
      action: "resume_source",
      isHealthy: false,
    };
  }

  if (i.rateLimited) {
    return {
      state: "rate_limited",
      label: "Slow down",
      hint: "Too many requests in a short window. Lore will resume automatically.",
      action: "wait",
      isHealthy: false,
    };
  }

  if (i.lastReconnectError) {
    return {
      state: "reconnect_needed",
      label: "Reconnect needed",
      hint: "We could not refresh the connection. Click reconnect to try again.",
      action: "reconnect",
      isHealthy: false,
    };
  }

  if (i.isNegotiating) {
    return {
      state: "connecting",
      label: "Connecting",
      hint: "Linking your AI app to Lore.",
      action: "wait",
      isHealthy: false,
    };
  }

  if (i.helperRunning === undefined && i.hasServiceToken) {
    // Hosted-only flow — helper presence is irrelevant.
    return {
      state: "connected",
      label: "Connected",
      hint: "Your AI app can capture and recall memory.",
      action: "none",
      isHealthy: true,
    };
  }

  if (i.helperRunning === true) {
    return {
      state: "connected",
      label: "Connected",
      hint: "Your AI app can capture and recall memory.",
      action: "none",
      isHealthy: true,
    };
  }

  return {
    state: "unknown",
    label: "Status unavailable",
    hint: "We could not determine the connection state. Try refreshing.",
    action: "reconnect",
    isHealthy: false,
  };
}

/**
 * Roll up many sources into one dashboard banner. Returns the worst (most
 * actionable) state across all inputs so the dashboard doesn't show a mixed
 * green/yellow/red banner that confuses non-technical users.
 */
export function summarizeMcpConnections(inputs: McpConnectionInputs[]): McpConnectionStatus {
  if (!inputs || inputs.length === 0) {
    return describeMcpConnectionStatus({});
  }
  const ranked = inputs.map(describeMcpConnectionStatus).sort((a, b) => statePriority(a.state) - statePriority(b.state));
  return ranked[0];
}

function statePriority(state: McpConnectionState): number {
  const order: Record<McpConnectionState, number> = {
    service_degraded: 0,
    unauthenticated: 1,
    token_expired: 2,
    reconnect_needed: 3,
    helper_not_running: 4,
    source_paused: 5,
    rate_limited: 6,
    connecting: 7,
    unknown: 8,
    connected: 9,
  };
  return order[state] ?? 10;
}
