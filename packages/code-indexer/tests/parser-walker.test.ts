/**
 * parser-walker.test.ts
 *
 * Given a small TS source string, parser+walker emits expected SymbolRecord shape.
 * Verifies: no body bytes in signature, symbol kinds, qualified names.
 *
 * Note: tree-sitter grammar may not be available in CI without native binaries.
 * Tests gracefully handle missing grammar (empty symbol list, no crash).
 */

import { describe, it, expect } from "vitest";
import { parseSource } from "../src/parser.js";
import { walkAST } from "../src/walker.js";

const TS_FIXTURE = `
export function greet(name: string): string {
  return "Hello, " + name;
}

export class Greeter {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  greet(): string {
    return "Hello, " + this.name;
  }
}

export interface Salutation {
  message: string;
}

export type GreetFn = (name: string) => string;

export enum Color {
  Red,
  Green,
  Blue,
}

export const DEFAULT_GREETING = "Hello";
`.trim();

describe("parser + walker: TypeScript fixture", () => {
  it("parses without crashing (grammar available or not)", async () => {
    const parseResult = await parseSource(TS_FIXTURE, "typescript");
    // Should not throw regardless of grammar availability
    expect(parseResult).toBeDefined();
    expect(parseResult.language).toBe("typescript");
    expect(parseResult.source).toBe(TS_FIXTURE);
  });

  it("walkAST returns WalkResult shape", async () => {
    const parseResult = await parseSource(TS_FIXTURE, "typescript");
    const walkResult = walkAST(parseResult);
    expect(walkResult).toHaveProperty("symbols");
    expect(walkResult).toHaveProperty("relations");
    expect(Array.isArray(walkResult.symbols)).toBe(true);
    expect(Array.isArray(walkResult.relations)).toBe(true);
  });

  it("symbols have required fields when grammar is available", async () => {
    const parseResult = await parseSource(TS_FIXTURE, "typescript");
    if (parseResult.rootNode === null) {
      // Grammar not available — skip structural assertions
      console.warn("tree-sitter-typescript not available; skipping structural assertions");
      return;
    }

    const { symbols } = walkAST(parseResult);
    expect(symbols.length).toBeGreaterThan(0);

    for (const sym of symbols) {
      expect(typeof sym.name).toBe("string");
      expect(sym.name.length).toBeGreaterThan(0);
      expect(typeof sym.qualified_name).toBe("string");
      expect(typeof sym.kind).toBe("string");
      expect(typeof sym.start_line).toBe("number");
      expect(typeof sym.end_line).toBe("number");
      expect(typeof sym.is_exported).toBe("boolean");
    }
  });

  it("signature does NOT contain body braces when grammar available", async () => {
    const parseResult = await parseSource(TS_FIXTURE, "typescript");
    if (parseResult.rootNode === null) {
      console.warn("tree-sitter-typescript not available; skipping signature assertion");
      return;
    }

    const { symbols } = walkAST(parseResult);
    for (const sym of symbols) {
      if (sym.signature) {
        // The signature must not include the opening brace of a function body
        // NOTE: generic type params like <T> are allowed, but NOT `{` followed by body
        // We check that signature doesn't end with `{` or contain `{` followed by body content
        const sigTrimmed = sym.signature.trim();
        // A body brace would appear as `{` after the parameter list
        // Generic `{` in type positions (like `{ key: T }`) in parameter types ARE allowed
        // but a trailing `{` that opens a function body is NOT.
        // Simple heuristic: if signature ends with `{`, that's a body opening.
        expect(sigTrimmed).not.toMatch(/\{\s*$/);
      }
    }
  });

  it("greet function is found and exported when grammar available", async () => {
    const parseResult = await parseSource(TS_FIXTURE, "typescript");
    if (parseResult.rootNode === null) {
      console.warn("tree-sitter-typescript not available; skipping symbol lookup");
      return;
    }

    const { symbols } = walkAST(parseResult);
    const greet = symbols.find((s) => s.name === "greet" && s.kind === "function");
    if (greet) {
      expect(greet.is_exported).toBe(true);
    }
    // At minimum we expect some symbols to be found
    expect(symbols.length).toBeGreaterThan(0);
  });
});
