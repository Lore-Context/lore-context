import type { LoreProfile, ProfileItem, ProjectProfile } from "./types.js";

/**
 * Profile store helpers - PRD §8.7 Lore Profile.
 *
 * Profile regeneration must preserve **explicit user edits** unless the user
 * resets them. We track edited items via metadata.userEdited and skip them
 * during regeneration.
 *
 * The store also computes a static / dynamic split on demand. Static items
 * are identity + constraint + workflow; dynamic items are active_context and
 * everything else. Project items live under projects[*].items.
 */

// PRD §8.7: static = stable preferences/identity/tools/style; dynamic = focus.
const STATIC_TYPES = new Set(["identity", "constraint", "workflow", "preference"]);

export interface ProfileEditOptions {
  now?: Date;
  /** mark as user-edited so future regenerations skip it. */
  userEdited?: boolean;
  /** carry an edit reason for audit. */
  reason?: string;
}

export interface RegenerateInput {
  current: LoreProfile;
  /** freshly computed items from extraction (untouched by user). */
  generated: ProfileItem[];
  now?: Date;
}

export function buildEmptyProfile(vaultId: string, now: Date = new Date()): LoreProfile {
  return { vaultId, static: [], dynamic: [], projects: [], updatedAt: now.toISOString() };
}

/**
 * Place an item into static/dynamic/project bucket based on type and metadata.
 * Returns a new profile object - never mutates `profile`.
 */
export function placeItem(profile: LoreProfile, item: ProfileItem, now: Date = new Date()): LoreProfile {
  const projectId = readProjectId(item);
  if (projectId) {
    return updateProjectProfile(profile, projectId, item, now);
  }
  if (STATIC_TYPES.has(item.type)) {
    return { ...profile, static: replaceById(profile.static, item), updatedAt: now.toISOString() };
  }
  return { ...profile, dynamic: replaceById(profile.dynamic, item), updatedAt: now.toISOString() };
}

function updateProjectProfile(profile: LoreProfile, projectId: string, item: ProfileItem, now: Date): LoreProfile {
  const projects = profile.projects.slice();
  const idx = projects.findIndex((p) => p.projectId === projectId);
  const repoFingerprint = readRepoFingerprint(item);
  if (idx === -1) {
    const created: ProjectProfile = {
      projectId,
      repoFingerprint,
      items: [item],
      updatedAt: now.toISOString()
    };
    projects.push(created);
  } else {
    const existing = projects[idx];
    const fp = repoFingerprint ?? existing.repoFingerprint;
    projects[idx] = {
      ...existing,
      repoFingerprint: fp,
      items: replaceById(existing.items, item),
      updatedAt: now.toISOString()
    };
  }
  return { ...profile, projects, updatedAt: now.toISOString() };
}

function replaceById(items: ProfileItem[], next: ProfileItem): ProfileItem[] {
  const idx = items.findIndex((i) => i.id === next.id);
  if (idx === -1) return [...items, next];
  const out = items.slice();
  out[idx] = next;
  return out;
}

