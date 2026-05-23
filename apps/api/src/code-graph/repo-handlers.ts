/**
 * Lore v2.1 — repo.* compatibility handlers over the existing code graph.
 *
 * v2.0.4 shipped the durable storage/query engine as `code_*` tables and
 * `/v1/code-graph/*`. v2.1 exposes the agent-facing repo graph contract without
 * duplicating storage: repo graph requests are translated onto the same
 * vault-scoped `code_repos`, `code_files`, `code_symbols`, and `code_relations`
 * graph.
 */

import { z } from "zod";
import type { PgClient } from "./resolver.js";
import { log } from "../logger.js";
import { errorBodyWithReason } from "./handlers/_error.js";

const LIMIT_MAX = 100;

const RepoGraphQuerySchema = z.object({
  query: z.string().min(1).max(1024),
  repo_id: z.string().min(1).max(1024).optional(),
  repo: z.string().min(1).max(1024).optional(),
  limit: z.number().int().min(1).max(LIMIT_MAX).optional(),
  kind: z.string().min(1).max(128).optional(),
  include_relations: z.boolean().optional()
}).strict();

const RepoSymbolContextSchema = z.object({
  symbol_id: z.string().min(1).max(1024).optional(),
  qname: z.string().min(1).max(1024).optional(),
  name: z.string().min(1).max(1024).optional(),
  file_path: z.string().min(1).max(4096).optional(),
  repo_id: z.string().min(1).max(1024).optional(),
  repo: z.string().min(1).max(1024).optional(),
  kind: z.string().min(1).max(128).optional(),
  include_tests: z.boolean().optional()
}).strict().refine((value) => value.symbol_id || value.qname || value.name, {
  message: "symbol_id, qname, or name is required"
});

const RepoImpactSchema = z.object({
  symbol_id: z.string().min(1).max(1024).optional(),
  qname: z.string().min(1).max(1024).optional(),
  name: z.string().min(1).max(1024).optional(),
  file_path: z.string().min(1).max(4096).optional(),
  repo_id: z.string().min(1).max(1024).optional(),
  repo: z.string().min(1).max(1024).optional(),
  depth: z.number().int().min(1).max(10).optional(),
  limit: z.number().int().min(1).max(500).optional()
}).strict().refine((value) => value.symbol_id || value.qname || value.name || value.file_path, {
  message: "symbol_id, qname, name, or file_path is required"
});

const RepoDetectChangesSchema = z.object({
  diff_text: z.string().max(200_000).optional(),
  diff: z.string().max(200_000).optional(),
  repo_id: z.string().min(1).max(1024).optional(),
  repo: z.string().min(1).max(1024).optional(),
  base_ref: z.string().min(1).max(256).optional()
}).strict().refine((value) => value.diff_text || value.diff, {
  message: "diff_text is required"
});

interface SymbolRow {
  id: string;
  repo_name: string;
  qname: string;
  kind: string;
  name: string;
  signature: string | null;
  doc_comment: string | null;
  file_path: string;
  start_line: number;
  end_line: number;
  score?: number;
}

interface RelationRow {
  source_symbol_id?: string;
  target_symbol_id?: string | null;
  source_qname: string;
  target_qname: string | null;
  relation_type: string;
  source_file_path: string | null;
  target_file_path: string | null;
}

interface DiffHunk {
  filePath: string;
  startLine: number;
  endLine: number;
}

interface RepoFilter {
  repoName: string | null;
  repoId: string | null;
}

