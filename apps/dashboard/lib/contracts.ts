export type RouteResultState = "success" | "empty" | "error" | "unauthorized" | "config-missing";

export type RouteResult<T> =
  | { state: "success"; data: T }
  | { state: "empty"; data: T }
  | { state: "error"; error: string; status?: number }
  | { state: "unauthorized"; error: string; status: 401 | 403 }
  | { state: "config-missing"; error: string };

export type MemoryStatus = "candidate" | "active" | "confirmed" | "superseded" | "expired" | "deleted";
export type TraceFeedback = "useful" | "wrong" | "outdated" | "sensitive";
export type CloudStepStatus = "done" | "current" | "blocked" | "queued";
export type AgentConnectionStatus = "connected" | "pairing" | "not_installed" | "error" | "revoked";
export type SourceSyncStatus = "healthy" | "syncing" | "paused" | "error" | "delete_pending";
export type MemoryInboxStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "edited"
  | "duplicate"
  | "stale"
  | "sensitive"
  | "conflict"
  | "source-paused"
  | "deleted"
  | "accepted"
  | "undo_available"
  | "review_required";
export type LedgerItemState = "retrieved" | "used" | "ignored" | "stale" | "conflicting" | "risky" | "missing" | "deleted";

export interface SystemStatus {
  captureWorker: "ok" | "offline" | "unknown";
  embeddingProvider: "ok" | "unavailable" | "unknown";
  graphEnabled: boolean;
  savedMemoryCount: number;
}

export interface MemoryRecord {
  id: string;
  content: string;
  memoryType: string;
  scope: string;
  status: MemoryStatus;
  projectId?: string;
  riskTags: string[];
  useCount: number;
  confidence: number;
  supersededBy?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContextTrace {
  id: string;
  projectId?: string;
  query: string;
  route: { reason: string };
  latencyMs: number;
  tokenBudget: number;
  tokensUsed: number;
  warnings: string[];
  feedback?: TraceFeedback;
  feedbackAt?: string;
  feedbackNote?: string;
  createdAt: string;
}

export interface EvidenceLedgerSummary {
  retrieved: number;
  composed: number;
  ignored: number;
  warnings: number;
  riskTags: string[];
  staleCount: number;
  conflictCount: number;
}

export interface EvidenceLedger {
  traceId: string;
  summary: EvidenceLedgerSummary;
  rows: Array<{
    memoryId: string;
    contentPreview: string;
    disposition: "used" | "ignored" | "blocked" | "missing";
    status: string;
    riskTags: string[];
    warnings: string[];
  }>;
}

export interface EvalMetrics {
  recallAt5: number;
  precisionAt5: number;
  mrr: number;
  staleHitRate: number;
  p95LatencyMs: number;
}

export interface EvalRun {
  id: string;
  provider: string;
  projectId?: string;
  metrics: EvalMetrics;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardData {
  health: "ok" | "error";
  agentmemory: string;
  memories: MemoryRecord[];
  traces: ContextTrace[];
  ledgers: EvidenceLedger[];
  evalRuns: EvalRun[];
  auditLogs: AuditLog[];
}

export interface UserSession {
  account: {
    id: string;
    email?: string | null;
    displayName?: string | null;
    plan: string;
  };
  vault: {
    id: string;
    name: string;
    plan: string;
  };
}

export interface LiveAgentToken {
  deviceId: string;
  vaultId: string;
  accountId: string;
  deviceToken: string;
  deviceTokenExpiresAt: string;
  serviceToken: string;
  serviceTokenExpiresAt: string;
}

export interface CloudOnboardingStep {
  id: string;
  label: string;
  detail: string;
  status: CloudStepStatus;
}

export interface CloudAgentConnection {
  id: string;
  name: string;
  client: string;
  status: AgentConnectionStatus;
  detail: string;
  scope: string;
  lastSeen: string;
}

export interface ConnectAgentFixture {
  tokenLabel: string;
  expiresIn: string;
  command: string;
  fallback: string;
  status: "ready";
}

export interface CloudMemoryFeedItem {
  id: string;
  summary: string;
  source: string;
  type: string;
  scope: string;
  confidence: number;
  status: string;
  capturedAt: string;
}

export interface CloudProfileItem {
  id: string;
  label: string;
  value: string;
  kind: "static" | "dynamic" | "project";
  confidence: number;
  visibility: string;
  status: "active" | "edited" | "delete_pending";
  source: string;
}

export interface CloudSource {
  id: string;
  name: string;
  provider: string;
  status: SourceSyncStatus;
  detail: string;
  sessions: number | null;
  pendingJobs: number | null;
  lastSync: string;
}

export interface UsageMeter {
  label: string;
  used: number;
  limit: number;
  eventType: string;
}

export interface MemoryInboxItem {
  id: string;
  candidate: string;
  type: string;
  scope: string;
  source: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  status: MemoryInboxStatus;
  reason: string;
}

export interface BetaLedgerItem {
  id: string;
  memory: string;
  state: LedgerItemState;
  reason: string;
  warning?: string;
}

export interface BetaLedgerTrace {
  id: string;
  agent: string;
  query: string;
  tokenBudget: number;
  usedTokens: number;
  warnings: string[];
  items: BetaLedgerItem[];
}

export interface PricingTier {
  name: string;
  price: string;
  limits: string;
  note: string;
  current?: boolean;
}

export interface CustomerOverviewData {
  session: UserSession | null;
  dashboard: DashboardData;
  systemStatus: SystemStatus;
}

export interface AppsData {
  agents: CloudAgentConnection[];
  installToken: ConnectAgentFixture | null;
}

export interface SourcesData {
  sources: CloudSource[];
}

export interface InboxData {
  items: MemoryInboxItem[];
}

export interface MemoriesData {
  memories: MemoryRecord[];
  profile: CloudProfileItem[];
  feed: CloudMemoryFeedItem[];
}

export interface EvidenceData {
  ledgers: EvidenceLedger[];
  sampleTrace?: BetaLedgerTrace;
}

export interface PrivacyData {
  capturePaused: boolean;
  rawArchiveRequested: boolean;
  privateMode: boolean;
  exportRequested: boolean;
}

export interface DeveloperData {
  hostedMcpUrl: string;
  liveAgentToken: LiveAgentToken | null;
}

export interface BillingData {
  usage: UsageMeter[];
  pricing: PricingTier[];
  plan: string;
}

export interface SettingsData {
  onboarding: CloudOnboardingStep[];
  vaultName: string;
}

export interface OperatorUsageRow {
  vaultId: string;
  accountId?: string;
  plan: string;
  eventType: string;
  used: number;
  limit: number;
  windowStart?: string;
  windowEnd?: string;
}

export interface OperatorData {
  usage: OperatorUsageRow[];
}

export interface DashboardRouteDataMap {
  "customer-overview": CustomerOverviewData;
  apps: AppsData;
  sources: SourcesData;
  inbox: InboxData;
  memories: MemoriesData;
  evidence: EvidenceData;
  privacy: PrivacyData;
  developer: DeveloperData;
  billing: BillingData;
  settings: SettingsData;
}

export type DashboardRouteId = keyof DashboardRouteDataMap;
export type DashboardRouteResult<K extends DashboardRouteId> = RouteResult<DashboardRouteDataMap[K]>;
