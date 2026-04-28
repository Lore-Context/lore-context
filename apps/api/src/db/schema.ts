import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

export function loadSchemaSql(): string {
  const candidates = [join(currentDir, "schema.sql"), join(currentDir, "../../src/db/schema.sql")];
  const schemaPath = candidates.find((candidate) => existsSync(candidate));

  if (!schemaPath) {
    throw new Error("schema.sql not found");
  }

  return readFileSync(schemaPath, "utf8");
}
