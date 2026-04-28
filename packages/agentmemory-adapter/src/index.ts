import {
  createMemoryRecord,
  LoreError,
  type MemoryHit,
  type MemoryRecord,
  type MemoryScope,
  type MemoryType
} from "@lore/shared";

export const DEFAULT_AGENTMEMORY_URL = "http://127.0.0.1:3111";
export const DEFAULT_AGENTMEMORY_TIMEOUT_MS = 5000;
export const SUPPORTED_AGENTMEMORY_RANGE = ">=0.9.0 <0.11.0";

export interface VersionProbeResult {
  compatible: boolean;
  upstreamVersion: string;
  required: string;
  warnings: string[];
}

export interface AgentMemoryAdapterConfig {
  baseUrl?: string;
  secret?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

export interface AgentMemoryHealth {
  status: "ok" | "degraded";
  baseUrl: string;
  version?: string;
  error?: string;
}

export interface SmartSearchInput {
  query: string;
  projectId?: string;
  topK?: number;
}

export interface LocalContextInput {
  query: string;
  projectId?: string;
  sessionId?: string;
  project?: string;
  tokenBudget?: number;
}

export interface LocalContextResult {
  context: string;
  hits: MemoryHit[];
  warnings: string[];
}

export interface RememberInput {
  content: string;
  memoryType?: MemoryType;
  scope?: MemoryScope;
  projectId?: string;
  agentId?: string;
  sourceRefs?: Array<{ type: "manual" | "tool_call" | "conversation" | "import"; id?: string; excerpt?: string }>;
}

export interface RememberResult {
  memory: MemoryRecord;
  backendId?: string;
}

export interface ForgetInput {
  memoryIds?: string[];
  query?: string;
  reason: string;
}

export interface ForgetResult {
  deleted: number;
  backendIds: string[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  warnings: string[];
}

export interface AgentMemoryExport {
  raw: unknown;
  memories: MemoryRecord[];
}

export interface AuditEntry {
  id?: string;
  action: string;
  createdAt?: string;
  raw: unknown;
}

export interface AuditQuery {
  limit?: number;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function normalizeAgentMemoryUrl(baseUrl = DEFAULT_AGENTMEMORY_URL): string {
  return new URL(baseUrl).toString().replace(/\/$/, "");
}

export class AgentMemoryAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly secret?: string;
  private readonly fetchImpl: FetchLike;
  private readonly silentMode: boolean;

  constructor(private readonly config: AgentMemoryAdapterConfig = {}) {
    this.baseUrl = normalizeAgentMemoryUrl(config.baseUrl ?? process.env.AGENTMEMORY_URL);
    this.timeoutMs = config.timeoutMs ?? readEnvNumber(process.env.AGENTMEMORY_TIMEOUT_MS) ?? DEFAULT_AGENTMEMORY_TIMEOUT_MS;
    this.secret = config.secret ?? process.env.AGENTMEMORY_SECRET;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.silentMode = process.env.LORE_AGENTMEMORY_REQUIRED === "0";
  }

