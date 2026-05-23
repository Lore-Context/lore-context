// Lore Context v1.3 — Lane B HybridSearchOrchestrator (plan §3 Lane B item 1).
//
// Top-level fusion layer that consumes any combination of the seven
// candidate-emitting StreamProviderV12 kinds (postgres_fts, postgres_pgvector,
// qdrant_dense, qdrant_sparse, graph, temporal, wiki) and produces a single
// ranked list via weighted RRF. Optionally applies a post-fusion reranker
// (RerankerProvider) when input.rerank === true and a reranker is configured.
//
// Hard guarantees (plan §3 Lane B):
//   * Per-stream timeout never rejects the parent search() promise — it only
//     marks the slow stream as timed_out and surfaces the surviving streams.
//   * `Promise.allSettled` ensures one provider's reject never fails the request.
//   * Vault-scoping invariant: ensureVaultScoped(input) is called before any
//     fan-out — orchestrator never reads a non-vault-scoped input.
//   * Bit-identical determinism: when no timeouts fire and the same stream set
//     is used, the orchestrator's top-K matches a direct fuseWeightedRRF call.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  DEFAULT_CANDIDATE_LIMIT,
  DEFAULT_FINAL_LIMIT,
  DEFAULT_RRF_K,
  ALL_STREAM_KINDS_V12,
  ensureVaultScoped,
  fuseWeightedRRF
} from "./memory-search-v12.js";
import type {
  MemorySearchHitLifecycleV12,
  MemorySearchHitProvenanceV12,
  MemorySearchHitV12,
  MemorySearchInputV12,
  MemorySearchStreamKindV12,
  RerankerCandidate,
  RerankerProvider,
  StreamProviderV12,
  WeightedRRFStream
} from "./memory-search-v12.js";

// ---------------------------------------------------------------------------
// Public types.
// ---------------------------------------------------------------------------

export type StreamEventStatus = "ok" | "failed" | "timed_out";

export interface StreamEvent {
  kind: MemorySearchStreamKindV12;
  backend: string;
  status: StreamEventStatus;
  candidateCount?: number;
  latencyMs: number;
  error?: string;
}

export interface HybridSearchOrchestratorConfig {
  /** The seven candidate-emitting stream kinds. Reranker is NOT a StreamProvider. */
  providers: ReadonlyArray<StreamProviderV12>;
  /** Optional post-fusion reranker. Skipped when input.rerank !== true. */
  reranker?: RerankerProvider;
  /**
   * Per-stream timeout in milliseconds. `null` disables the timeout (used by
   * the legacy postgres / qdrant shims so determinism matches v1.2 fixtures).
   * Default: 500 ms (Lane A Phase 2.2; was 1500 ms in v1.3).
   */
  streamTimeoutMs?: number | null;
  /** Override the canonical RRF damping constant (default DEFAULT_RRF_K = 60). */
  k?: number;
  /**
   * Default top-N candidates passed to the reranker. Plan §3 Lane B item 3
   * pins this at 50. The reranker returns top-K (= input.finalLimit).
   */
  rerankTopN?: number;
  /**
   * Installation default for stream selection. When unset, the seven canonical
   * stream kinds are all enabled. The runtime intersection with
   * `input.streams` is computed at search() time.
   */
  installationStreams?: ReadonlyArray<MemorySearchStreamKindV12>;
  /** Observability seam (plan §Lane E covers actual OpenTelemetry wiring). */
  onStreamEvent?: (event: StreamEvent) => void;
}

export const DEFAULT_STREAM_TIMEOUT_MS = 500;
export const DEFAULT_RERANK_TOP_N = 50;

type ApiRerankerFactoryModule = {
  createRerankerProvider: () => RerankerProvider;
};

let defaultRerankerProviderPromise: Promise<RerankerProvider | undefined> | undefined;

