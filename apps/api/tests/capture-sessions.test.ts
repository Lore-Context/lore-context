import { describe, expect, it } from "vitest";
import { CloudPlatform } from "../src/cloud.js";
import { createLoreApi } from "../src/index.js";

// V0.8 capture pipeline ingestion tests. Coverage targets the test-spec
// "Gate 4: Watcher and Capture Ingestion" assertions:
//   - duplicate idempotency key returns same session/job;
//   - capture ingestion requires device token with `capture.write`;
//   - paused source rejects upload;
//   - raw_archive rejected when vault disallows;
//   - cross-vault upload rejected.

async function pairDevice(cloud: CloudPlatform): Promise<{
  deviceToken: string;
  vaultId: string;
  deviceId: string;
}> {
  const install = await cloud.issueInstallToken();
  const result = await cloud.redeemInstallToken(install.plaintext, { label: "test", platform: "darwin" });
  return {
    deviceToken: result.deviceToken.plaintext,
    vaultId: result.vault.id,
    deviceId: result.device.id
  };
}

function basePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    provider: "claude_code",
    source_original_id: "sess-original-1",
    source_id: "src_default",
    content_hash: "deadbeef",
    idempotency_key: "cap_claude_code_aaaa_bbbb",
    capture_mode: "summary_only",
    started_at: "2026-04-30T10:00:00.000Z",
    ended_at: "2026-04-30T10:01:00.000Z",
    redaction: { version: "v08.1", secret_count: 0, private_block_count: 0 },
    turn_summary: [
      { role: "user", text: "ship it" },
      { role: "assistant", text: "deploying" }
    ],
    metadata: { cwd: "/repo" },
    ...overrides
  };
}

describe("CloudPlatform.enqueueSession", () => {
  it("creates a session + job for a fresh upload", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const auth = await cloud.authenticate(deviceToken);

    const result = await cloud.enqueueSession({
      auth,
      sourceId: "src_a",
      provider: "claude_code",
      sourceOriginalId: "s1",
      contentHash: "h1",
      idempotencyKey: "cap_a",
      captureMode: "summary_only",
      redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
      metadata: {},
      turnSummary: [{ role: "user", text: "hi" }]
    });

    expect(result.duplicate).toBe(false);
    expect(result.session.id).toMatch(/^sess_/);
    expect(result.session.idempotencyKey).toBe("cap_a");
    expect(result.job.status).toBe("pending");
    expect(result.job.sessionId).toBe(result.session.id);
  });

  it("returns the same session + job on duplicate idempotency key", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const auth = await cloud.authenticate(deviceToken);

    const args = {
      auth,
      sourceId: "src_b",
      provider: "claude_code",
      sourceOriginalId: "s1",
      contentHash: "h1",
      idempotencyKey: "cap_dup",
      captureMode: "summary_only" as const,
      redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
      metadata: {},
      turnSummary: [{ role: "user", text: "hi" }]
    };

    const first = await cloud.enqueueSession(args);
    const second = await cloud.enqueueSession(args);
    expect(second.duplicate).toBe(true);
    expect(second.session.id).toBe(first.session.id);
    expect(second.job.id).toBe(first.job.id);
  });

  it("rejects raw_archive when the vault disallows it (default)", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const auth = await cloud.authenticate(deviceToken);

    await expect(
      cloud.enqueueSession({
        auth,
        sourceId: "src_raw",
        provider: "claude_code",
        sourceOriginalId: "s1",
        contentHash: "h1",
        idempotencyKey: "cap_raw",
        captureMode: "raw_archive",
        redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
        metadata: {},
        turnSummary: [],
        rawTurns: [{ role: "user", text: "secret" }]
      })
    ).rejects.toThrowError(/raw_archive/);
  });

  it("rejects uploads when the source is paused", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const auth = await cloud.authenticate(deviceToken);

    await cloud.recordHeartbeat({ auth, sourceId: "src_p", status: "paused" });

    await expect(
      cloud.enqueueSession({
        auth,
        sourceId: "src_p",
        provider: "claude_code",
        sourceOriginalId: "s1",
        contentHash: "h1",
        idempotencyKey: "cap_p",
        captureMode: "summary_only",
        redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
        metadata: {},
        turnSummary: []
      })
    ).rejects.toThrowError(/paused/);
  });

  it("rejects getSession with a foreign vault id", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const auth = await cloud.authenticate(deviceToken);
    const seeded = await cloud.enqueueSession({
      auth,
      sourceId: "src_c",
      provider: "claude_code",
      sourceOriginalId: "s",
      contentHash: "h",
      idempotencyKey: "cap_c",
      captureMode: "summary_only",
      redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
      metadata: {},
      turnSummary: []
    });
    // Forge a different vault context. CloudPlatform multi-vault APIs are
    // not exposed yet (persistence lane), so synthesize the auth.
    const stranger = { ...auth, vaultId: "vault_other" };
    await expect(cloud.getSession(stranger, seeded.session.id)).rejects.toThrowError(/another vault/);
  });
});

