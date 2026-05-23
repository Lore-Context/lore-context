// Lore v2.0.9 — Lane C2: Context Recipe Shadow Scheduler (BRA-629).
//
// Defines a disabled-by-default BullMQ cron job that can run the shadow
// recipe comparison on a schedule. The job is only registered when the
// explicit env flag LORE_CONTEXT_RECIPE_SHADOW_ENABLED=1 is set.
//
// Design invariants:
//   * Disabled by default — the cron spec IS the mechanism, but it is
//     never registered with the scheduler unless the env flag is true.
//   * Read-only — the processor is a stub that logs. No active recipe
//     mutation, no promotion, no registry writes occur.
//   * Follows the same pattern as scheduler-v18.ts cron specs with
//     dependency injection for testability.
//   * The env flag check is a pure function (no side effects) so it
//     can be tested without process.env mutation.

import { log } from "../logger.js";
import type { CronSpec, CronProcessor } from "./scheduler-v18.js";

// ─────────────────────────────────────────────────────────────────────────
// Public constants and helpers.
// ─────────────────────────────────────────────────────────────────────────

/** Env variable name that gates the shadow recipe scheduler. */
export const SHADOW_ENV_FLAG = "LORE_CONTEXT_RECIPE_SHADOW_ENABLED";

/** Cron expression: runs daily at 05:00 UTC. */
export const SHADOW_CRON = "0 5 * * *";

/** Job name used for the BullMQ cron registration. */
export const SHADOW_JOB_NAME = "context-recipe-shadow";

/**
 * Pure function — checks whether the shadow scheduler should be enabled.
 * Separated from process.env access so tests can inject the value.
 */
export function isShadowEnabled(envValue?: string): boolean {
  return envValue === "1" || envValue === "true";
}

/**
 * Check the live environment. Equivalent to isShadowEnabled(process.env[SHADOW_ENV_FLAG]).
 */
export function checkEnvShadowEnabled(): boolean {
  return isShadowEnabled(process.env[SHADOW_ENV_FLAG]);
}

/**
 * The shadow cron spec. This spec is NOT registered with the scheduler by
 * default. Callers (scheduler-v18.ts or test harnesses) must explicitly
 * check isShadowEnabled() before adding this spec.
 */
export function createShadowCronSpec(
  processor?: CronProcessor,
): CronSpec {
  return {
    name: SHADOW_JOB_NAME,
    cron: SHADOW_CRON,
    processor:
      processor ??
      makeShadowStubProcessor(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Stub processor (production default — logs, does nothing active).
// ─────────────────────────────────────────────────────────────────────────

function makeShadowStubProcessor(): CronProcessor {
  return async (_job) => {
    log.info("[context-recipe-shadow] stub processor invoked (disabled — no active comparison)", {
      job: SHADOW_JOB_NAME,
      enabled: checkEnvShadowEnabled(),
    });

    // No active work is done here. The stub exists to satisfy the scheduler
    // interface. A future Lane D PR will wire the real comparison logic
    // behind the same env flag. Until then, this is a noop.
  };
}

/**
 * Placeholder for future real implementation.
 * When Lane D wires the actual comparison, replace the stub with this skeleton.
 */
export async function runShadowComparisonCycle(): Promise<{
  status: "skipped" | "completed";
  reason: string;
}> {
  const enabled = checkEnvShadowEnabled();
  if (!enabled) {
    return { status: "skipped", reason: `${SHADOW_ENV_FLAG} is not set to "1"` };
  }
  // Future: load recipes, run comparison, log results.
  // For now, the stub processor handles this.
  return { status: "completed", reason: "stub — no active comparison wired" };
}
