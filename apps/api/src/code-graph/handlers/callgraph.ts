/**
 * Lore v2.0.4 — Lane C C4: POST /v1/code-graph/callgraph
 *
 * BFS call-chain subgraph via a Postgres recursive CTE on `code_relations`.
 * Vault-scoped: the recursive CTE joins `code_repos.vault_id = $1` at every
 * level so cross-vault rows can never enter the working set.
 *
 * Input  body: { qname: string, depth?: number (1-5, default 3), repo?: string }
 * Output body: { nodes: Node[], edges: Edge[] }
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane C (C4)
 */

import { z } from "zod";
import type { PgClient } from "../resolver.js";
import { log } from "../../logger.js";
import { errorBodyWithReason } from "./_error.js";

const CallgraphInputSchema = z
  .object({
    qname: z.string().min(1).max(1024),
    depth: z.number().int().min(1).max(5).optional(),
    repo: z.string().min(1).max(1024).optional(),
  })
  .strict();

interface NodeRow {
  id: string;
  qname: string;
  kind: string;
  signature: string | null;
  file_path: string;
  start_line: number;
  end_line: number;
}

interface EdgeRow {
  src_id: string;
  dst_id: string;
  src_qname: string;
  dst_qname: string;
  relation_kind: string;
  depth: number;
}

export async function handleCodeGraphCallgraph(
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

  const parsed = CallgraphInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "code_graph.payload_invalid", issues: parsed.error.issues }, 400);
  }
  const { qname, depth, repo } = parsed.data;
  const maxDepth = depth ?? 3;

  try {
    // Recursive CTE: walk outgoing 'calls' edges depth-first up to maxDepth.
    // Vault scoping via JOIN on code_repos for every node visited.
    const edgesSql = `
      WITH RECURSIVE roots AS (
        SELECT cs.id
        FROM code_symbols cs
        JOIN code_repos r ON r.id = cs.repo_id
        WHERE r.vault_id        = $1
          AND cs.qualified_name = $2
          AND ($4::text IS NULL OR r.name = $4)
      ),
      walk(src_id, dst_id, src_qname, dst_qname, relation_kind, depth) AS (
        SELECT cr.src_symbol_id, cr.dst_symbol_id,
               s.qualified_name, d.qualified_name,
               cr.relation_kind, 1
        FROM code_relations cr
        JOIN code_repos    r ON r.id = cr.repo_id
        JOIN code_symbols  s ON s.id = cr.src_symbol_id
        JOIN code_symbols  d ON d.id = cr.dst_symbol_id
        WHERE r.vault_id        = $1
          AND cr.relation_kind  = 'calls'
          AND cr.src_symbol_id IN (SELECT id FROM roots)
        UNION ALL
        SELECT cr.src_symbol_id, cr.dst_symbol_id,
               s.qualified_name, d.qualified_name,
               cr.relation_kind, w.depth + 1
        FROM code_relations cr
        JOIN code_repos    r ON r.id = cr.repo_id
        JOIN code_symbols  s ON s.id = cr.src_symbol_id
        JOIN code_symbols  d ON d.id = cr.dst_symbol_id
        JOIN walk w ON w.dst_id = cr.src_symbol_id
        WHERE r.vault_id        = $1
          AND cr.relation_kind  = 'calls'
          AND w.depth < $3
      )
      SELECT DISTINCT src_id, dst_id, src_qname, dst_qname, relation_kind, depth
      FROM walk
      ORDER BY depth ASC
    `;
    const edgesResult = await pgClient.query<EdgeRow>(edgesSql, [vaultId, qname, maxDepth, repo ?? null]);

    // Collect node ids from edges (both endpoints) + root.
    const nodeIds = new Set<string>();
    for (const e of edgesResult.rows) {
      nodeIds.add(e.src_id);
      nodeIds.add(e.dst_id);
    }
    let nodes: NodeRow[] = [];
    if (nodeIds.size > 0) {
      const nodesResult = await pgClient.query<NodeRow>(
        `SELECT cs.id, cs.qualified_name AS qname, cs.kind, cs.signature,
                cf.relative_path AS file_path,
                cs.start_line, cs.end_line
         FROM code_symbols cs
         JOIN code_repos  r  ON r.id  = cs.repo_id
         JOIN code_files  cf ON cf.id = cs.file_id
         WHERE r.vault_id = $1 AND cs.id = ANY($2::uuid[])`,
        [vaultId, [...nodeIds]],
      );
      nodes = nodesResult.rows;
    } else {
      // No edges — still return the root node if it exists in this vault.
      const rootResult = await pgClient.query<NodeRow>(
        `SELECT cs.id, cs.qualified_name AS qname, cs.kind, cs.signature,
                cf.relative_path AS file_path,
                cs.start_line, cs.end_line
         FROM code_symbols cs
         JOIN code_repos  r  ON r.id  = cs.repo_id
         JOIN code_files  cf ON cf.id = cs.file_id
         WHERE r.vault_id        = $1
           AND cs.qualified_name = $2
           AND ($3::text IS NULL OR r.name = $3)
         LIMIT 1`,
        [vaultId, qname, repo ?? null],
      );
      nodes = rootResult.rows;
    }

    return json({
      nodes: nodes.map((n) => ({
        id: n.id,
        qname: n.qname,
        kind: n.kind,
        signature: n.signature,
        file_path: n.file_path,
        start_line: n.start_line,
        end_line: n.end_line,
      })),
      edges: edgesResult.rows.map((e) => ({
        src_qname: e.src_qname,
        dst_qname: e.dst_qname,
        relation_kind: e.relation_kind,
        depth: e.depth,
      })),
    }, 200);
  } catch (err) {
    log.error("code-graph: callgraph failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("code_graph.callgraph_failed", err), 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
