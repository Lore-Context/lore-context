import { describe, expect, it } from "vitest";
import {
  applyLifecycleAction,
  captureEvent,
  explainMemoryDecision,
  InMemoryMemoryLifecycleRepository,
  isRecallActive,
  MemoryLifecycleTransitionError,
  suggestCandidate,
  type MemoryLifecycleRecord,
  type MemorySourceInfo
} from "../src/index.js";
import { explainLedgerEntry } from "../src/index.js";
import type { EvidenceLedgerEntry } from "../src/index.js";
import { FROZEN_NOW } from "./fixtures.js";

const SOURCE: MemorySourceInfo = {
  app: "claude_code",
  title: "Project setup session",
  sessionId: "session-abc",
  capturedAt: FROZEN_NOW.toISOString()
};

function makeCapture(overrides: Partial<Parameters<typeof captureEvent>[0]> = {}): MemoryLifecycleRecord {
  return captureEvent({
    vaultId: "vault-1",
    content: "I prefer pnpm over npm.",
    confidence: 0.8,
    source: SOURCE,
    now: FROZEN_NOW,
    ...overrides
  });
}

// ─── captureEvent ─────────────────────────────────────────────────────────────

describe("captureEvent", () => {
  it("creates a record in captured_event state", () => {
    const r = makeCapture();
    expect(r.state).toBe("captured_event");
    expect(r.vaultId).toBe("vault-1");
    expect(r.content).toBe("I prefer pnpm over npm.");
    expect(r.confidence).toBe(0.8);
  });

  it("initialises usage at zero", () => {
    const r = makeCapture();
    expect(r.usage.usageCount).toBe(0);
    expect(r.usage.traceIds).toEqual([]);
    expect(r.usage.lastUsedAt).toBeUndefined();
  });

  it("sets exportPath containing vaultId and id", () => {
    const r = makeCapture();
    expect(r.exportPath).toContain("vault-1");
    expect(r.exportPath).toContain(r.id);
  });

  it("copies source info onto the record", () => {
    const r = makeCapture();
    expect(r.source.app).toBe("claude_code");
    expect(r.source.title).toBe("Project setup session");
    expect(r.source.sessionId).toBe("session-abc");
  });

  it("seeds history with a capture entry", () => {
    const r = makeCapture();
    expect(r.history).toHaveLength(1);
    expect(r.history[0].action).toBe("capture");
  });

  it("applies riskTags when supplied", () => {
    const r = makeCapture({ riskTags: ["untrusted_source"] });
    expect(r.riskTags).toContain("untrusted_source");
  });

  it("defaults privacyState to default", () => {
    const r = makeCapture();
    expect(r.privacyState).toBe("default");
  });
});

// ─── suggestCandidate ─────────────────────────────────────────────────────────

describe("suggestCandidate", () => {
  it("transitions captured_event → suggested_candidate", () => {
    const r = suggestCandidate(makeCapture(), { suggestionReason: "user preference detected", now: FROZEN_NOW });
    expect(r.state).toBe("suggested_candidate");
    expect(r.suggestionReason).toBe("user preference detected");
  });

  it("appends an auto history entry", () => {
    const r = suggestCandidate(makeCapture(), { suggestionReason: "reason", now: FROZEN_NOW });
    const last = r.history.at(-1)!;
    expect(last.action).toBe("auto");
    expect(last.reason).toBe("reason");
  });

  it("throws when called on non-captured_event state", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    expect(() => suggestCandidate(candidate, { suggestionReason: "again" })).toThrow(MemoryLifecycleTransitionError);
  });
});

// ─── applyLifecycleAction — approve ──────────────────────────────────────────

describe("approve action", () => {
  it("suggested_candidate → approved_memory", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    const approved = applyLifecycleAction(candidate, { action: "approve", now: FROZEN_NOW });
    expect(approved.state).toBe("approved_memory");
    expect(isRecallActive(approved)).toBe(true);
  });

  it("stale_memory → approved_memory (re-approve)", () => {
    const stale = applyLifecycleAction(
      applyLifecycleAction(
        suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
        { action: "approve", now: FROZEN_NOW }
      ),
      { action: "mark_outdated", now: FROZEN_NOW }
    );
    expect(stale.state).toBe("stale_memory");
    const restored = applyLifecycleAction(stale, { action: "approve", now: FROZEN_NOW });
    expect(restored.state).toBe("approved_memory");
  });
});

