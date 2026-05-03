import { createHash } from "node:crypto";

// Lore v1.0.0-rc.2 — privacy-safe activation telemetry primitives.
//
// The public SaaS beta needs to measure the activation funnel
// (homepage → sign-in → first connected source → first candidate → first
// recall → first trust action) without ever storing raw memory content,
// captured transcripts, or other private text inside analytics records.
//
// This module owns the allowlist of known funnel events, scrubs incoming
// metadata to a small typed allowlist of safe fields, and stores a bounded
// in-memory ring of events for operator inspection. Production deployments
// can layer a durable sink on top of `recordActivationEvent` later (the API
// stays stable), but the v1.0 release gate only requires the privacy-safe
// recording contract — not a durable analytics warehouse.

export type ActivationEventName =
  | "homepage_visit"
  | "signin_started"
  | "signin_completed"
  | "dashboard_ready"
  | "first_source_connected"
  | "first_candidate_seen"
  | "first_candidate_approved"
  | "first_recall_observed"
  | "first_trust_action"
  | "support_intervention"
  | "day2_return"
  | "willingness_to_pay";

export const ACTIVATION_EVENT_NAMES: ReadonlyArray<ActivationEventName> = [
  "homepage_visit",
  "signin_started",
  "signin_completed",
  "dashboard_ready",
  "first_source_connected",
  "first_candidate_seen",
  "first_candidate_approved",
  "first_recall_observed",
  "first_trust_action",
  "support_intervention",
  "day2_return",
  "willingness_to_pay"
];

const ACTIVATION_EVENT_NAME_SET = new Set<ActivationEventName>(ACTIVATION_EVENT_NAMES);

export interface ActivationEventInput {
  event: string;
  surface?: string;
  /**
   * Free-form metadata. The implementation only keeps a small whitelist of
   * scalar safe fields; all other keys are dropped before persistence.
   */
  metadata?: Record<string, unknown>;
}

export interface ActivationEventRecord {
  id: string;
  event: ActivationEventName;
  surface: string;
  occurredAt: string;
  vaultId?: string;
  accountId?: string;
  sessionHashPrefix?: string;
  metadata: Record<string, string | number | boolean>;
}

export interface ActivationTelemetrySinkOptions {
  capacity?: number;
  now?: () => Date;
  idGenerator?: () => string;
}

export class ActivationTelemetrySink {
  private readonly buffer: ActivationEventRecord[] = [];
  private readonly capacity: number;
  private readonly now: () => Date;
  private readonly idGenerator: () => string;
  // Per-vault de-dupe tracker so funnel "first" events are only recorded once
  // per vault even if the dashboard repeats the call.
  private readonly seenFirstEventsByVault = new Map<string, Set<ActivationEventName>>();

  constructor(options: ActivationTelemetrySinkOptions = {}) {
    this.capacity = Math.max(64, options.capacity ?? 1024);
    this.now = options.now ?? (() => new Date());
    this.idGenerator = options.idGenerator ?? (() => `act_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
  }

  record(input: ActivationEventInput, context: { vaultId?: string; accountId?: string; sessionHashPrefix?: string } = {}): ActivationEventRecord {
    const event = normalizeEventName(input.event);
    const surface = sanitizeSurface(input.surface);
    const metadata = sanitizeMetadata(input.metadata);
    const occurredAt = this.now().toISOString();
    const record: ActivationEventRecord = {
      id: this.idGenerator(),
      event,
      surface,
      occurredAt,
      vaultId: context.vaultId,
      accountId: context.accountId,
      sessionHashPrefix: context.sessionHashPrefix,
      metadata
    };

    if (FIRST_EVENT_NAMES.has(event) && context.vaultId) {
      const seen = this.seenFirstEventsByVault.get(context.vaultId) ?? new Set<ActivationEventName>();
      if (seen.has(event)) {
        // Funnel "first" events are idempotent per vault.
        return { ...record, metadata: { ...metadata, deduped: true } };
      }
      seen.add(event);
      this.seenFirstEventsByVault.set(context.vaultId, seen);
    }

    this.buffer.push(record);
    while (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }
    return record;
  }

  list(options: { limit?: number } = {}): ActivationEventRecord[] {
    const limit = Math.max(1, Math.min(this.capacity, options.limit ?? 100));
    return this.buffer.slice(-limit).slice().reverse();
  }

  size(): number {
    return this.buffer.length;
  }
}

const FIRST_EVENT_NAMES = new Set<ActivationEventName>([
  "first_source_connected",
  "first_candidate_seen",
  "first_candidate_approved",
  "first_recall_observed",
  "first_trust_action",
  "day2_return",
  "willingness_to_pay"
]);

const SAFE_METADATA_KEYS = new Set([
  "step",
  "variant",
  "outcome",
  "source",
  "provider",
  "captureMode",
  "candidateStatus",
  "sourceStatus",
  "deviceLabel",
  "platform",
  "elapsedMs",
  "durationMs",
  "tokenKind",
  "feedback",
  "trustAction",
  "browser",
  "locale"
]);
const MAX_METADATA_STRING_LENGTH = 64;

function normalizeEventName(value: unknown): ActivationEventName {
  if (typeof value !== "string") {
    throw new ActivationTelemetryError("telemetry.event_required", "event is required", 400);
  }
  const trimmed = value.trim() as ActivationEventName;
  if (!ACTIVATION_EVENT_NAME_SET.has(trimmed)) {
    throw new ActivationTelemetryError(
      "telemetry.event_unknown",
      `unknown activation event ${value}; allowed: ${ACTIVATION_EVENT_NAMES.join(", ")}`,
      400
    );
  }
  return trimmed;
}

function sanitizeSurface(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const trimmed = value.trim().slice(0, 32);
  if (!/^[a-z0-9_.-]+$/i.test(trimmed)) return "unknown";
  return trimmed.toLowerCase();
}

function sanitizeMetadata(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof raw === "string") {
      const truncated = raw.trim().slice(0, MAX_METADATA_STRING_LENGTH);
      if (truncated.length > 0) out[key] = truncated;
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      out[key] = raw;
    } else if (typeof raw === "boolean") {
      out[key] = raw;
    }
  }
  return out;
}

export class ActivationTelemetryError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Convenience: derive a stable but non-identifying session hash prefix from a
 * full session token. Operator logs only ever see the first 8 hex characters
 * of the sha-256 digest, never the plaintext token or session content.
 */
export function sessionHashPrefix(plaintext: string | null | undefined): string | undefined {
  if (typeof plaintext !== "string" || plaintext.length === 0) return undefined;
  return createHash("sha256").update(plaintext).digest("hex").slice(0, 8);
}
