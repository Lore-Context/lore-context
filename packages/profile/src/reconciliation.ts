import type { ProfileItem, ReconciliationResult } from "./types.js";

/**
 * Reconciliation helpers for profile items.
 *
 * - merge duplicates by (type, normalized value);
 * - supersede earlier items when a newer item carries a corrective marker;
 * - expire items past their validUntil;
 * - flag contradictions when two active items in the same type disagree.
 */

const CORRECTION_MARKERS = [
  /\bactually\b/i,
  /\bcorrect(?:ion)?\b/i,
  /\bupdate(?:d)?\b/i,
  /\bnow i\b/i,
  /\binstead\b/i,
  /\bno longer\b/i
];

const NEGATIONS = [/\bnot\b/i, /\bnever\b/i, /\bno longer\b/i, /\bdon'?t\b/i, /\bdo not\b/i];
const QUANTIFIER_FILLERS = [/\balways\b/gi, /\busually\b/gi, /\btypically\b/gi, /\boften\b/gi, /\bsometimes\b/gi];

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isCorrection(item: ProfileItem): boolean {
  return CORRECTION_MARKERS.some((p) => p.test(item.value));
}

function isNegationOf(a: string, b: string): boolean {
  const aNeg = NEGATIONS.some((p) => p.test(a));
  const bNeg = NEGATIONS.some((p) => p.test(b));
  if (aNeg === bNeg) return false;

  const stripped = (text: string) => {
    let out = text;
    for (const p of NEGATIONS) out = out.replace(p, "");
    for (const p of QUANTIFIER_FILLERS) out = out.replace(p, "");
    return out.replace(/[.!?]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  };

  const aBase = stripped(a);
  const bBase = stripped(b);
  if (!aBase || !bBase) return false;
  return aBase === bBase || aBase.includes(bBase) || bBase.includes(aBase);
}

interface ReconcileOptions {
  now?: Date;
}

export function reconcileProfileItems(
  current: ProfileItem[],
  incoming: ProfileItem[],
  options: ReconcileOptions = {}
): ReconciliationResult<ProfileItem> {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  const result: ReconciliationResult<ProfileItem> = {
    kept: [],
    merged: [],
    superseded: [],
    expired: [],
    contradictions: []
  };

  const all = [...current, ...incoming];
  const groups = new Map<string, ProfileItem[]>();
  for (const item of all) {
    const key = `${item.type}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  for (const [, items] of groups) {
    const dupGroups = new Map<string, ProfileItem[]>();
    for (const item of items) {
      const key = normalize(item.value);
      const list = dupGroups.get(key) ?? [];
      list.push(item);
      dupGroups.set(key, list);
    }

    const survivors: ProfileItem[] = [];
    for (const [, list] of dupGroups) {
      const sorted = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const winner = sorted[0];
      const absorbed = sorted.slice(1);
      if (absorbed.length > 0) {
        const winnerSourceIds = new Set(winner.sourceMemoryIds);
        for (const a of absorbed) for (const id of a.sourceMemoryIds) winnerSourceIds.add(id);
        const merged: ProfileItem = {
          ...winner,
          sourceMemoryIds: Array.from(winnerSourceIds),
          confidence: Math.min(0.99, Math.max(winner.confidence, ...absorbed.map((a) => a.confidence)) + 0.05 * absorbed.length),
          updatedAt: nowIso
        };
        result.merged.push({ winner: merged, absorbed });
        survivors.push(merged);
      } else {
        survivors.push(winner);
      }
    }

    survivors.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    const active: ProfileItem[] = [];
    for (const item of survivors) {
      if (item.status === "deleted" || item.status === "expired" || item.status === "superseded") {
        continue;
      }

      if (item.validUntil && item.validUntil < nowIso) {
        const expired: ProfileItem = { ...item, status: "expired", updatedAt: nowIso };
        result.expired.push(expired);
        continue;
      }

      let supersededByCorrection = false;
      for (let i = 0; i < active.length; i += 1) {
        const prev = active[i];
        const negation = isNegationOf(prev.value, item.value);
        const correction = isCorrection(item) && normalize(item.value) !== normalize(prev.value);

        if (negation || correction) {
          const next: ProfileItem = {
            ...item,
            status: "active",
            sourceMemoryIds: Array.from(new Set([...prev.sourceMemoryIds, ...item.sourceMemoryIds])),
            updatedAt: nowIso
          };
          const previous: ProfileItem = {
            ...prev,
            status: "superseded",
            supersededBy: next.id,
            updatedAt: nowIso
          };
          result.superseded.push({ next, previous });
          active.splice(i, 1, next);
          supersededByCorrection = true;
          break;
        }
      }

      if (supersededByCorrection) continue;

      const conflict = active.find((p) => normalize(p.value) !== normalize(item.value) && hasConflict(p, item));
      if (conflict) {
        result.contradictions.push({ a: conflict, b: item, reason: "conflicting active values for same profile type" });
      }

      active.push(item);
    }

    result.kept.push(...active);
  }

  return result;
}

function hasConflict(a: ProfileItem, b: ProfileItem): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "preference" || a.type === "constraint" || a.type === "workflow") {
    return isNegationOf(a.value, b.value);
  }
  return false;
}

/**
 * Drop items whose validUntil is in the past. Returns surviving items and
 * the expired ones with their status updated.
 */
export function expireTemporaryItems(items: ProfileItem[], now: Date = new Date()): { active: ProfileItem[]; expired: ProfileItem[] } {
  const nowIso = now.toISOString();
  const active: ProfileItem[] = [];
  const expired: ProfileItem[] = [];
  for (const item of items) {
    if (item.validUntil && item.validUntil < nowIso) {
      expired.push({ ...item, status: "expired", updatedAt: nowIso });
    } else {
      active.push(item);
    }
  }
  return { active, expired };
}
