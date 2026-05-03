import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScannerState } from "../src/scanner-state.js";

describe("ScannerState", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "lore-scanner-state-"));
    file = path.join(dir, "scanner-state.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("starts empty when no state file exists", async () => {
    const state = new ScannerState(file);
    await state.load();
    expect(state.has("anything")).toBe(false);
    expect(state.list()).toEqual([]);
  });

  it("records, recalls, and forgets entries", async () => {
    const state = new ScannerState(file);
    await state.record({ idempotencyKey: "k1", uploadedAt: "2026-04-30T00:00:00Z", cloudJobId: "job_1" });
    expect(state.has("k1")).toBe(true);
    expect(state.get("k1")?.cloudJobId).toBe("job_1");

    // Recreate to confirm persistence.
    const reloaded = new ScannerState(file);
    await reloaded.load();
    expect(reloaded.has("k1")).toBe(true);

    await reloaded.forget("k1");
    expect(reloaded.has("k1")).toBe(false);

    const reloaded2 = new ScannerState(file);
    await reloaded2.load();
    expect(reloaded2.has("k1")).toBe(false);
  });

  it("treats a corrupt state file as empty (capture must never block)", async () => {
    await writeFile(file, "{not-json", "utf-8");
    const state = new ScannerState(file);
    await state.load();
    expect(state.list()).toEqual([]);
    // First record after corruption should still persist cleanly.
    await state.record({ idempotencyKey: "k2", uploadedAt: "2026-04-30T00:00:00Z" });
    const written = JSON.parse(await readFile(file, "utf-8"));
    expect(written.entries.k2.idempotencyKey).toBe("k2");
  });
});
