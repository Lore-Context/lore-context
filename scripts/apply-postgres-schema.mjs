import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(repoRoot, "apps/api/src/db/schema.sql");
const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.LORE_DATABASE_URL || process.env.DATABASE_URL || "postgres://lore:lore_dev_password@127.0.0.1:5432/lore_context";
const psqlBin = process.env.PSQL_BIN || "psql";

if (!existsSync(schemaPath)) {
  throw new Error(`schema.sql not found at ${schemaPath}`);
}

const args = [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", schemaPath];

if (dryRun) {
  console.log(JSON.stringify({ psqlBin, args, schemaPath }, null, 2));
  process.exit(0);
}

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

