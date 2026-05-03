import {
  ConnectorError,
  ConnectorService,
  type ConnectorAuthContext,
  type ConnectorConnection,
  type ConnectorConnectionStatus,
  type ConnectorProviderId,
  type ConnectorScope,
  type ConnectorSyncResult,
  type ConnectorSyncMode
} from "@lore/connectors";
import { CloudError, CloudPlatform, type CloudAuthContext } from "./cloud.js";

interface ConnectorHandleOptions {
  request: Request;
  url: URL;
  path: string;
  method: string;
}

export interface ConnectorPlatformOptions {
  cloudPlatform: CloudPlatform;
  service?: ConnectorService;
  now?: () => Date;
}

export class ConnectorPlatform {
  readonly service: ConnectorService;
  private readonly cloudPlatform: CloudPlatform;

  constructor(options: ConnectorPlatformOptions) {
    this.cloudPlatform = options.cloudPlatform;
    this.service = options.service ?? new ConnectorService({ now: options.now });
  }

  isConnectorPath(path: string): boolean {
    if (path === "/v1/connectors") return true;
    if (/^\/v1\/connectors\/[^/]+\/authorize$/.test(path)) return true;
    if (/^\/v1\/connectors\/[^/]+\/callback$/.test(path)) return true;
    if (/^\/v1\/connectors\/[^/]+\/webhook$/.test(path)) return true;
    if (/^\/v1\/connectors\/[^/]+\/sync$/.test(path)) return true;
    if (/^\/v1\/connectors\/[^/]+\/resync$/.test(path)) return true;
    if (/^\/v1\/connectors\/[^/]+\/pause$/.test(path)) return true;
    if (/^\/v1\/connectors\/[^/]+\/resume$/.test(path)) return true;
    if (/^\/v1\/connectors\/[^/]+\/disconnect$/.test(path)) return true;
    if (/^\/v1\/connectors\/[^/]+\/channels\/renew$/.test(path)) return true;
    if (/^\/v1\/connectors\/[^/]+$/.test(path)) return true;
    return false;
  }

