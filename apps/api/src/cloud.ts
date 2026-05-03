import { createHash, randomUUID } from "node:crypto";
import {
  hashToken,
  InMemoryCloudStore,
  type CaptureBatchRecord,
  type CaptureEventRecord,
  type CaptureJobRecord,
  type CaptureSourceRecord,
  type CapturedSessionRecord,
  type CloudAccountRecord,
  type CloudDeviceRecord,
  type CloudStore,
  type CloudTokenKind,
  type CloudTokenRecord,
  type CloudVaultRecord,
  type HostedMcpClientRecord,
  type OauthIdentityRecord,
  type OperatorUsageRow,
  type RawArchivePolicy,
  type SourceCheckpointRecord,
  type SourcePermissionEnvelope,
  type SourcePermissionRecord,
  type SourceStatus,
  type UsageEventRecord,
  type UsageLimitSnapshotRecord,
  type CandidateStatus,
  type MemoryCandidateRecord,
  type MemoryReviewActionRecord,
  type RecallTraceRecord,
  type RecallTraceItemRecord
} from "./cloud-store.js";
import { ModelGateway, type ModelProvider, type ModelProvenance } from "@lore/model-gateway";
import {
  ActivationTelemetryError,
  ActivationTelemetrySink,
  sessionHashPrefix,
  type ActivationEventRecord,
  type ActivationEventInput
} from "./activation-telemetry.js";
import {
  captureProviderFlag,
  isAllowedByBetaAllowlist,
  readFeatureFlags,
  toPublicFeatureFlagView,
  type FeatureFlagName,
  type FeatureFlagSnapshot
} from "./feature-flags.js";
import {
  buildGoogleAuthorizeUrl,
  clearCookie,
  constantTimeEqual,
  CSRF_COOKIE,
  encodeMockAuthorizationCode,
  encodeMockIdToken,
  exchangeGoogleAuthorizationCode,
  GOOGLE_PROVIDER,
  GoogleAuthError,
  hashSession,
  hmacCsrfToken,
  newAccountId,
  newIdentityId,
  newOauthState,
  newSessionPlaintext,
  newVaultId,
  parseCookies,
  parseGoogleAuthEnv,
  serializeCookie,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  STATE_COOKIE,
  verifyGoogleIdToken,
  type GoogleAuthEnv,
  type GoogleIdTokenClaims
} from "./google-auth.js";

// Lore v1.0 Personal Cloud Beta — vault-aware request surface.
//
// `CloudPlatform` is the request handler that owns install/device/service/agent
// token lifecycle, capture-source heartbeats, capture-job lookup, usage event
// recording, and audit events. It delegates all persistence to a `CloudStore`
// so the same code paths run against in-memory state in tests and against the
// Postgres `cloud_*` tables in production.
//
// Tokens are returned to the caller in plaintext exactly once. Only their
// SHA-256 hash is persisted, so a stolen DB dump cannot be replayed against
// the API and structured logs that include token ids never reveal secrets.

const INSTALL_TOKEN_TTL_MS = 10 * 60 * 1000;
const DEVICE_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const SERVICE_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const SESSION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type { CloudTokenKind } from "./cloud-store.js";

export interface CloudAccount extends CloudAccountRecord {}
export interface CloudVault extends CloudVaultRecord {}
export interface CloudDevice extends CloudDeviceRecord {}

export interface CloudIssuedToken {
  // Plaintext token. Returned once at issuance, never persisted as plaintext.
  plaintext: string;
  record: CloudTokenRecord;
}

export interface CaptureSource extends CaptureSourceRecord {}
export interface CaptureJob extends CaptureJobRecord {}
export interface CapturedSession extends CapturedSessionRecord {}

export interface CloudAuthContext {
  vaultId: string;
  accountId: string;
  deviceId?: string;
  tokenKind: CloudTokenKind;
  scopes: string[];
}

export interface CloudErrorPayload {
  status: number;
  code: string;
  message: string;
  headers?: Record<string, string>;
}

export class CloudError extends Error {
  readonly status: number;
  readonly code: string;
  readonly headers?: Record<string, string>;

  constructor(code: string, message: string, status = 400, headers?: Record<string, string>) {
    super(message);
    this.code = code;
    this.status = status;
    this.headers = headers;
  }
}

interface CloudHandleOptions {
  request: Request;
  url: URL;
  path: string;
  method: string;
  hasAdminApiKey: boolean;
  isLoopback: boolean;
}

export interface CloudPlatformOptions {
  store?: CloudStore;
  now?: () => Date;
  defaultAccountId?: string;
  defaultVaultId?: string;
  /**
   * Optional intelligence wrapper used by `processCaptureJob` to enrich
   * captured sessions into Memory Inbox candidates. When omitted the platform
   * builds a `ModelGateway` backed by the noop provider, so the worker still
   * runs and produces rule-based candidates without any cloud key.
   *
   * Pass a custom `ModelGateway` (with a mock or real provider) in tests, or a
   * full provider via `modelProvider`.
   */
  modelGateway?: ModelGateway;
  /**
   * Optional model provider. When `modelGateway` is omitted but a provider is
   * supplied, the platform wraps it in a default `ModelGateway`. This lets
   * callers swap a real cloud provider in without rebuilding budget logic.
   */
  modelProvider?: ModelProvider;
  /**
   * Optional activation telemetry sink. The default sink is an in-memory ring
   * buffer suitable for tests and beta operator inspection. Production sinks
   * can subclass `ActivationTelemetrySink` to forward events to a durable
   * privacy-safe analytics warehouse, but the contract guarantees raw memory
   * content never enters the sink.
   */
  activationTelemetry?: ActivationTelemetrySink;
  /**
   * Override for `readFeatureFlags()`. When omitted, every platform call reads
   * the live env so operators can flip kill switches without restarting the
   * process. Tests pass a frozen snapshot to exercise specific flag paths.
   */
  featureFlagsProvider?: () => FeatureFlagSnapshot;
  /**
   * Override for the install-token issuance quota. Defaults read the live env
   * so operators can adjust caps without a deploy. Tests pass a frozen config
   * to drive per-account / per-vault quota assertions deterministically.
   */
  installTokenQuotaProvider?: () => InstallTokenQuotaConfig;
}

export interface InstallTokenQuotaConfig {
  /** Max install tokens any one account can mint within the rolling hour window. */
  perAccountPerHour: number;
  /** Max install tokens any one account can mint within the rolling day window. */
  perAccountPerDay: number;
  /** Max install tokens any one vault can mint within the rolling hour window. */
  perVaultPerHour: number;
  /** Max install tokens any one vault can mint within the rolling day window. */
  perVaultPerDay: number;
}

interface InstallTokenAttempt {
  accountId: string;
  vaultId: string;
  at: number;
}

export class CloudPlatform {
  readonly store: CloudStore;
  readonly activationTelemetry: ActivationTelemetrySink;
  private readonly now: () => Date;
  private readonly defaultAccountId: string;
  private readonly defaultVaultId: string;
  private readonly modelGateway: ModelGateway;
  private readonly featureFlagsProvider: () => FeatureFlagSnapshot;
  private readonly installTokenQuotaProvider: () => InstallTokenQuotaConfig;
  private installTokenAttempts: InstallTokenAttempt[] = [];
  private bootstrapPromise?: Promise<{ account: CloudAccountRecord; vault: CloudVaultRecord }>;

  constructor(options: CloudPlatformOptions = {}) {
    this.store = options.store ?? new InMemoryCloudStore();
    this.now = options.now ?? (() => new Date());
    this.defaultAccountId = options.defaultAccountId ?? "acct_local";
    this.defaultVaultId = options.defaultVaultId ?? "vault_local";
    // Default to a Noop-backed gateway so processCaptureJob runs without any
    // cloud key in dev, tests, and offline beta installs. Tests inject a
    // custom gateway/provider to exercise success/failure paths.
    this.modelGateway = options.modelGateway
      ?? new ModelGateway(options.modelProvider ? { provider: options.modelProvider } : {});
    this.activationTelemetry = options.activationTelemetry ?? new ActivationTelemetrySink({ now: this.now });
    this.featureFlagsProvider = options.featureFlagsProvider ?? (() => readFeatureFlags(process.env));
    this.installTokenQuotaProvider = options.installTokenQuotaProvider
      ?? (() => readInstallTokenQuotaConfig(process.env));
  }

  featureFlags(): FeatureFlagSnapshot {
    return this.featureFlagsProvider();
  }

  /**
   * Reject the request when the named feature flag is disabled. When the
   * underlying killswitch is off (e.g. captureIngest=false) the dashboard sees
   * a deterministic 503 with code `feature_flag.<name>_disabled`, which lets
   * the operator banner explain the maintenance state without leaking secrets.
   */
  private requireFeatureEnabled(flag: keyof FeatureFlagSnapshot, code: string): void {
    const snapshot = this.featureFlags();
    if (!snapshot[flag]) {
      throw new CloudError(code, `feature ${String(flag)} is disabled by operator kill switch`, 503);
    }
  }

  /**
   * Reject capture ingest when the master `captureIngest` switch is off, or
   * when the per-provider switch (captureClaudeCode/Codex/Cursor/Opencode) is
   * off. Provider lookup is best-effort: when the caller doesn't supply a
   * provider id (or it doesn't map to a known kill switch) only the master
   * switch is consulted.
   */
  private requireCaptureEnabled(provider: string | null | undefined, fallback?: string | null | undefined): void {
    const snapshot = this.featureFlags();
    if (!snapshot.captureIngest) {
      throw new CloudError(
        "capture.feature_disabled",
        "capture ingest is disabled by operator kill switch",
        503
      );
    }
    const candidates: string[] = [];
    if (typeof provider === "string" && provider.length > 0) candidates.push(provider);
    if (typeof fallback === "string" && fallback.length > 0) candidates.push(fallback);
    for (const candidate of candidates) {
      const flag: FeatureFlagName | undefined = captureProviderFlag(candidate);
      if (flag && !snapshot[flag]) {
        throw new CloudError(
          "capture.provider_disabled",
          `capture provider ${candidate} is disabled by operator kill switch`,
          503
        );
      }
    }
  }

  /**
   * Per-account / per-vault install-token throttle. The platform method itself
   * is unthrottled so admin/loopback paths and direct test seeding aren't
   * blocked, but the public HTTP handler routes through this gate to ensure a
   * signed-in browser cannot mint tokens past the configured caps.
   */
  private enforceInstallTokenQuota(input: { accountId: string; vaultId: string }): void {
    const config = this.installTokenQuotaProvider();
    const now = this.now().getTime();
    const HOUR_MS = 60 * 60 * 1000;
    const DAY_MS = 24 * HOUR_MS;

    // Garbage collect anything older than a day so the in-memory ring stays bounded.
    if (this.installTokenAttempts.length > 0) {
      this.installTokenAttempts = this.installTokenAttempts.filter((entry) => now - entry.at < DAY_MS);
    }

    let accountHour = 0;
    let accountDay = 0;
    let vaultHour = 0;
    let vaultDay = 0;
    for (const entry of this.installTokenAttempts) {
      const age = now - entry.at;
      if (age >= DAY_MS) continue;
      if (entry.accountId === input.accountId) {
        accountDay += 1;
        if (age < HOUR_MS) accountHour += 1;
      }
      if (entry.vaultId === input.vaultId) {
        vaultDay += 1;
        if (age < HOUR_MS) vaultHour += 1;
      }
    }

    const breach = (used: number, cap: number): boolean => Number.isFinite(cap) && cap > 0 && used >= cap;
    if (
      breach(accountHour, config.perAccountPerHour) ||
      breach(vaultHour, config.perVaultPerHour) ||
      breach(accountDay, config.perAccountPerDay) ||
      breach(vaultDay, config.perVaultPerDay)
    ) {
      throw new CloudError(
        "cloud.token_quota_exceeded",
        "install-token issuance throttled; try again later",
        429,
        { "retry-after": "3600" }
      );
    }
    this.installTokenAttempts.push({ accountId: input.accountId, vaultId: input.vaultId, at: now });
  }

  /**
   * Privacy-safe activation telemetry emit that never throws back into the
   * request path. Raw memory/session content is never passed in — callers
   * provide only whitelisted scalar metadata fields handled by
   * `ActivationTelemetrySink.sanitizeMetadata`.
   */
  private emitActivationEvent(input: ActivationEventInput, context: { vaultId?: string; accountId?: string; sessionHashPrefix?: string } = {}): void {
    try {
      this.activationTelemetry.record(input, context);
    } catch {
      // Telemetry must never break a user-facing request.
    }
  }

