/**
 * `lore-index install-git-hook` subcommand.
 *
 * Registers .git/hooks/post-commit to run `lore-index --incremental`.
 * If the hook already exists and was not installed by Lore, the command
 * appends rather than overwrites.
 *
 * Lane U U1 deliverable.
 */

import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { postCommitHookScript, LORE_HOOK_SENTINEL } from "../git-hook.js";

function findGitDir(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 20; i++) {
    const candidate = join(dir, ".git");
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/** Resolve the absolute path to the lore-index binary. */
function resolveBinPath(): string {
  // In production the bin is at dist/cli.js relative to this file's package root.
  // Use the package.json#bin "lore-index" field → dist/cli.js
  const thisFile = fileURLToPath(import.meta.url);
  // thisFile = <pkg>/dist/cli/install-git-hook.js
  // go up two levels to <pkg>/dist/, then look for cli.js
  const distDir = resolve(thisFile, "../../");
  return join(distDir, "cli.js");
}

export async function installGitHook(opts: {
  cwd?: string;
  /** Override the bin path (used in tests). */
  binPath?: string;
}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const gitDir = findGitDir(cwd);

  if (!gitDir) {
    throw new Error(
      `No .git directory found at or above "${cwd}". Run from inside a git repository.`
    );
  }

  const hooksDir = join(gitDir, "hooks");
  mkdirSync(hooksDir, { recursive: true });

  const hookPath = join(hooksDir, "post-commit");
  const binPath = opts.binPath ?? resolveBinPath();
  const script = postCommitHookScript(binPath);

  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf8");
    if (existing.includes(LORE_HOOK_SENTINEL)) {
      // Already installed — overwrite to update path
      writeFileSync(hookPath, script, "utf8");
      console.log(`[lore-index] Updated existing hook at ${hookPath}`);
    } else {
      // Foreign hook — append our block
      const appended = `${existing.trimEnd()}\n\n${script}`;
      writeFileSync(hookPath, appended, "utf8");
      console.log(`[lore-index] Appended to existing hook at ${hookPath}`);
    }
  } else {
    writeFileSync(hookPath, script, "utf8");
    console.log(`[lore-index] Installed hook at ${hookPath}`);
  }

  // Make executable (chmod +x)
  chmodSync(hookPath, 0o755);
}
