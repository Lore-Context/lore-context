/**
 * Lane B verification: no MCP/hook/adapter/vector/embedding terminology
 * in default user-facing copy of the dashboard and seed demo.
 *
 * "Default UX" means: fixture strings rendered in the default onboarding
 * flow, agent connection display, source display, and demo seed content.
 * Internal TypeScript types, API endpoint paths, eval provider IDs, and
 * advanced-view labels are exempt (they are not ordinary-user-visible copy).
 *
 * Run: node scripts/check-default-ux-terms.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Patterns that must not appear in default-user-facing fixture strings.
// Each entry: [regex, description, exemptPatterns]
const forbiddenPatterns = [
  [/\bMCP\b/g, "MCP (should be 'AI app connection' in default copy)"],
  [/\bhook\b/gi, "hook (should be 'source capture' in default copy)"],
  [/\badapter\b/gi, "adapter (should be hidden from default UX)"],
  [/\bvector\b/gi, "vector (should be hidden from default UX)"],
  [/\bembedding\b/gi, "embedding (should be hidden from default UX)"],
  [/\bmodel setup\b/gi, "model setup (must never appear in normal user flow)"],
  [/\blocal model\b/gi, "local model (must not appear in default user onboarding)"],
];

// Sections of page.tsx that are USER-VISIBLE defaults (fixture data).
// We extract the cloudFixture object and defaultDataset string for checking.
const dashboardPath = join(repoRoot, "apps/dashboard/app/page.tsx");
const seedDemoPath = join(repoRoot, "scripts/seed-demo.mjs");

const failures = [];

function checkSection(label, text, exemptLinePatterns = []) {
  for (const [pattern, description] of forbiddenPatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      // Find the line containing the match for context
      const before = text.slice(0, match.index);
      const lineNum = before.split("\n").length;
      const line = text.split("\n")[lineNum - 1].trim();

      // Skip lines that are internal types, API paths, or eval provider IDs
      if (isExemptLine(line)) continue;

      failures.push(`[${label}:${lineNum}] ${description}\n  → ${line}`);
    }
  }
}

function isExemptLine(line) {
  // TypeScript type/interface declarations
  if (/^\s*(type|interface)\s/.test(line)) return true;
  // API endpoint paths (string literals with /v1/)
  if (/["'`]\/v1\/.*agentmemory/.test(line)) return true;
  // Eval provider array identifiers (backend IDs, not display labels)
  if (/evalProviders|defaultProviders/.test(line)) return true;
  // State variable declarations and destructuring
  if (/const \[.*agentmemory|agentmemory:/.test(line)) return true;
  // Import statements
  if (/^import\s/.test(line)) return true;
  // requestJson calls (API endpoint strings)
  if (/requestJson\(.*agentmemory/.test(line)) return true;
  // seed-demo eval provider array
  if (/const providers\s*=/.test(line)) return true;
  // setData calls (state assignment from API)
  if (/setData\(|agentmemory:.*agentmemory/.test(line)) return true;
  // Variable declarations for agentmemory health fetch result
  if (/agentmemory\s*=\s*await/.test(line)) return true;
  return false;
}

// Extract user-visible fixture strings from page.tsx.
// We check the cloudFixture object literal and the defaultDataset string.
const dashboardSource = readFileSync(dashboardPath, "utf8");

// Extract from cloudFixture block (from "const cloudFixture = {" to "export default function")
const cloudFixtureMatch = dashboardSource.match(/const cloudFixture\s*=\s*\{([\s\S]*?)\};\s*\nexport default function/);
if (cloudFixtureMatch) {
  checkSection("dashboard:cloudFixture", cloudFixtureMatch[1]);
} else {
  failures.push("[dashboard] Could not locate cloudFixture block for scanning.");
}

// Extract defaultDataset string
const defaultDatasetMatch = dashboardSource.match(/const defaultDataset\s*=\s*JSON\.stringify\(([\s\S]*?),\s*null,\s*2\)/);
if (defaultDatasetMatch) {
  checkSection("dashboard:defaultDataset", defaultDatasetMatch[1]);
} else {
  failures.push("[dashboard] Could not locate defaultDataset block for scanning.");
}

// Check seed-demo fallbackMemories and fallbackDataset content
const seedSource = readFileSync(seedDemoPath, "utf8");
const fallbackMemoriesMatch = seedSource.match(/const fallbackMemories\s*=\s*\[([\s\S]*?)\];/);
if (fallbackMemoriesMatch) {
  checkSection("seed-demo:fallbackMemories", fallbackMemoriesMatch[1]);
} else {
  failures.push("[seed-demo] Could not locate fallbackMemories for scanning.");
}

const fallbackDatasetMatch = seedSource.match(/const fallbackDataset\s*=\s*\{([\s\S]*?)\};[\s\n]*const memories/);
if (fallbackDatasetMatch) {
  checkSection("seed-demo:fallbackDataset", fallbackDatasetMatch[1]);
} else {
  failures.push("[seed-demo] Could not locate fallbackDataset for scanning.");
}

if (failures.length > 0) {
  console.error("Default UX terminology check FAILED:\n");
  for (const failure of failures) {
    console.error(`  ✗ ${failure}`);
  }
  console.error(`\n${failures.length} violation(s) found. Replace technical terms with user-friendly language.`);
  process.exit(1);
}

console.log("Default UX terminology check passed. No MCP/hook/adapter/vector/embedding in default user-facing copy.");
