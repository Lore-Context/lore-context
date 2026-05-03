import { describe, expect, it } from "vitest";
import { CloudPlatform, InMemoryCloudStore } from "../src/cloud.js";
import { loadSchemaSql } from "../src/db/schema.js";

const NOW = () => new Date("2026-04-30T12:00:00.000Z");

async function pairAuth() {
  const store = new InMemoryCloudStore();
  const platform = new CloudPlatform({ store, now: NOW });
  const installed = await platform.issueInstallToken();
  const paired = await platform.redeemInstallToken(installed.plaintext, { label: "usage-test" });
  const auth = await platform.authenticate(paired.deviceToken.plaintext);
  return { platform, auth };
}

describe("cloud-usage: metering", () => {
  it("recordHeartbeat emits a capture.heartbeat usage event", async () => {
    const { platform, auth } = await pairAuth();
    await platform.recordHeartbeat({ auth, sourceId: "src_meter", sourceProvider: "claude_code" });
    await platform.recordHeartbeat({ auth, sourceId: "src_meter", sourceProvider: "claude_code" });

    const events = await platform.listUsageEvents(auth, { limit: 10 });
    expect(events.length).toBe(2);
    expect(events[0]).toMatchObject({ eventType: "capture.heartbeat", units: 1, vaultId: auth.vaultId });

    const total = await platform.sumUsage(auth, "capture.heartbeat");
    expect(total).toBe(2);
  });

  it("explicit recordUsage attributes events to the caller's vault", async () => {
    const { platform, auth } = await pairAuth();
    await platform.recordUsage({ vaultId: auth.vaultId, accountId: auth.accountId, eventType: "capture.tokens", units: 1500 });
    await platform.recordUsage({ vaultId: auth.vaultId, accountId: auth.accountId, eventType: "capture.tokens", units: 500 });
    expect(await platform.sumUsage(auth, "capture.tokens")).toBe(2000);
  });

  it("usage events from one vault never appear in another vault's listing", async () => {
    const store = new InMemoryCloudStore();
    const alice = new CloudPlatform({ store, now: NOW, defaultAccountId: "acct_a", defaultVaultId: "vault_a" });
    const bob = new CloudPlatform({ store, now: NOW, defaultAccountId: "acct_b", defaultVaultId: "vault_b" });
    await alice.defaultVault();
    await bob.defaultVault();

    await alice.recordUsage({ vaultId: "vault_a", eventType: "test", units: 7 });
    await bob.recordUsage({ vaultId: "vault_b", eventType: "test", units: 11 });

    const aliceInstalled = await alice.issueInstallToken();
    const alicePair = await alice.redeemInstallToken(aliceInstalled.plaintext, { label: "a" });
    const aliceAuth = await alice.authenticate(alicePair.deviceToken.plaintext);

    const aliceEvents = await alice.listUsageEvents(aliceAuth, { limit: 10 });
    expect(aliceEvents.every((event) => event.vaultId === "vault_a")).toBe(true);
    expect(await alice.sumUsage(aliceAuth, "test")).toBe(7);
  });

  it("audit events record token issue/revoke without leaking plaintext", async () => {
    const { platform, auth } = await pairAuth();
    const events = await platform.listAuditEvents(auth, { limit: 10 });
    expect(events.some((event) => event.action === "cloud.install_token.issued")).toBe(true);
    expect(events.some((event) => event.action === "cloud.device.paired")).toBe(true);
    for (const event of events) {
      expect(JSON.stringify(event)).not.toMatch(/lct_install_/);
      expect(JSON.stringify(event)).not.toMatch(/lct_device_/);
    }
  });
});

describe("v0.8 schema additions", () => {
  it("adds cloud_tokens, cloud_users, audit_events, and email columns idempotently", () => {
    const sql = loadSchemaSql();
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS cloud_users");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS cloud_tokens");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS audit_events");
    expect(sql).toContain("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email");
    expect(sql).toContain("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS display_name");
    expect(sql).toContain("ALTER TABLE capture_sessions ADD COLUMN IF NOT EXISTS content_hash");
    expect(sql).toContain("token_hash TEXT NOT NULL UNIQUE");
    expect(sql).toContain("idx_cloud_tokens_active");
    expect(sql).toContain("idx_audit_events_vault_id");
  });
});