  private async bootstrap() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.store
        .ready()
        .then(() =>
          this.store.ensureBootstrap({
            defaultAccountId: this.defaultAccountId,
            defaultVaultId: this.defaultVaultId,
            now: this.now().toISOString()
          })
        );
    }
    return this.bootstrapPromise;
  }

  async defaultVault(): Promise<CloudVaultRecord> {
    const { vault } = await this.bootstrap();
    return vault;
  }

  async listVaultsForAccount(accountId: string): Promise<CloudVaultRecord[]> {
    await this.bootstrap();
    return this.store.listVaultsForAccount(accountId);
  }

  // === token lifecycle ===

  async issueInstallToken(input: { vaultId?: string; accountId?: string } = {}): Promise<CloudIssuedToken> {
    await this.bootstrap();
    const vaultId = input.vaultId ?? this.defaultVaultId;
    const vault = await this.store.getVault(vaultId);
    if (!vault) {
      throw new CloudError("cloud.vault_not_found", `vault ${vaultId} not found`, 404);
    }
    if (input.accountId && input.accountId !== vault.accountId) {
      throw new CloudError("cloud.account_mismatch", "account does not own vault", 403);
    }
    const issued = await this.persistToken({
      kind: "install",
      vaultId: vault.id,
      accountId: vault.accountId,
      ttlMs: INSTALL_TOKEN_TTL_MS,
      singleUse: true,
      scopes: ["device.pair"]
    });
    await this.recordAudit({
      vaultId: vault.id,
      accountId: vault.accountId,
      action: "cloud.install_token.issued",
      targetType: "cloud_token",
      targetId: issued.record.id
    });
    return issued;
  }

  async redeemInstallToken(plaintext: string, deviceInput: { label?: string; platform?: string }): Promise<{
    device: CloudDeviceRecord;
    deviceToken: CloudIssuedToken;
    serviceToken: CloudIssuedToken;
    vault: CloudVaultRecord;
  }> {
    await this.bootstrap();
    const record = await this.requireToken(plaintext, "install");
    const vault = await this.store.getVault(record.vaultId);
    if (!vault) {
      throw new CloudError("cloud.vault_not_found", "vault not found", 404);
    }

    const usedAt = this.now().toISOString();
    await this.store.markTokenUsed(record.tokenHash, usedAt);

    const device: CloudDeviceRecord = {
      id: `dev_${randomUUID()}`,
      vaultId: vault.id,
      accountId: vault.accountId,
      label: deviceInput.label ?? null,
      platform: deviceInput.platform ?? null,
      status: "active",
      pairedAt: usedAt,
      lastSeenAt: usedAt,
      revokedAt: null
    };
    await this.store.saveDevice(device);

    const deviceToken = await this.persistToken({
      kind: "device",
      vaultId: vault.id,
      accountId: vault.accountId,
      deviceId: device.id,
      ttlMs: DEVICE_TOKEN_TTL_MS,
      scopes: ["capture.write", "capture.read", "device.self"]
    });
    const serviceToken = await this.persistToken({
      kind: "service",
      vaultId: vault.id,
      accountId: vault.accountId,
      deviceId: device.id,
      ttlMs: SERVICE_TOKEN_TTL_MS,
      scopes: ["mcp.read", "mcp.write"]
    });

    await this.recordAudit({
      vaultId: vault.id,
      accountId: vault.accountId,
      actorId: device.id,
      actorKind: "device",
      action: "cloud.device.paired",
      targetType: "device",
      targetId: device.id,
      metadata: { label: device.label, platform: device.platform }
    });

    return { device, deviceToken, serviceToken, vault };
  }

  async rotateToken(plaintext: string): Promise<CloudIssuedToken> {
    await this.bootstrap();
    const existing = await this.requireToken(plaintext);
    if (existing.kind === "install") {
      throw new CloudError("cloud.rotate_unsupported", "install tokens cannot be rotated", 400);
    }
    const revokedAt = this.now().toISOString();
    await this.store.markTokenRevoked(existing.tokenHash, revokedAt);
    const ttlMs =
      existing.kind === "device" ? DEVICE_TOKEN_TTL_MS :
      existing.kind === "service" ? SERVICE_TOKEN_TTL_MS :
      existing.kind === "agent" ? SERVICE_TOKEN_TTL_MS :
      SESSION_TOKEN_TTL_MS;
    const next = await this.persistToken({
      kind: existing.kind,
      vaultId: existing.vaultId,
      accountId: existing.accountId,
      deviceId: existing.deviceId ?? undefined,
      agentId: existing.agentId ?? undefined,
      ttlMs,
      scopes: existing.scopes,
      rotatedFrom: existing.id
    });
    await this.recordAudit({
      vaultId: existing.vaultId,
      accountId: existing.accountId,
      actorId: existing.deviceId ?? null,
      actorKind: existing.deviceId ? "device" : null,
      action: "cloud.token.rotated",
      targetType: "cloud_token",
      targetId: next.record.id,
      metadata: { previousTokenId: existing.id, kind: existing.kind }
    });
    return next;
  }

  async revokeToken(plaintext: string): Promise<{ revoked: boolean; tokenId?: string; kind?: CloudTokenKind }> {
    await this.bootstrap();
    const tokenHash = hashToken(plaintext);
    const record = await this.store.findTokenByHash(tokenHash);
    if (!record) {
      return { revoked: false };
    }
    if (record.revokedAt) {
      return { revoked: false, tokenId: record.id, kind: record.kind };
    }
    const revokedAt = this.now().toISOString();
    await this.store.markTokenRevoked(tokenHash, revokedAt);
    if (record.deviceId && record.kind === "device") {
      await this.store.markDeviceRevoked(record.deviceId, revokedAt);
    }
    await this.recordAudit({
      vaultId: record.vaultId,
      accountId: record.accountId,
      actorId: record.deviceId ?? null,
      actorKind: record.deviceId ? "device" : null,
      action: "cloud.token.revoked",
      targetType: "cloud_token",
      targetId: record.id,
      metadata: { kind: record.kind }
    });
    return { revoked: true, tokenId: record.id, kind: record.kind };
  }

  async authenticate(plaintext: string): Promise<CloudAuthContext> {
    await this.bootstrap();
    const record = await this.requireToken(plaintext);
    if (record.kind === "install") {
      throw new CloudError("cloud.token_kind_invalid", "install token cannot authorize requests", 401);
    }
    if (record.deviceId) {
      const device = await this.store.getDevice(record.deviceId);
      // Treat a device that was revoked but still has a live (non-revoked)
      // token row as a hard failure: a revoked device must not authorize.
      if (device?.status === "revoked") {
        throw new CloudError("cloud.device_revoked", "device has been revoked", 401);
      }
      await this.store.updateDeviceLastSeen(record.deviceId, this.now().toISOString());
    }
    return {
      vaultId: record.vaultId,
      accountId: record.accountId,
      deviceId: record.deviceId ?? undefined,
      tokenKind: record.kind,
      scopes: record.scopes
    };
  }

  async whoami(auth: CloudAuthContext): Promise<{
    account: CloudAccountRecord;
    vault: CloudVaultRecord;
    device: CloudDeviceRecord | undefined;
    tokenKind: CloudTokenKind;
    scopes: string[];
  }> {
    const account = await this.store.getAccount(auth.accountId);
    const vault = await this.store.getVault(auth.vaultId);
    if (!account || !vault) {
      throw new CloudError("cloud.identity_missing", "account or vault missing", 404);
    }
    const device = auth.deviceId ? await this.store.getDevice(auth.deviceId) : undefined;
    return { account, vault, device, tokenKind: auth.tokenKind, scopes: auth.scopes };
  }

  // === capture surface ===

  async recordHeartbeat(input: {
    auth: CloudAuthContext;
    sourceId: string;
    sourceType?: string;
    sourceProvider?: string;
    sourceRef?: string;
    status?: CaptureSourceRecord["status"];
    error?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<CaptureSourceRecord> {
    await this.bootstrap();
    const now = this.now().toISOString();
    const existing = await this.store.getCaptureSource(input.sourceId);
    if (existing && existing.vaultId !== input.auth.vaultId) {
      throw new CloudError("cloud.cross_vault_denied", "capture source belongs to another vault", 403);
    }
    const merged: CaptureSourceRecord = existing
      ? {
          ...existing,
          deviceId: input.auth.deviceId ?? existing.deviceId,
          sourceType: input.sourceType ?? existing.sourceType,
          sourceProvider: input.sourceProvider ?? existing.sourceProvider,
          sourceRef: input.sourceRef ?? existing.sourceRef,
          status: input.status ?? existing.status,
          lastHeartbeatAt: now,
          lastError: input.error === undefined ? existing.lastError : input.error,
          metadata: { ...existing.metadata, ...(input.metadata ?? {}) },
          updatedAt: now
        }
      : {
          id: input.sourceId,
          vaultId: input.auth.vaultId,
          deviceId: input.auth.deviceId ?? null,
          sourceType: input.sourceType ?? "agent_session",
          sourceProvider: input.sourceProvider ?? null,
          sourceRef: input.sourceRef ?? null,
          status: input.status ?? "active",
          lastHeartbeatAt: now,
          lastError: input.error ?? null,
          metadata: input.metadata ?? {},
          createdAt: now,
          updatedAt: now
        };
    const saved = await this.store.upsertCaptureSource(merged);
    await this.recordUsage({
      vaultId: saved.vaultId,
      accountId: input.auth.accountId,
      eventType: "capture.heartbeat",
      units: 1,
      metadata: { sourceId: saved.id, status: saved.status }
    });
    if (!existing) {
      this.emitActivationEvent(
        {
          event: "first_source_connected",
          surface: "capture",
          metadata: {
            provider: saved.sourceProvider ?? undefined,
            source: "heartbeat",
            sourceStatus: saved.status
          }
        },
        { vaultId: saved.vaultId, accountId: input.auth.accountId }
      );
    }
    return saved;
  }

  // V0.8 capture session ingestion. Implements:
  //   - vault scope check via `auth.vaultId`;
  //   - paused-source rejection (409 by contract — daemon retries should not
  //     auto-fire when the user has explicitly paused);
  //   - raw_archive policy enforcement (only when vault flag is enabled);
  //   - idempotency dedup by `idempotencyKey` so duplicate uploads return the
  //     same `session.id` and `job.id` without enqueueing duplicate work.
  async enqueueSession(input: {
    auth: CloudAuthContext;
    sourceId: string;
    provider: string;
    sourceOriginalId: string;
    contentHash: string;
    idempotencyKey: string;
    captureMode: CapturedSession["captureMode"];
    startedAt?: string;
    endedAt?: string;
    redaction: CapturedSession["redaction"];
    metadata: Record<string, unknown>;
    turnSummary: Array<{ role: string; text: string }>;
    rawTurns?: unknown[];
  }): Promise<{ session: CapturedSessionRecord; job: CaptureJobRecord; duplicate: boolean }> {
    await this.bootstrap();
    const vault = await this.store.getVault(input.auth.vaultId);
    if (!vault) {
      throw new CloudError("cloud.vault_missing", "vault missing for capture session", 404);
    }

    // 1. Idempotency: same key returns same session + job, no new state.
    const existingSession = await this.store.getCapturedSessionByIdempotency(input.auth.vaultId, input.idempotencyKey);
    if (existingSession) {
      const existingJob = await this.store.getCaptureJobBySession(existingSession.id);
      if (existingJob) {
        return { session: existingSession, job: existingJob, duplicate: true };
      }
    }

    // 2. Source must exist and not be paused. Auto-create if missing — the
    //    bridge calls `enqueueSession` directly when the daemon has not yet
    //    sent a heartbeat.
    let source = await this.store.getCaptureSource(input.sourceId);
    if (source && source.vaultId !== input.auth.vaultId) {
      throw new CloudError("cloud.cross_vault_denied", "capture source belongs to another vault", 403);
    }
    if (!source) {
      source = await this.recordHeartbeat({
        auth: input.auth,
        sourceId: input.sourceId,
        sourceProvider: input.provider,
        sourceType: "agent_session",
        status: "active"
      });
    }
    if (source.status === "paused") {
      throw new CloudError(
        "capture.source_paused",
        `capture source ${input.sourceId} is paused; resume before uploading`,
        409
      );
    }

    // 3. Raw archive enforcement (PRD §8.5 — summary-only is the default;
    //    raw_archive requires vault flag). Private mode is allowed but its
    //    payload is expected to be empty.
    if (input.captureMode === "raw_archive" && !vault.rawArchiveEnabled) {
      throw new CloudError(
        "capture.raw_archive_not_allowed",
        "raw_archive uploads require the vault rawArchiveEnabled flag",
        409
      );
    }

    // 4. Persist session + enqueue extraction job.
    const now = this.now().toISOString();
    const session: CapturedSessionRecord = {
      id: `sess_${randomUUID()}`,
      vaultId: input.auth.vaultId,
      sourceId: input.sourceId,
      deviceId: input.auth.deviceId ?? null,
      provider: input.provider,
      sourceOriginalId: input.sourceOriginalId,
      contentHash: input.contentHash,
      idempotencyKey: input.idempotencyKey,
      captureMode: input.captureMode,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      redaction: input.redaction,
      metadata: input.metadata,
      turnSummary: input.turnSummary,
      rawTurns: input.captureMode === "raw_archive" ? input.rawTurns : undefined,
      receivedAt: now
    };
    await this.store.saveCapturedSession(session);

    const job: CaptureJobRecord = {
      id: `job_${randomUUID()}`,
      vaultId: session.vaultId,
      sessionId: session.id,
      type: "session.ingest",
      status: "pending",
      attempts: 0,
      payload: { idempotencyKey: session.idempotencyKey, contentHash: session.contentHash },
      error: null,
      createdAt: now,
      updatedAt: now,
      lockedBy: null,
      lockedAt: null,
      nextRunAt: now
    };
    await this.store.saveCaptureJob(job);

    return { session, job, duplicate: false };
  }

  async getSession(auth: CloudAuthContext, sessionId: string): Promise<CapturedSessionRecord> {
    await this.bootstrap();
    const session = await this.store.getCapturedSession(sessionId);
    if (!session) {
      throw new CloudError("cloud.session_not_found", `captured session ${sessionId} not found`, 404);
    }
    if (session.vaultId !== auth.vaultId) {
      throw new CloudError("cloud.cross_vault_denied", "captured session belongs to another vault", 403);
    }
    return session;
  }

  // Used by tests/lanes to seed a job for lookup verification.
  async enqueueStubJob(input: {
    vaultId: string;
    type: string;
    sessionId?: string;
    payload?: Record<string, unknown>;
  }): Promise<CaptureJobRecord> {
    await this.bootstrap();
    const now = this.now().toISOString();
    const job: CaptureJobRecord = {
      id: `job_${randomUUID()}`,
      vaultId: input.vaultId,
      sessionId: input.sessionId ?? null,
      type: input.type,
      status: "pending",
      attempts: 0,
      payload: input.payload ?? {},
      error: null,
      createdAt: now,
      updatedAt: now
    };
    await this.store.saveCaptureJob(job);
    return job;
  }

  async getJob(auth: CloudAuthContext, jobId: string): Promise<CaptureJobRecord> {
    await this.bootstrap();
    const job = await this.store.getCaptureJob(jobId);
    if (!job) {
      throw new CloudError("cloud.job_not_found", `capture job ${jobId} not found`, 404);
    }
    if (job.vaultId !== auth.vaultId) {
      throw new CloudError("cloud.cross_vault_denied", "capture job belongs to another vault", 403);
    }
    return job;
  }

  // Worker-style entrypoint that turns a pending capture job into a Memory
  // Inbox candidate. Loaded by the cloud-side queue (or by tests) after
  // `enqueueSession` has acknowledged the upload — `enqueueSession` itself
  // never blocks on model work so the capture-ack p95 budget stays small.
  //
  // Invariants:
  //   * Candidates are ALWAYS persisted with status = "pending". The worker
  //     never auto-promotes a candidate to a trusted memory; that requires
  //     explicit reviewer approval through governance APIs.
  //   * The model gateway is optional. When the configured provider is
  //     unavailable (default `NoopProvider`) or returns a fallback, the
  //     candidate is still produced from rule-based heuristics and the
  //     metadata is flagged `degraded: true` + `ruleBasedFallback: true` so
  //     the dashboard banner reflects the fallback mode.
  //   * Paused sources skip extraction entirely. The job is marked failed
  //     with `failureReason: "source_paused"` and no candidate row is saved.
  //   * Private-mode sessions never expose content. The candidate row is
  //     created so reviewers can confirm it was captured, but the content
  //     is empty and `metadata.privateMode = true`.
  //   * Calls are idempotent: re-running a completed job returns the
  //     previously stored candidate without doing any model work again.
  async processCaptureJob(jobId: string): Promise<CaptureJobOutcome> {
    await this.bootstrap();
    const existing = await this.store.getCaptureJob(jobId);
    if (!existing) {
      throw new CloudError("cloud.job_not_found", `capture job ${jobId} not found`, 404);
    }

    if (existing.status !== "pending") {
      const candidateId = readCandidateIdFromPayload(existing.payload);
      const candidate = candidateId ? await this.store.getMemoryCandidate(candidateId) : null;
      return {
        job: existing,
        candidate,
        degraded: Boolean((existing.payload as Record<string, unknown>).degraded),
        ruleBasedFallback: Boolean((existing.payload as Record<string, unknown>).ruleBasedFallback),
        failureReason: typeof existing.payload.failureReason === "string"
          ? (existing.payload.failureReason as string)
          : null,
        modelError: existing.error ?? null
      };
    }

    if (!existing.sessionId) {
      const failed = await this.markJobFailed(existing, {
        error: "capture job has no associated session id",
        failureReason: "session_missing"
      });
      return { job: failed, candidate: null, degraded: true, ruleBasedFallback: true, failureReason: "session_missing", modelError: failed.error ?? null };
    }

    const session = await this.store.getCapturedSession(existing.sessionId);
    if (!session) {
      const failed = await this.markJobFailed(existing, {
        error: `captured session ${existing.sessionId} not found`,
        failureReason: "session_missing"
      });
      return { job: failed, candidate: null, degraded: true, ruleBasedFallback: true, failureReason: "session_missing", modelError: failed.error ?? null };
    }

    const source = await this.store.getCaptureSource(session.sourceId);
    if (source?.status === "paused") {
      const failed = await this.markJobFailed(existing, {
        error: `capture source ${session.sourceId} is paused; resume before processing`,
        failureReason: "source_paused"
      });
      return { job: failed, candidate: null, degraded: true, ruleBasedFallback: true, failureReason: "source_paused", modelError: failed.error ?? null };
    }

    // Build the rule-based baseline first so we always have something concrete
    // even when the model returns a fallback or throws.
    const ruleBased = buildRuleBasedCandidate(session);

    // Private mode: never send content to the model. Save a suppressed
    // placeholder so reviewers see the capture happened.
    if (session.captureMode === "private_mode") {
      const candidate = await this.persistCandidate({
        session,
        content: "",
        title: ruleBased.title,
        confidence: 0,
        metadata: {
          ...ruleBased.metadata,
          privateMode: true,
          degraded: true,
          ruleBasedFallback: true,
          provenance: this.idleProvenance("private_mode")
        }
      });
      const completed = await this.markJobCompleted(existing, {
        candidateId: candidate.id,
        degraded: true,
        ruleBasedFallback: true,
        provenance: this.idleProvenance("private_mode"),
        privateMode: true
      });
      return { job: completed, candidate, degraded: true, ruleBasedFallback: true, failureReason: null, modelError: null };
    }

    // The text we send to the gateway is built from `turnSummary`, which the
    // capture pipeline has already redacted. We never send `rawTurns`.
    const enrichmentText = session.turnSummary
      .map((turn) => `${turn.role}: ${turn.text}`)
      .join("\n")
      .trim();

    const flags = this.featureFlags();
    let modelTitle: string | null = null;
    let modelSummary: string | null = null;
    let modelDegraded = !flags.modelGateway || !this.modelGateway.isEnabled;
    let modelError: string | null = null;
    let provenance: ModelProvenance | null = null;

    if (!flags.modelGateway) {
      // Operator kill switch is off: keep the rule-based fallback intact and
      // record provenance="disabled" so dashboards can explain the degraded state.
      modelError = "model gateway disabled by operator kill switch";
      provenance = this.idleProvenance("disabled");
    } else if (enrichmentText.length > 0) {
      try {
        const titleResult = await this.modelGateway.generateTitle(enrichmentText);
        provenance = titleResult.provenance;
        if (titleResult.ok && titleResult.value && titleResult.value.title.trim().length > 0) {
          modelTitle = titleResult.value.title.trim();
        } else if (titleResult.fallback) {
          modelDegraded = true;
          if (titleResult.error) modelError = titleResult.error;
        }

        const summaryResult = await this.modelGateway.generateSummary(enrichmentText, 200);
        // Latest provenance wins so we record the real timing of the longer call.
        provenance = summaryResult.provenance ?? provenance;
        if (summaryResult.ok && summaryResult.value && summaryResult.value.summary.trim().length > 0) {
          modelSummary = summaryResult.value.summary.trim();
        } else if (summaryResult.fallback) {
          modelDegraded = true;
          if (!modelError && summaryResult.error) modelError = summaryResult.error;
        }
      } catch (err) {
        modelDegraded = true;
        modelError = err instanceof Error ? err.message : String(err);
      }
    } else {
      modelDegraded = true;
      modelError = "no enrichment text after redaction";
    }

    const ruleBasedFallback = modelDegraded || modelSummary === null;
    const candidate = await this.persistCandidate({
      session,
      content: modelSummary ?? ruleBased.content,
      title: modelTitle ?? ruleBased.title,
      confidence: ruleBased.confidence,
      metadata: {
        ...ruleBased.metadata,
        provenance: provenance ?? this.idleProvenance("noop"),
        degraded: modelDegraded,
        ruleBasedFallback,
        modelError: modelError ?? null
      }
    });

    const completed = await this.markJobCompleted(existing, {
      candidateId: candidate.id,
      degraded: modelDegraded,
      ruleBasedFallback,
      provenance: provenance ?? this.idleProvenance("noop"),
      modelError
    });

    return {
      job: completed,
      candidate,
      degraded: modelDegraded,
      ruleBasedFallback,
      failureReason: null,
      modelError
    };
  }

  private async persistCandidate(input: {
    session: CapturedSessionRecord;
    content: string;
    title: string;
    confidence: number;
    metadata: Record<string, unknown>;
  }): Promise<MemoryCandidateRecord> {
    const now = this.now().toISOString();
    const candidate: MemoryCandidateRecord = {
      id: candidateIdFromIdempotencyKey(input.session.idempotencyKey),
      vaultId: input.session.vaultId,
      sourceId: input.session.sourceId,
      sessionId: input.session.id,
      externalEventId: input.session.sourceOriginalId,
      content: input.content,
      memoryType: "session_summary",
      // Hard invariant: never auto-approve. Reviewer must promote candidates
      // to memories through governance APIs.
      status: "pending",
      riskTags: [],
      confidence: input.confidence,
      metadata: {
        title: input.title,
        provider: input.session.provider,
        captureMode: input.session.captureMode,
        turnCount: input.session.turnSummary.length,
        redaction: input.session.redaction,
        idempotencyKey: input.session.idempotencyKey,
        contentHash: input.session.contentHash,
        ...input.metadata
      },
      createdAt: now,
      updatedAt: now
    };
    await this.store.saveMemoryCandidate(candidate);
    this.emitActivationEvent(
      {
        event: "first_candidate_seen",
        surface: "memory_inbox",
        metadata: {
          provider: input.session.provider,
          captureMode: input.session.captureMode,
          candidateStatus: candidate.status
        }
      },
      { vaultId: candidate.vaultId }
    );
    return candidate;
  }

  private async markJobCompleted(job: CaptureJobRecord, payload: Record<string, unknown>): Promise<CaptureJobRecord> {
    const next: CaptureJobRecord = {
      ...job,
      status: "completed",
      attempts: job.attempts + 1,
      payload: { ...job.payload, ...payload },
      error: null,
      updatedAt: this.now().toISOString(),
      lockedBy: null,
      lockedAt: null
    };
    await this.store.saveCaptureJob(next);
    return next;
  }

  private async markJobFailed(job: CaptureJobRecord, options: { error: string; failureReason: string }): Promise<CaptureJobRecord> {
    const next: CaptureJobRecord = {
      ...job,
      status: "failed",
      attempts: job.attempts + 1,
      payload: { ...job.payload, failureReason: options.failureReason, degraded: true, ruleBasedFallback: true },
      error: options.error,
      updatedAt: this.now().toISOString(),
      lockedBy: null,
      lockedAt: null
    };
    await this.store.saveCaptureJob(next);
    return next;
  }

  private idleProvenance(reason: "noop" | "private_mode" | "disabled"): ModelProvenance {
    return {
      provider: "noop",
      generatedAt: this.now().toISOString(),
      durationMs: 0,
      model: reason
    };
  }

  // === v0.9 source registry ===

  async listSources(auth: CloudAuthContext, options: { limit?: number; status?: SourceStatus } = {}): Promise<CaptureSourceRecord[]> {
    await this.bootstrap();
    return this.store.listCaptureSources(auth.vaultId, options);
  }

  async registerSource(input: {
    auth: CloudAuthContext;
    sourceId?: string;
    sourceType: string;
    sourceProvider: string;
    sourceRef?: string;
    displayName?: string;
    rawArchivePolicy?: RawArchivePolicy;
    permissions?: SourcePermissionEnvelope[];
    metadata?: Record<string, unknown>;
  }): Promise<CaptureSourceRecord> {
    await this.bootstrap();
    const now = this.now().toISOString();
    const sourceId = input.sourceId ?? `src_${randomUUID()}`;
    const existing = await this.store.getCaptureSource(sourceId);
    if (existing && existing.vaultId !== input.auth.vaultId) {
      throw new CloudError("cloud.cross_vault_denied", "source id collides with another vault", 403);
    }
    const policyMetadata = {
      ...(existing?.metadata ?? {}),
      ...(input.metadata ?? {}),
      displayName: input.displayName ?? existing?.metadata?.displayName ?? null,
      rawArchivePolicy: input.rawArchivePolicy ?? existing?.metadata?.rawArchivePolicy ?? "summary_only"
    };
    const merged: CaptureSourceRecord = existing
      ? {
          ...existing,
          deviceId: input.auth.deviceId ?? existing.deviceId,
          sourceType: input.sourceType,
          sourceProvider: input.sourceProvider,
          sourceRef: input.sourceRef ?? existing.sourceRef,
          status: existing.status === "revoked" ? "active" : existing.status,
          metadata: policyMetadata,
          updatedAt: now
        }
      : {
          id: sourceId,
          vaultId: input.auth.vaultId,
          deviceId: input.auth.deviceId ?? null,
          sourceType: input.sourceType,
          sourceProvider: input.sourceProvider,
          sourceRef: input.sourceRef ?? null,
          status: "active",
          lastHeartbeatAt: null,
          lastError: null,
          metadata: policyMetadata,
          createdAt: now,
          updatedAt: now
        };
    const saved = await this.store.upsertCaptureSource(merged);
    for (const perm of input.permissions ?? []) {
      const record: SourcePermissionRecord = {
        id: `perm_${randomUUID()}`,
        sourceId: saved.id,
        vaultId: saved.vaultId,
        permissionType: perm.permissionType,
        scope: perm.scope ?? null,
        value: perm.value,
        metadata: perm.metadata ?? {},
        grantedAt: now
      };
      await this.store.saveSourcePermission(record);
    }
    await this.recordAudit({
      vaultId: saved.vaultId,
      accountId: input.auth.accountId,
      actorId: input.auth.deviceId ?? null,
      actorKind: input.auth.deviceId ? "device" : null,
      action: existing ? "source.updated" : "source.registered",
      targetType: "capture_source",
      targetId: saved.id,
      metadata: { provider: input.sourceProvider, displayName: input.displayName ?? null }
    });
    if (!existing) {
      this.emitActivationEvent(
        {
          event: "first_source_connected",
          surface: "capture",
          metadata: {
            provider: saved.sourceProvider ?? undefined,
            source: "register",
            sourceStatus: saved.status
          }
        },
        { vaultId: saved.vaultId, accountId: input.auth.accountId }
      );
    }
    return saved;
  }

  async getSource(auth: CloudAuthContext, sourceId: string): Promise<CaptureSourceRecord> {
    await this.bootstrap();
    const source = await this.store.getCaptureSource(sourceId);
    if (!source) {
      throw new CloudError("cloud.source_not_found", `capture source ${sourceId} not found`, 404);
    }
    if (source.vaultId !== auth.vaultId) {
      throw new CloudError("cloud.cross_vault_denied", "capture source belongs to another vault", 403);
    }
    return source;
  }

  async updateSource(input: {
    auth: CloudAuthContext;
    sourceId: string;
    displayName?: string;
    rawArchivePolicy?: RawArchivePolicy;
    metadata?: Record<string, unknown>;
  }): Promise<CaptureSourceRecord> {
    const source = await this.getSource(input.auth, input.sourceId);
    const now = this.now().toISOString();
    const updated: CaptureSourceRecord = {
      ...source,
      metadata: {
        ...source.metadata,
        ...(input.metadata ?? {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.rawArchivePolicy !== undefined ? { rawArchivePolicy: input.rawArchivePolicy } : {})
      },
      updatedAt: now
    };
    const saved = await this.store.upsertCaptureSource(updated);
    await this.recordAudit({
      vaultId: saved.vaultId,
      accountId: input.auth.accountId,
      action: "source.metadata_updated",
      targetType: "capture_source",
      targetId: saved.id
    });
    return saved;
  }

  async pauseSource(auth: CloudAuthContext, sourceId: string): Promise<CaptureSourceRecord> {
    const source = await this.getSource(auth, sourceId);
    const now = this.now().toISOString();
    const updated = await this.store.upsertCaptureSource({
      ...source,
      status: "paused",
      metadata: { ...source.metadata, pausedAt: now },
      updatedAt: now
    });
    await this.recordAudit({
      vaultId: source.vaultId,
      accountId: auth.accountId,
      action: "source.paused",
      targetType: "capture_source",
      targetId: source.id
    });
    this.emitActivationEvent(
      {
        event: "first_trust_action",
        surface: "capture",
        metadata: { trustAction: "pause_source", provider: source.sourceProvider ?? undefined }
      },
      { vaultId: source.vaultId, accountId: auth.accountId }
    );
    return updated;
  }

  async resumeSource(auth: CloudAuthContext, sourceId: string): Promise<CaptureSourceRecord> {
    const source = await this.getSource(auth, sourceId);
    const now = this.now().toISOString();
    const next = { ...source.metadata };
    delete next.pausedAt;
    const updated = await this.store.upsertCaptureSource({
      ...source,
      status: "active",
      metadata: next,
      updatedAt: now
    });
    await this.recordAudit({
      vaultId: source.vaultId,
      accountId: auth.accountId,
      action: "source.resumed",
      targetType: "capture_source",
      targetId: source.id
    });
    return updated;
  }

  // === v0.9 capture event ingestion ===

  async ingestCaptureEvents(input: {
    auth: CloudAuthContext;
    sourceId: string;
    batchIdempotencyKey?: string;
    events: Array<{
      externalEventId?: string;
      eventType?: string;
      occurredAt?: string;
      actor?: string;
      contentRef?: Record<string, unknown>;
      redactionState?: CaptureEventRecord["redactionState"];
      idempotencyKey?: string;
      sessionId?: string;
      payload?: Record<string, unknown>;
    }>;
  }): Promise<{ batch: CaptureBatchRecord; accepted: number; deduped: number; events: CaptureEventRecord[] }> {
    await this.bootstrap();
    const source = await this.getSource(input.auth, input.sourceId);
    if (source.status === "paused") {
      throw new CloudError("capture.source_paused", `capture source ${source.id} is paused`, 409);
    }
    if (source.status === "private_mode") {
      throw new CloudError("capture.private_mode", `capture source ${source.id} is in private mode`, 409);
    }
    if (source.status === "revoked" || source.status === "error") {
      throw new CloudError("capture.source_unavailable", `capture source ${source.id} is ${source.status}`, 409);
    }

    if (input.batchIdempotencyKey) {
      const existing = await this.store.getCaptureBatchByIdempotency(input.auth.vaultId, input.batchIdempotencyKey);
      if (existing) {
        return { batch: existing, accepted: 0, deduped: input.events.length, events: [] };
      }
    }

    const now = this.now().toISOString();
    const batchId = `bch_${randomUUID()}`;
    const acceptedEvents: CaptureEventRecord[] = [];
    let deduped = 0;
    let bytes = 0;
    for (const candidate of input.events) {
      const occurredAt = candidate.occurredAt ?? now;
      const eventId = `evt_${randomUUID()}`;
      const event: CaptureEventRecord = {
        id: eventId,
        vaultId: input.auth.vaultId,
        sessionId: candidate.sessionId ?? null,
        sourceId: source.id,
        batchId,
        eventType: candidate.eventType ?? "session_delta",
        externalEventId: candidate.externalEventId ?? null,
        actor: candidate.actor ?? null,
        contentRef: candidate.contentRef ?? {},
        redactionState: candidate.redactionState ?? "redacted",
        idempotencyKey: candidate.idempotencyKey ?? null,
        payload: candidate.payload ?? {},
        occurredAt,
        createdAt: now
      };
      const saved = await this.store.saveCaptureEvent(event);
      if (saved.inserted) {
        acceptedEvents.push(saved.event);
        bytes += JSON.stringify(saved.event).length;
      } else {
        deduped += 1;
      }
    }

    const batch: CaptureBatchRecord = {
      id: batchId,
      vaultId: input.auth.vaultId,
      sourceId: source.id,
      deviceId: input.auth.deviceId ?? null,
      batchKind: "capture_event",
      eventCount: acceptedEvents.length,
      bytes,
      status: acceptedEvents.length > 0 ? "received" : "rejected",
      idempotencyKey: input.batchIdempotencyKey ?? null,
      metadata: { deduped },
      receivedAt: now
    };
    await this.store.saveCaptureBatch(batch);

    await this.recordUsage({
      vaultId: input.auth.vaultId,
      accountId: input.auth.accountId,
      eventType: "capture.event",
      units: acceptedEvents.length,
      metadata: { sourceId: source.id, batchId, deduped }
    });

    return { batch, accepted: acceptedEvents.length, deduped, events: acceptedEvents };
  }

  async ingestSessionDelta(input: {
    auth: CloudAuthContext;
    sourceId: string;
    sessionId: string;
    deltas: Array<{ idempotencyKey: string; occurredAt?: string; payload: Record<string, unknown> }>;
  }): Promise<{ accepted: number; deduped: number }> {
    await this.bootstrap();
    const source = await this.getSource(input.auth, input.sourceId);
    if (source.status === "paused" || source.status === "private_mode" || source.status === "revoked" || source.status === "error") {
      throw new CloudError(
        `capture.${source.status === "paused" ? "source_paused" : source.status === "private_mode" ? "private_mode" : "source_unavailable"}`,
        `capture source ${source.id} cannot accept session deltas (status=${source.status})`,
        409
      );
    }
    const now = this.now().toISOString();
    let accepted = 0;
    let deduped = 0;
    for (const delta of input.deltas) {
      const event: CaptureEventRecord = {
        id: `evt_${randomUUID()}`,
        vaultId: input.auth.vaultId,
        sessionId: input.sessionId,
        sourceId: source.id,
        batchId: null,
        eventType: "session_delta",
        externalEventId: null,
        actor: null,
        contentRef: { kind: "inline" },
        redactionState: "redacted",
        idempotencyKey: delta.idempotencyKey,
        payload: delta.payload,
        occurredAt: delta.occurredAt ?? now,
        createdAt: now
      };
      const saved = await this.store.saveCaptureEvent(event);
      if (saved.inserted) accepted += 1;
      else deduped += 1;
    }
    await this.recordUsage({
      vaultId: input.auth.vaultId,
      accountId: input.auth.accountId,
      eventType: "capture.event",
      units: accepted,
      metadata: { sourceId: source.id, sessionId: input.sessionId, deduped, kind: "session_delta" }
    });
    return { accepted, deduped };
  }

  // === v0.9 plan limits and usage snapshots ===

  async snapshotUsageLimits(auth: CloudAuthContext, periodIsoMonth: string): Promise<UsageLimitSnapshotRecord> {
    await this.bootstrap();
    const vault = await this.store.getVault(auth.vaultId);
    if (!vault) {
      throw new CloudError("cloud.vault_missing", "vault missing for usage snapshot", 404);
    }
    const limits = planLimitsFor(vault.plan);
    const ingest = await this.store.sumUsageEvents(auth.vaultId, "capture.tokens");
    const recall = await this.store.sumUsageEvents(auth.vaultId, "recall.request");
    const { periodStart, periodEnd } = monthBounds(periodIsoMonth);
    const record: UsageLimitSnapshotRecord = {
      id: `usl_${randomUUID()}`,
      vaultId: vault.id,
      accountId: vault.accountId,
      plan: vault.plan,
      periodStart,
      periodEnd,
      ingestTokenUsed: ingest,
      ingestTokenLimit: limits.ingestTokenLimit,
      recallUsed: recall,
      recallLimit: limits.recallLimit,
      agentCount: 0,
      agentLimit: limits.agentLimit,
      rawArchiveEnabled: vault.rawArchiveEnabled,
      metadata: {},
      observedAt: this.now().toISOString()
    };
    await this.store.saveUsageLimitSnapshot(record);
    return record;
  }

  async getUsageSummary(auth: CloudAuthContext, options: { limit?: number } = {}): Promise<{
    plan: string;
    snapshot: UsageLimitSnapshotRecord;
    events: UsageEventRecord[];
  }> {
    await this.bootstrap();
    const vault = await this.store.getVault(auth.vaultId);
    if (!vault) {
      throw new CloudError("cloud.vault_missing", "vault missing for usage summary", 404);
    }
    const periodIsoMonth = this.now().toISOString().slice(0, 7);
    const snapshot = await this.snapshotUsageLimits(auth, periodIsoMonth);
    const events = await this.store.listUsageEvents(auth.vaultId, options);
    return { plan: vault.plan, snapshot, events };
  }

  async checkPlanLimit(auth: CloudAuthContext, kind: "ingest" | "recall", requestedUnits: number): Promise<{
    allowed: boolean;
    plan: string;
    used: number;
    limit: number;
  }> {
    await this.bootstrap();
    const vault = await this.store.getVault(auth.vaultId);
    if (!vault) {
      throw new CloudError("cloud.vault_missing", "vault missing for plan check", 404);
    }
    const limits = planLimitsFor(vault.plan);
    const limit = kind === "ingest" ? limits.ingestTokenLimit : limits.recallLimit;
    const eventType = kind === "ingest" ? "capture.tokens" : "recall.request";
    const used = await this.store.sumUsageEvents(auth.vaultId, eventType);
    return { allowed: used + requestedUnits <= limit, plan: vault.plan, used, limit };
  }

  async operatorUsageRollup(options: { limit?: number } = {}): Promise<OperatorUsageRow[]> {
    await this.bootstrap();
    return this.store.operatorUsageRollup(options);
  }

  // === v0.9 source checkpoints (used by lane B watcher) ===

  async saveSourceCheckpoint(input: {
    auth: CloudAuthContext;
    sourceId: string;
    checkpointKey: string;
    offsetValue?: string;
    contentHash?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SourceCheckpointRecord> {
    const source = await this.getSource(input.auth, input.sourceId);
    const record: SourceCheckpointRecord = {
      id: `chk_${randomUUID()}`,
      sourceId: source.id,
      vaultId: source.vaultId,
      checkpointKey: input.checkpointKey,
      offsetValue: input.offsetValue ?? null,
      contentHash: input.contentHash ?? null,
      metadata: input.metadata ?? {},
      updatedAt: this.now().toISOString()
    };
    await this.store.saveSourceCheckpoint(record);
    return record;
  }

  async listSourceCheckpoints(auth: CloudAuthContext, sourceId: string): Promise<SourceCheckpointRecord[]> {
    await this.getSource(auth, sourceId);
    return this.store.listSourceCheckpoints(sourceId);
  }

  async listHostedMcpClients(auth: CloudAuthContext): Promise<HostedMcpClientRecord[]> {
    await this.bootstrap();
    return this.store.listHostedMcpClients(auth.vaultId);
  }

  // === v1.0 Memory Inbox & Recall ===

  async listMemoryCandidates(auth: CloudAuthContext, options: { status?: CandidateStatus; limit?: number } = {}) {
    return this.store.listMemoryCandidates(auth.vaultId, options);
  }

  async approveMemoryCandidate(auth: CloudAuthContext, candidateId: string) {
    const candidate = await this.store.getMemoryCandidate(candidateId);
    if (!candidate || candidate.vaultId !== auth.vaultId) {
      throw new CloudError("candidate.not_found", "Memory candidate not found", 404);
    }

    // In v1.0, approved candidates are converted to memory_records.
    // For MVP implementation in cloud.ts dispatcher:
    const now = this.now().toISOString();
    const actionId = `mra_${randomUUID()}`;
    await this.store.saveMemoryReviewAction({
      id: actionId,
      vaultId: auth.vaultId,
      candidateId: candidate.id,
      action: "approve",
      actorId: auth.accountId,
      actorKind: "user",
      metadata: {},
      createdAt: now
    });

    candidate.status = "approved";
    candidate.updatedAt = now;
    await this.store.saveMemoryCandidate(candidate);

    await this.recordAudit({
      vaultId: auth.vaultId,
      action: "memory.approve",
      targetType: "candidate",
      targetId: candidateId,
      metadata: { actionId }
    });

    this.emitActivationEvent(
      {
        event: "first_candidate_approved",
        surface: "memory_inbox",
        metadata: { trustAction: "approve", candidateStatus: candidate.status }
      },
      { vaultId: auth.vaultId, accountId: auth.accountId }
    );
    this.emitActivationEvent(
      {
        event: "first_trust_action",
        surface: "memory_inbox",
        metadata: { trustAction: "approve", candidateStatus: candidate.status }
      },
      { vaultId: auth.vaultId, accountId: auth.accountId }
    );
    return candidate;
  }

  async rejectMemoryCandidate(auth: CloudAuthContext, candidateId: string, options: { reason?: string } = {}) {
    const candidate = await this.requireOwnedCandidate(auth, candidateId);

    const now = this.now().toISOString();
    candidate.status = "rejected";
    candidate.updatedAt = now;
    if (options.reason) {
      candidate.metadata = { ...candidate.metadata, rejectReason: options.reason };
    }
    await this.store.saveMemoryCandidate(candidate);

    await this.store.saveMemoryReviewAction({
      id: `mra_${randomUUID()}`,
      vaultId: auth.vaultId,
      candidateId: candidate.id,
      action: "reject",
      actorId: auth.accountId,
      actorKind: "user",
      metadata: options.reason ? { reason: options.reason } : {},
      createdAt: now
    });

    this.emitActivationEvent(
      {
        event: "first_trust_action",
        surface: "memory_inbox",
        metadata: { trustAction: "reject", candidateStatus: candidate.status }
      },
      { vaultId: auth.vaultId, accountId: auth.accountId }
    );
    return candidate;
  }

  async editMemoryCandidate(
    auth: CloudAuthContext,
    candidateId: string,
    input: { content?: string; reason?: string }
  ): Promise<MemoryCandidateRecord> {
    const candidate = await this.requireOwnedCandidate(auth, candidateId);
    if (typeof input.content !== "string" || input.content.trim().length === 0) {
      throw new CloudError("candidate.content_required", "candidate content is required", 400);
    }
    const trimmed = input.content.trim();
    if (trimmed.length > 8192) {
      throw new CloudError("candidate.content_too_long", "candidate content must be under 8192 chars", 400);
    }

    const now = this.now().toISOString();
    const previousContent = candidate.content;
    candidate.content = trimmed;
    candidate.metadata = {
      ...candidate.metadata,
      editedAt: now,
      previousContentHash: hashShortText(previousContent),
      ...(input.reason ? { editReason: input.reason } : {})
    };
    candidate.status = "edited";
    candidate.updatedAt = now;
    await this.store.saveMemoryCandidate(candidate);
    await this.store.saveMemoryReviewAction({
      id: `mra_${randomUUID()}`,
      vaultId: auth.vaultId,
      candidateId: candidate.id,
      action: "edit",
      actorId: auth.accountId,
      actorKind: "user",
      metadata: input.reason ? { reason: input.reason } : {},
      createdAt: now
    });
    await this.recordAudit({
      vaultId: auth.vaultId,
      accountId: auth.accountId,
      action: "memory.edit",
      targetType: "candidate",
      targetId: candidate.id,
      metadata: { reason: input.reason ?? null }
    });
    return candidate;
  }

  async deleteMemoryCandidate(
    auth: CloudAuthContext,
    candidateId: string,
    options: { reason?: string } = {}
  ): Promise<MemoryCandidateRecord> {
    const candidate = await this.requireOwnedCandidate(auth, candidateId);
    if (candidate.status === "deleted") {
      return candidate;
    }
    const now = this.now().toISOString();
    candidate.status = "deleted";
    candidate.metadata = {
      ...candidate.metadata,
      deletedAt: now,
      ...(options.reason ? { deleteReason: options.reason } : {})
    };
    candidate.updatedAt = now;
    await this.store.saveMemoryCandidate(candidate);
    await this.store.saveMemoryReviewAction({
      id: `mra_${randomUUID()}`,
      vaultId: auth.vaultId,
      candidateId: candidate.id,
      action: "delete",
      actorId: auth.accountId,
      actorKind: "user",
      metadata: options.reason ? { reason: options.reason } : {},
      createdAt: now
    });
    await this.recordAudit({
      vaultId: auth.vaultId,
      accountId: auth.accountId,
      action: "memory.delete",
      targetType: "candidate",
      targetId: candidate.id,
      metadata: { reason: options.reason ?? null }
    });
    return candidate;
  }

  /**
   * Undo a prior approve/reject/edit/delete review action by returning the
   * candidate to `pending` state. The original review actions remain in the
   * audit trail so reviewers can see the full lifecycle.
   */
  async undoMemoryCandidate(
    auth: CloudAuthContext,
    candidateId: string,
    options: { reason?: string } = {}
  ): Promise<MemoryCandidateRecord> {
    const candidate = await this.requireOwnedCandidate(auth, candidateId);
    if (candidate.status === "pending") {
      return candidate;
    }
    const now = this.now().toISOString();
    const previousStatus = candidate.status;
    candidate.status = "pending";
    candidate.metadata = {
      ...candidate.metadata,
      undoneFromStatus: previousStatus,
      undoneAt: now,
      ...(options.reason ? { undoReason: options.reason } : {})
    };
    candidate.updatedAt = now;
    await this.store.saveMemoryCandidate(candidate);
    await this.store.saveMemoryReviewAction({
      id: `mra_${randomUUID()}`,
      vaultId: auth.vaultId,
      candidateId: candidate.id,
      action: "undo",
      actorId: auth.accountId,
      actorKind: "user",
      metadata: { fromStatus: previousStatus, ...(options.reason ? { reason: options.reason } : {}) },
      createdAt: now
    });
    await this.recordAudit({
      vaultId: auth.vaultId,
      accountId: auth.accountId,
      action: "memory.undo",
      targetType: "candidate",
      targetId: candidate.id,
      metadata: { fromStatus: previousStatus }
    });
    return candidate;
  }

  /**
   * Mark a candidate as needing high-risk reviewer attention. The candidate
   * stays in the inbox queue but the metadata flag lets the dashboard pull it
   * into the high-risk reviewer surface and audit-log filter.
   */
  async flagHighRiskCandidate(
    auth: CloudAuthContext,
    candidateId: string,
    options: { reason?: string; severity?: "low" | "medium" | "high" } = {}
  ): Promise<MemoryCandidateRecord> {
    const candidate = await this.requireOwnedCandidate(auth, candidateId);
    const now = this.now().toISOString();
    const severity = options.severity ?? "medium";
    candidate.metadata = {
      ...candidate.metadata,
      highRiskFlaggedAt: now,
      highRiskSeverity: severity,
      ...(options.reason ? { highRiskReason: options.reason } : {})
    };
    candidate.riskTags = uniqueStrings([...(candidate.riskTags ?? []), "high_risk"]);
    candidate.updatedAt = now;
    await this.store.saveMemoryCandidate(candidate);
    await this.store.saveMemoryReviewAction({
      id: `mra_${randomUUID()}`,
      vaultId: auth.vaultId,
      candidateId: candidate.id,
      action: "flag_high_risk",
      actorId: auth.accountId,
      actorKind: "user",
      metadata: { severity, ...(options.reason ? { reason: options.reason } : {}) },
      createdAt: now
    });
    await this.recordAudit({
      vaultId: auth.vaultId,
      accountId: auth.accountId,
      action: "memory.flag_high_risk",
      targetType: "candidate",
      targetId: candidate.id,
      metadata: { severity, reason: options.reason ?? null }
    });
    this.emitActivationEvent(
      {
        event: "first_trust_action",
        surface: "memory_inbox",
        metadata: { trustAction: "flag_high_risk" }
      },
      { vaultId: auth.vaultId, accountId: auth.accountId }
    );
    return candidate;
  }

  private async requireOwnedCandidate(auth: CloudAuthContext, candidateId: string): Promise<MemoryCandidateRecord> {
    const candidate = await this.store.getMemoryCandidate(candidateId);
    if (!candidate || candidate.vaultId !== auth.vaultId) {
      throw new CloudError("candidate.not_found", "Memory candidate not found", 404);
    }
    return candidate;
  }

  /**
   * Soft-delete a capture source. The source is marked `revoked`, the
   * pause-time metadata is cleared, and an audit row is recorded so the
   * support trail captures the request. Subsequent capture/heartbeat calls
   * targeting the source receive a `cloud.source_unavailable` 409.
   */
  async deleteSource(auth: CloudAuthContext, sourceId: string, options: { reason?: string } = {}): Promise<CaptureSourceRecord> {
    const source = await this.getSource(auth, sourceId);
    const now = this.now().toISOString();
    const updated = await this.store.upsertCaptureSource({
      ...source,
      status: "revoked",
      metadata: {
        ...source.metadata,
        revokedAt: now,
        ...(options.reason ? { revokeReason: options.reason } : {})
      },
      updatedAt: now
    });
    await this.recordAudit({
      vaultId: source.vaultId,
      accountId: auth.accountId,
      action: "source.deleted",
      targetType: "capture_source",
      targetId: source.id,
      metadata: { reason: options.reason ?? null }
    });
    this.emitActivationEvent(
      {
        event: "first_trust_action",
        surface: "capture",
        metadata: { trustAction: "delete_source", provider: source.sourceProvider ?? undefined }
      },
      { vaultId: source.vaultId, accountId: auth.accountId }
    );
    return updated;
  }

  /**
   * Submit recall feedback for a previously composed trace. Tightened to
   * fail-closed when the trace does not belong to the caller's vault.
   */

  async recordRecallTrace(auth: CloudAuthContext, input: {
    query: string;
    routeReason?: string;
    latencyMs?: number;
    tokenBudget?: number;
    tokensUsed?: number;
    items: Array<{
      memoryId?: string;
      candidateId?: string;
      disposition: string;
      confidence?: number;
      riskTags?: string[];
      reason?: string;
      metadata?: Record<string, unknown>;
    }>
  }) {
    const traceId = `trc_${randomUUID()}`;
    const now = this.now().toISOString();

    const trace: RecallTraceRecord = {
      id: traceId,
      vaultId: auth.vaultId,
      query: input.query,
      routeReason: input.routeReason,
      latencyMs: input.latencyMs,
      tokenBudget: input.tokenBudget,
      tokensUsed: input.tokensUsed,
      metadata: {},
      createdAt: now
    };
    await this.store.saveRecallTrace(trace);

    for (const item of input.items) {
      await this.store.saveRecallTraceItem({
        id: `tri_${randomUUID()}`,
        traceId,
        memoryId: item.memoryId,
        candidateId: item.candidateId,
        disposition: item.disposition,
        confidence: item.confidence,
        riskTags: item.riskTags ?? [],
        reason: item.reason,
        metadata: item.metadata ?? {}
      });
    }

    await this.recordUsage({
      vaultId: auth.vaultId,
      eventType: "recall.request",
      units: 1,
      metadata: { traceId }
    });

    this.emitActivationEvent(
      { event: "first_recall_observed", surface: "recall", metadata: { source: "trace" } },
      { vaultId: auth.vaultId, accountId: auth.accountId }
    );
    return trace;
  }

  async submitRecallFeedback(auth: CloudAuthContext, traceId: string, feedback: string) {
    const existing = await this.store.getRecallTrace(traceId);
    if (!existing || existing.trace.vaultId !== auth.vaultId) {
      throw new CloudError("trace.not_found", "Recall trace not found", 404);
    }
    const now = this.now().toISOString();
    await this.store.updateRecallTraceFeedback(traceId, feedback, now);

    await this.recordAudit({
      vaultId: auth.vaultId,
      action: "recall.feedback",
      targetType: "recall_trace",
      targetId: traceId,
      metadata: { feedback }
    });
  }

  // === usage / audit helpers ===

  async recordUsage(input: {
    vaultId: string;
    accountId?: string;
    eventType: string;
    units: number;
    metadata?: Record<string, unknown>;
  }): Promise<UsageEventRecord> {
    const occurredAt = this.now().toISOString();
    const event: UsageEventRecord = {
      id: `use_${randomUUID()}`,
      vaultId: input.vaultId,
      accountId: input.accountId ?? null,
      eventType: input.eventType,
      units: input.units,
      metadata: input.metadata ?? {},
      occurredAt,
      createdAt: occurredAt
    };
    await this.store.recordUsageEvent(event);
    return event;
  }

  async listUsageEvents(auth: CloudAuthContext, options: { limit?: number } = {}): Promise<UsageEventRecord[]> {
    return this.store.listUsageEvents(auth.vaultId, options);
  }

  async sumUsage(auth: CloudAuthContext, eventType: string): Promise<number> {
    return this.store.sumUsageEvents(auth.vaultId, eventType);
  }

  private async recordAudit(input: {
    vaultId: string;
    accountId?: string | null;
    actorId?: string | null;
    actorKind?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.store.recordAuditEvent({
      id: `aud_${randomUUID()}`,
      vaultId: input.vaultId,
      accountId: input.accountId ?? null,
      actorId: input.actorId ?? null,
      actorKind: input.actorKind ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? {},
      createdAt: this.now().toISOString()
    });
  }

  async listAuditEvents(auth: CloudAuthContext, options: { limit?: number } = {}) {
    return this.store.listAuditEvents(auth.vaultId, options);
  }

  // === request dispatcher ===

  isCloudPath(path: string): boolean {
    if (path === "/v1/cloud/whoami") return true;
    if (path === "/v1/cloud/install-token") return true;
    if (path === "/v1/cloud/devices/pair") return true;
    if (path === "/v1/cloud/tokens/revoke") return true;
    if (path === "/v1/cloud/tokens/rotate") return true;
    if (path === "/v1/cloud/vaults") return true;
    if (path === "/v1/cloud/usage") return true;
    if (path === "/v1/cloud/audit-events") return true;
    if (path.startsWith("/v1/capture/sources/") && path.endsWith("/heartbeat")) return true;
    if (/^\/v1\/capture\/jobs\/[^/]+$/.test(path)) return true;
    if (path === "/v1/capture/sessions") return true;
    if (/^\/v1\/capture\/sessions\/[^/]+$/.test(path)) return true;
    // v0.9 sources, capture events, usage, operator
    if (path === "/v1/sources") return true;
    if (/^\/v1\/sources\/[^/]+$/.test(path)) return true;
    if (/^\/v1\/sources\/[^/]+\/(pause|resume|checkpoints)$/.test(path)) return true;
    if (path === "/v1/capture/events") return true;
    if (path === "/v1/capture/session-deltas") return true;
    if (path === "/v1/usage") return true;
    if (path === "/v1/operator/usage") return true;
    // v1.0 Google sign-in + personal vault
    if (path === "/auth/google/start") return true;
    if (path === "/auth/google/callback") return true;
    if (path === "/auth/logout") return true;
    if (path === "/v1/me") return true;
    if (path === "/v1/vault") return true;

    // v1.0 memory inbox & recall
    if (path === "/v1/memory-inbox") return true;
    if (/^\/v1\/memory-inbox\/[^/]+(\/(approve|reject))?$/.test(path)) return true;
    if (path === "/v1/recall") return true;
    if (path === "/v1/recall/traces") return true;
    if (/^\/v1\/recall\/traces\/[^/]+(\/feedback)?$/.test(path)) return true;
    return false;
  }

  async handle(options: CloudHandleOptions): Promise<{ payload: unknown; status: number; headers?: Record<string, string | string[]> }> {
    const { method, path, request, hasAdminApiKey, isLoopback } = options;

    if (method === "POST" && path === "/v1/cloud/install-token") {
      const body = await readJsonBody(request);
      let vaultId = readOptionalString(body.vault_id ?? body.vaultId) ?? this.defaultVaultId;
      let accountId = readOptionalString(body.account_id ?? body.accountId);
      const adminPath = hasAdminApiKey || isLoopback;
      if (!adminPath) {
        // Kill-switch order: master pause first (operator drains all signup
        // surfaces), then the per-feature `tokenIssuance` flag. Both cases
        // surface as 503 cloud.feature_disabled so the dashboard banner can
        // explain the maintenance state without leaking which env knob fired.
        const flags = this.featureFlags();
        if (flags.publicBetaPaused) {
          this.emitActivationEvent(
            { event: "support_intervention", surface: "auth", metadata: { outcome: "public_beta_paused" } }
          );
          throw new CloudError("cloud.feature_disabled", "public beta is paused", 503);
        }
        if (!flags.tokenIssuance) {
          this.emitActivationEvent(
            { event: "support_intervention", surface: "auth", metadata: { outcome: "token_issuance_disabled" } }
          );
          throw new CloudError("cloud.feature_disabled", "install-token issuance is disabled", 503);
        }
        const cookies = parseCookies(request.headers.get("cookie"));
        if (!cookies[SESSION_COOKIE]) {
          throw new CloudError("cloud.admin_required", "install token requires admin api key, loopback access, or a web session", 403);
        }
        const session = await this.requireUnsafeSessionRequest({
          cookies,
          csrfHeader: request.headers.get("x-lore-csrf")
        });
        vaultId = session.vault.id;
        accountId = session.account.id;
        this.enforceInstallTokenQuota({ accountId: session.account.id, vaultId: session.vault.id });
      }
      const installed = await this.issueInstallToken({ vaultId, accountId });
      this.emitActivationEvent(
        {
          event: "first_trust_action",
          surface: "auth",
          metadata: { trustAction: "issue_install_token", tokenKind: "install" }
        },
        { vaultId: installed.record.vaultId, accountId: installed.record.accountId }
      );
      return {
        status: 200,
        payload: {
          installToken: installed.plaintext,
          tokenId: installed.record.id,
          vaultId: installed.record.vaultId,
          accountId: installed.record.accountId,
          expiresAt: installed.record.expiresAt,
          singleUse: true
        }
      };
    }

    if (method === "POST" && path === "/v1/cloud/devices/pair") {
      const body = await readJsonBody(request);
      const installToken = readRequiredString(body.install_token ?? body.installToken, "install_token");
      const label = readOptionalString(body.device_label ?? body.deviceLabel ?? body.label);
      const platform = readOptionalString(body.platform);
      const result = await this.redeemInstallToken(installToken, { label, platform });
      return {
        status: 200,
        payload: {
          deviceId: result.device.id,
          vaultId: result.vault.id,
          accountId: result.vault.accountId,
          deviceToken: result.deviceToken.plaintext,
          deviceTokenExpiresAt: result.deviceToken.record.expiresAt,
          serviceToken: result.serviceToken.plaintext,
          serviceTokenExpiresAt: result.serviceToken.record.expiresAt,
          scopes: {
            device: result.deviceToken.record.scopes,
            service: result.serviceToken.record.scopes
          }
        }
      };
    }

    if (method === "POST" && path === "/v1/cloud/tokens/revoke") {
      const body = await readJsonBody(request);
      const presented = readBearerToken(request);
      const token = readOptionalString(body.token) ?? presented;
      if (!token) {
        throw new CloudError("cloud.token_required", "token is required to revoke", 400);
      }
      const isSelfRevoke = presented !== undefined && presented === token;
      if (!isSelfRevoke && !hasAdminApiKey && !isLoopback) {
        throw new CloudError("cloud.admin_required", "revoking another token requires admin api key or loopback", 403);
      }
      const result = await this.revokeToken(token);
      return { status: 200, payload: result };
    }

    if (method === "POST" && path === "/v1/cloud/tokens/rotate") {
      const presented = readBearerToken(request);
      if (!presented) {
        throw new CloudError("cloud.token_required", "bearer token required to rotate", 401);
      }
      const next = await this.rotateToken(presented);
      return {
        status: 200,
        payload: {
          tokenId: next.record.id,
          token: next.plaintext,
          kind: next.record.kind,
          vaultId: next.record.vaultId,
          accountId: next.record.accountId,
          deviceId: next.record.deviceId,
          scopes: next.record.scopes,
          expiresAt: next.record.expiresAt
        }
      };
    }

    if (method === "GET" && path === "/v1/cloud/whoami") {
      const presented = readBearerToken(request);
      if (!presented) {
        throw new CloudError("cloud.token_required", "bearer token required for whoami", 401);
      }
      const auth = await this.authenticate(presented);
      const info = await this.whoami(auth);
      return {
        status: 200,
        payload: {
          account: info.account,
          vault: info.vault,
          device: info.device ?? null,
          tokenKind: info.tokenKind,
          scopes: info.scopes
        }
      };
    }

    if (method === "GET" && path === "/v1/cloud/vaults") {
      const presented = readBearerToken(request);
      if (!presented) {
        throw new CloudError("cloud.token_required", "bearer token required to list vaults", 401);
      }
      const auth = await this.authenticate(presented);
      const vaults = await this.listVaultsForAccount(auth.accountId);
      return { status: 200, payload: { vaults } };
    }

    if (method === "GET" && path === "/v1/cloud/usage") {
      const presented = readBearerToken(request);
      if (!presented) {
        throw new CloudError("cloud.token_required", "bearer token required for usage", 401);
      }
      const auth = await this.authenticate(presented);
      const limit = readOptionalNumber(options.url.searchParams.get("limit")) ?? 50;
      const events = await this.listUsageEvents(auth, { limit });
      return { status: 200, payload: { events } };
    }

    if (method === "GET" && path === "/v1/cloud/audit-events") {
      const presented = readBearerToken(request);
      if (!presented) {
        throw new CloudError("cloud.token_required", "bearer token required for audit events", 401);
      }
      const auth = await this.authenticate(presented);
      const limit = readOptionalNumber(options.url.searchParams.get("limit")) ?? 50;
      const events = await this.listAuditEvents(auth, { limit });
      return { status: 200, payload: { events } };
    }

    const heartbeatMatch = path.match(/^\/v1\/capture\/sources\/([^/]+)\/heartbeat$/);
    if (method === "POST" && heartbeatMatch) {
      const sourceId = decodeURIComponent(heartbeatMatch[1] ?? "");
      const presented = readBearerToken(request);
      if (!presented) {
        throw new CloudError("cloud.token_required", "bearer token required for heartbeat", 401);
      }
      const auth = await this.authenticate(presented);
      const body = await readJsonBody(request);
      const bodyProvider = readOptionalString(body.source_provider ?? body.sourceProvider);
      const existingSource = await this.store.getCaptureSource(sourceId);
      this.requireCaptureEnabled(bodyProvider, existingSource?.sourceProvider ?? null);
      const source = await this.recordHeartbeat({
        auth,
        sourceId,
        sourceType: readOptionalString(body.source_type ?? body.sourceType),
        sourceProvider: bodyProvider,
        sourceRef: readOptionalString(body.source_ref ?? body.sourceRef),
        status: normalizeSourceStatus(body.status),
        error: body.error === null ? null : readOptionalString(body.error),
        metadata: readObject(body.metadata)
      });
      return {
        status: 200,
        payload: {
          source: {
            id: source.id,
            vaultId: source.vaultId,
            deviceId: source.deviceId ?? null,
            sourceType: source.sourceType,
            sourceProvider: source.sourceProvider ?? null,
            sourceRef: source.sourceRef ?? null,
            status: source.status,
            lastHeartbeatAt: source.lastHeartbeatAt,
            lastError: source.lastError ?? null,
            metadata: source.metadata,
            createdAt: source.createdAt,
            updatedAt: source.updatedAt
          }
        }
      };
    }

    if (method === "POST" && path === "/v1/capture/sessions") {
      const presented = readBearerToken(request);
      if (!presented) {
        throw new CloudError("cloud.token_required", "bearer token required to upload capture session", 401);
      }
      const auth = await this.authenticate(presented);
      if (!auth.scopes.includes("capture.write")) {
        throw new CloudError("cloud.scope_missing", "capture.write scope is required", 403);
      }
      const body = await readJsonBody(request);
      const provider = readRequiredString(body.provider, "provider");
      this.requireCaptureEnabled(provider);
      const sourceOriginalId = readRequiredString(body.source_original_id ?? body.sourceOriginalId, "source_original_id");
      const sourceId = readRequiredString(body.source_id ?? body.sourceId, "source_id");
      const contentHash = readRequiredString(body.content_hash ?? body.contentHash, "content_hash");
      const idempotencyKey = readRequiredString(body.idempotency_key ?? body.idempotencyKey, "idempotency_key");
      const captureMode = normalizeCaptureMode(body.capture_mode ?? body.captureMode);
      const redaction = normalizeRedactionMeta(body.redaction);
      const turnSummary = normalizeTurnSummary(body.turn_summary ?? body.turnSummary ?? body.turns);
      const rawTurns = Array.isArray(body.raw_turns ?? body.rawTurns) ? (body.raw_turns ?? body.rawTurns) as unknown[] : undefined;

      const result = await this.enqueueSession({
        auth,
        sourceId,
        provider,
        sourceOriginalId,
        contentHash,
        idempotencyKey,
        captureMode,
        startedAt: readOptionalString(body.started_at ?? body.startedAt),
        endedAt: readOptionalString(body.ended_at ?? body.endedAt),
        redaction,
        metadata: readObject(body.metadata) ?? {},
        turnSummary,
        rawTurns
      });

      return {
        // 200 for duplicate, 202 for new accepted-for-processing.
        status: result.duplicate ? 200 : 202,
        payload: {
          session: {
            id: result.session.id,
            vaultId: result.session.vaultId,
            sourceId: result.session.sourceId,
            provider: result.session.provider,
            sourceOriginalId: result.session.sourceOriginalId,
            captureMode: result.session.captureMode,
            redaction: result.session.redaction,
            receivedAt: result.session.receivedAt,
            idempotencyKey: result.session.idempotencyKey
          },
          job: {
            id: result.job.id,
            type: result.job.type,
            status: result.job.status,
            attempts: result.job.attempts,
            nextRunAt: result.job.nextRunAt
          },
          duplicate: result.duplicate
        }
      };
    }

    const sessionMatch = path.match(/^\/v1\/capture\/sessions\/([^/]+)$/);
    if (method === "GET" && sessionMatch) {
      const sessionId = decodeURIComponent(sessionMatch[1] ?? "");
      const presented = readBearerToken(request);
      if (!presented) {
        throw new CloudError("cloud.token_required", "bearer token required to read capture session", 401);
      }
      const auth = await this.authenticate(presented);
      const session = await this.getSession(auth, sessionId);
      return { status: 200, payload: { session } };
    }

    const jobMatch = path.match(/^\/v1\/capture\/jobs\/([^/]+)$/);
    if (method === "GET" && jobMatch) {
      const jobId = decodeURIComponent(jobMatch[1] ?? "");
      const presented = readBearerToken(request);
      if (!presented) {
        throw new CloudError("cloud.token_required", "bearer token required to read capture job", 401);
      }
      const auth = await this.authenticate(presented);
      const job = await this.getJob(auth, jobId);
      return { status: 200, payload: { job } };
    }

    // === v0.9 source registry ===

    if (method === "GET" && path === "/v1/sources") {
      const auth = await this.requireBearerAuth(request);
      const limit = readOptionalNumber(options.url.searchParams.get("limit")) ?? 100;
      const status = normalizeSourceStatusOrUndefined(options.url.searchParams.get("status"));
      const sources = await this.listSources(auth, { limit, status });
      return { status: 200, payload: { sources: sources.map(toPublicSource) } };
    }

    if (method === "POST" && path === "/v1/sources") {
      const auth = await this.requireBearerAuth(request);
      const body = await readJsonBody(request);
      const sourceProvider = readRequiredString(body.source_provider ?? body.sourceProvider, "source_provider");
      const sourceType = readOptionalString(body.source_type ?? body.sourceType) ?? "agent_session";
      const source = await this.registerSource({
        auth,
        sourceId: readOptionalString(body.source_id ?? body.sourceId ?? body.id),
        sourceType,
        sourceProvider,
        sourceRef: readOptionalString(body.source_ref ?? body.sourceRef),
        displayName: readOptionalString(body.display_name ?? body.displayName),
        rawArchivePolicy: normalizeRawArchivePolicy(body.raw_archive_policy ?? body.rawArchivePolicy),
        permissions: readPermissionEnvelopes(body.permissions),
        metadata: readObject(body.metadata)
      });
      return { status: 201, payload: { source: toPublicSource(source) } };
    }

    const singleSource = path.match(/^\/v1\/sources\/([^/]+)$/);
    if (singleSource && method === "GET") {
      const auth = await this.requireBearerAuth(request);
      const source = await this.getSource(auth, decodeURIComponent(singleSource[1] ?? ""));
      return { status: 200, payload: { source: toPublicSource(source) } };
    }

    if (singleSource && method === "PATCH") {
      const auth = await this.requireBearerAuth(request);
      const body = await readJsonBody(request);
      const updated = await this.updateSource({
        auth,
        sourceId: decodeURIComponent(singleSource[1] ?? ""),
        displayName: readOptionalString(body.display_name ?? body.displayName),
        rawArchivePolicy: normalizeRawArchivePolicy(body.raw_archive_policy ?? body.rawArchivePolicy),
        metadata: readObject(body.metadata)
      });
      return { status: 200, payload: { source: toPublicSource(updated) } };
    }

    const pauseMatch = path.match(/^\/v1\/sources\/([^/]+)\/pause$/);
    if (pauseMatch && method === "POST") {
      const auth = await this.requireBearerAuth(request);
      const updated = await this.pauseSource(auth, decodeURIComponent(pauseMatch[1] ?? ""));
      return { status: 200, payload: { source: toPublicSource(updated) } };
    }

    const resumeMatch = path.match(/^\/v1\/sources\/([^/]+)\/resume$/);
    if (resumeMatch && method === "POST") {
      const auth = await this.requireBearerAuth(request);
      const updated = await this.resumeSource(auth, decodeURIComponent(resumeMatch[1] ?? ""));
      return { status: 200, payload: { source: toPublicSource(updated) } };
    }

    const checkpointMatch = path.match(/^\/v1\/sources\/([^/]+)\/checkpoints$/);
    if (checkpointMatch && method === "POST") {
      const auth = await this.requireBearerAuth(request);
      const body = await readJsonBody(request);
      const record = await this.saveSourceCheckpoint({
        auth,
        sourceId: decodeURIComponent(checkpointMatch[1] ?? ""),
        checkpointKey: readRequiredString(body.checkpoint_key ?? body.checkpointKey, "checkpoint_key"),
        offsetValue: readOptionalString(body.offset_value ?? body.offsetValue),
        contentHash: readOptionalString(body.content_hash ?? body.contentHash),
        metadata: readObject(body.metadata)
      });
      return { status: 200, payload: { checkpoint: record } };
    }
    if (checkpointMatch && method === "GET") {
      const auth = await this.requireBearerAuth(request);
      const list = await this.listSourceCheckpoints(auth, decodeURIComponent(checkpointMatch[1] ?? ""));
      return { status: 200, payload: { checkpoints: list } };
    }

    // === v0.9 capture event + session-delta ingestion ===

    if (method === "POST" && path === "/v1/capture/events") {
      const auth = await this.requireBearerAuth(request);
      const body = await readJsonBody(request);
      const sourceId = readRequiredString(body.source_id ?? body.sourceId, "source_id");
      const events = Array.isArray(body.events) ? (body.events as Array<Record<string, unknown>>) : null;
      if (!events) {
        throw new CloudError("capture.events_required", "events array is required", 400);
      }
      const eventsSource = await this.store.getCaptureSource(sourceId);
      this.requireCaptureEnabled(eventsSource?.sourceProvider ?? null);
      const result = await this.ingestCaptureEvents({
        auth,
        sourceId,
        batchIdempotencyKey: readOptionalString(body.batch_idempotency_key ?? body.idempotencyKey),
        events: events.map((event) => ({
          externalEventId: readOptionalString(event.external_event_id ?? event.externalEventId),
          eventType: readOptionalString(event.event_type ?? event.eventType),
          occurredAt: readOptionalString(event.occurred_at ?? event.occurredAt),
          actor: readOptionalString(event.actor),
          contentRef: readObject(event.content_ref ?? event.contentRef),
          redactionState: normalizeRedactionState(event.redaction_state ?? event.redactionState),
          idempotencyKey: readOptionalString(event.idempotency_key ?? event.idempotencyKey),
          sessionId: readOptionalString(event.session_id ?? event.sessionId),
          payload: readObject(event.payload)
        }))
      });
      return {
        status: 202,
        payload: {
          batch: result.batch,
          accepted: result.accepted,
          deduped: result.deduped,
          eventIds: result.events.map((event) => event.id)
        }
      };
    }

    if (method === "POST" && path === "/v1/capture/session-deltas") {
      const auth = await this.requireBearerAuth(request);
      const body = await readJsonBody(request);
      const sourceId = readRequiredString(body.source_id ?? body.sourceId, "source_id");
      const sessionId = readRequiredString(body.session_id ?? body.sessionId, "session_id");
      const deltas = Array.isArray(body.deltas) ? (body.deltas as Array<Record<string, unknown>>) : null;
      if (!deltas) {
        throw new CloudError("capture.deltas_required", "deltas array is required", 400);
      }
      const deltaSource = await this.store.getCaptureSource(sourceId);
      this.requireCaptureEnabled(deltaSource?.sourceProvider ?? null);
      const result = await this.ingestSessionDelta({
        auth,
        sourceId,
        sessionId,
        deltas: deltas.map((delta) => ({
          idempotencyKey: readRequiredString(delta.idempotency_key ?? delta.idempotencyKey, "delta.idempotency_key"),
          occurredAt: readOptionalString(delta.occurred_at ?? delta.occurredAt),
          payload: readObject(delta.payload) ?? {}
        }))
      });
      return { status: 202, payload: result };
    }

    // === v0.9 usage and operator ===

    if (method === "GET" && path === "/v1/usage") {
      const auth = await this.requireBearerAuth(request);
      const limit = readOptionalNumber(options.url.searchParams.get("limit")) ?? 50;
      const summary = await this.getUsageSummary(auth, { limit });
      return { status: 200, payload: summary };
    }

    if (method === "GET" && path === "/v1/operator/usage") {
      // Operator endpoint is gated by the existing v0.6 admin api-key path.
      // Cloud bearer tokens (lct_*) are EXPLICITLY rejected even on loopback
      // to prevent accidental cross-vault disclosure when a beta user holds
      // an unscoped device/service token.
      const presentedCloudBearer = readBearerToken(request);
      if (presentedCloudBearer) {
        throw new CloudError("cloud.admin_required", "operator endpoint rejects cloud bearer tokens; use admin api-key", 403);
      }
      if (!hasAdminApiKey && !isLoopback) {
        throw new CloudError("cloud.admin_required", "operator endpoint requires admin api key or loopback", 403);
      }
      const limit = readOptionalNumber(options.url.searchParams.get("limit")) ?? 50;
      const rows = await this.operatorUsageRollup({ limit });
      return { status: 200, payload: { rows } };
    }

    // === v1.0 Google sign-in + personal vault ===

    if (method === "GET" && path === "/auth/google/start") {
      return this.handleGoogleStart();
    }

    if (method === "GET" && path === "/auth/google/callback") {
      const cookies = parseCookies(request.headers.get("cookie"));
      return this.handleGoogleAuthorizationCodeCallback({ url: options.url, cookies });
    }

    if (method === "POST" && path === "/auth/google/callback") {
      const body = await readJsonBody(request);
      return this.handleGoogleCallback({ body, cookies: parseCookies(request.headers.get("cookie")) });
    }

    if (method === "POST" && path === "/auth/logout") {
      const cookies = parseCookies(request.headers.get("cookie"));
      return this.handleLogout({ cookies, csrfHeader: request.headers.get("x-lore-csrf") });
    }

    if (method === "GET" && path === "/v1/me") {
      const cookies = parseCookies(request.headers.get("cookie"));
      const session = await this.requireSessionFromCookies(cookies);
      this.emitActivationEvent(
        { event: "dashboard_ready", surface: "dashboard" },
        {
          vaultId: session.vault.id,
          accountId: session.account.id,
          sessionHashPrefix: sessionHashPrefix(cookies[SESSION_COOKIE])
        }
      );
      return this.handleMe(session);
    }

    if (method === "GET" && path === "/v1/vault") {
      const cookies = parseCookies(request.headers.get("cookie"));
      const session = await this.requireSessionFromCookies(cookies);
      return this.handleVault(session);
    }

    // === v1.0 memory inbox & recall ===

    if (method === "GET" && path === "/v1/memory-inbox") {
      const auth = await this.requireBearerAuth(request);
      const limit = readOptionalNumber(options.url.searchParams.get("limit")) ?? 50;
      const status = options.url.searchParams.get("status") as CandidateStatus | undefined;
      const candidates = await this.listMemoryCandidates(auth, { status, limit });
      return { status: 200, payload: { candidates } };
    }

    const approveMatch = path.match(/^\/v1\/memory-inbox\/([^/]+)\/approve$/);
    if (method === "POST" && approveMatch) {
      const auth = await this.requireBearerAuth(request);
      const candidateId = decodeURIComponent(approveMatch[1] ?? "");
      const candidate = await this.approveMemoryCandidate(auth, candidateId);
      return { status: 200, payload: { candidate } };
    }

    const rejectMatch = path.match(/^\/v1\/memory-inbox\/([^/]+)\/reject$/);
    if (method === "POST" && rejectMatch) {
      const auth = await this.requireBearerAuth(request);
      const candidateId = decodeURIComponent(rejectMatch[1] ?? "");
      const candidate = await this.rejectMemoryCandidate(auth, candidateId);
      return { status: 200, payload: { candidate } };
    }

    if (method === "GET" && path === "/v1/recall/traces") {
      const auth = await this.requireBearerAuth(request);
      const limit = readOptionalNumber(options.url.searchParams.get("limit")) ?? 50;
      const traces = await this.store.listRecallTraces(auth.vaultId, { limit });
      return { status: 200, payload: { traces } };
    }

    const singleTrace = path.match(/^\/v1\/recall\/traces\/([^/]+)$/);
    if (method === "GET" && singleTrace) {
      const auth = await this.requireBearerAuth(request);
      const traceId = decodeURIComponent(singleTrace[1] ?? "");
      const result = await this.store.getRecallTrace(traceId);
      if (!result || result.trace.vaultId !== auth.vaultId) {
        throw new CloudError("trace.not_found", "Recall trace not found", 404);
      }
      return { status: 200, payload: result };
    }

    const feedbackMatch = path.match(/^\/v1\/recall\/traces\/([^/]+)\/feedback$/);
    if (method === "POST" && feedbackMatch) {
      const auth = await this.requireBearerAuth(request);
      const traceId = decodeURIComponent(feedbackMatch[1] ?? "");
      const body = await readJsonBody(request);
      const feedback = readRequiredString(body.feedback, "feedback");
      await this.submitRecallFeedback(auth, traceId, feedback);
      return { status: 200, payload: { success: true } };
    }

    throw new CloudError("cloud.route_not_found", `${method} ${path} not found`, 404);
  }

  // === v1.0 Google auth helpers ===

  private googleAuthEnv(): GoogleAuthEnv {
    return parseGoogleAuthEnv(process.env);
  }

  private requireGoogleAuthEnv(): Extract<GoogleAuthEnv, { enabled: true }> {
    const env = this.googleAuthEnv();
    if (!env.enabled) {
      throw new CloudError("auth.disabled", env.reason, 503);
    }
    return env;
  }

  private async handleGoogleStart(): Promise<{ payload: unknown; status: number; headers?: Record<string, string | string[]> }> {
    const env = this.requireGoogleAuthEnv();
    const flags = this.featureFlags();
    if (flags.publicBetaPaused) {
      this.emitActivationEvent(
        { event: "support_intervention", surface: "auth", metadata: { outcome: "public_beta_paused" } }
      );
      throw new CloudError("auth.public_beta_paused", "public beta sign-in is paused", 503);
    }
    const state = newOauthState();
    const stateCookie = serializeCookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: env.secureCookie,
      sameSite: "Lax",
      maxAgeSeconds: 300
    });
    this.emitActivationEvent({ event: "signin_started", surface: "auth" });
    return {
      status: 200,
      payload: {
        authorizationUrl: buildGoogleAuthorizeUrl(env, state),
        state,
        scopes: ["openid", "email", "profile"]
      },
      headers: { "set-cookie": [stateCookie] }
    };
  }

  private async handleGoogleAuthorizationCodeCallback(input: {
    url: URL;
    cookies: Record<string, string>;
  }): Promise<{ payload: unknown; status: number; headers?: Record<string, string | string[]> }> {
    const env = this.requireGoogleAuthEnv();
    const oauthError = input.url.searchParams.get("error");
    if (oauthError) {
      throw new CloudError("auth.google_denied", oauthError, 400);
    }
    const code = readOptionalString(input.url.searchParams.get("code"));
    if (!code) {
      throw new CloudError("auth.code_required", "authorization code is required", 400);
    }
    let idToken: string;
    try {
      idToken = await exchangeGoogleAuthorizationCode(code, env);
    } catch (error) {
      if (error instanceof GoogleAuthError) {
        throw new CloudError(error.code, error.message, error.status);
      }
      throw error;
    }
    return this.completeGoogleSignIn({
      idToken,
      presentedState: readOptionalString(input.url.searchParams.get("state")),
      cookies: input.cookies
    });
  }

  private async handleGoogleCallback(input: {
    body: Record<string, unknown>;
    cookies: Record<string, string>;
  }): Promise<{ payload: unknown; status: number; headers?: Record<string, string | string[]> }> {
    this.requireGoogleAuthEnv();
    const idTokenRaw = readOptionalString(input.body.id_token ?? input.body.idToken);
    if (!idTokenRaw) {
      throw new CloudError("auth.id_token_required", "id_token is required", 400);
    }
    return this.completeGoogleSignIn({
      idToken: idTokenRaw,
      presentedState: readOptionalString(input.body.state),
      cookies: input.cookies
    });
  }

  private async completeGoogleSignIn(input: {
    idToken: string;
    presentedState?: string;
    cookies: Record<string, string>;
  }): Promise<{ payload: unknown; status: number; headers?: Record<string, string | string[]> }> {
    const env = this.requireGoogleAuthEnv();
    await this.bootstrap();
    const presentedState = input.presentedState;
    const cookieState = input.cookies[STATE_COOKIE];
    if (!cookieState || !presentedState || !constantTimeEqual(cookieState, presentedState)) {
      throw new CloudError("auth.state_mismatch", "oauth state mismatch", 400);
    }

    let claims: GoogleIdTokenClaims;
    try {
      claims = await verifyGoogleIdToken(input.idToken, env, this.now().getTime());
    } catch (error) {
      if (error instanceof GoogleAuthError) {
        throw new CloudError(error.code, error.message, error.status);
      }
      throw error;
    }

    const flags = this.featureFlags();
    if (flags.publicBetaPaused) {
      this.emitActivationEvent(
        { event: "support_intervention", surface: "auth", metadata: { outcome: "public_beta_paused" } }
      );
      throw new CloudError("auth.public_beta_paused", "public beta sign-in is paused", 503);
    }
    if (flags.allowlistRequired && !isAllowedByBetaAllowlist(claims.email ?? null, flags)) {
      this.emitActivationEvent(
        { event: "support_intervention", surface: "auth", metadata: { outcome: "allowlist_blocked" } }
      );
      throw new CloudError(
        "auth.allowlist_required",
        "this Google account is not on the private beta allowlist",
        403
      );
    }

    const nowIso = this.now().toISOString();
    let identity = await this.store.findOauthIdentityBySub(GOOGLE_PROVIDER, claims.sub);
    let account: CloudAccountRecord;
    let vault: CloudVaultRecord;
    let createdNew = false;
    if (identity) {
      const existingAccount = await this.store.getAccount(identity.accountId);
      const existingVaults = await this.store.listVaultsForAccount(identity.accountId);
      if (!existingAccount || existingVaults.length === 0) {
        throw new CloudError("auth.identity_orphan", "identity references missing account or vault", 500);
      }
      account = existingAccount;
      vault = existingVaults[0]!;
    } else {
      if (!flags.publicSignup) {
        this.emitActivationEvent(
          { event: "support_intervention", surface: "auth", metadata: { outcome: "signup_disabled" } }
        );
        throw new CloudError(
          "auth.signup_disabled",
          "new account signup is disabled by operator kill switch",
          503
        );
      }
      const accountId = newAccountId();
      const vaultId = newVaultId();
      const identityId = newIdentityId();
      const created = await this.store.createUserAccountWithIdentity({
        accountId,
        vaultId,
        identityId,
        email: claims.email ?? null,
        displayName: claims.name ?? null,
        provider: GOOGLE_PROVIDER,
        providerUserId: claims.sub,
        now: nowIso
      });
      account = created.account;
      vault = created.vault;
      identity = created.identity;
      createdNew = true;
    }

    const issued = await this.persistToken({
      kind: "session",
      vaultId: vault.id,
      accountId: account.id,
      ttlMs: SESSION_TTL_MS,
      scopes: ["web.session", "web.read", "web.write"],
      singleUse: false
    });
    const csrf = hmacCsrfToken(issued.plaintext, env.sessionSecret);
    const sessionCookie = serializeCookie(SESSION_COOKIE, issued.plaintext, {
      httpOnly: true,
      secure: env.secureCookie,
      sameSite: "Lax",
      maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
      path: "/"
    });
    const csrfCookie = serializeCookie(CSRF_COOKIE, csrf, {
      httpOnly: false,
      secure: env.secureCookie,
      sameSite: "Lax",
      maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
      path: "/"
    });
    const clearState = clearCookie(STATE_COOKIE, env.secureCookie);

    await this.recordAudit({
      vaultId: vault.id,
      accountId: account.id,
      actorId: identity.id,
      actorKind: "oauth_identity",
      action: createdNew ? "auth.google.signup" : "auth.google.login",
      targetType: "session",
      targetId: issued.record.id,
      metadata: { email: claims.email ?? null, mock: env.mock }
    });

    this.emitActivationEvent(
      {
        event: "signin_completed",
        surface: "auth",
        metadata: { outcome: createdNew ? "signup" : "login", tokenKind: "session" }
      },
      {
        vaultId: vault.id,
        accountId: account.id,
        sessionHashPrefix: sessionHashPrefix(issued.plaintext)
      }
    );

    return {
      status: 200,
      payload: {
        account: { id: account.id, email: account.email ?? null, displayName: account.displayName ?? null, plan: account.plan },
        vault: { id: vault.id, name: vault.name, plan: vault.plan, rawArchiveEnabled: vault.rawArchiveEnabled, privateMode: vault.privateMode },
        identity: { id: identity.id, provider: identity.provider, providerUserId: identity.providerUserId, email: identity.email ?? null },
        session: { tokenId: issued.record.id, expiresAt: issued.record.expiresAt },
        csrfToken: csrf,
        createdNew
      },
      headers: { "set-cookie": [sessionCookie, csrfCookie, clearState] }
    };
  }

  private async handleLogout(input: { cookies: Record<string, string>; csrfHeader: string | null }): Promise<{
    payload: unknown; status: number; headers?: Record<string, string | string[]>;
  }> {
    const env = this.requireGoogleAuthEnv();
    const sessionPlaintext = input.cookies[SESSION_COOKIE];
    if (sessionPlaintext) {
      // CSRF: unsafe method requires header to match cookie value when a
      // session is present. Without this any cross-site form POST could
      // log a user out for grief, but more importantly the same gate must
      // apply to every state-changing session route in v1.x.
      const csrfCookie = input.cookies[CSRF_COOKIE];
      if (!csrfCookie || !input.csrfHeader || csrfCookie !== input.csrfHeader) {
        throw new CloudError("auth.csrf_failed", "CSRF token mismatch on unsafe request", 403);
      }
      try {
        await this.revokeToken(sessionPlaintext);
      } catch {
        // Token may already be expired/revoked. Logout is idempotent.
      }
    }
    const headers = {
      "set-cookie": [
        clearCookie(SESSION_COOKIE, env.secureCookie),
        clearCookie(CSRF_COOKIE, env.secureCookie)
      ]
    };
    return { status: 200, payload: { ok: true }, headers };
  }

  private async requireSessionFromCookies(cookies: Record<string, string>): Promise<{
    auth: CloudAuthContext;
    account: CloudAccountRecord;
    vault: CloudVaultRecord;
    identity?: OauthIdentityRecord;
  }> {
    const sessionPlaintext = cookies[SESSION_COOKIE];
    if (!sessionPlaintext) {
      throw new CloudError("auth.session_required", "session cookie required", 401);
    }
    let auth: CloudAuthContext;
    try {
      auth = await this.authenticate(sessionPlaintext);
    } catch (error) {
      if (error instanceof CloudError) {
        throw new CloudError("auth.session_invalid", error.message, 401);
      }
      throw error;
    }
    if (auth.tokenKind !== "session") {
      throw new CloudError("auth.session_required", "bearer token is not a web session", 401);
    }
    const account = await this.store.getAccount(auth.accountId);
    const vault = await this.store.getVault(auth.vaultId);
    if (!account || !vault) {
      throw new CloudError("auth.session_invalid", "session points at missing account/vault", 401);
    }
    const identities = await this.store.listOauthIdentitiesForAccount(account.id);
    return { auth, account, vault, identity: identities[0] };
  }

  private async requireUnsafeSessionRequest(input: {
    cookies: Record<string, string>;
    csrfHeader: string | null;
  }): Promise<{
    auth: CloudAuthContext;
    account: CloudAccountRecord;
    vault: CloudVaultRecord;
    identity?: OauthIdentityRecord;
  }> {
    const env = this.requireGoogleAuthEnv();
    const sessionPlaintext = input.cookies[SESSION_COOKIE];
    const csrfCookie = input.cookies[CSRF_COOKIE];
    const expectedCsrf = sessionPlaintext ? hmacCsrfToken(sessionPlaintext, env.sessionSecret) : "";
    if (
      !csrfCookie ||
      !input.csrfHeader ||
      !expectedCsrf ||
      !constantTimeEqual(csrfCookie, expectedCsrf) ||
      !constantTimeEqual(input.csrfHeader, expectedCsrf)
    ) {
      throw new CloudError("auth.csrf_failed", "CSRF token mismatch on unsafe request", 403);
    }
    return this.requireSessionFromCookies(input.cookies);
  }

  private handleMe(session: { account: CloudAccountRecord; vault: CloudVaultRecord; identity?: OauthIdentityRecord; auth: CloudAuthContext }): {
    payload: unknown; status: number;
  } {
    return {
      status: 200,
      payload: {
        account: {
          id: session.account.id,
          email: session.account.email ?? null,
          displayName: session.account.displayName ?? null,
          plan: session.account.plan
        },
        vault: { id: session.vault.id, name: session.vault.name, plan: session.vault.plan },
        identity: session.identity
          ? { provider: session.identity.provider, providerUserId: session.identity.providerUserId, email: session.identity.email ?? null }
          : null,
        session: { tokenKind: session.auth.tokenKind, scopes: session.auth.scopes }
      }
    };
  }

  private handleVault(session: { account: CloudAccountRecord; vault: CloudVaultRecord }): {
    payload: unknown; status: number;
  } {
    return {
      status: 200,
      payload: {
        vault: {
          id: session.vault.id,
          accountId: session.vault.accountId,
          name: session.vault.name,
          plan: session.vault.plan,
          rawArchiveEnabled: session.vault.rawArchiveEnabled,
          privateMode: session.vault.privateMode,
          createdAt: session.vault.createdAt
        }
      }
    };
  }

  // Test-only helper to mint an id_token for the mock auth path. Production
  // code never calls this; tests use it to drive `/auth/google/callback`.
  static encodeMockIdToken(claims: GoogleIdTokenClaims): string {
    return encodeMockIdToken(claims);
  }

  static encodeMockAuthorizationCode(claims: GoogleIdTokenClaims): string {
    return encodeMockAuthorizationCode(claims);
  }

  // Centralised bearer-auth check used by every v0.9 handler.
  private async requireBearerAuth(request: Request): Promise<CloudAuthContext> {
    const presented = readBearerToken(request);
    if (!presented) {
      throw new CloudError("cloud.token_required", "bearer token required", 401);
    }
    return this.authenticate(presented);
  }

  // === internals ===

  private async persistToken(input: {
    kind: CloudTokenKind;
    vaultId: string;
    accountId: string;
    deviceId?: string;
    agentId?: string;
    ttlMs: number;
    scopes: string[];
    singleUse?: boolean;
    rotatedFrom?: string;
  }): Promise<CloudIssuedToken> {
    const id = `tok_${randomUUID()}`;
    const plaintext = `lct_${input.kind}_${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "")}`;
    const tokenHash = hashToken(plaintext);
    const createdAt = this.now();
    const expiresAt = new Date(createdAt.getTime() + input.ttlMs);
    const record: CloudTokenRecord = {
      id,
      tokenHash,
      kind: input.kind,
      vaultId: input.vaultId,
      accountId: input.accountId,
      deviceId: input.deviceId ?? null,
      agentId: input.agentId ?? null,
      scopes: input.scopes,
      singleUse: Boolean(input.singleUse),
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      revokedAt: null,
      rotatedFrom: input.rotatedFrom ?? null,
      createdAt: createdAt.toISOString()
    };
    await this.store.saveToken(record);
    return { plaintext, record };
  }

  private async requireToken(plaintext: string, expectedKind?: CloudTokenKind): Promise<CloudTokenRecord> {
    const tokenHash = hashToken(plaintext);
    const record = await this.store.findTokenByHash(tokenHash);
    if (!record) {
      throw new CloudError("cloud.token_invalid", "token not recognized", 401);
    }
    if (record.revokedAt) {
      throw new CloudError("cloud.token_revoked", "token was revoked", 401);
    }
    if (Date.parse(record.expiresAt) < this.now().getTime()) {
      throw new CloudError("cloud.token_expired", "token has expired", 401);
    }
    if (record.singleUse && record.usedAt) {
      throw new CloudError("cloud.token_already_used", "single-use token has already been redeemed", 401);
    }
    if (expectedKind && record.kind !== expectedKind) {
      throw new CloudError("cloud.token_kind_mismatch", `expected ${expectedKind} token`, 401);
    }
    return record;
  }
}

function readBearerToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (!auth) return undefined;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return undefined;
  const value = match[1]?.trim();
  return value && value.startsWith("lct_") ? value : undefined;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text || text.trim().length === 0) {
    return {};
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    throw new CloudError("cloud.invalid_json", "request body must be JSON", 400);
  }
  throw new CloudError("cloud.invalid_json", "request body must be a JSON object", 400);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readRequiredString(value: unknown, field: string): string {
  const result = readOptionalString(value);
  if (!result) {
    throw new CloudError("cloud.field_required", `${field} is required`, 400);
  }
  return result;
}

function readObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSourceStatus(value: unknown): CaptureSourceRecord["status"] | undefined {
  if (value === "active" || value === "paused" || value === "error") {
    return value;
  }
  return undefined;
}

function normalizeCaptureMode(value: unknown): CapturedSession["captureMode"] {
  if (value === "summary_only" || value === "raw_archive" || value === "private_mode") {
    return value;
  }
  // Default to summary_only — the safest mode given v0.8 privacy contract.
  return "summary_only";
}

function normalizeRedactionMeta(value: unknown): CapturedSession["redaction"] {
  if (!value || typeof value !== "object") {
    return { version: "unknown", secretCount: 0, privateBlockCount: 0 };
  }
  const v = value as Record<string, unknown>;
  return {
    version: typeof v.version === "string" ? v.version : "unknown",
    secretCount:
      typeof v.secret_count === "number" ? v.secret_count :
      typeof v.secretCount === "number" ? v.secretCount : 0,
    privateBlockCount:
      typeof v.private_block_count === "number" ? v.private_block_count :
      typeof v.privateBlockCount === "number" ? v.privateBlockCount : 0
  };
}

function normalizeTurnSummary(value: unknown): Array<{ role: string; text: string }> {
  if (!Array.isArray(value)) return [];
  const out: Array<{ role: string; text: string }> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const role = typeof e.role === "string" ? e.role : "user";
    const text = typeof e.text === "string" ? e.text : "";
    out.push({ role, text });
  }
  return out;
}

export function serializeCloudError(error: unknown): CloudErrorPayload {
  if (error instanceof CloudError) {
    return { status: error.status, code: error.code, message: error.message, headers: error.headers };
  }
  if (error instanceof Error) {
    return { status: 500, code: "cloud.internal_error", message: error.message };
  }
  return { status: 500, code: "cloud.internal_error", message: "unknown cloud error" };
}

// === v0.9 helpers ===

interface PlanLimits {
  ingestTokenLimit: number;
  recallLimit: number;
  agentLimit: number;
}

function planLimitsFor(plan: string): PlanLimits {
  switch (plan) {
    case "personal":
      return { ingestTokenLimit: 10_000_000, recallLimit: 100_000, agentLimit: 5 };
    case "pro":
      return { ingestTokenLimit: 50_000_000, recallLimit: 500_000, agentLimit: 20 };
    case "team_beta":
      return { ingestTokenLimit: 200_000_000, recallLimit: 2_000_000, agentLimit: 50 };
    case "free":
    default:
      return { ingestTokenLimit: 1_000_000, recallLimit: 10_000, agentLimit: 3 };
  }
}

function monthBounds(periodIsoMonth: string): { periodStart: string; periodEnd: string } {
  // periodIsoMonth like "2026-05"; produce ISO bounds for that calendar month.
  const [yearStr, monthStr] = periodIsoMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    const fallback = new Date(`${periodIsoMonth}T00:00:00.000Z`);
    return {
      periodStart: fallback.toISOString(),
      periodEnd: new Date(fallback.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
}

function normalizeRawArchivePolicy(value: unknown): RawArchivePolicy | undefined {
  const allowed = ["none", "metadata_only", "summary_only", "encrypted_raw", "plain_raw_for_beta_debug"];
  return typeof value === "string" && allowed.includes(value) ? (value as RawArchivePolicy) : undefined;
}

function normalizeSourceStatusOrUndefined(value: unknown): SourceStatus | undefined {
  if (value === "active" || value === "paused" || value === "private_mode" || value === "revoked" || value === "error") {
    return value;
  }
  return undefined;
}

function normalizeRedactionState(value: unknown): CaptureEventRecord["redactionState"] | undefined {
  if (value === "redacted" || value === "raw_allowed" || value === "metadata_only") {
    return value;
  }
  return undefined;
}

function readPermissionEnvelopes(value: unknown): SourcePermissionEnvelope[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: SourcePermissionEnvelope[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const permissionType = readOptionalString(e.permission_type ?? e.permissionType);
    const valueStr = readOptionalString(e.value);
    if (!permissionType || !valueStr) continue;
    out.push({
      permissionType,
      scope: readOptionalString(e.scope) ?? null,
      value: valueStr,
      metadata: readObject(e.metadata) ?? {}
    });
  }
  return out;
}

// Public-facing source representation. Surfaces v0.9 metadata fields
// (display_name, raw_archive_policy, paused_at) as top-level fields and
// strips internal-only metadata that is not meant for the dashboard.
function toPublicSource(source: CaptureSourceRecord) {
  const md = source.metadata ?? {};
  const safeMetadata = { ...md };
  delete (safeMetadata as Record<string, unknown>).displayName;
  delete (safeMetadata as Record<string, unknown>).rawArchivePolicy;
  delete (safeMetadata as Record<string, unknown>).pausedAt;
  return {
    id: source.id,
    vaultId: source.vaultId,
    deviceId: source.deviceId ?? null,
    sourceType: source.sourceType,
    sourceProvider: source.sourceProvider ?? null,
    sourceRef: source.sourceRef ?? null,
    displayName: typeof md.displayName === "string" ? md.displayName : null,
    rawArchivePolicy: typeof md.rawArchivePolicy === "string" ? md.rawArchivePolicy : "summary_only",
    status: source.status,
    pausedAt: typeof md.pausedAt === "string" ? md.pausedAt : null,
    lastHeartbeatAt: source.lastHeartbeatAt ?? null,
    lastError: source.lastError ?? null,
    metadata: safeMetadata,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
}

// === capture-job worker helpers ===

export interface CaptureJobOutcome {
  job: CaptureJobRecord;
  candidate: MemoryCandidateRecord | null;
  /** True when the candidate fell back to rule-based extraction or the model gateway returned a fallback. */
  degraded: boolean;
  /** True when the candidate content/title were generated entirely from rule-based heuristics. */
  ruleBasedFallback: boolean;
  /** Set when the worker skipped extraction (e.g. paused source). */
  failureReason: string | null;
  /** Last model error captured for observability; null when the model path was clean. */
  modelError: string | null;
}

interface RuleBasedCandidate {
  title: string;
  content: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

function buildRuleBasedCandidate(session: CapturedSessionRecord): RuleBasedCandidate {
  const title = ruleBasedTitle(session);
  const content = ruleBasedContent(session);
  return {
    title,
    content,
    confidence: ruleBasedConfidence(session),
    metadata: {}
  };
}

function ruleBasedTitle(session: CapturedSessionRecord): string {
  const provider = providerLabel(session.provider);
  const projectHint = readStringFromMetadata(session.metadata, "projectHint");
  if (projectHint) return `${provider} session — ${projectHint}`;
  if (session.startedAt) return `${provider} session on ${session.startedAt.slice(0, 10)}`;
  return `${provider} session`;
}

function ruleBasedContent(session: CapturedSessionRecord): string {
  if (session.captureMode === "private_mode") return "";
  // Use the first meaningful assistant turn so the inbox shows something real.
  const firstAssistant = session.turnSummary.find(
    (turn) => turn.role === "assistant" && typeof turn.text === "string" && turn.text.trim().length > 10
  );
  if (firstAssistant?.text) {
    return firstAssistant.text.replace(/\s+/g, " ").trim().slice(0, 300);
  }
  if (session.turnSummary.length === 0) return "[no turn summary captured]";
  return `${session.turnSummary.length} turn${session.turnSummary.length === 1 ? "" : "s"} captured`;
}

function ruleBasedConfidence(session: CapturedSessionRecord): number {
  if (session.captureMode === "private_mode") return 0;
  const hasAssistantTurns = session.turnSummary.some((turn) => turn.role === "assistant");
  if (session.turnSummary.length >= 10 && hasAssistantTurns) return 0.65;
  if (session.turnSummary.length >= 4 && hasAssistantTurns) return 0.55;
  return 0.5;
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "claude_code": return "Claude Code";
    case "codex": return "Codex";
    case "cursor": return "Cursor";
    case "opencode": return "OpenCode";
    default: return provider;
  }
}

function readStringFromMetadata(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function candidateIdFromIdempotencyKey(idempotencyKey: string): string {
  const trimmed = idempotencyKey.startsWith("cap_") ? idempotencyKey.slice(4) : idempotencyKey;
  return `cand_${trimmed.slice(0, 40)}`;
}

function readCandidateIdFromPayload(payload: Record<string, unknown>): string | null {
  const value = payload.candidateId;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function hashShortText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function readInstallTokenQuotaConfig(env: NodeJS.ProcessEnv): InstallTokenQuotaConfig {
  const parse = (value: string | undefined, fallback: number): number => {
    if (typeof value !== "string" || value.trim().length === 0) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    perAccountPerHour: parse(env.LORE_INSTALL_TOKEN_PER_ACCOUNT_HOURLY, 5),
    perAccountPerDay: parse(env.LORE_INSTALL_TOKEN_PER_ACCOUNT_DAILY, 50),
    perVaultPerHour: parse(env.LORE_INSTALL_TOKEN_PER_VAULT_HOURLY, 5),
    perVaultPerDay: parse(env.LORE_INSTALL_TOKEN_PER_VAULT_DAILY, 50)
  };
}

export { hashToken } from "./cloud-store.js";
export { InMemoryCloudStore, PostgresCloudStore } from "./cloud-store.js";
export type {
  CloudStore,
  CloudTokenRecord,
  UsageEventRecord,
  AuditEventRecord,
  CaptureBatchRecord,
  CaptureEventRecord,
  HostedMcpClientRecord,
  OperatorUsageRow,
  RawArchivePolicy,
  SourceCheckpointRecord,
  SourcePermissionEnvelope,
  SourcePermissionRecord,
  SourceStatus,
  UsageLimitSnapshotRecord
} from "./cloud-store.js";
