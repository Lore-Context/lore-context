import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import net from "node:net";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const skipBuild = process.argv.includes("--skip-build");
const skipSeed = process.argv.includes("--skip-seed");
const activationReportRequested = process.argv.includes("--activation-report");
const apiUrl = trimTrailingSlash(process.env.LORE_API_URL ?? "http://127.0.0.1:3000");
const parsedApiUrl = new URL(apiUrl);
const apiHost = parsedApiUrl.hostname;
const apiPort = Number(parsedApiUrl.port || (parsedApiUrl.protocol === "https:" ? 443 : 80));
const envPath = join(repoRoot, "data/quickstart.env");
const activationReportPath = join(repoRoot, "data/activation-report.json");
const envReportPath = "data/quickstart.env";
const activationReportDisplayPath = "data/activation-report.json";
const serverEntry = join(repoRoot, "apps/api/dist/index.js");
const activationStorePath = join(repoRoot, "data", `quickstart-activation-${process.pid}-${randomBytes(6).toString("hex")}.json`);
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
const activationSteps = [];
let stepStartedAt = Date.now();
checks.push(trackStep("node", checkNode(), stepStartedAt));
stepStartedAt = Date.now();
checks.push(trackStep("pnpm", checkPnpm(), stepStartedAt));
stepStartedAt = Date.now();
const portCheck = await checkPort(apiPort);
checks.push(trackStep("port", portCheck, stepStartedAt));

if (!dryRun) {
  mkdirSync(dirname(envPath), { recursive: true });
  writeFileSync(envPath, envText, "utf8");
}

if (!skipBuild && !dryRun) {
  const buildOutput = runTrackedCommand("build", "Build", "pnpm", ["build"], true);
  checks.push(buildOutput.check);
}

const configOutput = runTrackedCommand(
  "integration-config",
  "Integration config",
  process.execPath,
  ["scripts/generate-integration-config.mjs"],
  false,
  {
    LORE_API_URL: apiUrl,
    LORE_API_KEY: keys.admin,
    LORE_MCP_TRANSPORT: "sdk"
  },
  { includeDetail: false }
);
checks.push(configOutput.check);

if (!skipSeed && !dryRun) {
  const seedCheck = {
    name: "Demo seed",
    status: "todo",
    required: false,
    detail: "Start the API with data/quickstart.env, then run pnpm seed:demo"
  };
  checks.push(trackStep("demo-seed", seedCheck, Date.now()));
}

if (activationReportRequested && !dryRun) {
  checks.push(...(await runActivationProof(portCheck)));
}

const firstQueryCurl = [
  `source ${envPath}`,
  "pnpm start:api",
  `curl -s ${apiUrl}/v1/context/query \\`,
  "  -H \"content-type: application/json\" \\",
  "  -H \"authorization: Bearer $LORE_API_KEY\" \\",
  "  -d '{\"query\":\"continue Lore adoption sprint\",\"project_id\":\"demo-private\"}'"
].join("\n");

const ok = checks.every((check) => !check.required || check.status === "ok");
const activationReport = activationReportRequested
  ? {
      schemaVersion: "lore.quickstart.activation.v1",
      generatedAt: new Date().toISOString(),
      ok,
      dryRun,
      apiUrl,
      envPath: envReportPath,
      wroteEnvFile: !dryRun,
      secretsIncluded: false,
      publicSafe: true,
      steps: activationSteps,
      firstValueMilestones: activationSteps
        .filter((step) => ["api-health", "first-memory-write", "first-context-query", "first-evidence-ledger"].includes(step.step))
        .map((step) => ({
          step: step.step,
          status: step.status,
          durationMs: step.durationMs,
          detail: step.detail
        })),
      nextCommands: [
        dryRun ? "pnpm quickstart" : `source ${envReportPath}`,
        "pnpm start:api",
        "pnpm seed:demo",
        "pnpm smoke:api",
        "pnpm smoke:mcp"
      ],
      notes: [
        "Activation report redacts generated API keys and omits integration config secret values.",
        dryRun ? "Dry run did not write data/quickstart.env." : "Environment file was written locally; do not commit it."
      ]
    }
  : undefined;

if (activationReportRequested && !dryRun) {
  mkdirSync(dirname(activationReportPath), { recursive: true });
  writeFileSync(activationReportPath, `${JSON.stringify(activationReport, null, 2)}\n`, "utf8");
}

