import { describe, expect, it } from "vitest";
import {
  BETA_FUNNEL_STAGES,
  buildUserFunnelProgress,
  buildBetaFunnelReport,
  type BetaFunnelEvent,
} from "../src/beta-funnel.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEvent(
  userId: string,
  stage: BetaFunnelEvent["stage"],
  minutesOffset = 0
): BetaFunnelEvent {
  const base = new Date("2026-05-01T09:00:00Z").getTime();
  return {
    userId,
    stage,
    occurredAt: new Date(base + minutesOffset * 60_000).toISOString(),
  };
}

const FULL_FUNNEL_EVENTS: BetaFunnelEvent[] = [
  makeEvent("user_a", "invite_accepted", 0),
  makeEvent("user_a", "sign_in", 2),
  makeEvent("user_a", "source_connected", 5),
  makeEvent("user_a", "first_automatic_capture", 8),
  makeEvent("user_a", "first_inbox_approval", 12),
  makeEvent("user_a", "first_useful_recall", 15),
  makeEvent("user_a", "first_control_action", 20),
];

const PARTIAL_FUNNEL_EVENTS: BetaFunnelEvent[] = [
  makeEvent("user_b", "invite_accepted", 0),
  makeEvent("user_b", "sign_in", 3),
  makeEvent("user_b", "source_connected", 10),
  // drops off before first_automatic_capture
];

// ---------------------------------------------------------------------------
// BETA_FUNNEL_STAGES ordering
// ---------------------------------------------------------------------------

describe("BETA_FUNNEL_STAGES", () => {
  it("has exactly 7 stages in the correct order", () => {
    expect(BETA_FUNNEL_STAGES).toHaveLength(7);
    expect(BETA_FUNNEL_STAGES[0]).toBe("invite_accepted");
    expect(BETA_FUNNEL_STAGES[6]).toBe("first_control_action");
  });
});

// ---------------------------------------------------------------------------
// buildUserFunnelProgress
// ---------------------------------------------------------------------------

