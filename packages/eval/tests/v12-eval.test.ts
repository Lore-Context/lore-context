import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mockEmbed, cosineSimilarity, rankByCosine, MOCK_EMBED_DIM } from "../src/mock-embed.js";
import { ABLATION_CONFIGS, getAblationConfig } from "../src/ablation.js";
import {
  runEvalV12,
  applyGate,
  computeNegativeHitRate,
} from "../src/runner-v12.js";
import type {
  EvalDatasetV12,
  RetrievalFnV12,
  EvalRunResultV12,
  PerItemV12,
} from "../src/runner-v12.js";
import type { GateConfig, EvalCaseV12 } from "../src/types-v12.js";

// ─── deterministic mock embedding ──────────────────────────────────────────

describe("mockEmbed", () => {
  it("produces a Float32Array of the configured dimension", () => {
    const v = mockEmbed("hello world");
    expect(v).toBeInstanceOf(Float32Array);
    expect(v.length).toBe(MOCK_EMBED_DIM);
  });

  it("is byte-reproducible: same text → same vector", () => {
    const a = mockEmbed("vector indexing configuration");
    const b = mockEmbed("vector indexing configuration");
    expect(a).toEqual(b);
  });

  it("different texts produce different vectors", () => {
    const a = mockEmbed("apple");
    const b = mockEmbed("orange");
    expect(a).not.toEqual(b);
  });

  it("output is L2-normalised (length ≈ 1.0)", () => {
    const v = mockEmbed("normalise me");
    let norm = 0;
    for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
    expect(Math.sqrt(norm)).toBeCloseTo(1.0, 4);
  });

  it("respects custom dimension", () => {
    const v = mockEmbed("custom dim", 128);
    expect(v.length).toBe(128);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical normalised vectors", () => {
    const v = mockEmbed("same");
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 4);
  });

  it("returns a value in [-1, 1]", () => {
    const a = mockEmbed("foo");
    const b = mockEmbed("bar");
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it("throws on dimension mismatch", () => {
    const a = new Float32Array(4);
    const b = new Float32Array(8);
    expect(() => cosineSimilarity(a, b)).toThrow("dimension mismatch");
  });
});

describe("rankByCosine", () => {
  it("ranks candidates by cosine similarity descending", () => {
    const query = "hello world ranking test";
    const candidates = [
      { memoryId: "id-a", text: "completely unrelated topic about furniture" },
      { memoryId: "id-b", text: "hello world ranking test" },
      { memoryId: "id-c", text: "hello world ranking" },
    ];
    const ranked = rankByCosine(query, candidates, 3);
    // id-b (exact match) should be rank 1
    expect(ranked[0].memoryId).toBe("id-b");
    expect(ranked[0].score).toBeCloseTo(1.0, 4);
    // scores descending
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
  });

  it("respects k limit", () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      memoryId: `id-${i}`,
      text: `text ${i}`,
    }));
    const ranked = rankByCosine("query text", candidates, 3);
    expect(ranked).toHaveLength(3);
  });
});

// ─── ablation configs ────────────────────────────────────────────────────────

describe("ABLATION_CONFIGS", () => {
  it("contains exactly 6 configs with required ids", () => {
    const ids = ABLATION_CONFIGS.map((c) => c.id);
    expect(ids).toContain("dense-only");
    expect(ids).toContain("sparse-only");
    expect(ids).toContain("postgres-fts-only");
    expect(ids).toContain("pgvector-only");
    expect(ids).toContain("graph-only");
    expect(ids).toContain("hybrid-v12");
    expect(ids).toHaveLength(6);
  });

  it("hybrid-v12 includes all major streams", () => {
    const hybrid = getAblationConfig("hybrid-v12");
    expect(hybrid.streams).toContain("qdrant_dense");
    expect(hybrid.streams).toContain("qdrant_sparse");
    expect(hybrid.streams).toContain("postgres_fts");
    expect(hybrid.streams).toContain("postgres_pgvector");
    expect(hybrid.streams).toContain("graph");
    expect(hybrid.temporalFilterEnabled).toBe(true);
  });

  it("dense-only has only one stream and no temporal filter", () => {
    const dense = getAblationConfig("dense-only");
    expect(dense.streams).toEqual(["qdrant_dense"]);
    expect(dense.temporalFilterEnabled).toBe(false);
  });

  it("getAblationConfig throws on unknown id", () => {
    expect(() => getAblationConfig("nonexistent")).toThrow("Unknown ablation config");
  });
});

