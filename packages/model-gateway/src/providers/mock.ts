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

const SECRET_PATTERNS: RegExp[] = [
  /password\s*[:=]/i,
  /api[_-]?key\s*[:=]/i,
  /token\s*[:=]/i,
  /secret\s*[:=]/i,
];

function deterministicScore(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return (h % 100) / 100;
}

export class MockProvider implements ModelProvider {
  readonly kind = "mock" as const;
  readonly available = true;

  async generateTitle(text: string): Promise<TitleResult> {
    const words = text.split(/\s+/).slice(0, 8).join(" ");
    return {
      title: words.length > 0 ? `[mock] ${words}` : "[mock] untitled",
      confidence: 0.75,
    };
  }

  async generateSummary(text: string, maxChars = 200): Promise<SummaryResult> {
    return {
      summary: `[mock summary] ${text.slice(0, maxChars)}`,
      confidence: 0.8,
    };
  }

  async detectRedactionHints(text: string): Promise<RedactionHint[]> {
    const hints: RedactionHint[] = [];
    for (const pattern of SECRET_PATTERNS) {
      const matches = text.match(new RegExp(pattern.source, "gi"));
      if (matches) {
        hints.push({
          pattern: pattern.source,
          reason: "potential credential detected",
          severity: "high",
          matchCount: matches.length,
        });
      }
    }
    return hints;
  }

  async detectDuplicates(candidate: string, existing: string[]): Promise<DuplicateHint[]> {
    const candidateWords = candidate.toLowerCase().split(/\s+/);
    return existing
      .map((e, i) => {
        const overlap = candidateWords.filter((w) => e.toLowerCase().includes(w)).length;
        const similarity = overlap / Math.max(candidateWords.length, 1);
        return { index: i, similarity };
      })
      .filter(({ similarity }) => similarity > 0.5)
      .map(({ index, similarity }) => ({
        candidateId: `existing-${index}`,
        similarity,
        reason: "[mock] high word overlap",
        suggestedAction: similarity > 0.8 ? ("merge" as const) : ("supersede" as const),
      }));
  }

  async detectStaleConflict(candidate: string, context: string[]): Promise<StaleConflictHint[]> {
    if (context.length === 0) return [];
    const score = deterministicScore(candidate);
    if (score < 0.3) {
      return [
        {
          kind: "stale",
          reason: "[mock] content appears outdated relative to context",
          confidence: 0.6,
        },
      ];
    }
    return [];
  }

  async rewriteQuery(query: string): Promise<QueryRewriteResult> {
    const words = query.toLowerCase().split(/\s+/);
    return {
      rewritten: `${query} context history`,
      expansions: words.slice(0, 2).map((w) => `${w}s`),
      confidence: 0.7,
    };
  }

  async rerank(query: string, candidates: Array<{ id: string; text: string }>): Promise<RerankResult[]> {
    const qWords = query.toLowerCase().split(/\s+/);
    return candidates
      .map((c) => {
        const overlap = qWords.filter((w) => c.text.toLowerCase().includes(w)).length;
        const score = overlap / Math.max(qWords.length, 1);
        return { id: c.id, score, reason: "[mock] keyword overlap" };
      })
      .sort((a, b) => b.score - a.score);
  }
}
