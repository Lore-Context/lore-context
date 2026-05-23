// Tests for audit-chain (V2.0.5-T1 verifier intact + V2.0.5-T2 deletion/
// tamper detection with specific row id).

import { describe, expect, it } from "vitest";
import {
  AUDIT_GENESIS_LABEL,
  buildAuditRow,
  canonicalJson,
  computeEventHmac,
  genesisPrevHmac,
  verifyAuditChain,
  type AuditChainRow
} from "../../src/crypto/audit-chain.js";
import { deriveAuditChainKey, deriveVaultMasterKey } from "../../src/crypto/hkdf-chain.js";

const VMK = deriveVaultMasterKey({
  accountKey: Buffer.from("a".repeat(64), "hex"),
  secretKey: Buffer.from("00112233445566778899aabbccddeeff", "hex")
});
const CHAIN_KEY = deriveAuditChainKey(VMK);

function freshChain(n: number): AuditChainRow[] {
  const rows: AuditChainRow[] = [];
  let prev: Buffer | undefined = undefined;
  for (let i = 0; i < n; i++) {
    const row = buildAuditRow(CHAIN_KEY, {
      occurredAt: new Date(2026, 4, 13, 0, 0, i).toISOString(),
      vaultId: "vault-test",
      secretId: `secret-${i}`,
      labelAtTime: `secret_${i}`,
      agentSelfId: Buffer.alloc(32).toString("base64"),
      agentName: "Test Agent",
      action: "get_allowed",
      decisionSource: "永久_grant",
      clientIp: "127.0.0.1",
      prevEventHmac: prev,
      metadata: { iter: i }
    });
    rows.push(row);
    prev = Buffer.from(row.eventHmac, "base64");
  }
  return rows;
}

