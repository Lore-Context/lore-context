import { describe, expect, it } from "vitest";
import { noopSearchProvider, StaticSearchProvider, ZapfetchSearchProvider } from "../src/index.js";

describe("noopSearchProvider", () => {
  it("returns no results without failing", async () => {
    await expect(noopSearchProvider.search({ query: "agentmemory" })).resolves.toEqual([]);
  });
});

describe("StaticSearchProvider", () => {
  it("filters static evidence by query", async () => {
    const provider = new StaticSearchProvider({
      results: [
        { id: "1", title: "Qwen MCP", snippet: "Configure mcpServers", source: "docs" },
        { id: "2", title: "Other", snippet: "No match", source: "docs" }
      ]
    });

    await expect(provider.search({ query: "qwen" })).resolves.toEqual([
      { id: "1", title: "Qwen MCP", snippet: "Configure mcpServers", source: "docs" }
    ]);
  });
});

describe("ZapfetchSearchProvider", () => {
  it("maps provider search results to web evidence", async () => {
    const provider = new ZapfetchSearchProvider({
      apiUrl: "https://search.example.test",
      fetchImpl: async (url, init) => {
        expect(url).toBe("https://search.example.test/search");
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            results: [{ id: "r1", title: "Agent Memory", snippet: "Fresh evidence", url: "https://example.test" }]
          })
        );
      }
    });

    await expect(provider.search({ query: "memory" })).resolves.toEqual([
      {
        id: "r1",
        title: "Agent Memory",
        snippet: "Fresh evidence",
        url: "https://example.test",
        source: "zapfetch",
        fetchedAt: undefined
      }
    ]);
  });
});
