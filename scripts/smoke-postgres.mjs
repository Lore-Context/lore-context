import { spawn, spawnSync } from "node:child_process";

const required = process.env.LORE_POSTGRES_SMOKE_REQUIRED === "1";
const repoRoot = new URL("..", import.meta.url).pathname;
const port = Number(process.env.LORE_POSTGRES_SMOKE_PORT ?? 3101);
const databaseUrl =
  process.env.LORE_DATABASE_URL ?? "postgres://lore:lore_dev_password@127.0.0.1:5432/lore_context";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    stdio: options.stdio ?? "pipe",
    encoding: "utf8",
    ...options
  });
}

function skip(message) {
  if (required) {
    console.error(message);
    process.exit(1);
  }
  console.log(JSON.stringify({ skipped: true, reason: message }, null, 2));
  process.exit(0);
}

if (run("docker", ["compose", "version"]).status !== 0) {
  skip("docker compose is not available");
}

const compose = run("docker", ["compose", "up", "-d", "postgres"], { stdio: "inherit" });
if (compose.status !== 0) {
  skip("failed to start docker compose postgres service");
}

for (let attempt = 0; attempt < 60; attempt += 1) {
  const health = run("docker", ["inspect", "--format", "{{.State.Health.Status}}", "lore-context-postgres"]);
  if (health.stdout.trim() === "healthy") {
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (attempt === 59) {
    skip("postgres container did not become healthy");
  }
}

await runRoundTrip();

async function runRoundTrip() {
  const marker = `postgres-smoke-${Date.now()}`;
  const first = await startApi();
  try {
    await waitForHealth();
    const write = await post("/v1/memory/write", {
      content: `Persist ${marker} through Postgres runtime store.`,
      memory_type: "project_rule",
      project_id: "postgres-smoke"
    });
    if (!write.memory?.id) {
      throw new Error(`unexpected write response: ${JSON.stringify(write)}`);
    }
  } finally {
    await stopApi(first);
  }

  const second = await startApi();
  try {
    await waitForHealth();
    const search = await post("/v1/memory/search", {
      query: marker,
      project_id: "postgres-smoke"
    });
    const found = Array.isArray(search.hits) && search.hits.some((hit) => hit.memory?.content?.includes(marker));
    if (!found) {
      throw new Error(`postgres smoke did not find persisted marker ${marker}`);
    }
    console.log(JSON.stringify({ ok: true, marker, hits: search.hits.length }, null, 2));
  } finally {
    await stopApi(second);
  }
}

async function startApi() {
  const child = spawn("node", ["apps/api/dist/index.js"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      LORE_STORE_DRIVER: "postgres",
      LORE_DATABASE_URL: databaseUrl
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  return child;
}

async function stopApi(child) {
  if (child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Lore API did not become healthy");
}

async function post(path, payload) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
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