// ─── group aggregation ───────────────────────────────────────────────────────

const makeDataset = (): EvalDatasetV12 => ({
  name: "test-dataset",
  version: "1.0.0",
  items: [
    {
      id: "kw-01",
      query: "LORE_FLAG_HYBRID_RECALL",
      expected_memory_ids: ["mem:flag-hybrid-recall"],
      tags: ["keyword"],
      query_intent: "keyword",
      streams_expected: ["postgres_fts"],
    },
    {
      id: "kw-02",
      query: "dense_qwen3_1024 vector name",
      expected_memory_ids: ["mem:qdrant-vector-name"],
      tags: ["keyword"],
      query_intent: "keyword",
    },
    {
      id: "sem-01",
      query: "vector indexing configuration",
      expected_memory_ids: ["mem:qwen3-1024-config"],
      tags: ["semantic"],
      query_intent: "semantic",
      streams_expected: ["qdrant_dense"],
    },
    {
      id: "neg-01",
      query: "old model",
      expected_memory_ids: [],
      tags: ["negative"],
      query_intent: "negative",
      negative_ids: ["mem:old-model", "mem:bert"],
    },
  ],
});

const ablation = getAblationConfig("dense-only");

const makeRetrieve = (
  hits: Record<string, Array<{ memoryId: string; score: number; streamsFired?: string[] }>>
): RetrievalFnV12 => {
  return async (query) => {
    return hits[query] ?? [];
  };
};

describe("runEvalV12 group aggregation", () => {
  it("aggregates recallAtK per group correctly", async () => {
    const retrieve = makeRetrieve({
      "LORE_FLAG_HYBRID_RECALL": [{ memoryId: "mem:flag-hybrid-recall", score: 1.0, streamsFired: ["postgres_fts"] }],
      "dense_qwen3_1024 vector name": [{ memoryId: "mem:qdrant-vector-name", score: 0.9, streamsFired: ["postgres_fts"] }],
      "vector indexing configuration": [],
      "old model": [],
    });

    const result = await runEvalV12(makeDataset(), retrieve, { k: 5, ablationConfig: ablation });

    // keyword group: both kw items hit → recall 1.0 each → mean 1.0
    expect(result.aggregateByGroup["keyword"]?.recallAtK).toBeCloseTo(1.0, 4);
    expect(result.aggregateByGroup["keyword"]?.caseCount).toBe(2);

    // semantic group: sem-01 missed → recall 0
    expect(result.aggregateByGroup["semantic"]?.recallAtK).toBeCloseTo(0, 4);
    expect(result.aggregateByGroup["semantic"]?.caseCount).toBe(1);
  });

  it("computes MRR per group", async () => {
    const retrieve = makeRetrieve({
      "LORE_FLAG_HYBRID_RECALL": [
        { memoryId: "irrelevant", score: 0.9 },
        { memoryId: "mem:flag-hybrid-recall", score: 0.8 },
      ],
      "dense_qwen3_1024 vector name": [{ memoryId: "mem:qdrant-vector-name", score: 0.9 }],
      "vector indexing configuration": [],
      "old model": [],
    });

    const result = await runEvalV12(makeDataset(), retrieve, { k: 5, ablationConfig: ablation });
    // kw-01 RR = 0.5 (rank 2), kw-02 RR = 1.0 → mean 0.75
    expect(result.aggregateByGroup["keyword"]?.mrr).toBeCloseTo(0.75, 4);
  });

  it("populates negativeHitRate for negative group", async () => {
    const retrieve = makeRetrieve({
      "LORE_FLAG_HYBRID_RECALL": [{ memoryId: "mem:flag-hybrid-recall", score: 1.0 }],
      "dense_qwen3_1024 vector name": [{ memoryId: "mem:qdrant-vector-name", score: 0.9 }],
      "vector indexing configuration": [],
      // neg-01 returns both negative ids → negativeHitRate = 1.0
      "old model": [
        { memoryId: "mem:old-model", score: 0.7 },
        { memoryId: "mem:bert", score: 0.6 },
      ],
    });

    const result = await runEvalV12(makeDataset(), retrieve, { k: 5, ablationConfig: ablation });
    expect(result.aggregateByGroup["negative"]?.negativeHitRate).toBeCloseTo(1.0, 4);
  });
});

