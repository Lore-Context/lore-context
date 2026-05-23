// Unified capture source state machine for rc.1 automatic capture pipeline.
//
// Each source connector (hooks, browser, MCP, upload/import, AgentMemory
// replay) progresses through these states after the user authorizes it.
// Capture events are written only when the source is `active`; all other
// states produce a skip with an audit reason so the user can see exactly
// why nothing was captured.
//
// States (plan §Lane 3):
//   active               - capture is running normally
//   paused               - user explicitly paused; resumes on request
//   private              - private mode: no content is captured; structural
//                          markers are recorded so the session is auditable
//   disconnected         - credentials revoked, token expired, or provider
//                          unreachable; requires user reconnect
//   degraded             - source is connected but at reduced quality (e.g.
//                          partial permissions, quota near limit, model
//                          queue delay)
//   awaiting_authorization - source exists but user has not yet completed
//                          the consent/auth step
//
// Plain-language actions (plan §Lane 3 "plain action semantics"):
//   pause_capture        - stop future capture from this source
//   resume_capture       - restart capture after a pause
//   enable_private_mode  - switch to private; no content leaves device
//   disable_private_mode - exit private mode; return to active
//   delete_source        - terminal: source is removed from the vault

export type CaptureSourceState =
  | "active"
  | "paused"
  | "private"
  | "disconnected"
  | "degraded"
  | "awaiting_authorization";

export type SourceAction =
  | "pause_capture"
  | "resume_capture"
  | "enable_private_mode"
  | "disable_private_mode"
  | "delete_source";

export interface SourceActionResult {
  next: CaptureSourceState | "deleted";
  auditReason: string;
  allowed: boolean;
}

// Terminal state sentinel returned by applySourceAction when the action
// logically removes the source from the vault.
export const SOURCE_DELETED = "deleted" as const;

// State transition table. The function is intentionally strict: unknown
// transitions are rejected with `allowed: false` so callers can surface
// a user-facing error without crashing.
export function applySourceAction(
  current: CaptureSourceState,
  action: SourceAction
): SourceActionResult {
  if (action === "delete_source") {
    return { next: SOURCE_DELETED, auditReason: "source deleted by user", allowed: true };
  }

  if (action === "pause_capture") {
    if (current === "paused") {
      return { next: "paused", auditReason: "source already paused", allowed: true };
    }
    if (current === "awaiting_authorization") {
      return { next: "paused", auditReason: "capture paused before authorization complete", allowed: true };
    }
    if (current === "disconnected") {
      return { next: "paused", auditReason: "capture paused (source was disconnected)", allowed: true };
    }
    return { next: "paused", auditReason: "capture paused by user", allowed: true };
  }

  if (action === "resume_capture") {
    if (current === "active") {
      return { next: "active", auditReason: "source already active", allowed: true };
    }
    if (current === "paused") {
      return { next: "active", auditReason: "capture resumed by user", allowed: true };
    }
    if (current === "degraded") {
      return { next: "active", auditReason: "capture resumed from degraded state", allowed: true };
    }
    if (current === "private") {
      return { next: "paused", auditReason: "resume requested while in private mode; disable private mode first", allowed: false };
    }
    if (current === "disconnected" || current === "awaiting_authorization") {
      return {
        next: current,
        auditReason: "cannot resume: source must be reconnected first",
        allowed: false
      };
    }
    return { next: current, auditReason: `resume not valid from state ${current}`, allowed: false };
  }

  if (action === "enable_private_mode") {
    return { next: "private", auditReason: "private mode enabled by user", allowed: true };
  }

  if (action === "disable_private_mode") {
    if (current !== "private") {
      return { next: current, auditReason: "private mode is not currently active", allowed: false };
    }
    return { next: "paused", auditReason: "private mode disabled; capture paused until explicitly resumed", allowed: true };
  }

  // Exhaustive fallback — TypeScript will warn if a new action is added above.
  const _exhaustive: never = action;
  return { next: current, auditReason: `unknown action ${String(_exhaustive)}`, allowed: false };
}

// Whether a source in this state should produce capture events. Returns false
// for any state that means "do not write content to the cloud".
export function canCapture(state: CaptureSourceState): boolean {
  return state === "active" || state === "degraded";
}

// Whether a source in this state should emit a private-mode structural marker
// (session existed but content was suppressed).
export function isPrivateMode(state: CaptureSourceState): boolean {
  return state === "private";
}

// Map legacy 3-state `CaptureSourceStatus` and 5-state
// `CaptureSourceRecord.status` values to the unified 6-state model. Used by
// the pipeline glue so callers that predate this module still work.
// Also accepts native CaptureSourceState values so callers can pass either
// form without branching.
export function sourceStateFromLegacy(
  legacy: string | undefined | null
): CaptureSourceState {
  switch (legacy) {
    // Native 6-state passthrough — already canonical, return as-is.
    case "active":
      return "active";
    case "paused":
      return "paused";
    case "private":
      return "private";
    case "disconnected":
      return "disconnected";
    case "degraded":
      return "degraded";
    case "awaiting_authorization":
      return "awaiting_authorization";
    // Legacy v0.8 / connector status aliases.
    case "private_mode":
      return "private";
    case "revoked":
    case "deleted":
    case "error":
      return "disconnected";
    default:
      return "awaiting_authorization";
  }
}
