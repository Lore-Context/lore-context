/**
 * Lore v2.0.4 — Lane R BullMQ Worker: code_symbol_embed queue consumer
 *
 * For each job (symbolId):
 *   1. Fetch name + signature + doc_comment from code_symbols
 *   2. Call EmbeddingClient.embedSingle with concatenated text
 *   3. UPDATE code_symbols SET embedding = $1 WHERE id = $2
 *   4. Skip + log on Qwen3-endpoint failure rather than crash
 *
 * The worker is instantiated in apps/api/src/worker.ts alongside the existing
 * MemoryWorker. It is NOT started here — the entrypoint creates it.
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane R step 5
 */

import { Worker as BullWorker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { EmbeddingClient, readEmbeddingConfig } from "../embedding.js";
import { log } from "../logger.js";

// ---------------------------------------------------------------------------
// Queue name constant (shared with producer in resolver.ts)
// ---------------------------------------------------------------------------

export const CODE_SYMBOL_EMBED_QUEUE = "code_symbol_embed";

// ---------------------------------------------------------------------------
// DB interface
// ---------------------------------------------------------------------------

export interface CodeSymbolEmbedDb {
  query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

// ---------------------------------------------------------------------------
// Job data shape
// ---------------------------------------------------------------------------

export interface CodeSymbolEmbedJobData {
  symbolId: string;
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createCodeSymbolEmbedWorker(
  connection: Redis,
  db: CodeSymbolEmbedDb,
  embeddingClient?: EmbeddingClient,
): BullWorker<CodeSymbolEmbedJobData> {
  const client = embeddingClient ?? new EmbeddingClient(readEmbeddingConfig());

  const worker = new BullWorker<CodeSymbolEmbedJobData>(
    CODE_SYMBOL_EMBED_QUEUE,
    async (job: Job<CodeSymbolEmbedJobData>) => {
      const { symbolId } = job.data;

      // Fetch symbol fields
      const fetchResult = await db.query<{
        id: string;
        name: string;
        signature: string | null;
        doc_comment: string | null;
      }>(
        `SELECT id, name, signature, doc_comment
         FROM code_symbols
         WHERE id = $1`,
        [symbolId],
      );

      if (fetchResult.rows.length === 0) {
        log.warn("code-graph/embed: symbol not found, skipping", { symbolId });
        return;
      }

      const symbol = fetchResult.rows[0]!;
      const text = [symbol.name, symbol.signature ?? "", symbol.doc_comment ?? ""]
        .join(" ")
        .trim();

      // Embed
      let embedding: number[];
      try {
        const result = await client.embedSingle({ id: `code_symbol:${symbolId}`, text });
        embedding = result.dense;
      } catch (err) {
        // Skip + log — do not crash the worker or retry infinitely
        log.warn("code-graph/embed: embedding failed, skipping symbol", {
          symbolId,
          error: String(err),
        });
        return;
      }

      // Persist embedding as a float array formatted for pgvector
      // pgvector accepts: '[0.1,0.2,...]'
      const embeddingLiteral = `[${embedding.join(",")}]`;

      await db.query(
        `UPDATE code_symbols
         SET embedding = $1::vector
         WHERE id = $2`,
        [embeddingLiteral, symbolId],
      );

      log.info("code-graph/embed: symbol embedded", { symbolId, dim: embedding.length });
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    log.error("code-graph/embed: job failed", {
      jobId: job?.id,
      symbolId: job?.data?.symbolId,
      error: String(err),
    });
  });

  return worker;
}
