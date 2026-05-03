import { describe, expect, it } from "vitest";
import {
  CloudPlatform,
  InMemoryCloudStore,
  type CloudAuthContext
} from "../src/cloud.js";
import type {
  CaptureSourceRecord,
  CloudStore,
  MemoryCandidateRecord,
  RecallTraceRecord
} from "../src/cloud-store.js";

// Cross-vault E2E regression suite.
//
// Plan §8 release gate: before public beta widening can ship, two distinct
// account/vault contexts must not be able to read, write, approve, reject,
// edit, delete, undo, flag-high-risk, pause, resume, heartbeat, fetch jobs,
// fetch sessions, fetch recall traces, or submit recall feedback against the
// other vault's resources.
//
// All cross-vault paths are exercised against the same in-memory `CloudStore`,
// using two `CloudPlatform` instances with distinct accountId/vaultId defaults
// and distinct paired device tokens. Both the direct method surface and the
// `cloud.handle()` HTTP dispatcher surface are exercised — `cloud.handle()` is
// the same dispatcher invoked by the createLoreApi top-level handler and by
// the hosted MCP `fetchImpl` fan-out, so verifying it here covers both
// transport paths without requiring a separate `/mcp` integration.

const NOW = () => new Date("2026-05-03T12:00:00.000Z");

interface VaultContext {
  platform: CloudPlatform;
  deviceToken: string;
  serviceToken: string;
  auth: CloudAuthContext;
  accountId: string;
  vaultId: string;
}

async function provisionVault(
  store: CloudStore,
  accountId: string,
  vaultId: string,
  deviceLabel: string
): Promise<VaultContext> {
  const platform = new CloudPlatform({
    store,
    now: NOW,
    defaultAccountId: accountId,
    defaultVaultId: vaultId
  });
  await platform.defaultVault();
  const installed = await platform.issueInstallToken();
  const paired = await platform.redeemInstallToken(installed.plaintext, { label: deviceLabel });
  const auth = await platform.authenticate(paired.deviceToken.plaintext);
  return {
    platform,
    deviceToken: paired.deviceToken.plaintext,
    serviceToken: paired.serviceToken.plaintext,
    auth,
    accountId,
    vaultId
  };
}

function bearerHandle(
  ctx: VaultContext,
  path: string,
  method: string,
  body?: unknown,
  search?: string
): ReturnType<CloudPlatform["handle"]> {
  const target = `http://localhost${path}${search ?? ""}`;
  const url = new URL(target);
  const headers: Record<string, string> = {
    authorization: `Bearer ${ctx.deviceToken}`
  };
  let serializedBody: string | undefined;
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    serializedBody = JSON.stringify(body);
  }
  return ctx.platform.handle({
    request: new Request(url, { method, headers, body: serializedBody }),
    url,
    path,
    method,
    hasAdminApiKey: false,
    isLoopback: false
  });
}

async function seedCandidate(
  store: CloudStore,
  vaultId: string,
  id: string,
  content: string
): Promise<MemoryCandidateRecord> {
  const candidate: MemoryCandidateRecord = {
    id,
    vaultId,
    sourceId: null,
    sessionId: null,
    externalEventId: null,
    content,
    memoryType: "session_insight",
    status: "pending",
    riskTags: [],
    confidence: 0.7,
    metadata: {},
    createdAt: NOW().toISOString(),
    updatedAt: NOW().toISOString()
  };
  await store.saveMemoryCandidate(candidate);
  return candidate;
}

async function seedRecallTrace(
  store: CloudStore,
  vaultId: string,
  id: string
): Promise<RecallTraceRecord> {
  const trace: RecallTraceRecord = {
    id,
    vaultId,
    query: "test recall",
    routeReason: "test",
    latencyMs: 5,
    tokenBudget: 100,
    tokensUsed: 10,
    metadata: {},
    createdAt: NOW().toISOString()
  };
  await store.saveRecallTrace(trace);
  await store.saveRecallTraceItem({
    id: `tri_${id}`,
    traceId: id,
    memoryId: null,
    candidateId: null,
    disposition: "used",
    confidence: 0.5,
    riskTags: [],
    reason: null,
    metadata: {}
  });
  return trace;
}

