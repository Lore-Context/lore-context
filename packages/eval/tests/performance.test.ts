import { describe, expect, it } from "vitest";
import {
  PERF_TARGETS,
  buildCaptureAckReport,
  buildCandidateGenerationReport,
  buildRecallApiReport,
  buildRc1PerformanceGate,
  type CaptureAckSample,
  type CandidateGenerationSample,
  type RecallApiSample,
} from "../src/performance.js";

// ---------------------------------------------------------------------------
// Target constants sanity check
// ---------------------------------------------------------------------------

describe("PERF_TARGETS", () => {
  it("has the values mandated by the rc.1 plan", () => {
    expect(PERF_TARGETS.captureAckP95Ms).toBe(250);
    expect(PERF_TARGETS.candidateGenerationP95Ms).toBe(30_000);
    expect(PERF_TARGETS.recallApiP95Ms).toBe(800);
    expect(PERF_TARGETS.dashboardLoadP95Ms).toBe(1_000);
    expect(PERF_TARGETS.modelQueueLagThresholdMs).toBe(60_000);
  });
});

// ---------------------------------------------------------------------------
// buildCaptureAckReport
// ---------------------------------------------------------------------------

const makeCaptureAckSamples = (latencies: number[]): CaptureAckSample[] =>
  latencies.map((ms, i) => ({
    sourceId: `src_${i}`,
    requestedAt: new Date().toISOString(),
    latencyMs: ms,
  }));

