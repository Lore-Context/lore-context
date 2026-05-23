import { stableMemoryId, type MemoryHit, type SourceRef } from "@lore/shared";
import type { RecallContextResponse } from "./types.js";

/**
 * v0.9 retrieval layer label - matches packages/profile/src/recall-layered.ts.
 * Kept here as a string union so the ledger module does not depend on the
 * recall module (avoids a cycle and lets cloud lane tests build the ledger
 * without pulling in recall internals).
 */
export type EvidenceRetrievalLayer =
  | "profile"
  | "recent_session"
  | "project_memory"
  | "connector_doc"
  | "browser_summary"
  | "pinned_memory";

/**
 * Evidence Ledger trace model - PRD §8.8 Recall API and Evidence Ledger.
 *
 * State machine for each retrieved memory:
 *   - retrieved      : memory came back from BM25/vector hit
 *   - used           : composed into the context block
 *   - ignored        : retrieved but skipped (low score, dedup, budget)
 *   - stale          : valid_until expired or marked stale
 *   - conflicting    : participates in a contradicts edge
 *   - risky          : carries risk tags above policy threshold
 *   - missing        : referenced by id but not retrievable (deleted/embedding gap)
 *   - user_feedback  : user marked the row useful/wrong/outdated/sensitive
 */

export type EvidenceLedgerState =
  | "retrieved"
  | "used"
  | "ignored"
  | "stale"
  | "conflicting"
  | "risky"
  | "missing"
  | "user_feedback";

export type EvidenceFeedback = "useful" | "wrong" | "outdated" | "sensitive";

export interface EvidenceLedgerEntry {
  memoryId: string;
  state: EvidenceLedgerState;
  rank?: number;
  reason?: string;
  riskTags: string[];
  warnings: string[];
  feedback?: EvidenceFeedback;
  feedbackAt?: string;
  /** v0.9: which retrieval layer surfaced this memory */
  retrievalLayer?: EvidenceRetrievalLayer;
  /** v0.9: source ref the layer attached - doc id, session id, url, etc. */
  sourceRef?: string;
  /** v0.9: when the underlying source was last validated */
  sourceTimestamp?: string;
}

export interface EvidenceLedgerTrace {
  traceId: string;
  vaultId: string;
  agentId?: string;
  agentTarget?: string;
  /** v0.9: requesting client identifier (e.g. claude_code, codex, browser_ext, hosted_mcp) */
  requestingClient?: string;
  query: string;
  projectId?: string;
  tokensUsed: number;
  tokenBudget: number;
  truncated: boolean;
  warnings: string[];
  sourceRefs: SourceRef[];
  entries: EvidenceLedgerEntry[];
  summary: {
    retrieved: number;
    used: number;
    ignored: number;
    stale: number;
    conflicting: number;
    risky: number;
    missing: number;
  };
  createdAt: string;
}

export interface BuildLedgerInput {
  traceId?: string;
  vaultId: string;
  agentId?: string;
  agentTarget?: string;
  /** v0.9: identifier of the client that issued the recall request */
  requestingClient?: string;
  query: string;
  projectId?: string;
  response: RecallContextResponse;
  /** all hits considered before composition - includes ones that were filtered out */
  consideredHits: MemoryHit[];
  /** v0.9: per-memory retrieval-layer mapping captured by composeLayeredRecall */
  layerByMemoryId?: Record<string, EvidenceRetrievalLayer>;
  /** v0.9: per-memory source ref (doc id / session id / url) */
  sourceRefByMemoryId?: Record<string, string>;
  /** v0.9: per-memory source last-validated timestamp */
  sourceTimestampByMemoryId?: Record<string, string>;
  /** memory ids referenced by query that could not be found */
  missingIds?: string[];
  /** edges where any of the considered memory ids are involved as `from` or `to` */
  conflictMemoryIds?: string[];
  now?: Date;
}

const STALE_TAGS = new Set(["stale", "outdated", "low_confidence"]);
const RISKY_TAGS = new Set([
  "untrusted_source",
  "needs_review",
  "api_key",
  "aws_access_key",
  "password",
  "private_key",
  "credit_card",
  "ssn"
]);

