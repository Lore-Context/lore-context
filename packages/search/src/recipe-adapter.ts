// Lore v2.0.9 — Wave 0: Recipe → SearchAdapterV14Config mapping (BRA-633).
//
// Maps a ContextRecipeSpec (the JSON-serializable recipe knob surface) to
// a SearchAdapterV14Config without duplicating the fusion logic that lives
// inside the HybridSearchOrchestrator / SearchAdapterV14 constructor.
//
// Design invariants:
//   * This module is PURE — it takes a recipe spec and returns a config
//     object. It does NOT instantiate SearchAdapterV14, mutate global state,
//     or duplicate the stream-provider wiring in search-adapter-v14.ts.
//   * Unknown or missing stream kinds in weights are silently dropped.
//   * The `pool` field is intentionally absent — SearchAdapterV14Config
//     requires a pool, but the recipe doesn't own infrastructure. Callers
//     merge the recipe-derived config with their own pool/Qdrant/embedding
//     instances.

import type { SearchAdapterV14Config } from "./search-adapter-v14.js";
import type {
  MemorySearchStreamKindV12,
} from "./memory-search-v12.js";
import { DEFAULT_RRF_K } from "./memory-search-v12.js";

// ─────────────────────────────────────────────────────────────────────────
// Minimal recipe shape for mapping — intentionally decoupled from the
// @lore/eval package to avoid a cross-package import that would create a
// circular dependency risk. The eval package may import this mapping,
// but this module only depends on @lore/search internals.
// ─────────────────────────────────────────────────────────────────────────

export interface RecipeKnobs {
  enabledStreams?: ReadonlyArray<string>;
  weights?: Record<string, number>;
  temporalFilterEnabled?: boolean;
  rerankerEnabled?: boolean;
  rrfK?: number;
  perStreamTimeoutMs?: number | null;
  candidateLimit?: number;
  finalLimit?: number;
  minPipelineVersion?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Mapping function.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Map recipe retrieval knobs to a partial SearchAdapterV14Config, leaving
 * infrastructure fields (pool, qdrantClient, embeddingFn, etc.) for the
 * caller to supply.
 *
 * Fusion logic (RRF weights, stream-provider wiring, orchestrator timeouts)
 * is NOT duplicated here — those are owned by SearchAdapterV14's constructor
 * and HybridSearchOrchestrator. This function only translates the knob
 * surface.
 */
export function mapRecipeToAdapterConfig(
  recipe: RecipeKnobs,
): Pick<
  SearchAdapterV14Config,
  | "enabledStreams"
  | "weights"
  | "rrfK"
  | "perStreamTimeoutMs"
> {
  const validStreamKinds = new Set<MemorySearchStreamKindV12>([
    "postgres_fts",
    "postgres_pgvector",
    "qdrant_dense",
    "qdrant_sparse",
    "graph",
    "temporal",
    "wiki",
  ]);

  const enabledStreams: MemorySearchStreamKindV12[] = recipe.enabledStreams
    ? recipe.enabledStreams.filter(
        (s): s is MemorySearchStreamKindV12 => validStreamKinds.has(s as MemorySearchStreamKindV12),
      )
    : [...validStreamKinds];

  const weights: Partial<Record<MemorySearchStreamKindV12, number>> = {};
  if (recipe.weights) {
    for (const [stream, weight] of Object.entries(recipe.weights)) {
      if (validStreamKinds.has(stream as MemorySearchStreamKindV12)) {
        weights[stream as MemorySearchStreamKindV12] = weight;
      }
    }
  }

  return {
    enabledStreams: enabledStreams.length > 0 ? enabledStreams : undefined,
    weights: Object.keys(weights).length > 0 ? weights : undefined,
    rrfK: recipe.rrfK,
    perStreamTimeoutMs: recipe.perStreamTimeoutMs,
  };
}

/**
 * Merge recipe knobs with a base adapter config, producing a complete
 * SearchAdapterV14Config suitable for constructing a SearchAdapterV14.
 *
 * The base config provides the infrastructure deps (pool, clients, embedding
 * functions, etc.). The recipe provides retrieval tuning knobs. The recipe
 * knobs take precedence over base config for retrieval fields.
 */
export function mergeRecipeWithBaseConfig(
  recipe: RecipeKnobs,
  base: Partial<SearchAdapterV14Config> & Pick<SearchAdapterV14Config, "pool">,
): SearchAdapterV14Config {
  const mapped = mapRecipeToAdapterConfig(recipe);

  return {
    ...base,
    enabledStreams: mapped.enabledStreams ?? base.enabledStreams,
    weights: mapped.weights ?? base.weights,
    rrfK: mapped.rrfK ?? base.rrfK ?? DEFAULT_RRF_K,
    perStreamTimeoutMs:
      mapped.perStreamTimeoutMs !== undefined
        ? mapped.perStreamTimeoutMs
        : (base.perStreamTimeoutMs ?? undefined),
  };
}
