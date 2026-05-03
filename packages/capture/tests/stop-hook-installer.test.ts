import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  installStopHook,
  planStopHookInstall,
  planStopHookUninstall,
  uninstallStopHook
} from "../src/stop-hook-installer.js";

describe("planStopHookInstall", () => {
  it("appends a Lore-managed Stop hook without touching unrelated hooks", () => {
    const before = {
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "/usr/local/bin/other-tool" }] }],
        PreToolUse: [{ hooks: [{ type: "command", command: "/usr/local/bin/audit" }] }]
      }
    };
    const after = planStopHookInstall(before, { hookCommand: "/abs/lore-stop" });
    expect(after.hooks?.Stop).toHaveLength(2);
    expect(after.hooks?.Stop?.[0].hooks[0].command).toBe("/usr/local/bin/other-tool");
    expect(after.hooks?.Stop?.[1].hooks[0].loreManaged).toBe(true);
    expect(after.hooks?.Stop?.[1].hooks[0].command).toBe("/abs/lore-stop");
    expect(after.hooks?.PreToolUse).toEqual(before.hooks.PreToolUse);
  });

  it("is idempotent — re-running yields the same shape, no duplicates", () => {
    const empty = {};
    const once = planStopHookInstall(empty, { hookCommand: "/abs/lore-stop" });
    const twice = planStopHookInstall(once, { hookCommand: "/abs/lore-stop" });
    expect(twice).toEqual(once);
    expect(twice.hooks?.Stop).toHaveLength(1);
  });

  it("replaces an older Lore-managed entry by command-pattern recognition", () => {
    const before = {
      hooks: {
        Stop: [
          { hooks: [{ type: "command", command: "node /old/scripts/lore-claude-stop-hook.mjs" }] }
        ]
      }
    };
    const after = planStopHookInstall(before, { hookCommand: "/new/lore-stop" });
    const allCommands = after.hooks?.Stop?.flatMap((g) => g.hooks.map((h) => h.command));
    expect(allCommands).toEqual(["/new/lore-stop"]);
  });
});

describe("planStopHookUninstall", () => {
  it("removes only Lore-managed entries", () => {
    const before = {
      hooks: {
        Stop: [
          { hooks: [{ type: "command", command: "/u/other" }] },
          { hooks: [{ type: "command", command: "/u/lore-stop", loreManaged: true }] }
        ]
      }
    };
    const after = planStopHookUninstall(before);
    const remaining = after.hooks?.Stop?.flatMap((g) => g.hooks.map((h) => h.command));
    expect(remaining).toEqual(["/u/other"]);
  });

  it("drops empty Stop / hooks containers", () => {
    const before = {
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "/u/lore-stop", loreManaged: true }] }]
      }
    };
    const after = planStopHookUninstall(before);
    expect(after.hooks).toBeUndefined();
  });
});

describe("installStopHook (filesystem)", () => {
  let dir: string;
  let settingsPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "lore-installer-"));
    settingsPath = path.join(dir, "settings.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates settings.json when none exists and writes no backup", async () => {
    const result = await installStopHook({
      hookCommand: "/abs/lore-stop",
      settingsPath
    });
    expect(result.written).toBe(true);
    expect(result.backupPath).toBeUndefined();
    const written = JSON.parse(await readFile(settingsPath, "utf-8"));
    expect(written.hooks.Stop[0].hooks[0].command).toBe("/abs/lore-stop");
  });

  it("backs up an existing settings.json before writing", async () => {
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(settingsPath, JSON.stringify({ hooks: { Stop: [] }, theme: "dark" }), "utf-8");
    const result = await installStopHook({
      hookCommand: "/abs/lore-stop",
      settingsPath
    }, new Date("2026-04-30T12:00:00.000Z"));
    expect(result.written).toBe(true);
    expect(result.backupPath).toContain("settings.json.lore-backup-");
    const after = JSON.parse(await readFile(settingsPath, "utf-8"));
    expect(after.theme).toBe("dark");
    expect(after.hooks.Stop[0].hooks[0].loreManaged).toBe(true);
  });

  it("uninstall restores a Lore-free file", async () => {
    await installStopHook({ hookCommand: "/abs/lore-stop", settingsPath });
    const r = await uninstallStopHook({ settingsPath });
    expect(r.written).toBe(true);
    const after = JSON.parse(await readFile(settingsPath, "utf-8"));
    expect(after.hooks?.Stop).toBeUndefined();
  });

  it("returns written=false when nothing changes", async () => {
    await installStopHook({ hookCommand: "/abs/lore-stop", settingsPath });
    const r2 = await installStopHook({ hookCommand: "/abs/lore-stop", settingsPath });
    expect(r2.written).toBe(false);
  });
});