async function importApiRerankerFactory(): Promise<ApiRerankerFactoryModule | undefined> {
  const distPath = resolve(process.cwd(), "apps/api/dist/rerankers/factory.js");
  const srcPath = resolve(process.cwd(), "apps/api/src/rerankers/factory.ts");
  const factoryPath = existsSync(distPath) ? distPath : existsSync(srcPath) ? srcPath : undefined;
  if (!factoryPath) return undefined;

  const dynamicImport = new Function("specifier", "return import(specifier)") as (
    specifier: string
  ) => Promise<ApiRerankerFactoryModule>;
  return dynamicImport(pathToFileURL(factoryPath).href);
}

function shouldLoadDefaultRerankerFromEnv(): boolean {
  const provider = process.env.LORE_RERANKER_PROVIDER?.trim().toLowerCase();
  return provider === "stub" || provider === "cohere";
}

function loadDefaultRerankerProvider(): Promise<RerankerProvider | undefined> {
  if (!shouldLoadDefaultRerankerFromEnv()) {
    return Promise.resolve(undefined);
  }
  defaultRerankerProviderPromise ??= importApiRerankerFactory().then((factory) =>
    factory?.createRerankerProvider()
  );
  return defaultRerankerProviderPromise;
}

// Sentinel exception used by the per-stream timeout race so we can
// distinguish a timeout from a provider rejection.
class StreamTimeoutError extends Error {
  readonly isStreamTimeout = true;
  constructor(public readonly timeoutMs: number) {
    super(`stream timed out after ${timeoutMs} ms`);
    this.name = "StreamTimeoutError";
  }
}

// ---------------------------------------------------------------------------
// Stream selection — env CSV → ordered set; intersection with request.
// ---------------------------------------------------------------------------

export function parseStreamsEnabledEnv(
  csv: string | undefined
): ReadonlyArray<MemorySearchStreamKindV12> | null {
  if (typeof csv !== "string") return null;
  const trimmed = csv.trim();
  if (trimmed.length === 0) return null;
  const valid = new Set<string>(ALL_STREAM_KINDS_V12);
  const aliases: Record<string, MemorySearchStreamKindV12> = {
    fts: "postgres_fts",
    pgvector: "postgres_pgvector"
  };
  const parts = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => aliases[s] ?? s)
    .filter((s) => valid.has(s));
  // Cast — every entry passed the valid-set check above.
  return parts as MemorySearchStreamKindV12[];
}

export function resolveEnabledStreams(args: {
  installationStreams?: ReadonlyArray<MemorySearchStreamKindV12>;
  envCsv?: string;
  requestStreams?: ReadonlyArray<MemorySearchStreamKindV12>;
}): ReadonlySet<MemorySearchStreamKindV12> {
  const fromEnv = parseStreamsEnabledEnv(args.envCsv);
  const installation =
    args.installationStreams ?? fromEnv ?? ALL_STREAM_KINDS_V12;
  const installationSet = new Set<MemorySearchStreamKindV12>(installation);
  if (!args.requestStreams || args.requestStreams.length === 0) {
    return installationSet;
  }
  const requestSet = new Set<MemorySearchStreamKindV12>(args.requestStreams);
  const out = new Set<MemorySearchStreamKindV12>();
  for (const k of installationSet) {
    if (requestSet.has(k)) out.add(k);
  }
  return out;
}

// ---------------------------------------------------------------------------
// HybridSearchOrchestrator
// ---------------------------------------------------------------------------

export class HybridSearchOrchestrator {
  readonly name = "hybrid-search-orchestrator-v13" as const;

  private readonly providers: ReadonlyArray<StreamProviderV12>;
  private readonly reranker: RerankerProvider | undefined;
  private readonly streamTimeoutMs: number | null;
  private readonly k: number;
  private readonly rerankTopN: number;
  private readonly installationStreams: ReadonlyArray<MemorySearchStreamKindV12> | undefined;
  private readonly onStreamEvent: (event: StreamEvent) => void;

  constructor(config: HybridSearchOrchestratorConfig) {
    this.providers = config.providers;
    this.reranker = config.reranker;
    this.streamTimeoutMs =
      config.streamTimeoutMs === null
        ? null
        : config.streamTimeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS;
    this.k = config.k ?? DEFAULT_RRF_K;
    this.rerankTopN = config.rerankTopN ?? DEFAULT_RERANK_TOP_N;
    this.installationStreams = config.installationStreams;
    this.onStreamEvent = config.onStreamEvent ?? (() => {});
  }

