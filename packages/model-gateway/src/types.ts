export type ModelProviderKind = "noop" | "mock" | "cloud";

export type ModelTask =
  | "title"
  | "summary"
  | "redaction_hints"
  | "duplicates"
  | "stale_conflict"
  | "rewrite_query"
  | "rerank";

export interface ModelProvenance {
  provider: ModelProviderKind;
  model?: string;
  task?: ModelTask;
  generatedAt: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  /**
   * Provider-reported cost in normalized units. The cloud provider derives this
   * from token usage and per-model rates so operator dashboards can compare
   * across providers without exposing raw billing currency.
   */
  costUnits?: number;
  /**
   * Number of pre-model redaction patterns matched in the input that was sent
   * to the provider. 0 means the input was already clean. >0 proves the cloud
   * provider redacted secrets before the HTTP call left this process.
   */
  inputRedactionMatchCount?: number;
  /**
   * Set when the underlying provider call failed and the gateway returned a
   * fallback. The gateway also returns this on the GenerationResult.error.
   */
  error?: string;
}

export interface GenerationResult<T> {
  ok: boolean;
  value: T | null;
  fallback: boolean;
  error?: string;
  provenance: ModelProvenance;
}

export interface TitleResult {
  title: string;
  confidence: number;
}

export interface SummaryResult {
  summary: string;
  confidence: number;
}

export interface RedactionHint {
  pattern: string;
  reason: string;
  severity: "low" | "medium" | "high";
  matchCount: number;
}

export interface DuplicateHint {
  candidateId: string;
  similarity: number;
  reason: string;
  suggestedAction: "merge" | "supersede" | "keep_both";
}

export interface StaleConflictHint {
  kind: "stale" | "conflict";
  reason: string;
  relatedId?: string;
  confidence: number;
}

export interface QueryRewriteResult {
  rewritten: string;
  expansions: string[];
  confidence: number;
}

export interface RerankResult {
  id: string;
  score: number;
  reason: string;
}

export interface ModelProvider {
  readonly kind: ModelProviderKind;
  readonly available: boolean;
  generateTitle(text: string): Promise<TitleResult>;
  generateSummary(text: string, maxChars?: number): Promise<SummaryResult>;
  detectRedactionHints(text: string): Promise<RedactionHint[]>;
  detectDuplicates(candidate: string, existing: string[]): Promise<DuplicateHint[]>;
  detectStaleConflict(candidate: string, context: string[]): Promise<StaleConflictHint[]>;
  rewriteQuery(query: string): Promise<QueryRewriteResult>;
  rerank(query: string, candidates: Array<{ id: string; text: string }>): Promise<RerankResult[]>;
}
