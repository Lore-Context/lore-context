/**
 * code.search_text — Regex/grep over symbol name + doc_comment columns only.
 *
 * NOT over function bodies (bodies are never stored in the DB — architectural
 * invariant of Lane P). Uses Postgres `~` operator on name + doc_comment.
 *
 * Input:  { pattern, repo?, limit? }
 * Output: { results: Array<{ qname, kind, name, doc_comment, file_path,
 *                            start_line, end_line }> }
 *
 * Vault scoping: enforced server-side via the caller's API key.
 */

import { fetchCodeGraphApi } from "./_fetch.js";
import type { FetchImpl } from "./types.js";

export async function handleCodeSearchText(
  args: Record<string, unknown>,
  fetchImpl: FetchImpl,
  baseUrl: string,
  apiKey: string | undefined
): Promise<unknown> {
  return fetchCodeGraphApi(fetchImpl, `${baseUrl}/v1/code-graph/search-text`, args, apiKey);
}
