import type { ModelGateway } from "./gateway.js";
import type {
  GenerationResult,
  TitleResult,
  SummaryResult,
  RedactionHint,
  DuplicateHint,
  StaleConflictHint,
  QueryRewriteResult,
  RerankResult,
} from "./types.js";

export interface CandidateIntelligence {
  title: GenerationResult<TitleResult>;
  summary: GenerationResult<SummaryResult>;
  redactionHints: GenerationResult<RedactionHint[]>;
}

export async function enrichCandidate(
  gateway: ModelGateway,
  content: string,
  summaryMaxChars = 200,
): Promise<CandidateIntelligence> {
  const [title, summary, redactionHints] = await Promise.all([
    gateway.generateTitle(content),
    gateway.generateSummary(content, summaryMaxChars),
    gateway.detectRedactionHints(content),
  ]);
  return { title, summary, redactionHints };
}

export interface DeduplicationResult {
  duplicates: GenerationResult<DuplicateHint[]>;
  staleConflicts: GenerationResult<StaleConflictHint[]>;
}

export async function analyzeForDeduplication(
  gateway: ModelGateway,
  candidate: string,
  existingContents: string[],
  context: string[],
): Promise<DeduplicationResult> {
  const [duplicates, staleConflicts] = await Promise.all([
    gateway.detectDuplicates(candidate, existingContents),
    gateway.detectStaleConflict(candidate, context),
  ]);
  return { duplicates, staleConflicts };
}

export interface RecallEnhancement {
  queryRewrite: GenerationResult<QueryRewriteResult>;
  reranked: GenerationResult<RerankResult[]>;
}

export async function enhanceRecall(
  gateway: ModelGateway,
  query: string,
  candidates: Array<{ id: string; text: string }>,
): Promise<RecallEnhancement> {
  const queryRewrite = await gateway.rewriteQuery(query);
  const effectiveQuery =
    queryRewrite.ok && queryRewrite.value ? queryRewrite.value.rewritten : query;
  const reranked = await gateway.rerank(effectiveQuery, candidates);
  return { queryRewrite, reranked };
}
