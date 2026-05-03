import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";

// Lore v0.8 Cloud Persistence Layer.
//
// `CloudStore` is the persistence boundary used by `CloudPlatform`. It exposes
// vault-scoped reads/writes for accounts, vaults, devices, tokens, capture
// sources/jobs, usage events, and audit events.
//
// Two implementations live in this file:
//   - `InMemoryCloudStore` keeps state in process memory. It is the default for
//     unit tests and for dev runs that don't have a Postgres URL.
//   - `PostgresCloudStore` writes to the v0.8 schema additions defined in
//     `apps/api/src/db/schema.sql`. It satisfies the v0.8 acceptance criterion
//     "API restart preserves accounts/vault/devices/jobs."
//
// Tokens at rest are stored only as SHA-256 hashes. The plaintext value is
// returned to the caller exactly once at issuance and never logged.

export type CloudTokenKind = "install" | "device" | "service" | "agent" | "session";

export interface CloudAccountRecord {
  id: string;
  name: string;
  email?: string | null;
  displayName?: string | null;
  plan: string;
  createdAt: string;
}

export interface CloudVaultRecord {
  id: string;
  accountId: string;
  name: string;
  plan: string;
  rawArchiveEnabled: boolean;
  privateMode: boolean;
  createdAt: string;
}

export interface CloudDeviceRecord {
  id: string;
  vaultId: string;
  accountId: string;
  label?: string | null;
  platform?: string | null;
  status: "active" | "revoked";
  pairedAt: string;
  lastSeenAt?: string | null;
  revokedAt?: string | null;
}

export interface CloudTokenRecord {
  id: string;
  tokenHash: string;
  kind: CloudTokenKind;
  vaultId: string;
  accountId: string;
  deviceId?: string | null;
  agentId?: string | null;
  scopes: string[];
  singleUse: boolean;
  expiresAt: string;
  usedAt?: string | null;
  revokedAt?: string | null;
  rotatedFrom?: string | null;
  createdAt: string;
}

