/**
 * privacy-filter-doc-comment.test.ts
 *
 * P7 doc_comment stripping:
 * - Fixture with JSDoc containing a secret pattern
 * - Assert doc_comment contains function name but stripped of secret
 */

import { describe, it, expect } from "vitest";
import { stripSecretPatterns } from "@lore-context/sdk/code-graph-types";
import { applyPrivacyFilter } from "../src/privacy-filter.js";
import type { SymbolRecord } from "@lore-context/sdk/code-graph-types";

describe("privacy-filter doc_comment P7 stripping", () => {
  it("strips sk_live_ pattern from doc_comment", () => {
    const docWithSecret = `/** @example apiKey: "sk_live_abc123456789012345" */`;
    const stripped = stripSecretPatterns(docWithSecret);

    // The secret pattern should be replaced
    expect(stripped).not.toContain("sk_live_abc123456789012345");
    // The sentinel should be present
    expect(stripped).toContain("«[REDACTED:secret-pattern]»");
    // The surrounding text should remain
    expect(stripped).toContain("@example apiKey:");
  });

  it("payload doc_comment has secret stripped but function name preserved", () => {
    const secretDoc = `/** authenticateUser — @example apiKey: "sk_live_abc123456789012345" */`;

    const symbol: SymbolRecord = {
      name: "authenticateUser",
      qualified_name: "authenticateUser",
      kind: "function",
      start_line: 5,
      end_line: 10,
      is_exported: true,
      doc_comment: secretDoc,
      signature: "function authenticateUser(token: string): boolean",
    };

    const result = applyPrivacyFilter({
      relativePath: "src/auth.ts",
      language: "typescript",
      contentHash: "a".repeat(16),
      astHash: "b".repeat(16),
      lastModifiedAt: new Date().toISOString(),
      symbols: [symbol],
      relations: [],
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;

    const payloadSymbol = result.payload.symbols.find((s) => s.name === "authenticateUser");
    expect(payloadSymbol).toBeDefined();
    if (!payloadSymbol) return;

    // Secret must be stripped
    expect(payloadSymbol.doc_comment ?? "").not.toContain("sk_live_abc123456789012345");
    // Function name in the doc should still be present
    expect(payloadSymbol.doc_comment ?? "").toContain("authenticateUser");
  });

  it("does not alter doc_comment without secrets", () => {
    const cleanDoc = `/** Greets a user by name. @param name The user's name. */`;

    const symbol: SymbolRecord = {
      name: "greet",
      qualified_name: "greet",
      kind: "function",
      start_line: 1,
      end_line: 3,
      is_exported: true,
      doc_comment: cleanDoc,
    };

    const result = applyPrivacyFilter({
      relativePath: "src/greet.ts",
      language: "typescript",
      contentHash: "a".repeat(16),
      astHash: "b".repeat(16),
      lastModifiedAt: new Date().toISOString(),
      symbols: [symbol],
      relations: [],
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;

    const payloadSymbol = result.payload.symbols.find((s) => s.name === "greet");
    expect(payloadSymbol?.doc_comment).toBe(cleanDoc);
  });

  it("strips AWS AKIA key from doc_comment", () => {
    const docWithAWS = "/** AWS config: AKIAIOSFODNN7EXAMPLE */";
    const stripped = stripSecretPatterns(docWithAWS);
    expect(stripped).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(stripped).toContain("«[REDACTED:secret-pattern]»");
  });

  it("strips GitHub PAT from doc_comment", () => {
    const docWithGHPAT = "/** Uses token: ghp_1234567890abcdefghijklmnop */";
    const stripped = stripSecretPatterns(docWithGHPAT);
    expect(stripped).not.toContain("ghp_1234567890abcdefghijklmnop");
    expect(stripped).toContain("«[REDACTED:secret-pattern]»");
  });
});
