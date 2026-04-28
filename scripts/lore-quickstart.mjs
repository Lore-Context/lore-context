import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import net from "node:net";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const skipBuild = process.argv.includes("--skip-build");
const skipSeed = process.argv.includes("--skip-seed");
const apiUrl = trimTrailingSlash(process.env.LORE_API_URL ?? "http://127.0.0.1:3000");
const apiPort = Number(new URL(apiUrl).port || 80);
const envPath = join(repoRoot, "data/quickstart.env");
const keys = {
  reader: `lore_reader_${randomBytes(18).toString("hex")}`,
  writer: `lore_writer_${randomBytes(18).toString("hex")}`,
  admin: `lore_admin_${randomBytes(18).toString("hex")}`
};
const apiKeyRules = [
  { key: keys.reader, role: "reader", projectIds: ["demo-private"] },
  { key: keys.writer, role: "writer", projectIds: ["demo-private"] },
  { key: keys.admin, role: "admin" }
];
const envText = [
  `LORE_API_URL=${apiUrl}`,
  `LORE_API_KEY=${keys.admin}`,
  `LORE_API_KEYS='${JSON.stringify(apiKeyRules)}'`,
  "LORE_MCP_TRANSPORT=sdk",
  "LORE_DEMO_PROJECT_ID=demo-private"
].join("\n") + "\n";

const checks = [];
checks.push(checkNode());
checks.push(checkPnpm());
checks.push(await checkPort(apiPort));

if (!dryRun) {
  mkdirSync(dirname(envPath), { recursive: true });
  writeFileSync(envPath, envText, "utf8");
}

if (!skipBuild && !dryRun) {
  checks.push(runCommand("Build", "pnpm", ["build"], true));
}

const configOutput = runCommand(
  "Integration config",
  process.execPath,
  ["scripts/generate-integration-config.mjs"],
  false,
  {
    LORE_API_URL: apiUrl,
    LORE_API_KEY: keys.admin,
    LORE_MCP_TRANSPORT: "sdk"
  }
);
checks.push(configOutput.check);

if (!skipSeed && !dryRun) {
  checks.push({
    name: "Demo seed",
    status: "todo",
    required: false,
    detail: "Start the API with data/quickstart.env, then run pnpm seed:demo"
  });
}

const firstQueryCurl = [
  `source ${envPath}`,
  "pnpm start:api",
  `curl -s ${apiUrl}/v1/context/query \\`,
  "  -H \"content-type: application/json\" \\",
  "  -H \"authorization: Bearer $LORE_API_KEY\" \\",
  "  -d '{\"query\":\"continue Lore adoption sprint\",\"project_id\":\"demo-private\"}'"
].join("\n");

const summary = {
  ok: checks.every((check) => !check.required || check.status === "ok"),
  dryRun,
  envPath,
  wroteEnvFile: !dryRun,
  checks,
  nextCommands: [
    dryRun ? "pnpm quickstart" : `source ${envPath}`,
    "pnpm start:api",
    "pnpm seed:demo",
    "pnpm smoke:api",
    "pnpm smoke:mcp"
  ],
  firstContextQuery: firstQueryCurl,
  mcpConfigs: parseJson(configOutput.stdout)
};

console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.ok ? 0 : 1;

function checkNode() {
  const major = Number(process.versions.node.split(".")[0]);
  return {
    name: "Node.js >= 22",
    status: major >= 22 ? "ok" : "fail",
    required: true,
    detail: process.version
  };
}

function checkPnpm() {
  return runCommand("pnpm", "pnpm", ["--version"], true).check;
}

async function checkPort(port) {
  const available = await isPortAvailable(port);
  return {
    name: `Port ${port}`,
    status: available ? "ok" : "warn",
    required: false,
    detail: available ? "available" : "already in use; set LORE_API_URL to another port"
  };
}

function runCommand(name, command, args, required, extraEnv = {}) {
  const child = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv }
  });
  const output = child.stdout.trim();
  return {
    stdout: output,
    check: {
      name,
      status: child.status === 0 ? "ok" : required ? "fail" : "warn",
      required,
      detail: child.status === 0 ? output.slice(0, 500) : (child.stderr || child.stdout).trim().slice(0, 500)
    }
  };
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

function parseJson(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
