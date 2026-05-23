import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

export type ConnectorProviderId = "google_drive";
export type ConnectorConnectionStatus = "active" | "paused" | "revoked" | "deleted" | "error";
export type ConnectorSyncMode = "backfill" | "incremental";

export interface ConnectorScope {
  type: "drive" | "folder" | "page" | "database";
  id: string;
  displayName?: string;
}

export interface ConnectorAuthContext {
  vaultId: string;
  accountId: string;
  actorId?: string | null;
}

export interface ConnectorProviderInfo {
  provider: ConnectorProviderId;
  label: string;
  auth: "oauth2";
  liveCredentials: boolean;
  privateBeta: boolean;
  credentialStatus: "configured" | "missing";
  credentialEnv: string[];
  missingCredentialEnv: string[];
  signInScopes: string[];
  scopes: string[];
  fixtureBacked: boolean;
}

export interface ConnectorConnection {
  id: string;
  vaultId: string;
  accountId: string;
  provider: ConnectorProviderId;
  displayName: string;
  status: ConnectorConnectionStatus;
  scope: ConnectorScope;
  permissions: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
  revokedAt?: string | null;
  deletedAt?: string | null;
  lastError?: string | null;
}

export interface ConnectorTokenSet {
  connectionId: string;
  provider: ConnectorProviderId;
  tokenType: "Bearer";
  accessToken: string;
  refreshToken?: string | null;
  scopes: string[];
  expiresAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ConnectorCheckpoint {
  connectionId: string;
  provider: ConnectorProviderId;
  cursor: string;
  documentIds: string[];
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ConnectorDocumentSummary {
  schemaVersion: "v0.9.connector.summary";
  provider: ConnectorProviderId;
  connectionId: string;
  externalId: string;
  title: string;
  mimeType: string;
  excerpt: string;
  contentHash: string;
  sourceRefs: Array<{ type: "connector_document"; provider: ConnectorProviderId; id: string; url?: string }>;
  metadata: Record<string, unknown>;
}

export interface ConnectorInboxCandidate {
  id: string;
  state: "pending";
  candidateType: "connector_document";
  sourceProvider: ConnectorProviderId;
  sourceRef: string;
  contentHash: string;
  title: string;
  excerpt: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface ConnectorDocument {
  id: string;
  connectionId: string;
  vaultId: string;
  provider: ConnectorProviderId;
  externalId: string;
  title: string;
  mimeType: string;
  url?: string;
  parentIds: string[];
  modifiedAt: string;
  metadata: Record<string, unknown>;
  summary: ConnectorDocumentSummary;
  candidate: ConnectorInboxCandidate;
  status: "active" | "deleted";
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorChannelState {
  id: string;
  resourceId: string;
  token: string;
  status: "active" | "renewal_due" | "stopped";
  expiresAt: string;
  renewAfter: string;
  createdAt: string;
  updatedAt: string;
  renewedFrom?: string | null;
}

export interface ConnectorSyncJob {
  id: string;
  connectionId: string;
  vaultId: string;
  provider: ConnectorProviderId;
  mode: ConnectorSyncMode;
  status: "completed" | "failed";
  documentsSeen: number;
  documentsUpserted: number;
  checkpointCursor: string;
  error?: string | null;
  createdAt: string;
  completedAt: string;
}

export interface ConnectorWebhookEvent {
  id: string;
  connectionId: string;
  provider: ConnectorProviderId;
  valid: boolean;
  eventType: string;
  resourceId?: string | null;
  receivedAt: string;
  headers: Record<string, string>;
  payload: Record<string, unknown>;
}

export interface ConnectorAuthorizationInput {
  auth: ConnectorAuthContext;
  state: string;
  redirectUri?: string;
  scope?: ConnectorScope;
}

export interface ConnectorAuthorizationUrl {
  provider: ConnectorProviderId;
  authorizationUrl: string;
  state: string;
  scopes: string[];
  signInScopes: string[];
  fixtureBacked: boolean;
  privateBeta: boolean;
  credentialStatus: "configured" | "missing";
  credentialEnv: string[];
  missingCredentialEnv: string[];
}

export interface ConnectorCallbackInput {
  auth: ConnectorAuthContext;
  code: string;
  state?: string;
  redirectUri?: string;
  scope?: ConnectorScope;
  displayName?: string;
}

export interface ConnectorWebhookInput {
  connectionId: string;
  headers: Record<string, string>;
  payload: Record<string, unknown>;
}

export interface ConnectorWebhookResult {
  accepted: boolean;
  reason: string;
  event?: ConnectorWebhookEvent;
}

export interface ConnectorSyncResult {
  connectionId: string;
  provider: ConnectorProviderId;
  mode: ConnectorSyncMode;
  job: ConnectorSyncJob;
  checkpoint: ConnectorCheckpoint;
  documents: ConnectorDocument[];
}

export interface ConnectorStore {
  saveConnection(connection: ConnectorConnection): Promise<ConnectorConnection>;
  getConnection(connectionId: string): Promise<ConnectorConnection | undefined>;
  listConnections(vaultId: string): Promise<ConnectorConnection[]>;
  updateConnectionStatus(
    connectionId: string,
    status: ConnectorConnectionStatus,
    patch?: Partial<ConnectorConnection>
  ): Promise<ConnectorConnection | undefined>;

  saveToken(token: ConnectorTokenSet): Promise<void>;
  getToken(connectionId: string): Promise<ConnectorTokenSet | undefined>;
  deleteToken(connectionId: string): Promise<void>;

  saveCheckpoint(checkpoint: ConnectorCheckpoint): Promise<void>;
  getCheckpoint(connectionId: string): Promise<ConnectorCheckpoint | undefined>;
  deleteCheckpoint(connectionId: string): Promise<void>;

  upsertDocument(document: ConnectorDocument): Promise<ConnectorDocument>;
  listDocuments(connectionId: string): Promise<ConnectorDocument[]>;
  deleteDocuments(connectionId: string): Promise<number>;

  saveSyncJob(job: ConnectorSyncJob): Promise<void>;
  saveWebhookEvent(event: ConnectorWebhookEvent): Promise<void>;
  listWebhookEvents(connectionId: string): Promise<ConnectorWebhookEvent[]>;
}

export interface ConnectorProvider {
  readonly info: ConnectorProviderInfo;
  createAuthorizationUrl(input: ConnectorAuthorizationInput): Promise<ConnectorAuthorizationUrl>;
  handleCallback(input: ConnectorCallbackInput, store: ConnectorStore): Promise<ConnectorConnection>;
  refreshTokens(connectionId: string, store: ConnectorStore): Promise<ConnectorTokenSet>;
  verifyWebhook(input: ConnectorWebhookInput, store: ConnectorStore): Promise<ConnectorWebhookResult>;
  backfill(connectionId: string, store: ConnectorStore): Promise<ConnectorSyncResult>;
  syncIncremental(connectionId: string, store: ConnectorStore): Promise<ConnectorSyncResult>;
  renewChannel(connectionId: string, store: ConnectorStore): Promise<ConnectorConnection>;
  revoke(connectionId: string, store: ConnectorStore): Promise<void>;
  deleteConnection(connectionId: string, store: ConnectorStore): Promise<void>;
}

export class ConnectorError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InMemoryConnectorStore implements ConnectorStore {
  private readonly connections = new Map<string, ConnectorConnection>();
  private readonly tokens = new Map<string, ConnectorTokenSet>();
  private readonly checkpoints = new Map<string, ConnectorCheckpoint>();
  private readonly documents = new Map<string, ConnectorDocument>();
  private readonly syncJobs = new Map<string, ConnectorSyncJob>();
  private readonly webhookEvents: ConnectorWebhookEvent[] = [];

  async saveConnection(connection: ConnectorConnection): Promise<ConnectorConnection> {
    const cloned = cloneConnection(connection);
    this.connections.set(cloned.id, cloned);
    return cloneConnection(cloned);
  }

  async getConnection(connectionId: string): Promise<ConnectorConnection | undefined> {
    const connection = this.connections.get(connectionId);
    return connection ? cloneConnection(connection) : undefined;
  }

  async listConnections(vaultId: string): Promise<ConnectorConnection[]> {
    return [...this.connections.values()]
      .filter((connection) => connection.vaultId === vaultId && connection.status !== "deleted")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(cloneConnection);
  }

  async updateConnectionStatus(
    connectionId: string,
    status: ConnectorConnectionStatus,
    patch: Partial<ConnectorConnection> = {}
  ): Promise<ConnectorConnection | undefined> {
    const connection = this.connections.get(connectionId);
    if (!connection) return undefined;
    const next = cloneConnection({
      ...connection,
      ...patch,
      status,
      metadata: { ...connection.metadata, ...(patch.metadata ?? {}) }
    });
    this.connections.set(connectionId, next);
    return cloneConnection(next);
  }

  async saveToken(token: ConnectorTokenSet): Promise<void> {
    this.tokens.set(token.connectionId, cloneToken(token));
  }

  async getToken(connectionId: string): Promise<ConnectorTokenSet | undefined> {
    const token = this.tokens.get(connectionId);
    return token ? cloneToken(token) : undefined;
  }

  async deleteToken(connectionId: string): Promise<void> {
    this.tokens.delete(connectionId);
  }

  async saveCheckpoint(checkpoint: ConnectorCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.connectionId, cloneCheckpoint(checkpoint));
  }

  async getCheckpoint(connectionId: string): Promise<ConnectorCheckpoint | undefined> {
    const checkpoint = this.checkpoints.get(connectionId);
    return checkpoint ? cloneCheckpoint(checkpoint) : undefined;
  }

  async deleteCheckpoint(connectionId: string): Promise<void> {
    this.checkpoints.delete(connectionId);
  }

  async upsertDocument(document: ConnectorDocument): Promise<ConnectorDocument> {
    const cloned = cloneDocument(document);
    this.documents.set(cloned.id, cloned);
    return cloneDocument(cloned);
  }

  async listDocuments(connectionId: string): Promise<ConnectorDocument[]> {
    return [...this.documents.values()]
      .filter((document) => document.connectionId === connectionId && document.status !== "deleted")
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
      .map(cloneDocument);
  }

  async deleteDocuments(connectionId: string): Promise<number> {
    let deleted = 0;
    for (const [id, document] of this.documents.entries()) {
      if (document.connectionId === connectionId) {
        this.documents.delete(id);
        deleted += 1;
      }
    }
    return deleted;
  }

  async saveSyncJob(job: ConnectorSyncJob): Promise<void> {
    this.syncJobs.set(job.id, { ...job });
  }

  async saveWebhookEvent(event: ConnectorWebhookEvent): Promise<void> {
    this.webhookEvents.push(cloneWebhookEvent(event));
  }

  async listWebhookEvents(connectionId: string): Promise<ConnectorWebhookEvent[]> {
    return this.webhookEvents
      .filter((event) => event.connectionId === connectionId)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .map(cloneWebhookEvent);
  }
}

export interface ConnectorServiceOptions {
  store?: ConnectorStore;
  providers?: ConnectorProvider[];
  now?: () => Date;
}

export class ConnectorService {
  readonly store: ConnectorStore;
  private readonly providers = new Map<ConnectorProviderId, ConnectorProvider>();
  private readonly now: () => Date;

  constructor(options: ConnectorServiceOptions = {}) {
    this.store = options.store ?? new InMemoryConnectorStore();
    this.now = options.now ?? (() => new Date());
    for (const provider of options.providers ?? [new GoogleDriveFixtureProvider({ now: this.now })]) {
      this.providers.set(provider.info.provider, provider);
    }
  }

  listProviders(): ConnectorProviderInfo[] {
    return [...this.providers.values()].map((provider) => ({ ...provider.info, scopes: [...provider.info.scopes], credentialEnv: [...provider.info.credentialEnv] }));
  }

  async listConnections(auth: ConnectorAuthContext): Promise<ConnectorConnection[]> {
    return this.store.listConnections(auth.vaultId);
  }

  async createAuthorizationUrl(input: {
    auth: ConnectorAuthContext;
    provider: ConnectorProviderId;
    redirectUri?: string;
    scope?: ConnectorScope;
    state?: string;
  }): Promise<ConnectorAuthorizationUrl> {
    const provider = this.requireProvider(input.provider);
    return provider.createAuthorizationUrl({
      auth: input.auth,
      state: input.state ?? `state_${randomUUID()}`,
      redirectUri: input.redirectUri,
      scope: input.scope
    });
  }

  async handleCallback(input: {
    auth: ConnectorAuthContext;
    provider: ConnectorProviderId;
    code: string;
    state?: string;
    redirectUri?: string;
    scope?: ConnectorScope;
    displayName?: string;
  }): Promise<ConnectorConnection> {
    const provider = this.requireProvider(input.provider);
    return provider.handleCallback(input, this.store);
  }

  async setConnectionStatus(
    auth: ConnectorAuthContext,
    connectionId: string,
    status: Extract<ConnectorConnectionStatus, "active" | "paused">
  ): Promise<ConnectorConnection> {
    const connection = await this.requireConnectionForVault(auth, connectionId);
    if (connection.status === "revoked" || connection.status === "deleted") {
      throw new ConnectorError("connector.connection_closed", "revoked or deleted connector cannot be resumed", 409);
    }
    const now = this.now().toISOString();
    const next = await this.store.updateConnectionStatus(connectionId, status, { updatedAt: now });
    if (!next) throw new ConnectorError("connector.connection_not_found", "connector connection not found", 404);
    return next;
  }

  async sync(input: {
    auth: ConnectorAuthContext;
    connectionId: string;
    mode: ConnectorSyncMode;
  }): Promise<ConnectorSyncResult> {
    const connection = await this.requireConnectionForVault(input.auth, input.connectionId);
    if (connection.status === "paused") {
      throw new ConnectorError("connector.connection_paused", "connector is paused; resume before syncing", 409);
    }
    if (connection.status === "revoked" || connection.status === "deleted") {
      throw new ConnectorError("connector.connection_closed", "connector is revoked or deleted", 409);
    }
    const provider = this.requireProvider(connection.provider);
    return input.mode === "backfill"
      ? provider.backfill(input.connectionId, this.store)
      : provider.syncIncremental(input.connectionId, this.store);
  }

  async getConnectionStatus(
    auth: ConnectorAuthContext,
    connectionId: string
  ): Promise<{ connection: ConnectorConnection; checkpoint?: ConnectorCheckpoint; documents: ConnectorDocument[] }> {
    const connection = await this.requireConnectionForVault(auth, connectionId);
    return {
      connection,
      checkpoint: await this.store.getCheckpoint(connectionId),
      documents: await this.store.listDocuments(connectionId)
    };
  }

  async renewChannel(auth: ConnectorAuthContext, connectionId: string): Promise<ConnectorConnection> {
    const connection = await this.requireConnectionForVault(auth, connectionId);
    if (connection.status === "revoked" || connection.status === "deleted") {
      throw new ConnectorError("connector.connection_closed", "revoked or deleted connector cannot renew a channel", 409);
    }
    const provider = this.requireProvider(connection.provider);
    return provider.renewChannel(connectionId, this.store);
  }

  async verifyWebhook(input: ConnectorWebhookInput): Promise<ConnectorWebhookResult> {
    const connection = await this.store.getConnection(input.connectionId);
    if (!connection) {
      throw new ConnectorError("connector.connection_not_found", "connector connection not found", 404);
    }
    const provider = this.requireProvider(connection.provider);
    return provider.verifyWebhook(input, this.store);
  }

  async revokeOrDelete(input: {
    auth: ConnectorAuthContext;
    connectionId: string;
    deleteSourceData?: boolean;
  }): Promise<{ connection: ConnectorConnection; deletedDocuments: number }> {
    const connection = await this.requireConnectionForVault(input.auth, input.connectionId);
    const provider = this.requireProvider(connection.provider);
    if (input.deleteSourceData) {
      const before = await this.store.listDocuments(input.connectionId);
      await provider.deleteConnection(input.connectionId, this.store);
      const next = await this.store.getConnection(input.connectionId);
      return { connection: next ?? { ...connection, status: "deleted" }, deletedDocuments: before.length };
    }
    await provider.revoke(input.connectionId, this.store);
    const next = await this.store.getConnection(input.connectionId);
    return { connection: next ?? { ...connection, status: "revoked" }, deletedDocuments: 0 };
  }

  private requireProvider(provider: ConnectorProviderId): ConnectorProvider {
    const found = this.providers.get(provider);
    if (!found) {
      throw new ConnectorError("connector.provider_not_found", `connector provider ${provider} is not available`, 404);
    }
    return found;
  }

  private async requireConnectionForVault(auth: ConnectorAuthContext, connectionId: string): Promise<ConnectorConnection> {
    const connection = await this.store.getConnection(connectionId);
    if (!connection) {
      throw new ConnectorError("connector.connection_not_found", "connector connection not found", 404);
    }
    if (connection.vaultId !== auth.vaultId) {
      throw new ConnectorError("connector.cross_vault_denied", "connector belongs to another vault", 403);
    }
    return connection;
  }
}

export interface GoogleDriveFixtureDocument {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  parents: string[];
  modifiedTime: string;
  changeId?: string;
  text: string;
  owners?: string[];
}

export interface GoogleDriveFixtureProviderOptions {
  documents?: GoogleDriveFixtureDocument[];
  now?: () => Date;
}

const GOOGLE_SIGN_IN_SCOPES = ["openid", "email", "profile"];
const GOOGLE_DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const GOOGLE_ENV = [
  "GOOGLE_DRIVE_CLIENT_ID",
  "GOOGLE_DRIVE_CLIENT_SECRET",
  "GOOGLE_DRIVE_REDIRECT_URI",
  "CONNECTOR_TOKEN_ENCRYPTION_KEY"
];

export class GoogleDriveFixtureProvider implements ConnectorProvider {
  private readonly documents: GoogleDriveFixtureDocument[];
  private readonly now: () => Date;

  constructor(options: GoogleDriveFixtureProviderOptions = {}) {
    this.documents = options.documents ?? defaultGoogleDriveFixtureDocuments();
    this.now = options.now ?? (() => new Date());
  }

  get info(): ConnectorProviderInfo {
    const credentials = googleDriveCredentialStatus();
    return {
      provider: "google_drive",
      label: "Google Drive",
      auth: "oauth2",
      liveCredentials: credentials.configured,
      privateBeta: !credentials.configured,
      credentialStatus: credentials.configured ? "configured" : "missing",
      credentialEnv: [...GOOGLE_ENV],
      missingCredentialEnv: credentials.missing,
      signInScopes: [...GOOGLE_SIGN_IN_SCOPES],
      scopes: [...GOOGLE_DRIVE_SCOPES],
      fixtureBacked: true
    };
  }

  async createAuthorizationUrl(input: ConnectorAuthorizationInput): Promise<ConnectorAuthorizationUrl> {
    const credentials = googleDriveCredentialStatus();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", credentials.clientId ?? "private-beta-google-drive-client-id");
    url.searchParams.set("redirect_uri", input.redirectUri ?? credentials.redirectUri ?? "http://127.0.0.1:3000/v1/connectors/google_drive/callback");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("scope", GOOGLE_DRIVE_SCOPES.join(" "));
    url.searchParams.set("state", input.state);
    if (input.scope?.type === "folder") {
      url.searchParams.set("lore_folder_id", input.scope.id);
    }
    return {
      provider: "google_drive",
      authorizationUrl: url.toString(),
      state: input.state,
      scopes: [...GOOGLE_DRIVE_SCOPES],
      signInScopes: [...GOOGLE_SIGN_IN_SCOPES],
      fixtureBacked: true,
      privateBeta: !credentials.configured,
      credentialStatus: credentials.configured ? "configured" : "missing",
      credentialEnv: [...GOOGLE_ENV],
      missingCredentialEnv: credentials.missing
    };
  }

  async handleCallback(input: ConnectorCallbackInput, store: ConnectorStore): Promise<ConnectorConnection> {
    if (!input.code) {
      throw new ConnectorError("connector.oauth_code_required", "OAuth callback code is required", 400);
    }
    const fixtureBacked = input.code.startsWith("fixture-");
    const credentials = googleDriveCredentialStatus();
    if (!fixtureBacked && !credentials.configured) {
      throw new ConnectorError(
        "connector.credentials_missing",
        `Google Drive connector is private beta until these env vars are configured: ${credentials.missing.join(", ")}`,
        503
      );
    }
    if (!fixtureBacked) {
      throw new ConnectorError("connector.live_oauth_pending", "live Google Drive OAuth exchange is API pending; fixture callbacks remain available for tests", 501);
    }
    const now = this.now().toISOString();
    const scope = input.scope ?? { type: "folder", id: "fld_lore_beta", displayName: "Lore beta folder" };
    const channel = createGoogleDriveChannel(this.now(), null);
    const connection: ConnectorConnection = {
      id: `conn_gdrive_${randomUUID()}`,
      vaultId: input.auth.vaultId,
      accountId: input.auth.accountId,
      provider: "google_drive",
      displayName: input.displayName ?? "Google Drive fixture",
      status: "active",
      scope,
      permissions: {
        mode: "metadata_and_summary",
        scopes: [...GOOGLE_DRIVE_SCOPES],
        signInScopes: [...GOOGLE_SIGN_IN_SCOPES],
        folderScoped: scope.type === "folder"
      },
      metadata: {
        fixtureBacked: true,
        privateBeta: !credentials.configured,
        liveCredentials: credentials.configured,
        credentialStatus: credentials.configured ? "configured" : "missing",
        oauthState: input.state ?? null,
        googleAccount: "fixture-drive-user@example.com",
        channel,
        webhookToken: channel.token
      },
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
      revokedAt: null,
      deletedAt: null,
      lastError: null
    };
    await store.saveConnection(connection);
    await store.saveToken({
      connectionId: connection.id,
      provider: "google_drive",
      tokenType: "Bearer",
      accessToken: encryptConnectorSecret("fixture-google-drive-access-token", { fixtureBacked: true }),
      refreshToken: encryptConnectorSecret("fixture-google-drive-refresh-token", { fixtureBacked: true }),
      scopes: [...GOOGLE_DRIVE_SCOPES],
      expiresAt: new Date(this.now().getTime() + 60 * 60 * 1000).toISOString(),
      updatedAt: now,
      metadata: {
        fixtureBacked: true,
        liveCredentials: credentials.configured,
        encrypted: true,
        keySource: tokenEncryptionKeySource(true),
        refreshTokenPreview: secretPreview("fixture-google-drive-refresh-token")
      }
    });
    await store.saveCheckpoint({
      connectionId: connection.id,
      provider: "google_drive",
      cursor: "0",
      documentIds: [],
      updatedAt: now,
      metadata: { phase: "authorized", driveChangesPageToken: "0", changeIds: [] }
    });
    return connection;
  }

  async refreshTokens(connectionId: string, store: ConnectorStore): Promise<ConnectorTokenSet> {
    const token = await store.getToken(connectionId);
    if (!token) {
      throw new ConnectorError("connector.token_missing", "connector token is missing", 401);
    }
    const fixtureBacked = token.metadata.fixtureBacked === true;
    decryptConnectorSecret(token.refreshToken ?? "", { fixtureBacked });
    const refreshed: ConnectorTokenSet = {
      ...token,
      accessToken: encryptConnectorSecret("fixture-google-drive-access-token-refreshed", { fixtureBacked }),
      expiresAt: new Date(this.now().getTime() + 60 * 60 * 1000).toISOString(),
      updatedAt: this.now().toISOString(),
      metadata: { ...token.metadata, refreshed: true, encrypted: true }
    };
    await store.saveToken(refreshed);
    return refreshed;
  }

  async verifyWebhook(input: ConnectorWebhookInput, store: ConnectorStore): Promise<ConnectorWebhookResult> {
    const connection = await requireConnection(input.connectionId, store);
    const channel = readChannel(connection);
    const expected = String(connection.metadata.webhookToken ?? channel?.token ?? "");
    const presented = header(input.headers, "x-goog-channel-token");
    const presentedChannelId = header(input.headers, "x-goog-channel-id");
    const validToken = expected.length > 0 && presented === expected;
    const validChannel = !channel || presentedChannelId === channel.id;
    const valid = validToken && validChannel;
    const event: ConnectorWebhookEvent = {
      id: `wh_evt_${randomUUID()}`,
      connectionId: connection.id,
      provider: "google_drive",
      valid,
      eventType: header(input.headers, "x-goog-resource-state") ?? "unknown",
      resourceId: header(input.headers, "x-goog-resource-id") ?? null,
      receivedAt: this.now().toISOString(),
      headers: normalizeHeaders(input.headers),
      payload: input.payload
    };
    await store.saveWebhookEvent(event);
    return {
      accepted: valid,
      reason: valid
        ? "verified google drive push channel"
        : validToken
          ? "invalid google drive channel id"
          : "invalid google drive channel token",
      event
    };
  }

  async backfill(connectionId: string, store: ConnectorStore): Promise<ConnectorSyncResult> {
    return this.sync(connectionId, store, "backfill");
  }

  async syncIncremental(connectionId: string, store: ConnectorStore): Promise<ConnectorSyncResult> {
    return this.sync(connectionId, store, "incremental");
  }

  async renewChannel(connectionId: string, store: ConnectorStore): Promise<ConnectorConnection> {
    const connection = await requireConnection(connectionId, store);
    const previous = readChannel(connection);
    const now = this.now().toISOString();
    const channel = createGoogleDriveChannel(this.now(), previous?.id ?? null);
    const next = await store.updateConnectionStatus(connection.id, connection.status, {
      updatedAt: now,
      metadata: {
        ...connection.metadata,
        channel,
        webhookToken: channel.token,
        lastChannelRenewedAt: now
      }
    });
    if (!next) {
      throw new ConnectorError("connector.connection_not_found", "connector connection not found", 404);
    }
    return next;
  }

  async revoke(connectionId: string, store: ConnectorStore): Promise<void> {
    const connection = await requireConnection(connectionId, store);
    const now = this.now().toISOString();
    await store.deleteToken(connection.id);
    await store.updateConnectionStatus(connection.id, "revoked", {
      updatedAt: now,
      revokedAt: now,
      metadata: stopGoogleDriveChannel(connection, now)
    });
  }

  async deleteConnection(connectionId: string, store: ConnectorStore): Promise<void> {
    const connection = await requireConnection(connectionId, store);
    const now = this.now().toISOString();
    await store.deleteToken(connection.id);
    await store.deleteDocuments(connection.id);
    await store.deleteCheckpoint(connection.id);
    await store.updateConnectionStatus(connection.id, "deleted", {
      updatedAt: now,
      deletedAt: now,
      metadata: stopGoogleDriveChannel(connection, now)
    });
  }

  private async sync(connectionId: string, store: ConnectorStore, mode: ConnectorSyncMode): Promise<ConnectorSyncResult> {
    const connection = await requireConnection(connectionId, store);
    if (connection.status !== "active") {
      throw new ConnectorError(`connector.connection_${connection.status}`, `connector is ${connection.status}`, 409);
    }
    const token = await store.getToken(connectionId);
    if (!token) {
      throw new ConnectorError("connector.token_missing", "connector token is missing", 401);
    }
    const now = this.now().toISOString();
    const checkpoint = await store.getCheckpoint(connectionId);
    const cursor = checkpoint?.cursor ?? "0";
    const scoped = this.scopedDocuments(connection);
    const selected = mode === "backfill"
      ? scoped
      : scoped.filter((document) => driveChangeCursor(document) > cursor);
    const existingDocuments = new Map((await store.listDocuments(connectionId)).map((document) => [document.externalId, document]));

    const documents: ConnectorDocument[] = [];
    for (const fixture of selected) {
      const document = toConnectorDocument(fixture, connection, now);
      const existing = existingDocuments.get(document.externalId);
      if (existing?.summary.contentHash === document.summary.contentHash) {
        continue;
      }
      documents.push(await store.upsertDocument(document));
    }

    const allKnownIds = new Set([...(checkpoint?.documentIds ?? []), ...selected.map((document) => document.id)]);
    const nextCursor = selected.length > 0
      ? selected.map(driveChangeCursor).sort().at(-1) ?? cursor
      : cursor;
    const savedCheckpoint: ConnectorCheckpoint = {
      connectionId,
      provider: "google_drive",
      cursor: nextCursor,
      documentIds: [...allKnownIds].sort(),
      updatedAt: now,
      metadata: {
        mode,
        fixtureBacked: true,
        driveChangesPageToken: nextCursor,
        changeIds: selected.map(driveChangeCursor),
        documentsDeduped: selected.length - documents.length
      }
    };
    await store.saveCheckpoint(savedCheckpoint);

    const job: ConnectorSyncJob = {
      id: `csj_${randomUUID()}`,
      connectionId,
      vaultId: connection.vaultId,
      provider: "google_drive",
      mode,
      status: "completed",
      documentsSeen: selected.length,
      documentsUpserted: documents.length,
      checkpointCursor: savedCheckpoint.cursor,
      error: null,
      createdAt: now,
      completedAt: now
    };
    await store.saveSyncJob(job);
    await store.updateConnectionStatus(connection.id, "active", {
      updatedAt: now,
      lastSyncedAt: now,
      lastError: null
    });

    return { connectionId, provider: "google_drive", mode, job, checkpoint: savedCheckpoint, documents };
  }

  private scopedDocuments(connection: ConnectorConnection): GoogleDriveFixtureDocument[] {
    if (connection.scope.type === "folder") {
      return this.documents.filter((document) => document.parents.includes(connection.scope.id));
    }
    return [...this.documents];
  }
}

export function defaultGoogleDriveFixtureDocuments(): GoogleDriveFixtureDocument[] {
  return [
    {
      id: "gdrive_doc_lore_v09_notes",
      name: "Lore v0.9 Auto-Capture Beta Notes",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://drive.google.com/file/d/gdrive_doc_lore_v09_notes/view",
      parents: ["fld_lore_beta"],
      modifiedTime: "2026-05-01T02:00:00.000Z",
      changeId: "000001",
      text: "Lore v0.9 should connect once, capture useful agent context automatically, and keep Memory Inbox review visible."
    },
    {
      id: "gdrive_sheet_connector_costs",
      name: "Connector cost guardrails",
      mimeType: "application/vnd.google-apps.spreadsheet",
      webViewLink: "https://drive.google.com/file/d/gdrive_sheet_connector_costs/view",
      parents: ["fld_lore_beta"],
      modifiedTime: "2026-05-01T03:00:00.000Z",
      changeId: "000002",
      text: "Free beta connectors should stay folder-scoped, metadata-first, and capped before broad backfill expands usage cost."
    },
    {
      id: "gdrive_doc_outside_scope",
      name: "Outside folder draft",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://drive.google.com/file/d/gdrive_doc_outside_scope/view",
      parents: ["fld_other"],
      modifiedTime: "2026-05-01T04:00:00.000Z",
      changeId: "000003",
      text: "This document is outside the selected folder and should not be ingested by the scoped beta connector."
    }
  ];
}

function toConnectorDocument(fixture: GoogleDriveFixtureDocument, connection: ConnectorConnection, now: string): ConnectorDocument {
  const contentHash = createHash("sha256").update(`${fixture.id}:${fixture.modifiedTime}:${fixture.text}`).digest("hex");
  const excerpt = fixture.text.replace(/\s+/g, " ").trim().slice(0, 500);
  const candidateId = `cand_${createHash("sha256").update(`${connection.id}:${fixture.id}:${contentHash}`).digest("hex").slice(0, 24)}`;
  return {
    id: `doc_${connection.id}_${fixture.id}`,
    connectionId: connection.id,
    vaultId: connection.vaultId,
    provider: "google_drive",
    externalId: fixture.id,
    title: fixture.name,
    mimeType: fixture.mimeType,
    url: fixture.webViewLink,
    parentIds: [...fixture.parents],
    modifiedAt: fixture.modifiedTime,
    metadata: {
      owners: fixture.owners ?? [],
      fixtureBacked: true,
      folderScoped: connection.scope.type === "folder"
    },
    summary: {
      schemaVersion: "v0.9.connector.summary",
      provider: "google_drive",
      connectionId: connection.id,
      externalId: fixture.id,
      title: fixture.name,
      mimeType: fixture.mimeType,
      excerpt,
      contentHash,
      sourceRefs: [{ type: "connector_document", provider: "google_drive", id: fixture.id, url: fixture.webViewLink }],
      metadata: {
        modifiedAt: fixture.modifiedTime,
        parentIds: [...fixture.parents],
        driveChangeId: driveChangeCursor(fixture),
        memoryInbox: { candidateId, state: "pending" }
      }
    },
    candidate: {
      id: candidateId,
      state: "pending",
      candidateType: "connector_document",
      sourceProvider: "google_drive",
      sourceRef: fixture.id,
      contentHash,
      title: fixture.name,
      excerpt,
      createdAt: now,
      metadata: {
        connectionId: connection.id,
        mimeType: fixture.mimeType,
        url: fixture.webViewLink ?? null,
        driveChangeId: driveChangeCursor(fixture),
        parentIds: [...fixture.parents]
      }
    },
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

function googleDriveCredentialStatus(): {
  configured: boolean;
  missing: string[];
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  encryptionKey?: string;
} {
  const clientId = readEnv("GOOGLE_DRIVE_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_DRIVE_CLIENT_SECRET");
  const redirectUri = readEnv("GOOGLE_DRIVE_REDIRECT_URI");
  const encryptionKey = readEnv("CONNECTOR_TOKEN_ENCRYPTION_KEY") ?? readEnv("LORE_CONNECTOR_TOKEN_ENCRYPTION_KEY");
  const missing = [
    clientId ? undefined : "GOOGLE_DRIVE_CLIENT_ID",
    clientSecret ? undefined : "GOOGLE_DRIVE_CLIENT_SECRET",
    redirectUri ? undefined : "GOOGLE_DRIVE_REDIRECT_URI",
    encryptionKey ? undefined : "CONNECTOR_TOKEN_ENCRYPTION_KEY"
  ].filter((value): value is string => Boolean(value));
  return { configured: missing.length === 0, missing, clientId, clientSecret, redirectUri, encryptionKey };
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function tokenEncryptionKeySource(fixtureBacked: boolean): "env" | "fixture" {
  return googleDriveCredentialStatus().encryptionKey ? "env" : fixtureBacked ? "fixture" : "env";
}

function encryptConnectorSecret(secret: string, options: { fixtureBacked: boolean }): string {
  const key = connectorEncryptionKey(options);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

function decryptConnectorSecret(secret: string, options: { fixtureBacked: boolean }): string {
  const parts = secret.split(":");
  if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1") {
    throw new ConnectorError("connector.token_ciphertext_invalid", "connector token must be stored encrypted", 500);
  }
  const [, , ivRaw, tagRaw, ciphertextRaw] = parts;
  const decipher = createDecipheriv("aes-256-gcm", connectorEncryptionKey(options), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}

function connectorEncryptionKey(options: { fixtureBacked: boolean }): Buffer {
  const configured = googleDriveCredentialStatus().encryptionKey;
  if (!configured && !options.fixtureBacked) {
    throw new ConnectorError("connector.encryption_key_missing", "CONNECTOR_TOKEN_ENCRYPTION_KEY is required before storing live connector tokens", 503);
  }
  return createHash("sha256").update(configured ?? "fixture-local-connector-token-key-not-for-live").digest();
}

function secretPreview(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

function createGoogleDriveChannel(now: Date, renewedFrom: string | null): ConnectorChannelState {
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();
  const renewAfter = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const id = `gdrive_channel_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  return {
    id,
    resourceId: `gdrive_resource_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
    token: `wh_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
    status: "active",
    expiresAt,
    renewAfter,
    createdAt,
    updatedAt: createdAt,
    renewedFrom
  };
}

function readChannel(connection: ConnectorConnection): ConnectorChannelState | undefined {
  const raw = connection.metadata.channel;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const candidate = raw as Partial<ConnectorChannelState>;
  if (typeof candidate.id !== "string" || typeof candidate.token !== "string") {
    return undefined;
  }
  return {
    id: candidate.id,
    resourceId: typeof candidate.resourceId === "string" ? candidate.resourceId : "",
    token: candidate.token,
    status: candidate.status === "renewal_due" || candidate.status === "stopped" ? candidate.status : "active",
    expiresAt: typeof candidate.expiresAt === "string" ? candidate.expiresAt : "",
    renewAfter: typeof candidate.renewAfter === "string" ? candidate.renewAfter : "",
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : "",
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
    renewedFrom: typeof candidate.renewedFrom === "string" ? candidate.renewedFrom : null
  };
}

function stopGoogleDriveChannel(connection: ConnectorConnection, now: string): Record<string, unknown> {
  const channel = readChannel(connection);
  return {
    ...connection.metadata,
    tokenRevoked: true,
    webhookToken: null,
    channel: channel
      ? { ...channel, status: "stopped", updatedAt: now }
      : undefined
  };
}

function driveChangeCursor(document: GoogleDriveFixtureDocument): string {
  return document.changeId ?? document.modifiedTime;
}

async function requireConnection(connectionId: string, store: ConnectorStore): Promise<ConnectorConnection> {
  const connection = await store.getConnection(connectionId);
  if (!connection) {
    throw new ConnectorError("connector.connection_not_found", "connector connection not found", 404);
  }
  return connection;
}

function header(headers: Record<string, string>, name: string): string | undefined {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return undefined;
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

function cloneConnection(connection: ConnectorConnection): ConnectorConnection {
  return {
    ...connection,
    scope: { ...connection.scope },
    permissions: { ...connection.permissions },
    metadata: { ...connection.metadata }
  };
}

function cloneToken(token: ConnectorTokenSet): ConnectorTokenSet {
  return { ...token, scopes: [...token.scopes], metadata: { ...token.metadata } };
}

function cloneCheckpoint(checkpoint: ConnectorCheckpoint): ConnectorCheckpoint {
  return { ...checkpoint, documentIds: [...checkpoint.documentIds], metadata: { ...checkpoint.metadata } };
}

function cloneDocument(document: ConnectorDocument): ConnectorDocument {
  return {
    ...document,
    parentIds: [...document.parentIds],
    metadata: { ...document.metadata },
    summary: {
      ...document.summary,
      sourceRefs: document.summary.sourceRefs.map((ref) => ({ ...ref })),
      metadata: { ...document.summary.metadata }
    },
    candidate: {
      ...document.candidate,
      metadata: { ...document.candidate.metadata }
    }
  };
}

function cloneWebhookEvent(event: ConnectorWebhookEvent): ConnectorWebhookEvent {
  return {
    ...event,
    headers: { ...event.headers },
    payload: { ...event.payload }
  };
}
