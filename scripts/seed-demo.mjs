import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = trimTrailingSlash(process.env.LORE_API_URL ?? "http://127.0.0.1:3000");
const apiKey = process.env.LORE_API_KEY ?? "";
const projectId = process.env.LORE_DEMO_PROJECT_ID ?? "demo-private";
const datasetPath = process.env.LORE_DEMO_DATASET_PATH ?? join(repoRoot, "examples/demo-dataset/eval/lore-demo-eval-dataset.json");
const memoriesPath = process.env.LORE_DEMO_MEMORIES_PATH ?? join(repoRoot, "examples/demo-dataset/import/lore-demo-memories.json");

const fallbackMemories = [
  {
    content: "Lore's first product proof is the Eval Playground on a user's own agent memory data.",
    memory_type: "project_rule",
    project_id: projectId,
    confidence: 0.92
  },
  {
    content: "Lore should expose a small governed MCP surface instead of raw agentmemory tools.",
    memory_type: "project_rule",
    project_id: projectId,
    confidence: 0.9
  },
  {
    content: "Before private deployment, Postgres persistence, audit logs, RBAC, and dashboard smoke tests must pass locally.",
    memory_type: "procedure",
    project_id: projectId,
    confidence: 0.88
  }
];

const fallbackDataset = {
  sessions: [
    {
      sessionId: "demo_eval",
      messages: [
        {
          role: "user",
          content: "Lore's first product proof is the Eval Playground on a user's own agent memory data."
        }
      ]
    },
    {
      sessionId: "demo_mcp",
      messages: [
        {
          role: "user",
          content: "Lore should expose a small governed MCP surface instead of raw agentmemory tools."
        }
      ]
    },
    {
      sessionId: "demo_deploy",
      messages: [
        {
          role: "user",
          content: "Before private deployment, Postgres persistence, audit logs, RBAC, and dashboard smoke tests must pass locally."
        }
      ]
    }
  ],
  questions: [
    { question: "What is Lore's first product proof?", goldSessionIds: ["demo_eval"] },
    { question: "What should Lore expose through MCP?", goldSessionIds: ["demo_mcp"] },
    { question: "What must pass before private deployment?", goldSessionIds: ["demo_deploy"] }
  ]
};

const memories = normalizeMemorySeed(loadJsonFile(memoriesPath, fallbackMemories));
const dataset = loadJsonFile(datasetPath, fallbackDataset);

await getJson("/health");

const written = [];
for (const memory of memories) {
  const response = await postJson("/v1/memory/write", {
    content: memory.content,
    memory_type: memory.memory_type ?? memory.memoryType ?? "project_rule",
    scope: memory.scope ?? "project",
    project_id: memory.project_id ?? memory.projectId ?? projectId,
    confidence: memory.confidence
  });
  written.push(response.memory?.id);
}

const query = await postJson("/v1/context/query", {
  query: "继续推进 Lore，优先证明 Eval Playground 和治理价值",
  project_id: projectId,
  token_budget: 1400,
  include_sources: true
});

const providers = ["lore-local", "agentmemory-export", "external-mock"];
const evalRuns = [];
for (const provider of providers) {
  evalRuns.push(
    await postJson("/v1/eval/run", {
      provider,
      project_id: projectId,
      dataset
    })
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      api: baseUrl,
      projectId,
      memoriesWritten: written.filter(Boolean).length,
      traceId: query.traceId,
      evalRuns: evalRuns.map((run, index) => ({
        provider: providers[index],
        evalRunId: run.evalRunId,
        metrics: run.metrics
      }))
    },
    null,
    2
  )
);

function loadJsonFile(path, fallback) {
  if (!existsSync(path)) {
    return fallback;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalizeMemorySeed(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (Array.isArray(value?.memories)) {
    return value.memories;
  }
  throw new Error(`Demo memories must be an array or Lore export object: ${memoriesPath}`);
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: requestHeaders() });
  const body = await response.json();
  assert(response.ok, `${path} failed: ${JSON.stringify(body)}`);
  return body;
}

async function postJson(path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: requestHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  assert(response.ok, `${path} failed: ${JSON.stringify(body)}`);
  return body;
}

function requestHeaders(extra = {}) {
  return {
    accept: "application/json",
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    ...extra
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
