/**
 * Lore v2.0.4 — Lane C shared error helpers.
 *
 * HIGH 4 — gate the verbose `reason: String(err)` field behind
 * `NODE_ENV !== "production"`. In production we surface only the error code
 * so PG error text (which may contain the user-supplied pattern or other
 * sensitive context) never reaches the client.
 */

const IS_PRODUCTION = process.env["NODE_ENV"] === "production";

export function errorBodyWithReason(code: string, err: unknown): Record<string, unknown> {
  const body: Record<string, unknown> = { error: code };
  if (!IS_PRODUCTION) {
    body["reason"] = err instanceof Error ? err.message : String(err);
  }
  return body;
}
