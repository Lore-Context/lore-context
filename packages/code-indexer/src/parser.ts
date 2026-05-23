/**
 * Tree-sitter parser wrapper for Tier-1 languages (TypeScript/JavaScript/TSX/JSX, Python, Go).
 * Tier-2 languages (Rust, Java, C, C++, C#, Ruby, PHP) gracefully return an empty symbol list
 * with a warning if the grammar package is not installed — they do NOT throw.
 *
 * Import pattern: grammars are loaded lazily so a missing package does not crash module load.
 */

import type { FilePayload } from "./types.js";

/** Language tags supported by the wire format (FilePayloadSchema.language enum). */
export type LanguageTag =
  | "typescript"
  | "javascript"
  | "tsx"
  | "jsx"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "ruby"
  | "php";

/** Opaque AST node returned by tree-sitter — we only expose the minimal surface we need. */
export interface AstNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: AstNode[];
  parent: AstNode | null;
  isNamed: boolean;
  childForFieldName(name: string): AstNode | null;
  namedChildren: AstNode[];
}

/** Result of parsing a single source file. */
export interface ParseResult {
  /** Detected / specified language. */
  language: LanguageTag;
  /** Original source text (used by walker for line slicing). */
  source: string;
  /** Root AST node, or null if parse failed gracefully (missing grammar). */
  rootNode: AstNode | null;
  /** Warning message when grammar unavailable — callers should log this. */
  warning?: string;
}

// ---------------------------------------------------------------------------
// Internal: language parser cache (singleton per language).
// ---------------------------------------------------------------------------

/** Tracks whether we have attempted to load each grammar. */
const _grammarCache = new Map<string, unknown>();
const _grammarFailed = new Set<string>();

/** Lazily load tree-sitter Parser + language grammar. Returns null on failure. */
async function loadParser(
  lang: LanguageTag
): Promise<{ Parser: unknown; language: unknown } | null> {
  const cacheKey = lang;
  if (_grammarFailed.has(cacheKey)) return null;
  if (_grammarCache.has(cacheKey)) {
    return _grammarCache.get(cacheKey) as { Parser: unknown; language: unknown };
  }

  try {
    // tree-sitter main module
    const TreeSitter = (await import("tree-sitter" as string)) as {
      default: new () => {
        setLanguage(lang: unknown): void;
        parse(src: string): { rootNode: AstNode };
      };
    };
    const Parser = TreeSitter.default;

    let grammarModule: { default: unknown } | null = null;

    if (lang === "typescript" || lang === "javascript" || lang === "tsx" || lang === "jsx") {
      try {
        const mod = (await import("tree-sitter-typescript" as string)) as {
          default: { typescript: unknown; tsx: unknown };
        };
        const grammar =
          lang === "tsx" || lang === "jsx"
            ? mod.default.tsx
            : mod.default.typescript;
        grammarModule = { default: grammar };
      } catch {
        _grammarFailed.add(cacheKey);
        return null;
      }
    } else if (lang === "python") {
      try {
        grammarModule = (await import("tree-sitter-python" as string)) as {
          default: unknown;
        };
      } catch {
        _grammarFailed.add(cacheKey);
        return null;
      }
    } else if (lang === "go") {
      try {
        grammarModule = (await import("tree-sitter-go" as string)) as {
          default: unknown;
        };
      } catch {
        _grammarFailed.add(cacheKey);
        return null;
      }
    } else {
      // Tier-2 language: grammar not bundled
      _grammarFailed.add(cacheKey);
      return null;
    }

    if (!grammarModule) {
      _grammarFailed.add(cacheKey);
      return null;
    }

    const result = { Parser, language: grammarModule.default };
    _grammarCache.set(cacheKey, result);
    return result;
  } catch {
    _grammarFailed.add(cacheKey);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Infer language from file extension. Returns null for unknown extensions.
 */
export function inferLanguage(filePath: string): LanguageTag | null {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, LanguageTag> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    cc: "cpp",
    cpp: "cpp",
    cxx: "cpp",
    cs: "csharp",
    rb: "ruby",
    php: "php",
  };
  return map[ext] ?? null;
}

/**
 * Parse a source file body string with the given language tag.
 * Returns a ParseResult — on missing grammar, rootNode is null and warning is set.
 */
export async function parseSource(
  source: string,
  language: LanguageTag
): Promise<ParseResult> {
  const loaded = await loadParser(language);

  if (!loaded) {
    return {
      language,
      source,
      rootNode: null,
      warning: `Grammar for language "${language}" is not installed — returning empty symbol list. Install tree-sitter-${language} to enable parsing.`,
    };
  }

  try {
    const { Parser, language: grammar } = loaded as {
      Parser: new () => {
        setLanguage(l: unknown): void;
        parse(src: string): { rootNode: AstNode };
      };
      language: unknown;
    };

    const parser = new Parser();
    parser.setLanguage(grammar);
    const tree = parser.parse(source);
    return { language, source, rootNode: tree.rootNode };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      language,
      source,
      rootNode: null,
      warning: `Parse error for language "${language}": ${msg}`,
    };
  }
}

/**
 * Parse a file by path, inferring language from extension.
 * Reads source from `fileContent` parameter (caller is responsible for I/O).
 */
export async function parseFile(
  filePath: string,
  fileContent: string
): Promise<ParseResult> {
  const lang = inferLanguage(filePath);
  if (!lang) {
    return {
      language: "typescript", // default tag (won't be used if rootNode is null)
      source: fileContent,
      rootNode: null,
      warning: `Unknown file extension for "${filePath}" — skipping parse.`,
    };
  }
  return parseSource(fileContent, lang);
}
