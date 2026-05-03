export type {
  CanonicalTurn,
  LoreProfile,
  MemoryCandidate,
  ProfileItem,
  ProfileItemStatus,
  ProfileItemType,
  ProfileVisibility,
  ProjectProfile,
  RecallContextItem,
  RecallContextRequest,
  RecallContextResponse,
  RecallSource,
  ReconciliationResult,
  SessionSummary
} from "./types.js";

export {
  approxTokens,
  buildProfileItems,
  canonicalizeTurns,
  classifyTurn,
  extractMemoryCandidates,
  redactPrivateBlocks,
  summarizeSession
} from "./extraction.js";

export {
  expireTemporaryItems,
  reconcileProfileItems
} from "./reconciliation.js";

export {
  composeRecallContext,
  prefetchProfile
} from "./recall.js";

// === v0.8 surface ===

export type {
  ApplyActionOptions,
  IngestOptions,
  MemoryInboxAction,
  MemoryInboxItem,
  MemoryInboxState,
  MemoryRiskLevel
} from "./inbox.js";

export {
  applyInboxAction,
  classifyRisk,
  ingestCandidate,
  InboxTransitionError,
  isActiveForRecall,
  sweepUndoWindows
} from "./inbox.js";

export type {
  MemoryEdge,
  MemoryEdgeInferenceInput,
  MemoryEdgeRelation
} from "./edges.js";

export { groupEdgesByRelation, inferEdges } from "./edges.js";

export type {
  ProfileEditOptions,
  RegenerateInput
} from "./profile-store.js";

export {
  applyUserEdit,
  buildEmptyProfile,
  placeItem,
  regenerateProfile,
  softDeleteItem
} from "./profile-store.js";

export type {
  AgentTarget,
  ContextPack,
  RenderOptions
} from "./context-pack.js";

export { renderContextPack } from "./context-pack.js";

export type {
  BuildLedgerInput,
  EvidenceFeedback,
  EvidenceLedgerEntry,
  EvidenceLedgerState,
  EvidenceLedgerTrace
} from "./evidence-ledger.js";

export { buildEvidenceLedger, recordLedgerFeedback } from "./evidence-ledger.js";

export type {
  EvidenceLedgerRepository,
  InboxRepository,
  MemoryEdgeRepository,
  ProfileRepository
} from "./repositories.js";

export {
  InMemoryEvidenceLedgerRepository,
  InMemoryInboxRepository,
  InMemoryMemoryEdgeRepository,
  InMemoryProfileRepository
} from "./repositories.js";

// === v0.9 surface ===

export type { EvidenceRetrievalLayer } from "./evidence-ledger.js";

export type {
  ApplyV09ActionInput,
  IngestV09Options,
  InboxV09Action,
  InboxV09CandidateType,
  InboxV09Item,
  InboxV09Label,
  InboxV09State,
  RejectionFingerprintStore
} from "./inbox-v09.js";

export {
  applyV09Action,
  classifyLabels,
  fingerprintFor,
  InboxV09TransitionError,
  ingestV09,
  InMemoryRejectionFingerprintStore,
  isV09RecallActive
} from "./inbox-v09.js";

export type {
  LayeredHit,
  LayeredRecallRequest,
  LayeredRecallResponse,
  RetrievalLayer
} from "./recall-layered.js";

export { composeLayeredRecall } from "./recall-layered.js";

// === rc.1 memory lifecycle surface ===

export type {
  ApplyLifecycleActionInput,
  CaptureEventInput,
  MemoryLifecycleAction,
  MemoryLifecycleRecord,
  MemoryLifecycleState,
  MemorySourceInfo,
  MemoryUsageRecord,
  RecallDecisionReason,
  RecallExplanation,
  SuggestCandidateInput
} from "./memory-lifecycle.js";

export {
  applyLifecycleAction,
  captureEvent,
  explainMemoryDecision,
  isRecallActive,
  MemoryLifecycleTransitionError,
  suggestCandidate
} from "./memory-lifecycle.js";

export { explainLedgerEntry } from "./evidence-ledger.js";

export type { MemoryLifecycleRepository } from "./repositories.js";
export { InMemoryMemoryLifecycleRepository } from "./repositories.js";
