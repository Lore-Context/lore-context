import { describe, expect, it } from "vitest";
import { CloudPlatform } from "../src/cloud.js";
import { createLoreApi } from "../src/index.js";
import { openApiDocument } from "../src/openapi.js";

async function pairDevice(cloud: CloudPlatform): Promise<{ deviceToken: string; vaultId: string }> {
  const install = await cloud.issueInstallToken();
  const result = await cloud.redeemInstallToken(install.plaintext, { label: "connector-test", platform: "darwin" });
  return { deviceToken: result.deviceToken.plaintext, vaultId: result.vault.id };
}

function authedJson(url: string, token: string, body: Record<string, unknown> = {}): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
}

describe("v0.9 connector API", () => {
  it("lists the Google Drive fixture provider and requires bearer auth", async () => {
    const app = createLoreApi();

    const rejected = await app.handle(new Request("http://localhost/v1/connectors"));
    expect(rejected.status).toBe(401);

    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const authed = createLoreApi({ cloudPlatform: cloud });
    const response = await authed.handle(new Request("http://localhost/v1/connectors", {
      headers: { authorization: `Bearer ${deviceToken}` }
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.providers).toEqual([
      expect.objectContaining({
        provider: "google_drive",
        fixtureBacked: true,
        signInScopes: ["openid", "email", "profile"],
        scopes: ["https://www.googleapis.com/auth/drive.readonly"]
      })
    ]);
  });

  it("authorizes, callbacks, syncs candidates, reports status, pauses/resumes, and disconnects Drive", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken, vaultId } = await pairDevice(cloud);
    const app = createLoreApi({ cloudPlatform: cloud });

    const authorize = await app.handle(authedJson("http://localhost/v1/connectors/google_drive/authorize", deviceToken, {
      state: "state-api-test",
      folder_id: "fld_lore_beta"
    }));
    expect(authorize.status).toBe(200);
    const authorizeBody = await authorize.json();
    expect(authorizeBody.authorizationUrl).toContain("accounts.google.com");
    expect(authorizeBody.credentialEnv).toContain("GOOGLE_DRIVE_CLIENT_SECRET");
    expect(authorizeBody.signInScopes).toEqual(["openid", "email", "profile"]);
    expect(authorizeBody.scopes).not.toContain("email");

    const callback = await app.handle(authedJson("http://localhost/v1/connectors/google_drive/callback", deviceToken, {
      code: "fixture-code",
      state: "state-api-test",
      folder_id: "fld_lore_beta",
      display_name: "Drive beta folder"
    }));
    expect(callback.status).toBe(201);
    const callbackBody = await callback.json();
    const connectionId = callbackBody.connection.id as string;
    expect(callbackBody.connection.status).toBe("active");
    expect(callbackBody.connection.scope).toMatchObject({ type: "folder", id: "fld_lore_beta" });
    expect(callbackBody.connection.metadata.channel.id).toMatch(/^gdrive_channel_/);

    const sync = await app.handle(authedJson(`http://localhost/v1/connectors/${connectionId}/sync`, deviceToken, {
      mode: "backfill"
    }));
    expect(sync.status).toBe(202);
    const syncBody = await sync.json();
    expect(syncBody.sync.documents).toHaveLength(2);
    expect(syncBody.sync.inbox).toEqual({ accepted: 2, deduped: 0 });
    expect(syncBody.sync.documents[0].summary.schemaVersion).toBe("v0.9.connector.summary");
    expect(syncBody.sync.documents[0].summary.sourceRefs[0].type).toBe("connector_document");
    expect(syncBody.sync.documents[0].candidate.state).toBe("pending");
    expect(await cloud.store.countCaptureEvents(vaultId)).toBe(2);

    const status = await app.handle(new Request(`http://localhost/v1/connectors/${connectionId}`, {
      headers: { authorization: `Bearer ${deviceToken}` }
    }));
    expect(status.status).toBe(200);
    const statusBody = await status.json();
    expect(statusBody.documents).toHaveLength(2);
    expect(statusBody.checkpoint.metadata.driveChangesPageToken).toBe("000002");

    const duplicate = await app.handle(authedJson(`http://localhost/v1/connectors/${connectionId}/resync`, deviceToken));
    expect(duplicate.status).toBe(202);
    const duplicateBody = await duplicate.json();
    expect(duplicateBody.sync.documents).toHaveLength(0);
    expect(duplicateBody.sync.inbox).toEqual({ accepted: 0, deduped: 0 });
    expect(await cloud.store.countCaptureEvents(vaultId)).toBe(2);

    const paused = await app.handle(new Request(`http://localhost/v1/connectors/${connectionId}/pause`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${deviceToken}`
      },
      body: "{}"
    }));
    expect(paused.status).toBe(200);
    const pausedBody = await paused.json();
    expect(pausedBody.connection.status).toBe("paused");

    const pausedSync = await app.handle(authedJson(`http://localhost/v1/connectors/${connectionId}/sync`, deviceToken, {
      mode: "incremental"
    }));
    expect(pausedSync.status).toBe(409);
    expect((await pausedSync.json()).error.code).toBe("connector.connection_paused");

    const resumed = await app.handle(new Request(`http://localhost/v1/connectors/${connectionId}/resume`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${deviceToken}`
      },
      body: "{}"
    }));
    expect(resumed.status).toBe(200);
    expect((await resumed.json()).connection.status).toBe("active");

    const deleted = await app.handle(new Request(`http://localhost/v1/connectors/${connectionId}/disconnect`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${deviceToken}`
      },
      body: JSON.stringify({ delete_source_data: true })
    }));
    expect(deleted.status).toBe(200);
    const deletedBody = await deleted.json();
    expect(deletedBody.connection.status).toBe("deleted");
    expect(deletedBody.deletedDocuments).toBe(2);
  });

  it("verifies Google Drive webhook channel token from fixture metadata", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const app = createLoreApi({ cloudPlatform: cloud });
    const callback = await app.handle(authedJson("http://localhost/v1/connectors/google_drive/callback", deviceToken, {
      code: "fixture-code",
      folder_id: "fld_lore_beta"
    }));
    const { connection } = await callback.json();
    const webhookToken = connection.metadata.webhookToken as string;
    const channelId = connection.metadata.channel.id as string;

    const accepted = await app.handle(new Request("http://localhost/v1/connectors/google_drive/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-channel-id": channelId,
        "x-goog-channel-token": webhookToken,
        "x-goog-resource-state": "update"
      },
      body: JSON.stringify({ connection_id: connection.id })
    }));
    expect(accepted.status).toBe(202);
    expect((await accepted.json()).accepted).toBe(true);

    const rejected = await app.handle(new Request("http://localhost/v1/connectors/google_drive/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-channel-id": channelId,
        "x-goog-channel-token": "wrong"
      },
      body: JSON.stringify({ connection_id: connection.id })
    }));
    expect(rejected.status).toBe(401);
    expect((await rejected.json()).accepted).toBe(false);
  });

  it("documents connector routes in OpenAPI", () => {
    expect(openApiDocument.paths["/v1/connectors"].get.operationId).toBe("connectorList");
    expect(openApiDocument.paths["/v1/connectors/{provider}/authorize"].post.operationId).toBe("connectorAuthorize");
    expect(openApiDocument.paths["/v1/connectors/{connection_id}"].get.operationId).toBe("connectorStatusGet");
    expect(openApiDocument.paths["/v1/connectors/{connection_id}/sync"].post.operationId).toBe("connectorSync");
    expect(openApiDocument.paths["/v1/connectors/{connection_id}/resync"].post.operationId).toBe("connectorResync");
    expect(openApiDocument.paths["/v1/connectors/{connection_id}/pause"].post.operationId).toBe("connectorPause");
    expect(openApiDocument.paths["/v1/connectors/{connection_id}/resume"].post.operationId).toBe("connectorResume");
    expect(openApiDocument.paths["/v1/connectors/{connection_id}/disconnect"].post.operationId).toBe("connectorDisconnect");
    expect(openApiDocument.paths["/v1/connectors/{connection_id}/channels/renew"].post.operationId).toBe("connectorRenewChannel");
    expect(openApiDocument.components.schemas.ConnectorConnection).toBeDefined();
    expect(openApiDocument.components.schemas.ConnectorSyncResponse).toBeDefined();
  });
});
