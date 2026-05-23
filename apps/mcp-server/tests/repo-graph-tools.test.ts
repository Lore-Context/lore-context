import { describe, expect, it } from "vitest";
import { getMcpToolDefinitions, handleJsonRpcMessage } from "../src/index.js";

const REPO_TOOLS = [
  { name: "repo.graph_query", args: { query: "composeContext", include_relations: true }, path: "/v1/repo/graph/query" },
  { name: "repo.symbol_context", args: { qname: "composeContext" }, path: "/v1/repo/symbol/context" },
  { name: "repo.impact", args: { qname: "composeContext", depth: 2 }, path: "/v1/repo/impact" },
  { name: "repo.detect_changes", args: { diff_text: "diff --git a/src/a.ts b/src/a.ts\n+++ b/src/a.ts\n@@ -1,1 +1,1 @@" }, path: "/v1/repo/detect-changes" }
] as const;

describe("repo.* MCP tools", () => {
  for (const tool of REPO_TOOLS) {
    it(`${tool.name} forwards to ${tool.path}`, async () => {
      const calls: Array<{ url: string; body: unknown; auth: string }> = [];
      const fetchImpl: typeof fetch = async (input, init) => {
        calls.push({
          url: String(input),
          body: init?.body ? JSON.parse(init.body.toString()) : {},
          auth: (init?.headers as Headers | undefined)?.get?.("authorization") ?? ""
        });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      };

      const response = await handleJsonRpcMessage(
        {
          jsonrpc: "2.0",
          id: tool.name,
          method: "tools/call",
          params: { name: tool.name, arguments: tool.args }
        },
        { fetchImpl, apiKey: "vault-a-key" }
      );

      expect(response).toMatchObject({ result: { structuredContent: { ok: true } } });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toContain(tool.path);
      expect(calls[0].body).toMatchObject(tool.args);
      expect(calls[0].auth).toBe("Bearer vault-a-key");
    });
  }

  it("publishes selector constraints for one-of repo tool inputs", () => {
    const definitions = new Map(getMcpToolDefinitions().map((tool) => [tool.name, tool]));

    expect(definitions.get("repo.symbol_context")?.inputSchema.anyOf).toEqual([
      { required: ["symbol_id"] },
      { required: ["qname"] },
      { required: ["name"] }
    ]);
    expect(definitions.get("repo.impact")?.inputSchema.anyOf).toEqual([
      { required: ["symbol_id"] },
      { required: ["qname"] },
      { required: ["name"] },
      { required: ["file_path"] }
    ]);
    expect(definitions.get("repo.detect_changes")?.inputSchema.anyOf).toEqual([
      { required: ["diff_text"] },
      { required: ["diff"] }
    ]);
  });
});
