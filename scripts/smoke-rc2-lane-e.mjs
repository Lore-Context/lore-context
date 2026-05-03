#!/usr/bin/env node
/**
 * Lore rc.2 Lane E smoke. Exercises the model-gateway + hosted MCP guarantees
 * the rc.2 plan asks for end to end, without requiring a real provider key.
 *
 * Gates:
 *   - cloud provider env gating (no key → noop fallback, key set → cloud)
 *   - redaction before model (HTTP body never contains secrets)
 *   - non-blocking fallback under provider error
 *   - default/advanced MCP tool tier contract via in-process JSON-RPC
 *   - hosted MCP unauthenticated discovery metadata shape
 *   - doctor-style connection status primitives across all canonical states
 *   - operator-facing metrics snapshot shape
 *
 * Exit code 0 when all gates pass; 1 otherwise.
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const gatewayDist = join(repoRoot, "packages/model-gateway/dist/index.js");
const mcpDist = join(repoRoot, "apps/mcp-server/dist/index.js");

if (!existsSync(gatewayDist)) {
  console.error(`[smoke-rc2-lane-e] missing ${gatewayDist}. Run: pnpm --filter @lore/model-gateway build`);
  process.exit(1);
}
if (!existsSync(mcpDist)) {
  console.error(`[smoke-rc2-lane-e] missing ${mcpDist}. Run: pnpm --filter @lore-context/server build`);
  process.exit(1);
}

const gateway = await import(pathToFileURL(gatewayDist).href);
const mcp = await import(pathToFileURL(mcpDist).href);

const results = [];

async function gate(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: "PASS", detail: detail ?? "" });
  } catch (err) {
    results.push({ name, status: "FAIL", detail: err?.message ?? String(err) });
  }
}

// ---- Gate 1: cloud provider env gating ----
await gate("env_gating:no_key_falls_back_to_noop", () => {
  const gw = gateway.createModelGatewayFromEnv({});
  if (gw.providerKind !== "noop") throw new Error(`expected noop, got ${gw.providerKind}`);
  if (gw.isEnabled) throw new Error("disabled gateway should report isEnabled=false");
  return "env empty → noop";
});

await gate("env_gating:env_key_creates_cloud", () => {
  const gw = gateway.createModelGatewayFromEnv({
    LORE_MODEL_GATEWAY_ENDPOINT: "https://example.test/v1/chat/completions",
    LORE_MODEL_GATEWAY_API_KEY: "sk-test",
    LORE_MODEL_GATEWAY_MODEL: "smoke-model",
  });
  if (gw.providerKind !== "cloud") throw new Error(`expected cloud, got ${gw.providerKind}`);
  if (!gw.isEnabled) throw new Error("cloud gateway should be enabled");
  return `cloud provider attached, model=smoke-model`;
});

await gate("env_gating:disabled_flag_forces_fallback", () => {
  const gw = gateway.createModelGatewayFromEnv({
    LORE_MODEL_GATEWAY_ENDPOINT: "https://example.test",
    LORE_MODEL_GATEWAY_API_KEY: "sk-test",
    LORE_MODEL_GATEWAY_DISABLED: "1",
  });
  if (gw.providerKind !== "noop") throw new Error("disabled flag did not force noop");
  return "kill switch honored";
});

await gate("env_gating:describe_status_matches_factory", () => {
  const status = gateway.describeModelGatewayEnv({
    LORE_MODEL_GATEWAY_ENDPOINT: "https://example.test",
    LORE_MODEL_GATEWAY_API_KEY: "sk-test",
  });
  if (!status.configured || status.provider !== "cloud") {
    throw new Error(`bad status: ${JSON.stringify(status)}`);
  }
  return `configured=true, provider=cloud`;
});

// ---- Gate 2: redaction-before-model + token usage ----
await gate("redaction:secrets_never_leave_process", async () => {
  let bodySent = "";
  const fetchImpl = async (_url, init) => {
    bodySent = String(init.body ?? "");
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ summary: "deploy notes", confidence: 0.6 }) } }],
        usage: { prompt_tokens: 50, completion_tokens: 12, total_tokens: 62 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  const provider = new gateway.CloudProvider({
    endpoint: "https://example.test/v1/chat/completions",
    apiKey: "sk-test",
    fetchImpl,
  });
  const gw = new gateway.ModelGateway({ provider });
  const r = await gw.generateSummary(
    "deployment notes with api_key=sk-LIVE-LEAK-1234567890 and password=hunter2 in plaintext",
  );
  if (!r.ok) throw new Error(`summary call failed: ${r.error}`);
  if (bodySent.includes("sk-LIVE-LEAK-1234567890")) throw new Error("secret leaked in HTTP body");
  if (bodySent.includes("hunter2")) throw new Error("password leaked in HTTP body");
  if (!bodySent.includes("[REDACTED")) throw new Error("redaction marker missing in HTTP body");
  if (!r.provenance.inputRedactionMatchCount || r.provenance.inputRedactionMatchCount < 2) {
    throw new Error(`expected >=2 redaction matches, got ${r.provenance.inputRedactionMatchCount}`);
  }
  if (r.provenance.inputTokens !== 50) throw new Error(`tokens not propagated: ${r.provenance.inputTokens}`);
  if (!r.provenance.costUnits || r.provenance.costUnits <= 0) throw new Error("cost not recorded");
  return `redacted ${r.provenance.inputRedactionMatchCount} secrets, tokens=${r.provenance.inputTokens}/${r.provenance.outputTokens}, cost=${r.provenance.costUnits}`;
});

// ---- Gate 3: non-blocking fallback under provider error ----
await gate("fallback:provider_http_error_returns_safe_value", async () => {
  const fetchImpl = async () => new Response("rate limited", { status: 429 });
  const provider = new gateway.CloudProvider({
    endpoint: "https://example.test",
    apiKey: "sk-test",
    fetchImpl,
  });
  const gw = new gateway.ModelGateway({ provider });
  const r = await gw.generateTitle("text");
  if (r.ok) throw new Error("expected fallback, got ok=true");
  if (!r.fallback) throw new Error("expected fallback=true");
  if (r.value === null || r.value === undefined) throw new Error("fallback value missing");
  if (!r.error || !r.error.includes("429")) throw new Error(`expected 429 error, got: ${r.error}`);
  return `fallback returned with error=${r.error}`;
});

await gate("fallback:invalid_json_returns_safe_value", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  const provider = new gateway.CloudProvider({
    endpoint: "https://example.test",
    apiKey: "sk-test",
    fetchImpl,
  });
  const gw = new gateway.ModelGateway({ provider });
  const r = await gw.generateTitle("text");
  if (r.ok) throw new Error("expected fallback");
  if (!r.fallback) throw new Error("expected fallback=true");
  return `invalid_json fallback ok`;
});

// ---- Gate 4: default/advanced MCP tier contract via JSON-RPC ----
await gate("mcp_tier:default_hides_advanced_tools", async () => {
  const response = await mcp.handleJsonRpcMessage({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  const tools = response?.result?.tools?.map((t) => t.name) ?? [];
  const required = ["context_query", "memory.recall", "memory.add_candidate", "source.pause"];
  const forbidden = ["memory_supersede", "memory_list", "evidence.trace_get", "eval_run"];
  for (const r of required) {
    if (!tools.includes(r)) throw new Error(`default tier missing required tool ${r}`);
  }
  for (const f of forbidden) {
    if (tools.includes(f)) throw new Error(`default tier exposed advanced tool ${f}`);
  }
  return `default tools = [${tools.join(", ")}]`;
});

await gate("mcp_tier:advanced_exposes_full_surface", async () => {
  const response = await mcp.handleJsonRpcMessage(
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { includeAdvanced: true },
  );
  const tools = response?.result?.tools?.map((t) => t.name) ?? [];
  const required = ["memory_supersede", "memory_list", "evidence.trace_get", "eval_run", "context_query"];
  for (const r of required) {
    if (!tools.includes(r)) throw new Error(`advanced tier missing tool ${r}`);
  }
  return `advanced tools count=${tools.length}`;
});

// ---- Gate 5: hosted MCP unauthenticated discovery metadata ----
await gate("hosted_mcp:protected_resource_metadata", async () => {
  const meta = mcp.getHostedMcpProtectedResourceMetadata("https://api.lorecontext.com/mcp");
  if (meta.resource !== "https://api.lorecontext.com/mcp") throw new Error("resource mismatch");
  if (!Array.isArray(meta.scopes_supported) || !meta.scopes_supported.includes("mcp.read")) {
    throw new Error("scopes_supported missing mcp.read");
  }
  if (!Array.isArray(meta.bearer_methods_supported) || meta.bearer_methods_supported[0] !== "header") {
    throw new Error("bearer_methods_supported missing header");
  }
  return `resource_metadata scopes=${meta.scopes_supported.join(",")}`;
});

await gate("hosted_mcp:authorization_server_metadata", async () => {
  const meta = mcp.getHostedMcpAuthorizationServerMetadata("https://api.lorecontext.com/mcp");
  if (!meta.token_endpoint?.toString().includes("/v1/cloud/devices/pair")) {
    throw new Error("token_endpoint missing pair");
  }
  if (!meta.lore_beta || meta.lore_beta.dynamic_client_registration !== false) {
    throw new Error("lore_beta marker missing");
  }
  return "authorization_server_metadata shape ok";
});

await gate("hosted_mcp:www_authenticate_header", async () => {
  const header = mcp.getHostedMcpWwwAuthenticateHeader("https://api.lorecontext.com/mcp");
  if (!header.includes("Bearer realm=")) throw new Error("missing Bearer realm");
  if (!header.includes("/.well-known/oauth-protected-resource")) throw new Error("missing discovery URL");
  return "www-authenticate header carries discovery URL";
});

// ---- Gate 6: doctor-style connection status primitives ----
const doctorMatrix = [
  { in: { serviceDegraded: true, hasServiceToken: true }, expect: "service_degraded" },
  { in: {}, expect: "unauthenticated" },
  { in: { hasServiceToken: true, tokenExpired: true }, expect: "token_expired" },
  { in: { hasServiceToken: true, helperRunning: false }, expect: "helper_not_running" },
  { in: { hasServiceToken: true, helperRunning: true, sourcePaused: true }, expect: "source_paused" },
  { in: { hasServiceToken: true, helperRunning: true, rateLimited: true }, expect: "rate_limited" },
  { in: { hasServiceToken: true, helperRunning: true, lastReconnectError: "x" }, expect: "reconnect_needed" },
  { in: { hasServiceToken: true, helperRunning: true, isNegotiating: true }, expect: "connecting" },
  { in: { hasServiceToken: true, helperRunning: true }, expect: "connected" },
  { in: { hasServiceToken: true }, expect: "connected" },
];
for (const [i, row] of doctorMatrix.entries()) {
  await gate(`doctor:state_${row.expect}`, () => {
    const r = mcp.describeMcpConnectionStatus(row.in);
    if (r.state !== row.expect) {
      throw new Error(`row ${i}: expected ${row.expect}, got ${r.state}`);
    }
    if (/\bMCP\b|stdio|hook|adapter|JSON-RPC/i.test(r.label) || /\bMCP\b|stdio|hook|adapter|JSON-RPC/i.test(r.hint)) {
      throw new Error(`row ${i}: jargon leaked into label/hint`);
    }
    return `${r.state} → "${r.label}"`;
  });
}

await gate("doctor:summarize_picks_most_actionable", () => {
  const r = mcp.summarizeMcpConnections([
    { hasServiceToken: true, helperRunning: true },
    { hasServiceToken: true, tokenExpired: true },
    { hasServiceToken: true, helperRunning: true, sourcePaused: true },
  ]);
  if (r.state !== "token_expired") throw new Error(`expected token_expired, got ${r.state}`);
  return "summary surfaced auth issue first";
});

// ---- Gate 7: metrics snapshot shape ----
await gate("metrics:snapshot_aggregates_jobs", async () => {
  const gw = new gateway.ModelGateway({ provider: new gateway.MockProvider() });
  await gw.generateTitle("hello world");
  await gw.generateSummary("hello world for summary");
  const snap = gw.getMetricsSnapshot();
  if (!snap || snap.totalJobs !== 2 || snap.okJobs !== 2) {
    throw new Error(`unexpected snapshot: ${JSON.stringify(snap)}`);
  }
  if (!snap.byTask.title || !snap.byTask.summary) {
    throw new Error(`byTask missing keys: ${JSON.stringify(snap.byTask)}`);
  }
  return `totalJobs=${snap.totalJobs} ok=${snap.okJobs} bytes=${snap.totalInputBytes}`;
});

await gate("metrics:budget_rejection_recorded", async () => {
  const gw = new gateway.ModelGateway({
    provider: new gateway.MockProvider(),
    budget: { maxInputBytesPerJob: 5 },
  });
  await gw.generateTitle("this exceeds the small byte budget");
  const snap = gw.getMetricsSnapshot();
  if (snap.budgetRejected !== 1) throw new Error("budget rejection not counted");
  return "budget rejection counted";
});

// ---- Report ----
const PASS = results.filter((r) => r.status === "PASS");
const FAIL = results.filter((r) => r.status === "FAIL");

const maxName = Math.max(...results.map((r) => r.name.length));
console.log("\n=== Lore rc.2 Lane E Smoke ===\n");
for (const r of results) {
  const icon = r.status === "PASS" ? "✓" : "✗";
  console.log(`  ${icon} [${r.status}] ${r.name.padEnd(maxName)}  ${r.detail}`);
}
console.log(`\nSummary: ${PASS.length} passed, ${FAIL.length} failed\n`);

if (FAIL.length > 0) {
  console.error(`FAILED gates:\n${FAIL.map((r) => `  - ${r.name}: ${r.detail}`).join("\n")}`);
  process.exit(1);
}
process.exit(0);