// ─── applyLifecycleAction — edit ─────────────────────────────────────────────

describe("edit action", () => {
  it("suggested_candidate + edit → approved_memory with new content", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    const edited = applyLifecycleAction(candidate, { action: "edit", newContent: "I prefer bun.", now: FROZEN_NOW });
    expect(edited.state).toBe("approved_memory");
    expect(edited.content).toBe("I prefer bun.");
  });

  it("approved_memory + edit stays approved_memory", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const edited = applyLifecycleAction(approved, { action: "edit", newContent: "Updated.", now: FROZEN_NOW });
    expect(edited.state).toBe("approved_memory");
    expect(edited.content).toBe("Updated.");
  });

  it("stale_memory + edit re-approves and updates content", () => {
    const stale = applyLifecycleAction(
      applyLifecycleAction(
        suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
        { action: "approve", now: FROZEN_NOW }
      ),
      { action: "mark_outdated", now: FROZEN_NOW }
    );
    const edited = applyLifecycleAction(stale, { action: "edit", newContent: "Corrected.", now: FROZEN_NOW });
    expect(edited.state).toBe("approved_memory");
    expect(edited.content).toBe("Corrected.");
  });
});

// ─── applyLifecycleAction — reject ───────────────────────────────────────────

describe("reject action", () => {
  it("suggested_candidate → deleted_memory", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    const deleted = applyLifecycleAction(candidate, { action: "reject", reason: "not useful", now: FROZEN_NOW });
    expect(deleted.state).toBe("deleted_memory");
    expect(isRecallActive(deleted)).toBe(false);
  });
});

// ─── applyLifecycleAction — merge_duplicate ──────────────────────────────────

describe("merge_duplicate action", () => {
  it("marks the duplicate record as deleted_memory", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const merged = applyLifecycleAction(approved, {
      action: "merge_duplicate",
      reason: "duplicate of mem_winner",
      now: FROZEN_NOW
    });
    expect(merged.state).toBe("deleted_memory");
  });
});

// ─── applyLifecycleAction — mark_private ─────────────────────────────────────

describe("mark_private action", () => {
  it("moves to deleted_memory and sets privacyState=private", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    const priv = applyLifecycleAction(candidate, { action: "mark_private", now: FROZEN_NOW });
    expect(priv.state).toBe("deleted_memory");
    expect(priv.privacyState).toBe("private");
  });
});

// ─── applyLifecycleAction — mark_outdated ────────────────────────────────────

describe("mark_outdated action", () => {
  it("approved_memory → stale_memory", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const stale = applyLifecycleAction(approved, { action: "mark_outdated", now: FROZEN_NOW });
    expect(stale.state).toBe("stale_memory");
    expect(isRecallActive(stale)).toBe(false);
  });

  it("used_memory → stale_memory", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const used = applyLifecycleAction(approved, { action: "record_usage", traceId: "t1", now: FROZEN_NOW });
    const stale = applyLifecycleAction(used, { action: "mark_outdated", now: FROZEN_NOW });
    expect(stale.state).toBe("stale_memory");
  });
});

// ─── applyLifecycleAction — delete_source ────────────────────────────────────

describe("delete_source action", () => {
  it("approved_memory → deleted_memory", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const deleted = applyLifecycleAction(approved, { action: "delete_source", reason: "source removed", now: FROZEN_NOW });
    expect(deleted.state).toBe("deleted_memory");
  });

  it("suggested_candidate → deleted_memory", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    const deleted = applyLifecycleAction(candidate, { action: "delete_source", now: FROZEN_NOW });
    expect(deleted.state).toBe("deleted_memory");
  });
});

// ─── applyLifecycleAction — record_usage ─────────────────────────────────────

