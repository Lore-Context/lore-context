/**
 * Beta funnel event definitions and reporting for rc.1.
 *
 * Tracks the 7 funnel stages from the plan (Lane 9 / beta evaluation):
 *   1. invite_accepted
 *   2. sign_in
 *   3. source_connected
 *   4. first_automatic_capture
 *   5. first_inbox_approval
 *   6. first_useful_recall
 *   7. first_control_action  (delete / export / pause)
 */

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type BetaFunnelStage =
  | "invite_accepted"
  | "sign_in"
  | "source_connected"
  | "first_automatic_capture"
  | "first_inbox_approval"
  | "first_useful_recall"
  | "first_control_action";

export const BETA_FUNNEL_STAGES: BetaFunnelStage[] = [
  "invite_accepted",
  "sign_in",
  "source_connected",
  "first_automatic_capture",
  "first_inbox_approval",
  "first_useful_recall",
  "first_control_action",
];

export type ControlActionKind = "delete" | "export" | "pause";

export interface BetaFunnelEvent {
  userId: string;
  stage: BetaFunnelStage;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Per-user funnel
// ---------------------------------------------------------------------------

export interface UserFunnelProgress {
  userId: string;
  completedStages: BetaFunnelStage[];
  /** Stage the user is currently stuck before (first not completed), or null if all done. */
  currentDropOff: BetaFunnelStage | null;
  /** Minutes from invite_accepted to sign_in, null if not reached. */
  minutesToSignIn: number | null;
  /** Minutes from sign_in to first_automatic_capture, null if not reached. */
  minutesToFirstCapture: number | null;
  /** Minutes from first_automatic_capture to first_useful_recall, null if not reached. */
  minutesToFirstRecall: number | null;
  /** Whether the user completed the full funnel. */
  fullyConverted: boolean;
}

export function buildUserFunnelProgress(
  userId: string,
  events: BetaFunnelEvent[]
): UserFunnelProgress {
  const byStage = new Map<BetaFunnelStage, BetaFunnelEvent>();
  for (const event of events.filter((e) => e.userId === userId)) {
    if (!byStage.has(event.stage)) {
      byStage.set(event.stage, event);
    }
  }

  const completedStages = BETA_FUNNEL_STAGES.filter((s) => byStage.has(s));
  const currentDropOff = BETA_FUNNEL_STAGES.find((s) => !byStage.has(s)) ?? null;

  const tsOf = (stage: BetaFunnelStage): number | null => {
    const ev = byStage.get(stage);
    return ev ? Date.parse(ev.occurredAt) : null;
  };

  const minutesBetween = (a: BetaFunnelStage, b: BetaFunnelStage): number | null => {
    const ta = tsOf(a);
    const tb = tsOf(b);
    if (ta === null || tb === null) return null;
    return Math.round((tb - ta) / 60_000);
  };

  return {
    userId,
    completedStages,
    currentDropOff,
    minutesToSignIn: minutesBetween("invite_accepted", "sign_in"),
    minutesToFirstCapture: minutesBetween("sign_in", "first_automatic_capture"),
    minutesToFirstRecall: minutesBetween("first_automatic_capture", "first_useful_recall"),
    fullyConverted: completedStages.length === BETA_FUNNEL_STAGES.length,
  };
}

// ---------------------------------------------------------------------------
// Cohort-level report
// ---------------------------------------------------------------------------

export interface BetaFunnelReport {
  kind: "beta_funnel";
  generatedAt: string;
  cohortSize: number;
  /** Count of users who completed each stage. */
  stageCompletions: Record<BetaFunnelStage, number>;
  /** Conversion rate per stage (users who reached it / cohort size). */
  stageConversionRate: Record<BetaFunnelStage, number>;
  fullyConvertedCount: number;
  fullyConvertedRate: number;
  medianMinutesToFirstCapture: number | null;
  medianMinutesToFirstRecall: number | null;
  /** True when >= 70% of users completed connect + capture (rc.1 acceptance target). */
  activationTargetMet: boolean;
  perUser: UserFunnelProgress[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

export function buildBetaFunnelReport(
  userIds: string[],
  events: BetaFunnelEvent[]
): BetaFunnelReport {
  const perUser = userIds.map((id) => buildUserFunnelProgress(id, events));

  const stageCompletions = Object.fromEntries(
    BETA_FUNNEL_STAGES.map((stage) => [
      stage,
      perUser.filter((u) => u.completedStages.includes(stage)).length,
    ])
  ) as Record<BetaFunnelStage, number>;

  const cohortSize = userIds.length;

  const stageConversionRate = Object.fromEntries(
    BETA_FUNNEL_STAGES.map((stage) => [
      stage,
      cohortSize > 0 ? stageCompletions[stage] / cohortSize : 0,
    ])
  ) as Record<BetaFunnelStage, number>;

  const fullyConvertedCount = perUser.filter((u) => u.fullyConverted).length;
  const fullyConvertedRate = cohortSize > 0 ? fullyConvertedCount / cohortSize : 0;

  const captureMinutes = perUser
    .map((u) => u.minutesToFirstCapture)
    .filter((v): v is number => v !== null);
  const recallMinutes = perUser
    .map((u) => u.minutesToFirstRecall)
    .filter((v): v is number => v !== null);

  // rc.1 activation target: >= 70% reach source_connected AND first_automatic_capture
  const activationCount = perUser.filter(
    (u) =>
      u.completedStages.includes("source_connected") &&
      u.completedStages.includes("first_automatic_capture")
  ).length;
  const activationRate = cohortSize > 0 ? activationCount / cohortSize : 0;

  return {
    kind: "beta_funnel",
    generatedAt: new Date().toISOString(),
    cohortSize,
    stageCompletions,
    stageConversionRate,
    fullyConvertedCount,
    fullyConvertedRate,
    medianMinutesToFirstCapture: median(captureMinutes),
    medianMinutesToFirstRecall: median(recallMinutes),
    activationTargetMet: activationRate >= 0.7,
    perUser,
  };
}
