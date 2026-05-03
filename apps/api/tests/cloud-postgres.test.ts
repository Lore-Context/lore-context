import { describe, expect, it } from "vitest";
import {
  CloudPlatform,
  hashToken,
  PostgresCloudStore,
  type CloudTokenRecord
} from "../src/cloud.js";

// FakePgPool implements the slice of `pg.Pool` used by `PostgresCloudStore`.
// Each handler matches a query prefix and returns the rows / mutates the
// in-memory tables. This keeps the suite hermetic — no real Postgres needed —
// while still exercising the SQL path the production runtime takes.

type Row = Record<string, unknown>;

class FakePgPool {
  readonly tables: Record<string, Map<string, Row>> = {
    accounts: new Map(),
    vaults: new Map(),
    devices: new Map(),
    cloud_tokens: new Map(),
    capture_sources: new Map(),
    capture_jobs: new Map(),
    usage_meter_events: new Map(),
    audit_events: new Map()
  };
  readonly queries: string[] = [];

  async connect() {
    return {
      query: (text: string, values?: unknown[]) => this.query(text, values ?? []),
      release: () => undefined
    };
  }

  async query(textRaw: string, values: unknown[] = []): Promise<{ rows: Row[] }> {
    const text = textRaw.replace(/\s+/g, " ").trim();
    this.queries.push(text);

    if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") return { rows: [] };

    if (text.startsWith("INSERT INTO accounts")) {
      const id = String(values[0]);
      const name = String(values[1]);
      const createdAt = String(values[2]);
      if (!this.tables.accounts.has(id)) {
        this.tables.accounts.set(id, { id, name, plan: "free", email: null, display_name: null, created_at: createdAt });
      }
      return { rows: [] };
    }

    if (text.startsWith("INSERT INTO vaults")) {
      const id = String(values[0]);
      const accountId = String(values[1]);
      const createdAt = String(values[2]);
      if (!this.tables.vaults.has(id)) {
        this.tables.vaults.set(id, {
          id, account_id: accountId, name: "Personal vault", plan: "free",
          raw_archive_enabled: false, private_mode: false, created_at: createdAt
        });
      }
      return { rows: [] };
    }

    if (text.startsWith("SELECT id, name, plan, email, display_name, created_at FROM accounts WHERE id =")) {
      const row = this.tables.accounts.get(String(values[0]));
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith("SELECT id, account_id, name, plan, raw_archive_enabled, private_mode, created_at FROM vaults WHERE id =")) {
      const row = this.tables.vaults.get(String(values[0]));
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith("SELECT id, account_id, name, plan, raw_archive_enabled, private_mode, created_at FROM vaults WHERE account_id =")) {
      const accountId = String(values[0]);
      return { rows: [...this.tables.vaults.values()].filter((row) => row.account_id === accountId) };
    }

    if (text.startsWith("INSERT INTO devices")) {
      const [id, vaultId, accountId, label, platform, status, lastSeenAt, pairedAt, revokedAt] = values;
      this.tables.devices.set(String(id), {
        id, vault_id: vaultId, account_id: accountId, label, platform, status,
        last_seen_at: lastSeenAt, paired_at: pairedAt, revoked_at: revokedAt
      });
      return { rows: [] };
    }

    if (text.startsWith("SELECT id, vault_id, account_id, label, platform, status, last_seen_at, paired_at, revoked_at FROM devices WHERE id =")) {
      const row = this.tables.devices.get(String(values[0]));
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith("UPDATE devices SET last_seen_at")) {
      const id = String(values[0]);
      const row = this.tables.devices.get(id);
      if (row) row.last_seen_at = values[1];
      return { rows: [] };
    }

    if (text.startsWith("UPDATE devices SET status = 'revoked'")) {
      const id = String(values[0]);
      const row = this.tables.devices.get(id);
      if (row) {
        row.status = "revoked";
        row.revoked_at = values[1];
      }
      return { rows: [] };
    }

    if (text.startsWith("INSERT INTO cloud_tokens")) {
      const [id, tokenHash, kind, vaultId, accountId, deviceId, agentId, scopesJson, singleUse, expiresAt, usedAt, revokedAt, rotatedFrom, , createdAt] = values;
      const hash = String(tokenHash);
      if (!this.tables.cloud_tokens.has(hash)) {
        this.tables.cloud_tokens.set(hash, {
          id, token_hash: hash, kind, vault_id: vaultId, account_id: accountId,
          device_id: deviceId, agent_id: agentId, scopes: scopesJson,
          single_use: singleUse, expires_at: expiresAt, used_at: usedAt,
          revoked_at: revokedAt, rotated_from: rotatedFrom, created_at: createdAt
        });
      }
      return { rows: [] };
    }

    if (text.startsWith("SELECT id, token_hash, kind, vault_id, account_id, device_id, agent_id, scopes, single_use, expires_at, used_at, revoked_at, rotated_from, created_at FROM cloud_tokens WHERE token_hash =")) {
      const row = this.tables.cloud_tokens.get(String(values[0]));
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith("UPDATE cloud_tokens SET used_at")) {
      const row = this.tables.cloud_tokens.get(String(values[0]));
      if (row && !row.used_at) row.used_at = values[1];
      return { rows: [] };
    }

    if (text.startsWith("UPDATE cloud_tokens SET revoked_at")) {
      const row = this.tables.cloud_tokens.get(String(values[0]));
      if (row && !row.revoked_at) row.revoked_at = values[1];
      return { rows: [] };
    }

    if (text.startsWith("INSERT INTO capture_sources")) {
      const id = String(values[0]);
      this.tables.capture_sources.set(id, {
        id, vault_id: values[1], device_id: values[2], source_type: values[3],
        source_provider: values[4], source_ref: values[5], status: values[6],
        last_heartbeat_at: values[7], last_error: values[8], metadata: values[9],
        created_at: values[10], updated_at: values[11]
      });
      return { rows: [] };
    }

    if (text.startsWith("SELECT id, vault_id, device_id, source_type, source_provider, source_ref, status, last_heartbeat_at, last_error, metadata, created_at, updated_at FROM capture_sources WHERE id =")) {
      const row = this.tables.capture_sources.get(String(values[0]));
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith("INSERT INTO capture_jobs")) {
      const id = String(values[0]);
      this.tables.capture_jobs.set(id, {
        id, vault_id: values[1], session_id: values[2], type: values[3],
        status: values[4], attempts: values[5], next_run_at: values[6],
        locked_by: values[7], locked_at: values[8], payload: values[9],
        error: values[10], created_at: values[11], updated_at: values[12]
      });
      return { rows: [] };
    }

    if (text.startsWith("SELECT id, vault_id, session_id, type, status, attempts, next_run_at, locked_by, locked_at, payload, error, created_at, updated_at FROM capture_jobs WHERE id =")) {
      const row = this.tables.capture_jobs.get(String(values[0]));
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith("INSERT INTO usage_meter_events")) {
      const id = String(values[0]);
      this.tables.usage_meter_events.set(id, {
        id, vault_id: values[1], account_id: values[2], event_type: values[3],
        units: values[4], metadata: values[5], occurred_at: values[6], created_at: values[7]
      });
      return { rows: [] };
    }

    if (text.startsWith("SELECT id, vault_id, account_id, event_type, units, metadata, occurred_at, created_at FROM usage_meter_events WHERE vault_id =")) {
      const vaultId = String(values[0]);
      const limit = Number(values[1] ?? 100);
      return {
        rows: [...this.tables.usage_meter_events.values()]
          .filter((row) => row.vault_id === vaultId)
          .sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)))
          .slice(0, limit)
      };
    }

    if (text.startsWith("SELECT COALESCE(SUM(units), 0)::float8 AS total FROM usage_meter_events")) {
      const vaultId = String(values[0]);
      const eventType = String(values[1]);
      const total = [...this.tables.usage_meter_events.values()]
        .filter((row) => row.vault_id === vaultId && row.event_type === eventType)
        .reduce((sum, row) => sum + Number(row.units ?? 0), 0);
      return { rows: [{ total }] };
    }

    if (text.startsWith("INSERT INTO audit_events")) {
      const id = String(values[0]);
      this.tables.audit_events.set(id, {
        id, vault_id: values[1], account_id: values[2], actor_id: values[3],
        actor_kind: values[4], action: values[5], target_type: values[6],
        target_id: values[7], metadata: values[8], created_at: values[9]
      });
      return { rows: [] };
    }

    if (text.startsWith("SELECT id, vault_id, account_id, actor_id, actor_kind, action, target_type, target_id, metadata, created_at FROM audit_events")) {
      const vaultId = String(values[0]);
      const limit = Number(values[1] ?? 100);
      return {
        rows: [...this.tables.audit_events.values()]
          .filter((row) => row.vault_id === vaultId)
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          .slice(0, limit)
      };
    }

    throw new Error(`unhandled fake pg query: ${text}`);
  }

  async end() { return undefined; }
}

