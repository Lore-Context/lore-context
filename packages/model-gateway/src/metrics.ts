import type { ModelProvenance, ModelTask } from "./types.js";

export interface MetricsRecord {
  task: ModelTask;
  provider: string;
  ok: boolean;
  fallback: boolean;
  durationMs: number;
  inputBytes: number;
  inputTokens?: number;
  outputTokens?: number;
  costUnits?: number;
  redactionMatchCount?: number;
  error?: string;
  budgetRejected?: boolean;
}

export interface MetricsRecorder {
  recordJob(record: MetricsRecord): void;
}

export interface MetricsSnapshot {
  totalJobs: number;
  okJobs: number;
  fallbackJobs: number;
  budgetRejected: number;
  totalDurationMs: number;
  totalInputBytes: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUnits: number;
  totalRedactionMatches: number;
  byTask: Record<string, { count: number; fallback: number; durationMs: number; costUnits: number }>;
  byProvider: Record<string, { count: number; fallback: number }>;
}

export class InMemoryMetricsRecorder implements MetricsRecorder {
  private snapshot: MetricsSnapshot = emptySnapshot();
  private readonly records: MetricsRecord[] = [];

  recordJob(record: MetricsRecord): void {
    this.records.push(record);
    const s = this.snapshot;
    s.totalJobs++;
    if (record.ok) s.okJobs++;
    if (record.fallback) s.fallbackJobs++;
    if (record.budgetRejected) s.budgetRejected++;
    s.totalDurationMs += record.durationMs;
    s.totalInputBytes += record.inputBytes;
    s.totalInputTokens += record.inputTokens ?? 0;
    s.totalOutputTokens += record.outputTokens ?? 0;
    s.totalCostUnits += record.costUnits ?? 0;
    s.totalRedactionMatches += record.redactionMatchCount ?? 0;

    const t = (s.byTask[record.task] ??= { count: 0, fallback: 0, durationMs: 0, costUnits: 0 });
    t.count++;
    if (record.fallback) t.fallback++;
    t.durationMs += record.durationMs;
    t.costUnits += record.costUnits ?? 0;

    const p = (s.byProvider[record.provider] ??= { count: 0, fallback: 0 });
    p.count++;
    if (record.fallback) p.fallback++;
  }

  getSnapshot(): MetricsSnapshot {
    return JSON.parse(JSON.stringify(this.snapshot));
  }

  getRecords(): MetricsRecord[] {
    return [...this.records];
  }

  reset(): void {
    this.snapshot = emptySnapshot();
    this.records.length = 0;
  }
}

export function emptySnapshot(): MetricsSnapshot {
  return {
    totalJobs: 0,
    okJobs: 0,
    fallbackJobs: 0,
    budgetRejected: 0,
    totalDurationMs: 0,
    totalInputBytes: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUnits: 0,
    totalRedactionMatches: 0,
    byTask: {},
    byProvider: {},
  };
}

export function provenanceToRecord(
  task: ModelTask,
  inputBytes: number,
  fallback: boolean,
  ok: boolean,
  provenance: ModelProvenance,
  budgetRejected = false,
): MetricsRecord {
  return {
    task,
    provider: provenance.provider,
    ok,
    fallback,
    durationMs: provenance.durationMs,
    inputBytes,
    inputTokens: provenance.inputTokens,
    outputTokens: provenance.outputTokens,
    costUnits: provenance.costUnits,
    redactionMatchCount: provenance.inputRedactionMatchCount,
    error: provenance.error,
    budgetRejected,
  };
}
