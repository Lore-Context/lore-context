// v1.3 Lane E — ablation harness extension tests.
// Verifies that:
//   * Every required v1.3 ablation config name is wired.
//   * Net-new single-stream configs (graph-only / temporal-only / wiki-only)
//     map to a single stream.
//   * `all-streams-on` carries every one of the seven candidate-emitting kinds.
//   * The harness output JSON shape conforms to what
//     `scripts/release/check-v13-prod-gate.mjs` reads (smoke tests).

import { describe, expect, it } from "vitest";
import {
  V13_ABLATION_CONFIGS,
  V13_ABLATION_CONFIG_IDS,
  V13_STREAM_WEIGHTS,
  ALL_STREAMS,
  getV13AblationConfig,
  runV13Ablation,
  type V13AblationReport,
} from "../src/ablation-v13.js";
import type {
  EvalDatasetV12,
  RetrievalFnV12,
} from "../src/runner-v12.js";

const REQUIRED_CONFIG_IDS = [
  "graph-only",
  "temporal-only",
  "wiki-only",
  "graph-on",
  "graph-off",
  "temporal-on",
  "temporal-off",
  "wiki-on",
  "wiki-off",
  "reranker-on",
  "reranker-off",
  "all-streams-on",
];

describe("V13_ABLATION_CONFIGS", () => {
  it("includes every required v1.3 config id from plan §3 Lane E item 1", () => {
    for (const id of REQUIRED_CONFIG_IDS) {
      expect(V13_ABLATION_CONFIG_IDS).toContain(id);
    }
  });

  it("graph-only / temporal-only / wiki-only each carry exactly one stream", () => {
    expect(getV13AblationConfig("graph-only").streams).toEqual(["graph"]);
    expect(getV13AblationConfig("temporal-only").streams).toEqual(["temporal"]);
    expect(getV13AblationConfig("wiki-only").streams).toEqual(["wiki"]);
  });

  it("all-streams-on includes every one of the 7 stream kinds", () => {
    const config = getV13AblationConfig("all-streams-on");
    for (const stream of ALL_STREAMS) {
      expect(config.streams).toContain(stream);
    }
    expect(config.streams).toHaveLength(7);
  });

  it("reranker-on / reranker-off differ only in rerankerEnabled", () => {
    const on = getV13AblationConfig("reranker-on");
    const off = getV13AblationConfig("reranker-off");
    expect(on.streams).toEqual(off.streams);
    expect(on.rerankerEnabled).toBe(true);
    expect(off.rerankerEnabled).toBe(false);
  });

  it("graph-off excludes graph stream while graph-on includes it", () => {
    expect(getV13AblationConfig("graph-on").streams).toContain("graph");
    expect(getV13AblationConfig("graph-off").streams).not.toContain("graph");
  });

  it("temporal-off excludes temporal while temporal-on includes it", () => {
    expect(getV13AblationConfig("temporal-on").streams).toContain("temporal");
    expect(getV13AblationConfig("temporal-off").streams).not.toContain(
      "temporal",
    );
  });

  it("wiki-off excludes wiki while wiki-on includes it", () => {
    expect(getV13AblationConfig("wiki-on").streams).toContain("wiki");
    expect(getV13AblationConfig("wiki-off").streams).not.toContain("wiki");
  });

  it("getV13AblationConfig throws on unknown id", () => {
    expect(() => getV13AblationConfig("does-not-exist")).toThrow(
      "Unknown v1.3 ablation config",
    );
  });

  it("V13_STREAM_WEIGHTS covers every stream kind", () => {
    for (const stream of ALL_STREAMS) {
      expect(typeof V13_STREAM_WEIGHTS[stream]).toBe("number");
      expect(V13_STREAM_WEIGHTS[stream]).toBeGreaterThan(0);
    }
  });
});

