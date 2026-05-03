import { describe, expect, it } from "vitest";
import { CloudPlatform, InMemoryCloudStore } from "../src/cloud.js";
import { createLoreApi } from "../src/index.js";
import { loadSchemaSql } from "../src/db/schema.js";

const NOW = () => new Date("2026-05-01T12:00:00.000Z");

async function pair(cloud: CloudPlatform) {
  const installed = await cloud.issueInstallToken();
  const paired = await cloud.redeemInstallToken(installed.plaintext, { label: "usage-test" });
  const auth = await cloud.authenticate(paired.deviceToken.plaintext);
  return { auth, deviceToken: paired.deviceToken.plaintext };
}

describe("v0.9 usage summary + plan limits", () => {
  it("computes plan caps from vault.plan and reports current usage", async () => {
    const cloud = new CloudPlatform({ now: NOW });
    const { auth } = await pair(cloud);
    await cloud.recordUsage({ vaultId: auth.vaultId, eventType: "capture.tokens", units: 12_345 });
    await cloud.recordUsage({ vaultId: auth.vaultId, eventType: "recall.request", units: 7 });

    const summary = await cloud.getUsageSummary(auth, { limit: 10 });
    expect(summary.plan).toBe("free");
    expect(summary.snapshot.ingestTokenLimit).toBe(1_000_000);
    expect(summary.snapshot.recallLimit).toBe(10_000);
    expect(summary.snapshot.ingestTokenUsed).toBe(12_345);
    expect(summary.snapshot.recallUsed).toBe(7);
    expect(summary.events.length).toBeGreaterThan(0);
  });

  it("checkPlanLimit denies a request that would exceed the cap", async () => {
    const cloud = new CloudPlatform({ now: NOW });
    const { auth } = await pair(cloud);
    await cloud.recordUsage({ vaultId: auth.vaultId, eventType: "capture.tokens", units: 999_999 });
    const result = await cloud.checkPlanLimit(auth, "ingest", 5);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(1_000_000);
    expect(result.used).toBe(999_999);
  });
});

describe("/v1/usage HTTP", () => {
  it("requires bearer auth", async () => {
    const app = createLoreApi();
    const res = await app.handle(new Request("http://localhost/v1/usage"));
    expect(res.status).toBe(401);
  });

  it("returns plan + snapshot + events for the caller's vault", async () => {
    const cloud = new CloudPlatform({ now: NOW });
    const { auth, deviceToken } = await pair(cloud);
    await cloud.recordUsage({ vaultId: auth.vaultId, eventType: "capture.tokens", units: 100 });

    const app = createLoreApi({ cloudPlatform: cloud });
    const res = await app.handle(
      new Request("http://localhost/v1/usage?limit=5", {
        headers: { authorization: `Bearer ${deviceToken}` }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan).toBe("free");
    expect(body.snapshot.ingestTokenUsed).toBe(100);
    expect(body.events.length).toBeGreaterThan(0);
  });
});

describe("/v1/operator/usage HTTP", () => {
  it("denies bearer-token callers", async () => {
    const cloud = new CloudPlatform({ now: NOW });
    const { deviceToken } = await pair(cloud);
    const app = createLoreApi({
      cloudPlatform: cloud,
      apiKeys: [{ key: "admin-only", role: "admin" }]
    });
    const res = await app.handle(
      new Request("http://localhost/v1/operator/usage", {
        headers: { authorization: `Bearer ${deviceToken}` }
      })
    );
    expect(res.status).toBe(403);
  });

  it("allows unscoped admin api-key (loopback dev mode also allowed)", async () => {
    const cloud = new CloudPlatform({ now: NOW });
    const { auth: aliceAuth } = await pair(cloud);
    await cloud.recordUsage({ vaultId: aliceAuth.vaultId, eventType: "capture.tokens", units: 555 });
    const app = createLoreApi({
      cloudPlatform: cloud,
      apiKeys: [{ key: "admin-key", role: "admin" }]
    });

    // Admin api-key path (no project scope) is accepted.
    const adminRes = await app.handle(
      new Request("http://localhost/v1/operator/usage?limit=10", {
        headers: { authorization: "Bearer admin-key" }
      })
    );
    expect(adminRes.status).toBe(200);
    const body = await adminRes.json();
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows[0].ingestTokenUsed).toBe(555);
  });

  it("loopback dev mode (no api keys configured) is allowed", async () => {
    const cloud = new CloudPlatform({ now: NOW });
    const { auth } = await pair(cloud);
    await cloud.recordUsage({ vaultId: auth.vaultId, eventType: "capture.tokens", units: 42 });
    const app = createLoreApi({ cloudPlatform: cloud });
    const res = await app.handle(new Request("http://localhost/v1/operator/usage"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows[0].ingestTokenUsed).toBe(42);
  });
});

describe("v0.9 schema additions", () => {
  it("adds source_permissions, source_checkpoints, capture_batches, usage_limit_snapshots, hosted_mcp_clients", () => {
    const sql = loadSchemaSql();
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS source_permissions");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS source_checkpoints");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS capture_batches");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS usage_limit_snapshots");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS hosted_mcp_clients");
    expect(sql).toContain("ALTER TABLE capture_sources ADD COLUMN IF NOT EXISTS display_name");
    expect(sql).toContain("ALTER TABLE capture_sources ADD COLUMN IF NOT EXISTS raw_archive_policy");
    expect(sql).toContain("ALTER TABLE capture_events ADD COLUMN IF NOT EXISTS idempotency_key");
    expect(sql).toContain("idx_capture_events_idempotency");
    expect(sql).toContain("idx_capture_batches_vault_received");
    expect(sql).toContain("idx_usage_limit_snapshots_vault_observed");
  });

  it("operatorUsageRollup aggregates by vault using in-memory store", async () => {
    const store = new InMemoryCloudStore();
    const a = new CloudPlatform({ store, now: NOW, defaultAccountId: "acct_a", defaultVaultId: "vault_a" });
    const b = new CloudPlatform({ store, now: NOW, defaultAccountId: "acct_b", defaultVaultId: "vault_b" });
    await a.defaultVault();
    await b.defaultVault();

    await a.recordUsage({ vaultId: "vault_a", eventType: "capture.tokens", units: 1_000 });
    await a.recordUsage({ vaultId: "vault_a", eventType: "recall.request", units: 10 });
    await b.recordUsage({ vaultId: "vault_b", eventType: "capture.tokens", units: 100 });

    const rollup = await a.operatorUsageRollup({ limit: 10 });
    expect(rollup).toHaveLength(2);
    const vaultA = rollup.find((row) => row.vaultId === "vault_a");
    const vaultB = rollup.find((row) => row.vaultId === "vault_b");
    expect(vaultA?.ingestTokenUsed).toBe(1_000);
    expect(vaultA?.recallUsed).toBe(10);
    expect(vaultB?.ingestTokenUsed).toBe(100);
  });
});
