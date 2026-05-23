import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  configureCostTracker,
  flushCostTrackerQueue,
  getDailySpend,
  resetCostTrackerForTests,
  trackUsage,
  type CostTrackerDb,
} from "../src/cost-tracker.js";

interface CapturedQuery {
  text: string;
  values: readonly unknown[];
}

class FakeCostTrackerDb implements CostTrackerDb {
  readonly queries: CapturedQuery[] = [];
  private readonly spendByVault = new Map<string, number>();

  async query<T = unknown>(text: string, values: readonly unknown[] = []): Promise<{ rows: T[] }> {
    this.queries.push({ text, values });
    if (text.includes("INSERT INTO vault_llm_usage")) {
      const vaultId = String(values[0]);
      const costUsd = Number(values[5]);
      this.spendByVault.set(vaultId, (this.spendByVault.get(vaultId) ?? 0) + costUsd);
      return { rows: [] };
    }
    if (text.includes("SELECT COALESCE(SUM(cost_usd), 0)::float8 AS spend_usd")) {
      const vaultId = String(values[0]);
      return { rows: [{ spend_usd: this.spendByVault.get(vaultId) ?? 0 } as T] };
    }
    return { rows: [] };
  }
}

afterEach(() => {
  resetCostTrackerForTests();
  vi.restoreAllMocks();
});

describe("cost tracker", () => {
  it("rolls 10 usage writes into per-vault daily spend", async () => {
    const db = new FakeCostTrackerDb();
    configureCostTracker({ db });
    const vaultId = `vault-cost-${Date.now()}`;
    const costFloor = 0.01;

    for (let i = 0; i < 10; i++) {
      await trackUsage({
        vaultId,
        taskId: `task-${i % 2}`,
        model: "openrouter/test-model",
        promptTokens: 100 + i,
        completionTokens: 20 + i,
        costUsd: 0.0015,
      });
    }
    await flushCostTrackerQueue();

    const spend = await getDailySpend(vaultId);

    expect(spend).toBeGreaterThanOrEqual(costFloor);
    expect(db.queries.filter((q) => q.text.includes("INSERT INTO vault_llm_usage"))).toHaveLength(10);
    expect(db.queries[0].text).toContain("ON CONFLICT (vault_id, task_id, model, day) DO UPDATE");
    expect(db.queries[0].text).toContain("cost_usd = vault_llm_usage.cost_usd + EXCLUDED.cost_usd");
    expect(db.queries[0].text).toContain("call_count = vault_llm_usage.call_count + 1");
  });

  it("does not rethrow when the usage write fails", async () => {
    const error = new Error("db down");
    configureCostTracker({
      db: {
        query: async () => {
          throw error;
        },
      },
    });
    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      trackUsage({
        vaultId: "vault-fire-forget",
        taskId: "summary",
        model: "openrouter/test-model",
        promptTokens: 10,
        completionTokens: 2,
        costUsd: 0.0003,
      }),
    ).resolves.toBeUndefined();
    await flushCostTrackerQueue();

    expect(logger).toHaveBeenCalledWith(
      "cost_tracker_write_failed",
      expect.objectContaining({ error: "db down" }),
    );
  });

  it("returns the seeded daily spend for a vault", async () => {
    const db = new FakeCostTrackerDb();
    configureCostTracker({ db });
    const vaultId = "vault-seeded";

    await trackUsage({
      vaultId,
      taskId: "rewrite",
      model: "anthropic/test",
      promptTokens: 15,
      completionTokens: 5,
      costUsd: 0.0025,
    });
    await trackUsage({
      vaultId,
      taskId: "rewrite",
      model: "anthropic/test",
      promptTokens: 20,
      completionTokens: 8,
      costUsd: 0.0035,
    });
    await trackUsage({
      vaultId: "other-vault",
      taskId: "rewrite",
      model: "anthropic/test",
      promptTokens: 20,
      completionTokens: 8,
      costUsd: 5,
    });
    await flushCostTrackerQueue();

    await expect(getDailySpend(vaultId)).resolves.toBeCloseTo(0.006, 6);
  });

  it("drops writes above the bounded queue limit and emits a CloudWatch metric", async () => {
    const pendingWrites: Array<() => void> = [];
    configureCostTracker({
      db: {
        query: () =>
          new Promise((resolveQuery) => {
            pendingWrites.push(() => resolveQuery({ rows: [] }));
          }),
      },
    });
    const metricLogger = vi.spyOn(console, "log").mockImplementation(() => undefined);

    for (let i = 0; i < 102; i++) {
      await trackUsage({
        vaultId: "vault-queue",
        taskId: `task-${i}`,
        model: "openrouter/test-model",
        promptTokens: 1,
        completionTokens: 1,
        costUsd: 0.000001,
      });
    }
    while (pendingWrites.length > 0) {
      pendingWrites.splice(0).forEach((release) => release());
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await flushCostTrackerQueue();

    expect(metricLogger).toHaveBeenCalledWith(
      expect.stringContaining('"MetricName":"[redacted]cost-tracker-drop"'),
    );
  });

  it("defines the vault_llm_usage daily rollup table and unique key", () => {
    const schema = readFileSync(
      resolve(process.cwd(), "../../apps/api/src/db/schema-v18-llm-usage.sql"),
      "utf8",
    );

    expect(schema).toContain("CREATE TABLE IF NOT EXISTS vault_llm_usage");
    expect(schema).toContain("UNIQUE (vault_id, task_id, model, day)");
    expect(schema).toContain("idx_vault_llm_usage_vault_day");
  });
});
