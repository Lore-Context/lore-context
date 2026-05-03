import { execFileSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { homedir, platform as osPlatform } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { scanClaudeCode, scanCodex } from "@lore/capture";
import {
  readWatcherStatus,
  runWatchTick,
  type HeartbeatInput,
  type IngestSessionInput,
  type IngestSessionResult,
  type LoreClient,
  type WatcherCounters,
  type WatcherProvider,
  type WatcherSourcePolicy,
  type WatcherTickResult
} from "./watcher.js";

export {
  runWatchTick,
  runWatchLoop,
  loadWatcherCounters,
  loadCheckpoints,
  saveCheckpoints,
  readWatcherStatus,
  defaultSourceIdFor,
  watcherDirs,
  ensureWatcherDirs,
  type LoreClient,
  type WatcherCounters,
  type WatcherProvider,
  type WatcherTickResult,
  type WatcherCheckpointEntry,
  type RunWatchTickOptions,
  type RunWatchLoopOptions,
  type IngestSessionInput,
  type IngestSessionResult,
  type HeartbeatInput,
  type WatcherSourcePolicy
} from "./watcher.js";

export type ClientId = "claude-code" | "codex" | "cursor" | "opencode";
export type ConfigFormat = "json-mcp" | "codex-toml" | "opencode-json";
export type PlanAction = "create" | "update" | "remove" | "unchanged";
export type CredentialStorageKind = "env" | "keychain" | "file" | "none";

export interface BridgeRuntime {
  homeDir: string;
  repoRoot: string;
  env: NodeJS.ProcessEnv;
  now: () => Date;
  fetchImpl?: typeof fetch;
}

export interface ClientDefinition {
  id: ClientId;
  label: string;
  commandNames: string[];
  configFormat: ConfigFormat;
  configPath: (runtime: BridgeRuntime) => string;
  detectionPaths: (runtime: BridgeRuntime) => string[];
  managed: boolean;
}

export interface ClientDetection {
  id: ClientId;
  label: string;
  installed: boolean;
  commandPresent: boolean;
  detectionPaths: string[];
  existingPaths: string[];
  configPath: string;
  configExists: boolean;
  connected: boolean;
  managed: boolean;
}

export interface PairingResponse {
  deviceId: string;
  vaultId: string;
  accountId: string;
  deviceToken: string;
  deviceTokenExpiresAt: string;
  serviceToken?: string;
  serviceTokenExpiresAt?: string;
}

export interface CredentialBundle {
  deviceId: string;
  vaultId: string;
  accountId: string;
  deviceToken: string;
  deviceTokenExpiresAt?: string;
  serviceToken?: string;
  serviceTokenExpiresAt?: string;
  cloudUrl: string;
  pairedAt: string;
}

export interface CredentialStorageResult {
  kind: CredentialStorageKind;
  ref?: string;
  path?: string;
  warning?: string;
}

export interface ConnectOptions {
  runtime?: Partial<BridgeRuntime>;
  clients?: ClientId[];
  cloudUrl?: string;
  credentials?: CredentialBundle;
}

export interface ConfigPlan {
  clientId: ClientId;
  clientLabel: string;
  path: string;
  action: PlanAction;
  format: ConfigFormat;
  beforeExists: boolean;
  beforePreview: string;
  afterPreview: string;
  afterContent: string;
  warnings: string[];
}

export interface AppliedChange {
  clientId: ClientId;
  path: string;
  action: PlanAction;
  backupPath?: string;
}

export interface ApplyResult {
  rollbackId: string;
  rollbackMetadataPath: string;
  rollbackCommand: string;
  changes: AppliedChange[];
}

export interface RollbackResult {
  rollbackId: string;
  restored: Array<{ path: string; restoredFrom?: string; deletedCreatedFile?: boolean }>;
}

export interface BridgeStatus {
  cloudUrl?: string;
  cloudConfigured: boolean;
  accountId?: string;
  deviceId?: string;
  vaultId?: string;
  deviceTokenPresent: boolean;
  credentialStorage: CredentialStorageKind;
  credentialWarning?: string;
  connectedClients: ClientDetection[];
  disconnectedClients: ClientDetection[];
  captureWatcher: CaptureWatcherState;
  capturePackagePresent: boolean;
  captureCounters?: CaptureCounters;
  sourceStatuses: SourceStatus[];
  cloudCheck?: CloudCheckStatus;
  activeSources: number;
  capturedToday: number;
  pendingInboxCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  // v0.9 universal session watcher fields. Populated from
  // `~/.lore/watcher-state.json` and per-provider checkpoints.
  watcherCounters?: WatcherCounters;
  watcherCheckpointSummary?: Record<WatcherProvider, { tracked: number; lastUploadAt: string | null }>;
}

export interface CaptureWatcherState {
  state: "not-running" | "running" | "stopped" | "unknown";
  pid?: number;
  lastHeartbeatAt?: string;
  detail?: string;
}

export interface CaptureCounters {
  queued: number;
  uploaded: number;
  failed: number;
}

export interface SourceStatus {
  sourceId: string;
  provider: WatcherProvider;
  status: "active" | "missing" | "error" | "paused" | "private_mode" | "revoked";
  discovered: number;
  lastHeartbeatAt?: string;
  lastError?: string | null;
}

export interface CloudCheckStatus {
  ok: boolean;
  status?: number;
  code?: string;
  message?: string;
}

export interface TokenRevokeStatus {
  attempted: boolean;
  ok: boolean;
  status?: number;
  code?: string;
  message?: string;
}

interface BridgeState {
  cloudUrl?: string;
  deviceId?: string;
  vaultId?: string;
  accountId?: string;
  credentialStorage: CredentialStorageKind;
  credentialRef?: string;
  credentialPath?: string;
  connectedClients: ClientId[];
  sourceStatuses?: SourceStatus[];
  updatedAt: string;
}

interface RollbackMetadata {
  id: string;
  createdAt: string;
  changes: Array<{
    clientId: ClientId;
    path: string;
    beforeExisted: boolean;
    backupPath?: string;
  }>;
}

interface ParsedArgs {
  command: string;
  flags: Map<string, string[]>;
  positionals: string[];
}

const DEFAULT_CLOUD_URL = "http://127.0.0.1:3000";
const LORE_MARKER_START = "# BEGIN LORE BRIDGE MANAGED";
const LORE_MARKER_END = "# END LORE BRIDGE MANAGED";
const KEYCHAIN_SERVICE = "com.lorecontext.bridge";
const KEYCHAIN_ACCOUNT = "default";

export const allClients: ClientDefinition[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    commandNames: ["claude"],
    configFormat: "json-mcp",
    configPath: (runtime) => join(runtime.homeDir, ".claude.json"),
    detectionPaths: (runtime) => [join(runtime.homeDir, ".claude"), join(runtime.homeDir, ".claude.json")],
    managed: true
  },
  {
    id: "codex",
    label: "Codex",
    commandNames: ["codex"],
    configFormat: "codex-toml",
    configPath: (runtime) => join(runtime.homeDir, ".codex", "config.toml"),
    detectionPaths: (runtime) => [join(runtime.homeDir, ".codex"), join(runtime.homeDir, ".codex", "config.toml")],
    managed: true
  },
  {
    id: "cursor",
    label: "Cursor",
    commandNames: ["cursor", "cursor-agent"],
    configFormat: "json-mcp",
    configPath: (runtime) => join(runtime.homeDir, ".cursor", "mcp.json"),
    detectionPaths: (runtime) => [join(runtime.homeDir, ".cursor"), join(runtime.homeDir, ".cursor", "mcp.json")],
    managed: false
  },
  {
    id: "opencode",
    label: "OpenCode",
    commandNames: ["opencode"],
    configFormat: "opencode-json",
    configPath: (runtime) => join(runtime.homeDir, ".config", "opencode", "opencode.json"),
    detectionPaths: (runtime) => [join(runtime.homeDir, ".config", "opencode"), join(runtime.homeDir, ".config", "opencode", "opencode.json")],
    managed: false
  }
];

