import type { CaptureEventEnvelope, CaptureSession } from "./types.js";

// Build the wire payload that the local bridge sends to
// `POST /v1/capture/sessions`. By default we ship summary-only metadata; raw
// turns are only included when the caller has explicitly opted into raw
// archive (vault setting must also approve server-side, per PRD §7.2).

export interface BuildEnvelopeOptions {
  vaultId?: string;
  deviceId?: string;
  rawArchive?: boolean;
  capturedAt?: string;
}

export function buildEnvelope(session: CaptureSession, options: BuildEnvelopeOptions = {}): CaptureEventEnvelope {
  const summary = summarizeSession(session);
  const envelope: CaptureEventEnvelope = {
    schemaVersion: "1",
    vaultId: options.vaultId,
    deviceId: options.deviceId,
    agentType: session.provider,
    capturedAt: options.capturedAt ?? new Date().toISOString(),
    sourceRef: session.source,
    captureMode: options.rawArchive ? "raw_archive" : "summary_only",
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    idempotencyKey: session.idempotencyKey,
    summary,
    turnCount: session.turns.length,
    redactionStats: session.redactionStats
  };

  if (options.rawArchive) {
    envelope.rawTurns = session.turns;
  }

  return envelope;
}

export function summarizeSession(session: CaptureSession, charBudget = 1200): string {
  // Local summary is intentionally extractive and dumb — actual fact extraction
  // happens in the cloud worker. The goal here is to give the cloud queue
  // enough context to schedule and to give `lore status` a readable preview.
  const lines: string[] = [];
  for (const turn of session.turns) {
    if (turn.private) continue;
    if (!turn.text) continue;
    const role = turn.role.toUpperCase();
    const trimmed = turn.text.replace(/\s+/g, " ").trim();
    if (!trimmed) continue;
    lines.push(`${role}: ${trimmed}`);
  }
  const joined = lines.join("\n");
  if (joined.length <= charBudget) return joined;
  return `${joined.slice(0, charBudget - 1).trimEnd()}…`;
}
