import type {
  ModelProvider,
  ModelTask,
  TitleResult,
  SummaryResult,
  RedactionHint,
  DuplicateHint,
  StaleConflictHint,
  QueryRewriteResult,
  RerankResult,
} from "../types.js";
import { redactInputForModel, redactInputsForModel, type RedactionPattern } from "../redaction.js";

export interface CloudProviderConfig {
  endpoint: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  /** Override the global fetch — used by tests. */
  fetchImpl?: typeof fetch;
  /** Override the redaction patterns applied before HTTP send. */
  redactionPatterns?: RedactionPattern[];
  /**
   * Cost rate per 1k tokens (input + output combined). Defaults to 0.0001 unit
   * so operator dashboards see a non-zero number; configure per deployment.
   */
  costPerKTokens?: number;
}

interface CloudCallContext {
  task: ModelTask;
  /** redaction match count contributed by the input; written into provenance */
  inputRedactionMatchCount: number;
}

interface CloudCallResult<T> {
  value: T;
  inputTokens?: number;
  outputTokens?: number;
  costUnits?: number;
  model?: string;
  inputRedactionMatchCount: number;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
}

/**
 * Env-configurable cloud provider implementing the OpenAI-compatible Chat
 * Completions surface (`POST {endpoint}` with messages + JSON response). It is
 * designed so an operator can flip a deployment from no-model fallback to a
 * real provider purely through environment variables, and so accidental
 * raw-secret content is redacted before the HTTP call leaves this process.
 *
 * Tasks intentionally limited to low-risk uses: title, summary, redaction
 * hints, duplicate/stale-conflict hints, query rewrite, lightweight rerank.
 */
export class CloudProvider implements ModelProvider {
  readonly kind = "cloud" as const;
  readonly available: boolean;
  readonly model: string;

  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly redactionPatterns: RedactionPattern[] | undefined;
  private readonly costPerKTokens: number;
  private lastCallMeta: CloudCallMeta | undefined;

  constructor(config: CloudProviderConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey ?? "";
    this.model = config.model ?? "gpt-4o-mini";
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
    this.redactionPatterns = config.redactionPatterns;
    this.costPerKTokens = config.costPerKTokens ?? 0.0001;
    this.available = Boolean(this.endpoint && this.apiKey);
  }

  /** Fallback returned when the provider is not configured. Never throws. */
  private fallback<T>(value: T): T {
    this.lastCallMeta = undefined;
    return value;
  }

  /**
   * Returns and clears the metadata recorded by the most recent successful
   * provider call (token counts, cost, model id, redaction match count). The
   * gateway reads this once per call to populate ModelProvenance. Tests can
   * read it directly to assert HTTP behaviour.
   */
  consumeLastMeta(): CloudCallMeta | undefined {
    const meta = this.lastCallMeta;
    this.lastCallMeta = undefined;
    return meta;
  }

  async generateTitle(text: string): Promise<TitleResult> {
    if (!this.available) return this.fallback({ title: "", confidence: 0 });
    const { redacted, matchCount } = redactInputForModel(text, this.redactionPatterns);
    const ctx: CloudCallContext = { task: "title", inputRedactionMatchCount: matchCount };
    const result = await this.chat<TitleResult>(
      ctx,
      "You generate short, neutral memory titles. Output strict JSON: {\"title\": string (<=8 words), \"confidence\": number 0..1}.",
      `Memory content (already redacted):\n${redacted}\n\nReturn only JSON.`,
      (raw) => coerceTitle(raw),
    );
    return result.value;
  }

  async generateSummary(text: string, maxChars = 200): Promise<SummaryResult> {
    if (!this.available) return this.fallback({ summary: "", confidence: 0 });
    const { redacted, matchCount } = redactInputForModel(text, this.redactionPatterns);
    const ctx: CloudCallContext = { task: "summary", inputRedactionMatchCount: matchCount };
    const result = await this.chat<SummaryResult>(
      ctx,
      `You produce concise summaries. Output strict JSON: {"summary": string (<=${maxChars} chars), "confidence": number 0..1}. Do not invent facts.`,
      `Content to summarize (already redacted):\n${redacted}\n\nReturn only JSON.`,
      (raw) => coerceSummary(raw, maxChars),
    );
    return result.value;
  }