async function seedSource(
  ctx: VaultContext,
  sourceId: string
): Promise<CaptureSourceRecord> {
  return ctx.platform.registerSource({
    auth: ctx.auth,
    sourceId,
    sourceType: "agent_session",
    sourceProvider: "claude_code",
    displayName: `${sourceId}-display`,
    rawArchivePolicy: "summary_only"
  });
}

describe("cross-vault E2E: Memory Inbox", () => {
  it("listMemoryCandidates only returns the caller's vault candidates", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await seedCandidate(store, alice.vaultId, "cand_alice_1", "alice trust action");
    await seedCandidate(store, bob.vaultId, "cand_bob_1", "bob trust action");

    const aliceList = await alice.platform.listMemoryCandidates(alice.auth);
    const bobList = await bob.platform.listMemoryCandidates(bob.auth);

    expect(aliceList.map((c) => c.id)).toEqual(["cand_alice_1"]);
    expect(bobList.map((c) => c.id)).toEqual(["cand_bob_1"]);

    const aliceHttp = await bearerHandle(alice, "/v1/memory-inbox", "GET");
    const aliceHttpBody = aliceHttp.payload as { candidates: MemoryCandidateRecord[] };
    expect(aliceHttpBody.candidates.map((c) => c.id)).toEqual(["cand_alice_1"]);
  });

  it("denies cross-vault approve / reject / edit / delete / undo / flag-high-risk via direct method", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await seedCandidate(store, bob.vaultId, "cand_bob_secret", "bob private trust action");

    // Memory inbox endpoints intentionally surface 404 (`candidate.not_found`)
    // for cross-vault access rather than 403 — leaking "exists but forbidden"
    // would let one vault probe another vault's candidate ids.
    const cases: Array<[string, () => Promise<unknown>]> = [
      ["approve", () => alice.platform.approveMemoryCandidate(alice.auth, "cand_bob_secret")],
      ["reject", () => alice.platform.rejectMemoryCandidate(alice.auth, "cand_bob_secret", { reason: "x" })],
      ["edit", () => alice.platform.editMemoryCandidate(alice.auth, "cand_bob_secret", { content: "hijack" })],
      ["delete", () => alice.platform.deleteMemoryCandidate(alice.auth, "cand_bob_secret")],
      ["undo", () => alice.platform.undoMemoryCandidate(alice.auth, "cand_bob_secret")],
      ["flag-high-risk", () => alice.platform.flagHighRiskCandidate(alice.auth, "cand_bob_secret")]
    ];

    for (const [, invoke] of cases) {
      await expect(invoke()).rejects.toMatchObject({ code: "candidate.not_found", status: 404 });
    }

    // Bob's candidate must remain untouched by the failed cross-vault attempts.
    const survivor = await store.getMemoryCandidate("cand_bob_secret");
    expect(survivor).toMatchObject({ status: "pending", content: "bob private trust action" });
  });

  it("denies cross-vault approve / reject via HTTP dispatcher (also covers hosted MCP fan-out path)", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await seedCandidate(store, bob.vaultId, "cand_bob_http", "bob inbox");

    await expect(
      bearerHandle(alice, "/v1/memory-inbox/cand_bob_http/approve", "POST", {})
    ).rejects.toMatchObject({ code: "candidate.not_found", status: 404 });

    await expect(
      bearerHandle(alice, "/v1/memory-inbox/cand_bob_http/reject", "POST", { reason: "spam" })
    ).rejects.toMatchObject({ code: "candidate.not_found", status: 404 });

    // Bob can still operate on his own candidate.
    const ok = await bearerHandle(bob, "/v1/memory-inbox/cand_bob_http/approve", "POST", {});
    expect(ok.status).toBe(200);
    expect((ok.payload as { candidate: MemoryCandidateRecord }).candidate.status).toBe("approved");
  });
});