describe("record_usage action", () => {
  it("approved_memory → used_memory with usage incremented", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const used = applyLifecycleAction(approved, { action: "record_usage", traceId: "trace-1", now: FROZEN_NOW });
    expect(used.state).toBe("used_memory");
    expect(used.usage.usageCount).toBe(1);
    expect(used.usage.lastUsedAt).toBe(FROZEN_NOW.toISOString());
    expect(used.usage.traceIds).toContain("trace-1");
    expect(isRecallActive(used)).toBe(true);
  });

  it("used_memory stays used_memory on subsequent record_usage calls", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const used1 = applyLifecycleAction(approved, { action: "record_usage", traceId: "t1", now: FROZEN_NOW });
    const used2 = applyLifecycleAction(used1, { action: "record_usage", traceId: "t2", now: FROZEN_NOW });
    expect(used2.state).toBe("used_memory");
    expect(used2.usage.usageCount).toBe(2);
    expect(used2.usage.traceIds).toEqual(["t1", "t2"]);
  });
});

// ─── applyLifecycleAction — mark_superseded ──────────────────────────────────

describe("mark_superseded action", () => {
  it("approved_memory → superseded_memory with supersededBy set", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const superseded = applyLifecycleAction(approved, {
      action: "mark_superseded",
      supersededBy: "mem_newer",
      now: FROZEN_NOW
    });
    expect(superseded.state).toBe("superseded_memory");
    expect(superseded.supersededBy).toBe("mem_newer");
    expect(isRecallActive(superseded)).toBe(false);
  });
});

// ─── applyLifecycleAction — delete ───────────────────────────────────────────

describe("delete action", () => {
  it("superseded_memory → deleted_memory", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const superseded = applyLifecycleAction(approved, { action: "mark_superseded", now: FROZEN_NOW });
    const deleted = applyLifecycleAction(superseded, { action: "delete", now: FROZEN_NOW });
    expect(deleted.state).toBe("deleted_memory");
  });

  it("captured_event → deleted_memory", () => {
    const deleted = applyLifecycleAction(makeCapture(), { action: "delete", now: FROZEN_NOW });
    expect(deleted.state).toBe("deleted_memory");
  });
});

// ─── Illegal transitions ──────────────────────────────────────────────────────

describe("illegal transitions throw MemoryLifecycleTransitionError", () => {
  it("cannot approve a deleted_memory", () => {
    const deleted = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "reject", now: FROZEN_NOW }
    );
    expect(() =>
      applyLifecycleAction(deleted, { action: "approve", now: FROZEN_NOW })
    ).toThrow(MemoryLifecycleTransitionError);
  });

  it("cannot record_usage on a suggested_candidate", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    expect(() =>
      applyLifecycleAction(candidate, { action: "record_usage", now: FROZEN_NOW })
    ).toThrow(MemoryLifecycleTransitionError);
  });

  it("cannot mark_superseded from suggested_candidate", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    expect(() =>
      applyLifecycleAction(candidate, { action: "mark_superseded", now: FROZEN_NOW })
    ).toThrow(MemoryLifecycleTransitionError);
  });

  it("cannot perform any action on deleted_memory", () => {
    const deleted = applyLifecycleAction(makeCapture(), { action: "delete", now: FROZEN_NOW });
    const allActions: Parameters<typeof applyLifecycleAction>[1]["action"][] = [
      "approve", "edit", "reject", "merge_duplicate", "mark_private",
      "mark_outdated", "delete_source", "record_usage", "mark_superseded", "delete"
    ];
    for (const action of allActions) {
      expect(() =>
        applyLifecycleAction(deleted, { action, now: FROZEN_NOW })
      ).toThrow(MemoryLifecycleTransitionError);
    }
  });
});

// ─── Immutability ─────────────────────────────────────────────────────────────

describe("immutability", () => {
  it("applyLifecycleAction does not mutate the original record", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    const originalState = candidate.state;
    const originalHistoryLen = candidate.history.length;
    applyLifecycleAction(candidate, { action: "approve", now: FROZEN_NOW });
    expect(candidate.state).toBe(originalState);
    expect(candidate.history).toHaveLength(originalHistoryLen);
  });

  it("record_usage does not mutate the original usage record", () => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    const originalCount = approved.usage.usageCount;
    applyLifecycleAction(approved, { action: "record_usage", now: FROZEN_NOW });
    expect(approved.usage.usageCount).toBe(originalCount);
  });
});

// ─── isRecallActive ───────────────────────────────────────────────────────────

