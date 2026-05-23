/**
 * code.context — Symbol metadata + all incoming and outgoing relations.
 *
 * Input:  { qname, repo? }
 * Output: { symbol: SymbolMetadata, incoming: Reference[], outgoing: Reference[] }
 *   incoming = code_relations where dst_symbol_id = X
 *   outgoing = code_relations where src_symbol_id = X
 *
 * Vault scoping: enforced server-side via the caller's API key.
 */

import { fetchCodeGraphApi } from "./_fetch.js";
import type { FetchImpl } from "./types.js";

export async function handleCodeContext(
  args: Record<string, unknown>,
  fetchImpl: FetchImpl,
  baseUrl: string,
  apiKey: string | undefined
): Promise<unknown> {
  return fetchCodeGraphApi(fetchImpl, `${baseUrl}/v1/code-graph/context`, args, apiKey);
}
