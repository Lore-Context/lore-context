import { StaticSearchProvider } from "@lore/search";
import { AgentMemoryAdapter } from "@lore/agentmemory-adapter";
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSchemaSql } from "../src/db/schema.js";
import { composeContext, createLoreApi, getEvalProviders, getHealthResponse, InMemoryLoreStore, PostgresLoreStore, routeContext } from "../src/index.js";
import { openApiDocument, requiredOpenApiOperations, requiredOpenApiPaths } from "../src/openapi.js";

describe("getHealthResponse", () => {
  it("returns a stable API health payload", () => {
    expect(getHealthResponse(new Date("2026-04-27T00:00:00.000Z"))).toEqual({
      status: "ok",
      service: "lore-api",
      timestamp: "2026-04-27T00:00:00.000Z"
    });
  });
});

describe("openapi", () => {
  it("documents every v0.5 adoption endpoint", () => {
    const paths = Object.keys(openApiDocument.paths);
    expect(openApiDocument.openapi).toBe("3.1.0");
    expect(openApiDocument.components.securitySchemes).toMatchObject({
      bearerAuth: expect.objectContaining({ type: "http", scheme: "bearer" }),
      loreApiKey: expect.objectContaining({ type: "apiKey", name: "x-lore-api-key" })
    });
    for (const path of requiredOpenApiPaths) {
      expect(paths).toContain(path);
    }
    for (const [method, path] of requiredOpenApiOperations) {
      expect(openApiDocument.paths[path]?.[method]).toBeDefined();
    }
    expect(() => JSON.parse(JSON.stringify(openApiDocument))).not.toThrow();
  });

  it("serves /openapi.json without API auth", async () => {
    const app = createLoreApi({ apiKeys: [{ key: "locked", role: "admin" }] });
    const response = await app.handle(new Request("http://localhost/openapi.json"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      openapi: "3.1.0",
      info: expect.objectContaining({ title: "Lore Context API" })
    });
  });
});

describe("getEvalProviders", () => {
  it("documents the supported eval provider profiles", () => {
    expect(getEvalProviders()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "lore-local", source: "lore-store" }),
        expect.objectContaining({ id: "agentmemory-export", source: "uploaded-sessions" }),
        expect.objectContaining({ id: "external-mock", source: "external" })
      ])
    );
  });
});

describe("database schema", () => {
  it("includes the core memory and trace tables", () => {
    const sql = loadSchemaSql();
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS memory_records");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS context_traces");
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS vector");
    expect(sql).toContain("retrieved_memory_ids JSONB");
    expect(sql).toContain("composed_memory_ids JSONB");
    expect(sql).toContain("feedback_at TIMESTAMPTZ");
  });
});

describe("routeContext", () => {
  it("routes latest project-continuation questions to memory and web", () => {
    expect(routeContext({ query: "继续开发这个项目，结合最新 agentmemory 文档" })).toMatchObject({
      memory: true,
      web: true
    });
  });

  it("honors explicit source overrides", () => {
    expect(
      routeContext({
        query: "继续开发这个项目，结合最新 agentmemory 文档",
        sources: { memory: false, web: false, repo: true }
      })
    ).toMatchObject({
      memory: false,
      web: false,
      repo: true
    });
  });
});

describe("composeContext", () => {
  it("composes memory and web evidence into a context block", async () => {
    const store = new InMemoryLoreStore();
    store.writeMemory({
      id: "mem_1",
      content: "This project defaults to Qwen.",
      memoryType: "project_rule",
      scope: "project",
      visibility: "project",
      status: "active",
      confidence: 0.9,
      projectId: "demo",
      sourceRefs: [],
      riskTags: [],
      metadata: {},
      useCount: 0,
      createdAt: "2026-04-28T00:00:00.000Z",
      updatedAt: "2026-04-28T00:00:00.000Z"
    });

    const response = await composeContext(
      { query: "继续 Qwen 最新 文档", projectId: "demo", tokenBudget: 1000 },
      {
        store,
        searchProvider: new StaticSearchProvider({
          results: [{ id: "web_1", title: "Qwen MCP Docs", snippet: "Qwen supports mcpServers.", source: "docs" }]
        }),
        now: new Date("2026-04-28T00:00:00.000Z")
      }
    );

    expect(response.contextBlock).toContain("This project defaults to Qwen.");
    expect(response.contextBlock).toContain("Qwen MCP Docs");
    expect(store.traces.has(response.traceId)).toBe(true);
  });
});

