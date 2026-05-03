/**
 * Performance target constants and report structures for rc.1 verification.
 *
 * Targets are taken directly from the plan:
 *   - Capture ack p95 < 250 ms
 *   - Candidate generation p95 < 30 s
 *   - Recall API p95 < 800 ms
 *   - Dashboard Memory Inbox load p95 < 1 s
 *   - Model queue lag visible when p95 candidate generation exceeds 60 s
 */

import { percentile } from "./index.js";

// ---------------------------------------------------------------------------
// Targets (milliseconds)
// ---------------------------------------------------------------------------

export const PERF_TARGETS = {
  captureAckP95Ms: 250,
  candidateGenerationP95Ms: 30_000,
  recallApiP95Ms: 800,
  dashboardLoadP95Ms: 1_000,
  modelQueueLagThresholdMs: 60_000,
} as const;

// ---------------------------------------------------------------------------
// Capture ack latency report
// ---------------------------------------------------------------------------

export interface CaptureAckSample {
  sourceId: string;
  requestedAt: string;
  latencyMs: number;
}

export interface CaptureAckLatencyReport {
  kind: "capture_ack_latency";
  generatedAt: string;
  sampleCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  targetP95Ms: number;
  passed: boolean;
  /** Samples that exceeded the p95 target individually. */
  slowSamples: CaptureAckSample[];
}

export function buildCaptureAckReport(samples: CaptureAckSample[]): CaptureAckLatencyReport {
  const latencies = samples.map((s) => s.latencyMs);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  return {
    kind: "capture_ack_latency",
    generatedAt: new Date().toISOString(),
    sampleCount: samples.length,
    p50Ms: p50,
    p95Ms: p95,
    p99Ms: p99,
    targetP95Ms: PERF_TARGETS.captureAckP95Ms,
    passed: samples.length === 0 || p95 <= PERF_TARGETS.captureAckP95Ms,
    slowSamples: samples.filter((s) => s.latencyMs > PERF_TARGETS.captureAckP95Ms),
  };
}

// ---------------------------------------------------------------------------
// Candidate generation p95 report
// ---------------------------------------------------------------------------

export interface CandidateGenerationSample {
  captureEventId: string;
  capturedAt: string;
  candidateReadyAt: string;
  latencyMs: number;
  ruleBasedFallback: boolean;
}

export interface CandidateGenerationReport {
  kind: "candidate_generation_p95";
  generatedAt: string;
  sampleCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  targetP95Ms: number;
  passed: boolean;
  queueLagExceeded: boolean;
  ruleBasedFallbackRate: number;
  slowSamples: CandidateGenerationSample[];
}

export function buildCandidateGenerationReport(
  samples: CandidateGenerationSample[]
): CandidateGenerationReport {
  const latencies = samples.map((s) => s.latencyMs);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const fallbackCount = samples.filter((s) => s.ruleBasedFallback).length;

  return {
    kind: "candidate_generation_p95",
    generatedAt: new Date().toISOString(),
    sampleCount: samples.length,
    p50Ms: p50,
    p95Ms: p95,
    p99Ms: p99,
    targetP95Ms: PERF_TARGETS.candidateGenerationP95Ms,
    passed: samples.length === 0 || p95 <= PERF_TARGETS.candidateGenerationP95Ms,
    queueLagExceeded: p95 > PERF_TARGETS.modelQueueLagThresholdMs,
    ruleBasedFallbackRate: samples.length > 0 ? fallbackCount / samples.length : 0,
    slowSamples: samples.filter((s) => s.latencyMs > PERF_TARGETS.candidateGenerationP95Ms),
  };
}

// ---------------------------------------------------------------------------
// Recall API p95 report
// ---------------------------------------------------------------------------

export interface RecallApiSample {
  queryId: string;
  queriedAt: string;
  latencyMs: number;
  resultCount: number;
  cacheHit: boolean;
}

export interface RecallApiLatencyReport {
  kind: "recall_api_p95";
  generatedAt: string;
  sampleCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  targetP95Ms: number;
  passed: boolean;
  cacheHitRate: number;
  slowSamples: RecallApiSample[];
}

export function buildRecallApiReport(samples: RecallApiSample[]): RecallApiLatencyReport {
  const latencies = samples.map((s) => s.latencyMs);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const cacheHits = samples.filter((s) => s.cacheHit).length;

  return {
    kind: "recall_api_p95",
    generatedAt: new Date().toISOString(),
    sampleCount: samples.length,
    p50Ms: p50,
    p95Ms: p95,
    p99Ms: p99,
    targetP95Ms: PERF_TARGETS.recallApiP95Ms,
    passed: samples.length === 0 || p95 <= PERF_TARGETS.recallApiP95Ms,
    cacheHitRate: samples.length > 0 ? cacheHits / samples.length : 0,
    slowSamples: samples.filter((s) => s.latencyMs > PERF_TARGETS.recallApiP95Ms),
  };
}

// ---------------------------------------------------------------------------
// Combined rc.1 performance gate
// ---------------------------------------------------------------------------

export interface Rc1PerformanceGate {
  captureAck: Pick<CaptureAckLatencyReport, "p95Ms" | "targetP95Ms" | "passed">;
  candidateGeneration: Pick<CandidateGenerationReport, "p95Ms" | "targetP95Ms" | "passed" | "queueLagExceeded">;
  recallApi: Pick<RecallApiLatencyReport, "p95Ms" | "targetP95Ms" | "passed">;
  allPassed: boolean;
  generatedAt: string;
}

export function buildRc1PerformanceGate(
  ackReport: CaptureAckLatencyReport,
  candidateReport: CandidateGenerationReport,
  recallReport: RecallApiLatencyReport
): Rc1PerformanceGate {
  const allPassed = ackReport.passed && candidateReport.passed && recallReport.passed;
  return {
    captureAck: { p95Ms: ackReport.p95Ms, targetP95Ms: ackReport.targetP95Ms, passed: ackReport.passed },
    candidateGeneration: {
      p95Ms: candidateReport.p95Ms,
      targetP95Ms: candidateReport.targetP95Ms,
      passed: candidateReport.passed,
      queueLagExceeded: candidateReport.queueLagExceeded,
    },
    recallApi: { p95Ms: recallReport.p95Ms, targetP95Ms: recallReport.targetP95Ms, passed: recallReport.passed },
    allPassed,
    generatedAt: new Date().toISOString(),
  };
}