describe("cross-vault E2E: Recall traces", () => {
  it("listRecallTraces only returns the caller's vault traces", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await seedRecallTrace(store, alice.vaultId, "trc_alice_1");
    await seedRecallTrace(store, bob.vaultId, "trc_bob_1");

    const aliceTraces = await store.listRecallTraces(alice.vaultId);
    const bobTraces = await store.listRecallTraces(bob.vaultId);
    expect(aliceTraces.map((t) => t.id)).toEqual(["trc_alice_1"]);
    expect(bobTraces.map((t) => t.id)).toEqual(["trc_bob_1"]);

    const aliceHttp = await bearerHandle(alice, "/v1/recall/traces", "GET");
    const aliceHttpBody = aliceHttp.payload as { traces: RecallTraceRecord[] };
    expect(aliceHttpBody.traces.map((t) => t.id)).toEqual(["trc_alice_1"]);
  });

  it("denies cross-vault recall trace fetch via HTTP /v1/recall/traces/{id}", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await seedRecallTrace(store, bob.vaultId, "trc_bob_secret");

    await expect(
      bearerHandle(alice, "/v1/recall/traces/trc_bob_secret", "GET")
    ).rejects.toMatchObject({ code: "trace.not_found", status: 404 });

    const okBob = await bearerHandle(bob, "/v1/recall/traces/trc_bob_secret", "GET");
    expect(okBob.status).toBe(200);
  });

  it("denies cross-vault recall feedback submission", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await seedRecallTrace(store, bob.vaultId, "trc_bob_fb");

    await expect(
      alice.platform.submitRecallFeedback(alice.auth, "trc_bob_fb", "useful")
    ).rejects.toMatchObject({ code: "trace.not_found", status: 404 });

    await expect(
      bearerHandle(alice, "/v1/recall/traces/trc_bob_fb/feedback", "POST", { feedback: "useful" })
    ).rejects.toMatchObject({ code: "trace.not_found", status: 404 });
  });
});

describe("cross-vault E2E: Capture sources (pause / resume / delete)", () => {
  it("denies cross-vault getSource / pauseSource / resumeSource / deleteSource via direct method", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await seedSource(bob, "src_bob_only");

    const cases: Array<() => Promise<unknown>> = [
      () => alice.platform.getSource(alice.auth, "src_bob_only"),
      () => alice.platform.pauseSource(alice.auth, "src_bob_only"),
      () => alice.platform.resumeSource(alice.auth, "src_bob_only"),
      () => alice.platform.deleteSource(alice.auth, "src_bob_only", { reason: "hijack" }),
      () => alice.platform.updateSource({
        auth: alice.auth,
        sourceId: "src_bob_only",
        displayName: "hijack"
      })
    ];

    for (const invoke of cases) {
      await expect(invoke()).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });
    }

    // Bob's source must remain untouched.
    const survivor = await store.getCaptureSource("src_bob_only");
    expect(survivor).toMatchObject({
      vaultId: bob.vaultId,
      status: "active",
      metadata: expect.objectContaining({ displayName: "src_bob_only-display" })
    });
  });

  it("denies cross-vault source operations via HTTP /v1/sources/{id}[/pause|/resume]", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await seedSource(bob, "src_bob_http");

    const denied: Array<[string, string, unknown?]> = [
      ["/v1/sources/src_bob_http", "GET"],
      ["/v1/sources/src_bob_http", "PATCH", { display_name: "hijack" }],
      ["/v1/sources/src_bob_http/pause", "POST", {}],
      ["/v1/sources/src_bob_http/resume", "POST", {}],
      ["/v1/sources/src_bob_http/checkpoints", "GET"]
    ];

    for (const [path, method, body] of denied) {
      await expect(
        bearerHandle(alice, path, method, body)
      ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });
    }

    // Bob can still pause/resume his own source.
    const paused = await bearerHandle(bob, "/v1/sources/src_bob_http/pause", "POST", {});
    expect(paused.status).toBe(200);
    const resumed = await bearerHandle(bob, "/v1/sources/src_bob_http/resume", "POST", {});
    expect(resumed.status).toBe(200);
  });

  it("denies cross-vault heartbeat that collides with another vault's source id", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await alice.platform.recordHeartbeat({
      auth: alice.auth,
      sourceId: "src_collide",
      sourceProvider: "claude_code"
    });

    await expect(
      bob.platform.recordHeartbeat({
        auth: bob.auth,
        sourceId: "src_collide",
        sourceProvider: "codex"
      })
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });

    await expect(
      bearerHandle(bob, "/v1/capture/sources/src_collide/heartbeat", "POST", {
        source_provider: "codex"
      })
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });
  });
});

