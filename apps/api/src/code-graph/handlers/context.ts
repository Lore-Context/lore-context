/**
 * Lore v2.0.4 — Lane C C3: POST /v1/code-graph/context
 *
 * Returns symbol metadata + all incoming and outgoing edges for a qualified name.
 * Vault-scoped via JOIN on code_repos.
 *
 * Input  body: { qname: string, repo?: string }
 * Output body: { symbol: SymbolMetadata, incoming: Reference[], outgoing: Reference[] }
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane C (C3, C4)
 */

import { z } from "zod";
import type { PgClient } from "../resolver.js";
import { log } from "../../logger.js";
import { errorBodyWithReason } from "./_error.js";

const ContextInputSchema = z
  .object({
    qname: z.string().min(1).max(1024),
    repo: z.string().min(1).max(1024).optional(),
  })
  .strict();

interface SymbolRow {
  id: string;
  qname: string;
  kind: string;
  name: string;
  signature: string | null;
  doc_comment: string | null;
  file_path: string;
  start_line: number;
  end_line: number;
}

interface ReferenceRow {
  qname: string;
  kind: string;
  signature: string | null;
  file_path: string;
  start_line: number;
  end_line: number;
  relation_kind: string;
}

export async function handleCodeGraphContext(
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

  const parsed = ContextInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "code_graph.payload_invalid", issues: parsed.error.issues }, 400);
  }
  const { qname, repo } = parsed.data;

  try {
    // Resolve the symbol(s) matching this qualified name in the vault.
    const symbolResult = await pgClient.query<SymbolRow>(
      `SELECT cs.id, cs.qualified_name AS qname, cs.kind, cs.name,
              cs.signature, cs.doc_comment,
              cf.relative_path AS file_path,
              cs.start_line, cs.end_line
       FROM code_symbols cs
       JOIN code_repos  r  ON r.id  = cs.repo_id
       JOIN code_files  cf ON cf.id = cs.file_id
       WHERE r.vault_id        = $1
         AND cs.qualified_name = $2
         AND ($3::text IS NULL OR r.name = $3)
       ORDER BY cs.start_line ASC
       LIMIT 1`,
      [vaultId, qname, repo ?? null],
    );

    if (symbolResult.rows.length === 0) {
      return json({ symbol: null, incoming: [], outgoing: [] }, 200);
    }
    const symbol = symbolResult.rows[0]!;

    // Outgoing: rows where src_symbol_id = symbol.id
    const outgoingResult = await pgClient.query<ReferenceRow>(
      `SELECT cs.qualified_name AS qname, cs.kind, cs.signature,
              cf.relative_path AS file_path,
              cs.start_line, cs.end_line,
              cr.relation_kind
       FROM code_relations cr
       JOIN code_repos r ON r.id = cr.repo_id
       LEFT JOIN code_symbols cs ON cs.id = cr.dst_symbol_id
       LEFT JOIN code_files   cf ON cf.id = cs.file_id
       WHERE r.vault_id      = $1
         AND cr.src_symbol_id = $2
         AND cs.id IS NOT NULL`,
      [vaultId, symbol.id],
    );

    // Incoming: rows where dst_symbol_id = symbol.id
    const incomingResult = await pgClient.query<ReferenceRow>(
      `SELECT cs.qualified_name AS qname, cs.kind, cs.signature,
              cf.relative_path AS file_path,
              cs.start_line, cs.end_line,
              cr.relation_kind
       FROM code_relations cr
       JOIN code_repos r ON r.id = cr.repo_id
       JOIN code_symbols cs ON cs.id = cr.src_symbol_id
       JOIN code_files   cf ON cf.id = cs.file_id
       WHERE r.vault_id       = $1
         AND cr.dst_symbol_id = $2`,
      [vaultId, symbol.id],
    );

    return json({
      symbol: {
        qname: symbol.qname,
        kind: symbol.kind,
        name: symbol.name,
        signature: symbol.signature,
        doc_comment: symbol.doc_comment,
        file_path: symbol.file_path,
        start_line: symbol.start_line,
        end_line: symbol.end_line,
      },
      incoming: incomingResult.rows,
      outgoing: outgoingResult.rows,
    }, 200);
  } catch (err) {
    log.error("code-graph: context failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("code_graph.context_failed", err), 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
