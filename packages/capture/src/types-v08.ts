// V0.8 wire schema for capture sessions.
//
// PRD §8.5 defines `CapturedSessionV08` as the canonical session payload that
// the daemon uploads to `POST /v1/capture/sessions`. Compared to the v0.7
// envelope this schema:
//
// - uses snake-case provider names (`claude_code` rather than `claude-code`)
//   so it matches the cloud DB enum;
// - includes `vaultId`/`deviceId`/`sourceId` so the cloud can attribute the
//   session without inferring identity from the bearer token alone;
// - flattens redaction stats into a versioned `redaction` object so future
//   pattern updates are visible;
// - keeps raw turns inline; the cloud is still required to enforce
//   `raw_archive` policy, so this client-side schema does not gate on it.
//
// Helpers convert from the existing v0.7 `CaptureSession` to this shape.

import type { CaptureSession, CaptureProvider, CaptureTurn } from "./types.js";

export type CaptureProviderV08 = "claude_code" | "codex" | "cursor" | "opencode";

export interface CapturedSessionTurnV08 {
  role: "user" | "assistant" | "tool" | "system";
  text: string;
  toolName?: string;
  sourceRef?: string;
  timestamp?: string;
}

export interface CapturedSessionRedactionMeta {
  version: string;
  secretCount: number;
  privateBlockCount: number;
}

export interface CapturedSessionV08 {
  provider: CaptureProviderV08;
  sourceOriginalId: string;
  vaultId: string;
  deviceId: string;
  sourceId: string;
  projectHint?: string;
  repoFingerprint?: string;
  branch?: string;
  startedAt?: string;
  endedAt?: string;
  contentHash: string;
  idempotencyKey: string;
  captureMode: "summary_only" | "raw_archive" | "private_mode";
  redaction: CapturedSessionRedactionMeta;
  turns: CapturedSessionTurnV08[];
  metadata: Record<string, unknown>;
}

export interface ToWireOptions {
  vaultId: string;
  deviceId: string;
  sourceId: string;
  rawArchive?: boolean;
  privateMode?: boolean;
  projectHint?: string;
  repoFingerprint?: string;
  branch?: string;
  redactionVersion?: string;
  metadata?: Record<string, unknown>;
}

export const CAPTURE_REDACTION_VERSION = "v08.1";

export function providerToWire(p: CaptureProvider): CaptureProviderV08 {
  switch (p) {
    case "claude-code":
      return "claude_code";
    case "codex":
      return "codex";
    case "cursor":
      return "cursor";
    case "opencode":
      return "opencode";
  }
}

export function providerFromWire(p: CaptureProviderV08): CaptureProvider {
  switch (p) {
    case "claude_code":
      return "claude-code";
    case "codex":
      return "codex";
    case "cursor":
      return "cursor";
    case "opencode":
      return "opencode";
  }
}

export function toWireSession(session: CaptureSession, options: ToWireOptions): CapturedSessionV08 {
  const captureMode: CapturedSessionV08["captureMode"] = options.privateMode
    ? "private_mode"
    : options.rawArchive
      ? "raw_archive"
      : "summary_only";

  // Private mode: do not ship turn bodies to the cloud — only structural
  // metadata so the operator can confirm the session was discarded.
  const turns: CapturedSessionTurnV08[] = captureMode === "private_mode" ? [] : session.turns
    .filter((t) => !t.private)
    .map(toWireTurn);

  return {
    provider: providerToWire(session.provider),
    sourceOriginalId: session.source.originalId,
    vaultId: options.vaultId,
    deviceId: options.deviceId,
    sourceId: options.sourceId,
    projectHint: options.projectHint,
    repoFingerprint: options.repoFingerprint,
    branch: options.branch,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    contentHash: extractContentHash(session.idempotencyKey),
    idempotencyKey: session.idempotencyKey,
    captureMode,
    redaction: {
      version: options.redactionVersion ?? CAPTURE_REDACTION_VERSION,
      secretCount: session.redactionStats.secretsRemoved,
      privateBlockCount: session.redactionStats.privateBlocksStripped
    },
    turns,
    metadata: {
      ...(options.metadata ?? {}),
      cwd: session.source.cwd,
      sourcePath: session.source.path,
      extractorVersion: session.metadata.extractorVersion
    }
  };
}

function toWireTurn(t: CaptureTurn): CapturedSessionTurnV08 {
  const out: CapturedSessionTurnV08 = {
    role: normalizeRole(t.role),
    text: t.text,
    timestamp: t.startedAt
  };
  if (t.toolCalls && t.toolCalls.length > 0) {
    out.toolName = t.toolCalls[0]?.name;
  }
  return out;
}

function normalizeRole(role: CaptureTurn["role"]): CapturedSessionTurnV08["role"] {
  if (role === "user" || role === "assistant" || role === "tool" || role === "system") {
    return role;
  }
  return "user";
}

// `idempotencyKey` is `cap_<provider>_<sessionPrefix>_<contentPrefix>` per
// `idempotency.ts`. The trailing 16 hex chars are the content hash prefix.
function extractContentHash(idempotencyKey: string): string {
  const parts = idempotencyKey.split("_");
  return parts[parts.length - 1] ?? idempotencyKey;
}
