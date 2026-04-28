import { describe, expect, it } from "vitest";
import { getWebShellInfo, renderDashboardHtml, summarizeDashboard } from "../src/index.js";

describe("getWebShellInfo", () => {
  it("keeps the planned dashboard routes visible", () => {
    expect(getWebShellInfo().routes).toContain("/settings/integrations");
    expect(getWebShellInfo().panels).toContain("memory-health");
  });
});

describe("dashboard rendering", () => {
  it("summarizes memory health and renders safe HTML", () => {
    const snapshot = {
      memories: [
        {
          id: "mem_1",
          content: "<script>alert(1)</script>",
          memoryType: "project_rule" as const,
          scope: "project" as const,
          visibility: "project" as const,
          status: "candidate" as const,
          confidence: 0.9,
          sourceRefs: [],
          riskTags: ["api_key"],
          metadata: {},
          useCount: 0,
          createdAt: "2026-04-28T00:00:00.000Z",
          updatedAt: "2026-04-28T00:00:00.000Z"
        }
      ],
      traces: [
        {
          id: "ctx_1",
          query: "继续 Lore",
          route: { memory: true, web: false, repo: false, toolTraces: false, reason: "matched memory" },
          retrievedMemoryIds: ["mem_1"],
          composedMemoryIds: ["mem_1"],
          ignoredMemoryIds: [],
          warnings: [],
          latencyMs: 12,
          tokenBudget: 1000,
          tokensUsed: 100,
          feedback: "wrong" as const,
          feedbackAt: "2026-04-28T00:00:00.000Z",
          createdAt: "2026-04-28T00:00:00.000Z"
        }
      ],
      audits: [
        {
          id: "audit_1",
          action: "memory.write",
          resourceType: "memory",
          metadata: { riskTags: ["api_key"] },
          createdAt: "2026-04-28T00:00:00.000Z"
        }
      ],
      evalRuns: [
        {
          id: "eval_1",
          provider: "lore-local",
          status: "completed" as const,
          metrics: {
            recallAt5: 1,
            precisionAt5: 0.5,
            mrr: 1,
            staleHitRate: 0,
            p95LatencyMs: 12
          },
          createdAt: "2026-04-28T00:00:00.000Z"
        }
      ],
      integrationStatus: "degraded" as const
    };

    expect(summarizeDashboard(snapshot)).toMatchObject({
      totalMemories: 1,
      reviewQueue: 1,
      riskAlerts: 1,
      traceFeedback: 1,
      recentAudits: 1,
      integrationStatus: "degraded"
    });
    expect(renderDashboardHtml(snapshot)).toContain("&lt;script&gt;");
    expect(renderDashboardHtml(snapshot)).not.toContain("<script>alert");
    expect(renderDashboardHtml(snapshot)).toContain("Context Query");
    expect(renderDashboardHtml(snapshot)).toContain("Eval Playground");
    expect(renderDashboardHtml(snapshot)).toContain("Recent Eval Runs");
    expect(renderDashboardHtml(snapshot)).toContain("lore-local");
    expect(renderDashboardHtml(snapshot)).toContain("Review Queue");
    expect(renderDashboardHtml(snapshot)).toContain("Edit");
    expect(renderDashboardHtml(snapshot)).toContain("Supersede");
    expect(renderDashboardHtml(snapshot)).toContain("Recent Traces");
    expect(renderDashboardHtml(snapshot)).toContain("Useful");
    expect(renderDashboardHtml(snapshot)).toContain("Wrong");
    expect(renderDashboardHtml(snapshot)).toContain("Recent Audits");
  });
});