describe("buildUserFunnelProgress", () => {
  it("detects a fully converted user", () => {
    const progress = buildUserFunnelProgress("user_a", FULL_FUNNEL_EVENTS);
    expect(progress.fullyConverted).toBe(true);
    expect(progress.completedStages).toHaveLength(7);
    expect(progress.currentDropOff).toBeNull();
  });

  it("detects drop-off stage for a partial user", () => {
    const progress = buildUserFunnelProgress("user_b", PARTIAL_FUNNEL_EVENTS);
    expect(progress.fullyConverted).toBe(false);
    expect(progress.currentDropOff).toBe("first_automatic_capture");
    expect(progress.completedStages).toContain("source_connected");
    expect(progress.completedStages).not.toContain("first_automatic_capture");
  });

  it("calculates minutesToFirstCapture correctly", () => {
    const progress = buildUserFunnelProgress("user_a", FULL_FUNNEL_EVENTS);
    // sign_in at +2 min, first_automatic_capture at +8 min → 6 minutes
    expect(progress.minutesToFirstCapture).toBe(6);
  });

  it("calculates minutesToFirstRecall correctly", () => {
    const progress = buildUserFunnelProgress("user_a", FULL_FUNNEL_EVENTS);
    // first_automatic_capture at +8 min, first_useful_recall at +15 min → 7 minutes
    expect(progress.minutesToFirstRecall).toBe(7);
  });

  it("returns null timing metrics when stages not reached", () => {
    const progress = buildUserFunnelProgress("user_b", PARTIAL_FUNNEL_EVENTS);
    expect(progress.minutesToFirstCapture).toBeNull();
    expect(progress.minutesToFirstRecall).toBeNull();
  });

  it("returns empty progress for a user with no events", () => {
    const progress = buildUserFunnelProgress("user_unknown", FULL_FUNNEL_EVENTS);
    expect(progress.completedStages).toHaveLength(0);
    expect(progress.currentDropOff).toBe("invite_accepted");
    expect(progress.fullyConverted).toBe(false);
  });

  it("only uses first occurrence when duplicate stage events exist", () => {
    const events = [
      makeEvent("user_c", "invite_accepted", 0),
      makeEvent("user_c", "invite_accepted", 5), // duplicate
      makeEvent("user_c", "sign_in", 10),
    ];
    const progress = buildUserFunnelProgress("user_c", events);
    expect(progress.minutesToSignIn).toBe(10);
    expect(progress.completedStages.filter((s) => s === "invite_accepted")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// buildBetaFunnelReport
// ---------------------------------------------------------------------------

describe("buildBetaFunnelReport", () => {
  it("reports 100% full conversion for a single fully-converted user", () => {
    const report = buildBetaFunnelReport(["user_a"], FULL_FUNNEL_EVENTS);
    expect(report.fullyConvertedRate).toBe(1);
    expect(report.stageCompletions.invite_accepted).toBe(1);
    expect(report.stageCompletions.first_control_action).toBe(1);
  });

  it("reports 0% conversion for a user who only signed in", () => {
    const report = buildBetaFunnelReport(
      ["user_b"],
      PARTIAL_FUNNEL_EVENTS
    );
    expect(report.fullyConvertedRate).toBe(0);
    expect(report.stageCompletions.sign_in).toBe(1);
    expect(report.stageCompletions.first_automatic_capture).toBe(0);
  });

  it("computes mixed cohort stats correctly", () => {
    const allEvents = [...FULL_FUNNEL_EVENTS, ...PARTIAL_FUNNEL_EVENTS];
    const report = buildBetaFunnelReport(["user_a", "user_b"], allEvents);
    expect(report.cohortSize).toBe(2);
    expect(report.fullyConvertedCount).toBe(1);
    expect(report.fullyConvertedRate).toBeCloseTo(0.5, 5);
    expect(report.stageCompletions.source_connected).toBe(2);
    expect(report.stageCompletions.first_automatic_capture).toBe(1);
  });

  it("sets activationTargetMet true when >= 70% reach connect + capture", () => {
    // 7 users: 5 complete both source_connected and first_automatic_capture → 71%
    const userIds = Array.from({ length: 7 }, (_, i) => `user_${i}`);
    const events: BetaFunnelEvent[] = [];
    for (const userId of userIds.slice(0, 5)) {
      events.push(makeEvent(userId, "invite_accepted", 0));
      events.push(makeEvent(userId, "sign_in", 2));
      events.push(makeEvent(userId, "source_connected", 5));
      events.push(makeEvent(userId, "first_automatic_capture", 8));
    }
    for (const userId of userIds.slice(5)) {
      events.push(makeEvent(userId, "invite_accepted", 0));
    }
    const report = buildBetaFunnelReport(userIds, events);
    expect(report.activationTargetMet).toBe(true);
  });

  it("sets activationTargetMet false when < 70% reach connect + capture", () => {
    const userIds = ["user_a", "user_b", "user_c"];
    const allEvents = [
      ...FULL_FUNNEL_EVENTS, // user_a: passes
      // user_b and user_c: no activation events
    ];
    const report = buildBetaFunnelReport(userIds, allEvents);
    // 1 of 3 = 33% → below target
    expect(report.activationTargetMet).toBe(false);
  });

  it("computes median minutes to first capture across cohort", () => {
    const events: BetaFunnelEvent[] = [
      ...FULL_FUNNEL_EVENTS, // user_a: sign_in at +2, capture at +8 → 6 min
      makeEvent("user_d", "invite_accepted", 0),
      makeEvent("user_d", "sign_in", 1),
      makeEvent("user_d", "source_connected", 4),
      makeEvent("user_d", "first_automatic_capture", 5), // 4 min to capture
    ];
    const report = buildBetaFunnelReport(["user_a", "user_d"], events);
    // median of [6, 4] = 5
    expect(report.medianMinutesToFirstCapture).toBe(5);
  });

  it("returns correct kind and generatedAt", () => {
    const report = buildBetaFunnelReport([], []);
    expect(report.kind).toBe("beta_funnel");
    expect(Date.parse(report.generatedAt)).not.toBeNaN();
  });

  it("handles empty cohort without error", () => {
    const report = buildBetaFunnelReport([], []);
    expect(report.cohortSize).toBe(0);
    expect(report.fullyConvertedRate).toBe(0);
    expect(report.activationTargetMet).toBe(false);
    expect(report.medianMinutesToFirstCapture).toBeNull();
  });
});