// ─── negativeHitRate ─────────────────────────────────────────────────────────

describe("computeNegativeHitRate", () => {
  const makeCases = (): EvalCaseV12[] => [
    {
      id: "c1",
      query: "q1",
      expected_memory_ids: [],
      tags: ["negative"],
      query_intent: "negative",
      negative_ids: ["bad-a", "bad-b"],
    },
    {
      id: "c2",
      query: "q2",
      expected_memory_ids: ["good"],
      tags: ["semantic"],
      query_intent: "semantic",
    },
  ];

  it("returns 0 when no negative items appear in top-K", () => {
    const perItem: PerItemV12[] = [
      {
        id: "c1",
        recall: 0,
        precision: 0,
        rr: 0,
        latencyMs: 5,
        hits: ["good-1"],
        topKIds: ["good-1"],
        expectedTopKIds: [],
        streamsFired: [],
        expectedStreams: [],
        negativeHits: [],
        lifecycle: { supersededExcluded: 0, expiredExcluded: 0, deletedExcluded: 0 },
        fusionWeightsApplied: {},
        latencyBreakdownMs: {},
        rootCauseHints: [],
      },
      {
        id: "c2",
        recall: 1,
        precision: 1,
        rr: 1,
        latencyMs: 5,
        hits: ["good"],
        topKIds: ["good"],
        expectedTopKIds: ["good"],
        streamsFired: [],
        expectedStreams: [],
        negativeHits: [],
        lifecycle: { supersededExcluded: 0, expiredExcluded: 0, deletedExcluded: 0 },
        fusionWeightsApplied: {},
        latencyBreakdownMs: {},
        rootCauseHints: [],
      },
    ];
    expect(computeNegativeHitRate(perItem, makeCases())).toBe(0);
  });

  it("returns 1.0 when all negative items appear in top-K", () => {
    const perItem: PerItemV12[] = [
      {
        id: "c1",
        recall: 0,
        precision: 0,
        rr: 0,
        latencyMs: 5,
        hits: ["bad-a", "bad-b"],
        topKIds: ["bad-a", "bad-b"],
        expectedTopKIds: [],
        streamsFired: [],
        expectedStreams: [],
        negativeHits: ["bad-a", "bad-b"],
        lifecycle: { supersededExcluded: 0, expiredExcluded: 0, deletedExcluded: 0 },
        fusionWeightsApplied: {},
        latencyBreakdownMs: {},
        rootCauseHints: [],
      },
      {
        id: "c2",
        recall: 1,
        precision: 1,
        rr: 1,
        latencyMs: 5,
        hits: ["good"],
        topKIds: ["good"],
        expectedTopKIds: ["good"],
        streamsFired: [],
        expectedStreams: [],
        negativeHits: [],
        lifecycle: { supersededExcluded: 0, expiredExcluded: 0, deletedExcluded: 0 },
        fusionWeightsApplied: {},
        latencyBreakdownMs: {},
        rootCauseHints: [],
      },
    ];
    expect(computeNegativeHitRate(perItem, makeCases())).toBeCloseTo(1.0, 4);
  });

  it("returns 0 when no cases have negative_ids", () => {
    const cases: EvalCaseV12[] = [
      { id: "c1", query: "q", expected_memory_ids: ["x"], tags: [], query_intent: "semantic" },
    ];
    const items: PerItemV12[] = [
      {
        id: "c1",
        recall: 1,
        precision: 1,
        rr: 1,
        latencyMs: 5,
        hits: [],
        topKIds: [],
        expectedTopKIds: [],
        streamsFired: [],
        expectedStreams: [],
        negativeHits: [],
        lifecycle: { supersededExcluded: 0, expiredExcluded: 0, deletedExcluded: 0 },
        fusionWeightsApplied: {},
        latencyBreakdownMs: {},
        rootCauseHints: [],
      },
    ];
    expect(computeNegativeHitRate(items, cases)).toBe(0);
  });
});

