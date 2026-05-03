import { describe, expect, it } from "vitest";
import {
  applyUserEdit,
  buildEmptyProfile,
  placeItem,
  regenerateProfile,
  softDeleteItem
} from "../src/index.js";
import { FROZEN_NOW, profileItem } from "./fixtures.js";

describe("placeItem", () => {
  it("buckets identity into static", () => {
    const profile = buildEmptyProfile("v1", FROZEN_NOW);
    const next = placeItem(profile, profileItem({ type: "identity", value: "name: Avery" }), FROZEN_NOW);
    expect(next.static).toHaveLength(1);
    expect(next.dynamic).toHaveLength(0);
  });

  it("buckets active_context into dynamic", () => {
    const profile = buildEmptyProfile("v1", FROZEN_NOW);
    const next = placeItem(profile, profileItem({ type: "active_context", value: "v0.8 sprint" }), FROZEN_NOW);
    expect(next.dynamic).toHaveLength(1);
    expect(next.static).toHaveLength(0);
  });

  it("creates a project profile when projectId metadata is set", () => {
    const profile = buildEmptyProfile("v1", FROZEN_NOW);
    const item = profileItem({
      type: "constraint",
      value: "do not push to main",
      metadata: { projectId: "proj-x", repoFingerprint: "redland01/bravon" }
    });
    const next = placeItem(profile, item, FROZEN_NOW);
    expect(next.projects).toHaveLength(1);
    expect(next.projects[0].projectId).toBe("proj-x");
    expect(next.projects[0].repoFingerprint).toBe("redland01/bravon");
  });
});

describe("applyUserEdit", () => {
  it("marks item as user-edited", () => {
    const profile = placeItem(
      buildEmptyProfile("v1", FROZEN_NOW),
      profileItem({ id: "pi-1", type: "preference", value: "I prefer pnpm" }),
      FROZEN_NOW
    );
    const result = applyUserEdit(profile, "pi-1", { value: "I prefer bun" }, { reason: "user changed mind", now: FROZEN_NOW });
    expect(result.item.value).toBe("I prefer bun");
    expect((result.item.metadata as Record<string, unknown>).userEdited).toBe(true);
    expect(result.auditNote).toMatch(/user changed mind/);
  });

  it("throws when item id is unknown", () => {
    const profile = buildEmptyProfile("v1", FROZEN_NOW);
    expect(() => applyUserEdit(profile, "missing", { value: "x" })).toThrow(/not found/);
  });
});

describe("softDeleteItem", () => {
  it("flips status to deleted and marks user-edited", () => {
    const profile = placeItem(
      buildEmptyProfile("v1", FROZEN_NOW),
      profileItem({ id: "pi-1", type: "preference", value: "old" }),
      FROZEN_NOW
    );
    const result = softDeleteItem(profile, "pi-1", { reason: "wrong", now: FROZEN_NOW });
    expect(result.item.status).toBe("deleted");
    expect((result.item.metadata as Record<string, unknown>).userEdited).toBe(true);
  });
});

describe("regenerateProfile", () => {
  it("preserves user-edited items and merges generated others", () => {
    const edited = profileItem({
      id: "pi-edited",
      type: "preference",
      value: "I prefer bun",
      metadata: { userEdited: true }
    });
    const stale = profileItem({ id: "pi-stale", type: "workflow", value: "I always use TDD" });
    const profile = placeItem(placeItem(buildEmptyProfile("v1", FROZEN_NOW), edited, FROZEN_NOW), stale, FROZEN_NOW);

    const generated = [
      profileItem({ id: "pi-gen-1", type: "preference", value: "I prefer pnpm" }),
      profileItem({ id: "pi-gen-2", type: "active_context", value: "v0.8 sprint" })
    ];

    const next = regenerateProfile({ current: profile, generated, now: FROZEN_NOW });
    expect(next.static.find((i) => i.id === "pi-edited")).toBeTruthy();
    expect(next.static.find((i) => i.value === "I prefer pnpm")).toBeTruthy();
    expect(next.dynamic.find((i) => i.value === "v0.8 sprint")).toBeTruthy();
    expect(next.static.find((i) => i.id === "pi-stale")).toBeFalsy();
  });

  it("does not let generation re-create a value the user already edited away", () => {
    const edited = profileItem({
      id: "pi-edited",
      type: "preference",
      value: "I prefer bun",
      metadata: { userEdited: true }
    });
    const profile = placeItem(buildEmptyProfile("v1", FROZEN_NOW), edited, FROZEN_NOW);
    const generated = [profileItem({ id: "pi-gen-dupe", type: "preference", value: "I prefer bun" })];
    const next = regenerateProfile({ current: profile, generated, now: FROZEN_NOW });
    const matches = next.static.filter((i) => i.value.toLowerCase() === "i prefer bun");
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe("pi-edited");
  });
});
