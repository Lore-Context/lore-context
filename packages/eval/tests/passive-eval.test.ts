// Lore v2.0.9 — Lane B1: Passive eval generator tests.
// Run: pnpm --filter @lore/eval test -- passive-eval

import { describe, expect, it } from "vitest";
import {
  generatePassiveEvalDataset,
  redactContent,
  deterministicCaseId,
  hashJson,
  ALL_PASSIVE_CASE_TYPES,
  type PassiveCaseType,
  type PassiveEvidenceEntry,
  type PassiveEvidenceTrace,
} from "../src/passive-eval-generator.js";
import type { EvalCaseV12 } from "../src/types-v12.js";

// ─────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────

function makeTrace(opts: {
  traceId?: string;
  projectId?: string;
  query?: string;
  entries: PassiveEvidenceEntry[];
}): PassiveEvidenceTrace {
  return {
    traceId: opts.traceId ?? "trace_test_001",
    vaultId: "vault_test",
    projectId: opts.projectId ?? "proj_test",
    agentId: "agent_test",
    query: opts.query ?? "What is the project structure?",
    entries: opts.entries,
    createdAt: "2026-05-15T00:00:00Z",
  };
}

function makeEntry(opts: Partial<PassiveEvidenceEntry> & { memoryId: string; disposition: PassiveEvidenceEntry["disposition"] }): PassiveEvidenceEntry {
  return {
    memoryId: opts.memoryId,
    disposition: opts.disposition,
    riskTags: opts.riskTags ?? [],
    supersededBy: opts.supersededBy ?? null,
    contradicts: opts.contradicts ?? null,
    validUntil: opts.validUntil ?? null,
    streamsFired: opts.streamsFired,
    contentPreview: opts.contentPreview,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────

describe("generatePassiveEvalDataset", () => {
  it("generates positive_recall case from used entries", () => {
    const traces = [
      makeTrace({
        entries: [makeEntry({ memoryId: "mem_a", disposition: "used" })],
      }),
    ];

    const result = generatePassiveEvalDataset(traces);

    expect(result.counts.positive_recall).toBe(1);
    expect(result.dataset.items).toHaveLength(1);

    const item = result.dataset.items[0];
    expect(item.expected_memory_ids).toContain("mem_a");
    expect(item.query_intent).toBe("semantic");
    expect(item.tags).toContain("positive_recall");
    expect(item.negative_ids).toBeUndefined();
  });

  it("generates stale_memory case with negative_ids only", () => {
    const traces = [
      makeTrace({
        entries: [makeEntry({ memoryId: "mem_stale", disposition: "stale" })],
      }),
    ];

    const result = generatePassiveEvalDataset(traces);

    expect(result.counts.stale_memory).toBe(1);
    const item = result.dataset.items[0];
    expect(item.expected_memory_ids).toEqual([]);
    expect(item.negative_ids).toContain("mem_stale");
    expect(item.query_intent).toBe("temporal");
    expect(item.tags).toContain("stale_memory");
    expect(item.streams_expected).toContain("temporal");
  });

  it("generates negative_leak case from risky entries", () => {
    const traces = [
      makeTrace({
        entries: [
          makeEntry({
            memoryId: "mem_risky",
            disposition: "risky",
            riskTags: ["api_key", "needs_review"],
          }),
        ],
      }),
    ];

    const result = generatePassiveEvalDataset(traces);

    expect(result.counts.negative_leak).toBe(1);
    const item = result.dataset.items[0];
    expect(item.negative_ids).toContain("mem_risky");
    expect(item.query_intent).toBe("negative");
    expect(item.tags).toContain("negative_leak");
    expect(item.expected_memory_ids).toEqual([]);
  });

  it("generates conflict_resolution case from conflicting entries", () => {
    const traces = [
      makeTrace({
        entries: [
          makeEntry({
            memoryId: "mem_conflict",
            disposition: "conflicting",
            supersededBy: "mem_winner",
            contradicts: "mem_winner",
          }),
        ],
      }),
    ];

    const result = generatePassiveEvalDataset(traces);

    expect(result.counts.conflict_resolution).toBe(1);
    const item = result.dataset.items[0];
    expect(item.expected_memory_ids).toContain("mem_winner");
    expect(item.negative_ids).toContain("mem_conflict");
    expect(item.query_intent).toBe("relation");
    expect(item.streams_expected).toContain("graph");
    expect(item.tags).toContain("conflict_resolution");
  });

  it("generates temporal_update case with validUntil", () => {
    const traces = [
      makeTrace({
        query: "temporal query",
        entries: [
          makeEntry({
            memoryId: "mem_temporal",
            disposition: "used",
            validUntil: "2026-06-15T00:00:00Z",
          }),
        ],
      }),
    ];

    const result = generatePassiveEvalDataset(traces);

    expect(result.counts.temporal_update).toBe(1);
    const item = result.dataset.items.find((i: EvalCaseV12) =>
      i.tags.includes("temporal_update")
    )!;
    expect(item).toBeDefined();
    expect(item.expected_memory_ids).toContain("mem_temporal");
    expect(item.query_intent).toBe("temporal");
    expect(item.streams_expected).toContain("temporal");
    expect(item.valid_at).toBeDefined();
  });

  it("generates stream_coverage case with streamsFired", () => {
    const traces = [
      makeTrace({
        query: "stream coverage query",
        entries: [
          makeEntry({
            memoryId: "mem_streams",
            disposition: "used",
            streamsFired: ["postgres_fts", "qdrant_dense", "graph"],
          }),
        ],
      }),
    ];

    const result = generatePassiveEvalDataset(traces);

    expect(result.counts.stream_coverage).toBe(1);
    const item = result.dataset.items.find((i: EvalCaseV12) =>
      i.tags.includes("stream_coverage")
    )!;
    expect(item).toBeDefined();
    expect(item.expected_memory_ids).toContain("mem_streams");
    expect(item.streams_expected).toContain("postgres_fts");
    expect(item.streams_expected).toContain("qdrant_dense");
    expect(item.streams_expected).toContain("graph");
  });

  it("generates multiple case types from a single trace", () => {
    const traces = [
      makeTrace({
        entries: [
          makeEntry({ memoryId: "mem_u", disposition: "used" }),
          makeEntry({ memoryId: "mem_s", disposition: "stale" }),
          makeEntry({
            memoryId: "mem_r",
            disposition: "risky",
            riskTags: ["api_key"],
          }),
          makeEntry({
            memoryId: "mem_c",
            disposition: "conflicting",
            supersededBy: "mem_w",
          }),
          makeEntry({
            memoryId: "mem_t",
            disposition: "used",
            validUntil: "2026-07-01T00:00:00Z",
          }),
          makeEntry({
            memoryId: "mem_sc",
            disposition: "used",
            streamsFired: ["postgres_fts", "wiki"],
          }),
        ],
      }),
    ];

    const result = generatePassiveEvalDataset(traces);

    expect(result.counts.positive_recall).toBe(1);
    expect(result.counts.stale_memory).toBe(1);
    expect(result.counts.negative_leak).toBe(1);
    expect(result.counts.conflict_resolution).toBe(1);
    expect(result.counts.temporal_update).toBe(1);
    expect(result.counts.stream_coverage).toBe(1);
    expect(result.dataset.items).toHaveLength(6);
  });

  it("respects projectId filter", () => {
    const traces = [
      makeTrace({
        traceId: "trace_proj_a",
        projectId: "proj_a",
        entries: [makeEntry({ memoryId: "mem_a1", disposition: "used" })],
      }),
      makeTrace({
        traceId: "trace_proj_b",
        projectId: "proj_b",
        entries: [makeEntry({ memoryId: "mem_b1", disposition: "used" })],
      }),
    ];

    const result = generatePassiveEvalDataset(traces, { projectId: "proj_a" });

    expect(result.counts.positive_recall).toBe(1);
    expect(result.traceIds).toContain("trace_proj_a");
    expect(result.traceIds).not.toContain("trace_proj_b");
  });

  it("respects maxCasesPerType option", () => {
    const traces = Array.from({ length: 10 }, (_, i) =>
      makeTrace({
        traceId: `trace_${i}`,
        entries: [makeEntry({ memoryId: `mem_${i}`, disposition: "used" })],
      }),
    );

    const result = generatePassiveEvalDataset(traces, { maxCasesPerType: 3 });

    expect(result.counts.positive_recall).toBe(3);
  });

  it("generates deterministic IDs for the same inputs", () => {
    const id1 = deterministicCaseId("test", "positive_recall", "trace1", "mem1");
    const id2 = deterministicCaseId("test", "positive_recall", "trace1", "mem1");
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^case_[a-f0-9]{16}$/);
  });

  it("generates different IDs for different inputs", () => {
    const id1 = deterministicCaseId("test", "positive_recall", "trace1", "mem1");
    const id2 = deterministicCaseId("test", "positive_recall", "trace1", "mem2");
    expect(id1).not.toBe(id2);
  });

  it("produces deterministic datasetSha256", () => {
    const traces = [
      makeTrace({
        entries: [makeEntry({ memoryId: "mem_a", disposition: "used" })],
      }),
    ];

    const result1 = generatePassiveEvalDataset(traces);
    const result2 = generatePassiveEvalDataset(traces);

    expect(result1.datasetSha256).toBe(result2.datasetSha256);
  });

  it("includes project and agent tags in generated cases", () => {
    const traces = [
      makeTrace({
        projectId: "my-project",
        entries: [makeEntry({ memoryId: "mem_a", disposition: "used" })],
      }),
    ];

    const result = generatePassiveEvalDataset(traces);
    const item = result.dataset.items[0];
    expect(item.tags).toContain("positive_recall");
    expect(item.tags).toContain("project:my-project");
    expect(item.tags).toContain("agent:agent_test");
  });

  it("empty traces produce empty dataset", () => {
    const result = generatePassiveEvalDataset([]);
    expect(result.dataset.items).toHaveLength(0);
    expect(result.traceIds).toHaveLength(0);
    for (const type of ALL_PASSIVE_CASE_TYPES) {
      expect(result.counts[type]).toBe(0);
    }
  });

  it("skips negative_leak when riskTags are below threshold", () => {
    const traces = [
      makeTrace({
        entries: [
          makeEntry({
            memoryId: "mem_no_risk",
            disposition: "ignored",
            riskTags: [],
          }),
        ],
      }),
    ];

    const result = generatePassiveEvalDataset(traces, { minRiskTagsForLeak: 1 });
    expect(result.counts.negative_leak).toBe(0);
  });

  it("dataset name includes projectId when scoped", () => {
    const traces = [
      makeTrace({
        projectId: "tenant-42",
        entries: [makeEntry({ memoryId: "mem_a", disposition: "used" })],
      }),
    ];

    const result = generatePassiveEvalDataset(traces, { projectId: "tenant-42" });
    expect(result.dataset.name).toBe("passive-eval-tenant-42");
  });

  it("dataset name defaults when no projectId filter", () => {
    const traces = [
      makeTrace({
        entries: [makeEntry({ memoryId: "mem_a", disposition: "used" })],
      }),
    ];

    const result = generatePassiveEvalDataset(traces);
    expect(result.dataset.name).toBe("passive-eval");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Redaction tests
// ─────────────────────────────────────────────────────────────────────────

describe("redactContent", () => {
  it("redacts API key patterns", () => {
    const input = "Use key sk-abc123def4567890ghijklmno for the cloud API.";
    const result = redactContent(input);
    expect(result).not.toContain("sk-abc");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts bearer tokens", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.payload";
    const result = redactContent(input);
    expect(result).not.toContain("eyJhbGci");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts passwords in assignment", () => {
    const input = 'The database password: "SuperSecret123" should be rotated.';
    const result = redactContent(input);
    expect(result).not.toContain("SuperSecret123");
    expect(result).toContain("[REDACTED]");
  });

  it("preserves non-sensitive content", () => {
    const input = "The project structure follows a standard monorepo layout.";
    const result = redactContent(input);
    expect(result).toBe(input);
  });

  it("redacts multiple patterns in one pass", () => {
    const input = "Use token=abc123def456ghi789 and key=sk-zyx987wvu654tsr321qpo";
    const result = redactContent(input);
    const redactedCount = (result.match(/\[REDACTED\]/g) ?? []).length;
    expect(redactedCount).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// hashJson tests
// ─────────────────────────────────────────────────────────────────────────

describe("hashJson", () => {
  it("produces 64-char hex string", () => {
    const hash = hashJson({ a: 1, b: 2 });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for same object shape", () => {
    const h1 = hashJson({ a: 1, b: 2 });
    const h2 = hashJson({ b: 2, a: 1 }); // different key order
    expect(h1).toBe(h2);
  });

  it("differs for different objects", () => {
    const h1 = hashJson({ a: 1 });
    const h2 = hashJson({ a: 2 });
    expect(h1).not.toBe(h2);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Case type coverage
// ─────────────────────────────────────────────────────────────────────────

describe("ALL_PASSIVE_CASE_TYPES", () => {
  it("contains exactly six types", () => {
    expect(ALL_PASSIVE_CASE_TYPES).toHaveLength(6);
  });

  it("includes all required types", () => {
    const required: PassiveCaseType[] = [
      "positive_recall",
      "stale_memory",
      "negative_leak",
      "conflict_resolution",
      "temporal_update",
      "stream_coverage",
    ];
    for (const t of required) {
      expect(ALL_PASSIVE_CASE_TYPES).toContain(t);
    }
  });
});
