import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Local scanner state. The scanner discovers session files repeatedly (CLI
// runs, daemon ticks, Stop hook follow-ups). Without state, an unchanged
// transcript would re-upload — wasting cost and risking duplicate memories
// even though the cloud dedups by idempotency key.
//
// Storage: a single JSON file under `~/.lore/scanner-state.json`. Format is
// versioned so future upgrades can do a migration without losing dedup.

export interface ScannerStateEntry {
  // Identity used for cloud dedup. Same key the cloud sees on
  // `POST /v1/capture/sessions`.
  idempotencyKey: string;
  // Local origin info kept so operator-facing tools can map back to a file.
  sourcePath?: string;
  uploadedAt: string;
  // Optional remote ids returned by the cloud. Keep them for audit/debug.
  cloudSessionId?: string;
  cloudJobId?: string;
}

interface ScannerStateFile {
  version: 1;
  entries: Record<string, ScannerStateEntry>;
}

export function defaultScannerStatePath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, ".lore", "scanner-state.json");
}

export class ScannerState {
  private readonly filePath: string;
  private cache: ScannerStateFile = { version: 1, entries: {} };
  private loaded = false;

  constructor(filePath?: string) {
    this.filePath = filePath ?? defaultScannerStatePath();
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as ScannerStateFile;
      if (parsed && typeof parsed === "object" && parsed.version === 1 && parsed.entries) {
        this.cache = parsed;
      }
    } catch {
      // Missing or corrupt file is treated as empty state — corruption never
      // blocks capture, and the cloud will dedup on its end anyway.
      this.cache = { version: 1, entries: {} };
    }
    this.loaded = true;
  }

  has(idempotencyKey: string): boolean {
    return this.cache.entries[idempotencyKey] !== undefined;
  }

  get(idempotencyKey: string): ScannerStateEntry | undefined {
    return this.cache.entries[idempotencyKey];
  }

  list(): ScannerStateEntry[] {
    return Object.values(this.cache.entries);
  }

  // Mark a session as uploaded. Caller is expected to have actually completed
  // the cloud round trip before calling this (or to have intentionally chosen
  // to mark it without confirmation, e.g. in a dry-run).
  async record(entry: ScannerStateEntry): Promise<void> {
    if (!this.loaded) await this.load();
    this.cache.entries[entry.idempotencyKey] = entry;
    await this.persist();
  }

  // Forget an entry — used when the cloud explicitly tells us a session is
  // no longer present (delete vault, delete source) so a future scan re-uploads
  // if the user opts back in.
  async forget(idempotencyKey: string): Promise<void> {
    if (!this.loaded) await this.load();
    delete this.cache.entries[idempotencyKey];
    await this.persist();
  }

  private async persist(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    // Atomic write: temp file + rename so a crash mid-write does not corrupt.
    const tmp = `${this.filePath}.tmp-${process.pid}`;
    await writeFile(tmp, JSON.stringify(this.cache, null, 2), "utf-8");
    await rename(tmp, this.filePath);
  }
}
