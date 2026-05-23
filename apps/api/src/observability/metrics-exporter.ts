import { metrics } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import type { CacheSpan, CacheTracer } from "../embedding-cache.js";
import type { StreamEventV13 } from "./stream-spans-v13.js";

const EXPORT_INTERVAL_MS = 60_000;
const METER_NAME = "lore-api";

export function createMeterProvider(
  env: Record<string, string | undefined> = process.env,
): MeterProvider | null {
  if (env.LORE_OTEL_ENABLED !== "1") {
    return null;
  }

  const resourceAttributes: Record<string, string> = {
    [ATTR_SERVICE_NAME]: "lore-api",
  };
  if (env.LORE_API_IMAGE) {
    resourceAttributes[ATTR_SERVICE_VERSION] = env.LORE_API_IMAGE;
  }

  const exporter = new OTLPMetricExporter();
  const provider = new MeterProvider({
    resource: defaultResource().merge(resourceFromAttributes(resourceAttributes)),
    readers: [
      new PeriodicExportingMetricReader({
        exporter,
        exportIntervalMillis: EXPORT_INTERVAL_MS,
      }),
    ],
  });

  metrics.setGlobalMeterProvider(provider);
  return provider;
}

export interface LoreMetrics {
  recordSearchStreamEvent(event: StreamEventV13): void;
  recordSearchLatencyMs(latencyMs: number): void;
  createEmbeddingCacheTracer(): CacheTracer | undefined;
  // v1.6 Lane D.1 — onboarding funnel step counter.
  // accountIdHash must be HMAC-SHA256; never pass plain account_id.
  recordOnboardingFunnelStep(step: string, accountIdHash: string): void;
}

export function createLoreMetrics(provider: MeterProvider | null): LoreMetrics {
  if (!provider) {
    return {
      recordSearchStreamEvent: () => {},
      recordSearchLatencyMs: () => {},
      createEmbeddingCacheTracer: () => undefined,
      recordOnboardingFunnelStep: () => {},
    };
  }

  const meter = provider.getMeter(METER_NAME);
  const streamCandidates = meter.createCounter("lore.search.stream.candidates", {
    description: "Candidate count emitted by each search stream.",
    unit: "{candidate}",
  });
  const streamLatencyMs = meter.createHistogram("lore.search.stream.latency_ms", {
    description: "Latency for each search stream.",
    unit: "ms",
  });
  const streamTimedOut = meter.createCounter("lore.search.stream.timed_out", {
    description: "Timed out search stream executions.",
    unit: "{timeout}",
  });
  const embeddingCacheHitRate = meter.createObservableGauge("lore.embedding.cache.hit_rate", {
    description: "Embedding cache hit rate observed by the API process.",
    unit: "1",
  });
  const embeddingCacheMissLatencyMs = meter.createHistogram("lore.embedding.cache.miss_latency_ms", {
    description: "Embedding cache miss lookup latency.",
    unit: "ms",
  });
  const searchP95Ms = meter.createHistogram("lore.search.p95_ms", {
    description: "Search route latency samples for CloudWatch percentile alarms.",
    unit: "ms",
  });
  const onboardingFunnelStep = meter.createCounter("lore.onboarding.funnel.step", {
    description: "Onboarding funnel step completions, namespace Lore/OnboardingV16.",
    unit: "{step}",
  });

  let embeddingHits = 0;
  let embeddingMisses = 0;
  embeddingCacheHitRate.addCallback((result) => {
    const total = embeddingHits + embeddingMisses;
    result.observe(total === 0 ? 0 : embeddingHits / total);
  });

  return {
    recordSearchStreamEvent(event) {
      const attributes = { "stream.kind": event.kind };
      streamLatencyMs.record(event.latencyMs, attributes);
      if (typeof event.candidateCount === "number") {
        streamCandidates.add(event.candidateCount, attributes);
      }
      if (event.status === "timed_out") {
        streamTimedOut.add(1, attributes);
      }
    },
    recordSearchLatencyMs(latencyMs) {
      searchP95Ms.record(latencyMs);
    },
    createEmbeddingCacheTracer() {
      return {
        startSpan(): CacheSpan {
          let cacheHit: boolean | undefined;
          return {
            setAttribute(key, value) {
              if (key === "embedding.cache.hit" && typeof value === "boolean") {
                cacheHit = value;
              }
              if (key === "embedding.cache.miss_latency_ms" && typeof value === "number") {
                embeddingCacheMissLatencyMs.record(value);
              }
            },
            addEvent() {},
            end() {
              if (cacheHit === true) {
                embeddingHits += 1;
              } else if (cacheHit === false) {
                embeddingMisses += 1;
              }
            },
          };
        },
      };
    },
    recordOnboardingFunnelStep(step: string, accountIdHash: string) {
      onboardingFunnelStep.add(1, { "funnel.step": step, "account_id_hash": accountIdHash });
    },
  };
}
