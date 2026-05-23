// Capture Inbox Candidate — the intermediate state between a raw captured
// session and a trusted recall memory.
//
// Design invariant (rc.1 plan §Lane 3):
//   Capture NEVER auto-promotes to trusted recall memory.
//   Every captured session produces at most one CaptureInboxCandidate with
//   state "pending". The candidate must be explicitly approved by the user
//   (or an authorized automated reviewer) before it becomes a memory.
//
// This module is intentionally free of cloud/HTTP dependencies so it can
// run in the local daemon, the CLI, and tests without network access.

import { randomUUID } from "node:crypto";
import type { CapturedSessionV08 } from "./types-v08.js";

// Lifecycle states for a candidate. Transitions are one-way except
// pending → approved/rejected which can be corrected via edit/undo actions.
export type CandidateState = "pending" | "approved" | "rejected" | "expired";

// What kind of source produced this candidate. Determines which fields in
// `metadata` are authoritative and what the dashboard shows.
export type CandidateType =
  | "session_summary"      // from a captured agent session (this module)
  | "connector_document"   // from a connector sync (Google Drive, etc.)
  | "agent_replay"         // from AgentMemory import/replay
  | "manual_entry";        // from explicit "remember this" user action

export interface CaptureInboxCandidate {
  // Stable identifier. Deterministic from idempotencyKey so re-processing
  // the same session never creates two candidates.
  id: string;
  state: CandidateState;
  candidateType: CandidateType;

  // Source attribution — always required so the user knows where this came from.
  sourceId: string;
  sourceProvider: string;  // e.g. "claude_code", "codex", "google_drive"
  sourceRef: string;       // provider-specific session/doc identifier

  // Optional back-reference to the cloud session record.
  sessionId?: string;

  // Human-readable fields shown in the Memory Inbox.
  title: string;
  excerpt: string;

  // Rule-based confidence score (0–1). 0.5 is the default for session
  // summaries; model-enriched candidates may score higher. Shown in the UI
  // so users understand why a session was surfaced.
  confidence: number;

  // Idempotency key from the originating session. Cloud uses this to deduplicate
  // candidates when the daemon re-processes the same session file.
  idempotencyKey: string;

  // ISO-8601 timestamps.
  createdAt: string;
  // Optional: after this time the candidate is considered stale and should not
  // be auto-promoted even if approved.
  expiresAt?: string;

  // Source-specific extended attributes. Kept as unknown so this module does
  // not take a hard dependency on every provider's schema.
  metadata: Record<string, unknown>;
}

export interface SessionToCandidateOptions {
  sourceId: string;
  // Override the default title generation (useful for tests and connectors
  // that have richer metadata than the session itself).
  title?: string;
  // Override the generated excerpt.
  excerpt?: string;
  // TTL in milliseconds before the candidate expires. Defaults to 30 days.
  ttlMs?: number;
  now?: Date;
}

// Convert a v0.8 wire session into an inbox candidate.
// The result is always in state "pending" — the caller must never skip the
// Memory Inbox review step.
export function sessionToCandidate(
  session: CapturedSessionV08,
  options: SessionToCandidateOptions
): CaptureInboxCandidate {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const ttlMs = options.ttlMs ?? 30 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  const id = candidateIdFromKey(session.idempotencyKey);
  const title = options.title ?? defaultTitle(session);
  const excerpt = options.excerpt ?? defaultExcerpt(session);

  return {
    id,
    state: "pending",
    candidateType: "session_summary",
    sourceId: options.sourceId,
    sourceProvider: session.provider,
    sourceRef: session.sourceOriginalId,
    title,
    excerpt,
    confidence: defaultConfidence(session),
    idempotencyKey: session.idempotencyKey,
    createdAt: nowIso,
    expiresAt,
    metadata: {
      vaultId: session.vaultId,
      deviceId: session.deviceId,
      captureMode: session.captureMode,
      turnCount: session.turns.length,
      redaction: session.redaction,
      contentHash: session.contentHash,
      projectHint: session.projectHint ?? null,
      branch: session.branch ?? null,
      startedAt: session.startedAt ?? null,
      endedAt: session.endedAt ?? null
    }
  };
}

// Deterministic candidate id from the session idempotency key. Same session
// always maps to the same candidate id so the cloud can deduplicate on upsert.
export function candidateIdFromKey(idempotencyKey: string): string {
  // Trim the "cap_" prefix if present, keep up to 40 chars for readability.
  const suffix = idempotencyKey.startsWith("cap_")
    ? idempotencyKey.slice(4, 44)
    : idempotencyKey.slice(0, 40);
  return `cand_${suffix}`;
}

// Confidence heuristics for rule-based (non-model) candidates. These are
// intentionally conservative — the model pipeline may raise scores later.
function defaultConfidence(session: CapturedSessionV08): number {
  if (session.captureMode === "private_mode") return 0;
  // Raw sessions with actual assistant turns are more likely to be useful.
  const hasAssistantTurns = session.turns.some((t) => t.role === "assistant");
  if (session.turns.length >= 10 && hasAssistantTurns) return 0.65;
  if (session.turns.length >= 4 && hasAssistantTurns) return 0.55;
  return 0.5;
}

