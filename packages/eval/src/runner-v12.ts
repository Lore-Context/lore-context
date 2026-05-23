import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { recallAtK, precisionAtK, reciprocalRank, percentile } from "./index.js";
import type { RetrievalFn } from "./runner.js";
import type {
  EvalDatasetV12,
  EvalCaseV12,
  EvalRunResultV12,
  PerItemV12,
  GroupMetrics,
  GateConfig,
  FailedThreshold,
  AblationConfig,
  MemorySearchStreamKind,
} from "./types-v12.js";

export type { EvalDatasetV12, EvalCaseV12, EvalRunResultV12, PerItemV12 };

export interface RetrievalFnV12 {
  (
    query: string,
    opts: {
      k: number;
      projectId?: string;
      validAt?: string;
      ablationConfig?: AblationConfig;
    }
  ): Promise<
    Array<{
      memoryId: string;
      score: number;
      staleScore?: number;
      streamsFired?: string[];
      lifecycle?: {
        supersededExcluded?: number;
        expiredExcluded?: number;
        deletedExcluded?: number;
      };
      latencyBreakdownMs?: Partial<Record<string, number>>;
    }>
  >;
}

export async function runEvalV12(
  dataset: EvalDatasetV12,
  retrieve: RetrievalFnV12,
  opts: {
    k?: number;
    projectId?: string;
    ablationConfig: AblationConfig;
    now?: () => Date;
  }
): Promise<EvalRunResultV12> {
  const k = opts.k ?? 5;
  const now = opts.now ?? (() => new Date());
  const perItem: PerItemV12[] = [];
  const allStaleScores: number[] = [];

  for (const item of dataset.items) {
    const validAt = item.valid_at ?? now().toISOString();
    const start = Date.now();
    const results = await retrieve(item.query, {
      k,
      projectId: opts.projectId,
      validAt,
      ablationConfig: opts.ablationConfig,
    });
    const latencyMs = Date.now() - start;

    const retrievedIds = results.map((r) => r.memoryId);
    const topKIds = retrievedIds.slice(0, k);

    // Aggregate stale scores from top-K hits
    for (const r of results.slice(0, k)) {
      allStaleScores.push((r.staleScore ?? 0) > 0.5 ? 1 : 0);
    }

    const streamsFired = Array.from(
      new Set(results.flatMap((r) => r.streamsFired ?? []))
    );

    const negativeHits = (item.negative_ids ?? []).filter((id) => topKIds.includes(id));

    const lifecycle = results.reduce(
      (acc, r) => {
        acc.supersededExcluded += r.lifecycle?.supersededExcluded ?? 0;
        acc.expiredExcluded += r.lifecycle?.expiredExcluded ?? 0;
        acc.deletedExcluded += r.lifecycle?.deletedExcluded ?? 0;
        return acc;
      },
      { supersededExcluded: 0, expiredExcluded: 0, deletedExcluded: 0 }
    );

    const latencyBreakdownMs: PerItemV12["latencyBreakdownMs"] = {};
    for (const r of results) {
      if (r.latencyBreakdownMs) {
        for (const [key, val] of Object.entries(r.latencyBreakdownMs)) {
          const typedKey = key as keyof PerItemV12["latencyBreakdownMs"];
          const existing = latencyBreakdownMs[typedKey] ?? 0;
          latencyBreakdownMs[typedKey] = Math.max(existing, val ?? 0);
        }
      }
    }

    const rootCauseHints = deriveRootCauseHints(item, topKIds, streamsFired);

    // For negative cases (expected_memory_ids = []) the conventional IR
    // definition of recall is undefined ("nothing to recall"). Treat such a
    // case as perfectly recalled when no negative_ids leaked into top-K, and
    // as zero recall when any negative leaked. This makes the metric reflect
    // what a negative case actually measures (negative containment) instead
    // of always reporting 0 / 0 → 0 and dragging the aggregate down.
    const isNegativeCase = item.expected_memory_ids.length === 0;
    const recallValue = isNegativeCase
      ? negativeHits.length === 0 ? 1 : 0
      : recallAtK(item.expected_memory_ids, retrievedIds, k);
    const rrValue = isNegativeCase
      ? negativeHits.length === 0 ? 1 : 0
      : reciprocalRank(item.expected_memory_ids, retrievedIds);

    perItem.push({
      id: item.id,
      recall: recallValue,
      precision: precisionAtK(item.expected_memory_ids, retrievedIds, k),
      rr: rrValue,
      latencyMs,
      hits: topKIds,
      topKIds,
      expectedTopKIds: item.expected_memory_ids,
      streamsFired,
      expectedStreams: item.streams_expected ?? [],
      negativeHits,
      lifecycle,
      fusionWeightsApplied: opts.ablationConfig.weights ?? {},
      latencyBreakdownMs,
      rootCauseHints,
    });
  }

  const latencies = perItem.map((i) => i.latencyMs);
  const mean = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const staleHitRate = allStaleScores.length > 0 ? mean(allStaleScores) : 0;
  const aggregateByGroup = computeGroupAggregates(dataset.items, perItem);

  return {
    runId: crypto.randomUUID(),
    datasetName: dataset.name,
    timestamp: new Date().toISOString(),
    k,
    engineVersion: "v12",
    ablationConfig: opts.ablationConfig,
    metrics: {
      recallAtK: mean(perItem.map((i) => i.recall)),
      precisionAtK: mean(perItem.map((i) => i.precision)),
      mrr: mean(perItem.map((i) => i.rr)),
      staleHitRate,
      latencyP95Ms: percentile(latencies, 95),
    },
    gateResult: { passed: false, failedThresholds: [] },
    aggregateByGroup,
    perItem,
  };
}

