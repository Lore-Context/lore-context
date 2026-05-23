// Lore Context v1.4 — Lane D bi-temporal helpers (pure, dependency-free).
//
// Adds a second system-time axis alongside the existing business-validity axis.
// Does NOT modify or replace v1.2 temporal-memory-helpers.ts — all existing
// exports remain unchanged and callers that do not pass `asOf` get identical
// behaviour to the v1.2 path.
//
// Bi-temporal model (Zep paper arxiv 2501.13956 §3):
//   - systemTime (t_created / t_expired): when Lore first knew / stopped
//     believing a fact. Immutable after insert; set by the ingestion layer.
//   - validTime  (valid_from / valid_until): when the fact is true in the
//     business domain. Mutable; set by the application.
//
// The new exported function `latestValidBySubjectPredicateBiTemporal` filters
// on BOTH axes and returns the single best item for a given (subject, predicate)
// pair at the requested point in each dimension.

import type { SubjectPredicateRecord } from "./temporal-memory-helpers.js";

// Re-export everything from v1.2 so callers can import from one location.
export type { TemporalRecord, SubjectPredicateRecord } from "./temporal-memory-helpers.js";
export {
  isActiveAt,
  filterActiveAt,
  excludeSupersededOrExpired,
  latestValidBySubjectPredicate,
  selectActiveLatestBySubjectPredicate,
} from "./temporal-memory-helpers.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * System-time and business-validity point-in-time selectors.
 * Both default to "now" so callers that omit the argument get current-state
 * behaviour — identical to the v1.2 single-axis query.
 */
export interface BiTemporalAsOf {
  /**
   * System-recorded knowledge time. Controls which facts the system *knew*
   * at this instant. Filter: t_created <= systemTime AND
   *   (t_expired IS NULL OR t_expired > systemTime).
   * Default: new Date() (current knowledge snapshot).
   */
  systemTime?: Date;

  /**
   * Business validity time. Controls which facts were *valid in the domain*
   * at this instant. Filter: valid_from <= validTime AND
   *   (valid_until IS NULL OR valid_until > validTime).
   * Default: new Date() (currently valid facts).
   */
  validTime?: Date;
}

/**
 * Extension of SubjectPredicateRecord that includes the two system-time
 * columns added by schema-v13-bitemporal.sql.  The columns are nullable so
 * that in-memory test fixtures can omit them (they are treated as "known from
 * the beginning / not yet expired").
 */
export interface MemoryItemV12 extends SubjectPredicateRecord {
  /** The object (value) of the SPO triple — e.g. "Acme Corp" in
   *  subject=alice, predicate=works_at, object=Acme Corp. */
  object?: string | null;
  /** Plain-text content representation of the memory item. */
  content?: string | null;
  /** ISO-8601 timestamp — when Lore first recorded this fact (t_created). */
  tCreated?: string | null;
  /** ISO-8601 timestamp — when Lore stopped believing this fact (t_expired). */
  tExpired?: string | null;
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

function parseMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Returns true iff the item passes the system-time filter at `systemTime`.
 *
 * Semantics:
 *   - t_created <= systemTime   (the system knew this fact by systemTime)
 *   - t_expired IS NULL OR t_expired > systemTime  (exclusive upper bound —
 *     a fact expired *at* systemTime is no longer believed at that instant)
 *
 * A missing t_created is treated as "known from the beginning" (passes).
 * A missing t_expired is treated as "not yet expired" (passes).
 */
function passesSystemTime(item: MemoryItemV12, systemTimeMs: number): boolean {
  const tCreatedMs = parseMs(item.tCreated);
  if (tCreatedMs !== null && tCreatedMs > systemTimeMs) return false;

  const tExpiredMs = parseMs(item.tExpired);
  // Exclusive upper bound: t_expired > systemTime means still believed.
  // t_expired === systemTime means it expired exactly at that instant → exclude.
  if (tExpiredMs !== null && tExpiredMs <= systemTimeMs) return false;

  return true;
}

/**
 * Returns true iff the item passes the business-validity filter at `validTime`.
 *
 * Semantics mirror isActiveAt() from v1.2 temporal-memory-helpers, but:
 *   - Only checks valid_from / valid_until (not status / supersededBy) so
 *     callers can layer status filtering separately if they need it.
 *   - valid_from <= validTime (inclusive start)
 *   - valid_until > validTime (exclusive end — two consecutive ranges share
 *     no overlap at the boundary, matching v1.2 contract)
 *
 * A missing valid_from means "valid from the beginning of time" (passes).
 * A missing valid_until means "valid indefinitely" (passes).
 */
function passesValidTime(item: MemoryItemV12, validTimeMs: number): boolean {
  const fromMs = parseMs(item.validFrom ?? null);
  if (fromMs !== null && fromMs > validTimeMs) return false;

  const untilMs = parseMs(item.validUntil ?? null);
  // Exclusive upper bound, consistent with v1.2 isActiveAt.
  if (untilMs !== null && untilMs <= validTimeMs) return false;

  return true;
}

function recencyMs(item: MemoryItemV12): number {
  return (
    parseMs(item.updatedAt) ??
    parseMs(item.validFrom ?? null) ??
    parseMs(item.createdAt) ??
    0
  );
}

function bucketKey(item: MemoryItemV12): string {
  const subject = (item.subject ?? "").trim().toLowerCase();
  const predicate = (item.predicate ?? "").trim().toLowerCase();
  if (!subject || !predicate) return "";
  return `${subject}::${predicate}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * For a given (subject, predicate) pair, return the single most-recent item
 * that passes **both** the system-time and business-validity filters.
 *
 * Algorithm:
 *   1. Filter items to those where t_created <= systemTime AND
 *      (t_expired IS NULL OR t_expired > systemTime).
 *   2. From that set, filter to those where valid_from <= validTime AND
 *      (valid_until IS NULL OR valid_until > validTime).
 *   3. From the doubly-filtered set, select the item with matching subject +
 *      predicate that has the latest recency key (updatedAt → validFrom →
 *      createdAt).
 *
 * Returns `undefined` when no item passes both filters for the requested pair.
 *
 * The v1.2 function `latestValidBySubjectPredicate` is unchanged — this is a
 * purely additive companion that adds the system-time axis.
 */
export function latestValidBySubjectPredicateBiTemporal(
  items: MemoryItemV12[],
  subject: string,
  predicate: string,
  asOf: BiTemporalAsOf = {},
): MemoryItemV12 | undefined {
  const systemTimeMs = (asOf.systemTime ?? new Date()).getTime();
  const validTimeMs = (asOf.validTime ?? new Date()).getTime();

  const normalizedSubject = subject.trim().toLowerCase();
  const normalizedPredicate = predicate.trim().toLowerCase();

  let best: MemoryItemV12 | undefined;
  let bestRecency = -Infinity;

  for (const item of items) {
    // Subject + predicate must match the requested pair.
    const itemKey = bucketKey(item);
    const targetKey = `${normalizedSubject}::${normalizedPredicate}`;
    if (itemKey !== targetKey) continue;

    // Apply system-time filter (axis 1).
    if (!passesSystemTime(item, systemTimeMs)) continue;

    // Apply business-validity filter (axis 2).
    if (!passesValidTime(item, validTimeMs)) continue;

    // Among survivors pick the most recent by recency key.
    const r = recencyMs(item);
    if (r > bestRecency) {
      best = item;
      bestRecency = r;
    }
  }

  return best;
}