const summary = {
  ok,
  dryRun,
  envPath,
  wroteEnvFile: !dryRun,
  checks: checks.map(redactCheck),
  nextCommands: [
    dryRun ? "pnpm quickstart" : `source ${envPath}`,
    "pnpm start:api",
    "pnpm seed:demo",
    "pnpm smoke:api",
    "pnpm smoke:mcp"
  ],
  firstContextQuery: firstQueryCurl,
  mcpConfigs: redactSecrets(parseJson(configOutput.stdout)),
  activationReport: activationReport
    ? {
        ...activationReport,
        path: activationReportDisplayPath,
        wroteFile: activationReportRequested && !dryRun
      }
    : undefined
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
  const available = await isPortAvailable(port, apiHost);
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

async function runActivationProof(portAvailability) {
  const proofChecks = [];
  if (portAvailability.status !== "ok") {
    const check = {
      name: "Activation proof",
      status: "fail",
      required: true,
      detail: `Skipped because port ${apiPort} is already in use. Set LORE_API_URL to an available local port and rerun.`
    };
    proofChecks.push(trackStep("activation-proof", check, Date.now()));
    return proofChecks;
  }

  if (!existsSync(serverEntry)) {
    const check = {
      name: "API build artifact",
      status: "fail",
      required: true,
      detail: "apps/api/dist/index.js is missing. Run without --skip-build or run pnpm build first."
    };
    proofChecks.push(trackStep("api-build-artifact", check, Date.now()));
    return proofChecks;
  }

  const server = startActivationServer();
  try {
    const health = await activationMilestone("api-health", "API health", async () => {
      await waitForHealth(apiUrl, server);
      return "healthy";
    });
    proofChecks.push(health);
    if (health.status !== "ok") return proofChecks;

    const write = await activationMilestone("first-memory-write", "First memory write", async () => {
      const body = await postJson("/v1/memory/write", {
        content: "Lore quickstart activation proof memory. Use Evidence Ledger for first context query.",
        memory_type: "project_rule",
        project_id: "demo-private",
        scope: "project"
      });
      if (!body.memory?.id) throw new Error("memory.write did not return a memory id");
      return `memory=${body.memory.id}; status=${body.memory.status}`;
    });
    proofChecks.push(write);
    if (write.status !== "ok") return proofChecks;

    let traceId;
    const context = await activationMilestone("first-context-query", "First context.query", async () => {
      const body = await postJson("/v1/context/query", {
        query: "quickstart activation proof evidence ledger",
        project_id: "demo-private",
        token_budget: 1200
      });
      if (!body.traceId) throw new Error("context.query did not return a traceId");
      if (!String(body.contextBlock ?? "").includes("quickstart activation proof")) {
        throw new Error("context.query did not include the activation memory");
      }
      traceId = body.traceId;
      return `trace=${body.traceId}; hits=${body.memoryHits?.length ?? 0}`;
    });
    proofChecks.push(context);
    if (context.status !== "ok") return proofChecks;

    const ledger = await activationMilestone("first-evidence-ledger", "First Evidence Ledger", async () => {
      const body = await getJson(`/v1/evidence/ledger/${encodeURIComponent(traceId)}`);
      const ledger = body.ledger;
      if (!ledger?.rows?.some((row) => row.disposition === "used")) {
        throw new Error("Evidence Ledger did not include a used row");
      }
      return `trace=${ledger.traceId}; used=${ledger.summary?.composed ?? 0}; retrieved=${ledger.summary?.retrieved ?? 0}`;
    });
    proofChecks.push(ledger);
  } finally {
    await stopActivationServer(server);
    rmSync(activationStorePath, { force: true });
  }

  return proofChecks;
}

async function activationMilestone(step, name, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    return trackStep(step, { name, status: "ok", required: true, detail }, startedAt);
  } catch (error) {
    return trackStep(step, {
      name,
      status: "fail",
      required: true,
      detail: error instanceof Error ? error.message : String(error)
    }, startedAt);
  }
}

function startActivationServer() {
  const child = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(apiPort),
      LORE_STORE_PATH: activationStorePath,
      LORE_API_KEY: keys.admin,
      LORE_API_KEYS: JSON.stringify(apiKeyRules)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output += String(chunk);
  });
  return { child, output: () => output };
}

async function waitForHealth(url, server) {
  const deadline = Date.now() + 7000;
  let lastError;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(`API exited before health check passed: ${sanitizeDetail(server.output())}`);
    }
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError ?? new Error("API did not become healthy");
}

async function postJson(path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${keys.admin}`
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function getJson(path) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${keys.admin}`
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function stopActivationServer(server) {
  if (!server?.child || server.child.exitCode !== null) return;
  server.child.kill("SIGTERM");
  const exited = await Promise.race([
    once(server.child, "exit").then(() => true),
    delay(2500).then(() => false)
  ]);
  if (!exited && server.child.exitCode === null) {
    server.child.kill("SIGKILL");
    await Promise.race([
      once(server.child, "exit"),
      delay(1000)
    ]);
  }
}

function runTrackedCommand(step, name, command, args, required, extraEnv = {}, options = {}) {
  const startedAt = Date.now();
  const output = runCommand(name, command, args, required, extraEnv);
  trackStep(step, output.check, startedAt, options);
  return output;
}

function trackStep(step, check, startedAt, options = {}) {
  activationSteps.push({
    step,
    name: check.name,
    status: check.status,
    required: check.required,
    durationMs: Math.max(0, Date.now() - startedAt),
    detail: options.includeDetail === false ? summarizeCheck(check) : sanitizeDetail(check.detail)
  });
  return check;
}

function summarizeCheck(check) {
  return check.status === "ok"
    ? "ok; detailed output omitted from activation report"
    : sanitizeDetail(check.detail);
}

function sanitizeDetail(value) {
  return String(value ?? "")
    .replace(/lore_(reader|writer|admin)_[a-f0-9]+/g, "lore_$1_[redacted]")
    .replace(/sk_[A-Za-z0-9_-]+/g, "sk_[redacted]")
    .slice(0, 500);
}

function redactCheck(check) {
  return {
    ...check,
    detail: sanitizeDetail(check.detail)
  };
}

function redactSecrets(value) {
  if (typeof value === "string") return sanitizeDetail(value);
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactSecrets(child)]));
  }
  return value;
}

function isPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen({ port, host });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
