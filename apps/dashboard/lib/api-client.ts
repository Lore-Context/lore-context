import type {
  BetaLedgerTrace,
  CloudSource,
  CloudMemoryFeedItem,
  CloudProfileItem,
  ContextTrace,
  CustomerOverviewData,
  DashboardData,
  EvidenceData,
  EvidenceLedger,
  InboxData,
  MemoryRecord,
  MemoriesData,
  MemoryInboxItem,
  RouteResult,
  SourcesData,
  SystemStatus,
  UserSession
} from "./contracts";

export interface DashboardApiClient {
  requestJson<T = unknown>(path: string, options?: DashboardRequestOptions): Promise<T>;
}

export interface DashboardRequestOptions {
  method?: string;
  body?: unknown;
  allowError?: boolean;
}

export interface BrowserDashboardClientOptions {
  getApiKey?: () => string;
  getCsrfToken?: () => string | undefined;
  fetchImpl?: typeof fetch;
}

type LiveSessionResult =
  | { state: "success"; data: UserSession }
  | { state: "error"; error: string; status?: number }
  | { state: "unauthorized"; error: string; status: 401 | 403 }
  | { state: "config-missing"; error: string };

export function createBrowserDashboardApiClient(options: BrowserDashboardClientOptions = {}): DashboardApiClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async requestJson<T = unknown>(path: string, requestOptions: DashboardRequestOptions = {}) {
      const headers = new Headers({ accept: "application/json" });
      const apiKey = options.getApiKey?.().trim();
      if (apiKey) {
        headers.set("authorization", `Bearer ${apiKey}`);
      }
      const method = requestOptions.method ?? "GET";
      if (method !== "GET") {
        const csrf = options.getCsrfToken?.();
        if (csrf) {
          headers.set("x-lore-csrf", csrf);
        }
      }
      if (requestOptions.body !== undefined) {
        headers.set("content-type", "application/json");
      }

      const response = await fetchImpl(`/api/lore${path}`, {
        method,
        headers,
        body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body),
        credentials: "same-origin"
      });
      const payload = await parseJsonResponse(response, requestOptions.allowError);
      if (!response.ok && !requestOptions.allowError) {
        throw attachHttpStatus(payload, response.status);
      }
      return (response.ok ? payload : attachHttpStatus(payload, response.status)) as T;
    }
  };
}

export async function fetchCustomerOverview(client: DashboardApiClient, projectId: string): Promise<RouteResult<CustomerOverviewData>> {
  const [health, sessionResult] = await Promise.all([
    client.requestJson<Record<string, unknown>>("/health", { allowError: true }),
    fetchSession(client)
  ]);
  const publicDashboard = dashboardDataFromPublicHealth(health);

  if (sessionResult.state === "unauthorized") {
    return {
      state: "empty",
      data: {
        session: null,
        dashboard: publicDashboard,
        systemStatus: systemStatusFrom(publicDashboard)
      }
    };
  }
  if (sessionResult.state === "config-missing" || sessionResult.state === "error") {
    return sessionResult;
  }
  if (sessionResult.state === "empty") {
    return {
      state: "empty",
      data: {
        session: null,
        dashboard: publicDashboard,
        systemStatus: systemStatusFrom(publicDashboard)
      }
    };
  }

  const scopedProjectId = sessionResult.data?.vault.id ?? projectId;
  const dashboardResult = await fetchDashboardData(client, scopedProjectId, health);
  if (dashboardResult.state === "unauthorized" || dashboardResult.state === "config-missing" || dashboardResult.state === "error") {
    return dashboardResult;
  }
  const dashboard = dashboardResult.data;
  return {
    state: dashboard.memories.length > 0 || dashboard.traces.length > 0 || dashboard.evalRuns.length > 0 ? "success" : "empty",
    data: {
      session: sessionResult.state === "success" ? sessionResult.data : null,
      dashboard,
      systemStatus: systemStatusFrom(dashboard)
    }
  };
}

