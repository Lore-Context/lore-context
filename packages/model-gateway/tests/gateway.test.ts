import { describe, it, expect } from "vitest";
import { ModelGateway } from "../src/gateway.js";
import { MockProvider } from "../src/providers/mock.js";

describe("ModelGateway — disabled (default noop)", () => {
  it("constructs without any arguments — no local model or API key required", () => {
    const gw = new ModelGateway();
    expect(gw.isEnabled).toBe(false);
    expect(gw.providerKind).toBe("noop");
  });

  it("generateTitle returns fallback when gateway is disabled", async () => {
    const gw = new ModelGateway();
    const r = await gw.generateTitle("Some deployment steps");
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe(true);
    expect(r.value).toEqual({ title: "", confidence: 0 });
    expect(r.provenance.provider).toBe("noop");
  });

  it("all intelligence methods return usable fallbacks — product stays functional", async () => {
    const gw = new ModelGateway();
    const [summary, hints, dupes, stale, rewrite, reranked] = await Promise.all([
      gw.generateSummary("text"),
      gw.detectRedactionHints("api_key=abc"),
      gw.detectDuplicates("text", ["other"]),
      gw.detectStaleConflict("text", ["ctx"]),
      gw.rewriteQuery("deploy steps"),
      gw.rerank("q", [{ id: "m1", text: "memory one" }]),
    ]);

    for (const r of [summary, hints, dupes, stale, rewrite, reranked]) {
      expect(r.fallback).toBe(true);
      expect(r.ok).toBe(false);
      expect(r.value).not.toBeUndefined();
    }

    // Fallback values are non-null and usable
    expect(summary.value).toEqual({ summary: "", confidence: 0 });
    expect(hints.value).toEqual([]);
    expect(dupes.value).toEqual([]);
    expect(stale.value).toEqual([]);
    expect(rewrite.value?.rewritten).toBe("deploy steps");
    expect(reranked.value?.length).toBe(1);
  });

  it("disabled: true overrides an available provider", async () => {
    const gw = new ModelGateway({ provider: new MockProvider(), disabled: true });
    expect(gw.isEnabled).toBe(false);
    const r = await gw.generateTitle("text");
    expect(r.fallback).toBe(true);
  });
});

describe("ModelGateway — mock provider", () => {
  it("is enabled with mock provider", () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    expect(gw.isEnabled).toBe(true);
    expect(gw.providerKind).toBe("mock");
  });

  it("generateTitle returns real result with provenance", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const r = await gw.generateTitle("Deploy using pnpm build and check logs");
    expect(r.ok).toBe(true);
    expect(r.fallback).toBe(false);
    expect(r.value?.title).toMatch(/\[mock\]/);
    expect(r.provenance.provider).toBe("mock");
    expect(r.provenance.generatedAt).toBeTruthy();
    expect(r.provenance.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("generateSummary returns result with provenance", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const r = await gw.generateSummary("Some content to summarize");
    expect(r.ok).toBe(true);
    expect(r.value?.summary).toMatch(/\[mock summary\]/);
  });

  it("detectRedactionHints works end-to-end", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const r = await gw.detectRedactionHints("password=secret123");
    expect(r.ok).toBe(true);
    expect(r.value?.length).toBeGreaterThan(0);
  });

  it("rewriteQuery and rerank work end-to-end", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const rewrite = await gw.rewriteQuery("how to deploy");
    expect(rewrite.ok).toBe(true);

    const reranked = await gw.rerank("deploy production", [
      { id: "m1", text: "production deployment guide" },
      { id: "m2", text: "database config" },
    ]);
    expect(reranked.ok).toBe(true);
    expect(reranked.value?.[0].id).toBe("m1");
  });
});

describe("ModelGateway — budget enforcement", () => {
  it("rejects input that exceeds per-job byte limit", async () => {
    const gw = new ModelGateway({
      provider: new MockProvider(),
      budget: { maxInputBytesPerJob: 10 },
    });
    const r = await gw.generateTitle("This text is definitely longer than ten bytes");
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe(true);
    expect(r.error).toContain("per-job limit");
  });

  it("rejects when hourly job limit is exhausted", async () => {
    const gw = new ModelGateway({
      provider: new MockProvider(),
      budget: { maxJobsPerHour: 2 },
    });
    await gw.generateTitle("t1");
    await gw.generateTitle("t2");
    const r = await gw.generateTitle("t3");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("hourly");
  });

  it("rejects when daily job limit is exhausted", async () => {
    const gw = new ModelGateway({
      provider: new MockProvider(),
      budget: { maxDailyJobs: 1, maxJobsPerHour: 100 },
    });
    await gw.generateTitle("t1");
    const r = await gw.generateTitle("t2");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("daily");
  });

  it("returns fallback value (not null) on budget rejection", async () => {
    const gw = new ModelGateway({
      provider: new MockProvider(),
      budget: { maxInputBytesPerJob: 1 },
    });
    const r = await gw.generateTitle("longer than one byte");
    expect(r.value).toEqual({ title: "", confidence: 0 });
    expect(r.value).not.toBeNull();
  });
});

describe("ModelGateway — error recovery", () => {
  it("catches provider errors and returns fallback without throwing", async () => {
    const badProvider = new MockProvider();
    // Override one method to throw
    badProvider.generateTitle = async () => {
      throw new Error("simulated model error");
    };

    const gw = new ModelGateway({ provider: badProvider });
    const r = await gw.generateTitle("text");
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe(true);
    expect(r.error).toBe("simulated model error");
    expect(r.value).toEqual({ title: "", confidence: 0 });
  });
});
