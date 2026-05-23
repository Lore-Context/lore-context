import { stableMemoryId } from "@lore/shared";

/**
 * Memory lifecycle state machine — Lane D (rc.1).
 *
 * Maps the full user-visible journey of a memory from raw capture to deletion.
 * Orthogonal to the inbox state machine (InboxV09) and governance state (GovState);
 * those handle trust/risk classification while this exposes the product-level arc.
 *
 * States:
 *   captured_event     → raw event ingested from a source connector
 *   suggested_candidate → extracted candidate awaiting review in Memory Inbox
 *   approved_memory    → approved for recall (by user or auto-accept)
 *   used_memory        → approved AND has been composed into at least one recall response
 *   stale_memory       → previously approved but marked outdated or past valid_until
 *   superseded_memory  → replaced by a newer memory for the same fact
 *   deleted_memory     → terminal; no longer stored or retrievable
 */

export type MemoryLifecycleState =
  | "captured_event"
  | "suggested_candidate"
  | "approved_memory"
  | "used_memory"
  | "stale_memory"
  | "superseded_memory"
  | "deleted_memory";

export type MemoryLifecycleAction =
  | "approve"
  | "edit"
  | "reject"
  | "merge_duplicate"
  | "mark_private"
  | "mark_outdated"
  | "delete_source"
  | "record_usage"
  | "mark_superseded"
  | "delete";

/** Source provenance attached to every lifecycle record. */
export interface MemorySourceInfo {
  /** source app or agent identifier, e.g. "claude_code", "codex", "browser_ext" */
  app: string;
  /** human-readable title for the source session or document */
  title?: string;
  /** session ID, document ID, or URL */
  sessionId?: string;
  /** ISO timestamp when the source event was originally captured */
  capturedAt: string;
}

/** Usage tracking: how often this memory has appeared in recall responses. */
export interface MemoryUsageRecord {
  usageCount: number;
  lastUsedAt?: string;
  /** evidence-ledger trace IDs where this memory was composed */
  traceIds: string[];
}

