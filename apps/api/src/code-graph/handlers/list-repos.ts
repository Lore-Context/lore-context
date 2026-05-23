/**
 * Lore v2.0.4 — Lane C C6: POST /v1/code-graph/repos
 *
 * List repos indexed in the caller's vault. Body is empty (`{}`); vault is
 * resolved from the bearer token.
 *
 * Output body: { repos: Array<{ name, primary_lang, total_files, total_symbols,
 *                                total_relations, last_indexed_at, e2e_encrypted }> }
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane C (C6)
 */

import type { PgClient } from "../resolver.js";
import { log } from "../../logger.js";
import { errorBodyWithReason } from "./_error.js";

interface RepoRow {
  name: string;
  primary_lang: string | null;
  total_files: number;
  total_symbols: number;
  total_relations: number;
  last_indexed_at: string | null;
  e2e_encrypted: boolean;
}

export async function handleCodeGraphListRepos(
  _request: Request,
  vaultId: string,
  pgClient: PgClient,
): Promise<Response> {
  try {
    const result = await pgClient.query<RepoRow>(
      `SELECT name, primary_lang, total_files, total_symbols, total_relations,
              last_indexed_at, e2e_encrypted
       FROM code_repos
       WHERE vault_id = $1
       ORDER BY name ASC`,
      [vaultId],
    );
    return json({ repos: result.rows }, 200);
  } catch (err) {
    log.error("code-graph: list-repos failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("code_graph.list_repos_failed", err), 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