export async function fetchSession(client: DashboardApiClient): Promise<RouteResult<UserSession | null>> {
  const me = await client.requestJson<unknown>("/v1/me", { allowError: true });
  const authStatus = statusCode(me);
  if (authStatus === 401 || authStatus === 403) {
    return { state: "unauthorized", status: authStatus, error: payloadMessage(me, "Sign in required") };
  }
  if (isUnexpectedHttpError(me)) {
    const status = httpStatusCode(me);
    return {
      state: "error",
      status,
      error: payloadMessage(me, `Session request failed${status ? ` with status ${status}` : ""}`)
    };
  }
  if (hasSessionShape(me)) {
    return { state: "success", data: me };
  }
  return { state: "empty", data: null };
}

export async function fetchDashboardData(
  client: DashboardApiClient,
  projectId: string,
  knownHealth?: Record<string, unknown>
): Promise<RouteResult<DashboardData>> {
  const [health, sources, inbox, recallTraces] = await Promise.all([
    knownHealth ?? client.requestJson<Record<string, unknown>>("/health", { allowError: true }),
    client.requestJson<Record<string, unknown>>("/v1/sources?limit=100", { allowError: true }),
    client.requestJson<Record<string, unknown>>("/v1/memory-inbox?limit=100", { allowError: true }),
    client.requestJson<Record<string, unknown>>("/v1/recall/traces?limit=12", { allowError: true })
  ]);

  const requiredPayloads = [
    { label: "Service health", payload: health },
    { label: "Connected sources", payload: sources },
    { label: "Memory inbox", payload: inbox },
    { label: "Recall traces", payload: recallTraces }
  ];

  const firstAuth = requiredPayloads.find(({ payload }) => isStatusPayload(payload, 401) || isStatusPayload(payload, 403))?.payload;
  if (firstAuth) {
    return { state: "unauthorized", status: statusCode(firstAuth) ?? 401, error: payloadMessage(firstAuth, "API authorization required") };
  }
  const firstConfig = [health].find((payload) => hasErrorCode(payload, "config") || hasErrorCode(payload, "missing"));
  if (firstConfig) {
    return { state: "config-missing", error: payloadMessage(firstConfig, "Dashboard API configuration is missing") };
  }
  const firstHttpError = requiredPayloads.find(({ payload }) => isUnexpectedHttpError(payload));
  if (firstHttpError) {
    const status = httpStatusCode(firstHttpError.payload);
    return {
      state: "error",
      status,
      error: payloadMessage(
        firstHttpError.payload,
        `${firstHttpError.label} request failed${status ? ` with status ${status}` : ""}`
      )
    };
  }

  const memoryList = Array.isArray(inbox.candidates)
    ? (inbox.candidates as unknown[]).map((candidate) => memoryRecordFromCandidate(candidate, projectId)).filter(isMemoryRecord)
    : [];
  const data: DashboardData = {
    health: health.status === "ok" ? "ok" : "error",
    agentmemory: "cloud",
    memories: memoryList,
    traces: Array.isArray(recallTraces.traces)
      ? (recallTraces.traces as unknown[]).map(traceFromRecallRecord).filter(isContextTrace)
      : [],
    ledgers: [],
    evalRuns: [],
    auditLogs: []
  };

  return { state: memoryList.length > 0 || data.traces.length > 0 || data.evalRuns.length > 0 ? "success" : "empty", data };
}

export async function fetchSourcesData(client: DashboardApiClient): Promise<RouteResult<SourcesData>> {
  const sessionResult = await requireLiveSession(client);
  if (sessionResult.state !== "success") return sessionResult;

  const sources = await client.requestJson<Record<string, unknown>>("/v1/sources?limit=100", { allowError: true });
  const errorResult = routeErrorFromPayload(sources, "Sources");
  if (errorResult) return errorResult;

  const rows = Array.isArray(sources.sources)
    ? (sources.sources as unknown[]).map(sourceFromApi).filter(isCloudSource)
    : [];
  return { state: rows.length > 0 ? "success" : "empty", data: { sources: rows } };
}

