// Lane A3 WikiRetrievalProvider tests.
//
// Pure-unit: no live Postgres required. PoolLikeV12 is faked with a
// rules-based simulator that mirrors the SQL logic for vault scoping,
// status filtering, FTS match, and project filtering.

import { describe, expect, it } from "vitest";
import {
  WikiRetrievalProvider,
  WIKI_FTS_SQL,
  WIKI_PGVECTOR_SQL,
  type WikiRetrievalProviderConfig
} from "../src/wiki-retrieval-v12.js";
import type {
  MemorySearchInputV12,
  PoolLikeV12,
  PoolQueryResultV12
} from "../src/index.js";

// ---------------------------------------------------------------------------
// FakeWikiPool — simulates the wiki FTS query for testing.
// ---------------------------------------------------------------------------

interface FakeWikiPage {
  id: string;
  vault_id: string;
  project_id: string;
  topic: string;
  body: string;
  status: string;
  source_item_ids: string[];
  t_created?: string | null;
  t_expired?: string | null;
  /** Optional 1024-dim wiki embedding. When omitted, pgvector skips the row. */
  wiki_embedding?: number[];
}

interface CapturedQuery {
  text: string;
  params: ReadonlyArray<unknown>;
}

class FakeWikiPool implements PoolLikeV12 {
  readonly captured: CapturedQuery[] = [];
  private pages: FakeWikiPage[] = [];

  seed(pages: FakeWikiPage[]): void {
    this.pages = [...pages];
  }

  async query<T = unknown>(
    text: string,
    params: ReadonlyArray<unknown> = []
  ): Promise<PoolQueryResultV12<T>> {
    this.captured.push({ text, params: [...params] });
    if (text === WIKI_FTS_SQL) {
      return { rows: this.executeWikiFts(params) as unknown as T[] };
    }
    if (text === WIKI_PGVECTOR_SQL) {
      return { rows: this.executeWikiPgVector(params) as unknown as T[] };
    }
    return { rows: [] };
  }

  private executeWikiPgVector(params: ReadonlyArray<unknown>): unknown[] {
    const [vectorLiteral, vaultId, projectId, allowedProjectIds, maybeSystemTime, maybeLimit] = params as [
      string,
      string,
      string | null,
      string[] | null,
      string | null | number,
      number | undefined
    ];
    const systemTime = params.length >= 6 ? (maybeSystemTime as string | null) : null;
    const limit = params.length >= 6 ? (maybeLimit as number) : (maybeSystemTime as number);
    const queryVec = parseVectorLiteral(vectorLiteral);
    const systemTimeMs = systemTime ? Date.parse(systemTime) : null;

    return this.pages
      .filter((p) => p.vault_id === vaultId)
      .filter((p) => p.status === "active")
      .filter((p) => isVisibleAtSystemTime(p.t_created, p.t_expired, systemTimeMs))
      .filter((p) => Array.isArray(p.wiki_embedding) && p.wiki_embedding.length > 0)
      .filter((p) => {
        if (projectId !== null) return p.project_id === projectId;
        if (allowedProjectIds !== null && allowedProjectIds.length > 0) {
          return allowedProjectIds.includes(p.project_id);
        }
        return true;
      })
      .map((p) => ({
        page: p,
        score: cosineSimilarity(p.wiki_embedding!, queryVec)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ page, score }) => ({
        page_id: page.id,
        vault_id: page.vault_id,
        project_id: page.project_id,
        topic: page.topic,
        source_item_ids: page.source_item_ids,
        score
      }));
  }

  private executeWikiFts(params: ReadonlyArray<unknown>): unknown[] {
    const [rawQuery, vaultId, projectId, allowedProjectIds, maybeSystemTime, maybeLimit] = params as [
      string,
      string,
      string | null,
      string[] | null,
      string | null | number,
      number | undefined
    ];
    const systemTime = params.length >= 6 ? (maybeSystemTime as string | null) : null;
    const limit = params.length >= 6 ? (maybeLimit as number) : (maybeSystemTime as number);

    const tokens = lexemes(rawQuery);
    const systemTimeMs = systemTime ? Date.parse(systemTime) : null;

    return this.pages
      .filter((p) => p.vault_id === vaultId)
      .filter((p) => p.status === "active")
      .filter((p) => isVisibleAtSystemTime(p.t_created, p.t_expired, systemTimeMs))
      .filter((p) => {
        // Project filter mirrors SQL: exact match first, then ANY list.
        if (projectId !== null) return p.project_id === projectId;
        if (allowedProjectIds !== null && allowedProjectIds.length > 0) {
          return allowedProjectIds.includes(p.project_id);
        }
        return true;
      })
      .map((p) => ({
        page: p,
        score: ftsScore(p.topic + " " + p.body, tokens)
      }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ page, score }) => ({
        page_id: page.id,
        vault_id: page.vault_id,
        project_id: page.project_id,
        topic: page.topic,
        source_item_ids: page.source_item_ids,
        score
      }));
  }
}