  async detectRedactionHints(text: string): Promise<RedactionHint[]> {
    if (!this.available) return this.fallback<RedactionHint[]>([]);
    // Note: we still pre-redact known secrets so the provider sees [REDACTED].
    // The model's job here is to spot residual PII / risky patterns the static
    // redactor missed. matchCount carries the static-redactor result into
    // provenance so callers can audit pre-model hygiene.
    const { redacted, matchCount } = redactInputForModel(text, this.redactionPatterns);
    const ctx: CloudCallContext = { task: "redaction_hints", inputRedactionMatchCount: matchCount };
    const result = await this.chat<RedactionHint[]>(
      ctx,
      "You detect residual PII, secrets, or risky content patterns. Output strict JSON array: [{\"pattern\": string, \"reason\": string, \"severity\": \"low\"|\"medium\"|\"high\", \"matchCount\": number}].",
      `Content (already pre-redacted; flag residual issues only):\n${redacted}\n\nReturn only JSON array.`,
      (raw) => coerceRedactionHints(raw),
    );
    return result.value;
  }

  async detectDuplicates(candidate: string, existing: string[]): Promise<DuplicateHint[]> {
    if (!this.available) return this.fallback<DuplicateHint[]>([]);
    const cand = redactInputForModel(candidate, this.redactionPatterns);
    const others = redactInputsForModel(existing, this.redactionPatterns);
    const ctx: CloudCallContext = {
      task: "duplicates",
      inputRedactionMatchCount: cand.matchCount + others.matchCount,
    };
    const result = await this.chat<DuplicateHint[]>(
      ctx,
      "You assess candidate-vs-existing memory duplication. Output strict JSON array: [{\"candidateId\": \"existing-<index>\", \"similarity\": 0..1, \"reason\": string, \"suggestedAction\": \"merge\"|\"supersede\"|\"keep_both\"}].",
      buildDuplicatePrompt(cand.redacted, others.redacted),
      (raw) => coerceDuplicates(raw),
    );
    return result.value;
  }

  async detectStaleConflict(candidate: string, context: string[]): Promise<StaleConflictHint[]> {
    if (!this.available) return this.fallback<StaleConflictHint[]>([]);
    const cand = redactInputForModel(candidate, this.redactionPatterns);
    const ctx = redactInputsForModel(context, this.redactionPatterns);
    const callCtx: CloudCallContext = {
      task: "stale_conflict",
      inputRedactionMatchCount: cand.matchCount + ctx.matchCount,
    };
    const result = await this.chat<StaleConflictHint[]>(
      callCtx,
      "You detect stale or conflicting memory. Output strict JSON array: [{\"kind\": \"stale\"|\"conflict\", \"reason\": string, \"confidence\": 0..1, \"relatedId\": string?}].",
      buildStaleConflictPrompt(cand.redacted, ctx.redacted),
      (raw) => coerceStaleConflict(raw),
    );
    return result.value;
  }

  async rewriteQuery(query: string): Promise<QueryRewriteResult> {
    if (!this.available) return this.fallback({ rewritten: query, expansions: [], confidence: 0 });
    const { redacted, matchCount } = redactInputForModel(query, this.redactionPatterns);
    const callCtx: CloudCallContext = { task: "rewrite_query", inputRedactionMatchCount: matchCount };
    const result = await this.chat<QueryRewriteResult>(
      callCtx,
      "You expand recall queries with synonyms and paraphrases. Output strict JSON: {\"rewritten\": string, \"expansions\": string[], \"confidence\": 0..1}. Do not invent unrelated terms.",
      `Original query:\n${redacted}\n\nReturn only JSON.`,
      (raw) => coerceRewrite(raw, redacted),
    );
    return result.value;
  }

  async rerank(
    query: string,
    candidates: Array<{ id: string; text: string }>,
  ): Promise<RerankResult[]> {
    if (!this.available) {
      return this.fallback(
        candidates.map((c, i) => ({ id: c.id, score: 1 - i * 0.01, reason: "passthrough" })),
      );
    }
    if (candidates.length === 0) return [];
    const { redacted, matchCount } = redactInputForModel(query, this.redactionPatterns);
    const candidateRedaction = redactInputsForModel(
      candidates.map((c) => c.text),
      this.redactionPatterns,
    );
    const redactedCandidates = candidates.map((c, i) => ({ id: c.id, text: candidateRedaction.redacted[i] }));
    const callCtx: CloudCallContext = {
      task: "rerank",
      inputRedactionMatchCount: matchCount + candidateRedaction.matchCount,
    };
    const result = await this.chat<RerankResult[]>(
      callCtx,
      "You rerank candidates by relevance to a query. Output strict JSON array (sorted by score descending): [{\"id\": string, \"score\": 0..1, \"reason\": string}].",
      buildRerankPrompt(redacted, redactedCandidates),
      (raw) => coerceRerank(raw, candidates.map((c) => c.id)),
    );
    return result.value;
  }

