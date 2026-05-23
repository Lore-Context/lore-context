#!/usr/bin/env node
/**
 * K4 bench: simulate a burst of file changes and verify the watcher coalesces
 * them into ≤3 callbacks/s within --max-upload-latency-ms.
 *
 * Usage:
 *   node packages/code-indexer/scripts/bench-watcher.mjs \
 *     --file-change-burst 1 \
 *     --max-upload-latency-ms 2000
 */

import { tmpdir } from "node:os";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const burstMultiplier = parseInt(getArg("--file-change-burst") ?? "1", 10);
const maxLatencyMs = parseInt(getArg("--max-upload-latency-ms") ?? "2000", 10);

// 10 changes per burst * multiplier
const CHANGES_PER_BURST = 10 * burstMultiplier;
const BURST_WINDOW_MS = 1000; // all changes happen within 1s

const pkgDir = resolve(new URL(import.meta.url).pathname, "../../");
const distWatcher = resolve(pkgDir, "dist/watcher.js");

let FileWatcher;
try {
  const mod = await import(distWatcher);
  FileWatcher = mod.FileWatcher;
} catch (err) {
  console.error(`[bench-watcher] Could not import dist/watcher.js: ${err.message}`);
  console.error("Run `pnpm --filter @lore-context/code-indexer build` first.");
  process.exit(1);
}

// Create a temp dir for the watcher
const tmpDir = join(tmpdir(), `lore-bench-watcher-${Date.now()}`);
mkdirSync(tmpDir, { recursive: true });

let batchCallCount = 0;
let firstBatchAt = 0;
let lastBatchAt = 0;
const allBatchTimes = [];

const watcher = new FileWatcher({
  rootDir: tmpDir,
  debounceMs: 500,
  minFlushIntervalMs: 333,
  onBatch: (paths) => {
    const now = Date.now();
    batchCallCount++;
    if (firstBatchAt === 0) firstBatchAt = now;
    lastBatchAt = now;
    allBatchTimes.push(now);
    console.error(`[bench-watcher] batch #${batchCallCount}: ${paths.length} files at t=${now - startAt}ms`);
  },
});

watcher.start();
const startAt = Date.now();

// Trigger CHANGES_PER_BURST file changes within BURST_WINDOW_MS
for (let i = 0; i < CHANGES_PER_BURST; i++) {
  const delay = Math.floor((i / CHANGES_PER_BURST) * BURST_WINDOW_MS);
  setTimeout(() => {
    writeFileSync(join(tmpDir, `test-${i}.ts`), `export const x${i} = ${i};\n`);
  }, delay);
}

// Wait long enough for all callbacks to fire
const waitMs = BURST_WINDOW_MS + maxLatencyMs + 1000;
await new Promise((resolve) => setTimeout(resolve, waitMs));

watcher.stop();

// Cleanup
try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }

const elapsed = Date.now() - startAt;
console.error(`[bench-watcher] Total elapsed: ${elapsed}ms`);
console.error(`[bench-watcher] Total batch calls: ${batchCallCount}`);

// Verify: within any 1-second window, ≤3 calls
let maxCallsPerSecond = 0;
for (let i = 0; i < allBatchTimes.length; i++) {
  const windowStart = allBatchTimes[i];
  const callsInWindow = allBatchTimes.filter(
    (t) => t >= windowStart && t < windowStart + 1000
  ).length;
  if (callsInWindow > maxCallsPerSecond) maxCallsPerSecond = callsInWindow;
}

console.error(`[bench-watcher] Max batch calls/s: ${maxCallsPerSecond}`);

if (maxCallsPerSecond > 3) {
  console.error(`[bench-watcher] FAIL: ${maxCallsPerSecond} calls/s > 3 calls/s limit`);
  process.exit(1);
}

if (batchCallCount === 0) {
  console.error("[bench-watcher] FAIL: no batch callbacks fired (watcher may not be working)");
  process.exit(1);
}

// Verify latency: last batch fired within maxLatencyMs of last file change
const lastFileChangeAt = startAt + BURST_WINDOW_MS;
const latency = lastBatchAt - lastFileChangeAt;
console.error(`[bench-watcher] Upload latency (last batch - last change): ${latency}ms`);

if (latency > maxLatencyMs) {
  console.error(`[bench-watcher] FAIL: latency ${latency}ms > ${maxLatencyMs}ms`);
  process.exit(1);
}

console.error(`[bench-watcher] PASS`);
process.exit(0);
