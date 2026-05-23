import { stableMemoryId } from "@lore/shared";
import type { EvidenceLedgerTrace } from "./evidence-ledger.js";
import type { InboxV09Item } from "./inbox-v09.js";
import type { MemoryEdge } from "./edges.js";
import type { MemoryLifecycleRecord } from "./memory-lifecycle.js";

/**
 * Lore v2.0.9 Lane D1 — Data Recipe Proposal Loop.
 *
 * Generates memory hygiene proposals from passive agent evidence (ledger
 * traces, lifecycle records, inbox items, memory edges) WITHOUT requiring
 * normal users to label or review their memories.
 *
 * Design invariants:
 *   - Deterministic — no model providers, no network, no randomness.
 *   - No user labels — evidence is purely passive (trace state, usage count,
 *     staleness, conflicts, duplicate detection).
 *   - Safety-first — destructive proposals (delete, permanent content change)
 *     are classified as "blocked" and never auto-applied.
 *   - Shadow-safe — low-risk proposals (index refresh, wiki maintenance) are
 *     safe for automatic shadow-mode application.
 *   - No production mutation — this module only generates proposals; callers
 *     decide what to apply.
 */

// ─────────────────────────────────────────────────────────────────────────
// Proposal types
// ─────────────────────────────────────────────────────────────────────────

/** The kind of memory hygiene improvement being proposed. */
export type DataRecipeProposalKind =
  | "extraction_threshold"   // adjust confidence threshold for candidate extraction
  | "inbox_auto_accept"      // adjust auto-accept threshold for inbox items
  | "mark_stale"             // mark specific memories as stale
  | "mark_superseded"        // mark memories as superseded by newer ones
  | "merge_suggestion"       // suggest merging duplicate/near-duplicate memories
  | "refresh_index"          // refresh derived search indices
  | "wiki_graph_maintenance"; // maintain wiki/graph cadence

/**
 * Risk classification for a proposal.
 *
 *   low      — safe for automatic shadow-mode application (index refresh, wiki)
 *   medium   — needs admin/operator review (threshold adjustments)
 *   high     — requires operator approval (stale/supersede bulk ops)
 *   blocked  — destructive or high-risk; NEVER auto-apply (deletion, content overwrite)
 */
export type DataRecipeProposalRisk = "low" | "medium" | "high" | "blocked";

/** A single piece of passive evidence supporting a proposal. */
export interface DataRecipeEvidence {
  /** Source subsystem that produced this evidence. */
  source: "evidence_ledger" | "lifecycle" | "inbox" | "edges" | "usage";
  /** Memory ID this evidence relates to, if applicable. */
  memoryId?: string;
  /** Trace ID from evidence ledger, if applicable. */
  traceId?: string;
  /** Human-readable observation derived from the data. */
  observation: string;
  /** Confidence in this evidence piece (0-1). */
  confidence: number;
  /** ISO-8601 timestamp when the evidence was observed. */
  observedAt: string;
}

/** A single memory hygiene proposal generated from passive evidence. */
export interface DataRecipeProposal {
  /** Stable, deterministic proposal ID. */
  id: string;
  /** What kind of improvement is being proposed. */
  kind: DataRecipeProposalKind;
  /** Risk classification — determines whether this can be auto-applied. */
  risk: DataRecipeProposalRisk;
  /** Plain-language explanation of why this proposal was generated. */
  reason: string;
  /** Passive evidence that supports this proposal. */
  evidence: DataRecipeEvidence[];
  /** The recommended action to take. */
  action: {
    /** Action type matching the proposal kind. */
    type: DataRecipeProposalKind;
    /** Target memory IDs affected by this action. */
    targetMemoryIds?: string[];
    /** Parameters for threshold-based actions. */
    parameters?: Record<string, unknown>;
  };
  /** ISO-8601 timestamp when this proposal was generated. */
  createdAt: string;
  /** ISO-8601 timestamp when this proposal expires, if applicable. */
  expiresAt?: string;
}

