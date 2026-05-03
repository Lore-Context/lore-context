import { stableMemoryId } from "@lore/shared";
import type { MemoryCandidate, ProfileItemType } from "./types.js";

/**
 * Memory Inbox state machine - PRD §8.6 Memory extraction and Memory Inbox.
 *
 * Default behaviour:
 *   - low-risk + high-confidence candidates auto-accept (active in recall) but
 *     remain undoable from the Inbox for a configurable window;
 *   - high-risk candidates require explicit user review before recall;
 *   - secrets / private blocks / explicit "do-not-remember" reject outright.
 */

export type MemoryInboxState =
  | "pending"
  | "accepted"
  | "rejected"
  | "undone"
  | "needs_review"
  | "expired";

export type MemoryInboxAction =
  | "accept"
  | "reject"
  | "undo"
  | "send_to_review"
  | "approve_review";

export type MemoryRiskLevel = "low" | "medium" | "high" | "blocked";

export interface MemoryInboxItem {
  id: string;
  candidateId: string;
  vaultId: string;
  candidate: MemoryCandidate;
  state: MemoryInboxState;
  riskLevel: MemoryRiskLevel;
  /** seconds remaining for undo (only meaningful when state==="accepted") */
  undoUntil?: string;
  /** profile item type if the candidate maps to one */
  profileMapping?: ProfileItemType;
  /** reason when state is rejected/needs_review */
  reason?: string;
  history: Array<{ at: string; action: MemoryInboxAction | "auto"; reason?: string }>;
  createdAt: string;
  updatedAt: string;
}

const HIGH_RISK_TAGS = new Set([
  "api_key",
  "aws_access_key",
  "password",
  "private_key",
  "credit_card",
  "ssn",
  "phone_number",
  "email_secret"
]);

const BLOCKED_PATTERNS: ReadonlyArray<RegExp> = [
  /<redacted:private>/i,
  /\bdo not remember\b/i,
  /\bdon'?t remember\b/i,
  /\bforget this\b/i
];

const REVIEW_PATTERNS: ReadonlyArray<RegExp> = [
  /\bignore previous instructions\b/i,
  /\bsystem prompt\b/i,
  /\bjailbreak\b/i,
  /\boverride .* (?:safety|security)\b/i
];

export function classifyRisk(candidate: MemoryCandidate): MemoryRiskLevel {
  if (BLOCKED_PATTERNS.some((p) => p.test(candidate.content))) return "blocked";
  if (candidate.riskTags.some((tag) => HIGH_RISK_TAGS.has(tag))) return "high";
  if (REVIEW_PATTERNS.some((p) => p.test(candidate.content))) return "high";
  if (candidate.riskTags.includes("untrusted_source")) return "medium";
  if (candidate.riskTags.length > 0) return "medium";
  return "low";
}

const ACCEPTED_UNDO_WINDOW_MS = 1000 * 60 * 60 * 24; // 24h

export interface IngestOptions {
  vaultId: string;
  /** if true, low-risk high-confidence candidates skip the Inbox and go active. */
  autoAcceptLowRisk?: boolean;
  /** confidence threshold for auto-accept (default 0.6). */
  autoAcceptConfidence?: number;
  now?: Date;
}

export function ingestCandidate(candidate: MemoryCandidate, options: IngestOptions): MemoryInboxItem {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const id = stableMemoryId("ibx", `${options.vaultId}|${candidate.id}`);
  const risk = classifyRisk(candidate);
  const autoAcceptThreshold = options.autoAcceptConfidence ?? 0.6;

  const base: MemoryInboxItem = {
    id,
    candidateId: candidate.id,
    vaultId: options.vaultId,
    candidate,
    state: "pending",
    riskLevel: risk,
    profileMapping: candidate.profileMapping,
    history: [],
    createdAt: nowIso,
    updatedAt: nowIso
  };

  if (risk === "blocked") {
    return appendHistory(
      { ...base, state: "rejected", reason: "blocked content (private marker, secret, or do-not-remember)" },
      { at: nowIso, action: "auto", reason: "blocked content" }
    );
  }
  if (risk === "high") {
    return appendHistory(
      { ...base, state: "needs_review", reason: "high-risk: requires explicit approval before recall" },
      { at: nowIso, action: "auto", reason: "high risk" }
    );
  }
  if (options.autoAcceptLowRisk && risk === "low" && candidate.confidence >= autoAcceptThreshold) {
    const undoUntil = new Date(now.getTime() + ACCEPTED_UNDO_WINDOW_MS).toISOString();
    return appendHistory(
      { ...base, state: "accepted", undoUntil },
      { at: nowIso, action: "auto", reason: "auto-accept low risk + high confidence" }
    );
  }
  return base;
}

