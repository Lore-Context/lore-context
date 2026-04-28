import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, "src", "index.html"), "utf8");

const required = [
  "Lore Context",
  "The control plane for AI-agent memory, eval, and governance.",
  "Context Ledger",
  "used_in_response",
  "stale_score",
  "Recall@5",
  "Agents remember. Teams need proof.",
  "MCP clients",
  "Memory Eval Playground",
  "Private Deployment",
  "pnpm seed:demo && pnpm smoke:dashboard",
  "prefers-reduced-motion"
];

const failures = [];

for (const text of required) {
  if (!html.includes(text)) {
    failures.push(`Missing required text: ${text}`);
  }
}

if (/<script\s+[^>]*src=/i.test(html)) {
  failures.push("Website must not load external script files.");
}

if (/<link\s+[^>]*href=["']https?:/i.test(html) || /<script[\s\S]*https?:/i.test(html)) {
  failures.push("Website must not depend on remote assets.");
}

if (!/class="ledger-row active"/.test(html)) {
  failures.push("Hero should expose an active ledger row for evidence motion.");
}

if (!/@keyframes\s+ledgerScan/.test(html) || !/@keyframes\s+nodePulse/.test(html)) {
  failures.push("Expected subtle evidence-processing motion keyframes.");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Website design verification passed.");