const NOW = () => new Date("2026-04-30T12:00:00.000Z");

describe("cloud-postgres: restart-safe persistence", () => {
  it("preserves account, vault, device, token, source, and job rows across a fresh CloudPlatform", async () => {
    const pool = new FakePgPool();
    const storeA = new PostgresCloudStore({ pool: pool as never });
    const platformA = new CloudPlatform({ store: storeA, now: NOW });

    const installed = await platformA.issueInstallToken();
    const paired = await platformA.redeemInstallToken(installed.plaintext, { label: "ec2-1", platform: "linux" });
    const heartbeat = await platformA.recordHeartbeat({
      auth: await platformA.authenticate(paired.deviceToken.plaintext),
      sourceId: "src_persistent",
      sourceProvider: "claude_code"
    });
    const job = await platformA.enqueueStubJob({
      vaultId: paired.vault.id,
      type: "session.summarize",
      payload: { sessions: 1 }
    });

    expect(pool.tables.devices.has(paired.device.id)).toBe(true);
    expect(pool.tables.cloud_tokens.size).toBeGreaterThanOrEqual(3); // install + device + service

    // Boot a fresh CloudPlatform against the same pool. This simulates an API
    // process restart: nothing in memory carries over.
    const storeB = new PostgresCloudStore({ pool: pool as never });
    const platformB = new CloudPlatform({ store: storeB, now: NOW });

    const auth = await platformB.authenticate(paired.deviceToken.plaintext);
    expect(auth.vaultId).toBe(paired.vault.id);
    expect(auth.deviceId).toBe(paired.device.id);

    const recoveredHeartbeat = await storeB.getCaptureSource(heartbeat.id);
    expect(recoveredHeartbeat?.vaultId).toBe(paired.vault.id);

    const recoveredJob = await platformB.getJob(auth, job.id);
    expect(recoveredJob).toMatchObject({ id: job.id, vaultId: paired.vault.id });
  });

  it("only persists token hashes; the cloud_tokens table never contains plaintext", async () => {
    const pool = new FakePgPool();
    const store = new PostgresCloudStore({ pool: pool as never });
    const platform = new CloudPlatform({ store, now: NOW });
    const installed = await platform.issueInstallToken();

    for (const row of pool.tables.cloud_tokens.values()) {
      expect(String(row.token_hash)).not.toBe(installed.plaintext);
      expect(row.token_hash).toBe(hashToken(installed.plaintext));
      expect(JSON.stringify(row)).not.toContain(installed.plaintext);
    }
  });

  it("revoking a token marks the row revoked but does not delete it", async () => {
    const pool = new FakePgPool();
    const store = new PostgresCloudStore({ pool: pool as never });
    const platform = new CloudPlatform({ store, now: NOW });

    const installed = await platform.issueInstallToken();
    const paired = await platform.redeemInstallToken(installed.plaintext, { label: "rev" });
    const before = pool.tables.cloud_tokens.size;
    await platform.revokeToken(paired.deviceToken.plaintext);
    expect(pool.tables.cloud_tokens.size).toBe(before);

    const row = pool.tables.cloud_tokens.get(hashToken(paired.deviceToken.plaintext));
    expect(row?.revoked_at).toBeTruthy();

    // The same token hash now fails authentication.
    await expect(platform.authenticate(paired.deviceToken.plaintext)).rejects.toMatchObject({
      code: "cloud.token_revoked"
    });
  });
});

