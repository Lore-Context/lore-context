import type { AuditLog } from "@lore/shared";

export function writeAuditEntry(
  log: AuditLog[],
  entry: Omit<AuditLog, "id" | "createdAt">
): AuditLog[] {
  const newEntry: AuditLog = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  return [...log, newEntry];
}
