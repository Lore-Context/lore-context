export { runEval, persistRun, loadRuns, diffRuns } from "./runner.js";
export type { EvalDataset, RetrievalFn, EvalRunResult } from "./runner.js";

export function recallAtK(relevantIds: string[], retrievedIds: string[], k: number): number {
  if (relevantIds.length === 0) {
    return 0;
  }

  const relevant = new Set(relevantIds);
  const hits = retrievedIds.slice(0, k).filter((id) => relevant.has(id)).length;
  return hits / relevant.size;
}

export function precisionAtK(relevantIds: string[], retrievedIds: string[], k: number): number {
  if (k <= 0) {
    return 0;
  }

  const relevant = new Set(relevantIds);
  const hits = retrievedIds.slice(0, k).filter((id) => relevant.has(id)).length;
  return hits / k;
}

export function reciprocalRank(relevantIds: string[], retrievedIds: string[]): number {
  const relevant = new Set(relevantIds);
  const index = retrievedIds.findIndex((id) => relevant.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
}

export function meanReciprocalRank(cases: Array<{ relevantIds: string[]; retrievedIds: string[] }>): number {
  if (cases.length === 0) {
    return 0;
  }

  return cases.reduce((sum, item) => sum + reciprocalRank(item.relevantIds, item.retrievedIds), 0) / cases.length;
}

export function staleHitRate(hits: Array<{ stale: boolean }>): number {
  if (hits.length === 0) {
    return 0;
  }

  return hits.filter((hit) => hit.stale).length / hits.length;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}