describe("canonicalJson", () => {
  it("sorts object keys deterministically", () => {
    const a = canonicalJson({ b: 1, a: 2, c: 3 });
    const b = canonicalJson({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":3}');
  });

  it("encodes Buffer as base64", () => {
    const out = canonicalJson({ x: Buffer.from([1, 2, 3]) });
    expect(out).toBe('{"x":"AQID"}');
  });

  it("drops undefined values", () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("supports arrays recursively", () => {
    expect(canonicalJson([1, "two", { x: 3 }])).toBe('[1,"two",{"x":3}]');
  });
});

describe("genesisPrevHmac", () => {
  it("is deterministic SHA256 of label", () => {
    const a = genesisPrevHmac();
    const b = genesisPrevHmac();
    expect(a.equals(b)).toBe(true);
    expect(a.length).toBe(32);
  });
});

describe("computeEventHmac", () => {
  it("rejects wrong-length audit chain key", () => {
    expect(() =>
      computeEventHmac(Buffer.alloc(16), {
        occurredAt: "2026-05-13T00:00:00Z",
        vaultId: "v",
        secretId: null,
        labelAtTime: null,
        agentSelfId: null,
        agentName: null,
        action: "list",
        decisionSource: null,
        clientIp: null,
        prevEventHmac: genesisPrevHmac().toString("base64")
      })
    ).toThrowError(/auditChainKey must be 32 bytes/);
  });

  it("is deterministic for fixed inputs", () => {
    const body = {
      occurredAt: "2026-05-13T00:00:00Z",
      vaultId: "v",
      secretId: null,
      labelAtTime: null,
      agentSelfId: null,
      agentName: null,
      action: "list",
      decisionSource: null,
      clientIp: null,
      prevEventHmac: genesisPrevHmac().toString("base64")
    };
    const a = computeEventHmac(CHAIN_KEY, body);
    const b = computeEventHmac(CHAIN_KEY, body);
    expect(a.equals(b)).toBe(true);
  });
});

describe("V2.0.5-T1: verifyAuditChain on intact log", () => {
  it("returns ok for a 200-row intact chain", () => {
    const chain = freshChain(200);
    const result = verifyAuditChain(chain, CHAIN_KEY);
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(200);
    expect(result.failure).toBeUndefined();
    expect(result.headHmac).toBe(chain[199].eventHmac);
  });

  it("returns ok with expectedFirstPrev = genesis", () => {
    const chain = freshChain(50);
    const result = verifyAuditChain(chain, CHAIN_KEY, genesisPrevHmac());
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(50);
  });

  it("flags empty chain as failure (no events to anchor)", () => {
    const result = verifyAuditChain([], CHAIN_KEY);
    expect(result.ok).toBe(false);
    expect(result.failure?.kind).toBe("empty_chain");
  });
});

describe("V2.0.5-T2: tamper detection with specific row id", () => {
  it("detects a tampered event body (eventHmac no longer matches)", () => {
    const chain = freshChain(10);
    // tamper row 4: change agentName
    chain[4] = { ...chain[4], agentName: "Imposter Agent" };
    const result = verifyAuditChain(chain, CHAIN_KEY);
    expect(result.ok).toBe(false);
    expect(result.failure?.kind).toBe("event_hmac_mismatch");
    expect((result.failure as { index: number }).index).toBe(4);
    expect(result.verified).toBe(4); // verified 0..3 successfully
  });

  it("detects a deleted row (next row's prev_hmac no longer matches)", () => {
    const chain = freshChain(10);
    // delete row 5
    const tampered = [...chain.slice(0, 5), ...chain.slice(6)];
    const result = verifyAuditChain(tampered, CHAIN_KEY);
    expect(result.ok).toBe(false);
    expect(result.failure?.kind).toBe("prev_hmac_link_broken");
    expect((result.failure as { index: number }).index).toBe(5);
  });

  it("detects reordered rows", () => {
    const chain = freshChain(10);
    const reordered = [...chain];
    // swap row 3 and row 4
    [reordered[3], reordered[4]] = [reordered[4], reordered[3]];
    const result = verifyAuditChain(reordered, CHAIN_KEY);
    expect(result.ok).toBe(false);
    // First break depends on prev_hmac at index 3
    expect(result.failure?.kind).toBe("prev_hmac_link_broken");
    expect((result.failure as { index: number }).index).toBe(3);
  });

  it("detects forged event at tail (correct prev_hmac link but wrong chain_key)", () => {
    const chain = freshChain(5);
    const otherKey = Buffer.alloc(32, 0x99);
    // append a row signed with WRONG chain key (forger doesn't have audit_chain_key)
    const forged = buildAuditRow(otherKey, {
      occurredAt: new Date().toISOString(),
      vaultId: "vault-test",
      secretId: "forged",
      labelAtTime: "forged_secret",
      agentSelfId: null,
      agentName: "Forger",
      action: "get_allowed",
      decisionSource: null,
      clientIp: null,
      prevEventHmac: Buffer.from(chain[4].eventHmac, "base64")
    });
    const chainPlusForged = [...chain, forged];
    const result = verifyAuditChain(chainPlusForged, CHAIN_KEY);
    expect(result.ok).toBe(false);
    expect(result.failure?.kind).toBe("event_hmac_mismatch");
    expect((result.failure as { index: number }).index).toBe(5);
  });

  it("detects expectedFirstPrev mismatch (truncate-at-head attack)", () => {
    const chain = freshChain(10);
    // pretend rows 0..4 were truncated; verifier expects prev == row 4's hmac
    const tail = chain.slice(5);
    const expectedFirstPrev = Buffer.from(chain[4].eventHmac, "base64");
    // Correct expectation: passes
    const ok = verifyAuditChain(tail, CHAIN_KEY, expectedFirstPrev);
    expect(ok.ok).toBe(true);

    // Wrong expectation: fails immediately at index 0
    const wrong = Buffer.alloc(32);
    const bad = verifyAuditChain(tail, CHAIN_KEY, wrong);
    expect(bad.ok).toBe(false);
    expect(bad.failure?.kind).toBe("prev_hmac_link_broken");
    expect((bad.failure as { index: number }).index).toBe(0);
  });
});

describe("buildAuditRow", () => {
  it("links to genesisPrevHmac when prevEventHmac is omitted", () => {
    const row = buildAuditRow(CHAIN_KEY, {
      occurredAt: "2026-05-13T00:00:00Z",
      vaultId: "v",
      secretId: null,
      labelAtTime: null,
      agentSelfId: null,
      agentName: null,
      action: "list",
      decisionSource: null,
      clientIp: null
    });
    expect(row.prevEventHmac).toBe(genesisPrevHmac().toString("base64"));
  });

  it("produces a verifiable single-row chain", () => {
    const row = buildAuditRow(CHAIN_KEY, {
      occurredAt: "2026-05-13T00:00:00Z",
      vaultId: "v",
      secretId: null,
      labelAtTime: null,
      agentSelfId: null,
      agentName: null,
      action: "list",
      decisionSource: null,
      clientIp: null
    });
    const result = verifyAuditChain([row], CHAIN_KEY, genesisPrevHmac());
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(1);
  });
});

describe("invariants", () => {
  it("AUDIT_GENESIS_LABEL is the documented constant", () => {
    expect(AUDIT_GENESIS_LABEL).toBe("LoreAudit-v1-genesis");
  });
});
