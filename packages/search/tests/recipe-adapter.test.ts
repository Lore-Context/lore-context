// Lore v2.0.9 — Wave 0: Recipe Adapter tests (BRA-633).
//
// Covers:
//   RA-1   mapRecipeToAdapterConfig: all fields mapped correctly.
//   RA-2   mapRecipeToAdapterConfig: unknown streams filtered out.
//   RA-3   mapRecipeToAdapterConfig: empty recipe → defaults.
//   RA-4   mapRecipeToAdapterConfig: perStreamTimeoutMs null passthrough.
//   RA-5   mergeRecipeWithBaseConfig: recipe overrides base.
//   RA-6   mergeRecipeWithBaseConfig: base retains non-overlap fields.

import { describe, expect, it } from "vitest";
import {
  mapRecipeToAdapterConfig,
  mergeRecipeWithBaseConfig,
} from "../src/recipe-adapter.js";
import type { RecipeKnobs } from "../src/index.js";
import type { SearchAdapterV14Config } from "../src/search-adapter-v14.js";

// ─────────────────────────────────────────────────────────────────────────
// RA-1: Full mapping.
// ─────────────────────────────────────────────────────────────────────────

describe("RA-1 — mapRecipeToAdapterConfig full mapping", () => {
  it("maps all known fields from recipe knobs to adapter config", () => {
    const recipe: RecipeKnobs = {
      enabledStreams: ["postgres_fts", "qdrant_dense", "graph"],
      weights: { postgres_fts: 1.2, qdrant_dense: 0.9, graph: 0.8 },
      rrfK: 55,
      perStreamTimeoutMs: null,
    };

    const config = mapRecipeToAdapterConfig(recipe);

    expect(config.enabledStreams).toEqual(["postgres_fts", "qdrant_dense", "graph"]);
    expect(config.weights).toEqual({ postgres_fts: 1.2, qdrant_dense: 0.9, graph: 0.8 });
    expect(config.rrfK).toBe(55);
    expect(config.perStreamTimeoutMs).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// RA-2: Unknown streams filtered.
// ─────────────────────────────────────────────────────────────────────────

describe("RA-2 — unknown streams filtered", () => {
  it("drops stream kinds not in the valid set and keeps valid ones", () => {
    const recipe: RecipeKnobs = {
      enabledStreams: ["postgres_fts", "invalid_stream", "wiki"],
      weights: { invalid_stream: 9.9, wiki: 0.65 },
    };

    const config = mapRecipeToAdapterConfig(recipe);

    expect(config.enabledStreams).toEqual(["postgres_fts", "wiki"]);
    expect(config.weights).toEqual({ wiki: 0.65 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// RA-3: Empty recipe → defaults.
// ─────────────────────────────────────────────────────────────────────────

describe("RA-3 — empty recipe defaults", () => {
  it("returns undefined fields for an empty recipe", () => {
    const config = mapRecipeToAdapterConfig({});
    // enabledStreams defaults to all 7 when recipe doesn't specify → returns all
    expect(config.enabledStreams).toBeDefined();
    expect(config.enabledStreams!.length).toBe(7);
    // weights is undefined when no weights given
    expect(config.weights).toBeUndefined();
    expect(config.rrfK).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// RA-4: perStreamTimeoutMs passthrough.
// ─────────────────────────────────────────────────────────────────────────

describe("RA-4 — perStreamTimeoutMs passthrough", () => {
  it("passes null through as null", () => {
    const config = mapRecipeToAdapterConfig({ perStreamTimeoutMs: null });
    expect(config.perStreamTimeoutMs).toBeNull();
  });

  it("passes numeric timeout through", () => {
    const config = mapRecipeToAdapterConfig({ perStreamTimeoutMs: 500 });
    expect(config.perStreamTimeoutMs).toBe(500);
  });

  it("omits perStreamTimeoutMs when not set", () => {
    const config = mapRecipeToAdapterConfig({});
    expect(config.perStreamTimeoutMs).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// RA-5: mergeRecipeWithBaseConfig — recipe overrides base.
// ─────────────────────────────────────────────────────────────────────────

describe("RA-5 — mergeRecipeWithBaseConfig: recipe override", () => {
  const basePool = {
    query: async () => ({ rows: [] }),
  } as unknown as SearchAdapterV14Config["pool"];

  it("recipe rrfK overrides base rrfK", () => {
    const recipe: RecipeKnobs = { rrfK: 70 };
    const base: Partial<SearchAdapterV14Config> & Pick<SearchAdapterV14Config, "pool"> = {
      pool: basePool,
      rrfK: 60,
    };

    const merged = mergeRecipeWithBaseConfig(recipe, base);
    expect(merged.rrfK).toBe(70);
    expect(merged.pool).toBe(basePool);
  });

  it("recipe enabledStreams overrides base enabledStreams", () => {
    const recipe: RecipeKnobs = { enabledStreams: ["temporal"] };
    const base: Partial<SearchAdapterV14Config> & Pick<SearchAdapterV14Config, "pool"> = {
      pool: basePool,
      enabledStreams: ["postgres_fts", "wiki"],
    };

    const merged = mergeRecipeWithBaseConfig(recipe, base);
    expect(merged.enabledStreams).toEqual(["temporal"]);
  });

  it("recipe weights override base weights", () => {
    const recipe: RecipeKnobs = { weights: { graph: 0.5 } };
    const base: Partial<SearchAdapterV14Config> & Pick<SearchAdapterV14Config, "pool"> = {
      pool: basePool,
      weights: { postgres_fts: 1.0 },
    };

    const merged = mergeRecipeWithBaseConfig(recipe, base);
    expect(merged.weights).toEqual({ graph: 0.5 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// RA-6: mergeRecipeWithBaseConfig — base non-overlap retained.
// ─────────────────────────────────────────────────────────────────────────

describe("RA-6 — base config retained for non-recipe fields", () => {
  it("retains pool, qdrantClient, embeddingFn from base when recipe doesn't touch them", () => {
    const basePool = {
      query: async () => ({ rows: [] }),
    } as unknown as SearchAdapterV14Config["pool"];

    const recipe: RecipeKnobs = { rrfK: 65 };

    const base: Partial<SearchAdapterV14Config> & Pick<SearchAdapterV14Config, "pool"> = {
      pool: basePool,
      qdrantClient: null,
      perStreamTimeoutMs: 3000,
    };

    const merged = mergeRecipeWithBaseConfig(recipe, base);
    expect(merged.pool).toBe(basePool);
    expect(merged.qdrantClient).toBeNull();
    // perStreamTimeoutMs from recipe is not set → base's timeout is used
    expect(merged.perStreamTimeoutMs).toBe(3000);
  });

  it("applies default rrfK when neither recipe nor base provides it", () => {
    const basePool = {
      query: async () => ({ rows: [] }),
    } as unknown as SearchAdapterV14Config["pool"];

    const recipe: RecipeKnobs = {};

    const base: Partial<SearchAdapterV14Config> & Pick<SearchAdapterV14Config, "pool"> = {
      pool: basePool,
    };

    const merged = mergeRecipeWithBaseConfig(recipe, base);
    // DEFAULT_RRF_K = 60
    expect(merged.rrfK).toBe(60);
  });
});
