import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  CAPTURE_REDACTION_VERSION,
  parseClaudeCodeJsonlFile,
  parseCodexSessionFile,
  parseCursorSessionFile,
  providerToWire,
  scanClaudeCode,
  scanCodex,
  scanCursor,
  scanQwen,
  ScannerState,
  toWireSession,
  type CapturedSessionV08,
  type CaptureProvider,
  type DiscoveredSource
} from "@lore/capture";

// v0.9 Lane B — Universal Session Watcher.
//
// Goals (v0.9 plan §4.4):
//   - autodetect Claude Code / Codex / Cursor / Qwen-OpenCode at startup;
//   - per-source checkpoints survive restarts and dedup across reruns;
//   - delta upload only (newer-than-checkpoint files);
//   - paused / private_mode sources are enforced locally and never upload;
//   - network retry/backoff happens before the cloud-side queue;
//   - status surfaces watching, last upload, last error, captured today,
//     pending review.
//
// This module is mockable: callers pass a `LoreClient` (heartbeat +
// ingestSession) so tests run without network, and Lane A can plug a real
// fetch impl later without touching watcher logic.

export type WatcherProvider = "claude-code" | "codex" | "cursor" | "opencode";

export interface WatcherRuntime {
  homeDir: string;
  now: () => Date;
}

export interface WatcherSourcePolicy {
  // Status as known by the cloud / dashboard. The watcher never overrides
  // user intent: paused / private_mode short-circuits before parse.
  status: "active" | "paused" | "private_mode" | "revoked" | "error";
  // Vault setting; watcher refuses to ship raw archive without it.
  rawArchiveEnabled?: boolean;
}

export interface IngestSessionInput {
  session: CapturedSessionV08;
  sourceProvider: WatcherProvider;
  sourcePath: string;
}

export interface IngestSessionResult {
  sessionId: string;
  jobId: string;
  duplicate: boolean;
}

export interface HeartbeatInput {
  sourceId: string;
  provider: WatcherProvider;
  status: "active" | "missing" | "error" | "paused" | "private_mode";
  discovered: number;
  lastError?: string | null;
  metadata?: Record<string, unknown>;
}

export interface LoreClient {
  // Returns the cloud's policy for this source so the watcher can enforce
  // pause / private_mode without uploading first. Returning undefined =
  // unknown; the watcher defaults to "active" for fresh sources.
  getSourcePolicy(sourceId: string): Promise<WatcherSourcePolicy | undefined>;
  heartbeat(input: HeartbeatInput): Promise<void>;
  ingestSession(input: IngestSessionInput): Promise<IngestSessionResult>;
}

export interface WatcherCheckpointEntry {
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  // SHA-256-ish suffix from the canonical idempotency key. Saved so we can
  // skip re-parsing/uploading even if the file is rewritten with the same
  // content (atomic editors can bump mtime without changing bytes).
  idempotencyKey?: string;
  uploadedAt?: string;
  lastError?: string;
  attempts?: number;
}

export interface WatcherCounters {
  capturedToday: number;
  uploadedToday: number;
  failedToday: number;
  pendingReview: number;
  // Last successful or failed upload; null if the watcher never ran.
  lastUploadAt: string | null;
  lastUploadError: string | null;
  watching: WatcherProvider[];
  connectedSources: number;
  // Exact ISO date the counters apply to ("today" rolls over on this date).
  countersDate: string;
}

export interface WatcherTickResult {
  uploads: Array<{ provider: WatcherProvider; sourcePath: string; sessionId: string; jobId: string; duplicate: boolean }>;
  failures: Array<{ provider: WatcherProvider; sourcePath: string; error: string; attempts: number }>;
  skipped: Array<{ provider: WatcherProvider; sourcePath: string; reason: string }>;
  counters: WatcherCounters;
}

export interface RunWatchTickOptions {
  runtime: WatcherRuntime;
  client: LoreClient;
  // Identity context for envelope construction.
  vaultId: string;
  deviceId: string;
  // Source-id mapping per provider. Defaults to `src_<provider>` so the cloud
  // can register a single capture_source per agent type per device.
  sourceIdFor?: (provider: WatcherProvider) => string;
  // Override scanner roots (testing, temp HOME smoke).
  scanOverrides?: {
    claudeCodeRoot?: string;
    codexRoots?: string[];
    cursorRoots?: string[];
    qwenRoots?: string[];
  };
  // Cap parsed/uploaded files per tick to keep memory bounded.
  maxFilesPerTick?: number;
  // Retry policy for in-tick upload attempts.
  retry?: { maxAttempts?: number; baseDelayMs?: number; capDelayMs?: number };
}

export interface RunWatchLoopOptions extends RunWatchTickOptions {
  intervalMs?: number;
  signal?: AbortSignal;
  onTick?: (result: WatcherTickResult) => void;
}