describe("V13_ABLATION_CONFIGS — uniqueness", () => {
  it("config ids are unique", () => {
    const ids = V13_ABLATION_CONFIGS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("at least 12 configs are wired (plan §3 Lane E item 1 minimum)", () => {
    expect(V13_ABLATION_CONFIGS.length).toBeGreaterThanOrEqual(12);
  });
});

// ---------------------------------------------------------------------------
// runV13Ablation harness — output shape must match check-v13-prod-gate.mjs.
// ---------------------------------------------------------------------------

const dataset: EvalDatasetV12 = {
  name: "v13-ablation-test",
  version: "1.0.0",
  items: [
    {
      id: "sem-01",
      query: "vector indexing configuration",
      expected_memory_ids: ["mem:qwen3-1024-config"],
      tags: ["semantic"],
      streams_expected: ["qdrant_dense"],
      query_intent: "semantic",
    },
    {
      id: "rel-01",
      query: "what is the production embedding service",
      expected_memory_ids: ["mem:qwen3-serves-lore"],
      tags: ["relation"],
      streams_expected: ["graph"],
      query_intent: "relation",
    },
    {
      id: "tmp-01",
      query: "current embedding dimension",
      expected_memory_ids: ["mem:emb-dim-1024"],
      tags: ["temporal"],
      streams_expected: ["temporal"],
      query_intent: "temporal",
      valid_at: "2026-05-04T00:00:00Z",
    },
    {
      id: "wiki-01",
      query: "Lore embedding architecture overview",
      expected_memory_ids: ["mem:wiki-embedding-arch"],
      tags: ["wiki"],
      streams_expected: ["wiki"],
      query_intent: "wiki",
    },
  ],
};

// Deterministic offline retrieve fn that surfaces the expected mem id when the
// config's stream set covers the corresponding query_intent.
const retrieve: RetrievalFnV12 = async (query, opts) => {
  const config = opts.ablationConfig!;
  const enabled = new Set(config.streams);
  // Pick the first matching answer key by query string.
  const map: Record<string, { id: string; needs: string[] }> = {
    "vector indexing configuration": {
      id: "mem:qwen3-1024-config",
      needs: ["qdrant_dense", "postgres_pgvector"],
    },
    "what is the production embedding service": {
      id: "mem:qwen3-serves-lore",
      needs: ["graph"],
    },
    "current embedding dimension": {
      id: "mem:emb-dim-1024",
      needs: ["temporal", "postgres_fts"],
    },
    "Lore embedding architecture overview": {
      id: "mem:wiki-embedding-arch",
      needs: ["wiki"],
    },
  };
  const hit = map[query];
  if (!hit) return [];
  const fired = hit.needs.filter((s) => enabled.has(s as never));
  if (fired.length === 0) return [];
  return [
    {
      memoryId: hit.id,
      score: 1.0,
      streamsFired: fired,
    },
  ];
};

describe("runV13Ablation harness", () => {
  it("emits a report whose configs cover every required v1.3 ablation id", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    for (const id of REQUIRED_CONFIG_IDS) {
      expect(report.configs[id]).toBeDefined();
      expect(typeof report.configs[id].recallAt5).toBe("number");
      expect(typeof report.configs[id].queryTypeRecallAt5).toBe("object");
    }
  });

  it("populates streamCandidateCounts only on all-streams-on", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    expect(report.configs["all-streams-on"].streamCandidateCounts).toBeDefined();
    // Other configs do not (and must not) carry a streamCandidateCounts block.
    expect(report.configs["graph-only"].streamCandidateCounts).toBeUndefined();
    expect(
      report.configs["temporal-only"].streamCandidateCounts,
    ).toBeUndefined();
    expect(report.configs["wiki-only"].streamCandidateCounts).toBeUndefined();
  });

  it("all-streams-on streamCandidateCounts covers all 7 required gate streams with non-zero counts", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      streamCandidateCounts: {
        qdrant_dense: 5,
        qdrant_sparse: 5,
        postgres_fts: 5,
        postgres_pgvector: 5,
        graph: 4,
        temporal: 3,
        wiki: 2,
      },
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    const counts = report.configs["all-streams-on"].streamCandidateCounts!;
    for (const kind of ALL_STREAMS) {
      expect(counts[kind]).toBeGreaterThan(0);
    }
  });

  it("populates v12CoreSlices on all-streams-on when slices supplied", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      v12CoreSlices: [
        {
          caseCount: 4,
          datasetSha256: "test-hash-4",
          items: dataset.items,
        },
      ],
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    const slices = report.configs["all-streams-on"].v12CoreSlices;
    expect(Array.isArray(slices)).toBe(true);
    expect(slices!.length).toBe(1);
    expect(slices![0].datasetSha256).toBe("test-hash-4");
    expect(slices![0].caseCount).toBe(4);
    expect(typeof slices![0].recallAt5).toBe("number");
  });

  it("queryTypeRecallAt5 keys use v1.2 QueryIntent labels (semantic / relation / temporal / wiki / negative / keyword)", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    const keys = Object.keys(
      report.configs["all-streams-on"].queryTypeRecallAt5,
    );
    for (const k of keys) {
      expect([
        "semantic",
        "keyword",
        "temporal",
        "relation",
        "wiki",
        "negative",
      ]).toContain(k);
    }
  });

  it("graph-only config achieves R@5 > 0 on relation subset (gate net-new contract)", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    const relRecall = report.configs["graph-only"].queryTypeRecallAt5.relation;
    expect(relRecall).toBeGreaterThan(0);
  });

  it("temporal-only config achieves R@5 > 0 on temporal subset", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    const tmp = report.configs["temporal-only"].queryTypeRecallAt5.temporal;
    expect(tmp).toBeGreaterThan(0);
  });

  it("wiki-only config achieves R@5 > 0 on wiki subset", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    const w = report.configs["wiki-only"].queryTypeRecallAt5.wiki;
    expect(w).toBeGreaterThan(0);
  });

  it("recallAt5 values are emitted in percentage points (0-100), not 0-1", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    const r = report.configs["all-streams-on"].recallAt5;
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(100);
    // With our fixture, hybrid hits all four answers → R@5 = 100.
    expect(r).toBe(100);
  });

  it("longmemeval block is preserved when provided", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      longmemeval: {
        adapterVersion: "v1",
        datasetSha256: "lme-hash",
        recallAt5: 96.6,
      },
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    expect(report.longmemeval).toEqual({
      adapterVersion: "v1",
      datasetSha256: "lme-hash",
      recallAt5: 96.6,
    });
  });

  it("emits engineVersion=v13 and a generatedAt ISO timestamp", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    expect(report.engineVersion).toBe("v13");
    expect(report.generatedAt).toBe("2026-05-05T00:00:00.000Z");
  });

  it("local passed flag is true when no NaN / negative metrics", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    expect(report.passed).toBe(true);
    expect(report.failedThresholds).toEqual([]);
  });

  // Determinism check (plan §3 Lane E Acceptance: stable numbers across 3 runs).
  it("produces identical numbers across three back-to-back runs", async () => {
    const reports: V13AblationReport[] = [];
    for (let i = 0; i < 3; i++) {
      reports.push(
        await runV13Ablation({
          dataset,
          retrieve,
          now: () => new Date("2026-05-05T00:00:00Z"),
        }),
      );
    }
    const r0 = reports[0].configs["all-streams-on"].recallAt5;
    const r1 = reports[1].configs["all-streams-on"].recallAt5;
    const r2 = reports[2].configs["all-streams-on"].recallAt5;
    expect(r0).toBe(r1);
    expect(r1).toBe(r2);
  });
});

