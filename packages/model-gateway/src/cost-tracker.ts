import { createRequire } from "node:module";
import { resolve } from "node:path";

export interface UsageRecord {
  vaultId: string;
  taskId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

export interface CostTrackerDb {
  query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
}

export interface CostTrackerConfig {
  db?: CostTrackerDb;
  logger?: Pick<Console, "error" | "log">;
  maxQueueDepth?: number;
}

const DEFAULT_MAX_QUEUE_DEPTH = 100;

let configuredDb: CostTrackerDb | undefined;
let defaultDb: CostTrackerDb | undefined;
let defaultDbAttempted = false;
let configuredLogger: Pick<Console, "error" | "log"> = console;
let maxQueueDepth = DEFAULT_MAX_QUEUE_DEPTH;
let queue: UsageRecord[] = [];
let processing = false;
let idleResolvers: Array<() => void> = [];

const TRACK_USAGE_SQL = `
INSERT INTO vault_llm_usage (
  vault_id,
  task_id,
  model,
  prompt_tokens,
  completion_tokens,
  cost_usd
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (vault_id, task_id, model, day) DO UPDATE SET
  prompt_tokens = vault_llm_usage.prompt_tokens + EXCLUDED.prompt_tokens,
  completion_tokens = vault_llm_usage.completion_tokens + EXCLUDED.completion_tokens,
  cost_usd = vault_llm_usage.cost_usd + EXCLUDED.cost_usd,
  call_count = vault_llm_usage.call_count + 1
`;

const DAILY_SPEND_SQL = `
SELECT COALESCE(SUM(cost_usd), 0)::float8 AS spend_usd
FROM vault_llm_usage
WHERE vault_id = $1 AND day = CURRENT_DATE
`;

export function configureCostTracker(config: CostTrackerConfig): void {
  configuredDb = config.db;
  configuredLogger = config.logger ?? console;
  maxQueueDepth = config.maxQueueDepth ?? DEFAULT_MAX_QUEUE_DEPTH;
}

export async function trackUsage(record: UsageRecord): Promise<void> {
  try {
    if (queue.length + (processing ? 1 : 0) > maxQueueDepth) {
      emitCostTrackerDropMetric();
      return;
    }

    queue.push(normalizeUsageRecord(record));
    void processQueue();
  } catch (error) {
    logWriteFailure(error);
  }
}

export async function getDailySpend(vaultId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const result = await db.query<{ spend_usd: number | string | null }>(DAILY_SPEND_SQL, [vaultId]);
  const value = result.rows[0]?.spend_usd;
  return value === null || value === undefined ? 0 : Number(value);
}

export async function flushCostTrackerQueue(): Promise<void> {
  if (!processing && queue.length === 0) return;
  await new Promise<void>((resolve) => idleResolvers.push(resolve));
}

export function resetCostTrackerForTests(): void {
  configuredDb = undefined;
  defaultDb = undefined;
  defaultDbAttempted = false;
  configuredLogger = console;
  maxQueueDepth = DEFAULT_MAX_QUEUE_DEPTH;
  queue = [];
  processing = false;
  idleResolvers.splice(0).forEach((resolve) => resolve());
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  try {
    while (queue.length > 0) {
      const record = queue.shift()!;
      await writeUsage(record);
    }
  } finally {
    processing = false;
    if (queue.length > 0) {
      void processQueue();
      return;
    }
    idleResolvers.splice(0).forEach((resolve) => resolve());
  }
}

async function writeUsage(record: UsageRecord): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    await db.query(TRACK_USAGE_SQL, [
      record.vaultId,
      record.taskId,
      record.model,
      record.promptTokens,
      record.completionTokens,
      record.costUsd,
    ]);
  } catch (error) {
    logWriteFailure(error);
  }
}

function getDb(): CostTrackerDb | undefined {
  return configuredDb ?? resolveDefaultDb();
}

function resolveDefaultDb(): CostTrackerDb | undefined {
  if (defaultDbAttempted) return defaultDb;
  defaultDbAttempted = true;

  const databaseUrl = process.env.LORE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  try {
    const pg = requirePg();
    defaultDb = new pg.Pool({ connectionString: databaseUrl });
    return defaultDb;
  } catch (error) {
    logWriteFailure(error);
    return undefined;
  }
}

function requirePg(): { Pool: new (config: { connectionString: string }) => CostTrackerDb } {
  const requireFromHere = createRequire(import.meta.url);
  try {
    return requireFromHere("pg") as { Pool: new (config: { connectionString: string }) => CostTrackerDb };
  } catch {
    const cwd = process.cwd();
    const candidates = [
      resolve(cwd, "package.json"),
      resolve(cwd, "apps/api/package.json"),
    ];

    for (const candidate of candidates) {
      try {
        const requireFromCandidate = createRequire(candidate);
        return requireFromCandidate("pg") as { Pool: new (config: { connectionString: string }) => CostTrackerDb };
      } catch {
        continue;
      }
    }

    throw new Error("pg module is unavailable for cost tracker database writes");
  }
}

function normalizeUsageRecord(record: UsageRecord): UsageRecord {
  return {
    vaultId: record.vaultId,
    taskId: record.taskId,
    model: record.model,
    promptTokens: Math.max(0, Math.trunc(record.promptTokens)),
    completionTokens: Math.max(0, Math.trunc(record.completionTokens)),
    costUsd: Math.max(0, record.costUsd),
  };
}

function logWriteFailure(error: unknown): void {
  configuredLogger.error("cost_tracker_write_failed", {
    error: error instanceof Error ? error.message : String(error),
  });
}

function emitCostTrackerDropMetric(): void {
  configuredLogger.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: "lore-prod",
            Dimensions: [["service"]],
            Metrics: [{ Name: "[redacted]cost-tracker-drop", Unit: "Count" }],
          },
        ],
      },
      service: "model-gateway",
      MetricName: "[redacted]cost-tracker-drop",
      count: 1,
    }),
  );
}
