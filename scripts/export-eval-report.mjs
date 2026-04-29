import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const baseUrl = (process.env.LORE_API_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const apiKey = process.env.LORE_API_KEY ?? "";
const format = readArg("--format") ?? "markdown";
const outPath = readArg("--out");
const requestedRunId = readArg("--run-id");
const projectId = readArg("--project-id") ?? process.env.LORE_DEMO_PROJECT_ID;
const publicSafe = process.argv.includes("--public-safe");

const evalRun = requestedRunId ? await getJson(`/v1/eval/runs/${encodeURIComponent(requestedRunId)}`) : await latestRun();
const run = evalRun.evalRun ?? evalRun;
const report = format === "json" ? `${JSON.stringify(renderJson(run), null, 2)}\n` : renderMarkdown(run);

if (outPath) {
  const target = resolve(outPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, report, "utf8");
  console.log(JSON.stringify({ ok: true, path: target, evalRunId: run.id }, null, 2));
} else {
  process.stdout.write(report);
}

async function latestRun() {
  const suffix = projectId ? `?project_id=${encodeURIComponent(projectId)}&limit=1` : "?limit=1";
  const body = await getJson(`/v1/eval/runs${suffix}`);
  const run = body.evalRuns?.[0];
  if (!run) {
    throw new Error("No eval runs found. Run `pnpm seed:demo` or POST /v1/eval/run first.");
  }
  return { evalRun: run };
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      accept: "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
    }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed: ${JSON.stringify(body)}`);
  }
  return body;
}

function renderJson(run) {
  if (!publicSafe) return run;
  return {
    publicSafe: true,
    redactionPolicy: "metrics and run metadata only; raw memory content and dataset messages excluded",
    evalRun: run
  };
}

function renderMarkdown(run) {
  const metrics = run.metrics ?? {};
  return [
    `# Lore Eval Report`,
    "",
    `- Eval run: \`${run.id}\``,
    `- Provider: \`${run.provider}\``,
    `- Project: \`${run.projectId ?? "unscoped"}\``,
    `- Created: \`${run.createdAt}\``,
    ...(publicSafe
      ? [
          "- Public-safe: `true`",
          "- Redaction policy: metrics and run metadata only; raw memory content and dataset messages excluded."
        ]
      : []),
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Recall@5 | ${percent(metrics.recallAt5)} |`,
    `| Precision@5 | ${percent(metrics.precisionAt5)} |`,
    `| MRR | ${percent(metrics.mrr)} |`,
    `| Stale hit rate | ${percent(metrics.staleHitRate)} |`,
    `| P95 latency | ${Math.round(Number(metrics.p95LatencyMs ?? 0))} ms |`,
    "",
    "## Interpretation",
    "",
    "- High recall with low stale-hit rate means the memory backend is finding the right durable context without overusing obsolete facts.",
    "- Compare this report across `lore-local`, `agentmemory-export`, and `external-mock` before changing providers or deploying to a team environment.",
    ""
  ].join("\n");
}

function percent(value) {
  return `${Math.round(Number(value ?? 0) * 100)}%`;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}
