import type {
  ModelProvider,
  TitleResult,
  SummaryResult,
  RedactionHint,
  DuplicateHint,
  StaleConflictHint,
  QueryRewriteResult,
  RerankResult,
} from "../types.js";

export class NoopProvider implements ModelProvider {
  readonly kind = "noop" as const;
  readonly available = false;

  async generateTitle(_text: string): Promise<TitleResult> {
    return { title: "", confidence: 0 };
  }

  async generateSummary(_text: string, _maxChars?: number): Promise<SummaryResult> {
    return { summary: "", confidence: 0 };
  }

  async detectRedactionHints(_text: string): Promise<RedactionHint[]> {
    return [];
  }

  async detectDuplicates(_candidate: string, _existing: string[]): Promise<DuplicateHint[]> {
    return [];
  }

  async detectStaleConflict(_candidate: string, _context: string[]): Promise<StaleConflictHint[]> {
    return [];
  }

  async rewriteQuery(query: string): Promise<QueryRewriteResult> {
    return { rewritten: query, expansions: [], confidence: 0 };
  }

  async rerank(_query: string, candidates: Array<{ id: string; text: string }>): Promise<RerankResult[]> {
    return candidates.map((c, i) => ({ id: c.id, score: 1 - i * 0.01, reason: "passthrough" }));
  }
}
