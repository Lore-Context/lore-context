export function errorMessage(value: unknown, fallback = "Dashboard request failed"): string {
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object") {
    const record = value as { message?: unknown; error?: unknown };
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
    if (record.error && typeof record.error === "object") return errorMessage(record.error, fallback);
  }
  return fallback;
}
