// Lore Context v1.3 — Lane B LocalCrossEncoderReranker (plan §3 Lane B item 3).
//
// HTTP client to a co-located cross-encoder reranker service. The reranker
// is a post-fusion replacer (not a stream contributor) per plan §3 Lane B
// item 4. Default model: BAAI/bge-reranker-v2-m3 (multilingual, ~600 ms p95
// on top-50 inputs). Default top-N = 50.
//
// Graceful degrade contract:
//   * env LORE_RERANKER_ENABLED falsy → no-op (returns input candidates).
//   * url missing → no-op.
//   * fetch fails / non-2xx → no-op (caller proceeds with fused order).
//
// fetchImpl is injectable so tests don't need a live service.

import type { RerankerCandidate, RerankerProvider } from "../memory-search-v12.js";

export interface LocalCrossEncoderRerankerConfig {
  /** Reranker service base URL. Default: env LORE_RERANKER_URL. */
  url?: string;
  /** Model identifier. Default: env LORE_RERANKER_MODEL or bge-reranker-v2-m3. */
  model?: string;
  /** Top-N input cap. Default: env LORE_RERANKER_TOP_N or 50. */
  topN?: number;
  /** Master gate. Default: env LORE_RERANKER_ENABLED. */
  enabled?: boolean;
  /** Optional bearer token. Default: env LORE_RERANKER_API_KEY. */
  apiKey?: string;
  /** Injectable fetch — used by tests to avoid a live HTTP service. */
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  /** Per-request timeout in milliseconds. Default 5000 ms. */
  timeoutMs?: number;
  /** Optional env override (mostly for tests). */
  env?: NodeJS.ProcessEnv;
}

export const DEFAULT_RERANKER_MODEL = "BAAI/bge-reranker-v2-m3";
export const DEFAULT_RERANKER_TOP_N = 50;
export const DEFAULT_RERANKER_TIMEOUT_MS = 5000;

const TRUTHY = new Set(["1", "true", "yes", "on", "enabled"]);

function parseEnabled(value: string | undefined, defaultValue: boolean): boolean {
  if (typeof value !== "string") return defaultValue;
  return TRUTHY.has(value.trim().toLowerCase());
}

interface RerankerWireResponse {
  results?: Array<{
    item_id?: string;
    itemId?: string;
    chunk_id?: string;
    chunkId?: string;
    score?: number;
    reason?: string;
  }>;
}

export class LocalCrossEncoderReranker implements RerankerProvider {
  readonly name = "local-cross-encoder" as const;

  private readonly url: string | undefined;
  private readonly model: string;
  private readonly topN: number;
  private readonly enabled: boolean;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: (input: string, init?: RequestInit) => Promise<Response>;
  private readonly timeoutMs: number;

  constructor(config: LocalCrossEncoderRerankerConfig = {}) {
    const env = config.env ?? process.env;
    this.url = config.url ?? env.LORE_RERANKER_URL;
    this.model = config.model ?? env.LORE_RERANKER_MODEL ?? DEFAULT_RERANKER_MODEL;
    const envTopN = env.LORE_RERANKER_TOP_N ? Number(env.LORE_RERANKER_TOP_N) : NaN;
    this.topN =
      config.topN ?? (Number.isFinite(envTopN) && envTopN > 0 ? envTopN : DEFAULT_RERANKER_TOP_N);
    this.enabled =
      config.enabled ?? parseEnabled(env.LORE_RERANKER_ENABLED, false);
    this.apiKey = config.apiKey ?? env.LORE_RERANKER_API_KEY;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_RERANKER_TIMEOUT_MS;
  }

  async rerank(input: {
    query: string;
    candidates: RerankerCandidate[];
    limit: number;
  }): Promise<Array<{ itemId: string; chunkId?: string; score: number; reason?: string }>> {
    // Graceful degrade: any reason to skip → return input candidates unchanged.
    if (!this.enabled || !this.url) {
      return this.passthrough(input.candidates, input.limit);
    }

    const top = input.candidates.slice(0, this.topN);
    const requestBody = {
      model: this.model,
      query: input.query,
      candidates: top.map((c) => ({
        item_id: c.itemId,
        chunk_id: c.chunkId,
        text: c.text
      })),
      top_k: input.limit
    };

    let response: Response;
    try {
      response = await this.fetchWithTimeout(`${this.url.replace(/\/$/, "")}/rerank`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify(requestBody)
      });
    } catch {
      return this.passthrough(input.candidates, input.limit);
    }

    if (!response.ok) {
      return this.passthrough(input.candidates, input.limit);
    }

    let payload: RerankerWireResponse;
    try {
      payload = (await response.json()) as RerankerWireResponse;
    } catch {
      return this.passthrough(input.candidates, input.limit);
    }

    const results = payload.results ?? [];
    if (results.length === 0) {
      return this.passthrough(input.candidates, input.limit);
    }

    const out: Array<{ itemId: string; chunkId?: string; score: number; reason?: string }> = [];
    for (const r of results) {
      const itemId = r.itemId ?? r.item_id;
      if (typeof itemId !== "string" || itemId.length === 0) continue;
      out.push({
        itemId,
        chunkId: r.chunkId ?? r.chunk_id,
        score: typeof r.score === "number" ? r.score : 0,
        reason: r.reason
      });
      if (out.length >= input.limit) break;
    }
    if (out.length === 0) {
      return this.passthrough(input.candidates, input.limit);
    }
    return out;
  }

  private passthrough(
    candidates: RerankerCandidate[],
    limit: number
  ): Array<{ itemId: string; chunkId?: string; score: number; reason?: string }> {
    return candidates.slice(0, limit).map((c) => ({
      itemId: c.itemId,
      chunkId: c.chunkId,
      score: c.score
    }));
  }

  private async fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const handle = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(handle);
    }
  }
}
