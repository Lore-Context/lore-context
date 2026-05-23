/**
 * Tests for Y1 + Y2: middleware metrics registry + Prometheus exposition.
 */
import { describe, it, expect, vi } from "vitest";
import { withMemoryHooks, createMetricsRegistry } from "../src/index.js";

describe("MiddlewareMetricsRegistry (Y1/Y2)", () => {
  it("counter increments + skip counter records reason; scrape() emits Prometheus text", () => {
    const reg = createMetricsRegistry();
    reg.recordInject({ skipped: false, latencyMs: 42 }, { tier: "plus", mode: "hybrid" });
    reg.recordInject({ skipped: false, latencyMs: 88 }, { tier: "plus", mode: "hybrid" });
    reg.recordInject({ skipped: true, reason: "timeout" }, { tier: "plus", mode: "hybrid" });
    reg.recordRetain({ skipped: false }, { tier: "plus", source: "openai-chat" });
    reg.recordRetain({ skipped: true, reason: "filtered_marker" }, { tier: "plus", source: "openai-chat" });

    const snap = reg.snapshot();
    expect(snap.lore_middleware_inject_total).toBeDefined();
    const totals = snap.lore_middleware_inject_total ?? [];
    expect(totals.length).toBeGreaterThanOrEqual(2); // success=true + success=false buckets
    const successRow = totals.find((r) => r.labels.success === "true");
    expect(successRow?.value).toBe(2);
    const failureRow = totals.find((r) => r.labels.success === "false");
    expect(failureRow?.value).toBe(1);

    const skipTotal = (snap.lore_middleware_inject_skip_total ?? []).find(
      (r) => r.labels.reason === "timeout",
    );
    expect(skipTotal?.value).toBe(1);

    // Prometheus exposition contains all metric names
    const text = reg.scrape();
    for (const name of [
      "lore_middleware_inject_total",
      "lore_middleware_inject_skip_total",
      "lore_middleware_inject_latency_ms",
      "lore_middleware_inject_tokens",
      "lore_middleware_retain_total",
      "lore_middleware_retain_skip_total",
      "lore_middleware_retain_latency_ms",
    ]) {
      expect(text).toContain(`# HELP ${name}`);
      expect(text).toContain(`# TYPE ${name}`);
    }

    // Histogram exposes bucket + sum + count
    expect(text).toContain("lore_middleware_inject_latency_ms_bucket");
    expect(text).toContain("lore_middleware_inject_latency_ms_sum");
    expect(text).toContain("lore_middleware_inject_latency_ms_count");
    // le="+Inf" sentinel
    expect(text).toContain('le="+Inf"');

    // Sum reflects observed latencies (42 + 88 = 130)
    const histSnap = snap.lore_middleware_inject_latency_ms ?? [];
    const histRow = histSnap.find((r) => r.labels.tier === "plus");
    expect(histRow?.sum).toBe(130);
    expect(histRow?.count).toBe(2);
  });

  it("integrates with withMemoryHooks via audit callbacks", async () => {
    const reg = createMetricsRegistry();
    const contextQuery = vi.fn().mockResolvedValue({ contextBlock: "x" });
    const memoryWrite = vi.fn().mockResolvedValue({});
    const lore = { contextQuery, memoryWrite };
    const originalCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "ok" }, index: 0 }],
    });
    const openai = { chat: { completions: { create: originalCreate } } };

    const client = withMemoryHooks(
      openai as unknown as Record<string, unknown>,
      lore as never,
      {
        mode: "hybrid",
        onInjectAudit: (e) => reg.recordInject(e, { tier: "plus", mode: "hybrid" }),
        onRetainAudit: (e) => reg.recordRetain(e, { tier: "plus", source: "openai-chat" }),
      },
    ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

    await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "test" }],
    });
    await new Promise((r) => setTimeout(r, 20));

    const snap = reg.snapshot();
    const injectTotal = snap.lore_middleware_inject_total ?? [];
    expect(injectTotal.length).toBeGreaterThan(0);
    const retainTotal = snap.lore_middleware_retain_total ?? [];
    expect(retainTotal.length).toBeGreaterThan(0);
  });

  it("respects Prometheus label-escape rules and bucket ordering in scrape", () => {
    const reg = createMetricsRegistry();
    reg.recordInject({ skipped: false, latencyMs: 5 }, { tier: "free", mode: "hybrid" });
    reg.recordInject({ skipped: false, latencyMs: 9999 }, { tier: "free", mode: "hybrid" });

    const text = reg.scrape();
    // 5ms <= 10 bucket; 9999ms only in +Inf bucket
    const lines = text.split("\n");
    const bucket10 = lines.find((l) => l.includes(`le="10"`) && l.startsWith("lore_middleware_inject_latency_ms_bucket"));
    const bucketInf = lines.find((l) => l.includes(`le="+Inf"`) && l.startsWith("lore_middleware_inject_latency_ms_bucket"));
    expect(bucket10?.endsWith(" 1")).toBe(true);
    expect(bucketInf?.endsWith(" 2")).toBe(true);
  });
});