  async search(input: MemorySearchInputV12): Promise<MemorySearchHitV12[]> {
    // Vault scoping invariant — never read without an authenticated vault.
    ensureVaultScoped(input);

    const finalLimit = input.finalLimit ?? DEFAULT_FINAL_LIMIT;
    const candidateLimit = input.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;

    const enabledStreams = resolveEnabledStreams({
      installationStreams: this.installationStreams,
      envCsv: process.env.LORE_STREAMS_ENABLED,
      requestStreams: input.streams
    });

    const activeProviders = this.providers.filter((p) => enabledStreams.has(p.kind));

    // Run all enabled providers concurrently — Promise.allSettled ensures
    // one provider's rejection never fails the parent search().
    const settledResults = await Promise.allSettled(
      activeProviders.map((provider) => this.runProvider(provider, input))
    );

    const streams: WeightedRRFStream[] = [];
    const lifecycleByItem = new Map<string, MemorySearchHitLifecycleV12>();
    const provenanceByItem = new Map<string, MemorySearchHitProvenanceV12>();

    for (let i = 0; i < settledResults.length; i++) {
      const result = settledResults[i];
      const provider = activeProviders[i];
      if (result.status !== "fulfilled") continue;
      const emit = result.value;
      streams.push({
        kind: provider.kind,
        backend: provider.backend,
        weight: emit.weight,
        candidates: emit.candidates
      });
      if (emit.lifecycleByItem) {
        for (const [k, v] of emit.lifecycleByItem) {
          if (!lifecycleByItem.has(k)) lifecycleByItem.set(k, v);
        }
      }
      if (emit.provenanceByItem) {
        for (const [k, v] of emit.provenanceByItem) {
          if (!provenanceByItem.has(k)) provenanceByItem.set(k, v);
        }
      }
    }

    // Single fusion code path — bit-identical to a direct fuseWeightedRRF
    // call when the same stream set is used (and no timeouts fired).
    const fused = fuseWeightedRRF({
      streams,
      k: this.k,
      // When reranking is requested, pull a deeper candidate set first so the
      // reranker has the documented top-N to operate on.
      limit:
        this.shouldRerank(input) ? Math.max(this.rerankTopN, finalLimit) : finalLimit,
      lifecycleByItem,
      provenanceByItem
    });

    if (input.rerank !== true) {
      return fused.slice(0, finalLimit);
    }

    const reranker = this.reranker ?? await loadDefaultRerankerProvider();
    if (reranker === undefined) {
      return fused.slice(0, finalLimit);
    }

    // Post-fusion reranker pass (plan §3 Lane B item 4 — replacer, not stream).
    const topN = fused.slice(0, this.rerankTopN);
    const rerankInput: RerankerCandidate[] = topN.map((hit) => ({
      itemId: hit.itemId,
      chunkId: hit.chunkId,
      score: hit.score,
      // Providers may carry internal candidate text for reranking. API response
      // content is still owned by the later hydration boundary.
      text: hit.text ?? "",
      streams: hit.streams
    }));

    // Skip reranking when no candidate has text content. Rerankers require
    // non-empty text to compute meaningful relevance scores. With all-empty
    // text, reranking produces random ordering — strictly worse than the
    // fused RRF scores. Return fused results instead.
    const hasText = rerankInput.some((c) => c.text.trim().length > 0);
    if (!hasText) {
      return fused.slice(0, finalLimit);
    }

    const reranked = await reranker.rerank({
      query: input.query,
      candidates: rerankInput,
      limit: finalLimit
    });

    // Re-project reranker output back onto the fused hits' streams/lifecycle.
    const fusedById = new Map<string, MemorySearchHitV12>();
    for (const hit of fused) {
      const key = `${hit.itemId}::${hit.chunkId ?? ""}`;
      if (!fusedById.has(key)) fusedById.set(key, hit);
    }
    const out: MemorySearchHitV12[] = [];
    for (const r of reranked) {
      const key = `${r.itemId}::${r.chunkId ?? ""}`;
      const original = fusedById.get(key) ?? fusedById.get(`${r.itemId}::`);
      if (!original) continue;
      out.push({
        itemId: r.itemId,
        chunkId: r.chunkId ?? original.chunkId,
        score: r.score,
        streams: original.streams,
        lifecycle: original.lifecycle,
        provenance: original.provenance
      });
      if (out.length >= finalLimit) break;
    }
    // If the reranker returned fewer than finalLimit, top up from the fused
    // tail to preserve the contract that callers always get up to finalLimit
    // hits when the underlying streams produced enough candidates.
    if (out.length < finalLimit) {
      const seen = new Set(out.map((h) => `${h.itemId}::${h.chunkId ?? ""}`));
      for (const hit of fused) {
        const key = `${hit.itemId}::${hit.chunkId ?? ""}`;
        if (!seen.has(key)) {
          out.push(hit);
          seen.add(key);
          if (out.length >= finalLimit) break;
        }
      }
    }
    return out;

    // candidateLimit is forwarded via input — every StreamProviderV12 reads
    // it from input.candidateLimit. We reference it here so unused-variable
    // analysis is satisfied while keeping the name available for future
    // per-orchestrator overrides.
    void candidateLimit;
  }

