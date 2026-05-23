import type { WebEvidence } from "@lore/shared";

export type {
  MemorySearchInput,
  MemoryStreamDense,
  MemoryStreamSparse,
  MemoryStreamGraph,
  MemorySearchStreams,
  MemorySearchHit,
  HybridMemoryHit,
  MemorySearchProvider,
  QdrantScoredPoint,
  QdrantMatchCondition,
  QdrantRangeCondition,
  QdrantMustCondition,
  QdrantFilter,
  QdrantClientLike,
  QdrantHybridConfig
} from "./memory-search.js";
export { noopMemorySearchProvider, QdrantHybridMemorySearchProvider } from "./memory-search.js";

// v1.2 retrieval foundation (Lane B). Type seam + providers; the integration
// lane wires these onto API routes.
export type {
  MemorySearchStreamKindV12,
  MemorySearchStreamMetadataV12,
  MemorySearchHitLifecycleV12,
  MemorySearchHitProvenanceV12,
  MemorySearchHitV12,
  MemorySearchInputV12,
  WeightedRRFCandidate,
  WeightedRRFStream,
  WeightedRRFInput,
  RerankerCandidate,
  RerankerProvider,
  StreamProviderV12,
  StreamEmitResult,
  PoolLikeV12,
  PoolQueryResultV12,
  PostgresHybridMemorySearchProviderConfig,
  QdrantHybridMemorySearchProviderV12Config,
  PostgresFtsStreamProviderConfig,
  PostgresPgVectorStreamProviderConfig,
  PrecomputedQdrantStreamProviderConfig
} from "./memory-search-v12.js";
export {
  DEFAULT_RRF_K,
  DEFAULT_CANDIDATE_LIMIT,
  DEFAULT_FINAL_LIMIT,
  DEFAULT_STREAM_WEIGHTS,
  ALL_STREAM_KINDS_V12,
  ensureVaultScoped,
  fuseWeightedRRF,
  POSTGRES_FTS_SQL,
  POSTGRES_PGVECTOR_SQL,
  PostgresHybridMemorySearchProvider,
  QDRANT_V12_COLLECTION_DEFAULT,
  QDRANT_V12_DENSE_VECTOR_NAME,
  QDRANT_V12_SPARSE_VECTOR_NAME,
  QdrantHybridMemorySearchProviderV12,
  resolveNativeFusionEnabled,
  createPostgresFtsStreamProvider,
  createPostgresPgVectorStreamProvider,
  createPrecomputedQdrantStreamProvider
} from "./memory-search-v12.js";

// v1.3 Lane B — HybridSearchOrchestrator + LocalCrossEncoderReranker.
export type {
  HybridSearchOrchestratorConfig,
  StreamEvent,
  StreamEventStatus
} from "./orchestrator-v12.js";
export {
  HybridSearchOrchestrator,
  DEFAULT_STREAM_TIMEOUT_MS,
  DEFAULT_RERANK_TOP_N,
  parseStreamsEnabledEnv,
  resolveEnabledStreams,
  resolveStreamTimeoutMs
} from "./orchestrator-v12.js";

// v1.4 Lane B Phase 1.7 — per-stream diagnostics collector (opt-in).
export type { CollectedStreamEvent } from "./diagnostics-collector-v14.js";
export { DiagnosticsCollector } from "./diagnostics-collector-v14.js";

export type { LocalCrossEncoderRerankerConfig } from "./rerankers/local-cross-encoder.js";
export {
  LocalCrossEncoderReranker,
  DEFAULT_RERANKER_MODEL,
  DEFAULT_RERANKER_TOP_N,
  DEFAULT_RERANKER_TIMEOUT_MS
} from "./rerankers/local-cross-encoder.js";

// v1.3 Lane A1 — GraphRetrievalProvider.
export type { GraphRetrievalProviderConfig } from "./graph-retrieval-v12.js";
export {
  GraphRetrievalProvider,
  GRAPH_ENTITY_SEED_SQL,
  GRAPH_RELATIONS_SQL,
  GRAPH_EVIDENCE_SQL
} from "./graph-retrieval-v12.js";

