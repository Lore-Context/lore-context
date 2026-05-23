// Lore v2.0.9 — Lane B1: Passive Agent-Evidence Dataset Generator.
//
// Builds tenant/project-scoped EvalCaseV12 datasets from passive agent
// execution evidence / Evidence Ledger style inputs. Supports all six
// case types from the plan/test strategy:
//
//   1. positive_recall     – expected memory was used
//   2. stale_memory         – stale memory was correctly ignored
//   3. negative_leak        – risky/sensitive memory must NOT leak
//   4. conflict_resolution  – conflicting memory resolved against winner
//   5. temporal_update      – temporally-scoped recall
//   6. stream_coverage      – cross-stream / specific stream expectations
//
// Deterministic redaction/hash via SHA-256 so generated cases do not
// expose raw sensitive memory or trace content. Uses the existing
// `redactSensitiveContent()` guardrail function.

import { createHash } from "node:crypto";
import type { EvalCaseV12, EvalDatasetV12, MemorySearchStreamKind, QueryIntent } from "./types-v12.js";
import { redactSensitiveContent, REDACTION_PLACEHOLDER } from "./guardrails.js";

// ─────────────────────────────────────────────────────────────────────────
// Passive case types
// ─────────────────────────────────────────────────────────────────────────

export type PassiveCaseType =
  | "positive_recall"
  | "stale_memory"
  | "negative_leak"
  | "conflict_resolution"
  | "temporal_update"
  | "stream_coverage";

export const ALL_PASSIVE_CASE_TYPES: PassiveCaseType[] = [
  "positive_recall",
  "stale_memory",
  "negative_leak",
  "conflict_resolution",
  "temporal_update",
  "stream_coverage",
];

// ─────────────────────────────────────────────────────────────────────────
// Input types – mirrors EvidenceLedgerTrace shape without importing from
// @lore/profile (avoids coupling the eval package to profile internals).
// ─────────────────────────────────────────────────────────────────────────

export interface PassiveEvidenceEntry {
  /** Memory ID (e.g. "mem_abc123"). */
  memoryId: string;
  /** Disposition: how the memory was treated during composition. */
  disposition: "used" | "ignored" | "stale" | "risky" | "conflicting" | "missing";
  /** Risk tags attached to this memory (e.g. ["api_key", "needs_review"]). */
  riskTags: string[];
  /** Whether the memory was superseded by another. */
  supersededBy?: string | null;
  /** Whether the memory contradicts another (target memory ID). */
  contradicts?: string | null;
  /** When the memory's validity expires (ISO-8601). */
  validUntil?: string | null;
  /** Which retrieval streams fired for this memory. */
  streamsFired?: MemorySearchStreamKind[];
  /** Optional content preview (will be redacted). */
  contentPreview?: string;
}

