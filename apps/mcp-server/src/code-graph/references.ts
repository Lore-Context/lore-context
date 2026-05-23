/**
 * code.references — All symbols that reference a given target (reverse-index lookup).
 *
 * Input:  { qname, repo? }
 * Output: { references: Reference[] }   (same shape as incoming[] from code.context)
 *
 * Vault scoping: enforced server-side via the caller's API key.
 */

import { fetchCodeGraphApi } from "./_fetch.js";
import type { FetchImpl } from "./types.js";

export async function handleCodeReferences(
  args: Record<string, unknown>,
  fetchImpl: FetchImpl,
  baseUrl: string,
  apiKey: string | undefined
): Promise<unknown> {
  return fetchCodeGraphApi(fetchImpl, `${baseUrl}/v1/code-graph/references`, args, apiKey);
}
