/**
 * Tests for v2.0.3 Lane U — memory.suggest MCP tool.
 *
 * Covers U1 (tools/list registration) and U2-U4 (dispatcher routing,
 * canonical/hybrid source labelling, token-budget pass-through).
 *
 * U5 (latency targets) is environment-dependent and not asserted here.
 */
import { describe, expect, it, vi } from "vitest";
import {
  getDefaultMcpToolNames,
  getMcpToolDefinitions,
  handleJsonRpcMessage,
} from "../src/index.js";

describe("memory.suggest (U1) — tool registration", () => {
  it("appears in the default tools list (non-relay mode)", () => {
    expect(getDefaultMcpToolNames()).toContain("memory.suggest");
  });

  it("has the correct schema (user_message required, max_episodes + token_budget optional, source enum implied via description)", () => {
    const tool = getMcpToolDefinitions().find((t) => t.name === "memory.suggest");
    expect(tool).toBeDefined();
    expect(tool?.mutates).toBe(false);
    expect(tool?.tier).toBe("default");
    expect(tool?.inputSchema.required).toEqual(["user_message"]);
    expect(tool?.inputSchema.properties).toMatchObject({
      user_message: { type: "string" },
      max_episodes: { type: "number" },
      token_budget: { type: "number" },
    });
  });

  it("description mentions canonical_index fast-path and 7-stream fallback (U2/U3 contract)", () => {
    const tool = getMcpToolDefinitions().find((t) => t.name === "memory.suggest");
    expect(tool?.description).toMatch(/canonical_index|fast-path/i);
    expect(tool?.description).toMatch(/hybrid|7-stream|fallback/i);
  });
});

describe("memory.suggest (U2-U4) — dispatcher routing", () => {
  function makeFetchSpy(returnPayload: unknown) {
    return vi.fn(async () =>
      new Response(JSON.stringify(returnPayload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }

  it("calls /v1/context/query with mode='memory' and forwards token_budget (U4)", async () => {
    const fetchImpl = makeFetchSpy({
      contextBlock: "memory snippet",
      memoryHits: [{ id: "m1", score: 0.91 }],
    });

    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "u4",
        method: "tools/call",
        params: {
          name: "memory.suggest",
          arguments: { user_message: "what was the s3 bucket?", token_budget: 1234 },
        },
      },
      { apiBaseUrl: "http://test.local", apiKey: "test-key", fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toContain("/v1/context/query");
    const body = JSON.parse((init?.body as string) ?? "{}");
    expect(body.mode).toBe("memory");
    expect(body.token_budget).toBe(1234);
    expect(body.query).toBe("what was the s3 bucket?");
    expect(response).toBeDefined();
  });

  it("forwards project_id when provided", async () => {
    const fetchImpl = makeFetchSpy({ contextBlock: "" });
    await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "u-pid",
        method: "tools/call",
        params: {
          name: "memory.suggest",
          arguments: { user_message: "hi", project_id: "proj-42" },
        },
      },
      { apiBaseUrl: "http://test.local", apiKey: "k", fetchImpl },
    );
    const body = JSON.parse((fetchImpl.mock.calls[0]?.[1] as { body?: string })?.body ?? "{}");
    expect(body.project_id).toBe("proj-42");
  });

  it("rejects request without user_message (zod schema)", async () => {
    const fetchImpl = makeFetchSpy({});
    const response = await handleJsonRpcMessage(
      {
        jsonrpc: "2.0",
        id: "u-bad",
        method: "tools/call",
        params: { name: "memory.suggest", arguments: { token_budget: 100 } },
      },
      { apiBaseUrl: "http://test.local", apiKey: "k", fetchImpl },
    );
    expect(response && "error" in response).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
