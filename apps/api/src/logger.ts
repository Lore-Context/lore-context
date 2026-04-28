const REDACTED_FIELDS = new Set(["content", "query", "memory", "value", "password", "secret", "token", "key"]);

export interface LogFields {
  requestId?: string;
  traceId?: string;
  [key: string]: unknown;
}

function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, depth + 1));
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = REDACTED_FIELDS.has(key) ? "[redacted]" : redact(val, depth + 1);
  }
  return result;
}

function write(level: "info" | "warn" | "error", msg: string, fields: LogFields): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...redact(fields) as Record<string, unknown>
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const log = {
  info(msg: string, fields: LogFields = {}): void {
    write("info", msg, fields);
  },
  warn(msg: string, fields: LogFields = {}): void {
    write("warn", msg, fields);
  },
  error(msg: string, fields: LogFields = {}): void {
    write("error", msg, fields);
  }
};