export interface PassiveEvidenceTrace {
  /** Trace or ledger identifier. */
  traceId: string;
  /** Vault identifier. */
  vaultId: string;
  /** Tenant/project scope. */
  projectId?: string;
  /** Agent that produced this evidence. */
  agentId?: string;
  /** The original query that triggered retrieval. */
  query: string;
  /** Retrieved memory entries with their dispositions. */
  entries: PassiveEvidenceEntry[];
  /** ISO-8601 timestamp. */
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Generator options
// ─────────────────────────────────────────────────────────────────────────

export interface PassiveEvalGeneratorOptions {
  /** Tenant/project scope filter. When set, only traces matching this project are included. */
  projectId?: string;
  /** Max cases per case type (prevents unbounded generation). */
  maxCasesPerType?: number;
  /** Override the hash seed prefix. Default: "lore-passive-eval-v209". */
  seedPrefix?: string;
  /** Dataset version string. Default: "1.0.0". */
  version?: string;
  /** Minimum risk tags threshold for negative_leak cases. Default: 1. */
  minRiskTagsForLeak?: number;
  /** Whether to include contentPreview in generated tag (redacted). Default: true. */
  includeRedactedPreview?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<PassiveEvalGeneratorOptions, "projectId">> = {
  maxCasesPerType: 250,
  seedPrefix: "lore-passive-eval-v209",
  version: "1.0.0",
  minRiskTagsForLeak: 1,
  includeRedactedPreview: true,
};

// ─────────────────────────────────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────────────────────────────────

export interface GeneratedDataset {
  dataset: EvalDatasetV12;
  /** Counts of generated cases by type. */
  counts: Record<PassiveCaseType, number>;
  /** SHA-256 of the dataset (for provenance). */
  datasetSha256: string;
  /** Traces that were included. */
  traceIds: string[];
}

/**
 * Build an EvalDatasetV12 from passive agent evidence traces.
 *
 * Each trace contributes up to one case per case-type if the trace
 * contains matching evidence. The generator is deterministic: same
 * inputs produce the same dataset (modulo timestamp, which is
 * frozen at generation time).
 */
export function generatePassiveEvalDataset(
  traces: PassiveEvidenceTrace[],
  opts: PassiveEvalGeneratorOptions = {},
): GeneratedDataset {
  const resolved: Required<Omit<PassiveEvalGeneratorOptions, "projectId">> & Pick<PassiveEvalGeneratorOptions, "projectId"> = {
    ...DEFAULT_OPTIONS,
    ...opts,
  };

  // Filter by project scope if specified.
  const filtered = resolved.projectId
    ? traces.filter((t) => !t.projectId || t.projectId === resolved.projectId)
    : traces;

  const cases: EvalCaseV12[] = [];
  const counts: Record<PassiveCaseType, number> = {
    positive_recall: 0,
    stale_memory: 0,
    negative_leak: 0,
    conflict_resolution: 0,
    temporal_update: 0,
    stream_coverage: 0,
  };
  const includedTraceIds: string[] = [];

  for (const trace of filtered) {
    if (cases.length >= resolved.maxCasesPerType * 6) break;

    // ── positive_recall ──────────────────────────────────────────────
    const usedEntries = trace.entries.filter((e) => e.disposition === "used");
    if (usedEntries.length > 0 && counts.positive_recall < resolved.maxCasesPerType) {
      const entry = usedEntries[0];
      cases.push(buildCase("positive_recall", trace, entry, resolved));
      counts.positive_recall++;
    }

    // ── stale_memory ─────────────────────────────────────────────────
    const staleEntries = trace.entries.filter((e) => e.disposition === "stale");
    if (staleEntries.length > 0 && counts.stale_memory < resolved.maxCasesPerType) {
      const entry = staleEntries[0];
      cases.push(buildCase("stale_memory", trace, entry, resolved));
      counts.stale_memory++;
    }

    // ── negative_leak ────────────────────────────────────────────────
    const riskyEntries = trace.entries.filter(
      (e) => e.riskTags.length >= resolved.minRiskTagsForLeak,
    );
    if (riskyEntries.length > 0 && counts.negative_leak < resolved.maxCasesPerType) {
      const entry = riskyEntries[0];
      cases.push(buildCase("negative_leak", trace, entry, resolved));
      counts.negative_leak++;
    }

    // ── conflict_resolution ──────────────────────────────────────────
    const conflictEntries = trace.entries.filter(
      (e) => e.disposition === "conflicting" || (e.contradicts && e.contradicts.length > 0),
    );
    if (conflictEntries.length > 0 && counts.conflict_resolution < resolved.maxCasesPerType) {
      const entry = conflictEntries[0];
      cases.push(buildCase("conflict_resolution", trace, entry, resolved));
      counts.conflict_resolution++;
    }

    // ── temporal_update ──────────────────────────────────────────────
    const temporalEntries = trace.entries.filter((e) => e.validUntil);
    if (temporalEntries.length > 0 && counts.temporal_update < resolved.maxCasesPerType) {
      const entry = temporalEntries[0];
      cases.push(buildCase("temporal_update", trace, entry, resolved));
      counts.temporal_update++;
    }

    // ── stream_coverage ──────────────────────────────────────────────
    const streamEntries = trace.entries.filter(
      (e) => e.streamsFired && e.streamsFired.length >= 2,
    );
    if (streamEntries.length > 0 && counts.stream_coverage < resolved.maxCasesPerType) {
      const entry = streamEntries[0];
      cases.push(buildCase("stream_coverage", trace, entry, resolved));
      counts.stream_coverage++;
    }

    if (
      usedEntries.length > 0 ||
      staleEntries.length > 0 ||
      riskyEntries.length > 0 ||
      conflictEntries.length > 0 ||
      temporalEntries.length > 0 ||
      streamEntries.length > 0
    ) {
      includedTraceIds.push(trace.traceId);
    }
  }

  // Sort cases by type for deterministic output ordering.
  const typeOrder: Record<PassiveCaseType, number> = {
    positive_recall: 0,
    stale_memory: 1,
    negative_leak: 2,
    conflict_resolution: 3,
    temporal_update: 4,
    stream_coverage: 5,
  };
  cases.sort((a, b) => {
    const aType = a.tags.find((t) => t in typeOrder) ?? "";
    const bType = b.tags.find((t) => t in typeOrder) ?? "";
    return (typeOrder[aType as PassiveCaseType] ?? 99) - (typeOrder[bType as PassiveCaseType] ?? 99);
  });

  const datasetName = resolved.projectId
    ? `passive-eval-${resolved.projectId}`
    : "passive-eval";

  const dataset: EvalDatasetV12 = {
    name: datasetName,
    version: resolved.version,
    items: cases,
  };

  const datasetSha256 = hashJson(dataset);

  return { dataset, counts, datasetSha256, traceIds: includedTraceIds };
}

// ─────────────────────────────────────────────────────────────────────────
// Case builder
// ─────────────────────────────────────────────────────────────────────────

function buildCase(
  caseType: PassiveCaseType,
  trace: PassiveEvidenceTrace,
  entry: PassiveEvidenceEntry,
  opts: Required<Omit<PassiveEvalGeneratorOptions, "projectId">> & Pick<PassiveEvalGeneratorOptions, "projectId">,
): EvalCaseV12 {
  const caseId = deterministicCaseId(opts.seedPrefix, caseType, trace.traceId, entry.memoryId);
  const redactedPreview = entry.contentPreview
    ? redactSensitiveContent(entry.contentPreview).redacted
    : REDACTION_PLACEHOLDER;

  // Build tags: always include the case type, trace-level metadata, and redacted preview.
  const tags: string[] = [caseType];
  if (trace.projectId) tags.push(`project:${trace.projectId}`);
  if (trace.agentId) tags.push(`agent:${trace.agentId}`);
  if (opts.includeRedactedPreview && redactedPreview !== REDACTION_PLACEHOLDER) {
    // Truncate redacted preview to reasonable tag length.
    tags.push(`preview:${redactedPreview.slice(0, 80)}`);
  }

  // Determine expected/negative mappings per case type.
  const {
    expectedIds,
    negativeIds,
    queryIntent,
    streamsExpected,
    validAt,
  } = caseTypeToEvalParams(caseType, trace, entry);

  return {
    id: caseId,
    query: trace.query,
    expected_memory_ids: expectedIds,
    expected_top3_ids: expectedIds.slice(0, 3),
    tags,
    negative_ids: negativeIds.length > 0 ? negativeIds : undefined,
    query_intent: queryIntent,
    streams_expected: streamsExpected.length > 0 ? streamsExpected : undefined,
    valid_at: validAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Case-type → Eval params mapping
// ─────────────────────────────────────────────────────────────────────────

interface CaseEvalParams {
  expectedIds: string[];
  negativeIds: string[];
  queryIntent: QueryIntent;
  streamsExpected: MemorySearchStreamKind[];
  validAt?: string;
}

function caseTypeToEvalParams(
  caseType: PassiveCaseType,
  trace: PassiveEvidenceTrace,
  entry: PassiveEvidenceEntry,
): CaseEvalParams {
  switch (caseType) {
    case "positive_recall":
      // Expected: the used memory should appear in top-K.
      return {
        expectedIds: [entry.memoryId],
        negativeIds: [],
        queryIntent: "semantic",
        streamsExpected: [],
      };

    case "stale_memory":
      // Expected: NO stale memories in top-K → empty expected_ids.
      // Negative: the stale memory must NOT appear.
      return {
        expectedIds: [],
        negativeIds: [entry.memoryId],
        queryIntent: "temporal",
        streamsExpected: ["temporal"],
      };

    case "negative_leak":
      // Expected: NO risky memories in top-K → empty expected_ids.
      // Negative: the risky memory must NOT appear.
      return {
        expectedIds: [],
        negativeIds: [entry.memoryId],
        queryIntent: "negative",
        streamsExpected: [],
      };

    case "conflict_resolution": {
      // Expected: the winner (superseding memory) should appear.
      // Negative: the conflicting memory should NOT appear.
      const winnerId = entry.supersededBy ?? undefined;
      return {
        expectedIds: winnerId ? [winnerId] : [],
        negativeIds: [entry.memoryId],
        queryIntent: "relation",
        streamsExpected: ["graph"],
      };
    }

    case "temporal_update":
      // Expected: the memory should be retrievable at its valid_at time.
      return {
        expectedIds: [entry.memoryId],
        negativeIds: [],
        queryIntent: "temporal",
        streamsExpected: ["temporal"],
        validAt: entry.validUntil ?? trace.createdAt,
      };

    case "stream_coverage":
      // Expected: the memory should be findable via its recorded streams.
      return {
        expectedIds: [entry.memoryId],
        negativeIds: [],
        queryIntent: "semantic",
        streamsExpected: entry.streamsFired ?? [],
      };

    default:
      return {
        expectedIds: [],
        negativeIds: [],
        queryIntent: "semantic",
        streamsExpected: [],
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Deterministic ID and hash helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Produce a deterministic case ID: SHA-256 of (seedPrefix + caseType + traceId + memoryId),
 * truncated to 16 hex chars prefixed with "case_".
 */
export function deterministicCaseId(
  seedPrefix: string,
  caseType: string,
  traceId: string,
  memoryId: string,
): string {
  const seed = `${seedPrefix}|${caseType}|${traceId}|${memoryId}`;
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 16);
  return `case_${hash}`;
}

/**
 * Deterministic SHA-256 hash of a JSON-serializable object.
 * Used for dataset provenance checks.
 */
export function hashJson(obj: unknown): string {
  const json = JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
  return createHash("sha256").update(json).digest("hex");
}

/**
 * Redact a content string using the existing guardrail redactor.
 * Exposed for testing.
 */
export function redactContent(content: string): string {
  return redactSensitiveContent(content).redacted;
}
