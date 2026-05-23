import { describe, it, expect } from "vitest";
import { getLlmProviderChainHealth } from "../src/gateway.js";

describe("getLlmProviderChainHealth — V1.8-G4", () => {
  it("reports configured=false for every provider when env is empty", async () => {
    const health = await getLlmProviderChainHealth({});
    expect(health.healthy).toBe(false);
    expect(health.openrouter).toEqual({ configured: false, healthy: false });
    expect(health.anthropic).toEqual({ configured: false, healthy: false });
    expect(health.openai).toEqual({ configured: false, healthy: false });
    expect(health["local-qwen"]).toEqual({ configured: false, healthy: false });
  });

  it("flags openrouter healthy when probe succeeds", async () => {
    const health = await getLlmProviderChainHealth(
      { LORE_OPENROUTER_API_KEY: "sk-test-redacted" },
      { openrouterProbe: async () => true, timeoutMs: 100 },
    );
    expect(health.openrouter.configured).toBe(true);
    expect(health.openrouter.healthy).toBe(true);
    expect(typeof health.openrouter.latencyMs).toBe("number");
    expect(health.healthy).toBe(true);
  });

  it("flags openrouter unhealthy when probe rejects", async () => {
    const health = await getLlmProviderChainHealth(
      { LORE_OPENROUTER_API_KEY: "sk-test" },
      {
        openrouterProbe: async () => {
          throw new Error("network down");
        },
        timeoutMs: 100,
      },
    );
    expect(health.openrouter.configured).toBe(true);
    expect(health.openrouter.healthy).toBe(false);
    expect(typeof health.openrouter.latencyMs).toBe("number");
  });

  it("flags openrouter unhealthy when probe exceeds deadline", async () => {
    const health = await getLlmProviderChainHealth(
      { LORE_OPENROUTER_API_KEY: "sk-test" },
      {
        openrouterProbe: () => new Promise((resolve) => setTimeout(() => resolve(true), 2_000)),
        timeoutMs: 50,
      },
    );
    expect(health.openrouter.healthy).toBe(false);
    expect(health.openrouter.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("treats configured anthropic/openai/local-qwen as healthy when their env is set", async () => {
    const health = await getLlmProviderChainHealth({
      ANTHROPIC_API_KEY: "anthropic-key",
      OPENAI_API_KEY: "openai-key",
      LORE_LOCAL_LLM_URL: "http://localhost:8000",
    });
    expect(health.anthropic).toEqual({ configured: true, healthy: true });
    expect(health.openai).toEqual({ configured: true, healthy: true });
    expect(health["local-qwen"]).toEqual({ configured: true, healthy: true });
    expect(health.healthy).toBe(true);
  });

  it("aggregate healthy is true when any provider is healthy", async () => {
    const onlyOpenAi = await getLlmProviderChainHealth({ OPENAI_API_KEY: "k" });
    expect(onlyOpenAi.healthy).toBe(true);
    expect(onlyOpenAi.openai.healthy).toBe(true);
    expect(onlyOpenAi.anthropic.healthy).toBe(false);
  });

  it("never returns API key values in the snapshot", async () => {
    const sensitive = "sk-or-v1-secret-token";
    const health = await getLlmProviderChainHealth(
      { LORE_OPENROUTER_API_KEY: sensitive },
      { openrouterProbe: async () => true, timeoutMs: 100 },
    );
    const serialized = JSON.stringify(health);
    expect(serialized).not.toContain(sensitive);
    expect(serialized).not.toMatch(/sk-/);
  });

  it("trims whitespace-only env values to configured=false", async () => {
    const health = await getLlmProviderChainHealth({
      LORE_OPENROUTER_API_KEY: "   ",
      ANTHROPIC_API_KEY: "",
    });
    expect(health.openrouter.configured).toBe(false);
    expect(health.anthropic.configured).toBe(false);
  });
});
