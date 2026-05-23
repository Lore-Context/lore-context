import { describe, it, expect } from "vitest";
import { ModelGateway } from "../src/gateway.js";
import { MockProvider } from "../src/providers/mock.js";
import { InMemoryMetricsRecorder } from "../src/metrics.js";

describe("ModelGateway metrics recorder", () => {
  it("records ok/fallback counts and bytes through the default in-memory recorder", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    await gw.generateTitle("first content");
    await gw.generateSummary("second content");
    const snap = gw.getMetricsSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.totalJobs).toBe(2);
    expect(snap!.okJobs).toBe(2);
    expect(snap!.fallbackJobs).toBe(0);
    expect(snap!.byTask.title.count).toBe(1);
    expect(snap!.byTask.summary.count).toBe(1);
    expect(snap!.byProvider.mock.count).toBe(2);
    expect(snap!.totalInputBytes).toBeGreaterThan(0);
  });

  it("records fallback when provider is unavailable (noop default)", async () => {
    const gw = new ModelGateway();
    await gw.generateTitle("test");
    await gw.detectRedactionHints("password=hunter2");
    const snap = gw.getMetricsSnapshot();
    expect(snap!.fallbackJobs).toBe(2);
    expect(snap!.okJobs).toBe(0);
    expect(snap!.byProvider.noop.fallback).toBe(2);
  });

  it("records budget rejection separately", async () => {
    const gw = new ModelGateway({
      provider: new MockProvider(),
      budget: { maxInputBytesPerJob: 5 },
    });
    await gw.generateTitle("input that is way too large for the budget");
    const snap = gw.getMetricsSnapshot();
    expect(snap!.budgetRejected).toBe(1);
    expect(snap!.fallbackJobs).toBe(1);
    expect(snap!.okJobs).toBe(0);
  });

  it("records provider errors as fallback with error message", async () => {
    const bad = new MockProvider();
    bad.generateTitle = async () => {
      throw new Error("simulated_failure");
    };
    const recorder = new InMemoryMetricsRecorder();
    const gw = new ModelGateway({ provider: bad, metricsRecorder: recorder });
    await gw.generateTitle("text");
    const records = recorder.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].fallback).toBe(true);
    expect(records[0].ok).toBe(false);
    expect(records[0].error).toBe("simulated_failure");
  });

  it("uses an injected MetricsRecorder when supplied", async () => {
    const recorder = new InMemoryMetricsRecorder();
    const gw = new ModelGateway({ provider: new MockProvider(), metricsRecorder: recorder });
    await gw.generateTitle("hi");
    expect(recorder.getRecords()).toHaveLength(1);
    // injected recorder shortcuts the in-memory snapshot path
    expect(gw.getMetricsSnapshot()).toBeNull();
  });

  it("survives a recorder that throws — model path is never broken by metrics", async () => {
    const broken = {
      recordJob: () => {
        throw new Error("recorder_broken");
      },
    };
    const gw = new ModelGateway({ provider: new MockProvider(), metricsRecorder: broken });
    const r = await gw.generateTitle("hello");
    expect(r.ok).toBe(true);
  });

  it("provenance carries task name", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const r = await gw.generateTitle("text");
    expect(r.provenance.task).toBe("title");
    const r2 = await gw.rewriteQuery("text");
    expect(r2.provenance.task).toBe("rewrite_query");
  });
});