// ─── gate pass / fail ────────────────────────────────────────────────────────

const makeGate = (): GateConfig => ({
  version: "v1.2",
  k: 5,
  thresholds: [
    { metric: "recallAtK", min: 0.75 },
    { metric: "staleHitRate", max: 0.05 },
    { metric: "negativeHitRate", max: 0.0 },
    { metric: "recallAtK_keyword_group", min: 0.9 },
  ],
});

const makePassingResult = (): EvalRunResultV12 => ({
  runId: "test-run",
  datasetName: "test",
  timestamp: new Date().toISOString(),
  k: 5,
  engineVersion: "v12",
  ablationConfig: getAblationConfig("hybrid-v12"),
  metrics: {
    recallAtK: 0.9,
    precisionAtK: 0.8,
    mrr: 0.85,
    staleHitRate: 0.0,
    latencyP95Ms: 50,
  },
  gateResult: { passed: false, failedThresholds: [] },
  aggregateByGroup: {
    keyword: { recallAtK: 0.95, mrr: 0.9, caseCount: 5 },
    semantic: { recallAtK: 0.85, mrr: 0.8, caseCount: 4 },
  },
  perItem: [],
});

const makePassingCases = (): EvalCaseV12[] => [];

describe("applyGate", () => {
  it("passes when all thresholds are satisfied", () => {
    const result = makePassingResult();
    const gated = applyGate(result, makeGate(), makePassingCases());
    expect(gated.gateResult.passed).toBe(true);
    expect(gated.gateResult.failedThresholds).toHaveLength(0);
  });

  it("fails when recallAtK is below min threshold", () => {
    const result = makePassingResult();
    result.metrics.recallAtK = 0.5;
    const gated = applyGate(result, makeGate(), makePassingCases());
    expect(gated.gateResult.passed).toBe(false);
    const failed = gated.gateResult.failedThresholds.find((f) => f.metric === "recallAtK");
    expect(failed).toBeDefined();
    expect(failed!.direction).toBe("min");
    expect(failed!.actual).toBeCloseTo(0.5, 4);
    expect(failed!.delta).toBeLessThan(0);
  });

  it("fails when staleHitRate exceeds max threshold", () => {
    const result = makePassingResult();
    result.metrics.staleHitRate = 0.1;
    const gated = applyGate(result, makeGate(), makePassingCases());
    expect(gated.gateResult.passed).toBe(false);
    const failed = gated.gateResult.failedThresholds.find((f) => f.metric === "staleHitRate");
    expect(failed).toBeDefined();
    expect(failed!.direction).toBe("max");
    expect(failed!.delta).toBeGreaterThan(0);
  });

  it("fails when group-level recallAtK_keyword_group is below threshold", () => {
    const result = makePassingResult();
    result.aggregateByGroup["keyword"]!.recallAtK = 0.7;
    const gated = applyGate(result, makeGate(), makePassingCases());
    expect(gated.gateResult.passed).toBe(false);
    const failed = gated.gateResult.failedThresholds.find(
      (f) => f.metric === "recallAtK_keyword_group"
    );
    expect(failed).toBeDefined();
  });

  it("fails on negativeHitRate > 0 when threshold is max=0", () => {
    const cases: EvalCaseV12[] = [
      {
        id: "n1",
        query: "q",
        expected_memory_ids: [],
        tags: ["negative"],
        query_intent: "negative",
        negative_ids: ["bad"],
      },
    ];
    const perItem: PerItemV12[] = [
      {
        id: "n1",
        recall: 0,
        precision: 0,
        rr: 0,
        latencyMs: 5,
        hits: ["bad"],
        topKIds: ["bad"],
        expectedTopKIds: [],
        streamsFired: [],
        expectedStreams: [],
        negativeHits: ["bad"],
        lifecycle: { supersededExcluded: 0, expiredExcluded: 0, deletedExcluded: 0 },
        fusionWeightsApplied: {},
        latencyBreakdownMs: {},
        rootCauseHints: [],
      },
    ];
    const result: EvalRunResultV12 = {
      ...makePassingResult(),
      perItem,
    };
    const gated = applyGate(result, makeGate(), cases);
    expect(gated.gateResult.passed).toBe(false);
    const failed = gated.gateResult.failedThresholds.find((f) => f.metric === "negativeHitRate");
    expect(failed).toBeDefined();
    expect(failed!.actual).toBeGreaterThan(0);
  });

  it("applies relative uplift threshold against baseline", () => {
    const gate: GateConfig = {
      version: "v1.2",
      k: 5,
      thresholds: [
        {
          metric: "recallAtK",
          min: 0.1,
          relative_uplift_vs: "dense-only",
          min_uplift: 0.5,
        },
      ],
    };
    const baseline = makePassingResult();
    baseline.metrics.recallAtK = 0.6;

    const result = makePassingResult();
    // result recall = 0.9 but baseline * 1.5 = 0.9 exactly → should pass (≥ 0.9)
    result.metrics.recallAtK = 0.9;
    const gated = applyGate(result, gate, [], baseline);
    expect(gated.gateResult.passed).toBe(true);

    // result recall = 0.85 < 0.6 * 1.5 = 0.9 → fail
    result.metrics.recallAtK = 0.85;
    const gatedFail = applyGate(result, gate, [], baseline);
    expect(gatedFail.gateResult.passed).toBe(false);
  });

  it("skips unknown metric gracefully", () => {
    const gate: GateConfig = {
      version: "v1.2",
      k: 5,
      thresholds: [{ metric: "unknownMetricXYZ", min: 0.99 }],
    };
    const result = makePassingResult();
    const gated = applyGate(result, gate, []);
    // Unknown metric → no threshold evaluated → passes
    expect(gated.gateResult.passed).toBe(true);
  });
});

