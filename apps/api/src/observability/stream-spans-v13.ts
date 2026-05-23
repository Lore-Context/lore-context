// Lore v1.3 Lane E item 4 — OpenTelemetry per-stream span adapter.
//
// Plan §3 Lane E item 4 mandates a span per stream with attributes:
//   stream.kind, stream.weight, stream.candidates, stream.latency_ms,
//   stream.timed_out (and we add stream.failed for the v1.3 Lane B
//   `status: "failed"` event).
//
// Wiring rules:
//   * The orchestrator (`HybridSearchOrchestrator`, packages/search) already
//     exposes an `onStreamEvent` seam. This module turns those events into
//     OTel spans without taking a hard runtime dependency on the
//     `@opentelemetry/sdk-*` packages — only the interface from
//     `@opentelemetry/api`-style tracers is required.
//   * When `LORE_OTEL_ENABLED` is unset/`0`, `createStreamSpansAdapter`
//     returns a no-op handler, so production traffic without OTel installed
//     pays zero cost.
//   * Callers may pass an explicit tracer (e.g., a stub for unit tests, or
//     `trace.getTracer(...)` from `@opentelemetry/api`).

import type { MemorySearchStreamKindV12 } from "@lore/search";

/**
 * Per-stream weight table — duplicated locally so this file does not pull
 * `@lore/eval` into the API runtime classpath. Keep in sync with
 * `V13_STREAM_WEIGHTS` in `packages/eval/src/ablation-v13.ts`.
 */
export const STREAM_WEIGHTS_V13: Record<MemorySearchStreamKindV12, number> = {
  qdrant_dense: 1.0,
  qdrant_sparse: 1.0,
  postgres_fts: 1.1,
  postgres_pgvector: 0.85,
  graph: 0.9,
  temporal: 0.75,
  wiki: 0.65,
};

/** Subset of the OpenTelemetry `Span` interface this adapter actually uses. */
export interface OtelSpan {
  setAttribute(key: string, value: string | number | boolean): unknown;
  setStatus?(status: { code: number; message?: string }): unknown;
  recordException?(err: unknown): unknown;
  end(): unknown;
}

/** Subset of the OpenTelemetry `Tracer` interface this adapter requires. */
export interface OtelTracer {
  startSpan(
    name: string,
    options?: { attributes?: Record<string, string | number | boolean> },
  ): OtelSpan;
}

/**
 * Stream event emitted by `HybridSearchOrchestrator.onStreamEvent`. Mirrors
 * `StreamEvent` from `@lore/search` without forcing a structural import.
 */
export interface StreamEventV13 {
  kind: MemorySearchStreamKindV12;
  backend: string;
  status: "ok" | "failed" | "timed_out";
  candidateCount?: number;
  latencyMs: number;
  error?: string;
}

export interface StreamSpansAdapterConfig {
  /** Tracer to start spans on. When undefined, the adapter is a no-op. */
  tracer?: OtelTracer;
  /**
   * Environment lookup. Default: `process.env`. Used to gate behaviour on
   * `LORE_OTEL_ENABLED`. Pure-function tests can pass `{}` to force the
   * "disabled" branch.
   */
  env?: Record<string, string | undefined>;
  /** Override the per-stream weight table (used by tests). */
  weights?: Partial<Record<MemorySearchStreamKindV12, number>>;
  /** Span name. Default `lore.search.stream`. */
  spanName?: string;
}

/**
 * Build a `(event: StreamEventV13) => void` handler suitable for
 * `HybridSearchOrchestratorConfig.onStreamEvent`.
 */
export function createStreamSpansAdapter(
  config: StreamSpansAdapterConfig = {},
): (event: StreamEventV13) => void {
  const env = config.env ?? process.env;
  const otelFlag = env.LORE_OTEL_ENABLED;
  const enabled =
    config.tracer !== undefined &&
    (otelFlag === "1" || otelFlag === "true" || otelFlag === "yes");

  if (!enabled || !config.tracer) {
    // No-op handler — keeps production cost at zero when OTel is not wired.
    return () => {};
  }

  const tracer = config.tracer;
  const weights = { ...STREAM_WEIGHTS_V13, ...(config.weights ?? {}) };
  const spanName = config.spanName ?? "lore.search.stream";

  return (event: StreamEventV13): void => {
    const span = tracer.startSpan(spanName, {
      attributes: {
        "stream.kind": event.kind,
        "stream.backend": event.backend,
      },
    });
    span.setAttribute("stream.kind", event.kind);
    span.setAttribute("stream.backend", event.backend);
    span.setAttribute("stream.weight", weights[event.kind] ?? 0);
    span.setAttribute("stream.candidates", event.candidateCount ?? 0);
    span.setAttribute("stream.latency_ms", event.latencyMs);
    span.setAttribute("stream.timed_out", event.status === "timed_out");
    span.setAttribute("stream.failed", event.status === "failed");
    if (event.error) {
      span.setAttribute("stream.error", event.error);
      if (typeof span.recordException === "function") {
        span.recordException(new Error(event.error));
      }
    }
    if (event.status !== "ok" && typeof span.setStatus === "function") {
      // Span Status code 2 == ERROR per OpenTelemetry spec.
      span.setStatus({ code: 2, message: event.error ?? event.status });
    }
    span.end();
  };
}

/**
 * Convenience helper: returns true when OTel is wired in this process.
 * Useful for log gates / dashboard exposure decisions.
 */
export function isStreamSpansEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const flag = env.LORE_OTEL_ENABLED;
  return flag === "1" || flag === "true" || flag === "yes";
}
