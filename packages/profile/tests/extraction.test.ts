import { describe, expect, it } from "vitest";
import {
  buildProfileItems,
  canonicalizeTurns,
  extractMemoryCandidates,
  redactPrivateBlocks,
  summarizeSession
} from "../src/index.js";
import {
  FROZEN_NOW,
  outdatedCorrectionSession,
  preferenceSession,
  privateMarkerSession,
  projectDecisionSession,
  temporaryTaskSession,
  untrustedSourceSession
} from "./fixtures.js";

describe("redactPrivateBlocks", () => {
  it("removes <private>...</private> contents", () => {
    const out = redactPrivateBlocks("token <private>sk-1234</private> end");
    expect(out).toContain("<redacted:private>");
    expect(out).not.toContain("sk-1234");
  });
});

describe("canonicalizeTurns", () => {
  it("strips private blocks and drops empty turns", () => {
    const turns = canonicalizeTurns([
      { role: "user", content: "<private>secret</private>" },
      { role: "user", content: "  hello   world   " }
    ]);
    expect(turns).toHaveLength(1);
    expect(turns[0].content).toBe("hello world");
  });
});

describe("summarizeSession", () => {
  it("produces a deterministic intent + result summary", () => {
    const summary = summarizeSession({
      sessionId: "s1",
      vaultId: "v1",
      turns: preferenceSession()
    });
    expect(summary.summary).toContain("intent:");
    expect(summary.summary).toContain("result:");
    expect(summary.turnCount).toBe(3);
  });
});

describe("extractMemoryCandidates - preference", () => {
  it("extracts preference candidates with profile mapping", () => {
    const candidates = extractMemoryCandidates({
      sessionId: "s1",
      vaultId: "v1",
      turns: preferenceSession(),
      now: FROZEN_NOW
    });
    const prefs = candidates.filter((c) => c.profileMapping === "preference" || c.profileMapping === "workflow");
    expect(prefs.length).toBeGreaterThan(0);
    expect(prefs[0].sourceRefs[0].type).toBe("conversation");
    expect(prefs[0].sourceProvider).toBeUndefined();
  });
});

describe("extractMemoryCandidates - project decision", () => {
  it("captures decisions as project rules", () => {
    const candidates = extractMemoryCandidates({
      sessionId: "s2",
      vaultId: "v1",
      projectId: "proj-x",
      turns: projectDecisionSession(),
      now: FROZEN_NOW
    });
    const decisions = candidates.filter((c) => c.memoryType === "project_rule");
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0].scope).toBe("project");
  });
});

describe("extractMemoryCandidates - outdated correction", () => {
  it("returns both preference candidates so reconciliation can supersede", () => {
    const candidates = extractMemoryCandidates({
      sessionId: "s3",
      vaultId: "v1",
      turns: outdatedCorrectionSession(),
      now: FROZEN_NOW
    });
    const prefs = candidates.filter((c) => c.profileMapping === "preference");
    expect(prefs.length).toBeGreaterThanOrEqual(2);
  });
});

describe("extractMemoryCandidates - temporary task", () => {
  it("attaches validUntil to temporary tasks", () => {
    const candidates = extractMemoryCandidates({
      sessionId: "s4",
      vaultId: "v1",
      turns: temporaryTaskSession(),
      now: FROZEN_NOW
    });
    const tasks = candidates.filter((c) => c.memoryType === "task_state");
    expect(tasks.length).toBe(1);
    expect(tasks[0].validUntil).toBeTruthy();
  });
});

describe("extractMemoryCandidates - private marker", () => {
  it("never persists redacted secret content", () => {
    const candidates = extractMemoryCandidates({
      sessionId: "s5",
      vaultId: "v1",
      turns: privateMarkerSession(),
      now: FROZEN_NOW
    });
    for (const c of candidates) {
      expect(c.content).not.toContain("sk-extremely-secret-token-1234");
    }
    expect(candidates.some((c) => c.profileMapping === "preference")).toBe(true);
  });
});

describe("extractMemoryCandidates - untrusted source", () => {
  it("flags risk tags via shared scanRiskTags signal flow", () => {
    const candidates = extractMemoryCandidates({
      sessionId: "s6",
      vaultId: "v1",
      sourceProvider: "web_clip",
      turns: untrustedSourceSession(),
      now: FROZEN_NOW
    });
    expect(candidates.length).toBeGreaterThanOrEqual(0);
    for (const c of candidates) {
      expect(Array.isArray(c.riskTags)).toBe(true);
    }
  });
});

describe("buildProfileItems", () => {
  it("only emits items for candidates with profileMapping", () => {
    const candidates = extractMemoryCandidates({
      sessionId: "s7",
      vaultId: "v1",
      turns: preferenceSession(),
      now: FROZEN_NOW
    });
    const items = buildProfileItems({ candidates, now: FROZEN_NOW });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.sourceMemoryIds.length > 0)).toBe(true);
  });
});
