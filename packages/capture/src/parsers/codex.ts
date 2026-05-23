import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildIdempotencyKey, canonicalSessionId } from "../idempotency.js";
import { redactTurns } from "../redaction.js";
import {
  CAPTURE_EXTRACTOR_VERSION,
  type CaptureProvider,
  type CaptureSession,
  type CaptureTurn,
  type CaptureToolCall,
  type ParseResult
} from "../types.js";

// Codex session storage format is unstable across CLI versions. Public
// references show two shapes:
//   1. JSON file with `{ id, items: [{ role, content }, ...] }`
//   2. JSONL with one event per line, similar to Claude Code
// We accept both. When in doubt, treat the file as JSONL first, then fall
// back to a single JSON object.

const PROVIDER: CaptureProvider = "codex";

interface CodexEnvelope {
  id?: string;
  session_id?: string;
  sessionId?: string;
  cwd?: string;
  started_at?: string;
  ended_at?: string;
  items?: CodexItem[];
  events?: CodexItem[];
}

interface CodexItem {
  type?: string;
  role?: "user" | "assistant" | "system" | "tool";
  content?: unknown;
  text?: string;
  timestamp?: string;
  tool?: string;
  tool_call?: { name?: string; arguments?: unknown };
  tool_result?: { output?: unknown; is_error?: boolean };
}

export interface CodexParseInput {
  filePath: string;
  content: string;
  sessionIdHint?: string;
}

export function parseCodexSession(input: CodexParseInput): ParseResult {
  const warnings: string[] = [];
  const trimmed = input.content.trim();

  let envelope: CodexEnvelope | undefined;
  let lineItems: CodexItem[] | undefined;

  // Attempt 1: parse the entire content as a single JSON object/envelope.
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as CodexEnvelope;
      if (parsed && typeof parsed === "object" && (Array.isArray(parsed.items) || Array.isArray(parsed.events))) {
        envelope = parsed;
      }
    } catch {
      // fall through to JSONL.
    }
  }

  // Attempt 2: parse line-by-line as JSONL.
  if (!envelope) {
    lineItems = [];
    const lines = input.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw || raw.trim() === "") continue;
      try {
        const parsed = JSON.parse(raw) as CodexItem | CodexEnvelope;
        if (Array.isArray((parsed as CodexEnvelope).items)) {
          envelope = parsed as CodexEnvelope;
          break;
        }
        lineItems.push(parsed as CodexItem);
      } catch {
        warnings.push(`line ${i + 1}: malformed JSON, skipped`);
      }
    }
  }

  const items = envelope?.items ?? envelope?.events ?? lineItems ?? [];
  const sessionId =
    input.sessionIdHint ??
    envelope?.id ??
    envelope?.session_id ??
    envelope?.sessionId ??
    path.basename(input.filePath).replace(/\.(jsonl|json)$/i, "");

  const turns: CaptureTurn[] = [];
  // Envelope timestamps win when present so we do not clobber them with the
  // last item's timestamp.
  const envelopeStarted = envelope?.started_at;
  const envelopeEnded = envelope?.ended_at;
  let firstItemTs: string | undefined;
  let lastItemTs: string | undefined;
  let turnIndex = 0;

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    if (item.timestamp) {
      if (!firstItemTs) firstItemTs = item.timestamp;
      lastItemTs = item.timestamp;
    }

    const role = normalizeRole(item.role ?? item.type);
    if (!role) continue;

    const { text, toolCalls } = extractCodexContent(item);
    if (!text && (!toolCalls || toolCalls.length === 0)) continue;

    turns.push({
      index: turnIndex++,
      role,
      text,
      toolCalls,
      startedAt: item.timestamp,
      endedAt: item.timestamp
    });
  }

  const startedAt = envelopeStarted ?? firstItemTs ?? new Date(0).toISOString();
  const endedAt = envelopeEnded ?? lastItemTs ?? startedAt;

  const { turns: redactedTurns, stats } = redactTurns(turns);

  const session: CaptureSession = {
    id: canonicalSessionId(PROVIDER, sessionId),
    provider: PROVIDER,
    source: {
      provider: PROVIDER,
      originalId: sessionId,
      path: input.filePath,
      cwd: envelope?.cwd
    },
    startedAt,
    endedAt,
    turns: redactedTurns,
    idempotencyKey: buildIdempotencyKey(PROVIDER, sessionId, redactedTurns),
    redactionStats: stats,
    metadata: {
      captureMode: "summary_only",
      extractorVersion: CAPTURE_EXTRACTOR_VERSION,
      rawArchiveLocal: false
    }
  };

  return { session, warnings };
}

export async function parseCodexSessionFile(filePath: string, sessionIdHint?: string): Promise<ParseResult> {
  const content = await readFile(filePath, "utf-8");
  return parseCodexSession({ filePath, content, sessionIdHint });
}

function normalizeRole(value: string | undefined): CaptureTurn["role"] | null {
  if (!value) return null;
  if (value === "user" || value === "assistant" || value === "system" || value === "tool") return value;
  if (value === "function_call" || value === "tool_call") return "tool";
  return null;
}

function extractCodexContent(item: CodexItem): {
  text: string;
  toolCalls?: CaptureToolCall[];
} {
  const toolCalls: CaptureToolCall[] = [];

  if (item.tool_call?.name) {
    toolCalls.push({ name: item.tool_call.name, input: item.tool_call.arguments, status: "ok" });
  }
  if (item.tool_result) {
    toolCalls.push({
      name: item.tool ?? "tool_result",
      output: item.tool_result.output,
      status: item.tool_result.is_error ? "error" : "ok"
    });
  }

  if (typeof item.text === "string") {
    return { text: item.text, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }

  const content = item.content;
  if (typeof content === "string") {
    return { text: content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }

  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (typeof part === "string") parts.push(part);
      else if (part && typeof part === "object") {
        const partAny = part as Record<string, unknown>;
        if (typeof partAny.text === "string") parts.push(partAny.text);
        else if (partAny.type === "tool_use" && typeof partAny.name === "string") {
          toolCalls.push({ name: partAny.name, input: partAny.input, status: "ok" });
        }
      }
    }
    return { text: parts.join("\n").trim(), toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }

  return { text: "", toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}
