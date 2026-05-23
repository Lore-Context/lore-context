/**
 * Git hook utilities — shared logic for generating and validating the
 * post-commit hook script content.
 *
 * The actual installation lives in src/cli/install-git-hook.ts.
 */

/** The hook script body written to .git/hooks/post-commit. */
export function postCommitHookScript(loreIndexBin: string): string {
  return `#!/bin/sh
# Lore Context — post-commit hook (installed by \`lore-index install-git-hook\`)
# Runs incremental indexing after each commit.
# To uninstall: rm .git/hooks/post-commit
set -e
${JSON.stringify(loreIndexBin)} --incremental
`;
}

/** Sentinel comment used to detect whether Lore installed this hook. */
export const LORE_HOOK_SENTINEL = "Lore Context — post-commit hook";