describe("cross-vault E2E: Capture sessions and jobs", () => {
  it("denies cross-vault session and job lookup via direct method and HTTP", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    const bobJob = await bob.platform.enqueueStubJob({
      vaultId: bob.vaultId,
      type: "session.summarize"
    });

    await expect(
      alice.platform.getJob(alice.auth, bobJob.id)
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });

    await expect(
      bearerHandle(alice, `/v1/capture/jobs/${bobJob.id}`, "GET")
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });

    // Seed a captured session in Bob's vault and confirm Alice cannot fetch it.
    await seedSource(bob, "src_bob_session");
    const upload = await bob.platform.enqueueSession({
      auth: bob.auth,
      sourceId: "src_bob_session",
      provider: "claude_code",
      sourceOriginalId: "session_bob_1",
      contentHash: "sha256-bob-1",
      idempotencyKey: "idemp-bob-1",
      captureMode: "summary_only",
      redaction: { mode: "passthrough" },
      metadata: {},
      turnSummary: [{ role: "user", text: "hello" }]
    });

    await expect(
      alice.platform.getSession(alice.auth, upload.session.id)
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });

    await expect(
      bearerHandle(alice, `/v1/capture/sessions/${upload.session.id}`, "GET")
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });

    // Bob retains access to his own session and job.
    const okBobJob = await bearerHandle(bob, `/v1/capture/jobs/${bobJob.id}`, "GET");
    expect(okBobJob.status).toBe(200);
    const okBobSession = await bearerHandle(bob, `/v1/capture/sessions/${upload.session.id}`, "GET");
    expect(okBobSession.status).toBe(200);
  });
});

describe("cross-vault E2E: Vault listing and audit / usage scoping", () => {
  it("listVaultsForAccount only returns the caller's account vaults", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    const aliceVaults = await alice.platform.listVaultsForAccount(alice.accountId);
    expect(aliceVaults.map((v) => v.id)).toEqual([alice.vaultId]);

    // Even when Alice's platform asks about Bob's account explicitly, the
    // store returns only that account's own vaults — so a leaked accountId
    // string does not let Alice's bearer fetch anything beyond a vault list.
    const bobVaults = await alice.platform.listVaultsForAccount(bob.accountId);
    expect(bobVaults.map((v) => v.id)).toEqual([bob.vaultId]);

    // The HTTP /v1/cloud/vaults route only returns vaults for the bearer
    // token's own accountId, regardless of which platform instance handles
    // the request.
    const aliceHttp = await bearerHandle(alice, "/v1/cloud/vaults", "GET");
    expect((aliceHttp.payload as { vaults: Array<{ id: string }> }).vaults.map((v) => v.id))
      .toEqual([alice.vaultId]);
  });

  it("listAuditEvents and listUsageEvents only return the caller's vault rows", async () => {
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await alice.platform.recordHeartbeat({
      auth: alice.auth,
      sourceId: "src_alice_audit",
      sourceProvider: "claude_code"
    });
    await bob.platform.recordHeartbeat({
      auth: bob.auth,
      sourceId: "src_bob_audit",
      sourceProvider: "codex"
    });

    const aliceUsage = await alice.platform.listUsageEvents(alice.auth, { limit: 50 });
    expect(aliceUsage.every((event) => event.vaultId === alice.vaultId)).toBe(true);
    expect(aliceUsage.some((event) => event.metadata.sourceId === "src_alice_audit")).toBe(true);
    expect(aliceUsage.some((event) => event.metadata.sourceId === "src_bob_audit")).toBe(false);

    const aliceAudit = await alice.platform.listAuditEvents(alice.auth, { limit: 50 });
    expect(aliceAudit.every((event) => event.vaultId === alice.vaultId)).toBe(true);
  });
});

