import { createHash } from "node:crypto";
import type { CaptureProvider, CaptureTurn } from "./types.js";

// Idempotency key combines provider, original session id, and a content hash
// over the canonical-turn sequence. This makes scanner re-runs safe and lets
// the cloud queue dedup `session.ingest` jobs without trusting client clocks.

export function hashContent(turns: CaptureTurn[]): string {
  const hash = createHash("sha256");
  for (const turn of turns) {
    hash.update(`${turn.index}|${turn.role}|`);
    hash.update(turn.text ?? "");
    if (turn.toolCalls && turn.toolCalls.length > 0) {
      hash.update("|tools=");
      for (const call of turn.toolCalls) {
        hash.update(`${call.name}:${call.status ?? "ok"};`);
      }
    }
    hash.update("\n");
  }
  return hash.digest("hex");
}

export function buildIdempotencyKey(
  provider: CaptureProvider,
  originalId: string,
  turns: CaptureTurn[]
): string {
  const content = hashContent(turns);
  // Short prefix keeps logs/debugging readable without losing collision space.
  const prefix = createHash("sha256").update(`${provider}:${originalId}`).digest("hex").slice(0, 16);
  return `cap_${provider}_${prefix}_${content.slice(0, 16)}`;
}

export function canonicalSessionId(provider: CaptureProvider, originalId: string): string {
  return `${provider}:${originalId}`;
}