export interface MemoryLifecycleRecord {
  id: string;
  vaultId: string;
  /** current content — may differ from original after an edit action */
  content: string;
  state: MemoryLifecycleState;
  /** plain-language reason this candidate was surfaced */
  suggestionReason?: string;
  confidence: number;
  privacyState: "default" | "private" | "team";
  source: MemorySourceInfo;
  usage: MemoryUsageRecord;
  /** relative URL path a client can call to export this memory */
  exportPath: string;
  /** id of the memory this was superseded by, if applicable */
  supersededBy?: string;
  /** ids of records that were merged into this one */
  mergedFromIds?: string[];
  riskTags: string[];
  history: Array<{
    at: string;
    action: MemoryLifecycleAction | "auto" | "capture";
    reason?: string;
    by?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const ALLOWED_ACTIONS: ReadonlyMap<
  MemoryLifecycleState,
  ReadonlySet<MemoryLifecycleAction>
> = new Map([
  ["captured_event", new Set<MemoryLifecycleAction>(["delete"])],
  [
    "suggested_candidate",
    new Set<MemoryLifecycleAction>([
      "approve",
      "edit",
      "reject",
      "merge_duplicate",
      "mark_private",
      "delete_source",
      "delete"
    ])
  ],
  [
    "approved_memory",
    new Set<MemoryLifecycleAction>([
      "edit",
      "merge_duplicate",
      "mark_private",
      "mark_outdated",
      "delete_source",
      "record_usage",
      "mark_superseded",
      "delete"
    ])
  ],
  [
    "used_memory",
    new Set<MemoryLifecycleAction>([
      "edit",
      "merge_duplicate",
      "mark_private",
      "mark_outdated",
      "delete_source",
      "record_usage",
      "mark_superseded",
      "delete"
    ])
  ],
  [
    "stale_memory",
    new Set<MemoryLifecycleAction>(["approve", "edit", "delete_source", "delete"])
  ],
  ["superseded_memory", new Set<MemoryLifecycleAction>(["delete"])],
  ["deleted_memory", new Set<MemoryLifecycleAction>()]
]);

export class MemoryLifecycleTransitionError extends Error {
  constructor(
    readonly from: MemoryLifecycleState,
    readonly action: MemoryLifecycleAction | "suggest",
    message: string
  ) {
    super(message);
    this.name = "MemoryLifecycleTransitionError";
  }
}

function appendHistory(
  record: MemoryLifecycleRecord,
  entry: MemoryLifecycleRecord["history"][number]
): MemoryLifecycleRecord {
  return {
    ...record,
    history: [...record.history, entry],
    updatedAt: entry.at
  };
}

// ─── Construction ────────────────────────────────────────────────────────────

export interface CaptureEventInput {
  vaultId: string;
  content: string;
  confidence: number;
  source: MemorySourceInfo;
  riskTags?: string[];
  privacyState?: MemoryLifecycleRecord["privacyState"];
  now?: Date;
}

/**
 * Create a new lifecycle record in `captured_event` state.
 * Call this when a raw event arrives from a source connector.
 */
export function captureEvent(input: CaptureEventInput): MemoryLifecycleRecord {
  const now = (input.now ?? new Date()).toISOString();
  const id = stableMemoryId(
    "mlc",
    `${input.vaultId}|${input.source.app}|${input.source.capturedAt}|${input.content.slice(0, 64)}`
  );
  return {
    id,
    vaultId: input.vaultId,
    content: input.content,
    state: "captured_event",
    confidence: input.confidence,
    privacyState: input.privacyState ?? "default",
    source: input.source,
    usage: { usageCount: 0, traceIds: [] },
    exportPath: `/vault/${input.vaultId}/memories/${id}/export`,
    riskTags: input.riskTags ?? [],
    history: [{ at: now, action: "capture" }],
    createdAt: now,
    updatedAt: now
  };
}

export interface SuggestCandidateInput {
  suggestionReason: string;
  now?: Date;
}

/**
 * Advance a captured event to `suggested_candidate`.
 * Call this when the extraction pipeline has produced a reviewable candidate.
 */
export function suggestCandidate(
  record: MemoryLifecycleRecord,
  input: SuggestCandidateInput
): MemoryLifecycleRecord {
  if (record.state !== "captured_event") {
    throw new MemoryLifecycleTransitionError(
      record.state,
      "suggest",
      `suggestCandidate requires captured_event state, got: ${record.state}`
    );
  }
  const now = (input.now ?? new Date()).toISOString();
  return appendHistory(
    {
      ...record,
      state: "suggested_candidate",
      suggestionReason: input.suggestionReason,
      updatedAt: now
    },
    { at: now, action: "auto", reason: input.suggestionReason }
  );
}

// ─── Reviewer actions ─────────────────────────────────────────────────────────

export interface ApplyLifecycleActionInput {
  action: MemoryLifecycleAction;
  /** replacement content for `edit` action */
  newContent?: string;
  reason?: string;
  by?: string;
  /** id of the memory that supersedes this one (`mark_superseded`) */
  supersededBy?: string;
  /** ids of records being merged into this winner (`merge_duplicate` on winner) */
  mergedFromIds?: string[];
  /** evidence-ledger trace id to record for `record_usage` */
  traceId?: string;
  now?: Date;
}

export function applyLifecycleAction(
  record: MemoryLifecycleRecord,
  input: ApplyLifecycleActionInput
): MemoryLifecycleRecord {
  const allowed = ALLOWED_ACTIONS.get(record.state);
  if (!allowed?.has(input.action)) {
    throw new MemoryLifecycleTransitionError(
      record.state,
      input.action,
      `cannot ${input.action} when state is ${record.state}`
    );
  }

  const now = (input.now ?? new Date()).toISOString();
  let nextState: MemoryLifecycleState = record.state;
  let nextContent = record.content;
  let nextPrivacy = record.privacyState;
  let nextUsage = record.usage;
  let supersededBy = record.supersededBy;
  let mergedFromIds = record.mergedFromIds;

  switch (input.action) {
    case "approve":
      nextState = "approved_memory";
      break;

    case "edit":
      if (input.newContent !== undefined) nextContent = input.newContent;
      // editing a stale or candidate record is an implicit approval
      nextState =
        record.state === "stale_memory" || record.state === "suggested_candidate"
          ? "approved_memory"
          : record.state;
      break;

    case "reject":
      nextState = "deleted_memory";
      break;

    case "merge_duplicate":
      // the record receiving this action is the duplicate being absorbed
      nextState = "deleted_memory";
      if (input.mergedFromIds) mergedFromIds = input.mergedFromIds;
      break;

    case "mark_private":
      nextState = "deleted_memory";
      nextPrivacy = "private";
      break;

    case "mark_outdated":
      nextState = "stale_memory";
      break;

    case "delete_source":
      nextState = "deleted_memory";
      break;

    case "record_usage": {
      nextState = "used_memory";
      const traceIds = input.traceId
        ? [...record.usage.traceIds, input.traceId]
        : record.usage.traceIds;
      nextUsage = {
        usageCount: record.usage.usageCount + 1,
        lastUsedAt: now,
        traceIds
      };
      break;
    }

    case "mark_superseded":
      nextState = "superseded_memory";
      if (input.supersededBy) supersededBy = input.supersededBy;
      break;

    case "delete":
      nextState = "deleted_memory";
      break;
  }

  return appendHistory(
    {
      ...record,
      state: nextState,
      content: nextContent,
      privacyState: nextPrivacy,
      usage: nextUsage,
      supersededBy,
      mergedFromIds,
      updatedAt: now
    },
    { at: now, action: input.action, reason: input.reason, by: input.by }
  );
}

// ─── Recall visibility ────────────────────────────────────────────────────────

/** Returns true if this record should appear in active recall responses. */
export function isRecallActive(record: MemoryLifecycleRecord): boolean {
  return record.state === "approved_memory" || record.state === "used_memory";
}

// ─── Recall explanation ───────────────────────────────────────────────────────

export type RecallDecisionReason =
  | "used"
  | "ignored_low_score"
  | "ignored_budget"
  | "stale"
  | "blocked_risk"
  | "blocked_private"
  | "blocked_not_approved"
  | "superseded"
  | "missing"
  | "conflicting";

export interface RecallExplanation {
  memoryId: string;
  decision: RecallDecisionReason;
  /** one-sentence plain-language summary for the user */
  summary: string;
  /** optional additional detail */
  details?: string;
}

/**
 * Produce a plain-language explanation of why a memory was used, ignored,
 * stale, or blocked in a recall response. Surfaced in Memory Inbox and recall
 * trace UI so ordinary users understand what happened without reading raw logs.
 */
export function explainMemoryDecision(
  record: MemoryLifecycleRecord,
  decision: RecallDecisionReason
): RecallExplanation {
  const sourceLabel = record.source.title
    ? `${record.source.app} — ${record.source.title}`
    : record.source.app;
  const base = { memoryId: record.id };

  switch (decision) {
    case "used":
      return {
        ...base,
        decision,
        summary: `Included in the AI's context (from ${sourceLabel})`,
        details:
          record.usage.usageCount > 0
            ? `Used ${record.usage.usageCount} time(s); last used ${record.usage.lastUsedAt}.`
            : undefined
      };

    case "stale":
      return {
        ...base,
        decision,
        summary: "Skipped — this memory is marked stale or outdated",
        details: `Source: ${sourceLabel}. Re-approve it in Memory Inbox to restore recall.`
      };

    case "superseded":
      return {
        ...base,
        decision,
        summary: "Skipped — a newer memory replaces this one",
        details: record.supersededBy
          ? `Superseded by memory ${record.supersededBy}.`
          : undefined
      };

    case "blocked_risk":
      return {
        ...base,
        decision,
        summary: "Blocked — this memory contains sensitive content",
        details:
          record.riskTags.length > 0
            ? `Risk tags: ${record.riskTags.join(", ")}.`
            : undefined
      };

    case "blocked_private":
      return {
        ...base,
        decision,
        summary: "Blocked — this memory is marked private and excluded from recall",
        details: `Source: ${sourceLabel}.`
      };

    case "blocked_not_approved":
      return {
        ...base,
        decision,
        summary: "Blocked — this memory has not been approved yet",
        details: `Current state: ${record.state}. Approve it in Memory Inbox to enable recall.`
      };

    case "ignored_low_score":
      return {
        ...base,
        decision,
        summary: "Skipped — scored below the relevance threshold for this query",
        details: `Confidence: ${record.confidence}. Source: ${sourceLabel}.`
      };

    case "ignored_budget":
      return {
        ...base,
        decision,
        summary: "Skipped — token budget was already filled by higher-ranked memories",
        details: `Source: ${sourceLabel}.`
      };

    case "missing":
      return {
        ...base,
        decision,
        summary: "Not found — memory was referenced but could not be retrieved",
        details: "It may have been deleted or its embedding is not yet indexed."
      };

    case "conflicting":
      return {
        ...base,
        decision,
        summary: "Skipped — this memory conflicts with another memory in your vault",
        details: `Source: ${sourceLabel}. Review conflicting memories in Memory Inbox.`
      };
  }
}
