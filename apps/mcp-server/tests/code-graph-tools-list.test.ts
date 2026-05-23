/**
 * C1 — All 7 code-graph tools appear in tools/list alongside existing memory tools.
 */

import { describe, expect, it } from "vitest";
import { getMcpToolDefinitions, handleJsonRpcMessage } from "../src/index.js";

const CODE_GRAPH_TOOLS = [
  "code.search",
  "code.context",
  "code.callgraph",
  "code.references",
  "code.impact",
  "code.list_repos",
  "code.search_text"
] as const;

const REPO_GRAPH_TOOLS = [
  "repo.graph_query",
  "repo.symbol_context",
  "repo.impact",
  "repo.detect_changes"
] as const;

describe("tools/list contains code.*", () => {
  it("getMcpToolDefinitions includes all 7 code-graph tools", () => {
    const names = getMcpToolDefinitions({ includeAdvanced: true }).map((t) => t.name);
    for (const tool of CODE_GRAPH_TOOLS) {
      expect(names).toContain(tool);
    }
    for (const tool of REPO_GRAPH_TOOLS) {
      expect(names).toContain(tool);
    }
  });

  it("getMcpToolDefinitions still includes existing memory tools alongside code tools", () => {
    const names = getMcpToolDefinitions({ includeAdvanced: true }).map((t) => t.name);
    // Existing memory tools must not have been removed
    expect(names).toContain("context_query");
    expect(names).toContain("memory_search");
    expect(names).toContain("memory_write");
    expect(names).toContain("memory.recall");
    // And all 7 code tools must be present
    for (const tool of CODE_GRAPH_TOOLS) {
      expect(names).toContain(tool);
    }
    for (const tool of REPO_GRAPH_TOOLS) {
      expect(names).toContain(tool);
    }
  });

  it("tools/list JSON-RPC response contains all 7 code-graph tool names", async () => {
    const response = await handleJsonRpcMessage({
      jsonrpc: "2.0",
      id: "tools-list-test",
      method: "tools/list"
    });

    expect(response).toMatchObject({ result: { tools: expect.any(Array) } });
    const result = response as { result: { tools: Array<{ name: string }> } };
    const names = result.result.tools.map((t) => t.name);

    for (const tool of CODE_GRAPH_TOOLS) {
      expect(names).toContain(tool);
    }
    for (const tool of REPO_GRAPH_TOOLS) {
      expect(names).toContain(tool);
    }
  });

  it("code.search schema requires 'query' field", () => {
    const def = getMcpToolDefinitions().find((t) => t.name === "code.search");
    expect(def).toBeDefined();
    expect(def?.inputSchema.required).toContain("query");
    expect(def?.inputSchema.properties).toHaveProperty("repo");
    expect(def?.inputSchema.properties).toHaveProperty("top_k");
  });

  it("code.callgraph schema requires 'qname' and 'depth'", () => {
    const def = getMcpToolDefinitions().find((t) => t.name === "code.callgraph");
    expect(def?.inputSchema.required).toContain("qname");
    expect(def?.inputSchema.required).toContain("depth");
  });

  it("code.list_repos schema has no required fields", () => {
    const def = getMcpToolDefinitions().find((t) => t.name === "code.list_repos");
    expect(def).toBeDefined();
    // empty required array or undefined — no required fields
    expect(!def?.inputSchema.required || def.inputSchema.required.length === 0).toBe(true);
  });

  it("code.search_text schema requires 'pattern'", () => {
    const def = getMcpToolDefinitions().find((t) => t.name === "code.search_text");
    expect(def?.inputSchema.required).toContain("pattern");
  });

  it("all 7 code tools are marked as non-mutating", () => {
    const defs = getMcpToolDefinitions({ includeAdvanced: true }).filter((t) =>
      (CODE_GRAPH_TOOLS as readonly string[]).includes(t.name)
    );
    expect(defs).toHaveLength(CODE_GRAPH_TOOLS.length);
    for (const def of defs) {
      expect(def.mutates).toBe(false);
    }
  });

  it("all repo graph tools are default non-mutating tools", () => {
    const defs = getMcpToolDefinitions({ includeAdvanced: true }).filter((t) =>
      (REPO_GRAPH_TOOLS as readonly string[]).includes(t.name)
    );
    expect(defs).toHaveLength(REPO_GRAPH_TOOLS.length);
    for (const def of defs) {
      expect(def.tier).toBe("default");
      expect(def.mutates).toBe(false);
    }
  });
});
