import { describe, it, expect } from "vitest";
import { ModelGateway } from "../src/gateway.js";
import { MockProvider } from "../src/providers/mock.js";
import {
  enrichCandidate,
  analyzeForDeduplication,
  enhanceRecall,
} from "../src/intelligence.js";

describe("enrichCandidate", () => {
  it("returns title, summary, and redaction hints from mock provider", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const result = await enrichCandidate(gw, "Use pnpm build to compile the project");

    expect(result.title.ok).toBe(true);
    expect(result.title.value?.title).toMatch(/\[mock\]/);

    expect(result.summary.ok).toBe(true);
    expect(result.summary.value?.summary).toMatch(/\[mock summary\]/);

    expect(result.redactionHints.ok).toBe(true);
    expect(Array.isArray(result.redactionHints.value)).toBe(true);
  });

  it("flags credentials in redaction hints", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const result = await enrichCandidate(gw, "api_key=sk-abc123 remember to rotate keys");

    expect(result.redactionHints.ok).toBe(true);
    expect(result.redactionHints.value!.length).toBeGreaterThan(0);
    expect(result.redactionHints.value![0].severity).toBe("high");
  });

  it("returns usable fallback values when gateway is disabled — no local model required", async () => {
    const gw = new ModelGateway(); // default noop, no keys, no model
    const result = await enrichCandidate(gw, "Some memory content about deployment");

    expect(result.title.fallback).toBe(true);
    expect(result.summary.fallback).toBe(true);
    expect(result.redactionHints.fallback).toBe(true);

    // Values are non-null and safe to use
    expect(result.title.value).toEqual({ title: "", confidence: 0 });
    expect(result.summary.value).toEqual({ summary: "", confidence: 0 });
    expect(result.redactionHints.value).toEqual([]);
  });

  it("respects summaryMaxChars parameter", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const longContent = "word ".repeat(200);
    const result = await enrichCandidate(gw, longContent, 50);

    const contentPart = result.summary.value!.summary.replace("[mock summary] ", "");
    expect(contentPart.length).toBeLessThanOrEqual(50);
  });
});

describe("analyzeForDeduplication", () => {
  it("detects duplicates and stale content with mock provider", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const result = await analyzeForDeduplication(
      gw,
      "use pnpm build to compile the project",
      ["use pnpm build to compile the project and run tests"],
      ["recent context about deployment pipeline"],
    );

    expect(result.duplicates.ok).toBe(true);
    expect(result.staleConflicts.ok).toBe(true);
    expect(result.duplicates.value!.length).toBe(1);
    expect(result.duplicates.value![0].similarity).toBeGreaterThan(0.5);
  });

  it("returns empty arrays with no overlap", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const result = await analyzeForDeduplication(
      gw,
      "completely unique memory about oranges",
      ["unrelated content about spaceships"],
      ["ctx"],
    );
    expect(result.duplicates.value).toEqual([]);
  });

  it("works cleanly with disabled gateway — product stays functional", async () => {
    const gw = new ModelGateway();
    const result = await analyzeForDeduplication(gw, "content", ["other"], ["ctx"]);

    expect(result.duplicates.fallback).toBe(true);
    expect(result.staleConflicts.fallback).toBe(true);
    expect(result.duplicates.value).toEqual([]);
    expect(result.staleConflicts.value).toEqual([]);
  });
});

describe("enhanceRecall", () => {
  const candidates = [
    { id: "m1", text: "production deployment steps using pnpm build" },
    { id: "m2", text: "database migration guide for postgres" },
  ];

  it("rewrites query and reranks with mock provider", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    const result = await enhanceRecall(gw, "deploy production pnpm", candidates);

    expect(result.queryRewrite.ok).toBe(true);
    expect(result.queryRewrite.value?.rewritten).toContain("deploy production pnpm");
    expect(result.reranked.ok).toBe(true);
    expect(result.reranked.value?.length).toBe(2);
    // m1 should rank higher due to keyword overlap with "deploy production pnpm"
    expect(result.reranked.value![0].id).toBe("m1");
  });

  it("falls back gracefully with disabled gateway — returns passthrough rank", async () => {
    const gw = new ModelGateway();
    const result = await enhanceRecall(gw, "deploy steps", candidates);

    expect(result.queryRewrite.fallback).toBe(true);
    // Even on fallback, reranked has results (passthrough order)
    expect(result.reranked.value?.length).toBe(2);
    expect(result.reranked.value![0].id).toBe("m1");
  });

  it("uses rewritten query for reranking when rewrite succeeds", async () => {
    const gw = new ModelGateway({ provider: new MockProvider() });
    // rewriteQuery appends "context history" — the reranking uses the rewritten query
    const result = await enhanceRecall(gw, "pnpm deploy", candidates);
    expect(result.queryRewrite.value?.rewritten).toContain("context history");
  });
});