export async function fetchInboxData(client: DashboardApiClient): Promise<RouteResult<InboxData>> {
  const sessionResult = await requireLiveSession(client);
  if (sessionResult.state !== "success") return sessionResult;

  const inbox = await client.requestJson<Record<string, unknown>>("/v1/memory-inbox?limit=100", { allowError: true });
  const errorResult = routeErrorFromPayload(inbox, "Memory inbox");
  if (errorResult) return errorResult;

  const items = Array.isArray(inbox.candidates)
    ? (inbox.candidates as unknown[]).map(inboxItemFromCandidate).filter(isMemoryInboxItem)
    : [];
  return { state: items.length > 0 ? "success" : "empty", data: { items } };
}

export async function fetchMemoriesData(client: DashboardApiClient): Promise<RouteResult<MemoriesData>> {
  const sessionResult = await requireLiveSession(client);
  if (sessionResult.state !== "success") return sessionResult;

  const memoryList = await client.requestJson<Record<string, unknown>>("/v1/memory/list?limit=200", { allowError: true });
  const errorResult = routeErrorFromPayload(memoryList, "Memory list");
  if (errorResult) return errorResult;

  const vaultId = sessionResult.data.vault.id;
  const records = Array.isArray(memoryList.memories)
    ? (memoryList.memories as unknown[]).map((memory) => memoryRecordFromApi(memory, vaultId)).filter(isMemoryRecord)
    : [];
  const visibleRecords = records.filter((record) => record.status !== "deleted" && record.status !== "expired");
  const feed = visibleRecords.map(memoryFeedItemFromRecord);
  const profile = visibleRecords
    .filter((record) => record.scope === "user" || record.scope === "profile" || record.memoryType === "preference")
    .map(profileItemFromRecord);

  return {
    state: visibleRecords.length > 0 || feed.length > 0 || profile.length > 0 ? "success" : "empty",
    data: { memories: visibleRecords, feed, profile }
  };
}

export async function fetchEvidenceData(client: DashboardApiClient): Promise<RouteResult<EvidenceData>> {
  const sessionResult = await requireLiveSession(client);
  if (sessionResult.state !== "success") return sessionResult;

  const ledgersPayload = await client.requestJson<Record<string, unknown>>("/v1/evidence/ledgers?limit=25", { allowError: true });
  const errorResult = routeErrorFromPayload(ledgersPayload, "Evidence ledgers");
  if (errorResult) return errorResult;

  const ledgers = Array.isArray(ledgersPayload.ledgers)
    ? (ledgersPayload.ledgers as unknown[]).map(evidenceLedgerFromApi).filter(isEvidenceLedger)
    : [];
  const sampleTrace = ledgers[0] ? betaLedgerTraceFromLedger(ledgers[0]) : undefined;

  return {
    state: ledgers.length > 0 ? "success" : "empty",
    data: { ledgers, sampleTrace }
  };
}

export function systemStatusFrom(data: DashboardData): SystemStatus {
  return {
    captureWorker: data.health === "ok" ? "ok" : "unknown",
    embeddingProvider: "unknown",
    graphEnabled: false,
    savedMemoryCount: data.memories.filter((m) => m.status === "active" || m.status === "confirmed").length
  };
}

export function routeResultMessage(result: RouteResult<unknown>): string {
  if (result.state === "error" || result.state === "unauthorized" || result.state === "config-missing") {
    return result.error;
  }
  return "";
}

function dashboardDataFromPublicHealth(health: Record<string, unknown>): DashboardData {
  return {
    health: health.status === "ok" ? "ok" : "error",
    agentmemory: "cloud",
    memories: [],
    traces: [],
    ledgers: [],
    evalRuns: [],
    auditLogs: []
  };
}

async function parseJsonResponse(response: Response, allowError = false): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (!allowError) {
      throw new Error("Invalid JSON response from server");
    }
    return {};
  }
}

function hasSessionShape(value: unknown): value is UserSession {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Boolean(record.account && record.vault);
}

async function requireLiveSession(client: DashboardApiClient): Promise<LiveSessionResult> {
  const sessionResult = await fetchSession(client);
  if (sessionResult.state === "unauthorized" || sessionResult.state === "config-missing" || sessionResult.state === "error") {
    return sessionResult;
  }
  if (sessionResult.state === "empty" || sessionResult.data === null) {
    return { state: "unauthorized", status: 401, error: "Sign in required" };
  }
  return { state: "success", data: sessionResult.data };
}

