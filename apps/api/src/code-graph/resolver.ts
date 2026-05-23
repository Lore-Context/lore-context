/**
 * Lore v2.0.4 — Lane R upsert resolver
 *
 * resolveAndUpsert performs the full upsert pipeline:
 *   1. Upsert code_repos row
 *   2. For each file: upsert code_files
 *   3. For each file's symbols: upsert code_symbols (ON CONFLICT preserves id)
 *   4. For each file's relations: insert with nullable dst_symbol_id when target not yet known
 *   5. Second-pass: backfill dst_symbol_id for newly-resolved qnames
 *   6. Enqueue newly-inserted symbol ids to code_symbol_embed BullMQ queue
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane R
 */

import { randomUUID } from "node:crypto";
import type { UpsertPayload } from "@lore-context/sdk/code-graph-types";
import { log } from "../logger.js";

// ---------------------------------------------------------------------------
// Queue interface
// ---------------------------------------------------------------------------

export interface CodeSymbolEmbedQueue {
  add(name: string, data: { symbolId: string }): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// DB client interface (narrow — avoids importing pg types in tests)
//
// PgClient models a `pg.PoolClient`-shaped object: it supports `.query()` AND
// connection-acquired-and-released semantics. The optional `release()` field
// is present on real `PoolClient` (Pool checks-out a dedicated connection),
// and the test FakePgClient may implement it as a no-op. Callers should
// acquire via `pool.connect()` and release in a `finally` block so a single
// physical connection is used across BEGIN/COMMIT/ROLLBACK.
// ---------------------------------------------------------------------------

export interface PgClient {
  query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
  /** Optional — present on pg.PoolClient; not on a raw pg.Pool. */
  release?(): void;
}

/**
 * Pool-shaped interface — accepts anything with .connect() returning a PgClient.
 * Used by callers (route.ts) that need to acquire a dedicated client and
 * release it after a transaction.
 */
export interface PgPool {
  connect(): Promise<PgClient>;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface UpsertSummary {
  files_upserted: number;
  symbols_upserted: number;
  relations_upserted: number;
  pending_relations: number;
}

// ---------------------------------------------------------------------------
// resolveAndUpsert
// ---------------------------------------------------------------------------

export async function resolveAndUpsert(
  client: PgClient,
  vaultId: string,
  payload: UpsertPayload,
  embedQueue?: CodeSymbolEmbedQueue,
): Promise<UpsertSummary> {
  // ── Step 1: Upsert code_repos ────────────────────────────────────────────

  const repoResult = await client.query<{ id: string }>(
    `INSERT INTO code_repos (id, vault_id, name, primary_lang, e2e_encrypted, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (vault_id, name) DO UPDATE
       SET primary_lang   = EXCLUDED.primary_lang,
           e2e_encrypted  = EXCLUDED.e2e_encrypted,
           last_indexed_at = now(),
           updated_at     = now()
     RETURNING id`,
    [
      randomUUID(),
      vaultId,
      payload.repo.name,
      payload.repo.primary_lang ?? null,
      payload.e2e_encrypted ?? false,
    ],
  );

  const repoId = repoResult.rows[0]!.id;

  // ── Steps 2–4: Per-file processing ──────────────────────────────────────

  let filesUpserted = 0;
  let symbolsUpserted = 0;
  let relationsUpserted = 0;
  let pendingRelations = 0;

  // Track all qnames upserted in this batch: qname → symbol id
  const batchQnameToId = new Map<string, string>();
  // Track all newly-inserted symbol ids for embedding queue
  const newSymbolIds: string[] = [];

  for (const file of payload.files) {
    // ── Step 2: Upsert code_files ──────────────────────────────────────

    const fileResult = await client.query<{ id: string; created: boolean }>(
      `INSERT INTO code_files (id, repo_id, relative_path, language, content_hash, ast_hash, last_modified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (repo_id, relative_path) DO UPDATE
         SET language         = EXCLUDED.language,
             content_hash     = EXCLUDED.content_hash,
             ast_hash         = EXCLUDED.ast_hash,
             last_modified_at = EXCLUDED.last_modified_at
       RETURNING id, (xmax = 0) AS created`,
      [
        randomUUID(),
        repoId,
        file.relative_path,
        file.language,
        file.content_hash,
        file.ast_hash,
        file.last_modified_at,
      ],
    );

    const fileId = fileResult.rows[0]!.id;
    filesUpserted += 1;

    // ── Step 3: Upsert symbols ─────────────────────────────────────────

    for (const symbol of file.symbols) {
      const symbolResult = await client.query<{ id: string; is_new: boolean }>(
        `INSERT INTO code_symbols (
           id, repo_id, file_id, kind, name, qualified_name,
           signature, doc_comment,
           start_line, end_line, start_col, end_col,
           is_exported, metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
         ON CONFLICT (repo_id, file_id, qualified_name, start_line) DO UPDATE
           SET kind         = EXCLUDED.kind,
               name         = EXCLUDED.name,
               signature    = EXCLUDED.signature,
               doc_comment  = EXCLUDED.doc_comment,
               end_line     = EXCLUDED.end_line,
               start_col    = EXCLUDED.start_col,
               end_col      = EXCLUDED.end_col,
               is_exported  = EXCLUDED.is_exported,
               metadata     = EXCLUDED.metadata
         RETURNING id, (xmax = 0) AS is_new`,
        [
          randomUUID(),
          repoId,
          fileId,
          symbol.kind,
          symbol.name,
          symbol.qualified_name,
          symbol.signature ?? null,
          symbol.doc_comment ?? null,
          symbol.start_line,
          symbol.end_line,
          symbol.start_col ?? null,
          symbol.end_col ?? null,
          symbol.is_exported,
          JSON.stringify(symbol.metadata ?? {}),
        ],
      );

      const row = symbolResult.rows[0]!;
      symbolsUpserted += 1;
      batchQnameToId.set(symbol.qualified_name, row.id);

      // Only enqueue if newly inserted (xmax=0 means insert, not update)
      if (row.is_new) {
        newSymbolIds.push(row.id);
      }
    }

    // ── Step 4: Insert relations ───────────────────────────────────────

    for (const relation of file.relations) {
      const srcId = batchQnameToId.get(relation.src_qname);
      if (!srcId) {
        // Source symbol not found in this batch — skip (can't create FK)
        log.warn("code-graph: skipping relation — src_qname not found in batch", {
          src_qname: relation.src_qname,
          dst_qname: relation.dst_qname,
        });
        continue;
      }

      const dstId = batchQnameToId.get(relation.dst_qname) ?? null;
      const dstQnameUnresolved = dstId === null ? relation.dst_qname : null;

      await client.query(
        `INSERT INTO code_relations (
           id, repo_id, src_symbol_id, dst_symbol_id, dst_qname_unresolved,
           relation_kind, src_file_id, dst_file_id, metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         ON CONFLICT DO NOTHING`,
        [
          randomUUID(),
          repoId,
          srcId,
          dstId,
          dstQnameUnresolved,
          relation.kind,
          fileId,
          null, // dst_file_id resolved in second pass if needed
          JSON.stringify({}),
        ],
      );

      relationsUpserted += 1;
      if (dstId === null) {
        pendingRelations += 1;
      }
    }
  }

  // ── Step 5: Second-pass — backfill pending dst_symbol_id ────────────────

  if (batchQnameToId.size > 0) {
    // Build an array of [qname, id] pairs for the batch
    const qnames = [...batchQnameToId.keys()];

    // Update any pending relations whose dst_qname_unresolved is now known
    await client.query(
      `UPDATE code_relations
       SET dst_symbol_id         = cs.id,
           dst_qname_unresolved  = NULL
       FROM code_symbols cs
       WHERE code_relations.repo_id              = $1
         AND code_relations.dst_symbol_id        IS NULL
         AND code_relations.dst_qname_unresolved = cs.qualified_name
         AND cs.repo_id                          = $1
         AND code_relations.dst_qname_unresolved = ANY($2::text[])`,
      [repoId, qnames],
    );
  }

  // ── Step 6: Update repo counters ─────────────────────────────────────────

  await client.query(
    `UPDATE code_repos
     SET total_files     = (SELECT count(*) FROM code_files    WHERE repo_id = $1),
         total_symbols   = (SELECT count(*) FROM code_symbols  WHERE repo_id = $1),
         total_relations = (SELECT count(*) FROM code_relations WHERE repo_id = $1),
         last_indexed_at = now(),
         updated_at      = now()
     WHERE id = $1`,
    [repoId],
  );

  // ── Step 7: Enqueue new symbol ids for embedding ─────────────────────────

  if (embedQueue && newSymbolIds.length > 0 && !(payload.e2e_encrypted ?? false)) {
    for (const symbolId of newSymbolIds) {
      try {
        await embedQueue.add("embed-symbol", { symbolId });
      } catch (err) {
        // Non-fatal — embedding is async best-effort
        log.warn("code-graph: failed to enqueue symbol for embedding", {
          symbolId,
          error: String(err),
        });
      }
    }
  }

  return { files_upserted: filesUpserted, symbols_upserted: symbolsUpserted, relations_upserted: relationsUpserted, pending_relations: pendingRelations };
}