export interface CaptureSourceRecord {
  id: string;
  vaultId: string;
  deviceId?: string | null;
  sourceType: string;
  sourceProvider?: string | null;
  sourceRef?: string | null;
  // Widened in v0.9 to cover private_mode + revoked. v0.8 callers that
  // narrowed to "active"|"paused"|"error" still type-check.
  status: "active" | "paused" | "private_mode" | "revoked" | "error";
  lastHeartbeatAt?: string | null;
  lastError?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CaptureJobRecord {
  id: string;
  vaultId: string;
  sessionId?: string | null;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  attempts: number;
  payload: Record<string, unknown>;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  lockedBy?: string | null;
  lockedAt?: string | null;
  nextRunAt?: string | null;
}

export interface CapturedSessionRecord {
  id: string;
  vaultId: string;
  sourceId: string;
  deviceId?: string | null;
  provider: string;
  sourceOriginalId: string;
  contentHash: string;
  idempotencyKey: string;
  captureMode: "summary_only" | "raw_archive" | "private_mode";
  startedAt?: string | null;
  endedAt?: string | null;
  redaction: { version: string; secretCount: number; privateBlockCount: number };
  metadata: Record<string, unknown>;
  turnSummary: Array<{ role: string; text: string }>;
  rawTurns?: unknown[];
  receivedAt: string;
}

export interface UsageEventRecord {
  id: string;
  vaultId: string;
  accountId?: string | null;
  eventType: string;
  units: number;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export interface AuditEventRecord {
  id: string;
  vaultId: string;
  accountId?: string | null;
  actorId?: string | null;
  actorKind?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// v0.9 Auto-Capture Beta — source registry, capture event/batch, usage limit
// snapshot, hosted MCP client. Records mirror the schema additions in
// `apps/api/src/db/schema.sql` and are referenced from `CloudPlatform`.

export type SourceStatus = "active" | "paused" | "private_mode" | "revoked" | "error";
export type RawArchivePolicy = "none" | "metadata_only" | "summary_only" | "encrypted_raw" | "plain_raw_for_beta_debug";

export interface SourcePermissionEnvelope {
  permissionType: string;
  scope?: string | null;
  value: string;
  metadata?: Record<string, unknown>;
}

export interface SourcePermissionRecord {
  id: string;
  sourceId: string;
  vaultId: string;
  permissionType: string;
  scope?: string | null;
  value: string;
  metadata: Record<string, unknown>;
  grantedAt: string;
  revokedAt?: string | null;
}

export interface SourceCheckpointRecord {
  id: string;
  sourceId: string;
  vaultId: string;
  checkpointKey: string;
  offsetValue?: string | null;
  contentHash?: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface CaptureBatchRecord {
  id: string;
  vaultId: string;
  sourceId?: string | null;
  deviceId?: string | null;
  batchKind: string;
  eventCount: number;
  bytes: number;
  status: "received" | "processing" | "applied" | "rejected";
  idempotencyKey?: string | null;
  metadata: Record<string, unknown>;
  receivedAt: string;
}

export interface CaptureEventRecord {
  id: string;
  vaultId: string;
  sessionId?: string | null;
  sourceId?: string | null;
  batchId?: string | null;
  eventType: string;
  externalEventId?: string | null;
  actor?: string | null;
  contentRef: Record<string, unknown>;
  redactionState: "redacted" | "raw_allowed" | "metadata_only";
  idempotencyKey?: string | null;
  payload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

// === v1.0 Personal Cloud GA ===

export type CandidateStatus = "pending" | "approved" | "rejected" | "edited" | "duplicate" | "stale" | "sensitive" | "conflict" | "source-paused" | "deleted";

export interface MemoryCandidateRecord {
  id: string;
  vaultId: string;
  sourceId?: string | null;
  sessionId?: string | null;
  externalEventId?: string | null;
  content: string;
  memoryType: string;
  status: CandidateStatus;
  riskTags: string[];
  confidence: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryReviewActionRecord {
  id: string;
  vaultId: string;
  candidateId?: string | null;
  memoryId?: string | null;
  action: string;
  actorId?: string | null;
  actorKind: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RecallTraceRecord {
  id: string;
  vaultId: string;
  query: string;
  routeReason?: string | null;
  latencyMs?: number | null;
  tokenBudget?: number | null;
  tokensUsed?: number | null;
  feedback?: string | null;
  feedbackAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RecallTraceItemRecord {
  id: string;
  traceId: string;
  memoryId?: string | null;
  candidateId?: string | null;
  disposition: string;
  confidence?: number | null;
  riskTags: string[];
  reason?: string | null;
  metadata: Record<string, unknown>;
}

export interface UsageLimitSnapshotRecord {
  id: string;
  vaultId: string;
  accountId?: string | null;
  plan: string;
  periodStart: string;
  periodEnd: string;
  ingestTokenUsed: number;
  ingestTokenLimit: number;
  recallUsed: number;
  recallLimit: number;
  agentCount: number;
  agentLimit: number;
  rawArchiveEnabled: boolean;
  metadata: Record<string, unknown>;
  observedAt: string;
}

export interface HostedMcpClientRecord {
  id: string;
  vaultId: string;
  accountId?: string | null;
  displayName?: string | null;
  clientKind: string;
  scopes: string[];
  status: "active" | "revoked" | "error";
  lastSeenAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  revokedAt?: string | null;
}

export interface OperatorUsageRow {
  vaultId: string;
  accountId?: string | null;
  plan: string;
  ingestTokenUsed: number;
  recallUsed: number;
  captureEventCount: number;
  lastEventAt?: string | null;
}

export interface CloudStore {
  ready(): Promise<void>;

  ensureBootstrap(input: {
    defaultAccountId: string;
    defaultVaultId: string;
    now: string;
  }): Promise<{ account: CloudAccountRecord; vault: CloudVaultRecord }>;

  getAccount(accountId: string): Promise<CloudAccountRecord | undefined>;
  getVault(vaultId: string): Promise<CloudVaultRecord | undefined>;
  listVaultsForAccount(accountId: string): Promise<CloudVaultRecord[]>;

  saveDevice(device: CloudDeviceRecord): Promise<void>;
  getDevice(deviceId: string): Promise<CloudDeviceRecord | undefined>;
  updateDeviceLastSeen(deviceId: string, lastSeenAt: string): Promise<void>;
  markDeviceRevoked(deviceId: string, revokedAt: string): Promise<void>;

  saveToken(token: CloudTokenRecord): Promise<void>;
  findTokenByHash(tokenHash: string): Promise<CloudTokenRecord | undefined>;
  markTokenUsed(tokenHash: string, usedAt: string): Promise<void>;
  markTokenRevoked(tokenHash: string, revokedAt: string): Promise<void>;

  upsertCaptureSource(source: CaptureSourceRecord): Promise<CaptureSourceRecord>;
  getCaptureSource(sourceId: string): Promise<CaptureSourceRecord | undefined>;

  saveCapturedSession(session: CapturedSessionRecord): Promise<void>;
  getCapturedSession(sessionId: string): Promise<CapturedSessionRecord | undefined>;
  getCapturedSessionByIdempotency(vaultId: string, idempotencyKey: string): Promise<CapturedSessionRecord | undefined>;

  saveCaptureJob(job: CaptureJobRecord): Promise<void>;
  getCaptureJob(jobId: string): Promise<CaptureJobRecord | undefined>;
  getCaptureJobBySession(sessionId: string): Promise<CaptureJobRecord | undefined>;

  recordUsageEvent(event: UsageEventRecord): Promise<void>;
  listUsageEvents(vaultId: string, options?: { limit?: number }): Promise<UsageEventRecord[]>;
  sumUsageEvents(vaultId: string, eventType: string): Promise<number>;

  recordAuditEvent(event: AuditEventRecord): Promise<void>;
  listAuditEvents(vaultId: string, options?: { limit?: number }): Promise<AuditEventRecord[]>;

  // v0.9 source registry
  listCaptureSources(vaultId: string, options?: { limit?: number; status?: SourceStatus }): Promise<CaptureSourceRecord[]>;
  saveSourcePermission(record: SourcePermissionRecord): Promise<void>;
  listSourcePermissions(sourceId: string): Promise<SourcePermissionRecord[]>;
  saveSourceCheckpoint(record: SourceCheckpointRecord): Promise<void>;
  listSourceCheckpoints(sourceId: string): Promise<SourceCheckpointRecord[]>;

  // v0.9 capture pipeline
  saveCaptureBatch(batch: CaptureBatchRecord): Promise<void>;
  getCaptureBatch(batchId: string): Promise<CaptureBatchRecord | undefined>;
  getCaptureBatchByIdempotency(vaultId: string, idempotencyKey: string): Promise<CaptureBatchRecord | undefined>;
  saveCaptureEvent(event: CaptureEventRecord): Promise<{ inserted: boolean; event: CaptureEventRecord }>;
  listCaptureEventsForSession(sessionId: string, options?: { limit?: number }): Promise<CaptureEventRecord[]>;
  countCaptureEvents(vaultId: string): Promise<number>;

  // v0.9 usage limit snapshots
  saveUsageLimitSnapshot(record: UsageLimitSnapshotRecord): Promise<void>;
  getLatestUsageLimitSnapshot(vaultId: string): Promise<UsageLimitSnapshotRecord | undefined>;

  // v0.9 hosted MCP client registry
  listHostedMcpClients(vaultId: string): Promise<HostedMcpClientRecord[]>;
  saveHostedMcpClient(record: HostedMcpClientRecord): Promise<void>;

  // v0.9 operator surface — cross-vault aggregate. ONLY callable from
  // operator/admin contexts; the HTTP layer enforces the role gate.
  operatorUsageRollup(options?: { limit?: number }): Promise<OperatorUsageRow[]>;

  // v1.0 Google OIDC identity + atomic signup
  findOauthIdentityBySub(provider: string, providerUserId: string): Promise<OauthIdentityRecord | undefined>;
  createUserAccountWithIdentity(input: {
    accountId: string;
    vaultId: string;
    identityId: string;
    email?: string | null;
    displayName?: string | null;
    provider: string;
    providerUserId: string;
    now: string;
  }): Promise<{ account: CloudAccountRecord; vault: CloudVaultRecord; identity: OauthIdentityRecord }>;
  listOauthIdentitiesForAccount(accountId: string): Promise<OauthIdentityRecord[]>;

  // === v1.0 methods ===
  saveMemoryCandidate(record: MemoryCandidateRecord): Promise<void>;
  getMemoryCandidate(id: string): Promise<MemoryCandidateRecord | null>;
  listMemoryCandidates(vaultId: string, options?: { status?: CandidateStatus; limit?: number }): Promise<MemoryCandidateRecord[]>;
  saveMemoryReviewAction(record: MemoryReviewActionRecord): Promise<void>;
  saveRecallTrace(record: RecallTraceRecord): Promise<void>;
  saveRecallTraceItem(record: RecallTraceItemRecord): Promise<void>;
  getRecallTrace(id: string): Promise<{ trace: RecallTraceRecord; items: RecallTraceItemRecord[] } | null>;
  listRecallTraces(vaultId: string, options?: { limit?: number }): Promise<RecallTraceRecord[]>;
  updateRecallTraceFeedback(id: string, feedback: string, feedbackAt: string): Promise<void>;
  deleteVault(vaultId: string): Promise<void>;
}

export interface OauthIdentityRecord {
  id: string;
  accountId: string;
  provider: string;
  providerUserId: string;
  email?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export class InMemoryCloudStore implements CloudStore {
  private readonly accounts = new Map<string, CloudAccountRecord>();
  private readonly vaults = new Map<string, CloudVaultRecord>();
  private readonly devices = new Map<string, CloudDeviceRecord>();
  private readonly tokensByHash = new Map<string, CloudTokenRecord>();
  private readonly captureSources = new Map<string, CaptureSourceRecord>();
  private readonly capturedSessions = new Map<string, CapturedSessionRecord>();
  private readonly captureJobs = new Map<string, CaptureJobRecord>();
  private readonly usageEvents: UsageEventRecord[] = [];
  private readonly auditEvents: AuditEventRecord[] = [];

  async ready(): Promise<void> {
    return undefined;
  }

  async ensureBootstrap(input: { defaultAccountId: string; defaultVaultId: string; now: string }) {
    let account = this.accounts.get(input.defaultAccountId);
    if (!account) {
      account = {
        id: input.defaultAccountId,
        name: "Local development account",
        plan: "free",
        createdAt: input.now
      };
      this.accounts.set(account.id, account);
    }
    let vault = this.vaults.get(input.defaultVaultId);
    if (!vault) {
      vault = {
        id: input.defaultVaultId,
        accountId: account.id,
        name: "Personal vault",
        plan: "free",
        rawArchiveEnabled: false,
        privateMode: false,
        createdAt: input.now
      };
      this.vaults.set(vault.id, vault);
    }
    return { account, vault };
  }

  async getAccount(id: string) { return this.accounts.get(id); }
  async getVault(id: string) { return this.vaults.get(id); }
  async listVaultsForAccount(accountId: string) {
    return [...this.vaults.values()].filter((vault) => vault.accountId === accountId);
  }

  async saveDevice(device: CloudDeviceRecord) {
    this.devices.set(device.id, { ...device });
  }
  async getDevice(id: string) {
    const d = this.devices.get(id);
    return d ? { ...d } : undefined;
  }
  async updateDeviceLastSeen(deviceId: string, lastSeenAt: string) {
    const d = this.devices.get(deviceId);
    if (d) {
      this.devices.set(deviceId, { ...d, lastSeenAt });
    }
  }
  async markDeviceRevoked(deviceId: string, revokedAt: string) {
    const d = this.devices.get(deviceId);
    if (d) {
      this.devices.set(deviceId, { ...d, status: "revoked", revokedAt });
    }
  }

  async saveToken(token: CloudTokenRecord) {
    this.tokensByHash.set(token.tokenHash, { ...token, scopes: [...token.scopes] });
  }
  async findTokenByHash(tokenHash: string) {
    const t = this.tokensByHash.get(tokenHash);
    return t ? { ...t, scopes: [...t.scopes] } : undefined;
  }
  async markTokenUsed(tokenHash: string, usedAt: string) {
    const t = this.tokensByHash.get(tokenHash);
    if (t) {
      this.tokensByHash.set(tokenHash, { ...t, usedAt });
    }
  }
  async markTokenRevoked(tokenHash: string, revokedAt: string) {
    const t = this.tokensByHash.get(tokenHash);
    if (t) {
      this.tokensByHash.set(tokenHash, { ...t, revokedAt });
    }
  }

  async upsertCaptureSource(source: CaptureSourceRecord) {
    this.captureSources.set(source.id, { ...source, metadata: { ...source.metadata } });
    return { ...source, metadata: { ...source.metadata } };
  }
  async getCaptureSource(id: string) {
    const s = this.captureSources.get(id);
    return s ? { ...s, metadata: { ...s.metadata } } : undefined;
  }

  async saveCapturedSession(session: CapturedSessionRecord) {
    this.capturedSessions.set(session.id, cloneCapturedSession(session));
  }
  async getCapturedSession(id: string) {
    const session = this.capturedSessions.get(id);
    return session ? cloneCapturedSession(session) : undefined;
  }
  async getCapturedSessionByIdempotency(vaultId: string, idempotencyKey: string) {
    const session = [...this.capturedSessions.values()].find(
      (candidate) => candidate.vaultId === vaultId && candidate.idempotencyKey === idempotencyKey
    );
    return session ? cloneCapturedSession(session) : undefined;
  }

  async saveCaptureJob(job: CaptureJobRecord) {
    this.captureJobs.set(job.id, { ...job, payload: { ...job.payload } });
  }
  async getCaptureJob(id: string) {
    const j = this.captureJobs.get(id);
    return j ? { ...j, payload: { ...j.payload } } : undefined;
  }
  async getCaptureJobBySession(sessionId: string) {
    const job = [...this.captureJobs.values()].find((candidate) => candidate.sessionId === sessionId);
    return job ? { ...job, payload: { ...job.payload } } : undefined;
  }

  async recordUsageEvent(event: UsageEventRecord) {
    this.usageEvents.push({ ...event, metadata: { ...event.metadata } });
  }
  async listUsageEvents(vaultId: string, options: { limit?: number } = {}) {
    const limit = options.limit ?? 100;
    return this.usageEvents
      .filter((event) => event.vaultId === vaultId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit)
      .map((event) => ({ ...event, metadata: { ...event.metadata } }));
  }
  async sumUsageEvents(vaultId: string, eventType: string) {
    return this.usageEvents
      .filter((event) => event.vaultId === vaultId && event.eventType === eventType)
      .reduce((sum, event) => sum + event.units, 0);
  }

  async recordAuditEvent(event: AuditEventRecord) {
    this.auditEvents.push({ ...event, metadata: { ...event.metadata } });
  }
  async listAuditEvents(vaultId: string, options: { limit?: number } = {}) {
    const limit = options.limit ?? 100;
    return this.auditEvents
      .filter((event) => event.vaultId === vaultId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((event) => ({ ...event, metadata: { ...event.metadata } }));
  }

  // === v0.9 source registry ===

  private readonly sourcePermissions = new Map<string, SourcePermissionRecord>();
  private readonly sourceCheckpoints = new Map<string, SourceCheckpointRecord>();
  private readonly captureBatches = new Map<string, CaptureBatchRecord>();
  private readonly captureEvents = new Map<string, CaptureEventRecord>();
  private readonly captureEventsByIdem = new Map<string, string>();
  private readonly captureBatchesByIdem = new Map<string, string>();
  private readonly usageLimitSnapshots: UsageLimitSnapshotRecord[] = [];
  private readonly hostedMcpClients = new Map<string, HostedMcpClientRecord>();

  // v1.0 state
  private readonly memoryCandidates = new Map<string, MemoryCandidateRecord>();
  private readonly memoryReviewActions: MemoryReviewActionRecord[] = [];
  private readonly recallTraces = new Map<string, RecallTraceRecord>();
  private readonly recallTraceItems: RecallTraceItemRecord[] = [];

  async listCaptureSources(vaultId: string, options: { limit?: number; status?: SourceStatus } = {}) {
    const limit = options.limit ?? 100;
    return [...this.captureSources.values()]
      .filter((source) => source.vaultId === vaultId)
      .filter((source) => !options.status || source.status === options.status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map((source) => ({ ...source, metadata: { ...source.metadata } }));
  }

  async saveSourcePermission(record: SourcePermissionRecord) {
    this.sourcePermissions.set(record.id, { ...record, metadata: { ...record.metadata } });
  }
  async listSourcePermissions(sourceId: string) {
    return [...this.sourcePermissions.values()]
      .filter((perm) => perm.sourceId === sourceId)
      .map((perm) => ({ ...perm, metadata: { ...perm.metadata } }));
  }

  async saveSourceCheckpoint(record: SourceCheckpointRecord) {
    const key = `${record.sourceId}::${record.checkpointKey}`;
    this.sourceCheckpoints.set(key, { ...record, metadata: { ...record.metadata } });
  }
  async listSourceCheckpoints(sourceId: string) {
    return [...this.sourceCheckpoints.values()]
      .filter((cp) => cp.sourceId === sourceId)
      .map((cp) => ({ ...cp, metadata: { ...cp.metadata } }));
  }

  async saveCaptureBatch(batch: CaptureBatchRecord) {
    this.captureBatches.set(batch.id, { ...batch, metadata: { ...batch.metadata } });
    if (batch.idempotencyKey) {
      this.captureBatchesByIdem.set(`${batch.vaultId}::${batch.idempotencyKey}`, batch.id);
    }
  }
  async getCaptureBatch(batchId: string) {
    const b = this.captureBatches.get(batchId);
    return b ? { ...b, metadata: { ...b.metadata } } : undefined;
  }
  async getCaptureBatchByIdempotency(vaultId: string, idempotencyKey: string) {
    const id = this.captureBatchesByIdem.get(`${vaultId}::${idempotencyKey}`);
    if (!id) return undefined;
    return this.getCaptureBatch(id);
  }

  async saveCaptureEvent(event: CaptureEventRecord) {
    if (event.idempotencyKey) {
      const dedupeKey = `${event.vaultId}::${event.idempotencyKey}`;
      const existingId = this.captureEventsByIdem.get(dedupeKey);
      if (existingId) {
        const existing = this.captureEvents.get(existingId);
        if (existing) {
          return { inserted: false, event: { ...existing, contentRef: { ...existing.contentRef }, payload: { ...existing.payload } } };
        }
      }
      this.captureEventsByIdem.set(dedupeKey, event.id);
    }
    this.captureEvents.set(event.id, {
      ...event,
      contentRef: { ...event.contentRef },
      payload: { ...event.payload }
    });
    return { inserted: true, event: { ...event, contentRef: { ...event.contentRef }, payload: { ...event.payload } } };
  }
  async listCaptureEventsForSession(sessionId: string, options: { limit?: number } = {}) {
    const limit = options.limit ?? 200;
    return [...this.captureEvents.values()]
      .filter((event) => event.sessionId === sessionId)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .slice(0, limit)
      .map((event) => ({ ...event, contentRef: { ...event.contentRef }, payload: { ...event.payload } }));
  }
  async countCaptureEvents(vaultId: string) {
    return [...this.captureEvents.values()].filter((event) => event.vaultId === vaultId).length;
  }

  async saveUsageLimitSnapshot(record: UsageLimitSnapshotRecord) {
    this.usageLimitSnapshots.push({ ...record, metadata: { ...record.metadata } });
  }
  async getLatestUsageLimitSnapshot(vaultId: string) {
    const matches = this.usageLimitSnapshots
      .filter((row) => row.vaultId === vaultId)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
    const head = matches[0];
    return head ? { ...head, metadata: { ...head.metadata } } : undefined;
  }

  async listHostedMcpClients(vaultId: string) {
    return [...this.hostedMcpClients.values()]
      .filter((client) => client.vaultId === vaultId)
      .map((client) => ({ ...client, scopes: [...client.scopes], metadata: { ...client.metadata } }));
  }
  async saveHostedMcpClient(record: HostedMcpClientRecord) {
    this.hostedMcpClients.set(record.id, {
      ...record,
      scopes: [...record.scopes],
      metadata: { ...record.metadata }
    });
  }

  // === v1.0 implementations ===

  async saveMemoryCandidate(record: MemoryCandidateRecord) {
    this.memoryCandidates.set(record.id, { ...record, riskTags: [...record.riskTags], metadata: { ...record.metadata } });
  }

  async getMemoryCandidate(id: string) {
    const c = this.memoryCandidates.get(id);
    return c ? { ...c, riskTags: [...c.riskTags], metadata: { ...c.metadata } } : null;
  }

  async listMemoryCandidates(vaultId: string, options: { status?: CandidateStatus; limit?: number } = {}) {
    const limit = options.limit ?? 100;
    return [...this.memoryCandidates.values()]
      .filter((c) => c.vaultId === vaultId && (!options.status || c.status === options.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((c) => ({ ...c, riskTags: [...c.riskTags], metadata: { ...c.metadata } }));
  }

  async saveMemoryReviewAction(record: MemoryReviewActionRecord) {
    this.memoryReviewActions.push({ ...record, metadata: { ...record.metadata } });
  }

  async saveRecallTrace(record: RecallTraceRecord) {
    this.recallTraces.set(record.id, { ...record, metadata: { ...record.metadata } });
  }

  async saveRecallTraceItem(record: RecallTraceItemRecord) {
    this.recallTraceItems.push({ ...record, riskTags: [...record.riskTags], metadata: { ...record.metadata } });
  }

  async getRecallTrace(id: string) {
    const trace = this.recallTraces.get(id);
    if (!trace) return null;
    const items = this.recallTraceItems.filter((i) => i.traceId === id);
    return {
      trace: { ...trace, metadata: { ...trace.metadata } },
      items: items.map((i) => ({ ...i, riskTags: [...i.riskTags], metadata: { ...i.metadata } }))
    };
  }

  async listRecallTraces(vaultId: string, options: { limit?: number } = {}) {
    const limit = options.limit ?? 50;
    return [...this.recallTraces.values()]
      .filter((t) => t.vaultId === vaultId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((t) => ({ ...t, metadata: { ...t.metadata } }));
  }

  async updateRecallTraceFeedback(id: string, feedback: string, feedbackAt: string) {
    const trace = this.recallTraces.get(id);
    if (trace) {
      this.recallTraces.set(id, { ...trace, feedback, feedbackAt });
    }
  }

  async deleteVault(vaultId: string) {
    // Ops: delete-vault job path covers memories, candidates, profiles,
    // embeddings, raw archive refs, source tokens, and audit tombstones.
    [...this.memoryCandidates.values()]
      .filter((c) => c.vaultId === vaultId)
      .forEach((c) => this.memoryCandidates.delete(c.id));

    [...this.recallTraces.values()]
      .filter((t) => t.vaultId === vaultId)
      .forEach((t) => {
        const id = t.id;
        this.recallTraces.delete(id);
        // Cascading delete items in memory
        for (let i = this.recallTraceItems.length - 1; i >= 0; i--) {
          if (this.recallTraceItems[i]?.traceId === id) {
            this.recallTraceItems.splice(i, 1);
          }
        }
      });

    // In-memory partial cleanup (rest of tables omitted for brevity in MVP)
    console.log(`Vault ${vaultId} data cleared from InMemoryStore.`);
  }

  async operatorUsageRollup(options: { limit?: number } = {}) {
    const limit = options.limit ?? 50;
    const grouped = new Map<string, OperatorUsageRow>();

    for (const event of this.usageEvents) {
      let row = grouped.get(event.vaultId);
      if (!row) {
        const vault = this.vaults.get(event.vaultId);
        row = {
          vaultId: event.vaultId,
          accountId: vault?.accountId ?? null,
          plan: vault?.plan ?? "free",
          ingestTokenUsed: 0,
          recallUsed: 0,
          captureEventCount: 0,
          lastEventAt: null
        };
        grouped.set(event.vaultId, row);
      }
      if (event.eventType === "capture.tokens" || event.eventType === "ingest.tokens") {
        row.ingestTokenUsed += event.units;
      }
      if (event.eventType === "recall.request" || event.eventType === "recall.tokens") {
        row.recallUsed += event.units;
      }
      if (event.eventType === "capture.event" || event.eventType === "capture.heartbeat") {
        row.captureEventCount += event.units;
      }
      if (!row.lastEventAt || row.lastEventAt < event.occurredAt) {
        row.lastEventAt = event.occurredAt;
      }
    }
    return [...grouped.values()]
      .sort((a, b) => b.ingestTokenUsed - a.ingestTokenUsed)
      .slice(0, limit);
  }

  // === v1.0 Google OIDC identities ===

  private readonly oauthIdentities = new Map<string, OauthIdentityRecord>();

  async findOauthIdentityBySub(provider: string, providerUserId: string) {
    return [...this.oauthIdentities.values()].find(
      (identity) => identity.provider === provider && identity.providerUserId === providerUserId
    );
  }

  async listOauthIdentitiesForAccount(accountId: string) {
    return [...this.oauthIdentities.values()].filter((identity) => identity.accountId === accountId);
  }

  async createUserAccountWithIdentity(input: {
    accountId: string;
    vaultId: string;
    identityId: string;
    email?: string | null;
    displayName?: string | null;
    provider: string;
    providerUserId: string;
    now: string;
  }) {
    const account: CloudAccountRecord = {
      id: input.accountId,
      name: input.displayName ?? input.email ?? `Lore user ${input.providerUserId.slice(0, 8)}`,
      email: input.email ?? null,
      displayName: input.displayName ?? null,
      plan: "free",
      createdAt: input.now
    };
    this.accounts.set(account.id, account);
    const vault: CloudVaultRecord = {
      id: input.vaultId,
      accountId: account.id,
      name: "Personal vault",
      plan: "free",
      rawArchiveEnabled: false,
      privateMode: false,
      createdAt: input.now
    };
    this.vaults.set(vault.id, vault);
    const identity: OauthIdentityRecord = {
      id: input.identityId,
      accountId: account.id,
      provider: input.provider,
      providerUserId: input.providerUserId,
      email: input.email ?? null,
      metadata: {},
      createdAt: input.now
    };
    this.oauthIdentities.set(identity.id, identity);
    return { account, vault, identity };
  }
}

export interface PostgresCloudStoreOptions {
  pool: Pool;
}

export class PostgresCloudStore implements CloudStore {
  private readonly pool: Pool;
  private readyPromise?: Promise<void>;

  constructor(options: PostgresCloudStoreOptions) {
    this.pool = options.pool;
  }

  async ready(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = Promise.resolve();
    }
    await this.readyPromise;
  }

  async ensureBootstrap(input: { defaultAccountId: string; defaultVaultId: string; now: string }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO accounts (id, name, plan, created_at, updated_at)
         VALUES ($1, $2, 'free', $3, $3)
         ON CONFLICT (id) DO NOTHING`,
        [input.defaultAccountId, "Local development account", input.now]
      );
      await client.query(
        `INSERT INTO vaults (id, account_id, name, plan, raw_archive_enabled, private_mode, created_at, updated_at)
         VALUES ($1, $2, 'Personal vault', 'free', false, false, $3, $3)
         ON CONFLICT (id) DO NOTHING`,
        [input.defaultVaultId, input.defaultAccountId, input.now]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const account = await this.getAccount(input.defaultAccountId);
    const vault = await this.getVault(input.defaultVaultId);
    if (!account || !vault) {
      throw new Error("cloud bootstrap did not produce account/vault rows");
    }
    return { account, vault };
  }

  async getAccount(accountId: string): Promise<CloudAccountRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, name, plan, email, display_name, created_at FROM accounts WHERE id = $1`,
      [accountId]
    );
    const row = res.rows[0];
    return row ? rowToAccount(row) : undefined;
  }

  async getVault(vaultId: string): Promise<CloudVaultRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, account_id, name, plan, raw_archive_enabled, private_mode, created_at FROM vaults WHERE id = $1`,
      [vaultId]
    );
    const row = res.rows[0];
    return row ? rowToVault(row) : undefined;
  }

  async listVaultsForAccount(accountId: string): Promise<CloudVaultRecord[]> {
    const res = await this.pool.query(
      `SELECT id, account_id, name, plan, raw_archive_enabled, private_mode, created_at FROM vaults WHERE account_id = $1 ORDER BY created_at`,
      [accountId]
    );
    return res.rows.map(rowToVault);
  }

  async saveDevice(device: CloudDeviceRecord) {
    await this.pool.query(
      `INSERT INTO devices (id, vault_id, account_id, label, platform, status, last_seen_at, paired_at, revoked_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '{}'::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         platform = EXCLUDED.platform,
         status = EXCLUDED.status,
         last_seen_at = EXCLUDED.last_seen_at,
         revoked_at = EXCLUDED.revoked_at`,
      [device.id, device.vaultId, device.accountId, device.label ?? null, device.platform ?? null,
       device.status, device.lastSeenAt ?? null, device.pairedAt, device.revokedAt ?? null]
    );
  }

  async getDevice(deviceId: string): Promise<CloudDeviceRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, vault_id, account_id, label, platform, status, last_seen_at, paired_at, revoked_at FROM devices WHERE id = $1`,
      [deviceId]
    );
    const row = res.rows[0];
    return row ? rowToDevice(row) : undefined;
  }

  async updateDeviceLastSeen(deviceId: string, lastSeenAt: string) {
    await this.pool.query(`UPDATE devices SET last_seen_at = $2 WHERE id = $1`, [deviceId, lastSeenAt]);
  }

  async markDeviceRevoked(deviceId: string, revokedAt: string) {
    await this.pool.query(
      `UPDATE devices SET status = 'revoked', revoked_at = $2 WHERE id = $1`,
      [deviceId, revokedAt]
    );
  }

  async saveToken(token: CloudTokenRecord) {
    await this.pool.query(
      `INSERT INTO cloud_tokens (
         id, token_hash, kind, vault_id, account_id, device_id, agent_id,
         scopes, single_use, expires_at, used_at, revoked_at, rotated_from, metadata, created_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8::jsonb, $9, $10, $11, $12, $13, '{}'::jsonb, $14
       )
       ON CONFLICT (token_hash) DO NOTHING`,
      [token.id, token.tokenHash, token.kind, token.vaultId, token.accountId,
       token.deviceId ?? null, token.agentId ?? null,
       JSON.stringify(token.scopes), token.singleUse, token.expiresAt,
       token.usedAt ?? null, token.revokedAt ?? null, token.rotatedFrom ?? null, token.createdAt]
    );
  }

  async findTokenByHash(tokenHash: string): Promise<CloudTokenRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, token_hash, kind, vault_id, account_id, device_id, agent_id, scopes,
              single_use, expires_at, used_at, revoked_at, rotated_from, created_at
         FROM cloud_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    const row = res.rows[0];
    return row ? rowToToken(row) : undefined;
  }

  async markTokenUsed(tokenHash: string, usedAt: string) {
    await this.pool.query(
      `UPDATE cloud_tokens SET used_at = $2 WHERE token_hash = $1 AND used_at IS NULL`,
      [tokenHash, usedAt]
    );
  }

  async markTokenRevoked(tokenHash: string, revokedAt: string) {
    await this.pool.query(
      `UPDATE cloud_tokens SET revoked_at = $2 WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash, revokedAt]
    );
  }

  async upsertCaptureSource(source: CaptureSourceRecord): Promise<CaptureSourceRecord> {
    await this.pool.query(
      `INSERT INTO capture_sources (
         id, vault_id, device_id, source_type, source_provider, source_ref,
         status, last_heartbeat_at, last_error, metadata, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10::jsonb, $11, $12
       )
       ON CONFLICT (id) DO UPDATE SET
         device_id = EXCLUDED.device_id,
         source_type = EXCLUDED.source_type,
         source_provider = EXCLUDED.source_provider,
         source_ref = EXCLUDED.source_ref,
         status = EXCLUDED.status,
         last_heartbeat_at = EXCLUDED.last_heartbeat_at,
         last_error = EXCLUDED.last_error,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
      [source.id, source.vaultId, source.deviceId ?? null, source.sourceType,
       source.sourceProvider ?? null, source.sourceRef ?? null,
       source.status, source.lastHeartbeatAt ?? null, source.lastError ?? null,
       JSON.stringify(source.metadata ?? {}), source.createdAt, source.updatedAt]
    );
    return source;
  }

  async getCaptureSource(sourceId: string): Promise<CaptureSourceRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, vault_id, device_id, source_type, source_provider, source_ref,
              status, last_heartbeat_at, last_error, metadata, created_at, updated_at
         FROM capture_sources WHERE id = $1`,
      [sourceId]
    );
    const row = res.rows[0];
    return row ? rowToCaptureSource(row) : undefined;
  }

  async saveCapturedSession(session: CapturedSessionRecord) {
    await this.pool.query(
      `INSERT INTO capture_sessions (
         id, vault_id, source_id, source_provider, source_original_id, agent_type,
         capture_mode, started_at, ended_at, idempotency_key, status,
         metadata, content_hash, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, 'pending',
         $11::jsonb, $12, $13, $13
       )
       ON CONFLICT (id) DO UPDATE SET
         source_id = EXCLUDED.source_id,
         source_provider = EXCLUDED.source_provider,
         source_original_id = EXCLUDED.source_original_id,
         capture_mode = EXCLUDED.capture_mode,
         started_at = EXCLUDED.started_at,
         ended_at = EXCLUDED.ended_at,
         idempotency_key = EXCLUDED.idempotency_key,
         metadata = EXCLUDED.metadata,
         content_hash = EXCLUDED.content_hash,
         updated_at = EXCLUDED.updated_at`,
      [
        session.id,
        session.vaultId,
        session.sourceId,
        session.provider,
        session.sourceOriginalId,
        session.provider,
        session.captureMode,
        session.startedAt ?? null,
        session.endedAt ?? null,
        session.idempotencyKey,
        JSON.stringify({
          ...session.metadata,
          deviceId: session.deviceId ?? null,
          redaction: session.redaction,
          turnSummary: session.turnSummary,
          rawTurns: session.rawTurns,
          receivedAt: session.receivedAt
        }),
        session.contentHash,
        session.receivedAt
      ]
    );
  }

  async getCapturedSession(sessionId: string): Promise<CapturedSessionRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, vault_id, source_id, source_provider, source_original_id, capture_mode,
              started_at, ended_at, idempotency_key, metadata, content_hash, created_at
         FROM capture_sessions WHERE id = $1`,
      [sessionId]
    );
    const row = res.rows[0];
    return row ? rowToCapturedSession(row) : undefined;
  }

  async getCapturedSessionByIdempotency(vaultId: string, idempotencyKey: string): Promise<CapturedSessionRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, vault_id, source_id, source_provider, source_original_id, capture_mode,
              started_at, ended_at, idempotency_key, metadata, content_hash, created_at
         FROM capture_sessions WHERE vault_id = $1 AND idempotency_key = $2 ORDER BY created_at DESC LIMIT 1`,
      [vaultId, idempotencyKey]
    );
    const row = res.rows[0];
    return row ? rowToCapturedSession(row) : undefined;
  }

  async saveCaptureJob(job: CaptureJobRecord) {
    await this.pool.query(
      `INSERT INTO capture_jobs (
         id, vault_id, session_id, type, status, attempts, next_run_at, locked_by, locked_at,
         payload, error, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10::jsonb, $11, $12, $13
       )
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         attempts = EXCLUDED.attempts,
         next_run_at = EXCLUDED.next_run_at,
         locked_by = EXCLUDED.locked_by,
         locked_at = EXCLUDED.locked_at,
         payload = EXCLUDED.payload,
         error = EXCLUDED.error,
         updated_at = EXCLUDED.updated_at`,
      [job.id, job.vaultId, job.sessionId ?? null, job.type, job.status,
       job.attempts, job.nextRunAt ?? null, job.lockedBy ?? null, job.lockedAt ?? null,
       JSON.stringify(job.payload ?? {}), job.error ?? null, job.createdAt, job.updatedAt]
    );
  }

  async getCaptureJob(jobId: string): Promise<CaptureJobRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, vault_id, session_id, type, status, attempts, next_run_at, locked_by, locked_at,
              payload, error, created_at, updated_at
         FROM capture_jobs WHERE id = $1`,
      [jobId]
    );
    const row = res.rows[0];
    return row ? rowToCaptureJob(row) : undefined;
  }

  async getCaptureJobBySession(sessionId: string): Promise<CaptureJobRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, vault_id, session_id, type, status, attempts, next_run_at, locked_by, locked_at,
              payload, error, created_at, updated_at
         FROM capture_jobs WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [sessionId]
    );
    const row = res.rows[0];
    return row ? rowToCaptureJob(row) : undefined;
  }

  async recordUsageEvent(event: UsageEventRecord) {
    await this.pool.query(
      `INSERT INTO usage_meter_events (id, vault_id, account_id, event_type, units, metadata, occurred_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, event.vaultId, event.accountId ?? null, event.eventType, event.units,
       JSON.stringify(event.metadata ?? {}), event.occurredAt, event.createdAt]
    );
  }

  async listUsageEvents(vaultId: string, options: { limit?: number } = {}): Promise<UsageEventRecord[]> {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
    const res = await this.pool.query(
      `SELECT id, vault_id, account_id, event_type, units, metadata, occurred_at, created_at
         FROM usage_meter_events WHERE vault_id = $1 ORDER BY occurred_at DESC LIMIT $2`,
      [vaultId, limit]
    );
    return res.rows.map(rowToUsageEvent);
  }

  async sumUsageEvents(vaultId: string, eventType: string): Promise<number> {
    const res = await this.pool.query(
      `SELECT COALESCE(SUM(units), 0)::float8 AS total FROM usage_meter_events WHERE vault_id = $1 AND event_type = $2`,
      [vaultId, eventType]
    );
    return Number(res.rows[0]?.total ?? 0);
  }

  async recordAuditEvent(event: AuditEventRecord) {
    await this.pool.query(
      `INSERT INTO audit_events (id, vault_id, account_id, actor_id, actor_kind, action, target_type, target_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, event.vaultId, event.accountId ?? null, event.actorId ?? null,
       event.actorKind ?? null, event.action, event.targetType ?? null,
       event.targetId ?? null, JSON.stringify(event.metadata ?? {}), event.createdAt]
    );
  }

  async listAuditEvents(vaultId: string, options: { limit?: number } = {}): Promise<AuditEventRecord[]> {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
    const res = await this.pool.query(
      `SELECT id, vault_id, account_id, actor_id, actor_kind, action, target_type, target_id, metadata, created_at
         FROM audit_events WHERE vault_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [vaultId, limit]
    );
    return res.rows.map(rowToAuditEvent);
  }

  // === v0.9 source registry, capture pipeline, usage limits ===

  async listCaptureSources(vaultId: string, options: { limit?: number; status?: SourceStatus } = {}): Promise<CaptureSourceRecord[]> {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
    const params: unknown[] = [vaultId, limit];
    let where = "WHERE vault_id = $1";
    if (options.status) {
      params.push(options.status);
      where += ` AND status = $${params.length}`;
    }
    const res = await this.pool.query(
      `SELECT id, vault_id, device_id, source_type, source_provider, source_ref,
              status, last_heartbeat_at, last_error, metadata, created_at, updated_at
         FROM capture_sources ${where} ORDER BY updated_at DESC LIMIT $2`,
      params
    );
    return res.rows.map(rowToCaptureSource);
  }

  async saveSourcePermission(record: SourcePermissionRecord) {
    await this.pool.query(
      `INSERT INTO source_permissions (id, source_id, vault_id, permission_type, scope, value, metadata, granted_at, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         permission_type = EXCLUDED.permission_type,
         scope = EXCLUDED.scope,
         value = EXCLUDED.value,
         metadata = EXCLUDED.metadata,
         revoked_at = EXCLUDED.revoked_at`,
      [record.id, record.sourceId, record.vaultId, record.permissionType,
       record.scope ?? null, record.value, JSON.stringify(record.metadata ?? {}),
       record.grantedAt, record.revokedAt ?? null]
    );
  }

  async listSourcePermissions(sourceId: string): Promise<SourcePermissionRecord[]> {
    const res = await this.pool.query(
      `SELECT id, source_id, vault_id, permission_type, scope, value, metadata, granted_at, revoked_at
         FROM source_permissions WHERE source_id = $1 ORDER BY granted_at DESC`,
      [sourceId]
    );
    return res.rows.map(rowToSourcePermission);
  }

  async saveSourceCheckpoint(record: SourceCheckpointRecord) {
    await this.pool.query(
      `INSERT INTO source_checkpoints (id, source_id, vault_id, checkpoint_key, offset_value, content_hash, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       ON CONFLICT (source_id, checkpoint_key) DO UPDATE SET
         offset_value = EXCLUDED.offset_value,
         content_hash = EXCLUDED.content_hash,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
      [record.id, record.sourceId, record.vaultId, record.checkpointKey,
       record.offsetValue ?? null, record.contentHash ?? null,
       JSON.stringify(record.metadata ?? {}), record.updatedAt]
    );
  }

  async listSourceCheckpoints(sourceId: string): Promise<SourceCheckpointRecord[]> {
    const res = await this.pool.query(
      `SELECT id, source_id, vault_id, checkpoint_key, offset_value, content_hash, metadata, updated_at
         FROM source_checkpoints WHERE source_id = $1 ORDER BY updated_at DESC`,
      [sourceId]
    );
    return res.rows.map(rowToSourceCheckpoint);
  }

  async saveCaptureBatch(batch: CaptureBatchRecord) {
    await this.pool.query(
      `INSERT INTO capture_batches (id, vault_id, source_id, device_id, batch_kind, event_count, bytes, status, idempotency_key, metadata, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
       ON CONFLICT (id) DO UPDATE SET
         event_count = EXCLUDED.event_count,
         bytes = EXCLUDED.bytes,
         status = EXCLUDED.status,
         metadata = EXCLUDED.metadata`,
      [batch.id, batch.vaultId, batch.sourceId ?? null, batch.deviceId ?? null,
       batch.batchKind, batch.eventCount, batch.bytes, batch.status,
       batch.idempotencyKey ?? null, JSON.stringify(batch.metadata ?? {}), batch.receivedAt]
    );
  }

  async getCaptureBatch(batchId: string): Promise<CaptureBatchRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, vault_id, source_id, device_id, batch_kind, event_count, bytes, status, idempotency_key, metadata, received_at
         FROM capture_batches WHERE id = $1`,
      [batchId]
    );
    const row = res.rows[0];
    return row ? rowToCaptureBatch(row) : undefined;
  }

  async getCaptureBatchByIdempotency(vaultId: string, idempotencyKey: string): Promise<CaptureBatchRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, vault_id, source_id, device_id, batch_kind, event_count, bytes, status, idempotency_key, metadata, received_at
         FROM capture_batches WHERE vault_id = $1 AND idempotency_key = $2 LIMIT 1`,
      [vaultId, idempotencyKey]
    );
    const row = res.rows[0];
    return row ? rowToCaptureBatch(row) : undefined;
  }

  async saveCaptureEvent(event: CaptureEventRecord): Promise<{ inserted: boolean; event: CaptureEventRecord }> {
    if (event.idempotencyKey) {
      const existing = await this.pool.query(
        `SELECT id, vault_id, session_id, source_id, batch_id, event_type, external_event_id, actor,
                content_ref, redaction_state, idempotency_key, payload, occurred_at, created_at
           FROM capture_events WHERE vault_id = $1 AND idempotency_key = $2 LIMIT 1`,
        [event.vaultId, event.idempotencyKey]
      );
      const row = existing.rows[0];
      if (row) {
        return { inserted: false, event: rowToCaptureEvent(row) };
      }
    }
    await this.pool.query(
      `INSERT INTO capture_events (
         id, vault_id, session_id, source_id, batch_id, event_type, external_event_id, actor,
         content_ref, redaction_state, idempotency_key, payload, occurred_at, created_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8,
         $9::jsonb, $10, $11, $12::jsonb, $13, $14
       )`,
      [event.id, event.vaultId, event.sessionId ?? null, event.sourceId ?? null,
       event.batchId ?? null, event.eventType, event.externalEventId ?? null, event.actor ?? null,
       JSON.stringify(event.contentRef ?? {}), event.redactionState,
       event.idempotencyKey ?? null, JSON.stringify(event.payload ?? {}),
       event.occurredAt, event.createdAt]
    );
    return { inserted: true, event };
  }

  async listCaptureEventsForSession(sessionId: string, options: { limit?: number } = {}): Promise<CaptureEventRecord[]> {
    const limit = Math.min(Math.max(options.limit ?? 200, 1), 1000);
    const res = await this.pool.query(
      `SELECT id, vault_id, session_id, source_id, batch_id, event_type, external_event_id, actor,
              content_ref, redaction_state, idempotency_key, payload, occurred_at, created_at
         FROM capture_events WHERE session_id = $1 ORDER BY occurred_at ASC LIMIT $2`,
      [sessionId, limit]
    );
    return res.rows.map(rowToCaptureEvent);
  }

  async countCaptureEvents(vaultId: string): Promise<number> {
    const res = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM capture_events WHERE vault_id = $1`,
      [vaultId]
    );
    return Number(res.rows[0]?.count ?? 0);
  }

  async saveUsageLimitSnapshot(record: UsageLimitSnapshotRecord) {
    await this.pool.query(
      `INSERT INTO usage_limit_snapshots (
         id, vault_id, account_id, plan, period_start, period_end,
         ingest_token_used, ingest_token_limit, recall_used, recall_limit,
         agent_count, agent_limit, raw_archive_enabled, metadata, observed_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10,
         $11, $12, $13, $14::jsonb, $15
       )
       ON CONFLICT (id) DO NOTHING`,
      [record.id, record.vaultId, record.accountId ?? null, record.plan,
       record.periodStart, record.periodEnd,
       record.ingestTokenUsed, record.ingestTokenLimit,
       record.recallUsed, record.recallLimit,
       record.agentCount, record.agentLimit, record.rawArchiveEnabled,
       JSON.stringify(record.metadata ?? {}), record.observedAt]
    );
  }

  async getLatestUsageLimitSnapshot(vaultId: string): Promise<UsageLimitSnapshotRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, vault_id, account_id, plan, period_start, period_end,
              ingest_token_used, ingest_token_limit, recall_used, recall_limit,
              agent_count, agent_limit, raw_archive_enabled, metadata, observed_at
         FROM usage_limit_snapshots WHERE vault_id = $1
         ORDER BY observed_at DESC LIMIT 1`,
      [vaultId]
    );
    const row = res.rows[0];
    return row ? rowToUsageLimitSnapshot(row) : undefined;
  }

  async listHostedMcpClients(vaultId: string): Promise<HostedMcpClientRecord[]> {
    const res = await this.pool.query(
      `SELECT id, vault_id, account_id, display_name, client_kind, scopes, status, last_seen_at, metadata, created_at, revoked_at
         FROM hosted_mcp_clients WHERE vault_id = $1 ORDER BY created_at DESC`,
      [vaultId]
    );
    return res.rows.map(rowToHostedMcpClient);
  }

  async saveHostedMcpClient(record: HostedMcpClientRecord) {
    await this.pool.query(
      `INSERT INTO hosted_mcp_clients (id, vault_id, account_id, display_name, client_kind, scopes, status, last_seen_at, metadata, created_at, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         client_kind = EXCLUDED.client_kind,
         scopes = EXCLUDED.scopes,
         status = EXCLUDED.status,
         last_seen_at = EXCLUDED.last_seen_at,
         metadata = EXCLUDED.metadata,
         revoked_at = EXCLUDED.revoked_at`,
      [record.id, record.vaultId, record.accountId ?? null, record.displayName ?? null,
       record.clientKind, JSON.stringify(record.scopes), record.status,
       record.lastSeenAt ?? null, JSON.stringify(record.metadata ?? {}),
       record.createdAt, record.revokedAt ?? null]
    );
  }

  // === v1.0 methods implementation ===

  async saveMemoryCandidate(record: MemoryCandidateRecord) {
    await this.pool.query(
      `INSERT INTO memory_candidates (id, vault_id, source_id, session_id, external_event_id, content, memory_type, status, risk_tags, confidence, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         memory_type = EXCLUDED.memory_type,
         status = EXCLUDED.status,
         risk_tags = EXCLUDED.risk_tags,
         confidence = EXCLUDED.confidence,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
      [record.id, record.vaultId, record.sourceId ?? null, record.sessionId ?? null, record.externalEventId ?? null,
       record.content, record.memoryType, record.status, JSON.stringify(record.riskTags), record.confidence,
       JSON.stringify(record.metadata), record.createdAt, record.updatedAt]
    );
  }

  async getMemoryCandidate(id: string): Promise<MemoryCandidateRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM memory_candidates WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? rowToMemoryCandidate(res.rows[0]) : null;
  }

  async listMemoryCandidates(vaultId: string, options: { status?: CandidateStatus; limit?: number } = {}): Promise<MemoryCandidateRecord[]> {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
    const params: unknown[] = [vaultId, limit];
    let where = "WHERE vault_id = $1";
    if (options.status) {
      params.push(options.status);
      where += ` AND status = $${params.length}`;
    }
    const res = await this.pool.query(
      `SELECT * FROM memory_candidates ${where} ORDER BY created_at DESC LIMIT $2`,
      params
    );
    return res.rows.map(rowToMemoryCandidate);
  }

  async saveMemoryReviewAction(record: MemoryReviewActionRecord) {
    await this.pool.query(
      `INSERT INTO memory_review_actions (id, vault_id, candidate_id, memory_id, action, actor_id, actor_kind, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
      [record.id, record.vaultId, record.candidateId ?? null, record.memoryId ?? null,
       record.action, record.actorId ?? null, record.actorKind, JSON.stringify(record.metadata), record.createdAt]
    );
  }

  async saveRecallTrace(record: RecallTraceRecord) {
    await this.pool.query(
      `INSERT INTO recall_traces (id, vault_id, query, route_reason, latency_ms, token_budget, tokens_used, feedback, feedback_at, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
       ON CONFLICT (id) DO UPDATE SET
         feedback = EXCLUDED.feedback,
         feedback_at = EXCLUDED.feedback_at`,
      [record.id, record.vaultId, record.query, record.routeReason ?? null, record.latencyMs ?? null,
       record.tokenBudget ?? null, record.tokensUsed ?? null, record.feedback ?? null,
       record.feedbackAt ?? null, JSON.stringify(record.metadata), record.createdAt]
    );
  }

  async saveRecallTraceItem(record: RecallTraceItemRecord) {
    await this.pool.query(
      `INSERT INTO recall_trace_items (id, trace_id, memory_id, candidate_id, disposition, confidence, risk_tags, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb)`,
      [record.id, record.traceId, record.memoryId ?? null, record.candidateId ?? null,
       record.disposition, record.confidence ?? null, JSON.stringify(record.riskTags),
       record.reason ?? null, JSON.stringify(record.metadata)]
    );
  }

  async getRecallTrace(id: string): Promise<{ trace: RecallTraceRecord; items: RecallTraceItemRecord[] } | null> {
    const traceRes = await this.pool.query(`SELECT * FROM recall_traces WHERE id = $1`, [id]);
    const traceRow = traceRes.rows[0];
    if (!traceRow) return null;
    const itemsRes = await this.pool.query(`SELECT * FROM recall_trace_items WHERE trace_id = $1`, [id]);
    return {
      trace: rowToRecallTrace(traceRow),
      items: itemsRes.rows.map(rowToRecallTraceItem)
    };
  }

  async listRecallTraces(vaultId: string, options: { limit?: number } = {}): Promise<RecallTraceRecord[]> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const res = await this.pool.query(
      `SELECT * FROM recall_traces WHERE vault_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [vaultId, limit]
    );
    return res.rows.map(rowToRecallTrace);
  }

  async updateRecallTraceFeedback(id: string, feedback: string, feedbackAt: string) {
    await this.pool.query(
      `UPDATE recall_traces SET feedback = $2, feedback_at = $3 WHERE id = $1`,
      [id, feedback, feedbackAt]
    );
  }

  async deleteVault(vaultId: string) {
    // Ops: delete-vault job path covers memories, candidates, profiles,
    // embeddings, raw archive refs, source tokens, and audit tombstones.
    // CASCADE handles most, but we want a clean wipe and audit.
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Explicitly delete from tables where references might be circular or cascade is skipped
      await client.query(`DELETE FROM memory_candidates WHERE vault_id = $1`, [vaultId]);
      await client.query(`DELETE FROM recall_traces WHERE vault_id = $1`, [vaultId]);
      await client.query(`DELETE FROM usage_meter_events WHERE vault_id = $1`, [vaultId]);
      await client.query(`DELETE FROM audit_events WHERE vault_id = $1`, [vaultId]);
      await client.query(`DELETE FROM vaults WHERE id = $1`, [vaultId]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async operatorUsageRollup(options: { limit?: number } = {}): Promise<OperatorUsageRow[]> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
    const res = await this.pool.query(
      `WITH per_vault AS (
         SELECT
           u.vault_id,
           v.account_id,
           v.plan,
           SUM(CASE WHEN u.event_type IN ('capture.tokens', 'ingest.tokens') THEN u.units ELSE 0 END) AS ingest_token_used,
           SUM(CASE WHEN u.event_type IN ('recall.request', 'recall.tokens') THEN u.units ELSE 0 END) AS recall_used,
           SUM(CASE WHEN u.event_type IN ('capture.event', 'capture.heartbeat') THEN u.units ELSE 0 END) AS capture_event_count,
           MAX(u.occurred_at) AS last_event_at
         FROM usage_meter_events u
         JOIN vaults v ON v.id = u.vault_id
         GROUP BY u.vault_id, v.account_id, v.plan
       )
       SELECT * FROM per_vault ORDER BY ingest_token_used DESC LIMIT $1`,
      [limit]
    );
    return res.rows.map((row) => ({
      vaultId: String(row.vault_id),
      accountId: row.account_id == null ? null : String(row.account_id),
      plan: String(row.plan ?? "free"),
      ingestTokenUsed: Number(row.ingest_token_used ?? 0),
      recallUsed: Number(row.recall_used ?? 0),
      captureEventCount: Number(row.capture_event_count ?? 0),
      lastEventAt: row.last_event_at == null ? null : toIso(row.last_event_at)
    }));
  }

  // === v1.0 Google OIDC identities ===

  async findOauthIdentityBySub(provider: string, providerUserId: string): Promise<OauthIdentityRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, account_id, provider, provider_user_id, email, metadata, created_at
         FROM oauth_identities WHERE provider = $1 AND provider_user_id = $2`,
      [provider, providerUserId]
    );
    const row = res.rows[0];
    return row ? rowToOauthIdentity(row) : undefined;
  }

  async listOauthIdentitiesForAccount(accountId: string): Promise<OauthIdentityRecord[]> {
    const res = await this.pool.query(
      `SELECT id, account_id, provider, provider_user_id, email, metadata, created_at
         FROM oauth_identities WHERE account_id = $1 ORDER BY created_at DESC`,
      [accountId]
    );
    return res.rows.map(rowToOauthIdentity);
  }

  async createUserAccountWithIdentity(input: {
    accountId: string;
    vaultId: string;
    identityId: string;
    email?: string | null;
    displayName?: string | null;
    provider: string;
    providerUserId: string;
    now: string;
  }): Promise<{ account: CloudAccountRecord; vault: CloudVaultRecord; identity: OauthIdentityRecord }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO accounts (id, name, plan, status, email, display_name, created_at, updated_at)
         VALUES ($1, $2, 'free', 'active', $3, $4, $5, $5)
         ON CONFLICT (id) DO NOTHING`,
        [input.accountId, input.displayName ?? input.email ?? `Lore user ${input.providerUserId.slice(0, 8)}`,
         input.email ?? null, input.displayName ?? null, input.now]
      );
      await client.query(
        `INSERT INTO vaults (id, account_id, name, plan, raw_archive_enabled, private_mode, created_at, updated_at)
         VALUES ($1, $2, 'Personal vault', 'free', false, false, $3, $3)
         ON CONFLICT (id) DO NOTHING`,
        [input.vaultId, input.accountId, input.now]
      );
      await client.query(
        `INSERT INTO oauth_identities (id, account_id, provider, provider_user_id, email, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, $6)
         ON CONFLICT (provider, provider_user_id) DO NOTHING`,
        [input.identityId, input.accountId, input.provider, input.providerUserId, input.email ?? null, input.now]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const account = await this.getAccount(input.accountId);
    const vault = await this.getVault(input.vaultId);
    const identity = await this.findOauthIdentityBySub(input.provider, input.providerUserId);
    if (!account || !vault || !identity) {
      throw new Error("v1.0 signup did not produce account/vault/identity rows");
    }
    return { account, vault, identity };
  }
}

type Row = Record<string, unknown>;

function rowToOauthIdentity(row: Row): OauthIdentityRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    provider: String(row.provider),
    providerUserId: String(row.provider_user_id),
    email: row.email == null ? null : String(row.email),
    metadata: parseJsonObject(row.metadata),
    createdAt: toIso(row.created_at)
  };
}

function rowToAccount(row: Row): CloudAccountRecord {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: row.email == null ? null : String(row.email),
    displayName: row.display_name == null ? null : String(row.display_name),
    plan: String(row.plan ?? "free"),
    createdAt: toIso(row.created_at)
  };
}

function rowToVault(row: Row): CloudVaultRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    name: String(row.name ?? ""),
    plan: String(row.plan ?? "free"),
    rawArchiveEnabled: Boolean(row.raw_archive_enabled),
    privateMode: Boolean(row.private_mode),
    createdAt: toIso(row.created_at)
  };
}

function rowToDevice(row: Row): CloudDeviceRecord {
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    accountId: String(row.account_id),
    label: row.label == null ? null : String(row.label),
    platform: row.platform == null ? null : String(row.platform),
    status: row.status === "revoked" ? "revoked" : "active",
    pairedAt: toIso(row.paired_at),
    lastSeenAt: row.last_seen_at == null ? null : toIso(row.last_seen_at),
    revokedAt: row.revoked_at == null ? null : toIso(row.revoked_at)
  };
}

function rowToToken(row: Row): CloudTokenRecord {
  return {
    id: String(row.id),
    tokenHash: String(row.token_hash),
    kind: row.kind as CloudTokenKind,
    vaultId: String(row.vault_id),
    accountId: String(row.account_id),
    deviceId: row.device_id == null ? null : String(row.device_id),
    agentId: row.agent_id == null ? null : String(row.agent_id),
    scopes: parseJsonArray(row.scopes),
    singleUse: Boolean(row.single_use),
    expiresAt: toIso(row.expires_at),
    usedAt: row.used_at == null ? null : toIso(row.used_at),
    revokedAt: row.revoked_at == null ? null : toIso(row.revoked_at),
    rotatedFrom: row.rotated_from == null ? null : String(row.rotated_from),
    createdAt: toIso(row.created_at)
  };
}

function rowToCaptureSource(row: Row): CaptureSourceRecord {
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    deviceId: row.device_id == null ? null : String(row.device_id),
    sourceType: String(row.source_type ?? "agent_session"),
    sourceProvider: row.source_provider == null ? null : String(row.source_provider),
    sourceRef: row.source_ref == null ? null : String(row.source_ref),
    status: ["active", "paused", "private_mode", "revoked", "error"].includes(String(row.status)) ? (row.status as CaptureSourceRecord["status"]) : "active",
    lastHeartbeatAt: row.last_heartbeat_at == null ? null : toIso(row.last_heartbeat_at),
    lastError: row.last_error == null ? null : String(row.last_error),
    metadata: parseJsonObject(row.metadata),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function rowToCapturedSession(row: Row): CapturedSessionRecord {
  const metadata = parseJsonObject(row.metadata);
  const redaction = parseRedaction(metadata.redaction);
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    sourceId: String(row.source_id ?? ""),
    deviceId: metadata.deviceId == null ? null : String(metadata.deviceId),
    provider: String(row.source_provider ?? ""),
    sourceOriginalId: String(row.source_original_id ?? ""),
    contentHash: String(row.content_hash ?? ""),
    idempotencyKey: String(row.idempotency_key ?? ""),
    captureMode: normalizeCaptureMode(row.capture_mode),
    startedAt: row.started_at == null ? null : toIso(row.started_at),
    endedAt: row.ended_at == null ? null : toIso(row.ended_at),
    redaction,
    metadata: stripCapturedSessionMetadata(metadata),
    turnSummary: parseTurnSummary(metadata.turnSummary),
    rawTurns: Array.isArray(metadata.rawTurns) ? metadata.rawTurns : undefined,
    receivedAt: typeof metadata.receivedAt === "string" ? metadata.receivedAt : toIso(row.created_at)
  };
}

function rowToCaptureJob(row: Row): CaptureJobRecord {
  const status = String(row.status ?? "pending");
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    sessionId: row.session_id == null ? null : String(row.session_id),
    type: String(row.type ?? ""),
    status: ["pending", "running", "completed", "failed"].includes(status) ? (status as CaptureJobRecord["status"]) : "pending",
    attempts: Number(row.attempts ?? 0),
    payload: parseJsonObject(row.payload),
    error: row.error == null ? null : String(row.error),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    nextRunAt: row.next_run_at == null ? null : toIso(row.next_run_at),
    lockedBy: row.locked_by == null ? null : String(row.locked_by),
    lockedAt: row.locked_at == null ? null : toIso(row.locked_at)
  };
}

function rowToUsageEvent(row: Row): UsageEventRecord {
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    accountId: row.account_id == null ? null : String(row.account_id),
    eventType: String(row.event_type ?? ""),
    units: Number(row.units ?? 0),
    metadata: parseJsonObject(row.metadata),
    occurredAt: toIso(row.occurred_at),
    createdAt: toIso(row.created_at)
  };
}

function rowToAuditEvent(row: Row): AuditEventRecord {
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    accountId: row.account_id == null ? null : String(row.account_id),
    actorId: row.actor_id == null ? null : String(row.actor_id),
    actorKind: row.actor_kind == null ? null : String(row.actor_kind),
    action: String(row.action ?? ""),
    targetType: row.target_type == null ? null : String(row.target_type),
    targetId: row.target_id == null ? null : String(row.target_id),
    metadata: parseJsonObject(row.metadata),
    createdAt: toIso(row.created_at)
  };
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date(0).toISOString();
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through
    }
  }
  return {};
}

function cloneCapturedSession(session: CapturedSessionRecord): CapturedSessionRecord {
  return {
    ...session,
    redaction: { ...session.redaction },
    metadata: { ...session.metadata },
    turnSummary: session.turnSummary.map((turn) => ({ ...turn })),
    rawTurns: session.rawTurns ? [...session.rawTurns] : undefined
  };
}

function normalizeCaptureMode(value: unknown): CapturedSessionRecord["captureMode"] {
  if (value === "raw_archive" || value === "private_mode") {
    return value;
  }
  return "summary_only";
}

function parseRedaction(value: unknown): CapturedSessionRecord["redaction"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { version: "unknown", secretCount: 0, privateBlockCount: 0 };
  }
  const raw = value as Record<string, unknown>;
  return {
    version: typeof raw.version === "string" ? raw.version : "unknown",
    secretCount: Number(raw.secretCount ?? raw.secret_count ?? 0),
    privateBlockCount: Number(raw.privateBlockCount ?? raw.private_block_count ?? 0)
  };
}

function parseTurnSummary(value: unknown): Array<{ role: string; text: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    const raw = entry as Record<string, unknown>;
    return [{
      role: typeof raw.role === "string" ? raw.role : "user",
      text: typeof raw.text === "string" ? raw.text : ""
    }];
  });
}

function stripCapturedSessionMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const { deviceId: _deviceId, redaction: _redaction, turnSummary: _turnSummary, rawTurns: _rawTurns, receivedAt: _receivedAt, ...rest } = metadata;
  return rest;
}

// === v0.9 row mappers ===

function rowToSourcePermission(row: Row): SourcePermissionRecord {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    vaultId: String(row.vault_id),
    permissionType: String(row.permission_type ?? ""),
    scope: row.scope == null ? null : String(row.scope),
    value: String(row.value ?? ""),
    metadata: parseJsonObject(row.metadata),
    grantedAt: toIso(row.granted_at),
    revokedAt: row.revoked_at == null ? null : toIso(row.revoked_at)
  };
}

function rowToSourceCheckpoint(row: Row): SourceCheckpointRecord {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    vaultId: String(row.vault_id),
    checkpointKey: String(row.checkpoint_key),
    offsetValue: row.offset_value == null ? null : String(row.offset_value),
    contentHash: row.content_hash == null ? null : String(row.content_hash),
    metadata: parseJsonObject(row.metadata),
    updatedAt: toIso(row.updated_at)
  };
}

function rowToCaptureBatch(row: Row): CaptureBatchRecord {
  const status = String(row.status ?? "received");
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    sourceId: row.source_id == null ? null : String(row.source_id),
    deviceId: row.device_id == null ? null : String(row.device_id),
    batchKind: String(row.batch_kind ?? "capture_event"),
    eventCount: Number(row.event_count ?? 0),
    bytes: Number(row.bytes ?? 0),
    status: ["received", "processing", "applied", "rejected"].includes(status)
      ? (status as CaptureBatchRecord["status"])
      : "received",
    idempotencyKey: row.idempotency_key == null ? null : String(row.idempotency_key),
    metadata: parseJsonObject(row.metadata),
    receivedAt: toIso(row.received_at)
  };
}

function rowToCaptureEvent(row: Row): CaptureEventRecord {
  const redaction = String(row.redaction_state ?? "redacted");
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    sessionId: row.session_id == null ? null : String(row.session_id),
    sourceId: row.source_id == null ? null : String(row.source_id),
    batchId: row.batch_id == null ? null : String(row.batch_id),
    eventType: String(row.event_type ?? ""),
    externalEventId: row.external_event_id == null ? null : String(row.external_event_id),
    actor: row.actor == null ? null : String(row.actor),
    contentRef: parseJsonObject(row.content_ref),
    redactionState: ["redacted", "raw_allowed", "metadata_only"].includes(redaction)
      ? (redaction as CaptureEventRecord["redactionState"])
      : "redacted",
    idempotencyKey: row.idempotency_key == null ? null : String(row.idempotency_key),
    payload: parseJsonObject(row.payload),
    occurredAt: toIso(row.occurred_at),
    createdAt: toIso(row.created_at)
  };
}

function rowToUsageLimitSnapshot(row: Row): UsageLimitSnapshotRecord {
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    accountId: row.account_id == null ? null : String(row.account_id),
    plan: String(row.plan ?? "free"),
    periodStart: toIso(row.period_start),
    periodEnd: toIso(row.period_end),
    ingestTokenUsed: Number(row.ingest_token_used ?? 0),
    ingestTokenLimit: Number(row.ingest_token_limit ?? 0),
    recallUsed: Number(row.recall_used ?? 0),
    recallLimit: Number(row.recall_limit ?? 0),
    agentCount: Number(row.agent_count ?? 0),
    agentLimit: Number(row.agent_limit ?? 0),
    rawArchiveEnabled: Boolean(row.raw_archive_enabled),
    metadata: parseJsonObject(row.metadata),
    observedAt: toIso(row.observed_at)
  };
}

function rowToHostedMcpClient(row: Row): HostedMcpClientRecord {
  const status = String(row.status ?? "active");
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    accountId: row.account_id == null ? null : String(row.account_id),
    displayName: row.display_name == null ? null : String(row.display_name),
    clientKind: String(row.client_kind ?? "mcp"),
    scopes: parseJsonArray(row.scopes),
    status: ["active", "revoked", "error"].includes(status)
      ? (status as HostedMcpClientRecord["status"])
      : "active",
    lastSeenAt: row.last_seen_at == null ? null : toIso(row.last_seen_at),
    metadata: parseJsonObject(row.metadata),
    createdAt: toIso(row.created_at),
    revokedAt: row.revoked_at == null ? null : toIso(row.revoked_at)
  };
}

// === v1.0 row mappers ===

function rowToMemoryCandidate(row: Row): MemoryCandidateRecord {
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    sourceId: row.source_id == null ? null : String(row.source_id),
    sessionId: row.session_id == null ? null : String(row.session_id),
    externalEventId: row.external_event_id == null ? null : String(row.external_event_id),
    content: String(row.content),
    memoryType: String(row.memory_type),
    status: String(row.status) as CandidateStatus,
    riskTags: parseJsonArray(row.risk_tags),
    confidence: Number(row.confidence),
    metadata: parseJsonObject(row.metadata),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function rowToRecallTrace(row: Row): RecallTraceRecord {
  return {
    id: String(row.id),
    vaultId: String(row.vault_id),
    query: String(row.query),
    routeReason: row.route_reason == null ? null : String(row.route_reason),
    latencyMs: row.latency_ms == null ? null : Number(row.latency_ms),
    tokenBudget: row.token_budget == null ? null : Number(row.token_budget),
    tokensUsed: row.tokens_used == null ? null : Number(row.tokens_used),
    feedback: row.feedback == null ? null : String(row.feedback),
    feedbackAt: row.feedback_at == null ? null : toIso(row.feedback_at),
    metadata: parseJsonObject(row.metadata),
    createdAt: toIso(row.created_at)
  };
}

function rowToRecallTraceItem(row: Row): RecallTraceItemRecord {
  return {
    id: String(row.id),
    traceId: String(row.trace_id),
    memoryId: row.memory_id == null ? null : String(row.memory_id),
    candidateId: row.candidate_id == null ? null : String(row.candidate_id),
    disposition: String(row.disposition),
    confidence: row.confidence == null ? null : Number(row.confidence),
    riskTags: parseJsonArray(row.risk_tags),
    reason: row.reason == null ? null : String(row.reason),
    metadata: parseJsonObject(row.metadata)
  };
}

// Re-export PoolClient type so consumers can pass through pg without
// re-importing pg directly. Avoids a separate dependency surface for tests.
export type { PoolClient };
