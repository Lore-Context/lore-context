/**
 * C5 — Algorithmic consistency: code.impact(X, depth=Infinity) returns the same
 * symbol set as BFS closure of code.references(X).
 *
 * The MCP layer is a thin forwarder. We verify the wiring by mocking fetchImpl
 * to return a deterministic fixture and confirming that:
 *   a) code.impact routes to /v1/code-graph/impact
 *   b) code.references routes to /v1/code-graph/references
 *   c) Both carry the same qname argument (the server implements C5 using the
 *      same recursive CTE; we test the MCP routing contract here)
 *
 * The full algorithmic consistency test (A→B→C graph) runs against a seeded
 * test-pg instance and is covered by the API-layer tests in
 * apps/api/tests/code-graph-impact.test.ts (Lane R).
 */

import { describe, expect, it } from "vitest";
import { handleJsonRpcMessage } from "../src/index.js";

/** Simulated impact closure for A: returns B and C (BFS depth=∞). */
const IMPACT_RESPONSE = {
  symbols: [
    { qname: "B", kind: "function", file_path: "src/b.ts", start_line: 1 },
    { qname: "C", kind: "function", file_path: "src/c.ts", start_line: 1 }
  ],
  total: 2,
  cursor: null
};

/** Simulated references for A: returns B (direct callers only). */
const REFERENCES_RESPONSE = {
  references: [
    { src_qname: "B", relation_kind: "calls", src_file_path: "src/b.ts", src_line: 5 }
  ]
};

function captureAndRespond(
  captured: { url: string; body: unknown }[],
  responseBody: unknown
): typeof fetch {
  return async (input, init) => {
    let body: unknown;
    try {
      body = init?.body ? JSON.parse(init.body.toString()) : {};
    } catch {
      body = {};
    }
    captured.push({ url: String(input), body });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
}

describe("code.impact equals references closure", () => {
  it("code.impact routes to /v1/code-graph/impact with qname payload", async () => {
    const calls: { url: string; body: unknown }[] = [];
    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "impact-route",
        method: "tools/call",
        params: {
          name: "code.impact",
          arguments: { qname: "A" }
        }
      },
      { fetchImpl: captureAndRespond(calls, IMPACT_RESPONSE) }
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/v1/code-graph/impact");
    expect(calls[0].body).toMatchObject({ qname: "A" });
  });

  it("code.references routes to /v1/code-graph/references with qname payload", async () => {
    const calls: { url: string; body: unknown }[] = [];
    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "refs-route",
        method: "tools/call",
        params: {
          name: "code.references",
          arguments: { qname: "A" }
        }
      },
      { fetchImpl: captureAndRespond(calls, REFERENCES_RESPONSE) }
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/v1/code-graph/references");
    expect(calls[0].body).toMatchObject({ qname: "A" });
  });

  it("code.impact returns seeded BFS closure (B and C) for root A", async () => {
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "impact-closure",
        method: "tools/call",
        params: {
          name: "code.impact",
          arguments: { qname: "A" }
        }
      },
      { fetchImpl: async () => new Response(JSON.stringify(IMPACT_RESPONSE), { status: 200 }) }
    );

    expect(response).toMatchObject({
      result: {
        structuredContent: {
          symbols: expect.arrayContaining([
            expect.objectContaining({ qname: "B" }),
            expect.objectContaining({ qname: "C" })
          ]),
          total: 2
        }
      }
    });
  });

  it("code.impact accepts optional depth and cursor args without schema error", async () => {
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "impact-args",
        method: "tools/call",
        params: {
          name: "code.impact",
          arguments: { qname: "A", depth: 5, cursor: "abc123" }
        }
      },
      { fetchImpl: async () => new Response(JSON.stringify(IMPACT_RESPONSE), { status: 200 }) }
    );

    // Must not be a schema validation error
    expect(response).not.toMatchObject({ error: expect.anything() });
  });
});
