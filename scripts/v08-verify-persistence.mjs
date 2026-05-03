import { spawnSync } from "node:child_process";

const databaseUrl = process.env.LORE_DATABASE_URL || "postgres://lore:lore_dev_password@127.0.0.1:5432/lore_context";
const psqlBin = process.env.PSQL_BIN || "psql";

const V08_TABLES = [
  "accounts",
  "oauth_identities",
  "vaults",
  "vault_members",
  "devices",
  "device_tokens",
  "agent_tokens",
  "capture_sources",
  "capture_sessions",
  "capture_jobs",
  "memory_items",
  "memory_sources",
  "memory_edges",
  "profile_items",
  "recall_traces",
  "recall_trace_items",
  "usage_events",
  "deletion_jobs",
  "audit_events"
];

console.log(`Checking for v0.8 tables in ${databaseUrl}...`);

const query = `
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (${V08_TABLES.map(t => `'${t}'`).join(', ')});
`;

const result = spawnSync(psqlBin, [databaseUrl, "-t", "-A", "-c", query], {
  encoding: "utf8"
});

if (result.status !== 0) {
  console.error("Failed to query database:", result.stderr);
  process.exit(1);
}

const existingTables = result.stdout.trim().split("\n").filter(Boolean);
const missingTables = V08_TABLES.filter(t => !existingTables.includes(t));

if (missingTables.length === 0) {
  console.log("All v0.8 tables are present.");
  process.exit(0);
} else {
  console.error("Missing v0.8 tables:", missingTables.join(", "));
  process.exit(1);
}
