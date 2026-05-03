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

// Cursor's on-disk Composer/Agent session format is not a stable contract.
// Across recent versions we have observed three common shapes; this parser is
// tolerant of all of them and accepts unknown fields:
//   1. Single JSON object: `{ id, messages: [{ role, content }, ...] }`
//      where `content` may be a string, an array of `{ type, text }` parts,
//      or include `tool_calls` / `tool_use` entries.
//   2. JSONL with one event per line, similar to Claude Code transcripts.
//   3. Workspace SQLite snapshots are NOT handled here — the watcher reads
//      JSON/JSONL only. SQLite extraction is left to a future opt-in path.
//
// rc.2 Lane D scope: enable Cursor to count as the second auto-capture client
// (alongside Claude Code) so the rc.2 acceptance criterion in §Lane 3 passes
// without depending on a Codex install.

const PROVIDER: CaptureProvider = "cursor";

interface CursorEnvelope {
  id?: string;
  sessionId?: string;
  session_id?: string;
  composerId?: string;
  workspaceId?: string;
  cwd?: string;
  workspacePath?: string;
  startedAt?: string;
  started_at?: string;
  endedAt?: string;
  ended_at?: string;
  messages?: CursorMessage[];
  events?: CursorMessage[];
  conversation?: CursorMessage[];
}

interface CursorMessage {
  type?: string;
  role?: "user" | "assistant" | "system" | "tool";
  text?: string;
  content?: unknown;
  timestamp?: string;
  createdAt?: string;
  // Cursor's tool call shape — both `toolCalls` (camelCase) and
  // `tool_calls` (snake_case) appear depending on the build.
  toolCalls?: CursorToolCall[];
  tool_calls?: CursorToolCall[];
  toolName?: string;
  toolUse?: { name?: string; input?: unknown };
  toolResult?: { output?: unknown; isError?: boolean };
}

interface CursorToolCall {
  name?: string;
  toolName?: string;
  input?: unknown;
  arguments?: unknown;
  output?: unknown;
  result?: unknown;
  isError?: boolean;
  is_error?: boolean;
}

export interface CursorParseInput {
  filePath: string;
  content: string;
  sessionIdHint?: string;
}

export function parseCursorSession(input: CursorParseInput): ParseResult {
  const warnings: string[] = [];
  const trimmed = input.content.trim();

  let envelope: CursorEnvelope | undefined;
  let lineMessages: CursorMessage[] | undefined;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as CursorEnvelope;
      if (parsed && typeof parsed === "object" && messageArray(parsed)) {
        envelope = parsed;
      }
    } catch {
      // fall through to JSONL
    }
  }

  if (!envelope) {
    lineMessages = [];
    const lines = input.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw || raw.trim() === "") continue;
      try {
        const parsed = JSON.parse(raw) as CursorMessage | CursorEnvelope;
        if (messageArray(parsed as CursorEnvelope)) {
          envelope = parsed as CursorEnvelope;
          break;
        }
        lineMessages.push(parsed as CursorMessage);
      } catch {
        warnings.push(`line ${i + 1}: malformed JSON, skipped`);
      }
    }
  }

  const messages = messageArray(envelope) ?? lineMessages ?? [];

  const sessionId =
    input.sessionIdHint ??
    envelope?.id ??
    envelope?.sessionId ??
    envelope?.session_id ??
    envelope?.composerId ??
    path.basename(input.filePath).replace(/\.(jsonl|json)$/i, "");

  const turns: CaptureTurn[] = [];
  const envelopeStarted = envelope?.startedAt ?? envelope?.started_at;
  const envelopeEnded = envelope?.endedAt ?? envelope?.ended_at;
  let firstItemTs: string | undefined;
  let lastItemTs: string | undefined;
  let turnIndex = 0;

  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const ts = message.timestamp ?? message.createdAt;
    if (ts) {
      if (!firstItemTs) firstItemTs = ts;
      lastItemTs = ts;
    }

    const role = normalizeRole(message.role ?? message.type);
    if (!role) continue;

    const { text, toolCalls } = extractCursorContent(message);
    if (!text && (!toolCalls || toolCalls.length === 0)) continue;

    turns.push({
      index: turnIndex++,
      role,
      text,
      toolCalls,
      startedAt: ts,
      endedAt: ts
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
      cwd: envelope?.cwd ?? envelope?.workspacePath
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

export async function parseCursorSessionFile(
  filePath: string,
  sessionIdHint?: string
): Promise<ParseResult> {
  const content = await readFile(filePath, "utf-8");
  return parseCursorSession({ filePath, content, sessionIdHint });
}

function messageArray(env: CursorEnvelope | undefined): CursorMessage[] | undefined {
  if (!env) return undefined;
  if (Array.isArray(env.messages)) return env.messages;
  if (Array.isArray(env.events)) return env.events;
  if (Array.isArray(env.conversation)) return env.conversation;
  return undefined;
}

function normalizeRole(value: string | undefined): CaptureTurn["role"] | null {
  if (!value) return null;
  if (value === "user" || value === "assistant" || value === "system" || value === "tool") {
    return value;
  }
  if (value === "tool_call" || value === "tool_use" || value === "function_call") return "tool";
  if (value === "tool_result") return "tool";
  return null;
}

function extractCursorContent(message: CursorMessage): {
  text: string;
  toolCalls?: CaptureToolCall[];
} {
  const toolCalls: CaptureToolCall[] = [];

  const calls = message.toolCalls ?? message.tool_calls;
  if (Array.isArray(calls)) {
    for (const call of calls) {
      const name = call.toolName ?? call.name ?? "tool";
      toolCalls.push({
        name,
        input: call.input ?? call.arguments,
        output: call.output ?? call.result,
        status: call.isError || call.is_error ? "error" : "ok"
      });
    }
  }

  if (message.toolUse) {
    toolCalls.push({
      name: message.toolUse.name ?? message.toolName ?? "tool",
      input: message.toolUse.input,
      status: "ok"
    });
  }
  if (message.toolResult) {
    toolCalls.push({
      name: message.toolName ?? "tool_result",
      output: message.toolResult.output,
      status: message.toolResult.isError ? "error" : "ok"
    });
  }

  if (typeof message.text === "string" && message.text.length > 0) {
    return { text: message.text, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }

  const content = message.content;
  if (typeof content === "string") {
    return { text: content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }

  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (typeof part === "string") {
        parts.push(part);
        continue;
      }
      if (!part || typeof part !== "object") continue;
      const partAny = part as Record<string, unknown>;
      if (typeof partAny.text === "string") {
        parts.push(partAny.text);
        continue;
      }
      if (partAny.type === "tool_use" && typeof partAny.name === "string") {
        toolCalls.push({ name: partAny.name, input: partAny.input, status: "ok" });
      } else if (partAny.type === "tool_result") {
        toolCalls.push({
          name: typeof partAny.tool_use_id === "string" ? `result:${partAny.tool_use_id}` : "tool_result",
          output: partAny.content,
          status: partAny.is_error === true ? "error" : "ok"
        });
      }
    }
    return { text: parts.join("\n").trim(), toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }

  return { text: "", toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}
