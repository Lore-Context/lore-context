import { describe, it, expect } from "vitest";
import { NoopProvider } from "../src/providers/noop.js";
import { MockProvider } from "../src/providers/mock.js";
import { CloudProvider } from "../src/providers/cloud.js";

describe("NoopProvider", () => {
  const p = new NoopProvider();

  it("is not available — no local model or API key required", () => {
    expect(p.available).toBe(false);
    expect(p.kind).toBe("noop");
  });

  it("generateTitle returns empty string", async () => {
    const r = await p.generateTitle("some text");
    expect(r.title).toBe("");
    expect(r.confidence).toBe(0);
  });

  it("generateSummary returns empty string", async () => {
    const r = await p.generateSummary("some text");
    expect(r.summary).toBe("");
    expect(r.confidence).toBe(0);
  });

  it("detectRedactionHints returns empty array", async () => {
    expect(await p.detectRedactionHints("api_key=abc secret=xyz")).toEqual([]);
  });

  it("detectDuplicates returns empty array", async () => {
    expect(await p.detectDuplicates("text", ["text"])).toEqual([]);
  });

  it("detectStaleConflict returns empty array", async () => {
    expect(await p.detectStaleConflict("text", ["ctx"])).toEqual([]);
  });

  it("rewriteQuery returns original query unchanged", async () => {
    const r = await p.rewriteQuery("my search query");
    expect(r.rewritten).toBe("my search query");
    expect(r.expansions).toEqual([]);
    expect(r.confidence).toBe(0);
  });

  it("rerank returns passthrough order", async () => {
    const r = await p.rerank("q", [
      { id: "a", text: "x" },
      { id: "b", text: "y" },
    ]);
    expect(r[0].id).toBe("a");
    expect(r[1].id).toBe("b");
    expect(r[0].reason).toBe("passthrough");
  });
});

