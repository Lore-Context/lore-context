import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { recallAtK, precisionAtK, reciprocalRank, staleHitRate, percentile } from "./index.js";

export interface EvalDataset {
  name: string;
  items: Array<{
    id: string;
    query: string;
    expected_memory_ids: string[];
    tags?: string[];
  }>;
}

export interface RetrievalFn {
  (
    query: string,
    opts: { k: number; projectId?: string }
  ): Promise<Array<{ memoryId: string; score: number; staleScore?: number }>>;
}

export interface EvalRunResult {
  runId: string;
  datasetName: string;
  timestamp: string;
  k: number;
  metrics: {
    recallAtK: number;
    precisionAtK: number;
    mrr: number;
    staleHitRate: number;
    latencyP95Ms: number;
  };
  perItem: Array<{
    id: string;
    recall: number;
    precision: number;
    rr: number;
    latencyMs: number;
    hits: string[];
  }>;
}

export async function runEval(
  dataset: EvalDataset,
  retrieve: RetrievalFn,
  opts: { k?: number; projectId?: string } = {}
): Promise<EvalRunResult> {
  const k = opts.k ?? 5;
  const perItem: EvalRunResult["perItem"] = [];

  for (const item of dataset.items) {
    const start = Date.now();
    const results = await retrieve(item.query, { k, projectId: opts.projectId });
    const latencyMs = Date.now() - start;

    const retrievedIds = results.map((r) => r.memoryId);
    const hits = retrievedIds.slice(0, k);
    const staleHits = results.slice(0, k).map((r) => ({ stale: (r.staleScore ?? 0) > 0.5 }));

    perItem.push({
      id: item.id,
      recall: recallAtK(item.expected_memory_ids, retrievedIds, k),
      precision: precisionAtK(item.expected_memory_ids, retrievedIds, k),
      rr: reciprocalRank(item.expected_memory_ids, retrievedIds),
      latencyMs,
      hits,
      _staleHits: staleHits
    } as EvalRunResult["perItem"][number] & { _staleHits: Array<{ stale: boolean }> });
  }

  const latencies = perItem.map((item) => item.latencyMs);
  const allStaleHits = (perItem as Array<EvalRunResult["perItem"][number] & { _staleHits: Array<{ stale: boolean }> }>)
    .flatMap((item) => item._staleHits);

  const metrics: EvalRunResult["metrics"] = {
    recallAtK:
      perItem.length > 0
        ? perItem.reduce((sum, item) => sum + item.recall, 0) / perItem.length
        : 0,
    precisionAtK:
      perItem.length > 0
        ? perItem.reduce((sum, item) => sum + item.precision, 0) / perItem.length
        : 0,
    mrr:
      perItem.length > 0
        ? perItem.reduce((sum, item) => sum + item.rr, 0) / perItem.length
        : 0,
    staleHitRate: staleHitRate(allStaleHits),
    latencyP95Ms: percentile(latencies, 95)
  };

  // strip internal _staleHits before returning
  const cleanPerItem = perItem.map(({ id, recall, precision, rr, latencyMs, hits }) => ({
    id,
    recall,
    precision,
    rr,
    latencyMs,
    hits
  }));

  return {
    runId: crypto.randomUUID(),
    datasetName: dataset.name,
    timestamp: new Date().toISOString(),
    k,
    metrics,
    perItem: cleanPerItem
  };
}

export async function persistRun(result: EvalRunResult, dir: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  const filename = `${result.timestamp.replace(/[:.]/g, "-")}_${result.runId.slice(0, 8)}.json`;
  const filePath = join(dir, filename);
  await writeFile(filePath, JSON.stringify(result, null, 2), "utf-8");
  return filePath;
}

export async function loadRuns(dir: string): Promise<EvalRunResult[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const results: EvalRunResult[] = [];
  for (const entry of entries.filter((e) => e.endsWith(".json")).sort()) {
    try {
      const raw = await readFile(join(dir, entry), "utf-8");
      results.push(JSON.parse(raw) as EvalRunResult);
    } catch {
      // skip malformed files
    }
  }
  return results;
}

export function diffRuns(
  prev: EvalRunResult,
  curr: EvalRunResult
): { metricDelta: Record<string, number>; regressions: string[] } {
  const keys = Object.keys(curr.metrics) as Array<keyof EvalRunResult["metrics"]>;
  const metricDelta: Record<string, number> = {};
  const regressions: string[] = [];

  for (const key of keys) {
    const delta = curr.metrics[key] - prev.metrics[key];
    metricDelta[key] = delta;

    // higher is better for recall, precision, mrr; lower is better for staleHitRate, latencyP95Ms
    const isRegression =
      key === "staleHitRate" || key === "latencyP95Ms" ? delta > 0 && Math.abs(delta) > 1e-9 : delta < -1e-9;
    if (isRegression) {
      regressions.push(key);
    }
  }

  return { metricDelta, regressions };
}
