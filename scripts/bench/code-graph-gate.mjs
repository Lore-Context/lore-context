#!/usr/bin/env node
/**
 * scripts/bench/code-graph-gate.mjs — Lane Q orchestrator
 *
 * Runs all code-graph bench gates when invoked. This is a NEW file because
 * scripts/run-v13-gate.mjs integrates with the eval harness (packages/eval) which
 * has a different architecture and adding --gate code-graph would require modifying
 * its internal runV13Ablation pipeline. Instead, this standalone orchestrator
 * runs the three code-graph bench scripts independently.
 *
 * Invoked via:
 *   node scripts/bench/code-graph-gate.mjs [--bench indexing|storage-growth|search-latency] [--allow-deferred]
 *   pnpm bench:v13:gate -- --gate code-graph  (if root package.json wires to this)
 *
 * Note on run-v13-gate.mjs compatibility:
 *   run-v13-gate.mjs builds its gate report from runV13Ablation() in packages/eval.
 *   It does not have a --gate flag interface. Adding --gate code-graph there would
 *   require changes to the eval package (Lane Q territory would overlap with Lane K).
 *   This separate orchestrator is cleaner and does not modify v2.0.2/v2.0.3 files.
 *
 * Reference: v2.0.4-plan.md §2 Lane Q
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    bench: { type: "string", default: "all" },
    "num-symbols": { type: "string", default: "1000" },
    "allow-deferred": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
  strict: false,
});

if (values["help"]) {
  console.log(`
code-graph-gate.mjs — Lane Q code-graph bench orchestrator

Usage:
  node scripts/bench/code-graph-gate.mjs [--bench <gate>] [--num-symbols N]

Gates:
  all              Run all three benches (default)
  indexing         Q1: indexing bench (requires packages/code-indexer built)
  storage-growth   Q2: storage growth bench
  search-latency   Q3: search latency bench (requires running API server — stub mode otherwise)

Options:
  --num-symbols N     Number of symbols for storage bench (default: 1000)
  --allow-deferred    Local-only escape hatch for missing bench scripts or seeded fixtures

Note: This is the standalone code-graph gate orchestrator.
      scripts/run-v13-gate.mjs orchestrates the v1.3 eval harness (separate pipeline).
      The two are independent — run-v13-gate.mjs does not have a --gate code-graph interface.
`.trim());
  process.exit(0);
}

const benchTarget = values["bench"] ?? "all";
const numSymbols = values["num-symbols"] ?? "1000";
const allowDeferred = values["allow-deferred"] === true || process.env.LORE_BENCH_ALLOW_DEFERRED === "1";

// ---------------------------------------------------------------------------
// Gate runners
// ---------------------------------------------------------------------------

function run(label, args, cwd = ROOT) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[code-graph-gate] Running: ${label}`);
  console.log(`  Command: node ${args.join(" ")}`);
  console.log(`${"=".repeat(60)}`);

  const result = spawnSync("node", args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env },
  });

  if (result.status !== 0) {
    console.error(`[FAIL] ${label} exited with status ${result.status ?? "signal"}`);
    return false;
  }
  console.log(`[PASS] ${label}`);
  return true;
}

const results = [];

// Q1: Indexing bench
if (benchTarget === "all" || benchTarget === "indexing") {
  const indexerScript = join(ROOT, "packages/code-indexer/scripts/bench-full-index.mjs");
  if (!existsSync(indexerScript)) {
    console.warn(`[Q1 ⏸ DEFERRED] ${indexerScript} does not exist yet. Q1 bench deferred.`);
    results.push({ gate: "Q1 indexing", status: "DEFERRED" });
  } else {
    const pass = run(
      "Q1: indexing bench (≤45s on 700-file TS corpus)",
      [indexerScript, "--corpus", join(ROOT, "apps/api/src"), "--max-ms", "45000"]
    );
    results.push({ gate: "Q1 indexing", status: pass ? "PASS" : "FAIL" });
  }
}

// Q2: Storage growth bench
if (benchTarget === "all" || benchTarget === "storage-growth") {
  const storageScript = join(__dirname, "code-storage-growth.mjs");
  const pass = run(
    `Q2: storage growth bench (≤6 KB/symbol, ${numSymbols} symbols)`,
    [storageScript, "--num-symbols", numSymbols]
  );
  results.push({ gate: "Q2 storage-growth", status: pass ? "PASS" : "FAIL" });
}

// Q3: Search latency bench
if (benchTarget === "all" || benchTarget === "search-latency") {
  const latencyScript = join(__dirname, "code-search-latency.mjs");
  if (!existsSync(latencyScript)) {
    console.warn(`[Q3 ⏸ DEFERRED] ${latencyScript} does not exist yet. Q3 bench deferred.`);
    results.push({ gate: "Q3 search-latency", status: "DEFERRED" });
  } else {
    const pass = run(
      "Q3: code.search p95 latency (≤150ms on 50k-symbol vault)",
      [latencyScript]
    );
    results.push({ gate: "Q3 search-latency", status: pass ? "PASS" : "FAIL" });
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${"=".repeat(60)}`);
console.log(`[code-graph-gate] Gate Summary`);
console.log(`${"=".repeat(60)}`);
for (const r of results) {
  const icon = r.status === "PASS" ? "✓" : r.status === "DEFERRED" ? "⏸" : "✗";
  console.log(`  ${icon} ${r.gate}: ${r.status}`);
}

const failures = results.filter(r => r.status === "FAIL");
const deferred = results.filter(r => r.status === "DEFERRED");

if (deferred.length > 0) {
  console.log(`\n  ${deferred.length} gate(s) deferred (benches not yet implemented). See notes above.`);
  if (!allowDeferred) {
    console.error(`[FAIL] Deferred gates are not allowed by default: ${deferred.map(r => r.gate).join(", ")}. Use --allow-deferred only for local exploratory runs.`);
    process.exit(1);
  }
}

if (failures.length > 0) {
  console.error(`\n[FAIL] ${failures.length} gate(s) failed: ${failures.map(r => r.gate).join(", ")}`);
  process.exit(1);
}

console.log(`\n[PASS] All available code-graph gates passed.`);
process.exit(0);
