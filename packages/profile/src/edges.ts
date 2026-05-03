import { stableMemoryId, type MemoryRecord } from "@lore/shared";

/**
 * memory_edges model - PRD §8.2 Data model + §8.6 Memory extraction.
 *
 * An edge connects two memory_items so that supersession, contradiction, and
 * update relationships are first-class instead of buried in metadata. The
 * recall composer can then warn the agent that a memory has been superseded
 * or that two retrieved memories disagree.
 */

export type MemoryEdgeRelation =
  | "supersedes"
  | "contradicts"
  | "updates"
  | "extends"
  | "duplicates";

export interface MemoryEdge {
  id: string;
  fromMemoryId: string;
  toMemoryId: string;
  relation: MemoryEdgeRelation;
  reason: string;
  confidence: number;
  createdAt: string;
}

export interface MemoryEdgeInferenceInput {
  /** newer/incoming memory */
  next: MemoryRecord;
  /** existing memories that might relate to `next` */
  candidates: MemoryRecord[];
  now?: Date;
}

const NEGATIONS = [/\bnot\b/i, /\bnever\b/i, /\bno longer\b/i, /\bdon'?t\b/i, /\bdo not\b/i];
const CORRECTION_MARKERS = [/\bactually\b/i, /\bcorrection\b/i, /\bupdate(?:d)?\b/i, /\bnow i\b/i, /\binstead\b/i];
const EXTEND_MARKERS = [/\balso\b/i, /\badditionally\b/i, /\bin addition\b/i, /\band\b/i];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[.!?]/g, "").replace(/\s+/g, " ").trim();
}

function stripNegation(text: string): string {
  let out = text;
  for (const p of NEGATIONS) out = out.replace(p, "");
  return out.replace(/\s+/g, " ").trim().toLowerCase();
}

function hasNegation(text: string): boolean {
  return NEGATIONS.some((p) => p.test(text));
}

function shareCore(a: string, b: string): boolean {
  const aBase = stripNegation(a);
  const bBase = stripNegation(b);
  if (!aBase || !bBase) return false;
  const aTokens = new Set(aBase.split(/\s+/).filter((t) => t.length > 3));
  const bTokens = new Set(bBase.split(/\s+/).filter((t) => t.length > 3));
  if (aTokens.size === 0 || bTokens.size === 0) return false;
  let overlap = 0;
  for (const t of aTokens) if (bTokens.has(t)) overlap += 1;
  return overlap / Math.max(aTokens.size, bTokens.size) >= 0.5;
}

function buildEdge(input: {
  fromId: string;
  toId: string;
  relation: MemoryEdgeRelation;
  reason: string;
  confidence: number;
  now: string;
}): MemoryEdge {
  return {
    id: stableMemoryId("edge", `${input.fromId}|${input.relation}|${input.toId}`),
    fromMemoryId: input.fromId,
    toMemoryId: input.toId,
    relation: input.relation,
    reason: input.reason,
    confidence: input.confidence,
    createdAt: input.now
  };
}

/**
 * Deterministic edge inference. The cloud worker will eventually replace this
 * with a model-backed classifier; the contract is identical so the rest of
 * the pipeline does not change.
 */
export function inferEdges(input: MemoryEdgeInferenceInput): MemoryEdge[] {
  const now = (input.now ?? new Date()).toISOString();
  const edges: MemoryEdge[] = [];
  const next = input.next;

  for (const prev of input.candidates) {
    if (prev.id === next.id) continue;
    if (prev.memoryType !== next.memoryType) continue;

    const prevNorm = normalize(prev.content);
    const nextNorm = normalize(next.content);

    if (prevNorm === nextNorm) {
      edges.push(
        buildEdge({
          fromId: next.id,
          toId: prev.id,
          relation: "duplicates",
          reason: "identical normalized content",
          confidence: 0.95,
          now
        })
      );
      continue;
    }

    if (!shareCore(prev.content, next.content)) continue;

    const prevHasNeg = hasNegation(prev.content);
    const nextHasNeg = hasNegation(next.content);
    const isCorrection = CORRECTION_MARKERS.some((p) => p.test(next.content));

    if (prevHasNeg !== nextHasNeg) {
      // Contradicting polarities sharing the same core verb. If `next` is a
      // correction-marker sentence, prefer "supersedes" (next replaces prev).
      if (isCorrection) {
        edges.push(
          buildEdge({
            fromId: next.id,
            toId: prev.id,
            relation: "supersedes",
            reason: "newer corrective statement reverses earlier polarity",
            confidence: 0.8,
            now
          })
        );
      } else {
        edges.push(
          buildEdge({
            fromId: next.id,
            toId: prev.id,
            relation: "contradicts",
            reason: "polarity conflict on shared core",
            confidence: 0.7,
            now
          })
        );
      }
      continue;
    }

    if (isCorrection) {
      edges.push(
        buildEdge({
          fromId: next.id,
          toId: prev.id,
          relation: "updates",
          reason: "correction marker on shared core",
          confidence: 0.75,
          now
        })
      );
      continue;
    }

    if (EXTEND_MARKERS.some((p) => p.test(next.content)) && nextNorm.includes(prevNorm.split(" ")[0] ?? "")) {
      edges.push(
        buildEdge({
          fromId: next.id,
          toId: prev.id,
          relation: "extends",
          reason: "next adds to prev with extension marker",
          confidence: 0.6,
          now
        })
      );
    }
  }

  return edges;
}

/**
 * Group edges by relation so dashboards can show conflict/supersession
 * counts without scanning the full edge list each time.
 */
export function groupEdgesByRelation(edges: MemoryEdge[]): Record<MemoryEdgeRelation, MemoryEdge[]> {
  const out: Record<MemoryEdgeRelation, MemoryEdge[]> = {
    supersedes: [],
    contradicts: [],
    updates: [],
    extends: [],
    duplicates: []
  };
  for (const e of edges) out[e.relation].push(e);
  return out;
}
