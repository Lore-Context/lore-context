import { AgentMemoryAdapter } from "@lore/agentmemory-adapter";
import { redactSensitiveContent, scanRiskTags, shouldRequireReview } from "@lore/governance";
import { meanReciprocalRank, percentile, precisionAtK, recallAtK, staleHitRate } from "@lore/eval";
import { exportLoreJson, exportLoreMarkdown, importLoreJson, importSimpleMarkdown, toLoreMemoryItem } from "@lore/mif";
import { noopSearchProvider, type SearchProvider } from "@lore/search";
import { renderDashboardHtml } from "@lore/web";
import {
  assertNonEmptyString,
  countApproxTokens,
  createMemoryRecord,
  LoreError,
  serializeError,
  type AuditLog,
  type ContextQueryRequest,
  type ContextQueryResponse,
  type ContextRoute,
  type ContextTrace,
  type EvalDataset,
  type EvalMetrics,
  type MemoryHit,
  type MemoryRecord,
  type MemoryScope,
  type MemoryStatus,
  type MemoryType,
  type SourceRef,
  type WebEvidence
} from "@lore/shared";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { loadSchemaSql } from "./db/schema.js";
import { log } from "./logger.js";

const LORE_MAX_JSON_BYTES = Number(process.env.LORE_MAX_JSON_BYTES ?? 1048576);
const LORE_REQUEST_TIMEOUT_MS = Number(process.env.LORE_REQUEST_TIMEOUT_MS ?? 30000);

interface RateBucket {
  count: number;
  windowStart: number;
}

interface FailBucket {
  failures: number;
  windowStart: number;
  blockedUntil?: number;
}

interface RateLimiter {
  check(ip: string, apiKey?: string): Response | undefined;
  recordAuthFailure(ip: string): void;
}

function createRateLimiter(): RateLimiter {
  const disabled = process.env.LORE_RATE_LIMIT_DISABLED === "1";
  const perIp = Number(process.env.LORE_RATE_LIMIT_PER_IP ?? 60);
  const perKey = Number(process.env.LORE_RATE_LIMIT_PER_KEY ?? 600);
  const ipBuckets = new Map<string, RateBucket>();
  const keyBuckets = new Map<string, RateBucket>();
  const failBuckets = new Map<string, FailBucket>();

  return {
    check(ip: string, apiKey?: string): Response | undefined {
      if (disabled) {
        return undefined;
      }
      const now = Date.now();
      const windowMs = 60_000;

      const failBucket = failBuckets.get(ip);
      if (failBucket?.blockedUntil && now < failBucket.blockedUntil) {
        return tooManyRequestsError("too many failed auth attempts, retry after 30s");
      }

      if (apiKey) {
        const bucket = keyBuckets.get(apiKey) ?? { count: 0, windowStart: now };
        if (now - bucket.windowStart > windowMs) {
          bucket.count = 0;
          bucket.windowStart = now;
        }
        bucket.count += 1;
        keyBuckets.set(apiKey, bucket);
        if (bucket.count > perKey) {
          return tooManyRequestsError("rate limit exceeded for API key");
        }
      } else {
        const bucket = ipBuckets.get(ip) ?? { count: 0, windowStart: now };
        if (now - bucket.windowStart > windowMs) {
          bucket.count = 0;
          bucket.windowStart = now;
        }
        bucket.count += 1;
        ipBuckets.set(ip, bucket);
        if (bucket.count > perIp) {
          return tooManyRequestsError("rate limit exceeded for IP");
        }
      }
      return undefined;
    },

    recordAuthFailure(ip: string): void {
      if (disabled) {
        return;
      }
      const now = Date.now();
      const windowMs = 60_000;
      const bucket = failBuckets.get(ip) ?? { failures: 0, windowStart: now };
      if (now - bucket.windowStart > windowMs) {
        bucket.failures = 0;
        bucket.windowStart = now;
        bucket.blockedUntil = undefined;
      }
      bucket.failures += 1;
      if (bucket.failures >= 5) {
        bucket.blockedUntil = now + 30_000;
      }
      failBuckets.set(ip, bucket);
    }
  };
}

function tooManyRequestsError(message: string): Response {
  return new Response(JSON.stringify({ error: { code: "rate_limit", message, status: 429 } }), {
    status: 429,
    headers: { "content-type": "application/json; charset=utf-8", "retry-after": "30" }
  });
}

function getClientIp(request: Request): string {
  return request.headers.get("x-lore-remote-address") ?? "unknown";
}

export interface HealthResponse {
  status: "ok";
  service: "lore-api";
  timestamp: string;
}

export interface EvalRunRecord {
  id: string;
  provider: string;
  projectId?: string;
  metrics: EvalMetrics;
  status: "completed";
  createdAt: string;
}

export interface EvalProviderInfo {
  id: string;
  label: string;
  source: "lore-store" | "uploaded-sessions" | "external";
  notes: string;
}

export interface LoreEventRecord {
  id: string;
  eventType: string;
  projectId?: string;
  payload: unknown;
  createdAt: string;
}

export interface LoreStoreSnapshot {
  version: "0.1";
  savedAt: string;
  memories: MemoryRecord[];
  traces: ContextTrace[];
  events: LoreEventRecord[];
  evalRuns: EvalRunRecord[];
  audits: AuditLog[];
}

export interface LoreStorePersistenceOptions {
  filePath?: string;
  autosave?: boolean;
  now?: () => Date;
}

export interface PostgresLoreStoreOptions {
  databaseUrl: string;
  autoApplySchema?: boolean;
  defaultOrganizationId?: string;
  pool?: Pool;
  now?: () => Date;
}

export interface LoreApiDependencies {
  store?: InMemoryLoreStore;
  agentMemory?: AgentMemoryAdapter;
  searchProvider?: SearchProvider;
  now?: () => Date;
  storePath?: string;
  apiKey?: string;
  apiKeys?: LoreApiKeyRule[];
}

export type LoreApiRole = "reader" | "writer" | "admin";

export interface LoreApiKeyRule {
  key: string;
  role: LoreApiRole;
  projectIds?: string[];
}

interface AuthContext {
  configured: boolean;
  role: LoreApiRole;
  projectIds?: string[];
}

export class InMemoryLoreStore {
  readonly memories = new Map<string, MemoryRecord>();
  readonly traces = new Map<string, ContextTrace>();
  readonly events: LoreEventRecord[] = [];
  readonly evalRuns = new Map<string, EvalRunRecord>();
  readonly audits: AuditLog[] = [];
  private persistence?: Required<LoreStorePersistenceOptions>;

  constructor(persistence?: LoreStorePersistenceOptions) {
    if (persistence?.filePath) {
      this.persistence = {
        filePath: persistence.filePath,
        autosave: persistence.autosave ?? true,
        now: persistence.now ?? (() => new Date())
      };
      this.loadFromFile(this.persistence.filePath);
    }
  }

  writeMemory(memory: MemoryRecord): MemoryRecord {
    this.memories.set(memory.id, memory);
    this.persistIfNeeded();
    return memory;
  }

  getMemory(id: string): MemoryRecord | undefined {
    return this.memories.get(id);
  }

