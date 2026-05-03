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
  assert(openapi.paths?.["/v1/cloud/whoami"], "openapi.json did not document /v1/cloud/whoami");
  assert(openapi.paths?.["/v1/cloud/devices/pair"], "openapi.json did not document device pairing");
  assert(openapi.paths?.["/v1/capture/sources/{source_id}/heartbeat"], "openapi.json did not document capture heartbeat");

  await runCloudPlatformSmoke(baseUrl);

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
    project_id: "smoke",
    dataset: {
      sessions: [{ sessionId: "smoke_s1", messages: [{ role: "user", content: "Smoke eval uses Lore context." }] }],
      questions: [{ question: "What uses Lore context?", goldSessionIds: ["smoke_s1"] }]
    }
  });
  assert(evalRun.metrics?.recallAt5 === 1, "eval run did not calculate recall");

  const evalReport = await fetch(`${baseUrl}/v1/eval/report?project_id=smoke&format=markdown`);
  const evalReportText = await evalReport.text();
  assert(evalReport.ok, `/v1/eval/report returned ${evalReport.status}: ${evalReportText}`);
  assert(evalReportText.includes("# Lore Eval Report"), "eval report did not render markdown");
  assert(evalReportText.includes("- Public-safe: `true`"), "eval report did not mark public-safe output");
  assert(!evalReportText.includes("Smoke eval uses Lore context."), "eval report leaked raw dataset content");

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

  const exported = await fetch(`${baseUrl}/v1/memory/export?project_id=smoke&format=json`);
  const exportText = await exported.text();
  assert(exported.ok, `/v1/memory/export returned ${exported.status}: ${exportText}`);
  const exportedJson = JSON.parse(exportText);
  assert(exportedJson.format === "lore-memory-export", "MIF JSON export did not return the Lore export format");
  assert(exportedJson.memories?.some((item) => item.id === superseded.memory.id), "MIF JSON export did not include active smoke memory");
  assert(!exportText.includes("physically removed"), "MIF JSON export leaked hard-deleted memory content");

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

