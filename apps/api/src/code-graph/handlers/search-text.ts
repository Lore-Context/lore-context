/**
 * Lore v2.0.4 — Lane C C7: POST /v1/code-graph/search-text
 *
 * Regex/grep over symbol `name` + `doc_comment` columns only (NEVER signatures
 * — signatures are documentation-style metadata; the regex matches only on
 * structural-name fields per plan).
 *
 * Postgres `~` operator (POSIX regex). Vault-scoped.
 *
 * Input  body: { regex: string, repo?: string, top_k?: number }
 * Output body: { results: Array<{ qname, kind, name, doc_comment, file_path,
 *                                  start_line, end_line }> }
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane C (C7)
 */

import { z } from "zod";
import type { PgClient } from "../resolver.js";
import { log } from "../../logger.js";
import { errorBodyWithReason } from "./_error.js";

const SearchTextInputSchema = z
  .object({
    regex: z.string().min(1).max(1024),
    repo: z.string().min(1).max(1024).optional(),
    top_k: z.number().int().min(1).max(100).optional(),
  })
  .strict();

interface ResultRow {
  qname: string;
  kind: string;
  name: string;
  doc_comment: string | null;
  file_path: string;
  start_line: number;
  end_line: number;
}

export async function handleCodeGraphSearchText(
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

  const parsed = SearchTextInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "code_graph.payload_invalid", issues: parsed.error.issues }, 400);
  }
  const { regex, repo, top_k } = parsed.data;
  const limit = top_k ?? 20;

  // HIGH 4 — validate regex syntax client-side before sending to Postgres.
  // PG's `~` operator and Node's RegExp differ subtly (PG uses POSIX, Node
  // uses ECMA), but Node's parser catches all common syntax errors and
  // shields PG from raising the error class 22025/2201B, which would leak the
  // user-supplied pattern back via `String(err)`.
  try {
    new RegExp(regex);
  } catch (err) {
    return json(
      {
        error: "code_graph.search_text_invalid_regex",
        ...(process.env["NODE_ENV"] !== "production" ? { reason: (err as Error).message } : {}),
      },
      400,
    );
  }

  // HIGH 4 — run inside a transaction with a per-statement timeout to bound
  // catastrophic regex backtracking on PG side. 5s is generous for symbol
  // tables in the thousands; longer queries are likely a DoS attempt or a
  // pathological pattern.
  //
  // SET LOCAL applies only to the current transaction; release the client
  // back to the pool with no lingering session-level timeout.
  try {
    await pgClient.query("BEGIN");
    try {
      await pgClient.query("SET LOCAL statement_timeout = '5s'");
      const sql = `
        SELECT cs.qualified_name AS qname,
               cs.kind,
               cs.name,
               cs.doc_comment,
               cf.relative_path AS file_path,
               cs.start_line, cs.end_line
        FROM code_symbols cs
        JOIN code_repos  r  ON r.id  = cs.repo_id
        JOIN code_files  cf ON cf.id = cs.file_id
        WHERE r.vault_id = $1
          AND ($3::text IS NULL OR r.name = $3)
          AND (cs.name ~ $2 OR (cs.doc_comment IS NOT NULL AND cs.doc_comment ~ $2))
        ORDER BY cs.qualified_name ASC
        LIMIT $4
      `;
      const result = await pgClient.query<ResultRow>(sql, [vaultId, regex, repo ?? null, limit]);
      await pgClient.query("COMMIT");
      return json({ results: result.rows }, 200);
    } catch (inner) {
      try { await pgClient.query("ROLLBACK"); } catch { /* swallow rollback failure */ }
      throw inner;
    }
  } catch (err) {
    log.error("code-graph: search-text failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("code_graph.search_text_failed", err), 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
