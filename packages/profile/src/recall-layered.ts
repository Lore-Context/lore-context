import type { MemoryHit } from "@lore/shared";
import { composeRecallContext } from "./recall.js";
import type { LoreProfile, RecallContextResponse } from "./types.js";

/**
 * v0.9 layered recall — auto-capture beta plan §4.9.
 *
 * v0.9 retrieval has six layers, each carrying a `sourceTrust` weight that
 * is multiplied into the final ranking score before composition. Layers
 * with higher source trust (pinned memory, profile facts) outrank lower
 * trust layers (browser summaries, untrusted connector documents).
 */

export type RetrievalLayer =
  | "profile"
  | "recent_session"
  | "project_memory"
  | "connector_doc"
  | "browser_summary"
  | "pinned_memory";

export interface LayeredHit {
  layer: RetrievalLayer;
  hit: MemoryHit;
  /** 0..1, how much we trust this layer */
  sourceTrust: number;
  /** ISO timestamp the underlying source was last validated */
  sourceTimestamp?: string;
  /** opaque connector or session ref (e.g. doc id, url, session id) */
  sourceRef?: string;
}

const DEFAULT_LAYER_TRUST: Record<RetrievalLayer, number> = {
  pinned_memory: 1.0,
  profile: 0.95,
  project_memory: 0.85,
  recent_session: 0.75,
  connector_doc: 0.7,
  browser_summary: 0.55
};

export interface LayeredRecallRequest {
  query: string;
  vaultId: string;
  projectId?: string;
  agentType?: string;
  tokenBudget?: number;
  includeProfile?: boolean;
  allowRisky?: boolean;
  citationsRequired?: boolean;
  /** per-layer trust override (omit a key to use the default) */
  trustOverrides?: Partial<Record<RetrievalLayer, number>>;
  /** all hits across all layers - the composer ranks by score*trust */
  hits: LayeredHit[];
  profile?: LoreProfile;
  now?: Date;
}

export interface LayeredRecallResponse extends RecallContextResponse {
  /** parallel array to response.items: which layer each item came from */
  itemLayers: Array<RetrievalLayer | "profile">;
  /** trust score actually applied per memory id */
  appliedTrust: Record<string, number>;
}

/**
 * Compose recall using layered, source-trust-weighted hits. Profile items
 * stay first per recall.ts convention; memory hits come ordered by
 * `score * sourceTrust` desc.
 */
export function composeLayeredRecall(request: LayeredRecallRequest): LayeredRecallResponse {
  const trustForLayer = (layer: RetrievalLayer): number => {
    const override = request.trustOverrides?.[layer];
    if (typeof override === "number" && Number.isFinite(override)) return clamp01(override);
    return DEFAULT_LAYER_TRUST[layer];
  };

  const appliedTrust: Record<string, number> = {};
  const layerByMemoryId = new Map<string, RetrievalLayer>();

  // Re-score: multiply original hit.score by source trust. Keep the original
  // shape (MemoryHit) so the existing composer can consume it.
  const reScored: MemoryHit[] = [];
  for (const layered of request.hits) {
    const trust = trustForLayer(layered.layer);
    const adjusted: MemoryHit = {
      ...layered.hit,
      score: layered.hit.score * trust
    };
    appliedTrust[layered.hit.memory.id] = trust;
    layerByMemoryId.set(layered.hit.memory.id, layered.layer);
    reScored.push(adjusted);
  }

  const base = composeRecallContext({
    query: request.query,
    vaultId: request.vaultId,
    projectId: request.projectId,
    agentType: request.agentType,
    tokenBudget: request.tokenBudget,
    includeProfile: request.includeProfile,
    allowRisky: request.allowRisky,
    citationsRequired: request.citationsRequired,
    memoryHits: reScored,
    profile: request.profile,
    now: request.now
  });

  const itemLayers: Array<RetrievalLayer | "profile"> = base.items.map((item) => {
    if (item.source === "profile") return "profile";
    const memId = item.memoryIds[0];
    if (memId && layerByMemoryId.has(memId)) {
      return layerByMemoryId.get(memId) as RetrievalLayer;
    }
    // fallback when the composer used a memory hit without our layer mapping
    return "recent_session";
  });

  return {
    ...base,
    itemLayers,
    appliedTrust
  };
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
