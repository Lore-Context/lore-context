import { describe, expect, it } from "vitest";
import { CloudPlatform, InMemoryCloudStore } from "../src/cloud.js";
import { createLoreApi } from "../src/index.js";

const NOW = () => new Date("2026-05-01T00:00:00.000Z");

async function pair(cloud: CloudPlatform) {
  const installed = await cloud.issueInstallToken();
  const paired = await cloud.redeemInstallToken(installed.plaintext, { label: "v09-test" });
  const auth = await cloud.authenticate(paired.deviceToken.plaintext);
  return { paired, auth, deviceToken: paired.deviceToken.plaintext };
}

describe("v0.9 source registry — handler surface", () => {
  it("registers, lists, gets, updates, pauses, resumes a source", async () => {
    const store = new InMemoryCloudStore();
    const cloud = new CloudPlatform({ store, now: NOW });
    const { auth } = await pair(cloud);

    const created = await cloud.registerSource({
      auth,
      sourceId: "src_claude_local",
      sourceType: "agent_session",
      sourceProvider: "claude_code",
      displayName: "Claude Code (local)",
      rawArchivePolicy: "summary_only",
      permissions: [{ permissionType: "agent_id", value: "claude-code" }],
      metadata: { repo: "lore-cloud" }
    });
    expect(created.id).toBe("src_claude_local");
    expect(created.metadata.displayName).toBe("Claude Code (local)");
    expect(created.metadata.rawArchivePolicy).toBe("summary_only");

    const listed = await cloud.listSources(auth);
    expect(listed.find((source) => source.id === "src_claude_local")).toBeDefined();

    const updated = await cloud.updateSource({
      auth,
      sourceId: created.id,
      displayName: "Claude Code (mac)",
      metadata: { repo: "lore-cloud", branch: "main" }
    });
    expect(updated.metadata.displayName).toBe("Claude Code (mac)");
    expect(updated.metadata.branch).toBe("main");

    const paused = await cloud.pauseSource(auth, created.id);
    expect(paused.status).toBe("paused");
    expect(paused.metadata.pausedAt).toBeTruthy();

    const resumed = await cloud.resumeSource(auth, created.id);
    expect(resumed.status).toBe("active");
    expect(resumed.metadata.pausedAt).toBeUndefined();

    // Audit events were recorded but never contain the bearer token.
    const audits = await cloud.listAuditEvents(auth, { limit: 20 });
    expect(audits.some((event) => event.action === "source.registered")).toBe(true);
    expect(audits.some((event) => event.action === "source.paused")).toBe(true);
    expect(audits.some((event) => event.action === "source.resumed")).toBe(true);
    expect(JSON.stringify(audits)).not.toMatch(/lct_device_/);
  });

  it("denies cross-vault source registration with the same id", async () => {
    const store = new InMemoryCloudStore();
    const alice = new CloudPlatform({ store, now: NOW, defaultAccountId: "acct_a", defaultVaultId: "vault_a" });
    const bob = new CloudPlatform({ store, now: NOW, defaultAccountId: "acct_b", defaultVaultId: "vault_b" });
    await alice.defaultVault();
    await bob.defaultVault();

    const a = await pair(alice);
    const b = await pair(bob);

    await alice.registerSource({
      auth: a.auth,
      sourceId: "src_collide",
      sourceType: "agent_session",
      sourceProvider: "claude_code"
    });
    await expect(
      bob.registerSource({
        auth: b.auth,
        sourceId: "src_collide",
        sourceType: "agent_session",
        sourceProvider: "claude_code"
      })
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });
  });
});

describe("/v1/sources HTTP surface", () => {
  it("requires a bearer token on every v0.9 source endpoint", async () => {
    const original = process.env.LORE_RATE_LIMIT_DISABLED;
    process.env.LORE_RATE_LIMIT_DISABLED = "1";
    try {
      const app = createLoreApi();
      const cases: Array<{ url: string; method: string; body?: unknown }> = [
        { url: "http://localhost/v1/sources", method: "GET" },
        { url: "http://localhost/v1/sources", method: "POST", body: { source_provider: "claude_code" } },
        { url: "http://localhost/v1/sources/src_x", method: "GET" },
        { url: "http://localhost/v1/sources/src_x", method: "PATCH", body: {} },
        { url: "http://localhost/v1/sources/src_x/pause", method: "POST" },
        { url: "http://localhost/v1/sources/src_x/resume", method: "POST" },
        { url: "http://localhost/v1/sources/src_x/checkpoints", method: "GET" },
        { url: "http://localhost/v1/sources/src_x/checkpoints", method: "POST", body: { checkpoint_key: "k" } }
      ];
      for (const { url, method, body } of cases) {
        const init: RequestInit = { method };
        if (body !== undefined) {
          init.headers = { "content-type": "application/json" };
          init.body = JSON.stringify(body);
        }
        const res = await app.handle(new Request(url, init));
        expect(res.status, `${method} ${url}`).toBe(401);
      }
    } finally {
      if (original === undefined) delete process.env.LORE_RATE_LIMIT_DISABLED;
      else process.env.LORE_RATE_LIMIT_DISABLED = original;
    }
  });

  it("registers a source and lists it for the same vault", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pair(cloud);
    const app = createLoreApi({ cloudPlatform: cloud });

    const create = await app.handle(
      new Request("http://localhost/v1/sources", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify({
          source_id: "src_http_a",
          source_provider: "claude_code",
          source_type: "agent_session",
          display_name: "HTTP A",
          raw_archive_policy: "summary_only"
        })
      })
    );
    expect(create.status).toBe(201);
    const created = await create.json();
    expect(created.source.id).toBe("src_http_a");
    expect(created.source.displayName).toBe("HTTP A");
    expect(created.source.rawArchivePolicy).toBe("summary_only");

    const list = await app.handle(
      new Request("http://localhost/v1/sources", {
        headers: { authorization: `Bearer ${deviceToken}` }
      })
    );
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.sources.some((source: { id: string }) => source.id === "src_http_a")).toBe(true);
  });

  it("checkpoint POST/GET is vault-scoped and dedupes by checkpoint_key", async () => {
    const cloud = new CloudPlatform();
    const { deviceToken } = await pair(cloud);
    const app = createLoreApi({ cloudPlatform: cloud });

    await app.handle(
      new Request("http://localhost/v1/sources", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify({ source_id: "src_chk", source_provider: "claude_code" })
      })
    );

    const save1 = await app.handle(
      new Request("http://localhost/v1/sources/src_chk/checkpoints", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify({ checkpoint_key: "claude_jsonl_offset", offset_value: "1024", content_hash: "abc" })
      })
    );
    expect(save1.status).toBe(200);

    const save2 = await app.handle(
      new Request("http://localhost/v1/sources/src_chk/checkpoints", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify({ checkpoint_key: "claude_jsonl_offset", offset_value: "2048", content_hash: "def" })
      })
    );
    expect(save2.status).toBe(200);

    const list = await app.handle(
      new Request("http://localhost/v1/sources/src_chk/checkpoints", {
        headers: { authorization: `Bearer ${deviceToken}` }
      })
    );
    const body = await list.json();
    // Same checkpoint_key dedupes — only one row stored even after two POSTs.
    expect(body.checkpoints).toHaveLength(1);
    expect(body.checkpoints[0].offsetValue).toBe("2048");
  });
});
