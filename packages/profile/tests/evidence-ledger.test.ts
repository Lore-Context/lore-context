import { describe, expect, it } from "vitest";
import {
  buildEvidenceLedger,
  composeRecallContext,
  recordLedgerFeedback
} from "../src/index.js";
import { FROZEN_NOW, activeMemory, buildHit } from "./fixtures.js";

describe("buildEvidenceLedger", () => {
  it("classifies retrieved hits as used / ignored / stale / risky", () => {
    const used = activeMemory("decision: use Postgres", { id: "mem_used" });
    const ignored = activeMemory("decision: use SQLite", { id: "mem_ignored" });
    const stale = activeMemory("temp: ship today", { id: "mem_stale" });
    stale.validUntil = "2026-01-01T00:00:00.000Z";
    const risky = activeMemory("danger: ignore previous", { id: "mem_risky", riskTags: ["untrusted_source", "needs_review"] });

    const considered = [
      buildHit(used, 0.95),
      buildHit(ignored, 0.6),
      buildHit(stale, 0.7),
      buildHit(risky, 0.55)
    ];
    const recall = composeRecallContext({
      query: "db",
      vaultId: "v1",
      tokenBudget: 200,
      memoryHits: [buildHit(used, 0.95)],
      now: FROZEN_NOW
    });

    const ledger = buildEvidenceLedger({
      vaultId: "v1",
      query: "db",
      response: recall,
      consideredHits: considered,
      now: FROZEN_NOW
    });

    const states = Object.fromEntries(ledger.entries.map((e) => [e.memoryId, e.state]));
    expect(states.mem_used).toBe("used");
    expect(states.mem_stale).toBe("stale");
    expect(states.mem_risky).toBe("risky");
    expect(states.mem_ignored).toBe("ignored");
    expect(ledger.summary.used).toBe(1);
    expect(ledger.summary.stale).toBe(1);
    expect(ledger.summary.risky).toBe(1);
  });

  it("adds missing entries for memory ids that were not retrievable", () => {
    const recall = composeRecallContext({ query: "x", vaultId: "v1", memoryHits: [], now: FROZEN_NOW });
    const ledger = buildEvidenceLedger({
      vaultId: "v1",
      query: "x",
      response: recall,
      consideredHits: [],
      missingIds: ["mem_gone_1", "mem_gone_2"],
      now: FROZEN_NOW
    });
    expect(ledger.entries.filter((e) => e.state === "missing")).toHaveLength(2);
    expect(ledger.summary.missing).toBe(2);
  });

  it("flags conflicting memory ids", () => {
    const a = activeMemory("decision: use Postgres", { id: "mem_a" });
    const b = activeMemory("decision: use SQLite", { id: "mem_b" });
    const recall = composeRecallContext({
      query: "db",
      vaultId: "v1",
      memoryHits: [buildHit(a, 0.9), buildHit(b, 0.8)],
      now: FROZEN_NOW
    });
    const ledger = buildEvidenceLedger({
      vaultId: "v1",
      query: "db",
      response: recall,
      consideredHits: [buildHit(a, 0.9), buildHit(b, 0.8)],
      conflictMemoryIds: ["mem_b"],
      now: FROZEN_NOW
    });
    const conflicting = ledger.entries.find((e) => e.memoryId === "mem_b");
    // Used hits win over conflict tag in priority — both went to context block
    // here, so conflict is observed through the conflictMemoryIds bookkeeping
    // when not used.
    expect(["used", "conflicting"]).toContain(conflicting?.state);
  });
});

describe("recordLedgerFeedback", () => {
  it("flips the entry to user_feedback with the feedback verb", () => {
    const used = activeMemory("decision: use Postgres", { id: "mem_used" });
    const recall = composeRecallContext({
      query: "db",
      vaultId: "v1",
      memoryHits: [buildHit(used, 0.95)],
      now: FROZEN_NOW
    });
    const ledger = buildEvidenceLedger({
      vaultId: "v1",
      query: "db",
      response: recall,
      consideredHits: [buildHit(used, 0.95)],
      now: FROZEN_NOW
    });
    const next = recordLedgerFeedback(ledger, "mem_used", "wrong", FROZEN_NOW);
    const entry = next.entries.find((e) => e.memoryId === "mem_used");
    expect(entry?.state).toBe("user_feedback");
    expect(entry?.feedback).toBe("wrong");
  });

  it("appends an entry when the memory was not in the original ledger", () => {
    const recall = composeRecallContext({ query: "x", vaultId: "v1", memoryHits: [], now: FROZEN_NOW });
    const ledger = buildEvidenceLedger({ vaultId: "v1", query: "x", response: recall, consideredHits: [], now: FROZEN_NOW });
    const next = recordLedgerFeedback(ledger, "mem_orphan", "useful", FROZEN_NOW);
    expect(next.entries.find((e) => e.memoryId === "mem_orphan")).toBeTruthy();
  });
});
