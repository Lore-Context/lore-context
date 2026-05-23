export type {
  CaptureProvider,
  CaptureMode,
  CaptureTurnRole,
  CaptureToolCall,
  CaptureTurn,
  CaptureSourceRef,
  CaptureSession,
  CaptureSessionMetadata,
  RedactionStats,
  CaptureEventEnvelope,
  ParseResult
} from "./types.js";
export { CAPTURE_EXTRACTOR_VERSION } from "./types.js";

export { redactText, redactTurns, type RedactionResult } from "./redaction.js";
export { buildIdempotencyKey, hashContent, canonicalSessionId } from "./idempotency.js";

export {
  parseClaudeCodeJsonl,
  parseClaudeCodeJsonlFile,
  type ClaudeCodeParseInput
} from "./parsers/claude-code.js";
export {
  parseCodexSession,
  parseCodexSessionFile,
  type CodexParseInput
} from "./parsers/codex.js";
export {
  parseCursorSession,
  parseCursorSessionFile,
  type CursorParseInput
} from "./parsers/cursor.js";

export {
  scanClaudeCode,
  scanCodex,
  scanCursor,
  scanQwen,
  defaultClaudeCodeRoot,
  defaultCodexRoots,
  defaultCursorRoots,
  defaultQwenRoots,
  type DiscoveredSource,
  type ScanOptions
} from "./scanner.js";

export { buildEnvelope, summarizeSession, type BuildEnvelopeOptions } from "./envelope.js";

export {
  buildMarker,
  appendMarker,
  defaultQueuePath,
  fingerprintCwd,
  type StopHookInput,
  type StopHookMarker
} from "./stop-hook.js";

// V0.8 surface — canonical wire schema, local queue, scanner state, hook
// installer, and the daemon pipeline glue. Imported separately so v0.7
// callers (CLI watch loops written before v0.8) keep working.

export {
  CAPTURE_REDACTION_VERSION,
  providerToWire,
  providerFromWire,
  toWireSession,
  type CaptureProviderV08,
  type CapturedSessionV08,
  type CapturedSessionTurnV08,
  type CapturedSessionRedactionMeta,
  type ToWireOptions
} from "./types-v08.js";

export {
  ScannerState,
  defaultScannerStatePath,
  type ScannerStateEntry
} from "./scanner-state.js";

export {
  UploadQueue,
  defaultQueueDir,
  nextRunAt,
  type QueueEnvelope,
  type NextAttemptSchedule
} from "./upload-queue.js";

export {
  defaultClaudeSettingsPath,
  readClaudeSettings,
  planStopHookInstall,
  planStopHookUninstall,
  installStopHook,
  uninstallStopHook,
  type ClaudeSettings,
  type StopHookInstallerOptions,
  type StopHookInstallResult,
  type StopHookUninstallResult
} from "./stop-hook-installer.js";

export {
  decideUpload,
  processQueueOnce,
  type CaptureSourceStatus,
  type SourceUploadDecision,
  type IngestResponse,
  type IngestUploader,
  type ProcessQueueOptions,
  type ProcessQueueResult
} from "./pipeline.js";

// rc.1 source state machine — unified 6-state model across all capture connectors.
export {
  applySourceAction,
  canCapture,
  isPrivateMode,
  sourceStateFromLegacy,
  SOURCE_DELETED,
  type CaptureSourceState,
  type SourceAction,
  type SourceActionResult
} from "./source-state.js";

// rc.1 capture inbox candidate — sessions become candidates, never trusted memories.
export {
  sessionToCandidate,
  candidateIdFromKey,
  isCaptureInboxCandidate,
  explainNoMemoryFound,
  isNoMemoryCaptureRecord,
  inferNoMemoryReason,
  type CaptureInboxCandidate,
  type CandidateState,
  type CandidateType,
  type SessionToCandidateOptions,
  type NoMemoryCaptureRecord,
  type NoMemoryReason,
  type ExplainNoMemoryOptions
} from "./candidate.js";
