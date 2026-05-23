import { stableMemoryId } from "@lore/shared";
import type { MemoryCandidate, ProfileItemType } from "./types.js";
import { classifyRisk, type MemoryRiskLevel } from "./inbox.js";

/**
 * Memory Inbox 2.0 — v0.9 Auto-Capture Beta plan §4.8.
 *
 * Supersedes the v0.8 inbox state machine without breaking it. v0.8's
 * `MemoryInboxItem` continues to work; v0.9 adds richer states, labels,
 * actions, and a per-vault rejection fingerprint store so rejected
 * candidates do not immediately reappear.
 */

export type InboxV09State =
  | "pending"
  | "auto_approved"
  | "approved"
  | "edited"
  | "ignored"
  | "deleted"
  | "conflict"
  | "sensitive_review"
  | "stale_review";

export type InboxV09Label =
  | "sensitive"
  | "conflict"
  | "stale"
  | "duplicate"
  | "low_confidence";

export type InboxV09Action =
  | "approve"
  | "edit_approve"
  | "reject"
  | "delete"
  | "pause_source"
  | "mark_private";

export type InboxV09CandidateType =
  | "user_preference"
  | "project_fact"
  | "decision"
  | "task"
  | "relationship"
  | "credential_like"
  | "contradiction"
  | "stale_correction"
  | "document_summary"
  | "web_chat_summary";

