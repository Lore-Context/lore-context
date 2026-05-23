// Lore Context v1.3 — LocalCrossEncoderReranker tests (plan §3 Lane B item 3).

import { describe, expect, it, vi } from "vitest";
import { LocalCrossEncoderReranker } from "../src/index.js";
import type { RerankerCandidate } from "../src/index.js";

function fakeResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? (init.ok === false ? 500 : 200),
    headers: { "content-type": "application/json" }
  });
}

const baseCandidates: RerankerCandidate[] = [
  { itemId: "A", score: 0.4, text: "doc A", streams: {} },
  { itemId: "B", score: 0.6, text: "doc B", streams: {} },
  { itemId: "C", score: 0.3, text: "doc C", streams: {} }
];

describe("LocalCrossEncoderReranker — happy path", () => {
  it("calls the reranker HTTP endpoint and returns its order", async () => {
    const fetchImpl = vi.fn(async () =>
      fakeResponse({
        results: [
          { item_id: "C", score: 0.99 },
          { item_id: "A", score: 0.71 },
          { item_id: "B", score: 0.6 }
        ]
      })
    );

    const reranker = new LocalCrossEncoderReranker({
      url: "http://reranker.local",
      enabled: true,
      fetchImpl,
      env: {}
    });

    const out = await reranker.rerank({
      query: "test query",
      candidates: baseCandidates,
      limit: 3
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://reranker.local/rerank");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body.query).toBe("test query");
    expect(body.candidates).toHaveLength(3);
    expect(body.top_k).toBe(3);
    expect(body.model).toBe("BAAI/bge-reranker-v2-m3");

    expect(out.map((r) => r.itemId)).toEqual(["C", "A", "B"]);
    expect(out[0].score).toBeCloseTo(0.99, 3);
  });
});

describe("LocalCrossEncoderReranker — graceful degrade", () => {
  it("returns input candidates unchanged when LORE_RERANKER_ENABLED is unset", async () => {
    const fetchImpl = vi.fn();
    const reranker = new LocalCrossEncoderReranker({
      url: "http://reranker.local",
      fetchImpl,
      env: {} // LORE_RERANKER_ENABLED not present → disabled.
    });
    const out = await reranker.rerank({
      query: "q",
      candidates: baseCandidates,
      limit: 3
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    // Same order as input — pure passthrough.
    expect(out.map((r) => r.itemId)).toEqual(["A", "B", "C"]);
  });

  it("returns input candidates unchanged when url is missing", async () => {
    const fetchImpl = vi.fn();
    const reranker = new LocalCrossEncoderReranker({
      enabled: true,
      fetchImpl,
      env: {} // no LORE_RERANKER_URL
    });
    const out = await reranker.rerank({
      query: "q",
      candidates: baseCandidates,
      limit: 2
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(out.map((r) => r.itemId)).toEqual(["A", "B"]);
  });

  it("returns input candidates when fetch throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const reranker = new LocalCrossEncoderReranker({
      url: "http://reranker.local",
      enabled: true,
      fetchImpl,
      env: {}
    });
    const out = await reranker.rerank({
      query: "q",
      candidates: baseCandidates,
      limit: 3
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(out.map((r) => r.itemId)).toEqual(["A", "B", "C"]);
  });

  it("returns input candidates on non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => fakeResponse({ error: "boom" }, { ok: false, status: 502 }));
    const reranker = new LocalCrossEncoderReranker({
      url: "http://reranker.local",
      enabled: true,
      fetchImpl,
      env: {}
    });
    const out = await reranker.rerank({
      query: "q",
      candidates: baseCandidates,
      limit: 3
    });
    expect(out.map((r) => r.itemId)).toEqual(["A", "B", "C"]);
  });

  it("env LORE_RERANKER_ENABLED=true activates the reranker", async () => {
    const fetchImpl = vi.fn(async () =>
      fakeResponse({ results: [{ item_id: "B", score: 0.99 }] })
    );
    const reranker = new LocalCrossEncoderReranker({
      url: "http://reranker.local",
      fetchImpl,
      env: { LORE_RERANKER_ENABLED: "true" }
    });
    const out = await reranker.rerank({
      query: "q",
      candidates: baseCandidates,
      limit: 1
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(out.map((r) => r.itemId)).toEqual(["B"]);
  });
});
