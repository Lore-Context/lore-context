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

// Claude Code stores transcripts as JSONL at:
//   ~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl
// Lines are tolerant: format has shifted across versions, so the parser
// accepts unknown fields, missing fields, and malformed lines (with warnings).

const PROVIDER: CaptureProvider = "claude-code";

interface ClaudeCodeRawLine {
  type?: string;
  uuid?: string;
  parentUuid?: string | null;
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  message?: {
    role?: "user" | "assistant" | "system";
    content?: unknown;
  };
  toolUseResult?: unknown;
}

export interface ClaudeCodeParseInput {
  // Absolute path to the JSONL file (used as fallback identity / metadata).
  filePath: string;
  // File content as a single string. Caller is responsible for IO.
  content: string;
  // Override the session id when the file does not embed one.
  sessionIdHint?: string;
}

export function parseClaudeCodeJsonl(input: ClaudeCodeParseInput): ParseResult {
  const warnings: string[] = [];
  const lines = input.content.split(/\r?\n/);
  const turns: CaptureTurn[] = [];

  let sessionId: string | undefined = input.sessionIdHint;
  let cwd: string | undefined;
  let firstTimestamp: string | undefined;
  let lastTimestamp: string | undefined;
  let turnIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || raw.trim() === "") continue;

    let parsed: ClaudeCodeRawLine;
    try {
      parsed = JSON.parse(raw) as ClaudeCodeRawLine;
    } catch {
      warnings.push(`line ${i + 1}: malformed JSON, skipped`);
      continue;
    }

    if (parsed.sessionId && !sessionId) sessionId = parsed.sessionId;
    if (parsed.cwd && !cwd) cwd = parsed.cwd;
    if (parsed.timestamp) {
      if (!firstTimestamp) firstTimestamp = parsed.timestamp;
      lastTimestamp = parsed.timestamp;
    }

    const role = (parsed.message?.role ?? parsed.type) as CaptureTurn["role"] | undefined;
    if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") {
      // unknown line type (summary/meta/etc.) — silently skip.
      continue;
    }

    const { text, toolCalls } = extractMessageContent(parsed);
    if (!text && (!toolCalls || toolCalls.length === 0)) {
      // Empty turn — not interesting for capture.
      continue;
    }

    turns.push({
      index: turnIndex++,
      role,
      text,
      toolCalls,
      startedAt: parsed.timestamp,
      endedAt: parsed.timestamp
    });
  }

  // Fallback session id derived from filename if neither hint nor JSONL had one.
  if (!sessionId) {
    sessionId = path.basename(input.filePath).replace(/\.jsonl$/i, "");
  }

  const startedAt = firstTimestamp ?? new Date(0).toISOString();
  const endedAt = lastTimestamp ?? startedAt;

  const { turns: redactedTurns, stats } = redactTurns(turns);

  const session: CaptureSession = {
    id: canonicalSessionId(PROVIDER, sessionId),
    provider: PROVIDER,
    source: {
      provider: PROVIDER,
      originalId: sessionId,
      path: input.filePath,
      cwd
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

export async function parseClaudeCodeJsonlFile(filePath: string, sessionIdHint?: string): Promise<ParseResult> {
  const content = await readFile(filePath, "utf-8");
  return parseClaudeCodeJsonl({ filePath, content, sessionIdHint });
}

function extractMessageContent(line: ClaudeCodeRawLine): {
  text: string;
  toolCalls?: CaptureToolCall[];
} {
  const content = line.message?.content;
  if (typeof content === "string") {
    return { text: content };
  }

  if (!Array.isArray(content)) {
    // Older format may have used a string or omitted content.
    return { text: "" };
  }

  const textParts: string[] = [];
  const toolCalls: CaptureToolCall[] = [];

  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const partAny = part as Record<string, unknown>;
    const partType = partAny.type;

    if (partType === "text" && typeof partAny.text === "string") {
      textParts.push(partAny.text);
    } else if (partType === "tool_use") {
      toolCalls.push({
        name: typeof partAny.name === "string" ? partAny.name : "tool",
        input: partAny.input,
        status: "ok"
      });
    } else if (partType === "tool_result") {
      const isError = partAny.is_error === true;
      const output = partAny.content;
      toolCalls.push({
        name: typeof partAny.tool_use_id === "string" ? `result:${partAny.tool_use_id}` : "tool_result",
        output,
        status: isError ? "error" : "ok"
      });
    }
  }

  return { text: textParts.join("\n").trim(), toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}
