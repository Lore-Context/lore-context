/**
 * SDK middleware metrics (Y1 + Y2).
 *
 * Lightweight Prometheus-text exporter. Operates against the same audit
 * callback surface the middleware already emits (`onInjectAudit`/`onRetainAudit`).
 *
 * Typically the server-side LoreMetrics exporter (`apps/api/src/observability/
 * metrics-exporter.ts`) is the authoritative source for these — it sees the
 * actual HTTP traffic. This client-side registry exists so:
 *  - Unit tests can verify metric shape / cardinality without a running server
 *  - Users running the middleware in long-lived processes can scrape locally
 */

import type {
  InjectAuditEvent,
  RetainAuditEvent,
  SubscriptionTier,
  MiddlewareMode,
} from "./types.js";

type Labels = Record<string, string>;

interface Counter {
  type: "counter";
  help: string;
  values: Map<string, { labels: Labels; value: number }>;
}

interface Histogram {
  type: "histogram";
  help: string;
  buckets: number[];
  values: Map<
    string,
    {
      labels: Labels;
      counts: number[];
      sum: number;
      count: number;
    }
  >;
}

type Metric = Counter | Histogram;

const HISTOGRAM_BUCKETS_MS = [10, 50, 100, 250, 500, 1000, 2000, 5000];
const HISTOGRAM_BUCKETS_TOKENS = [128, 512, 1024, 2048, 4096, 8192];

function labelsKey(labels: Labels): string {
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(",");
}

function formatLabels(labels: Labels): string {
  const entries = Object.keys(labels)
    .sort()
    .map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`);
  return entries.length ? `{${entries.join(",")}}` : "";
}

export class MiddlewareMetricsRegistry {
  private metrics: Record<string, Metric>;

  constructor() {
    this.metrics = {
      lore_middleware_inject_total: this.counter("Total inject attempts"),
      lore_middleware_inject_skip_total: this.counter("Total inject skips by reason"),
      lore_middleware_inject_latency_ms: this.histogram("Inject latency ms", HISTOGRAM_BUCKETS_MS),
      lore_middleware_inject_tokens: this.histogram("Inject token budget actually used", HISTOGRAM_BUCKETS_TOKENS),
      lore_middleware_retain_total: this.counter("Total retain attempts"),
      lore_middleware_retain_skip_total: this.counter("Total retain skips by reason"),
      lore_middleware_retain_latency_ms: this.histogram("Retain latency ms", HISTOGRAM_BUCKETS_MS),
    };
  }

  /** Wire from middleware option.onInjectAudit. */
  recordInject(event: InjectAuditEvent, ctx?: { tier?: SubscriptionTier; mode?: MiddlewareMode }): void {
    const tier = ctx?.tier ?? "unknown";
    const mode = ctx?.mode ?? "hybrid";
    this.incCounter("lore_middleware_inject_total", { tier, mode, success: event.skipped ? "false" : "true" });
    if (event.skipped) {
      this.incCounter("lore_middleware_inject_skip_total", {
        reason: event.reason ?? "unknown",
        tier,
        mode,
      });
    }
    if (typeof event.latencyMs === "number") {
      this.observeHistogram("lore_middleware_inject_latency_ms", event.latencyMs, { tier, mode });
    }
  }

  /** Wire from middleware option.onRetainAudit. */
  recordRetain(event: RetainAuditEvent, ctx?: { tier?: SubscriptionTier; source?: string }): void {
    const tier = ctx?.tier ?? "unknown";
    const source = ctx?.source ?? "unknown";
    this.incCounter("lore_middleware_retain_total", { tier, source, success: event.skipped ? "false" : "true" });
    if (event.skipped) {
      this.incCounter("lore_middleware_retain_skip_total", {
        reason: event.reason ?? "unknown",
        tier,
        source,
      });
    }
  }

  /** Y2: emit Prometheus exposition format. */
  scrape(): string {
    const lines: string[] = [];
    for (const [name, metric] of Object.entries(this.metrics)) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);
      if (metric.type === "counter") {
        const counter: Counter = metric;
        for (const v of counter.values.values()) {
          lines.push(`${name}${formatLabels(v.labels)} ${v.value}`);
        }
      } else {
        const histogram: Histogram = metric;
        for (const v of histogram.values.values()) {
          for (let i = 0; i < histogram.buckets.length; i++) {
            const bucketUpper = histogram.buckets[i];
            if (typeof bucketUpper !== "number") continue;
            const labels = { ...v.labels, le: String(bucketUpper) };
            lines.push(`${name}_bucket${formatLabels(labels)} ${v.counts[i] ?? 0}`);
          }
          lines.push(`${name}_bucket${formatLabels({ ...v.labels, le: "+Inf" })} ${v.count}`);
          lines.push(`${name}_sum${formatLabels(v.labels)} ${v.sum}`);
          lines.push(`${name}_count${formatLabels(v.labels)} ${v.count}`);
        }
      }
    }
    return lines.join("\n") + "\n";
  }

  /** Test helper: returns a snapshot of metric values for assertion. */
  snapshot(): Record<string, Array<{ labels: Labels; value?: number; sum?: number; count?: number; counts?: number[] }>> {
    const out: Record<string, Array<{ labels: Labels; value?: number; sum?: number; count?: number; counts?: number[] }>> = {};
    for (const [name, metric] of Object.entries(this.metrics)) {
      const series: Array<{ labels: Labels; value?: number; sum?: number; count?: number; counts?: number[] }> = [];
      if (metric.type === "counter") {
        for (const v of metric.values.values()) {
          series.push({ labels: v.labels, value: v.value });
        }
      } else {
        for (const v of metric.values.values()) {
          series.push({ labels: v.labels, sum: v.sum, count: v.count, counts: [...v.counts] });
        }
      }
      out[name] = series;
    }
    return out;
  }

  private counter(help: string): Counter {
    return { type: "counter", help, values: new Map() };
  }

  private histogram(help: string, buckets: number[]): Histogram {
    return { type: "histogram", help, buckets: [...buckets], values: new Map() };
  }

  private incCounter(name: string, labels: Labels): void {
    const metric = this.metrics[name];
    if (!metric || metric.type !== "counter") return;
    const key = labelsKey(labels);
    const existing = metric.values.get(key);
    if (existing) existing.value += 1;
    else metric.values.set(key, { labels, value: 1 });
  }

  private observeHistogram(name: string, observedValue: number, labels: Labels): void {
    const metric = this.metrics[name];
    if (!metric || metric.type !== "histogram") return;
    const key = labelsKey(labels);
    let series = metric.values.get(key);
    if (!series) {
      series = {
        labels,
        counts: metric.buckets.map(() => 0),
        sum: 0,
        count: 0,
      };
      metric.values.set(key, series);
    }
    for (let i = 0; i < metric.buckets.length; i++) {
      const bucketUpper = metric.buckets[i];
      if (typeof bucketUpper === "number" && observedValue <= bucketUpper) {
        series.counts[i] = (series.counts[i] ?? 0) + 1;
      }
    }
    series.sum += observedValue;
    series.count += 1;
  }
}

/** Convenience factory. */
export function createMetricsRegistry(): MiddlewareMetricsRegistry {
  return new MiddlewareMetricsRegistry();
}