  async handle(options: ConnectorHandleOptions): Promise<{ payload: unknown; status: number }> {
    const { method, path, request, url } = options;

    if (method === "GET" && path === "/v1/connectors") {
      const auth = await this.requireAuth(request);
      return {
        status: 200,
        payload: {
          providers: this.service.listProviders(),
          connections: await this.service.listConnections(toConnectorAuth(auth))
        }
      };
    }

    const authorizeMatch = path.match(/^\/v1\/connectors\/([^/]+)\/authorize$/);
    if (method === "POST" && authorizeMatch) {
      const auth = await this.requireAuth(request);
      const body = await readJsonBody(request);
      const provider = normalizeProvider(authorizeMatch[1]);
      const result = await this.service.createAuthorizationUrl({
        auth: toConnectorAuth(auth),
        provider,
        redirectUri: readOptionalString(body.redirect_uri ?? body.redirectUri),
        state: readOptionalString(body.state),
        scope: readConnectorScope(body.scope, body.folder_id ?? body.folderId)
      });
      return { status: 200, payload: result };
    }

    const callbackMatch = path.match(/^\/v1\/connectors\/([^/]+)\/callback$/);
    if (method === "POST" && callbackMatch) {
      const auth = await this.requireAuth(request);
      const body = await readJsonBody(request);
      const provider = normalizeProvider(callbackMatch[1]);
      const connection = await this.service.handleCallback({
        auth: toConnectorAuth(auth),
        provider,
        code: readRequiredString(body.code, "code"),
        state: readOptionalString(body.state),
        redirectUri: readOptionalString(body.redirect_uri ?? body.redirectUri),
        displayName: readOptionalString(body.display_name ?? body.displayName),
        scope: readConnectorScope(body.scope, body.folder_id ?? body.folderId)
      });
      await this.recordConnectorSource(auth, connection, "active");
      return { status: 201, payload: { connection } };
    }

    const webhookMatch = path.match(/^\/v1\/connectors\/([^/]+)\/webhook$/);
    if (method === "POST" && webhookMatch) {
      const body = await readJsonBody(request);
      const connectionId = readRequiredString(body.connection_id ?? body.connectionId, "connection_id");
      const result = await this.service.verifyWebhook({
        connectionId,
        headers: headersToRecord(request.headers),
        payload: body
      });
      return { status: result.accepted ? 202 : 401, payload: result };
    }

    const syncMatch = path.match(/^\/v1\/connectors\/([^/]+)\/sync$/);
    if (method === "POST" && syncMatch) {
      const auth = await this.requireAuth(request);
      const body = await readJsonBody(request);
      const mode = normalizeSyncMode(body.mode);
      const result = await this.service.sync({
        auth: toConnectorAuth(auth),
        connectionId: decodeURIComponent(syncMatch[1] ?? ""),
        mode
      });
      const connection = await this.service.store.getConnection(result.connectionId);
      const inbox = connection ? await this.recordConnectorSync(auth, connection, result) : { accepted: 0, deduped: 0 };
      await this.cloudPlatform.recordUsage({
        vaultId: auth.vaultId,
        accountId: auth.accountId,
        eventType: "connector.documents",
        units: result.documents.length,
        metadata: { connectionId: result.connectionId, provider: result.provider, mode }
      });
      return {
        status: 202,
        payload: {
          sync: {
            connectionId: result.connectionId,
            provider: result.provider,
            mode: result.mode,
            job: result.job,
            checkpoint: result.checkpoint,
            inbox,
            documents: result.documents.map((document) => ({
              id: document.id,
              externalId: document.externalId,
              title: document.title,
              mimeType: document.mimeType,
              modifiedAt: document.modifiedAt,
              summary: document.summary,
              candidate: document.candidate
            }))
          }
        }
      };
    }

    const connectionMatch = path.match(/^\/v1\/connectors\/([^/]+)$/);
    if (connectionMatch && method === "GET") {
      const auth = await this.requireAuth(request);
      const status = await this.service.getConnectionStatus(toConnectorAuth(auth), decodeURIComponent(connectionMatch[1] ?? ""));
      return { status: 200, payload: status };
    }

    if (connectionMatch && method === "PATCH") {
      const auth = await this.requireAuth(request);
      const body = await readJsonBody(request);
      const status = normalizePatchStatus(body.status);
      const connection = await this.service.setConnectionStatus(toConnectorAuth(auth), decodeURIComponent(connectionMatch[1] ?? ""), status);
      await this.recordConnectorSource(auth, connection, status);
      return { status: 200, payload: { connection } };
    }

    const resyncMatch = path.match(/^\/v1\/connectors\/([^/]+)\/resync$/);
    if (method === "POST" && resyncMatch) {
      const auth = await this.requireAuth(request);
      const result = await this.service.sync({
        auth: toConnectorAuth(auth),
        connectionId: decodeURIComponent(resyncMatch[1] ?? ""),
        mode: "backfill"
      });
      const connection = await this.service.store.getConnection(result.connectionId);
      const inbox = connection ? await this.recordConnectorSync(auth, connection, result) : { accepted: 0, deduped: 0 };
      return { status: 202, payload: { sync: { ...result, inbox } } };
    }

    const pauseMatch = path.match(/^\/v1\/connectors\/([^/]+)\/pause$/);
    if (method === "POST" && pauseMatch) {
      const auth = await this.requireAuth(request);
      const connection = await this.service.setConnectionStatus(toConnectorAuth(auth), decodeURIComponent(pauseMatch[1] ?? ""), "paused");
      await this.recordConnectorSource(auth, connection, "paused");
      return { status: 200, payload: { connection } };
    }

    const resumeMatch = path.match(/^\/v1\/connectors\/([^/]+)\/resume$/);
    if (method === "POST" && resumeMatch) {
      const auth = await this.requireAuth(request);
      const connection = await this.service.setConnectionStatus(toConnectorAuth(auth), decodeURIComponent(resumeMatch[1] ?? ""), "active");
      await this.recordConnectorSource(auth, connection, "active");
      return { status: 200, payload: { connection } };
    }

    const disconnectMatch = path.match(/^\/v1\/connectors\/([^/]+)\/disconnect$/);
    if (method === "POST" && disconnectMatch) {
      const auth = await this.requireAuth(request);
      const body = await readJsonBody(request);
      const deleteSourceData = readOptionalBoolean(body.delete_source_data ?? body.deleteSourceData) ?? false;
      const result = await this.service.revokeOrDelete({
        auth: toConnectorAuth(auth),
        connectionId: decodeURIComponent(disconnectMatch[1] ?? ""),
        deleteSourceData
      });
      await this.recordConnectorSource(auth, result.connection, "paused");
      return { status: 200, payload: result };
    }

    const renewChannelMatch = path.match(/^\/v1\/connectors\/([^/]+)\/channels\/renew$/);
    if (method === "POST" && renewChannelMatch) {
      const auth = await this.requireAuth(request);
      const connection = await this.service.renewChannel(toConnectorAuth(auth), decodeURIComponent(renewChannelMatch[1] ?? ""));
      await this.recordConnectorSource(auth, connection, "active");
      return { status: 200, payload: { connection } };
    }

    if (connectionMatch && method === "DELETE") {
      const auth = await this.requireAuth(request);
      const body = await readJsonBody(request);
      const deleteSourceData = readOptionalBoolean(body.delete_source_data ?? body.deleteSourceData)
        ?? url.searchParams.get("delete_source_data") === "true";
      const result = await this.service.revokeOrDelete({
        auth: toConnectorAuth(auth),
        connectionId: decodeURIComponent(connectionMatch[1] ?? ""),
        deleteSourceData
      });
      await this.recordConnectorSource(auth, result.connection, "paused");
      return { status: 200, payload: result };
    }

    throw new ConnectorError("connector.route_not_found", `${method} ${path} not found`, 404);
  }

