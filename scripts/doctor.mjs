import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = (process.env.LORE_API_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const dashboardUrl = (process.env.LORE_DASHBOARD_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
const agentmemoryUrl = (process.env.AGENTMEMORY_URL ?? "http://127.0.0.1:3111").replace(/\/+$/, "");
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
console.log(JSON.stringify({ ok: failedRequired.length === 0, checks }, null, 2));
process.exitCode = failedRequired.length === 0 ? 0 : 1;

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
