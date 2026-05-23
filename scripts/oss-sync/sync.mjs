#!/usr/bin/env node
/**
 * scripts/oss-sync/sync.mjs
 *
 * Stages Lore Context OSS-eligible code into a clean tree declared by
 * `scripts/oss-sync/config.json` for review before pushing to the public
 * `Lore-Context/lore-context` repository.
 *
 * Reads `scripts/oss-sync/config.json` for the OSS whitelist + commercial
 * blacklist + scrub patterns. Writes a deterministic file list and a
 * MANIFEST.md describing every staged file with its source path.
 *
 * Usage:
 *   node scripts/oss-sync/sync.mjs --dry-run    (default; prints plan)
 *   node scripts/oss-sync/sync.mjs              (writes to stage dir)
 *
 * Constraint: this script never invokes git push. The actual public-repo
 * push is an operator-controlled step after the staged tree is reviewed.
 *
 * Reference: docs/oss-vs-commercial-boundary.md
 * Plan: .omx/plans/lore-context-oss-v2.1-upgrade-plan.md
 */

import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, rmSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../..");
const CONFIG_PATH = join(SCRIPT_DIR, "config.json");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || !args.includes("--apply");

function loadConfig() {
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  const cfg = JSON.parse(raw);
  if (!cfg.ossPaths || !Array.isArray(cfg.ossPaths)) {
    throw new Error("config.json must contain ossPaths array");
  }
  if (!cfg.excludePaths || !Array.isArray(cfg.excludePaths)) {
    throw new Error("config.json must contain excludePaths array");
  }
  return cfg;
}

function isPathExcluded(relPath, excludePaths) {
  for (const ex of excludePaths) {
    const exNorm = ex.replace(/\/$/, "");
    if (relPath === exNorm) return true;
    if (relPath.startsWith(exNorm + "/")) return true;
    // Glob-ish for .env*
    if (ex.endsWith("*") && relPath.startsWith(ex.slice(0, -1))) return true;
  }
  return false;
}

function walkDir(absDir, repoRoot, excludePaths, out) {
  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const absChild = join(absDir, entry.name);
    const relChild = relative(repoRoot, absChild);
    if (isPathExcluded(relChild, excludePaths)) continue;
    if (entry.isDirectory()) {
      // Skip node_modules and dist always
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".turbo") continue;
      walkDir(absChild, repoRoot, excludePaths, out);
    } else if (entry.isFile()) {
      out.push(relChild);
    }
  }
}

function expandOssPath(relPath, repoRoot, excludePaths) {
  const abs = join(repoRoot, relPath);
  if (!existsSync(abs)) {
    return { resolved: [], missing: [relPath] };
  }
  const st = statSync(abs);
  if (st.isFile()) {
    if (isPathExcluded(relPath, excludePaths)) return { resolved: [], missing: [] };
    return { resolved: [relPath], missing: [] };
  }
  if (st.isDirectory()) {
    const out = [];
    walkDir(abs, repoRoot, excludePaths, out);
    return { resolved: out, missing: [] };
  }
  return { resolved: [], missing: [relPath] };
}

function applyScrubs(content, patterns, replacement) {
  let out = content;
  for (const pat of patterns) {
    const re = new RegExp(pat, "g");
    out = out.replace(re, replacement);
  }
  return out;
}

