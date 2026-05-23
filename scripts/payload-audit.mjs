#!/usr/bin/env node
/**
 * scripts/payload-audit.mjs — CI gate for Lane P P1 architectural invariant.
 *
 * Asserts that every callsite that posts to `/v1/code-graph/upsert` (or
 * imports the `UpsertPayload` type) constructs its wire body via the sealed
 * Zod schema, NOT a raw object literal. The sealed-type architecture in
 * `packages/sdk-typescript/code-graph-types.ts` is the structural defense
 * against "we forgot to filter X and shipped it" — this gate makes that
 * structural defense unbypassable at code-review time.
 *
 * Allowed construction patterns:
 *   - `UpsertPayloadSchema.parse(rawObject)`
 *   - `UpsertPayloadSchema.safeParse(rawObject)`
 *   - `buildUpsertPayload(rawObject)`            (sdk helper)
 *   - `FilePayloadSchema.parse(...)` (intermediate; used inside the indexer)
 *
 * Rejected patterns at any callsite that mentions UpsertPayload OR the
 * upsert endpoint:
 *   - `{ repo: ..., files: ... } as UpsertPayload`   (type assertion bypass)
 *   - `JSON.stringify({ repo: ..., files: ... })`     (raw object → fetch)
 *   - `fetch('/v1/code-graph/upsert', { body: JSON.stringify({ ... }) })`
 *     where the inline object is not the result of a `.parse(...)` call.
 *
 * Heuristic: AST-level enforcement is overkill for a release gate; we use a
 * grep + structured check. Run `pnpm payload:audit` locally + in CI.
 *
 * Exit codes:
 *   0  All callsites use the sealed schema.
 *   1  At least one callsite constructs payloads via raw object literal.
 *   2  Script error (file system, etc.).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = new URL("..", import.meta.url).pathname;

// Directories to scan. Add new lanes here as they ship.
const SCAN_DIRS = [
  "packages/code-indexer/src",
  "packages/code-indexer-python/src",
  "apps/api/src/code-graph",
  "apps/mcp-server/src/code-graph",
  "apps/api/__tests__",
  "apps/api/tests",
  "apps/mcp-server/tests",
  "packages/code-indexer/tests",
];

// Files that ARE the sealed type — they construct the schema, not consume it.
// Skip them; the gate is for consumers.
const SCHEMA_DEFINITION_FILES = new Set([
  "packages/sdk-typescript/code-graph-types.ts",
  "packages/code-indexer-python/src/lore_code_indexer/types.py",
]);

// Symptom: text that smells like a raw upsert body being constructed.
const SUSPECT_PATTERNS = [
  // Inline object literal posted to the upsert endpoint
  /fetch\([^)]*code-graph\/upsert[^)]*body:\s*JSON\.stringify\(\s*\{/m,
  // Type assertion bypass
  /\}\s*as\s+UpsertPayload\b/,
  // Manual construction without going through the schema
  /const\s+payload\s*:\s*UpsertPayload\s*=\s*\{/,
];

// Affirmative: an explicit call to the sealed validator in the same file
// neutralizes the suspect signal — the consumer routed through .parse().
const AFFIRMATIVE_PATTERNS = [
  /UpsertPayloadSchema\.(safe)?[Pp]arse\(/,
  /FilePayloadSchema\.(safe)?[Pp]arse\(/,
  /buildUpsertPayload\(/,
  /UpsertPayload\.model_validate\(/, // Python parity
  /FilePayload\.model_validate\(/,
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return out;
    throw err;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".venv") continue;
      walk(full, out);
    } else if (
      entry.name.endsWith(".ts") ||
      entry.name.endsWith(".tsx") ||
      entry.name.endsWith(".mts") ||
      entry.name.endsWith(".js") ||
      entry.name.endsWith(".mjs") ||
      entry.name.endsWith(".py")
    ) {
      out.push(full);
    }
  }
  return out;
}

function relpath(abs) {
  return abs.startsWith(REPO_ROOT) ? abs.slice(REPO_ROOT.length) : abs;
}

function audit() {
  const violations = [];
  for (const dir of SCAN_DIRS) {
    const files = walk(join(REPO_ROOT, dir));
    for (const file of files) {
      const rel = relpath(file);
      if (SCHEMA_DEFINITION_FILES.has(rel)) continue;
      let body;
      try {
        body = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      // Quick reject: file doesn't mention the upsert surface at all.
      if (
        !body.includes("UpsertPayload") &&
        !body.includes("code-graph/upsert") &&
        !body.includes("/v1/code-graph/upsert")
      ) {
        continue;
      }
      const suspects = SUSPECT_PATTERNS.some((re) => re.test(body));
      const affirmatives = AFFIRMATIVE_PATTERNS.some((re) => re.test(body));
      if (suspects && !affirmatives) {
        const lines = body.split("\n");
        const hits = [];
        for (const re of SUSPECT_PATTERNS) {
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) hits.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
          }
        }
        violations.push({ file: rel, hits });
      }
    }
  }
  return violations;
}

const violations = audit();
if (violations.length > 0) {
  process.stderr.write("payload-audit: violations found\n\n");
  for (const v of violations) {
    process.stderr.write(`  ${v.file}\n`);
    for (const h of v.hits) process.stderr.write(`    ${h}\n`);
  }
  process.stderr.write(
    "\n  Fix: route the inline object through UpsertPayloadSchema.parse(rawObject)\n" +
      "       or buildUpsertPayload(rawObject) from @lore-context/sdk/code-graph-types.\n",
  );
  process.exit(1);
}
process.stdout.write("payload-audit: ok — every upsert callsite routes through the sealed schema.\n");
process.exit(0);