  private async requireAuth(request: Request): Promise<CloudAuthContext> {
    const token = readBearerToken(request);
    if (!token) {
      throw new ConnectorError("connector.token_required", "bearer token required for connector API", 401);
    }
    const auth = await this.cloudPlatform.authenticate(token);
    // v0.8 tokens predate connector scopes. Accept them for the v0.9 beta
    // scaffold while allowing future tokens to narrow on connector.* scopes.
    if (
      auth.scopes.some((scope) => scope.startsWith("connector.")) ||
      auth.scopes.includes("capture.write") ||
      auth.scopes.includes("mcp.write") ||
      auth.tokenKind === "agent" ||
      auth.tokenKind === "session"
    ) {
      return auth;
    }
    throw new ConnectorError("connector.scope_missing", "connector scope is required", 403);
  }

  private async recordConnectorSource(
    auth: CloudAuthContext,
    connection: ConnectorConnection,
    sourceStatus: "active" | "paused"
  ): Promise<void> {
    await this.cloudPlatform.recordHeartbeat({
      auth,
      sourceId: connectorSourceId(connection.id),
      sourceType: "connector_document",
      sourceProvider: connection.provider,
      sourceRef: connection.scope.id,
      status: sourceStatus,
      metadata: {
        connectionId: connection.id,
        connectorStatus: connection.status,
        scope: connection.scope,
        permissions: connection.permissions,
        fixtureBacked: connection.metadata.fixtureBacked === true,
        privateBeta: connection.metadata.privateBeta === true,
        channel: connection.metadata.channel ?? null
      }
    });
  }

