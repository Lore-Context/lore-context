import { describe, expect, it } from "vitest";
import {
  classifyProposalRisk,
  filterBlockedProposals,
  filterNonBlockedProposals,
  filterReviewRequiredProposals,
  filterShadowSafeProposals,
  generateProposals,
  hasBlockedProposals,
} from "../src/data-recipe-proposals.js";
import type {
  DataRecipeProposal,
  GenerateProposalsInput,
} from "../src/data-recipe-proposals.js";
import type { EvidenceLedgerEntry, EvidenceLedgerTrace } from "../src/evidence-ledger.js";
import type { MemoryEdge, MemoryEdgeRelation } from "../src/edges.js";
import type { InboxV09Item, InboxV09Label, InboxV09State } from "../src/inbox-v09.js";
import type { MemoryLifecycleRecord } from "../src/memory-lifecycle.js";
import type { MemoryCandidate } from "../src/types.js";

// ─────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────

const FROZEN_NOW = new Date("2026-05-15T12:00:00.000Z");
const NOW_ISO = FROZEN_NOW.toISOString();
const OLD_DATE = new Date("2026-03-01T00:00:00.000Z").toISOString(); // 75 days ago
const RECENT_DATE = new Date("2026-05-10T00:00:00.000Z").toISOString();

function makeLedgerEntry(
  overrides: Partial<EvidenceLedgerEntry> = {}
): EvidenceLedgerEntry {
  return {
    memoryId: `mem-${Math.random().toString(16).slice(2, 8)}`,
    state: "used",
    rank: 1,
    reason: "composed into context block",
    riskTags: [],
    warnings: [],
    ...overrides,
  };
}

function makeTrace(
  entries: EvidenceLedgerEntry[],
  overrides: Partial<EvidenceLedgerTrace> = {}
): EvidenceLedgerTrace {
  return {
    traceId: `trace-${Math.random().toString(16).slice(2, 8)}`,
    vaultId: "test-vault",
    query: "test query",
    tokensUsed: 200,
    tokenBudget: 1000,
    truncated: false,
    warnings: [],
    sourceRefs: [],
    entries,
    summary: {
      retrieved: entries.length,
      used: entries.filter((e) => e.state === "used").length,
      ignored: entries.filter((e) => e.state === "ignored").length,
      stale: entries.filter((e) => e.state === "stale").length,
      conflicting: entries.filter((e) => e.state === "conflicting").length,
      risky: entries.filter((e) => e.state === "risky").length,
      missing: entries.filter((e) => e.state === "missing").length,
    },
    createdAt: NOW_ISO,
    ...overrides,
  };
}

function makeLifecycleRecord(
  overrides: Partial<MemoryLifecycleRecord> = {}
): MemoryLifecycleRecord {
  const id = `mlc-${Math.random().toString(16).slice(2, 8)}`;
  return {
    id,
    vaultId: "test-vault",
    content: "Test memory content for lifecycle analysis.",
    state: "approved_memory",
    confidence: 0.8,
    privacyState: "default",
    source: {
      app: "claude_code",
      title: "Test session",
      capturedAt: RECENT_DATE,
    },
    usage: {
      usageCount: 0,
      traceIds: [],
    },
    exportPath: `/vault/test-vault/memories/${id}/export`,
    riskTags: [],
    history: [{ at: RECENT_DATE, action: "capture" }],
    createdAt: OLD_DATE, // 75 days old by default
    updatedAt: OLD_DATE,
    ...overrides,
  };
}

function makeEdge(
  from: string,
  to: string,
  relation: MemoryEdgeRelation,
  overrides: Partial<Omit<MemoryEdge, "fromMemoryId" | "toMemoryId" | "relation">> = {}
): MemoryEdge {
  return {
    id: `edge-${Math.random().toString(16).slice(2, 8)}`,
    fromMemoryId: from,
    toMemoryId: to,
    relation,
    confidence: 0.8,
    reason: "test edge",
    createdAt: NOW_ISO,
    ...overrides,
  };
}

