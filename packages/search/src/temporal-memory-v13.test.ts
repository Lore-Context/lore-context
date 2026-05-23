// Lore Context v1.4 — Lane D bi-temporal unit tests.
//
// Covers latestValidBySubjectPredicateBiTemporal across all required cases:
//   1. systemTime default = now → returns current believed fact
//   2. systemTime = T-1d       → returns what system believed then
//   3. validTime = T+1d        → returns future-valid fact
//   4. dual axis: systemTime=T-1d AND validTime=T-2d
//   5. boundary: t_expired === systemTime → exclude
//   6. empty items → undefined

import { describe, it, expect } from "vitest";
import {
  latestValidBySubjectPredicateBiTemporal,
  type MemoryItemV12,
  type BiTemporalAsOf,
} from "./temporal-memory-v13.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date("2026-05-05T12:00:00.000Z");
const T_MINUS_1D = new Date("2026-05-04T12:00:00.000Z");
const T_MINUS_2D = new Date("2026-05-03T12:00:00.000Z");
const T_PLUS_1D = new Date("2026-05-06T12:00:00.000Z");

/** Build a minimal MemoryItemV12 with defaults that pass all filters. */
function item(overrides: Partial<MemoryItemV12> = {}): MemoryItemV12 {
  return {
    subject: "alice",
    predicate: "works_at",
    object: "Acme Corp",
    content: "Alice works at Acme Corp",
    status: "active",
    createdAt: T_MINUS_2D.toISOString(),
    updatedAt: T_MINUS_2D.toISOString(),
    // By default: known from T-2d, not expired.
    tCreated: T_MINUS_2D.toISOString(),
    tExpired: null,
    // By default: valid from T-2d with no upper bound.
    validFrom: T_MINUS_2D.toISOString(),
    validUntil: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("latestValidBySubjectPredicateBiTemporal", () => {
  // ── Case 1: default systemTime = now (no asOf passed) ─────────────────────
  it("returns a fact visible at current time when no asOf is provided", () => {
    // The item was created 2 days ago and has no expiry — should be visible now.
    const items: MemoryItemV12[] = [item()];
    const result = latestValidBySubjectPredicateBiTemporal(
      items,
      "alice",
      "works_at",
    );
    expect(result).toBeDefined();
    expect(result?.object).toBe("Acme Corp");
  });

  it("returns undefined for a fact not yet created when no asOf is provided", () => {
    // t_created is in the future — system does not know it yet.
    const items: MemoryItemV12[] = [
      item({ tCreated: T_PLUS_1D.toISOString() }),
    ];
    // Current time is effectively Date.now() >> T_PLUS_1D; but to make the
    // test deterministic we pass asOf.systemTime = NOW explicitly.
    const result = latestValidBySubjectPredicateBiTemporal(
      items,
      "alice",
      "works_at",
      { systemTime: NOW },
    );
    expect(result).toBeUndefined();
  });

  // ── Case 2: systemTime = T-1d (time-travel into the past) ─────────────────
  it("returns a fact the system believed at T-1d even if it was superseded later", () => {
    const oldFact = item({
      object: "OldCorp",
      tCreated: T_MINUS_2D.toISOString(),
      tExpired: null, // system still believes it as of T-1d
      updatedAt: T_MINUS_2D.toISOString(),
    });
    const newFact = item({
      object: "NewCorp",
      tCreated: NOW.toISOString(), // system only learned this at NOW
      tExpired: null,
      updatedAt: NOW.toISOString(),
    });

    const result = latestValidBySubjectPredicateBiTemporal(
      [oldFact, newFact],
      "alice",
      "works_at",
      { systemTime: T_MINUS_1D },
    );
    // At T-1d the system only knew about OldCorp.
    expect(result?.object).toBe("OldCorp");
  });

  it("returns undefined when the only fact was created after systemTime", () => {
    const items: MemoryItemV12[] = [
      item({ tCreated: NOW.toISOString() }),
    ];
    const result = latestValidBySubjectPredicateBiTemporal(
      items,
      "alice",
      "works_at",
      { systemTime: T_MINUS_1D },
    );
    expect(result).toBeUndefined();
  });

  // ── Case 3: validTime = T+1d (future-valid fact) ───────────────────────────
  it("returns a fact that is valid in the future when validTime is set accordingly", () => {
    const futureFact = item({
      object: "FutureCorp",
      validFrom: T_PLUS_1D.toISOString(),
      validUntil: null,
      tCreated: T_MINUS_2D.toISOString(), // system knew about it early
    });
    const result = latestValidBySubjectPredicateBiTemporal(
      [futureFact],
      "alice",
      "works_at",
      { systemTime: NOW, validTime: T_PLUS_1D },
    );
    // valid_from === validTime is an exact match — inclusive start means pass.
    expect(result?.object).toBe("FutureCorp");
  });

  it("does NOT return a future-valid fact when querying at current validTime", () => {
    const futureFact = item({
      object: "FutureCorp",
      validFrom: T_PLUS_1D.toISOString(),
      validUntil: null,
    });
    const result = latestValidBySubjectPredicateBiTemporal(
      [futureFact],
      "alice",
      "works_at",
      { systemTime: NOW, validTime: NOW },
    );
    expect(result).toBeUndefined();
  });

  // ── Case 4: dual axis — systemTime=T-1d AND validTime=T-2d ────────────────
  it("applies both axes simultaneously", () => {
    // Fact A: system knew at T-2d; valid from T-2d with no upper bound.
    const factA = item({
      object: "FactA",
      tCreated: T_MINUS_2D.toISOString(),
      tExpired: null,
      validFrom: T_MINUS_2D.toISOString(),
      validUntil: null,
      updatedAt: T_MINUS_2D.toISOString(),
    });
    // Fact B: system only knew at NOW; valid from T-2d.
    const factB = item({
      object: "FactB",
      tCreated: NOW.toISOString(),
      tExpired: null,
      validFrom: T_MINUS_2D.toISOString(),
      validUntil: null,
      updatedAt: NOW.toISOString(),
    });

    const result = latestValidBySubjectPredicateBiTemporal(
      [factA, factB],
      "alice",
      "works_at",
      { systemTime: T_MINUS_1D, validTime: T_MINUS_2D },
    );
    // At T-1d the system only knew FactA; FactB fails system-time filter.
    expect(result?.object).toBe("FactA");
  });

  // ── Case 5: t_expired === systemTime exactly → EXCLUDE ────────────────────
  it("excludes a fact whose t_expired equals systemTime exactly (exclusive upper bound)", () => {
    const expiredExactly = item({
      object: "ExpiredAtBoundary",
      tCreated: T_MINUS_2D.toISOString(),
      tExpired: NOW.toISOString(), // expired exactly at NOW
    });
    const result = latestValidBySubjectPredicateBiTemporal(
      [expiredExactly],
      "alice",
      "works_at",
      { systemTime: NOW },
    );
    // t_expired === systemTime means the system stopped believing it at that
    // exact instant — the fact is no longer visible AT that time.
    expect(result).toBeUndefined();
  });

  it("includes a fact whose t_expired is strictly after systemTime", () => {
    const stillValid = item({
      object: "StillValid",
      tCreated: T_MINUS_2D.toISOString(),
      tExpired: T_PLUS_1D.toISOString(), // expires after NOW
    });
    const result = latestValidBySubjectPredicateBiTemporal(
      [stillValid],
      "alice",
      "works_at",
      { systemTime: NOW },
    );
    expect(result?.object).toBe("StillValid");
  });

  // ── Case 6: empty items → undefined ────────────────────────────────────────
  it("returns undefined when items array is empty", () => {
    const result = latestValidBySubjectPredicateBiTemporal(
      [],
      "alice",
      "works_at",
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when no items match the requested subject + predicate", () => {
    const items: MemoryItemV12[] = [
      item({ subject: "bob", predicate: "lives_in" }),
    ];
    const result = latestValidBySubjectPredicateBiTemporal(
      items,
      "alice",
      "works_at",
    );
    expect(result).toBeUndefined();
  });

  // ── Tie-breaking: multiple survivors → pick most recent ───────────────────
  it("picks the most recently updated item when multiple items pass both filters", () => {
    const older = item({
      object: "OlderFact",
      updatedAt: T_MINUS_2D.toISOString(),
    });
    const newer = item({
      object: "NewerFact",
      updatedAt: T_MINUS_1D.toISOString(),
    });

    const result = latestValidBySubjectPredicateBiTemporal(
      [older, newer],
      "alice",
      "works_at",
      { systemTime: NOW, validTime: NOW },
    );
    expect(result?.object).toBe("NewerFact");
  });

  // ── Normalisation: subject/predicate comparison is case-insensitive / trimmed
  it("matches subject and predicate case-insensitively and trims whitespace", () => {
    const items: MemoryItemV12[] = [item()]; // subject="alice", predicate="works_at"
    const result = latestValidBySubjectPredicateBiTemporal(
      items,
      "  Alice  ",
      "WORKS_AT",
      { systemTime: NOW, validTime: NOW },
    );
    expect(result).toBeDefined();
  });
});
