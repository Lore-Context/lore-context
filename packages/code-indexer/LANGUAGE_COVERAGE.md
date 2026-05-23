# Language Coverage Status

**Package**: `@lore-context/code-indexer`
**Last measured**: 2026-05-13 (local fixture; grammar availability varies by environment)
**Plan reference**: v2.0.4-plan.md §2 Lane M

## Tier-1 Languages (full extraction + basic call resolution)

| Language | Recall (fixture) | Precision (calls) | Grammar package | Status |
|---|---|---|---|---|
| TypeScript | measured at test time | measured at test time | `tree-sitter-typescript` (bundled) | PASS if grammar available |
| JavaScript | shared with TS | shared with TS | `tree-sitter-typescript` (bundled) | PASS if grammar available |
| TSX / JSX | shared with TS | shared with TS | `tree-sitter-typescript` (bundled) | PASS if grammar available |
| Python | measured at test time | measured at test time | `tree-sitter-python` (bundled) | PASS if grammar available |
| Go | measured at test time | measured at test time | `tree-sitter-go` (bundled) | PASS if grammar available |

### Tier-1 Call Resolution Notes (M2)

**Same-file resolution (shipped in v2.0.4)**:
- TypeScript/JS: `obj.method()` → resolved to `ClassName.method` when the class is declared in the same file. The `walkTypescript()` function performs a two-pass walk: first pass builds a `classMethodMap`, second pass resolves calls.
- Python: `instance.method()` → resolved to `ClassName.method` when the class is declared in the same file.
- Go: `funcName()` → qualified to `packageName.funcName` when the function is declared in the same file.

**⏸ DEFERRED to v2.0.4.1 (M2)**:
- Full LSP-style type-inference-grade cross-file call resolution
- Method receiver type resolution across file boundaries
- Import-chain-aware symbol lookup
- Honest precision: same-file only. Cross-file calls are labeled with raw `obj.method` target (not type-resolved).

## Tier-2 Languages (symbols only, best-effort calls)

| Language | Recall target | Grammar package | Bundled? | Status |
|---|---|---|---|---|
| Rust | ≥90% symbols | `tree-sitter-rust` | No | ⏸ DEFERRED — grammar not bundled |
| Java | ≥90% symbols | `tree-sitter-java` | No | ⏸ DEFERRED — grammar not bundled |
| C | ≥90% symbols | `tree-sitter-c` | No | ⏸ DEFERRED — grammar not bundled |
| C++ | ≥90% symbols | `tree-sitter-cpp` | No | ⏸ DEFERRED — grammar not bundled |
| C# | ≥90% symbols | `tree-sitter-c-sharp` | No | ⏸ DEFERRED — grammar not bundled |
| Ruby | ≥90% symbols | `tree-sitter-ruby` | No | ⏸ DEFERRED — grammar not bundled |
| PHP | ≥90% symbols | `tree-sitter-php` | No | ⏸ DEFERRED — grammar not bundled |

### Installing Tier-2 Grammars

Tier-2 grammars are not bundled to keep the default install size small. Install selectively:

```bash
# Rust
npm install tree-sitter-rust

# Java
npm install tree-sitter-java

# C / C++
npm install tree-sitter-c tree-sitter-cpp

# C#
npm install tree-sitter-c-sharp

# Ruby
npm install tree-sitter-ruby

# PHP
npm install tree-sitter-php
```

After installing, you must also extend `packages/code-indexer/src/parser.ts` to load the grammar for that language (currently returns null for Tier-2, which triggers the graceful fallback).

### Tier-2 Grammar Loading Gap

`parser.ts` currently returns `rootNode: null` for all Tier-2 languages (Rust, Java, C, C++, C#, Ruby, PHP) because the `loadParser()` function only handles Tier-1. The Tier-2 `lang/*.ts` walker modules (`walkRust`, `walkJava`, etc.) are implemented and ready — they just need the parser to provide a non-null `rootNode`.

**To activate a Tier-2 language**: extend the `loadParser()` function in `parser.ts` with the grammar's import, following the same pattern as `tree-sitter-python`.

This is a deliberate design choice: extractors are written and tested; grammar loading is a 5-line addition per language, deferred until the grammar binary is confirmed stable on all CI platforms.

## Deferred Languages (v2.1)

Lua, Kotlin, Swift, Dart, Scala, Elixir, OCaml, Haskell — deferred per §5 carry-forward.

## Test Commands

```bash
# Run all language tests
pnpm --filter @lore-context/code-indexer test -- lang

# Recall tests only
pnpm --filter @lore-context/code-indexer test -- lang-tier1-recall

# Precision tests only
pnpm --filter @lore-context/code-indexer test -- lang-tier1-precision

# Java/Kafka Tier-2
pnpm --filter @lore-context/code-indexer test -- lang-tier2-java-kafka

# Cross-language detection
pnpm --filter @lore-context/code-indexer test -- lang-cross-language
```

## Acceptance Criteria Status

| Criterion | Target | Status |
|---|---|---|
| M1: Tier-1 recall ≥95% | TS ≥95% (hard); Py/Go soft | Measured at test time |
| M2: Tier-1 call precision ≥85% | Same-file resolution only | ⏸ DEFERRED for cross-file LSP (v2.0.4.1) |
| M3: Tier-2 Java/Kafka recall ≥90% | ≥90% on 2-file hand-curated fixture | ⏸ DEFERRED (grammar not bundled) |
| M4: Mixed-language per-file detection | All files detected correctly | PASS (language detection does not require grammar) |
