// Lore Context v1.2 — narrow API-side adapter for Lane B retrieval providers.
//
// Responsibilities (deliberately small):
//   1. Resolve the "in v12 mode" predicate from env (LORE_MEMORY_ENGINE_VERSION).
//   2. Provide a single MemorySearchProviderV12 abstraction the API route can
//      depend on, regardless of whether the underlying provider is the
//      Postgres FTS+pgvector hybrid or the Qdrant v12 hybrid.
//   3. Wrap a MemoryStoreV12 hydrator so the API hands back hits with content
//      pulled from `memory_items` via vault-scoped, id-based hydration —
//      never via a full table scan.
//   4. Build the on-the-wire shape returned by /v1/memory/search and consumed
//      by composeContext in v12 mode. The shape preserves stream metadata so
//      the dashboard can explain "why this hit".

import type {
  MemorySearchHitV12,
  MemorySearchInputV12
} from "@lore/search";
import type {
  MemoryStoreV12,
  MemoryV12Hydration
} from "./db/memory-store-v12.js";

export const V12_BACKEND_LABEL = "lore-v12-hybrid";

export function isV12EngineMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.LORE_MEMORY_ENGINE_VERSION === "v12" || env.LORE_MEMORY_ENGINE_VERSION === "v13";
}

export interface MemorySearchProviderV12 {
  readonly name: string;
  search(input: MemorySearchInputV12): Promise<MemorySearchHitV12[]>;
}

export interface V12SearchHit {
  itemId: string;
  chunkId?: string;
  score: number;
  backend: typeof V12_BACKEND_LABEL;
  streams: MemorySearchHitV12["streams"];
  lifecycle: MemorySearchHitV12["lifecycle"];
  provenance: MemorySearchHitV12["provenance"];
  content: string;
  memoryType: string;
  projectId?: string | null;
  riskTags: string[];
}

export interface V12SearchEnvelope {
  hits: V12SearchHit[];
  backend: typeof V12_BACKEND_LABEL;
  engineVersion: "v12";
  vaultId: string;
  candidateCount: number;
  /** Set by SearchAdapterV14 when a post-fusion reranker was applied. */
  rerankerUsed?: boolean;
}

export interface ResolveVaultOptions {
  // Cloud-issued auth context (preferred; carries an authenticated vault).
  cloudVaultId?: string | null;
  // Local/dev fallback: derive a deterministic local vault id when no cloud
  // session exists. Caller passes a stable seed (api key id, project id, etc).
  localSeed?: string | null;
  env?: NodeJS.ProcessEnv;
}

const LOCAL_DEFAULT_VAULT_ID = "local-dev-vault";

// Vault id resolution — never trust a request body for vaultId. Prefer cloud
// auth, fall back to the local-dev deterministic id when no cloud session is
// available. This matches the local/dev semantics elsewhere in the codebase.
export function resolveV12VaultId(options: ResolveVaultOptions = {}): string {
  if (options.cloudVaultId && options.cloudVaultId.length > 0) {
    return options.cloudVaultId;
  }
  const env = options.env ?? process.env;
  const explicit = env.LORE_LOCAL_DEV_VAULT_ID;
  if (explicit && explicit.length > 0) {
    return explicit;
  }
  if (options.localSeed && options.localSeed.length > 0) {
    return `local-${options.localSeed}`;
  }
  return LOCAL_DEFAULT_VAULT_ID;
}

export interface SearchAndHydrateOptions {
  provider: MemorySearchProviderV12;
  store: MemoryStoreV12;
  input: MemorySearchInputV12;
}

// Run the v12 provider, then hydrate the resulting item ids via the scoped
// store lookup. Items that the store cannot return for the same vault and
// project scope are dropped silently — exactly the behaviour the security
// review asks for: cross-tenant leakage is impossible at the hydration
// boundary even if an upstream provider returns poisoned candidates.
export async function searchAndHydrateV12(
  options: SearchAndHydrateOptions
): Promise<V12SearchEnvelope> {
  const { provider, store, input } = options;
  if (!input.vaultId) {
    throw new Error("searchAndHydrateV12 requires input.vaultId from the authenticated session");
  }
  const providerHits = await provider.search(input);
  const itemIds = providerHits.map((hit) => hit.itemId);
  const hydrationRows = itemIds.length > 0
    ? await store.listV12SearchHydrationByIds(input.vaultId, itemIds, {
      projectId: input.projectId ?? null,
      allowedProjectIds: input.allowedProjectIds ?? null
    })
    : [];
  const hydrationById = new Map<string, MemoryV12Hydration>(
    hydrationRows.map((row) => [row.itemId, row])
  );

  const hits: V12SearchHit[] = [];
  for (const hit of providerHits) {
    const hydration = hydrationById.get(hit.itemId);
    if (!hydration) continue;
    hits.push({
      itemId: hit.itemId,
      chunkId: hit.chunkId,
      score: hit.score,
      backend: V12_BACKEND_LABEL,
      streams: hit.streams,
      lifecycle: {
        ...hit.lifecycle,
        status: hit.lifecycle?.status ?? hydration.status,
        validFrom: hit.lifecycle?.validFrom ?? hydration.validFrom,
        validUntil: hit.lifecycle?.validUntil ?? hydration.validUntil,
        supersededBy: hit.lifecycle?.supersededBy ?? hydration.supersededBy
      },
      provenance: {
        episodeIds: hit.provenance?.episodeIds?.length
          ? hit.provenance.episodeIds
          : hydration.episodeIds,
        sourceRefs: hit.provenance?.sourceRefs?.length
          ? hit.provenance.sourceRefs
          : hydration.sourceRefs,
        relationIds: hit.provenance?.relationIds,
        wikiPageIds: hit.provenance?.wikiPageIds
      },
      content: hydration.content,
      memoryType: hydration.memoryType,
      projectId: hydration.projectId ?? null,
      riskTags: hydration.riskTags
    });
  }

  return {
    hits,
    backend: V12_BACKEND_LABEL,
    engineVersion: "v12",
    vaultId: input.vaultId,
    candidateCount: providerHits.length
  };
}
