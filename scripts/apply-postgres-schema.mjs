import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(repoRoot, "apps/api/src/db/schema.sql");
const schemaV12Path = join(repoRoot, "apps/api/src/db/schema-v12.sql");
// v1.4 / v1.5 schema patches — additive, idempotent (IF NOT EXISTS guards).
// schemaV13BitemporalPath authored at v1.3→v1.4 transition; not previously
// wired into pnpm db:schema. v14 audit / trace-export / graph-trigram authored
// at v1.4 Lane B but never applied. v1.5 Lane C wires them all in.
const schemaV13BitemporalPath = join(repoRoot, "apps/api/src/db/schema-v13-bitemporal.sql");
const schemaV14AuditPath = join(repoRoot, "apps/api/src/db/schema-v14-audit.sql");
const schemaV14TraceExportPath = join(repoRoot, "apps/api/src/db/schema-v14-trace-export.sql");
const schemaV14GraphTrigramPath = join(repoRoot, "apps/api/src/db/schema-v14-graph-trigram.sql");
// v1.9 Lane F — billing + abuse schema patches. Additive, idempotent (IF NOT
// EXISTS guards). Registered here so `pnpm db:schema` applies them in order.
const schemaV19BillingPath = join(repoRoot, "apps/api/src/db/schema-v19-billing.sql");
const schemaV19AbusePath = join(repoRoot, "apps/api/src/db/schema-v19-abuse.sql");
// v2.0 Lane L1 — usage tracking + overage reporting. Additive, idempotent.
const schemaV20UsagePath = join(repoRoot, "apps/api/src/db/schema-v20-usage.sql");
// v2.1 — repo graph compatibility views/lifecycle tables over v2.0.4 code graph.
const schemaV22CodeGraphPath = join(repoRoot, "apps/api/src/db/schema-v22-code-graph.sql");
const schemaV21RepoGraphPath = join(repoRoot, "apps/api/src/db/schema-v21-repo-graph.sql");
const psqlBin = process.env.PSQL_BIN || "psql";

// B-9 guard — schema-v12.sql is currently additive (CREATE … IF NOT EXISTS),
// but the plan + doctor still call this a reset. Once the file ever evolves to
// include destructive statements (DROP TABLE, TRUNCATE, ALTER … DROP, etc.) we
// must refuse to apply it when v12 memory tables already contain rows, unless
// the operator explicitly acknowledges the risk by setting
// LORE_V12_DESTRUCTIVE_RESET=I_UNDERSTAND.
//
// The check is intentionally conservative: it inspects the SQL file for
// destructive statement patterns. When found, it requires either an explicit
// override env var, or proof from psql that the v12 memory tables are empty.
// In --dry-run mode we report the planned guard checks but never connect.
//
// The function is exported via `runV12ResetGuard` for unit tests so the
// dry-run path can be asserted without spinning up Postgres.
const V12_DESTRUCTIVE_PATTERNS = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+SCHEMA\b/i,
  /\bDROP\s+INDEX\b/i,
  /\bDROP\s+CONSTRAINT\b/i,
  /\bTRUNCATE\b/i,
  /\bALTER\s+TABLE\b[\s\S]+?\bDROP\s+COLUMN\b/i,
  /\bALTER\s+TABLE\b[\s\S]+?\bRENAME\b/i,
  /\bRENAME\s+COLUMN\b/i,
  /\bALTER\s+COLUMN\b[\s\S]+?\bTYPE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bUPDATE\b[\s\S]+?\bSET\b/i
];

const V12_PROTECTED_TABLES = [
  "memory_episodes",
  "memory_items",
  "memory_chunks",
  "memory_embeddings_v12",
  "memory_entities",
  "memory_relations"
];

const ACK_VALUE = "I_UNDERSTAND";

export function detectDestructiveV12Statements(sql) {
  return V12_DESTRUCTIVE_PATTERNS
    .map((pattern) => {
      const match = sql.match(pattern);
      return match ? match[0] : null;
    })
    .filter((token) => token !== null);
}

