// Lore Context v1.4 — Lane 0: SearchAdapterV14 (top-level 7-stream orchestrator).
//
// Closes the v1.3 plan §1.2 P0 debt: "5 paths not mounted in RRF".
// This adapter wraps the existing HybridSearchOrchestrator and mounts all
// seven candidate-emitting stream providers (postgres_fts, postgres_pgvector,
// qdrant_dense, qdrant_sparse, graph, temporal, wiki) in a single surface.
//
// Design invariants:
//   * Default Lore API behaviour (LORE_SEARCH_ADAPTER_V14 unset/=0) is
//     completely unaffected — this class is never instantiated in that path.
//   * Any dep that is missing causes the dependent stream(s) to be silently
//     skipped; the orchestrator still runs with whatever streams did load.
//   * enabledStreams further filters what is loaded (default: all 7).
//   * Vault scoping is delegated to the orchestrator (ensureVaultScoped).
//   * onStreamEvent propagates per-stream diagnostics to Lane B Phase 1.7.
//
// Dependencies:
//   * pool: required for postgres_fts, postgres_pgvector, graph, temporal, wiki.
//   * qdrantClient: required for qdrant_dense and qdrant_sparse.
//   * embeddingFn: required for qdrant_dense and postgres_pgvector.
//   * sparseVectorizerFn: required for qdrant_sparse.
//   * rerankerProvider: opt-in post-fusion reranker (input.rerank must also be true).

import { HybridSearchOrchestrator } from "./orchestrator-v12.js";
import {
  createPostgresFtsStreamProvider,
  createPostgresPgVectorStreamProvider,
  createPrecomputedQdrantStreamProvider,
  DEFAULT_RRF_K,
  DEFAULT_STREAM_WEIGHTS,
  ensureVaultScoped,
  QdrantHybridMemorySearchProviderV12,
  type MemorySearchHitV12,
  type MemorySearchInputV12,
  type MemorySearchStreamKindV12,
  type PoolLikeV12,
  type RerankerProvider,
  type StreamProviderV12
} from "./memory-search-v12.js";
import type { QdrantClientLike, QdrantScoredPoint } from "./memory-search.js";
import { GraphRetrievalProvider } from "./graph-retrieval-v12.js";
import { TemporalRetrievalProvider } from "./temporal-retrieval-v12.js";
import { WikiRetrievalProvider } from "./wiki-retrieval-v12.js";
import type { StreamEvent } from "./orchestrator-v12.js";

export type { MemorySearchHitV12 as MemorySearchHitV14 };

// ---------------------------------------------------------------------------
// Public config interface.
// ---------------------------------------------------------------------------

export interface SearchAdapterV14Config {
  /** Postgres pool — required for postgres_fts, postgres_pgvector, graph, temporal, wiki. */
  pool: PoolLikeV12;
  /**
   * Qdrant client — required for qdrant_dense and qdrant_sparse streams.
   * When null/undefined those two streams are silently skipped.
   */
  qdrantClient?: QdrantClientLike | null;
  /** Qdrant collection name. Default: "lore_memories_v12". */
  qdrantCollection?: string;
  /**
   * Dense embedding function — required for qdrant_dense and postgres_pgvector.
   * When absent both streams are silently skipped.
   */
  embeddingFn?: ((text: string) => Promise<number[]>) | null;
  /**
   * Sparse vectorizer — required for qdrant_sparse stream.
   * When absent, qdrant_sparse is silently skipped.
   */
  sparseVectorizerFn?: ((text: string) => Promise<{ indices: number[]; values: number[] }>) | null;
  /**
   * Post-fusion reranker (Lane C). Applied only when input.rerank === true AND
   * this is set. Skipped silently otherwise.
   */
  rerankerProvider?: RerankerProvider | null;
  /**
   * Which of the 7 streams to activate. Default: all 7.
   * This is the installation-level filter; per-request input.streams is
   * intersected inside the orchestrator as usual.
   */
  enabledStreams?: ReadonlyArray<MemorySearchStreamKindV12>;
  /**
   * Per-stream RRF weights. Defaults to DEFAULT_STREAM_WEIGHTS.
   * Useful for staging experiments without changing the orchestrator defaults.
   */
  weights?: Partial<Record<MemorySearchStreamKindV12, number>>;
  /** Override RRF damping constant. Default: DEFAULT_RRF_K = 60. */
  rrfK?: number;
  /**
   * Per-stream timeout in milliseconds passed to the orchestrator.
   * Default: 1500 ms (orchestrator default).
   * Set to null to disable timeouts (determinism mode — used by tests).
   */
  perStreamTimeoutMs?: number | null;
  /** Observability hook — forwarded to the orchestrator's onStreamEvent. */
  onStreamEvent?: (event: StreamEvent) => void;
}