describe("MockProvider", () => {
  const p = new MockProvider();

  it("is available without any API keys or local model", () => {
    expect(p.available).toBe(true);
    expect(p.kind).toBe("mock");
  });

  it("generateTitle produces deterministic [mock] prefix", async () => {
    const r1 = await p.generateTitle("deploy with pnpm build");
    const r2 = await p.generateTitle("deploy with pnpm build");
    expect(r1.title).toBe(r2.title);
    expect(r1.title).toMatch(/^\[mock\]/);
    expect(r1.confidence).toBeGreaterThan(0);
  });

  it("generateTitle handles empty string", async () => {
    const r = await p.generateTitle("");
    expect(r.title).toBe("[mock] untitled");
  });

  it("generateSummary includes [mock summary] prefix and respects maxChars", async () => {
    const long = "a".repeat(500);
    const r = await p.generateSummary(long, 100);
    expect(r.summary).toMatch(/^\[mock summary\]/);
    expect(r.confidence).toBeGreaterThan(0);
    // The raw content portion should be truncated to 100 chars
    const content = r.summary.replace("[mock summary] ", "");
    expect(content.length).toBeLessThanOrEqual(100);
  });

  it("detectRedactionHints flags password patterns", async () => {
    const hints = await p.detectRedactionHints("password: hunter2");
    expect(hints.length).toBeGreaterThan(0);
    expect(hints[0].severity).toBe("high");
    expect(hints[0].matchCount).toBeGreaterThan(0);
  });

  it("detectRedactionHints flags api_key patterns", async () => {
    const hints = await p.detectRedactionHints("api_key=sk-abc123");
    expect(hints.length).toBeGreaterThan(0);
  });

  it("detectRedactionHints returns empty for clean text", async () => {
    const hints = await p.detectRedactionHints(
      "remember to run pnpm build before deploying to production",
    );
    expect(hints).toEqual([]);
  });

  it("detectDuplicates flags high word overlap", async () => {
    const dupes = await p.detectDuplicates(
      "use pnpm build to compile the project",
      ["use pnpm build to compile the project today"],
    );
    expect(dupes.length).toBe(1);
    expect(dupes[0].similarity).toBeGreaterThan(0.5);
    expect(dupes[0].suggestedAction).toMatch(/^(merge|supersede)$/);
  });

  it("detectDuplicates returns empty for no meaningful overlap", async () => {
    const dupes = await p.detectDuplicates("apple banana cherry", [
      "completely unrelated content here",
    ]);
    expect(dupes).toEqual([]);
  });

  it("detectStaleConflict returns empty for empty context", async () => {
    const hints = await p.detectStaleConflict("some content", []);
    expect(hints).toEqual([]);
  });

  it("rewriteQuery adds context expansion terms", async () => {
    const r = await p.rewriteQuery("deploy steps");
    expect(r.rewritten).toContain("deploy steps");
    expect(r.expansions.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("rerank orders by keyword overlap with query", async () => {
    const candidates = [
      { id: "c1", text: "unrelated database migrations" },
      { id: "c2", text: "deploy production pnpm build steps" },
    ];
    const ranked = await p.rerank("deploy production", candidates);
    expect(ranked[0].id).toBe("c2");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});

describe("CloudProvider", () => {
  it("is not available without apiKey", () => {
    const p = new CloudProvider({ endpoint: "https://model.example.com" });
    expect(p.available).toBe(false);
    expect(p.kind).toBe("cloud");
  });

  it("is not available with empty endpoint", () => {
    const p = new CloudProvider({ endpoint: "", apiKey: "key" });
    expect(p.available).toBe(false);
  });

  it("returns graceful fallback when not configured — no keys needed", async () => {
    const p = new CloudProvider({ endpoint: "https://model.example.com" });
    expect(await p.generateTitle("text")).toEqual({ title: "", confidence: 0 });
    expect(await p.generateSummary("text")).toEqual({ summary: "", confidence: 0 });
    expect(await p.detectRedactionHints("text")).toEqual([]);
    expect(await p.detectDuplicates("text", ["other"])).toEqual([]);
    expect(await p.detectStaleConflict("text", ["ctx"])).toEqual([]);
  });

  it("rewriteQuery returns original query when not configured", async () => {
    const p = new CloudProvider({ endpoint: "https://model.example.com" });
    const r = await p.rewriteQuery("my query");
    expect(r.rewritten).toBe("my query");
  });

  it("is available when endpoint and apiKey are configured", () => {
    const p = new CloudProvider({
      endpoint: "https://model.example.com",
      apiKey: "sk-test",
    });
    expect(p.available).toBe(true);
  });

  it("calls the chat-completions endpoint and returns parsed JSON for generateTitle", async () => {
    const seen: Array<{ url: string; method?: string; auth: string | null; task: string | null; body: unknown }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      seen.push({
        url: String(input),
        method: init?.method,
        auth: headers.get("authorization"),
        task: headers.get("x-lore-task"),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return new Response(
        JSON.stringify({
          model: "gpt-4o-mini",
          choices: [{ message: { content: JSON.stringify({ title: "Deploy steps", confidence: 0.7 }) } }],
          usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const p = new CloudProvider({
      endpoint: "https://model.example.com/v1/chat/completions",
      apiKey: "sk-test",
      fetchImpl,
    });
    const result = await p.generateTitle("Deploy with pnpm build to production.");
    expect(result.title).toBe("Deploy steps");
    expect(result.confidence).toBeCloseTo(0.7, 5);
    expect(seen).toHaveLength(1);
    expect(seen[0].method).toBe("POST");
    expect(seen[0].auth).toBe("Bearer sk-test");
    expect(seen[0].task).toBe("title");

    const meta = p.consumeLastMeta();
    expect(meta?.task).toBe("title");
    expect(meta?.inputTokens).toBe(30);
    expect(meta?.outputTokens).toBe(10);
    expect(meta?.costUnits).toBeGreaterThan(0);
    expect(meta?.model).toBe("gpt-4o-mini");
  });

  it("redacts secrets before sending the HTTP body to the provider", async () => {
    let bodySent = "";
    const fetchImpl: typeof fetch = async (_input, init) => {
      bodySent = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ summary: "deploy summary", confidence: 0.6 }) } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const p = new CloudProvider({
      endpoint: "https://model.example.com",
      apiKey: "sk-test",
      fetchImpl,
    });
    await p.generateSummary("My api_key=sk-LIVE-leak-12345 and password=hunter2 should be removed.");
    expect(bodySent).not.toContain("sk-LIVE-leak-12345");
    expect(bodySent).not.toContain("hunter2");
    expect(bodySent).toContain("[REDACTED");
    const meta = p.consumeLastMeta();
    expect((meta?.inputRedactionMatchCount ?? 0)).toBeGreaterThan(0);
  });

  it("returns parsed rerank ordering with passthrough fill for missing ids", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { id: "m2", score: 0.9, reason: "topic match" },
                  { id: "m1", score: 0.4, reason: "weak overlap" },
                ]),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const p = new CloudProvider({
      endpoint: "https://model.example.com",
      apiKey: "sk-test",
      fetchImpl,
    });
    const ranked = await p.rerank("deploy", [
      { id: "m1", text: "deploy guide" },
      { id: "m2", text: "production deploy steps" },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["m2", "m1"]);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("throws on HTTP error so the gateway can record fallback", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { code: "rate_limited" } }), { status: 429 });
    const p = new CloudProvider({
      endpoint: "https://model.example.com",
      apiKey: "sk-test",
      fetchImpl,
    });
    await expect(p.generateTitle("text")).rejects.toThrow(/cloud_provider_http_429/);
  });

  it("throws on invalid JSON content so the gateway can record fallback", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "not json at all" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const p = new CloudProvider({
      endpoint: "https://model.example.com",
      apiKey: "sk-test",
      fetchImpl,
    });
    await expect(p.generateTitle("text")).rejects.toThrow(/cloud_provider_invalid_json/);
  });
});
