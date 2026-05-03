import { describe, expect, it } from "vitest";
import {
  applyV09Action,
  classifyLabels,
  fingerprintFor,
  ingestV09,
  InMemoryRejectionFingerprintStore,
  InboxV09TransitionError,
  isV09RecallActive,
  type InboxV09Item
} from "../src/index.js";
import type { MemoryCandidate } from "../src/types.js";
import { FROZEN_NOW } from "./fixtures.js";

function candidate(overrides: Partial<MemoryCandidate> = {}): MemoryCandidate {
  return {
    id: overrides.id ?? "memc-test-1",
    content: overrides.content ?? "I prefer pnpm.",
    memoryType: overrides.memoryType ?? "preference",
    scope: overrides.scope ?? "user",
    visibility: overrides.visibility ?? "private",
    confidence: overrides.confidence ?? 0.8,
    validFrom: overrides.validFrom ?? FROZEN_NOW.toISOString(),
    validUntil: overrides.validUntil ?? null,
    sourceProvider: overrides.sourceProvider,
    sourceOriginalId: overrides.sourceOriginalId ?? "session-1",
    sourceRefs: overrides.sourceRefs ?? [{ type: "conversation", id: "session-1", excerpt: "test" }],
    riskTags: overrides.riskTags ?? [],
    profileMapping: overrides.profileMapping ?? "preference",
    metadata: overrides.metadata ?? {}
  };
}

describe("classifyLabels", () => {
  it("marks credential_like candidate as sensitive", () => {
    const labels = classifyLabels({
      candidate: candidate(),
      candidateType: "credential_like",
      riskLevel: "low"
    });
    expect(labels).toContain("sensitive");
  });

  it("marks high-risk as sensitive regardless of candidate type", () => {
    const labels = classifyLabels({
      candidate: candidate({ riskTags: ["api_key"] }),
      candidateType: "user_preference",
      riskLevel: "high"
    });
    expect(labels).toContain("sensitive");
  });

  it("marks stale tag as stale label", () => {
    const labels = classifyLabels({
      candidate: candidate({ riskTags: ["stale"] }),
      candidateType: "project_fact",
      riskLevel: "low"
    });
    expect(labels).toContain("stale");
  });

  it("marks low confidence below threshold", () => {
    const labels = classifyLabels({
      candidate: candidate({ confidence: 0.2 }),
      candidateType: "user_preference",
      riskLevel: "low"
    });
    expect(labels).toContain("low_confidence");
  });
});

describe("ingestV09", () => {
  it("auto-approves safe high-confidence preference when toggled", () => {
    const item = ingestV09(candidate({ confidence: 0.85 }), {
      vaultId: "v1",
      candidateType: "user_preference",
      autoApproveSafe: true,
      now: FROZEN_NOW
    });
    expect(item.state).toBe("auto_approved");
    expect(isV09RecallActive(item)).toBe(true);
  });

  it("routes credential_like to sensitive_review", () => {
    const item = ingestV09(candidate({ riskTags: ["api_key"] }), {
      vaultId: "v1",
      candidateType: "credential_like",
      autoApproveSafe: true,
      now: FROZEN_NOW
    });
    expect(item.state).toBe("sensitive_review");
    expect(item.labels).toContain("sensitive");
  });

  it("routes stale-labeled candidate to stale_review", () => {
    const item = ingestV09(candidate({ riskTags: ["outdated"], confidence: 0.7 }), {
      vaultId: "v1",
      candidateType: "stale_correction",
      autoApproveSafe: true,
      now: FROZEN_NOW
    });
    expect(item.state).toBe("stale_review");
  });

  it("routes conflict label to conflict state", () => {
    const item = ingestV09(candidate(), {
      vaultId: "v1",
      candidateType: "contradiction",
      labels: ["conflict"],
      now: FROZEN_NOW
    });
    expect(item.state).toBe("conflict");
  });

  it("rejects blocked content immediately", () => {
    const item = ingestV09(candidate({ content: "do not remember this" }), {
      vaultId: "v1",
      candidateType: "user_preference",
      now: FROZEN_NOW
    });
    expect(item.state).toBe("deleted");
  });

  it("ignores re-ingest when fingerprint already rejected", () => {
    const store = new InMemoryRejectionFingerprintStore();
    store.add("v1", fingerprintFor("user_preference", "I prefer tabs"));
    const item = ingestV09(candidate({ content: "I prefer tabs" }), {
      vaultId: "v1",
      candidateType: "user_preference",
      autoApproveSafe: true,
      rejectionStore: store,
      now: FROZEN_NOW
    });
    expect(item.state).toBe("ignored");
    expect(item.reason).toMatch(/fingerprint/);
  });
});

