// Lore v1.4 Lane B Phase 1.7a — DiagnosticsCollector unit tests.

import { describe, expect, it } from "vitest";
import {
  DiagnosticsCollector,
  type CollectedStreamEvent,
} from "../src/diagnostics-collector-v14.js";

const baseEvent: CollectedStreamEvent = {
  kind: "qdrant_dense",
  backend: "qdrant",
  status: "ok",
  candidateCount: 10,
  latencyMs: 42,
};

describe("DiagnosticsCollector", () => {
  it("snapshot() returns empty array before any capture", () => {
    const c = new DiagnosticsCollector();
    expect(c.snapshot()).toEqual([]);
  });

  it("capture + snapshot preserves all fields", () => {
    const c = new DiagnosticsCollector();
    c.capture(baseEvent);
    const snap = c.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0]).toEqual(baseEvent);
  });

  it("snapshot() returns a deep copy — mutating the result does not affect the next snapshot", () => {
    const c = new DiagnosticsCollector();
    c.capture({ ...baseEvent });
    const snap1 = c.snapshot();
    snap1[0].latencyMs = 9999;
    const snap2 = c.snapshot();
    expect(snap2[0].latencyMs).toBe(42);
  });

  it("multiple captures preserve insertion order", () => {
    const c = new DiagnosticsCollector();
    const events: CollectedStreamEvent[] = [
      { kind: "qdrant_dense", backend: "qdrant", status: "ok", latencyMs: 10 },
      { kind: "postgres_fts", backend: "postgres", status: "timed_out", latencyMs: 1500 },
      { kind: "graph", backend: "postgres", status: "failed", latencyMs: 5, error: "oops" },
    ];
    for (const e of events) c.capture(e);
    const snap = c.snapshot();
    expect(snap).toHaveLength(3);
    expect(snap[0].kind).toBe("qdrant_dense");
    expect(snap[1].kind).toBe("postgres_fts");
    expect(snap[2].kind).toBe("graph");
  });

  it("reset() clears the buffer so next snapshot returns empty array", () => {
    const c = new DiagnosticsCollector();
    c.capture(baseEvent);
    c.reset();
    expect(c.snapshot()).toEqual([]);
  });

  it("capture stores a copy of the event — mutating the source object does not affect the snapshot", () => {
    const c = new DiagnosticsCollector();
    const ev: CollectedStreamEvent = { ...baseEvent };
    c.capture(ev);
    ev.latencyMs = 9999;
    const snap = c.snapshot();
    expect(snap[0].latencyMs).toBe(42);
  });

  it("captures events with optional fields undefined without errors", () => {
    const c = new DiagnosticsCollector();
    c.capture({ kind: "wiki", backend: "postgres", status: "ok", latencyMs: 20 });
    const snap = c.snapshot();
    expect(snap[0].candidateCount).toBeUndefined();
    expect(snap[0].error).toBeUndefined();
  });
});