/** Input for generating data recipe proposals. */
export interface GenerateProposalsInput {
  vaultId: string;
  /** Evidence ledger traces capturing passive retrieval outcomes. */
  ledgerTraces?: EvidenceLedgerTrace[];
  /** Memory lifecycle records for usage and staleness analysis. */
  lifecycleRecords?: MemoryLifecycleRecord[];
  /** Inbox v0.9 items for auto-accept threshold analysis. */
  inboxItems?: InboxV09Item[];
  /** Memory edges for conflict and supersede relationship analysis. */
  edges?: MemoryEdge[];
  /** Override now() for deterministic tests. */
  now?: Date;
}

/** Collection of generated proposals with summary metadata. */
export interface DataRecipeProposalSet {
  vaultId: string;
  proposals: DataRecipeProposal[];
  summary: {
    total: number;
    byKind: Partial<Record<DataRecipeProposalKind, number>>;
    byRisk: Partial<Record<DataRecipeProposalRisk, number>>;
  };
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Threshold constants — tuned for passive evidence quality.
// ─────────────────────────────────────────────────────────────────────────

/** Minimum staleness ratio in ledger traces to propose extraction threshold changes. */
const STALE_RATIO_THRESHOLD = 0.25;

/** Minimum duplicate edge count to propose merge suggestions. */
const DUPLICATE_EDGE_THRESHOLD = 2;

/** Minimum usage count to consider a memory "under-used" (possibly stale). */
const UNDER_USED_THRESHOLD = 1;

/** Minimum conflicting edge count to propose conflict resolution. */
const CONFLICT_EDGE_THRESHOLD = 2;

/** Very low usage count — memory has been used zero times but is approved. */
const ZERO_USAGE_THRESHOLD = 0;

/** Maximum age in days before an unused approved memory is proposed as stale. */
const STALE_AGE_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────
// Risk classification — pure function.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Classify the risk level of a data recipe proposal.
 * Uses deterministic rules based on proposal kind and action scope.
 *
 * Rules:
 *   - Deletion or content-destructive actions → blocked
 *   - Bulk stale/supersede operations (10+ memories) → high
 *   - Threshold adjustments that affect recall behavior → medium
 *   - Index refresh, wiki maintenance → low
 */
export function classifyProposalRisk(
  kind: DataRecipeProposalKind,
  targetCount: number,
  isContentDestructive: boolean
): DataRecipeProposalRisk {
  if (isContentDestructive) return "blocked";

  switch (kind) {
    case "refresh_index":
    case "wiki_graph_maintenance":
      return "low";

    case "extraction_threshold":
    case "inbox_auto_accept":
      return "medium";

    case "mark_stale":
    case "mark_superseded":
    case "merge_suggestion":
      return targetCount >= 10 ? "high" : "medium";

    default:
      return "medium";
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Proposal generators — each analyzes one evidence source.
// ─────────────────────────────────────────────────────────────────────────

function makeEvidence(
  source: DataRecipeEvidence["source"],
  memoryId: string | undefined,
  observation: string,
  confidence: number,
  now: string
): DataRecipeEvidence {
  return { source, memoryId, observation, confidence, observedAt: now };
}

function makeProposalId(vaultId: string, kind: string, seq: number): string {
  return stableMemoryId("drp", `${vaultId}|${kind}|${seq}`);
}

/**
 * Analyze evidence ledger traces for retrieval hygiene issues:
 *   - Stale ratio too high → propose extraction threshold adjustment
 *   - Many risky memories retrieved → propose risk threshold adjustment
 *   - Many ignored memories → propose inbox auto-accept tightening
 */
function analyzeLedgerTraces(
  traces: EvidenceLedgerTrace[],
  vaultId: string,
  now: string
): DataRecipeProposal[] {
  if (traces.length === 0) return [];

  const proposals: DataRecipeProposal[] = [];
  let seq = 0;

  let totalStale = 0;
  let totalRisky = 0;
  let totalIgnored = 0;
  let totalRetrieved = 0;

  for (const trace of traces) {
    for (const entry of trace.entries) {
      totalRetrieved++;
      if (entry.state === "stale") totalStale++;
      if (entry.state === "risky") totalRisky++;
      if (entry.state === "ignored") totalIgnored++;
    }
  }

  if (totalRetrieved === 0) return [];

  const staleRatio = totalStale / totalRetrieved;
  const riskyRatio = totalRisky / totalRetrieved;
  const ignoredRatio = totalIgnored / totalRetrieved;

  // Proposal: adjust extraction threshold if stale ratio is too high.
  if (staleRatio >= STALE_RATIO_THRESHOLD) {
    const evidence = makeEvidence(
      "evidence_ledger",
      undefined,
      `Stale memory ratio is ${(staleRatio * 100).toFixed(1)}% (${totalStale}/${totalRetrieved}) across ${traces.length} traces. Consider tightening confidence threshold for extraction to reduce stale recalls.`,
      0.8,
      now
    );
    const kind: DataRecipeProposalKind = "extraction_threshold";
    const risk = classifyProposalRisk(kind, 0, false);

    proposals.push({
      id: makeProposalId(vaultId, "extraction", ++seq),
      kind,
      risk,
      reason: `High stale ratio (${(staleRatio * 100).toFixed(1)}%) detected in ${traces.length} evidence ledger traces. Tightening extraction confidence may improve recall freshness.`,
      evidence: [evidence],
      action: {
        type: "extraction_threshold",
        parameters: {
          currentStaleRatio: staleRatio,
          suggestedMinConfidence: Math.min(0.6, 1.0 - staleRatio)
        }
      },
      createdAt: now,
      expiresAt: undefined
    });
  }

  // Proposal: if many risky memories are retrieved, adjust risk threshold.
  if (riskyRatio >= 0.1) {
    const evidence = makeEvidence(
      "evidence_ledger",
      undefined,
      `Risky memory ratio is ${(riskyRatio * 100).toFixed(1)}% (${totalRisky}/${totalRetrieved}). Consider lowering the auto-accept risk threshold for inbox items.`,
      0.7,
      now
    );
    const kind: DataRecipeProposalKind = "inbox_auto_accept";
    const risk = classifyProposalRisk(kind, 0, false);

    proposals.push({
      id: makeProposalId(vaultId, "risky-auto", ++seq),
      kind,
      risk,
      reason: `Elevated risky memory retrieval (${(riskyRatio * 100).toFixed(1)}%). Reducing auto-accept risk tolerance may improve recall safety.`,
      evidence: [evidence],
      action: {
        type: "inbox_auto_accept",
        parameters: {
          currentRiskyRatio: riskyRatio,
          suggestedMaxRiskTags: Math.max(1, Math.floor(3 * (1 - riskyRatio)))
        }
      },
      createdAt: now
    });
  }

  // Proposal: if many memories are ignored, consider inbox auto-accept tightening.
  if (ignoredRatio >= 0.3) {
    const evidence = makeEvidence(
      "evidence_ledger",
      undefined,
      `Ignored memory ratio is ${(ignoredRatio * 100).toFixed(1)}% (${totalIgnored}/${totalRetrieved}). Tightening inbox auto-accept thresholds may reduce noise.`,
      0.65,
      now
    );
    const kind: DataRecipeProposalKind = "inbox_auto_accept";
    const risk = classifyProposalRisk(kind, 0, false);

    proposals.push({
      id: makeProposalId(vaultId, "ignore-auto", ++seq),
      kind,
      risk,
      reason: `High ignored-memory ratio (${(ignoredRatio * 100).toFixed(1)}%). Stricter inbox auto-accept may reduce retrieval noise.`,
      evidence: [evidence],
      action: {
        type: "inbox_auto_accept",
        parameters: {
          currentIgnoredRatio: ignoredRatio,
          suggestedMinConfidence: Math.min(0.7, 1.0 - ignoredRatio * 0.5)
        }
      },
      createdAt: now
    });
  }

  return proposals;
}

/**
 * Analyze memory lifecycle records for staleness and usage patterns:
 *   - Approved but never used (unused) → propose mark_stale
 *   - Low usage vs high age → propose mark_stale
 *   - Superseded but still active → propose cleanup
 */
function analyzeLifecycleRecords(
  records: MemoryLifecycleRecord[],
  vaultId: string,
  now: string
): DataRecipeProposal[] {
  if (records.length === 0) return [];

  const proposals: DataRecipeProposal[] = [];
  let seq = 0;

  const nowDate = new Date(now);

  // Find approved/used records with very low usage.
  const unusedApproved: MemoryLifecycleRecord[] = [];
  const staleCandidates: MemoryLifecycleRecord[] = [];

  for (const record of records) {
    // Check superseded state FIRST (before the isApprovedLike gate).
    if (record.state === "superseded_memory") {
      const updatedAt = new Date(record.updatedAt);
      const supersededAge =
        (nowDate.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (supersededAge > 90) {
        const evidence = makeEvidence(
          "lifecycle",
          record.id,
          `Memory ${record.id.slice(0, 12)}... has been superseded for ${supersededAge.toFixed(0)} days.`,
          0.6,
          now
        );
        const kind: DataRecipeProposalKind = "refresh_index";
        const risk = classifyProposalRisk(kind, 1, false);

        proposals.push({
          id: makeProposalId(vaultId, "stale-idx", ++seq),
          kind,
          risk,
          reason: `Long-superseded memory (${supersededAge.toFixed(0)}d). Index refresh may remove stale entries from derived indices.`,
          evidence: [evidence],
          action: {
            type: "refresh_index",
            targetMemoryIds: [record.id]
          },
          createdAt: now,
          expiresAt: undefined
        });
      }
      continue; // superseded is terminal — skip remaining analysis for this record
    }

    const isApprovedLike =
      record.state === "approved_memory" || record.state === "used_memory";

    if (!isApprovedLike) continue;

    // Unused: approved but never actually used in recall.
    if (record.usage.usageCount <= ZERO_USAGE_THRESHOLD) {
      const createdAt = new Date(record.createdAt);
      const ageDays = (nowDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (ageDays > STALE_AGE_DAYS) {
        unusedApproved.push(record);
      }
    }

    // Low usage: used very little compared to age.
    if (
      record.usage.usageCount <= UNDER_USED_THRESHOLD &&
      record.usage.usageCount > ZERO_USAGE_THRESHOLD
    ) {
      const lastUsed = record.usage.lastUsedAt ? new Date(record.usage.lastUsedAt) : null;
      if (lastUsed) {
        const daysSinceUsed =
          (nowDate.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUsed > STALE_AGE_DAYS) {
          staleCandidates.push(record);
        }
      }
    }
  }

  // Proposal: mark unused but approved memories as stale.
  if (unusedApproved.length > 0) {
    const targetIds = unusedApproved.map((r) => r.id);
    const kind: DataRecipeProposalKind = "mark_stale";
    const risk = classifyProposalRisk(kind, targetIds.length, false);

    const evidence = unusedApproved.map((record) =>
      makeEvidence(
        "lifecycle",
        record.id,
        `Approved >${STALE_AGE_DAYS}d ago with zero usage. Content: "${record.content.slice(0, 60)}..."`,
        0.75,
        now
      )
    );

    proposals.push({
      id: makeProposalId(vaultId, "unused-stale", ++seq),
      kind,
      risk,
      reason: `${unusedApproved.length} approved memories have never been used in recall and are >${STALE_AGE_DAYS} days old. Marking as stale may reduce retrieval noise.`,
      evidence,
      action: {
        type: "mark_stale",
        targetMemoryIds: targetIds,
        parameters: { reason: "unused_since_approval" }
      },
      createdAt: now
    });
  }

  // Proposal: mark low-usage stale candidates as stale.
  if (staleCandidates.length > 0) {
    const targetIds = staleCandidates.map((r) => r.id);
    const kind: DataRecipeProposalKind = "mark_stale";
    const risk = classifyProposalRisk(kind, targetIds.length, false);

    const evidence = staleCandidates.map((record) =>
      makeEvidence(
        "usage",
        record.id,
        `Used only ${record.usage.usageCount}x, last used ${record.usage.lastUsedAt}. Low engagement suggests staleness.`,
        0.7,
        now
      )
    );

    proposals.push({
      id: makeProposalId(vaultId, "lowuse-stale", ++seq),
      kind,
      risk,
      reason: `${staleCandidates.length} memories have very low usage (<${UNDER_USED_THRESHOLD + 1}) and haven't been used in >${STALE_AGE_DAYS} days.`,
      evidence,
      action: {
        type: "mark_stale",
        targetMemoryIds: targetIds,
        parameters: { reason: "low_usage_staleness" }
      },
      createdAt: now
    });
  }

  return proposals;
}

/**
 * Analyze memory edges for conflict and supersede relationships:
 *   - May-supersede edges → propose mark_superseded
 *   - May-conflict edges → propose merge review
 */
function analyzeEdges(
  edges: MemoryEdge[],
  vaultId: string,
  now: string
): DataRecipeProposal[] {
  if (edges.length === 0) return [];

  const proposals: DataRecipeProposal[] = [];
  let seq = 0;

  // Group edges by relation type.
  const supersedeEdges: MemoryEdge[] = [];
  const conflictEdges: MemoryEdge[] = [];
  const mergeEdges: MemoryEdge[] = [];

  for (const edge of edges) {
    switch (edge.relation) {
      case "supersedes":
        supersedeEdges.push(edge);
        break;
      case "contradicts":
        conflictEdges.push(edge);
        break;
      case "duplicates":
        mergeEdges.push(edge);
        break;
      // "updates" and "extends" are informational edges — not used for proposals.
      default:
        break;
    }
  }

  // Proposal: mark superseded where confidence is high enough.
  const highConfSupersede = supersedeEdges.filter((e) => e.confidence >= 0.7);
  if (highConfSupersede.length > 0) {
    const targetIds = Array.from(
      new Set(highConfSupersede.map((e) => e.fromMemoryId))
    );
    const kind: DataRecipeProposalKind = "mark_superseded";
    const risk = classifyProposalRisk(kind, targetIds.length, false);

    const evidence = highConfSupersede.map((edge) =>
      makeEvidence(
        "edges",
        edge.fromMemoryId,
        `Memory ${edge.fromMemoryId.slice(0, 12)}... is likely superseded by ${edge.toMemoryId.slice(0, 12)}... (confidence: ${edge.confidence.toFixed(2)}, reason: ${edge.reason})`,
        edge.confidence,
        now
      )
    );

    proposals.push({
      id: makeProposalId(vaultId, "supersede", ++seq),
      kind,
      risk,
      reason: `${highConfSupersede.length} memory supersede relationships detected with confidence ≥ 0.7. Marking older entries as superseded may improve recall accuracy.`,
      evidence,
      action: {
        type: "mark_superseded",
        targetMemoryIds: targetIds,
        parameters: {
          supersedingIds: Object.fromEntries(
            highConfSupersede.map((e) => [e.fromMemoryId, e.toMemoryId])
          )
        }
      },
      createdAt: now
    });
  }

  // Proposal: suggest merging when duplicate edge count exceeds threshold.
  // Group by the "to" (winning) memory to find clusters.
  const mergeTargets = new Map<string, string[]>();
  for (const edge of mergeEdges) {
    if (edge.confidence < 0.6) continue;
    const existing = mergeTargets.get(edge.toMemoryId) ?? [];
    existing.push(edge.fromMemoryId);
    mergeTargets.set(edge.toMemoryId, existing);
  }

  for (const [winner, duplicates] of mergeTargets) {
    if (duplicates.length >= DUPLICATE_EDGE_THRESHOLD) {
      const targetIds = [winner, ...duplicates];
      const kind: DataRecipeProposalKind = "merge_suggestion";
      const risk = classifyProposalRisk(kind, targetIds.length, false);

      const evidence = [
        makeEvidence(
          "edges",
          winner,
          `${duplicates.length} memories likely duplicate ${winner.slice(0, 12)}... Consider merging content into a single authoritative record.`,
          0.7,
          now
        )
      ];

      proposals.push({
        id: makeProposalId(vaultId, "merge", ++seq),
        kind,
        risk,
        reason: `${duplicates.length + 1} memories are likely duplicates. Merging them may reduce memory clutter and improve recall precision.`,
        evidence,
        action: {
          type: "merge_suggestion",
          targetMemoryIds: targetIds,
          parameters: { winnerId: winner, duplicateIds: duplicates }
        },
        createdAt: now
      });
    }
  }

  // Proposal: conflict resolution (admin review only, not auto).
  const highConfConflict = conflictEdges.filter((e) => e.confidence >= 0.7);
  if (highConfConflict.length >= CONFLICT_EDGE_THRESHOLD) {
    const targetIds = Array.from(
      new Set(highConfConflict.flatMap((e) => [e.fromMemoryId, e.toMemoryId]))
    );
    const kind: DataRecipeProposalKind = "merge_suggestion";
    const risk: DataRecipeProposalRisk = "high"; // conflicts always require review

    const evidence = highConfConflict.map((edge) =>
      makeEvidence(
        "edges",
        edge.fromMemoryId,
        `Memory ${edge.fromMemoryId.slice(0, 12)}... conflicts with ${edge.toMemoryId.slice(0, 12)}... (reason: ${edge.reason})`,
        edge.confidence,
        now
      )
    );

    proposals.push({
      id: makeProposalId(vaultId, "conflict", ++seq),
      kind,
      risk,
      reason: `${highConfConflict.length} memory conflicts detected. Operator review required to resolve conflicting information.`,
      evidence,
      action: {
        type: "merge_suggestion",
        targetMemoryIds: targetIds,
        parameters: { conflictEdgeCount: highConfConflict.length }
      },
      createdAt: now,
      expiresAt: undefined
    });
  }

  return proposals;
}

/**
 * Analyze inbox v0.9 items for auto-accept threshold recommendations.
 * Looks at rejection patterns, state distributions, and label distributions
 * to suggest confidence/risk threshold adjustments.
 */
function analyzeInboxItems(
  items: InboxV09Item[],
  vaultId: string,
  now: string
): DataRecipeProposal[] {
  if (items.length === 0) return [];

  const proposals: DataRecipeProposal[] = [];
  let seq = 0;

  // Count items by state for pattern analysis.
  let autoApprovedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;
  let sensitiveLabelCount = 0;
  let lowConfLabelCount = 0;
  let conflictLabelCount = 0;
  let duplicateLabelCount = 0;

  for (const item of items) {
    if (item.state === "auto_approved") {
      autoApprovedCount++;
    }
    if (item.state === "deleted" || item.state === "ignored") {
      rejectedCount++;
    }
    if (item.state === "pending") {
      pendingCount++;
    }
    if (item.labels.includes("sensitive")) {
      sensitiveLabelCount++;
    }
    if (item.labels.includes("low_confidence")) {
      lowConfLabelCount++;
    }
    if (item.labels.includes("conflict")) {
      conflictLabelCount++;
    }
    if (item.labels.includes("duplicate")) {
      duplicateLabelCount++;
    }
  }

  const total = items.length;

  // If rejection rate is high, the auto-accept threshold may be too loose.
  if (rejectedCount > 0 && rejectedCount / total >= 0.2) {
    const evidence = makeEvidence(
      "inbox",
      undefined,
      `Inbox rejection rate is ${((rejectedCount / total) * 100).toFixed(1)}% (${rejectedCount}/${total}). Raising auto-accept confidence threshold may reduce rejection volume.`,
      0.7,
      now
    );
    const kind: DataRecipeProposalKind = "inbox_auto_accept";
    const risk = classifyProposalRisk(kind, 0, false);

    proposals.push({
      id: makeProposalId(vaultId, "reject-rate", ++seq),
      kind,
      risk,
      reason: `High inbox rejection rate (${((rejectedCount / total) * 100).toFixed(1)}%). Consider raising the auto-accept confidence floor.`,
      evidence: [evidence],
      action: {
        type: "inbox_auto_accept",
        parameters: {
          currentRejectionRate: rejectedCount / total,
          suggestedMinAutoAcceptConfidence: 0.7
        }
      },
      createdAt: now
    });
  }

  // If sensitive items are being auto-approved, propose risk threshold tightening.
  if (sensitiveLabelCount > 0 && autoApprovedCount > 0) {
    const sensitiveAutoRatio = sensitiveLabelCount / autoApprovedCount;
    if (sensitiveAutoRatio >= 0.15) {
      const evidence = makeEvidence(
        "inbox",
        undefined,
        `${sensitiveLabelCount} sensitive-labeled items among ${autoApprovedCount} auto-approved. Risk threshold for auto-approval may be too permissive.`,
        0.65,
        now
      );
      const kind: DataRecipeProposalKind = "inbox_auto_accept";
      const risk = classifyProposalRisk(kind, 0, false);

      proposals.push({
        id: makeProposalId(vaultId, "sensitive-auto", ++seq),
        kind,
        risk,
        reason: `Auto-approved items include ${sensitiveLabelCount} sensitive-labeled entries. Tightening risk threshold for auto-approval is recommended.`,
        evidence: [evidence],
        action: {
          type: "inbox_auto_accept",
          parameters: {
            sensitiveAutoApproveRatio: sensitiveAutoRatio,
            suggestedBlockSensitiveAutoApprove: true
          }
        },
        createdAt: now
      });
    }
  }

  // If duplicate/labeled items are common, suggest auto-accept tightening.
  if (duplicateLabelCount > 0 && duplicateLabelCount / total >= 0.15) {
    const evidence = makeEvidence(
      "inbox",
      undefined,
      `${duplicateLabelCount}/${total} inbox items are labeled as duplicates. May indicate insufficient dedup before inbox ingestion.`,
      0.6,
      now
    );
    const kind: DataRecipeProposalKind = "inbox_auto_accept";
    const risk = classifyProposalRisk(kind, 0, false);

    proposals.push({
      id: makeProposalId(vaultId, "dupe-ratio", ++seq),
      kind,
      risk,
      reason: `High duplicate ratio (${((duplicateLabelCount / total) * 100).toFixed(1)}%). Consider tightening dedup thresholds before inbox ingestion.`,
      evidence: [evidence],
      action: {
        type: "inbox_auto_accept",
        parameters: {
          duplicateLabelRatio: duplicateLabelCount / total,
          suggestedDedupConfidence: 0.5
        }
      },
      createdAt: now
    });
  }

  // If many items are pending, suggest confidence threshold adjustment.
  if (pendingCount > 0 && pendingCount / total >= 0.4) {
    const evidence = makeEvidence(
      "inbox",
      undefined,
      `${pendingCount}/${total} inbox items are in pending state. Lowering the auto-accept confidence threshold may reduce manual review burden.`,
      0.6,
      now
    );
    const kind: DataRecipeProposalKind = "inbox_auto_accept";
    const risk = classifyProposalRisk(kind, 0, false);

    proposals.push({
      id: makeProposalId(vaultId, "pending-ratio", ++seq),
      kind,
      risk,
      reason: `High pending ratio (${((pendingCount / total) * 100).toFixed(1)}%). Consider lowering auto-accept confidence threshold for qualified candidates.`,
      evidence: [evidence],
      action: {
        type: "inbox_auto_accept",
        parameters: {
          pendingRatio: pendingCount / total,
          suggestedMinAutoAcceptConfidence: 0.5
        }
      },
      createdAt: now
    });
  }

  return proposals;
}

// ─────────────────────────────────────────────────────────────────────────
// Main entry point — generateProposals
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generate data recipe proposals from passive agent evidence.
 *
 * This is the core of the Lane D1 data recipe proposal loop. It takes
 * evidence from the evidence ledger, memory lifecycle, inbox, and edge
 * graph — processes each deterministically — and returns a set of
 * ranked, risk-classified proposals.
 *
 * NO user labels or manual feedback are used. All evidence is passive.
 */
export function generateProposals(
  input: GenerateProposalsInput
): DataRecipeProposalSet {
  const now = (input.now ?? new Date()).toISOString();

  const allProposals: DataRecipeProposal[] = [];

  // Process each evidence source independently.
  if (input.ledgerTraces && input.ledgerTraces.length > 0) {
    allProposals.push(
      ...analyzeLedgerTraces(input.ledgerTraces, input.vaultId, now)
    );
  }

  if (input.lifecycleRecords && input.lifecycleRecords.length > 0) {
    allProposals.push(
      ...analyzeLifecycleRecords(input.lifecycleRecords, input.vaultId, now)
    );
  }

  if (input.edges && input.edges.length > 0) {
    allProposals.push(...analyzeEdges(input.edges, input.vaultId, now));
  }

  if (input.inboxItems && input.inboxItems.length > 0) {
    allProposals.push(...analyzeInboxItems(input.inboxItems, input.vaultId, now));
  }

  // Compute summary.
  const byKind: Partial<Record<DataRecipeProposalKind, number>> = {};
  const byRisk: Partial<Record<DataRecipeProposalRisk, number>> = {};

  for (const p of allProposals) {
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    byRisk[p.risk] = (byRisk[p.risk] ?? 0) + 1;
  }

  return {
    vaultId: input.vaultId,
    proposals: allProposals,
    summary: {
      total: allProposals.length,
      byKind,
      byRisk
    },
    generatedAt: now
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Safety filters — pure functions.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Return only proposals that are safe for automatic shadow-mode application.
 * This excludes "high" and "blocked" proposals.
 */
export function filterShadowSafeProposals(
  proposals: DataRecipeProposal[]
): DataRecipeProposal[] {
  return proposals.filter((p) => p.risk === "low");
}

/**
 * Return only proposals that require human review (high or blocked risk).
 */
export function filterReviewRequiredProposals(
  proposals: DataRecipeProposal[]
): DataRecipeProposal[] {
  return proposals.filter((p) => p.risk === "high" || p.risk === "blocked");
}

/**
 * Return proposals excluding blocked/destructive ones.
 * Medium and low proposals are included; high proposals are included
 * (they need review, but are not blocked).
 */
export function filterNonBlockedProposals(
  proposals: DataRecipeProposal[]
): DataRecipeProposal[] {
  return proposals.filter((p) => p.risk !== "blocked");
}

/**
 * Return only blocked proposals (destructive or high-risk content modifications).
 * These must NEVER be auto-applied.
 */
export function filterBlockedProposals(
  proposals: DataRecipeProposal[]
): DataRecipeProposal[] {
  return proposals.filter((p) => p.risk === "blocked");
}

/**
 * Check if ANY proposal in the set is blocked — if so, the entire set
 * requires operator review before any automatic action.
 */
export function hasBlockedProposals(
  proposals: DataRecipeProposal[]
): boolean {
  return proposals.some((p) => p.risk === "blocked");
}