function routeErrorFromPayload(value: unknown, label: string): RouteResult<never> | null {
  if (isStatusPayload(value, 401) || isStatusPayload(value, 403)) {
    return { state: "unauthorized", status: statusCode(value) ?? 401, error: payloadMessage(value, "API authorization required") };
  }
  if (hasErrorCode(value, "config") || hasErrorCode(value, "missing")) {
    return { state: "config-missing", error: payloadMessage(value, "Dashboard API configuration is missing") };
  }
  if (isUnexpectedHttpError(value)) {
    const status = httpStatusCode(value);
    return {
      state: "error",
      status,
      error: payloadMessage(value, `${label} request failed${status ? ` with status ${status}` : ""}`)
    };
  }
  return null;
}

function isStatusPayload(value: unknown, status: 401 | 403): boolean {
  return statusCode(value) === status;
}

function statusCode(value: unknown): 401 | 403 | undefined {
  const status = httpStatusCode(value);
  if (status === 401 || status === 403) {
    return status;
  }
  return undefined;
}

function httpStatusCode(value: unknown): number | undefined {
  if (value && typeof value === "object") {
    const { httpStatus, status } = value as { httpStatus?: unknown; status?: unknown };
    if (typeof httpStatus === "number") {
      return httpStatus;
    }
    if (typeof status === "number") {
      return status;
    }
  }
  return undefined;
}

function isUnexpectedHttpError(value: unknown): boolean {
  const status = httpStatusCode(value);
  return status !== undefined && status >= 400;
}

function payloadMessage(value: unknown, fallback: string): string {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.error === "string") return record.error;
    if (typeof record.message === "string") return record.message;
    if (record.error && typeof record.error === "object") {
      return payloadMessage(record.error, fallback);
    }
  }
  return fallback;
}

function hasErrorCode(value: unknown, needle: string): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const expected = needle.toLowerCase();
  const nestedError = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : {};
  return [record.code, record.error, record.message, nestedError.code, nestedError.message].some((item) => typeof item === "string" && item.toLowerCase().includes(expected));
}

function attachHttpStatus(value: unknown, httpStatus: number): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record: Record<string, unknown> = { ...(value as Record<string, unknown>), httpStatus };
    if (typeof record.status !== "number") {
      record.status = httpStatus;
    }
    return record;
  }
  return { status: httpStatus, httpStatus, error: typeof value === "string" ? value : "HTTP request failed" };
}

function memoryRecordFromCandidate(value: unknown, projectId: string): MemoryRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = readString(record.id);
  if (!id) return null;
  const content = readString(record.content) ?? readString(record.candidate) ?? readString(record.summary) ?? "";
  const status = normalizeMemoryStatus(record.status);
  return {
    id,
    content,
    memoryType: readString(record.memoryType) ?? readString(record.memory_type) ?? readString(record.type) ?? "candidate",
    scope: readString(record.scope) ?? "vault",
    status,
    projectId: readString(record.projectId) ?? readString(record.project_id) ?? readString(record.vaultId) ?? projectId,
    riskTags: Array.isArray(record.riskTags) ? record.riskTags.filter((item): item is string => typeof item === "string") : [],
    useCount: readNumber(record.useCount) ?? 0,
    confidence: readNumber(record.confidence) ?? 0,
    supersededBy: readString(record.supersededBy) ?? null,
    lastUsedAt: readString(record.lastUsedAt) ?? null,
    createdAt: readString(record.createdAt) ?? new Date(0).toISOString(),
    updatedAt: readString(record.updatedAt) ?? readString(record.createdAt) ?? new Date(0).toISOString()
  };
}

function memoryRecordFromApi(value: unknown, projectId: string): MemoryRecord | null {
  return memoryRecordFromCandidate(value, projectId);
}

