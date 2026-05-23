import type { MemoryHit } from "@lore/shared";

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export interface MemorySearchInput {
  query: string;
  vaultId?: string;
  accountId?: string;
  projectId?: string;
  allowedProjectIds?: string[];
  status?: string[];
  sourceProvider?: string;
  memoryType?: string;
  validAt?: string;
  limit?: number;
}

export interface MemoryStreamDense {
  rank: number;
  score: number;
  embeddingModel: string;
  vectorName: string;
}

export interface MemoryStreamSparse {
  rank: number;
  score: number;
  sparseModel: string;
  vectorName: string;
}

export interface MemoryStreamGraph {
  rank: number;
  score: number;
  path?: string[];
}

export interface MemorySearchStreams {
  dense?: MemoryStreamDense;
  sparse?: MemoryStreamSparse;
  graph?: MemoryStreamGraph;
}

export interface MemorySearchHit {
  memoryId: string;
  score: number;
  streams: MemorySearchStreams;
  backend: "lore-hybrid" | "lore-local" | "degraded";
}

export interface HybridMemoryHit extends MemoryHit {
  streams?: MemorySearchStreams;
  lifecycle?: {
    status: string;
    validFrom?: string;
    validUntil?: string;
    supersededBy?: string;
  };
  provenance?: {
    sourceRefs: unknown[];
    candidateId?: string;
    approvedAt?: string;
  };
  explanation?: string;
}

// ---------------------------------------------------------------------------
// MemorySearchProvider interface
// ---------------------------------------------------------------------------

export interface MemorySearchProvider {
  name: string;
  search(input: MemorySearchInput): Promise<MemorySearchHit[]>;
}

export const noopMemorySearchProvider: MemorySearchProvider = {
  name: "noop",
  async search() {
    return [];
  }
};

// ---------------------------------------------------------------------------
// Minimal Qdrant client interface (no hard @qdrant/js-client-rest dependency)
// ---------------------------------------------------------------------------

export interface QdrantScoredPoint {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
}

export interface QdrantMatchCondition {
  value?: unknown;
  any?: unknown[];
}

export interface QdrantRangeCondition {
  gte?: string;
  lte?: string;
}

export interface QdrantMustCondition {
  key?: string;
  match?: QdrantMatchCondition;
  range?: QdrantRangeCondition;
}

export interface QdrantFilter {
  must?: QdrantMustCondition[];
}

export interface QdrantClientLike {
  searchDense(
    collection: string,
    vectorName: string,
    vector: number[],
    filter: QdrantFilter,
    limit: number
  ): Promise<QdrantScoredPoint[]>;

  searchSparse(
    collection: string,
    vectorName: string,
    sparse: { indices: number[]; values: number[] },
    filter: QdrantFilter,
    limit: number
  ): Promise<QdrantScoredPoint[]>;

  queryFused?(
    collection: string,
    denseVectorName: string,
    denseVector: number[],
    sparseVectorName: string,
    sparse: { indices: number[]; values: number[] },
    filter: QdrantFilter,
    limit: number
  ): Promise<QdrantScoredPoint[]>;
}

// ---------------------------------------------------------------------------
// QdrantHybridMemorySearchProvider config
// ---------------------------------------------------------------------------

