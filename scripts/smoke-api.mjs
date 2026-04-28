import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = join(repoRoot, "apps/api/dist/index.js");

if (!existsSync(serverEntry)) {
  throw new Error("apps/api/dist/index.js is missing. Run `pnpm build` before `pnpm smoke:api`.");
}

const port = Number(process.env.LORE_SMOKE_PORT ?? 3092);
const baseUrl = `http://127.0.0.1:${port}`;
const tmpDir = mkdtempSync(join(tmpdir(), "lore-smoke-"));
const storePath = join(tmpDir, "store.json");

let server;
let restarted;

try {
  server = startServer(port, storePath);
  await waitForHealth(baseUrl);

  const openapi = await getJson(`${baseUrl}/openapi.json`);
  assert(openapi.openapi === "3.1.0", "openapi.json did not return OpenAPI 3.1");
  assert(openapi.paths?.["/v1/evidence/ledger/{trace_id}"], "openapi.json did not document Evidence Ledger");

  const write = await postJson(`${baseUrl}/v1/memory/write`, {
    content: "Smoke test memory persists across restarts.",
    memory_type: "project_rule",
    project_id: "smoke"
  });
  assert(write.memory?.id, "memory.write did not return a memory id");

  const detail = await getJson(`${baseUrl}/v1/memory/${encodeURIComponent(write.memory.id)}`);
  assert(detail.memory?.id === write.memory.id, "memory detail did not return the written memory");

  const patched = await patchJson(`${baseUrl}/v1/memory/${encodeURIComponent(write.memory.id)}`, {
    content: "Smoke test memory persists across API restarts.",
    confidence: 0.8
  });
  assert(patched.memory?.content?.includes("API restarts"), "memory patch did not update content");

  const superseded = await postJson(`${baseUrl}/v1/memory/${encodeURIComponent(write.memory.id)}/supersede`, {
    content: "Smoke test memory survives process restarts.",
    reason: "smoke version replacement"
  });
  assert(superseded.previous?.status === "superseded", "memory supersede did not archive the previous record");
  assert(superseded.memory?.sourceOriginalId === write.memory.id, "memory supersede did not link the previous record");

  const context = await postJson(`${baseUrl}/v1/context/query`, {
    query: "继续 survives process restarts",
    project_id: "smoke"
  });
  assert(String(context.contextBlock ?? "").includes("survives process restarts"), "context.query did not compose the current memory");
  assert(context.traceId, "context.query did not return trace id");

  const ledger = await getJson(`${baseUrl}/v1/evidence/ledger/${encodeURIComponent(context.traceId)}`);
  assert(ledger.ledger?.summary?.composed === 1, "Evidence Ledger did not report composed memory");
  assert(ledger.ledger?.rows?.some((row) => row.disposition === "used"), "Evidence Ledger did not include a used row");

  const currentDetail = await getJson(`${baseUrl}/v1/memory/${encodeURIComponent(superseded.memory.id)}`);
  assert(currentDetail.memory?.useCount === 1, "context.query did not record composed memory use");

  const filteredList = await getJson(`${baseUrl}/v1/memory/list?project_id=smoke&status=active&scope=project&q=survives&limit=5`);
  assert(filteredList.memories?.some((memory) => memory.id === superseded.memory.id), "filtered memory list did not include current memory");

  const traceFeedback = await postJson(`${baseUrl}/v1/traces/${encodeURIComponent(context.traceId)}/feedback`, {
    feedback: "useful",
    note: "smoke feedback"
  });
  assert(traceFeedback.trace?.feedback === "useful", "trace feedback was not saved");

  const evalRun = await postJson(`${baseUrl}/v1/eval/run`, {
    dataset: {
      sessions: [{ sessionId: "smoke_s1", messages: [{ role: "user", content: "Smoke eval uses Lore context." }] }],
      questions: [{ question: "What uses Lore context?", goldSessionIds: ["smoke_s1"] }]
    }
  });
  assert(evalRun.metrics?.recallAt5 === 1, "eval run did not calculate recall");

  const evalRuns = await getJson(`${baseUrl}/v1/eval/runs?limit=1`);
  assert(evalRuns.evalRuns?.[0]?.id === evalRun.evalRunId, "eval run listing did not include latest run");

  const risky = await postJson(`${baseUrl}/v1/memory/write`, {
    content: "temporary token sk_1234567890abcdef",
    memory_type: "project_rule",
    project_id: "smoke"
  });
  assert(risky.reviewRequired === true, "risky memory did not require review");
  assert(risky.memory?.status === "candidate", "risky memory did not enter review queue");

  const queue = await getJson(`${baseUrl}/v1/governance/review-queue?project_id=smoke`);
  assert(queue.memories?.some((memory) => memory.id === risky.memory.id), "review queue did not include risky memory");

  const approved = await postJson(`${baseUrl}/v1/governance/memory/${encodeURIComponent(risky.memory.id)}/approve`, {
    reason: "smoke approved",
    reviewer: "smoke"
  });
  assert(approved.memory?.status === "confirmed", "review approval did not confirm memory");

  const audits = await getJson(`${baseUrl}/v1/audit-logs?limit=5`);
  assert(audits.auditLogs?.some((audit) => audit.action === "memory.review.approve"), "audit log did not include review approval");
  assert(audits.auditLogs?.some((audit) => audit.action === "trace.feedback"), "audit log did not include trace feedback");

  const disposable = await postJson(`${baseUrl}/v1/memory/write`, {
    content: "Smoke test memory should be physically removed.",
    memory_type: "project_rule",
    project_id: "smoke"
  });
  const hardDeleted = await postJson(`${baseUrl}/v1/memory/forget`, {
    memory_ids: [disposable.memory.id],
    reason: "smoke hard delete cleanup",
    hard_delete: true
  });
  assert(hardDeleted.deleted === 1 && hardDeleted.hardDelete === true, "hard delete did not report explicit removal");
  const removedDetail = await fetch(`${baseUrl}/v1/memory/${encodeURIComponent(disposable.memory.id)}`);
  assert(removedDetail.status === 404, "hard-deleted memory remained readable");

  const dashboard = await fetch(`${baseUrl}/dashboard`);
  const dashboardHtml = await dashboard.text();
  assert(dashboardHtml.includes("Lore Context"), "dashboard did not render");
  assert(dashboardHtml.includes("Eval Playground"), "dashboard did not render eval playground");

  await stopServer(server);
  server = undefined;

  restarted = startServer(port, storePath);
  await waitForHealth(baseUrl);

  const search = await postJson(`${baseUrl}/v1/memory/search`, {
    query: "restarts",
    project_id: "smoke"
  });
  assert(Array.isArray(search.hits) && search.hits.length === 1, "persisted memory was not found after restart");

  console.log("Lore API smoke passed");
} finally {
  await stopServer(restarted);
  await stopServer(server);
  rmSync(tmpDir, { recursive: true, force: true });
}

function startServer(portNumber, path) {
  const child = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(portNumber),
      LORE_STORE_PATH: path
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
  child.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      console.error(output.trim());
    }
  });

  return child;
}

async function waitForHealth(url) {
  const deadline = Date.now() + 5000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }

  throw lastError ?? new Error("Lore API did not become healthy");
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  assert(response.ok, `${url} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function patchJson(url, body) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  assert(response.ok, `${url} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function getJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  assert(response.ok, `${url} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    delay(2000).then(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    })
  ]);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