function traceFromRecallRecord(value: unknown): ContextTrace | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = readString(record.id);
  const query = readString(record.query);
  if (!id || !query) return null;
  return {
    id,
    projectId: readString(record.vaultId) ?? undefined,
    query,
    route: { reason: readString(record.routeReason) ?? "cloud recall" },
    latencyMs: readNumber(record.latencyMs) ?? 0,
    tokenBudget: readNumber(record.tokenBudget) ?? 0,
    tokensUsed: readNumber(record.tokensUsed) ?? 0,
    warnings: [],
    feedback: undefined,
    feedbackAt: readString(record.feedbackAt),
    feedbackNote: readString(record.feedback),
    createdAt: readString(record.createdAt) ?? new Date(0).toISOString()
  };
}

function sourceFromApi(value: unknown): CloudSource | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = readString(record.id);
  if (!id) return null;
  const provider = readString(record.sourceProvider) ?? readString(record.source_provider) ?? "source";
  const displayName = readString(record.displayName) ?? readString(record.display_name);
  const lastHeartbeat = readString(record.lastHeartbeatAt) ?? readString(record.last_heartbeat_at);
  const lastError = readString(record.lastError) ?? readString(record.last_error);
  return {
    id,
    name: displayName ?? provider,
    provider,
    status: normalizeSourceStatus(record.status),
    detail: lastError ?? `Capture mode: ${readString(record.rawArchivePolicy) ?? "summary_only"}`,
    sessions: readNumber(record.sessions) ?? null,
    pendingJobs: readNumber(record.pendingJobs) ?? null,
    lastSync: lastHeartbeat ?? readString(record.updatedAt) ?? "never"
  };
}

function inboxItemFromCandidate(value: unknown): MemoryInboxItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = readString(record.id);
  if (!id) return null;
  return {
    id,
    candidate: readString(record.candidate) ?? readString(record.content) ?? readString(record.summary) ?? "Memory candidate",
    type: readString(record.memoryType) ?? readString(record.memory_type) ?? readString(record.type) ?? "candidate",
    scope: readString(record.scope) ?? "vault",
    source: readString(record.source) ?? readString(record.sourceProvider) ?? readString(record.source_provider) ?? readString(record.sourceRef) ?? "Lore cloud",
    confidence: readNumber(record.confidence) ?? 0,
    risk: normalizeInboxRisk(record.risk),
    status: normalizeInboxStatus(record.status),
    reason: readString(record.reason) ?? readString(record.explanation) ?? "Suggested from connected source activity."
  };
}

function memoryFeedItemFromRecord(record: MemoryRecord): CloudMemoryFeedItem {
  return {
    id: record.id,
    summary: record.content,
    source: record.projectId ?? "Lore cloud",
    type: record.memoryType,
    scope: record.scope,
    confidence: record.confidence,
    status: record.status,
    capturedAt: record.createdAt
  };
}

function profileItemFromRecord(record: MemoryRecord): CloudProfileItem {
  return {
    id: `profile-${record.id}`,
    label: record.memoryType,
    value: record.content,
    kind: record.scope === "project" ? "project" : record.scope === "user" || record.scope === "profile" ? "static" : "dynamic",
    confidence: record.confidence,
    visibility: "private",
    status: record.status === "deleted" ? "delete_pending" : "active",
    source: record.projectId ?? "Lore cloud"
  };
}

function betaLedgerTraceFromContext(trace: ContextTrace): BetaLedgerTrace {
  return {
    id: trace.id,
    agent: trace.route.reason,
    query: trace.query,
    tokenBudget: trace.tokenBudget,
    usedTokens: trace.tokensUsed,
    warnings: trace.warnings,
    items: []
  };
}

function evidenceLedgerFromApi(value: unknown): EvidenceLedger | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const traceId = readString(record.traceId) ?? readString(record.trace_id);
  if (!traceId) return null;
  const summaryRecord = record.summary && typeof record.summary === "object" ? record.summary as Record<string, unknown> : {};
  const rows = Array.isArray(record.rows)
    ? (record.rows as unknown[]).map(evidenceLedgerRowFromApi).filter(isEvidenceLedgerRow)
    : [];
  return {
    traceId,
    summary: {
      retrieved: readNumber(summaryRecord.retrieved) ?? rows.length,
      composed: readNumber(summaryRecord.composed) ?? rows.filter((row) => row.disposition === "used").length,
      ignored: readNumber(summaryRecord.ignored) ?? rows.filter((row) => row.disposition === "ignored").length,
      warnings: readNumber(summaryRecord.warnings) ?? rows.reduce((count, row) => count + row.warnings.length, 0),
      riskTags: readStringArray(summaryRecord.riskTags),
      staleCount: readNumber(summaryRecord.staleCount) ?? 0,
      conflictCount: readNumber(summaryRecord.conflictCount) ?? 0
    },
    rows
  };
}