// ---------------------------------------------------------------------------
// SearchAdapterV14
// ---------------------------------------------------------------------------

export class SearchAdapterV14 {
  readonly name = "search-adapter-v14" as const;

  private readonly providers: StreamProviderV12[];
  private readonly rerankerProvider: RerankerProvider | undefined;
  private readonly streamTimeoutMs: number | null | undefined;
  private readonly rrfK: number;
  private readonly onStreamEvent: ((event: StreamEvent) => void) | undefined;

  constructor(config: SearchAdapterV14Config) {
    const weights: Record<MemorySearchStreamKindV12, number> = {
      ...DEFAULT_STREAM_WEIGHTS,
      ...(config.weights ?? {})
    };

    const enabledSet: ReadonlySet<MemorySearchStreamKindV12> = config.enabledStreams
      ? new Set(config.enabledStreams)
      : new Set<MemorySearchStreamKindV12>([
          "postgres_fts",
          "postgres_pgvector",
          "qdrant_dense",
          "qdrant_sparse",
          "graph",
          "temporal",
          "wiki"
        ]);

    const providers: StreamProviderV12[] = [];

    // ------------------------------------------------------------------
    // Postgres FTS — requires pool only.
    // ------------------------------------------------------------------
    if (enabledSet.has("postgres_fts")) {
      providers.push(
        createPostgresFtsStreamProvider({
          pool: config.pool,
          weight: weights.postgres_fts
        })
      );
    }

    // ------------------------------------------------------------------
    // Postgres pgvector — requires pool + embeddingFn.
    // ------------------------------------------------------------------
    if (enabledSet.has("postgres_pgvector") && config.embeddingFn) {
      providers.push(
        createPostgresPgVectorStreamProvider({
          pool: config.pool,
          weight: weights.postgres_pgvector,
          embeddingFn: config.embeddingFn
        })
      );
    }

    // ------------------------------------------------------------------
    // Qdrant dense + sparse — requires qdrantClient.
    // Both streams are bridged via a thin wrapper that calls the existing
    // QdrantHybridMemorySearchProviderV12 logic so we reuse the proven
    // filter/payload normalisation code.
    // ------------------------------------------------------------------
    if (config.qdrantClient) {
      if (enabledSet.has("qdrant_dense") && config.embeddingFn) {
        providers.push(
          createQdrantDenseStreamProvider({
            client: config.qdrantClient,
            collection: config.qdrantCollection,
            embeddingFn: config.embeddingFn,
            weight: weights.qdrant_dense
          })
        );
      }

      if (enabledSet.has("qdrant_sparse") && config.sparseVectorizerFn) {
        providers.push(
          createQdrantSparseStreamProvider({
            client: config.qdrantClient,
            collection: config.qdrantCollection,
            sparseVectorizerFn: config.sparseVectorizerFn,
            weight: weights.qdrant_sparse
          })
        );
      }
    }

    // ------------------------------------------------------------------
    // Graph — requires pool.
    // ------------------------------------------------------------------
    if (enabledSet.has("graph")) {
      providers.push(
        createGraphStreamProvider({
          pool: config.pool,
          weight: weights.graph
        })
      );
    }

    // ------------------------------------------------------------------
    // Temporal — requires pool.
    // ------------------------------------------------------------------
    if (enabledSet.has("temporal")) {
      providers.push(
        createTemporalStreamProvider({
          pool: config.pool,
          weight: weights.temporal
        })
      );
    }

    // ------------------------------------------------------------------
    // Wiki — requires pool; embeddingFn is optional (enables pgvector path).
    // ------------------------------------------------------------------
    if (enabledSet.has("wiki")) {
      providers.push(
        createWikiStreamProvider({
          pool: config.pool,
          embeddingFn: config.embeddingFn ?? undefined,
          weight: weights.wiki
        })
      );
    }

    this.providers = providers;
    this.rerankerProvider = config.rerankerProvider ?? undefined;
    this.streamTimeoutMs = config.perStreamTimeoutMs === null ? null : (config.perStreamTimeoutMs ?? undefined);
    this.rrfK = config.rrfK ?? DEFAULT_RRF_K;
    this.onStreamEvent = config.onStreamEvent;
  }

