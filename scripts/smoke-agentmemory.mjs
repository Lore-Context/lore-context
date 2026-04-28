import { AgentMemoryAdapter, DEFAULT_AGENTMEMORY_URL } from "../packages/agentmemory-adapter/dist/index.js";

const required = process.env.LORE_AGENTMEMORY_REQUIRED === "1";
const mutate = process.env.LORE_AGENTMEMORY_MUTATE !== "0";
const baseUrl = process.env.AGENTMEMORY_URL ?? DEFAULT_AGENTMEMORY_URL;

function finishSkipped(reason) {
  if (required) {
    console.error(reason);
    process.exit(1);
  }
  console.log(JSON.stringify({ skipped: true, reason, baseUrl }, null, 2));
  process.exit(0);
}

const adapter = new AgentMemoryAdapter({
  baseUrl,
  secret: process.env.AGENTMEMORY_SECRET,
  timeoutMs: Number(process.env.AGENTMEMORY_TIMEOUT_MS ?? 3000)
});

const health = await adapter.health();
if (health.status !== "ok") {
  finishSkipped(`agentmemory health is degraded: ${health.error ?? "unknown error"}`);
}

if (!mutate) {
  console.log(JSON.stringify({ ok: true, baseUrl, health, mutate: false }, null, 2));
  process.exit(0);
}

const marker = `lore-contract-${Date.now()}`;
const content = `Lore contract smoke ${marker}`;
let backendId;

try {
  const remembered = await adapter.remember({
    content,
    memoryType: "project_rule",
    scope: "project",
    projectId: "lore-contract"
  });
  backendId = remembered.backendId;
  if (!backendId) {
    throw new Error("remember did not return a backend memory id");
  }

  const exported = await adapter.exportAll();
  const exportedMemory = exported.memories.find((memory) => memory.sourceOriginalId === backendId || memory.content.includes(marker));
  if (!exportedMemory) {
    throw new Error("export did not include the remembered contract memory");
  }

  const hits = await adapter.smartSearch({ query: marker, projectId: "lore-contract", topK: 5 });
  const searchesRememberedMemory = hits.some((hit) => hit.memory.content.includes(marker) || hit.memory.sourceOriginalId === backendId);
  const audit = await adapter.getAudit({ limit: 5 });

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    version: health.version ?? null,
    backendId: backendId ?? null,
    hits: hits.length,
    searchesRememberedMemory,
    exportedMemories: exported.memories.length,
    auditEntries: audit.length
  }, null, 2));
} finally {
  if (backendId) {
    try {
      await adapter.forget({ memoryIds: [backendId], reason: "Lore contract smoke cleanup" });
    } catch (error) {
      console.error(`agentmemory cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
