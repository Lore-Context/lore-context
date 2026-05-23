import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleJsonRpcMessage } from "../src/index.js";

const STATIC_INSTRUCTIONS =
  "Use context_query for read-first context assembly. Start with a narrow token_budget and include_sources when source attribution matters. Use trace_get for provenance, stale hits, or conflicts. Use mutating memory tools only for explicit durable facts with a clear reason.";

const INITIALIZE_REQUEST = {
  jsonrpc: "2.0" as const,
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "test-client", version: "0.0.0" }
  }
};

describe("US-H initialize instructions injection", () => {
  beforeEach(() => {
    delete process.env.LORE_MCP_INSTRUCTIONS_INJECT_ENABLED;
    delete process.env.LORE_MCP_INSTRUCTIONS_MAX_EPISODES;
    delete process.env.LORE_MCP_INSTRUCTIONS_MAX_TOKENS;
  });

  afterEach(() => {
    delete process.env.LORE_MCP_INSTRUCTIONS_INJECT_ENABLED;
    delete process.env.LORE_MCP_INSTRUCTIONS_MAX_EPISODES;
    delete process.env.LORE_MCP_INSTRUCTIONS_MAX_TOKENS;
  });

  it("H1: flag=0 (default) — instructions byte-identical to MCP_SERVER_INSTRUCTIONS constant", async () => {
    const response = await handleJsonRpcMessage(INITIALIZE_REQUEST);

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-11-25",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "lore-context-mcp-server" }
      }
    });

    const result = (response as { result: { instructions: string } }).result;
    expect(result.instructions).toBe(STATIC_INSTRUCTIONS);
  });

  it("H1: LORE_MCP_INSTRUCTIONS_INJECT_ENABLED=0 explicitly — still returns static instructions", async () => {
    process.env.LORE_MCP_INSTRUCTIONS_INJECT_ENABLED = "0";

    const response = await handleJsonRpcMessage(INITIALIZE_REQUEST);
    const result = (response as { result: { instructions: string } }).result;
    expect(result.instructions).toBe(STATIC_INSTRUCTIONS);
  });

  it("H3: flag=1 but no vault context at init — falls back to static instructions, no error surfaced", async () => {
    process.env.LORE_MCP_INSTRUCTIONS_INJECT_ENABLED = "1";

    // vault_id is not available in MCP initialize request — graceful fallback expected
    const response = await handleJsonRpcMessage(INITIALIZE_REQUEST);

    expect(response).not.toHaveProperty("error");
    const result = (response as { result: { instructions: string } }).result;
    // Should fall back to static because vault context unavailable at init transport
    expect(result.instructions).toBe(STATIC_INSTRUCTIONS);
  });

  it("H1: instructions field is present in every initialize response", async () => {
    const response = await handleJsonRpcMessage(INITIALIZE_REQUEST);
    const result = (response as { result: Record<string, unknown> }).result;
    expect(result).toHaveProperty("instructions");
    expect(typeof result.instructions).toBe("string");
    expect((result.instructions as string).length).toBeGreaterThan(0);
  });

  it("H1: initialize returns correct server metadata alongside instructions", async () => {
    const response = await handleJsonRpcMessage(INITIALIZE_REQUEST);

    expect(response).toMatchObject({
      result: {
        serverInfo: {
          name: "lore-context-mcp-server",
          title: "Lore Context",
          version: "0.0.0"
        }
      }
    });
  });

  it("H1: protocolVersion in response echoes client-provided version", async () => {
    const response = await handleJsonRpcMessage({
      ...INITIALIZE_REQUEST,
      params: { ...INITIALIZE_REQUEST.params, protocolVersion: "2025-03-26" }
    });

    const result = (response as { result: { protocolVersion: string } }).result;
    expect(result.protocolVersion).toBe("2025-03-26");
  });
});
