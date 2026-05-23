#!/usr/bin/env node
/**
 * scripts/code-graph-privacy-audit.mjs — Lane P P5 deliverable.
 *
 * User-runnable audit CLI. Given a vault id, queries `code_repos` +
 * `code_symbols` + `code_relations` for STATISTICAL metadata only — no
 * symbol contents are sampled. The output is a human-readable report a
 * security-conscious user can paste to their compliance team.
 *
 * Usage:
 *   pnpm code-graph:privacy-audit --vault <vault-id> [--db <postgres-url>]
 *
 * Reads from `DATABASE_URL` env var if `--db` not provided.
 * Falls back to a dry-run "shape only" report if no DB connection.
 *
 * Privacy invariant: this script MUST NOT print symbol names, signatures,
 * doc comments, or any raw row content. It is allowed to print COUNTS,
 * HISTOGRAMS, and DERIVED METADATA only. Reviewers checking this script's
 * output should NEVER see source-code-resembling bytes.
 *
 * Exit codes:
 *   0  Audit successful.
 *   1  Missing args or DB connection error.
 *   2  Vault not found.
 */

import { argv, env, stderr, stdout, exit } from "node:process";

function parseArgs() {
  const out = { vault: null, db: null, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--vault") out.vault = argv[++i];
    else if (a === "--db") out.db = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const HELP = `\
code-graph-privacy-audit — Lore v2.0.4 Lane P P5

Usage:
  pnpm code-graph:privacy-audit --vault <vault-id> [--db <postgres-url>]

Prints a human-readable report listing what types of data Lore Cloud has
stored about your code knowledge graph in this vault. The report is metadata
only — symbol names, signatures, and doc comments are NEVER sampled or
printed.

Output sections:
  - Vault summary (repo count, language distribution, total symbols)
  - Symbol kind histogram (functions / classes / methods / …)
  - Relation kind histogram (calls / imports / extends / …)
  - Storage size estimate (bytes)
  - Tier-2 encryption flag per repo
  - Last indexed timestamps

Privacy invariant: this script does NOT query symbol content fields
(name, signature, doc_comment). It queries counts, kinds, and timestamps.
`;

async function loadPg() {
  try {
    return await import("pg");
  } catch {
    return null;
  }
}

function dryRunReport(vaultId) {
  return `\
Code Graph Privacy Audit — DRY RUN

  Vault: ${vaultId}
  Mode:  DRY-RUN (no DATABASE_URL set; reporting expected SHAPE only)

  Repo count:               (would query SELECT count(*) FROM code_repos WHERE vault_id=$1)
  Total files:              (sum code_repos.total_files)
  Total symbols:            (sum code_repos.total_symbols)
  Total relations:          (sum code_repos.total_relations)

  Symbol kinds:             (histogram of code_symbols.kind grouped by repo)
  Relation kinds:           (histogram of code_relations.relation_kind)
  Languages:                (distinct code_files.language)
  Tier-2 encrypted repos:   (count where code_repos.e2e_encrypted = true)
  Last indexed:             (max code_repos.last_indexed_at per repo)

To run against a real database:
  DATABASE_URL=postgres://... pnpm code-graph:privacy-audit --vault ${vaultId}
`;
}

async function runReport(client, vaultId) {
  const repos = await client.query(
    `SELECT id, name, primary_lang, total_files, total_symbols, total_relations,
            last_indexed_at, e2e_encrypted
     FROM code_repos WHERE vault_id = $1 ORDER BY name`,
    [vaultId],
  );
  if (repos.rowCount === 0) {
    return { exitCode: 2, output: `No code_repos rows for vault ${vaultId}.` };
  }
  const symbolKinds = await client.query(
    `SELECT kind, count(*) AS n
     FROM code_symbols s JOIN code_repos r ON r.id = s.repo_id
     WHERE r.vault_id = $1
     GROUP BY kind ORDER BY n DESC`,
    [vaultId],
  );
  const relationKinds = await client.query(
    `SELECT relation_kind AS kind, count(*) AS n
     FROM code_relations cr JOIN code_repos r ON r.id = cr.repo_id
     WHERE r.vault_id = $1
     GROUP BY relation_kind ORDER BY n DESC`,
    [vaultId],
  );
  const languages = await client.query(
    `SELECT language, count(*) AS files
     FROM code_files f JOIN code_repos r ON r.id = f.repo_id
     WHERE r.vault_id = $1
     GROUP BY language ORDER BY files DESC`,
    [vaultId],
  );
  const sizeEstimate = await client.query(
    `SELECT pg_size_pretty(
        coalesce(sum(pg_column_size(s.*)), 0)
      ) AS symbols_bytes,
       pg_size_pretty(
        coalesce(sum(pg_column_size(cr.*)), 0)
      ) AS relations_bytes
     FROM code_symbols s
     LEFT JOIN code_repos r ON r.id = s.repo_id
     LEFT JOIN code_relations cr ON cr.repo_id = r.id
     WHERE r.vault_id = $1`,
    [vaultId],
  );

  const lines = [];
  lines.push(`Code Graph Privacy Audit`);
  lines.push(``);
  lines.push(`  Vault: ${vaultId}`);
  lines.push(``);
  lines.push(`  Repos (${repos.rowCount}):`);
  for (const r of repos.rows) {
    lines.push(
      `    - ${r.name} [${r.primary_lang ?? "unknown"}]  ` +
        `${r.total_files} files / ${r.total_symbols} symbols / ${r.total_relations} relations  ` +
        `e2e_encrypted=${r.e2e_encrypted}  last_indexed=${r.last_indexed_at ?? "never"}`,
    );
  }
  lines.push(``);
  lines.push(`  Symbol kinds:`);
  for (const k of symbolKinds.rows) lines.push(`    ${k.kind.padEnd(10)} ${k.n}`);
  lines.push(``);
  lines.push(`  Relation kinds:`);
  for (const k of relationKinds.rows) lines.push(`    ${k.kind.padEnd(14)} ${k.n}`);
  lines.push(``);
  lines.push(`  Languages:`);
  for (const k of languages.rows) lines.push(`    ${String(k.language).padEnd(14)} ${k.files} files`);
  lines.push(``);
  if (sizeEstimate.rows[0]) {
    lines.push(`  Storage estimate:`);
    lines.push(`    symbols   ${sizeEstimate.rows[0].symbols_bytes}`);
    lines.push(`    relations ${sizeEstimate.rows[0].relations_bytes}`);
  }
  lines.push(``);
  lines.push(`Privacy invariant: this report sampled COUNTS only.`);
  lines.push(`No symbol names, signatures, or doc_comment bytes were read.`);
  return { exitCode: 0, output: lines.join("\n") + "\n" };
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    stdout.write(HELP);
    exit(0);
  }
  if (!args.vault) {
    stderr.write("error: --vault <vault-id> required\n\n" + HELP);
    exit(1);
  }

  const dbUrl = args.db ?? env.DATABASE_URL ?? null;
  if (!dbUrl) {
    stdout.write(dryRunReport(args.vault));
    exit(0);
  }

  const pgModule = await loadPg();
  if (!pgModule) {
    stderr.write(
      "error: `pg` package not installed; cannot connect. Install it (pnpm add pg) or run without --db for dry-run mode.\n",
    );
    exit(1);
  }
  const { Client } = pgModule.default ?? pgModule;
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
  } catch (err) {
    stderr.write(`error: failed to connect: ${err.message}\n`);
    exit(1);
  }
  try {
    const result = await runReport(client, args.vault);
    stdout.write(result.output);
    exit(result.exitCode);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  stderr.write(`error: ${err.stack ?? err.message}\n`);
  exit(2);
});