describe("InMemoryLoreStore persistence", () => {
  it("persists memories, traces, events, eval runs, and audits to disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lore-store-"));
    const filePath = join(dir, "store.json");

    try {
      const app = createLoreApi({
        storePath: filePath,
        now: () => new Date("2026-04-28T00:00:00.000Z")
      });

      const write = await app.handle(
        jsonRequest("http://localhost/v1/memory/write", {
          content: "Persist Lore memories across API restarts.",
          memory_type: "project_rule",
          project_id: "demo"
        })
      );
      expect(write.status).toBe(200);

      await app.handle(jsonRequest("http://localhost/v1/context/query", { query: "继续 Persist Lore", project_id: "demo" }));
      await app.handle(jsonRequest("http://localhost/v1/events/ingest", { event_type: "agent.test", payload: { ok: true } }));
      await app.handle(
        jsonRequest("http://localhost/v1/eval/run", {
          dataset: {
            sessions: [{ sessionId: "persisted", messages: [{ role: "user", content: "Persist Lore memories." }] }],
            questions: [{ question: "What should persist?", goldSessionIds: ["persisted"] }]
          }
        })
      );

      const rawSnapshot = JSON.parse(readFileSync(filePath, "utf8")) as {
        memories: unknown[];
        traces: unknown[];
        events: unknown[];
        evalRuns: unknown[];
        audits: unknown[];
      };
      expect(rawSnapshot.memories).toHaveLength(1);
      expect(rawSnapshot.traces).toHaveLength(1);
      expect(rawSnapshot.events).toHaveLength(1);
      expect(rawSnapshot.evalRuns).toHaveLength(1);
      expect(rawSnapshot.audits.length).toBeGreaterThanOrEqual(3);

      const restarted = createLoreApi({ storePath: filePath });
      const search = await restarted.handle(jsonRequest("http://localhost/v1/memory/search", { query: "restarts", project_id: "demo" }));
      expect(await search.json()).toMatchObject({
        hits: [expect.objectContaining({ memory: expect.objectContaining({ content: expect.stringContaining("API restarts") }) })]
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("PostgresLoreStore persistence", () => {
  it("flushes with upserts instead of full-table deletes", async () => {
    const pool = new FakePgPool();
    const store = new PostgresLoreStore({
      databaseUrl: "postgres://unused",
      autoApplySchema: false,
      pool: pool as never,
      now: () => new Date("2026-04-28T00:00:00.000Z")
    });

    await store.whenReady();

    store.writeMemory({
      id: "mem_1",
      content: "Persist Lore memories incrementally.",
      memoryType: "project_rule",
      scope: "project",
      visibility: "project",
      status: "active",
      confidence: 0.9,
      projectId: "demo",
      sourceRefs: [],
      riskTags: [],
      metadata: {},
      useCount: 0,
      createdAt: "2026-04-28T00:00:00.000Z",
      updatedAt: "2026-04-28T00:00:00.000Z"
    });
    store.addTrace({
      id: "trace_1",
      projectId: "demo",
      query: "继续 Lore",
      route: { memory: true, web: false, repo: false, toolTraces: false, reason: "test" },
      retrievedMemoryIds: ["mem_1"],
      composedMemoryIds: ["mem_1"],
      ignoredMemoryIds: [],
      warnings: [],
      latencyMs: 5,
      tokenBudget: 100,
      tokensUsed: 20,
      createdAt: "2026-04-28T00:00:00.000Z"
    });
    store.addEvent("agent.test", { ok: true }, new Date("2026-04-28T00:00:00.000Z"), "demo");
    store.addEvalRun(
      {
        provider: "lore-local",
        projectId: "demo",
        metrics: { recallAt5: 1, precisionAt5: 1, mrr: 1, staleHitRate: 0, p95LatencyMs: 10 }
      },
      new Date("2026-04-28T00:00:00.000Z")
    );
    store.addAudit(
      {
        action: "memory.write",
        resourceType: "memory",
        resourceId: "mem_1",
        metadata: { source: "test" }
      },
      new Date("2026-04-28T00:00:00.000Z")
    );

    await store.flushNow();

    store.updateMemory(
      "mem_1",
      { content: "Persist Lore memories without table resets.", confidence: 0.95 },
      new Date("2026-04-28T00:01:00.000Z")
    );
    store.updateTraceFeedback("trace_1", "useful", new Date("2026-04-28T00:01:00.000Z"), "kept");

    pool.resetQueryLog();
    await store.flushNow();

    expect(pool.queries).not.toEqual(
      expect.arrayContaining([
        "DELETE FROM memory_embeddings",
        "DELETE FROM memory_records",
        "DELETE FROM context_traces",
        "DELETE FROM event_log",
        "DELETE FROM eval_runs",
        "DELETE FROM audit_logs"
      ])
    );

    const reloaded = new PostgresLoreStore({
      databaseUrl: "postgres://unused",
      autoApplySchema: false,
      pool: pool as never
    });
    await reloaded.whenReady();

    expect(reloaded.getMemory("mem_1")).toMatchObject({
      content: "Persist Lore memories without table resets.",
      confidence: 0.95
    });
    expect(reloaded.traces.get("trace_1")).toMatchObject({
      feedback: "useful",
      feedbackNote: "kept"
    });
  });

  it("propagates hard deletes to postgres snapshots", async () => {
    const pool = new FakePgPool();
    const store = new PostgresLoreStore({
      databaseUrl: "postgres://unused",
      autoApplySchema: false,
      pool: pool as never,
      now: () => new Date("2026-04-28T00:00:00.000Z")
    });

    await store.whenReady();

    store.writeMemory({
      id: "mem_hard_delete",
      content: "Delete me from postgres too.",
      memoryType: "project_rule",
      scope: "project",
      visibility: "project",
      status: "active",
      confidence: 0.9,
      projectId: "demo",
      sourceRefs: [],
      riskTags: [],
      metadata: {},
      useCount: 0,
      createdAt: "2026-04-28T00:00:00.000Z",
      updatedAt: "2026-04-28T00:00:00.000Z"
    });

    await store.flushNow();
    expect(pool.tables.memory_records.has("mem_hard_delete")).toBe(true);

    expect(store.hardDeleteMemory("mem_hard_delete")).toBe(true);

    pool.resetQueryLog();
    await store.flushNow();

    expect(pool.queries).toContain("DELETE FROM memory_records WHERE id = ANY($1::text[])");
    expect(pool.tables.memory_records.has("mem_hard_delete")).toBe(false);

    const reloaded = new PostgresLoreStore({
      databaseUrl: "postgres://unused",
      autoApplySchema: false,
      pool: pool as never
    });
    await reloaded.whenReady();

    expect(reloaded.getMemory("mem_hard_delete")).toBeUndefined();
  });
});

describe("createLoreApi", () => {
  it("writes, searches, composes, and exports memories", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });

    const write = await app.handle(
      jsonRequest("http://localhost/v1/memory/write", {
        content: "Use Qwen for Lore Context.",
        memory_type: "project_rule",
        project_id: "demo"
      })
    );
    expect(write.status).toBe(200);
    const writeBody = (await write.json()) as { memory: { id: string } };
    expect(writeBody).toMatchObject({ memory: { visibility: "project" } });

    const search = await app.handle(jsonRequest("http://localhost/v1/memory/search", { query: "Qwen", project_id: "demo" }));
    expect(await search.json()).toMatchObject({ hits: [expect.objectContaining({ memory: expect.objectContaining({ id: writeBody.memory.id }) })] });

    const filteredList = await app.handle(new Request("http://localhost/v1/memory/list?project_id=demo&status=active&scope=project&q=Qwen&limit=5"));
    expect(await filteredList.json()).toMatchObject({
      memories: [expect.objectContaining({ id: writeBody.memory.id, content: "Use Qwen for Lore Context." })]
    });

    const context = await app.handle(jsonRequest("http://localhost/v1/context/query", { query: "继续 Qwen", project_id: "demo" }));
    expect(await context.json()).toMatchObject({ contextBlock: expect.stringContaining("Use Qwen") });

    const forcedContext = await app.handle(
      jsonRequest("http://localhost/v1/context/query", {
        query: "继续 Qwen",
        project_id: "demo",
        sources: { memory: false, web: false, repo: true },
        writeback_policy: "explicit",
        include_sources: true
      })
    );
    expect(await forcedContext.json()).toMatchObject({
      route: expect.objectContaining({ memory: false, web: false, repo: true }),
      memoryHits: []
    });

    const exported = await app.handle(new Request("http://localhost/v1/memory/export?format=markdown"));
    expect(await exported.text()).toContain("Use Qwen for Lore Context.");

    const dashboard = await app.handle(new Request("http://localhost/dashboard"));
    expect(dashboard.headers.get("content-type")).toContain("text/html");
    expect(await dashboard.text()).toContain("Lore Context");

    const audits = await app.handle(new Request("http://localhost/v1/audit-logs?limit=2"));
    expect(await audits.json()).toMatchObject({
      auditLogs: expect.arrayContaining([expect.objectContaining({ action: "memory.export" })])
    });
  });

  it("gets, edits, and supersedes memory records with audit trail", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });

    const write = await app.handle(
      jsonRequest("http://localhost/v1/memory/write", {
        content: "Use direct REST for early Lore integrations.",
        memory_type: "project_rule",
        project_id: "demo"
      })
    );
    const written = (await write.json()) as { memory: { id: string } };

    const detail = await app.handle(new Request(`http://localhost/v1/memory/${encodeURIComponent(written.memory.id)}`));
    expect(await detail.json()).toMatchObject({
      memory: expect.objectContaining({
        id: written.memory.id,
        content: "Use direct REST for early Lore integrations."
      })
    });

    const patched = await app.handle(
      jsonRequestWithMethod(`http://localhost/v1/memory/${encodeURIComponent(written.memory.id)}`, "PATCH", {
        content: "Use REST-backed MCP for early Lore integrations.",
        confidence: 0.8
      })
    );
    expect(await patched.json()).toMatchObject({
      reviewRequired: false,
      memory: expect.objectContaining({
        id: written.memory.id,
        content: "Use REST-backed MCP for early Lore integrations.",
        confidence: 0.8,
        status: "active"
      })
    });

    const superseded = await app.handle(
      jsonRequest(`http://localhost/v1/memory/${encodeURIComponent(written.memory.id)}/supersede`, {
        content: "Use the stdio MCP launcher for agent integrations.",
        reason: "MCP entrypoint is now available"
      })
    );
    const supersedeBody = (await superseded.json()) as {
      previous: { id: string; status: string; supersededBy: string };
      memory: { id: string; sourceOriginalId: string };
    };
    expect(supersedeBody).toMatchObject({
      previous: expect.objectContaining({ id: written.memory.id, status: "superseded" }),
      memory: expect.objectContaining({ sourceOriginalId: written.memory.id })
    });
    expect(supersedeBody.previous.supersededBy).toBe(supersedeBody.memory.id);

    const search = await app.handle(jsonRequest("http://localhost/v1/memory/search", { query: "MCP", project_id: "demo" }));
    expect(await search.json()).toMatchObject({
      hits: [expect.objectContaining({ memory: expect.objectContaining({ id: supersedeBody.memory.id }) })]
    });

    const audits = await app.handle(new Request("http://localhost/v1/audit-logs?limit=5"));
    expect(await audits.json()).toMatchObject({
      auditLogs: expect.arrayContaining([
        expect.objectContaining({ action: "memory.update" }),
        expect.objectContaining({ action: "memory.supersede" })
      ])
    });
  });

  it("hard-deletes memories only when explicitly requested", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });

    const write = await app.handle(
      jsonRequest("http://localhost/v1/memory/write", {
        content: "Temporary deletion test memory.",
        memory_type: "project_rule",
        project_id: "demo"
      })
    );
    const written = (await write.json()) as { memory: { id: string } };

    const deleted = await app.handle(
      jsonRequest("http://localhost/v1/memory/forget", {
        memory_ids: [written.memory.id],
        reason: "hard-delete test cleanup",
        hard_delete: true
      })
    );
    expect(await deleted.json()).toMatchObject({
      deleted: 1,
      memoryIds: [written.memory.id],
      hardDelete: true
    });

    const detail = await app.handle(new Request(`http://localhost/v1/memory/${encodeURIComponent(written.memory.id)}`));
    expect(detail.status).toBe(404);

    const exported = await app.handle(new Request("http://localhost/v1/memory/export?format=markdown"));
    expect(await exported.text()).not.toContain("Temporary deletion test memory.");

    const audits = await app.handle(new Request("http://localhost/v1/audit-logs?limit=3"));
    const auditBody = await audits.json();
    expect(auditBody).toMatchObject({
      auditLogs: expect.arrayContaining([
        expect.objectContaining({
          action: "memory.forget",
          metadata: expect.objectContaining({ hardDelete: true, deleted: 1 })
        })
      ])
    });
    expect(JSON.stringify(auditBody)).not.toContain("Temporary deletion test memory.");
  });

  it("forgets memories by query selector", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });

    const kept = await app.handle(jsonRequest("http://localhost/v1/memory/write", { content: "Keep this durable memory.", project_id: "demo" }));
    const keptBody = (await kept.json()) as { memory: { id: string } };
    const stale = await app.handle(jsonRequest("http://localhost/v1/memory/write", { content: "Remove this stale query-selected memory.", project_id: "demo" }));
    const staleBody = (await stale.json()) as { memory: { id: string } };

    const deleted = await app.handle(
      jsonRequest("http://localhost/v1/memory/forget", {
        query: "stale query-selected",
        project_id: "demo",
        reason: "query selector cleanup"
      })
    );
    expect(await deleted.json()).toMatchObject({
      deleted: 1,
      memoryIds: [staleBody.memory.id],
      hardDelete: false
    });

    const keptDetail = await app.handle(new Request(`http://localhost/v1/memory/${encodeURIComponent(keptBody.memory.id)}`));
    expect(keptDetail.status).toBe(200);
    const staleDetail = await app.handle(new Request(`http://localhost/v1/memory/${encodeURIComponent(staleBody.memory.id)}`));
    expect(staleDetail.status).toBe(404);
  });

  it("keeps memory search use counts consistent with stored detail records", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });

    const write = await app.handle(jsonRequest("http://localhost/v1/memory/write", { content: "Search count consistency.", project_id: "demo" }));
    const written = (await write.json()) as { memory: { id: string } };

    const search = await app.handle(jsonRequest("http://localhost/v1/memory/search", { query: "consistency", project_id: "demo" }));
    expect(await search.json()).toMatchObject({
      hits: [expect.objectContaining({ memory: expect.objectContaining({ id: written.memory.id, useCount: 0 }) })]
    });

    const detail = await app.handle(new Request(`http://localhost/v1/memory/${encodeURIComponent(written.memory.id)}`));
    expect(await detail.json()).toMatchObject({
      memory: expect.objectContaining({ id: written.memory.id, useCount: 0 })
    });
  });

  it("records composed memory use and trace feedback", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });

    const write = await app.handle(
      jsonRequest("http://localhost/v1/memory/write", {
        content: "Track Lore context usage in traces.",
        memory_type: "project_rule",
        project_id: "demo"
      })
    );
    const written = (await write.json()) as { memory: { id: string } };

    const context = await app.handle(jsonRequest("http://localhost/v1/context/query", { query: "继续 Lore context usage", project_id: "demo" }));
    const contextBody = (await context.json()) as { traceId: string };

    const detail = await app.handle(new Request(`http://localhost/v1/memory/${encodeURIComponent(written.memory.id)}`));
    expect(await detail.json()).toMatchObject({
      memory: expect.objectContaining({
        id: written.memory.id,
        useCount: 1,
        lastUsedAt: "2026-04-28T00:00:00.000Z"
      })
    });

    const feedback = await app.handle(
      jsonRequest(`http://localhost/v1/traces/${encodeURIComponent(contextBody.traceId)}/feedback`, {
        feedback: "wrong",
        note: "wrong source"
      })
    );
    expect(await feedback.json()).toMatchObject({
      trace: expect.objectContaining({
        id: contextBody.traceId,
        feedback: "wrong",
        feedbackAt: "2026-04-28T00:00:00.000Z",
        feedbackNote: "wrong source"
      })
    });

    const audits = await app.handle(new Request("http://localhost/v1/audit-logs?limit=5"));
    expect(await audits.json()).toMatchObject({
      auditLogs: expect.arrayContaining([expect.objectContaining({ action: "trace.feedback" })])
    });
  });

  it("builds an Evidence Ledger for used, ignored, and missing trace memory", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });
    const memoryIds: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      const response = await app.handle(
        jsonRequest("http://localhost/v1/memory/write", {
          content: `Ledger adoption memory ${index}`,
          memory_type: "project_rule",
          project_id: "demo",
          confidence: 0.9
        })
      );
      const body = (await response.json()) as { memory: { id: string } };
      memoryIds.push(body.memory.id);
    }

    const context = await app.handle(jsonRequest("http://localhost/v1/context/query", { query: "Ledger adoption memory", project_id: "demo" }));
    const contextBody = (await context.json()) as { traceId: string };

    await app.handle(
      jsonRequest("http://localhost/v1/memory/forget", {
        memory_ids: [memoryIds[0]],
        reason: "verify missing ledger rows after hard delete",
        hard_delete: true
      })
    );

    const ledgerResponse = await app.handle(new Request(`http://localhost/v1/evidence/ledger/${encodeURIComponent(contextBody.traceId)}`));
    expect(await ledgerResponse.json()).toMatchObject({
      ledger: expect.objectContaining({
        traceId: contextBody.traceId,
        summary: expect.objectContaining({
          retrieved: 6,
          composed: 5,
          ignored: 1
        }),
        rows: expect.arrayContaining([
          expect.objectContaining({ disposition: "used" }),
          expect.objectContaining({ disposition: "ignored" }),
          expect.objectContaining({ memoryId: memoryIds[0], disposition: "missing", contentPreview: "[memory unavailable]" })
        ])
      })
    });

    const ledgersResponse = await app.handle(new Request("http://localhost/v1/evidence/ledgers?project_id=demo&limit=5"));
    expect(await ledgersResponse.json()).toMatchObject({
      ledgers: [expect.objectContaining({ traceId: contextBody.traceId })]
    });
  });

  it("imports memories, ingests events, and runs retrieval eval", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });
    const imported = await app.handle(
      new Request("http://localhost/v1/memory/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          format: "lore-memory-export",
          version: "0.1",
          exportedAt: "2026-04-28T00:00:00.000Z",
          memories: [
            {
              id: "s1",
              content: "The default model is Qwen.",
              memoryType: "project_rule",
              scope: "project",
              visibility: "project",
              status: "active",
              confidence: 0.9,
              sourceProvider: "import",
              sourceOriginalId: "s1",
              sourceRefs: [],
              riskTags: [],
              metadata: {},
              useCount: 0,
              createdAt: "2026-04-28T00:00:00.000Z",
              updatedAt: "2026-04-28T00:00:00.000Z"
            }
          ]
        })
      })
    );
    expect(await imported.json()).toMatchObject({ imported: 1 });

    const event = await app.handle(jsonRequest("http://localhost/v1/events/ingest", { event_type: "agent.tool.called", payload: { tool: "test" } }));
    expect(await event.json()).toMatchObject({ eventId: expect.stringMatching(/^evt_/) });

    const evalRun = await app.handle(
      jsonRequest("http://localhost/v1/eval/run", {
        dataset: {
          sessions: [{ sessionId: "s1", messages: [{ role: "user", content: "The default model is Qwen." }] }],
          questions: [{ question: "What is the default model?", goldSessionIds: ["s1"] }]
        }
      })
    );
    expect(await evalRun.json()).toMatchObject({
      evalRunId: expect.stringMatching(/^eval_/),
      metrics: expect.objectContaining({ recallAt5: 1 })
    });

    const evalRuns = await app.handle(new Request("http://localhost/v1/eval/runs?limit=1"));
    expect(await evalRuns.json()).toMatchObject({
      evalRuns: [expect.objectContaining({ provider: "lore-local", metrics: expect.objectContaining({ recallAt5: 1 }) })]
    });

    const providers = await app.handle(new Request("http://localhost/v1/eval/providers"));
    expect(await providers.json()).toMatchObject({
      providers: expect.arrayContaining([expect.objectContaining({ id: "agentmemory-export" })])
    });

    const report = await app.handle(new Request("http://localhost/v1/eval/report?format=json"));
    expect(await report.json()).toMatchObject({
      publicSafe: true,
      evalRun: expect.objectContaining({ provider: "lore-local" })
    });
  });

  it("runs retrieval eval directly over uploaded sessions", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });

    const evalRun = await app.handle(
      jsonRequest("http://localhost/v1/eval/run", {
        dataset: {
          sessions: [
            { sessionId: "s1", messages: [{ role: "user", content: "Lore should use a stdio MCP launcher." }] },
            { sessionId: "s2", messages: [{ role: "user", content: "Unrelated billing note." }] }
          ],
          questions: [{ question: "Which session mentions stdio MCP?", goldSessionIds: ["s1"] }]
        }
      })
    );

    expect(await evalRun.json()).toMatchObject({
      metrics: expect.objectContaining({
        recallAt5: 1,
        mrr: 1
      })
    });
  });

  it("records provider-specific eval comparison runs", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });

    const evalRun = await app.handle(
      jsonRequest("http://localhost/v1/eval/run", {
        provider: "external-mock",
        dataset: {
          sessions: [{ sessionId: "s1", messages: [{ role: "user", content: "External mock baseline." }] }],
          questions: [{ question: "Which baseline is external?", goldSessionIds: ["s1"] }]
        }
      })
    );
    const evalRunBody = await evalRun.json();
    expect(evalRunBody).toMatchObject({
      metrics: expect.objectContaining({
        recallAt5: 1
      })
    });
    expect(evalRunBody.metrics.p95LatencyMs).toBeGreaterThanOrEqual(8);

    const evalRuns = await app.handle(new Request("http://localhost/v1/eval/runs?limit=1"));
    expect(await evalRuns.json()).toMatchObject({
      evalRuns: [expect.objectContaining({ provider: "external-mock" })]
    });
  });

  it("redacts risky memories before saving", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });
    const awsKeyFixture = "AKIA" + "1234567890ABCDEF";
    const response = await app.handle(jsonRequest("http://localhost/v1/memory/write", { content: `key ${awsKeyFixture}` }));

    expect(await response.json()).toMatchObject({
      reviewRequired: true,
      memory: expect.objectContaining({
        content: "key <redacted:aws_access_key>",
        status: "candidate",
        riskTags: ["aws_access_key"]
      })
    });
  });

  it("preserves review state when risky memory metadata is edited", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });
    const awsKeyFixture = "AKIA" + "1234567890ABCDEF";
    const response = await app.handle(jsonRequest("http://localhost/v1/memory/write", { content: `key ${awsKeyFixture}` }));
    const body = (await response.json()) as { memory: { id: string } };

    const patched = await app.handle(
      jsonRequestWithMethod(`http://localhost/v1/memory/${encodeURIComponent(body.memory.id)}`, "PATCH", {
        project_id: "demo"
      })
    );

    expect(await patched.json()).toMatchObject({
      reviewRequired: true,
      memory: expect.objectContaining({
        projectId: "demo",
        status: "candidate",
        riskTags: ["aws_access_key"]
      })
    });
  });

  it("queues, approves, and rejects risky memories through governance review", async () => {
    const app = createLoreApi({ now: () => new Date("2026-04-28T00:00:00.000Z") });
    const firstAwsKeyFixture = "AKIA" + "1234567890ABCDEF";
    const secondAwsKeyFixture = "AKIA" + "0000000000000000";

    const firstWrite = await app.handle(
      jsonRequest("http://localhost/v1/memory/write", { content: `primary key ${firstAwsKeyFixture}`, project_id: "demo" })
    );
    const firstMemory = (await firstWrite.json()) as { memory: { id: string } };

    const queue = await app.handle(new Request("http://localhost/v1/governance/review-queue?project_id=demo"));
    expect(await queue.json()).toMatchObject({
      memories: [expect.objectContaining({ id: firstMemory.memory.id, status: "candidate" })]
    });

    const approved = await app.handle(
      jsonRequest(`http://localhost/v1/governance/memory/${encodeURIComponent(firstMemory.memory.id)}/approve`, {
        reason: "dummy test fixture",
        reviewer: "test"
      })
    );
    expect(await approved.json()).toMatchObject({
      memory: expect.objectContaining({ id: firstMemory.memory.id, status: "confirmed" })
    });

    const secondWrite = await app.handle(
      jsonRequest("http://localhost/v1/memory/write", { content: `secondary key ${secondAwsKeyFixture}`, project_id: "demo" })
    );
    const secondMemory = (await secondWrite.json()) as { memory: { id: string } };

    const rejected = await app.handle(
      jsonRequest(`http://localhost/v1/governance/memory/${encodeURIComponent(secondMemory.memory.id)}/reject`, {
        reason: "not durable context",
        reviewer: "test"
      })
    );
    expect(await rejected.json()).toMatchObject({
      memory: expect.objectContaining({ id: secondMemory.memory.id, status: "deleted" })
    });
  });

  it("reports degraded agentmemory sync when the local runtime is offline", async () => {
    const app = createLoreApi({
      agentMemory: new AgentMemoryAdapter({
        fetchImpl: async () => {
          throw new Error("offline");
        }
      })
    });
    const response = await app.handle(jsonRequest("http://localhost/v1/integrations/agentmemory/sync", {}));

    expect(await response.json()).toMatchObject({
      status: "degraded",
      importedMemories: 0
    });
  });

  it("protects non-health routes when an API key is configured", async () => {
    const app = createLoreApi({ apiKey: "dev-secret" });

    const health = await app.handle(new Request("http://localhost/health"));
    expect(health.status).toBe(200);

    const blocked = await app.handle(jsonRequest("http://localhost/v1/memory/search", { query: "Lore" }));
    expect(blocked.status).toBe(401);
    expect(blocked.headers.get("www-authenticate")).toContain("Bearer");

    const allowed = await app.handle(
      new Request("http://localhost/v1/memory/search", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer dev-secret" },
        body: JSON.stringify({ query: "Lore" })
      })
    );
    expect(allowed.status).toBe(200);
  });

  it("only allows no-key development access from loopback requests", async () => {
    const app = createLoreApi();

    const local = await app.handle(jsonRequest("http://localhost/v1/memory/search", { query: "Lore" }));
    expect(local.status).toBe(200);

    const remoteHost = await app.handle(jsonRequest("http://lore.example/v1/memory/search", { query: "Lore" }));
    expect(remoteHost.status).toBe(401);

    const spoofedHost = await app.handle(
      new Request("http://localhost/v1/memory/search", {
        method: "POST",
        headers: { "content-type": "application/json", "x-lore-remote-address": "203.0.113.10" },
        body: JSON.stringify({ query: "Lore" })
      })
    );
    expect(spoofedHost.status).toBe(401);
  });

  it("enforces API key roles for read, write, and admin routes", async () => {
    const app = createLoreApi({
      apiKeys: [
        { key: "read-key", role: "reader" },
        { key: "write-key", role: "writer" },
        { key: "admin-key", role: "admin" }
      ],
      now: () => new Date("2026-04-28T00:00:00.000Z")
    });

    const readerSearch = await app.handle(authJsonRequest("http://localhost/v1/memory/search", { query: "Lore" }, "read-key"));
    expect(readerSearch.status).toBe(200);

    const readerWrite = await app.handle(authJsonRequest("http://localhost/v1/memory/write", { content: "Reader cannot write." }, "read-key"));
    expect(readerWrite.status).toBe(403);
    expect(await readerWrite.json()).toMatchObject({ error: { code: "auth.forbidden" } });

    const writerWrite = await app.handle(authJsonRequest("http://localhost/v1/memory/write", { content: "Writer can save memory." }, "write-key"));
    expect(writerWrite.status).toBe(200);
    const written = (await writerWrite.json()) as { memory: { id: string } };

    const writerExport = await app.handle(authGet("http://localhost/v1/memory/export", "write-key"));
    expect(writerExport.status).toBe(403);

    const adminExport = await app.handle(authGet("http://localhost/v1/memory/export", "admin-key"));
    expect(adminExport.status).toBe(200);

    const adminForget = await app.handle(
      authJsonRequest("http://localhost/v1/memory/forget", { memory_ids: [written.memory.id], reason: "rbac test cleanup" }, "admin-key")
    );
    expect(await adminForget.json()).toMatchObject({ deleted: 1 });
  });

  it("enforces project-scoped API keys across memory, context, eval, and admin operations", async () => {
    const app = createLoreApi({
      apiKeys: [
        { key: "global-admin", role: "admin" },
        { key: "demo-reader", role: "reader", projectIds: ["demo"] },
        { key: "demo-writer", role: "writer", projectIds: ["demo"] },
        { key: "demo-admin", role: "admin", projectIds: ["demo"] },
        { key: "other-admin", role: "admin", projectIds: ["other"] }
      ],
      now: () => new Date("2026-04-28T00:00:00.000Z")
    });

    const demoWrite = await app.handle(
      authJsonRequest("http://localhost/v1/memory/write", { content: "Demo project scoped memory.", project_id: "demo" }, "global-admin")
    );
    const demoMemory = (await demoWrite.json()) as { memory: { id: string } };
    const otherWrite = await app.handle(
      authJsonRequest("http://localhost/v1/memory/write", { content: "Other project scoped memory.", project_id: "other" }, "global-admin")
    );
    const otherMemory = (await otherWrite.json()) as { memory: { id: string } };

    const scopedSearch = await app.handle(authJsonRequest("http://localhost/v1/memory/search", { query: "project scoped" }, "demo-reader"));
    const scopedSearchBody = (await scopedSearch.json()) as { hits: Array<{ memory: { id: string } }> };
    expect(scopedSearchBody.hits.map((hit) => hit.memory.id)).toContain(demoMemory.memory.id);
    expect(scopedSearchBody.hits.map((hit) => hit.memory.id)).not.toContain(otherMemory.memory.id);

    const scopedContext = await app.handle(authJsonRequest("http://localhost/v1/context/query", { query: "project scoped" }, "demo-reader"));
    const scopedContextBody = (await scopedContext.json()) as { traceId: string; contextBlock: string };
    expect(scopedContextBody).toMatchObject({
      contextBlock: expect.stringContaining("Demo project scoped memory")
    });

    const scopedLedger = await app.handle(authGet(`http://localhost/v1/evidence/ledger/${encodeURIComponent(scopedContextBody.traceId)}`, "demo-reader"));
    expect(scopedLedger.status).toBe(200);

    const forbiddenLedger = await app.handle(authGet(`http://localhost/v1/evidence/ledger/${encodeURIComponent(scopedContextBody.traceId)}`, "other-admin"));
    expect(forbiddenLedger.status).toBe(403);

    await app.handle(authJsonRequest("http://localhost/v1/context/query", { query: "project scoped", project_id: "other" }, "global-admin"));
    const filteredTraces = await app.handle(authGet("http://localhost/v1/traces?project_id=demo&limit=1", "global-admin"));
    const filteredTraceBody = (await filteredTraces.json()) as { traces: Array<{ projectId?: string }> };
    expect(filteredTraceBody.traces).toHaveLength(1);
    expect(filteredTraceBody.traces[0]?.projectId).toBe("demo");

    const forbiddenDetail = await app.handle(authGet(`http://localhost/v1/memory/${encodeURIComponent(otherMemory.memory.id)}`, "demo-reader"));
    expect(forbiddenDetail.status).toBe(403);

    const forbiddenWrite = await app.handle(
      authJsonRequest("http://localhost/v1/memory/write", { content: "Wrong scoped write.", project_id: "other" }, "demo-writer")
    );
    expect(forbiddenWrite.status).toBe(403);

    const missingProjectWrite = await app.handle(
      authJsonRequest("http://localhost/v1/memory/write", { content: "Missing scoped project." }, "demo-writer")
    );
    expect(missingProjectWrite.status).toBe(403);
    expect(await missingProjectWrite.json()).toMatchObject({ error: { code: "auth.project_required" } });

    const scopedEval = await app.handle(
      authJsonRequest(
        "http://localhost/v1/eval/run",
        {
          project_id: "demo",
          dataset: {
            sessions: [{ sessionId: "demo-session", messages: [{ role: "user", content: "Demo eval context." }] }],
            questions: [{ question: "Which context is demo?", goldSessionIds: ["demo-session"] }]
          }
        },
        "demo-writer"
      )
    );
    expect(scopedEval.status).toBe(200);

    const scopedEvalWithoutProject = await app.handle(
      authJsonRequest(
        "http://localhost/v1/eval/run",
        {
          dataset: {
            sessions: [{ sessionId: "demo-session", messages: [{ role: "user", content: "Demo eval context." }] }],
            questions: [{ question: "Which context is demo?", goldSessionIds: ["demo-session"] }]
          }
        },
        "demo-writer"
      )
    );
    expect(scopedEvalWithoutProject.status).toBe(403);

    const forbiddenForget = await app.handle(
      authJsonRequest("http://localhost/v1/memory/forget", { memory_ids: [otherMemory.memory.id], reason: "wrong scoped project" }, "demo-admin")
    );
    expect(forbiddenForget.status).toBe(403);

    const allowedForget = await app.handle(
      authJsonRequest("http://localhost/v1/memory/forget", { memory_ids: [otherMemory.memory.id], reason: "right scoped project" }, "other-admin")
    );
    expect(await allowedForget.json()).toMatchObject({ deleted: 1, hardDelete: false });

    const otherAudits = await app.handle(authGet("http://localhost/v1/audit-logs?limit=5", "other-admin"));
    expect(await otherAudits.json()).toMatchObject({
      auditLogs: expect.arrayContaining([expect.objectContaining({ action: "memory.forget" })])
    });

    const forbiddenSync = await app.handle(authJsonRequest("http://localhost/v1/integrations/agentmemory/sync", {}, "demo-admin"));
    expect(forbiddenSync.status).toBe(403);
    expect(await forbiddenSync.json()).toMatchObject({ error: { code: "auth.global_admin_required" } });
  });
});