export function createRuntime(overrides: Partial<BridgeRuntime> = {}): BridgeRuntime {
  return {
    homeDir: overrides.homeDir ? resolve(overrides.homeDir) : homedir(),
    repoRoot: overrides.repoRoot ? resolve(overrides.repoRoot) : process.cwd(),
    env: overrides.env ?? process.env,
    now: overrides.now ?? (() => new Date()),
    fetchImpl: overrides.fetchImpl
  };
}

export function detectClients(runtimeInput: Partial<BridgeRuntime> = {}): ClientDetection[] {
  const runtime = createRuntime(runtimeInput);
  return allClients.map((client) => {
    const configPath = client.configPath(runtime);
    const detectionPaths = client.detectionPaths(runtime);
    const existingPaths = detectionPaths.filter((path) => existsSync(path));
    const commandPresent = client.commandNames.some((command) => commandExists(command, runtime));
    const configExists = existsSync(configPath);
    const content = configExists ? readTextFile(configPath) : "";
    return {
      id: client.id,
      label: client.label,
      installed: commandPresent || existingPaths.length > 0,
      commandPresent,
      detectionPaths,
      existingPaths,
      configPath,
      configExists,
      connected: configExists && isLoreConnected(client.configFormat, content),
      managed: client.managed
    };
  });
}

