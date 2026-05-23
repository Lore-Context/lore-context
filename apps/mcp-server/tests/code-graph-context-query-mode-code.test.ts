/**
 * C6 — context_query mode="code" returns interleaved memory + code context.
 *
 * We mock fetchImpl to intercept all outbound API calls and assert:
 *   1. A call goes to /v1/context/query (memory path — without mode="code")
 *   2. A call goes to /v1/code-graph/search (code.search)
 *   3. For each search hit with a qname, a call goes to /v1/code-graph/context
 *   4. The returned envelope contains both a memory payload and a codeContext block
 */

import { describe, expect, it } from "vitest";
import { handleJsonRpcMessage } from "../src/index.js";

const MEMORY_RESPONSE = {
  contextBlock: "Memory result: auth uses JWT tokens.",
  traceId: "trace-abc"
};

const SEARCH_RESPONSE = {
  results: [
    { qname: "AuthService.login", kind: "method", file_path: "src/auth.ts", start_line: 20, score: 0.95 },
    { qname: "AuthService.logout", kind: "method", file_path: "src/auth.ts", start_line: 40, score: 0.82 }
  ]
};

const CONTEXT_RESPONSE_LOGIN = {
  symbol: { qname: "AuthService.login", kind: "method" },
  incoming: [{ src_qname: "App.start", relation_kind: "calls" }],
  outgoing: [{ dst_qname: "JwtHelper.sign", relation_kind: "calls" }]
};

const CONTEXT_RESPONSE_LOGOUT = {
  symbol: { qname: "AuthService.logout", kind: "method" },
  incoming: [],
  outgoing: [{ dst_qname: "JwtHelper.verify", relation_kind: "calls" }]
};

function makeInterceptFetch(): { fetch: typeof fetch; calls: Array<{ url: string; body: unknown }> } {
  const calls: Array<{ url: string; body: unknown }> = [];

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    let body: unknown = {};
    try {
      if (init?.body) body = JSON.parse(init.body.toString());
    } catch { /* ignore */ }
    calls.push({ url, body });

    if (url.includes("/v1/context/query")) {
      return new Response(JSON.stringify(MEMORY_RESPONSE), { status: 200 });
    }
    if (url.includes("/v1/code-graph/search")) {
      return new Response(JSON.stringify(SEARCH_RESPONSE), { status: 200 });
    }
    if (url.includes("/v1/code-graph/context")) {
      const b = body as { qname?: string };
      const resp = b.qname === "AuthService.login" ? CONTEXT_RESPONSE_LOGIN : CONTEXT_RESPONSE_LOGOUT;
      return new Response(JSON.stringify(resp), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  return { fetch: fetchImpl, calls };
}

describe("context_query mode=code interleaves", () => {
  it("calls memory API and code.search in parallel, then fetches code.context for each hit", async () => {
    const { fetch: fetchImpl, calls } = makeInterceptFetch();

    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "cq-code",
        method: "tools/call",
        params: {
          name: "context_query",
          arguments: { query: "auth login flow", mode: "code" }
        }
      },
      { fetchImpl }
    );

    expect(response).not.toMatchObject({ error: expect.anything() });

    const memCalls = calls.filter((c) => c.url.includes("/v1/context/query"));
    const searchCalls = calls.filter((c) => c.url.includes("/v1/code-graph/search"));
    const ctxCalls = calls.filter((c) => c.url.includes("/v1/code-graph/context"));

    // Both memory and code.search must be called
    expect(memCalls.length).toBeGreaterThanOrEqual(1);
    expect(searchCalls.length).toBeGreaterThanOrEqual(1);
    // code.context called for each search hit (2 hits)
    expect(ctxCalls.length).toBe(2);
  });

  it("memory context_query call does NOT forward mode='code' to the API", async () => {
    const { fetch: fetchImpl, calls } = makeInterceptFetch();

    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "cq-no-mode",
        method: "tools/call",
        params: {
          name: "context_query",
          arguments: { query: "auth login", mode: "code" }
        }
      },
      { fetchImpl }
    );

    const memCall = calls.find((c) => c.url.includes("/v1/context/query"));
    expect(memCall).toBeDefined();
    // mode must not be forwarded as "code" to the memory API
    const b = memCall?.body as Record<string, unknown>;
    expect(b?.mode).not.toBe("code");
  });

  it("returned envelope has both memory fields and codeContext block", async () => {
    const { fetch: fetchImpl } = makeInterceptFetch();

    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "cq-envelope",
        method: "tools/call",
        params: {
          name: "context_query",
          arguments: { query: "auth login", mode: "code" }
        }
      },
      { fetchImpl }
    );

    type Res = { result: { structuredContent: Record<string, unknown> } };
    const r = response as Res;
    const content = r.result.structuredContent;

    // Memory fields
    expect(content).toHaveProperty("contextBlock");
    expect(content).toHaveProperty("traceId");

    // Code context block
    expect(content).toHaveProperty("codeContext");
    const cc = content.codeContext as { searchResults: unknown[]; symbolContexts: unknown[] };
    expect(cc.searchResults).toHaveLength(2);
    expect(cc.symbolContexts).toHaveLength(2);
  });

  it("mode='auto' still routes to normal memory API without code search", async () => {
    const { fetch: fetchImpl, calls } = makeInterceptFetch();

    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "cq-auto",
        method: "tools/call",
        params: {
          name: "context_query",
          arguments: { query: "what is JWT?", mode: "auto" }
        }
      },
      { fetchImpl }
    );

    const searchCalls = calls.filter((c) => c.url.includes("/v1/code-graph/search"));
    // Normal mode must NOT trigger code.search
    expect(searchCalls.length).toBe(0);
  });
});