// Sanity check: the FakePgPool returns the right shape for PostgresCloudStore.
// If this fails the test pool no longer matches the production SQL.
describe("cloud-postgres: shape-check", () => {
  it("ensureBootstrap creates account and vault rows once", async () => {
    const pool = new FakePgPool();
    const store = new PostgresCloudStore({ pool: pool as never });
    const first = await store.ensureBootstrap({
      defaultAccountId: "acct_x",
      defaultVaultId: "vault_x",
      now: NOW().toISOString()
    });
    expect(first.account.id).toBe("acct_x");
    expect(first.vault.id).toBe("vault_x");
    const second = await store.ensureBootstrap({
      defaultAccountId: "acct_x",
      defaultVaultId: "vault_x",
      now: NOW().toISOString()
    });
    expect(second.account.id).toBe("acct_x");
    expect(pool.tables.accounts.size).toBe(1);
    expect(pool.tables.vaults.size).toBe(1);
  });

  // Surface the variable so the test imports stay used in case lint is strict.
  it("hashToken returns 64-char hex sha256", () => {
    const ref: CloudTokenRecord | undefined = undefined;
    expect(ref).toBeUndefined();
    expect(hashToken("lct_install_aaaa")).toMatch(/^[0-9a-f]{64}$/);
  });
});