function applyOssTransforms(relPath, content) {
  let out = content;

  if (relPath === "package.json") {
    const pkg = JSON.parse(out);
    const closedScripts = [
      "release:build",
      "release:manifest",
      "release:preflight",
      "release:verify",
      "release:prod",
      "release:staging",
      "release:rollback",
      "release:smoke:prod",
      "release:smoke:v11",
      "release:verify:v11",
      "verify:release",
      "smoke:hosted-mcp",
      "doctor:v12:smoke",
      "smoke:rc1-guardrails",
      "smoke:rc2-lane-e",
      "verify:rc1-performance",
      "ops:doctor",
      "ops:doctor:remote",
      "ops:runbook",
      "ops:test"
    ];
    for (const scriptName of closedScripts) {
      delete pkg.scripts?.[scriptName];
    }
    out = `${JSON.stringify(pkg, null, 2)}\n`;
  }

  if (relPath === ".github/workflows/ci.yml") {
    out = out.replace(/\n      - name: Workflow Doctor\n        run: pnpm ops:doctor\n\n      - name: v13 Release Gate[\s\S]*$/m, "\n");
  }

  if (relPath === "apps/mcp-server/src/index.ts") {
    out = out.replace(
      `import {\n  dispatchSecretToolCall,\n  getSecretToolDefinitions,\n  isSecretToolName,\n  isSecretVaultBetaEnabled,\n  SecretToolError,\n  type ClientInfo\n} from "./secrets/index.js";\n`,
      ""
    );
    out = out.replace(
      `const DEFAULT_UPSTREAM_USER_AGENT = "LoreMCP/2.1 (+https://lorecontext.com)";\n`,
      `const DEFAULT_UPSTREAM_USER_AGENT = "LoreMCP/2.1 (+https://lorecontext.com)";\n\nexport interface ClientInfo {\n  name: string;\n  version?: string;\n}\n`
    );
    out = out.replace(
      `function protocolToolDefinitions(options: McpToolOptions = {}): Array<ReturnType<typeof toMcpTool>> {\n  const baseTools = getMcpToolDefinitions({ includeAdvanced: options.includeAdvanced }).map(toMcpTool);\n  const secretTools = getSecretToolDefinitions().map((tool) => ({\n    name: tool.name,\n    description: tool.description,\n    inputSchema: tool.inputSchema,\n    annotations: {\n      readOnlyHint: tool.name === "secret.list" || tool.name === "secret.audit_log" || tool.name === "secret.get",\n      destructiveHint: tool.name === "secret.revoke"\n    }\n  }));\n  return [...baseTools, ...secretTools];\n}\n`,
      `function protocolToolDefinitions(options: McpToolOptions = {}): Array<ReturnType<typeof toMcpTool>> {\n  return getMcpToolDefinitions({ includeAdvanced: options.includeAdvanced }).map(toMcpTool);\n}\n`
    );
    out = out.replace(
      `\n  // V2.0.5 Lane M: route secret.* family to the dedicated dispatcher.\n  // When LORE_FLAG_SECRET_VAULT_BETA!=1, dispatchSecretToolCall throws\n  // tool_not_found, matching the shape of an unknown tool.\n  if (typeof name === "string" && isSecretToolName(name)) {\n    if (!isSecretVaultBetaEnabled()) {\n      throw new ProtocolError(-32602, "Unknown Lore MCP tool");\n    }\n    const rawArgs = isObject(params.arguments) ? params.arguments : {};\n    try {\n      const payload = await dispatchSecretToolCall(name, rawArgs as Record<string, unknown>, {\n        baseUrl: normalizeBaseUrl(options.apiBaseUrl ?? process.env.LORE_API_URL ?? "http://127.0.0.1:3000"),\n        apiKey: options.apiKey ?? process.env.LORE_API_KEY,\n        secretSessionToken: options.secretSessionToken ?? process.env.LORE_SECRET_SESSION_TOKEN,\n        fetchImpl: options.fetchImpl ?? fetch,\n        clientInfo: options.clientInfo ?? lastSeenClientInfo\n      });\n      return {\n        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],\n        structuredContent: payload as Record<string, unknown>\n      };\n    } catch (error) {\n      if (error instanceof SecretToolError) {\n        return {\n          content: [{ type: "text", text: error.message }],\n          structuredContent: { error: { code: error.code, message: error.message } },\n          isError: true\n        };\n      }\n      return {\n        content: [{ type: "text", text: error instanceof Error ? error.message : "secret tool call failed" }],\n        structuredContent: { error: errorToData(error) },\n        isError: true\n      };\n    }\n  }\n`,
      ""
    );
  }

  if (relPath === "apps/mcp-server/tests/index.test.ts") {
    out = out.replace(`import { __resetDeviceIdentityCacheForTests } from "../src/secrets/agent-context.js";\n`, "");
    out = out.replace(
      /\n  it\("uses the hosted request client name for secret tool calls", async \(\) => \{[\s\S]*?\n  \}\);\n\n  it\("relays stdio JSON-RPC to hosted MCP when configured"/,
      `\n  it("relays stdio JSON-RPC to hosted MCP when configured"`
    );
  }

  return out;
}

function summarizeByDirectory(files) {
  const counts = new Map();
  for (const f of files) {
    const top = f.split("/").slice(0, 2).join("/");
    counts.set(top, (counts.get(top) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function main() {
  const cfg = loadConfig();
  const stageDir = resolve(REPO_ROOT, cfg.stageDir);

  console.log("=== Lore OSS Sync ===");
  console.log(`Repo root:     ${REPO_ROOT}`);
  console.log(`Config:        ${CONFIG_PATH}`);
  console.log(`Stage dir:     ${stageDir}`);
  console.log(`Mode:          ${DRY_RUN ? "DRY RUN" : "APPLY"}`);
  console.log("");

  const allFiles = new Set();
  const missing = [];

  for (const oss of cfg.ossPaths) {
    const result = expandOssPath(oss, REPO_ROOT, cfg.excludePaths);
    for (const f of result.resolved) allFiles.add(f);
    missing.push(...result.missing);
  }

  const fileList = [...allFiles].sort();
  const dirSummary = summarizeByDirectory(fileList);

  console.log(`Total OSS-eligible files: ${fileList.length}`);
  console.log(`Top directories by file count:`);
  for (const [dir, count] of dirSummary.slice(0, 15)) {
    console.log(`  ${count.toString().padStart(5)} files  ${dir}`);
  }
  console.log("");

  if (missing.length > 0) {
    console.log(`⚠️  Missing paths (declared in ossPaths but not on disk): ${missing.length}`);
    for (const m of missing.slice(0, 20)) console.log(`   - ${m}`);
    if (missing.length > 20) console.log(`   ... and ${missing.length - 20} more`);
    console.log("");
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no files copied. Re-run with --apply to stage.");
    console.log(`Would stage ${fileList.length} files into ${cfg.stageDir}`);
    return;
  }

  console.log(`Staging ${fileList.length} files into ${cfg.stageDir} ...`);
  if (existsSync(stageDir)) {
    console.log(`  Removing existing stage dir`);
    rmSync(stageDir, { recursive: true, force: true });
  }
  mkdirSync(stageDir, { recursive: true });

  let scrubbedCount = 0;
  for (const rel of fileList) {
    const src = join(REPO_ROOT, rel);
    const dst = join(stageDir, rel);
    mkdirSync(dirname(dst), { recursive: true });

    const isText = /\.(md|ts|tsx|mjs|js|json|jsonl|sql|yml|yaml|html|css|sh)$/i.test(rel);
    if (isText && cfg.scrubPatterns?.length) {
      const content = readFileSync(src, "utf-8");
      const scrubbed = applyOssTransforms(rel, applyScrubs(content, cfg.scrubPatterns, cfg.scrubReplacement || "[redacted]"));
      if (scrubbed !== content) scrubbedCount++;
      writeFileSync(dst, scrubbed);
    } else {
      copyFileSync(src, dst);
    }
  }

  // Write MANIFEST.md
  const manifest = [
    "# Lore Context OSS Stage Manifest",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source repo: ${REPO_ROOT}`,
    `Config version: ${cfg.version}`,
    "",
    `Total files staged: ${fileList.length}`,
    `Files with scrub-pattern replacements applied: ${scrubbedCount}`,
    "",
    "## Top directories",
    "",
    "| Directory | Files |",
    "|---|---:|",
    ...dirSummary.map(([dir, count]) => `| \`${dir}\` | ${count} |`),
    "",
    "## All staged files",
    "",
    "```",
    ...fileList,
    "```",
    "",
    "## How to use this stage tree",
    "",
    "1. Review the file list above for any leak (paths that should not be public).",
    "2. Spot-check 3-5 files for scrubbed strings to verify scrub patterns work.",
    "3. To push to public repo:",
    "   ```bash",
    `   cd ${cfg.stageDir}/`,
    "   git init",
    "   git remote add origin git@github.com:Lore-Context/lore-context.git",
    "   git add -A",
    "   git commit -s -m 'chore(oss): sync open-core v2.1 surfaces'",
    "   # Operator review here.",
    "   git push --force-with-lease origin main",
    "   ```",
    "4. The push step is OPERATOR-ONLY. This script does NOT push.",
    "",
  ].join("\n");
  writeFileSync(join(stageDir, "MANIFEST.md"), manifest);

  console.log(`✅ Staged ${fileList.length} files (${scrubbedCount} with scrub replacements)`);
  console.log(`✅ MANIFEST.md written to ${cfg.stageDir}/MANIFEST.md`);
  console.log("");
  console.log(`Next step (operator only): review ${cfg.stageDir}/ and run the git init + push sequence in MANIFEST.md.`);
}

try {
  main();
} catch (err) {
  console.error("ERROR:", err.message);
  process.exit(1);
}