  /**
   * Internal HTTP call. JSON parse failures and HTTP errors throw; the gateway
   * wraps any throw into the GenerationResult fallback path.
   */
  private async chat<T>(
    ctx: CloudCallContext,
    systemPrompt: string,
    userPrompt: string,
    coerce: (raw: unknown) => T,
  ): Promise<CloudCallResult<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const body = {
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      };
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
          "x-lore-task": ctx.task,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await safeReadText(response);
        throw new Error(`cloud_provider_http_${response.status}: ${truncate(text, 200)}`);
      }
      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content ?? "";
      const parsed = parseJsonRelaxed(content);
      if (parsed === undefined) {
        throw new Error("cloud_provider_invalid_json");
      }
      const value = coerce(parsed);
      const inputTokens = data.usage?.prompt_tokens;
      const outputTokens = data.usage?.completion_tokens;
      const totalTokens =
        data.usage?.total_tokens ?? (inputTokens ?? 0) + (outputTokens ?? 0);
      const costUnits = totalTokens > 0 ? (totalTokens / 1000) * this.costPerKTokens : undefined;
      this.lastCallMeta = {
        task: ctx.task,
        inputTokens,
        outputTokens,
        costUnits,
        model: data.model ?? this.model,
        inputRedactionMatchCount: ctx.inputRedactionMatchCount,
      };
      return {
        value,
        inputTokens,
        outputTokens,
        costUnits,
        model: data.model ?? this.model,
        inputRedactionMatchCount: ctx.inputRedactionMatchCount,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export interface CloudCallMeta {
  task: ModelTask;
  inputTokens?: number;
  outputTokens?: number;
  costUnits?: number;
  model?: string;
  inputRedactionMatchCount?: number;
}

// ---- coercion helpers (defensive against model JSON drift) ----

function coerceTitle(raw: unknown): TitleResult {
  if (raw && typeof raw === "object" && "title" in raw) {
    const r = raw as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim().slice(0, 200) : "";
    const confidence = typeof r.confidence === "number" ? clamp01(r.confidence) : 0.5;
    return { title, confidence };
  }
  return { title: "", confidence: 0 };
}

function coerceSummary(raw: unknown, maxChars: number): SummaryResult {
  if (raw && typeof raw === "object" && "summary" in raw) {
    const r = raw as Record<string, unknown>;
    const summary = typeof r.summary === "string" ? r.summary.slice(0, maxChars) : "";
    const confidence = typeof r.confidence === "number" ? clamp01(r.confidence) : 0.5;
    return { summary, confidence };
  }
  return { summary: "", confidence: 0 };
}

function coerceRedactionHints(raw: unknown): RedactionHint[] {
  const arr = pickArray(raw, "hints");
  return arr
    .map((entry): RedactionHint | null => {
      if (!entry || typeof entry !== "object") return null;
      const r = entry as Record<string, unknown>;
      const pattern = typeof r.pattern === "string" ? r.pattern : "";
      const reason = typeof r.reason === "string" ? r.reason : "";
      const severityRaw = typeof r.severity === "string" ? r.severity.toLowerCase() : "low";
      const severity: RedactionHint["severity"] = severityRaw === "high"
        ? "high"
        : severityRaw === "medium"
          ? "medium"
          : "low";
      const matchCount = typeof r.matchCount === "number" ? Math.max(0, Math.floor(r.matchCount)) : 1;
      return { pattern, reason, severity, matchCount };
    })
    .filter((x): x is RedactionHint => x !== null && x.pattern.length > 0);
}

function coerceDuplicates(raw: unknown): DuplicateHint[] {
  const arr = pickArray(raw, "duplicates");
  return arr
    .map((entry): DuplicateHint | null => {
      if (!entry || typeof entry !== "object") return null;
      const r = entry as Record<string, unknown>;
      const candidateId = typeof r.candidateId === "string" ? r.candidateId : "";
      if (!candidateId) return null;
      const similarity = typeof r.similarity === "number" ? clamp01(r.similarity) : 0;
      const reason = typeof r.reason === "string" ? r.reason : "";
      const actionRaw = typeof r.suggestedAction === "string" ? r.suggestedAction : "keep_both";
      const suggestedAction: DuplicateHint["suggestedAction"] =
        actionRaw === "merge" || actionRaw === "supersede" ? actionRaw : "keep_both";
      return { candidateId, similarity, reason, suggestedAction };
    })
    .filter((x): x is DuplicateHint => x !== null);
}

function coerceStaleConflict(raw: unknown): StaleConflictHint[] {
  const arr = pickArray(raw, "conflicts");
  return arr
    .map((entry): StaleConflictHint | null => {
      if (!entry || typeof entry !== "object") return null;
      const r = entry as Record<string, unknown>;
      const kindRaw = typeof r.kind === "string" ? r.kind : "stale";
      const kind: StaleConflictHint["kind"] = kindRaw === "conflict" ? "conflict" : "stale";
      const reason = typeof r.reason === "string" ? r.reason : "";
      const confidence = typeof r.confidence === "number" ? clamp01(r.confidence) : 0.5;
      const relatedId = typeof r.relatedId === "string" ? r.relatedId : undefined;
      return { kind, reason, confidence, relatedId };
    })
    .filter((x): x is StaleConflictHint => x !== null);
}

function coerceRewrite(raw: unknown, fallback: string): QueryRewriteResult {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const rewritten = typeof r.rewritten === "string" && r.rewritten.length > 0 ? r.rewritten : fallback;
    const expansions = Array.isArray(r.expansions)
      ? r.expansions.filter((e): e is string => typeof e === "string").slice(0, 12)
      : [];
    const confidence = typeof r.confidence === "number" ? clamp01(r.confidence) : 0.5;
    return { rewritten, expansions, confidence };
  }
  return { rewritten: fallback, expansions: [], confidence: 0 };
}

