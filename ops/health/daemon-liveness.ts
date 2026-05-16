/**
 * daemon-liveness.ts — Daemon health monitor
 *
 * Scans for long-running child processes (node/python/daemon) and auto-terminates
 * any that exceed 30 minutes. Intended to be invoked every 20 seconds via cron.
 *
 * Acceptance criteria:
 *   1. Scans process table for node/python/daemon processes
 *   2. Terminates any process with runtime > 30 minutes (SIGTERM then SIGKILL)
 *   3. Writes structured JSON log to daemon-liveness.log
 *   4. Produces machine-readable exit code: 0 = clean, 1 = errors occurred
 */

import { execSync } from "node:child_process";
import { appendFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ── ES module __dirname shim ──────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Configuration ─────────────────────────────────────────────────────────────

const MAX_RUNTIME_MS = 30 * 60 * 1000; // 30 minutes
const PID_FILE = join(__dirname, ".daemon-liveness.pid");
const LOG_FILE = join(__dirname, "daemon-liveness.log");

/** PIDs that must NEVER be terminated (system + monitor infra). */
const EXEMPT_PIDS = new Set([1, 2, process.pid]);

/** Pattern to match daemon-like process commands. */
const DAEMON_PATTERN = /node|python|daemon|monitor/;

/** Patterns to exclude (grep itself, the liveness script, bash wrappers). */
const EXCLUDE_PATTERN = /grep|daemon-liveness|tsx|bash -c source/;

// ── Logging ───────────────────────────────────────────────────────────────────

function log(level: "INFO" | "WARN" | "ERROR", message: string, meta?: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(meta ?? {}),
  };
  const line = JSON.stringify(entry);
  try {
    appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // If log file can't be written, fall through to stdout
  }
  console.log(line);
}

// ── Process scanning ──────────────────────────────────────────────────────────

interface ProcessInfo {
  pid: number;
  elapsedSeconds: number;
  command: string;
}

function scanProcesses(): ProcessInfo[] {
  try {
    // ps -eo pid,etime,args — etime is [[DD-]HH:]MM:SS
    const output = execSync("ps -eo pid,etime,args --no-headers", {
      encoding: "utf-8",
      timeout: 5_000,
    });

    const results: ProcessInfo[] = [];

    for (const rawLine of output.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;

      // Parse: "  PID  [[DD-]HH:]MM:SS  command..."
      const match = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/);
      if (!match) continue;

      const pid = parseInt(match[1], 10);
      const elapsed = match[2];
      const command = match[3];

      // Skip exempt PIDs
      if (EXEMPT_PIDS.has(pid)) continue;

      // Filter for daemon-like processes
      if (!DAEMON_PATTERN.test(command)) continue;
      if (EXCLUDE_PATTERN.test(command)) continue;

      const elapsedSeconds = parseElapsed(elapsed);
      if (elapsedSeconds === null) continue;

      results.push({ pid, elapsedSeconds, command });
    }

    return results;
  } catch (err) {
    log("ERROR", "Failed to scan processes", { error: String(err) });
    return [];
  }
}

/**
 * Parse ps etime format: [[DD-]HH:]MM:SS
 * Returns total seconds, or null if unparseable.
 */
function parseElapsed(etime: string): number | null {
  try {
    // Possible formats: "SS", "MM:SS", "HH:MM:SS", "DD-HH:MM:SS"
    const parts = etime.split(/[-:]/);
    if (parts.length === 0) return null;

    let seconds = 0;
    if (parts.length === 1) {
      seconds = parseInt(parts[0], 10);
    } else if (parts.length === 2) {
      seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    } else if (parts.length === 4) {
      seconds =
        parseInt(parts[0], 10) * 86400 +
        parseInt(parts[1], 10) * 3600 +
        parseInt(parts[2], 10) * 60 +
        parseInt(parts[3], 10);
    }

    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}

// ── Termination ───────────────────────────────────────────────────────────────

function terminateProcess(pid: number, command: string, runtimeMinutes: number): boolean {
  try {
    log("WARN", "Terminating long-running process", { pid, runtimeMinutes, command: command.slice(0, 200) });

    // SIGTERM first
    process.kill(pid, "SIGTERM");

    // Give 5 seconds to exit gracefully, then SIGKILL
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      try {
        process.kill(pid, 0); // Check if alive
      } catch {
        // Process exited
        log("INFO", "Process terminated gracefully", { pid });
        return true;
      }
      // Busy-wait is fine for 5 seconds max
      const start = Date.now();
      while (Date.now() - start < 200) {
        /* spin */
      }
    }

    // Still alive — force kill
    try {
      process.kill(pid, "SIGKILL");
      log("WARN", "Process force-killed with SIGKILL", { pid });
      return true;
    } catch {
      // Already dead
      return true;
    }
  } catch (err) {
    // ESRCH = no such process (already exited)
    if ((err as NodeJS.ErrnoException).code === "ESRCH") {
      return true;
    }
    log("ERROR", "Failed to terminate process", { pid, error: String(err) });
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): number {
  log("INFO", "Daemon liveness check started");

  const processes = scanProcesses();
  log("INFO", `Scanned ${processes.length} daemon processes`);

  let terminated = 0;
  let errors = 0;

  for (const proc of processes) {
    const runtimeMs = proc.elapsedSeconds * 1000;
    const runtimeMinutes = Math.round(runtimeMs / 60_000);

    if (runtimeMs > MAX_RUNTIME_MS) {
      const ok = terminateProcess(proc.pid, proc.command, runtimeMinutes);
      if (ok) {
        terminated++;
      } else {
        errors++;
      }
    }
  }

  // Write PID tracking file
  const summary = {
    ts: new Date().toISOString(),
    scanned: processes.length,
    terminated,
    errors,
    activePids: processes
      .filter((p) => p.elapsedSeconds * 1000 <= MAX_RUNTIME_MS)
      .map((p) => ({ pid: p.pid, elapsedSeconds: p.elapsedSeconds, command: p.command.slice(0, 120) })),
  };

  try {
    writeFileSync(PID_FILE, JSON.stringify(summary, null, 2));
  } catch (err) {
    log("ERROR", "Failed to write PID file", { error: String(err) });
    errors++;
  }

  log("INFO", "Daemon liveness check completed", { scanned: processes.length, terminated, errors });

  return errors > 0 ? 1 : 0;
}

// ── Entry point ───────────────────────────────────────────────────────────────

const exitCode = main();
process.exit(exitCode);
