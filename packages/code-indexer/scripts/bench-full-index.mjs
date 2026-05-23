#!/usr/bin/env node
/**
 * K3/U4 bench: run indexFull() against --corpus <path> and exit non-zero
 * if elapsed ms exceeds --max-ms <n>.
 *
 * Usage:
 *   node packages/code-indexer/scripts/bench-full-index.mjs \
 *     --corpus apps/api/src \
 *     --max-ms 60000
 *
 * The script records actual elapsed ms to stderr and only fails if --max-ms is exceeded.
 * On a local dev Mac, 60s is a ceiling; on CI (Ubuntu 4vCPU/16GB) this is the gate.
 */

import { createRequire } from "node:module";
import { resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const corpusRaw = getArg("--corpus");
const maxMsRaw = getArg("--max-ms");

if (!corpusRaw) {
  console.error("Usage: bench-full-index.mjs --corpus <path> [--max-ms <ms>]");
  process.exit(1);
}

const corpusPath = resolve(process.cwd(), corpusRaw);
const maxMs = maxMsRaw ? parseInt(maxMsRaw, 10) : null;

// Count files in corpus for reporting
function countFiles(dir) {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
        count += countFiles(resolve(dir, entry.name));
      } else if (entry.isFile()) {
        count++;
      }
    }
  } catch {
    // ignore
  }
  return count;
}

const fileCount = countFiles(corpusPath);
console.error(`[bench-full-index] Corpus: ${corpusPath} (${fileCount} files)`);
console.error(`[bench-full-index] Max-ms ceiling: ${maxMs ?? "none"}`);

// Import the built indexer (dist/indexer.js)
// When running from source in CI, we expect the package to be built first.
const pkgDir = resolve(new URL(import.meta.url).pathname, "../../");
const distIndexer = resolve(pkgDir, "dist/indexer.js");

let indexFull;
try {
  const mod = await import(distIndexer);
  indexFull = mod.indexFull;
} catch (err) {
  console.error(`[bench-full-index] Could not import dist/indexer.js: ${err.message}`);
  console.error("Run `pnpm --filter @lore-context/code-indexer build` first.");
  process.exit(1);
}

// Stub uploader (no real API in bench mode) — override fetch globally
globalThis.fetch = async (_url, _opts) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
    text: async () => "ok",
    headers: { get: () => null },
  };
};

const start = Date.now();
try {
  const stats = await indexFull({
    repoPath: corpusPath,
    repoName: "bench-corpus",
    apiBaseUrl: "http://localhost:0",  // stubbed
    authToken: "bench-token",
    vaultId: "bench-vault",
  });

  const elapsed = Date.now() - start;
  console.error(`[bench-full-index] Elapsed: ${elapsed}ms`);
  console.error(`[bench-full-index] Stats: ${JSON.stringify(stats)}`);

  if (maxMs !== null && elapsed > maxMs) {
    console.error(`[bench-full-index] FAIL: ${elapsed}ms > ${maxMs}ms ceiling`);
    process.exit(1);
  }

  console.error(`[bench-full-index] PASS: ${elapsed}ms${maxMs !== null ? ` <= ${maxMs}ms` : ""}`);
  process.exit(0);
} catch (err) {
  const elapsed = Date.now() - start;
  console.error(`[bench-full-index] ERROR after ${elapsed}ms: ${err.message}`);
  process.exit(1);
}
