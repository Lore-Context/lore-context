#!/usr/bin/env node
/**
 * lore-index CLI binary.
 *
 * Subcommands / flags:
 *   lore-index --full                  Full repo index
 *   lore-index --incremental           Index changed files since last HEAD
 *   lore-index --since <sha>           Index files changed since <sha>
 *   lore-index install-git-hook        Install .git/hooks/post-commit
 */

import { installGitHook } from "./cli/install-git-hook.js";
import { CodeIndexer } from "./indexer.js";

function usage(): void {
  console.error(`
lore-index — Lore Context code knowledge graph indexer

Usage:
  lore-index --full                   Index entire repository
  lore-index --incremental            Index files changed since last commit
  lore-index --since <git-sha>        Index files changed since <git-sha>
  lore-index install-git-hook         Install .git/hooks/post-commit

Options:
  --tier2-passphrase <pass>    Enable Tier-2 E2E symbol encryption (Pro tier).
                               Overrides LORE_TIER2_PASSPHRASE env var.

Environment variables:
  LORE_API_URL           Lore API base URL (default: https://api.lorecontext.com)
  LORE_AUTH_TOKEN        Auth token (required for upload)
  LORE_VAULT_ID          Vault ID (required for upload)
  LORE_REPO_NAME         Logical repo name (default: basename of cwd)
  LORE_TIER2_PASSPHRASE  Passphrase for Tier-2 E2E encryption (Pro tier).
                         --tier2-passphrase flag takes precedence when both set.
`);
}

async function getChangedFiles(since: string): Promise<string[]> {
  const { execSync } = await import("node:child_process");
  try {
    const out = execSync(`git diff --name-only ${since} HEAD`, {
      encoding: "utf8",
      cwd: process.cwd(),
    });
    return out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[lore-index] git diff failed: ${msg}`);
    return [];
  }
}

async function getIncrementalFiles(): Promise<string[]> {
  const { execSync } = await import("node:child_process");
  try {
    // Files changed in the last commit
    const out = execSync("git diff --name-only HEAD~1 HEAD", {
      encoding: "utf8",
      cwd: process.cwd(),
    });
    return out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    // First commit or no previous: fall back to full
    return [];
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
    process.exit(0);
  }

  // install-git-hook subcommand
  if (args[0] === "install-git-hook") {
    await installGitHook({ cwd: process.cwd() });
    process.exit(0);
  }

  // Require env vars for upload commands
  const apiBaseUrl = process.env["LORE_API_URL"] ?? "https://api.lorecontext.com";
  const authToken = process.env["LORE_AUTH_TOKEN"] ?? "";
  const vaultId = process.env["LORE_VAULT_ID"] ?? "";
  const repoPath = process.cwd();
  const { basename } = await import("node:path");
  const repoName = process.env["LORE_REPO_NAME"] ?? basename(repoPath);

  // --tier2-passphrase flag takes precedence over LORE_TIER2_PASSPHRASE env var.
  const tier2FlagIdx = args.indexOf("--tier2-passphrase");
  const tier2Passphrase =
    tier2FlagIdx !== -1
      ? args[tier2FlagIdx + 1]
      : process.env["LORE_TIER2_PASSPHRASE"];

  if (!authToken || !vaultId) {
    console.error(
      "[lore-index] LORE_AUTH_TOKEN and LORE_VAULT_ID must be set for upload commands."
    );
    process.exit(1);
  }

  if (tier2Passphrase) {
    console.error(
      "[lore-index] Tier-2 E2E encryption enabled — symbols will be encrypted " +
        "client-side before upload. Server-side semantic search disabled for this repo."
    );
  }

  const indexer = new CodeIndexer({
    repoPath,
    repoName,
    apiBaseUrl,
    authToken,
    vaultId,
    ...(tier2Passphrase ? { tier2Passphrase } : {}),
  });

  if (args.includes("--full")) {
    console.log("[lore-index] Starting full index...");
    const stats = await indexer.indexFull();
    console.log("[lore-index] Done.", stats);
    process.exit(stats.uploadErrors > 0 ? 1 : 0);
  }

  if (args.includes("--incremental")) {
    const changedFiles = await getIncrementalFiles();
    if (changedFiles.length === 0) {
      console.log("[lore-index] No changed files — running full index.");
      const stats = await indexer.indexFull();
      console.log("[lore-index] Done.", stats);
      process.exit(stats.uploadErrors > 0 ? 1 : 0);
    }
    console.log(`[lore-index] Indexing ${changedFiles.length} changed files...`);
    let uploadErrors = 0;
    for (const relPath of changedFiles) {
      const { join } = await import("node:path");
      const absPath = join(repoPath, relPath);
      const stats = await indexer.indexFile(absPath);
      uploadErrors += stats.uploadErrors;
    }
    process.exit(uploadErrors > 0 ? 1 : 0);
  }

  const sinceIdx = args.indexOf("--since");
  if (sinceIdx !== -1) {
    const sha = args[sinceIdx + 1];
    if (!sha) {
      console.error("[lore-index] --since requires a git SHA argument.");
      process.exit(1);
    }
    const changedFiles = await getChangedFiles(sha);
    console.log(`[lore-index] Indexing ${changedFiles.length} files changed since ${sha}...`);
    let uploadErrors = 0;
    for (const relPath of changedFiles) {
      const { join } = await import("node:path");
      const absPath = join(repoPath, relPath);
      const stats = await indexer.indexFile(absPath);
      uploadErrors += stats.uploadErrors;
    }
    process.exit(uploadErrors > 0 ? 1 : 0);
  }

  usage();
  process.exit(1);
}

main().catch((err) => {
  console.error("[lore-index] Fatal error:", err);
  process.exit(1);
});
