import { describe, expect, it } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runEval, persistRun, loadRuns, diffRuns, type EvalDataset, type RetrievalFn } from "../src/runner.js";

const fixtureDataset: EvalDataset = {
  name: "test-dataset",
  items: [
    { id: "q1", query: "preferred model", expected_memory_ids: ["mem_a", "mem_b"] },
    { id: "q2", query: "package manager", expected_memory_ids: ["mem_c"] }
  ]
};

const perfectRetrieve: RetrievalFn = async (_query, { k }) => {
  return [
    { memoryId: "mem_a", score: 0.99 },
    { memoryId: "mem_b", score: 0.95 },
    { memoryId: "mem_c", score: 0.90 }
  ].slice(0, k);
};

const emptyRetrieve: RetrievalFn = async () => [];

describe("runEval", () => {
  it("computes perfect recall and precision when all expected ids are returned", async () => {
    const result = await runEval(fixtureDataset, perfectRetrieve, { k: 5 });

    expect(result.runId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.datasetName).toBe("test-dataset");
    expect(result.k).toBe(5);
    expect(result.metrics.recallAtK).toBeCloseTo(1, 5);
    expect(result.perItem).toHaveLength(2);
    expect(result.perItem[0].id).toBe("q1");
    expect(result.perItem[0].recall).toBeCloseTo(1, 5);
  });

  it("computes zero metrics when retrieve returns nothing", async () => {
    const result = await runEval(fixtureDataset, emptyRetrieve, { k: 5 });

    expect(result.metrics.recallAtK).toBe(0);
    expect(result.metrics.precisionAtK).toBe(0);
    expect(result.metrics.mrr).toBe(0);
  });

  it("computes MRR correctly when first relevant is at rank 2", async () => {
    const retrieve: RetrievalFn = async () => [
      { memoryId: "irrelevant", score: 0.9 },
      { memoryId: "mem_a", score: 0.8 }
    ];
    const dataset: EvalDataset = {
      name: "mrr-test",
      items: [{ id: "q1", query: "foo", expected_memory_ids: ["mem_a"] }]
    };
    const result = await runEval(dataset, retrieve, { k: 5 });

    expect(result.perItem[0].rr).toBeCloseTo(0.5, 5);
    expect(result.metrics.mrr).toBeCloseTo(0.5, 5);
  });

  it("reports stale hit rate when staleScore is high", async () => {
    const retrieve: RetrievalFn = async () => [
      { memoryId: "mem_a", score: 0.9, staleScore: 0.9 },
      { memoryId: "mem_b", score: 0.8, staleScore: 0.1 }
    ];
    const dataset: EvalDataset = {
      name: "stale-test",
      items: [{ id: "q1", query: "foo", expected_memory_ids: ["mem_a", "mem_b"] }]
    };
    const result = await runEval(dataset, retrieve, { k: 5 });

    expect(result.metrics.staleHitRate).toBeCloseTo(0.5, 5);
  });

  it("passes projectId to retrieve function", async () => {
    let capturedProjectId: string | undefined;
    const retrieve: RetrievalFn = async (_q, opts) => {
      capturedProjectId = opts.projectId;
      return [];
    };
    await runEval(fixtureDataset, retrieve, { k: 3, projectId: "my-project" });
    expect(capturedProjectId).toBe("my-project");
  });
});

describe("persistRun and loadRuns", () => {
  it("round-trips a result through JSON serialisation", async () => {
    const result = await runEval(fixtureDataset, perfectRetrieve, { k: 3 });
    const dir = join(tmpdir(), `lore-eval-test-${Date.now()}`);

    const filePath = await persistRun(result, dir);
    expect(filePath).toContain(".json");

    const loaded = await loadRuns(dir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].runId).toBe(result.runId);
    expect(loaded[0].datasetName).toBe("test-dataset");
    expect(loaded[0].metrics.recallAtK).toBeCloseTo(result.metrics.recallAtK, 5);
  });

  it("returns empty array for a non-existent directory", async () => {
    const loaded = await loadRuns("/tmp/this-dir-does-not-exist-lore-eval-xyz");
    expect(loaded).toEqual([]);
  });
});

describe("diffRuns", () => {
  it("detects recall regression when curr recall drops", async () => {
    const prev = await runEval(fixtureDataset, perfectRetrieve, { k: 5 });
    const curr = await runEval(fixtureDataset, emptyRetrieve, { k: 5 });

    const diff = diffRuns(prev, curr);
    expect(diff.regressions).toContain("recallAtK");
    expect(diff.regressions).toContain("mrr");
    expect(diff.metricDelta.recallAtK).toBeLessThan(0);
  });

  it("does not flag improvement as regression", async () => {
    const prev = await runEval(fixtureDataset, emptyRetrieve, { k: 5 });
    const curr = await runEval(fixtureDataset, perfectRetrieve, { k: 5 });

    const diff = diffRuns(prev, curr);
    expect(diff.regressions).not.toContain("recallAtK");
    expect(diff.metricDelta.recallAtK).toBeGreaterThan(0);
  });
});
