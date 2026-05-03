import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

// Productized version of the m7 Stop hook prototype.
//
// Goals:
//   - non-blocking: never refuses or delays Claude Code stop;
//   - no secrets: only metadata + optional path hint to the JSONL file;
//   - append-only: marker file lives under `.lore/queue.jsonl` so the local
//     bridge can read pending markers and trigger an explicit capture run.
//
// Hook input contract (Claude Code Stop hook stdin JSON):
//   {
//     "session_id": "abcd",
//     "transcript_path": "/Users/.../some.jsonl",
//     "cwd": "/path/to/project",
//     "hook_event_name": "Stop",
//     "stop_hook_active": true|false
//   }
//
// We accept partial inputs to be safe across Claude Code versions.

export interface StopHookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  stop_hook_active?: boolean;
}

export interface StopHookMarker {
  schemaVersion: "1";
  agent: "claude-code";
  event: "stop";
  sessionId: string;
  transcriptPath?: string;
  cwd?: string;
  cwdFingerprint?: string;
  recordedAt: string;
}

export function buildMarker(input: StopHookInput, now: Date = new Date()): StopHookMarker {
  const sessionId = input.session_id ?? "unknown";
  return {
    schemaVersion: "1",
    agent: "claude-code",
    event: "stop",
    sessionId,
    transcriptPath: input.transcript_path,
    cwd: input.cwd,
    cwdFingerprint: input.cwd ? fingerprintCwd(input.cwd) : undefined,
    recordedAt: now.toISOString()
  };
}

export async function appendMarker(queuePath: string, marker: StopHookMarker): Promise<void> {
  await mkdir(path.dirname(queuePath), { recursive: true });
  await appendFile(queuePath, `${JSON.stringify(marker)}\n`, "utf-8");
}

export function defaultQueuePath(homeDir: string): string {
  return path.join(homeDir, ".lore", "queue.jsonl");
}

// Stable, non-reversible fingerprint so the dashboard can group sessions by
// project without uploading the absolute path.
export function fingerprintCwd(cwd: string): string {
  return createHash("sha256").update(cwd).digest("hex").slice(0, 16);
}