  private shouldRerank(input: MemorySearchInputV12): boolean {
    if (input.rerank !== true) return false;
    return this.reranker !== undefined || shouldLoadDefaultRerankerFromEnv();
  }

  private async runProvider(
    provider: StreamProviderV12,
    input: MemorySearchInputV12
  ) {
    const startedAt = Date.now();
    try {
      const result = await this.raceWithTimeout(provider.emit(input));
      const latencyMs = Date.now() - startedAt;
      this.onStreamEvent({
        kind: provider.kind,
        backend: provider.backend,
        status: "ok",
        candidateCount: result.candidates.length,
        latencyMs
      });
      return result;
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const isTimeout =
        err instanceof StreamTimeoutError ||
        (err instanceof Error && (err as { isStreamTimeout?: boolean }).isStreamTimeout === true);
      this.onStreamEvent({
        kind: provider.kind,
        backend: provider.backend,
        status: isTimeout ? "timed_out" : "failed",
        latencyMs,
        error: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }

  private raceWithTimeout<T>(promise: Promise<T>): Promise<T> {
    if (this.streamTimeoutMs === null) return promise;
    const timeoutMs = this.streamTimeoutMs;
    return new Promise<T>((resolve, reject) => {
      const handle = setTimeout(() => {
        reject(new StreamTimeoutError(timeoutMs));
      }, timeoutMs);
      // Avoid Node-style "active timer keeps event loop alive" — important
      // for tests that race the timeout against fake-timer providers.
      if (typeof (handle as { unref?: () => void }).unref === "function") {
        (handle as { unref: () => void }).unref();
      }
      promise.then(
        (value) => {
          clearTimeout(handle);
          resolve(value);
        },
        (err) => {
          clearTimeout(handle);
          reject(err);
        }
      );
    });
  }
}

// ---------------------------------------------------------------------------
// Phase 3.1 — LORE_STREAM_TIMEOUT_MS env autowire helper.
//
// Operators can set LORE_STREAM_TIMEOUT_MS at runtime (without a redeploy)
// to override the 500 ms default used by HybridSearchOrchestrator.
// Safety bounds: 50–30000 ms. Values outside this range fall back to the
// compiled-in DEFAULT_STREAM_TIMEOUT_MS.
// ---------------------------------------------------------------------------

/**
 * Read LORE_STREAM_TIMEOUT_MS from env and validate it.
 * - Absent or invalid → DEFAULT_STREAM_TIMEOUT_MS (500).
 * - < 50 ms (safety floor) → DEFAULT_STREAM_TIMEOUT_MS.
 * - > 30000 ms (safety ceiling) → DEFAULT_STREAM_TIMEOUT_MS.
 */
export function resolveStreamTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.LORE_STREAM_TIMEOUT_MS;
  if (!raw) return DEFAULT_STREAM_TIMEOUT_MS;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 50 || n > 30000) return DEFAULT_STREAM_TIMEOUT_MS;
  return n;
}