function makeInboxItem(
  labels: InboxV09Label[],
  overrides: Partial<Omit<InboxV09Item, "labels">> = {}
): InboxV09Item {
  const candidate: MemoryCandidate = {
    id: `cand-${Math.random().toString(16).slice(2, 8)}`,
    content: "Test inbox item content.",
    memoryType: "project_rule",
    scope: "project",
    visibility: "private",
    confidence: 0.6,
    sourceRefs: [],
    riskTags: labels.includes("sensitive") ? ["api_key"] : [],
    metadata: {},
  };
  return {
    id: `inbox-${Math.random().toString(16).slice(2, 8)}`,
    vaultId: "test-vault",
    candidateId: candidate.id,
    candidate,
    candidateType: "project_fact",
    state: "pending" as InboxV09State,
    riskLevel: labels.includes("sensitive") ? "high" : "low",
    labels,
    content: "Test inbox item content.",
    history: [],
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Tests: generateProposals
// ─────────────────────────────────────────────────────────────────────────

describe("generateProposals", () => {
  it("returns empty set when no evidence is provided", () => {
    const input: GenerateProposalsInput = {
      vaultId: "test-vault",
      now: FROZEN_NOW,
    };
    const result = generateProposals(input);
    expect(result.proposals).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.vaultId).toBe("test-vault");
    expect(result.generatedAt).toBe(NOW_ISO);
  });

  it("returns empty set when all evidence arrays are empty", () => {
    const input: GenerateProposalsInput = {
      vaultId: "test-vault",
      ledgerTraces: [],
      lifecycleRecords: [],
      inboxItems: [],
      edges: [],
      now: FROZEN_NOW,
    };
    const result = generateProposals(input);
    expect(result.proposals).toHaveLength(0);
  });

  describe("ledger trace analysis", () => {
    it("proposes extraction threshold adjustment when stale ratio is high", () => {
      const entries = [
        makeLedgerEntry({ state: "stale" }),
        makeLedgerEntry({ state: "stale" }),
        makeLedgerEntry({ state: "stale" }),
        makeLedgerEntry({ state: "used" }),
      ];
      const trace = makeTrace(entries);

      const result = generateProposals({
        vaultId: "test-vault",
        ledgerTraces: [trace],
        now: FROZEN_NOW,
      });

      const extractionProposals = result.proposals.filter(
        (p) => p.kind === "extraction_threshold"
      );
      expect(extractionProposals.length).toBeGreaterThanOrEqual(1);
      expect(extractionProposals[0].risk).toBe("medium");
      expect(extractionProposals[0].evidence).toHaveLength(1);
      expect(extractionProposals[0].evidence[0].source).toBe("evidence_ledger");
    });

    it("proposes inbox auto-accept adjustment when risky ratio is high", () => {
      const entries = [
        makeLedgerEntry({ state: "risky", riskTags: ["api_key"] }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
      ];
      const trace = makeTrace(entries);

      const result = generateProposals({
        vaultId: "test-vault",
        ledgerTraces: [trace],
        now: FROZEN_NOW,
      });

      const inboxProposals = result.proposals.filter(
        (p) => p.kind === "inbox_auto_accept"
      );
      expect(inboxProposals.length).toBeGreaterThanOrEqual(1);
    });

    it("proposes inbox tightening when ignored ratio is high", () => {
      const entries = [
        makeLedgerEntry({ state: "ignored" }),
        makeLedgerEntry({ state: "ignored" }),
        makeLedgerEntry({ state: "ignored" }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
      ];
      const trace = makeTrace(entries);

      const result = generateProposals({
        vaultId: "test-vault",
        ledgerTraces: [trace],
        now: FROZEN_NOW,
      });

      const inboxProposals = result.proposals.filter(
        (p) => p.kind === "inbox_auto_accept" && p.reason.includes("ignored")
      );
      expect(inboxProposals.length).toBeGreaterThanOrEqual(1);
    });

    it("skips ledger analysis when all entries are used", () => {
      const entries = [
        makeLedgerEntry({ state: "used" }),
        makeLedgerEntry({ state: "used" }),
      ];
      const trace = makeTrace(entries);

      const result = generateProposals({
        vaultId: "test-vault",
        ledgerTraces: [trace],
        now: FROZEN_NOW,
      });

      // No stale/risky/ignored → no threshold adjustment proposals.
      const thresholdProposals = result.proposals.filter(
        (p) => p.kind === "extraction_threshold" || p.kind === "inbox_auto_accept"
      );
      expect(thresholdProposals).toHaveLength(0);
    });
  });

  describe("lifecycle record analysis", () => {
    it("proposes marking unused approved memories as stale", () => {
      const records = [
        makeLifecycleRecord({
          state: "approved_memory",
          usage: { usageCount: 0, traceIds: [] },
          createdAt: OLD_DATE, // 75 days old
        }),
        makeLifecycleRecord({
          state: "approved_memory",
          usage: { usageCount: 0, traceIds: [] },
          createdAt: OLD_DATE,
        }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        lifecycleRecords: records,
        now: FROZEN_NOW,
      });

      const staleProposals = result.proposals.filter((p) =>
        p.reason.includes("never been used")
      );
      expect(staleProposals.length).toBeGreaterThanOrEqual(1);
      expect(staleProposals[0].kind).toBe("mark_stale");
      expect(staleProposals[0].action.targetMemoryIds).toHaveLength(2);
    });

    it("proposes marking low-usage stale memories", () => {
      const records = [
        makeLifecycleRecord({
          state: "used_memory",
          usage: {
            usageCount: 1,
            traceIds: ["trace-1"],
            lastUsedAt: OLD_DATE, // 75 days ago
          },
          createdAt: OLD_DATE,
        }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        lifecycleRecords: records,
        now: FROZEN_NOW,
      });

      const lowUseProposals = result.proposals.filter((p) =>
        p.reason.includes("very low usage")
      );
      expect(lowUseProposals.length).toBeGreaterThanOrEqual(1);
      expect(lowUseProposals[0].kind).toBe("mark_stale");
    });

    it("skips recently-used memories", () => {
      const records = [
        makeLifecycleRecord({
          state: "used_memory",
          usage: {
            usageCount: 5,
            traceIds: ["trace-1"],
            lastUsedAt: RECENT_DATE, // 5 days ago
          },
          createdAt: RECENT_DATE,
        }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        lifecycleRecords: records,
        now: FROZEN_NOW,
      });

      const staleProposals = result.proposals.filter(
        (p) => p.kind === "mark_stale"
      );
      expect(staleProposals).toHaveLength(0);
    });

    it("skips non-approved records (captured, suggested, deleted)", () => {
      const records = [
        makeLifecycleRecord({
          state: "suggested_candidate",
          usage: { usageCount: 0, traceIds: [] },
          createdAt: OLD_DATE,
        }),
        makeLifecycleRecord({
          state: "deleted_memory",
          usage: { usageCount: 0, traceIds: [] },
          createdAt: OLD_DATE,
        }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        lifecycleRecords: records,
        now: FROZEN_NOW,
      });

      const staleProposals = result.proposals.filter(
        (p) => p.kind === "mark_stale"
      );
      expect(staleProposals).toHaveLength(0);
    });

    it("proposes index refresh for very old superseded memories", () => {
      const veryOldSupersededDate = new Date("2025-12-01T00:00:00.000Z").toISOString();
      const records = [
        makeLifecycleRecord({
          state: "superseded_memory",
          supersededBy: "mlc-newer",
          updatedAt: veryOldSupersededDate,
          createdAt: veryOldSupersededDate,
        }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        lifecycleRecords: records,
        now: FROZEN_NOW,
      });

      const indexProposals = result.proposals.filter(
        (p) => p.kind === "refresh_index"
      );
      expect(indexProposals.length).toBeGreaterThanOrEqual(1);
      expect(indexProposals[0].risk).toBe("low");
    });
  });

  describe("edge analysis", () => {
    it("proposes mark_superseded for high-confidence supersede edges", () => {
      const edges = [
        makeEdge("mem-old", "mem-new", "supersedes", { confidence: 0.9 }),
        makeEdge("mem-old2", "mem-new2", "supersedes", { confidence: 0.8 }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        edges,
        now: FROZEN_NOW,
      });

      const supersedeProposals = result.proposals.filter(
        (p) => p.kind === "mark_superseded"
      );
      expect(supersedeProposals.length).toBeGreaterThanOrEqual(1);
      expect(supersedeProposals[0].action.targetMemoryIds).toContain("mem-old");
      expect(supersedeProposals[0].action.targetMemoryIds).toContain("mem-old2");
    });

    it("proposes merge for duplicate clusters", () => {
      const edges = [
        makeEdge("mem-dup1", "mem-winner", "duplicates", { confidence: 0.8 }),
        makeEdge("mem-dup2", "mem-winner", "duplicates", { confidence: 0.7 }),
        makeEdge("mem-dup3", "mem-winner", "duplicates", { confidence: 0.6 }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        edges,
        now: FROZEN_NOW,
      });

      const mergeProposals = result.proposals.filter(
        (p) => p.kind === "merge_suggestion" && p.reason.includes("duplicate")
      );
      expect(mergeProposals.length).toBeGreaterThanOrEqual(1);
      expect(mergeProposals[0].action.parameters).toBeDefined();
      const params = mergeProposals[0].action.parameters!;
      expect(params.winnerId).toBe("mem-winner");
    });

    it("proposes conflict resolution (high risk) for many conflicts", () => {
      const edges = [
        makeEdge("mem-a", "mem-b", "contradicts", { confidence: 0.9 }),
        makeEdge("mem-c", "mem-d", "contradicts", { confidence: 0.8 }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        edges,
        now: FROZEN_NOW,
      });

      const conflictProposals = result.proposals.filter(
        (p) => p.reason.includes("conflict")
      );
      expect(conflictProposals.length).toBeGreaterThanOrEqual(1);
      expect(conflictProposals[0].risk).toBe("high");
    });

    it("skips low-confidence supersede edges", () => {
      const edges = [
        makeEdge("mem-old", "mem-new", "supersedes", { confidence: 0.5 }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        edges,
        now: FROZEN_NOW,
      });

      const supersedeProposals = result.proposals.filter(
        (p) => p.kind === "mark_superseded"
      );
      expect(supersedeProposals).toHaveLength(0);
    });
  });

  describe("inbox item analysis", () => {
    it("proposes auto-accept threshold adjustment when rejection rate is high", () => {
      const items: InboxV09Item[] = [
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "deleted" }),
        makeInboxItem([], { state: "ignored" }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        inboxItems: items,
        now: FROZEN_NOW,
      });

      const inboxProposals = result.proposals.filter((p) =>
        p.reason.includes("rejection rate")
      );
      expect(inboxProposals.length).toBeGreaterThanOrEqual(1);
      expect(inboxProposals[0].kind).toBe("inbox_auto_accept");
    });

    it("proposes risk threshold tightening when sensitive items are auto-approved", () => {
      const items: InboxV09Item[] = [
        makeInboxItem(["sensitive"], {
          state: "auto_approved",
          riskLevel: "high",
        }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
        makeInboxItem([], { state: "auto_approved" }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        inboxItems: items,
        now: FROZEN_NOW,
      });

      const riskyProposals = result.proposals.filter((p) =>
        p.reason.includes("sensitive")
      );
      expect(riskyProposals.length).toBeGreaterThanOrEqual(1);
    });

    it("proposes tightening when high duplicate ratio", () => {
      const items: InboxV09Item[] = [
        makeInboxItem(["duplicate"]),
        makeInboxItem(["duplicate"]),
        makeInboxItem(["duplicate"]),
        makeInboxItem([]),
        makeInboxItem([]),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        inboxItems: items,
        now: FROZEN_NOW,
      });

      const dupeProposals = result.proposals.filter((p) =>
        p.reason.includes("duplicate")
      );
      expect(dupeProposals.length).toBeGreaterThanOrEqual(1);
    });

    it("proposes lowering auto-accept when high pending ratio", () => {
      const items: InboxV09Item[] = [
        makeInboxItem([], { state: "pending" }),
        makeInboxItem([], { state: "pending" }),
        makeInboxItem([], { state: "pending" }),
        makeInboxItem([], { state: "pending" }),
        makeInboxItem([], { state: "auto_approved" }),
      ];

      const result = generateProposals({
        vaultId: "test-vault",
        inboxItems: items,
        now: FROZEN_NOW,
      });

      const pendingProposals = result.proposals.filter((p) =>
        p.reason.includes("pending")
      );
      expect(pendingProposals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("summary computation", () => {
    it("correctly computes byKind and byRisk summary", () => {
      const entries = [
        makeLedgerEntry({ state: "stale" }),
        makeLedgerEntry({ state: "stale" }),
        makeLedgerEntry({ state: "stale" }),
        makeLedgerEntry({ state: "used" }),
      ];
      const trace = makeTrace(entries);

      const result = generateProposals({
        vaultId: "test-vault",
        ledgerTraces: [trace],
        now: FROZEN_NOW,
      });

      expect(result.summary.total).toBe(result.proposals.length);
      expect(result.summary.byKind).toBeDefined();
      expect(result.summary.byRisk).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Tests: classifyProposalRisk
// ─────────────────────────────────────────────────────────────────────────

describe("classifyProposalRisk", () => {
  it("classifies refresh_index as low", () => {
    expect(classifyProposalRisk("refresh_index", 5, false)).toBe("low");
  });

  it("classifies wiki_graph_maintenance as low", () => {
    expect(classifyProposalRisk("wiki_graph_maintenance", 1, false)).toBe("low");
  });

  it("classifies extraction_threshold as medium", () => {
    expect(classifyProposalRisk("extraction_threshold", 0, false)).toBe("medium");
  });

  it("classifies inbox_auto_accept as medium", () => {
    expect(classifyProposalRisk("inbox_auto_accept", 0, false)).toBe("medium");
  });

  it("classifies mark_stale with <10 targets as medium", () => {
    expect(classifyProposalRisk("mark_stale", 5, false)).toBe("medium");
  });

  it("classifies mark_stale with >=10 targets as high", () => {
    expect(classifyProposalRisk("mark_stale", 10, false)).toBe("high");
  });

  it("classifies mark_superseded with >=10 targets as high", () => {
    expect(classifyProposalRisk("mark_superseded", 15, false)).toBe("high");
  });

  it("classifies any destructive action as blocked regardless of kind", () => {
    expect(classifyProposalRisk("refresh_index", 1, true)).toBe("blocked");
    expect(classifyProposalRisk("extraction_threshold", 0, true)).toBe("blocked");
    expect(classifyProposalRisk("mark_stale", 1, true)).toBe("blocked");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Tests: safety filters
// ─────────────────────────────────────────────────────────────────────────

const sampleProposals: DataRecipeProposal[] = [
  {
    id: "drp-low",
    kind: "refresh_index",
    risk: "low",
    reason: "Refresh index for maintenance.",
    evidence: [],
    action: { type: "refresh_index" },
    createdAt: NOW_ISO,
  },
  {
    id: "drp-medium",
    kind: "extraction_threshold",
    risk: "medium",
    reason: "Adjust extraction threshold.",
    evidence: [],
    action: { type: "extraction_threshold" },
    createdAt: NOW_ISO,
  },
  {
    id: "drp-high",
    kind: "mark_stale",
    risk: "high",
    reason: "Mark 15 memories as stale.",
    evidence: [],
    action: { type: "mark_stale", targetMemoryIds: Array.from({ length: 15 }).map((_, i) => `mem-${i}`) },
    createdAt: NOW_ISO,
  },
  {
    id: "drp-blocked",
    kind: "mark_stale",
    risk: "blocked",
    reason: "Destructive deletion proposal.",
    evidence: [],
    action: { type: "mark_stale", targetMemoryIds: ["mem-dangerous"] },
    createdAt: NOW_ISO,
  },
];

describe("filterShadowSafeProposals", () => {
  it("returns only low-risk proposals", () => {
    const result = filterShadowSafeProposals(sampleProposals);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("drp-low");
    expect(result[0].risk).toBe("low");
  });

  it("returns empty array when no low-risk proposals exist", () => {
    const noLow = sampleProposals.filter((p) => p.risk !== "low");
    const result = filterShadowSafeProposals(noLow);
    expect(result).toHaveLength(0);
  });
});

describe("filterReviewRequiredProposals", () => {
  it("returns high and blocked proposals", () => {
    const result = filterReviewRequiredProposals(sampleProposals);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(["drp-high", "drp-blocked"]);
  });
});

describe("filterNonBlockedProposals", () => {
  it("excludes only blocked proposals", () => {
    const result = filterNonBlockedProposals(sampleProposals);
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.id)).toEqual(["drp-low", "drp-medium", "drp-high"]);
  });
});

describe("filterBlockedProposals", () => {
  it("returns only blocked proposals", () => {
    const result = filterBlockedProposals(sampleProposals);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("drp-blocked");
    expect(result[0].risk).toBe("blocked");
  });
});

describe("hasBlockedProposals", () => {
  it("returns true when blocked proposals exist", () => {
    expect(hasBlockedProposals(sampleProposals)).toBe(true);
  });

  it("returns false when no blocked proposals exist", () => {
    const noBlocked = sampleProposals.filter((p) => p.risk !== "blocked");
    expect(hasBlockedProposals(noBlocked)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasBlockedProposals([])).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Tests: deterministic behavior
// ─────────────────────────────────────────────────────────────────────────

describe("deterministic behavior", () => {
  it("produces identical results for identical inputs", () => {
    const entries = [
      makeLedgerEntry({ state: "stale" }),
      makeLedgerEntry({ state: "stale" }),
      makeLedgerEntry({ state: "stale" }),
      makeLedgerEntry({ state: "used" }),
    ];

    const makeInput = (): GenerateProposalsInput => ({
      vaultId: "test-vault",
      ledgerTraces: [makeTrace([...entries])],
      now: FROZEN_NOW,
    });

    const result1 = generateProposals(makeInput());
    const result2 = generateProposals(makeInput());

    expect(result1.proposals.length).toBe(result2.proposals.length);
    expect(result1.summary.total).toBe(result2.summary.total);
    // Each proposal should have the same kind and risk distribution.
    for (let i = 0; i < result1.proposals.length; i++) {
      expect(result1.proposals[i].kind).toBe(result2.proposals[i].kind);
      expect(result1.proposals[i].risk).toBe(result2.proposals[i].risk);
    }
  });

  it("produces consistent proposal IDs for same vaultId", () => {
    const entries = [
      makeLedgerEntry({ state: "stale" }),
      makeLedgerEntry({ state: "stale" }),
      makeLedgerEntry({ state: "stale" }),
      makeLedgerEntry({ state: "used" }),
    ];

    const input: GenerateProposalsInput = {
      vaultId: "test-vault",
      ledgerTraces: [makeTrace(entries)],
      now: FROZEN_NOW,
    };

    const result = generateProposals(input);
    for (const proposal of result.proposals) {
      expect(proposal.id).toMatch(/^drp_/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Tests: no user labels used
// ─────────────────────────────────────────────────────────────────────────

describe("passive evidence only — no user labels", () => {
  it("does not use user_feedback state for ledger-based proposals", () => {
    // Even with user_feedback entries, they should not drive proposals.
    const entries = [
      makeLedgerEntry({ state: "user_feedback", feedback: "outdated" }),
      makeLedgerEntry({ state: "user_feedback", feedback: "useful" }),
    ];
    const trace = makeTrace(entries);

    const result = generateProposals({
      vaultId: "test-vault",
      ledgerTraces: [trace],
      now: FROZEN_NOW,
    });

    // user_feedback state should not produce stale/risky/ignored proposals
    // since the analyzeLedgerTraces only checks "stale", "risky", "ignored"
    const thresholdProposals = result.proposals.filter(
      (p) => p.kind === "extraction_threshold" && p.reason.includes("stale")
    );
    expect(thresholdProposals).toHaveLength(0);
  });

  it("generates proposals purely from state transitions, not feedback values", () => {
    const entries = [
      makeLedgerEntry({ state: "stale" }),
      makeLedgerEntry({ state: "stale" }),
      makeLedgerEntry({ state: "stale" }),
      makeLedgerEntry({ state: "used" }),
      // These user_feedback entries should not affect proposal generation.
      makeLedgerEntry({ state: "user_feedback", feedback: "outdated" }),
    ];
    const trace = makeTrace(entries);

    const result = generateProposals({
      vaultId: "test-vault",
      ledgerTraces: [trace],
      now: FROZEN_NOW,
    });

    const extractionProposals = result.proposals.filter(
      (p) => p.kind === "extraction_threshold"
    );
    // The stale ratio is 3/5 = 60% which exceeds 25% threshold.
    expect(extractionProposals.length).toBeGreaterThanOrEqual(1);
  });

  it("never reads feedback field from ledger entries", () => {
    // The analyzeLedgerTraces function only inspects entry.state,
    // not entry.feedback. This test verifies that pattern.
    const entries = [
      makeLedgerEntry({
        state: "used",
        feedback: "outdated", // ignored — only state matters
      }),
    ];
    const trace = makeTrace(entries);

    const result = generateProposals({
      vaultId: "test-vault",
      ledgerTraces: [trace],
      now: FROZEN_NOW,
    });

    // All used → no proposals.
    expect(result.proposals).toHaveLength(0);
  });
});
