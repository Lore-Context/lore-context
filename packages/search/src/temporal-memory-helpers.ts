// Lore Context v1.2 — Temporal helpers (pure, dependency-free).
//
// Originally authored in apps/api/src/temporal-memory-v12.ts (Lane C).
// Moved here in v1.3 Lane A2 so packages/search can own the temporal
// predicate logic without importing from apps/api. apps/api re-exports
// everything from this module to preserve its existing public API.
//
// Plan §7.5 rules:
//   - valid_until <= validAt records are not active.
//   - valid_from > validAt records have not yet started.
//   - supersededBy is never recallable as active.
//   - Same (subject, predicate) group: pick latest valid + highest confidence.

export interface TemporalRecord {
  status?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  supersededBy?: string | null;
}

const ACTIVE_STATUSES = new Set(["active"]);
const HARD_INACTIVE_STATUSES = new Set([
  "expired",
  "superseded",
  "redacted",
  "deleted",
  "invalidated"
]);

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function resolveValidAt(validAt: string | Date | undefined): number {
  if (validAt instanceof Date) return validAt.getTime();
  if (typeof validAt === "string") {
    const ms = Date.parse(validAt);
    if (!Number.isFinite(ms)) {
      throw new RangeError(`temporal-memory-v12: invalid validAt timestamp: ${validAt}`);
    }
    return ms;
  }
  return Date.now();
}

/**
 * True iff the record is recallable as "active" at the requested timestamp.
 * Defaults to *now* when `validAt` is omitted. Hard-inactive statuses
 * (`superseded`, `expired`, `redacted`, `deleted`, `invalidated`) always
 * fail. `supersededBy` always fails. `valid_from` / `valid_until` are
 * compared inclusive-of-start, exclusive-of-end so two consecutive
 * timeline ranges never both look "active" at the boundary.
 */
export function isActiveAt<T extends TemporalRecord>(record: T, validAt?: string | Date): boolean {
  if (!record) return false;
  if (record.supersededBy) return false;
  if (record.status && HARD_INACTIVE_STATUSES.has(record.status)) return false;
  if (record.status && !ACTIVE_STATUSES.has(record.status) && !record.status.startsWith("active")) {
    // Tolerate vaults that introduce "active_*" sub-states without breaking the
    // base contract; explicit non-active states fall through.
    if (!HARD_INACTIVE_STATUSES.has(record.status)) {
      // Default to inactive when we don't know the status.
      return false;
    }
  }
  const at = resolveValidAt(validAt);
  const fromMs = parseTimestamp(record.validFrom);
  const untilMs = parseTimestamp(record.validUntil);
  if (fromMs !== null && fromMs > at) return false;
  if (untilMs !== null && untilMs <= at) return false;
  return true;
}

/**
 * Filter to records active at `validAt`. Stable ordering — the result is in
 * the same order as `records`.
 */
export function filterActiveAt<T extends TemporalRecord>(records: T[], validAt?: string | Date): T[] {
  return records.filter((record) => isActiveAt(record, validAt));
}

/**
 * Drop records that have been superseded or hard-expired, regardless of
 * `valid_from`. Useful for pre-filtering candidate sets before scoring.
 */
export function excludeSupersededOrExpired<T extends TemporalRecord>(records: T[]): T[] {
  return records.filter((record) => {
    if (record.supersededBy) return false;
    if (record.status && HARD_INACTIVE_STATUSES.has(record.status)) return false;
    return true;
  });
}

export interface SubjectPredicateRecord extends TemporalRecord {
  subject?: string | null;
  predicate?: string | null;
  confidence?: number | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

function bucketKey(record: SubjectPredicateRecord): string {
  const subject = (record.subject ?? "").trim().toLowerCase();
  const predicate = (record.predicate ?? "").trim().toLowerCase();
  if (!subject || !predicate) return "";
  return `${subject}::${predicate}`;
}

function recencyKey(record: SubjectPredicateRecord): number {
  return (
    parseTimestamp(record.updatedAt) ??
    parseTimestamp(record.validFrom) ??
    parseTimestamp(record.createdAt) ??
    0
  );
}

/**
 * For each `(subject, predicate)` group keep the single latest valid record.
 * Records missing both fields short-circuit and are returned as-is so callers
 * can mix structured + unstructured items in the same query without losing
 * unstructured rows.
 *
 * Tie-breaker order:
 *   1. active at `validAt`
 *   2. higher `confidence`
 *   3. newer `updatedAt` (falls back to `validFrom` then `createdAt`)
 */
export function latestValidBySubjectPredicate<T extends SubjectPredicateRecord>(
  records: T[],
  validAt?: string | Date
): T[] {
  const buckets = new Map<string, T>();
  const passthrough: T[] = [];
  for (const record of records) {
    const key = bucketKey(record);
    if (!key) {
      passthrough.push(record);
      continue;
    }
    const incumbent = buckets.get(key);
    if (!incumbent) {
      buckets.set(key, record);
      continue;
    }
    const incumbentActive = isActiveAt(incumbent, validAt);
    const candidateActive = isActiveAt(record, validAt);
    if (candidateActive && !incumbentActive) {
      buckets.set(key, record);
      continue;
    }
    if (!candidateActive && incumbentActive) continue;
    const confDelta = (record.confidence ?? 0) - (incumbent.confidence ?? 0);
    if (confDelta > 0) {
      buckets.set(key, record);
      continue;
    }
    if (confDelta < 0) continue;
    if (recencyKey(record) > recencyKey(incumbent)) {
      buckets.set(key, record);
    }
  }
  return [...passthrough, ...buckets.values()];
}

/**
 * Convenience: filter + dedupe by subject/predicate. The plan describes this
 * as the production path used by the temporal retriever; expose a single
 * function so callers don't have to compose three helpers in order.
 */
export function selectActiveLatestBySubjectPredicate<T extends SubjectPredicateRecord>(
  records: T[],
  validAt?: string | Date
): T[] {
  return latestValidBySubjectPredicate(filterActiveAt(records, validAt), validAt);
}
