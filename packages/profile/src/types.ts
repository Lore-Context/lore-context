import type {
  MemoryHit,
  MemoryRecord,
  MemoryScope,
  MemoryType,
  SourceRef
} from "@lore/shared";

/**
 * Lore Profile types - PRD §7.2 Lore Profile
 *
 * Profile is the compact, agent-injectable summary of who the user is and
 * what they are working on. It is sourced from durable memory records but
 * stored separately so recall can prefetch it cheaply.
 */

export type ProfileItemType =
  | "identity"
  | "preference"
  | "workflow"
  | "active_context"
  | "constraint";

export type ProfileVisibility = "private" | "team" | "readonly";

export type ProfileItemStatus =
  | "active"
  | "superseded"
  | "expired"
  | "contradicted"
  | "deleted";

export interface ProfileItem {
  id: string;
  type: ProfileItemType;
  value: string;
  confidence: number;
  sourceMemoryIds: string[];
  validUntil?: string;
  visibility: ProfileVisibility;
  status: ProfileItemStatus;
  supersededBy?: string;
  riskTags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProfile {
  projectId: string;
  repoFingerprint?: string;
  displayName?: string;
  items: ProfileItem[];
  updatedAt: string;
}

export interface LoreProfile {
  vaultId: string;
  static: ProfileItem[];
  dynamic: ProfileItem[];
  projects: ProjectProfile[];
  updatedAt: string;
}

/**
 * Memory candidate produced by the deterministic extractor before
 * reconciliation/promotion. Mirrors v0.6 MemoryRecord but allows fields
 * that have not been finalized yet.
 */
export interface MemoryCandidate {
  id: string;
  content: string;
  memoryType: MemoryType;
  scope: MemoryScope;
  visibility: MemoryRecord["visibility"];
  confidence: number;
  validFrom?: string;
  validUntil?: string | null;
  sourceProvider?: string;
  sourceOriginalId?: string;
  sourceRefs: SourceRef[];
  riskTags: string[];
  /** profile item type this candidate would map to, when applicable */
  profileMapping?: ProfileItemType;
  metadata: Record<string, unknown>;
}

export interface CanonicalTurn {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
}

export interface SessionSummary {
  sessionId: string;
  vaultId: string;
  projectId?: string;
  agentType?: string;
  startedAt?: string;
  endedAt?: string;
  summary: string;
  turnCount: number;
  riskTags: string[];
}

export type RecallSource = "profile" | "memory_bm25" | "memory_vector";

export interface RecallContextRequest {
  query: string;
  vaultId: string;
  projectId?: string;
  repoFingerprint?: string;
  agentType?: string;
  /** maximum tokens (approx, 4 char ≈ 1 token) the composed block may use */
  tokenBudget?: number;
  includeProfile?: boolean;
  /** if true, stale or risky memories are still allowed in the block with warnings */
  allowRisky?: boolean;
  citationsRequired?: boolean;
  /** existing scored hits sourced from BM25/vector backends */
  memoryHits?: MemoryHit[];
  profile?: LoreProfile;
  now?: Date;
}

export interface RecallContextItem {
  source: RecallSource;
  text: string;
  tokens: number;
  /** memory ids backing this item, if any */
  memoryIds: string[];
  profileItemId?: string;
  riskTags: string[];
  warnings: string[];
}

export interface RecallContextResponse {
  vaultId: string;
  projectId?: string;
  contextBlock: string;
  staticItems: ProfileItem[];
  dynamicItems: ProfileItem[];
  memoryHits: MemoryHit[];
  items: RecallContextItem[];
  sourceRefs: SourceRef[];
  warnings: string[];
  tokensUsed: number;
  tokenBudget: number;
  truncated: boolean;
  generatedAt: string;
}

/**
 * Result of reconciliation - tells the caller what changed so callers can
 * persist the deltas without rebuilding the full profile.
 */
export interface ReconciliationResult<T> {
  kept: T[];
  merged: Array<{ winner: T; absorbed: T[] }>;
  superseded: Array<{ next: T; previous: T }>;
  expired: T[];
  contradictions: Array<{ a: T; b: T; reason: string }>;
}
