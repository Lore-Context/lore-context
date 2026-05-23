import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function resolveSchemaFile(name: string): string {
  const candidates = [join(currentDir, name), join(currentDir, "../../src/db/", name)];
  const schemaPath = candidates.find((candidate) => existsSync(candidate));
  if (!schemaPath) {
    throw new Error(`${name} not found`);
  }
  return schemaPath;
}

export function loadSchemaSql(): string {
  return readFileSync(resolveSchemaFile("schema.sql"), "utf8");
}

export function loadV12SchemaSql(): string {
  return readFileSync(resolveSchemaFile("schema-v12.sql"), "utf8");
}

// Convenience composer: returns v1.1 schema followed by v1.2 schema. Both files
// are independently idempotent, so this is safe to apply repeatedly. Callers
// that want strict v1.1-only behaviour can keep using `loadSchemaSql()`.
export function loadAllSchemaSql(): string {
  return `${loadSchemaSql()}\n\n-- === v1.2 schema ===\n\n${loadV12SchemaSql()}`;
}