// v1.3 Lane A2 — TemporalRetrievalProvider.
export type { TemporalRetrievalProviderConfig } from "./temporal-retrieval-v12.js";
export { TemporalRetrievalProvider } from "./temporal-retrieval-v12.js";

// v1.3 Lane A2 — temporal-memory helpers (moved from apps/api).
export type {
  TemporalRecord,
  SubjectPredicateRecord
} from "./temporal-memory-helpers.js";
export {
  isActiveAt,
  filterActiveAt,
  excludeSupersededOrExpired,
  latestValidBySubjectPredicate,
  selectActiveLatestBySubjectPredicate
} from "./temporal-memory-helpers.js";

// v1.3 Lane A3 + Lane C — Wiki retrieval (FTS + optional pgvector fusion).
export type { WikiRetrievalProviderConfig } from "./wiki-retrieval-v12.js";
export {
  WikiRetrievalProvider,
  WIKI_FTS_SQL,
  WIKI_PGVECTOR_SQL
} from "./wiki-retrieval-v12.js";

export {
  resolveSystemTimeParam,
  isVisibleAtSystemTime,
  isPointVisibleAtSystemTime,
  filterQdrantPointsBySystemTime
} from "./temporal-system-time-filter.js";

// v1.4 Lane 0 — SearchAdapterV14 (top-level 7-stream orchestrator).
// Opt-in via LORE_SEARCH_ADAPTER_V14=1; default behaviour is v1.3 unchanged.
export type { SearchAdapterV14Config, MemorySearchHitV14 } from "./search-adapter-v14.js";
export { SearchAdapterV14 } from "./search-adapter-v14.js";

// v2.0.9 Wave 0 — Recipe → Adapter mapping (BRA-633).
export type { RecipeKnobs } from "./recipe-adapter.js";
export { mapRecipeToAdapterConfig, mergeRecipeWithBaseConfig } from "./recipe-adapter.js";

export interface SearchInput {
  query: string;
  limit?: number;
  freshness?: "none" | "recent" | "latest";
}

export interface FetchInput {
  url: string;
}

export interface FetchedPage {
  url: string;
  title?: string;
  content: string;
  fetchedAt: string;
}

export interface SearchProvider {
  name: string;
  search(input: SearchInput): Promise<WebEvidence[]>;
  fetch?(input: FetchInput): Promise<FetchedPage>;
}

export const noopSearchProvider: SearchProvider = {
  name: "noop",
  async search() {
    return [];
  }
};

export interface StaticSearchProviderOptions {
  results: WebEvidence[];
}

export class StaticSearchProvider implements SearchProvider {
  readonly name = "static";

  constructor(private readonly options: StaticSearchProviderOptions) {}

  async search(input: SearchInput): Promise<WebEvidence[]> {
    const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);
    const limit = input.limit ?? 10;

    return this.options.results
      .filter((item) => {
        const haystack = `${item.title} ${item.snippet}`.toLowerCase();
        return terms.length === 0 || terms.some((term) => haystack.includes(term));
      })
      .slice(0, limit);
  }
}

export interface ZapfetchSearchProviderConfig {
  apiUrl: string;
  apiKey?: string;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
}

export class ZapfetchSearchProvider implements SearchProvider {
  readonly name = "zapfetch";
  private readonly fetchImpl: (input: string, init?: RequestInit) => Promise<Response>;

  constructor(private readonly config: ZapfetchSearchProviderConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async search(input: SearchInput): Promise<WebEvidence[]> {
    const response = await this.fetchImpl(`${this.config.apiUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {})
      },
      body: JSON.stringify({
        query: input.query,
        freshness: input.freshness,
        top_k: input.limit ?? 5
      })
    });

    if (!response.ok) {
      throw new Error(`search provider failed: ${response.status}`);
    }

    const payload = (await response.json()) as { results?: Array<Partial<WebEvidence>> };
    return (payload.results ?? []).map((item, index) => ({
      id: item.id ?? `web_${index}`,
      title: item.title ?? "Untitled source",
      url: item.url,
      snippet: item.snippet ?? "",
      source: item.source ?? this.name,
      fetchedAt: item.fetchedAt
    }));
  }
}