export interface QdrantHybridConfig {
  client: QdrantClientLike;
  collection?: string;
  embeddingFn?: (text: string) => Promise<number[]>;
  sparseVectorizerFn?: (text: string) => Promise<{ indices: number[]; values: number[] }>;
  embeddingModel?: string;
  rrfK?: number;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const DENSE_VECTOR_NAME = "dense_qwen3_1024";
const SPARSE_VECTOR_NAME = "sparse_bm25";
const DEFAULT_COLLECTION = "lore_memories_v11";
const DEFAULT_RRF_K = 60;
const DEFAULT_ACTIVE_STATUSES = ["active", "confirmed"];

// ---------------------------------------------------------------------------
// Payload filter builder (cross-vault isolation applied before IDs leave index)
// ---------------------------------------------------------------------------

function buildFilter(input: MemorySearchInput): QdrantFilter {
  const must: QdrantMustCondition[] = [];

  if (input.vaultId) {
    must.push({ key: "vault_id", match: { value: input.vaultId } });
  }

  if (input.accountId) {
    must.push({ key: "account_id", match: { value: input.accountId } });
  }

  if (input.projectId) {
    must.push({ key: "project_id", match: { value: input.projectId } });
  } else if (input.allowedProjectIds && input.allowedProjectIds.length > 0) {
    must.push({ key: "project_id", match: { any: input.allowedProjectIds } });
  }

  const statuses = input.status && input.status.length > 0 ? input.status : DEFAULT_ACTIVE_STATUSES;
  must.push({ key: "status", match: { any: statuses } });

  if (input.sourceProvider) {
    must.push({ key: "source_provider", match: { value: input.sourceProvider } });
  }

  if (input.memoryType) {
    must.push({ key: "memory_type", match: { value: input.memoryType } });
  }

  if (input.validAt) {
    must.push({ key: "valid_until", range: { gte: input.validAt } });
  }

  return { must };
}

// ---------------------------------------------------------------------------
// Local RRF fusion (used when Qdrant native fusion is unavailable)
// ---------------------------------------------------------------------------

function rrfFuse(
  lists: Array<QdrantScoredPoint[]>,
  k: number
): Array<{ id: string; rrfScore: number }> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((point, rank) => {
      const id = String(point.id);
      const prev = scores.get(id) ?? 0;
      scores.set(id, prev + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()]
    .map(([id, rrfScore]) => ({ id, rrfScore }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}

// ---------------------------------------------------------------------------
// QdrantHybridMemorySearchProvider
// ---------------------------------------------------------------------------

export class QdrantHybridMemorySearchProvider implements MemorySearchProvider {
  readonly name = "qdrant-hybrid";

  private readonly client: QdrantClientLike;
  private readonly collection: string;
  private readonly embeddingFn: ((text: string) => Promise<number[]>) | undefined;
  private readonly sparseVectorizerFn:
    | ((text: string) => Promise<{ indices: number[]; values: number[] }>)
    | undefined;
  private readonly embeddingModel: string;
  private readonly rrfK: number;

  constructor(config: QdrantHybridConfig) {
    this.client = config.client;
    this.collection = config.collection ?? DEFAULT_COLLECTION;
    this.embeddingFn = config.embeddingFn;
    this.sparseVectorizerFn = config.sparseVectorizerFn;
    this.embeddingModel = config.embeddingModel ?? "Qwen/Qwen3-Embedding-0.6B";
    this.rrfK = config.rrfK ?? DEFAULT_RRF_K;
  }

  async search(input: MemorySearchInput): Promise<MemorySearchHit[]> {
    const limit = input.limit ?? 20;
    const filter = buildFilter(input);

    const [denseResults, sparseResults] = await Promise.all([
      this.embeddingFn
        ? this.embeddingFn(input.query).then((vec) =>
            this.client.searchDense(this.collection, DENSE_VECTOR_NAME, vec, filter, limit)
          )
        : Promise.resolve([] as QdrantScoredPoint[]),
      this.sparseVectorizerFn
        ? this.sparseVectorizerFn(input.query).then((sv) =>
            this.client.searchSparse(this.collection, SPARSE_VECTOR_NAME, sv, filter, limit)
          )
        : Promise.resolve([] as QdrantScoredPoint[])
    ]);

    let fusedPoints: Array<{ id: string; rrfScore: number; point?: QdrantScoredPoint }> | undefined;

    // Try Qdrant native fusion first; fall back to local RRF on any error
    if (this.client.queryFused && this.embeddingFn && this.sparseVectorizerFn) {
      try {
        const [queryVec, sparseVec] = await Promise.all([
          this.embeddingFn(input.query),
          this.sparseVectorizerFn(input.query)
        ]);
        const fused = await this.client.queryFused(
          this.collection,
          DENSE_VECTOR_NAME,
          queryVec,
          SPARSE_VECTOR_NAME,
          sparseVec,
          filter,
          limit
        );
        fusedPoints = fused.map((p, rank) => ({
          id: String(p.id),
          rrfScore: 1 / (this.rrfK + rank + 1),
          point: p
        }));
      } catch {
        // Fall through to local RRF
      }
    }

    if (!fusedPoints) {
      const nonEmpty = [denseResults, sparseResults].filter((l) => l.length > 0);
      fusedPoints = nonEmpty.length > 0 ? rrfFuse(nonEmpty, this.rrfK) : [];
    }

    const denseIndex = new Map(
      denseResults.map((p, rank) => [String(p.id), { rank, score: p.score }])
    );
    const sparseIndex = new Map(
      sparseResults.map((p, rank) => [String(p.id), { rank, score: p.score }])
    );
    const pointIndex = new Map(
      [...denseResults, ...sparseResults].map((p) => [String(p.id), p])
    );

    return fusedPoints.slice(0, limit).map(({ id, rrfScore, point }) => {
      const denseHit = denseIndex.get(id);
      const sparseHit = sparseIndex.get(id);
      const payload = (point ?? pointIndex.get(id))?.payload;
      const memoryId = typeof payload?.memory_id === "string" ? payload.memory_id : id;

      const streams: MemorySearchStreams = {};
      if (denseHit) {
        streams.dense = {
          rank: denseHit.rank,
          score: denseHit.score,
          embeddingModel: this.embeddingModel,
          vectorName: DENSE_VECTOR_NAME
        };
      }
      if (sparseHit) {
        streams.sparse = {
          rank: sparseHit.rank,
          score: sparseHit.score,
          sparseModel: "qdrant/bm25",
          vectorName: SPARSE_VECTOR_NAME
        };
      }

      return {
        memoryId,
        score: rrfScore,
        streams,
        backend: "lore-hybrid" as const
      };
    });
  }
}