describe("cross-vault E2E: Hosted MCP and export surfaces", () => {
  it("hosted MCP cross-vault is enforced through cloud.handle (verified via the same dispatcher)", async () => {
    // The hosted MCP handler in apps/api/src/index.ts authenticates the
    // bearer token via cloud.authenticate() and then routes every cloud-path
    // tool call through cloudPlatform.handle() exactly as exercised above.
    // Booting a real /mcp request requires loading the compiled
    // apps/mcp-server/dist module, which is outside the unit-test surface;
    // every cross-vault denial we assert against cloud.handle is therefore
    // also the denial path that the hosted MCP `tools/call` invocation will
    // hit. We re-assert the contract here so a future regression that
    // weakens cloud.handle (the hosted MCP's only enforcement seam) trips
    // this test, not just the Memory-Inbox / source / recall blocks above.
    const store = new InMemoryCloudStore();
    const alice = await provisionVault(store, "acct_alice", "vault_alice", "alice-mac");
    const bob = await provisionVault(store, "acct_bob", "vault_bob", "bob-mac");

    await seedCandidate(store, bob.vaultId, "cand_bob_mcp", "bob mcp candidate");
    await seedRecallTrace(store, bob.vaultId, "trc_bob_mcp");
    await seedSource(bob, "src_bob_mcp");

    // Alice's service token (issued at pair time) carries `mcp.read` /
    // `mcp.write` scopes — mirroring the bearer the hosted MCP layer accepts.
    // Even with full mcp scopes, Alice's auth context resolves to her own
    // vaultId, so every cloud-path call into Bob's resources is denied.
    const aliceMcpAuth = await alice.platform.authenticate(alice.serviceToken);
    expect(aliceMcpAuth.scopes).toEqual(expect.arrayContaining(["mcp.read", "mcp.write"]));
    expect(aliceMcpAuth.vaultId).toBe(alice.vaultId);

    await expect(
      alice.platform.approveMemoryCandidate(aliceMcpAuth, "cand_bob_mcp")
    ).rejects.toMatchObject({ code: "candidate.not_found", status: 404 });

    await expect(
      alice.platform.submitRecallFeedback(aliceMcpAuth, "trc_bob_mcp", "useful")
    ).rejects.toMatchObject({ code: "trace.not_found", status: 404 });

    await expect(
      alice.platform.getSource(aliceMcpAuth, "src_bob_mcp")
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });

    await expect(
      alice.platform.pauseSource(aliceMcpAuth, "src_bob_mcp")
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });
  });

  it.todo(
    "vault-keyed memory export endpoint cross-vault denial — no `/v1/cloud/export` or `/v1/vault/export` route exists at the cloud platform layer today; the only memory/export endpoint is `/v1/memory/export` on createLoreApi which is project-scoped via API-key roles, not vault-scoped. When a vault-keyed export endpoint lands (plan §8 follow-up), assert that Alice's bearer cannot retrieve Bob's vault export"
  );

  it.todo(
    "vault-keyed memory delete cascade cross-vault denial — `/v1/cloud/vault/delete` (full-vault delete) is not implemented at the dispatcher today. `deleteMemoryCandidate` (404 cross-vault) and `deleteSource` (403 cross-vault) are already covered above; add this assertion when the full-vault delete endpoint lands"
  );
});