// ---------------------------------------------------------------------------
// Gate-script contract: assert the produced shape passes the gate when
// paired with a matching baseline.
// ---------------------------------------------------------------------------

describe("v13 ablation report → check-v13-prod-gate.mjs contract", () => {
  it("produces a payload structure the gate accepts (top-level keys)", async () => {
    const report = await runV13Ablation({
      dataset,
      retrieve,
      streamCandidateCounts: {
        qdrant_dense: 5,
        qdrant_sparse: 5,
        postgres_fts: 5,
        postgres_pgvector: 5,
        graph: 4,
        temporal: 3,
        wiki: 2,
      },
      v12CoreSlices: [
        {
          caseCount: 4,
          datasetSha256: "lane-e-test-hash",
          items: dataset.items,
        },
      ],
      longmemeval: {
        adapterVersion: "v1",
        datasetSha256: "lme-hash",
        recallAt5: 96.6,
      },
      now: () => new Date("2026-05-05T00:00:00Z"),
    });
    expect(report.passed).toBe(true);
    expect(Array.isArray(report.failedThresholds)).toBe(true);
    expect(typeof report.configs["all-streams-on"].recallAt5).toBe("number");
    expect(
      typeof report.configs["all-streams-on"].queryTypeRecallAt5,
    ).toBe("object");
    expect(
      typeof report.configs["all-streams-on"].streamCandidateCounts,
    ).toBe("object");
    expect(
      Array.isArray(report.configs["all-streams-on"].v12CoreSlices),
    ).toBe(true);
    expect(report.longmemeval?.recallAt5).toBe(96.6);
  });
});