function isVisibleAtSystemTime(
  tCreated: string | null | undefined,
  tExpired: string | null | undefined,
  systemTime: number | null
): boolean {
  if (systemTime === null) return true;
  if (tCreated !== null && tCreated !== undefined && Date.parse(tCreated) > systemTime) return false;
  if (tExpired !== null && tExpired !== undefined && Date.parse(tExpired) <= systemTime) return false;
  return true;
}

function lexemes(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function ftsScore(text: string, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const haystack = lexemes(text);
  let hits = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) hits += 1;
  }
  return hits / queryTokens.length;
}

function parseVectorLiteral(literal: string): number[] {
  // pgvector literal form: `[a,b,c]`. We don't validate length here.
  const trimmed = literal.replace(/^\[/, "").replace(/\]$/, "");
  if (trimmed.length === 0) return [];
  return trimmed.split(",").map((part) => Number(part.trim()));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function makeInput(overrides: Partial<MemorySearchInputV12> = {}): MemorySearchInputV12 {
  return {
    query: "retrieval",
    vaultId: "vault-A",
    finalLimit: 10,
    ...overrides
  };
}

function makePage(overrides: Partial<FakeWikiPage> = {}): FakeWikiPage {
  return {
    id: "page:default",
    vault_id: "vault-A",
    project_id: "proj-1",
    topic: "retrieval concepts",
    body: "This page covers retrieval augmented generation and search.",
    status: "active",
    source_item_ids: ["item:src-1"],
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WikiRetrievalProvider — hit path", () => {
  it("[A3-1] FTS match returns a hit with provenance.wikiPageIds populated", async () => {
    const pool = new FakeWikiPool();
    pool.seed([makePage({ id: "page:hit", source_item_ids: ["item:abc"] })]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(makeInput({ query: "retrieval" }));

    expect(hits).toHaveLength(1);
    expect(hits[0].provenance.wikiPageIds).toEqual(["page:hit"]);
    expect(hits[0].provenance.episodeIds).toEqual([]);
    expect(hits[0].provenance.sourceRefs).toEqual([]);
    expect(hits[0].streams.wiki).toBeDefined();
    expect(hits[0].streams.wiki!.backend).toBe("wiki-retrieval-v12");
    expect(hits[0].streams.wiki!.score).toBeGreaterThan(0);
    expect(hits[0].lifecycle.status).toBe("active");
  });

  it("[A3-2] itemId is first entry of source_item_ids when non-empty", async () => {
    const pool = new FakeWikiPool();
    pool.seed([makePage({ id: "page:with-src", source_item_ids: ["item:first", "item:second"] })]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(makeInput({ query: "retrieval" }));

    expect(hits[0].itemId).toBe("item:first");
  });
});

describe("WikiRetrievalProvider — miss path", () => {
  it("[A3-3] no FTS match returns 0 hits", async () => {
    const pool = new FakeWikiPool();
    pool.seed([makePage({ topic: "vector databases", body: "HNSW and IVF index types." })]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(makeInput({ query: "unrelated zebra migration" }));

    expect(hits).toEqual([]);
  });
});

describe("WikiRetrievalProvider — vault isolation", () => {
  it("[A3-4] cross-vault page is excluded from results", async () => {
    const pool = new FakeWikiPool();
    pool.seed([
      makePage({ id: "page:vault-B", vault_id: "vault-B", topic: "retrieval notes" })
    ]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(makeInput({ vaultId: "vault-A", query: "retrieval" }));

    expect(hits).toEqual([]);
    // Confirm vault-A was passed as the SQL param.
    const call = pool.captured.find((c) => c.text === WIKI_FTS_SQL);
    expect(call!.params[1]).toBe("vault-A");
  });
});

describe("WikiRetrievalProvider — lifecycle status filter", () => {
  it("[A3-5] status='stale' page is excluded", async () => {
    const pool = new FakeWikiPool();
    pool.seed([makePage({ id: "page:stale", status: "stale", topic: "retrieval cache" })]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(makeInput({ query: "retrieval" }));

    expect(hits).toEqual([]);
  });

  it("[A3-6] status='archived' page is excluded", async () => {
    const pool = new FakeWikiPool();
    pool.seed([makePage({ id: "page:archived", status: "archived", topic: "retrieval legacy" })]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(makeInput({ query: "retrieval" }));

    expect(hits).toEqual([]);
  });
});

describe("WikiRetrievalProvider — systemTime filter", () => {
  it("filters FTS pages whose source items were created after asOfSystemTime", async () => {
    const pool = new FakeWikiPool();
    pool.seed([
      makePage({
        id: "page:future",
        source_item_ids: ["item:future"],
        t_created: "2026-06-01T00:00:00Z",
        topic: "retrieval future"
      }),
      makePage({
        id: "page:visible",
        source_item_ids: ["item:visible"],
        t_created: "2026-01-01T00:00:00Z",
        topic: "retrieval visible"
      })
    ]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(
      makeInput({ query: "retrieval", asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toEqual(["item:visible"]);
    const call = pool.captured.find((c) => c.text === WIKI_FTS_SQL);
    expect(call!.text).toContain("memory_items");
    expect(call!.text).toContain("i.t_created <= $5::timestamptz");
    expect(call!.params[4]).toBe("2026-04-01T00:00:00Z");
  });

  it("filters FTS pages whose source items expired at asOfSystemTime", async () => {
    const pool = new FakeWikiPool();
    pool.seed([
      makePage({
        id: "page:expired",
        source_item_ids: ["item:expired"],
        t_created: "2026-01-01T00:00:00Z",
        t_expired: "2026-03-01T00:00:00Z",
        topic: "retrieval expired"
      }),
      makePage({
        id: "page:visible",
        source_item_ids: ["item:visible"],
        t_created: "2026-01-01T00:00:00Z",
        t_expired: null,
        topic: "retrieval visible"
      })
    ]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(
      makeInput({ query: "retrieval", asOfSystemTime: "2026-04-01T00:00:00Z" })
    );

    expect(hits.map((h) => h.itemId)).toEqual(["item:visible"]);
    const call = pool.captured.find((c) => c.text === WIKI_FTS_SQL);
    expect(call!.text).toContain("i.t_expired IS NULL OR i.t_expired > $5::timestamptz");
  });

  it("keeps current wiki behaviour when asOfSystemTime is undefined", async () => {
    const pool = new FakeWikiPool();
    pool.seed([
      makePage({
        id: "page:future",
        source_item_ids: ["item:future"],
        t_created: "2026-06-01T00:00:00Z",
        topic: "retrieval future"
      })
    ]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(makeInput({ query: "retrieval" }));

    expect(hits.map((h) => h.itemId)).toEqual(["item:future"]);
  });
});

describe("WikiRetrievalProvider — empty source_item_ids fallback", () => {
  it("[A3-7] empty source_item_ids produces wiki:<page_id> itemId fallback", async () => {
    const pool = new FakeWikiPool();
    pool.seed([makePage({ id: "page:no-src", source_item_ids: [] })]);
    const provider = new WikiRetrievalProvider({ pool });

    const hits = await provider.search(makeInput({ query: "retrieval" }));

    expect(hits).toHaveLength(1);
    expect(hits[0].itemId).toBe("wiki:page:no-src");
    // provenance.wikiPageIds still populated.
    expect(hits[0].provenance.wikiPageIds).toEqual(["page:no-src"]);
  });
});

describe("WikiRetrievalProvider — Lane C FTS + pgvector fusion", () => {
  it("[C-1] FTS-only fallback when embeddingFn is not supplied", async () => {
    const pool = new FakeWikiPool();
    pool.seed([
      makePage({ id: "page:fts", topic: "retrieval", source_item_ids: ["item:fts"] })
    ]);
    const provider = new WikiRetrievalProvider({ pool });

    await provider.search(makeInput({ query: "retrieval" }));

    const ftsCalls = pool.captured.filter((c) => c.text === WIKI_FTS_SQL);
    const pgCalls = pool.captured.filter((c) => c.text === WIKI_PGVECTOR_SQL);
    expect(ftsCalls.length).toBe(1);
    expect(pgCalls.length).toBe(0);
  });

  it("[C-2] runs both FTS and pgvector and fuses inside the provider when embeddingFn is supplied", async () => {
    const pool = new FakeWikiPool();
    // page:both — strong text match AND a similar embedding (should win fusion).
    pool.seed([
      makePage({
        id: "page:both",
        topic: "retrieval mechanics",
        body: "FTS+pgvector fusion via RRF",
        source_item_ids: ["item:both"],
        wiki_embedding: [1, 0, 0, 0]
      }),
      makePage({
        id: "page:vector-only",
        topic: "alpha bravo",
        body: "no fts overlap with the query",
        source_item_ids: ["item:vec"],
        wiki_embedding: [0.95, 0.05, 0, 0]
      }),
      makePage({
        id: "page:fts-only",
        topic: "retrieval theory",
        body: "fts but no embedding",
        source_item_ids: ["item:fts"]
        // no wiki_embedding — pgvector skips this row.
      })
    ]);

    const embeddingFn = async (_text: string) => [1, 0, 0, 0];
    const provider = new WikiRetrievalProvider({ pool });
    const hits = await provider.search(makeInput({ query: "retrieval", embeddingFn }));

    const ftsCalls = pool.captured.filter((c) => c.text === WIKI_FTS_SQL);
    const pgCalls = pool.captured.filter((c) => c.text === WIKI_PGVECTOR_SQL);
    expect(ftsCalls.length).toBe(1);
    expect(pgCalls.length).toBe(1);

    // Both streams produced hits; the fused list is non-empty and contains
    // the page that scores in both streams (page:both) ahead of single-stream
    // pages.
    expect(hits.length).toBeGreaterThanOrEqual(2);
    const top = hits[0];
    expect(top.itemId).toBe("item:both");
    // Provenance.wikiPageIds is populated and points to the wiki page id.
    expect(top.provenance.wikiPageIds).toContain("page:both");
    // Streams metadata exposes the wiki kind.
    expect(top.streams.wiki).toBeDefined();
  });

  it("[C-3] pgvector candidate query passes the vector literal as a parameter", async () => {
    const pool = new FakeWikiPool();
    pool.seed([
      makePage({
        id: "page:vec",
        topic: "vec page",
        body: "...",
        wiki_embedding: [0.1, 0.2, 0.3, 0.4]
      })
    ]);

    const embeddingFn = async (_text: string) => [0.1, 0.2, 0.3, 0.4];
    const provider = new WikiRetrievalProvider({ pool });
    await provider.search(makeInput({ query: "ignored", embeddingFn }));

    const pgCall = pool.captured.find((c) => c.text === WIKI_PGVECTOR_SQL);
    expect(pgCall).toBeDefined();
    // First param is the [a,b,c,d] literal, second is the vault id.
    expect(typeof pgCall!.params[0]).toBe("string");
    expect((pgCall!.params[0] as string).startsWith("[")).toBe(true);
    expect(pgCall!.params[1]).toBe("vault-A");
  });

  it("[C-4] config-level embeddingFn is honoured when input.embeddingFn is absent", async () => {
    const pool = new FakeWikiPool();
    pool.seed([
      makePage({ id: "page:cfg", source_item_ids: ["item:cfg"], wiki_embedding: [1, 0, 0, 0] })
    ]);
    const provider = new WikiRetrievalProvider({
      pool,
      embeddingFn: async () => [1, 0, 0, 0]
    });

    await provider.search(makeInput({ query: "retrieval" }));

    const pgCalls = pool.captured.filter((c) => c.text === WIKI_PGVECTOR_SQL);
    expect(pgCalls.length).toBe(1);
  });
});

describe("WikiRetrievalProvider — security invariant", () => {
  it("[A3-8] rejects calls with empty vaultId", async () => {
    const pool = new FakeWikiPool();
    const provider = new WikiRetrievalProvider({ pool });

    await expect(provider.search(makeInput({ vaultId: "" }))).rejects.toThrow(/vaultId/);
  });

  it("[A3-9] query term is passed as a parameter, never inlined into SQL", async () => {
    const pool = new FakeWikiPool();
    const provider = new WikiRetrievalProvider({ pool });
    const sneaky = "wiki'; DROP TABLE memory_wiki_pages;--";

    await provider.search(makeInput({ query: sneaky }));

    const call = pool.captured.find((c) => c.text === WIKI_FTS_SQL);
    expect(call).toBeDefined();
    expect(call!.text).not.toContain("DROP TABLE");
    expect(call!.text).not.toContain(sneaky);
    expect(call!.params[0]).toBe(sneaky);
  });
});