  async search(input: MemorySearchInputV12): Promise<MemorySearchHitV12[]> {
    // Vault scoping is also checked by the orchestrator, but we enforce it
    // here so the error surface is as early as possible.
    ensureVaultScoped(input);
    const orchestrator = new HybridSearchOrchestrator({
      providers: this.providers,
      reranker: this.rerankerProvider,
      streamTimeoutMs: this.streamTimeoutMs,
      k: this.rrfK,
      onStreamEvent: input.onStreamEvent ?? this.onStreamEvent
    });
    return orchestrator.search(input);
  }
}

// ---------------------------------------------------------------------------
// Qdrant stream providers — thin StreamProviderV12 wrappers that issue a
// single dense or sparse Qdrant search and return precomputed candidates.
// ---------------------------------------------------------------------------

import {
  QDRANT_V12_COLLECTION_DEFAULT,
  QDRANT_V12_DENSE_VECTOR_NAME,
  QDRANT_V12_SPARSE_VECTOR_NAME
} from "./memory-search-v12.js";
import type { QdrantFilter, QdrantMustCondition } from "./memory-search.js";

// Minimal filter builder (mirrors QdrantHybridMemorySearchProviderV12's private helper).
function buildFilterForInput(input: MemorySearchInputV12): QdrantFilter {
  const must: QdrantMustCondition[] = [
    { key: "vault_id", match: { value: input.vaultId } }
  ];
  if (input.projectId) {
    must.push({ key: "project_id", match: { value: input.projectId } });
  } else if (input.allowedProjectIds && input.allowedProjectIds.length > 0) {
    must.push({ key: "project_id", match: { any: input.allowedProjectIds } });
  }
  const statuses =
    input.status && input.status.length > 0 ? input.status : ["active", "confirmed"];
  must.push({ key: "status", match: { any: statuses } });
  if (input.validAt) {
    must.push({ key: "valid_until", range: { gte: input.validAt } });
  }
  if (input.asOfSystemTime) {
    must.push({ key: "t_created", range: { lte: input.asOfSystemTime } });
  }
  return { must };
}

// Minimal point normalisation for precomputed stream.
function pointsToScoredPoints(
  points: QdrantScoredPoint[]
): QdrantScoredPoint[] {
  return points;
}

interface QdrantDenseStreamConfig {
  client: QdrantClientLike;
  collection?: string;
  embeddingFn: (text: string) => Promise<number[]>;
  weight: number;
}

function createQdrantDenseStreamProvider(config: QdrantDenseStreamConfig): StreamProviderV12 {
  const collection = config.collection ?? QDRANT_V12_COLLECTION_DEFAULT;
  return {
    kind: "qdrant_dense",
    backend: QDRANT_V12_DENSE_VECTOR_NAME,
    async emit(input) {
      const candidateLimit = input.candidateLimit ?? 80;
      const filter = buildFilterForInput(input);
      const embeddingFn = input.embeddingFn ?? config.embeddingFn;
      const vector = await embeddingFn(input.query);
      const points = await config.client.searchDense(
        collection,
        QDRANT_V12_DENSE_VECTOR_NAME,
        vector,
        filter,
        candidateLimit
      );
      return createPrecomputedQdrantStreamProvider({
        kind: "qdrant_dense",
        backend: QDRANT_V12_DENSE_VECTOR_NAME,
        weight: config.weight,
        points: pointsToScoredPoints(points)
      }).emit(input);
    }
  };
}

