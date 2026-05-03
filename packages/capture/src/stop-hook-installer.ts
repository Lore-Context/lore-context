import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Productized Stop hook installer.
//
// Claude Code reads hooks from `~/.claude/settings.json` (or the user-scoped
// `~/.claude/settings.local.json`). Our daemon already has `stop-hook.ts` for
// the runtime side; this module owns the *config write* so `lore connect`
// can install/uninstall the hook safely.
//
// Safety rules:
//   - never overwrite an existing settings file without writing a backup
//     first to `<settings-path>.lore-backup-<timestamp>.json`;
//   - leave unrelated hooks untouched;
//   - the install is idempotent: running twice produces the same settings;
//   - dry-run mode previews the diff without touching disk.

export interface StopHookInstallerOptions {
  // Absolute path to the script Claude Code should invoke. The CLI lane is
  // expected to ship this as part of `lore connect`.
  hookCommand: string;
  // Override paths (testing).
  settingsPath?: string;
  homeDir?: string;
  // Default 5 seconds; matches the v0.7 productized hook contract.
  timeoutSeconds?: number;
}

export interface StopHookInstallResult {
  written: boolean;
  backupPath?: string;
  settingsPath: string;
  before: ClaudeSettings;
  after: ClaudeSettings;
}

export interface StopHookUninstallResult {
  written: boolean;
  settingsPath: string;
  before: ClaudeSettings;
  after: ClaudeSettings;
}

interface ClaudeHookSpec {
  type: "command";
  command: string;
  timeout?: number;
  // Free-form metadata used to recognize Lore-installed hooks.
  loreManaged?: boolean;
}

interface ClaudeHookGroup {
  hooks: ClaudeHookSpec[];
  matcher?: string;
}

export interface ClaudeSettings {
  hooks?: {
    Stop?: ClaudeHookGroup[];
    [event: string]: ClaudeHookGroup[] | undefined;
  };
  [key: string]: unknown;
}

export function defaultClaudeSettingsPath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, ".claude", "settings.json");
}

export async function readClaudeSettings(settingsPath: string): Promise<ClaudeSettings> {
  try {
    const raw = await readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ClaudeSettings;
  } catch {
    // missing or unparseable — treat as empty so we do not blow up the user
    // with a hard failure during a one-line connect.
  }
  return {};
}

export function planStopHookInstall(settings: ClaudeSettings, options: StopHookInstallerOptions): ClaudeSettings {
  const next: ClaudeSettings = JSON.parse(JSON.stringify(settings ?? {}));
  next.hooks = next.hooks ?? {};
  const stopGroups = next.hooks.Stop ?? [];

  // Strip any prior Lore-managed Stop hooks so re-running the installer is
  // idempotent. Other Stop hooks (user-installed, third-party) are kept.
  const filteredGroups: ClaudeHookGroup[] = [];
  for (const group of stopGroups) {
    const remaining = (group.hooks ?? []).filter((h) => !isLoreHook(h));
    if (remaining.length > 0) filteredGroups.push({ ...group, hooks: remaining });
  }

  filteredGroups.push({
    hooks: [
      {
        type: "command",
        command: options.hookCommand,
        timeout: options.timeoutSeconds ?? 5,
        loreManaged: true
      }
    ]
  });

  next.hooks.Stop = filteredGroups;
  return next;
}

export function planStopHookUninstall(settings: ClaudeSettings): ClaudeSettings {
  const next: ClaudeSettings = JSON.parse(JSON.stringify(settings ?? {}));
  if (!next.hooks?.Stop) return next;
  const remainingGroups: ClaudeHookGroup[] = [];
  for (const group of next.hooks.Stop) {
    const remaining = (group.hooks ?? []).filter((h) => !isLoreHook(h));
    if (remaining.length > 0) remainingGroups.push({ ...group, hooks: remaining });
  }
  if (remainingGroups.length === 0) {
    delete next.hooks.Stop;
    if (next.hooks && Object.keys(next.hooks).length === 0) delete next.hooks;
  } else {
    next.hooks.Stop = remainingGroups;
  }
  return next;
}

export async function installStopHook(options: StopHookInstallerOptions, now: Date = new Date()): Promise<StopHookInstallResult> {
  const settingsPath = options.settingsPath ?? defaultClaudeSettingsPath(options.homeDir);
  const before = await readClaudeSettings(settingsPath);
  const after = planStopHookInstall(before, options);

  if (deepEqual(before, after)) {
    return { written: false, settingsPath, before, after };
  }

  const backupPath = await maybeBackup(settingsPath, now);
  await writeAtomicJson(settingsPath, after);
  return { written: true, backupPath, settingsPath, before, after };
}

export async function uninstallStopHook(options: { settingsPath?: string; homeDir?: string }, now: Date = new Date()): Promise<StopHookUninstallResult> {
  const settingsPath = options.settingsPath ?? defaultClaudeSettingsPath(options.homeDir);
  const before = await readClaudeSettings(settingsPath);
  const after = planStopHookUninstall(before);
  if (deepEqual(before, after)) {
    return { written: false, settingsPath, before, after };
  }
  await maybeBackup(settingsPath, now);
  await writeAtomicJson(settingsPath, after);
  return { written: true, settingsPath, before, after };
}

function isLoreHook(h: ClaudeHookSpec): boolean {
  if (h.loreManaged === true) return true;
  if (typeof h.command !== "string") return false;
  // Catch hooks installed by older revisions that did not yet stamp loreManaged.
  return h.command.includes("lore-claude-stop-hook") || h.command.includes("@lore/capture");
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function maybeBackup(filePath: string, now: Date): Promise<string | undefined> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const backupPath = `${filePath}.lore-backup-${stamp}.json`;
    await writeFile(backupPath, raw, "utf-8");
    return backupPath;
  } catch {
    // No prior file → nothing to back up.
    return undefined;
  }
}

async function writeAtomicJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  await rename(tmp, filePath);
}
