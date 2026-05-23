/**
 * code.impact — Blast-radius closure of code.references up to depth N.
 *
 * C5 invariant: code.impact(X, depth=Infinity) is identical to the BFS closure
 * of code.references(X). The server uses the same recursive CTE for both;
 * code.impact simply drives it to the requested depth with a hard cap of 500
 * returned symbols + pagination cursor.
 *
 * Input:  { qname, depth?, repo?, cursor? }
 * Output: { symbols: ImpactSymbol[], total: number, cursor?: string }
 *
 * Vault scoping: enforced server-side via the caller's API key.
 */

import { fetchCodeGraphApi } from "./_fetch.js";
import type { FetchImpl } from "./types.js";

export async function handleCodeImpact(
  args: Record<string, unknown>,
  fetchImpl: FetchImpl,
  baseUrl: string,
  apiKey: string | undefined
): Promise<unknown> {
  return fetchCodeGraphApi(fetchImpl, `${baseUrl}/v1/code-graph/impact`, args, apiKey);
}