describe("/v1/capture/sessions HTTP route", () => {
  it("requires bearer token with capture.write scope", async () => {
    const app = createLoreApi({ apiKeys: [{ key: "admin-k", role: "admin" }] });
    const response = await app.handle(
      new Request("http://localhost/v1/capture/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(basePayload())
      })
    );
    expect(response.status).toBe(401);
  });

  it("ingests a session and returns session/job/duplicate", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const app = createLoreApi({ cloudPlatform: cloud, apiKeys: [{ key: "admin-k", role: "admin" }] });

    const response = await app.handle(
      new Request("http://localhost/v1/capture/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${deviceToken}`
        },
        body: JSON.stringify(basePayload())
      })
    );
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.duplicate).toBe(false);
    expect(body.session.idempotencyKey).toBe("cap_claude_code_aaaa_bbbb");
    expect(body.job.status).toBe("pending");

    // Replay returns 200 + duplicate=true.
    const replay = await app.handle(
      new Request("http://localhost/v1/capture/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${deviceToken}`
        },
        body: JSON.stringify(basePayload())
      })
    );
    expect(replay.status).toBe(200);
    const replayBody = await replay.json();
    expect(replayBody.duplicate).toBe(true);
    expect(replayBody.session.id).toBe(body.session.id);
    expect(replayBody.job.id).toBe(body.job.id);
  });

  it("rejects raw_archive uploads with 409", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const app = createLoreApi({ cloudPlatform: cloud, apiKeys: [{ key: "admin-k", role: "admin" }] });

    const response = await app.handle(
      new Request("http://localhost/v1/capture/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${deviceToken}`
        },
        body: JSON.stringify(basePayload({ capture_mode: "raw_archive", idempotency_key: "cap_raw_http" }))
      })
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("capture.raw_archive_not_allowed");
  });

  it("rejects paused source with 409", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pairDevice(cloud);
    const auth = await cloud.authenticate(deviceToken);
    await cloud.recordHeartbeat({ auth, sourceId: "src_default", status: "paused" });

    const app = createLoreApi({ cloudPlatform: cloud, apiKeys: [{ key: "admin-k", role: "admin" }] });
    const response = await app.handle(
      new Request("http://localhost/v1/capture/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${deviceToken}`
        },
        body: JSON.stringify(basePayload({ idempotency_key: "cap_paused_http" }))
      })
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("capture.source_paused");
  });

  it("openapi.json includes the v0.8 capture session paths", async () => {
    const app = createLoreApi();
    const response = await app.handle(new Request("http://localhost/openapi.json"));
    const doc = await response.json();
    expect(doc.paths["/v1/capture/sessions"].post.operationId).toBe("captureSessionIngest");
    expect(doc.paths["/v1/capture/sessions/{session_id}"].get.operationId).toBe("captureSessionGet");
    expect(doc.components.schemas.CaptureIngestResponse).toBeDefined();
    expect(doc.components.schemas.CapturedSession).toBeDefined();
  });
});