function appendHistory(
  item: MemoryInboxItem,
  entry: { at: string; action: MemoryInboxAction | "auto"; reason?: string }
): MemoryInboxItem {
  return { ...item, history: [...item.history, entry], updatedAt: entry.at };
}

const TRANSITIONS: ReadonlyMap<MemoryInboxState, ReadonlyMap<MemoryInboxAction, MemoryInboxState>> = new Map([
  [
    "pending",
    new Map<MemoryInboxAction, MemoryInboxState>([
      ["accept", "accepted"],
      ["reject", "rejected"],
      ["send_to_review", "needs_review"]
    ])
  ],
  [
    "needs_review",
    new Map<MemoryInboxAction, MemoryInboxState>([
      ["approve_review", "accepted"],
      ["reject", "rejected"]
    ])
  ],
  [
    "accepted",
    new Map<MemoryInboxAction, MemoryInboxState>([
      ["undo", "undone"],
      ["reject", "rejected"]
    ])
  ],
  [
    "undone",
    new Map<MemoryInboxAction, MemoryInboxState>([["accept", "accepted"]])
  ],
  ["rejected", new Map()],
  ["expired", new Map()]
]);

export interface ApplyActionOptions {
  reason?: string;
  now?: Date;
  /** override window enforcement (admin/restore flows). */
  bypassUndoWindow?: boolean;
}

export class InboxTransitionError extends Error {
  constructor(
    readonly from: MemoryInboxState,
    readonly action: MemoryInboxAction,
    message: string
  ) {
    super(message);
    this.name = "InboxTransitionError";
  }
}

export function applyInboxAction(
  item: MemoryInboxItem,
  action: MemoryInboxAction,
  options: ApplyActionOptions = {}
): MemoryInboxItem {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  const allowed = TRANSITIONS.get(item.state)?.get(action);
  if (!allowed) {
    throw new InboxTransitionError(item.state, action, `cannot ${action} when state is ${item.state}`);
  }

  if (action === "undo" && item.state === "accepted") {
    if (!options.bypassUndoWindow && item.undoUntil && item.undoUntil < nowIso) {
      throw new InboxTransitionError(item.state, action, "undo window has expired");
    }
  }

  let undoUntil: string | undefined;
  if (allowed === "accepted") {
    undoUntil = new Date(now.getTime() + ACCEPTED_UNDO_WINDOW_MS).toISOString();
  }

  return appendHistory(
    { ...item, state: allowed, undoUntil, reason: options.reason ?? item.reason, updatedAt: nowIso },
    { at: nowIso, action, reason: options.reason }
  );
}

/**
 * Sweep the Inbox to expire accepted items past their undo window. Items
 * that are no longer undoable transition to a stable "expired" state from the
 * Inbox UI's perspective (still active in recall - this only means the user
 * can no longer one-click undo).
 */
export function sweepUndoWindows(items: MemoryInboxItem[], now: Date = new Date()): MemoryInboxItem[] {
  const nowIso = now.toISOString();
  return items.map((item) => {
    if (item.state !== "accepted" || !item.undoUntil) return item;
    if (item.undoUntil >= nowIso) return item;
    return appendHistory({ ...item, state: "expired", updatedAt: nowIso }, { at: nowIso, action: "auto", reason: "undo window expired" });
  });
}

/**
 * Returns true if a memory item should appear in active recall. Maps Inbox
 * state to recall visibility in one place so callers don't reinvent the rule.
 */
export function isActiveForRecall(item: MemoryInboxItem): boolean {
  return item.state === "accepted" || item.state === "expired";
}
