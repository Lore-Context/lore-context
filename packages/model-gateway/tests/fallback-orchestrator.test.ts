import { describe, it, expect, vi } from "vitest";
import { FallbackOrchestrator, type FallbackEvent } from "../src/fallback-orchestrator.js";
import { LlmProviderException, type LlmProvider, type LlmRequest, type LlmResponse } from "../src/providers/types.js";

// ---- test helpers ----

function makeRequest(id = "req-1"): LlmRequest {
  return { prompt: "hello", maxTokens: 128, requestId: id };
}

function makeResponse(providerName: string): LlmResponse {
  return {
    text: `response from ${providerName}`,
    inputTokens: 10,
    outputTokens: 5,
    latencyMs: 50,
    providerName,
    modelId: `${providerName}-model`,
  };
}

function successProvider(name: string): LlmProvider {
  return {
    name,
    invoke: vi.fn().mockResolvedValue(makeResponse(name)),
  };
}

function failingProvider(
  name: string,
  errorKind: LlmProviderException["providerError"]["kind"],
): LlmProvider {
  let error: LlmProviderException;
  switch (errorKind) {
    case "rate_limit":
      error = new LlmProviderException({ kind: "rate_limit", status: 429 });
      break;
    case "server_error":
      error = new LlmProviderException({ kind: "server_error", status: 500 });
      break;
    case "timeout":
      error = new LlmProviderException({ kind: "timeout", ms: 10000 });
      break;
    case "auth":
      error = new LlmProviderException({ kind: "auth", status: 401 });
      break;
    case "schema_invalid":
      error = new LlmProviderException({ kind: "schema_invalid", reason: "missing field" });
      break;
    case "other":
      error = new LlmProviderException({ kind: "other", message: "unknown issue" });
      break;
    default:
      error = new LlmProviderException({ kind: "other", message: "unknown" });
  }
  return {
    name,
    invoke: vi.fn().mockRejectedValue(error),
  };
}

function makeOrchestrator(
  providers: LlmProvider[],
  maxFallbacks = 2,
  onFallback?: (e: FallbackEvent) => void,
): FallbackOrchestrator {
  return new FallbackOrchestrator({ providers, maxFallbacks, onFallback });
}

// ---- tests ----