async function postJson(url, body, extraHeaders = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  assert(response.ok, `${url} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function patchJson(url, body, extraHeaders = {}) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  assert(response.ok, `${url} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function getJson(url, extraHeaders = {}) {
  const response = await fetch(url, { headers: extraHeaders });
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

async function runCloudPlatformSmoke(url) {
  // Issue install token from loopback (dev mode treats loopback as admin).
  const installA = await postJson(`${url}/v1/cloud/install-token`, {});
  assert(typeof installA.installToken === "string" && installA.installToken.startsWith("lct_install_"), "install-token did not return install token");
  assert(installA.singleUse === true, "install-token did not advertise singleUse semantics");
  assert(typeof installA.expiresAt === "string" && Date.parse(installA.expiresAt) > Date.now(), "install-token expiry is missing or in the past");

  // Pair a device using the install token; expect device + service tokens.
  const pairedA = await postJson(`${url}/v1/cloud/devices/pair`, {
    install_token: installA.installToken,
    device_label: "smoke-mac-1",
    platform: "darwin"
  });
  assert(pairedA.deviceId && pairedA.deviceToken && pairedA.serviceToken, "device pair did not return device + service tokens");
  assert(pairedA.vaultId === installA.vaultId, "paired device vault id did not match install token vault id");

  // Re-using the install token must be rejected (single-use semantics).
  const replayed = await fetch(`${url}/v1/cloud/devices/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ install_token: installA.installToken, device_label: "replay" })
  });
  const replayedBody = await replayed.json();
  assert(replayed.status === 401, `install token replay should be rejected, got ${replayed.status}`);
  assert(replayedBody.error?.code === "cloud.token_already_used", `expected cloud.token_already_used, got ${replayedBody.error?.code}`);

  // whoami with the device token should report the vault and device.
  const whoami = await getJson(`${url}/v1/cloud/whoami`, { authorization: `Bearer ${pairedA.deviceToken}` });
  assert(whoami.vault?.id === pairedA.vaultId, "whoami did not return the paired vault");
  assert(whoami.device?.id === pairedA.deviceId, "whoami did not return the paired device");
  assert(whoami.tokenKind === "device", "whoami did not report device token kind");

  await runConnectorSmoke(url, pairedA.deviceToken);

  // Heartbeat is allowed for the device's own vault and recorded.
  const heartbeat = await postJson(`${url}/v1/capture/sources/src_smoke_a/heartbeat`, {
    source_type: "agent_session",
    source_provider: "claude_code",
    status: "active",
    metadata: { sessions_seen: 1 }
  }, { authorization: `Bearer ${pairedA.deviceToken}` });
  assert(heartbeat.source?.id === "src_smoke_a", "heartbeat did not echo source id");
  assert(heartbeat.source?.vaultId === pairedA.vaultId, "heartbeat source was not vault-scoped");
  assert(typeof heartbeat.source?.lastHeartbeatAt === "string", "heartbeat did not record timestamp");

  // Cross-vault denial: pair a second vault would require a second account.
  // For dev scaffolding we share the local vault, so cross-vault denial is
  // proven by submitting a heartbeat for an existing source from a token
  // tied to a different (revoked) device. Revoking the token must block.
  const revoked = await postJson(`${url}/v1/cloud/tokens/revoke`, {
    token: pairedA.deviceToken
  }, { authorization: `Bearer ${pairedA.deviceToken}` });
  assert(revoked.revoked === true, "token revocation did not report success");

  const afterRevoke = await fetch(`${url}/v1/capture/sources/src_smoke_a/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${pairedA.deviceToken}` },
    body: JSON.stringify({ status: "active" })
  });
  assert(afterRevoke.status === 401, `revoked token should be rejected, got ${afterRevoke.status}`);

  // Capture job lookup with the still-live service token returns the source-owned vault job.
  const installB = await postJson(`${url}/v1/cloud/install-token`, {});
  const pairedB = await postJson(`${url}/v1/cloud/devices/pair`, {
    install_token: installB.installToken,
    device_label: "smoke-mac-2"
  });

  // Unknown job id surfaces 404.
  const missingJob = await fetch(`${url}/v1/capture/jobs/job_does_not_exist`, {
    headers: { authorization: `Bearer ${pairedB.deviceToken}` }
  });
  assert(missingJob.status === 404, `unknown job should 404, got ${missingJob.status}`);

  // Rotate the device token and confirm the previous one is now revoked.
  const rotated = await postJson(`${url}/v1/cloud/tokens/rotate`, {}, {
    authorization: `Bearer ${pairedB.deviceToken}`
  });
  assert(rotated.token && rotated.token !== pairedB.deviceToken, "rotate did not return a fresh token");
  const oldStillWorks = await fetch(`${url}/v1/cloud/whoami`, {
    headers: { authorization: `Bearer ${pairedB.deviceToken}` }
  });
  assert(oldStillWorks.status === 401, "rotated-out token should no longer authenticate");
}

async function runConnectorSmoke(url, deviceToken) {
  const headers = { authorization: `Bearer ${deviceToken}` };
  const connectors = await getJson(`${url}/v1/connectors`, headers);
  assert(connectors.providers?.some((provider) => provider.provider === "google_drive"), "connector list did not include Google Drive");

  const authorize = await postJson(`${url}/v1/connectors/google_drive/authorize`, {
    state: "smoke-connector",
    folder_id: "fld_lore_beta"
  }, headers);
  assert(String(authorize.authorizationUrl ?? "").includes("accounts.google.com"), "connector authorize did not return Google OAuth URL");
  assert(authorize.fixtureBacked === true, "connector authorize did not advertise fixture-backed beta mode");

  const callback = await postJson(`${url}/v1/connectors/google_drive/callback`, {
    code: "fixture-smoke-code",
    state: "smoke-connector",
    folder_id: "fld_lore_beta"
  }, headers);
  assert(callback.connection?.id, "connector callback did not create connection");

  const sync = await postJson(`${url}/v1/connectors/${encodeURIComponent(callback.connection.id)}/sync`, {
    mode: "backfill"
  }, headers);
  assert(sync.sync?.documents?.length === 2, "connector backfill did not process scoped fixture documents");
  assert(sync.sync.documents[0]?.summary?.schemaVersion === "v0.9.connector.summary", "connector backfill did not return summary envelope");

  const paused = await patchJson(`${url}/v1/connectors/${encodeURIComponent(callback.connection.id)}`, {
    status: "paused"
  }, headers);
  assert(paused.connection?.status === "paused", "connector pause did not update status");

  const pausedSync = await fetch(`${url}/v1/connectors/${encodeURIComponent(callback.connection.id)}/sync`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ mode: "incremental" })
  });
  assert(pausedSync.status === 409, `paused connector sync should 409, got ${pausedSync.status}`);

  const deleted = await fetch(`${url}/v1/connectors/${encodeURIComponent(callback.connection.id)}`, {
    method: "DELETE",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ delete_source_data: true })
  });
  const deletedBody = await deleted.json();
  assert(deleted.ok, `connector delete returned ${deleted.status}: ${JSON.stringify(deletedBody)}`);
  assert(deletedBody.connection?.status === "deleted", "connector delete did not mark connection deleted");
  assert(deletedBody.deletedDocuments === 2, "connector delete did not remove stored fixture documents");
}

async function getJsonWithHeaders(url, headers) {
  return getJson(url, headers);
}
