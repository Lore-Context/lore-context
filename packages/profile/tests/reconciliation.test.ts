import { describe, expect, it } from "vitest";
import { expireTemporaryItems, reconcileProfileItems } from "../src/index.js";
import { FROZEN_NOW, profileItem } from "./fixtures.js";

describe("reconcileProfileItems - duplicate merge", () => {
  it("merges duplicate values into a single item with combined source ids", () => {
    const a = profileItem({ type: "preference", value: "I prefer pnpm.", sourceMemoryIds: ["m1"] });
    const b = profileItem({ type: "preference", value: "I prefer pnpm.", sourceMemoryIds: ["m2"], updatedAt: "2026-04-30T12:30:00.000Z" });
    const result = reconcileProfileItems([a], [b], { now: FROZEN_NOW });
    expect(result.merged).toHaveLength(1);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0].sourceMemoryIds.sort()).toEqual(["m1", "m2"]);
  });
});

describe("reconcileProfileItems - supersession", () => {
  it("supersedes a prior preference when a correction arrives", () => {
    const old = profileItem({
      type: "preference",
      value: "I prefer tabs for indentation.",
      sourceMemoryIds: ["m1"],
      updatedAt: "2026-04-29T10:00:00.000Z"
    });
    const next = profileItem({
      type: "preference",
      value: "Actually, I prefer 2-space indentation now.",
      sourceMemoryIds: ["m2"],
      updatedAt: "2026-04-30T11:00:00.000Z"
    });
    const result = reconcileProfileItems([old], [next], { now: FROZEN_NOW });
    expect(result.superseded).toHaveLength(1);
    expect(result.superseded[0].previous.status).toBe("superseded");
    expect(result.kept.find((i) => i.id === next.id)).toBeTruthy();
  });

  it("supersedes via direct negation when values are opposites", () => {
    const a = profileItem({
      type: "constraint",
      value: "do not push to main",
      sourceMemoryIds: ["m1"],
      updatedAt: "2026-04-29T00:00:00.000Z"
    });
    const b = profileItem({
      type: "constraint",
      value: "push to main",
      sourceMemoryIds: ["m2"],
      updatedAt: "2026-04-30T00:00:00.000Z"
    });
    const result = reconcileProfileItems([a], [b], { now: FROZEN_NOW });
    expect(result.superseded.length + result.contradictions.length).toBeGreaterThan(0);
  });
});

describe("expireTemporaryItems", () => {
  it("expires items past validUntil", () => {
    const expired = profileItem({
      type: "active_context",
      value: "review migration today",
      validUntil: "2026-04-29T00:00:00.000Z"
    });
    const fresh = profileItem({
      type: "active_context",
      value: "v0.7 cloud sprint",
      validUntil: "2026-05-30T00:00:00.000Z"
    });
    const result = expireTemporaryItems([expired, fresh], FROZEN_NOW);
    expect(result.expired.map((i) => i.id)).toContain(expired.id);
    expect(result.active.map((i) => i.id)).toContain(fresh.id);
  });
});

describe("reconcileProfileItems - contradiction flagging", () => {
  it("flags contradictions when two active workflows oppose each other and neither is a correction", () => {
    const a = profileItem({
      type: "workflow",
      value: "I always use TDD.",
      updatedAt: "2026-04-29T00:00:00.000Z"
    });
    const b = profileItem({
      type: "workflow",
      value: "I never use TDD.",
      updatedAt: "2026-04-29T00:00:01.000Z"
    });
    const result = reconcileProfileItems([a], [b], { now: FROZEN_NOW });
    expect(result.superseded.length + result.contradictions.length).toBeGreaterThan(0);
  });
});
