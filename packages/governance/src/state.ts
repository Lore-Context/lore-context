import { scanRiskTags, shouldRequireReview } from "./risk.js";

export type GovState = "candidate" | "active" | "flagged" | "redacted" | "superseded" | "deleted";

const ALLOWED_TRANSITIONS: ReadonlyMap<GovState, ReadonlySet<GovState>> = new Map([
  ["candidate", new Set<GovState>(["active", "flagged", "redacted"])],
  ["active", new Set<GovState>(["flagged", "superseded", "deleted"])],
  ["flagged", new Set<GovState>(["active", "redacted", "deleted"])],
  ["redacted", new Set<GovState>(["deleted"])],
  ["superseded", new Set<GovState>()],
  ["deleted", new Set<GovState>()]
]);

export function canTransition(from: GovState, to: GovState): boolean {
  return ALLOWED_TRANSITIONS.get(from)?.has(to) ?? false;
}

export function transition(from: GovState, to: GovState): GovState {
  if (!canTransition(from, to)) {
    throw new Error(`illegal governance transition: ${from} → ${to}`);
  }
  return to;
}

export function classifyRisk(content: string): { state: GovState; risk_tags: string[] } {
  const risk_tags = scanRiskTags(content);

  let state: GovState;
  if (shouldRequireReview(risk_tags)) {
    state = "redacted";
  } else if (risk_tags.length > 0) {
    state = "flagged";
  } else {
    state = "candidate";
  }

  return { state, risk_tags };
}

export function detectPoisoning(
  memory: { content: string; sourceProvider?: string },
  neighbors: Array<{ content: string; sourceProvider?: string }>
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // same-source dominance heuristic: >80% of neighbors share the same sourceProvider
  if (neighbors.length > 0 && memory.sourceProvider) {
    const sameSource = neighbors.filter((n) => n.sourceProvider === memory.sourceProvider).length;
    if (sameSource / neighbors.length > 0.8) {
      reasons.push(`same-source dominance: ${sameSource}/${neighbors.length} neighbors share provider "${memory.sourceProvider}"`);
    }
  }

  // imperative verb targeting agent behavior
  const POISONING_PATTERNS = [
    /ignore\s+previous/i,
    /always\s+say/i,
    /never\s+say/i,
    /disregard\s+(?:all\s+)?(?:prior|previous|above)/i,
    /forget\s+(?:all\s+)?(?:prior|previous|above|instructions)/i,
    /from\s+now\s+on\s+(?:always|never)/i,
    /override\s+(?:your\s+)?instructions/i,
    /you\s+must\s+(?:always|never)/i
  ];

  const allContents = [memory, ...neighbors];
  for (const item of allContents) {
    for (const pattern of POISONING_PATTERNS) {
      if (pattern.test(item.content)) {
        reasons.push(`imperative pattern detected: "${pattern.source}"`);
        break;
      }
    }
  }

  return { suspicious: reasons.length > 0, reasons };
}
