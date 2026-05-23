import { describe, expect, it } from "vitest";
import { composeRecallContext, renderContextPack } from "../src/index.js";
import type { LoreProfile } from "../src/types.js";
import { FROZEN_NOW, activeMemory, buildHit, profileItem } from "./fixtures.js";

function profile(): LoreProfile {
  return {
    vaultId: "v1",
    static: [profileItem({ type: "identity", value: "name: Avery" }), profileItem({ type: "constraint", value: "do not push to main" })],
    dynamic: [profileItem({ type: "active_context", value: "v0.8 sprint" })],
    projects: [],
    updatedAt: FROZEN_NOW.toISOString()
  };
}

describe("renderContextPack - claude_code", () => {
  it("emits a markdown block with profile and memory sections", () => {
    const recall = composeRecallContext({
      query: "what now",
      vaultId: "v1",
      profile: profile(),
      memoryHits: [buildHit(activeMemory("decision: use Postgres in production"))],
      now: FROZEN_NOW
    });
    const pack = renderContextPack(recall, { agent: "claude_code", traceId: "trace-1" });
    expect(pack.text).toContain("## Lore Context");
    expect(pack.text).toContain("### Profile (static)");
    expect(pack.text).toContain("### Profile (dynamic)");
    expect(pack.text).toContain("### Relevant memory");
    expect(pack.text).toContain("Postgres");
    expect(pack.traceId).toBe("trace-1");
  });
});

describe("renderContextPack - codex", () => {
  it("wraps content in <lore-context> with item tags", () => {
    const recall = composeRecallContext({
      query: "anything",
      vaultId: "v1",
      profile: profile(),
      memoryHits: [buildHit(activeMemory("decision: use Postgres in production"))],
      now: FROZEN_NOW
    });
    const pack = renderContextPack(recall, { agent: "codex", traceId: "trace-2" });
    expect(pack.text).toMatch(/^<lore-context\b/);
    expect(pack.text).toContain("</lore-context>");
    expect(pack.text).toContain("<item ");
    expect(pack.text).toContain("Postgres");
  });

  it("escapes XML-significant characters in content", () => {
    const recall = composeRecallContext({
      query: "anything",
      vaultId: "v1",
      memoryHits: [buildHit(activeMemory("decision: use <tags> & \"quotes\""))],
      now: FROZEN_NOW
    });
    const pack = renderContextPack(recall, { agent: "codex", traceId: "trace-3" });
    expect(pack.text).toContain("&lt;tags&gt;");
    expect(pack.text).toContain("&amp;");
    expect(pack.text).toContain("&quot;");
  });
});

describe("renderContextPack - generic", () => {
  it("emits a list with optional warnings", () => {
    const recall = composeRecallContext({
      query: "anything",
      vaultId: "v1",
      memoryHits: [buildHit(activeMemory("decision: use Postgres"))],
      now: FROZEN_NOW
    });
    const pack = renderContextPack(recall, { agent: "generic", traceId: "trace-4" });
    expect(pack.text).toContain("Lore context:");
    expect(pack.text).toContain("Postgres");
  });
});

describe("renderContextPack - reports truncated and tokens", () => {
  it("propagates truncation flag from recall response", () => {
    const big = activeMemory("a".repeat(2000));
    const recall = composeRecallContext({
      query: "x",
      vaultId: "v1",
      tokenBudget: 50,
      memoryHits: [buildHit(big, 1)],
      now: FROZEN_NOW
    });
    const pack = renderContextPack(recall, { agent: "codex", traceId: "trace-5" });
    expect(pack.truncated).toBe(true);
    expect(pack.text).toContain('truncated="true"');
  });
});
