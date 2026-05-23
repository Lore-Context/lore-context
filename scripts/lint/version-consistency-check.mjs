#!/usr/bin/env node
/**
 * version-consistency-check.mjs
 *
 * Enforces release invariant §1.1: git tag = apps/api/package.json.version.
 *
 * Modes:
 *   --pr-mode (default in CI): If PR title or branch matches /vX\.Y\.0-beta/,
 *     validate apps/api/package.json.version equals the captured version.
 *   --tag <vX.Y.0-beta>: Validate explicit tag against package.json.
 *
 * Exit 0: pass. Exit 1: fail.
 *
 * Why: v1.5 + v1.6 both shipped without bumping package.json. /openapi.json
 * reported the previous version. External auditors concluded production was
 * running the older version. This is the permanent fix.
 *
 * Reference: .omc/policies/release-invariants.md §1.1
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const TAG_PATTERN = /^v(\d+)\.(\d+)\.\d+(-(?:beta|rc\.\d+|alpha))?$/;

function parseArgs(argv) {
  const args = { mode: "pr", tag: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--pr-mode") args.mode = "pr";
    else if (argv[i] === "--tag" && argv[i + 1]) {
      args.mode = "tag";
      args.tag = argv[++i];
    }
  }
  return args;
}

function getPackageVersion(pkgPath) {
  if (!existsSync(pkgPath)) {
    throw new Error(`package.json not found: ${pkgPath}`);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (!pkg.version) throw new Error(`No version field in ${pkgPath}`);
  return pkg.version;
}

function inferVersionFromContext() {
  // CI provides GITHUB_REF for tag pushes, GITHUB_HEAD_REF for PRs
  const ref = process.env.GITHUB_REF ?? "";
  const headRef = process.env.GITHUB_HEAD_REF ?? "";
  const prTitle = process.env.PR_TITLE ?? "";

  // Tag push: refs/tags/vX.Y.Z
  if (ref.startsWith("refs/tags/")) {
    const tag = ref.slice("refs/tags/".length);
    if (TAG_PATTERN.test(tag)) return { source: "tag", value: tag };
  }

  // Branch name like release/vX.Y.0-beta
  const branchMatch = headRef.match(/release\/(v[\d.]+(?:-[\w.]+)?)/);
  if (branchMatch) return { source: "branch", value: branchMatch[1] };

  // PR title containing «v1.7.0-beta» style
  const titleMatch = prTitle.match(/(v\d+\.\d+\.\d+(?:-[\w.]+)?)/);
  if (titleMatch) return { source: "pr-title", value: titleMatch[1] };

  return null;
}

function check({ mode, tag }) {
  const apiPkg = join(repoRoot, "apps/api/package.json");
  const rootPkg = join(repoRoot, "package.json");

  let target;
  if (mode === "tag") {
    target = { source: "explicit-tag", value: tag };
  } else {
    target = inferVersionFromContext();
    if (!target) {
      process.stdout.write(
        "[ok] version-consistency: no tag/release context detected; skipping check\n"
      );
      return 0;
    }
  }

  process.stdout.write(`Checking against ${target.source}=${target.value}\n`);

  // Strip leading «v» from target
  const expected = target.value.startsWith("v") ? target.value.slice(1) : target.value;

  const apiVer = getPackageVersion(apiPkg);
  const rootVer = existsSync(rootPkg) ? getPackageVersion(rootPkg) : null;

  process.stdout.write(`apps/api/package.json:    ${apiVer}\n`);
  if (rootVer) process.stdout.write(`package.json (root):      ${rootVer}\n`);

  const failures = [];
  if (apiVer !== expected) {
    failures.push(
      `apps/api/package.json.version = "${apiVer}", expected "${expected}"`
    );
  }
  if (rootVer && rootVer !== expected) {
    failures.push(
      `package.json (root).version = "${rootVer}", expected "${expected}"`
    );
  }

  if (failures.length === 0) {
    process.stdout.write(`[ok] version-consistency: ${expected} matches\n`);
    return 0;
  }

  process.stderr.write(
    `[fail] version-consistency check (release-invariants.md §1.1):\n`
  );
  for (const f of failures) process.stderr.write(`  - ${f}\n`);
  process.stderr.write(
    `\nFix: bump version field(s) to ${expected}, then re-push or re-tag.\n` +
      `Tip: cd apps/api && npm version --no-git-tag-version ${expected}\n`
  );
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  process.exit(check(args));
}
