/**
 * watcher.test.ts
 *
 * U2 verification: fake-timer test — 10 file changes in 1s → ≤3 upsert callbacks.
 *
 * Uses vitest fake timers to simulate the passage of time without actual I/O.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FileWatcher } from "../src/watcher.js";

describe("FileWatcher backpressure (U2)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("10 file changes in 1s → ≤3 batch callbacks", async () => {
    const batchCallCount = { value: 0 };
    const batchTimes: number[] = [];

    // Create watcher with tight timing for the test
    const watcher = new FileWatcher({
      rootDir: "/fake/path",
      debounceMs: 500,
      minFlushIntervalMs: 333,
      onBatch: (paths) => {
        batchCallCount.value++;
        batchTimes.push(Date.now());
      },
    });

    // Manually trigger 10 file changes by calling the internal _pendingPaths
    // Since we're using fake timers, we simulate by adding paths and calling _scheduleFlush
    // We access the private methods through a test-friendly approach:
    // We'll use the public API and fake timers to simulate chokidar events.

    // Simulate 10 rapid file events by directly manipulating pending state
    // via the internal _pendingPaths Set and _scheduleFlush
    const w = watcher as unknown as {
      _pendingPaths: Set<string>;
      _scheduleFlush(): void;
    };

    // Add 10 "changed" files within a 1-second burst
    for (let i = 0; i < 10; i++) {
      w._pendingPaths.add(`/fake/path/file${i}.ts`);
    }
    w._scheduleFlush();

    // Advance time by 500ms (debounce fires)
    await vi.advanceTimersByTimeAsync(500);

    // At this point one batch should have fired
    expect(batchCallCount.value).toBeLessThanOrEqual(3);
    expect(batchCallCount.value).toBeGreaterThanOrEqual(1);

    // Add 10 more changes immediately after
    for (let i = 10; i < 20; i++) {
      w._pendingPaths.add(`/fake/path/file${i}.ts`);
    }
    w._scheduleFlush();

    // Advance 500ms more
    await vi.advanceTimersByTimeAsync(500);

    // Total callbacks still should be ≤3 per second
    // (the second batch may or may not fire depending on timing)
    expect(batchCallCount.value).toBeLessThanOrEqual(3);
  });

  it("respects minFlushIntervalMs — does not flush faster than 3/s", async () => {
    const batchCallCount = { value: 0 };

    const watcher = new FileWatcher({
      rootDir: "/fake/path",
      debounceMs: 100,
      minFlushIntervalMs: 333, // ≤3 per second
      onBatch: () => {
        batchCallCount.value++;
      },
    });

    const w = watcher as unknown as {
      _pendingPaths: Set<string>;
      _scheduleFlush(): void;
    };

    // Simulate rapid-fire changes (new batch every 100ms)
    for (let round = 0; round < 10; round++) {
      w._pendingPaths.add(`/fake/path/file${round}.ts`);
      w._scheduleFlush();
      await vi.advanceTimersByTimeAsync(100);
    }

    // After 1000ms of 100ms-interval triggers, we should have ≤3 flushes
    expect(batchCallCount.value).toBeLessThanOrEqual(3);
  });

  it("stop() cancels pending timers", async () => {
    const batchCallCount = { value: 0 };

    const watcher = new FileWatcher({
      rootDir: "/fake/path",
      debounceMs: 500,
      minFlushIntervalMs: 333,
      onBatch: () => {
        batchCallCount.value++;
      },
    });

    const w = watcher as unknown as {
      _pendingPaths: Set<string>;
      _scheduleFlush(): void;
    };

    w._pendingPaths.add("/fake/path/file.ts");
    w._scheduleFlush();

    // Stop before timer fires
    watcher.stop();

    // Advance time — should NOT fire
    await vi.advanceTimersByTimeAsync(1000);

    expect(batchCallCount.value).toBe(0);
  });
});
