import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ConnectorError,
  ConnectorService,
  GoogleDriveFixtureProvider,
  InMemoryConnectorStore,
  type ConnectorAuthContext,
  type GoogleDriveFixtureDocument
} from "../src/index.js";

const AUTH: ConnectorAuthContext = {
  vaultId: "vault_test",
  accountId: "acct_test",
  actorId: "dev_test"
};

const NOW = () => new Date("2026-05-01T12:00:00.000Z");
const FIXTURES = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/google-drive-documents.json"), "utf8")
) as GoogleDriveFixtureDocument[];

function stubMissingDriveEnv(): void {
  vi.stubEnv("GOOGLE_DRIVE_CLIENT_ID", "");
  vi.stubEnv("GOOGLE_DRIVE_CLIENT_SECRET", "");
  vi.stubEnv("GOOGLE_DRIVE_REDIRECT_URI", "");
  vi.stubEnv("CONNECTOR_TOKEN_ENCRYPTION_KEY", "");
  vi.stubEnv("LORE_CONNECTOR_TOKEN_ENCRYPTION_KEY", "");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GoogleDriveFixtureProvider", () => {
  it("generates a private-beta Drive OAuth URL without mixing sign-in scopes", async () => {
    stubMissingDriveEnv();
    const service = new ConnectorService({ now: NOW });
    const result = await service.createAuthorizationUrl({
      auth: AUTH,
      provider: "google_drive",
      state: "state_test",
      scope: { type: "folder", id: "fld_lore_beta" }
    });

    const url = new URL(result.authorizationUrl);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("private-beta-google-drive-client-id");
    expect(url.searchParams.get("state")).toBe("state_test");
    expect(url.searchParams.get("scope")).toContain("https://www.googleapis.com/auth/drive.readonly");
    expect(url.searchParams.get("scope")).not.toContain("openid");
    expect(result.signInScopes).toEqual(["openid", "email", "profile"]);
    expect(result.scopes).not.toContain("email");
    expect(result.fixtureBacked).toBe(true);
    expect(result.privateBeta).toBe(true);
    expect(result.credentialStatus).toBe("missing");
    expect(result.credentialEnv).toEqual([
      "GOOGLE_DRIVE_CLIENT_ID",
      "GOOGLE_DRIVE_CLIENT_SECRET",
      "GOOGLE_DRIVE_REDIRECT_URI",
      "CONNECTOR_TOKEN_ENCRYPTION_KEY"
    ]);
    expect(result.missingCredentialEnv).toContain("GOOGLE_DRIVE_CLIENT_SECRET");
  });

  it("handles callback, stores encrypted refresh token, backfills candidates, and persists changes checkpoint state", async () => {
    const service = new ConnectorService({ now: NOW });
    const connection = await service.handleCallback({
      auth: AUTH,
      provider: "google_drive",
      code: "fixture-code",
      scope: { type: "folder", id: "fld_lore_beta", displayName: "Lore beta" }
    });

    expect(connection.status).toBe("active");
    expect(connection.metadata.fixtureBacked).toBe(true);
    expect(connection.permissions.signInScopes).toEqual(["openid", "email", "profile"]);
    expect(connection.permissions.scopes).toEqual(["https://www.googleapis.com/auth/drive.readonly"]);
    expect(connection.metadata.channel).toEqual(expect.objectContaining({
      id: expect.stringMatching(/^gdrive_channel_/),
      token: expect.stringMatching(/^wh_/),
      status: "active"
    }));

    const token = await service.store.getToken(connection.id);
    expect(token?.refreshToken).toMatch(/^enc:v1:/);
    expect(token?.refreshToken).not.toContain("fixture-google-drive-refresh-token");
    expect(token?.metadata).toMatchObject({ encrypted: true, keySource: "fixture" });

    const result = await service.sync({ auth: AUTH, connectionId: connection.id, mode: "backfill" });
    expect(result.documents).toHaveLength(2);
    expect(result.documents.every((doc) => doc.parentIds.includes("fld_lore_beta"))).toBe(true);
    expect(result.documents[0]?.summary.schemaVersion).toBe("v0.9.connector.summary");
    expect(result.documents[0]?.candidate).toEqual(expect.objectContaining({
      state: "pending",
      candidateType: "connector_document",
      sourceProvider: "google_drive"
    }));
    expect(result.documents[0]?.summary.metadata.memoryInbox).toEqual(expect.objectContaining({ state: "pending" }));
    expect(result.checkpoint.documentIds).toEqual([
      "gdrive_doc_lore_v09_notes",
      "gdrive_sheet_connector_costs"
    ]);
    expect(result.checkpoint.metadata).toMatchObject({
      driveChangesPageToken: "000002",
      changeIds: ["000001", "000002"]
    });
  });

  it("fails closed for non-fixture callbacks when live Drive credentials are missing", async () => {
    stubMissingDriveEnv();
    const service = new ConnectorService({ now: NOW });
    await expect(service.handleCallback({
      auth: AUTH,
      provider: "google_drive",
      code: "real-google-code"
    })).rejects.toMatchObject({
      code: "connector.credentials_missing",
      status: 503
    });
  });

  it("only syncs documents after the saved incremental checkpoint", async () => {
    const store = new InMemoryConnectorStore();
    const service = new ConnectorService({
      store,
      providers: [new GoogleDriveFixtureProvider({ documents: FIXTURES, now: NOW })],
      now: NOW
    });
    const connection = await service.handleCallback({
      auth: AUTH,
      provider: "google_drive",
      code: "fixture-code",
      scope: { type: "folder", id: "fld_lore_beta" }
    });
    await store.saveCheckpoint({
      connectionId: connection.id,
      provider: "google_drive",
      cursor: "100001",
      documentIds: ["fixture_drive_prd"],
      updatedAt: NOW().toISOString(),
      metadata: {}
    });

    const result = await service.sync({ auth: AUTH, connectionId: connection.id, mode: "incremental" });
    expect(result.documents.map((doc) => doc.externalId)).toEqual(["fixture_drive_delta"]);
    expect(result.checkpoint.cursor).toBe("100002");
    expect(result.checkpoint.metadata.documentsDeduped).toBe(0);
  });

  it("does not create duplicate candidates for unchanged Drive changes", async () => {
    const service = new ConnectorService({ now: NOW });
    const connection = await service.handleCallback({
      auth: AUTH,
      provider: "google_drive",
      code: "fixture-code"
    });

    const first = await service.sync({ auth: AUTH, connectionId: connection.id, mode: "backfill" });
    const second = await service.sync({ auth: AUTH, connectionId: connection.id, mode: "backfill" });
    expect(first.documents).toHaveLength(2);
    expect(second.documents).toHaveLength(0);
    expect(second.job.documentsSeen).toBe(2);
    expect(second.job.documentsUpserted).toBe(0);
    expect(second.checkpoint.metadata.documentsDeduped).toBe(2);
    expect(await service.store.listDocuments(connection.id)).toHaveLength(2);
  });

  it("validates Google Drive push channel ID and token", async () => {
    const service = new ConnectorService({ now: NOW });
    const connection = await service.handleCallback({
      auth: AUTH,
      provider: "google_drive",
      code: "fixture-code"
    });
    const webhookToken = String(connection.metadata.webhookToken);
    const channel = connection.metadata.channel as { id: string };

    const accepted = await service.verifyWebhook({
      connectionId: connection.id,
      headers: {
        "x-goog-channel-id": channel.id,
        "x-goog-channel-token": webhookToken,
        "x-goog-resource-state": "update",
        "x-goog-resource-id": "resource-1"
      },
      payload: { ok: true }
    });
    expect(accepted.accepted).toBe(true);

    const rejected = await service.verifyWebhook({
      connectionId: connection.id,
      headers: { "x-goog-channel-id": "wrong-channel", "x-goog-channel-token": webhookToken },
      payload: {}
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.reason).toBe("invalid google drive channel id");
  });

  it("renews Google Drive push channel metadata before expiry", async () => {
    const service = new ConnectorService({ now: NOW });
    const connection = await service.handleCallback({
      auth: AUTH,
      provider: "google_drive",
      code: "fixture-code"
    });
    const previous = connection.metadata.channel as { id: string; token: string };
    const renewed = await service.renewChannel(AUTH, connection.id);
    const next = renewed.metadata.channel as { id: string; token: string; renewedFrom: string };
    expect(next.id).not.toBe(previous.id);
    expect(next.token).not.toBe(previous.token);
    expect(next.renewedFrom).toBe(previous.id);
  });

  it("enforces pause, revoke, and delete lifecycle behavior", async () => {
    const service = new ConnectorService({ now: NOW });
    const connection = await service.handleCallback({
      auth: AUTH,
      provider: "google_drive",
      code: "fixture-code"
    });
    await service.sync({ auth: AUTH, connectionId: connection.id, mode: "backfill" });

    const paused = await service.setConnectionStatus(AUTH, connection.id, "paused");
    expect(paused.status).toBe("paused");
    await expect(service.sync({ auth: AUTH, connectionId: connection.id, mode: "incremental" }))
      .rejects.toMatchObject({ code: "connector.connection_paused" });

    await service.setConnectionStatus(AUTH, connection.id, "active");
    const revoked = await service.revokeOrDelete({ auth: AUTH, connectionId: connection.id });
    expect(revoked.connection.status).toBe("revoked");
    expect(await service.store.getToken(connection.id)).toBeUndefined();
    await expect(service.sync({ auth: AUTH, connectionId: connection.id, mode: "incremental" }))
      .rejects.toMatchObject({ code: "connector.connection_closed" });

    const second = await service.handleCallback({ auth: AUTH, provider: "google_drive", code: "fixture-code-2" });
    await service.sync({ auth: AUTH, connectionId: second.id, mode: "backfill" });
    const deleted = await service.revokeOrDelete({ auth: AUTH, connectionId: second.id, deleteSourceData: true });
    expect(deleted.connection.status).toBe("deleted");
    expect(deleted.deletedDocuments).toBe(2);
    expect(await service.store.listDocuments(second.id)).toHaveLength(0);
  });

  it("rejects cross-vault connector access", async () => {
    const service = new ConnectorService({ now: NOW });
    const connection = await service.handleCallback({
      auth: AUTH,
      provider: "google_drive",
      code: "fixture-code"
    });

    await expect(service.sync({
      auth: { ...AUTH, vaultId: "vault_other" },
      connectionId: connection.id,
      mode: "backfill"
    })).rejects.toBeInstanceOf(ConnectorError);
  });
});
