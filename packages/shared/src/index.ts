export type LoreStatus = "ok" | "degraded" | "error";

export type MemoryType =
  | "preference"
  | "project_rule"
  | "task_state"
  | "procedure"
  | "entity"
  | "episode";

export type MemoryScope = "user" | "project" | "repo" | "team" | "org";

export type MemoryStatus = "candidate" | "active" | "confirmed" | "superseded" | "expired" | "deleted";

export interface PackageInfo {
  name: string;
  version: string;
}

export interface SourceRef {
  type: "conversation" | "file" | "tool_call" | "web" | "import" | "manual";
  id?: string;
  path?: string;
  url?: string;
  excerpt?: string;
}

export interface MemoryRecord {
  id: string;
  organizationId?: string;
  userId?: string;
  projectId?: string;
  repoId?: string;
  agentId?: string;
  memoryType: MemoryType;
  scope: MemoryScope;
  visibility: "private" | "project" | "team" | "org";
  content: string;
  status: MemoryStatus;
  confidence: number;
  validFrom?: string;
  validUntil?: string | null;
  supersededBy?: string | null;
  sourceProvider?: string;
  sourceOriginalId?: string;
  sourceRefs: SourceRef[];
  riskTags: string[];
  metadata: Record<string, unknown>;
  lastUsedAt?: string | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryHit {
  memory: MemoryRecord;
  score: number;
  highlights: string[];
  backend?: string;
}

export interface WebEvidence {
  id: string;
  title: string;
  url?: string;
  snippet: string;
  source: string;
  fetchedAt?: string;
}

export interface ContextRoute {
  memory: boolean;
  web: boolean;
  repo: boolean;
  toolTraces: boolean;
  reason: string;
}

export interface ContextQueryRequest {
  query: string;
  userId?: string;
  projectId?: string;
  repoId?: string;
  agentId?: string;
  mode?: "auto" | "memory" | "web" | "repo" | "tool_traces";
  sources?: Partial<{
    memory: boolean;
    web: boolean;
    repo: boolean;
    toolTraces: boolean;
  }>;
  freshness?: "none" | "recent" | "latest";
  tokenBudget?: number;
  writebackPolicy?: "explicit" | "review_required" | "safe_auto";
  includeSources?: boolean;
}

export interface ContextQueryResponse {
  traceId: string;
  contextBlock: string;
  route: ContextRoute;
  memoryHits: MemoryHit[];
  webEvidence: WebEvidence[];
  repoEvidence: WebEvidence[];
  toolTraceEvidence: WebEvidence[];
  warnings: string[];
  confidence: number;
  usage: {
    memoryReads: number;
    webSearches: number;
    tokensUsed: number;
    latencyMs: number;
  };
}

export interface ContextTrace {
  id: string;
  projectId?: string;
  query: string;
  route: ContextRoute;
  retrievedMemoryIds: string[];
  composedMemoryIds: string[];
  ignoredMemoryIds: string[];
  warnings: string[];
  latencyMs: number;
  tokenBudget: number;
  tokensUsed: number;
  feedback?: "useful" | "wrong" | "outdated" | "sensitive";
  feedbackAt?: string;
  feedbackNote?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface EvalQuestion {
  question: string;
  goldSessionIds: string[];
  expectedAnswerContains?: string[];
}

export interface EvalDataset {
  sessions: Array<{
    sessionId: string;
    messages: Array<{
      role: "user" | "assistant" | "system" | "tool";
      content: string;
      timestamp?: string;
    }>;
  }>;
  questions: EvalQuestion[];
}

export interface EvalMetrics {
  recallAt5: number;
  precisionAt5: number;
  mrr: number;
  staleHitRate: number;
  p95LatencyMs: number;
}

export class LoreError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500
  ) {
    super(message);
    this.name = "LoreError";
  }
}

export function packageInfo(name: string, version = "0.0.0"): PackageInfo {
  return { name, version };
}

export function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new LoreError("validation.required", `${field} is required`, 400);
  }

  return value.trim();
}

export function countApproxTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return Math.ceil(text.length / 4);
}

export function stableMemoryId(prefix: string, content: string): string {
  const normalized = content.trim().toLowerCase().replace(/\s+/g, " ");
  let hash = 2166136261;

  for (const char of normalized) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createMemoryRecord(input: {
  id?: string;
  content: string;
  memoryType?: MemoryType;
  scope?: MemoryScope;
  projectId?: string;
  agentId?: string;
  sourceProvider?: string;
  sourceOriginalId?: string;
  sourceRefs?: SourceRef[];
  confidence?: number;
  riskTags?: string[];
  now?: Date;
}): MemoryRecord {
  const now = (input.now ?? new Date()).toISOString();
  const content = assertNonEmptyString(input.content, "content");
  const scope = input.scope ?? "project";

  return {
    id: input.id ?? stableMemoryId("mem", content),
    projectId: input.projectId,
    agentId: input.agentId,
    memoryType: input.memoryType ?? "episode",
    scope,
    visibility: scope === "org" ? "org" : scope === "team" ? "team" : scope === "project" ? "project" : "private",
    content,
    status: "active",
    confidence: input.confidence ?? 0.8,
    validFrom: now,
    validUntil: null,
    supersededBy: null,
    sourceProvider: input.sourceProvider,
    sourceOriginalId: input.sourceOriginalId,
    sourceRefs: input.sourceRefs ?? [],
    riskTags: input.riskTags ?? [],
    metadata: {},
    lastUsedAt: null,
    useCount: 0,
    createdAt: now,
    updatedAt: now
  };
}

export function serializeError(error: unknown): { code: string; message: string; status: number } {
  if (error instanceof LoreError) {
    return { code: error.code, message: error.message, status: error.status };
  }

  if (error instanceof Error) {
    return { code: "internal.error", message: error.message, status: 500 };
  }

  return { code: "internal.error", message: "unknown error", status: 500 };
}