export function buildEvidenceLedger(input: BuildLedgerInput): EvidenceLedgerTrace {
  const now = (input.now ?? new Date()).toISOString();
  const usedIds = new Set<string>();
  for (const hit of input.response.memoryHits) usedIds.add(hit.memory.id);

  const entries: EvidenceLedgerEntry[] = [];
  const warningsByMemoryId = collectWarningsByMemoryId(input.response.warnings);

  let rank = 1;
  const sortedHits = [...input.consideredHits].sort((a, b) => b.score - a.score);
  for (const hit of sortedHits) {
    const memoryId = hit.memory.id;
    const tags = hit.memory.riskTags;
    const isStale = (hit.memory.validUntil && hit.memory.validUntil < now) || tags.some((t) => STALE_TAGS.has(t));
    const isRisky = tags.some((t) => RISKY_TAGS.has(t));
    const isConflict = (input.conflictMemoryIds ?? []).includes(memoryId);

    let state: EvidenceLedgerState;
    if (usedIds.has(memoryId)) state = "used";
    else if (isStale) state = "stale";
    else if (isRisky) state = "risky";
    else if (isConflict) state = "conflicting";
    else state = "ignored";

    const reason = state === "used"
      ? "composed into context block"
      : state === "stale"
        ? "valid_until in the past or stale tag present"
        : state === "risky"
          ? "carries risk tags above policy threshold"
          : state === "conflicting"
            ? "participates in a contradicts edge"
            : "not selected by composer";

    entries.push({
      memoryId,
      state,
      rank: rank++,
      reason,
      riskTags: tags,
      warnings: warningsByMemoryId.get(memoryId) ?? [],
      retrievalLayer: input.layerByMemoryId?.[memoryId],
      sourceRef: input.sourceRefByMemoryId?.[memoryId],
      sourceTimestamp: input.sourceTimestampByMemoryId?.[memoryId]
    });
  }

  for (const missingId of input.missingIds ?? []) {
    if (entries.some((e) => e.memoryId === missingId)) continue;
    entries.push({
      memoryId: missingId,
      state: "missing",
      reason: "referenced but not retrievable (deleted, embedding gap, or wrong vault)",
      riskTags: [],
      warnings: []
    });
  }

  const traceId = input.traceId ?? stableMemoryId("trace", `${input.vaultId}|${input.query}|${now}`);
  const summary = {
    retrieved: entries.length,
    used: entries.filter((e) => e.state === "used").length,
    ignored: entries.filter((e) => e.state === "ignored").length,
    stale: entries.filter((e) => e.state === "stale").length,
    conflicting: entries.filter((e) => e.state === "conflicting").length,
    risky: entries.filter((e) => e.state === "risky").length,
    missing: entries.filter((e) => e.state === "missing").length
  };

  return {
    traceId,
    vaultId: input.vaultId,
    agentId: input.agentId,
    agentTarget: input.agentTarget,
    requestingClient: input.requestingClient,
    query: input.query,
    projectId: input.projectId,
    tokensUsed: input.response.tokensUsed,
    tokenBudget: input.response.tokenBudget,
    truncated: input.response.truncated,
    warnings: input.response.warnings,
    sourceRefs: input.response.sourceRefs,
    entries,
    summary,
    createdAt: now
  };
}

function collectWarningsByMemoryId(warnings: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const memoryRef = /\bmemory\s+(mem_[a-z0-9]+)\b/i;
  for (const warning of warnings) {
    const match = memoryRef.exec(warning);
    if (!match) continue;
    const id = match[1];
    if (!id) continue;
    const list = map.get(id) ?? [];
    list.push(warning);
    map.set(id, list);
  }
  return map;
}

/**
 * Produce a plain-language explanation for why a specific memory entry ended
 * up in the state recorded in the ledger. Suitable for surfacing in the
 * Memory Inbox "why was this used/skipped?" detail view.
 */
export function explainLedgerEntry(entry: EvidenceLedgerEntry): string {
  switch (entry.state) {
    case "used":
      return "This memory was included in the AI's context for this query.";
    case "ignored":
      return "This memory was retrieved but not included — it scored below the relevance threshold or the token budget was already full.";
    case "stale":
      return "This memory was skipped because it is outdated or marked stale.";
    case "risky":
      return entry.riskTags.length > 0
        ? `This memory was blocked due to sensitive content (${entry.riskTags.join(", ")}).`
        : "This memory was blocked due to sensitive content.";
    case "conflicting":
      return "This memory was skipped because it conflicts with another memory in your vault.";
    case "missing":
      return "This memory could not be retrieved — it may have been deleted or its index entry is missing.";
    case "retrieved":
      return "This memory was retrieved; its final recall status is still being determined.";
    case "user_feedback":
      return entry.feedback
        ? `You marked this memory as "${entry.feedback}".`
        : "You submitted feedback on this memory.";
  }
}

/**
 * Apply user feedback to a ledger entry. Returns a new ledger - never mutates.
 * The caller is responsible for persistence.
 */
export function recordLedgerFeedback(
  trace: EvidenceLedgerTrace,
  memoryId: string,
  feedback: EvidenceFeedback,
  now: Date = new Date()
): EvidenceLedgerTrace {
  const nowIso = now.toISOString();
  const entries = trace.entries.map((e) =>
    e.memoryId === memoryId
      ? { ...e, state: "user_feedback" as EvidenceLedgerState, feedback, feedbackAt: nowIso }
      : e
  );
  if (!entries.some((e) => e.memoryId === memoryId)) {
    entries.push({
      memoryId,
      state: "user_feedback",
      reason: "feedback recorded for memory not in original ledger",
      riskTags: [],
      warnings: [],
      feedback,
      feedbackAt: nowIso
    });
  }
  return { ...trace, entries };
}
