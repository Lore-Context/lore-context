#!/usr/bin/env node
// V2.0.5-E1 acceptance: Argon2id derivation time ≥ 500ms on 2024-era laptop CPU.
// Run: `node packages/shared/scripts/argon2-bench.mjs`
// Output: median derivation time + PASS / FAIL verdict.

import argon2 from "argon2";

const PARAMS = {
  type: argon2.argon2id,
  memoryCost: 262144, // 256 MB
  timeCost: 5,
  parallelism: 1,
  hashLength: 32,
  raw: true
};
const TARGET_MS = 500;
const TRIALS = 3;

async function bench() {
  const passphrase = "benchmark-passphrase-of-reasonable-length-12345";
  const salt = Buffer.alloc(16, 0xab);

  // Warm-up trial (JIT / page faults / first allocations)
  await argon2.hash(passphrase, { salt, ...PARAMS });

  const samples = [];
  for (let i = 0; i < TRIALS; i++) {
    const start = performance.now();
    await argon2.hash(passphrase, { salt, ...PARAMS });
    const ms = performance.now() - start;
    samples.push(ms);
    console.log(`trial ${i + 1}/${TRIALS}: ${ms.toFixed(1)} ms`);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const ok = median >= TARGET_MS;
  console.log(
    `\nmedian: ${median.toFixed(1)} ms (target ≥ ${TARGET_MS} ms) — ${ok ? "PASS ✓" : "FAIL ✗"}`
  );
  console.log(
    `params: memoryCost=${PARAMS.memoryCost} KB, timeCost=${PARAMS.timeCost}, parallelism=${PARAMS.parallelism}`
  );
  process.exit(ok ? 0 : 1);
}

bench().catch((err) => {
  console.error("bench failed:", err);
  process.exit(2);
});
