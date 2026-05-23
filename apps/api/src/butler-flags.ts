// Lore v2.0.2 — Butler v19 feature flags (LORE_BUTLER_* namespace).
//
// These flags are intentionally separate from the product flags in
// feature-flags.ts (LORE_FLAG_* namespace) so that butler v19 code paths can
// be enabled / disabled at a per-lane granularity without touching the
// existing product kill switches.
//
// All flags default to 0 (false) so that a fresh deployment behaves identically
// to v18 until the operator explicitly opts in. The master switch
// LORE_BUTLER_V19_ENABLED acts as a circuit-breaker: when it is 0, every other
// butler flag reads as false regardless of its individual env var, enabling a
// one-var rollback to v18 behaviour.
//
// Shadow mode (LORE_BUTLER_SHADOW_MODE) is an additional runtime escape hatch:
// when enabled, butler v19 code paths execute and write to butler_decisions
// with shadowed=true but do NOT mutate memory_items, allowing safe observation
// without risk.

export type ButlerFlagName =
  | "butlerV19Enabled"
  | "eventTriggerEnabled"
  | "dateNormalizeEnabled"
  | "llmMergeEnabled"
  | "canonicalIndexEnabled"
  | "budgetEnabled"
  | "openrouterPromptCache"
  | "canonicalFastPathEnabled"
  | "mcpInstructionsInjectEnabled"
  | "shadowMode";

export interface ButlerFlagSnapshot {
  /** Master switch — when false all other butler flags are forced to false. */
  butlerV19Enabled: boolean;
  /** Lane B — event-triggered butler cycles. */
  eventTriggerEnabled: boolean;
  /** Lane D — date normalisation during merge. */
  dateNormalizeEnabled: boolean;
  /** Lane M — LLM-assisted memory merge. */
  llmMergeEnabled: boolean;
  /** Lane I — canonical index population. */
  canonicalIndexEnabled: boolean;
  /** Lane G — per-vault budget enforcement. */
  budgetEnabled: boolean;
  /** Lane P — OpenRouter prompt-cache header. */
  openrouterPromptCache: boolean;
  /** Lane I fast-path — skip full index rebuild when delta is small. */
  canonicalFastPathEnabled: boolean;
  /** Lane H — inject butler instructions into MCP context responses. */
  mcpInstructionsInjectEnabled: boolean;
  /** Runtime escape hatch — run butler v19 logic but write shadowed=true rows
   *  only; never mutates memory_items. */
  shadowMode: boolean;
}

const TRUTHY = new Set(["1", "true", "yes", "on", "enabled"]);
const FALSY = new Set(["0", "false", "no", "off", "disabled"]);

interface ButlerFlagSpec {
  flag: ButlerFlagName;
  envName: string;
}

// All butler flags default to false (0).
const BUTLER_FLAG_SPECS: ReadonlyArray<ButlerFlagSpec> = [
  { flag: "eventTriggerEnabled", envName: "LORE_BUTLER_EVENT_TRIGGER_ENABLED" },
  { flag: "dateNormalizeEnabled", envName: "LORE_BUTLER_DATE_NORMALIZE_ENABLED" },
  { flag: "llmMergeEnabled", envName: "LORE_BUTLER_LLM_MERGE_ENABLED" },
  { flag: "canonicalIndexEnabled", envName: "LORE_BUTLER_CANONICAL_INDEX_ENABLED" },
  { flag: "budgetEnabled", envName: "LORE_BUTLER_BUDGET_ENABLED" },
  { flag: "openrouterPromptCache", envName: "LORE_OPENROUTER_PROMPT_CACHE" },
  { flag: "canonicalFastPathEnabled", envName: "LORE_CANONICAL_FAST_PATH_ENABLED" },
  { flag: "mcpInstructionsInjectEnabled", envName: "LORE_MCP_INSTRUCTIONS_INJECT_ENABLED" },
  { flag: "shadowMode", envName: "LORE_BUTLER_SHADOW_MODE" }
];

function parseBoolean(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return false;
  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;
  return false;
}

/**
 * Read all butler v19 feature flags from the given environment object.
 *
 * When the master switch (LORE_BUTLER_V19_ENABLED) is false, every lane flag
 * is forced to false even if the individual env var is set — this provides a
 * single-var rollback to v18 behaviour.
 */
export function readButlerFlags(env: NodeJS.ProcessEnv = process.env): ButlerFlagSnapshot {
  const masterEnabled = parseBoolean(env["LORE_BUTLER_V19_ENABLED"]);

  if (!masterEnabled) {
    return {
      butlerV19Enabled: false,
      eventTriggerEnabled: false,
      dateNormalizeEnabled: false,
      llmMergeEnabled: false,
      canonicalIndexEnabled: false,
      budgetEnabled: false,
      openrouterPromptCache: false,
      canonicalFastPathEnabled: false,
      mcpInstructionsInjectEnabled: false,
      shadowMode: false
    };
  }

  const snapshot: Record<string, boolean> = { butlerV19Enabled: true };
  for (const spec of BUTLER_FLAG_SPECS) {
    snapshot[spec.flag] = parseBoolean(env[spec.envName]);
  }

  return snapshot as unknown as ButlerFlagSnapshot;
}

/**
 * Convenience helper — check a single butler flag without materialising the
 * full snapshot. Returns false whenever the master switch is off.
 */
export function isButlerFlagEnabled(name: ButlerFlagName, env: NodeJS.ProcessEnv = process.env): boolean {
  return readButlerFlags(env)[name];
}
