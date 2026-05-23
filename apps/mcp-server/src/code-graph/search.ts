/**
 * code.search — Hybrid BM25 + dense-embedding search over code symbols.
 *
 * The heavy lifting (pg_trgm ILIKE union HNSW cosine, RRF ranking) runs
 * server-side in the Lore API. The MCP layer is a thin forwarder.
 *
 * Input:  { query, repo?, top_k? }   (top_k default 20)
 * Output: { results: Array<{ qname, kind, signature, doc_comment, file_path,
 *                            start_line, end_line, score }> }
 *
 * Vault scoping: enforced by the caller's API key on the server.
 */

import { fetchCodeGraphApi } from "./_fetch.js";
import type { FetchImpl } from "./types.js";

export async function handleCodeSearch(
  args: Record<string, unknown>,
  fetchImpl: FetchImpl,
  baseUrl: string,
  apiKey: string | undefined
): Promise<unknown> {
  return fetchCodeGraphApi(fetchImpl, `${baseUrl}/v1/code-graph/search`, args, apiKey);
}
