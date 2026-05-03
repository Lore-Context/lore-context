import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadWatcherCounters,
  loadCheckpoints,
  readWatcherStatus,
  runWatchTick,
  type IngestSessionInput,
  type IngestSessionResult,
  type LoreClient,
  type WatcherSourcePolicy
} from "../src/index.js";

// v0.9 Lane B — temp-HOME smoke for the universal session watcher.
// These tests must NOT touch the user's real ~/.claude or ~/.codex.
// Each `withTempRuntime` block creates an isolated $HOME, plants fixture
// JSONL transcripts, and runs the watcher tick against a mock LoreClient.

const FRESH_DATE = new Date("2026-05-01T08:00:00.000Z");

interface TempRuntime {
  homeDir: string;
  scanRoots: {
    claudeCodeRoot: string;
    codexRoots: string[];
    cursorRoots: string[];
    qwenRoots: string[];
  };
}

function makeTempRuntime(): { runtime: TempRuntime; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "lore-v09-watcher-"));
  const home = join(root, "home");
  mkdirSync(home, { recursive: true });
  const claudeRoot = join(home, ".claude", "projects");
  const codexRoot = join(home, ".codex", "sessions");
  const cursorRoot = join(home, ".cursor", "agent-sessions");
  const qwenRoot = join(home, ".opencode", "sessions");
  mkdirSync(claudeRoot, { recursive: true });
  mkdirSync(codexRoot, { recursive: true });
  return {
    runtime: {
      homeDir: home,
      scanRoots: {
        claudeCodeRoot: claudeRoot,
        codexRoots: [codexRoot],
        cursorRoots: [cursorRoot],
        qwenRoots: [qwenRoot]
      }
    },
    cleanup: () => rmSync(root, { recursive: true, force: true })
  };
}