function evidenceLedgerRowFromApi(value: unknown): EvidenceLedger["rows"][number] | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const memoryId = readString(record.memoryId) ?? readString(record.memory_id);
  if (!memoryId) return null;
  return {
    memoryId,
    contentPreview: readString(record.contentPreview) ?? readString(record.content_preview) ?? "[memory unavailable]",
    disposition: normalizeLedgerDisposition(record.disposition),
    status: readString(record.status) ?? "unknown",
    riskTags: readStringArray(record.riskTags),
    warnings: readStringArray(record.warnings)
  };
}

function betaLedgerTraceFromLedger(ledger: EvidenceLedger): BetaLedgerTrace {
  return {
    id: ledger.traceId,
    agent: "Evidence ledger",
    query: ledger.traceId,
    tokenBudget: ledger.summary.retrieved,
    usedTokens: ledger.summary.composed,
    warnings: ledger.rows.flatMap((row) => row.warnings),
    items: ledger.rows.map((row) => ({
      id: row.memoryId,
      memory: row.contentPreview,
      state: ledgerItemStateFromDisposition(row.disposition, row.status, row.warnings),
      reason: row.disposition,
      warning: row.warnings[0]
    }))
  };
}

function normalizeMemoryStatus(value: unknown): MemoryRecord["status"] {
  return value === "approved" || value === "accepted" ? "confirmed"
    : value === "deleted" ? "deleted"
    : value === "rejected" ? "expired"
    : value === "superseded" || value === "expired" || value === "active" || value === "confirmed" || value === "candidate"
      ? value
      : "candidate";
}

function normalizeInboxRisk(value: unknown): MemoryInboxItem["risk"] {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function normalizeInboxStatus(value: unknown): MemoryInboxItem["status"] {
  return value === "pending" || value === "approved" || value === "rejected" || value === "edited" || value === "duplicate" || value === "stale" || value === "sensitive" || value === "conflict" || value === "source-paused" || value === "deleted" || value === "accepted" || value === "undo_available" || value === "review_required"
    ? value
    : "pending";
}

function normalizeSourceStatus(value: unknown): CloudSource["status"] {
  if (value === "active") return "healthy";
  if (value === "private_mode") return "syncing";
  if (value === "revoked") return "delete_pending";
  return value === "healthy" || value === "syncing" || value === "paused" || value === "error" || value === "delete_pending"
    ? value
    : "error";
}

function normalizeLedgerDisposition(value: unknown): EvidenceLedger["rows"][number]["disposition"] {
  return value === "used" || value === "ignored" || value === "blocked" || value === "missing" ? value : "ignored";
}

function ledgerItemStateFromDisposition(
  disposition: EvidenceLedger["rows"][number]["disposition"],
  status: string,
  warnings: string[]
): BetaLedgerTrace["items"][number]["state"] {
  if (disposition === "used") return "used";
  if (disposition === "missing") return "missing";
  if (disposition === "blocked") return status === "deleted" ? "deleted" : "risky";
  if (warnings.includes("stale")) return "stale";
  if (warnings.includes("conflict")) return "conflicting";
  return "ignored";
}

function isMemoryRecord(value: MemoryRecord | null): value is MemoryRecord {
  return value !== null;
}

function isContextTrace(value: ContextTrace | null): value is ContextTrace {
  return value !== null;
}

function isMemoryInboxItem(value: MemoryInboxItem | null): value is MemoryInboxItem {
  return value !== null;
}

function isCloudSource(value: CloudSource | null): value is CloudSource {
  return value !== null;
}

function isEvidenceLedger(value: EvidenceLedger | null): value is EvidenceLedger {
  return value !== null;
}

function isEvidenceLedgerRow(value: EvidenceLedger["rows"][number] | null): value is EvidenceLedger["rows"][number] {
  return value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