export async function redeemInstallToken(input: {
  cloudUrl: string;
  installToken: string;
  deviceLabel?: string;
  platform?: string;
  fetchImpl?: typeof fetch;
}): Promise<PairingResponse> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("fetch is unavailable; use --mock-pairing for local development");
  }
  const response = await fetchImpl(`${input.cloudUrl.replace(/\/$/, "")}/v1/cloud/devices/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      install_token: input.installToken,
      device_label: input.deviceLabel,
      platform: input.platform
    })
  });
  const payload = await safeReadJson(response);
  if (!response.ok) {
    const error = isRecord(payload.error) ? payload.error : payload;
    const code = typeof error.code === "string" ? error.code : `http_${response.status}`;
    const message = typeof error.message === "string" ? error.message : "install token redemption failed";
    throw new Error(`${code}: ${message}`);
  }
  return normalizePairingResponse(payload);
}

export function createMockPairing(runtimeInput: Partial<BridgeRuntime>, cloudUrl: string, label?: string): PairingResponse {
  const runtime = createRuntime(runtimeInput);
  const suffix = hashLight(`${label ?? "device"}:${runtime.now().toISOString()}`).slice(0, 12);
  const expires = new Date(runtime.now().getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  return {
    deviceId: `dev_mock_${suffix}`,
    vaultId: "vault_dev_mock",
    accountId: "acct_dev_mock",
    deviceToken: `lct_device_mock_${suffix}`,
    deviceTokenExpiresAt: expires,
    serviceToken: `lct_service_mock_${suffix}`,
    serviceTokenExpiresAt: expires
  };
}

export function storeCredentials(bundle: CredentialBundle, runtimeInput: Partial<BridgeRuntime> = {}): CredentialStorageResult {
  const runtime = createRuntime(runtimeInput);
  if (runtime.env.LORE_DEVICE_TOKEN) {
    return { kind: "env", ref: "LORE_DEVICE_TOKEN" };
  }
  if (canUseKeychain(runtime)) {
    try {
      execFileSync("security", [
        "add-generic-password",
        "-a", KEYCHAIN_ACCOUNT,
        "-s", KEYCHAIN_SERVICE,
        "-w", JSON.stringify(bundle),
        "-U"
      ], { stdio: "ignore" });
      return { kind: "keychain", ref: `${KEYCHAIN_SERVICE}:${KEYCHAIN_ACCOUNT}` };
    } catch {
      // Fall through to secure file fallback.
    }
  }

  const credentialPath = fallbackCredentialPath(runtime);
  mkdirSync(dirname(credentialPath), { recursive: true, mode: 0o700 });
  writeFileSync(credentialPath, `${JSON.stringify(bundle, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  chmodSync(credentialPath, 0o600);
  return {
    kind: "file",
    path: credentialPath,
    warning: `Keychain unavailable; stored pairing credentials in ${credentialPath} with 0600 permissions.`
  };
}

export function readStoredCredentials(runtimeInput: Partial<BridgeRuntime> = {}): CredentialBundle | undefined {
  const runtime = createRuntime(runtimeInput);
  if (runtime.env.LORE_DEVICE_TOKEN) {
    return {
      deviceId: runtime.env.LORE_DEVICE_ID ?? "env-device",
      vaultId: runtime.env.LORE_VAULT_ID ?? "env-vault",
      accountId: runtime.env.LORE_ACCOUNT_ID ?? "env-account",
      deviceToken: runtime.env.LORE_DEVICE_TOKEN,
      cloudUrl: runtime.env.LORE_CLOUD_URL ?? runtime.env.LORE_API_URL ?? DEFAULT_CLOUD_URL,
      pairedAt: runtime.now().toISOString()
    };
  }

  const state = readBridgeState(runtime);
  if (state?.credentialStorage === "keychain" && canUseKeychain(runtime)) {
    try {
      const output = execFileSync("security", [
        "find-generic-password",
        "-a", KEYCHAIN_ACCOUNT,
        "-s", KEYCHAIN_SERVICE,
        "-w"
      ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      return parseJsonText<CredentialBundle>(output);
    } catch {
      return undefined;
    }
  }

  const path = state?.credentialPath ?? fallbackCredentialPath(runtime);
  return parseJsonFile<CredentialBundle>(path);
}

export function deleteStoredCredentials(runtimeInput: Partial<BridgeRuntime> = {}): CredentialStorageResult {
  const runtime = createRuntime(runtimeInput);
  const state = readBridgeState(runtime);
  if (state?.credentialStorage === "keychain" && canUseKeychain(runtime)) {
    try {
      execFileSync("security", ["delete-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE], { stdio: "ignore" });
      return { kind: "keychain", ref: `${KEYCHAIN_SERVICE}:${KEYCHAIN_ACCOUNT}` };
    } catch {
      return { kind: "keychain", ref: `${KEYCHAIN_SERVICE}:${KEYCHAIN_ACCOUNT}`, warning: "Keychain delete failed or credential was already absent." };
    }
  }
  const path = state?.credentialPath ?? fallbackCredentialPath(runtime);
  if (existsSync(path)) {
    unlinkSync(path);
  }
  return { kind: "file", path };
}

export function buildConfigPlans(options: ConnectOptions = {}): ConfigPlan[] {
  const runtime = createRuntime(options.runtime);
  const credentials = options.credentials ?? readStoredCredentials(runtime);
  const selectedClients = selectClients(options.clients, { managedOnly: true });
  return selectedClients.map((client) => buildConfigPlan(client, runtime, {
    ...options,
    cloudUrl: options.cloudUrl ?? credentials?.cloudUrl,
    credentials
  }));
}

export function buildDisconnectPlans(options: ConnectOptions = {}): ConfigPlan[] {
  const runtime = createRuntime(options.runtime);
  const selectedClients = selectClients(options.clients, { managedOnly: true });
  return selectedClients.map((client) => buildDisconnectPlan(client, runtime));
}

export function applyConfigPlans(plans: ConfigPlan[], runtimeInput: Partial<BridgeRuntime> = {}): ApplyResult {
  const runtime = createRuntime(runtimeInput);
  const rollbackId = timestampId(runtime.now());
  const rollbackMetadataPath = join(loreStateDir(runtime), "rollbacks", `${rollbackId}.json`);
  const metadata: RollbackMetadata = {
    id: rollbackId,
    createdAt: runtime.now().toISOString(),
    changes: []
  };
  const changes: AppliedChange[] = [];

  for (const plan of plans) {
    if (plan.action === "unchanged") {
      changes.push({ clientId: plan.clientId, path: plan.path, action: plan.action });
      continue;
    }

    const beforeExisted = existsSync(plan.path);
    let backupPath: string | undefined;
    if (beforeExisted) {
      backupPath = `${plan.path}.lore-backup-${rollbackId}`;
      mkdirSync(dirname(backupPath), { recursive: true });
      copyFileSync(plan.path, backupPath);
    }

    mkdirSync(dirname(plan.path), { recursive: true });
    writeFileSync(plan.path, plan.afterContent, "utf8");
    metadata.changes.push({ clientId: plan.clientId, path: plan.path, beforeExisted, backupPath });
    changes.push({ clientId: plan.clientId, path: plan.path, action: plan.action, backupPath });
  }

  mkdirSync(dirname(rollbackMetadataPath), { recursive: true });
  writeFileSync(rollbackMetadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return {
    rollbackId,
    rollbackMetadataPath,
    rollbackCommand: `lore connect --rollback ${rollbackId}`,
    changes
  };
}

export function rollbackConfig(rollbackId: string, runtimeInput: Partial<BridgeRuntime> = {}): RollbackResult {
  const runtime = createRuntime(runtimeInput);
  const metadataPath = join(loreStateDir(runtime), "rollbacks", `${rollbackId}.json`);
  const metadata = parseJsonFile<RollbackMetadata>(metadataPath);
  if (!metadata) {
    throw new Error(`Rollback metadata not found: ${metadataPath}`);
  }

  const restored: RollbackResult["restored"] = [];
  for (const change of metadata.changes) {
    if (change.beforeExisted) {
      if (!change.backupPath || !existsSync(change.backupPath)) {
        throw new Error(`Rollback backup missing for ${change.path}`);
      }
      mkdirSync(dirname(change.path), { recursive: true });
      copyFileSync(change.backupPath, change.path);
      restored.push({ path: change.path, restoredFrom: change.backupPath });
    } else {
      rmSync(change.path, { force: true });
      restored.push({ path: change.path, deletedCreatedFile: true });
    }
  }

  return { rollbackId, restored };
}

export function getBridgeStatus(runtimeInput: Partial<BridgeRuntime> = {}): BridgeStatus {
  const runtime = createRuntime(runtimeInput);
  const state = readBridgeState(runtime);
  const credentials = readStoredCredentials(runtime);
  const cloudUrl = runtime.env.LORE_CLOUD_URL ?? runtime.env.LORE_API_URL ?? credentials?.cloudUrl ?? state?.cloudUrl;
  const detections = detectClients(runtime);
  const capturePackagePresent = hasCapturePackage(runtime);
  const captureCounters = capturePackagePresent ? readCaptureCounters(runtime) : undefined;

  const watcherStatus = readWatcherStatus(runtime);
  const sourceStatuses = readSourceStatuses(runtime);
  const capturedToday = watcherStatus.counters.capturedToday || captureCounters?.uploaded || 0;
  const pendingInboxCount = watcherStatus.counters.pendingReview;
  return {
    cloudUrl,
    cloudConfigured: Boolean(cloudUrl),
    accountId: credentials?.accountId ?? state?.accountId,
    deviceId: credentials?.deviceId ?? state?.deviceId,
    vaultId: credentials?.vaultId ?? state?.vaultId,
    deviceTokenPresent: Boolean(credentials?.deviceToken),
    credentialStorage: state?.credentialStorage ?? (runtime.env.LORE_DEVICE_TOKEN ? "env" : "none"),
    credentialWarning: state?.credentialStorage === "file" ? "Using secure-file credential fallback; prefer macOS Keychain when available." : undefined,
    connectedClients: detections.filter((client) => client.connected),
    disconnectedClients: detections.filter((client) => !client.connected),
    captureWatcher: readCaptureWatcherState(runtime),
    capturePackagePresent,
    captureCounters,
    sourceStatuses,
    activeSources: countActiveSources(sourceStatuses, watcherStatus.counters),
    capturedToday,
    pendingInboxCount,
    lastSyncAt: latestIso([
      watcherStatus.counters.lastUploadAt,
      ...sourceStatuses.map((source) => source.lastHeartbeatAt ?? null)
    ]),
    lastError: firstPresent([
      watcherStatus.counters.lastUploadError,
      ...sourceStatuses.map((source) => source.lastError ?? null)
    ]),
    watcherCounters: watcherStatus.counters,
    watcherCheckpointSummary: watcherStatus.checkpointSummary
  };
}

export async function getBridgeStatusWithCloudCheck(runtimeInput: Partial<BridgeRuntime> = {}): Promise<BridgeStatus> {
  const runtime = createRuntime(runtimeInput);
  const status = getBridgeStatus(runtime);
  const credentials = readStoredCredentials(runtime);
  if (!credentials?.deviceToken || !status.cloudUrl) {
    return { ...status, cloudCheck: { ok: false, code: "not_paired", message: "No stored device token." } };
  }
  return { ...status, cloudCheck: await checkCloudWhoami(status.cloudUrl, credentials.deviceToken, runtime.fetchImpl) };
}

export async function checkCloudWhoami(cloudUrl: string, deviceToken: string, fetchImpl: typeof fetch = globalThis.fetch): Promise<CloudCheckStatus> {
  try {
    const response = await fetchImpl(`${cloudUrl.replace(/\/$/, "")}/v1/cloud/whoami`, {
      headers: { authorization: `Bearer ${deviceToken}` }
    });
    if (response.ok) {
      return { ok: true, status: response.status };
    }
    const payload = await safeReadJson(response);
    const error = isRecord(payload.error) ? payload.error : payload;
    return {
      ok: false,
      status: response.status,
      code: typeof error.code === "string" ? error.code : `http_${response.status}`,
      message: typeof error.message === "string" ? error.message : "cloud check failed"
    };
  } catch (error) {
    return { ok: false, code: "network_error", message: error instanceof Error ? error.message : "cloud check failed" };
  }
}

export async function revokeStoredDeviceToken(runtimeInput: Partial<BridgeRuntime> = {}, credentialsInput?: CredentialBundle): Promise<TokenRevokeStatus> {
  const runtime = createRuntime(runtimeInput);
  const credentials = credentialsInput ?? readStoredCredentials(runtime);
  const cloudUrl = runtime.env.LORE_CLOUD_URL ?? runtime.env.LORE_API_URL ?? credentials?.cloudUrl;
  if (!credentials?.deviceToken || !cloudUrl) {
    return { attempted: false, ok: false, code: "not_paired", message: "No stored device token." };
  }

  try {
    const response = await bridgeFetch(runtime, `${cloudUrl.replace(/\/$/, "")}/v1/cloud/tokens/revoke`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credentials.deviceToken}`,
        "content-type": "application/json"
      },
      body: "{}"
    });
    if (response.ok) {
      return { attempted: true, ok: true, status: response.status };
    }
    const payload = await safeReadJson(response);
    return {
      attempted: true,
      ok: false,
      status: response.status,
      code: errorCodeFromPayload(payload) ?? `http_${response.status}`,
      message: errorMessageFromPayload(payload) ?? "token revoke failed"
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      code: "network_error",
      message: error instanceof Error ? error.message : "token revoke failed"
    };
  }
}

export async function runWatchOnce(runtimeInput: Partial<BridgeRuntime> = {}): Promise<SourceStatus[]> {
  const runtime = createRuntime(runtimeInput);
  const credentials = readStoredCredentials(runtime);
  const cloudUrl = runtime.env.LORE_CLOUD_URL ?? runtime.env.LORE_API_URL ?? credentials?.cloudUrl;
  const [claudeSources, codexSources] = await Promise.all([
    scanClaudeCode({ claudeCodeRoot: join(runtime.homeDir, ".claude", "projects") }),
    scanCodex({ codexRoots: [join(runtime.homeDir, ".codex", "sessions"), join(runtime.homeDir, ".config", "codex", "sessions"), join(runtime.homeDir, ".local", "share", "codex", "sessions")] })
  ]);
  const statuses: SourceStatus[] = [
    await heartbeatForProvider(runtime, "claude-code", claudeSources.length, cloudUrl, credentials?.deviceToken),
    await heartbeatForProvider(runtime, "codex", codexSources.length, cloudUrl, credentials?.deviceToken)
  ];
  writeSourceStatuses(runtime, statuses);
  writeCaptureWatcherState(runtime, {
    state: "stopped",
    lastHeartbeatAt: runtime.now().toISOString(),
    detail: "watch --once completed source discovery and heartbeat."
  });
  return statuses;
}

export async function runWatchBridgeOnce(runtimeInput: Partial<BridgeRuntime> = {}): Promise<WatcherTickResult> {
  const runtime = createRuntime(runtimeInput);
  const credentials = readStoredCredentials(runtime);
  const cloudUrl = runtime.env.LORE_CLOUD_URL ?? runtime.env.LORE_API_URL ?? credentials?.cloudUrl;
  return runWatchTick({
    runtime: { homeDir: runtime.homeDir, now: runtime.now },
    client: createBridgeLoreClient(runtime, cloudUrl, credentials?.deviceToken),
    vaultId: credentials?.vaultId ?? "unpaired-vault",
    deviceId: credentials?.deviceId ?? "unpaired-device",
    scanOverrides: {
      claudeCodeRoot: join(runtime.homeDir, ".claude", "projects"),
      codexRoots: [
        join(runtime.homeDir, ".codex", "sessions"),
        join(runtime.homeDir, ".config", "codex", "sessions"),
        join(runtime.homeDir, ".local", "share", "codex", "sessions")
      ],
      cursorRoots: [join(runtime.homeDir, ".cursor", "agent-sessions")],
      qwenRoots: [
        join(runtime.homeDir, ".opencode", "sessions"),
        join(runtime.homeDir, ".config", "opencode", "sessions")
      ]
    }
  });
}

function createBridgeLoreClient(runtime: BridgeRuntime, cloudUrl?: string, deviceToken?: string): LoreClient {
  const sourcePolicies = readSourcePolicies(runtime);
  return {
    async getSourcePolicy(sourceId: string): Promise<WatcherSourcePolicy | undefined> {
      return sourcePolicies.get(sourceId);
    },

    async heartbeat(input: HeartbeatInput): Promise<void> {
      const localStatus: SourceStatus = {
        sourceId: input.sourceId,
        provider: input.provider,
        status: input.status,
        discovered: input.discovered,
        lastHeartbeatAt: runtime.now().toISOString(),
        lastError: null
      };

      if (cloudUrl && deviceToken) {
        try {
          const response = await bridgeFetch(runtime, `${cloudUrl.replace(/\/$/, "")}/v1/capture/sources/${encodeURIComponent(input.sourceId)}/heartbeat`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${deviceToken}`,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              source_type: "agent_session",
              source_provider: input.provider,
              status: input.status === "active" || input.status === "paused" || input.status === "error" ? input.status : "active",
              error: input.lastError ?? null,
              metadata: {
                discovered: input.discovered,
                ...(input.metadata ?? {}),
                ...(input.status === "private_mode" ? { privateMode: true } : {})
              }
            })
          });
          if (!response.ok) {
            localStatus.status = "error";
            localStatus.lastError = await responseErrorCode(response);
          }
        } catch (error) {
          localStatus.status = "error";
          localStatus.lastError = error instanceof Error ? error.message : "heartbeat failed";
        }
      } else {
        localStatus.lastError = "not_paired";
      }

      upsertSourceStatus(runtime, localStatus);
    },

    async ingestSession(input: IngestSessionInput): Promise<IngestSessionResult> {
      if (!cloudUrl || !deviceToken) {
        const error = new Error("not_paired") as Error & { status?: number };
        error.status = 401;
        throw error;
      }

      const response = await bridgeFetch(runtime, `${cloudUrl.replace(/\/$/, "")}/v1/capture/sessions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${deviceToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(captureSessionToCloudBody(input))
      });
      const payload = await safeReadJson(response);
      if (!response.ok) {
        const error = new Error(await responseErrorCode(response, payload)) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const session = isRecord(payload.session) ? payload.session : {};
      const job = isRecord(payload.job) ? payload.job : {};
      return {
        sessionId: typeof session.id === "string" ? session.id : "unknown-session",
        jobId: typeof job.id === "string" ? job.id : "unknown-job",
        duplicate: Boolean(payload.duplicate)
      };
    }
  };
}

function captureSessionToCloudBody(input: IngestSessionInput): Record<string, unknown> {
  const session = input.session;
  return {
    provider: session.provider,
    source_original_id: session.sourceOriginalId,
    source_id: session.sourceId,
    content_hash: session.contentHash,
    idempotency_key: session.idempotencyKey,
    capture_mode: session.captureMode,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    redaction: session.redaction,
    metadata: {
      ...session.metadata,
      sourcePath: input.sourcePath,
      sourceProvider: input.sourceProvider
    },
    turn_summary: session.turns.map((turn) => ({
      role: turn.role,
      text: turn.text,
      timestamp: turn.timestamp
    })),
    ...(session.captureMode === "raw_archive" ? { raw_turns: session.turns } : {})
  };
}

async function bridgeFetch(runtime: BridgeRuntime, url: string, init: RequestInit): Promise<Response> {
  const fetchImpl = runtime.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("fetch is unavailable");
  }
  return fetchImpl(url, init);
}

export async function runCli(
  argv: string[],
  io: { stdout: Pick<NodeJS.WriteStream, "write">; stderr: Pick<NodeJS.WriteStream, "write"> } = process,
  runtimeOverrides: Partial<BridgeRuntime> = {}
): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    const runtime = runtimeFromArgs(parsed, runtimeOverrides);

    if (!parsed.command || readBoolFlag(parsed, "help")) {
      io.stdout.write(helpText());
      return 0;
    }

    if (parsed.command === "connect") {
      const rollbackId = readFlag(parsed, "rollback");
      if (rollbackId) {
        io.stdout.write(formatRollbackResult(rollbackConfig(rollbackId, runtime)));
        return 0;
      }

      const clients = readClients(parsed);
      const cloudUrl = readFlag(parsed, "cloud-url") ?? runtime.env.LORE_CLOUD_URL ?? runtime.env.LORE_API_URL ?? DEFAULT_CLOUD_URL;
      const isWrite = readBoolFlag(parsed, "write");
      const credentials = isWrite ? await maybePairFromArgs(parsed, runtime, cloudUrl) : readStoredCredentials(runtime);
      const stored = isWrite && credentials ? storeCredentials(credentials, runtime) : undefined;
      if (stored && credentials) {
        writeBridgeState(runtime, {
          cloudUrl: credentials.cloudUrl,
          deviceId: credentials.deviceId,
          vaultId: credentials.vaultId,
          accountId: credentials.accountId,
          credentialStorage: stored.kind,
          credentialRef: stored.ref,
          credentialPath: stored.path,
          connectedClients: [],
          sourceStatuses: readSourceStatuses(runtime),
          updatedAt: runtime.now().toISOString()
        });
      }
      const plans = buildConfigPlans({ runtime, clients, cloudUrl, credentials });

      if (readBoolFlag(parsed, "json")) {
        io.stdout.write(`${JSON.stringify(plans.map(redactPlan), null, 2)}\n`);
        return 0;
      }

      if (isWrite) {
        const result = applyConfigPlans(plans, runtime);
        if (credentials) persistPairedState(runtime, credentials, plans, stored);
        io.stdout.write(formatApplyResult(result, stored));
        return 0;
      }

      io.stdout.write(formatConnectPlan(plans, credentials));
      return 0;
    }

    if (parsed.command === "disconnect") {
      const rollbackId = readFlag(parsed, "rollback");
      if (rollbackId) {
        io.stdout.write(formatRollbackResult(rollbackConfig(rollbackId, runtime)));
        return 0;
      }
      const plans = buildDisconnectPlans({ runtime, clients: readClients(parsed) });
      if (readBoolFlag(parsed, "json")) {
        io.stdout.write(`${JSON.stringify(plans.map(redactPlan), null, 2)}\n`);
        return 0;
      }
      if (readBoolFlag(parsed, "write")) {
        const credentials = readStoredCredentials(runtime);
        const result = applyConfigPlans(plans, runtime);
        const revoke = await revokeStoredDeviceToken(runtime, credentials);
        const deleted = deleteStoredCredentials(runtime);
        writeBridgeState(runtime, {
          cloudUrl: readBridgeState(runtime)?.cloudUrl,
          credentialStorage: "none",
          connectedClients: [],
          updatedAt: runtime.now().toISOString()
        });
        io.stdout.write(formatDisconnectResult(result, deleted, revoke));
        return 0;
      }
      io.stdout.write(formatDisconnectPlan(plans));
      return 0;
    }

    if (parsed.command === "status") {
      const status = readBoolFlag(parsed, "check-cloud") ? await getBridgeStatusWithCloudCheck(runtime) : getBridgeStatus(runtime);
      if (readBoolFlag(parsed, "json")) {
        io.stdout.write(`${JSON.stringify(redactStatus(status), null, 2)}\n`);
      } else {
        io.stdout.write(formatStatus(status));
      }
      return 0;
    }

    if (parsed.command === "watch") {
      const result = await runWatchBridgeOnce(runtime);
      io.stdout.write(formatWatchTickResult(result));
      return 0;
    }

    io.stderr.write(`Unknown lore command: ${parsed.command}\n\n${helpText()}`);
    return 1;
  } catch (error) {
    io.stderr.write(`${redactText(error instanceof Error ? error.message : String(error))}\n`);
    return 1;
  }
}

function runtimeFromArgs(parsed: ParsedArgs, runtimeOverrides: Partial<BridgeRuntime>): BridgeRuntime {
  const homeDir = readFlag(parsed, "home");
  const repoRoot = readFlag(parsed, "repo");
  return createRuntime({ ...runtimeOverrides, homeDir: homeDir ?? runtimeOverrides.homeDir, repoRoot: repoRoot ?? runtimeOverrides.repoRoot });
}

async function maybePairFromArgs(parsed: ParsedArgs, runtime: BridgeRuntime, cloudUrl: string): Promise<CredentialBundle | undefined> {
  const installToken = readFlag(parsed, "install-token");
  const mockPairing = readBoolFlag(parsed, "mock-pairing");
  if (!installToken && !mockPairing) {
    return readStoredCredentials(runtime);
  }
  const label = readFlag(parsed, "device-label") ?? "Lore local bridge";
  const pair = mockPairing
    ? createMockPairing(runtime, cloudUrl, label)
    : await redeemInstallToken({
      cloudUrl,
      installToken: installToken ?? "",
      deviceLabel: label,
      platform: osPlatform(),
      fetchImpl: runtime.fetchImpl
    });
  return {
    deviceId: pair.deviceId,
    vaultId: pair.vaultId,
    accountId: pair.accountId,
    deviceToken: pair.deviceToken,
    deviceTokenExpiresAt: pair.deviceTokenExpiresAt,
    serviceToken: pair.serviceToken,
    serviceTokenExpiresAt: pair.serviceTokenExpiresAt,
    cloudUrl,
    pairedAt: runtime.now().toISOString()
  };
}

function persistPairedState(runtime: BridgeRuntime, credentials: CredentialBundle, plans: ConfigPlan[], stored?: CredentialStorageResult): CredentialStorageResult {
  const storage = stored ?? storeCredentials(credentials, runtime);
  writeBridgeState(runtime, {
    cloudUrl: credentials.cloudUrl,
    deviceId: credentials.deviceId,
    vaultId: credentials.vaultId,
    accountId: credentials.accountId,
    credentialStorage: storage.kind,
    credentialRef: storage.ref,
    credentialPath: storage.path,
    connectedClients: plans.map((plan) => plan.clientId),
    sourceStatuses: readSourceStatuses(runtime),
    updatedAt: runtime.now().toISOString()
  });
  return storage;
}

function buildConfigPlan(client: ClientDefinition, runtime: BridgeRuntime, options: ConnectOptions): ConfigPlan {
  const path = client.configPath(runtime);
  const beforeExists = existsSync(path);
  const beforeContent = beforeExists ? readTextFile(path) : "";
  const cloudUrl = options.cloudUrl ?? DEFAULT_CLOUD_URL;
  const credentials = options.credentials;
  const afterContent = renderConfig(client, beforeContent, runtime, cloudUrl, credentials);
  const action: PlanAction = !beforeExists ? "create" : beforeContent === afterContent ? "unchanged" : "update";
  const warnings = [
    ...malformedConfigWarning(client, beforeContent),
    ...(!credentials ? ["No stored device token found; config will reference the local bridge credential store and status will remain unpaired until `lore connect --install-token ... --write` succeeds."] : []),
    ...(client.id === "cursor" || client.id === "opencode" ? [`${client.label} is detection-only P1 in this v0.8 lane; write support remains scaffolded.`] : [])
  ];

  return {
    clientId: client.id,
    clientLabel: client.label,
    path,
    action,
    format: client.configFormat,
    beforeExists,
    beforePreview: redactText(beforeContent || "(missing file)"),
    afterPreview: redactText(afterContent),
    afterContent,
    warnings
  };
}

function buildDisconnectPlan(client: ClientDefinition, runtime: BridgeRuntime): ConfigPlan {
  const path = client.configPath(runtime);
  const beforeExists = existsSync(path);
  const beforeContent = beforeExists ? readTextFile(path) : "";
  const warnings = malformedConfigWarning(client, beforeContent);
  const afterContent = beforeExists ? removeLoreConfig(client, beforeContent) : "";
  const action: PlanAction = !beforeExists || beforeContent === afterContent ? "unchanged" : "remove";
  return {
    clientId: client.id,
    clientLabel: client.label,
    path,
    action,
    format: client.configFormat,
    beforeExists,
    beforePreview: redactText(beforeContent || "(missing file)"),
    afterPreview: redactText(afterContent || "(empty file)"),
    afterContent,
    warnings
  };
}

function renderConfig(client: ClientDefinition, beforeContent: string, runtime: BridgeRuntime, cloudUrl: string, credentials?: CredentialBundle): string {
  if (client.configFormat === "codex-toml") {
    return renderCodexToml(beforeContent, runtime, cloudUrl, credentials);
  }

  if (client.configFormat === "opencode-json") {
    const existing = parseJsonText<Record<string, unknown>>(beforeContent) ?? {};
    const next = {
      ...existing,
      mcp: {
        ...(isRecord(existing.mcp) ? existing.mcp : {}),
        lore: {
          type: "local",
          command: ["node", mcpServerEntry(runtime)],
          enabled: true,
          environment: bridgeEnv(runtime, cloudUrl, credentials)
        }
      }
    };
    return `${JSON.stringify(next, null, 2)}\n`;
  }

  const existing = parseJsonText<Record<string, unknown>>(beforeContent) ?? {};
  const next = {
    ...existing,
    mcpServers: {
      ...(isRecord(existing.mcpServers) ? existing.mcpServers : {}),
      lore: {
        command: "node",
        args: [mcpServerEntry(runtime)],
        env: bridgeEnv(runtime, cloudUrl, credentials)
      }
    }
  };
  return `${JSON.stringify(next, null, 2)}\n`;
}

function renderCodexToml(beforeContent: string, runtime: BridgeRuntime, cloudUrl: string, credentials?: CredentialBundle): string {
  const env = bridgeEnv(runtime, cloudUrl, credentials);
  const block = [
    LORE_MARKER_START,
    "[mcp_servers.lore]",
    'command = "node"',
    `args = [${tomlString(mcpServerEntry(runtime))}]`,
    "[mcp_servers.lore.env]",
    ...Object.entries(env).map(([key, value]) => `${key} = ${tomlString(value)}`),
    LORE_MARKER_END
  ].join("\n");

  const trimmed = beforeContent.trimEnd();
  if (!trimmed) {
    return `${block}\n`;
  }

  const startIndex = beforeContent.indexOf(LORE_MARKER_START);
  const endIndex = beforeContent.indexOf(LORE_MARKER_END);
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = beforeContent.slice(0, startIndex).trimEnd();
    const after = beforeContent.slice(endIndex + LORE_MARKER_END.length).trimStart();
    return `${before ? `${before}\n\n` : ""}${block}${after ? `\n\n${after.trimEnd()}` : ""}\n`;
  }

  return `${trimmed}\n\n${block}\n`;
}

function removeLoreConfig(client: ClientDefinition, beforeContent: string): string {
  if (client.configFormat === "codex-toml") {
    const startIndex = beforeContent.indexOf(LORE_MARKER_START);
    const endIndex = beforeContent.indexOf(LORE_MARKER_END);
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const before = beforeContent.slice(0, startIndex).trimEnd();
      const after = beforeContent.slice(endIndex + LORE_MARKER_END.length).trimStart();
      return `${before}${before && after ? "\n\n" : ""}${after.trimEnd()}${before || after ? "\n" : ""}`;
    }
    return beforeContent;
  }

  const existing = parseJsonText<Record<string, unknown>>(beforeContent);
  if (!existing) {
    return beforeContent;
  }
  if (client.configFormat === "opencode-json" && isRecord(existing.mcp)) {
    const nextMcp = { ...existing.mcp };
    delete nextMcp.lore;
    return `${JSON.stringify({ ...existing, mcp: nextMcp }, null, 2)}\n`;
  }
  if (isRecord(existing.mcpServers)) {
    const nextServers = { ...existing.mcpServers };
    delete nextServers.lore;
    return `${JSON.stringify({ ...existing, mcpServers: nextServers }, null, 2)}\n`;
  }
  return beforeContent;
}

function bridgeEnv(runtime: BridgeRuntime, cloudUrl: string, credentials?: CredentialBundle): Record<string, string> {
  const state = readBridgeState(runtime);
  const storageKind = state?.credentialStorage ?? (runtime.env.LORE_DEVICE_TOKEN ? "env" : credentials ? "pending" : "none");
  return {
    LORE_CLOUD_URL: cloudUrl,
    LORE_API_URL: cloudUrl,
    LORE_MCP_TRANSPORT: "sdk",
    LORE_BRIDGE_CREDENTIAL_SOURCE: storageKind,
    LORE_BRIDGE_CREDENTIAL_REF: state?.credentialRef ?? state?.credentialPath ?? fallbackCredentialPath(runtime)
  };
}

function isLoreConnected(format: ConfigFormat, content: string): boolean {
  if (!content.trim()) {
    return false;
  }
  if (format === "codex-toml") {
    return content.includes("[mcp_servers.lore]") || content.includes("[mcp_servers.\"lore\"]");
  }

  const parsed = parseJsonText<Record<string, unknown>>(content);
  if (!parsed) {
    return false;
  }
  if (format === "opencode-json") {
    return Boolean(isRecord(parsed.mcp) && isRecord(parsed.mcp.lore));
  }
  return Boolean(isRecord(parsed.mcpServers) && isRecord(parsed.mcpServers.lore));
}

async function heartbeatForProvider(
  runtime: BridgeRuntime,
  provider: "claude-code" | "codex",
  discovered: number,
  cloudUrl?: string,
  deviceToken?: string
): Promise<SourceStatus> {
  const now = runtime.now().toISOString();
  const status: SourceStatus = {
    sourceId: `src_${provider}`,
    provider,
    status: discovered > 0 ? "active" : "missing",
    discovered,
    lastHeartbeatAt: now,
    lastError: null
  };
  if (!cloudUrl || !deviceToken) {
    status.lastError = "not_paired";
    return status;
  }
  try {
    const fetchImpl = runtime.fetchImpl ?? globalThis.fetch;
    const response = await fetchImpl(`${cloudUrl.replace(/\/$/, "")}/v1/capture/sources/${encodeURIComponent(status.sourceId)}/heartbeat`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${deviceToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        source_type: "agent_session",
        source_provider: provider,
        status: status.status === "active" ? "active" : "error",
        metadata: { discovered }
      })
    });
    if (!response.ok) {
      const payload = await safeReadJson(response);
      const error = isRecord(payload.error) ? payload.error : payload;
      status.status = "error";
      status.lastError = typeof error.code === "string" ? error.code : `http_${response.status}`;
    }
  } catch (error) {
    status.status = "error";
    status.lastError = error instanceof Error ? error.message : "heartbeat failed";
  }
  return status;
}

function readCaptureWatcherState(runtime: BridgeRuntime): CaptureWatcherState {
  const path = join(loreStateDir(runtime), "capture-watcher.json");
  const state = parseJsonFile<CaptureWatcherState>(path);
  if (!state) {
    return { state: "not-running", detail: "No capture watcher state file found." };
  }
  if (state.pid && processExists(state.pid)) {
    return { ...state, state: "running" };
  }
  return { ...state, state: state.state === "running" ? "stopped" : state.state };
}

function writeCaptureWatcherState(runtime: BridgeRuntime, state: CaptureWatcherState): void {
  const path = join(loreStateDir(runtime), "capture-watcher.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function readCaptureCounters(runtime: BridgeRuntime): CaptureCounters {
  const queuePath = join(loreStateDir(runtime), "capture-queue.json");
  const queue = parseJsonFile<Record<string, unknown>>(queuePath);
  if (!queue) {
    return { queued: 0, uploaded: 0, failed: 0 };
  }
  return {
    queued: countQueueValue(queue.queued),
    uploaded: countQueueValue(queue.uploaded),
    failed: countQueueValue(queue.failed)
  };
}

function countQueueValue(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length;
  }
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readSourceStatuses(runtime: BridgeRuntime): SourceStatus[] {
  return parseJsonFile<{ sources: SourceStatus[] }>(sourceStatusPath(runtime))?.sources ?? [];
}

function writeSourceStatuses(runtime: BridgeRuntime, sources: SourceStatus[]): void {
  const path = sourceStatusPath(runtime);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ sources }, null, 2)}\n`, "utf8");
}

function upsertSourceStatus(runtime: BridgeRuntime, next: SourceStatus): void {
  const sources = readSourceStatuses(runtime).filter((source) => source.sourceId !== next.sourceId);
  sources.push(next);
  writeSourceStatuses(runtime, sources.sort((a, b) => a.sourceId.localeCompare(b.sourceId)));
}

function readSourcePolicies(runtime: BridgeRuntime): Map<string, WatcherSourcePolicy> {
  const policies = new Map<string, WatcherSourcePolicy>();
  const file = join(loreStateDir(runtime), "source-policies.json");
  const parsed = parseJsonFile<{ policies?: Array<{ sourceId?: string } & Partial<WatcherSourcePolicy>> } | Record<string, Partial<WatcherSourcePolicy>>>(file);
  if (!parsed) return policies;

  if (Array.isArray((parsed as { policies?: unknown }).policies)) {
    for (const entry of (parsed as { policies: Array<{ sourceId?: string } & Partial<WatcherSourcePolicy>> }).policies) {
      if (entry.sourceId && isWatcherPolicyStatus(entry.status)) {
        policies.set(entry.sourceId, { status: entry.status, rawArchiveEnabled: entry.rawArchiveEnabled });
      }
    }
    return policies;
  }

  for (const [sourceId, value] of Object.entries(parsed)) {
    if (isRecord(value) && isWatcherPolicyStatus(value.status)) {
      policies.set(sourceId, { status: value.status, rawArchiveEnabled: typeof value.rawArchiveEnabled === "boolean" ? value.rawArchiveEnabled : undefined });
    }
  }
  return policies;
}

function isWatcherPolicyStatus(value: unknown): value is WatcherSourcePolicy["status"] {
  return value === "active" || value === "paused" || value === "private_mode" || value === "revoked" || value === "error";
}

function countActiveSources(sources: SourceStatus[], counters: WatcherCounters): number {
  const active = sources.filter((source) => source.status === "active").length;
  return Math.max(active, counters.connectedSources);
}

function latestIso(values: Array<string | null | undefined>): string | null {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0).sort().at(-1) ?? null;
}

function firstPresent(values: Array<string | null | undefined>): string | null {
  return values.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

function sourceStatusPath(runtime: BridgeRuntime): string {
  return join(loreStateDir(runtime), "source-status.json");
}

function hasCapturePackage(runtime: BridgeRuntime): boolean {
  return [
    join(runtime.repoRoot, "packages", "capture"),
    join(runtime.repoRoot, "packages", "capture-engine"),
    join(runtime.repoRoot, "apps", "capture-engine")
  ].some((path) => existsSync(path));
}

function writeBridgeState(runtime: BridgeRuntime, state: BridgeState): void {
  const path = join(loreStateDir(runtime), "bridge-state.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function readBridgeState(runtime: BridgeRuntime): BridgeState | undefined {
  return parseJsonFile<BridgeState>(join(loreStateDir(runtime), "bridge-state.json"));
}

function loreStateDir(runtime: BridgeRuntime): string {
  return join(runtime.homeDir, ".lore");
}

function fallbackCredentialPath(runtime: BridgeRuntime): string {
  return join(loreStateDir(runtime), "credentials.json");
}

function canUseKeychain(runtime: BridgeRuntime): boolean {
  return runtime.env.LORE_CLI_DISABLE_KEYCHAIN !== "1" && osPlatform() === "darwin" && commandExists("security", runtime);
}

function selectClients(clientIds?: ClientId[], options: { managedOnly?: boolean } = {}): ClientDefinition[] {
  const candidates = options.managedOnly ? allClients.filter((client) => client.managed) : allClients;
  if (!clientIds || clientIds.length === 0) {
    return candidates;
  }
  return clientIds.map((clientId) => {
    const client = allClients.find((candidate) => candidate.id === clientId);
    if (!client) {
      throw new Error(`Unsupported client: ${clientId}`);
    }
    if (options.managedOnly && !client.managed) {
      throw new Error(`${client.label} is detection-only in this lane; use Claude Code or Codex for managed writes.`);
    }
    return client;
  });
}

function mcpServerEntry(runtime: BridgeRuntime): string {
  return join(runtime.repoRoot, "apps", "mcp-server", "dist", "index.js");
}

function commandExists(command: string, runtime: BridgeRuntime): boolean {
  const paths = (runtime.env.PATH ?? "").split(delimiter).filter(Boolean);
  for (const path of paths) {
    const candidate = join(path, command);
    try {
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      // Continue searching PATH.
    }
  }
  return false;
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readTextFile(path: string): string {
  return readFileSync(path, "utf8");
}

function parseJsonFile<T>(path: string): T | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return parseJsonText<T>(readTextFile(path));
}

function parseJsonText<T>(text: string): T | undefined {
  if (!text.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestampId(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, "").replace("T", "T").replace("Z", "Z");
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function malformedConfigWarning(client: ClientDefinition, content: string): string[] {
  if (!content.trim() || client.configFormat === "codex-toml") {
    return [];
  }
  return parseJsonText<Record<string, unknown>>(content) ? [] : [`Existing ${client.label} config is malformed JSON; write mode will preserve a backup before replacing it.`];
}

async function safeReadJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(text);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function responseErrorCode(response: Response, payload?: Record<string, unknown>): Promise<string> {
  const body = payload ?? await safeReadJson(response);
  return errorCodeFromPayload(body) ?? `http_${response.status}`;
}

function errorCodeFromPayload(payload: Record<string, unknown>): string | undefined {
  const error = isRecord(payload.error) ? payload.error : payload;
  return typeof error.code === "string" ? error.code : undefined;
}

function errorMessageFromPayload(payload: Record<string, unknown>): string | undefined {
  const error = isRecord(payload.error) ? payload.error : payload;
  return typeof error.message === "string" ? error.message : undefined;
}

function normalizePairingResponse(payload: Record<string, unknown>): PairingResponse {
  const deviceId = requiredString(payload.deviceId ?? payload.device_id, "deviceId");
  const vaultId = requiredString(payload.vaultId ?? payload.vault_id, "vaultId");
  const accountId = requiredString(payload.accountId ?? payload.account_id, "accountId");
  const deviceToken = requiredString(payload.deviceToken ?? payload.device_token, "deviceToken");
  const deviceTokenExpiresAt = requiredString(payload.deviceTokenExpiresAt ?? payload.device_token_expires_at, "deviceTokenExpiresAt");
  return {
    deviceId,
    vaultId,
    accountId,
    deviceToken,
    deviceTokenExpiresAt,
    serviceToken: optionalString(payload.serviceToken ?? payload.service_token),
    serviceTokenExpiresAt: optionalString(payload.serviceTokenExpiresAt ?? payload.service_token_expires_at)
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`pairing response missing ${field}`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function hashLight(input: string): string {
  let hash = 5381;
  for (const char of input) {
    hash = ((hash << 5) + hash) ^ char.charCodeAt(0);
  }
  return Math.abs(hash).toString(36);
}

function redactPlan(plan: ConfigPlan): Omit<ConfigPlan, "afterContent"> {
  return {
    clientId: plan.clientId,
    clientLabel: plan.clientLabel,
    path: plan.path,
    action: plan.action,
    format: plan.format,
    beforeExists: plan.beforeExists,
    beforePreview: plan.beforePreview,
    afterPreview: plan.afterPreview,
    warnings: plan.warnings
  };
}

function redactStatus(status: BridgeStatus): BridgeStatus {
  return JSON.parse(redactText(JSON.stringify(status))) as BridgeStatus;
}

function redactText(input: string): string {
  return input
    .replace(/lct_(?:install|device|service|session)_[A-Za-z0-9._~+/=-]+/gi, "<redacted-token>")
    .replace(/lore_(?:device|service|install|secret)[A-Za-z0-9._~+/=-]*/gi, "<redacted-token>")
    .replace(/((?:TOKEN|KEY|SECRET|PASSWORD|AUTH)[A-Z0-9_ -]*["']?\s*[:=]\s*["'])([^"'\n]+)(["'])/gi, "$1<redacted>$3")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1<redacted>");
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const flags = new Map<string, string[]>();
  const positionals: string[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg?.startsWith("--")) {
      positionals.push(arg ?? "");
      continue;
    }

    const raw = arg.slice(2);
    const [name, inlineValue] = raw.split("=", 2);
    const value = inlineValue ?? (rest[index + 1] && !rest[index + 1].startsWith("--") ? rest[++index] : "true");
    const values = flags.get(name) ?? [];
    values.push(value);
    flags.set(name, values);
  }

  return { command, flags, positionals };
}

function readFlag(parsed: ParsedArgs, name: string): string | undefined {
  const values = parsed.flags.get(name);
  if (!values || values.length === 0) {
    return undefined;
  }
  return values[values.length - 1];
}

function readBoolFlag(parsed: ParsedArgs, name: string): boolean {
  return parsed.flags.has(name) && readFlag(parsed, name) !== "false";
}

function readClients(parsed: ParsedArgs): ClientId[] | undefined {
  const values = parsed.flags.get("client");
  if (!values || values.length === 0) {
    return undefined;
  }
  const clients = values.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean);
  if (clients.includes("all")) {
    return undefined;
  }
  return clients as ClientId[];
}

function formatConnectPlan(plans: ConfigPlan[], credentials?: CredentialBundle): string {
  const lines = ["Lore bridge connect plan (dry-run; no files were written)", ""];
  lines.push(`pairing: ${credentials ? "ready; token will be stored securely only in write mode" : "not paired"}`);
  lines.push("");
  for (const plan of plans) {
    lines.push(`${plan.clientLabel} [${plan.action}]`);
    lines.push(`  path: ${plan.path}`);
    lines.push(`  before: ${firstPreviewLine(plan.beforePreview)}`);
    lines.push(`  after: ${firstPreviewLine(plan.afterPreview)}`);
    for (const warning of plan.warnings) {
      lines.push(`  warning: ${warning}`);
    }
    lines.push("");
  }
  lines.push("Run with --write to apply. Rollback metadata and backups are created before any write.");
  return `${lines.join("\n")}\n`;
}

function formatDisconnectPlan(plans: ConfigPlan[]): string {
  const lines = ["Lore bridge disconnect plan (dry-run; no files were written)", ""];
  for (const plan of plans) {
    lines.push(`${plan.clientLabel} [${plan.action}]`);
    lines.push(`  path: ${plan.path}`);
    for (const warning of plan.warnings) {
      lines.push(`  warning: ${warning}`);
    }
    lines.push("");
  }
  lines.push("Run with --write to remove managed config and local credentials. Backups are created before any write.");
  return `${lines.join("\n")}\n`;
}

function firstPreviewLine(preview: string): string {
  const compact = preview.trim().split("\n").find((line) => line.trim().length > 0) ?? "(empty)";
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}

function formatApplyResult(result: ApplyResult, stored?: CredentialStorageResult): string {
  const lines = ["Lore bridge connect applied", `rollback metadata: ${result.rollbackMetadataPath}`, `rollback command: ${result.rollbackCommand}`, ""];
  if (stored) {
    lines.push(`credential storage: ${stored.kind}${stored.path ? ` (${stored.path})` : ""}`);
    if (stored.warning) lines.push(`credential warning: ${stored.warning}`);
    lines.push("");
  }
  for (const change of result.changes) {
    lines.push(`${change.clientId}: ${change.action} ${change.path}${change.backupPath ? ` (backup: ${change.backupPath})` : ""}`);
  }
  return `${redactText(lines.join("\n"))}\n`;
}

function formatDisconnectResult(result: ApplyResult, deleted: CredentialStorageResult, revoke?: TokenRevokeStatus): string {
  const lines = ["Lore bridge disconnect applied", `rollback metadata: ${result.rollbackMetadataPath}`, `rollback command: lore disconnect --rollback ${result.rollbackId}`, `credentials cleared: ${deleted.kind}${deleted.path ? ` (${deleted.path})` : ""}`];
  if (revoke) {
    lines.push(`cloud revoke: ${formatRevokeStatus(revoke)}`);
  }
  lines.push("");
  for (const change of result.changes) {
    lines.push(`${change.clientId}: ${change.action} ${change.path}${change.backupPath ? ` (backup: ${change.backupPath})` : ""}`);
  }
  return `${redactText(lines.join("\n"))}\n`;
}

function formatRevokeStatus(revoke: TokenRevokeStatus): string {
  if (!revoke.attempted) return "skipped (not paired)";
  if (revoke.ok) return `ok${revoke.status ? ` (${revoke.status})` : ""}`;
  return `failed ${revoke.code ?? revoke.status ?? "unknown"}${revoke.message ? ` (${revoke.message})` : ""}`;
}

function formatRollbackResult(result: RollbackResult): string {
  const lines = [`Lore bridge rollback restored ${result.rollbackId}`, ""];
  for (const item of result.restored) {
    lines.push(`${item.path}: ${item.deletedCreatedFile ? "deleted created file" : `restored from ${item.restoredFrom}`}`);
  }
  return `${lines.join("\n")}\n`;
}

function formatStatus(status: BridgeStatus): string {
  const connected = status.connectedClients.map((client) => client.label).join(", ") || "none";
  const lines = [
    "Lore bridge status",
    `cloud URL: ${status.cloudConfigured ? `configured (${status.cloudUrl})` : "unconfigured"}`,
    `account id: ${status.accountId ?? "missing"}`,
    `device id: ${status.deviceId ?? "missing"}`,
    `vault id: ${status.vaultId ?? "missing"}`,
    `device token: ${status.deviceTokenPresent ? "present" : "missing"}`,
    `credential storage: ${status.credentialStorage}`,
    `connected clients: ${connected}`,
    `active sources: ${status.activeSources}`,
    `captured today: ${status.capturedToday}`,
    `pending inbox: ${status.pendingInboxCount}`,
    `last sync: ${status.lastSyncAt ?? "never"}`,
    `last error: ${status.lastError ?? "none"}`,
    `capture watcher: ${status.captureWatcher.state}${status.captureWatcher.lastHeartbeatAt ? ` (last heartbeat ${status.captureWatcher.lastHeartbeatAt})` : ""}`
  ];
  if (status.credentialWarning) lines.push(`credential warning: ${status.credentialWarning}`);
  if (status.captureCounters) {
    lines.push(`capture counters: queued=${status.captureCounters.queued} uploaded=${status.captureCounters.uploaded} failed=${status.captureCounters.failed}`);
  } else {
    lines.push("capture counters: unavailable (capture package not present)");
  }
  if (status.sourceStatuses.length > 0) {
    for (const source of status.sourceStatuses) {
      lines.push(`source ${source.provider}: ${source.status} discovered=${source.discovered}${source.lastError ? ` last_error=${source.lastError}` : ""}`);
    }
  } else {
    lines.push("source status: no heartbeat yet");
  }
  if (status.cloudCheck) {
    lines.push(`cloud check: ${status.cloudCheck.ok ? "ok" : `failed ${status.cloudCheck.code ?? status.cloudCheck.status ?? "unknown"}`}`);
  }
  if (status.watcherCounters) {
    const w = status.watcherCounters;
    lines.push(
      `watcher: connected=${w.connectedSources} watching=${w.watching.length > 0 ? w.watching.join(",") : "none"} ` +
      `captured_today=${w.capturedToday} uploaded_today=${w.uploadedToday} failed_today=${w.failedToday} ` +
      `pending_review=${w.pendingReview} last_upload=${w.lastUploadAt ?? "never"} ` +
      `last_error=${w.lastUploadError ?? "none"}`
    );
  }
  return `${redactText(lines.join("\n"))}\n`;
}

function formatWatchResult(statuses: SourceStatus[]): string {
  const lines = ["Lore capture watcher one-shot completed"];
  for (const status of statuses) {
    lines.push(`source ${status.provider}: ${status.status} discovered=${status.discovered}${status.lastError ? ` last_error=${status.lastError}` : ""}`);
  }
  return `${redactText(lines.join("\n"))}\n`;
}

function formatWatchTickResult(result: WatcherTickResult): string {
  const lines = ["Lore capture watcher one-shot completed"];
  lines.push(`uploads: ${result.uploads.length}`);
  lines.push(`skipped: ${result.skipped.length}`);
  lines.push(`failures: ${result.failures.length}`);
  lines.push(
    `health: connected=${result.counters.connectedSources} captured_today=${result.counters.capturedToday} ` +
    `uploaded_today=${result.counters.uploadedToday} failed_today=${result.counters.failedToday} ` +
    `pending_review=${result.counters.pendingReview} last_upload=${result.counters.lastUploadAt ?? "never"} ` +
    `last_error=${result.counters.lastUploadError ?? "none"}`
  );
  for (const upload of result.uploads) {
    lines.push(`uploaded ${upload.provider}: ${upload.sessionId} job=${upload.jobId}${upload.duplicate ? " duplicate=true" : ""}`);
  }
  for (const skipped of result.skipped.slice(0, 10)) {
    lines.push(`skipped ${skipped.provider}: ${skipped.reason}`);
  }
  for (const failure of result.failures.slice(0, 10)) {
    lines.push(`failure ${failure.provider}: ${failure.error} attempts=${failure.attempts}`);
  }
  return `${redactText(lines.join("\n"))}\n`;
}

function helpText(): string {
  return [
    "Usage: lore <command> [options]",
    "",
    "Commands:",
    "  connect      Pair and plan/apply Claude Code and Codex bridge config",
    "  disconnect   Plan/apply removal of managed bridge config and credentials",
    "  status       Show cloud pairing, clients, source health, watcher, and queue state",
    "  watch        One-shot source discovery and heartbeat for Claude Code/Codex",
    "",
    "Options:",
    "  --dry-run                 Default for connect/disconnect; print plan only",
    "  --write                   Apply connect/disconnect plan with backups",
    "  --rollback <id>           Restore a previous write",
    "  --install-token <token>   Redeem a one-time install token; never printed",
    "  --mock-pairing            Create local dev pairing credentials without cloud",
    "  --device-label <label>    Local bridge device label",
    "  --client <id[,id]>        Limit to claude-code, codex, or all",
    "  --cloud-url <url>         Cloud/API URL for pairing and config",
    "  --check-cloud             status: call /v1/cloud/whoami with stored token",
    "  --home <path>             Override HOME for tests or staged installs",
    "  --repo <path>             Override Lore repo root for MCP server path",
    "  --json                    Emit machine-readable output"
  ].join("\n") + "\n";
}