function plantClaudeSession(claudeRoot: string, project: string, sessionId: string): string {
  const dir = join(claudeRoot, project);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${sessionId}.jsonl`);
  const lines = [
    JSON.stringify({ type: "user", sessionId, timestamp: "2026-05-01T07:55:00.000Z", cwd: "/repo", message: { role: "user", content: [{ type: "text", text: "deploy please" }] } }),
    JSON.stringify({ type: "assistant", sessionId, timestamp: "2026-05-01T07:55:01.000Z", message: { role: "assistant", content: [{ type: "text", text: "Sure, on it." }] } })
  ];
  writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  return file;
}

function plantCodexSession(codexRoot: string, sessionId: string): string {
  mkdirSync(codexRoot, { recursive: true });
  const file = join(codexRoot, `${sessionId}.jsonl`);
  const lines = [
    JSON.stringify({ role: "user", text: "what's the plan?", timestamp: "2026-05-01T07:56:00.000Z" }),
    JSON.stringify({ role: "assistant", text: "build, test, deploy", timestamp: "2026-05-01T07:56:02.000Z" })
  ];
  writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  return file;
}

class StubLoreClient implements LoreClient {
  policies = new Map<string, WatcherSourcePolicy>();
  heartbeats: Array<Parameters<LoreClient["heartbeat"]>[0]> = [];
  ingests: Array<IngestSessionInput> = [];
  ingestResult: (input: IngestSessionInput) => IngestSessionResult = () => ({ sessionId: "sess_test", jobId: "job_test", duplicate: false });
  // Optional failure injection for retry/backoff tests.
  failTimes = 0;

  async getSourcePolicy(sourceId: string): Promise<WatcherSourcePolicy | undefined> {
    return this.policies.get(sourceId);
  }
  async heartbeat(input: Parameters<LoreClient["heartbeat"]>[0]): Promise<void> {
    this.heartbeats.push(input);
  }
  async ingestSession(input: IngestSessionInput): Promise<IngestSessionResult> {
    this.ingests.push(input);
    if (this.failTimes > 0) {
      this.failTimes -= 1;
      throw new Error("transient network error");
    }
    return this.ingestResult(input);
  }
}

describe("runWatchTick — autodetection + delta upload", () => {
  let temp: ReturnType<typeof makeTempRuntime>;
  beforeEach(() => { temp = makeTempRuntime(); });
  afterEach(() => temp.cleanup());

  it("uploads new sessions, registers all four providers, and persists checkpoints", async () => {
    const claudePath = plantClaudeSession(temp.runtime.scanRoots.claudeCodeRoot, "proj-a", "claude-1");
    const codexPath = plantCodexSession(temp.runtime.scanRoots.codexRoots[0], "codex-1");

    const client = new StubLoreClient();
    const result = await runWatchTick({
      runtime: { homeDir: temp.runtime.homeDir, now: () => FRESH_DATE },
      client,
      vaultId: "vault_test",
      deviceId: "dev_test",
      scanOverrides: temp.runtime.scanRoots
    });

    expect(result.uploads.map((u) => u.sourcePath)).toEqual(expect.arrayContaining([claudePath, codexPath]));
    expect(result.uploads).toHaveLength(2);
    expect(result.failures).toHaveLength(0);

    // All 4 providers got a heartbeat (even Cursor/Qwen with zero discoveries).
    const providers = client.heartbeats.map((h) => h.provider).sort();
    expect(providers).toEqual(["claude-code", "codex", "cursor", "opencode"]);

    // Watcher counters reflect the upload.
    expect(result.counters.uploadedToday).toBe(2);
    expect(result.counters.failedToday).toBe(0);
    expect(result.counters.watching).toEqual(expect.arrayContaining(["claude-code", "codex"]));
    expect(result.counters.watching).not.toContain("cursor");
    expect(result.counters.lastUploadAt).toBe(FRESH_DATE.toISOString());

    // Checkpoint state on disk.
    const claudeCheckpoints = loadCheckpoints({ homeDir: temp.runtime.homeDir, now: () => FRESH_DATE }, "claude-code");
    expect(claudeCheckpoints.size).toBe(1);
    const cp = claudeCheckpoints.get(claudePath);
    expect(cp?.uploadedAt).toBe(FRESH_DATE.toISOString());
    expect(cp?.idempotencyKey).toBeTruthy();
  });

  it("is idempotent across re-runs (no duplicate ingest calls when nothing changed)", async () => {
    plantClaudeSession(temp.runtime.scanRoots.claudeCodeRoot, "proj-a", "claude-2");

    const client = new StubLoreClient();
    const opts = {
      runtime: { homeDir: temp.runtime.homeDir, now: () => FRESH_DATE },
      client,
      vaultId: "v",
      deviceId: "d",
      scanOverrides: temp.runtime.scanRoots
    };

    const first = await runWatchTick(opts);
    expect(first.uploads).toHaveLength(1);

    // Second run with no new files: all providers heartbeat; no ingest.
    const callsBefore = client.ingests.length;
    const second = await runWatchTick(opts);
    expect(client.ingests.length).toBe(callsBefore);
    expect(second.uploads).toHaveLength(0);
    expect(second.skipped.some((s) => s.reason === "already uploaded (idempotency)" || s.sourcePath.endsWith("claude-2.jsonl"))).toBe(false);
    // Counters should not double-count.
    expect(second.counters.uploadedToday).toBe(1);
  });

  it("uploads a delta when the file is updated (mtime/size change)", async () => {
    const file = plantClaudeSession(temp.runtime.scanRoots.claudeCodeRoot, "proj-a", "claude-3");
    const client = new StubLoreClient();
    const opts = {
      runtime: { homeDir: temp.runtime.homeDir, now: () => FRESH_DATE },
      client,
      vaultId: "v",
      deviceId: "d",
      scanOverrides: temp.runtime.scanRoots
    };
    await runWatchTick(opts);
    const callsBefore = client.ingests.length;

    // Append a new turn so size + mtime change.
    const updated = readFileSync(file, "utf8") + JSON.stringify({ type: "user", sessionId: "claude-3", timestamp: "2026-05-01T08:01:00.000Z", message: { role: "user", content: "another turn" } }) + "\n";
    writeFileSync(file, updated, "utf8");
    const future = new Date(FRESH_DATE.getTime() + 60_000);
    utimesSync(file, future, future);

    const second = await runWatchTick({ ...opts, runtime: { homeDir: temp.runtime.homeDir, now: () => future } });
    expect(client.ingests.length).toBe(callsBefore + 1);
    expect(second.uploads).toHaveLength(1);
  });

  it("skips uploads when a source policy is paused or private_mode", async () => {
    plantClaudeSession(temp.runtime.scanRoots.claudeCodeRoot, "proj-a", "claude-4");
    plantCodexSession(temp.runtime.scanRoots.codexRoots[0], "codex-pause");

    const client = new StubLoreClient();
    client.policies.set("src_claude-code", { status: "paused" });
    client.policies.set("src_codex", { status: "private_mode" });

    const result = await runWatchTick({
      runtime: { homeDir: temp.runtime.homeDir, now: () => FRESH_DATE },
      client,
      vaultId: "v",
      deviceId: "d",
      scanOverrides: temp.runtime.scanRoots
    });

    expect(client.ingests).toHaveLength(0);
    expect(result.uploads).toHaveLength(0);
    expect(result.skipped.length).toBeGreaterThanOrEqual(2);
    expect(result.skipped.some((s) => s.reason.includes("paused"))).toBe(true);
    expect(result.skipped.some((s) => s.reason.includes("private_mode"))).toBe(true);
    // Heartbeats still fire so the dashboard sees the source as alive.
    expect(client.heartbeats.some((h) => h.status === "paused")).toBe(true);
    expect(client.heartbeats.some((h) => h.status === "private_mode")).toBe(true);
  });

  it("retries transient errors with backoff and records failure counters", async () => {
    plantClaudeSession(temp.runtime.scanRoots.claudeCodeRoot, "proj-a", "claude-retry");
    const client = new StubLoreClient();
    client.failTimes = 2; // first two attempts fail, third succeeds

    const result = await runWatchTick({
      runtime: { homeDir: temp.runtime.homeDir, now: () => FRESH_DATE },
      client,
      vaultId: "v",
      deviceId: "d",
      scanOverrides: temp.runtime.scanRoots,
      retry: { maxAttempts: 4, baseDelayMs: 1, capDelayMs: 1 }
    });
    expect(result.uploads).toHaveLength(1);
    expect(result.failures).toHaveLength(0);
    expect(client.ingests.length).toBe(3);
  });

  it("does not retry policy errors (non-2xx with status<500)", async () => {
    plantClaudeSession(temp.runtime.scanRoots.claudeCodeRoot, "proj-a", "claude-policy");
    const client = new StubLoreClient();
    client.ingestSession = vi.fn(async () => {
      const err: Error & { status?: number } = new Error("source paused server-side");
      err.status = 409;
      throw err;
    });

    const result = await runWatchTick({
      runtime: { homeDir: temp.runtime.homeDir, now: () => FRESH_DATE },
      client,
      vaultId: "v",
      deviceId: "d",
      scanOverrides: temp.runtime.scanRoots,
      retry: { maxAttempts: 5, baseDelayMs: 1, capDelayMs: 1 }
    });
    expect((client.ingestSession as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].error).toContain("source paused server-side");
    expect(result.counters.failedToday).toBe(1);
    expect(result.counters.lastUploadError).toContain("source paused");
  });

  it("uploads Cursor sessions (rc.2 Lane D second auto-capture client) and skips OpenCode", async () => {
    // Plant a Cursor JSON envelope and an OpenCode JSONL stub. Cursor should
    // upload through the new parser; OpenCode remains discovery-only.
    mkdirSync(temp.runtime.scanRoots.cursorRoots[0], { recursive: true });
    const cursorPath = join(temp.runtime.scanRoots.cursorRoots[0], "session.json");
    writeFileSync(cursorPath, JSON.stringify({
      id: "cursor-watcher-1",
      messages: [
        { role: "user", text: "hi", timestamp: "2026-05-01T07:55:00.000Z" },
        { role: "assistant", text: "hello", timestamp: "2026-05-01T07:55:01.000Z" }
      ]
    }) + "\n", "utf8");
    mkdirSync(temp.runtime.scanRoots.qwenRoots[0], { recursive: true });
    writeFileSync(join(temp.runtime.scanRoots.qwenRoots[0], "session.jsonl"), "{\"role\":\"user\",\"text\":\"hi\"}\n", "utf8");

    const client = new StubLoreClient();
    const result = await runWatchTick({
      runtime: { homeDir: temp.runtime.homeDir, now: () => FRESH_DATE },
      client,
      vaultId: "v",
      deviceId: "d",
      scanOverrides: temp.runtime.scanRoots
    });
    expect(client.ingests).toHaveLength(1);
    expect(client.ingests[0].sourceProvider).toBe("cursor");
    expect(result.uploads.some((u) => u.provider === "cursor")).toBe(true);
    // OpenCode still skipped — discovery only until a parser ships.
    expect(result.skipped.some((s) => s.provider === "opencode" && s.reason === "parser not yet implemented")).toBe(true);
    expect(result.counters.watching).toEqual(expect.arrayContaining(["cursor", "opencode"]));
  });
});

describe("loadWatcherCounters / readWatcherStatus", () => {
  let temp: ReturnType<typeof makeTempRuntime>;
  beforeEach(() => { temp = makeTempRuntime(); });
  afterEach(() => temp.cleanup());

  it("returns empty counters before any tick has run", () => {
    const counters = loadWatcherCounters({ homeDir: temp.runtime.homeDir, now: () => FRESH_DATE });
    expect(counters.uploadedToday).toBe(0);
    expect(counters.lastUploadAt).toBeNull();
    expect(counters.watching).toEqual([]);
  });

  it("rolls over today counters on a new date but preserves last upload pointers", async () => {
    plantClaudeSession(temp.runtime.scanRoots.claudeCodeRoot, "proj-a", "claude-rollover");
    const client = new StubLoreClient();
    const day1 = new Date("2026-05-01T08:00:00.000Z");
    await runWatchTick({
      runtime: { homeDir: temp.runtime.homeDir, now: () => day1 },
      client,
      vaultId: "v",
      deviceId: "d",
      scanOverrides: temp.runtime.scanRoots
    });

    const day2 = new Date("2026-05-02T08:00:00.000Z");
    const counters = loadWatcherCounters({ homeDir: temp.runtime.homeDir, now: () => day2 });
    expect(counters.uploadedToday).toBe(0);
    expect(counters.failedToday).toBe(0);
    expect(counters.lastUploadAt).toBe(day1.toISOString());
    expect(counters.countersDate).toBe("2026-05-02");
  });

  it("readWatcherStatus surfaces per-provider checkpoint summary", async () => {
    plantClaudeSession(temp.runtime.scanRoots.claudeCodeRoot, "proj-a", "claude-summary");
    const client = new StubLoreClient();
    await runWatchTick({
      runtime: { homeDir: temp.runtime.homeDir, now: () => FRESH_DATE },
      client,
      vaultId: "v",
      deviceId: "d",
      scanOverrides: temp.runtime.scanRoots
    });
    const status = readWatcherStatus({ homeDir: temp.runtime.homeDir, now: () => FRESH_DATE });
    expect(status.checkpointSummary["claude-code"].tracked).toBe(1);
    expect(status.checkpointSummary["claude-code"].lastUploadAt).toBe(FRESH_DATE.toISOString());
    expect(status.checkpointSummary.cursor.tracked).toBe(0);
  });
});