// ─── runEvalV12 end-to-end ───────────────────────────────────────────────────

describe("runEvalV12 metrics", () => {
  const dataset: EvalDatasetV12 = {
    name: "e2e-test",
    version: "1.0.0",
    items: [
      {
        id: "q1",
        query: "foo",
        expected_memory_ids: ["mem-a", "mem-b"],
        tags: ["semantic"],
        query_intent: "semantic",
      },
      {
        id: "q2",
        query: "bar",
        expected_memory_ids: ["mem-c"],
        tags: ["keyword"],
        query_intent: "keyword",
        negative_ids: ["mem-bad"],
      },
    ],
  };

  it("overall recallAtK, precisionAtK, mrr computed correctly", async () => {
    const retrieve: RetrievalFnV12 = async (query) => {
      if (query === "foo") {
        return [
          { memoryId: "mem-a", score: 0.9 },
          { memoryId: "mem-b", score: 0.8 },
        ];
      }
      return [{ memoryId: "mem-c", score: 0.7 }];
    };

    const result = await runEvalV12(dataset, retrieve, {
      k: 5,
      ablationConfig: getAblationConfig("dense-only"),
    });

    expect(result.metrics.recallAtK).toBeCloseTo(1.0, 4);
    expect(result.metrics.mrr).toBeCloseTo(1.0, 4);
    expect(result.engineVersion).toBe("v12");
  });

  it("staleHitRate reflects high staleScore hits", async () => {
    const retrieve: RetrievalFnV12 = async () => [
      { memoryId: "mem-a", score: 0.9, staleScore: 0.9 },
      { memoryId: "mem-b", score: 0.8, staleScore: 0.1 },
    ];
    const result = await runEvalV12(dataset, retrieve, {
      k: 5,
      ablationConfig: ablation,
    });
    // 2 stale out of 4 total top-K hits across 2 items → 0.5
    expect(result.metrics.staleHitRate).toBeCloseTo(0.5, 4);
  });

  it("negativeHits populated when negative_ids appear in top-K", async () => {
    const retrieve: RetrievalFnV12 = async (query) => {
      if (query === "bar") {
        return [
          { memoryId: "mem-bad", score: 0.9 },
          { memoryId: "mem-c", score: 0.8 },
        ];
      }
      return [];
    };
    const result = await runEvalV12(dataset, retrieve, {
      k: 5,
      ablationConfig: ablation,
    });
    const q2 = result.perItem.find((p) => p.id === "q2");
    expect(q2?.negativeHits).toContain("mem-bad");
  });

  it("streamsFired collected from results", async () => {
    const retrieve: RetrievalFnV12 = async () => [
      { memoryId: "mem-a", score: 0.9, streamsFired: ["postgres_fts", "qdrant_dense"] },
    ];
    const result = await runEvalV12(dataset, retrieve, {
      k: 5,
      ablationConfig: ablation,
    });
    expect(result.perItem[0].streamsFired).toContain("postgres_fts");
    expect(result.perItem[0].streamsFired).toContain("qdrant_dense");
  });

  it("rootCauseHints includes fts_stream_not_fired when postgres_fts expected but not fired", async () => {
    const testDataset: EvalDatasetV12 = {
      name: "hints-test",
      version: "1.0.0",
      items: [
        {
          id: "h1",
          query: "keyword query",
          expected_memory_ids: ["mem-x"],
          tags: ["keyword"],
          query_intent: "keyword",
          streams_expected: ["postgres_fts"],
        },
      ],
    };
    const retrieve: RetrievalFnV12 = async () => [
      { memoryId: "mem-x", score: 0.9, streamsFired: ["qdrant_dense"] },
    ];
    const result = await runEvalV12(testDataset, retrieve, {
      k: 5,
      ablationConfig: ablation,
    });
    expect(result.perItem[0].rootCauseHints).toContain("fts_stream_not_fired");
  });

  it("uses fixed clock from opts.now for validAt", async () => {
    const fixedDate = new Date("2026-03-01T00:00:00.000Z");
    let capturedValidAt: string | undefined;
    const retrieve: RetrievalFnV12 = async (_q, opts) => {
      capturedValidAt = opts.validAt;
      return [];
    };
    const testDataset: EvalDatasetV12 = {
      name: "clock-test",
      version: "1.0.0",
      items: [{ id: "t1", query: "q", expected_memory_ids: [], tags: [], query_intent: "semantic" }],
    };
    await runEvalV12(testDataset, retrieve, {
      k: 5,
      ablationConfig: ablation,
      now: () => fixedDate,
    });
    expect(capturedValidAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("item valid_at overrides opts.now", async () => {
    let capturedValidAt: string | undefined;
    const retrieve: RetrievalFnV12 = async (_q, opts) => {
      capturedValidAt = opts.validAt;
      return [];
    };
    const testDataset: EvalDatasetV12 = {
      name: "validat-test",
      version: "1.0.0",
      items: [
        {
          id: "v1",
          query: "q",
          expected_memory_ids: [],
          tags: [],
          query_intent: "temporal",
          valid_at: "2026-01-15T00:00:00Z",
        },
      ],
    };
    await runEvalV12(testDataset, retrieve, {
      k: 5,
      ablationConfig: ablation,
      now: () => new Date("2026-05-04T00:00:00Z"),
    });
    expect(capturedValidAt).toBe("2026-01-15T00:00:00Z");
  });
});

// ─── run-v12-eval.mjs script helper smoke ────────────────────────────────────

describe("run-v12-eval.mjs script integrity", () => {
  const scriptPath = join(__dirname, "../../../scripts/run-v12-eval.mjs");
  let scriptText: string;

  try {
    scriptText = readFileSync(scriptPath, "utf-8");
  } catch {
    scriptText = "";
  }

  // Helpers that are called inside the script and must be defined in the same file.
  const requiredHelpers = ["ftsMatch", "isFiltered", "buildCorpus", "buildRetrievalFn", "buildMarkdownReport", "resolveActual"];

  for (const fn of requiredHelpers) {
    it(`defines helper function: ${fn}`, () => {
      expect(scriptText.length, `script file not found at ${scriptPath}`).toBeGreaterThan(0);
      // Match a plain function declaration or arrow/const assignment for the name.
      const defined =
        new RegExp(`function ${fn}\\b`).test(scriptText) ||
        new RegExp(`const ${fn}\\s*=`).test(scriptText);
      expect(defined, `${fn} is called but not defined in run-v12-eval.mjs`).toBe(true);
    });
  }
});
