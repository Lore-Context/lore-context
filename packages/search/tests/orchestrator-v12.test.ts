// Lore Context v1.3 — Lane B HybridSearchOrchestrator tests.
//
// Coverage map (plan §3 Lane B Acceptance):
//   * Orchestrator with N providers all returning candidates → bit-identical
//     top-K across 3 back-to-back runs (when no timeout fires).
//   * One provider rejects → request still returns; surviving streams' fused
//     order is returned; onStreamEvent emits status:'failed'.
//   * One provider times out → request returns within timeout+epsilon;
//     onStreamEvent emits status:'timed_out'.
//   * input.streams = ['graph'] → only graph provider runs; others skipped.
//   * input.rerank = true with a stub reranker → reranker called once with
//     top-50 (or fewer) fused candidates; result order changes accordingly.
//   * input.rerank = true but no reranker configured → no-op, fused order.
//   * Vault-scoping invariant: empty vaultId rejected before fan-out.

import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RRF_K,
  DEFAULT_STREAM_TIMEOUT_MS,
  fuseWeightedRRF,
  HybridSearchOrchestrator,
  resolveEnabledStreams,
  parseStreamsEnabledEnv,
  type MemorySearchInputV12,
  type MemorySearchStreamKindV12,
  type RerankerCandidate,
  type RerankerProvider,
  type StreamProviderV12,
  type StreamEvent
} from "../src/index.js";

function makeStubProvider(args: {
  kind: MemorySearchStreamKindV12;
  backend?: string;
  weight?: number;
  candidates: Array<{ itemId: string; chunkId?: string; score: number; text?: string }>;
  delayMs?: number;
  reject?: boolean;
  hang?: boolean;
}): StreamProviderV12 {
  return {
    kind: args.kind,
    backend: args.backend ?? `stub-${args.kind}`,
    async emit() {
      if (args.hang) {
        await new Promise(() => {
          /* never resolves */
        });
      }
      if (args.delayMs) {
        await new Promise((r) => setTimeout(r, args.delayMs));
      }
      if (args.reject) {
        throw new Error(`provider ${args.kind} forced reject`);
      }
      return {
        candidates: args.candidates,
        weight: args.weight ?? 1
      };
    }
  };
}