describe("isRecallActive", () => {
  const makeApproved = () =>
    applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );

  it("returns true for approved_memory", () => {
    expect(isRecallActive(makeApproved())).toBe(true);
  });

  it("returns true for used_memory", () => {
    const used = applyLifecycleAction(makeApproved(), { action: "record_usage", now: FROZEN_NOW });
    expect(isRecallActive(used)).toBe(true);
  });

  it("returns false for captured_event", () => {
    expect(isRecallActive(makeCapture())).toBe(false);
  });

  it("returns false for suggested_candidate", () => {
    expect(isRecallActive(suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }))).toBe(false);
  });

  it("returns false for stale_memory", () => {
    const stale = applyLifecycleAction(makeApproved(), { action: "mark_outdated", now: FROZEN_NOW });
    expect(isRecallActive(stale)).toBe(false);
  });

  it("returns false for deleted_memory", () => {
    const deleted = applyLifecycleAction(makeApproved(), { action: "delete", now: FROZEN_NOW });
    expect(isRecallActive(deleted)).toBe(false);
  });
});

// ─── explainMemoryDecision ────────────────────────────────────────────────────

describe("explainMemoryDecision", () => {
  const usedRecord = (() => {
    const approved = applyLifecycleAction(
      suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW }),
      { action: "approve", now: FROZEN_NOW }
    );
    return applyLifecycleAction(approved, { action: "record_usage", traceId: "t1", now: FROZEN_NOW });
  })();

  it("explains used decision with source label", () => {
    const exp = explainMemoryDecision(usedRecord, "used");
    expect(exp.decision).toBe("used");
    expect(exp.summary).toContain("claude_code");
    expect(exp.details).toContain("1 time");
  });

  it("explains stale decision", () => {
    const exp = explainMemoryDecision(makeCapture(), "stale");
    expect(exp.decision).toBe("stale");
    expect(exp.summary).toMatch(/stale|outdated/i);
  });

  it("explains superseded decision with supersededBy", () => {
    const record: MemoryLifecycleRecord = { ...makeCapture(), supersededBy: "mem_newer" };
    const exp = explainMemoryDecision(record, "superseded");
    expect(exp.details).toContain("mem_newer");
  });

  it("explains blocked_risk with risk tags", () => {
    const risky = makeCapture({ riskTags: ["api_key"] });
    const exp = explainMemoryDecision(risky, "blocked_risk");
    expect(exp.details).toContain("api_key");
  });

  it("explains blocked_private", () => {
    const exp = explainMemoryDecision(makeCapture(), "blocked_private");
    expect(exp.summary).toMatch(/private/i);
  });

  it("explains blocked_not_approved with current state", () => {
    const candidate = suggestCandidate(makeCapture(), { suggestionReason: "r", now: FROZEN_NOW });
    const exp = explainMemoryDecision(candidate, "blocked_not_approved");
    expect(exp.details).toContain("suggested_candidate");
  });

  it("explains ignored_low_score with confidence", () => {
    const low = makeCapture({ confidence: 0.3 });
    const exp = explainMemoryDecision(low, "ignored_low_score");
    expect(exp.details).toContain("0.3");
  });

  it("explains ignored_budget", () => {
    const exp = explainMemoryDecision(makeCapture(), "ignored_budget");
    expect(exp.summary).toMatch(/budget/i);
  });

  it("explains missing", () => {
    const exp = explainMemoryDecision(makeCapture(), "missing");
    expect(exp.summary).toMatch(/not found|could not/i);
  });

  it("explains conflicting", () => {
    const exp = explainMemoryDecision(makeCapture(), "conflicting");
    expect(exp.summary).toMatch(/conflict/i);
  });

  it("always includes memoryId", () => {
    const r = makeCapture();
    for (const decision of ["used", "stale", "missing"] as const) {
      expect(explainMemoryDecision(r, decision).memoryId).toBe(r.id);
    }
  });
});

// ─── explainLedgerEntry ───────────────────────────────────────────────────────