function defaultTitle(session: CapturedSessionV08): string {
  const providerLabel = providerDisplay(session.provider);
  if (session.projectHint) {
    return `${providerLabel} session — ${session.projectHint}`;
  }
  if (session.startedAt) {
    const date = session.startedAt.slice(0, 10);
    return `${providerLabel} session on ${date}`;
  }
  return `${providerLabel} session`;
}

function defaultExcerpt(session: CapturedSessionV08): string {
  if (session.captureMode === "private_mode") {
    return "[private session — content suppressed]";
  }
  // Find the first meaningful assistant turn for the excerpt.
  const first = session.turns.find(
    (t) => t.role === "assistant" && t.text && t.text.trim().length > 10
  );
  if (first?.text) {
    return first.text.replace(/\s+/g, " ").trim().slice(0, 300);
  }
  return `${session.turns.length} turn${session.turns.length === 1 ? "" : "s"} captured`;
}

function providerDisplay(provider: string): string {
  switch (provider) {
    case "claude_code": return "Claude Code";
    case "codex": return "Codex";
    case "cursor": return "Cursor";
    case "opencode": return "OpenCode";
    default: return provider;
  }
}

// rc.2 Lane D — "capture happened but no useful memory found" UX state.
//
// Without this, a user who connects an agent and sees no candidate cannot
// tell whether capture is broken or whether the session simply wasn't worth
// remembering. This helper produces a deterministic, plain-language record
// the dashboard can render in place of an inbox candidate.
//
// Reasons (plan §Lane 3):
//   short_session       - too few turns to extract a fact
//   private_mode        - private mode was active; nothing left the device
//   redacted_content    - all content was redacted (e.g. only secrets)
//   duplicate           - identical content was already captured / approved
//   provider_filtered   - extractor decided the session was not useful
//                          (e.g. only tool noise, or model produced no text)

export type NoMemoryReason =
  | "short_session"
  | "private_mode"
  | "redacted_content"
  | "duplicate"
  | "provider_filtered";

export interface NoMemoryCaptureRecord {
  kind: "no_memory_found";
  sourceId: string;
  sourceProvider: string;
  sourceRef: string;
  idempotencyKey: string;
  reason: NoMemoryReason;
  message: string;
  capturedAt: string;
  // Empty Memory Inbox panels show this so a user knows capture is alive.
  // The dashboard treats this as a successful no-op, not an error.
  metadata: Record<string, unknown>;
}

export interface ExplainNoMemoryOptions {
  sourceId: string;
  reason: NoMemoryReason;
  // Override the plain-language message; useful for connector-specific copy.
  message?: string;
  now?: Date;
  metadata?: Record<string, unknown>;
}

export function explainNoMemoryFound(
  session: CapturedSessionV08,
  options: ExplainNoMemoryOptions
): NoMemoryCaptureRecord {
  const now = options.now ?? new Date();
  return {
    kind: "no_memory_found",
    sourceId: options.sourceId,
    sourceProvider: session.provider,
    sourceRef: session.sourceOriginalId,
    idempotencyKey: session.idempotencyKey,
    reason: options.reason,
    message: options.message ?? defaultNoMemoryMessage(options.reason),
    capturedAt: now.toISOString(),
    metadata: {
      vaultId: session.vaultId,
      deviceId: session.deviceId,
      captureMode: session.captureMode,
      turnCount: session.turns.length,
      ...(options.metadata ?? {})
    }
  };
}

function defaultNoMemoryMessage(reason: NoMemoryReason): string {
  switch (reason) {
    case "short_session":
      return "Capture succeeded but the session was too short to remember.";
    case "private_mode":
      return "Capture skipped: this source is in private mode. No content left your device.";
    case "redacted_content":
      return "Capture succeeded but all content was redacted. Nothing was suggested for memory.";
    case "duplicate":
      return "Capture succeeded but matched an existing memory. No new candidate was created.";
    case "provider_filtered":
      return "Capture succeeded but the extractor did not find anything worth remembering.";
  }
}

// Narrow type-guard for the no-memory-found record.
export function isNoMemoryCaptureRecord(value: unknown): value is NoMemoryCaptureRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    v.kind === "no_memory_found" &&
    typeof v.sourceId === "string" &&
    typeof v.sourceProvider === "string" &&
    typeof v.sourceRef === "string" &&
    typeof v.reason === "string" &&
    typeof v.message === "string"
  );
}

// Heuristic chooser: given a session that has been parsed but did not yield
// a useful candidate, pick the most informative no-memory reason. The caller
// remains free to override; this is just the default the watcher applies.
export function inferNoMemoryReason(session: CapturedSessionV08): NoMemoryReason {
  if (session.captureMode === "private_mode") return "private_mode";
  if (session.turns.length === 0) {
    if (session.redaction.privateBlockCount > 0 || session.redaction.secretCount > 0) {
      return "redacted_content";
    }
    return "short_session";
  }
  if (session.turns.length < 2) return "short_session";
  return "provider_filtered";
}

// Narrow type-guard: checks that an unknown value looks like a
// CaptureInboxCandidate at the required fields.
export function isCaptureInboxCandidate(value: unknown): value is CaptureInboxCandidate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.state === "string" &&
    typeof v.candidateType === "string" &&
    typeof v.sourceId === "string" &&
    typeof v.sourceProvider === "string" &&
    typeof v.idempotencyKey === "string"
  );
}
