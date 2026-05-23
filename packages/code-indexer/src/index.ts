/**
 * @lore-context/code-indexer — public API
 *
 * Exports the CodeIndexer class + convenience functions + options types.
 * Wire-format types are re-exported from @lore-context/sdk/code-graph-types.
 */

export { CodeIndexer, indexFull, indexFile } from "./indexer.js";
export type { CodeIndexerOptions, IndexStats } from "./indexer.js";

export { installGitHook } from "./cli/install-git-hook.js";

export { FileWatcher } from "./watcher.js";
export type { WatcherOptions } from "./watcher.js";

export { parseFile, parseSource, inferLanguage } from "./parser.js";
export type { ParseResult, LanguageTag } from "./parser.js";

export { walkAST } from "./walker.js";
export type { WalkResult } from "./walker.js";

export { applyPrivacyFilter, buildFilePayload, checkFileRejection } from "./privacy-filter.js";
export type { FilterResult } from "./privacy-filter.js";