describe("explainLedgerEntry", () => {
  function entry(state: EvidenceLedgerEntry["state"], overrides: Partial<EvidenceLedgerEntry> = {}): EvidenceLedgerEntry {
    return {
      memoryId: "mem_1",
      state,
      riskTags: [],
      warnings: [],
      ...overrides
    };
  }

  it("explains used", () => {
    expect(explainLedgerEntry(entry("used"))).toMatch(/included/i);
  });

  it("explains ignored", () => {
    expect(explainLedgerEntry(entry("ignored"))).toMatch(/not included|below/i);
  });

  it("explains stale", () => {
    expect(explainLedgerEntry(entry("stale"))).toMatch(/stale|outdated/i);
  });

  it("explains risky with tags", () => {
    const result = explainLedgerEntry(entry("risky", { riskTags: ["api_key"] }));
    expect(result).toContain("api_key");
  });

  it("explains risky without tags", () => {
    expect(explainLedgerEntry(entry("risky"))).toMatch(/sensitive/i);
  });

  it("explains conflicting", () => {
    expect(explainLedgerEntry(entry("conflicting"))).toMatch(/conflict/i);
  });

  it("explains missing", () => {
    expect(explainLedgerEntry(entry("missing"))).toMatch(/deleted|missing/i);
  });

  it("explains retrieved", () => {
    expect(explainLedgerEntry(entry("retrieved"))).toMatch(/retrieved/i);
  });

  it("explains user_feedback with feedback value", () => {
    expect(explainLedgerEntry(entry("user_feedback", { feedback: "outdated" }))).toContain("outdated");
  });

  it("explains user_feedback without feedback value", () => {
    expect(explainLedgerEntry(entry("user_feedback"))).toMatch(/feedback/i);
  });
});

// ─── InMemoryMemoryLifecycleRepository ───────────────────────────────────────

describe("InMemoryMemoryLifecycleRepository", () => {
  it("upsert and get round-trip", async () => {
    const repo = new InMemoryMemoryLifecycleRepository();
    const r = makeCapture();
    await repo.upsert(r);
    const fetched = await repo.get(r.id);
    expect(fetched?.id).toBe(r.id);
  });

  it("returns undefined for unknown id", async () => {
    const repo = new InMemoryMemoryLifecycleRepository();
    expect(await repo.get("nonexistent")).toBeUndefined();
  });

  it("listByVault returns records for the right vault only", async () => {
    const repo = new InMemoryMemoryLifecycleRepository();
    const r1 = makeCapture({ vaultId: "vault-1" });
    const r2 = makeCapture({ vaultId: "vault-2" });
    await repo.upsert(r1);
    await repo.upsert(r2);
    const results = await repo.listByVault("vault-1");
    expect(results.every((r) => r.vaultId === "vault-1")).toBe(true);
    expect(results).toHaveLength(1);
  });

  it("listByVault filters by state", async () => {
    const repo = new InMemoryMemoryLifecycleRepository();
    const captured = makeCapture({ vaultId: "v1", content: "a", now: FROZEN_NOW });
    const candidate = suggestCandidate(
      makeCapture({ vaultId: "v1", content: "b", now: FROZEN_NOW }),
      { suggestionReason: "r", now: FROZEN_NOW }
    );
    await repo.upsert(captured);
    await repo.upsert(candidate);
    const candidateResults = await repo.listByVault("v1", { state: "suggested_candidate" });
    expect(candidateResults).toHaveLength(1);
    expect(candidateResults[0].state).toBe("suggested_candidate");
  });

  it("listByVault respects limit", async () => {
    const repo = new InMemoryMemoryLifecycleRepository();
    for (let i = 0; i < 5; i++) {
      await repo.upsert(makeCapture({ vaultId: "v1", content: `item ${i}`, now: FROZEN_NOW }));
    }
    const results = await repo.listByVault("v1", { limit: 2 });
    expect(results).toHaveLength(2);
  });

  it("listBySource filters by source app", async () => {
    const repo = new InMemoryMemoryLifecycleRepository();
    const r1 = makeCapture({ vaultId: "v1", source: { ...SOURCE, app: "claude_code" } });
    const r2 = makeCapture({ vaultId: "v1", source: { ...SOURCE, app: "codex" } });
    await repo.upsert(r1);
    await repo.upsert(r2);
    const results = await repo.listBySource("v1", "codex");
    expect(results).toHaveLength(1);
    expect(results[0].source.app).toBe("codex");
  });

  it("upsert overwrites existing record with same id", async () => {
    const repo = new InMemoryMemoryLifecycleRepository();
    const r = makeCapture();
    await repo.upsert(r);
    const updated = { ...r, content: "updated content" };
    await repo.upsert(updated);
    const fetched = await repo.get(r.id);
    expect(fetched?.content).toBe("updated content");
  });
});