export interface InboxV09Item {
  id: string;
  vaultId: string;
  candidateId: string;
  candidate: MemoryCandidate;
  /** caller-classified candidate type per plan §4.8. */
  candidateType: InboxV09CandidateType;
  state: InboxV09State;
  riskLevel: MemoryRiskLevel;
  labels: InboxV09Label[];
  /** profile item this candidate would map to, if any */
  profileMapping?: ProfileItemType;
  /** content as it currently stands - may differ from candidate.content after edit_approve */
  content: string;
  /** reason populated when state is rejected/deleted/sensitive_review/stale_review/conflict */
  reason?: string;
  /** capture source id this candidate came from (for source pause action) */
  sourceId?: string;
  history: Array<{
    at: string;
    action: InboxV09Action | "auto" | "ingest";
    reason?: string;
    by?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const SENSITIVE_TYPES = new Set<InboxV09CandidateType>(["credential_like"]);

export interface IngestV09Options {
  vaultId: string;
  candidateType: InboxV09CandidateType;
  sourceId?: string;
  /** when true, low-risk + high-confidence candidates skip review */
  autoApproveSafe?: boolean;
  /** confidence threshold for auto-approval (default 0.7) */
  autoApproveConfidence?: number;
  /** caller-supplied labels (e.g. dedup, conflict edge) */
  labels?: InboxV09Label[];
  /** rejection fingerprint store - rejected candidates do not reappear */
  rejectionStore?: RejectionFingerprintStore;
  now?: Date;
}

const LOW_CONFIDENCE_THRESHOLD = 0.4;

export function classifyLabels(input: {
  candidate: MemoryCandidate;
  candidateType: InboxV09CandidateType;
  riskLevel: MemoryRiskLevel;
  hintLabels?: InboxV09Label[];
}): InboxV09Label[] {
  const labels = new Set<InboxV09Label>(input.hintLabels ?? []);
  if (SENSITIVE_TYPES.has(input.candidateType) || input.riskLevel === "high" || input.riskLevel === "blocked") {
    labels.add("sensitive");
  }
  if (input.candidate.riskTags.includes("stale") || input.candidate.riskTags.includes("outdated")) {
    labels.add("stale");
  }
  if (input.candidate.confidence < LOW_CONFIDENCE_THRESHOLD) {
    labels.add("low_confidence");
  }
  return Array.from(labels);
}

export function ingestV09(candidate: MemoryCandidate, options: IngestV09Options): InboxV09Item {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const id = stableMemoryId("ibx2", `${options.vaultId}|${candidate.id}`);
  const riskLevel = classifyRisk(candidate);
  const labels = classifyLabels({
    candidate,
    candidateType: options.candidateType,
    riskLevel,
    hintLabels: options.labels
  });

  const baseHistory: InboxV09Item["history"] = [{ at: nowIso, action: "ingest" }];

  const base: InboxV09Item = {
    id,
    vaultId: options.vaultId,
    candidateId: candidate.id,
    candidate,
    candidateType: options.candidateType,
    state: "pending",
    riskLevel,
    labels,
    profileMapping: candidate.profileMapping,
    content: candidate.content,
    sourceId: options.sourceId,
    history: baseHistory,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // Rejection fingerprint guard: previously rejected (type + normalized content)
  // candidates do not reappear — they are silently ignored at ingest time.
  if (
    options.rejectionStore?.hasFingerprint(options.vaultId, fingerprintFor(options.candidateType, candidate.content))
  ) {
    return appendHistory(
      { ...base, state: "ignored", reason: "fingerprint matches a previously rejected candidate" },
      { at: nowIso, action: "auto", reason: "rejection fingerprint match" }
    );
  }

  if (riskLevel === "blocked") {
    return appendHistory(
      { ...base, state: "deleted", reason: "blocked content (private marker, secret, or do-not-remember)" },
      { at: nowIso, action: "auto", reason: "blocked at ingest" }
    );
  }

  if (riskLevel === "high" || labels.includes("sensitive")) {
    return appendHistory(
      { ...base, state: "sensitive_review", reason: "sensitive candidate requires explicit review" },
      { at: nowIso, action: "auto", reason: "sensitive label" }
    );
  }

  if (labels.includes("conflict")) {
    return appendHistory(
      { ...base, state: "conflict", reason: "conflicts with an existing memory" },
      { at: nowIso, action: "auto", reason: "conflict label" }
    );
  }

  if (labels.includes("stale")) {
    return appendHistory(
      { ...base, state: "stale_review", reason: "carries a stale label, awaiting review" },
      { at: nowIso, action: "auto", reason: "stale label" }
    );
  }

  if (
    options.autoApproveSafe &&
    riskLevel === "low" &&
    !labels.includes("low_confidence") &&
    candidate.confidence >= (options.autoApproveConfidence ?? 0.7)
  ) {
    return appendHistory(
      { ...base, state: "auto_approved" },
      { at: nowIso, action: "auto", reason: "auto-approve safe candidate" }
    );
  }

  return base;
}

const TRANSITIONS: ReadonlyMap<InboxV09State, ReadonlySet<InboxV09Action>> = new Map([
  [
    "pending",
    new Set<InboxV09Action>(["approve", "edit_approve", "reject", "delete", "pause_source", "mark_private"])
  ],
  [
    "auto_approved",
    new Set<InboxV09Action>(["edit_approve", "reject", "delete", "pause_source", "mark_private"])
  ],
  [
    "approved",
    new Set<InboxV09Action>(["edit_approve", "reject", "delete", "pause_source", "mark_private"])
  ],
  [
    "edited",
    new Set<InboxV09Action>(["edit_approve", "reject", "delete", "pause_source", "mark_private"])
  ],
  [
    "sensitive_review",
    new Set<InboxV09Action>(["approve", "edit_approve", "reject", "delete", "pause_source", "mark_private"])
  ],
  [
    "stale_review",
    new Set<InboxV09Action>(["approve", "edit_approve", "reject", "delete", "pause_source", "mark_private"])
  ],
  [
    "conflict",
    new Set<InboxV09Action>(["approve", "edit_approve", "reject", "delete", "pause_source"])
  ],
  ["ignored", new Set()],
  ["deleted", new Set()]
]);

export class InboxV09TransitionError extends Error {
  constructor(
    readonly from: InboxV09State,
    readonly action: InboxV09Action,
    message: string
  ) {
    super(message);
    this.name = "InboxV09TransitionError";
  }
}

export interface ApplyV09ActionInput {
  action: InboxV09Action;
  /** new content when action is edit_approve */
  newContent?: string;
  reason?: string;
  by?: string;
  now?: Date;
  /** only used by reject/delete - records the fingerprint so future ingest skips it */
  rejectionStore?: RejectionFingerprintStore;
}

export function applyV09Action(item: InboxV09Item, input: ApplyV09ActionInput): InboxV09Item {
  const allowed = TRANSITIONS.get(item.state);
  if (!allowed || !allowed.has(input.action)) {
    throw new InboxV09TransitionError(item.state, input.action, `cannot ${input.action} when state is ${item.state}`);
  }
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  let nextState: InboxV09State = item.state;
  let nextContent = item.content;
  let nextReason = item.reason;

  switch (input.action) {
    case "approve":
      nextState = "approved";
      break;
    case "edit_approve":
      nextState = "edited";
      if (input.newContent !== undefined) nextContent = input.newContent;
      break;
    case "reject":
      nextState = "ignored";
      nextReason = input.reason ?? "user rejected";
      input.rejectionStore?.add(item.vaultId, fingerprintFor(item.candidateType, nextContent));
      break;
    case "delete":
      nextState = "deleted";
      nextReason = input.reason ?? "user deleted";
      input.rejectionStore?.add(item.vaultId, fingerprintFor(item.candidateType, nextContent));
      break;
    case "pause_source":
      // pause_source is a side-effect action: it does not change the inbox
      // state but logs the action and reason. The cloud lane wires the
      // capture-source pause server-side based on this audit entry.
      break;
    case "mark_private":
      // mark_private is also a side-effect action: caller is expected to
      // re-route the source to private mode and the inbox item ends up
      // ignored because no durable memory should be stored.
      nextState = "ignored";
      nextReason = "marked private";
      break;
  }

  return appendHistory(
    { ...item, state: nextState, content: nextContent, reason: nextReason, updatedAt: nowIso },
    { at: nowIso, action: input.action, reason: input.reason, by: input.by }
  );
}

function appendHistory(item: InboxV09Item, entry: InboxV09Item["history"][number]): InboxV09Item {
  return { ...item, history: [...item.history, entry], updatedAt: entry.at };
}

/**
 * Returns true if a memory item is durable and may be retrieved by recall.
 * v0.9: only `auto_approved`, `approved`, and `edited` are recall-active.
 */
export function isV09RecallActive(item: InboxV09Item): boolean {
  return item.state === "auto_approved" || item.state === "approved" || item.state === "edited";
}

/**
 * Per-vault rejection fingerprint store. Implementations may persist this in
 * Postgres or a small KV; the in-memory class is sufficient for tests and
 * for the cloud lane to plug in a real implementation later.
 */
export interface RejectionFingerprintStore {
  hasFingerprint(vaultId: string, fingerprint: string): boolean;
  add(vaultId: string, fingerprint: string): void;
}

export class InMemoryRejectionFingerprintStore implements RejectionFingerprintStore {
  private readonly byVault = new Map<string, Set<string>>();

  hasFingerprint(vaultId: string, fingerprint: string): boolean {
    return this.byVault.get(vaultId)?.has(fingerprint) ?? false;
  }

  add(vaultId: string, fingerprint: string): void {
    let set = this.byVault.get(vaultId);
    if (!set) {
      set = new Set();
      this.byVault.set(vaultId, set);
    }
    set.add(fingerprint);
  }
}

export function fingerprintFor(type: InboxV09CandidateType, content: string): string {
  const normalized = content.trim().toLowerCase().replace(/\s+/g, " ");
  return `${type}::${normalized}`;
}