function makeInput(overrides: Partial<MemorySearchInputV12> = {}): MemorySearchInputV12 {
  return {
    query: "lane B orchestrator test",
    vaultId: "vault-A",
    candidateLimit: 50,
    finalLimit: 10,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Acceptance: bit-identical determinism across 3 back-to-back runs.
// ---------------------------------------------------------------------------

describe("HybridSearchOrchestrator — determinism", () => {
  it("produces bit-identical top-K across 3 back-to-back runs (no timeout)", async () => {
    const candidatesByKind = {
      postgres_fts: [
        { itemId: "A", score: 0.9 },
        { itemId: "B", score: 0.7 }
      ],
      postgres_pgvector: [
        { itemId: "B", score: 0.85 },
        { itemId: "C", score: 0.6 }
      ],
      graph: [
        { itemId: "A", score: 0.5 },
        { itemId: "D", score: 0.4 }
      ]
    };

    const buildProviders = (): StreamProviderV12[] => [
      makeStubProvider({ kind: "postgres_fts", weight: 1.1, candidates: candidatesByKind.postgres_fts }),
      makeStubProvider({ kind: "postgres_pgvector", weight: 0.85, candidates: candidatesByKind.postgres_pgvector }),
      makeStubProvider({ kind: "graph", weight: 0.9, candidates: candidatesByKind.graph })
    ];

    const orch = new HybridSearchOrchestrator({
      providers: buildProviders(),
      streamTimeoutMs: null
    });

    const r1 = await orch.search(makeInput());
    const r2 = await new HybridSearchOrchestrator({
      providers: buildProviders(),
      streamTimeoutMs: null
    }).search(makeInput());
    const r3 = await new HybridSearchOrchestrator({
      providers: buildProviders(),
      streamTimeoutMs: null
    }).search(makeInput());

    // JSON-bit-identity is the canonical "byte-identical" assertion the plan
    // §3 Lane B item 2 calls for — sufficient for arrays of plain objects.
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    expect(JSON.stringify(r2)).toBe(JSON.stringify(r3));

    // And: orchestrator output equals a direct fuseWeightedRRF call with the
    // same stream set and weights (single fusion code path).
    const direct = fuseWeightedRRF({
      streams: [
        { kind: "postgres_fts", backend: "stub-postgres_fts", weight: 1.1, candidates: candidatesByKind.postgres_fts },
        {
          kind: "postgres_pgvector",
          backend: "stub-postgres_pgvector",
          weight: 0.85,
          candidates: candidatesByKind.postgres_pgvector
        },
        { kind: "graph", backend: "stub-graph", weight: 0.9, candidates: candidatesByKind.graph }
      ],
      k: DEFAULT_RRF_K,
      limit: 10
    });

    expect(r1.map((h) => h.itemId)).toEqual(direct.map((h) => h.itemId));
    expect(r1.map((h) => Number(h.score.toFixed(12)))).toEqual(
      direct.map((h) => Number(h.score.toFixed(12)))
    );
  });
});

// ---------------------------------------------------------------------------
// Acceptance: rejected provider does not fail request; onStreamEvent fires.
// ---------------------------------------------------------------------------

describe("HybridSearchOrchestrator — provider rejection", () => {
  it("survives a single provider rejection and surfaces the rest", async () => {
    const events: StreamEvent[] = [];
    const orch = new HybridSearchOrchestrator({
      providers: [
        makeStubProvider({
          kind: "postgres_fts",
          weight: 1.1,
          candidates: [{ itemId: "ok-A", score: 0.9 }]
        }),
        makeStubProvider({
          kind: "graph",
          reject: true,
          candidates: []
        })
      ],
      streamTimeoutMs: null,
      onStreamEvent: (e) => events.push(e)
    });

    const hits = await orch.search(makeInput());
    expect(hits.map((h) => h.itemId)).toContain("ok-A");
    expect(hits.length).toBeGreaterThan(0);

    const failed = events.find((e) => e.kind === "graph");
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toMatch(/forced reject/);

    const ok = events.find((e) => e.kind === "postgres_fts");
    expect(ok?.status).toBe("ok");
    expect(ok?.candidateCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Acceptance: per-stream timeout never rejects parent search().
// ---------------------------------------------------------------------------

describe("HybridSearchOrchestrator — per-stream timeout", () => {
  it("times out a hung provider but still returns surviving streams", async () => {
    const events: StreamEvent[] = [];
    const orch = new HybridSearchOrchestrator({
      providers: [
        makeStubProvider({
          kind: "postgres_fts",
          weight: 1.1,
          candidates: [{ itemId: "fast", score: 0.8 }]
        }),
        makeStubProvider({
          kind: "graph",
          hang: true,
          candidates: []
        })
      ],
      streamTimeoutMs: 50,
      onStreamEvent: (e) => events.push(e)
    });

    const startedAt = Date.now();
    const hits = await orch.search(makeInput());
    const elapsed = Date.now() - startedAt;

    expect(hits.map((h) => h.itemId)).toContain("fast");
    expect(elapsed).toBeLessThan(500); // timeout 50ms + generous epsilon

    const timedOut = events.find((e) => e.kind === "graph");
    expect(timedOut?.status).toBe("timed_out");
  });
});

// ---------------------------------------------------------------------------
// Acceptance: input.streams gates which providers run.
// ---------------------------------------------------------------------------

describe("HybridSearchOrchestrator — stream selection", () => {
  it("respects input.streams = ['graph']: only graph provider runs", async () => {
    const calledKinds: string[] = [];

    const trackingProvider = (kind: MemorySearchStreamKindV12): StreamProviderV12 => ({
      kind,
      backend: `stub-${kind}`,
      async emit() {
        calledKinds.push(kind);
        return {
          candidates: [{ itemId: `${kind}-hit`, score: 0.5 }],
          weight: 1
        };
      }
    });

    const orch = new HybridSearchOrchestrator({
      providers: [
        trackingProvider("postgres_fts"),
        trackingProvider("postgres_pgvector"),
        trackingProvider("graph"),
        trackingProvider("temporal"),
        trackingProvider("wiki")
      ],
      streamTimeoutMs: null
    });

    const hits = await orch.search(makeInput({ streams: ["graph"] }));
    expect(calledKinds).toEqual(["graph"]);
    expect(hits.map((h) => h.itemId)).toEqual(["graph-hit"]);
  });

  it("intersects request streams with installation defaults", () => {
    const set = resolveEnabledStreams({
      installationStreams: ["postgres_fts", "graph"],
      requestStreams: ["graph", "wiki"]
    });
    expect([...set]).toEqual(["graph"]);
  });

  it("parseStreamsEnabledEnv parses CSV and rejects unknown kinds", () => {
    expect(parseStreamsEnabledEnv("postgres_fts,graph,bogus")).toEqual([
      "postgres_fts",
      "graph"
    ]);
    expect(parseStreamsEnabledEnv("fts,pgvector,qdrant_dense,bogus")).toEqual([
      "postgres_fts",
      "postgres_pgvector",
      "qdrant_dense"
    ]);
    expect(parseStreamsEnabledEnv("")).toBeNull();
    expect(parseStreamsEnabledEnv(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Acceptance: systemTime is propagated so every stream filters before fusion.
// ---------------------------------------------------------------------------

describe("HybridSearchOrchestrator — systemTime propagation", () => {
  it("propagates asOfSystemTime to all seven stream providers", async () => {
    const captured = new Map<MemorySearchStreamKindV12, string | undefined>();
    const provider = (kind: MemorySearchStreamKindV12): StreamProviderV12 => ({
      kind,
      backend: `stub-${kind}`,
      async emit(input) {
        captured.set(kind, input.asOfSystemTime);
        return { candidates: [{ itemId: `${kind}-hit`, score: 0.5 }], weight: 1 };
      }
    });
    const providers: StreamProviderV12[] = [
      provider("postgres_fts"),
      provider("postgres_pgvector"),
      provider("qdrant_dense"),
      provider("qdrant_sparse"),
      provider("graph"),
      provider("temporal"),
      provider("wiki")
    ];
    const orch = new HybridSearchOrchestrator({ providers, streamTimeoutMs: null });

    await orch.search(
      makeInput({
        streams: [
          "postgres_fts",
          "postgres_pgvector",
          "qdrant_dense",
          "qdrant_sparse",
          "graph",
          "temporal",
          "wiki"
        ],
        asOfSystemTime: "2026-04-01T00:00:00Z"
      })
    );

    expect([...captured.values()]).toEqual(Array(7).fill("2026-04-01T00:00:00Z"));
  });

  it("computes RRF over provider-filtered candidate sets, not raw post-filtered hits", async () => {
    const provider = (
      kind: MemorySearchStreamKindV12,
      candidates: Array<{ itemId: string; score: number; tCreated?: string }>
    ): StreamProviderV12 => ({
      kind,
      backend: `stub-${kind}`,
      async emit(input) {
        const cutoff = input.asOfSystemTime ? Date.parse(input.asOfSystemTime) : null;
        return {
          candidates: candidates.filter(
            (c) => cutoff === null || c.tCreated === undefined || Date.parse(c.tCreated) <= cutoff
          ),
          weight: 1
        };
      }
    });
    const orch = new HybridSearchOrchestrator({
      providers: [
        provider("postgres_fts", [
          { itemId: "future-boosted", score: 1, tCreated: "2026-06-01T00:00:00Z" },
          { itemId: "visible-a", score: 0.5, tCreated: "2026-01-01T00:00:00Z" }
        ]),
        provider("graph", [
          { itemId: "future-boosted", score: 1, tCreated: "2026-06-01T00:00:00Z" },
          { itemId: "visible-b", score: 0.4, tCreated: "2026-01-01T00:00:00Z" }
        ])
      ],
      streamTimeoutMs: null
    });

    const hits = await orch.search(makeInput({ asOfSystemTime: "2026-04-01T00:00:00Z" }));

    expect(hits.map((h) => h.itemId)).not.toContain("future-boosted");
    expect(hits.map((h) => h.itemId)).toEqual(["visible-a", "visible-b"]);
  });
});

// ---------------------------------------------------------------------------
// Acceptance: rerank=true with a stub reranker calls it once with top-N.
// ---------------------------------------------------------------------------

describe("HybridSearchOrchestrator — reranker pass", () => {
  it("rerank=true calls reranker with top-N candidates that carry text", async () => {
    const rerankSpy = vi.fn(async (input: { query: string; candidates: RerankerCandidate[]; limit: number }) => {
      return [...input.candidates].reverse().map((c) => ({
        itemId: c.itemId,
        chunkId: c.chunkId,
        score: 1 - c.score
      }));
    });
    const reranker: RerankerProvider = {
      name: "stub-reranker",
      rerank: rerankSpy
    };

    const orch = new HybridSearchOrchestrator({
      providers: [
        makeStubProvider({
          kind: "postgres_fts",
          weight: 1,
          candidates: [
            { itemId: "first", score: 0.9, text: "first candidate body" },
            { itemId: "second", score: 0.7, text: "second candidate body" },
            { itemId: "third", score: 0.5, text: "third candidate body" }
          ]
        })
      ],
      reranker,
      rerankTopN: 50,
      streamTimeoutMs: null
    });

    const hits = await orch.search(makeInput({ rerank: true, finalLimit: 3 }));
    expect(rerankSpy).toHaveBeenCalledTimes(1);
    expect(rerankSpy.mock.calls[0][0].candidates.map((c) => c.text)).toEqual([
      "first candidate body",
      "second candidate body",
      "third candidate body"
    ]);
    expect(hits.map((h) => h.itemId)).toEqual(["third", "second", "first"]);
  });

  it("rerank=true but no reranker configured → fused order returned", async () => {
    const orch = new HybridSearchOrchestrator({
      providers: [
        makeStubProvider({
          kind: "postgres_fts",
          weight: 1,
          candidates: [
            { itemId: "alpha", score: 0.9 },
            { itemId: "beta", score: 0.5 }
          ]
        })
      ],
      streamTimeoutMs: null
    });
    const hits = await orch.search(makeInput({ rerank: true, finalLimit: 2 }));
    expect(hits.map((h) => h.itemId)).toEqual(["alpha", "beta"]);
  });

  it("rerank=false (default) skips the reranker even when configured", async () => {
    const rerankSpy = vi.fn();
    const orch = new HybridSearchOrchestrator({
      providers: [
        makeStubProvider({
          kind: "postgres_fts",
          weight: 1,
          candidates: [{ itemId: "x", score: 0.9 }]
        })
      ],
      reranker: { name: "spy", rerank: rerankSpy },
      streamTimeoutMs: null
    });
    await orch.search(makeInput());
    expect(rerankSpy).not.toHaveBeenCalled();
  });

  it("skips reranker when all candidates have empty text (BRA-532)", async () => {
    const rerankSpy = vi.fn(async (input: { query: string; candidates: RerankerCandidate[]; limit: number }) => {
      return input.candidates.map((c) => ({
        itemId: c.itemId,
        chunkId: c.chunkId,
        score: 0.5
      }));
    });
    const reranker: RerankerProvider = {
      name: "stub-reranker",
      rerank: rerankSpy
    };

    const orch = new HybridSearchOrchestrator({
      providers: [
        makeStubProvider({
          kind: "postgres_fts",
          weight: 1,
          candidates: [
            { itemId: "first", score: 0.9 },
            { itemId: "second", score: 0.7 },
            { itemId: "third", score: 0.5 }
          ]
        })
      ],
      reranker,
      rerankTopN: 50,
      streamTimeoutMs: null
    });

    // All candidates have empty text — reranker should be skipped.
    const hits = await orch.search(makeInput({ rerank: true, finalLimit: 3 }));
    expect(rerankSpy).not.toHaveBeenCalled();
    // Fused order should be preserved (not random reranker output).
    expect(hits.map((h) => h.itemId)).toEqual(["first", "second", "third"]);
  });
});

// ---------------------------------------------------------------------------
// Vault-scoping invariant — orchestrator must reject empty vault before fanout.
// ---------------------------------------------------------------------------

describe("HybridSearchOrchestrator — security invariants", () => {
  it("rejects empty vaultId before fanning out to any provider", async () => {
    const calledKinds: string[] = [];
    const orch = new HybridSearchOrchestrator({
      providers: [
        {
          kind: "postgres_fts",
          backend: "stub",
          async emit() {
            calledKinds.push("postgres_fts");
            return { candidates: [], weight: 1 };
          }
        }
      ],
      streamTimeoutMs: null
    });
    await expect(orch.search(makeInput({ vaultId: "" }))).rejects.toThrow(/vaultId/);
    expect(calledKinds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Lane A Phase 2.2 — DEFAULT_STREAM_TIMEOUT_MS is 500 ms (was 1500 ms in v1.3)
// ---------------------------------------------------------------------------

describe("DEFAULT_STREAM_TIMEOUT_MS — Lane A Phase 2.2 default value", () => {
  it("exported constant equals 500 ms", () => {
    expect(DEFAULT_STREAM_TIMEOUT_MS).toBe(500);
  });
});
