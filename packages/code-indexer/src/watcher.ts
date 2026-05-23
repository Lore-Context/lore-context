/**
 * File watcher — chokidar wrapper with 500ms debounce + backpressure.
 *
 * Lane U U2: coalesces 10+ file-changes-per-second bursts into ≤3 upsert-calls-per-second.
 * Strategy: collect changed files into a pending set, flush on a 500ms trailing
 * debounce, but also flush at most once every 333ms (≈3/s) when under sustained load.
 *
 * Exports: WatcherOptions, FileWatcher class with start() / stop().
 */

import { watch as chokidarWatch } from "chokidar";
import type { FSWatcher } from "chokidar";

export interface WatcherOptions {
  /** Root directory to watch. */
  rootDir: string;
  /** Additional glob patterns to ignore (on top of .gitignore). */
  ignored?: string[];
  /** Debounce window in ms (default: 500). */
  debounceMs?: number;
  /** Minimum interval between flush callbacks in ms (default: 333 = ≤3/s). */
  minFlushIntervalMs?: number;
  /** Callback invoked with a batch of changed absolute file paths. */
  onBatch: (paths: string[]) => void | Promise<void>;
}

/**
 * Chokidar-based file watcher with debounce + flush-rate limiting.
 *
 * U2 invariant: at most 3 onBatch calls per second under sustained load.
 */
export class FileWatcher {
  private readonly _opts: Required<Omit<WatcherOptions, "ignored">> & {
    ignored: string[];
  };
  private _watcher: FSWatcher | null = null;
  private _pendingPaths = new Set<string>();
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastFlushAt = 0;

  constructor(opts: WatcherOptions) {
    this._opts = {
      rootDir: opts.rootDir,
      ignored: opts.ignored ?? [],
      debounceMs: opts.debounceMs ?? 500,
      minFlushIntervalMs: opts.minFlushIntervalMs ?? 333,
      onBatch: opts.onBatch,
    };
  }

  /** Start watching. */
  start(): void {
    if (this._watcher) return;

    this._watcher = chokidarWatch(this._opts.rootDir, {
      ignored: [
        /(^|[/\\])\../, // dotfiles
        /node_modules/,
        /\.git/,
        /dist/,
        /build/,
        ...this._opts.ignored,
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    const handleChange = (path: string): void => {
      this._pendingPaths.add(path);
      this._scheduleFlush();
    };

    this._watcher
      .on("add", handleChange)
      .on("change", handleChange)
      .on("unlink", handleChange);
  }

  /** Stop watching and cancel any pending flush. */
  stop(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (this._watcher) {
      void this._watcher.close();
      this._watcher = null;
    }
    this._pendingPaths.clear();
  }

  private _scheduleFlush(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this._flush();
    }, this._opts.debounceMs);
  }

  private _flush(): void {
    if (this._pendingPaths.size === 0) return;

    const now = Date.now();
    const elapsed = now - this._lastFlushAt;

    if (elapsed < this._opts.minFlushIntervalMs) {
      // Too soon — reschedule after the remaining wait time
      const wait = this._opts.minFlushIntervalMs - elapsed;
      this._debounceTimer = setTimeout(() => {
        this._flush();
      }, wait);
      return;
    }

    this._lastFlushAt = now;
    const batch = Array.from(this._pendingPaths);
    this._pendingPaths.clear();
    this._debounceTimer = null;

    // Fire-and-forget; errors bubble up to caller's onBatch
    Promise.resolve(this._opts.onBatch(batch)).catch((err) => {
      console.error("[code-indexer] watcher onBatch error:", err);
    });
  }
}
