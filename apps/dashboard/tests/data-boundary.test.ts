import { describe, expect, it, vi } from "vitest";
import { resolveLoreApiBase } from "../app/api/lore/[...path]/route";
import { createBrowserDashboardApiClient, fetchCustomerOverview, fetchDashboardData, fetchEvidenceData, fetchInboxData, fetchMemoriesData, fetchSourcesData } from "../lib/api-client";
import type { DashboardRouteDataMap, RouteResult } from "../lib/contracts";
import { getDashboardDemoBoundary, routeDemoData } from "../lib/demo-fixtures";
import { errorMessage } from "../lib/route-error";

describe("dashboard data contracts", () => {
  it("keeps each route result in the standardized state envelope", () => {
    const routeResult: RouteResult<DashboardRouteDataMap["inbox"]> = {
      state: "success",
      data: { items: [] }
    };

    expect(routeResult.state).toBe("success");
  });

  it("does not expose demo fixture data in production without an explicit flag", () => {
    const boundary = getDashboardDemoBoundary({ nodeEnv: "production" });
    expect(boundary.state).toBe("config-missing");
    expect(boundary.fixtures.inbox).toHaveLength(0);
    expect(routeDemoData(boundary).inbox.state).toBe("config-missing");
  });

  it("allows demo fixture data only behind the explicit local/preview boundary", () => {
    const boundary = getDashboardDemoBoundary({ nodeEnv: "production", demoEnabled: "1" });
    expect(boundary.state).toBe("success");
    expect(boundary.fixtures.inbox.length).toBeGreaterThan(0);
  });

  it("exposes a fixture/data envelope for each dashboard route contract", () => {
    const data = routeDemoData(getDashboardDemoBoundary({ nodeEnv: "test" }));
    expect(Object.keys(data).sort()).toEqual([
      "apps",
      "billing",
      "customer-overview",
      "developer",
      "evidence",
      "inbox",
      "memories",
      "privacy",
      "settings",
      "sources"
    ]);
  });
});

