// Canonical captured session model for v0.7 capture engine.
// Sources: Claude Code JSONL, Codex sessions, Cursor exports, OpenCode plugin.
// PRD: .omx/plans/prd-lore-v0.7-cloud-personal-memory-alpha.md §7.2 capture.

export type CaptureProvider = "claude-code" | "codex" | "cursor" | "opencode";

export type CaptureMode = "summary_only" | "raw_archive";

export type CaptureTurnRole = "user" | "assistant" | "system" | "tool";

export interface CaptureToolCall {
  name: string;
  input?: unknown;
  output?: unknown;
  status?: "ok" | "error";
}

export interface CaptureTurn {
  index: number;
  role: CaptureTurnRole;
  text: string;
  toolCalls?: CaptureToolCall[];
  startedAt?: string;
  endedAt?: string;
  // True if redaction modified this turn's text.
  redacted?: boolean;
  // True if turn was inside a `<private>` envelope and stripped.
  private?: boolean;
}

export interface CaptureSourceRef {
  provider: CaptureProvider;
  // Original session/file identifier from the agent client.
  originalId: string;
  // Local file path where the source lives (not uploaded).
  path?: string;
  // Project/repo fingerprint if known.
  projectId?: string;
  cwd?: string;
}

export interface CaptureSession {
  // Canonical session identifier — provider:original_id (deterministic).
  id: string;
  provider: CaptureProvider;
  source: CaptureSourceRef;
  startedAt: string;
  endedAt: string;
  turns: CaptureTurn[];
  // Idempotency key derived from provider + original_id + content hash.
  idempotencyKey: string;
  // Counters for redaction outcomes (for `lore status` visibility).
  redactionStats: RedactionStats;
  // Extractor-version + capture-mode metadata.
  metadata: CaptureSessionMetadata;
}

export interface CaptureSessionMetadata {
  captureMode: CaptureMode;
  extractorVersion: string;
  agentVersion?: string;
  // Mark whether the original raw transcript is preserved locally.
  // Cloud upload still gates on vault `raw_archive` setting (server-side check).
  rawArchiveLocal: boolean;
  notes?: string;
}

export interface RedactionStats {
  secretsRemoved: number;
  privateBlocksStripped: number;
  turnsAffected: number;
}

export interface CaptureEventEnvelope {
  schemaVersion: "1";
  vaultId?: string;
  deviceId?: string;
  agentType: CaptureProvider;
  capturedAt: string;
  sourceRef: CaptureSourceRef;
  captureMode: CaptureMode;
  startedAt: string;
  endedAt: string;
  idempotencyKey: string;
  // Summary-only payload by default; raw turns only when raw_archive is enabled.
  summary: string;
  turnCount: number;
  redactionStats: RedactionStats;
  rawTurns?: CaptureTurn[];
}

export interface ParseResult {
  session: CaptureSession;
  warnings: string[];
}

export const CAPTURE_EXTRACTOR_VERSION = "0.7.0-alpha.0";
