/**
 * code.callgraph — BFS call-chain subgraph starting from a given symbol.
 *
 * Input:  { qname, depth, repo? }   (depth 1-5)
 * Output: { nodes: SymbolNode[], edges: Edge[] }
 *
 * The server executes a recursive CTE on code_relations (relation_kind='calls')
 * bounded by the requested depth.
 *
 * Vault scoping: enforced server-side via the caller's API key.
 */

import { fetchCodeGraphApi } from "./_fetch.js";
import type { FetchImpl } from "./types.js";

export async function handleCodeCallgraph(
  args: Record<string, unknown>,
  fetchImpl: FetchImpl,
  baseUrl: string,
  apiKey: string | undefined
): Promise<unknown> {
  return fetchCodeGraphApi(fetchImpl, `${baseUrl}/v1/code-graph/callgraph`, args, apiKey);
}
