import type { EvalRunResult } from "./runner.js";

export type QueryIntent = "semantic" | "keyword" | "temporal" | "relation" | "wiki" | "negative";

// v1.3 Lane B (plan §3 Lane B item 4): `reranker` is no longer a stream kind.
// Eval ablation rerankerEnabled (boolean below) maps to the new
// MemorySearchInputV12.rerank?: boolean contract.
export type MemorySearchStreamKind =
  | "qdrant_dense"
  | "qdrant_sparse"
  | "postgres_fts"
  | "postgres_pgvector"
  | "graph"
  | "temporal"
  | "wiki";

export interface EvalCaseV12 {
  id: string;
  query: string;
  expected_memory_ids: string[];
  expected_top3_ids?: string[];
  tags: string[];
  valid_at?: string;
  streams_expected?: MemorySearchStreamKind[];
  negative_ids?: string[];
  query_intent: QueryIntent;
}

export interface EvalDatasetV12 {
  name: string;
  version: string;
  items: EvalCaseV12[];
}

export interface AblationConfig {
  id: string;
  label: string;
  streams: MemorySearchStreamKind[];
  weights?: Partial<Record<MemorySearchStreamKind, number>>;
  temporalFilterEnabled: boolean;
  rerankerEnabled: boolean;
}

export interface GateThreshold {
  metric: string;
  min?: number;
  max?: number;
  relative_uplift_vs?: string;
  min_uplift?: number;
  k_override?: number;
}

export interface GateConfig {
  version: string;
  k: number;
  thresholds: GateThreshold[];
}

export interface FailedThreshold {
  metric: string;
  threshold: number;
  direction: "min" | "max";
  actual: number;
  delta: number;
}

export interface GroupMetrics {
  recallAtK: number;
  mrr: number;
  negativeHitRate?: number;
  caseCount: number;
}

export interface PerItemV12 {
  id: string;
  recall: number;
  precision: number;
  rr: number;
  latencyMs: number;
  hits: string[];
  topKIds: string[];
  expectedTopKIds: string[];
  streamsFired: string[];
  expectedStreams: string[];
  negativeHits: string[];
  lifecycle: {
    supersededExcluded: number;
    expiredExcluded: number;
    deletedExcluded: number;
  };
  fusionWeightsApplied: Partial<Record<MemorySearchStreamKind, number>>;
  latencyBreakdownMs: {
    fts?: number;
    pgvector?: number;
    qdrant?: number;
    graph?: number;
    fusion?: number;
    reranker?: number;
  };
  rootCauseHints: string[];
}

export interface EvalRunResultV12 extends Omit<EvalRunResult, "perItem"> {
  engineVersion: "v12";
  ablationConfig: AblationConfig;
  gateResult: {
    passed: boolean;
    failedThresholds: FailedThreshold[];
  };
  aggregateByGroup: Record<string, GroupMetrics>;
  perItem: PerItemV12[];
}

export type RootCauseHint =
  | "temporal_filter_not_applied"
  | "wrong_vault_item_leaked"
  | "fts_stream_not_fired"
  | "dense_stream_not_fired"
  | "graph_stream_not_fired"
  | "wiki_stream_not_fired"
  | "rrf_weight_mismatch"
  | "candidate_status_leaked"
  | "superseded_item_in_context"
  | "embedding_model_mismatch"
  | "collection_name_wrong"
  | "no_relation_evidence";
