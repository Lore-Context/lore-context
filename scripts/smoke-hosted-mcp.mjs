import { pathToFileURL } from "node:url";
import { join } from "node:path";

const repoRoot = process.cwd();
const apiModule = await import(pathToFileURL(join(repoRoot, "apps/api/dist/index.js")).href);
const cloudModule = await import(pathToFileURL(join(repoRoot, "apps/api/dist/cloud.js")).href);

const { createLoreApi } = apiModule;
const { CloudPlatform } = cloudModule;

const app = createLoreApi({
  apiKeys: [{ key: "hosted-smoke-admin", role: "admin" }],
  cloudPlatform: new CloudPlatform()
});

const metadataResponse = await app.handle(new Request("https://api.lorecontext.com/.well-known/oauth-protected-resource"));
assert(metadataResponse.status === 200, `metadata status ${metadataResponse.status}`);
const metadata = await metadataResponse.json();
assert(metadata.resource === "https://api.lorecontext.com/mcp", "metadata resource mismatch");
assert(metadata.scopes_supported.includes("mcp.read"), "metadata missing mcp.read");

const unauthResponse = await app.handle(new Request("https://api.lorecontext.com/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
}));
assert(unauthResponse.status === 401, `unauth status ${unauthResponse.status}`);
assert(
  unauthResponse.headers.get("www-authenticate")?.includes("/.well-known/oauth-protected-resource"),
  "unauth response missing OAuth metadata discovery header"
);

const installResponse = await app.handle(new Request("https://api.lorecontext.com/v1/cloud/install-token", {
  method: "POST",
  headers: {
    authorization: "Bearer hosted-smoke-admin",
    "content-type": "application/json",
    "x-lore-remote-address": "203.0.113.10"
  },
  body: "{}"
}));
assert(installResponse.status === 200, `install-token status ${installResponse.status}`);
const installPayload = await installResponse.json();

const pairResponse = await app.handle(new Request("https://api.lorecontext.com/v1/cloud/devices/pair", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ install_token: installPayload.installToken, device_label: "hosted-mcp-smoke", platform: "node" })
}));
assert(pairResponse.status === 200, `pair status ${pairResponse.status}`);
const pairPayload = await pairResponse.json();
assert(pairPayload.serviceToken?.startsWith("lct_service_"), "pairing did not return a service token");

// rc.1 hosted MCP contract:
//   - Default tools/list MUST include ordinary tools (memory.recall, source.pause)
//     and MUST hide advanced tools (evidence.trace_get, memory_supersede, ...).
//   - Advanced hosted mode (opt-in via x-lore-mcp-advanced: 1 header) MUST expose
//     advanced tools such as evidence.trace_get.
const listResponse = await app.handle(new Request("https://api.lorecontext.com/mcp", {
  method: "POST",
  headers: {
    authorization: `Bearer ${pairPayload.serviceToken}`,
    "content-type": "application/json",
    "mcp-protocol-version": "2025-11-25"
  },
  body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })
}));
assert(listResponse.status === 200, `tools/list status ${listResponse.status}`);
const listPayload = await listResponse.json();
const toolNames = listPayload.result?.tools?.map((tool) => tool.name) ?? [];
assert(toolNames.includes("memory.recall"), "hosted MCP default tools/list missing memory.recall");
assert(toolNames.includes("source.pause"), "hosted MCP default tools/list missing source.pause");
assert(
  !toolNames.includes("evidence.trace_get"),
  "hosted MCP default tools/list unexpectedly exposed advanced tool evidence.trace_get"
);
assert(
  !toolNames.includes("memory_supersede"),
  "hosted MCP default tools/list unexpectedly exposed advanced tool memory_supersede"
);

const advancedListResponse = await app.handle(new Request("https://api.lorecontext.com/mcp", {
  method: "POST",
  headers: {
    authorization: `Bearer ${pairPayload.serviceToken}`,
    "content-type": "application/json",
    "mcp-protocol-version": "2025-11-25",
    "x-lore-mcp-advanced": "1"
  },
  body: JSON.stringify({ jsonrpc: "2.0", id: 21, method: "tools/list" })
}));
assert(advancedListResponse.status === 200, `advanced tools/list status ${advancedListResponse.status}`);
const advancedListPayload = await advancedListResponse.json();
const advancedToolNames = advancedListPayload.result?.tools?.map((tool) => tool.name) ?? [];
assert(
  advancedToolNames.includes("memory.recall"),
  "hosted MCP advanced tools/list missing memory.recall"
);
assert(
  advancedToolNames.includes("evidence.trace_get"),
  "hosted MCP advanced tools/list missing evidence.trace_get"
);
assert(
  advancedToolNames.includes("memory_supersede"),
  "hosted MCP advanced tools/list missing memory_supersede"
);

const recallResponse = await app.handle(new Request("https://api.lorecontext.com/mcp", {
  method: "POST",
  headers: {
    authorization: `Bearer ${pairPayload.serviceToken}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "memory.recall",
      arguments: { query: "hosted MCP smoke recall", token_budget: 500 }
    }
  })
}));
assert(recallResponse.status === 200, `memory.recall status ${recallResponse.status}`);
const recallPayload = await recallResponse.json();
assert(recallPayload.result?.structuredContent?.traceId, "memory.recall did not return a trace id");
assert(!JSON.stringify(recallPayload).includes(pairPayload.serviceToken), "MCP response leaked the service token");

const pauseResponse = await app.handle(new Request("https://api.lorecontext.com/mcp", {
  method: "POST",
  headers: {
    authorization: `Bearer ${pairPayload.serviceToken}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "source.pause",
      arguments: { source_id: "src_hosted_smoke", reason: "hosted mcp smoke pause" }
    }
  })
}));
assert(pauseResponse.status === 200, `source.pause status ${pauseResponse.status}`);
const pausePayload = await pauseResponse.json();
assert(pausePayload.result?.structuredContent?.source?.status === "paused", "source.pause did not pause the source");

const resumeResponse = await app.handle(new Request("https://api.lorecontext.com/mcp", {
  method: "POST",
  headers: {
    authorization: `Bearer ${pairPayload.serviceToken}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "source.resume",
      arguments: { source_id: "src_hosted_smoke" }
    }
  })
}));
assert(resumeResponse.status === 200, `source.resume status ${resumeResponse.status}`);
const resumePayload = await resumeResponse.json();
assert(resumePayload.result?.structuredContent?.source?.status === "active", "source.resume did not resume the source");

console.log("Lore hosted MCP smoke passed");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
