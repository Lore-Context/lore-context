import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  throw new Error("Playwright is not installed. Run `pnpm install` and `pnpm exec playwright install chromium`.");
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = Number(process.env.LORE_DASHBOARD_SMOKE_API_PORT ?? 3192);
const dashboardPort = Number(process.env.LORE_DASHBOARD_SMOKE_PORT ?? 3193);
const apiUrl = `http://127.0.0.1:${apiPort}`;
const dashboardUrl = `http://127.0.0.1:${dashboardPort}`;
const tmpDir = mkdtempSync(join(tmpdir(), "lore-dashboard-smoke-"));
const storePath = join(tmpDir, "store.json");
const basicAuthUser = process.env.DASHBOARD_BASIC_AUTH_USER || "smoke";
const basicAuthPass = process.env.DASHBOARD_BASIC_AUTH_PASS || randomBytes(18).toString("hex");
const basicAuthHeader = `Basic ${Buffer.from(`${basicAuthUser}:${basicAuthPass}`).toString("base64")}`;

let api;
let dashboard;
let browser;

try {
  api = start("node", ["apps/api/dist/index.js"], {
    PORT: String(apiPort),
    LORE_STORE_PATH: storePath
  });
  await waitForUrl(`${apiUrl}/health`);
  await seedSmokeData();

  dashboard = start("pnpm", ["--dir", "apps/dashboard", "exec", "next", "start", "-p", String(dashboardPort)], {
    LORE_API_URL: apiUrl,
    DASHBOARD_BASIC_AUTH_USER: basicAuthUser,
    DASHBOARD_BASIC_AUTH_PASS: basicAuthPass
  });
  await waitForUrl(dashboardUrl, { authorization: basicAuthHeader });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    httpCredentials: { username: basicAuthUser, password: basicAuthPass }
  });
  const page = await context.newPage();
  await page.setExtraHTTPHeaders({ authorization: basicAuthHeader });
  await page.goto(dashboardUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Lore Context" }).waitFor();
  await page.getByText("Memory Inventory").waitFor();
  await page.getByText("Eval Playground").waitFor();
  await page.getByText("Dashboard smoke memory proves", { exact: false }).first().waitFor();
  await page.getByRole("button", { name: /Run Query/i }).click();
  await page.getByText("Dashboard smoke memory proves", { exact: false }).first().waitFor();
  await page.getByRole("button", { name: /Compare Providers/i }).click();
  await page.getByText("lore-local", { exact: true }).first().waitFor();
  console.log(JSON.stringify({ ok: true, dashboardUrl, apiUrl }, null, 2));
} finally {
  if (browser) {
    await browser.close();
  }
  await stop(dashboard);
  await stop(api);
  rmSync(tmpDir, { recursive: true, force: true });
}

async function seedSmokeData() {
  await post("/v1/memory/write", {
    content: "Dashboard smoke memory proves the local alpha works end to end.",
    memory_type: "project_rule",
    project_id: "demo-private"
  });
  await post("/v1/context/query", {
    query: "继续 Dashboard smoke memory",
    project_id: "demo-private"
  });
  await post("/v1/eval/run", {
    provider: "lore-local",
    project_id: "demo-private",
    dataset: {
      sessions: [{ sessionId: "dash", messages: [{ role: "user", content: "Dashboard smoke memory proves the local alpha works end to end." }] }],
      questions: [{ question: "What proves the local alpha?", goldSessionIds: ["dash"] }]
    }
  });
}

function start(command, args, env) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function post(path, payload) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed: ${JSON.stringify(body)}`);
  }
  return body;
}

async function waitForUrl(url, headers = {}) {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        return;
      }
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError ?? new Error(`${url} did not become ready`);
}

async function stop(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}