  private async recordConnectorSync(
    auth: CloudAuthContext,
    connection: ConnectorConnection,
    result: ConnectorSyncResult
  ): Promise<{ accepted: number; deduped: number }> {
    const source = await this.cloudPlatform.recordHeartbeat({
      auth,
      sourceId: connectorSourceId(connection.id),
      sourceType: "connector_document",
      sourceProvider: connection.provider,
      sourceRef: connection.scope.id,
      status: "active",
      metadata: {
        connectionId: connection.id,
        connectorStatus: connection.status,
        scope: connection.scope,
        permissions: connection.permissions,
        fixtureBacked: connection.metadata.fixtureBacked === true,
        privateBeta: connection.metadata.privateBeta === true,
        channel: connection.metadata.channel ?? null
      }
    });
    if (result.documents.length === 0) {
      return { accepted: 0, deduped: 0 };
    }
    const ingestion = await this.cloudPlatform.ingestCaptureEvents({
      auth,
      sourceId: source.id,
      batchIdempotencyKey: `connector:${connection.id}:${result.mode}:${result.checkpoint.cursor}`,
      events: result.documents.map((document) => ({
        externalEventId: document.externalId,
        eventType: "connector.document_candidate",
        occurredAt: document.modifiedAt,
        contentRef: {
          provider: document.provider,
          connectionId: document.connectionId,
          documentId: document.externalId,
          url: document.url ?? null
        },
        redactionState: "metadata_only",
        idempotencyKey: `connector:${connection.id}:${document.externalId}:${document.summary.contentHash}`,
        payload: {
          candidate: document.candidate,
          summary: document.summary,
          title: document.title,
          mimeType: document.mimeType
        }
      }))
    });
    return { accepted: ingestion.accepted, deduped: ingestion.deduped };
  }
}

export function serializeConnectorError(error: unknown): { code: string; message: string; status: number } {
  if (error instanceof ConnectorError) {
    return { code: error.code, message: error.message, status: error.status };
  }
  if (error instanceof CloudError) {
    return { code: error.code, message: error.message, status: error.status };
  }
  if (error instanceof Error) {
    return { code: "connector.internal_error", message: error.message, status: 500 };
  }
  return { code: "connector.internal_error", message: String(error), status: 500 };
}

function toConnectorAuth(auth: CloudAuthContext): ConnectorAuthContext {
  return {
    vaultId: auth.vaultId,
    accountId: auth.accountId,
    actorId: auth.deviceId ?? null
  };
}

function connectorSourceId(connectionId: string): string {
  return `src_${connectionId}`;
}

function readBearerToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (!auth) return undefined;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const value = match?.[1]?.trim();
  return value && value.startsWith("lct_") ? value : undefined;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text || text.trim().length === 0) return {};
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    throw new ConnectorError("connector.invalid_json", "request body must be JSON", 400);
  }
  throw new ConnectorError("connector.invalid_json", "request body must be a JSON object", 400);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readRequiredString(value: unknown, field: string): string {
  const result = readOptionalString(value);
  if (!result) {
    throw new ConnectorError("connector.field_required", `${field} is required`, 400);
  }
  return result;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeProvider(value: unknown): ConnectorProviderId {
  if (value === "google_drive") return "google_drive";
  throw new ConnectorError("connector.provider_not_found", `connector provider ${String(value)} is not available`, 404);
}

function normalizeSyncMode(value: unknown): ConnectorSyncMode {
  return value === "incremental" ? "incremental" : "backfill";
}

function normalizePatchStatus(value: unknown): Extract<ConnectorConnectionStatus, "active" | "paused"> {
  if (value === "active" || value === "paused") return value;
  throw new ConnectorError("connector.status_invalid", "status must be active or paused", 400);
}

function readConnectorScope(value: unknown, folderId: unknown): ConnectorScope | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    const id = readOptionalString(raw.id);
    const type = raw.type === "drive" || raw.type === "folder" || raw.type === "page" || raw.type === "database" ? raw.type : undefined;
    if (id && type) {
      return { type, id, displayName: readOptionalString(raw.display_name ?? raw.displayName) };
    }
  }
  const folder = readOptionalString(folderId);
  return folder ? { type: "folder", id: folder } : undefined;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