describe("dashboard API client", () => {
  it("adds bearer auth and csrf headers through the dashboard proxy", async () => {
    const seen: Array<{ url: string; headers: Headers; body?: string }> = [];
    const client = createBrowserDashboardApiClient({
      getApiKey: () => "test-key",
      getCsrfToken: () => "csrf-token",
      fetchImpl: async (input, init) => {
        seen.push({
          url: String(input),
          headers: init?.headers as Headers,
          body: init?.body as string | undefined
        });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
    });

    await client.requestJson("/v1/memory/write", { method: "POST", body: { content: "x" } });

    expect(seen[0]?.url).toBe("/api/lore/v1/memory/write");
    expect(seen[0]?.headers.get("authorization")).toBe("Bearer test-key");
    expect(seen[0]?.headers.get("x-lore-csrf")).toBe("csrf-token");
    expect(seen[0]?.headers.get("content-type")).toBe("application/json");
    expect(seen[0]?.body).toBe(JSON.stringify({ content: "x" }));
  });

  it("standardizes customer overview authorization failures", async () => {
    const client = createBrowserDashboardApiClient({
      fetchImpl: async (input) => {
        if (String(input).endsWith("/v1/me")) {
          return new Response(JSON.stringify({ status: 401, error: "login required" }), { status: 401 });
        }
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }
    });

    const result = await fetchCustomerOverview(client, "demo");
    expect(result).toEqual({
      state: "empty",
      data: {
        session: null,
        dashboard: {
          health: "ok",
          agentmemory: "cloud",
          memories: [],
          traces: [],
          ledgers: [],
          evalRuns: [],
          auditLogs: []
        },
        systemStatus: {
          captureWorker: "ok",
          embeddingProvider: "unknown",
          graphEnabled: false,
          savedMemoryCount: 0
        }
      }
    });
  });

  it("keeps live overview fetch failures as errors even when demo fixtures are enabled", async () => {
    const demoOverview = routeDemoData(getDashboardDemoBoundary({ nodeEnv: "production", demoEnabled: "1" }))["customer-overview"];
    expect(demoOverview.state).toBe("success");
    expect(errorMessage(new Error("proxy unreachable"), "Customer overview request failed")).toBe("proxy unreachable");
  });

  it("loads signed-in customer overview from session-aware cloud endpoints without requesting legacy API-key routes", async () => {
    const seen: string[] = [];
    const client = createBrowserDashboardApiClient({
      fetchImpl: async (input) => {
        const url = String(input);
        seen.push(url);
        if (url.includes("/v1/audit-logs") || url.includes("/v1/memory/list") || url.includes("/v1/evidence/ledgers") || url.includes("/v1/eval/runs")) {
          throw new Error("customer overview must not request legacy API-key routes");
        }
        if (url.endsWith("/v1/me")) {
          return jsonResponse({
            account: { id: "acct-live", email: "customer@example.com", displayName: "Customer", plan: "free" },
            vault: { id: "vault-live", name: "Customer vault", plan: "free" }
          });
        }
        if (url.endsWith("/health")) {
          return jsonResponse({ status: "ok" });
        }
        if (url.includes("/v1/sources")) {
          return jsonResponse({ sources: [] });
        }
        if (url.includes("/v1/memory-inbox")) {
          return jsonResponse({
            candidates: [
              {
                id: "mem-1",
                content: "Customer memory",
                memoryType: "fact",
                scope: "project",
                status: "active",
                projectId: "vault-live",
                riskTags: [],
                useCount: 1,
                confidence: 0.9,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z"
              }
            ]
          });
        }
        if (url.includes("/v1/recall/traces")) {
          return jsonResponse({ traces: [] });
        }
        return jsonResponse({ status: "ok" });
      }
    });

    const result = await fetchCustomerOverview(client, "demo-private");

    expect(result.state).toBe("success");
    expect(result.state === "success" ? result.data.session?.vault.id : null).toBe("vault-live");
    expect(seen).not.toContain("/api/lore/v1/audit-logs?limit=20");
    expect(seen.some((url) => url.includes("/v1/memory/list"))).toBe(false);
    expect(seen.some((url) => url.includes("/v1/memory-inbox"))).toBe(true);
  });

  it("returns an error for required customer overview endpoint 500 non-JSON responses", async () => {
    const client = createBrowserDashboardApiClient({
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.endsWith("/v1/me")) {
          return jsonResponse({
            account: { id: "acct-live", email: "customer@example.com", displayName: null, plan: "free" },
            vault: { id: "vault-live", name: "Customer vault", plan: "free" }
          });
        }
        if (url.endsWith("/health")) {
          return jsonResponse({ status: "ok" });
        }
        if (url.includes("/v1/sources")) {
          return jsonResponse({ sources: [] });
        }
        if (url.includes("/v1/memory-inbox")) {
          return new Response("<html>proxy error</html>", { status: 500 });
        }
        if (url.includes("/v1/recall/traces")) {
          return jsonResponse({ traces: [] });
        }
        return jsonResponse({});
      }
    });

    await expect(fetchCustomerOverview(client, "demo-private")).resolves.toEqual({
      state: "error",
      status: 500,
      error: "Memory inbox request failed with status 500"
    });
  });

  it("uses public health instead of protected data when session is unauthorized", async () => {
    const client = createBrowserDashboardApiClient({
      fetchImpl: async (input) => {
        if (String(input).endsWith("/health")) return jsonResponse({ status: "ok" });
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
      }
    });

    await expect(client.requestJson("/v1/me", { allowError: true })).resolves.toMatchObject({
      error: "forbidden",
      status: 403,
      httpStatus: 403
    });
    const result = await fetchCustomerOverview(client, "demo");
    expect(result.state).toBe("empty");
    expect(result.state === "empty" ? result.data.dashboard.health : null).toBe("ok");
  });

  it("detects dashboard config errors case-insensitively", async () => {
    const client = createBrowserDashboardApiClient({
      fetchImpl: async (input) => {
        if (String(input).endsWith("/health")) {
          return new Response(JSON.stringify({ code: "CONFIG_MISSING" }), { status: 200 });
        }
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }
    });

    await expect(fetchDashboardData(client, "demo")).resolves.toEqual({
      state: "config-missing",
      error: "Dashboard API configuration is missing"
    });
  });

  it("loads sources through the signed-in session route", async () => {
    const seen: string[] = [];
    const client = createBrowserDashboardApiClient({
      fetchImpl: async (input) => {
        const url = String(input);
        seen.push(url);
        if (url.endsWith("/v1/me")) {
          return jsonResponse({
            account: { id: "acct-live", email: "customer@example.com", displayName: null, plan: "free" },
            vault: { id: "vault-live", name: "Customer vault", plan: "free" }
          });
        }
        if (url.includes("/v1/sources")) {
          return jsonResponse({
            sources: [
              {
                id: "src-1",
                sourceProvider: "codex",
                displayName: "Codex",
                status: "active",
                lastHeartbeatAt: "2026-05-15T00:00:00.000Z",
                metadata: {}
              }
            ]
          });
        }
        return jsonResponse({});
      }
    });

    await expect(fetchSourcesData(client)).resolves.toEqual({
      state: "success",
      data: {
        sources: [
          {
            id: "src-1",
            name: "Codex",
            provider: "codex",
            status: "healthy",
            detail: "Capture mode: summary_only",
            sessions: null,
            pendingJobs: null,
            lastSync: "2026-05-15T00:00:00.000Z"
          }
        ]
      }
    });
    expect(seen).toEqual(["/api/lore/v1/me", "/api/lore/v1/sources?limit=100"]);
  });

  it("loads inbox, memories, and evidence through live session-aware endpoints", async () => {
    const seen: string[] = [];
    const client = createBrowserDashboardApiClient({
      fetchImpl: async (input) => {
        const url = String(input);
        seen.push(url);
        if (url.endsWith("/v1/me")) {
          return jsonResponse({
            account: { id: "acct-live", email: "customer@example.com", displayName: null, plan: "free" },
            vault: { id: "vault-live", name: "Customer vault", plan: "free" }
          });
        }
        if (url.includes("/v1/memory-inbox")) {
          return jsonResponse({
            candidates: [
              {
                id: "cand-1",
                content: "Prefers production-safe benchmark gates",
                memoryType: "preference",
                scope: "user",
                confidence: 0.91,
                status: "accepted",
                reason: "Accepted candidate"
              }
            ]
          });
        }
        if (url.includes("/v1/memory/list")) {
          return jsonResponse({
            memories: [
              {
                id: "mem-1",
                content: "Saved memory should come from memory list",
                memoryType: "preference",
                scope: "user",
                confidence: 0.93,
                status: "active",
                projectId: "vault-live",
                riskTags: [],
                useCount: 3,
                createdAt: "2026-05-15T00:00:00.000Z",
                updatedAt: "2026-05-15T00:00:00.000Z"
              }
            ]
          });
        }
        if (url.includes("/v1/evidence/ledgers")) {
          return jsonResponse({
            ledgers: [
              {
                traceId: "trace-1",
                summary: {
                  retrieved: 1,
                  composed: 1,
                  ignored: 0,
                  warnings: 0,
                  riskTags: [],
                  staleCount: 0,
                  conflictCount: 0
                },
                rows: [
                  {
                    memoryId: "mem-1",
                    contentPreview: "Saved memory should come from memory list",
                    disposition: "used",
                    status: "active",
                    riskTags: [],
                    warnings: []
                  }
                ]
              }
            ]
          });
        }
        return jsonResponse({});
      }
    });

    await expect(fetchInboxData(client)).resolves.toMatchObject({
      state: "success",
      data: { items: [{ id: "cand-1", status: "accepted", risk: "low" }] }
    });
    await expect(fetchMemoriesData(client)).resolves.toMatchObject({
      state: "success",
      data: {
        memories: [{ id: "mem-1", status: "active" }],
        feed: [{ id: "mem-1" }],
        profile: [{ id: "profile-mem-1" }]
      }
    });
    await expect(fetchEvidenceData(client)).resolves.toMatchObject({
      state: "success",
      data: {
        ledgers: [{ traceId: "trace-1", rows: [{ memoryId: "mem-1", disposition: "used" }] }],
        sampleTrace: { id: "trace-1", items: [{ id: "mem-1", state: "used" }] }
      }
    });
    expect(seen).toContain("/api/lore/v1/memory-inbox?limit=100");
    expect(seen).toContain("/api/lore/v1/memory/list?limit=200");
    expect(seen).toContain("/api/lore/v1/evidence/ledgers?limit=25");
    expect(seen).not.toContain("/api/lore/v1/memory-inbox?limit=200");
    expect(seen).not.toContain("/api/lore/v1/recall/traces?limit=25");
  });

  it("does not treat inbox-only candidates as saved memories", async () => {
    const seen: string[] = [];
    const client = createBrowserDashboardApiClient({
      fetchImpl: async (input) => {
        const url = String(input);
        seen.push(url);
        if (url.endsWith("/v1/me")) {
          return jsonResponse({
            account: { id: "acct-live", email: "customer@example.com", displayName: null, plan: "free" },
            vault: { id: "vault-live", name: "Customer vault", plan: "free" }
          });
        }
        if (url.includes("/v1/memory-inbox")) {
          return jsonResponse({ candidates: [{ id: "cand-only", content: "Inbox candidate", status: "accepted" }] });
        }
        if (url.includes("/v1/memory/list")) {
          return jsonResponse({ memories: [] });
        }
        return jsonResponse({});
      }
    });

    await expect(fetchMemoriesData(client)).resolves.toEqual({
      state: "empty",
      data: { memories: [], feed: [], profile: [] }
    });
    expect(seen).toEqual(["/api/lore/v1/me", "/api/lore/v1/memory/list?limit=200"]);
  });

  it("reads nested dashboard proxy config errors", async () => {
    const client = createBrowserDashboardApiClient({
      fetchImpl: async () => new Response(JSON.stringify({
        error: { code: "dashboard.config_missing", message: "LORE_API_URL must be set in production" },
        status: 500
      }), { status: 500 })
    });

    await expect(fetchDashboardData(client, "demo")).resolves.toEqual({
      state: "config-missing",
      error: "LORE_API_URL must be set in production"
    });
  });
});

describe("dashboard API proxy config", () => {
  it("fails closed when LORE_API_URL is missing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LORE_API_URL", undefined);
    try {
      expect(resolveLoreApiBase()).toMatchObject({
        ok: false,
        status: 500,
        code: "dashboard.config_missing"
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects implicit loopback API targets in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LORE_API_URL", "http://127.0.0.1:3000");
    vi.stubEnv("LORE_DASHBOARD_ALLOW_LOOPBACK_API", undefined);
    try {
      expect(resolveLoreApiBase()).toMatchObject({
        ok: false,
        status: 500,
        code: "dashboard.config_unsafe_loopback"
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), { status: 200, ...init });
}
