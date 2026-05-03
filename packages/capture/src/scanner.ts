import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { CaptureProvider } from "./types.js";

// Local-only discovery of agent session files. The scanner intentionally
// returns paths and lets the caller decide what to parse / upload — that keeps
// IO failures isolated and avoids reading huge transcript trees by accident.

export interface DiscoveredSource {
  provider: CaptureProvider;
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  // For Claude Code, this is the encoded project directory; for Codex it is
  // the parent folder used by the CLI.
  bucket?: string;
}

export interface ScanOptions {
  // Override roots (testing). When omitted defaults are used.
  claudeCodeRoot?: string;
  codexRoots?: string[];
  cursorRoots?: string[];
  qwenRoots?: string[];
  // Skip files larger than this (default: 25 MiB) so a runaway transcript
  // does not block the scanner.
  maxFileBytes?: number;
}

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

export function defaultClaudeCodeRoot(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

export function defaultCodexRoots(): string[] {
  return [
    path.join(os.homedir(), ".codex", "sessions"),
    path.join(os.homedir(), ".config", "codex", "sessions"),
    path.join(os.homedir(), ".local", "share", "codex", "sessions")
  ];
}

// v0.9 Lane B: best-effort Cursor agent-session discovery. Cursor's on-disk
// layout is not a stable contract, so we accept multiple roots and silently
// ignore any that are missing. Used only for source registration / status —
// the watcher will not upload Cursor turns until a parser stabilizes.
export function defaultCursorRoots(): string[] {
  return [
    path.join(os.homedir(), ".cursor", "agent-sessions"),
    path.join(os.homedir(), ".cursor", "sessions"),
    path.join(os.homedir(), "Library", "Application Support", "Cursor", "User", "globalStorage", "cursor.cursor", "agent-sessions")
  ];
}

// v0.9 Lane B: Qwen/OpenCode share storage shape (JSON/JSONL session logs);
// they are the same `opencode` provider in our enum.
export function defaultQwenRoots(): string[] {
  return [
    path.join(os.homedir(), ".opencode", "sessions"),
    path.join(os.homedir(), ".config", "opencode", "sessions"),
    path.join(os.homedir(), ".qwen", "sessions"),
    path.join(os.homedir(), ".config", "qwen", "sessions")
  ];
}

export async function scanClaudeCode(options: ScanOptions = {}): Promise<DiscoveredSource[]> {
  const root = options.claudeCodeRoot ?? defaultClaudeCodeRoot();
  const max = options.maxFileBytes ?? DEFAULT_MAX_BYTES;
  const results: DiscoveredSource[] = [];

  const projectDirs = await safeReaddir(root);
  for (const projectDir of projectDirs) {
    const projectPath = path.join(root, projectDir);
    const projectStat = await safeStat(projectPath);
    if (!projectStat?.isDirectory()) continue;

    const files = await safeReaddir(projectPath);
    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      const full = path.join(projectPath, file);
      const st = await safeStat(full);
      if (!st || !st.isFile()) continue;
      if (st.size > max) continue;
      results.push({
        provider: "claude-code",
        path: full,
        sizeBytes: Number(st.size),
        modifiedAt: st.mtime.toISOString(),
        bucket: projectDir
      });
    }
  }

  return results;
}

export async function scanCodex(options: ScanOptions = {}): Promise<DiscoveredSource[]> {
  const roots = options.codexRoots ?? defaultCodexRoots();
  const max = options.maxFileBytes ?? DEFAULT_MAX_BYTES;
  const results: DiscoveredSource[] = [];

  for (const root of roots) {
    const exists = await safeStat(root);
    if (!exists?.isDirectory()) continue;
    await walkCodex(root, results, max);
  }

  return results;
}

async function walkCodex(dir: string, out: DiscoveredSource[], maxBytes: number): Promise<void> {
  await walkSessions(dir, "codex", out, maxBytes);
}

export async function scanCursor(options: ScanOptions = {}): Promise<DiscoveredSource[]> {
  const roots = options.cursorRoots ?? defaultCursorRoots();
  const max = options.maxFileBytes ?? DEFAULT_MAX_BYTES;
  const results: DiscoveredSource[] = [];
  for (const root of roots) {
    const exists = await safeStat(root);
    if (!exists?.isDirectory()) continue;
    await walkSessions(root, "cursor", results, max);
  }
  return results;
}

export async function scanQwen(options: ScanOptions = {}): Promise<DiscoveredSource[]> {
  // Qwen and OpenCode share the same on-disk session shape; both are mapped
  // to the `opencode` provider in the v0.7 schema. Using one scanner avoids
  // double-registering when both `~/.opencode` and `~/.qwen` exist.
  const roots = options.qwenRoots ?? defaultQwenRoots();
  const max = options.maxFileBytes ?? DEFAULT_MAX_BYTES;
  const results: DiscoveredSource[] = [];
  for (const root of roots) {
    const exists = await safeStat(root);
    if (!exists?.isDirectory()) continue;
    await walkSessions(root, "opencode", results, max);
  }
  return results;
}

async function walkSessions(
  dir: string,
  provider: CaptureProvider,
  out: DiscoveredSource[],
  maxBytes: number
): Promise<void> {
  const entries = await safeReaddir(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const st = await safeStat(full);
    if (!st) continue;
    if (st.isDirectory()) {
      await walkSessions(full, provider, out, maxBytes);
      continue;
    }
    if (!st.isFile()) continue;
    if (!/\.(jsonl|json)$/i.test(entry)) continue;
    if (st.size > maxBytes) continue;
    out.push({
      provider,
      path: full,
      sizeBytes: Number(st.size),
      modifiedAt: st.mtime.toISOString(),
      bucket: path.basename(dir)
    });
  }
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function safeStat(p: string): Promise<Awaited<ReturnType<typeof stat>> | null> {
  try {
    return await stat(p);
  } catch {
    return null;
  }
}
