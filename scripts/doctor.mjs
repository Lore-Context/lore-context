import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = (process.env.LORE_API_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const dashboardUrl = (process.env.LORE_DASHBOARD_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
const agentmemoryUrl = (process.env.AGENTMEMORY_URL ?? "http://127.0.0.1:3111").replace(/\/+$/, "");

// rc.2 Lane D: doctor has two surfaces.
//   - Default (no flag, --plain): plain-language status only. Hides MCP, JSON,
//     and bearer-token jargon so an ordinary user can act on the result.
//   - Advanced (--advanced or --json): full structured payload, MCP tool list,
//     and raw HTTP detail strings, kept for support and CI.
const advanced = process.argv.includes("--advanced") || process.argv.includes("--json");
const plainOnly = process.argv.includes("--plain") || (!advanced && !process.argv.includes("--no-plain"));

const checks = [];

checks.push(checkNode());
checks.push(checkCommand("pnpm", ["--version"], "pnpm"));
checks.push(fileCheck("API build output", "apps/api/dist/index.js"));
checks.push(fileCheck("MCP build output", "apps/mcp-server/dist/index.js"));
checks.push(fileCheck("Dashboard Next output", "apps/dashboard/.next"));
checks.push(await httpCheck("Lore API", `${apiUrl}/health`, true));
checks.push(await httpCheck("Lore Dashboard", dashboardUrl, false));
checks.push(await httpCheck("agentmemory", `${agentmemoryUrl}/agentmemory/health`, false));
checks.push(checkPostgresContainer());
checks.push(await mcpToolsCheck());

const failedRequired = checks.filter((check) => check.required && check.status !== "ok");
const ok = failedRequired.length === 0;

if (advanced) {
  console.log(JSON.stringify({ ok, checks }, null, 2));
} else {
  printPlainSummary(ok, checks);
  if (plainOnly && process.argv.includes("--verbose")) {
    console.log("");
    console.log("Run `pnpm doctor --advanced` for full diagnostic JSON.");
  }
}
process.exitCode = ok ? 0 : 1;

function printPlainSummary(ok, checks) {
  // Plain-language map: the user sees product-level statements, never raw URLs
  // or tool ids. Anything that should escalate to "ask a human" lives here.
  const plain = {
    "Node.js >= 22": { ok: "Node 22+ is installed.", warn: "Node may be too old.", fail: "Install Node 22 or newer." },
    "pnpm": { ok: "pnpm is available.", warn: "pnpm not detected.", fail: "Install pnpm and try again." },
    "API build output": { ok: "Lore API is built.", warn: "Lore API has not been built yet — run `pnpm build`.", fail: "Lore API build is missing." },
    "MCP build output": { ok: "AI app connection adapter is built.", warn: "AI app connection adapter is not built yet.", fail: "AI app connection adapter is missing." },
    "Dashboard Next output": { ok: "Dashboard is built.", warn: "Dashboard has not been built yet.", fail: "Dashboard build is missing." },
    "Lore API": { ok: "Lore API is reachable.", warn: "Lore API is not running locally.", fail: "Lore API is not running. Start it with `pnpm start:api`." },
    "Lore Dashboard": { ok: "Dashboard is reachable.", warn: "Dashboard is not running locally (optional).", fail: "Dashboard is not reachable." },
    "agentmemory": { ok: "AgentMemory adapter is reachable.", warn: "AgentMemory adapter is offline (optional).", fail: "AgentMemory adapter is offline." },
    "Postgres container": { ok: "Postgres is healthy.", warn: "Postgres container is not running (optional for local dev).", fail: "Postgres is unhealthy." },
    "MCP tools/list": { ok: "AI app connection responds correctly.", warn: "AI app connection check failed (advanced setup needed).", fail: "AI app connection is broken." }
  };

  console.log(ok ? "Lore is ready." : "Lore is not ready yet.");
  console.log("");
  for (const check of checks) {
    const lookup = plain[check.name] ?? {};
    const message = lookup[check.status] ?? check.name;
    const marker = check.status === "ok" ? "ok" : check.status === "warn" ? "..." : "!!";
    console.log(`  [${marker}] ${message}`);
  }
  if (!ok) {
    console.log("");
    console.log("Required checks failed. Re-run with `--advanced` to see exact errors.");
  }
}

function checkNode() {
  const major = Number(process.versions.node.split(".")[0]);
  return {
    name: "Node.js >= 22",
    status: major >= 22 ? "ok" : "fail",
    required: true,
    detail: process.version
  };
}

function checkCommand(command, args, name) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8" });
  return {
    name,
    status: result.status === 0 ? "ok" : "fail",
    required: true,
    detail: result.status === 0 ? result.stdout.trim() : (result.stderr || result.stdout).trim()
  };
}

function fileCheck(name, path) {
  return {
    name,
    status: existsSync(join(repoRoot, path)) ? "ok" : "warn",
    required: false,
    detail: path
  };
}

async function httpCheck(name, url, required) {
  try {
    const response = await fetch(url);
    return {
      name,
      status: response.ok ? "ok" : required ? "fail" : "warn",
      required,
      detail: `${response.status} ${url}`
    };
  } catch (error) {
    return {
      name,
      status: required ? "fail" : "warn",
      required,
      detail: `${url} ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function checkPostgresContainer() {
  const result = spawnSync("docker", ["inspect", "--format", "{{.State.Health.Status}}", "lore-context-postgres"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    return {
      name: "Postgres container",
      status: "warn",
      required: false,
      detail: "lore-context-postgres is not running"
    };
  }
  const status = result.stdout.trim();
  return {
    name: "Postgres container",
    status: status === "healthy" ? "ok" : "warn",
    required: false,
    detail: status
  };
}

async function mcpToolsCheck() {
  const entry = join(repoRoot, "apps/mcp-server/dist/index.js");
  if (!existsSync(entry)) {
    return {
      name: "MCP tools/list",
      status: "warn",
      required: false,
      detail: "Build apps/mcp-server first"
    };
  }

  const child = spawnSync(
    process.execPath,
    [entry],
    {
      cwd: repoRoot,
      input: [
        JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "doctor", version: "0" } } }),
        JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })
      ].join("\n") + "\n",
      env: { ...process.env, LORE_API_URL: apiUrl },
      encoding: "utf8",
      timeout: 5000
    }
  );
  const ok = child.status === 0 && child.stdout.includes("context_query") && child.stdout.includes("memory_write");
  return {
    name: "MCP tools/list",
    status: ok ? "ok" : "warn",
    required: false,
    detail: ok ? "context_query and memory_write are visible" : (child.stderr || child.stdout).trim().slice(0, 500)
  };
}
