// Lore v1.4 Lane B Phase 1.7a — per-stream diagnostics collector.
//
// Lightweight in-request collector that accumulates StreamEvent data emitted
// by HybridSearchOrchestrator.onStreamEvent. Designed to be injected as the
// onStreamEvent hook when the caller opts in via the diagnostics gate.
//
// Guarantees:
//   * snapshot() returns a deep copy — mutations to the caller's array cannot
//     affect internal state.
//   * reset() clears the internal buffer; safe to reuse across requests in
//     long-lived test scenarios.
//   * capture() is synchronous and allocation-light; no Map/Set overhead.

import type { MemorySearchStreamKindV12 } from "./memory-search-v12.js";

export interface CollectedStreamEvent {
  kind: MemorySearchStreamKindV12;
  backend: string;
  status: "ok" | "failed" | "timed_out";
  candidateCount?: number;
  latencyMs: number;
  error?: string;
}

export class DiagnosticsCollector {
  private events: CollectedStreamEvent[] = [];

  capture(event: CollectedStreamEvent): void {
    this.events.push({ ...event });
  }

  /** Returns a deep copy of all captured events in insertion order. */
  snapshot(): CollectedStreamEvent[] {
    return this.events.map((e) => ({ ...e }));
  }

  reset(): void {
    this.events = [];
  }
}
