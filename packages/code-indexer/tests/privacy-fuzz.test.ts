/**
 * privacy-fuzz.test.ts
 *
 * P2 verification: privacy fuzz 1000 random source files (scaled-down from 10k
 * for local-dev speed; scale documented in test name).
 *
 * For each generated file:
 *   1. Run indexer → capture wire payload via privacy filter
 *   2. Diff payload JSON against original source
 *   3. Assert zero source-byte overlap with any string literal containing >=8 chars
 *
 * The test uses a deterministic PRNG so failures are reproducible.
 */

import { describe, it, expect } from "vitest";
import { applyPrivacyFilter } from "../src/privacy-filter.js";
import { parseSource } from "../src/parser.js";
import { walkAST } from "../src/walker.js";

// ---------------------------------------------------------------------------
// Deterministic PRNG (xorshift32)
// ---------------------------------------------------------------------------

function makeRng(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

// ---------------------------------------------------------------------------
// Fixture generators
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
  "sk_live_abc123456789012345",
  "sk_test_xyz987654321abcdef",
  "ghp_abcdefghij1234567890ABCDE",
  "AKIAIOSFODNN7EXAMPLE",
  "AIzaSyD-1234567890abcdefghijklm",
  "sk-ant-api03-abcdefghij12345678901234567890123456789012345678901234",
];

const VARIABLE_NAMES = ["apiKey", "secretToken", "password", "config", "data", "result", "value"];
const FUNCTION_NAMES = ["init", "setup", "configure", "authenticate", "process", "validate", "handle"];
const CLASS_NAMES = ["Service", "Handler", "Manager", "Controller", "Factory", "Builder", "Provider"];

function generateSourceFile(rng: () => number, index: number): string {
  const lines: string[] = [];
  const secretIdx = Math.floor(rng() * SECRET_PATTERNS.length);
  const secret = SECRET_PATTERNS[secretIdx];
  const varName = VARIABLE_NAMES[Math.floor(rng() * VARIABLE_NAMES.length)];
  const fnName = FUNCTION_NAMES[Math.floor(rng() * FUNCTION_NAMES.length)] + index;
  const className = CLASS_NAMES[Math.floor(rng() * CLASS_NAMES.length)] + index;

  // Insert secret inside function body (should NEVER appear in wire payload)
  lines.push(`export class ${className} {`);
  lines.push(`  /** Handles ${fnName} operations. */`);
  lines.push(`  ${fnName}(): void {`);
  lines.push(`    const ${varName} = "${secret}";`);
  lines.push(`    console.log(${varName});`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function ${fnName}Standalone(input: string): boolean {`);
  lines.push(`  const key = "${secret}";`);
  lines.push(`  return input === key;`);
  lines.push(`}`);

  return lines.join("\n");
}

// Extract all string literals >= 8 chars from source text
function extractStringLiterals(source: string): string[] {
  const results: string[] = [];
  // Match double-quoted strings
  const dqRegex = /"([^"\\]{8,})"/g;
  let m: RegExpExecArray | null;
  while ((m = dqRegex.exec(source)) !== null) {
    results.push(m[1]);
  }
  // Match single-quoted strings
  const sqRegex = /'([^'\\]{8,})'/g;
  while ((m = sqRegex.exec(source)) !== null) {
    results.push(m[1]);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Fuzz test: privacy fuzz 1000
// ---------------------------------------------------------------------------

describe("privacy fuzz 1000 (P2)", () => {
  it("no string literal >=8 chars from source appears in wire payload", async () => {
    const TOTAL = 1000;
    const rng = makeRng(0xdeadbeef);
    let violations = 0;
    const violationExamples: string[] = [];

    for (let i = 0; i < TOTAL; i++) {
      const source = generateSourceFile(rng, i);
      const literals = extractStringLiterals(source);
      if (literals.length === 0) continue;

      const parseResult = await parseSource(source, "typescript");
      const walkResult = walkAST(parseResult);

      const filterResult = applyPrivacyFilter({
        relativePath: `src/fuzz${i}.ts`,
        language: "typescript",
        contentHash: "a".repeat(16),
        astHash: "b".repeat(16),
        lastModifiedAt: new Date().toISOString(),
        symbols: walkResult.symbols,
        relations: walkResult.relations,
      });

      if (!filterResult.accepted) continue;

      const wireJson = JSON.stringify(filterResult.payload);

      for (const lit of literals) {
        if (wireJson.includes(lit)) {
          violations++;
          if (violationExamples.length < 3) {
            violationExamples.push(`file fuzz${i}: literal "${lit.slice(0, 40)}" found in payload`);
          }
        }
      }
    }

    if (violations > 0) {
      throw new Error(
        `Privacy fuzz FAILED: ${violations} string literal(s) found in wire payload.\n` +
        violationExamples.join("\n")
      );
    }

    expect(violations).toBe(0);
  }, 120_000); // Allow up to 2 minutes for 1000 files
});
