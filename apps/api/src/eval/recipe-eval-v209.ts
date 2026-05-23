// Lore v2.0.9 — Lane B2: Recipe-Aware Eval Control Plane.
//
// Extends the eval run/report path so requests can optionally specify
// a recipe id/spec/knobs, and eval run records include recipe-aware
// metadata. Preserves legacy eval request/response compatibility.
//
// Key invariants:
//   - Legacy eval requests without recipe fields behave identically.
//   - Recipe metadata is optional; absence is not an error.
//   - Recipe specs are validated against ContextRecipeSpec shape.
//   - Reports include recipe metadata when present.

import type { ContextRecipeSpec, ContextRecipeTrial } from "@lore/eval";

// ─────────────────────────────────────────────────────────────────────────
// Recipe-aware eval input (extends legacy body)
// ─────────────────────────────────────────────────────────────────────────

export interface RecipeEvalInput {
  /** Legacy: eval dataset (unchanged). */
  dataset?: unknown;
  /** Legacy: provider selection (unchanged). */
  provider?: string;
  /** Legacy: project scope (unchanged). */
  project_id?: string;
  projectId?: string;

  // ── Recipe-aware fields (all optional — preserve legacy) ────────────
  /** Recipe identifier per ContextRecipeSpec.id (e.g. "default-v209"). */
  recipe_id?: string;
  recipeId?: string;
  /** Full or partial recipe spec knobs. */
  recipe_spec?: Partial<ContextRecipeSpec>;
  recipeSpec?: Partial<ContextRecipeSpec>;
  /** Trial identifier for provenance linking. */
  recipe_trial_id?: string;
  recipeTrialId?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Recipe-aware eval metadata (extended response fields)
// ─────────────────────────────────────────────────────────────────────────

export interface RecipeEvalMetadata {
  /** Recipe identifier used for this run. */
  recipeId?: string;
  /** Recipe spec knobs used for this run. */
  recipeSpec?: Partial<ContextRecipeSpec>;
  /** Trial ID linking to a recipe trial. */
  trialId?: string;
  /** Which streams were enabled (from recipe spec). */
  enabledStreams?: string[];
  /** Whether temporal filtering was enabled. */
  temporalFilterEnabled?: boolean;
  /** Whether reranker was enabled. */
  rerankerEnabled?: boolean;
  /** RRF damping constant used. */
  rrfK?: number;
  /** Pipeline version this recipe targets. */
  minPipelineVersion?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Normalization helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Normalize recipe-related input from camelCase/snake_case body fields.
 * Preserves legacy: returns empty metadata when no recipe fields are present.
 */
export function normalizeRecipeInput(body: RecipeEvalInput): {
  recipeId?: string;
  recipeSpec?: Partial<ContextRecipeSpec>;
  trialId?: string;
} {
  const recipeId = body.recipe_id ?? body.recipeId;
  const recipeSpec = body.recipe_spec ?? body.recipeSpec;
  const trialId = body.recipe_trial_id ?? body.recipeTrialId;

  return {
    recipeId: recipeId || undefined,
    recipeSpec: recipeSpec || undefined,
    trialId: trialId || undefined,
  };
}

/**
 * Build recipe-aware metadata for inclusion in eval run records and responses.
 */
export function buildRecipeMetadata(opts: {
  recipeId?: string;
  recipeSpec?: Partial<ContextRecipeSpec>;
  trialId?: string;
}): RecipeEvalMetadata | undefined {
  const { recipeId, recipeSpec, trialId } = opts;

  // No recipe info at all → return undefined (preserve legacy shape).
  if (!recipeId && !recipeSpec && !trialId) return undefined;

  const metadata: RecipeEvalMetadata = {};

  if (recipeId) metadata.recipeId = recipeId;
  if (recipeSpec) {
    metadata.recipeSpec = recipeSpec;
    if (recipeSpec.enabledStreams) {
      metadata.enabledStreams = recipeSpec.enabledStreams;
    }
    metadata.temporalFilterEnabled = recipeSpec.temporalFilterEnabled;
    metadata.rerankerEnabled = recipeSpec.rerankerEnabled;
    metadata.rrfK = recipeSpec.rrfK;
    metadata.minPipelineVersion = recipeSpec.minPipelineVersion;
  }
  if (trialId) metadata.trialId = trialId;

  return metadata;
}

/**
 * Merge recipe metadata into an existing metrics object (for response).
 * Non-destructive — does not mutate the input.
 */
export function attachRecipeToMetrics<T extends Record<string, unknown>>(
  metrics: T,
  recipeMeta?: RecipeEvalMetadata,
): T & { recipe?: RecipeEvalMetadata } {
  if (!recipeMeta) return metrics as T & { recipe?: RecipeEvalMetadata };
  return { ...metrics, recipe: recipeMeta };
}

// ─────────────────────────────────────────────────────────────────────────
// Type narrowing — is this a recipe-aware request?
// ─────────────────────────────────────────────────────────────────────────

export function hasRecipeFields(body: RecipeEvalInput): boolean {
  return !!(
    body.recipe_id ||
    body.recipeId ||
    body.recipe_spec ||
    body.recipeSpec ||
    body.recipe_trial_id ||
    body.recipeTrialId
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Recipe spec validation
// ─────────────────────────────────────────────────────────────────────────

const VALID_STREAM_KINDS = new Set([
  "postgres_fts",
  "postgres_pgvector",
  "qdrant_dense",
  "qdrant_sparse",
  "graph",
  "temporal",
  "wiki",
]);

/**
 * Lightweight validation of recipe spec fields.
 * Returns warnings for unrecognized keys/values but does not reject.
 */
export function validateRecipeSpec(
  spec: Partial<Omit<ContextRecipeSpec, "enabledStreams"> & { enabledStreams?: string[] }>,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (spec.id && typeof spec.id !== "string") {
    warnings.push("recipe_spec.id must be a string");
  }
  if (spec.version && typeof spec.version !== "string") {
    warnings.push("recipe_spec.version must be a string");
  }
  if (spec.label && typeof spec.label !== "string") {
    warnings.push("recipe_spec.label must be a string");
  }
  if (spec.description && typeof spec.description !== "string") {
    warnings.push("recipe_spec.description must be a string");
  }
  if (spec.enabledStreams) {
    if (!Array.isArray(spec.enabledStreams)) {
      warnings.push("recipe_spec.enabledStreams must be an array");
    } else {
      for (const stream of spec.enabledStreams) {
        if (!VALID_STREAM_KINDS.has(stream)) {
          warnings.push(`Unknown stream kind: "${stream}"`);
        }
      }
    }
  }
  if (spec.weights !== undefined && typeof spec.weights !== "object") {
    warnings.push("recipe_spec.weights must be an object");
  }
  if (spec.temporalFilterEnabled !== undefined && typeof spec.temporalFilterEnabled !== "boolean") {
    warnings.push("recipe_spec.temporalFilterEnabled must be a boolean");
  }
  if (spec.rerankerEnabled !== undefined && typeof spec.rerankerEnabled !== "boolean") {
    warnings.push("recipe_spec.rerankerEnabled must be a boolean");
  }
  if (spec.rrfK !== undefined && typeof spec.rrfK !== "number") {
    warnings.push("recipe_spec.rrfK must be a number");
  }
  if (spec.perStreamTimeoutMs !== undefined && spec.perStreamTimeoutMs !== null && typeof spec.perStreamTimeoutMs !== "number") {
    warnings.push("recipe_spec.perStreamTimeoutMs must be a number or null");
  }
  if (spec.candidateLimit !== undefined && typeof spec.candidateLimit !== "number") {
    warnings.push("recipe_spec.candidateLimit must be a number");
  }
  if (spec.finalLimit !== undefined && typeof spec.finalLimit !== "number") {
    warnings.push("recipe_spec.finalLimit must be a number");
  }
  if (spec.minPipelineVersion !== undefined && typeof spec.minPipelineVersion !== "string") {
    warnings.push("recipe_spec.minPipelineVersion must be a string");
  }

  return { valid: warnings.length === 0, warnings };
}
