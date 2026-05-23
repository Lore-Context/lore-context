export type Actor = "user" | "assistant" | "tool" | "system";

export type CaptureMode = "summary_only" | "raw_archive";

export interface CaptureEvent {
  source_id: string;
  external_event_id: string;
  occurred_at: string;
  event_type: "session_delta";
  actor: Actor;
  /** short summary suitable for upload by default */
  summary: string;
  /** full text only when capture_mode is raw_archive */
  raw_content?: string;
  capture_mode: CaptureMode;
  source_url: string;
  source_label: string;
  provider: string;
  metadata?: Record<string, unknown>;
}

export interface QueuedCaptureEnvelope {
  event: CaptureEvent;
  attempts: number;
  /** ISO timestamp when this envelope is eligible for the next upload attempt */
  nextAttemptAt: string;
  /** ISO of last failure */
  lastErrorAt?: string;
  /** redacted last error string */
  lastError?: string;
}

export interface ExtensionState {
  /** legacy global authorization flag - kept for tests and migration. */
  isAuthorized: boolean;
  /** v1.0 per-domain authorization. The extension only captures domains here. */
  authorizedDomains: string[];
  /** global pause - blocks all uploads when true */
  isPaused: boolean;
  /** global private mode - blocks persistence when true */
  isPrivateMode: boolean;
  /** per-domain pause set */
  pausedDomains: string[];
  /** per-domain private mode set */
  privateDomains: string[];
  /** when true the user has opted in to raw transcript upload (still requires source consent) */
  rawArchiveEnabled: boolean;
  /** API endpoint for the cloud ingestion path */
  apiEndpoint: string;
  /** vault id from dashboard pairing */
  vaultId?: string;
  accountId?: string;
  /** device token; never logged, displayed masked in options */
  deviceToken?: string;
  /** ISO timestamp of last successful capture (for popup) */
  lastCaptureAt?: string;
  /** Last redacted error message and timestamp (for popup) */
  lastError?: string;
  lastErrorAt?: string;
}
