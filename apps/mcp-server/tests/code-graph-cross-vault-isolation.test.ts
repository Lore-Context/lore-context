/**
 * C7 — Cross-vault isolation: tools called as vault A must not return vault B rows.
 *
 * The MCP layer enforces vault isolation by forwarding the API key in the
 * Authorization header. The server resolves the vault from the key and scopes
 * all queries to that vault's code_repos. We cannot test this end-to-end here
 * (no real DB), but we DO test:
 *
 *   a) The Authorization header is forwarded correctly for each code tool
 *   b) Different API keys produce different Authorization headers (vault A ≠ vault B)
 *   c) A mock "vault B" fetch interceptor sees vault-B's key, confirming isolation
 *      at the transport layer
 *
 * Full DB-level isolation (two seeded vaults, same qname, assert no cross-leak)
 * is tested in apps/api/tests/code-graph-cross-vault.test.ts (Lane R).
 */

import { describe, expect, it } from "vitest";
import { handleJsonRpcMessage } from "../src/index.js";

const CODE_TOOLS = [
  { name: "code.search",      args: { query: "foo" } },
  { name: "code.context",     args: { qname: "Foo.bar" } },
  { name: "code.callgraph",   args: { qname: "Foo.bar", depth: 2 } },
  { name: "code.references",  args: { qname: "Foo.bar" } },
  { name: "code.impact",      args: { qname: "Foo.bar" } },
  { name: "code.list_repos",  args: {} },
  { name: "code.search_text", args: { pattern: "foo" } }
] as const;

function captureAuthHeaders(apiKey: string): {
  fetch: typeof fetch;
  headers: string[];
} {
  const headers: string[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const auth = (init?.headers as Headers | undefined)?.get?.("authorization") ?? "";
    headers.push(auth);
    return new Response(JSON.stringify({ results: [], repos: [], references: [], symbols: [], nodes: [], edges: [] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  return { fetch: fetchImpl, headers };
}

describe("code-graph cross-vault isolation", () => {
  for (const tool of CODE_TOOLS) {
    it(`${tool.name} forwards vault-A API key in Authorization header`, async () => {
      const { fetch: fetchImpl, headers } = captureAuthHeaders("vault-a-key");

      await handleJsonRpcMessage(
        {
          jsonrpc: "2.0",
          id: `vault-a-${tool.name}`,
          method: "tools/call",
          params: { name: tool.name, arguments: { ...tool.args } }
        },
        { fetchImpl, apiKey: "vault-a-key" }
      );

      expect(headers.length).toBeGreaterThanOrEqual(1);
      for (const header of headers) {
        expect(header).toBe("Bearer vault-a-key");
      }
    });
  }

  it("vault-A and vault-B produce different Authorization headers for the same tool", async () => {
    const capturedA: string[] = [];
    const capturedB: string[] = [];

    const fetchA: typeof fetch = async (_input, init) => {
      capturedA.push((init?.headers as Headers | undefined)?.get?.("authorization") ?? "");
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    };
    const fetchB: typeof fetch = async (_input, init) => {
      capturedB.push((init?.headers as Headers | undefined)?.get?.("authorization") ?? "");
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    };

    await Promise.all([
      handleJsonRpcMessage(
        { jsonrpc: "2.0", id: "a", method: "tools/call", params: { name: "code.search", arguments: { query: "foo" } } },
        { fetchImpl: fetchA, apiKey: "vault-a-key" }
      ),
      handleJsonRpcMessage(
        { jsonrpc: "2.0", id: "b", method: "tools/call", params: { name: "code.search", arguments: { query: "foo" } } },
        { fetchImpl: fetchB, apiKey: "vault-b-key" }
      )
    ]);

    expect(capturedA[0]).toBe("Bearer vault-a-key");
    expect(capturedB[0]).toBe("Bearer vault-b-key");
    expect(capturedA[0]).not.toBe(capturedB[0]);
  });

  it("context_query mode='code' also forwards vault API key to all code-graph calls", async () => {
    const headers: string[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      const auth = (init?.headers as Headers | undefined)?.get?.("authorization") ?? "";
      headers.push(auth);
      return new Response(
        JSON.stringify({ contextBlock: "", traceId: "", results: [], symbol: null, incoming: [], outgoing: [] }),
        { status: 200 }
      );
    };

    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "cq-vault",
        method: "tools/call",
        params: { name: "context_query", arguments: { query: "login", mode: "code" } }
      },
      { fetchImpl, apiKey: "vault-a-key" }
    );

    // All API calls (memory + code-graph) must carry the vault-A key
    for (const h of headers) {
      expect(h).toBe("Bearer vault-a-key");
    }
  });
});
