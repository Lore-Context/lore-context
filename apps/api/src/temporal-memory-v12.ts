// Lore Context v1.2 — Lane C temporal helpers.
//
// In v1.3 Lane A2 the pure predicate helpers were moved into
// packages/search/src/temporal-memory-helpers.ts so that the search package
// can own the temporal logic without importing from apps/api. This file
// re-exports everything from that module to preserve the existing public API.

export type {
  TemporalRecord,
  SubjectPredicateRecord
} from "@lore/search/temporal-memory-helpers";
export {
  isActiveAt,
  filterActiveAt,
  excludeSupersededOrExpired,
  latestValidBySubjectPredicate,
  selectActiveLatestBySubjectPredicate
} from "@lore/search/temporal-memory-helpers";