interface QdrantSparseStreamConfig {
  client: QdrantClientLike;
  collection?: string;
  sparseVectorizerFn: (text: string) => Promise<{ indices: number[]; values: number[] }>;
  weight: number;
}

function createQdrantSparseStreamProvider(config: QdrantSparseStreamConfig): StreamProviderV12 {
  const collection = config.collection ?? QDRANT_V12_COLLECTION_DEFAULT;
  return {
    kind: "qdrant_sparse",
    backend: "qdrant/bm25",
    async emit(input) {
      const candidateLimit = input.candidateLimit ?? 80;
      const filter = buildFilterForInput(input);
      const sv = await config.sparseVectorizerFn(input.query);
      const points = await config.client.searchSparse(
        collection,
        QDRANT_V12_SPARSE_VECTOR_NAME,
        sv,
        filter,
        candidateLimit
      );
      return createPrecomputedQdrantStreamProvider({
        kind: "qdrant_sparse",
        backend: "qdrant/bm25",
        weight: config.weight,
        points: pointsToScoredPoints(points)
      }).emit(input);
    }
  };
}

// ---------------------------------------------------------------------------
// Graph stream provider — wraps GraphRetrievalProvider as a StreamProviderV12.
// ---------------------------------------------------------------------------

interface GraphStreamConfig {
  pool: PoolLikeV12;
  weight: number;
}

function createGraphStreamProvider(config: GraphStreamConfig): StreamProviderV12 {
  const provider = new GraphRetrievalProvider({ pool: config.pool });
  return {
    kind: "graph",
    backend: "graph-retrieval-v12",
    async emit(input) {
      const hits = await provider.search(input);
      const candidates = hits.map((hit) => ({
        itemId: hit.itemId,
        chunkId: hit.chunkId,
        score: hit.score,
        ...(hit.text?.trim() ? { text: hit.text } : {})
      }));
      return { candidates, weight: config.weight };
    }
  };
}

// ---------------------------------------------------------------------------
// Temporal stream provider — wraps TemporalRetrievalProvider.
// ---------------------------------------------------------------------------

interface TemporalStreamConfig {
  pool: PoolLikeV12;
  weight: number;
}

function createTemporalStreamProvider(config: TemporalStreamConfig): StreamProviderV12 {
  const provider = new TemporalRetrievalProvider({ pool: config.pool });
  return {
    kind: "temporal",
    backend: "temporal-retrieval-v12",
    async emit(input) {
      const hits = await provider.search(input);
      const candidates = hits.map((hit) => ({
        itemId: hit.itemId,
        chunkId: hit.chunkId,
        score: hit.score,
        ...(hit.text?.trim() ? { text: hit.text } : {})
      }));
      return { candidates, weight: config.weight };
    }
  };
}

// ---------------------------------------------------------------------------
// Wiki stream provider — wraps WikiRetrievalProvider.
// ---------------------------------------------------------------------------

interface WikiStreamConfig {
  pool: PoolLikeV12;
  embeddingFn?: (text: string) => Promise<number[]>;
  weight: number;
}

function createWikiStreamProvider(config: WikiStreamConfig): StreamProviderV12 {
  const provider = new WikiRetrievalProvider({
    pool: config.pool,
    embeddingFn: config.embeddingFn
  });
  return {
    kind: "wiki",
    backend: "wiki-retrieval-v12",
    async emit(input) {
      const hits = await provider.search(input);
      const candidates = hits.map((hit) => ({
        itemId: hit.itemId,
        chunkId: hit.chunkId,
        score: hit.score,
        ...(hit.text?.trim() ? { text: hit.text } : {})
      }));
      return { candidates, weight: config.weight };
    }
  };
}

// ---------------------------------------------------------------------------
// Re-export for callers that construct configs without importing v12 directly.
// ---------------------------------------------------------------------------
export { QdrantHybridMemorySearchProviderV12 };
export type { StreamEvent };
