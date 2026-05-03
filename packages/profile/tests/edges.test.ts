import { describe, expect, it } from "vitest";
import { groupEdgesByRelation, inferEdges } from "../src/index.js";
import { activeMemory, FROZEN_NOW } from "./fixtures.js";

describe("inferEdges", () => {
  it("emits a duplicates edge for identical content", () => {
    const a = activeMemory("I prefer pnpm over npm");
    const b = activeMemory("I prefer pnpm over npm", { id: "mem_dup_2" });
    const edges = inferEdges({ next: b, candidates: [a], now: FROZEN_NOW });
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ relation: "duplicates", fromMemoryId: b.id, toMemoryId: a.id });
  });

  it("emits supersedes when corrective negation arrives", () => {
    const a = activeMemory("I prefer tabs for indentation");
    const b = activeMemory("Actually I do not prefer tabs for indentation", { id: "mem_b" });
    const edges = inferEdges({ next: b, candidates: [a], now: FROZEN_NOW });
    expect(edges).toHaveLength(1);
    expect(edges[0].relation).toBe("supersedes");
  });

  it("emits contradicts for polarity flip without correction marker", () => {
    const a = activeMemory("we deploy from main branch");
    const b = activeMemory("we do not deploy from main branch", { id: "mem_b" });
    const edges = inferEdges({ next: b, candidates: [a], now: FROZEN_NOW });
    expect(edges).toHaveLength(1);
    expect(edges[0].relation).toBe("contradicts");
  });

  it("emits updates for a correction marker on shared core without polarity flip", () => {
    const a = activeMemory("staging database is on host db1.example.com");
    const b = activeMemory("Update: staging database is on host db1.example.com new", { id: "mem_b" });
    const edges = inferEdges({ next: b, candidates: [a], now: FROZEN_NOW });
    expect(edges.some((e) => e.relation === "updates")).toBe(true);
  });

  it("ignores memories of different memoryType", () => {
    const a = activeMemory("we deploy from main", { memoryType: "project_rule" });
    const b = activeMemory("we deploy from main", { id: "mem_b", memoryType: "preference" });
    const edges = inferEdges({ next: b, candidates: [a], now: FROZEN_NOW });
    expect(edges).toHaveLength(0);
  });

  it("ignores memories without significant token overlap", () => {
    const a = activeMemory("the database engine is Postgres");
    const b = activeMemory("the deployment provider is Cloudflare", { id: "mem_b" });
    const edges = inferEdges({ next: b, candidates: [a], now: FROZEN_NOW });
    expect(edges).toHaveLength(0);
  });
});

describe("groupEdgesByRelation", () => {
  it("buckets edges by relation key", () => {
    const a = activeMemory("we deploy from main");
    const b = activeMemory("we do not deploy from main", { id: "mem_b" });
    const c = activeMemory("we deploy from main", { id: "mem_c" });
    const edges = [
      ...inferEdges({ next: b, candidates: [a], now: FROZEN_NOW }),
      ...inferEdges({ next: c, candidates: [a], now: FROZEN_NOW })
    ];
    const grouped = groupEdgesByRelation(edges);
    expect(grouped.contradicts.length + grouped.duplicates.length).toBeGreaterThan(0);
  });
});
