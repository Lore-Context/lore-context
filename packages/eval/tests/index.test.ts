import { describe, expect, it } from "vitest";
import { meanReciprocalRank, percentile, precisionAtK, recallAtK, reciprocalRank, staleHitRate } from "../src/index.js";

describe("retrieval metrics", () => {
  it("calculates recall@k", () => {
    expect(recallAtK(["a", "b"], ["a", "x", "b"], 2)).toBe(0.5);
  });

  it("calculates precision@k", () => {
    expect(precisionAtK(["a", "b"], ["a", "x", "b"], 2)).toBe(0.5);
  });

  it("calculates reciprocal-rank metrics", () => {
    expect(reciprocalRank(["b"], ["a", "b"])).toBe(0.5);
    expect(meanReciprocalRank([{ relevantIds: ["b"], retrievedIds: ["a", "b"] }])).toBe(0.5);
  });

  it("calculates stale hit rate and percentiles", () => {
    expect(staleHitRate([{ stale: true }, { stale: false }])).toBe(0.5);
    expect(percentile([100, 200, 300], 95)).toBe(300);
  });
});