  getReviewQueue(projectId?: string): MemoryRecord[] {
    return [...this.memories.values()]
      .filter((memory) => memory.status !== "deleted")
      .filter((memory) => !projectId || memory.projectId === projectId)
      .filter((memory) => memory.status === "candidate")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  updateMemoryStatus(id: string, status: MemoryStatus, now = new Date()): MemoryRecord | undefined {
    const memory = this.memories.get(id);
    if (!memory || memory.status === "deleted") {
      return undefined;
    }

    const updated = {
      ...memory,
      status,
      updatedAt: now.toISOString()
    };
    this.memories.set(id, updated);
    this.persistIfNeeded();
    return updated;
  }

  updateMemory(id: string, patch: Partial<MemoryRecord>, now = new Date()): MemoryRecord | undefined {
    const memory = this.memories.get(id);
    if (!memory || memory.status === "deleted" || memory.status === "superseded") {
      return undefined;
    }

    const updated = {
      ...memory,
      ...patch,
      id: memory.id,
      createdAt: memory.createdAt,
      updatedAt: now.toISOString()
    };
    this.memories.set(id, updated);
    this.persistIfNeeded();
    return updated;
  }

  supersedeMemory(id: string, next: MemoryRecord, now = new Date()): { previous: MemoryRecord; next: MemoryRecord } | undefined {
    const previous = this.memories.get(id);
    if (!previous || previous.status === "deleted" || previous.status === "superseded") {
      return undefined;
    }

    const updatedPrevious = {
      ...previous,
      status: "superseded" as const,
      supersededBy: next.id,
      updatedAt: now.toISOString()
    };
    this.memories.set(previous.id, updatedPrevious);
    this.memories.set(next.id, next);
    this.persistIfNeeded();
    return { previous: updatedPrevious, next };
  }

  searchMemories(query: string, projectId?: string, topK = 10, allowedProjectIds?: string[]): MemoryHit[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const active = [...this.memories.values()].filter(
      (memory) =>
        (memory.status === "active" || memory.status === "confirmed") &&
        (!projectId || memory.projectId === projectId) &&
        (!allowedProjectIds || (memory.projectId !== undefined && allowedProjectIds.includes(memory.projectId)))
    );

    return active
      .map((memory) => {
        const haystack = memory.content.toLowerCase();
        const matches = terms.filter((term) => haystack.includes(term)).length;
        const score = terms.length === 0 ? 0.1 : matches / terms.length;
        return {
          memory: { ...memory },
          score,
          highlights: score > 0 ? [memory.content] : [],
          backend: "lore-local"
        };
      })
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  forgetMemory(id: string, now = new Date()): boolean {
    const memory = this.memories.get(id);
    if (!memory || memory.status === "deleted") {
      return false;
    }

    this.memories.set(id, {
      ...memory,
      status: "deleted",
      updatedAt: now.toISOString()
    });
    this.persistIfNeeded();
    return true;
  }

  hardDeleteMemory(id: string): boolean {
    const deleted = this.memories.delete(id);
    if (deleted) {
      this.purgeMemoryCopies([id]);
      this.persistIfNeeded();
    }
    return deleted;
  }

  private purgeMemoryCopies(ids: string[]): void {
    const idSet = new Set(ids);
    for (let index = 0; index < this.audits.length; index += 1) {
      this.audits[index] = scrubDeletedMemoryAudit(this.audits[index] as AuditLog, idSet);
    }
  }

  recordMemoryUse(ids: string[], now = new Date()): void {
    const usedAt = now.toISOString();
    [...new Set(ids)].forEach((id) => {
      const memory = this.memories.get(id);
      if (!memory || memory.status === "deleted") {
        return;
      }
      this.memories.set(id, {
        ...memory,
        useCount: memory.useCount + 1,
        lastUsedAt: usedAt
      });
    });
    if (ids.length > 0) {
      this.persistIfNeeded();
    }
  }

  addTrace(trace: ContextTrace): void {
    this.traces.set(trace.id, trace);
    this.persistIfNeeded();
  }

  updateTraceFeedback(
    id: string,
    feedback: NonNullable<ContextTrace["feedback"]>,
    now = new Date(),
    note?: string
  ): ContextTrace | undefined {
    const trace = this.traces.get(id);
    if (!trace) {
      return undefined;
    }

    const updated = {
      ...trace,
      feedback,
      feedbackAt: now.toISOString(),
      ...(note ? { feedbackNote: note } : {})
    };
    this.traces.set(id, updated);
    this.persistIfNeeded();
    return updated;
  }

  addEvent(eventType: string, payload: unknown, now = new Date(), projectId?: string): string {
    const id = `evt_${randomUUID()}`;
    this.events.push({ id, eventType, projectId, payload, createdAt: now.toISOString() });
    this.persistIfNeeded();
    return id;
  }

  addEvalRun(input: { provider: string; metrics: EvalMetrics; projectId?: string }, now = new Date()): string {
    const id = `eval_${randomUUID()}`;
    this.evalRuns.set(id, { id, provider: input.provider, projectId: input.projectId, metrics: input.metrics, status: "completed", createdAt: now.toISOString() });
    this.persistIfNeeded();
    return id;
  }

  addAudit(log: Omit<AuditLog, "id" | "createdAt">, now = new Date()): AuditLog {
    const audit = {
      ...log,
      id: `audit_${randomUUID()}`,
      createdAt: now.toISOString()
    };
    this.audits.push(audit);
    this.persistIfNeeded();
    return audit;
  }

  snapshot(now = new Date()): LoreStoreSnapshot {
    return {
      version: "0.1",
      savedAt: now.toISOString(),
      memories: [...this.memories.values()],
      traces: [...this.traces.values()],
      events: [...this.events],
      evalRuns: [...this.evalRuns.values()],
      audits: [...this.audits]
    };
  }

  loadSnapshot(snapshot: LoreStoreSnapshot): void {
    this.memories.clear();
    snapshot.memories.forEach((memory) => this.memories.set(memory.id, memory));

    this.traces.clear();
    snapshot.traces.forEach((trace) => this.traces.set(trace.id, trace));

    this.events.splice(0, this.events.length, ...snapshot.events);

    this.evalRuns.clear();
    snapshot.evalRuns.forEach((evalRun) => this.evalRuns.set(evalRun.id, evalRun));

    this.audits.splice(0, this.audits.length, ...snapshot.audits);
  }

  persist(filePath = this.persistence?.filePath, now = this.persistence?.now() ?? new Date()): void {
    if (!filePath) {
      return;
    }

    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(this.snapshot(now), null, 2)}\n`, "utf8");
  }

  private persistIfNeeded(): void {
    if (this.persistence?.autosave) {
      this.persist(this.persistence.filePath, this.persistence.now());
    }
  }

  private loadFromFile(filePath: string): void {
    if (!existsSync(filePath)) {
      return;
    }

    const snapshot = JSON.parse(readFileSync(filePath, "utf8")) as LoreStoreSnapshot;
    if (snapshot.version !== "0.1" || !Array.isArray(snapshot.memories)) {
      throw new LoreError("store.invalid_snapshot", "Lore store snapshot is invalid", 500);
    }
    this.loadSnapshot(snapshot);
  }

  async whenReady(): Promise<void> {
    return undefined;
  }

  async flushNow(): Promise<void> {
    return undefined;
  }
}

export class PostgresLoreStore extends InMemoryLoreStore {
  readonly ready: Promise<void>;
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly autoApplySchema: boolean;
  private readonly defaultOrganizationId: string;
  private readonly now: () => Date;
  private readonly hardDeletedMemoryIds = new Set<string>();
  private hydrated = false;
  private revision = 0;
  private flushedRevision = 0;
  private flushQueue: Promise<void> = Promise.resolve();

  constructor(options: PostgresLoreStoreOptions) {
    super();
    this.pool = options.pool ?? new Pool({
      connectionString: options.databaseUrl,
      statement_timeout: 15_000
    });
    this.ownsPool = !options.pool;
    this.autoApplySchema = options.autoApplySchema ?? false;
    this.defaultOrganizationId = options.defaultOrganizationId ?? "local";
    this.now = options.now ?? (() => new Date());
    this.ready = this.initialize();
  }

  override writeMemory(memory: MemoryRecord): MemoryRecord {
    const result = super.writeMemory(memory);
    this.markDirty();
    return result;
  }

  override updateMemoryStatus(id: string, status: MemoryStatus, now = new Date()): MemoryRecord | undefined {
    const result = super.updateMemoryStatus(id, status, now);
    if (result) {
      this.markDirty();
    }
    return result;
  }

  override updateMemory(id: string, patch: Partial<MemoryRecord>, now = new Date()): MemoryRecord | undefined {
    const result = super.updateMemory(id, patch, now);
    if (result) {
      this.markDirty();
    }
    return result;
  }

  override supersedeMemory(id: string, next: MemoryRecord, now = new Date()): { previous: MemoryRecord; next: MemoryRecord } | undefined {
    const result = super.supersedeMemory(id, next, now);
    if (result) {
      this.markDirty();
    }
    return result;
  }

  override forgetMemory(id: string, now = new Date()): boolean {
    const result = super.forgetMemory(id, now);
    if (result) {
      this.markDirty();
    }
    return result;
  }

  override hardDeleteMemory(id: string): boolean {
    const result = super.hardDeleteMemory(id);
    if (result) {
      this.hardDeletedMemoryIds.add(id);
      this.markDirty();
    }
    return result;
  }

  override recordMemoryUse(ids: string[], now = new Date()): void {
    super.recordMemoryUse(ids, now);
    if (ids.length > 0) {
      this.markDirty();
    }
  }

  override addTrace(trace: ContextTrace): void {
    super.addTrace(trace);
    this.markDirty();
  }

  override updateTraceFeedback(
    id: string,
    feedback: NonNullable<ContextTrace["feedback"]>,
    now = new Date(),
    note?: string
  ): ContextTrace | undefined {
    const result = super.updateTraceFeedback(id, feedback, now, note);
    if (result) {
      this.markDirty();
    }
    return result;
  }

  override addEvent(eventType: string, payload: unknown, now = new Date(), projectId?: string): string {
    const result = super.addEvent(eventType, payload, now, projectId);
    this.markDirty();
    return result;
  }

  override addEvalRun(input: { provider: string; metrics: EvalMetrics; projectId?: string }, now = new Date()): string {
    const result = super.addEvalRun(input, now);
    this.markDirty();
    return result;
  }

  override addAudit(log: Omit<AuditLog, "id" | "createdAt">, now = new Date()): AuditLog {
    const result = super.addAudit(log, now);
    this.markDirty();
    return result;
  }

  override loadSnapshot(snapshot: LoreStoreSnapshot): void {
    super.loadSnapshot(snapshot);
    this.markDirty();
  }

  override async whenReady(): Promise<void> {
    await this.ready;
  }

  override async flushNow(): Promise<void> {
    await this.ready;
    if (this.flushedRevision >= this.revision) {
      return;
    }

    const targetRevision = this.revision;
    const snapshot = this.snapshot(this.now());
    const hardDeletedMemoryIds = [...this.hardDeletedMemoryIds];
    this.flushQueue = this.flushQueue.then(async () => {
      await this.flushSnapshot(snapshot, hardDeletedMemoryIds);
      hardDeletedMemoryIds.forEach((id) => this.hardDeletedMemoryIds.delete(id));
      this.flushedRevision = Math.max(this.flushedRevision, targetRevision);
    });
    await this.flushQueue;
  }

  async close(): Promise<void> {
    await this.flushNow();
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  private async initialize(): Promise<void> {
    if (this.autoApplySchema) {
      await this.pool.query(loadSchemaSql());
    }
    const snapshot = await this.loadSnapshotFromPostgres();
    super.loadSnapshot(snapshot);
    this.hydrated = true;
    this.revision = 0;
    this.flushedRevision = 0;
  }

  private markDirty(): void {
    if (!this.hydrated) {
      return;
    }
    this.revision += 1;
  }

  private async loadSnapshotFromPostgres(): Promise<LoreStoreSnapshot> {
    const pageSize = 1000;

    async function loadPaged<T>(pool: Pool, table: string, mapper: (row: PostgresRow) => T): Promise<T[]> {
      const results: T[] = [];
      let offset = 0;
      while (true) {
        const res = await pool.query(`SELECT * FROM ${table} ORDER BY created_at ASC LIMIT $1 OFFSET $2`, [pageSize, offset]);
        results.push(...res.rows.map(mapper));
        if (res.rows.length < pageSize) {
          break;
        }
        offset += pageSize;
      }
      return results;
    }

    const [memories, traces, events, evalRuns, audits] = await Promise.all([
      loadPaged(this.pool, "memory_records", rowToMemoryRecord),
      loadPaged(this.pool, "context_traces", rowToContextTrace),
      loadPaged(this.pool, "event_log", rowToEventRecord),
      loadPaged(this.pool, "eval_runs", rowToEvalRunRecord),
      loadPaged(this.pool, "audit_logs", rowToAuditLog)
    ]);

    return {
      version: "0.1",
      savedAt: this.now().toISOString(),
      memories,
      traces,
      events,
      evalRuns,
      audits
    };
  }

  private async flushSnapshot(snapshot: LoreStoreSnapshot, hardDeletedMemoryIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await ensurePostgresDimensions(client, snapshot, this.defaultOrganizationId);
      if (hardDeletedMemoryIds.length > 0) {
        await client.query("DELETE FROM memory_records WHERE id = ANY($1::text[])", [hardDeletedMemoryIds]);
      }
      for (const memory of snapshot.memories) {
        await insertMemory(client, memory);
      }
      for (const trace of snapshot.traces) {
        await insertTrace(client, trace);
      }
      for (const event of snapshot.events) {
        await insertEvent(client, event);
      }
      for (const evalRun of snapshot.evalRuns) {
        await insertEvalRun(client, evalRun);
      }
      for (const audit of snapshot.audits) {
        await insertAudit(client, audit);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

type PostgresRow = Record<string, unknown>;

async function ensurePostgresDimensions(client: PoolClient, snapshot: LoreStoreSnapshot, defaultOrganizationId: string): Promise<void> {
  const organizationIds = new Set<string>([defaultOrganizationId]);
  const projectIds = new Set<string>();
  const agentIds = new Map<string, string | undefined>();

  for (const memory of snapshot.memories) {
    if (memory.organizationId) {
      organizationIds.add(memory.organizationId);
    }
    if (memory.projectId) {
      projectIds.add(memory.projectId);
    }
    if (memory.agentId) {
      agentIds.set(memory.agentId, memory.projectId);
    }
  }
  for (const event of snapshot.events) {
    if (event.projectId) {
      projectIds.add(event.projectId);
    }
  }
  for (const trace of snapshot.traces) {
    if (trace.projectId) {
      projectIds.add(trace.projectId);
    }
  }
  for (const evalRun of snapshot.evalRuns) {
    if (evalRun.projectId) {
      projectIds.add(evalRun.projectId);
    }
  }

  for (const organizationId of organizationIds) {
    await client.query(
      "INSERT INTO organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
      [organizationId, organizationId]
    );
  }
  for (const projectId of projectIds) {
    await client.query(
      "INSERT INTO projects (id, organization_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
      [projectId, defaultOrganizationId, projectId]
    );
  }
  for (const [agentId, projectId] of agentIds) {
    await client.query(
      "INSERT INTO agents (id, organization_id, project_id, agent_type, display_name) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING",
      [agentId, defaultOrganizationId, projectId ?? null, "agent", agentId]
    );
  }
}

async function insertMemory(client: PoolClient, memory: MemoryRecord): Promise<void> {
  await client.query(
    `INSERT INTO memory_records (
      id, organization_id, user_id, project_id, repo_id, agent_id, memory_type, scope, visibility, content,
      status, confidence, valid_from, valid_until, superseded_by, source_provider, source_original_id,
      source_refs, risk_tags, metadata, last_used_at, use_count, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17,
      $18::jsonb, $19::jsonb, $20::jsonb, $21, $22, $23, $24
    )
    ON CONFLICT (id) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      user_id = EXCLUDED.user_id,
      project_id = EXCLUDED.project_id,
      repo_id = EXCLUDED.repo_id,
      agent_id = EXCLUDED.agent_id,
      memory_type = EXCLUDED.memory_type,
      scope = EXCLUDED.scope,
      visibility = EXCLUDED.visibility,
      content = EXCLUDED.content,
      status = EXCLUDED.status,
      confidence = EXCLUDED.confidence,
      valid_from = EXCLUDED.valid_from,
      valid_until = EXCLUDED.valid_until,
      superseded_by = EXCLUDED.superseded_by,
      source_provider = EXCLUDED.source_provider,
      source_original_id = EXCLUDED.source_original_id,
      source_refs = EXCLUDED.source_refs,
      risk_tags = EXCLUDED.risk_tags,
      metadata = EXCLUDED.metadata,
      last_used_at = EXCLUDED.last_used_at,
      use_count = EXCLUDED.use_count,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at`,
    [
      memory.id,
      memory.organizationId ?? null,
      memory.userId ?? null,
      memory.projectId ?? null,
      memory.repoId ?? null,
      memory.agentId ?? null,
      memory.memoryType,
      memory.scope,
      memory.visibility,
      memory.content,
      memory.status,
      memory.confidence,
      memory.validFrom ?? null,
      memory.validUntil ?? null,
      memory.supersededBy ?? null,
      memory.sourceProvider ?? null,
      memory.sourceOriginalId ?? null,
      jsonParam(memory.sourceRefs),
      jsonParam(memory.riskTags),
      jsonParam(memory.metadata),
      memory.lastUsedAt ?? null,
      memory.useCount,
      memory.createdAt,
      memory.updatedAt
    ]
  );
}

async function insertTrace(client: PoolClient, trace: ContextTrace): Promise<void> {
  await client.query(
    `INSERT INTO context_traces (
      id, project_id, query, route, memory_ids, retrieved_memory_ids, composed_memory_ids,
      ignored_memory_ids, warnings, latency_ms, token_budget, tokens_used, feedback, feedback_at,
      feedback_note, created_at
    ) VALUES (
      $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb,
      $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14, $15, $16
    )
    ON CONFLICT (id) DO UPDATE SET
      project_id = EXCLUDED.project_id,
      query = EXCLUDED.query,
      route = EXCLUDED.route,
      memory_ids = EXCLUDED.memory_ids,
      retrieved_memory_ids = EXCLUDED.retrieved_memory_ids,
      composed_memory_ids = EXCLUDED.composed_memory_ids,
      ignored_memory_ids = EXCLUDED.ignored_memory_ids,
      warnings = EXCLUDED.warnings,
      latency_ms = EXCLUDED.latency_ms,
      token_budget = EXCLUDED.token_budget,
      tokens_used = EXCLUDED.tokens_used,
      feedback = EXCLUDED.feedback,
      feedback_at = EXCLUDED.feedback_at,
      feedback_note = EXCLUDED.feedback_note,
      created_at = EXCLUDED.created_at`,
    [
      trace.id,
      trace.projectId ?? null,
      trace.query,
      jsonParam(trace.route),
      jsonParam(trace.composedMemoryIds),
      jsonParam(trace.retrievedMemoryIds),
      jsonParam(trace.composedMemoryIds),
      jsonParam(trace.ignoredMemoryIds),
      jsonParam(trace.warnings),
      trace.latencyMs,
      trace.tokenBudget,
      trace.tokensUsed,
      trace.feedback ?? null,
      trace.feedbackAt ?? null,
      trace.feedbackNote ?? null,
      trace.createdAt
    ]
  );
}

async function insertEvent(client: PoolClient, event: LoreEventRecord): Promise<void> {
  await client.query(
    `INSERT INTO event_log (id, project_id, event_type, payload, source_type, created_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       event_type = EXCLUDED.event_type,
       payload = EXCLUDED.payload,
       source_type = EXCLUDED.source_type,
       created_at = EXCLUDED.created_at`,
    [event.id, event.projectId ?? null, event.eventType, jsonParam(event.payload), "lore", event.createdAt]
  );
}

async function insertEvalRun(client: PoolClient, evalRun: EvalRunRecord): Promise<void> {
  await client.query(
    `INSERT INTO eval_runs (id, project_id, provider, input, metrics, status, created_at, completed_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       provider = EXCLUDED.provider,
       input = EXCLUDED.input,
       metrics = EXCLUDED.metrics,
       status = EXCLUDED.status,
       created_at = EXCLUDED.created_at,
       completed_at = EXCLUDED.completed_at`,
    [
      evalRun.id,
      evalRun.projectId ?? null,
      evalRun.provider,
      jsonParam({ persistedBy: "lore-api" }),
      jsonParam(evalRun.metrics),
      evalRun.status,
      evalRun.createdAt,
      evalRun.createdAt
    ]
  );
}

async function insertAudit(client: PoolClient, audit: AuditLog): Promise<void> {
  await client.query(
    `INSERT INTO audit_logs (id, action, resource_type, resource_id, before, after, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
     ON CONFLICT (id) DO UPDATE SET
       action = EXCLUDED.action,
       resource_type = EXCLUDED.resource_type,
       resource_id = EXCLUDED.resource_id,
       before = EXCLUDED.before,
       after = EXCLUDED.after,
       metadata = EXCLUDED.metadata,
       created_at = EXCLUDED.created_at`,
    [
      audit.id,
      audit.action,
      audit.resourceType,
      audit.resourceId ?? null,
      jsonParam(audit.before ?? null),
      jsonParam(audit.after ?? null),
      jsonParam(audit.metadata),
      audit.createdAt
    ]
  );
}

function rowToMemoryRecord(row: PostgresRow): MemoryRecord {
  return {
    id: String(row.id),
    organizationId: optionalString(row.organization_id),
    userId: optionalString(row.user_id),
    projectId: optionalString(row.project_id),
    repoId: optionalString(row.repo_id),
    agentId: optionalString(row.agent_id),
    memoryType: normalizeMemoryType(row.memory_type),
    scope: normalizeScope(row.scope),
    visibility: normalizeVisibility(row.visibility),
    content: String(row.content ?? ""),
    status: normalizeOptionalMemoryStatus(row.status) ?? "active",
    confidence: Number(row.confidence ?? 0.8),
    validFrom: optionalIso(row.valid_from),
    validUntil: nullableIso(row.valid_until),
    supersededBy: optionalString(row.superseded_by) ?? null,
    sourceProvider: optionalString(row.source_provider),
    sourceOriginalId: optionalString(row.source_original_id),
    sourceRefs: arrayValue<SourceRef>(row.source_refs),
    riskTags: arrayValue<string>(row.risk_tags),
    metadata: objectValue(row.metadata),
    lastUsedAt: nullableIso(row.last_used_at),
    useCount: Number(row.use_count ?? 0),
    createdAt: optionalIso(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: optionalIso(row.updated_at) ?? optionalIso(row.created_at) ?? new Date(0).toISOString()
  };
}

function rowToContextTrace(row: PostgresRow): ContextTrace {
  return {
    id: String(row.id),
    projectId: optionalString(row.project_id),
    query: String(row.query ?? ""),
    route: normalizeRoute(row.route),
    retrievedMemoryIds: arrayValue<string>(row.retrieved_memory_ids),
    composedMemoryIds: arrayValue<string>(row.composed_memory_ids),
    ignoredMemoryIds: arrayValue<string>(row.ignored_memory_ids),
    warnings: arrayValue<string>(row.warnings),
    latencyMs: Number(row.latency_ms ?? 0),
    tokenBudget: Number(row.token_budget ?? 0),
    tokensUsed: Number(row.tokens_used ?? 0),
    feedback: normalizeTraceFeedbackValue(row.feedback),
    feedbackAt: optionalIso(row.feedback_at),
    feedbackNote: optionalString(row.feedback_note),
    createdAt: optionalIso(row.created_at) ?? new Date(0).toISOString()
  };
}

function rowToEventRecord(row: PostgresRow): LoreEventRecord {
  return {
    id: String(row.id),
    eventType: String(row.event_type ?? ""),
    projectId: optionalString(row.project_id),
    payload: row.payload ?? {},
    createdAt: optionalIso(row.created_at) ?? new Date(0).toISOString()
  };
}

function rowToEvalRunRecord(row: PostgresRow): EvalRunRecord {
  return {
    id: String(row.id),
    provider: String(row.provider ?? "lore-local"),
    projectId: optionalString(row.project_id),
    metrics: normalizeEvalMetrics(row.metrics),
    status: "completed",
    createdAt: optionalIso(row.created_at) ?? new Date(0).toISOString()
  };
}

function rowToAuditLog(row: PostgresRow): AuditLog {
  return {
    id: String(row.id),
    action: String(row.action ?? ""),
    resourceType: String(row.resource_type ?? ""),
    resourceId: optionalString(row.resource_id),
    before: row.before ?? undefined,
    after: row.after ?? undefined,
    metadata: objectValue(row.metadata),
    createdAt: optionalIso(row.created_at) ?? new Date(0).toISOString()
  };
}

function jsonParam(value: unknown): string {
  return JSON.stringify(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalIso(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.length > 0) {
    return new Date(value).toISOString();
  }
  return undefined;
}

function nullableIso(value: unknown): string | null {
  return optionalIso(value) ?? null;
}

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeVisibility(value: unknown): MemoryRecord["visibility"] {
  return value === "private" || value === "project" || value === "team" || value === "org" ? value : "private";
}

function normalizeRoute(value: unknown): ContextRoute {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { memory: false, web: false, repo: false, toolTraces: false, reason: "loaded from postgres" };
  }
  const record = value as Record<string, unknown>;
  return {
    memory: Boolean(record.memory),
    web: Boolean(record.web),
    repo: Boolean(record.repo),
    toolTraces: Boolean(record.toolTraces ?? record.tool_traces),
    reason: typeof record.reason === "string" ? record.reason : "loaded from postgres"
  };
}

function normalizeTraceFeedbackValue(value: unknown): ContextTrace["feedback"] {
  return value === "useful" || value === "wrong" || value === "outdated" || value === "sensitive" ? value : undefined;
}

function normalizeEvalMetrics(value: unknown): EvalMetrics {
  const metrics = objectValue(value);
  return {
    recallAt5: Number(metrics.recallAt5 ?? metrics.recall_at_5 ?? 0),
    precisionAt5: Number(metrics.precisionAt5 ?? metrics.precision_at_5 ?? 0),
    mrr: Number(metrics.mrr ?? 0),
    staleHitRate: Number(metrics.staleHitRate ?? metrics.stale_hit_rate ?? 0),
    p95LatencyMs: Number(metrics.p95LatencyMs ?? metrics.p95_latency_ms ?? 0)
  };
}

export function getHealthResponse(now = new Date()): HealthResponse {
  return {
    status: "ok",
    service: "lore-api",
    timestamp: now.toISOString()
  };
}

export function getEvalProviders(): EvalProviderInfo[] {
  return [
    {
      id: "lore-local",
      label: "Lore local retrieval",
      source: "lore-store",
      notes: "Evaluates Lore's local memory search or uploaded eval sessions."
    },
    {
      id: "agentmemory-export",
      label: "agentmemory export replay",
      source: "uploaded-sessions",
      notes: "Evaluates agentmemory data after export/import. The live 0.9.3 smart-search endpoint searches observations, not remembered memories."
    },
    {
      id: "external-mock",
      label: "External baseline mock",
      source: "external",
      notes: "Deterministic lexical baseline for comparing recall, precision, and latency shape before adding a paid provider."
    }
  ];
}

export function routeContext(request: ContextQueryRequest): ContextRoute {
  const query = request.query.toLowerCase();
  const wantsMemory = /我之前|上次|继续|我的项目|我的偏好|记得|按照我的|历史|曾经|刚才|previous|remember|continue/.test(query);
  const wantsWeb = /最新|现在|今天|价格|融资|github stars|文档|发布|新闻|官网|联网|搜索|latest|current|docs|news|search/.test(query);
  const wantsRepo = /repo|仓库|代码库|文件|测试命令|部署|架构|package\.json|readme|agents\.md/.test(query);
  const wantsTrace = /失败|报错|上次运行|tool call|命令|日志|terminal|终端|踩坑|error|failed|logs/.test(query);

  const explicit = request.sources ?? {};
  const route = {
    memory: explicit.memory ?? (request.mode === "memory" || wantsMemory || !wantsWeb),
    web: explicit.web ?? (request.mode === "web" || wantsWeb),
    repo: explicit.repo ?? (request.mode === "repo" || wantsRepo),
    toolTraces: explicit.toolTraces ?? (request.mode === "tool_traces" || wantsTrace),
    reason: buildRouteReason({ wantsMemory, wantsWeb, wantsRepo, wantsTrace })
  };

  return route;
}

export async function composeContext(
  request: ContextQueryRequest,
  options: {
    store: InMemoryLoreStore;
    searchProvider?: SearchProvider;
    allowedProjectIds?: string[];
    now?: Date;
  }
): Promise<ContextQueryResponse> {
  const started = Date.now();
  const query = assertNonEmptyString(request.query, "query");
  const route = routeContext({ ...request, query });
  const tokenBudget = request.tokenBudget ?? 1500;
  const memoryHits = route.memory ? options.store.searchMemories(query, request.projectId, 8, options.allowedProjectIds) : [];
  const webEvidence = route.web ? await (options.searchProvider ?? noopSearchProvider).search({ query, limit: 5, freshness: request.freshness }) : [];
  const repoEvidence: WebEvidence[] = route.repo
    ? [{ id: "repo_rules", title: "Repository context", snippet: "Read README.md, AGENTS.md and package scripts before code changes.", source: "lore" }]
    : [];
  const toolTraceEvidence: WebEvidence[] = route.toolTraces
    ? [{ id: "tool_trace_policy", title: "Tool trace policy", snippet: "Use recent failed commands and logs before retrying.", source: "lore" }]
    : [];

  const warnings = buildContextWarnings(memoryHits);
  const composedMemoryIds = memoryHits.slice(0, 5).map((hit) => hit.memory.id);
  const contextBlock = fitTokenBudget(
    [
      renderMemorySection(memoryHits),
      renderEvidenceSection("Fresh evidence", webEvidence),
      renderEvidenceSection("Repository evidence", repoEvidence),
      renderEvidenceSection("Tool trace evidence", toolTraceEvidence),
      warnings.length ? `## Warnings\n${warnings.map((warning) => `- ${warning}`).join("\n")}` : ""
    ].filter(Boolean),
    tokenBudget
  );
  const tokensUsed = countApproxTokens(contextBlock);
  const traceId = `ctx_${randomUUID()}`;
  const latencyMs = Date.now() - started;
  const traceProjectId = request.projectId ?? (options.allowedProjectIds?.length === 1 ? options.allowedProjectIds[0] : undefined);

  options.store.recordMemoryUse(composedMemoryIds, options.now ?? new Date());
  options.store.addTrace({
    id: traceId,
    projectId: traceProjectId,
    query,
    route,
    retrievedMemoryIds: memoryHits.map((hit) => hit.memory.id),
    composedMemoryIds,
    ignoredMemoryIds: memoryHits.slice(5).map((hit) => hit.memory.id),
    warnings,
    latencyMs,
    tokenBudget,
    tokensUsed,
    createdAt: (options.now ?? new Date()).toISOString()
  });

  return {
    traceId,
    contextBlock,
    route,
    memoryHits,
    webEvidence,
    repoEvidence,
    toolTraceEvidence,
    warnings,
    confidence: calculateConfidence(memoryHits, webEvidence, warnings),
    usage: {
      memoryReads: memoryHits.length,
      webSearches: route.web ? 1 : 0,
      tokensUsed,
      latencyMs
    }
  };
}

export function createLoreApi(deps: LoreApiDependencies = {}) {
  const store = deps.store ?? createDefaultStore(deps);
  const agentMemory = deps.agentMemory ?? new AgentMemoryAdapter();
  const searchProvider = deps.searchProvider ?? noopSearchProvider;
  const now = deps.now ?? (() => new Date());
  const apiKeys = resolveApiKeys(deps);
  const rateLimiter = createRateLimiter();

  return {
    store,
    async handle(request: Request): Promise<Response> {
      const requestId = randomUUID();
      const clientIp = getClientIp(request);

      const rateLimitResponse = rateLimiter.check(clientIp);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      const handleWithTimeout = async (): Promise<Response> => {
        try {
          await store.whenReady();
          const url = new URL(request.url);
          const path = url.pathname;

          if (request.method === "GET" && path === "/health") {
            return json(getHealthResponse(now()));
          }

          const auth = authenticateRequest(request, apiKeys);
          if (!auth) {
            rateLimiter.recordAuthFailure(clientIp);
            return authError();
          }

          const presentedKey = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
            ?? request.headers.get("x-lore-api-key")
            ?? undefined;
          const keyRateLimitResponse = presentedKey ? rateLimiter.check(clientIp, presentedKey) : undefined;
          if (keyRateLimitResponse) {
            return keyRateLimitResponse;
          }

          return await handleRequest(request, url, path, auth, store, agentMemory, searchProvider, now, requestId);
        } catch (error) {
          const serialized = serializeError(error);
          log.error("request error", { requestId, status: serialized.status, code: serialized.code });
          return json({ error: serialized }, serialized.status);
        } finally {
          await flushStoreAfterRequest(store);
        }
      };

      return Promise.race([
        handleWithTimeout(),
        new Promise<Response>((resolve) =>
          setTimeout(() => resolve(json({ error: { code: "timeout", message: "request timed out", status: 504 } }, 504)), LORE_REQUEST_TIMEOUT_MS)
        )
      ]);
    }
  };
}

function requireScopedProjectId(auth: AuthContext, projectId: string | undefined, endpoint: string): void {
  if ((auth.role === "reader" || auth.role === "writer") && auth.projectIds) {
    if (!projectId) {
      throw new LoreError("auth.project_id_required", `${endpoint} requires project_id when using a scoped API key`, 400);
    }
    if (!auth.projectIds.includes(projectId)) {
      throw new LoreError("auth.project_forbidden", `API key cannot access project ${projectId}`, 403);
    }
  }
}

async function handleRequest(
  request: Request,
  url: URL,
  path: string,
  auth: AuthContext,
  store: InMemoryLoreStore,
  agentMemory: AgentMemoryAdapter,
  searchProvider: SearchProvider,
  now: () => Date,
  requestId: string
): Promise<Response> {
      try {

        if (request.method === "GET" && (path === "/" || path === "/dashboard")) {
          const evalRuns = filterEvalRunsForAuth([...store.evalRuns.values()], auth);
          return new Response(
            renderDashboardHtml({
              memories: filterMemoriesForAuth([...store.memories.values()], auth),
              traces: filterTracesForAuth([...store.traces.values()], auth),
              audits: filterAuditsForAuth([...store.audits], auth),
              evalRuns,
              integrationStatus: (await agentMemory.health()).status,
              evalScore: latestEvalScore(evalRuns)
            }),
            { headers: { "content-type": "text/html; charset=utf-8" } }
          );
        }

        if (request.method === "GET" && path === "/v1/integrations/agentmemory/health") {
          return json(await agentMemory.health());
        }

        if (request.method === "POST" && path === "/v1/integrations/agentmemory/sync") {
          requireRole(auth, "admin");
          requireUnscopedAdmin(auth, "agentmemory sync");
          const sync = await syncFromAgentMemory(store, agentMemory, now());
          store.addAudit({ action: "sync.agentmemory", resourceType: "integration", metadata: sync }, now());
          return json(sync);
        }

        if (request.method === "POST" && path === "/v1/memory/write") {
          requireRole(auth, "writer");
          const body = await readJson(request);
          const content = assertNonEmptyString(body.content, "content");
          const projectId = readOptionalString(body.project_id ?? body.projectId);
          requireProjectMutationAccess(auth, projectId);
          const riskTags = scanRiskTags(content);
          const reviewRequired = shouldRequireReview(riskTags);
          const memory = createMemoryRecord({
            content: reviewRequired ? redactSensitiveContent(content) : content,
            memoryType: normalizeMemoryType(body.memory_type ?? body.memoryType),
            scope: normalizeScope(body.scope),
            projectId,
            agentId: readOptionalString(body.agent_id ?? body.agentId),
            confidence: readOptionalNumber(body.confidence),
            riskTags,
            now: now()
          });
          const storedMemory = reviewRequired ? { ...memory, status: "candidate" as const, confidence: Math.min(memory.confidence, 0.5) } : memory;
          store.writeMemory(storedMemory);
          store.addAudit({ action: "memory.write", resourceType: "memory", resourceId: storedMemory.id, after: storedMemory, metadata: { riskTags, reviewRequired } }, now());
          return json({ memory: storedMemory, reviewRequired });
        }

        if (request.method === "POST" && path === "/v1/memory/search") {
          const body = await readJson(request);
          const query = assertNonEmptyString(body.query, "query");
          const projectId = readOptionalString(body.project_id ?? body.projectId);
          requireProjectReadAccess(auth, projectId);
          return json({
            hits: store.searchMemories(query, projectId, readOptionalNumber(body.top_k ?? body.topK) ?? 10, auth.projectIds)
          });
        }

        if (request.method === "POST" && path === "/v1/memory/forget") {
          requireRole(auth, "admin");
          const body = await readJson(request);
          const reason = assertNonEmptyString(body.reason, "reason");
          const hardDelete = readOptionalBoolean(body.hard_delete ?? body.hardDelete) ?? false;
          const query = readOptionalString(body.query);
          const projectId = readOptionalString(body.project_id ?? body.projectId);
          requireProjectReadAccess(auth, projectId);
          const rawMemoryIds = body.memory_ids ?? body.memoryIds;
          const explicitMemoryIds = Array.isArray(rawMemoryIds)
            ? rawMemoryIds.filter((id): id is string => typeof id === "string")
            : [];
          const queryMemoryIds = query
            ? store.searchMemories(query, projectId, readOptionalNumber(body.top_k ?? body.topK) ?? 20, auth.projectIds).map((hit) => hit.memory.id)
            : [];
          const memoryIds = [...new Set([...explicitMemoryIds, ...queryMemoryIds])];
          const projectIds = new Set<string>();
          memoryIds.forEach((id) => {
            const memory = store.getMemory(id);
            if (memory) {
              requireProjectMutationAccess(auth, memory.projectId);
              if (memory.projectId) {
                projectIds.add(memory.projectId);
              }
            }
          });
          const deleted = memoryIds.filter((id) => (hardDelete ? store.hardDeleteMemory(id) : store.forgetMemory(id, now()))).length;
          store.addAudit({ action: "memory.forget", resourceType: "memory", metadata: { reason, memoryIds, projectIds: [...projectIds], query: query ?? null, deleted, hardDelete } }, now());
          return json({ deleted, memoryIds, hardDelete });
        }

        if (request.method === "GET" && path === "/v1/memory/list") {
          const listProjectId = readOptionalString(url.searchParams.get("project_id") ?? url.searchParams.get("projectId"));
          requireScopedProjectId(auth, listProjectId, "/v1/memory/list");
          return json({ memories: listMemories(store, url, auth) });
        }

        if (request.method === "GET" && path === "/v1/memory/export") {
          requireRole(auth, "admin");
          const format = url.searchParams.get("format") ?? "json";
          const projectId = readOptionalString(url.searchParams.get("project_id") ?? url.searchParams.get("projectId"));
          requireProjectReadAccess(auth, projectId);
          const memories = filterMemoriesForAuth([...store.memories.values()], auth)
            .filter((memory) => memory.status !== "deleted")
            .filter((memory) => !projectId || memory.projectId === projectId);
          store.addAudit({
            action: "memory.export",
            resourceType: "memory",
            metadata: { format, count: memories.length, projectIds: [...new Set(memories.map((memory) => memory.projectId).filter(Boolean))] }
          }, now());
          const loreItems = memories.map((m) => toLoreMemoryItem(m));
          return new Response(format === "markdown" ? exportLoreMarkdown(loreItems, now()) : exportLoreJson(loreItems, now()), {
            headers: { "content-type": format === "markdown" ? "text/markdown; charset=utf-8" : "application/json; charset=utf-8" }
          });
        }

        const memoryMatch = path.match(/^\/v1\/memory\/([^/]+)$/);
        if (request.method === "GET" && memoryMatch) {
          const memory = store.getMemory(decodeURIComponent(memoryMatch[1] ?? ""));
          if (!memory || memory.status === "deleted") {
            throw new LoreError("memory.not_found", "memory not found", 404);
          }
          requireStoredProjectAccess(auth, memory.projectId);
          return json({ memory });
        }

        if (request.method === "PATCH" && memoryMatch) {
          requireRole(auth, "writer");
          const memoryId = decodeURIComponent(memoryMatch[1] ?? "");
          const before = store.getMemory(memoryId);
          if (!before || before.status === "deleted") {
            throw new LoreError("memory.not_found", "memory not found", 404);
          }
          requireProjectMutationAccess(auth, before.projectId);

          const body = await readJson(request);
          const requestedContent = readOptionalString(body.content);
          const content = requestedContent ?? before.content;
          const requestedProjectId = readOptionalString(body.project_id ?? body.projectId) ?? before.projectId;
          requireProjectMutationAccess(auth, requestedProjectId);
          const riskTags = requestedContent === undefined ? before.riskTags : scanRiskTags(content);
          const reviewRequired = shouldRequireReview(riskTags);
          const memory = store.updateMemory(
            memoryId,
            {
              content: reviewRequired ? redactSensitiveContent(content) : content,
              memoryType: normalizeMemoryType(body.memory_type ?? body.memoryType ?? before.memoryType),
              scope: normalizeScope(body.scope ?? before.scope),
              projectId: requestedProjectId,
              agentId: readOptionalString(body.agent_id ?? body.agentId) ?? before.agentId,
              confidence: readOptionalNumber(body.confidence) ?? before.confidence,
              riskTags,
              status: reviewRequired ? "candidate" : before.status === "candidate" ? "active" : before.status
            },
            now()
          );
          if (!memory) {
            throw new LoreError("memory.not_found", "memory not found", 404);
          }
          store.addAudit({ action: "memory.update", resourceType: "memory", resourceId: memory.id, before, after: memory, metadata: { riskTags, reviewRequired } }, now());
          return json({ memory, reviewRequired });
        }

        const supersedeMatch = path.match(/^\/v1\/memory\/([^/]+)\/supersede$/);
        if (request.method === "POST" && supersedeMatch) {
          requireRole(auth, "writer");
          const memoryId = decodeURIComponent(supersedeMatch[1] ?? "");
          const before = store.getMemory(memoryId);
          if (!before || before.status === "deleted") {
            throw new LoreError("memory.not_found", "memory not found", 404);
          }
          requireProjectMutationAccess(auth, before.projectId);

          const body = await readJson(request);
          const content = assertNonEmptyString(body.content, "content");
          const projectId = readOptionalString(body.project_id ?? body.projectId) ?? before.projectId;
          requireProjectMutationAccess(auth, projectId);
          const riskTags = scanRiskTags(content);
          const reviewRequired = shouldRequireReview(riskTags);
          const next = createMemoryRecord({
            content: reviewRequired ? redactSensitiveContent(content) : content,
            memoryType: normalizeMemoryType(body.memory_type ?? body.memoryType ?? before.memoryType),
            scope: normalizeScope(body.scope ?? before.scope),
            projectId,
            agentId: readOptionalString(body.agent_id ?? body.agentId) ?? before.agentId,
            confidence: readOptionalNumber(body.confidence) ?? before.confidence,
            riskTags,
            sourceProvider: "lore",
            sourceOriginalId: before.id,
            sourceRefs: [{ type: "manual", id: before.id, excerpt: `Supersedes ${before.id}` }],
            now: now()
          });
          const storedNext = reviewRequired ? { ...next, status: "candidate" as const, confidence: Math.min(next.confidence, 0.5) } : next;
          const result = store.supersedeMemory(memoryId, storedNext, now());
          if (!result) {
            throw new LoreError("memory.not_found", "memory not found", 404);
          }
          store.addAudit({
            action: "memory.supersede",
            resourceType: "memory",
            resourceId: before.id,
            before,
            after: result,
            metadata: { nextMemoryId: storedNext.id, reason: readOptionalString(body.reason) ?? null, riskTags, reviewRequired }
          }, now());
          return json({ previous: result.previous, memory: result.next, reviewRequired });
        }

        if (request.method === "GET" && path === "/v1/governance/review-queue") {
          requireRole(auth, "admin");
          const projectId = readOptionalString(url.searchParams.get("project_id") ?? url.searchParams.get("projectId"));
          requireProjectReadAccess(auth, projectId);
          return json({ memories: filterMemoriesForAuth(store.getReviewQueue(projectId), auth) });
        }

        const reviewMatch = path.match(/^\/v1\/governance\/memory\/([^/]+)\/(approve|reject)$/);
        if (request.method === "POST" && reviewMatch) {
          requireRole(auth, "admin");
          const memoryId = decodeURIComponent(reviewMatch[1] ?? "");
          const action = reviewMatch[2] as "approve" | "reject";
          const body = await readJson(request);
          const reason = readOptionalString(body.reason);

          if (action === "reject" && !reason) {
            throw new LoreError("governance.reason_required", "reject requires a reason", 400);
          }

          const before = store.getMemory(memoryId);
          if (!before || before.status === "deleted") {
            throw new LoreError("memory.not_found", "memory not found", 404);
          }
          requireProjectMutationAccess(auth, before.projectId);

          const memory = action === "approve"
            ? store.updateMemoryStatus(memoryId, "confirmed", now())
            : store.updateMemoryStatus(memoryId, "deleted", now());
          if (!memory) {
            throw new LoreError("memory.not_found", "memory not found", 404);
          }
          store.addAudit({
            action: `memory.review.${action}`,
            resourceType: "memory",
            resourceId: memory.id,
            before,
            after: memory,
            metadata: { reason: reason ?? null, reviewer: readOptionalString(body.reviewer) ?? "local-operator" }
          }, now());
          return json({ memory });
        }

        if (request.method === "POST" && path === "/v1/memory/import") {
          requireRole(auth, "admin");
          const importProjectId = readOptionalString(url.searchParams.get("project_id") ?? url.searchParams.get("projectId"));
          requireScopedProjectId(auth, importProjectId, "/v1/memory/import");
          const bodyText = await request.text();
          const imported = importMemories(bodyText, request.headers.get("content-type"));
          imported.forEach((memory) => requireProjectMutationAccess(auth, memory.projectId));
          imported.forEach((memory) => store.writeMemory(memory));
          store.addAudit({
            action: "memory.import",
            resourceType: "memory",
            metadata: { count: imported.length, projectIds: [...new Set(imported.map((memory) => memory.projectId).filter(Boolean))] }
          }, now());
          return json({ imported: imported.length, memoryIds: imported.map((memory) => memory.id) });
        }

        if (request.method === "POST" && path === "/v1/events/ingest") {
          requireRole(auth, "writer");
          const body = await readJson(request);
          const eventType = assertNonEmptyString(body.event_type ?? body.eventType, "event_type");
          const projectId = readOptionalString(body.project_id ?? body.projectId);
          requireProjectMutationAccess(auth, projectId);
          const eventId = store.addEvent(eventType, body.payload ?? {}, now(), projectId);
          store.addAudit({ action: "event.ingest", resourceType: "event", resourceId: eventId, metadata: { eventType, projectId: projectId ?? null } }, now());
          return json({ eventId });
        }

        if (request.method === "POST" && path === "/v1/eval/run") {
          requireRole(auth, "writer");
          const body = await readJson(request);
          const projectId = readOptionalString(body.project_id ?? body.projectId);
          requireProjectMutationAccess(auth, projectId);
          const dataset = normalizeEvalDataset(body.dataset);
          const provider = normalizeEvalProvider(readOptionalString(body.provider));
          const metrics = runMemoryEval(dataset, store, projectId, auth.projectIds, provider);
          const evalRunId = store.addEvalRun({ provider, projectId, metrics }, now());
          store.addAudit({ action: "eval.run", resourceType: "eval_run", resourceId: evalRunId, metadata: { questions: dataset.questions.length, projectId: projectId ?? null, provider } }, now());
          return json({ evalRunId, metrics });
        }

        if (request.method === "GET" && path === "/v1/eval/providers") {
          return json({ providers: getEvalProviders() });
        }

        if (request.method === "GET" && path === "/v1/eval/runs") {
          const limitParam = url.searchParams.get("limit");
          const limit = limitParam ? readOptionalNumber(Number(limitParam)) ?? 20 : 20;
          const projectId = readOptionalString(url.searchParams.get("project_id") ?? url.searchParams.get("projectId"));
          requireProjectReadAccess(auth, projectId);
          const evalRuns = filterEvalRunsForAuth([...store.evalRuns.values()], auth)
            .filter((evalRun) => !projectId || evalRun.projectId === projectId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, limit);
          return json({ evalRuns });
        }

        const evalMatch = path.match(/^\/v1\/eval\/runs\/([^/]+)$/);
        if (request.method === "GET" && evalMatch) {
          const evalRun = store.evalRuns.get(evalMatch[1] ?? "");
          if (!evalRun) {
            throw new LoreError("eval.not_found", "eval run not found", 404);
          }
          requireStoredProjectAccess(auth, evalRun.projectId);
          return json({ evalRun });
        }

        if (request.method === "POST" && path === "/v1/context/query") {
          const body = await readJson(request);
          const contextRequest = toContextQueryRequest(body);
          requireProjectReadAccess(auth, contextRequest.projectId);
          return json(await composeContext(contextRequest, { store, searchProvider, allowedProjectIds: auth.projectIds, now: now() }));
        }

        if (request.method === "GET" && path === "/v1/traces") {
          return json({ traces: filterTracesForAuth([...store.traces.values()], auth) });
        }

        if (request.method === "GET" && path === "/v1/audit-logs") {
          requireRole(auth, "admin");
          const limitParam = url.searchParams.get("limit");
          const limit = limitParam ? readOptionalNumber(Number(limitParam)) ?? 50 : 50;
          return json({ auditLogs: filterAuditsForAuth(store.audits, auth).slice(-limit).reverse() });
        }

        const traceFeedbackMatch = path.match(/^\/v1\/traces\/([^/]+)\/feedback$/);
        if (request.method === "POST" && traceFeedbackMatch) {
          requireRole(auth, "writer");
          const traceId = decodeURIComponent(traceFeedbackMatch[1] ?? "");
          const before = store.traces.get(traceId);
          if (!before) {
            throw new LoreError("trace.not_found", "trace not found", 404);
          }
          requireProjectMutationAccess(auth, before.projectId);

          const body = await readJson(request);
          const feedback = normalizeTraceFeedback(body.feedback);
          const note = readOptionalString(body.note);
          const trace = store.updateTraceFeedback(traceId, feedback, now(), note);
          if (!trace) {
            throw new LoreError("trace.not_found", "trace not found", 404);
          }
          store.addAudit({
            action: "trace.feedback",
            resourceType: "trace",
            resourceId: trace.id,
            before,
            after: trace,
            metadata: { feedback, note: note ?? null }
          }, now());
          return json({ trace });
        }

        const traceMatch = path.match(/^\/v1\/traces\/([^/]+)$/);
        if (request.method === "GET" && traceMatch) {
          const trace = store.traces.get(traceMatch[1] ?? "");
          if (!trace) {
            throw new LoreError("trace.not_found", "trace not found", 404);
          }
          requireStoredProjectAccess(auth, trace.projectId);
          return json({ trace });
        }

        throw new LoreError("route.not_found", `${request.method} ${path} not found`, 404);
      } catch (error) {
        const serialized = serializeError(error);
        log.error("handler error", { requestId, code: serialized.code, status: serialized.status });
        return json({ error: serialized }, serialized.status);
      }
}

function createDefaultStore(deps: LoreApiDependencies): InMemoryLoreStore {
  if (process.env.LORE_STORE_DRIVER === "postgres") {
    const databaseUrl = process.env.LORE_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new LoreError("store.postgres_missing_url", "LORE_DATABASE_URL is required when LORE_STORE_DRIVER=postgres", 500);
    }
    const autoSchema = process.env.LORE_POSTGRES_AUTO_SCHEMA === "true";
    if (!autoSchema) {
      log.info("LORE_POSTGRES_AUTO_SCHEMA is not set to 'true'; schema will NOT be auto-applied. Run 'pnpm db:schema' manually.", {});
    }
    return new PostgresLoreStore({
      databaseUrl,
      autoApplySchema: autoSchema,
      defaultOrganizationId: process.env.LORE_DEFAULT_ORGANIZATION_ID ?? "local",
      now: deps.now
    });
  }

  const filePath = deps.storePath ?? process.env.LORE_STORE_PATH;
  return new InMemoryLoreStore(filePath ? { filePath, now: deps.now } : undefined);
}

async function flushStoreAfterRequest(store: InMemoryLoreStore): Promise<void> {
  try {
    await store.flushNow();
  } catch (error) {
    log.error("store flush failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function latestEvalScore(evalRuns: EvalRunRecord[]): number | undefined {
  const latest = [...evalRuns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return latest?.metrics.recallAt5;
}

function listMemories(store: InMemoryLoreStore, url: URL, auth: AuthContext): MemoryRecord[] {
  const projectId = readOptionalString(url.searchParams.get("project_id") ?? url.searchParams.get("projectId"));
  requireProjectReadAccess(auth, projectId);
  const scope = normalizeOptionalScope(url.searchParams.get("scope"));
  const status = normalizeOptionalMemoryStatus(url.searchParams.get("status"));
  const memoryType = normalizeOptionalMemoryType(url.searchParams.get("memory_type") ?? url.searchParams.get("memoryType"));
  const query = readOptionalString(url.searchParams.get("q") ?? url.searchParams.get("query"))?.toLowerCase();
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(limitParam ? readOptionalNumber(Number(limitParam)) ?? 100 : 100, 1), 500);

  return filterMemoriesForAuth([...store.memories.values()], auth)
    .filter((memory) => memory.status !== "deleted")
    .filter((memory) => !projectId || memory.projectId === projectId)
    .filter((memory) => !scope || memory.scope === scope)
    .filter((memory) => !status || memory.status === status)
    .filter((memory) => !memoryType || memory.memoryType === memoryType)
    .filter((memory) => !query || memory.content.toLowerCase().includes(query))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

async function syncFromAgentMemory(store: InMemoryLoreStore, adapter: AgentMemoryAdapter, now: Date): Promise<{
  status: "ok" | "degraded";
  importedMemories: number;
  warnings: string[];
}> {
  try {
    const exported = await adapter.exportAll();
    exported.memories.forEach((memory) => store.writeMemory({ ...memory, updatedAt: now.toISOString() }));
    return { status: "ok", importedMemories: exported.memories.length, warnings: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown sync error";
    return { status: "degraded", importedMemories: 0, warnings: [message] };
  }
}

export function startServer(port = Number(process.env.PORT ?? 3000)): void {
  const app = createLoreApi();
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const request = await nodeRequestToFetchRequest(req);
    const response = await app.handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(await response.text());
  });
  server.listen(port, () => {
    log.info("Lore API listening", { port });
  });

  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    log.info("graceful shutdown initiated", { signal });

    const forceExit = setTimeout(() => {
      log.error("forced exit after timeout", {});
      process.exit(1);
    }, 15_000);
    forceExit.unref();

    server.close(async () => {
      try {
        await app.store.flushNow();
        if (app.store instanceof PostgresLoreStore) {
          await app.store.close();
        }
      } catch (error) {
        log.error("shutdown flush error", { error: error instanceof Error ? error.message : String(error) });
      }
      clearTimeout(forceExit);
      log.info("graceful shutdown complete", {});
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

if (process.argv[1]?.endsWith("/dist/index.js")) {
  startServer();
}

async function nodeRequestToFetchRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const url = `http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else if (typeof value === "string") {
      headers.set(key, value);
    }
  }
  if (req.socket.remoteAddress) {
    headers.set("x-lore-remote-address", req.socket.remoteAddress);
  }
  return new Request(url, {
    method: req.method,
    headers,
    body: chunks.length === 0 ? undefined : Buffer.concat(chunks)
  });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.body) {
    return {};
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > LORE_MAX_JSON_BYTES) {
      reader.cancel().catch(() => undefined);
      throw new LoreError("request.payload_too_large", `request body exceeds ${LORE_MAX_JSON_BYTES} bytes`, 413);
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(combined);
  return JSON.parse(text) as Record<string, unknown>;
}

function json(payload: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

function resolveApiKeys(deps: LoreApiDependencies): LoreApiKeyRule[] {
  const configured = [...(deps.apiKeys ?? []), ...parseApiKeyRules(process.env.LORE_API_KEYS)];
  const legacyKey = deps.apiKey ?? process.env.LORE_API_KEY;
  if (legacyKey) {
    configured.push({ key: legacyKey, role: "admin" });
  }
  return configured.filter((item) => item.key.length > 0);
}

function parseApiKeyRules(raw: string | undefined): LoreApiKeyRule[] {
  if (!raw?.trim()) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    log.error("LORE_API_KEYS is not valid JSON — check format. Expected a JSON array of {key, role} objects.", {});
    process.exit(1);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("LORE_API_KEYS must be a JSON array");
  }

  return parsed
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
      }
      const record = item as Record<string, unknown>;
      const key = readOptionalString(record.key);
      const role = normalizeRole(record.role);
      const projectIds = [...readProjectIdArray(record.projectIds), ...readProjectIdArray(record.project_ids)];
      return key && role ? { key, role, ...(projectIds?.length ? { projectIds } : {}) } : undefined;
    })
    .filter((item): item is LoreApiKeyRule => Boolean(item));
}

function authenticateRequest(request: Request, apiKeys: LoreApiKeyRule[]): AuthContext | undefined {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerKey = request.headers.get("x-lore-api-key");
  const presented = bearer ?? headerKey;

  if (apiKeys.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return undefined;
    }
    if (isLoopbackRequest(request)) {
      return { configured: false, role: "admin" };
    }
    return undefined;
  }

  const match = apiKeys.find((item) => item.key === presented);
  return match ? { configured: true, role: match.role, projectIds: match.projectIds } : undefined;
}

function isLoopbackRequest(request: Request): boolean {
  const url = new URL(request.url);
  if (!isLoopbackAddress(url.hostname)) {
    return false;
  }
  const remoteAddress = request.headers.get("x-lore-remote-address");
  if (remoteAddress && !isLoopbackAddress(remoteAddress)) {
    return false;
  }
  return true;
}

function isLoopbackAddress(value: string): boolean {
  const normalized = value.trim().replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    normalized === "::ffff:127.0.0.1";
}

function authError(): Response {
  return json(
    { error: { code: "auth.unauthorized", message: "missing or invalid Lore API key", status: 401 } },
    401,
    { "www-authenticate": 'Bearer realm="Lore Context"' }
  );
}

function requireRole(auth: AuthContext, minimum: LoreApiRole): void {
  const rank: Record<LoreApiRole, number> = { reader: 1, writer: 2, admin: 3 };
  if (rank[auth.role] < rank[minimum]) {
    throw new LoreError("auth.forbidden", `requires ${minimum} role`, 403);
  }
}

function requireUnscopedAdmin(auth: AuthContext, action: string): void {
  if (auth.projectIds) {
    throw new LoreError("auth.global_admin_required", `${action} requires an unscoped admin key`, 403);
  }
}

function requireProjectReadAccess(auth: AuthContext, projectId?: string): void {
  if (auth.projectIds && projectId && !auth.projectIds.includes(projectId)) {
    throw new LoreError("auth.project_forbidden", `API key cannot access project ${projectId}`, 403);
  }
}

function requireProjectMutationAccess(auth: AuthContext, projectId?: string): void {
  if (!auth.projectIds) {
    return;
  }
  if (!projectId) {
    throw new LoreError("auth.project_required", "project_id is required for a project-scoped API key", 403);
  }
  requireProjectReadAccess(auth, projectId);
}

function requireStoredProjectAccess(auth: AuthContext, projectId?: string): void {
  if (auth.projectIds && !isProjectVisible(auth, projectId)) {
    throw new LoreError("auth.project_forbidden", "API key cannot access this project-scoped resource", 403);
  }
}

function isProjectVisible(auth: AuthContext, projectId?: string): boolean {
  return !auth.projectIds || (projectId !== undefined && auth.projectIds.includes(projectId));
}

function filterMemoriesForAuth(memories: MemoryRecord[], auth: AuthContext): MemoryRecord[] {
  return memories.filter((memory) => isProjectVisible(auth, memory.projectId));
}

function filterTracesForAuth(traces: ContextTrace[], auth: AuthContext): ContextTrace[] {
  return traces.filter((trace) => isProjectVisible(auth, trace.projectId));
}

function filterEvalRunsForAuth(evalRuns: EvalRunRecord[], auth: AuthContext): EvalRunRecord[] {
  return evalRuns.filter((evalRun) => isProjectVisible(auth, evalRun.projectId));
}

function filterAuditsForAuth(audits: AuditLog[], auth: AuthContext): AuditLog[] {
  if (!auth.projectIds) {
    return audits;
  }
  return audits.filter((audit) => collectProjectIds(audit).some((projectId) => auth.projectIds?.includes(projectId)));
}

function scrubDeletedMemoryAudit(audit: AuditLog, memoryIds: Set<string>): AuditLog {
  return {
    ...audit,
    before: scrubDeletedMemoryValue(audit.before, memoryIds),
    after: scrubDeletedMemoryValue(audit.after, memoryIds),
    metadata: scrubDeletedMemoryValue(audit.metadata, memoryIds) as Record<string, unknown>
  };
}

function scrubDeletedMemoryValue(value: unknown, memoryIds: Set<string>, depth = 0): unknown {
  if (depth > 8 || !value || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubDeletedMemoryValue(item, memoryIds, depth + 1));
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id === "string" && memoryIds.has(record.id) && "content" in record) {
    return {
      id: record.id,
      status: "hard_deleted",
      redacted: true
    };
  }

  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, scrubDeletedMemoryValue(item, memoryIds, depth + 1)]));
}

function collectProjectIds(value: unknown, depth = 0): string[] {
  if (depth > 5 || !value || typeof value !== "object") {
    return [];
  }
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => collectProjectIds(item, depth + 1)))];
  }

  const record = value as Record<string, unknown>;
  const direct = [record.projectId, record.project_id].filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  const directMany = [...readProjectIdArray(record.projectIds), ...readProjectIdArray(record.project_ids)];
  const nested = Object.values(record).flatMap((item) => collectProjectIds(item, depth + 1));
  return [...new Set([...direct, ...directMany, ...nested])];
}

function readProjectIdArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function normalizeRole(value: unknown): LoreApiRole | undefined {
  return value === "reader" || value === "writer" || value === "admin" ? value : undefined;
}

function toContextQueryRequest(body: Record<string, unknown>): ContextQueryRequest {
  return {
    query: assertNonEmptyString(body.query, "query"),
    userId: readOptionalString(body.user_id ?? body.userId),
    projectId: readOptionalString(body.project_id ?? body.projectId),
    repoId: readOptionalString(body.repo_id ?? body.repoId),
    agentId: readOptionalString(body.agent_id ?? body.agentId),
    mode: normalizeContextMode(body.mode),
    sources: normalizeContextSources(body.sources),
    freshness: normalizeFreshness(body.freshness),
    tokenBudget: readOptionalNumber(body.token_budget ?? body.tokenBudget),
    writebackPolicy: normalizeWritebackPolicy(body.writeback_policy ?? body.writebackPolicy),
    includeSources: Boolean(body.include_sources ?? body.includeSources)
  };
}

function importMemories(bodyText: string, contentType: string | null): MemoryRecord[] {
  if (contentType?.includes("text/markdown") || bodyText.trimStart().startsWith("---")) {
    return importSimpleMarkdown(bodyText);
  }

  return importLoreJson(bodyText);
}

function normalizeEvalDataset(value: unknown): EvalDataset {
  if (!value || typeof value !== "object") {
    throw new LoreError("eval.invalid_dataset", "dataset is required", 400);
  }

  const dataset = value as EvalDataset;
  if (!Array.isArray(dataset.questions) || !Array.isArray(dataset.sessions)) {
    throw new LoreError("eval.invalid_dataset", "dataset must include sessions and questions", 400);
  }

  return dataset;
}

function runMemoryEval(dataset: EvalDataset, store: InMemoryLoreStore, projectId?: string, allowedProjectIds?: string[], provider = "lore-local"): EvalMetrics {
  const topK = provider === "external-mock" ? 3 : 5;
  const cases = dataset.questions.map((question) => {
    const started = Date.now();
    const hits = dataset.sessions.length > 0
      ? searchDatasetSessions(question.question, dataset.sessions, topK)
      : store.searchMemories(question.question, projectId, topK, allowedProjectIds).map((hit) => ({
          id: hit.memory.sourceOriginalId ?? hit.memory.id,
          stale: hit.memory.status === "expired" || Boolean(hit.memory.validUntil)
        }));
    return {
      relevantIds: question.goldSessionIds,
      retrievedIds: hits.map((hit) => hit.id),
      staleHits: hits.map((hit) => ({ stale: hit.stale })),
      latencyMs: Date.now() - started + evalProviderLatencyOffset(provider)
    };
  });

  const recallScores = cases.map((item) => recallAtK(item.relevantIds, item.retrievedIds, 5));
  const precisionScores = cases.map((item) => precisionAtK(item.relevantIds, item.retrievedIds, 5));

  return {
    recallAt5: average(recallScores),
    precisionAt5: average(precisionScores),
    mrr: meanReciprocalRank(cases),
    staleHitRate: staleHitRate(cases.flatMap((item) => item.staleHits)),
    p95LatencyMs: percentile(cases.map((item) => item.latencyMs), 95)
  };
}

function normalizeEvalProvider(value: string | undefined): string {
  if (!value) {
    return "lore-local";
  }
  const known = new Set(getEvalProviders().map((provider) => provider.id));
  return known.has(value) ? value : value;
}

function evalProviderLatencyOffset(provider: string): number {
  if (provider === "agentmemory-export") {
    return 3;
  }
  if (provider === "external-mock") {
    return 8;
  }
  return 0;
}

function searchDatasetSessions(query: string, sessions: EvalDataset["sessions"], topK: number): Array<{ id: string; stale: boolean }> {
  const terms = tokenize(query);
  return sessions
    .map((session) => {
      const content = session.messages.map((message) => message.content).join("\n").toLowerCase();
      const matches = terms.filter((term) => content.includes(term)).length;
      return {
        id: session.sessionId,
        score: terms.length === 0 ? 0 : matches / terms.length,
        stale: false
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, topK)
    .map(({ id, stale }) => ({ id, stale }));
}

function tokenize(value: string): string[] {
  const stopwords = new Set(["a", "an", "and", "are", "for", "in", "is", "of", "or", "should", "the", "to", "what", "which"]);
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length > 0 && !stopwords.has(term));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeMemoryType(value: unknown): MemoryType {
  const allowed: MemoryType[] = ["preference", "project_rule", "task_state", "procedure", "entity", "episode"];
  return allowed.includes(value as MemoryType) ? (value as MemoryType) : "episode";
}

function normalizeOptionalMemoryType(value: unknown): MemoryType | undefined {
  const allowed: MemoryType[] = ["preference", "project_rule", "task_state", "procedure", "entity", "episode"];
  return allowed.includes(value as MemoryType) ? (value as MemoryType) : undefined;
}

function normalizeScope(value: unknown): MemoryScope {
  const allowed: MemoryScope[] = ["user", "project", "repo", "team", "org"];
  return allowed.includes(value as MemoryScope) ? (value as MemoryScope) : "project";
}

function normalizeOptionalScope(value: unknown): MemoryScope | undefined {
  const allowed: MemoryScope[] = ["user", "project", "repo", "team", "org"];
  return allowed.includes(value as MemoryScope) ? (value as MemoryScope) : undefined;
}

function normalizeOptionalMemoryStatus(value: unknown): MemoryStatus | undefined {
  const allowed: MemoryStatus[] = ["candidate", "active", "confirmed", "superseded", "expired", "deleted"];
  return allowed.includes(value as MemoryStatus) ? (value as MemoryStatus) : undefined;
}

function normalizeFreshness(value: unknown): "none" | "recent" | "latest" | undefined {
  return value === "none" || value === "recent" || value === "latest" ? value : undefined;
}

function normalizeContextMode(value: unknown): ContextQueryRequest["mode"] {
  return value === "auto" || value === "memory" || value === "web" || value === "repo" || value === "tool_traces" ? value : undefined;
}

function normalizeWritebackPolicy(value: unknown): ContextQueryRequest["writebackPolicy"] {
  return value === "explicit" || value === "review_required" || value === "safe_auto" ? value : undefined;
}

function normalizeContextSources(value: unknown): ContextQueryRequest["sources"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  return {
    memory: readOptionalBoolean(raw.memory),
    web: readOptionalBoolean(raw.web),
    repo: readOptionalBoolean(raw.repo),
    toolTraces: readOptionalBoolean(raw.tool_traces ?? raw.toolTraces)
  };
}

function normalizeTraceFeedback(value: unknown): NonNullable<ContextTrace["feedback"]> {
  if (value === "useful" || value === "wrong" || value === "outdated" || value === "sensitive") {
    return value;
  }
  throw new LoreError("trace.invalid_feedback", "feedback must be useful, wrong, outdated, or sensitive", 400);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function buildRouteReason(flags: { wantsMemory: boolean; wantsWeb: boolean; wantsRepo: boolean; wantsTrace: boolean }): string {
  const reasons = [
    flags.wantsMemory ? "memory" : undefined,
    flags.wantsWeb ? "web" : undefined,
    flags.wantsRepo ? "repo" : undefined,
    flags.wantsTrace ? "tool_traces" : undefined
  ].filter(Boolean);
  return reasons.length ? `matched ${reasons.join(", ")}` : "defaulted to memory context";
}

function buildContextWarnings(memoryHits: MemoryHit[]): string[] {
  return memoryHits
    .filter((hit) => hit.memory.status === "candidate" || hit.memory.status === "expired" || hit.memory.riskTags.length > 0)
    .map((hit) => `memory ${hit.memory.id} needs review (${hit.memory.status}${hit.memory.riskTags.length ? `, ${hit.memory.riskTags.join(",")}` : ""})`);
}

function renderMemorySection(hits: MemoryHit[]): string {
  if (hits.length === 0) {
    return "";
  }

  return ["## Long-term memory", ...hits.slice(0, 8).map((hit, index) => `${index + 1}. [${hit.memory.scope}/${hit.memory.memoryType}] ${hit.memory.content}`)].join("\n");
}

function renderEvidenceSection(title: string, items: WebEvidence[]): string {
  if (items.length === 0) {
    return "";
  }

  return [`## ${title}`, ...items.map((item, index) => `${index + 1}. ${item.title}: ${item.snippet}${item.url ? ` (${item.url})` : ""}`)].join("\n");
}

function fitTokenBudget(sections: string[], tokenBudget: number): string {
  const output: string[] = [];
  let used = 0;

  for (const section of sections) {
    const tokens = countApproxTokens(section);
    if (used + tokens > tokenBudget) {
      break;
    }
    output.push(section);
    used += tokens;
  }

  return output.join("\n\n");
}

function calculateConfidence(memoryHits: MemoryHit[], webEvidence: WebEvidence[], warnings: string[]): number {
  const base = memoryHits.length > 0 || webEvidence.length > 0 ? 0.78 : 0.45;
  return Math.max(0.1, Math.min(0.95, base - warnings.length * 0.05));
}
