#!/usr/bin/env node
// v09-verify-watcher: temp-HOME smoke for the v0.9 universal session watcher.
//
// What it does:
//   1. Mints a temp HOME so the user's real ~/.claude / ~/.codex are not touched.
//   2. Plants one Claude Code JSONL transcript and one Codex JSONL transcript.
//   3. Runs the watcher tick with a stub LoreClient (no network).
//   4. Verifies: 4 providers heartbeat, 2 parseable uploads, idempotent re-run,
//      counters surface for `lore status` consumption.
//
// Exits 0 on success; non-zero with a one-line reason on failure.
//
// Build prerequisite: the CLI must be built so dist/ is current.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cliDist = await import(new URL("../apps/cli/dist/index.js", import.meta.url)).catch((err) => {
  console.error("ERROR: @lore/cli dist not built. Run `pnpm --filter @lore/cli build` first.");
  console.error(String(err?.message ?? err));
  process.exit(2);
});

const root = mkdtempSync(join(tmpdir(), "lore-v09-smoke-"));
const home = join(root, "home");
mkdirSync(home, { recursive: true });
const claudeRoot = join(home, ".claude", "projects", "smoke");
mkdirSync(claudeRoot, { recursive: true });
const codexRoot = join(home, ".codex", "sessions");
mkdirSync(codexRoot, { recursive: true });

writeFileSync(
  join(claudeRoot, "smoke-1.jsonl"),
  [
    JSON.stringify({ type: "user", sessionId: "smoke-1", timestamp: "2026-05-01T08:00:00.000Z", message: { role: "user", content: [{ type: "text", text: "what's our deploy command?" }] } }),
    JSON.stringify({ type: "assistant", sessionId: "smoke-1", timestamp: "2026-05-01T08:00:01.000Z", message: { role: "assistant", content: [{ type: "text", text: "pnpm build && pnpm deploy" }] } })
  ].join("\n") + "\n",
  "utf8"
);

writeFileSync(
  join(codexRoot, "smoke-2.jsonl"),
  [
    JSON.stringify({ role: "user", text: "and the test command?", timestamp: "2026-05-01T08:01:00.000Z" }),
    JSON.stringify({ role: "assistant", text: "pnpm test", timestamp: "2026-05-01T08:01:02.000Z" })
  ].join("\n") + "\n",
  "utf8"
);

const heartbeats = [];
const ingests = [];
const client = {
  async getSourcePolicy() { return undefined; },
  async heartbeat(input) { heartbeats.push(input); },
  async ingestSession(input) {
    ingests.push(input);
    return { sessionId: `sess_${ingests.length}`, jobId: `job_${ingests.length}`, duplicate: false };
  }
};

const opts = {
  runtime: { homeDir: home, now: () => new Date("2026-05-01T08:05:00.000Z") },
  client,
  vaultId: "vault_smoke",
  deviceId: "dev_smoke",
  scanOverrides: {
    claudeCodeRoot: join(home, ".claude", "projects"),
    codexRoots: [codexRoot],
    cursorRoots: [join(home, ".cursor", "agent-sessions")],
    qwenRoots: [join(home, ".opencode", "sessions")]
  }
};

const expectations = [];
function expect(name, ok, detail = "") {
  expectations.push({ name, ok, detail });
  if (!ok) console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  else console.log(`OK    ${name}`);
}

try {
  const first = await cliDist.runWatchTick(opts);
  expect("first tick uploads 2 sessions", first.uploads.length === 2, JSON.stringify(first.uploads.map((u) => u.sourcePath)));
  expect("first tick fails 0 sessions", first.failures.length === 0);
  expect("4 providers heartbeat", heartbeats.length === 4);
  expect("watcher counters reflect upload", first.counters.uploadedToday === 2 && first.counters.lastUploadAt !== null);

  const ingestsAfterFirst = ingests.length;
  const second = await cliDist.runWatchTick(opts);
  expect("second tick uploads 0 (idempotent)", second.uploads.length === 0);
  expect("second tick does not re-call ingestSession", ingests.length === ingestsAfterFirst);
  expect("counters do not double-count today", second.counters.uploadedToday === 2);

  const status = cliDist.readWatcherStatus({ homeDir: home, now: () => new Date("2026-05-01T08:05:00.000Z") });
  expect("status shows tracked checkpoints for claude-code", status.checkpointSummary["claude-code"].tracked === 1);
  expect("status shows tracked checkpoints for codex", status.checkpointSummary.codex.tracked === 1);

  const failed = expectations.filter((e) => !e.ok);
  if (failed.length > 0) {
    console.error(`SMOKE FAIL: ${failed.length} of ${expectations.length} expectations failed`);
    process.exit(1);
  }
  console.log(`SMOKE OK: ${expectations.length} expectations passed`);
  process.exit(0);
} finally {
  rmSync(root, { recursive: true, force: true });
}