export async function handleRepoGraphQuery(
  request: Request,
  vaultId: string,
  pgClient: PgClient,
): Promise<Response> {
  const parsed = await parseJson(request, RepoGraphQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { query, limit = 20, kind, include_relations: includeRelations } = parsed.data;
  const repoFilter = readRepoFilter(parsed.data);

  try {
    const symbols = await pgClient.query<SymbolRow>(
      `SELECT cs.id,
              r.name AS repo_name,
              cs.qualified_name AS qname,
              cs.kind,
              cs.name,
              cs.signature,
              cs.doc_comment,
              cf.relative_path AS file_path,
              cs.start_line,
              cs.end_line,
              GREATEST(
                CASE WHEN cs.name = $2 THEN 1.0 ELSE 0.0 END,
                CASE WHEN cs.qualified_name ILIKE '%' || $2 || '%' THEN 0.7 ELSE 0.0 END,
                CASE WHEN cf.relative_path ILIKE '%' || $2 || '%' THEN 0.6 ELSE 0.0 END,
                CASE WHEN COALESCE(cs.doc_comment, '') ILIKE '%' || $2 || '%' THEN 0.3 ELSE 0.0 END
              ) AS score
       FROM code_symbols cs
       JOIN code_repos r ON r.id = cs.repo_id
       JOIN code_files cf ON cf.id = cs.file_id
       WHERE r.vault_id = $1
         AND ($3::text IS NULL OR r.name = $3)
         AND ($4::text IS NULL OR r.id::text = $4)
         AND ($5::text IS NULL OR cs.kind = $5)
         AND (
           cs.name ILIKE '%' || $2 || '%'
           OR cs.qualified_name ILIKE '%' || $2 || '%'
           OR cf.relative_path ILIKE '%' || $2 || '%'
           OR COALESCE(cs.doc_comment, '') ILIKE '%' || $2 || '%'
         )
       ORDER BY score DESC, cs.qualified_name ASC
       LIMIT $6`,
      [vaultId, query, repoFilter.repoName, repoFilter.repoId, kind ?? null, limit],
    );

    const fileMap = new Map<string, { repo: string; path: string; language?: string }>();
    for (const symbol of symbols.rows) {
      fileMap.set(`${symbol.repo_name}:${symbol.file_path}`, { repo: symbol.repo_name, path: symbol.file_path });
    }

    let relations: RelationRow[] = [];
    if (includeRelations && symbols.rows.length > 0) {
      const ids = symbols.rows.map((symbol) => symbol.id);
      const relationRows = await pgClient.query<RelationRow>(
        `SELECT cr.src_symbol_id AS source_symbol_id,
                cr.dst_symbol_id AS target_symbol_id,
                src.qualified_name AS source_qname,
                dst.qualified_name AS target_qname,
                cr.relation_kind AS relation_type,
                sf.relative_path AS source_file_path,
                df.relative_path AS target_file_path
         FROM code_relations cr
         JOIN code_repos r ON r.id = cr.repo_id
         JOIN code_symbols src ON src.id = cr.src_symbol_id
         LEFT JOIN code_symbols dst ON dst.id = cr.dst_symbol_id
         LEFT JOIN code_files sf ON sf.id = src.file_id
         LEFT JOIN code_files df ON df.id = dst.file_id
         WHERE r.vault_id = $1
           AND (cr.src_symbol_id = ANY($2::uuid[]) OR cr.dst_symbol_id = ANY($2::uuid[]))
         ORDER BY cr.relation_kind ASC, source_qname ASC
         LIMIT $3`,
        [vaultId, ids, Math.min(limit * 4, 200)],
      );
      relations = relationRows.rows;
    }

    return json({
      backend: "lore-code-graph-v22",
      query,
      files: [...fileMap.values()],
      symbols: symbols.rows.map(formatSymbol),
      relations,
      processes: []
    }, 200);
  } catch (err) {
    log.error("repo-graph: graph query failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("repo_graph.query_failed", err), 500);
  }
}

export async function handleRepoSymbolContext(
  request: Request,
  vaultId: string,
  pgClient: PgClient,
): Promise<Response> {
  const parsed = await parseJson(request, RepoSymbolContextSchema);
  if (!parsed.ok) return parsed.response;
  const repoFilter = readRepoFilter(parsed.data);

  try {
    const symbol = await resolveSymbol(pgClient, vaultId, {
      ...parsed.data,
      repoFilter
    });
    if (!symbol) {
      return json({ symbol: null, callers: [], callees: [], incoming: [], outgoing: [], tests: [], processes: [] }, 200);
    }

    const [incoming, outgoing] = await Promise.all([
      pgClient.query<RelationRow>(
        `SELECT src.id AS source_symbol_id,
                dst.id AS target_symbol_id,
                src.qualified_name AS source_qname,
                dst.qualified_name AS target_qname,
                cr.relation_kind AS relation_type,
                sf.relative_path AS source_file_path,
                df.relative_path AS target_file_path
         FROM code_relations cr
         JOIN code_repos r ON r.id = cr.repo_id
         JOIN code_symbols src ON src.id = cr.src_symbol_id
         JOIN code_symbols dst ON dst.id = cr.dst_symbol_id
         JOIN code_files sf ON sf.id = src.file_id
         JOIN code_files df ON df.id = dst.file_id
         WHERE r.vault_id = $1 AND cr.dst_symbol_id = $2
         ORDER BY cr.relation_kind ASC, source_qname ASC
         LIMIT 200`,
        [vaultId, symbol.id],
      ),
      pgClient.query<RelationRow>(
        `SELECT src.id AS source_symbol_id,
                dst.id AS target_symbol_id,
                src.qualified_name AS source_qname,
                dst.qualified_name AS target_qname,
                cr.relation_kind AS relation_type,
                sf.relative_path AS source_file_path,
                df.relative_path AS target_file_path
         FROM code_relations cr
         JOIN code_repos r ON r.id = cr.repo_id
         JOIN code_symbols src ON src.id = cr.src_symbol_id
         JOIN code_symbols dst ON dst.id = cr.dst_symbol_id
         JOIN code_files sf ON sf.id = src.file_id
         JOIN code_files df ON df.id = dst.file_id
         WHERE r.vault_id = $1 AND cr.src_symbol_id = $2
         ORDER BY cr.relation_kind ASC, target_qname ASC
         LIMIT 200`,
        [vaultId, symbol.id],
      )
    ]);

    const callers = incoming.rows.filter((row) => row.relation_type === "calls");
    const callees = outgoing.rows.filter((row) => row.relation_type === "calls");
    const tests = incoming.rows.filter((row) => isTestPath(row.source_file_path) || /(^|[.])test|spec/i.test(row.source_qname));

    return json({
      symbol: formatSymbol(symbol),
      file: { repo: symbol.repo_name, path: symbol.file_path },
      callers,
      callees,
      incoming: incoming.rows,
      outgoing: outgoing.rows,
      tests,
      processes: []
    }, 200);
  } catch (err) {
    log.error("repo-graph: symbol context failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("repo_graph.symbol_context_failed", err), 500);
  }
}

export async function handleRepoImpact(
  request: Request,
  vaultId: string,
  pgClient: PgClient,
): Promise<Response> {
  const parsed = await parseJson(request, RepoImpactSchema);
  if (!parsed.ok) return parsed.response;
  const repoFilter = readRepoFilter(parsed.data);
  const depth = parsed.data.depth ?? 5;
  const limit = parsed.data.limit ?? 200;

  try {
    const roots = parsed.data.file_path
      ? await symbolsForFile(pgClient, vaultId, parsed.data.file_path, repoFilter)
      : [await resolveSymbol(pgClient, vaultId, { ...parsed.data, repoFilter })].filter((row): row is SymbolRow => Boolean(row));

    if (roots.length === 0) {
      return json({ target: null, directCallers: [], upstreamSymbols: [], affectedProcesses: [], suggestedTests: [], riskLevel: "unknown" }, 200);
    }

    const rootIds = roots.map((root) => root.id);
    const upstream = await pgClient.query<SymbolRow & { depth: number; relation_type: string }>(
      `WITH RECURSIVE walk(sym_id, depth, relation_type) AS (
         SELECT cr.src_symbol_id, 1, cr.relation_kind
         FROM code_relations cr
         JOIN code_repos r ON r.id = cr.repo_id
         WHERE r.vault_id = $1 AND cr.dst_symbol_id = ANY($2::uuid[])
         UNION
         SELECT cr.src_symbol_id, w.depth + 1, cr.relation_kind
         FROM code_relations cr
         JOIN code_repos r ON r.id = cr.repo_id
         JOIN walk w ON w.sym_id = cr.dst_symbol_id
         WHERE r.vault_id = $1 AND w.depth < $3
       )
       SELECT cs.id,
              r.name AS repo_name,
              cs.qualified_name AS qname,
              cs.kind,
              cs.name,
              cs.signature,
              cs.doc_comment,
              cf.relative_path AS file_path,
              cs.start_line,
              cs.end_line,
              MIN(w.depth) AS depth,
              MIN(w.relation_type) AS relation_type
       FROM walk w
       JOIN code_symbols cs ON cs.id = w.sym_id
       JOIN code_repos r ON r.id = cs.repo_id
       JOIN code_files cf ON cf.id = cs.file_id
       WHERE r.vault_id = $1
         AND ($4::text IS NULL OR r.name = $4)
         AND ($5::text IS NULL OR r.id::text = $5)
       GROUP BY cs.id, r.name, cs.qualified_name, cs.kind, cs.name, cs.signature, cs.doc_comment, cf.relative_path, cs.start_line, cs.end_line
       ORDER BY depth ASC, qname ASC
       LIMIT $6`,
      [vaultId, rootIds, depth, repoFilter.repoName, repoFilter.repoId, limit],
    );

    const directCallers = upstream.rows.filter((row) => row.depth === 1 && row.relation_type === "calls").map(formatSymbol);
    const upstreamSymbols = upstream.rows.map(formatSymbol);
    const suggestedTests = upstream.rows.filter((row) => isTestPath(row.file_path) || /(^|[.])test|spec/i.test(row.qname)).map(formatSymbol);
    const riskLevel = suggestedTests.length === 0 && upstreamSymbols.length > 20
      ? "high"
      : upstreamSymbols.length > 5
        ? "medium"
        : "low";

    return json({
      target: parsed.data.file_path ? { file_path: parsed.data.file_path, symbols: roots.map(formatSymbol) } : formatSymbol(roots[0]!),
      directCallers,
      upstreamSymbols,
      affectedProcesses: [],
      suggestedTests,
      riskLevel,
      depth
    }, 200);
  } catch (err) {
    log.error("repo-graph: impact failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("repo_graph.impact_failed", err), 500);
  }
}

export async function handleRepoDetectChanges(
  request: Request,
  vaultId: string,
  pgClient: PgClient,
): Promise<Response> {
  const parsed = await parseJson(request, RepoDetectChangesSchema);
  if (!parsed.ok) return parsed.response;
  const repoFilter = readRepoFilter(parsed.data);
  const diff = parsed.data.diff_text ?? parsed.data.diff ?? "";
  const hunks = parseUnifiedDiffHunks(diff);

  try {
    const changedSymbols: SymbolRow[] = [];
    const unknownRegions: DiffHunk[] = [];
    for (const hunk of hunks) {
      const rows = await symbolsForFileRange(pgClient, vaultId, hunk.filePath, hunk.startLine, hunk.endLine, repoFilter);
      if (rows.length === 0) unknownRegions.push(hunk);
      changedSymbols.push(...rows);
    }

    const changedIds = [...new Set(changedSymbols.map((symbol) => symbol.id))];
    const affected = changedIds.length === 0
      ? { rows: [] as Array<SymbolRow & { relation_type: string }> }
      : await pgClient.query<SymbolRow & { relation_type: string }>(
        `SELECT DISTINCT src.id,
                r.name AS repo_name,
                src.qualified_name AS qname,
                src.kind,
                src.name,
                src.signature,
                src.doc_comment,
                sf.relative_path AS file_path,
                src.start_line,
                src.end_line,
                cr.relation_kind AS relation_type
         FROM code_relations cr
         JOIN code_repos r ON r.id = cr.repo_id
         JOIN code_symbols src ON src.id = cr.src_symbol_id
         JOIN code_files sf ON sf.id = src.file_id
         WHERE r.vault_id = $1
           AND cr.dst_symbol_id = ANY($2::uuid[])
           AND ($3::text IS NULL OR r.name = $3)
           AND ($4::text IS NULL OR r.id::text = $4)
         ORDER BY src.qualified_name ASC
         LIMIT 300`,
        [vaultId, changedIds, repoFilter.repoName, repoFilter.repoId],
      );

    const suggestedTests = affected.rows.filter((row) => isTestPath(row.file_path) || /(^|[.])test|spec/i.test(row.qname));
    return json({
      changedFiles: [...new Set(hunks.map((hunk) => hunk.filePath))],
      hunks,
      changedSymbols: uniqueSymbols(changedSymbols).map(formatSymbol),
      affectedSymbols: uniqueSymbols(affected.rows).map(formatSymbol),
      affectedProcesses: [],
      suggestedTests: uniqueSymbols(suggestedTests).map(formatSymbol),
      unknownRegions
    }, 200);
  } catch (err) {
    log.error("repo-graph: detect changes failed", { vaultId, error: String(err) });
    return json(errorBodyWithReason("repo_graph.detect_changes_failed", err), 500);
  }
}

async function resolveSymbol(
  pgClient: PgClient,
  vaultId: string,
  input: {
    symbol_id?: string;
    qname?: string;
    name?: string;
    file_path?: string;
    repoFilter: RepoFilter;
    kind?: string;
  },
): Promise<SymbolRow | null> {
  const result = await pgClient.query<SymbolRow>(
    `SELECT cs.id,
            r.name AS repo_name,
            cs.qualified_name AS qname,
            cs.kind,
            cs.name,
            cs.signature,
            cs.doc_comment,
            cf.relative_path AS file_path,
            cs.start_line,
            cs.end_line
     FROM code_symbols cs
     JOIN code_repos r ON r.id = cs.repo_id
     JOIN code_files cf ON cf.id = cs.file_id
     WHERE r.vault_id = $1
       AND ($2::text IS NULL OR cs.id::text = $2)
       AND ($3::text IS NULL OR cs.qualified_name = $3)
       AND ($4::text IS NULL OR cs.name = $4 OR cs.qualified_name ILIKE '%' || $4 || '%')
       AND ($5::text IS NULL OR cf.relative_path = $5)
       AND ($6::text IS NULL OR r.name = $6)
       AND ($7::text IS NULL OR r.id::text = $7)
       AND ($8::text IS NULL OR cs.kind = $8)
     ORDER BY CASE WHEN cs.qualified_name = COALESCE($3, $4) THEN 0 ELSE 1 END,
              cs.start_line ASC
     LIMIT 1`,
    [
      vaultId,
      input.symbol_id ?? null,
      input.qname ?? null,
      input.name ?? null,
      input.file_path ?? null,
      input.repoFilter.repoName,
      input.repoFilter.repoId,
      input.kind ?? null
    ],
  );
  return result.rows[0] ?? null;
}

async function symbolsForFile(
  pgClient: PgClient,
  vaultId: string,
  filePath: string,
  repoFilter: RepoFilter,
): Promise<SymbolRow[]> {
  const result = await pgClient.query<SymbolRow>(
    `SELECT cs.id,
            r.name AS repo_name,
            cs.qualified_name AS qname,
            cs.kind,
            cs.name,
            cs.signature,
            cs.doc_comment,
            cf.relative_path AS file_path,
            cs.start_line,
            cs.end_line
     FROM code_symbols cs
     JOIN code_repos r ON r.id = cs.repo_id
     JOIN code_files cf ON cf.id = cs.file_id
     WHERE r.vault_id = $1
       AND cf.relative_path = $2
       AND ($3::text IS NULL OR r.name = $3)
       AND ($4::text IS NULL OR r.id::text = $4)
     ORDER BY cs.start_line ASC
     LIMIT 500`,
    [vaultId, filePath, repoFilter.repoName, repoFilter.repoId],
  );
  return result.rows;
}

async function symbolsForFileRange(
  pgClient: PgClient,
  vaultId: string,
  filePath: string,
  startLine: number,
  endLine: number,
  repoFilter: RepoFilter,
): Promise<SymbolRow[]> {
  const result = await pgClient.query<SymbolRow>(
    `SELECT cs.id,
            r.name AS repo_name,
            cs.qualified_name AS qname,
            cs.kind,
            cs.name,
            cs.signature,
            cs.doc_comment,
            cf.relative_path AS file_path,
            cs.start_line,
            cs.end_line
     FROM code_symbols cs
     JOIN code_repos r ON r.id = cs.repo_id
     JOIN code_files cf ON cf.id = cs.file_id
     WHERE r.vault_id = $1
       AND cf.relative_path = $2
       AND cs.start_line <= $4
       AND cs.end_line >= $3
       AND ($5::text IS NULL OR r.name = $5)
       AND ($6::text IS NULL OR r.id::text = $6)
     ORDER BY (cs.end_line - cs.start_line) ASC, cs.start_line ASC
     LIMIT 100`,
    [vaultId, filePath, startLine, endLine, repoFilter.repoName, repoFilter.repoId],
  );
  return result.rows;
}

function parseUnifiedDiffHunks(diff: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentFile = "";
  for (const line of diff.split(/\r?\n/)) {
    const fileMatch = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (fileMatch) {
      currentFile = fileMatch[2]!;
      continue;
    }
    const newFileMatch = /^\+\+\+ b\/(.+)$/.exec(line);
    if (newFileMatch) {
      currentFile = newFileMatch[1]!;
      continue;
    }
    const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunkMatch && currentFile) {
      const start = Number(hunkMatch[1]);
      const count = hunkMatch[2] ? Number(hunkMatch[2]) : 1;
      hunks.push({ filePath: currentFile, startLine: start, endLine: start + Math.max(count - 1, 0) });
    }
  }
  return hunks;
}

function readRepoFilter(input: { repo?: string; repo_id?: string }): RepoFilter {
  return { repoName: input.repo ?? null, repoId: input.repo_id ?? null };
}

function isTestPath(path: string | null | undefined): boolean {
  return Boolean(path && /(^|[/\\])(__tests__|tests?|spec)([/\\]|$)|[.-](test|spec)\.[cm]?[tj]sx?$/i.test(path));
}

function uniqueSymbols<T extends SymbolRow>(symbols: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const symbol of symbols) {
    if (seen.has(symbol.id)) continue;
    seen.add(symbol.id);
    result.push(symbol);
  }
  return result;
}

function formatSymbol(symbol: SymbolRow): Record<string, unknown> {
  return {
    id: symbol.id,
    repo: symbol.repo_name,
    qname: symbol.qname,
    name: symbol.name,
    kind: symbol.kind,
    signature: symbol.signature,
    doc_comment: symbol.doc_comment,
    file_path: symbol.file_path,
    start_line: symbol.start_line,
    end_line: symbol.end_line,
    ...(typeof symbol.score === "number" ? { score: symbol.score } : {})
  };
}

async function parseJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: json({ error: "repo_graph.payload_invalid", issues: ["request body is not valid JSON"] }, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, response: json({ error: "repo_graph.payload_invalid", issues: parsed.error.issues }, 400) };
  }
  return { ok: true, data: parsed.data };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