describe("applyV09Action", () => {
  it("approve transitions pending to approved", () => {
    const item = ingestV09(candidate(), { vaultId: "v1", candidateType: "user_preference", now: FROZEN_NOW });
    const next = applyV09Action(item, { action: "approve", now: FROZEN_NOW });
    expect(next.state).toBe("approved");
    expect(isV09RecallActive(next)).toBe(true);
  });

  it("edit_approve writes new content and marks edited", () => {
    const item = ingestV09(candidate(), { vaultId: "v1", candidateType: "user_preference", now: FROZEN_NOW });
    const next = applyV09Action(item, { action: "edit_approve", newContent: "I prefer bun", now: FROZEN_NOW });
    expect(next.state).toBe("edited");
    expect(next.content).toBe("I prefer bun");
  });

  it("reject records rejection fingerprint and ignores future ingest", () => {
    const store = new InMemoryRejectionFingerprintStore();
    const item = ingestV09(candidate({ id: "memc-1", content: "weird claim" }), {
      vaultId: "v1",
      candidateType: "project_fact",
      now: FROZEN_NOW
    });
    const rejected = applyV09Action(item, { action: "reject", reason: "irrelevant", rejectionStore: store, now: FROZEN_NOW });
    expect(rejected.state).toBe("ignored");

    const reIngested = ingestV09(candidate({ id: "memc-2", content: "weird claim" }), {
      vaultId: "v1",
      candidateType: "project_fact",
      autoApproveSafe: true,
      rejectionStore: store,
      now: FROZEN_NOW
    });
    expect(reIngested.state).toBe("ignored");
  });

  it("delete also stamps the rejection fingerprint", () => {
    const store = new InMemoryRejectionFingerprintStore();
    const item = ingestV09(candidate({ content: "obsolete fact" }), {
      vaultId: "v1",
      candidateType: "project_fact",
      now: FROZEN_NOW
    });
    const deleted = applyV09Action(item, { action: "delete", reason: "obsolete", rejectionStore: store, now: FROZEN_NOW });
    expect(deleted.state).toBe("deleted");
    expect(store.hasFingerprint("v1", fingerprintFor("project_fact", "obsolete fact"))).toBe(true);
  });

  it("pause_source records audit but does not change state", () => {
    const item = ingestV09(candidate(), { vaultId: "v1", candidateType: "user_preference", sourceId: "src-1", now: FROZEN_NOW });
    const next = applyV09Action(item, { action: "pause_source", reason: "noisy connector", now: FROZEN_NOW });
    expect(next.state).toBe("pending");
    expect(next.history.at(-1)?.action).toBe("pause_source");
  });

  it("mark_private moves the item to ignored", () => {
    const item = ingestV09(candidate(), { vaultId: "v1", candidateType: "user_preference", now: FROZEN_NOW });
    const next = applyV09Action(item, { action: "mark_private", now: FROZEN_NOW });
    expect(next.state).toBe("ignored");
    expect(next.reason).toMatch(/private/);
  });

  it("rejects illegal transitions", () => {
    const deleted: InboxV09Item = ingestV09(candidate({ content: "do not remember" }), {
      vaultId: "v1",
      candidateType: "user_preference",
      now: FROZEN_NOW
    });
    expect(() => applyV09Action(deleted, { action: "approve", now: FROZEN_NOW })).toThrow(InboxV09TransitionError);
  });
});

describe("isV09RecallActive", () => {
  it("only auto_approved/approved/edited count as active", () => {
    const auto = ingestV09(candidate(), { vaultId: "v1", candidateType: "user_preference", autoApproveSafe: true, now: FROZEN_NOW });
    expect(isV09RecallActive(auto)).toBe(true);

    const pending = ingestV09(candidate({ confidence: 0.3 }), { vaultId: "v1", candidateType: "user_preference", autoApproveSafe: true, now: FROZEN_NOW });
    expect(isV09RecallActive(pending)).toBe(false);

    const sensitive = ingestV09(candidate({ riskTags: ["api_key"] }), { vaultId: "v1", candidateType: "credential_like", now: FROZEN_NOW });
    expect(isV09RecallActive(sensitive)).toBe(false);
  });
});