const DEFAULT_MAX_FILES_PER_TICK = 32;
const DEFAULT_RETRY = { maxAttempts: 4, baseDelayMs: 500, capDelayMs: 30_000 };
// rc.2 Lane D: cursor moves into the parseable set so the watcher can satisfy
// the "two real auto-capture clients" acceptance criterion (plan §Lane 3).
// OpenCode/Qwen remain discovery-only until their parser stabilizes.
const PROVIDERS_PARSEABLE: WatcherProvider[] = ["claude-code", "codex", "cursor"];
const PROVIDERS_DISCOVERY_ONLY: WatcherProvider[] = ["opencode"];
const ALL_PROVIDERS: WatcherProvider[] = [...PROVIDERS_PARSEABLE, ...PROVIDERS_DISCOVERY_ONLY];

export function defaultSourceIdFor(provider: WatcherProvider): string {
  return `src_${provider}`;
}

export function watcherDirs(runtime: WatcherRuntime): {
  loreDir: string;
  checkpointsDir: string;
  watcherStatePath: string;
  scannerStatePath: string;
  sourceStatusPath: string;
} {
  const loreDir = join(runtime.homeDir, ".lore");
  return {
    loreDir,
    checkpointsDir: join(loreDir, "checkpoints"),
    watcherStatePath: join(loreDir, "watcher-state.json"),
    scannerStatePath: join(loreDir, "scanner-state.json"),
    sourceStatusPath: join(loreDir, "source-status.json")
  };
}

export function loadCheckpoints(runtime: WatcherRuntime, provider: WatcherProvider): Map<string, WatcherCheckpointEntry> {
  const file = join(watcherDirs(runtime).checkpointsDir, `${provider}.json`);
  const map = new Map<string, WatcherCheckpointEntry>();
  if (!existsSync(file)) return map;
  try {
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as { entries?: WatcherCheckpointEntry[] };
    for (const entry of parsed.entries ?? []) {
      if (entry && typeof entry.path === "string") map.set(entry.path, entry);
    }
  } catch {
    // Corrupt checkpoint file is treated as empty. The cloud's
    // idempotencyKey gate keeps duplicates from re-uploading even when this
    // happens.
  }
  return map;
}

