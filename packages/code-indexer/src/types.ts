/**
 * Internal type re-exports and convenience aliases.
 * Consumers should import wire types from @lore-context/sdk/code-graph-types.
 */

export type {
  SymbolRecord,
  RelationRecord,
  FilePayload,
  UpsertPayload,
  SymbolKind,
  RelationKind,
} from "@lore-context/sdk/code-graph-types";

export { stripSecretPatterns } from "@lore-context/sdk/code-graph-types";
