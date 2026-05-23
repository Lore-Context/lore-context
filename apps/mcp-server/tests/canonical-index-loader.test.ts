import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCanonicalEpisodes } from "../src/canonical-index-loader.js";
import type { CanonicalIndexLoaderDeps } from "../src/canonical-index-loader.js";

describe("loadCanonicalEpisodes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed episodes when pg returns a row with episodes array", async () => {
    const episodes = [
      {
        record_id: "rec_1",
        subject: "Architecture decision",
        one_line_summary: "Use Postgres for primary store",
        recall_hit_count: 5,
        last_recall_at: "2026-01-01T00:00:00Z"
      },
      {
        record_id: "rec_2",
        subject: "Deployment note",
        one_line_summary: "Always run migrations before deploy",
        recall_hit_count: 3,
        last_recall_at: null
      }
    ];

    const deps: CanonicalIndexLoaderDeps = {
      pg: {
        query: vi.fn().mockResolvedValue({ rows: [{ episodes }] })
      }
    };

    const result = await loadCanonicalEpisodes("vault_abc", deps);
    expect(result).toEqual(episodes);
    expect(deps.pg.query).toHaveBeenCalledWith(
      "SELECT episodes FROM vault_canonical_index WHERE vault_id=$1",
      ["vault_abc"]
    );
  });

  it("returns empty array when pg returns no rows", async () => {
    const deps: CanonicalIndexLoaderDeps = {
      pg: {
        query: vi.fn().mockResolvedValue({ rows: [] })
      }
    };

    const result = await loadCanonicalEpisodes("vault_missing", deps);
    expect(result).toEqual([]);
  });

  it("returns empty array when pg returns row with empty episodes array", async () => {
    const deps: CanonicalIndexLoaderDeps = {
      pg: {
        query: vi.fn().mockResolvedValue({ rows: [{ episodes: [] }] })
      }
    };

    const result = await loadCanonicalEpisodes("vault_empty", deps);
    expect(result).toEqual([]);
  });

  it("returns empty array when pg returns row with null episodes", async () => {
    const deps: CanonicalIndexLoaderDeps = {
      pg: {
        query: vi.fn().mockResolvedValue({ rows: [{ episodes: null }] })
      }
    };

    const result = await loadCanonicalEpisodes("vault_null", deps);
    expect(result).toEqual([]);
  });

  it("returns empty array and logs console.warn when pg.query throws", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const deps: CanonicalIndexLoaderDeps = {
      pg: {
        query: vi.fn().mockRejectedValue(new Error("Connection refused"))
      }
    };

    const result = await loadCanonicalEpisodes("vault_error", deps);
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("loadCanonicalEpisodes"),
      expect.stringContaining("Connection refused")
    );
  });

  it("returns empty array and logs warning when pg.query rejects with non-Error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const deps: CanonicalIndexLoaderDeps = {
      pg: {
        query: vi.fn().mockRejectedValue("string error")
      }
    };

    const result = await loadCanonicalEpisodes("vault_str_error", deps);
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });
});
