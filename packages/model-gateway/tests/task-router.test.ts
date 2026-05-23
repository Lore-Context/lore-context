import { afterEach, describe, expect, it, vi } from "vitest";

import { UnknownTaskIdError, routeForTask } from "../src/task-router.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("routeForTask", () => {
  it("routes wiki rewriting to Gemini Flash Lite with two fallbacks", () => {
    const route = routeForTask("wiki_rewriter");

    expect(route.model).toBe("google/gemini-3.1-flash-lite");
    expect(route.fallbacks).toHaveLength(2);
  });

  it("routes butler consolidation to Grok with direct Anthropic fallback", () => {
    expect(routeForTask("butler_consolidation")).toEqual({
      provider: "openrouter",
      model: "x-ai/grok-4.3",
      fallbacks: [
        { provider: "openrouter", model: "anthropic/claude-sonnet-4.6" },
        { provider: "anthropic", model: "claude-sonnet-4.6" },
      ],
    });
  });

  it("routes conflict detection to deterministic-only as final fallback", () => {
    expect(routeForTask("conflict_detector").fallbacks[1].provider).toBe("deterministic-only");
  });

  it("routes eval judge to direct Opus model name", () => {
    expect(routeForTask("eval_judge").model).toBe("anthropic/claude-opus-4.7");
  });

  it("throws UnknownTaskIdError for unsupported task IDs", () => {
    expect(() => routeForTask("unknown_task")).toThrow(UnknownTaskIdError);
  });

  it("merges env override entries over the default table", () => {
    vi.stubEnv(
      "LORE_LLM_TASK_ROUTER_OVERRIDE",
      JSON.stringify({
        wiki_rewriter: {
          provider: "openrouter",
          model: "operator/model",
        },
      }),
    );

    const route = routeForTask("wiki_rewriter");

    expect(route).toEqual({
      provider: "openrouter",
      model: "operator/model",
      fallbacks: [
        { provider: "anthropic", model: "claude-haiku-latest" },
        { provider: "local-qwen", model: "" },
      ],
    });
  });

  it("accepts production-sidecar config env as an override source", () => {
    vi.stubEnv(
      "LORE_LLM_TASK_ROUTER_CONFIG",
      JSON.stringify({
        graph_extractor: {
          provider: "openrouter",
          model: "operator/graph-model",
        },
      }),
    );

    expect(routeForTask("graph_extractor").model).toBe("operator/graph-model");
  });
});
