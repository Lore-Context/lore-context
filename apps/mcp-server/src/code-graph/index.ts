/**
 * Lore v2.0.4 — Code Knowledge Graph MCP tool handlers (Lane C barrel exports).
 *
 * All handlers are thin HTTP forwarders to `POST /v1/code-graph/*` on the Lore
 * API. Vault scoping is enforced server-side via the caller's API key — no
 * explicit vault_id is threaded through the MCP layer.
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane C
 */

export { handleCodeSearch } from "./search.js";
export { handleCodeContext } from "./context.js";
export { handleCodeCallgraph } from "./callgraph.js";
export { handleCodeReferences } from "./references.js";
export { handleCodeImpact } from "./impact.js";
export { handleCodeListRepos } from "./list-repos.js";
export { handleCodeSearchText } from "./search-text.js";