export function planV12ResetGuard({
  sql,
  ackEnvValue,
  v11Only: scopeV11Only = false
}) {
  if (scopeV11Only) {
    return { required: false, reason: "v11-only run; v12 schema not applied" };
  }
  const destructiveTokens = detectDestructiveV12Statements(sql);
  if (destructiveTokens.length === 0) {
    return { required: false, reason: "schema-v12.sql has no destructive statements" };
  }
  if (ackEnvValue === ACK_VALUE) {
    return {
      required: true,
      acknowledged: true,
      destructiveTokens,
      reason: "operator acknowledged via LORE_V12_DESTRUCTIVE_RESET=I_UNDERSTAND"
    };
  }
  return {
    required: true,
    acknowledged: false,
    destructiveTokens,
    protectedTables: [...V12_PROTECTED_TABLES],
    ackEnvVar: "LORE_V12_DESTRUCTIVE_RESET",
    ackValue: ACK_VALUE,
    reason: "destructive statement(s) detected — refusing to apply unless v12 tables are empty or LORE_V12_DESTRUCTIVE_RESET=I_UNDERSTAND"
  };
}

async function loadSchemaForGuard(path) {
  const { readFileSync } = await import("node:fs");
  return readFileSync(path, "utf8");
}

// Probe a single protected table. The runner is injected so tests can simulate
// missing tables, populated tables, and unexpected probe failures without
// spinning up Postgres.
//
// Per-table results:
//   { state: "populated" }    — table has at least one row
//   { state: "empty" }        — table exists and is empty, OR table is absent
//   { state: "error", error } — psql failed in a way we cannot classify
function classifyProbeResult({ status, stdout, stderr, error }) {
  if (error) {
    return { state: "error", error: error.message ?? String(error) };
  }
  // Missing-relation is the only psql failure we treat as "empty"; anything
  // else (auth/network/typo) must fail closed so we never assume empty when
  // we actually couldn't answer the question.
  if (status !== 0) {
    const stderrText = stderr ?? "";
    const missingRelation =
      /relation\s+"[^"]+"\s+does not exist/i.test(stderrText) ||
      /undefined_table/i.test(stderrText) ||
      /SQLSTATE\s+42P01/i.test(stderrText);
    if (missingRelation) {
      return { state: "empty", note: "table absent — treated as empty" };
    }
    return { state: "error", error: stderrText.trim() || `psql exited with status ${status}` };
  }
  const hasRowsRaw = (stdout ?? "").trim();
  if (hasRowsRaw === "t" || hasRowsRaw === "true") {
    return { state: "populated" };
  }
  if (hasRowsRaw === "f" || hasRowsRaw === "false" || hasRowsRaw === "") {
    return { state: "empty" };
  }
  // Unexpected output — fail closed so we don't accidentally call it empty.
  return { state: "error", error: `unexpected probe output: ${hasRowsRaw.slice(0, 80)}` };
}

// Pure helper used by both the real runner and the unit tests. The runner
// argument is invoked once per protected table; it must return an object
// shaped like { status, stdout, stderr, error? }. Aggregation rules:
//   * any populated table -> ok:false with the populated list
//   * any error           -> ok:false with the failed list (fail-closed)
//   * otherwise           -> ok:true
export async function probeV12RowsWithRunner(runner, tables = V12_PROTECTED_TABLES) {
  const populated = [];
  const failed = [];
  const notes = [];
  for (const table of tables) {
    const raw = await runner(table);
    const classified = classifyProbeResult(raw ?? {});
    if (classified.state === "populated") {
      populated.push(table);
    } else if (classified.state === "error") {
      failed.push({ table, error: classified.error });
    } else if (classified.note) {
      notes.push({ table, note: classified.note });
    }
  }
  if (populated.length > 0) {
    return { ok: false, populated, failed, notes };
  }
  if (failed.length > 0) {
    // Fail closed — we could not confirm emptiness for at least one table.
    return { ok: false, failed, notes };
  }
  return { ok: true, notes };
}

