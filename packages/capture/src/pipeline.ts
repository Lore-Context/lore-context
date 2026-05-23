import type { CapturedSessionV08 } from "./types-v08.js";
import { ScannerState } from "./scanner-state.js";
import { UploadQueue, type QueueEnvelope } from "./upload-queue.js";
import { canCapture, isPrivateMode, sourceStateFromLegacy, type CaptureSourceState } from "./source-state.js";

// Pipeline glue used by the daemon (`apps/cli` watcher lane). Kept narrow on
// purpose — heavy logic lives in scanners, redaction, and ingestion. This
// module exists so the CLI does not have to re-derive the duplicate-run
// safety rules.

// Legacy 3-state alias kept for callers that predate the rc.1 source-state
// module. New callers should use CaptureSourceState from source-state.ts.
export type CaptureSourceStatus = "active" | "paused" | "error";

export interface SourceUploadDecision {
  action: "upload" | "skip";
  reason: string;
}

export function decideUpload(args: {
  // Accepts either the legacy 3-state status or the new 6-state CaptureSourceState.
  sourceStatus: CaptureSourceStatus | CaptureSourceState;
  vaultRawArchiveEnabled: boolean;
  sessionMode: CapturedSessionV08["captureMode"];
}): SourceUploadDecision {
  // Normalise to the canonical 6-state model.
  const state: CaptureSourceState = sourceStateFromLegacy(args.sourceStatus);

  // Private source state: upload a structural marker (empty turns) so the
  // cloud can audit that a session was discarded without persisting content.
  if (isPrivateMode(state) || args.sessionMode === "private_mode") {
    return { action: "upload", reason: "private mode marker" };
  }

  // All non-capturing states: skip upload entirely.
  if (!canCapture(state)) {
    return { action: "skip", reason: `source ${state}` };
  }

  if (args.sessionMode === "raw_archive" && !args.vaultRawArchiveEnabled) {
    return { action: "skip", reason: "vault does not allow raw_archive" };
  }

  return { action: "upload", reason: "default" };
}

export interface IngestResponse {
  sessionId: string;
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  duplicate: boolean;
}

export type IngestUploader = (envelope: CapturedSessionV08) => Promise<IngestResponse>;

export interface ProcessQueueOptions {
  queue: UploadQueue;
  state: ScannerState;
  uploader: IngestUploader;
  // Stop after N envelopes per tick — keeps the daemon predictable.
  maxPerTick?: number;
  // Hard dead-letter cap. The queue file is dropped after this many failures.
  maxAttempts?: number;
  now?: Date;
}

export interface ProcessQueueResult {
  uploaded: QueueEnvelope[];
  failed: QueueEnvelope[];
  deadLettered: QueueEnvelope[];
  skipped: number;
}

// Drain the local queue once. Caller is responsible for scheduling. The
// uploader returns IngestResponse, but the contract requires that every
// successful response has been verified by the cloud — never call this
// helper with a stub uploader in production.
export async function processQueueOnce(options: ProcessQueueOptions): Promise<ProcessQueueResult> {
  const now = options.now ?? new Date();
  const maxPerTick = options.maxPerTick ?? 16;
  const maxAttempts = options.maxAttempts ?? 8;

  const due = await options.queue.dueEnvelopes(now);
  const slice = due.slice(0, maxPerTick);

  const uploaded: QueueEnvelope[] = [];
  const failed: QueueEnvelope[] = [];

  for (const env of slice) {
    try {
      const response = await options.uploader(env.session);
      uploaded.push(env);
      await options.state.record({
        idempotencyKey: env.session.idempotencyKey,
        sourcePath: typeof env.session.metadata.sourcePath === "string" ? env.session.metadata.sourcePath : undefined,
        uploadedAt: now.toISOString(),
        cloudSessionId: response.sessionId,
        cloudJobId: response.jobId
      });
      await options.queue.ack(env.idempotencyKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failedEnv = await options.queue.fail(env.idempotencyKey, message, now);
      if (failedEnv) failed.push(failedEnv);
    }
  }

  const deadLettered = await options.queue.drainDeadLetters(maxAttempts);
  return { uploaded, failed, deadLettered, skipped: due.length - slice.length };
}
