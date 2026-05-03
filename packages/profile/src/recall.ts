import { countApproxTokens, type MemoryHit, type SourceRef } from "@lore/shared";
import type {
  LoreProfile,
  ProfileItem,
  RecallContextItem,
  RecallContextRequest,
  RecallContextResponse
} from "./types.js";

/**
 * Recall context composer.
 *
 * Inputs:
 *   - optional precomputed BM25/vector hits (from search package);
 *   - optional profile (from caller's vault store).
 *
 * Outputs a single context block plus per-item slices, source refs, and
 * warnings. The composer never calls a model; it only assembles, ranks,
 * filters, and budget-trims existing material.
 */

const DEFAULT_TOKEN_BUDGET = 1200;
const STALE_RISK_TAGS = new Set([
  "untrusted_source",
  "stale",
  "outdated",
  "low_confidence",
  "needs_review",
  "api_key",
  "aws_access_key",
  "password",
  "private_key"
]);

function isStaleOrRisky(tags: string[]): boolean {
  return tags.some((tag) => STALE_RISK_TAGS.has(tag));
}

function isExpired(item: { validUntil?: string | null }, nowIso: string): boolean {
  return Boolean(item.validUntil && item.validUntil < nowIso);
}

function pickProfileItems(profile: LoreProfile | undefined, projectId?: string): { staticItems: ProfileItem[]; dynamicItems: ProfileItem[] } {
  if (!profile) return { staticItems: [], dynamicItems: [] };
  const staticItems = profile.static.filter((i) => i.status === "active");
  const dynamicItems = profile.dynamic.filter((i) => i.status === "active");
  if (projectId) {
    const project = profile.projects.find((p) => p.projectId === projectId);
    if (project) {
      const projectItems = project.items.filter((i) => i.status === "active");
      const projectStatic = projectItems.filter((i) => i.type === "identity" || i.type === "constraint");
      const projectDynamic = projectItems.filter((i) => i.type !== "identity" && i.type !== "constraint");
      return {
        staticItems: [...staticItems, ...projectStatic],
        dynamicItems: [...dynamicItems, ...projectDynamic]
      };
    }
  }
  return { staticItems, dynamicItems };
}

function profileItemToContextItem(item: ProfileItem, nowIso: string, allowRisky: boolean): RecallContextItem | null {
  const expired = isExpired(item, nowIso);
  const risky = isStaleOrRisky(item.riskTags);
  if (expired) return null;
  if (risky && !allowRisky) return null;

  const text = `${item.type}: ${item.value}`;
  const tokens = countApproxTokens(text);
  const warnings: string[] = [];
  if (risky) warnings.push(`profile item carries risk tags: ${item.riskTags.join(", ")}`);

  return {
    source: "profile",
    text,
    tokens,
    memoryIds: item.sourceMemoryIds,
    profileItemId: item.id,
    riskTags: item.riskTags,
    warnings
  };
}

function memoryHitToContextItem(hit: MemoryHit, nowIso: string, allowRisky: boolean, citationsRequired: boolean): { item: RecallContextItem | null; warnings: string[] } {
  const warnings: string[] = [];
  const expired = isExpired(hit.memory, nowIso);
  const risky = isStaleOrRisky(hit.memory.riskTags);
  const noCitations = hit.memory.sourceRefs.length === 0;

  if (hit.memory.status !== "active" && hit.memory.status !== "confirmed") {
    return { item: null, warnings: [`skipped memory ${hit.memory.id} with status ${hit.memory.status}`] };
  }
  if (expired) {
    return { item: null, warnings: [`skipped expired memory ${hit.memory.id}`] };
  }
  if (citationsRequired && noCitations) {
    return { item: null, warnings: [`skipped memory ${hit.memory.id} without source refs`] };
  }
  if (risky && !allowRisky) {
    return { item: null, warnings: [`filtered risky memory ${hit.memory.id} (tags: ${hit.memory.riskTags.join(", ")})`] };
  }
  if (risky) warnings.push(`memory ${hit.memory.id} carries risk tags: ${hit.memory.riskTags.join(", ")}`);

  const text = `${hit.memory.memoryType}: ${hit.memory.content}`;
  const tokens = countApproxTokens(text);
  return {
    item: {
      source: hit.backend === "vector" ? "memory_vector" : "memory_bm25",
      text,
      tokens,
      memoryIds: [hit.memory.id],
      riskTags: hit.memory.riskTags,
      warnings: risky ? [...warnings] : []
    },
    warnings
  };
}

export function composeRecallContext(request: RecallContextRequest): RecallContextResponse {
  const now = request.now ?? new Date();
  const nowIso = now.toISOString();
  const tokenBudget = request.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
  const allowRisky = Boolean(request.allowRisky);
  const includeProfile = request.includeProfile !== false;
  const citationsRequired = Boolean(request.citationsRequired);

  const warnings: string[] = [];
  const items: RecallContextItem[] = [];
  const sourceRefs: SourceRef[] = [];
  const usedMemoryIds = new Set<string>();
  const acceptedHits: MemoryHit[] = [];

  const { staticItems, dynamicItems } = includeProfile
    ? pickProfileItems(request.profile, request.projectId)
    : { staticItems: [], dynamicItems: [] };

  let tokensUsed = 0;
  let truncated = false;

  function tryAdd(item: RecallContextItem): boolean {
    if (tokensUsed + item.tokens > tokenBudget) {
      truncated = true;
      return false;
    }
    items.push(item);
    tokensUsed += item.tokens;
    if (item.warnings.length > 0) warnings.push(...item.warnings);
    return true;
  }

  if (includeProfile) {
    for (const profileItem of staticItems) {
      const ctx = profileItemToContextItem(profileItem, nowIso, allowRisky);
      if (!ctx) continue;
      if (!tryAdd(ctx)) break;
    }
    if (!truncated) {
      const sortedDynamic = [...dynamicItems].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      for (const profileItem of sortedDynamic) {
        const ctx = profileItemToContextItem(profileItem, nowIso, allowRisky);
        if (!ctx) continue;
        if (!tryAdd(ctx)) break;
      }
    }
  }

  if (!truncated) {
    const hits = [...(request.memoryHits ?? [])].sort((a, b) => b.score - a.score);
    for (const hit of hits) {
      if (usedMemoryIds.has(hit.memory.id)) continue;
      const { item, warnings: hitWarnings } = memoryHitToContextItem(hit, nowIso, allowRisky, citationsRequired);
      if (hitWarnings.length > 0) warnings.push(...hitWarnings);
      if (!item) continue;
      if (!tryAdd(item)) break;
      usedMemoryIds.add(hit.memory.id);
      acceptedHits.push(hit);
      for (const ref of hit.memory.sourceRefs) sourceRefs.push(ref);
    }
  }

  const contextBlock = items.map((i) => `- ${i.text}`).join("\n");

  return {
    vaultId: request.vaultId,
    projectId: request.projectId,
    contextBlock,
    staticItems,
    dynamicItems,
    memoryHits: acceptedHits,
    items,
    sourceRefs,
    warnings,
    tokensUsed,
    tokenBudget,
    truncated,
    generatedAt: nowIso
  };
}

/**
 * Convenience: compute a profile prefetch payload (static + dynamic) without
 * memory hits. Cloud platform can call this from a fast endpoint that does
 * not need search.
 */
export function prefetchProfile(profile: LoreProfile, projectId?: string): { staticItems: ProfileItem[]; dynamicItems: ProfileItem[] } {
  return pickProfileItems(profile, projectId);
}