async function checkV12RowsViaPsql(databaseUrlArg) {
  const runner = (table) => {
    const result = spawnSync(
      psqlBin,
      [
        databaseUrlArg,
        "-v",
        "ON_ERROR_STOP=1",
        "-A",
        "-t",
        "-c",
        `SELECT EXISTS (SELECT 1 FROM ${table} LIMIT 1) AS has_rows;`
      ],
      { cwd: repoRoot, encoding: "utf8" }
    );
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error
    };
  };
  return probeV12RowsWithRunner(runner);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const v11Only = process.argv.includes("--v11-only");
  const databaseUrl =
    process.env.LORE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgres://lore:lore_dev_password@127.0.0.1:5432/lore_context";

  if (!existsSync(schemaPath)) {
    throw new Error(`schema.sql not found at ${schemaPath}`);
  }
  const targets = [{ label: "v1.1 schema", path: schemaPath }];
  if (!v11Only) {
    if (!existsSync(schemaV12Path)) {
      throw new Error(`schema-v12.sql not found at ${schemaV12Path}`);
    }
    targets.push({ label: "v1.2 schema", path: schemaV12Path });

    // v1.5 Lane C: append the additive v1.3 / v1.4 schema patches authored at
    // earlier milestones but never wired into pnpm db:schema. Each is
    // idempotent (IF NOT EXISTS guards) so re-applying is a no-op. Files are
    // optional (skipped silently when absent) so trimmed-down test fixtures
    // continue to work.
    const optionalPatches = [
      { label: "v1.3 bi-temporal schema patch", path: schemaV13BitemporalPath },
      { label: "v1.4 search audit schema patch", path: schemaV14AuditPath },
      { label: "v1.4 trace export schema patch", path: schemaV14TraceExportPath },
      { label: "v1.4 graph trigram schema patch", path: schemaV14GraphTrigramPath },
      { label: "v1.9 billing schema patch", path: schemaV19BillingPath },
      { label: "v1.9 abuse schema patch", path: schemaV19AbusePath },
      { label: "v2.0 usage schema patch", path: schemaV20UsagePath },
      { label: "v2.0.4 code graph schema patch", path: schemaV22CodeGraphPath },
      { label: "v2.1 repo graph schema patch", path: schemaV21RepoGraphPath }
    ];
    for (const patch of optionalPatches) {
      if (existsSync(patch.path)) {
        targets.push(patch);
      }
    }
  }

  if (dryRun) {
    let guardPlan = { required: false, reason: "v11-only run" };
    if (!v11Only) {
      const sql = await loadSchemaForGuard(schemaV12Path);
      guardPlan = planV12ResetGuard({
        sql,
        ackEnvValue: process.env.LORE_V12_DESTRUCTIVE_RESET,
        v11Only
      });
    }
    console.log(JSON.stringify({
      psqlBin,
      targets: targets.map(({ label, path }) => ({ label, args: [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", path] })),
      v12ResetGuard: guardPlan
    }, null, 2));
    process.exit(0);
  }

  if (!v11Only) {
    const sql = await loadSchemaForGuard(schemaV12Path);
    const guardPlan = planV12ResetGuard({
      sql,
      ackEnvValue: process.env.LORE_V12_DESTRUCTIVE_RESET,
      v11Only
    });
    if (guardPlan.required && !guardPlan.acknowledged) {
      const probe = await checkV12RowsViaPsql(databaseUrl);
      if (!probe.ok) {
        console.error("[apply-postgres-schema] REFUSING to apply schema-v12.sql:");
        console.error(`  destructive statement(s) detected: ${guardPlan.destructiveTokens.join(", ")}`);
        if (probe.populated && probe.populated.length > 0) {
          console.error(`  populated v12 tables: ${probe.populated.join(", ")}`);
        }
        if (probe.failed && probe.failed.length > 0) {
          // Fail-closed: probe could not confirm emptiness for at least one
          // table, so we refuse rather than silently treating it as empty.
          console.error(`  could not verify emptiness for: ${probe.failed.map((f) => f.table).join(", ")}`);
          for (const f of probe.failed) {
            console.error(`    - ${f.table}: ${String(f.error).slice(0, 200)}`);
          }
        }
        console.error(`  set ${guardPlan.ackEnvVar}=${guardPlan.ackValue} to acknowledge data loss before re-running.`);
        process.exit(2);
      }
    }
  }

  for (const target of targets) {
    const args = [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", target.path];
    console.log(`[apply-postgres-schema] applying ${target.label}: ${target.path}`);
    const result = spawnSync(psqlBin, args, {
      cwd: repoRoot,
      stdio: "inherit"
    });

    if (result.error) {
      if (result.error.code === "ENOENT") {
        console.error(`Could not find ${psqlBin}. Install the PostgreSQL client or set PSQL_BIN to its path.`);
        process.exit(127);
      }
      throw result.error;
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

// Only run main when invoked as the entrypoint, so test-apply-schema-guard.mjs
// can `import` the helpers without executing psql.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