describe("buildCaptureAckReport", () => {
  it("passes when all samples are well within target", () => {
    const report = buildCaptureAckReport(makeCaptureAckSamples([50, 80, 100, 120, 150]));
    expect(report.kind).toBe("capture_ack_latency");
    expect(report.passed).toBe(true);
    expect(report.p95Ms).toBeLessThanOrEqual(PERF_TARGETS.captureAckP95Ms);
    expect(report.slowSamples).toHaveLength(0);
  });

  it("fails when p95 exceeds 250ms", () => {
    // 9 fast + 1 slow = 10 samples; p95 of n=10 picks index 9 (the outlier)
    const latencies = Array.from({ length: 9 }, () => 100);
    latencies.push(400);
    const report = buildCaptureAckReport(makeCaptureAckSamples(latencies));
    expect(report.passed).toBe(false);
    expect(report.p95Ms).toBeGreaterThan(PERF_TARGETS.captureAckP95Ms);
    expect(report.slowSamples.length).toBeGreaterThan(0);
  });

  it("passes with zero samples", () => {
    const report = buildCaptureAckReport([]);
    expect(report.passed).toBe(true);
    expect(report.sampleCount).toBe(0);
  });

  it("includes correct kind and generatedAt", () => {
    const report = buildCaptureAckReport(makeCaptureAckSamples([100]));
    expect(report.kind).toBe("capture_ack_latency");
    expect(Date.parse(report.generatedAt)).not.toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// buildCandidateGenerationReport
// ---------------------------------------------------------------------------

const makeCandidateSamples = (
  latencies: number[],
  fallbackFlags?: boolean[]
): CandidateGenerationSample[] =>
  latencies.map((ms, i) => ({
    captureEventId: `evt_${i}`,
    capturedAt: new Date().toISOString(),
    candidateReadyAt: new Date(Date.now() + ms).toISOString(),
    latencyMs: ms,
    ruleBasedFallback: fallbackFlags?.[i] ?? false,
  }));

describe("buildCandidateGenerationReport", () => {
  it("passes when p95 is under 30s", () => {
    const report = buildCandidateGenerationReport(
      makeCandidateSamples([5_000, 8_000, 12_000, 15_000, 20_000])
    );
    expect(report.passed).toBe(true);
    expect(report.queueLagExceeded).toBe(false);
  });

  it("fails when p95 exceeds 30s", () => {
    // 9 fast + 1 slow = 10 samples; p95 of n=10 picks index 9 (the outlier)
    const latencies = Array.from({ length: 9 }, () => 10_000);
    latencies.push(45_000);
    const report = buildCandidateGenerationReport(makeCandidateSamples(latencies));
    expect(report.passed).toBe(false);
  });

  it("sets queueLagExceeded when p95 > 60s", () => {
    const latencies = Array.from({ length: 9 }, () => 10_000);
    latencies.push(90_000);
    const report = buildCandidateGenerationReport(makeCandidateSamples(latencies));
    expect(report.queueLagExceeded).toBe(true);
  });

  it("calculates rule-based fallback rate correctly", () => {
    const latencies = [5_000, 8_000, 12_000, 15_000];
    const fallbacks = [true, false, true, false];
    const report = buildCandidateGenerationReport(makeCandidateSamples(latencies, fallbacks));
    expect(report.ruleBasedFallbackRate).toBeCloseTo(0.5, 5);
  });
});

// ---------------------------------------------------------------------------
// buildRecallApiReport
// ---------------------------------------------------------------------------

const makeRecallSamples = (latencies: number[], cacheHits?: boolean[]): RecallApiSample[] =>
  latencies.map((ms, i) => ({
    queryId: `q_${i}`,
    queriedAt: new Date().toISOString(),
    latencyMs: ms,
    resultCount: 5,
    cacheHit: cacheHits?.[i] ?? false,
  }));

describe("buildRecallApiReport", () => {
  it("passes when p95 is under 800ms", () => {
    const report = buildRecallApiReport(makeRecallSamples([100, 200, 300, 400, 500]));
    expect(report.passed).toBe(true);
    expect(report.p95Ms).toBeLessThanOrEqual(PERF_TARGETS.recallApiP95Ms);
  });

  it("fails when p95 exceeds 800ms", () => {
    // 9 fast + 1 slow = 10 samples; p95 picks index 9 (the outlier)
    const latencies = Array.from({ length: 9 }, () => 300);
    latencies.push(1_200);
    const report = buildRecallApiReport(makeRecallSamples(latencies));
    expect(report.passed).toBe(false);
    expect(report.slowSamples.length).toBeGreaterThan(0);
  });

  it("calculates cache hit rate", () => {
    const latencies = [100, 150, 200, 250];
    const hits = [true, true, false, false];
    const report = buildRecallApiReport(makeRecallSamples(latencies, hits));
    expect(report.cacheHitRate).toBeCloseTo(0.5, 5);
  });
});

// ---------------------------------------------------------------------------
// buildRc1PerformanceGate
// ---------------------------------------------------------------------------

describe("buildRc1PerformanceGate", () => {
  it("reports allPassed true when all three sub-reports pass", () => {
    const ack = buildCaptureAckReport(makeCaptureAckSamples([100, 150, 200]));
    const cand = buildCandidateGenerationReport(makeCandidateSamples([5_000, 8_000, 10_000]));
    const recall = buildRecallApiReport(makeRecallSamples([100, 200, 300]));
    const gate = buildRc1PerformanceGate(ack, cand, recall);
    expect(gate.allPassed).toBe(true);
  });

  it("reports allPassed false when any sub-report fails", () => {
    const ack = buildCaptureAckReport(makeCaptureAckSamples([100, 150, 200]));
    const cand = buildCandidateGenerationReport(makeCandidateSamples([5_000, 8_000, 10_000]));
    // recall fails: 9 fast + 1 slow = 10 samples; p95 picks index 9 (the slow one)
    const slowRecall = Array.from({ length: 9 }, () => 300);
    slowRecall.push(2_000);
    const recall = buildRecallApiReport(makeRecallSamples(slowRecall));
    const gate = buildRc1PerformanceGate(ack, cand, recall);
    expect(gate.allPassed).toBe(false);
  });

  it("surfaces queue lag flag in gate output", () => {
    const ack = buildCaptureAckReport(makeCaptureAckSamples([100]));
    // 9 fast + 1 very slow = 10 samples; p95 picks index 9 (90_000ms > 60s threshold)
    const lagSamples = Array.from({ length: 9 }, () => 10_000);
    lagSamples.push(90_000);
    const cand = buildCandidateGenerationReport(makeCandidateSamples(lagSamples));
    const recall = buildRecallApiReport(makeRecallSamples([200]));
    const gate = buildRc1PerformanceGate(ack, cand, recall);
    expect(gate.candidateGeneration.queueLagExceeded).toBe(true);
  });
});