describe("FallbackOrchestrator", () => {
  it("case 1: first provider succeeds — no fallback, fallbackCount=0", async () => {
    const p0 = successProvider("anthropic");
    const p1 = successProvider("openai");
    const orch = makeOrchestrator([p0, p1]);
    const result = await orch.invoke(makeRequest());
    expect(result.providerName).toBe("anthropic");
    expect(orch.stats().fallbackCount).toBe(0);
    expect(orch.stats().perProviderInvocations["anthropic"]).toBe(1);
    expect(orch.stats().perProviderInvocations["openai"]).toBeUndefined();
  });

  it("case 2: first provider 429, second succeeds — fallbackCount=1", async () => {
    const p0 = failingProvider("anthropic", "rate_limit");
    const p1 = successProvider("openai");
    const orch = makeOrchestrator([p0, p1]);
    const result = await orch.invoke(makeRequest());
    expect(result.providerName).toBe("openai");
    expect(orch.stats().fallbackCount).toBe(1);
    expect(orch.stats().perProviderInvocations["anthropic"]).toBe(1);
    expect(orch.stats().perProviderInvocations["openai"]).toBe(1);
  });

  it("case 3: first and second 429, third succeeds — fallbackCount=2", async () => {
    const p0 = failingProvider("anthropic", "rate_limit");
    const p1 = failingProvider("openai", "rate_limit");
    const p2 = successProvider("local-qwen");
    const orch = makeOrchestrator([p0, p1, p2]);
    const result = await orch.invoke(makeRequest());
    expect(result.providerName).toBe("local-qwen");
    expect(orch.stats().fallbackCount).toBe(2);
  });

  it("case 4: all three 429 — throws last error", async () => {
    const p0 = failingProvider("anthropic", "rate_limit");
    const p1 = failingProvider("openai", "rate_limit");
    const p2 = failingProvider("local-qwen", "rate_limit");
    const orch = makeOrchestrator([p0, p1, p2]);
    await expect(orch.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "rate_limit",
    );
  });

  it("case 5: first provider auth error — throws immediately, does NOT cut chain", async () => {
    const p0 = failingProvider("anthropic", "auth");
    const p1 = successProvider("openai");
    const orch = makeOrchestrator([p0, p1]);
    await expect(orch.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "auth",
    );
    // openai should NOT have been invoked
    expect(p1.invoke).not.toHaveBeenCalled();
    expect(orch.stats().fallbackCount).toBe(0);
  });

  it("case 6: first provider schema_invalid — cuts chain to second", async () => {
    const p0 = failingProvider("anthropic", "schema_invalid");
    const p1 = successProvider("openai");
    const orch = makeOrchestrator([p0, p1]);
    const result = await orch.invoke(makeRequest());
    expect(result.providerName).toBe("openai");
    expect(orch.stats().fallbackCount).toBe(1);
  });

  it("case 7: first provider timeout — cuts chain to second", async () => {
    const p0 = failingProvider("anthropic", "timeout");
    const p1 = successProvider("openai");
    const orch = makeOrchestrator([p0, p1]);
    const result = await orch.invoke(makeRequest());
    expect(result.providerName).toBe("openai");
    expect(orch.stats().fallbackCount).toBe(1);
  });

  it("case 8: first provider 'other' error — throws immediately, does NOT cut chain", async () => {
    const p0 = failingProvider("anthropic", "other");
    const p1 = successProvider("openai");
    const orch = makeOrchestrator([p0, p1]);
    await expect(orch.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof LlmProviderException && e.providerError.kind === "other",
    );
    expect(p1.invoke).not.toHaveBeenCalled();
    expect(orch.stats().fallbackCount).toBe(0);
  });

  it("case 9: maxFallbacks=2, three providers all 429 — stops after 2 cuts (throws at p2)", async () => {
    const p0 = failingProvider("anthropic", "rate_limit");
    const p1 = failingProvider("openai", "rate_limit");
    const p2 = failingProvider("local-qwen", "rate_limit");
    // With maxFallbacks=2, we allow up to 2 cuts (3 providers tried), all fail → throws
    const orch = makeOrchestrator([p0, p1, p2], 2);
    await expect(orch.invoke(makeRequest())).rejects.toSatisfy(
      (e: unknown) => e instanceof LlmProviderException,
    );
    // All three providers were attempted (0→1 is cut 1, 1→2 is cut 2)
    expect(p0.invoke).toHaveBeenCalledOnce();
    expect(p1.invoke).toHaveBeenCalledOnce();
    expect(p2.invoke).toHaveBeenCalledOnce();
  });

  it("case 10: onFallback hook called on each cut with correct event", async () => {
    const events: FallbackEvent[] = [];
    const p0 = failingProvider("anthropic", "rate_limit");
    const p1 = failingProvider("openai", "server_error");
    const p2 = successProvider("local-qwen");
    const orch = makeOrchestrator([p0, p1, p2], 2, (e) => events.push(e));
    await orch.invoke(makeRequest("my-req-id"));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      requestId: "my-req-id",
      fromProvider: "anthropic",
      toProvider: "openai",
      reason: "rate_limit",
      attempt: 1,
    });
    expect(events[1]).toMatchObject({
      requestId: "my-req-id",
      fromProvider: "openai",
      toProvider: "local-qwen",
      reason: "server_error",
      attempt: 2,
    });
  });

  it("case 11: perProviderInvocations counts correctly across providers", async () => {
    const p0 = failingProvider("anthropic", "rate_limit");
    const p1 = successProvider("openai");
    const orch = makeOrchestrator([p0, p1]);
    await orch.invoke(makeRequest("r1"));
    await orch.invoke(makeRequest("r2"));
    // p0 fails both times, p1 succeeds both times
    const stats = orch.stats();
    expect(stats.perProviderInvocations["anthropic"]).toBe(2);
    expect(stats.perProviderInvocations["openai"]).toBe(2);
    expect(stats.fallbackCount).toBe(2);
  });

  it("case 12: concurrent invocations are race-free (10 parallel)", async () => {
    // p0 fails with rate_limit, p1 succeeds. Run 10 concurrent invocations.
    const p0 = failingProvider("anthropic", "rate_limit");
    const p1 = successProvider("openai");
    const orch = makeOrchestrator([p0, p1]);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => orch.invoke(makeRequest(`r${i}`))),
    );

    expect(results).toHaveLength(10);
    for (const r of results) {
      expect(r.providerName).toBe("openai");
    }
    const stats = orch.stats();
    expect(stats.fallbackCount).toBe(10);
    expect(stats.perProviderInvocations["anthropic"]).toBe(10);
    expect(stats.perProviderInvocations["openai"]).toBe(10);
  });
});
