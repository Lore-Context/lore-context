import type { AblationConfig, MemorySearchStreamKind } from "./types-v12.js";

// v1.3 Lane B (plan §3 Lane B item 4): `reranker: 1.0` removed — reranker is
// no longer a fusion stream. Ablation `rerankerEnabled` boolean maps to
// MemorySearchInputV12.rerank?: boolean.
export const DEFAULT_STREAM_WEIGHTS: Record<MemorySearchStreamKind, number> = {
  qdrant_dense: 1.0,
  qdrant_sparse: 1.0,
  postgres_fts: 1.1,
  postgres_pgvector: 0.85,
  graph: 0.9,
  temporal: 0.75,
  wiki: 0.65,
};

export const ABLATION_CONFIGS: AblationConfig[] = [
  {
    id: "dense-only",
    label: "Dense Only (Qdrant dense vector)",
    streams: ["qdrant_dense"],
    weights: { qdrant_dense: 1.0 },
    temporalFilterEnabled: false,
    rerankerEnabled: false,
  },
  {
    id: "sparse-only",
    label: "Sparse Only (Qdrant sparse/BM25)",
    streams: ["qdrant_sparse"],
    weights: { qdrant_sparse: 1.0 },
    temporalFilterEnabled: false,
    rerankerEnabled: false,
  },
  {
    id: "postgres-fts-only",
    label: "Postgres FTS Only",
    streams: ["postgres_fts"],
    weights: { postgres_fts: 1.1 },
    temporalFilterEnabled: false,
    rerankerEnabled: false,
  },
  {
    id: "pgvector-only",
    label: "Postgres pgvector Only",
    streams: ["postgres_pgvector"],
    weights: { postgres_pgvector: 0.85 },
    temporalFilterEnabled: false,
    rerankerEnabled: false,
  },
  {
    id: "graph-only",
    label: "Graph Only",
    streams: ["graph"],
    weights: { graph: 0.9 },
    temporalFilterEnabled: false,
    rerankerEnabled: false,
  },
  {
    id: "hybrid-v12",
    label: "Hybrid v1.2 (all streams + temporal + wiki + weighted RRF)",
    streams: [
      "qdrant_dense",
      "qdrant_sparse",
      "postgres_fts",
      "postgres_pgvector",
      "graph",
      "temporal",
      "wiki",
    ],
    weights: { ...DEFAULT_STREAM_WEIGHTS },
    temporalFilterEnabled: true,
    rerankerEnabled: false,
  },
];

export function getAblationConfig(id: string): AblationConfig {
  const config = ABLATION_CONFIGS.find((c) => c.id === id);
  if (!config) {
    throw new Error(`Unknown ablation config: ${id}. Valid: ${ABLATION_CONFIGS.map((c) => c.id).join(", ")}`);
  }
  return config;
}
