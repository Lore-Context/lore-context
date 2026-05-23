/**
 * code.list_repos — List all code repos indexed in the current vault.
 *
 * The `last_indexed_at` field IS the staleness signal (U3). Clients compute
 * staleness locally: `Date.now() - last_indexed_at > threshold`. There is NO
 * separate code.is_stale? tool.
 *
 * Input:  {}  (vault resolved from API key)
 * Output: { repos: Array<{ name, primary_lang, total_files, total_symbols,
 *                          total_relations, last_indexed_at, e2e_encrypted }> }
 *
 * Vault scoping: enforced server-side via the caller's API key.
 */

import { fetchCodeGraphApi } from "./_fetch.js";
import type { FetchImpl } from "./types.js";

export async function handleCodeListRepos(
  args: Record<string, unknown>,
  fetchImpl: FetchImpl,
  baseUrl: string,
  apiKey: string | undefined
): Promise<unknown> {
  return fetchCodeGraphApi(fetchImpl, `${baseUrl}/v1/code-graph/repos`, args, apiKey);
}