function readProjectId(item: ProfileItem): string | undefined {
  const meta = item.metadata;
  const value = (meta && (meta as Record<string, unknown>).projectId) as unknown;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readRepoFingerprint(item: ProfileItem): string | undefined {
  const meta = item.metadata;
  const value = (meta && (meta as Record<string, unknown>).repoFingerprint) as unknown;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isUserEdited(item: ProfileItem): boolean {
  const meta = item.metadata;
  return Boolean(meta && (meta as Record<string, unknown>).userEdited === true);
}

/**
 * Apply a user edit to a profile item. The resulting item is marked
 * `userEdited: true` so regeneration skips it.
 */
export function applyUserEdit(
  profile: LoreProfile,
  itemId: string,
  patch: Partial<Pick<ProfileItem, "value" | "type" | "validUntil" | "visibility">>,
  options: ProfileEditOptions = {}
): { profile: LoreProfile; item: ProfileItem; auditNote: string } {
  const now = options.now ?? new Date();
  const found = findItem(profile, itemId);
  if (!found) throw new Error(`profile item ${itemId} not found`);

  const updated: ProfileItem = {
    ...found.item,
    ...patch,
    metadata: { ...found.item.metadata, userEdited: options.userEdited !== false, editedAt: now.toISOString(), editReason: options.reason },
    updatedAt: now.toISOString()
  };

  const next = replaceItem(profile, found, updated, now);
  const auditNote = options.reason ?? `user edit on profile item ${itemId}`;
  return { profile: next, item: updated, auditNote };
}

/**
 * Delete a profile item. Sets status="deleted" so recall filters it out;
 * physical removal can happen at a later sweep.
 */
export function softDeleteItem(profile: LoreProfile, itemId: string, options: ProfileEditOptions = {}): { profile: LoreProfile; item: ProfileItem } {
  const now = options.now ?? new Date();
  const found = findItem(profile, itemId);
  if (!found) throw new Error(`profile item ${itemId} not found`);
  const updated: ProfileItem = {
    ...found.item,
    status: "deleted",
    metadata: { ...found.item.metadata, deletedAt: now.toISOString(), userEdited: true, deleteReason: options.reason },
    updatedAt: now.toISOString()
  };
  return { profile: replaceItem(profile, found, updated, now), item: updated };
}

interface FoundItem {
  item: ProfileItem;
  scope: "static" | "dynamic" | "project";
  projectId?: string;
}

function findItem(profile: LoreProfile, id: string): FoundItem | undefined {
  const inStatic = profile.static.find((i) => i.id === id);
  if (inStatic) return { item: inStatic, scope: "static" };
  const inDynamic = profile.dynamic.find((i) => i.id === id);
  if (inDynamic) return { item: inDynamic, scope: "dynamic" };
  for (const project of profile.projects) {
    const inProject = project.items.find((i) => i.id === id);
    if (inProject) return { item: inProject, scope: "project", projectId: project.projectId };
  }
  return undefined;
}

function replaceItem(profile: LoreProfile, found: FoundItem, next: ProfileItem, now: Date): LoreProfile {
  if (found.scope === "static") {
    return { ...profile, static: profile.static.map((i) => (i.id === next.id ? next : i)), updatedAt: now.toISOString() };
  }
  if (found.scope === "dynamic") {
    return { ...profile, dynamic: profile.dynamic.map((i) => (i.id === next.id ? next : i)), updatedAt: now.toISOString() };
  }
  return {
    ...profile,
    projects: profile.projects.map((project) =>
      project.projectId !== found.projectId
        ? project
        : { ...project, items: project.items.map((i) => (i.id === next.id ? next : i)), updatedAt: now.toISOString() }
    ),
    updatedAt: now.toISOString()
  };
}

/**
 * Regenerate the profile from `generated` items while preserving any
 * `userEdited: true` items. User-edited items survive byte-for-byte.
 *
 * Generated items keyed by `${type}|${value}` collide with existing user-edits
 * are dropped; everything else is merged on id.
 */
export function regenerateProfile(input: RegenerateInput): LoreProfile {
  const now = input.now ?? new Date();
  const userEditedSignatures = new Set<string>();

  const collect = (items: ProfileItem[]): ProfileItem[] =>
    items.filter((i) => {
      if (isUserEdited(i)) {
        userEditedSignatures.add(`${i.type}|${normalizeValue(i.value)}`);
        return true;
      }
      return false;
    });

  const preservedStatic = collect(input.current.static);
  const preservedDynamic = collect(input.current.dynamic);
  const preservedProjects = input.current.projects.map((p) => ({
    ...p,
    items: collect(p.items)
  }));

  let next: LoreProfile = {
    vaultId: input.current.vaultId,
    static: preservedStatic,
    dynamic: preservedDynamic,
    projects: preservedProjects,
    updatedAt: now.toISOString()
  };

  for (const generated of input.generated) {
    const sig = `${generated.type}|${normalizeValue(generated.value)}`;
    if (userEditedSignatures.has(sig)) continue;
    next = placeItem(next, generated, now);
  }

  return next;
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
