/**
 * Lore v2.0.4 — Lane C C4/C5: POST /v1/code-graph/references
 *
 * Reverse-index lookup — all symbols that reference the given qname (same
 * semantic as `incoming[]` from code.context, but exposed as a top-level tool).
 * Vault-scoped.
 *
 * Input  body: { qname: string, repo?: string }
 * Output body: { references: Reference[] }
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane C (C5)
 */

import { z } from "zod";
import type { PgClient } from "../resolver.js";
import { log } from "../../logger.js";
import { errorBodyWithReason } from "./_error.js";

const ReferencesInputSchema = z
  .object({
    qname: z.string().min(1).max(1024),
    repo: z.string().min(1).max(1024).optional(),
  })
  .strict();

interface ReferenceRow {
  qname: string;
  kind: string;
  signature: string | null;
  file_path: string;
  start_line: number;
  end_line: number;
  relation_kind: string;
}

export async function handleCodeGraphReferences(
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

  const parsed = ReferencesInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "code_graph.payload_invalid", issues: parsed.error.issues }, 400);
  }
  const { qname, repo } = parsed.data;

  try {
    // Reverse-index: source symbols (referrers) of every relation whose dst
    // resolves to a symbol whose qualified_name = qname.
    const sql = `
      SELECT src.qualified_name AS qname,
             src.kind,
             src.signature,
             cf.relative_path AS file_path,
             src.start_line,
             src.end_line,
             cr.relation_kind
      FROM code_relations cr
      JOIN code_repos r   ON r.id  = cr.repo_id
      JOIN code_symbols src ON src.id = cr.src_symbol_id
      JOIN code_symbols dst ON dst.id = cr.dst_symbol_id
      JOIN code_files cf  ON cf.id = src.file_id
      WHERE r.vault_id        = $1
        AND dst.qualified_name = $2
        AND ($3::text IS NULL OR r.name = $3)
    `;
    const result = await pgClient.query<ReferenceRow>(sql, [vaultId, qname, repo ?? null]);
    return json({ references: result.rows }, 200);
  } catch (err) {
    log.error("code-graph: references failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("code_graph.references_failed", err), 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
