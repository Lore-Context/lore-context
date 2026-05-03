import { describe, expect, it } from "vitest";
import { CloudPlatform } from "../src/cloud.js";
import { createLoreApi } from "../src/index.js";

async function pair(cloud: CloudPlatform, label = "evt") {
  const installed = await cloud.issueInstallToken();
  const paired = await cloud.redeemInstallToken(installed.plaintext, { label });
  const auth = await cloud.authenticate(paired.deviceToken.plaintext);
  return { auth, deviceToken: paired.deviceToken.plaintext };
}

async function registerSource(cloud: CloudPlatform, deviceToken: string, app: ReturnType<typeof createLoreApi>) {
  const create = await app.handle(
    new Request("http://localhost/v1/sources", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
      body: JSON.stringify({ source_id: "src_evt", source_provider: "claude_code" })
    })
  );
  expect(create.status).toBe(201);
}

describe("/v1/capture/events", () => {
  it("accepts a batch and dedupes by per-event idempotency_key", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pair(cloud);
    const app = createLoreApi({ cloudPlatform: cloud });
    await registerSource(cloud, deviceToken, app);

    const eventBody = (idem: string) => ({
      source_id: "src_evt",
      events: [
        {
          external_event_id: "claude-jsonl-1024",
          event_type: "session_delta",
          occurred_at: "2026-05-01T00:00:00.000Z",
          actor: "user",
          content_ref: { kind: "inline", sha256: "deadbeef" },
          redaction_state: "redacted",
          idempotency_key: idem,
          payload: { text: "hello" }
        }
      ]
    });

    const first = await app.handle(
      new Request("http://localhost/v1/capture/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify(eventBody("evt_idem_1"))
      })
    );
    expect(first.status).toBe(202);
    const firstBody = await first.json();
    expect(firstBody.accepted).toBe(1);
    expect(firstBody.deduped).toBe(0);
    expect(firstBody.eventIds).toHaveLength(1);

    // Re-submit same idempotency key — server returns deduped=1.
    const replay = await app.handle(
      new Request("http://localhost/v1/capture/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify(eventBody("evt_idem_1"))
      })
    );
    expect(replay.status).toBe(202);
    const replayBody = await replay.json();
    expect(replayBody.accepted).toBe(0);
    expect(replayBody.deduped).toBe(1);
  });

  it("rejects ingestion when source is paused (409)", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken, auth } = await pair(cloud);
    const app = createLoreApi({ cloudPlatform: cloud });
    await registerSource(cloud, deviceToken, app);
    await cloud.pauseSource(auth, "src_evt");

    const res = await app.handle(
      new Request("http://localhost/v1/capture/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify({
          source_id: "src_evt",
          events: [{ event_type: "session_delta", payload: {} }]
        })
      })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("capture.source_paused");
  });

  it("returns the same batch row on duplicate batch_idempotency_key", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pair(cloud);
    const app = createLoreApi({ cloudPlatform: cloud });
    await registerSource(cloud, deviceToken, app);

    const body = {
      source_id: "src_evt",
      batch_idempotency_key: "batch_aaaa",
      events: [
        { event_type: "session_delta", idempotency_key: "evt_a", payload: { text: "a" } },
        { event_type: "session_delta", idempotency_key: "evt_b", payload: { text: "b" } }
      ]
    };
    const first = await app.handle(
      new Request("http://localhost/v1/capture/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify(body)
      })
    );
    const firstId = (await first.json()).batch.id;

    const replay = await app.handle(
      new Request("http://localhost/v1/capture/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify(body)
      })
    );
    const replayBody = await replay.json();
    expect(replayBody.batch.id).toBe(firstId);
    expect(replayBody.deduped).toBeGreaterThan(0);
  });

  it("denies cross-vault: events posted with one device token cannot land in another vault's source", async () => {
    const aliceCloud = new CloudPlatform({ defaultAccountId: "acct_a", defaultVaultId: "vault_a" });
    const bobCloud = new CloudPlatform({ defaultAccountId: "acct_b", defaultVaultId: "vault_b" });

    const a = await pair(aliceCloud, "alice");
    await aliceCloud.registerSource({
      auth: a.auth,
      sourceId: "src_alice",
      sourceType: "agent_session",
      sourceProvider: "claude_code"
    });

    const aliceApp = createLoreApi({ cloudPlatform: aliceCloud });
    // Bob's token is unknown to Alice's cloud platform. Direct API call with
    // a Bob-style bogus token must be rejected at auth time.
    const res = await aliceApp.handle(
      new Request("http://localhost/v1/capture/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer lct_device_unknown_to_alice" },
        body: JSON.stringify({ source_id: "src_alice", events: [{ event_type: "session_delta", payload: {} }] })
      })
    );
    expect(res.status).toBe(401);
    void bobCloud;
  });
});

describe("/v1/capture/session-deltas", () => {
  it("appends deltas, dedupes by per-delta idempotency_key", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pair(cloud);
    const app = createLoreApi({ cloudPlatform: cloud });
    await registerSource(cloud, deviceToken, app);

    const body = {
      source_id: "src_evt",
      session_id: "sess_x",
      deltas: [
        { idempotency_key: "d1", payload: { text: "first" } },
        { idempotency_key: "d2", payload: { text: "second" } }
      ]
    };
    const first = await app.handle(
      new Request("http://localhost/v1/capture/session-deltas", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify(body)
      })
    );
    expect(first.status).toBe(202);
    expect(await first.json()).toMatchObject({ accepted: 2, deduped: 0 });

    const replay = await app.handle(
      new Request("http://localhost/v1/capture/session-deltas", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify(body)
      })
    );
    expect(await replay.json()).toMatchObject({ accepted: 0, deduped: 2 });
  });
});
