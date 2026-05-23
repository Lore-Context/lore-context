/**
 * C4 — code.context aggregates refs: seeded fixture, call code.context({qname:'Foo.bar'}),
 * assert incoming/outgoing match seed.
 *
 * The MCP layer is a thin HTTP forwarder. We mock fetchImpl to return a
 * pre-seeded fixture and assert the tool returns it verbatim.
 */

import { describe, expect, it } from "vitest";
import { handleJsonRpcMessage } from "../src/index.js";

/** Fixture: symbol Foo.bar has two incoming callers and one outgoing call. */
const SEEDED_CONTEXT_RESPONSE = {
  symbol: {
    qname: "Foo.bar",
    kind: "method",
    signature: "bar(x: number): string",
    doc_comment: "Converts x to string.",
    file_path: "src/foo.ts",
    start_line: 10,
    end_line: 15
  },
  incoming: [
    { src_qname: "App.init", relation_kind: "calls", src_file_path: "src/app.ts", src_line: 42 },
    { src_qname: "Utils.run", relation_kind: "calls", src_file_path: "src/utils.ts", src_line: 7 }
  ],
  outgoing: [
    { dst_qname: "Logger.log", relation_kind: "calls", dst_file_path: "src/logger.ts", dst_line: 3 }
  ]
};

function makeMockFetch(body: unknown, status = 200): typeof fetch {
  return async (_input, _init) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" }
    });
}

describe("code.context aggregates refs", () => {
  it("returns symbol metadata + incoming + outgoing from seeded fixture", async () => {
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "ctx-test",
        method: "tools/call",
        params: {
          name: "code.context",
          arguments: { qname: "Foo.bar" }
        }
      },
      { fetchImpl: makeMockFetch(SEEDED_CONTEXT_RESPONSE) }
    );

    expect(response).toMatchObject({
      result: {
        structuredContent: {
          symbol: { qname: "Foo.bar", kind: "method" },
          incoming: expect.arrayContaining([
            expect.objectContaining({ src_qname: "App.init", relation_kind: "calls" }),
            expect.objectContaining({ src_qname: "Utils.run", relation_kind: "calls" })
          ]),
          outgoing: expect.arrayContaining([
            expect.objectContaining({ dst_qname: "Logger.log", relation_kind: "calls" })
          ])
        }
      }
    });
  });

  it("incoming length matches seeded fixture (2 callers)", async () => {
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "ctx-len",
        method: "tools/call",
        params: {
          name: "code.context",
          arguments: { qname: "Foo.bar" }
        }
      },
      { fetchImpl: makeMockFetch(SEEDED_CONTEXT_RESPONSE) }
    );

    type Res = { result: { structuredContent: { incoming: unknown[] } } };
    const r = response as Res;
    expect(r.result.structuredContent.incoming).toHaveLength(2);
  });

  it("outgoing length matches seeded fixture (1 callee)", async () => {
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "ctx-out",
        method: "tools/call",
        params: {
          name: "code.context",
          arguments: { qname: "Foo.bar" }
        }
      },
      { fetchImpl: makeMockFetch(SEEDED_CONTEXT_RESPONSE) }
    );

    type Res = { result: { structuredContent: { outgoing: unknown[] } } };
    const r = response as Res;
    expect(r.result.structuredContent.outgoing).toHaveLength(1);
  });

  it("code.context requires qname — missing argument returns error response", async () => {
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "ctx-missing",
        method: "tools/call",
        params: {
          name: "code.context",
          arguments: {}
        }
      },
      { fetchImpl: makeMockFetch(SEEDED_CONTEXT_RESPONSE) }
    );
    // Should be a protocol error (invalid params), not a result
    expect(response).toMatchObject({ error: expect.objectContaining({ code: -32602 }) });
  });
});