export function saveCheckpoints(
  runtime: WatcherRuntime,
  provider: WatcherProvider,
  entries: Map<string, WatcherCheckpointEntry>
): void {
  const dir = watcherDirs(runtime).checkpointsDir;
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${provider}.json`);
  writeAtomicJson(file, { version: 1, entries: [...entries.values()] });
}

export function loadWatcherCounters(runtime: WatcherRuntime): WatcherCounters {
  const file = watcherDirs(runtime).watcherStatePath;
  const today = runtime.now().toISOString().slice(0, 10);
  if (!existsSync(file)) return emptyCounters(today);
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<WatcherCounters> & { countersDate?: string };
    if (parsed.countersDate !== today) {
      // New day — preserve last upload pointers but zero today's tallies.
      return {
        ...emptyCounters(today),
        lastUploadAt: parsed.lastUploadAt ?? null,
        lastUploadError: parsed.lastUploadError ?? null,
        watching: Array.isArray(parsed.watching) ? (parsed.watching as WatcherProvider[]) : [],
        connectedSources: parsed.connectedSources ?? 0
      };
    }
    return {
      ...emptyCounters(today),
      ...parsed,
      countersDate: today,
      watching: Array.isArray(parsed.watching) ? (parsed.watching as WatcherProvider[]) : []
    };
  } catch {
    return emptyCounters(today);
  }
}

export function saveWatcherCounters(runtime: WatcherRuntime, counters: WatcherCounters): void {
  writeAtomicJson(watcherDirs(runtime).watcherStatePath, counters);
}

function emptyCounters(date: string): WatcherCounters {
  return {
    capturedToday: 0,
    uploadedToday: 0,
    failedToday: 0,
    pendingReview: 0,
    lastUploadAt: null,
    lastUploadError: null,
    watching: [],
    connectedSources: 0,
    countersDate: date
  };
}

export async function discoverByProvider(opts: RunWatchTickOptions): Promise<Record<WatcherProvider, DiscoveredSource[]>> {
  const overrides = opts.scanOverrides ?? {};
  const [claude, codex, cursor, opencode] = await Promise.all([
    scanClaudeCode({ claudeCodeRoot: overrides.claudeCodeRoot }),
    scanCodex({ codexRoots: overrides.codexRoots }),
    scanCursor({ cursorRoots: overrides.cursorRoots }),
    scanQwen({ qwenRoots: overrides.qwenRoots })
  ]);
  return {
    "claude-code": claude,
    codex,
    cursor,
    opencode
  };
}

// One pass: discover, filter to deltas via checkpoints, parse parseable
// providers, decide upload, retry/backoff per file, persist checkpoints +
// counters. Returns a structured tick result so tests / `lore status` can
// reason about the outcome.
export async function runWatchTick(opts: RunWatchTickOptions): Promise<WatcherTickResult> {
  const runtime = opts.runtime;
  const sourceIdFor = opts.sourceIdFor ?? defaultSourceIdFor;
  const maxFiles = opts.maxFilesPerTick ?? DEFAULT_MAX_FILES_PER_TICK;
  const retry = { ...DEFAULT_RETRY, ...(opts.retry ?? {}) };

  const result: WatcherTickResult = {
    uploads: [],
    failures: [],
    skipped: [],
    counters: loadWatcherCounters(runtime)
  };
  const today = runtime.now().toISOString().slice(0, 10);
  if (result.counters.countersDate !== today) {
    const last = result.counters;
    result.counters = { ...emptyCounters(today), lastUploadAt: last.lastUploadAt, lastUploadError: last.lastUploadError, connectedSources: last.connectedSources };
  }

  const scannerState = new ScannerState(watcherDirs(runtime).scannerStatePath);
  await scannerState.load();

  const discovered = await discoverByProvider(opts);
  const watching: WatcherProvider[] = [];
  let connected = 0;

  for (const provider of ALL_PROVIDERS) {
    const sources = discovered[provider];
    if (sources.length > 0) {
      watching.push(provider);
      connected += 1;
    }

    const sourceId = sourceIdFor(provider);
    const policy = await safe(() => opts.client.getSourcePolicy(sourceId));
    const effectiveStatus = policy?.status ?? "active";

    // Heartbeat regardless of pause / private — the cloud uses heartbeats to
    // surface "still alive" in the dashboard even when uploads are skipped.
    await safe(() => opts.client.heartbeat({
      sourceId,
      provider,
      status: sources.length === 0 ? "missing" : effectiveStatus === "paused" ? "paused" : effectiveStatus === "private_mode" ? "private_mode" : "active",
      discovered: sources.length
    }));

    if (effectiveStatus === "paused" || effectiveStatus === "private_mode" || effectiveStatus === "revoked") {
      for (const file of sources) {
        result.skipped.push({ provider, sourcePath: file.path, reason: `source ${effectiveStatus}` });
      }
      continue;
    }

    if (PROVIDERS_DISCOVERY_ONLY.includes(provider)) {
      // Cursor/OpenCode parsers not yet stable (plan §4.4). We register the
      // source via heartbeat above and stop short of upload.
      for (const file of sources) {
        result.skipped.push({ provider, sourcePath: file.path, reason: "parser not yet implemented" });
      }
      continue;
    }

    const checkpoints = loadCheckpoints(runtime, provider);
    const deltas = filterDeltas(sources, checkpoints).slice(0, maxFiles);

    for (const file of deltas) {
      try {
        const parseResult = await parseFile(provider, file.path);
        const session = toWireSession(parseResult.session, {
          vaultId: opts.vaultId,
          deviceId: opts.deviceId,
          sourceId,
          rawArchive: policy?.rawArchiveEnabled ?? false,
          redactionVersion: CAPTURE_REDACTION_VERSION
        });

        if (scannerState.has(session.idempotencyKey)) {
          // The cloud already accepted this content; stamp the checkpoint so
          // future scans skip the file entirely.
          checkpoints.set(file.path, {
            path: file.path,
            sizeBytes: file.sizeBytes,
            modifiedAt: file.modifiedAt,
            idempotencyKey: session.idempotencyKey,
            uploadedAt: scannerState.get(session.idempotencyKey)?.uploadedAt ?? runtime.now().toISOString(),
            attempts: 0
          });
          result.skipped.push({ provider, sourcePath: file.path, reason: "already uploaded (idempotency)" });
          continue;
        }

        const uploadResult = await retryUpload(() => opts.client.ingestSession({ session, sourceProvider: provider, sourcePath: file.path }), retry);
        await scannerState.record({
          idempotencyKey: session.idempotencyKey,
          sourcePath: file.path,
          uploadedAt: runtime.now().toISOString(),
          cloudSessionId: uploadResult.sessionId,
          cloudJobId: uploadResult.jobId
        });
        checkpoints.set(file.path, {
          path: file.path,
          sizeBytes: file.sizeBytes,
          modifiedAt: file.modifiedAt,
          idempotencyKey: session.idempotencyKey,
          uploadedAt: runtime.now().toISOString(),
          attempts: 0
        });
        result.uploads.push({ provider, sourcePath: file.path, sessionId: uploadResult.sessionId, jobId: uploadResult.jobId, duplicate: uploadResult.duplicate });
        result.counters.capturedToday += 1;
        result.counters.uploadedToday += 1;
        result.counters.lastUploadAt = runtime.now().toISOString();
        result.counters.lastUploadError = null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const prev = checkpoints.get(file.path);
        const attempts = (prev?.attempts ?? 0) + 1;
        checkpoints.set(file.path, {
          path: file.path,
          sizeBytes: file.sizeBytes,
          modifiedAt: file.modifiedAt,
          idempotencyKey: prev?.idempotencyKey,
          uploadedAt: prev?.uploadedAt,
          lastError: message,
          attempts
        });
        result.failures.push({ provider, sourcePath: file.path, error: message, attempts });
        result.counters.failedToday += 1;
        result.counters.lastUploadError = message;
      }
    }

    saveCheckpoints(runtime, provider, checkpoints);
  }

  result.counters.watching = watching;
  result.counters.connectedSources = connected;
  saveWatcherCounters(runtime, result.counters);
  return result;
}

export async function runWatchLoop(opts: RunWatchLoopOptions): Promise<void> {
  const interval = opts.intervalMs ?? 60_000;
  // Honor an already-aborted signal up front so callers can short-circuit.
  if (opts.signal?.aborted) return;
  while (!opts.signal?.aborted) {
    const tick = await runWatchTick(opts);
    opts.onTick?.(tick);
    if (opts.signal?.aborted) break;
    await sleep(interval, opts.signal);
  }
}

function filterDeltas(sources: DiscoveredSource[], checkpoints: Map<string, WatcherCheckpointEntry>): DiscoveredSource[] {
  return sources.filter((file) => {
    const cp = checkpoints.get(file.path);
    if (!cp) return true;
    if (cp.uploadedAt && cp.modifiedAt === file.modifiedAt && cp.sizeBytes === file.sizeBytes) return false;
    return true;
  });
}

async function parseFile(provider: WatcherProvider, filePath: string) {
  if (provider === "claude-code") return parseClaudeCodeJsonlFile(filePath);
  if (provider === "codex") return parseCodexSessionFile(filePath);
  if (provider === "cursor") return parseCursorSessionFile(filePath);
  throw new Error(`watcher cannot parse provider ${provider}`);
}

async function retryUpload<T>(attempt: () => Promise<T>, retry: { maxAttempts: number; baseDelayMs: number; capDelayMs: number }): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retry.maxAttempts; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      // 4xx (other than 429) are policy errors — don't burn retries on them.
      if (isNonRetryable(err)) throw err;
      if (i === retry.maxAttempts - 1) break;
      await sleep(Math.min(retry.capDelayMs, retry.baseDelayMs * Math.pow(2, i)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("upload failed");
}

function isNonRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (typeof status !== "number") return false;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function safe<T>(fn: () => Promise<T> | T): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

function writeAtomicJson(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tmp, filePath);
}

// Helper for `lore status`: read source-status.json + watcher-state.json
// and merge into a structured view. Cheap; safe to call from the status
// path without doing IO scans.
export function readWatcherStatus(runtime: WatcherRuntime): {
  counters: WatcherCounters;
  checkpointSummary: Record<WatcherProvider, { tracked: number; lastUploadAt: string | null }>;
} {
  const counters = loadWatcherCounters(runtime);
  const summary: Record<WatcherProvider, { tracked: number; lastUploadAt: string | null }> = {
    "claude-code": { tracked: 0, lastUploadAt: null },
    codex: { tracked: 0, lastUploadAt: null },
    cursor: { tracked: 0, lastUploadAt: null },
    opencode: { tracked: 0, lastUploadAt: null }
  };
  for (const provider of ALL_PROVIDERS) {
    const checkpoints = loadCheckpoints(runtime, provider);
    let lastUploadAt: string | null = null;
    for (const entry of checkpoints.values()) {
      if (!entry.uploadedAt) continue;
      if (!lastUploadAt || entry.uploadedAt > lastUploadAt) lastUploadAt = entry.uploadedAt;
    }
    summary[provider] = { tracked: checkpoints.size, lastUploadAt };
  }
  return { counters, checkpointSummary: summary };
}

// Ensure the file exists pre-tick so that downstream readers do not race
// against the first write. Used by the temp-HOME smoke script.
export function ensureWatcherDirs(runtime: WatcherRuntime): void {
  const dirs = watcherDirs(runtime);
  mkdirSync(dirs.loreDir, { recursive: true });
  mkdirSync(dirs.checkpointsDir, { recursive: true });
}

// Best-effort sanity helper: returns true if the discovered file still exists
// on disk. Discovery and parse are not atomic, so a session file can vanish
// between scan and parse (Claude Code can rewrite paths). The watcher uses
// this guard before parsing.
export function fileStillExists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