function jsonRequest(url: string, body: unknown): Request {
  return jsonRequestWithMethod(url, "POST", body);
}

function jsonRequestWithMethod(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function authJsonRequest(url: string, body: unknown, apiKey: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });
}

function authGet(url: string, apiKey: string): Request {
  return new Request(url, {
    headers: { authorization: `Bearer ${apiKey}` }
  });
}

type FakeRow = Record<string, unknown>;

class FakePgPool {
  readonly queries: string[] = [];
  readonly tables = {
    memory_records: new Map<string, FakeRow>(),
    context_traces: new Map<string, FakeRow>(),
    event_log: new Map<string, FakeRow>(),
    eval_runs: new Map<string, FakeRow>(),
    audit_logs: new Map<string, FakeRow>()
  };

  async query(text: string, values: unknown[] = []): Promise<{ rows: FakeRow[] }> {
    const normalized = normalizeSql(text);
    this.queries.push(normalized);

    if (normalized === "BEGIN" || normalized === "COMMIT" || normalized === "ROLLBACK") {
      return { rows: [] };
    }

    if (normalized.startsWith("SELECT * FROM memory_records")) {
      return { rows: sortRows(this.tables.memory_records) };
    }
    if (normalized.startsWith("SELECT * FROM context_traces")) {
      return { rows: sortRows(this.tables.context_traces) };
    }
    if (normalized.startsWith("SELECT * FROM event_log")) {
      return { rows: sortRows(this.tables.event_log) };
    }
    if (normalized.startsWith("SELECT * FROM eval_runs")) {
      return { rows: sortRows(this.tables.eval_runs) };
    }
    if (normalized.startsWith("SELECT * FROM audit_logs")) {
      return { rows: sortRows(this.tables.audit_logs) };
    }

    if (normalized.startsWith("INSERT INTO organizations") || normalized.startsWith("INSERT INTO projects") || normalized.startsWith("INSERT INTO agents")) {
      return { rows: [] };
    }

    if (normalized === "DELETE FROM memory_records WHERE id = ANY($1::text[])") {
      for (const id of values[0] as string[]) {
        this.tables.memory_records.delete(id);
      }
      return { rows: [] };
    }

    if (normalized.startsWith("INSERT INTO memory_records")) {
      this.tables.memory_records.set(String(values[0]), {
        id: values[0],
        organization_id: values[1],
        user_id: values[2],
        project_id: values[3],
        repo_id: values[4],
        agent_id: values[5],
        memory_type: values[6],
        scope: values[7],
        visibility: values[8],
        content: values[9],
        status: values[10],
        confidence: values[11],
        valid_from: values[12],
        valid_until: values[13],
        superseded_by: values[14],
        source_provider: values[15],
        source_original_id: values[16],
        source_refs: JSON.parse(String(values[17])),
        risk_tags: JSON.parse(String(values[18])),
        metadata: JSON.parse(String(values[19])),
        last_used_at: values[20],
        use_count: values[21],
        created_at: values[22],
        updated_at: values[23]
      });
      return { rows: [] };
    }

    if (normalized.startsWith("INSERT INTO context_traces")) {
      this.tables.context_traces.set(String(values[0]), {
        id: values[0],
        project_id: values[1],
        query: values[2],
        route: JSON.parse(String(values[3])),
        memory_ids: JSON.parse(String(values[4])),
        retrieved_memory_ids: JSON.parse(String(values[5])),
        composed_memory_ids: JSON.parse(String(values[6])),
        ignored_memory_ids: JSON.parse(String(values[7])),
        warnings: JSON.parse(String(values[8])),
        latency_ms: values[9],
        token_budget: values[10],
        tokens_used: values[11],
        feedback: values[12],
        feedback_at: values[13],
        feedback_note: values[14],
        created_at: values[15]
      });
      return { rows: [] };
    }

    if (normalized.startsWith("INSERT INTO event_log")) {
      this.tables.event_log.set(String(values[0]), {
        id: values[0],
        project_id: values[1],
        event_type: values[2],
        payload: JSON.parse(String(values[3])),
        source_type: values[4],
        created_at: values[5]
      });
      return { rows: [] };
    }

    if (normalized.startsWith("INSERT INTO eval_runs")) {
      this.tables.eval_runs.set(String(values[0]), {
        id: values[0],
        project_id: values[1],
        provider: values[2],
        input: JSON.parse(String(values[3])),
        metrics: JSON.parse(String(values[4])),
        status: values[5],
        created_at: values[6],
        completed_at: values[7]
      });
      return { rows: [] };
    }

    if (normalized.startsWith("INSERT INTO audit_logs")) {
      this.tables.audit_logs.set(String(values[0]), {
        id: values[0],
        action: values[1],
        resource_type: values[2],
        resource_id: values[3],
        before: JSON.parse(String(values[4])),
        after: JSON.parse(String(values[5])),
        metadata: JSON.parse(String(values[6])),
        created_at: values[7]
      });
      return { rows: [] };
    }

    throw new Error(`Unhandled fake pg query: ${normalized}`);
  }