function deriveRootCauseHints(
  item: EvalCaseV12,
  topKIds: string[],
  streamsFired: string[]
): string[] {
  const hints: string[] = [];
  const expected = item.streams_expected ?? [];
  const negIds = item.negative_ids ?? [];

  if (negIds.some((id) => topKIds.includes(id))) {
    if (item.query_intent === "temporal") hints.push("temporal_filter_not_applied");
    const violatingNeg = negIds.find((id) => topKIds.includes(id));
    if (violatingNeg?.includes("vault")) hints.push("wrong_vault_item_leaked");
    else if (violatingNeg?.includes("deleted") || violatingNeg?.includes("candidate"))
      hints.push("candidate_status_leaked");
    else if (item.query_intent === "negative") hints.push("superseded_item_in_context");
  }

  if (expected.includes("postgres_fts") && !streamsFired.includes("postgres_fts"))
    hints.push("fts_stream_not_fired");
  if (expected.includes("qdrant_dense") && !streamsFired.includes("qdrant_dense"))
    hints.push("dense_stream_not_fired");
  if (expected.includes("graph") && !streamsFired.includes("graph"))
    hints.push("graph_stream_not_fired");
  if (expected.includes("wiki") && !streamsFired.includes("wiki"))
    hints.push("wiki_stream_not_fired");

  return hints;
}

function computeGroupAggregates(
  cases: EvalCaseV12[],
  perItem: PerItemV12[]
): Record<string, GroupMetrics> {
  const groups: Record<
    string,
    { recall: number[]; mrr: number[]; negRates: number[] }
  > = {};

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const p = perItem[i];
    if (!p) continue;

    const allGroups = Array.from(new Set([...c.tags, c.query_intent]));
    for (const g of allGroups) {
      if (!groups[g]) groups[g] = { recall: [], mrr: [], negRates: [] };
      groups[g].recall.push(p.recall);
      groups[g].mrr.push(p.rr);
      if ((c.negative_ids ?? []).length > 0) {
        groups[g].negRates.push(p.negativeHits.length / c.negative_ids!.length);
      }
    }
  }

  const result: Record<string, GroupMetrics> = {};
  const mean = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  for (const [g, data] of Object.entries(groups)) {
    result[g] = {
      recallAtK: mean(data.recall),
      mrr: mean(data.mrr),
      negativeHitRate: data.negRates.length > 0 ? mean(data.negRates) : undefined,
      caseCount: data.recall.length,
    };
  }
  return result;
}

export function computeNegativeHitRate(
  perItem: PerItemV12[],
  cases: EvalCaseV12[]
): number {
  const pairs = cases
    .map((c, i) => ({ c, p: perItem[i] }))
    .filter(({ c }) => (c.negative_ids ?? []).length > 0);
  if (pairs.length === 0) return 0;
  return (
    pairs.reduce((s, { c, p }) => {
      if (!p) return s;
      return s + p.negativeHits.length / c.negative_ids!.length;
    }, 0) / pairs.length
  );
}

export function applyGate(
  result: EvalRunResultV12,
  gate: GateConfig,
  cases: EvalCaseV12[],
  baselineResult?: EvalRunResultV12
): EvalRunResultV12 {
  const failedThresholds: FailedThreshold[] = [];

  const negHitRate = computeNegativeHitRate(result.perItem, cases);

  const resolveMetric = (metric: string, kOverride?: number): number | undefined => {
    void kOverride;

    if (metric === "negativeHitRate") return negHitRate;

    // group-level metrics: recallAtK_<group>_group
    const groupMatch = metric.match(/^recallAtK_(\w+)_group$/);
    if (groupMatch) {
      return result.aggregateByGroup[groupMatch[1]]?.recallAtK;
    }

    const metricKey = metric as keyof typeof result.metrics;
    return result.metrics[metricKey];
  };

  for (const t of gate.thresholds) {
    const actual = resolveMetric(t.metric, t.k_override);
    if (actual === undefined) continue;

    if (t.min !== undefined) {
      let effectiveMin = t.min;
      if (t.relative_uplift_vs && t.min_uplift !== undefined && baselineResult) {
        const baseVal = resolveMetricFromResult(baselineResult, t.metric);
        if (typeof baseVal === "number") {
          effectiveMin = Math.max(effectiveMin, baseVal * (1 + t.min_uplift));
        }
      }
      if (actual < effectiveMin) {
        failedThresholds.push({
          metric: t.metric,
          threshold: effectiveMin,
          direction: "min",
          actual,
          delta: actual - effectiveMin,
        });
      }
    }

    if (t.max !== undefined && actual > t.max) {
      failedThresholds.push({
        metric: t.metric,
        threshold: t.max,
        direction: "max",
        actual,
        delta: actual - t.max,
      });
    }
  }

  return {
    ...result,
    gateResult: {
      passed: failedThresholds.length === 0,
      failedThresholds,
    },
  };
}

function resolveMetricFromResult(
  result: EvalRunResultV12,
  metric: string
): number | undefined {
  const groupMatch = metric.match(/^recallAtK_(\w+)_group$/);
  if (groupMatch) return result.aggregateByGroup[groupMatch[1]]?.recallAtK;
  return result.metrics[metric as keyof typeof result.metrics];
}

export async function persistRunV12(result: EvalRunResultV12, dir: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  const filename = `${result.timestamp.replace(/[:.]/g, "-")}_${result.runId.slice(0, 8)}.json`;
  const filePath = join(dir, filename);
  await writeFile(filePath, JSON.stringify(result, null, 2), "utf-8");
  return filePath;
}