function coerceRerank(raw: unknown, knownIds: string[]): RerankResult[] {
  const arr = pickArray(raw, "ranking");
  const known = new Set(knownIds);
  const seen = new Set<string>();
  const result: RerankResult[] = [];
  for (const entry of arr) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    if (!known.has(id) || seen.has(id)) continue;
    const score = typeof r.score === "number" ? clamp01(r.score) : 0;
    const reason = typeof r.reason === "string" ? r.reason : "";
    seen.add(id);
    result.push({ id, score, reason });
  }
  // Backfill any missing ids at the tail with passthrough scores so callers
  // never receive an incomplete ranking.
  for (let i = 0; i < knownIds.length; i++) {
    const id = knownIds[i];
    if (!seen.has(id)) {
      result.push({ id, score: 0.01, reason: "passthrough_fill" });
    }
  }
  return result.sort((a, b) => b.score - a.score);
}

function pickArray(raw: unknown, key: string): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && key in (raw as Record<string, unknown>)) {
    const v = (raw as Record<string, unknown>)[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function parseJsonRelaxed(text: string): unknown {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to extract the first balanced JSON object/array.
    const objMatch = trimmed.match(/\{[\s\S]*\}/);
    const arrMatch = trimmed.match(/\[[\s\S]*\]/);
    const candidate = objMatch?.[0] ?? arrMatch?.[0];
    if (!candidate) return undefined;
    try {
      return JSON.parse(candidate);
    } catch {
      return undefined;
    }
  }
}

function buildDuplicatePrompt(candidate: string, existing: string[]): string {
  const existingBlock = existing
    .map((text, i) => `${i}: ${text}`)
    .join("\n");
  return `Candidate memory:\n${candidate}\n\nExisting memories (index: text):\n${existingBlock || "(none)"}\n\nReturn only JSON array.`;
}

function buildStaleConflictPrompt(candidate: string, context: string[]): string {
  const ctxBlock = context.map((c, i) => `${i}: ${c}`).join("\n");
  return `Candidate memory:\n${candidate}\n\nRecent context (index: text):\n${ctxBlock || "(none)"}\n\nFlag stale or conflicting items. Return only JSON array.`;
}

function buildRerankPrompt(query: string, candidates: Array<{ id: string; text: string }>): string {
  const block = candidates.map((c) => `${c.id}: ${c.text}`).join("\n");
  return `Query:\n${query}\n\nCandidates (id: text):\n${block}\n\nReturn only JSON array sorted by score descending. Include every id exactly once.`;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