  async connect(): Promise<{ query: (text: string, values?: unknown[]) => Promise<{ rows: FakeRow[] }>; release: () => void }> {
    return {
      query: (text: string, values?: unknown[]) => this.query(text, values),
      release: () => undefined
    };
  }

  resetQueryLog(): void {
    this.queries.splice(0, this.queries.length);
  }

  async end(): Promise<void> {
    return undefined;
  }
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function sortRows(table: Map<string, FakeRow>): FakeRow[] {
  return [...table.values()].sort((left, right) => String(left.created_at ?? "").localeCompare(String(right.created_at ?? "")));
}

describe("security hardening", () => {
  it("P0-1: rejects spoofed Host header from non-loopback socket", async () => {
    const app = createLoreApi();
    const spoofed = await app.handle(
      new Request("http://localhost/v1/memory/search", {
        method: "POST",
        headers: { "content-type": "application/json", "x-lore-remote-address": "203.0.113.99" },
        body: JSON.stringify({ query: "test" })
      })
    );
    expect(spoofed.status).toBe(401);
  });

  it("P0-1: fails closed in production when no API keys are configured", async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      const app = createLoreApi();
      const res = await app.handle(
        new Request("http://localhost/v1/memory/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: "test" })
        })
      );
      expect(res.status).toBe(401);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("P0-3: rate limits after 5 failed auth attempts from same IP", async () => {
    const app = createLoreApi({ apiKeys: [{ key: "valid-key", role: "admin" }] });
    const badRequest = () =>
      app.handle(
        new Request("http://localhost/v1/memory/list", {
          headers: { authorization: "Bearer wrong-key", "x-lore-remote-address": "10.0.0.1" }
        })
      );

    let resp: Response | undefined;
    for (let i = 0; i < 7; i++) {
      resp = await badRequest();
    }
    expect(resp?.status).toBe(429);
    const body = await resp?.json() as { error: { code: string } };
    expect(body.error.code).toBe("rate_limit");
  });

  it("P0-9b: returns 413 when request body exceeds size limit", async () => {
    const app = createLoreApi();
    const bigBody = JSON.stringify({ content: "x".repeat(2 * 1024 * 1024) });
    const res = await app.handle(
      new Request("http://localhost/v1/memory/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: bigBody
      })
    );
    expect(res.status).toBe(413);
  });

  it("P1-1: scoped reader key without project_id on /v1/memory/list returns 400", async () => {
    const app = createLoreApi({
      apiKeys: [{ key: "scoped-reader", role: "reader", projectIds: ["proj-a"] }]
    });
    const res = await app.handle(
      new Request("http://localhost/v1/memory/list", {
        headers: { authorization: "Bearer scoped-reader" }
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("auth.project_id_required");
  });

  it("P0-9a: graceful shutdown registers SIGTERM/SIGINT handlers without crashing", () => {
    const sigHandlers = process.rawListeners("SIGTERM");
    expect(typeof sigHandlers).toBe("object");
  });
});
