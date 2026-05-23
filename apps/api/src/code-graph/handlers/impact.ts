/**
 * Lore v2.0.4 — Lane C C5: POST /v1/code-graph/impact
 *
 * Blast-radius closure of `code.references` up to depth N. At depth=Infinity
 * (mapped to hard cap of 10 here) the result MUST equal the BFS closure of
 * `code.references(qname)` — that is the C5 acceptance criterion.
 *
 * Uses the SAME recursive-CTE shape as the callgraph but walks edges in
 * REVERSE (i.e. follows dst → src) and is NOT restricted to relation_kind='calls'.
 *
 * Input  body: { qname: string, depth?: number, repo?: string }
 *   depth: omitted ⇒ Infinity ⇒ apply 10 hop cap (returns 500 symbols max).
 *   depth: integer 1..10 ⇒ honored.
 * Output body: { symbols: ImpactSymbol[], total: number }
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane C (C5)
 */

import { z } from "zod";
import type { PgClient } from "../resolver.js";
import { log } from "../../logger.js";
import { errorBodyWithReason } from "./_error.js";

const HARD_CAP_DEPTH = 10;
const HARD_CAP_ROWS = 500;

const ImpactInputSchema = z
  .object({
    qname: z.string().min(1).max(1024),
    // depth is optional; bounded 1..10 when present.
    depth: z.number().int().min(1).max(HARD_CAP_DEPTH).optional(),
    repo: z.string().min(1).max(1024).optional(),
  })
  .strict();

interface ImpactRow {
  qname: string;
  kind: string;
  signature: string | null;
  file_path: string;
  start_line: number;
  end_line: number;
  depth: number;
}

export async function handleCodeGraphImpact(
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

  const parsed = ImpactInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "code_graph.payload_invalid", issues: parsed.error.issues }, 400);
  }
  const { qname, depth, repo } = parsed.data;
  const maxDepth = depth ?? HARD_CAP_DEPTH;

  try {
    // Reverse BFS via recursive CTE — every level joins code_repos on vault_id
    // so cross-vault rows can never enter the closure.
    //
    // The base case (depth=1) is exactly the body of code.references(qname).
    // The inductive step extends the frontier by another reverse hop. Therefore
    // when depth=HARD_CAP_DEPTH and the graph is bounded, the result is the
    // full reverse-reachable closure — identical to BFS(code.references(qname))
    // (the C5 invariant).
    const sql = `
      WITH RECURSIVE roots AS (
        SELECT cs.id
        FROM code_symbols cs
        JOIN code_repos r ON r.id = cs.repo_id
        WHERE r.vault_id        = $1
          AND cs.qualified_name = $2
          AND ($4::text IS NULL OR r.name = $4)
      ),
      walk(sym_id, depth) AS (
        SELECT cr.src_symbol_id, 1
        FROM code_relations cr
        JOIN code_repos r ON r.id = cr.repo_id
        WHERE r.vault_id        = $1
          AND cr.dst_symbol_id IN (SELECT id FROM roots)
        UNION
        SELECT cr.src_symbol_id, w.depth + 1
        FROM code_relations cr
        JOIN code_repos r ON r.id = cr.repo_id
        JOIN walk w ON w.sym_id = cr.dst_symbol_id
        WHERE r.vault_id = $1
          AND w.depth < $3
      )
      SELECT cs.qualified_name AS qname,
             cs.kind,
             cs.signature,
             cf.relative_path AS file_path,
             cs.start_line, cs.end_line,
             MIN(w.depth) AS depth
      FROM walk w
      JOIN code_symbols cs ON cs.id = w.sym_id
      JOIN code_repos   r  ON r.id  = cs.repo_id
      JOIN code_files   cf ON cf.id = cs.file_id
      WHERE r.vault_id = $1
      GROUP BY cs.qualified_name, cs.kind, cs.signature, cf.relative_path, cs.start_line, cs.end_line
      ORDER BY depth ASC, qname ASC
      LIMIT $5
    `;
    const result = await pgClient.query<ImpactRow>(sql, [vaultId, qname, maxDepth, repo ?? null, HARD_CAP_ROWS]);
    return json({ symbols: result.rows, total: result.rows.length }, 200);
  } catch (err) {
    log.error("code-graph: impact failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("code_graph.impact_failed", err), 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