  async validateUpstreamVersion(): Promise<VersionProbeResult> {
    const result: VersionProbeResult = {
      compatible: false,
      upstreamVersion: "unknown",
      required: SUPPORTED_AGENTMEMORY_RANGE,
      warnings: []
    };

    try {
      const health = await this.health();
      if (health.status === "degraded" || !health.version) {
        result.warnings.push(`upstream agentmemory unreachable or missing version: ${health.error ?? "no version in health response"}`);
        return result;
      }

      result.upstreamVersion = health.version;
      const compatible = semverInRange(health.version, SUPPORTED_AGENTMEMORY_RANGE);
      result.compatible = compatible;

      if (!compatible) {
        result.warnings.push(
          `agentmemory version ${health.version} is outside supported range ${SUPPORTED_AGENTMEMORY_RANGE}`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "version probe failed";
      result.warnings.push(message);
    }

    return result;
  }

  async health(): Promise<AgentMemoryHealth> {
    try {
      const payload = await this.request("GET", "/agentmemory/health");
      const version = readString(payload, ["version"]) ?? readString(payload, ["data", "version"]);
      return { status: "ok", baseUrl: this.baseUrl, version };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown health error";
      return { status: "degraded", baseUrl: this.baseUrl, error: message };
    }
  }

  async smartSearch(input: SmartSearchInput): Promise<MemoryHit[]> {
    if (this.silentMode) {
      return [];
    }

    if (input.query.trim().length === 0) {
      throw new LoreError("memory.invalid_query", "query is required", 400);
    }

    const payload = await this.request("POST", "/agentmemory/smart-search", {
      query: input.query,
      project_id: input.projectId,
      top_k: input.topK ?? 10,
      limit: input.topK ?? 10
    });

    return extractArray(payload, ["results", "hits", "memories"]).map((item, index) =>
      this.mapHit(item, index, input.projectId)
    );
  }

  async getContext(input: LocalContextInput): Promise<LocalContextResult> {
    if (this.silentMode) {
      return { context: "", hits: [], warnings: ["agentmemory disabled via LORE_AGENTMEMORY_REQUIRED=0"] };
    }

    const payload = await this.request("POST", "/agentmemory/context", {
      query: input.query,
      project_id: input.projectId,
      sessionId: input.sessionId,
      project: input.project ?? input.projectId,
      token_budget: input.tokenBudget
    });

    return {
      context: readString(payload, ["context", "context_block", "text"]) ?? "",
      hits: extractArray(payload, ["hits", "memories", "results"]).map((item, index) =>
        this.mapHit(item, index, input.projectId)
      ),
      warnings: extractStringArray(payload, ["warnings"])
    };
  }

  async remember(input: RememberInput): Promise<RememberResult> {
    if (this.silentMode) {
      const memory = createMemoryRecord({
        content: input.content,
        memoryType: input.memoryType,
        scope: input.scope,
        projectId: input.projectId,
        agentId: input.agentId,
        sourceProvider: "agentmemory",
        sourceRefs: input.sourceRefs
      });
      return { memory };
    }

    const payload = await this.request("POST", "/agentmemory/remember", {
      content: input.content,
      memory_type: input.memoryType,
      scope: input.scope,
      project_id: input.projectId,
      agent_id: input.agentId,
      source_refs: input.sourceRefs
    });

    const backendId = readString(payload, ["id", "memory_id", "data.id", "memory.id"]);
    const memory = createMemoryRecord({
      id: backendId ? `am_${backendId}` : undefined,
      content: input.content,
      memoryType: input.memoryType,
      scope: input.scope,
      projectId: input.projectId,
      agentId: input.agentId,
      sourceProvider: "agentmemory",
      sourceOriginalId: backendId,
      sourceRefs: input.sourceRefs
    });

    return { memory, backendId };
  }

  async forget(input: ForgetInput): Promise<ForgetResult> {
    if (!input.reason.trim()) {
      throw new LoreError("memory.reason_required", "forget requires a reason", 400);
    }

    if (this.silentMode) {
      return { deleted: 0, backendIds: [] };
    }

    if (input.memoryIds?.length) {
      const deletedIds: string[] = [];
      for (const memoryId of input.memoryIds) {
        const payload = await this.request("POST", "/agentmemory/forget", {
          memoryId,
          memory_id: memoryId,
          reason: input.reason
        });
        const deleted = readNumber(payload, ["deleted", "deleted_count", "count"]) ?? 0;
        if (deleted > 0 || readBoolean(payload, ["success"])) {
          deletedIds.push(memoryId);
        }
      }
      return {
        deleted: deletedIds.length,
        backendIds: deletedIds
      };
    }

    const payload = await this.request("POST", "/agentmemory/forget", {
      query: input.query,
      reason: input.reason
    });

    return {
      deleted: readNumber(payload, ["deleted", "deleted_count", "count"]) ?? input.memoryIds?.length ?? 0,
      backendIds: extractStringArray(payload, ["backend_ids", "memory_ids", "deleted_ids"])
    };
  }

  async exportAll(): Promise<AgentMemoryExport> {
    if (this.silentMode) {
      return { raw: {}, memories: [] };
    }

    const raw = await this.request("GET", "/agentmemory/export");
    const memories = extractArray(raw, ["memories", "records", "data"]).map((item, index) =>
      this.mapMemory(item, `import_${index}`)
    );
    return { raw, memories };
  }

  async importAll(input: unknown): Promise<ImportResult> {
    if (this.silentMode) {
      return { imported: 0, skipped: 0, warnings: ["agentmemory disabled via LORE_AGENTMEMORY_REQUIRED=0"] };
    }

    const payload = await this.request("POST", "/agentmemory/import", input);
    return {
      imported: readNumber(payload, ["imported", "created", "count"]) ?? 0,
      skipped: readNumber(payload, ["skipped"]) ?? 0,
      warnings: extractStringArray(payload, ["warnings"])
    };
  }

  async getAudit(input: AuditQuery = {}): Promise<AuditEntry[]> {
    if (this.silentMode) {
      return [];
    }

    const payload = await this.request("GET", `/agentmemory/audit${input.limit ? `?limit=${input.limit}` : ""}`);
    return extractArray(payload, ["entries", "audit", "data"]).map((item) => ({
      id: readString(item, ["id"]),
      action: readString(item, ["action"]) ?? "unknown",
      createdAt: readString(item, ["created_at", "createdAt"]),
      raw: item
    }));
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = { accept: "application/json" };
      if (body !== undefined) {
        headers["content-type"] = "application/json";
      }
      if (this.secret) {
        headers.authorization = `Bearer ${this.secret}`;
      }

      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });

      const text = await response.text();
      const payload = text.length > 0 ? JSON.parse(text) : {};

      if (!response.ok) {
        const message = readString(payload, ["error", "message"]) ?? response.statusText;
        throw new LoreError("agentmemory.request_failed", message, response.status);
      }

      return payload;
    } catch (error) {
      if (error instanceof LoreError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "agentmemory request failed";
      throw new LoreError("agentmemory.unavailable", message, 503);
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapHit(item: unknown, index: number, projectId?: string): MemoryHit {
    const memory = this.mapMemory(item, `hit_${index}`, projectId);
    return {
      memory,
      score: readNumber(item, ["score", "similarity", "rank"]) ?? Math.max(0, 1 - index * 0.05),
      highlights: extractStringArray(item, ["highlights", "snippets"]),
      backend: "agentmemory"
    };
  }

  private mapMemory(item: unknown, fallbackId: string, projectId?: string): MemoryRecord {
    const content = readString(item, ["content", "text", "memory", "summary"]) ?? JSON.stringify(item);
    const backendId = readString(item, ["id", "memory_id", "backend_id"]) ?? fallbackId;

    return createMemoryRecord({
      id: `am_${backendId}`,
      content,
      memoryType: normalizeMemoryType(readString(item, ["memory_type", "type"])),
      scope: normalizeScope(readString(item, ["scope"])),
      projectId: readString(item, ["project_id", "projectId"]) ?? projectId,
      sourceProvider: "agentmemory",
      sourceOriginalId: backendId,
      confidence: readNumber(item, ["confidence"]) ?? 0.8
    });
  }
}

function readEnvNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeMemoryType(value?: string): MemoryType {
  const allowed: MemoryType[] = ["preference", "project_rule", "task_state", "procedure", "entity", "episode"];
  return allowed.includes(value as MemoryType) ? (value as MemoryType) : "episode";
}

function normalizeScope(value?: string): MemoryScope {
  const allowed: MemoryScope[] = ["user", "project", "repo", "team", "org"];
  return allowed.includes(value as MemoryScope) ? (value as MemoryScope) : "project";
}

function readString(value: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const found = getPath(value, path);
    if (typeof found === "string" && found.length > 0) {
      return found;
    }
  }

  return undefined;
}

function readNumber(value: unknown, paths: string[]): number | undefined {
  for (const path of paths) {
    const found = getPath(value, path);
    if (typeof found === "number" && Number.isFinite(found)) {
      return found;
    }
  }

  return undefined;
}

function readBoolean(value: unknown, paths: string[]): boolean | undefined {
  for (const path of paths) {
    const found = getPath(value, path);
    if (typeof found === "boolean") {
      return found;
    }
  }

  return undefined;
}

function extractArray(value: unknown, paths: string[]): unknown[] {
  for (const path of paths) {
    const found = getPath(value, path);
    if (Array.isArray(found)) {
      return found;
    }
  }

  return Array.isArray(value) ? value : [];
}

function extractStringArray(value: unknown, paths: string[]): string[] {
  const items = extractArray(value, paths);
  return items.filter((item): item is string => typeof item === "string");
}

function getPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, value);
}

function parseSemver(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) {
    return null;
  }
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function semverCompare(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return (a[i] ?? 0) - (b[i] ?? 0);
    }
  }
  return 0;
}

function semverInRange(version: string, range: string): boolean {
  const parsed = parseSemver(version);
  if (!parsed) {
    return false;
  }

  // parse each constraint token: ">=0.9.0 <0.11.0"
  const tokens = range.trim().split(/\s+/);
  for (const token of tokens) {
    const match = /^(>=|<=|>|<|=)(\d+\.\d+\.\d+.*)$/.exec(token);
    if (!match) {
      continue;
    }
    const [, op, ver] = match;
    const bound = parseSemver(ver);
    if (!bound) {
      return false;
    }
    const cmp = semverCompare(parsed, bound);
    if (op === ">=" && cmp < 0) return false;
    if (op === "<=" && cmp > 0) return false;
    if (op === ">" && cmp <= 0) return false;
    if (op === "<" && cmp >= 0) return false;
    if (op === "=" && cmp !== 0) return false;
  }
  return true;
}
