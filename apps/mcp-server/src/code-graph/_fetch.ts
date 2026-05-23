/**
 * Shared HTTP helper for code-graph MCP handlers.
 * Matches the error-handling style of the parent fetchJson() in index.ts.
 */

import type { FetchImpl } from "./types.js";

export async function fetchCodeGraphApi(
  fetchImpl: FetchImpl,
  url: string,
  body: unknown,
  apiKey: string | undefined
): Promise<unknown> {
  const headers = new Headers({ "content-type": "application/json" });
  if (apiKey) {
    headers.set("authorization", `Bearer ${apiKey}`);
  }
  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {})
  });
  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { text };
  }
  if (!response.ok) {
    const message =
      response.status === 404 ? "not found"
      : response.status === 403 || response.status === 401 ? "permission denied"
      : response.status === 400 ? "bad request"
      : response.status === 409 ? "conflict"
      : response.status === 422 ? "unprocessable request"
      : "operation failed";
    throw new Error(message);
  }
  return payload;
}
