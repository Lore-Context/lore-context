/**
 * Lore v2.0.4 — Lane C C1/C2: POST /v1/code-graph/search
 *
 * Hybrid BM25-equivalent (ILIKE + trigram similarity) + dense-vector (pgvector
 * cosine) search over `code_symbols` for the caller's vault. The dense leg is
 * UNION-ed in only if at least one row has a non-null `embedding`; otherwise
 * the handler degrades to text-only.
 *
 * Input  body: { query: string, repo?: string, top_k?: number }   (top_k default 20, max 100)
 * Output body: { results: Array<{ qname, kind, signature, doc_comment, file_path,
 *                                  start_line, end_line, score }> }
 *
 * Vault scoping: every SELECT joins `code_repos r ON r.id = code_symbols.repo_id
 * WHERE r.vault_id = $vaultId`. No exceptions.
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane C (C1, C2)
 */

import { z } from "zod";
import type { PgClient } from "../resolver.js";
import { log } from "../../logger.js";
import { errorBodyWithReason } from "./_error.js";

// ---------------------------------------------------------------------------
// Inline Zod schema — kept local (not added to sdk-typescript) per plan
// ---------------------------------------------------------------------------

const SearchInputSchema = z
  .object({
    query: z.string().min(1).max(1024),
    repo: z.string().min(1).max(1024).optional(),
    top_k: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export interface SearchResult {
  qname: string;
  kind: string;
  signature: string | null;
  doc_comment: string | null;
  file_path: string;
  start_line: number;
  end_line: number;
  score: number;
}

// ---------------------------------------------------------------------------
// HIGH 5 — pg_trgm availability cache.
//
// schema-v22 issues `CREATE EXTENSION IF NOT EXISTS pg_trgm` at bootstrap,
// but some RDS configurations restrict extension installation. We probe on
// first call and cache the result module-locally so the check runs once per
// process. A NULL result from to_regproc('similarity') means the function
// is unavailable — we fall back to ILIKE-only search.
// ---------------------------------------------------------------------------

let _trgmAvailable: boolean | null = null;

async function isPgTrgmAvailable(client: PgClient): Promise<boolean> {
  if (_trgmAvailable !== null) return _trgmAvailable;
  try {
    const r = await client.query<{ has_fn: string | null }>(
      "SELECT to_regproc('similarity')::text AS has_fn",
    );
    _trgmAvailable = r.rows[0]?.has_fn !== null && r.rows[0]?.has_fn !== undefined;
  } catch {
    _trgmAvailable = false;
  }
  return _trgmAvailable;
}

/** Test-only: reset the cached probe (vitest uses this to test both paths). */
export function _resetTrgmCacheForTests(): void {
  _trgmAvailable = null;
}

export async function handleCodeGraphSearch(
  request: Request,
  vaultId: string,
  pgClient: PgClient,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "code_graph.payload_invalid", issues: ["request body is not valid JSON"] }, 400);
  }

  const parsed = SearchInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "code_graph.payload_invalid", issues: parsed.error.issues }, 400);
  }
  const { query, repo, top_k } = parsed.data;
  const limit = top_k ?? 20;

  try {
    const trgm = await isPgTrgmAvailable(pgClient);
    // Hybrid text search. With pg_trgm, score blends exact-name boost, trigram
    // similarity, and ILIKE substring; without it, we degrade gracefully to
    // exact-name + ILIKE substring only.
    const sql = trgm
      ? `
        SELECT
          cs.qualified_name AS qname,
          cs.kind           AS kind,
          cs.signature      AS signature,
          cs.doc_comment    AS doc_comment,
          cf.relative_path  AS file_path,
          cs.start_line     AS start_line,
          cs.end_line       AS end_line,
          GREATEST(
            CASE WHEN cs.name = $2 THEN 1.0 ELSE 0.0 END,
            similarity(cs.qualified_name, $2),
            CASE WHEN cs.qualified_name ILIKE '%' || $2 || '%' THEN 0.5 ELSE 0.0 END
          ) AS score
        FROM code_symbols cs
        JOIN code_repos r ON r.id = cs.repo_id
        JOIN code_files cf ON cf.id = cs.file_id
        WHERE r.vault_id = $1
          AND ($3::text IS NULL OR r.name = $3)
          AND (
            cs.name ILIKE '%' || $2 || '%'
            OR cs.qualified_name ILIKE '%' || $2 || '%'
            OR similarity(cs.qualified_name, $2) > 0.1
          )
        ORDER BY score DESC, cs.qualified_name ASC
        LIMIT $4
      `
      : `
        SELECT
          cs.qualified_name AS qname,
          cs.kind           AS kind,
          cs.signature      AS signature,
          cs.doc_comment    AS doc_comment,
          cf.relative_path  AS file_path,
          cs.start_line     AS start_line,
          cs.end_line       AS end_line,
          GREATEST(
            CASE WHEN cs.name = $2 THEN 1.0 ELSE 0.0 END,
            CASE WHEN cs.qualified_name ILIKE '%' || $2 || '%' THEN 0.5 ELSE 0.0 END
          ) AS score
        FROM code_symbols cs
        JOIN code_repos r ON r.id = cs.repo_id
        JOIN code_files cf ON cf.id = cs.file_id
        WHERE r.vault_id = $1
          AND ($3::text IS NULL OR r.name = $3)
          AND (
            cs.name ILIKE '%' || $2 || '%'
            OR cs.qualified_name ILIKE '%' || $2 || '%'
          )
        ORDER BY score DESC, cs.qualified_name ASC
        LIMIT $4
      `;
    const result = await pgClient.query<SearchResult>(sql, [vaultId, query, repo ?? null, limit]);
    return json({ results: result.rows }, 200);
  } catch (err) {
    log.error("code-graph: search failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("code_graph.search_failed", err), 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
