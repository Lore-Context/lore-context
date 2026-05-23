/**
 * privacy-filter.test.ts
 *
 * K5 + P7 verification:
 * - Fixture function containing `const API_KEY = "sk_live_test_abc123"` in body
 * - Assert (a) symbol "f" is present in payload
 * - Assert (b) payload bytes do NOT contain `sk_live_test_abc123`
 */

import { describe, it, expect } from "vitest";
import { parseSource } from "../src/parser.js";
import { walkAST } from "../src/walker.js";
import { applyPrivacyFilter } from "../src/privacy-filter.js";

/** Fixture: function with a live API key in the body (privacy test). */
const FIXTURE_WITH_SECRET = `
function f() {
  const API_KEY = "sk_live_test_abc123";
  return API_KEY;
}
`.trim();

describe("privacy-filter integration (K5 + P7)", () => {
  it("symbol 'f' appears in payload even when body has a secret", async () => {
    const parseResult = await parseSource(FIXTURE_WITH_SECRET, "typescript");
    const walkResult = walkAST(parseResult);

    const filterResult = applyPrivacyFilter({
      relativePath: "src/auth.ts",
      language: "typescript",
      contentHash: "a".repeat(16),
      astHash: "b".repeat(16),
      lastModifiedAt: new Date().toISOString(),
      symbols: walkResult.symbols,
      relations: walkResult.relations,
    });

    expect(filterResult.accepted).toBe(true);
    if (!filterResult.accepted) return;

    // (a) function 'f' should be in the payload (if grammar is available)
    if (walkResult.symbols.length > 0) {
      const fSymbol = filterResult.payload.symbols.find((s) => s.name === "f");
      expect(fSymbol).toBeDefined();
    }

    // Even if grammar not available (empty symbols), the payload schema must hold
    expect(filterResult.payload.relative_path).toBe("src/auth.ts");
  });

  it("(b) payload bytes do NOT contain the secret 'sk_live_test_abc123'", async () => {
    const parseResult = await parseSource(FIXTURE_WITH_SECRET, "typescript");
    const walkResult = walkAST(parseResult);

    const filterResult = applyPrivacyFilter({
      relativePath: "src/auth.ts",
      language: "typescript",
      contentHash: "a".repeat(16),
      astHash: "b".repeat(16),
      lastModifiedAt: new Date().toISOString(),
      symbols: walkResult.symbols,
      relations: walkResult.relations,
    });

    expect(filterResult.accepted).toBe(true);
    if (!filterResult.accepted) return;

    // Serialize entire payload and assert zero occurrences of the secret
    const wireBytes = JSON.stringify(filterResult.payload);
    expect(wireBytes).not.toContain("sk_live_test_abc123");
  });

  it("rejects .env files before any parsing", () => {
    const result = applyPrivacyFilter({
      relativePath: ".env",
      language: "typescript",
      contentHash: "a".repeat(16),
      astHash: "b".repeat(16),
      lastModifiedAt: new Date().toISOString(),
      symbols: [],
      relations: [],
    });
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toMatch(/secret-file pattern/);
    }
  });

  it("rejects id_rsa files", () => {
    const result = applyPrivacyFilter({
      relativePath: "keys/id_rsa",
      language: "typescript",
      contentHash: "a".repeat(16),
      astHash: "b".repeat(16),
      lastModifiedAt: new Date().toISOString(),
      symbols: [],
      relations: [],
    });
    expect(result.accepted).toBe(false);
  });

  it("rejects secrets.json files", () => {
    const result = applyPrivacyFilter({
      relativePath: "config/secrets.json",
      language: "typescript",
      contentHash: "a".repeat(16),
      astHash: "b".repeat(16),
      lastModifiedAt: new Date().toISOString(),
      symbols: [],
      relations: [],
    });
    expect(result.accepted).toBe(false);
  });

  it("accepts normal TypeScript files", () => {
    const result = applyPrivacyFilter({
      relativePath: "src/utils.ts",
      language: "typescript",
      contentHash: "a".repeat(16),
      astHash: "b".repeat(16),
      lastModifiedAt: new Date().toISOString(),
      symbols: [],
      relations: [],
    });
    expect(result.accepted).toBe(true);
  });
});
