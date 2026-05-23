// Audit hash chain helpers for Lore Secret Vault v2.0.5.
//
// Per spec §6:
//   - event_hmac_n = HMAC-SHA256(audit_chain_key, canonical_json(event_n))
//   - event_n.prev_event_hmac points at event_{n-1}.event_hmac
//   - Genesis prev_event_hmac = SHA256("LoreAudit-v1-genesis")
//
// The dashboard fetches an audit log slice and calls verifyAuditChain()
// to confirm: every event_hmac matches the recomputed HMAC, AND every
// prev_event_hmac matches the previous row's event_hmac. Any tamper /
// deletion / reorder surfaces with the specific bad row index, which
// the dashboard renders as a red status banner.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const AUDIT_GENESIS_LABEL = "LoreAudit-v1-genesis";

export function genesisPrevHmac(): Buffer {
  return createHash("sha256").update(AUDIT_GENESIS_LABEL, "utf8").digest();
}

/**
 * Canonical JSON serialization — keys sorted, undefined dropped, no
 * unstable representations. Matches what the server stores and what the
 * client recomputes when verifying.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return JSON.stringify(Buffer.from(value).toString("base64"));
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalJson(v)).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const v = (value as Record<string, unknown>)[key];
      if (v === undefined) continue;
      parts.push(JSON.stringify(key) + ":" + canonicalJson(v));
    }
    return "{" + parts.join(",") + "}";
  }
  throw new TypeError(`canonicalJson: unsupported type ${typeof value}`);
}

export interface AuditEventBody {
  occurredAt: string;
  vaultId: string;
  secretId: string | null;
  labelAtTime: string | null;
  agentSelfId: string | null;
  agentName: string | null;
  action: string;
  decisionSource: string | null;
  clientIp: string | null;
  prevEventHmac: string; // base64
  metadata?: Record<string, unknown>;
}

export interface AuditChainRow extends AuditEventBody {
  eventHmac: string; // base64; what the server stored
}

export function computeEventHmac(auditChainKey: Buffer, event: AuditEventBody): Buffer {
  if (auditChainKey.length !== 32) {
    throw new RangeError(`auditChainKey must be 32 bytes, got ${auditChainKey.length}`);
  }
  const serialized = canonicalJson(event);
  return createHmac("sha256", auditChainKey).update(serialized, "utf8").digest();
}

export type VerifyFailure =
  | { kind: "event_hmac_mismatch"; index: number; rowId?: string }
  | { kind: "prev_hmac_link_broken"; index: number; rowId?: string }
  | { kind: "empty_chain" };

export interface VerifyResult {
  ok: boolean;
  /** Total verified events. */
  verified: number;
  /** First failure (if any). */
  failure?: VerifyFailure;
  /** event_hmac of the final row, used for last_known_hmac cache. */
  headHmac?: string;
}

/**
 * Verify a chronologically-ordered slice of audit rows (oldest first).
 *
 * - If `expectedFirstPrev` is provided, the first row's prevEventHmac must
 *   match it (used to anchor a slice to a known starting point).
 * - If omitted, the first row's prevEventHmac is assumed correct (used
 *   when verifying without a baseline, e.g. dashboard first-device access).
 *
 * Returns at the first failure, identifying the row index for dashboard
 * display.
 */
export function verifyAuditChain(
  rows: AuditChainRow[],
  auditChainKey: Buffer,
  expectedFirstPrev?: Buffer
): VerifyResult {
  if (rows.length === 0) {
    return { ok: false, verified: 0, failure: { kind: "empty_chain" } };
  }

  let prevHmac: Buffer | undefined =
    expectedFirstPrev !== undefined ? expectedFirstPrev : undefined;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowPrev = Buffer.from(row.prevEventHmac, "base64");

    if (prevHmac !== undefined) {
      // Constant-time comparison: HMAC byte values are sensitive even though
      // they are technically public (server-stored), because a network-level
      // attacker who can spam the dashboard verify endpoint could otherwise
      // probe prefix bytes via response timing.
      if (rowPrev.length !== prevHmac.length || !timingSafeEqual(rowPrev, prevHmac)) {
        return {
          ok: false,
          verified: i,
          failure: { kind: "prev_hmac_link_broken", index: i }
        };
      }
    }

    const body: AuditEventBody = {
      occurredAt: row.occurredAt,
      vaultId: row.vaultId,
      secretId: row.secretId,
      labelAtTime: row.labelAtTime,
      agentSelfId: row.agentSelfId,
      agentName: row.agentName,
      action: row.action,
      decisionSource: row.decisionSource,
      clientIp: row.clientIp,
      prevEventHmac: row.prevEventHmac,
      metadata: row.metadata
    };
    const expected = computeEventHmac(auditChainKey, body);
    const stored = Buffer.from(row.eventHmac, "base64");
    if (expected.length !== stored.length || !timingSafeEqual(expected, stored)) {
      return {
        ok: false,
        verified: i,
        failure: { kind: "event_hmac_mismatch", index: i }
      };
    }

    prevHmac = expected;
  }

  return {
    ok: true,
    verified: rows.length,
    headHmac: rows[rows.length - 1].eventHmac
  };
}

/** Build a new row for append, given the previous head_hmac. */
export function buildAuditRow(
  auditChainKey: Buffer,
  body: Omit<AuditEventBody, "prevEventHmac"> & { prevEventHmac?: Buffer }
): AuditChainRow {
  const prev = body.prevEventHmac ?? genesisPrevHmac();
  const fullBody: AuditEventBody = {
    occurredAt: body.occurredAt,
    vaultId: body.vaultId,
    secretId: body.secretId,
    labelAtTime: body.labelAtTime,
    agentSelfId: body.agentSelfId,
    agentName: body.agentName,
    action: body.action,
    decisionSource: body.decisionSource,
    clientIp: body.clientIp,
    prevEventHmac: prev.toString("base64"),
    metadata: body.metadata
  };
  const hmac = computeEventHmac(auditChainKey, fullBody);
  return { ...fullBody, eventHmac: hmac.toString("base64") };
}
