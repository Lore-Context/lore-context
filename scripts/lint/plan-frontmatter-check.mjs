#!/usr/bin/env node
/**
 * plan-frontmatter-check.mjs
 *
 * Validates plan files at .omc/plans/vX.Y-plan.md follow plan-template.md.
 *
 * Usage:
 *   node scripts/lint/plan-frontmatter-check.mjs <plan-path>
 *   node scripts/lint/plan-frontmatter-check.mjs --all
 *
 * Reference: .omc/policies/plan-template.md
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_FRONTMATTER_FIELDS = [
  "title",
  "status",
  "authored-by",
  "authored-at",
  "last-updated",
  "external-dependencies",
  "acceptance-criteria-count",
  "linear-task-count",
  "policies-followed",
];

const VALID_STATUSES = new Set(["DRAFT", "LOCKED", "SHIPPED"]);

const REQUIRED_SECTIONS = [
  // accept ## §0 or just ## 0 prefix
  /^##\s*§?0\s+TL;DR/im,
  /^##\s*§?1\s+Reality verification/im,
  /^##\s*§?2\s+Lanes/im,
  /^##\s*§?3\s+Pre-mortem/im,
  /^##\s*§?4\s+Acceptance gate/im,
  /^##\s*§?5\b/im,
  /^##\s*§?6\b/im,
  /^##\s*§?7\b/im,
  /^##\s*§?8\b/im,
];

function extractFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return m[1];
}

function parseSimpleYaml(yaml) {
  // Lightweight YAML — only handles top-level scalars + list items.
  // Sufficient for plan frontmatter validation.
  const obj = {};
  let currentKey = null;
  let currentList = null;
  for (const line of yaml.split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (/^\s+- /.test(line)) {
      if (currentList === null) {
        const fallback = currentKey ?? "_orphan";
        currentList = [];
        obj[fallback] = currentList;
      }
      currentList.push(line.trim().slice(2));
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
    if (m) {
      const [, key, val] = m;
      currentKey = key;
      if (val === "" || val === "[]") {
        obj[key] = val === "[]" ? [] : null;
        currentList = val === "[]" ? null : (obj[key] = []);
      } else {
        obj[key] = val;
        currentList = null;
      }
    }
  }
  return obj;
}

function checkPlan(planPath) {
  if (!existsSync(planPath)) {
    return { ok: false, errors: [`Plan file not found: ${planPath}`] };
  }
  const text = readFileSync(planPath, "utf8");
  const errors = [];
  const warnings = [];

  // 1. Frontmatter present
  const fm = extractFrontmatter(text);
  if (!fm) {
    return {
      ok: false,
      errors: [
        "No YAML frontmatter found. Plans must start with --- ... --- block.",
      ],
    };
  }

  // 2. Required fields present
  const meta = parseSimpleYaml(fm);
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!(field in meta)) {
      errors.push(`Missing required frontmatter field: ${field}`);
    }
  }

  // 3. status valid
  if (meta.status && !VALID_STATUSES.has(meta.status.replace(/['"]/g, ""))) {
    errors.push(
      `frontmatter.status = "${meta.status}", must be one of ${[...VALID_STATUSES].join(", ")}`
    );
  }

  // 4. Required sections present
  for (const re of REQUIRED_SECTIONS) {
    if (!re.test(text)) {
      errors.push(`Missing required section matching: ${re.source}`);
    }
  }

  // 5. Plan must reference policies
  if (
    !Array.isArray(meta["policies-followed"]) ||
    !meta["policies-followed"].some((p) =>
      String(p).includes(".omc/policies/plan-template.md")
    )
  ) {
    errors.push(
      "frontmatter.policies-followed must list .omc/policies/plan-template.md"
    );
  }

  // 6. SHIPPED plans must have non-zero acceptance count
  if (
    meta.status === "SHIPPED" &&
    (Number(meta["acceptance-criteria-count"]) || 0) < 1
  ) {
    warnings.push("SHIPPED plan has acceptance-criteria-count < 1");
  }

  return { ok: errors.length === 0, errors, warnings };
}

function findAllPlans() {
  const dir = join(repoRoot, ".omc/plans");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^v\d+\.\d+/.test(f) && f.endsWith(".md"))
    .map((f) => join(dir, f));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let plans;

  if (args.includes("--all")) {
    plans = findAllPlans();
    if (plans.length === 0) {
      process.stdout.write("[ok] no plan files found; skip\n");
      process.exit(0);
    }
  } else if (args.length >= 1) {
    plans = [resolve(args[0])];
  } else {
    process.stderr.write(
      "Usage: plan-frontmatter-check.mjs <plan-path> | --all\n"
    );
    process.exit(1);
  }

  let exitCode = 0;
  for (const p of plans) {
    process.stdout.write(`\n${p}\n${"─".repeat(60)}\n`);
    const result = checkPlan(p);
    if (result.errors.length > 0) {
      for (const e of result.errors) process.stderr.write(`  [error] ${e}\n`);
      exitCode = 1;
    }
    if (result.warnings && result.warnings.length > 0) {
      for (const w of result.warnings) process.stdout.write(`  [warn] ${w}\n`);
    }
    if (result.ok) {
      process.stdout.write("  [ok] frontmatter + required sections present\n");
    }
  }

  process.exit(exitCode);
}
