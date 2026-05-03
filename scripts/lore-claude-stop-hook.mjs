#!/usr/bin/env node
// lore-claude-stop-hook: productized version of the m7 Stop hook prototype.
//
// Wire-up (later, in `lore connect`): adds the following to the user's Claude
// Code settings hooks list, with a backup of the prior config:
//
//   {
//     "hooks": {
//       "Stop": [{ "hooks": [{ "type": "command",
//         "command": "node /abs/path/to/scripts/lore-claude-stop-hook.mjs",
//         "timeout": 5
//       }] }]
//     }
//   }
//
// Contract:
//   - Reads JSON from stdin (Claude Code hook contract).
//   - Writes one JSONL marker line to ~/.lore/queue.jsonl.
//   - Always exits 0, even on failure, so a Stop hook NEVER blocks the user.
//   - Never echoes secrets, transcripts, or hook input to stdout/stderr.

import os from "node:os";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const QUEUE_PATH = path.join(os.homedir(), ".lore", "queue.jsonl");

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

function fingerprintCwd(cwd) {
  return createHash("sha256").update(cwd).digest("hex").slice(0, 16);
}

try {
  const raw = await readStdin();
  let input = {};
  if (raw && raw.trim().length > 0) {
    try {
      input = JSON.parse(raw);
    } catch {
      input = {};
    }
  }

  const marker = {
    schemaVersion: "1",
    agent: "claude-code",
    event: "stop",
    sessionId: typeof input.session_id === "string" ? input.session_id : "unknown",
    transcriptPath: typeof input.transcript_path === "string" ? input.transcript_path : undefined,
    cwd: typeof input.cwd === "string" ? input.cwd : undefined,
    cwdFingerprint: typeof input.cwd === "string" ? fingerprintCwd(input.cwd) : undefined,
    recordedAt: new Date().toISOString()
  };

  await mkdir(path.dirname(QUEUE_PATH), { recursive: true });
  await appendFile(QUEUE_PATH, `${JSON.stringify(marker)}\n`, "utf-8");
} catch {
  // Hook MUST be non-blocking. Never throw, never print, never exit non-zero.
}

process.exit(0);
