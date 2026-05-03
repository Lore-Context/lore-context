import { describe, it, expect } from "vitest";
import { redactInputForModel, redactInputsForModel, DEFAULT_REDACTION_PATTERNS } from "../src/redaction.js";

describe("redactInputForModel", () => {
  it("redacts OpenAI-style secret keys", () => {
    const r = redactInputForModel("My key is sk-abcdefghijklmnopqrstuvwx and works.");
    expect(r.redacted).not.toContain("sk-abcdefghijklmnopqrstuvwx");
    expect(r.redacted).toContain("[REDACTED:openai_key]");
    expect(r.matchCount).toBe(1);
    expect(r.patterns).toContain("openai_key");
  });

  it("redacts password=, secret=, token=, api_key= forms", () => {
    const input = "password=hunter2 secret=mySecret api_key=ABCDEF token=xyz123";
    const r = redactInputForModel(input);
    expect(r.redacted).not.toContain("hunter2");
    expect(r.redacted).not.toContain("mySecret");
    expect(r.redacted).not.toContain("ABCDEF");
    expect(r.redacted).not.toContain("xyz123");
    expect(r.matchCount).toBeGreaterThanOrEqual(4);
  });

  it("redacts JWT-shaped bearer tokens", () => {
    const r = redactInputForModel(
      "authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signaturepart",
    );
    expect(r.redacted).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(r.matchCount).toBeGreaterThan(0);
  });

  it("leaves clean text untouched", () => {
    const safe = "Run pnpm build to compile and deploy.";
    const r = redactInputForModel(safe);
    expect(r.redacted).toBe(safe);
    expect(r.matchCount).toBe(0);
    expect(r.patterns).toEqual([]);
  });

  it("handles empty/null inputs without throwing", () => {
    expect(redactInputForModel("")).toEqual({ redacted: "", matchCount: 0, patterns: [] });
    expect(redactInputForModel(undefined as unknown as string)).toEqual({ redacted: "", matchCount: 0, patterns: [] });
  });

  it("redacts Lore service tokens", () => {
    const r = redactInputForModel("token = lct_service_AAAABBBBCCCC1234");
    expect(r.redacted).not.toContain("lct_service_AAAABBBBCCCC1234");
  });

  it("default patterns cover all common credential shapes", () => {
    const names = DEFAULT_REDACTION_PATTERNS.map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "openai_key",
        "anthropic_key",
        "github_token",
        "bearer_jwt",
        "authorization_header",
        "password_kv",
        "api_key_kv",
        "token_kv",
      ]),
    );
  });
});

describe("redactInputsForModel", () => {
  it("redacts a list and reports merged stats", () => {
    const r = redactInputsForModel([
      "api_key=ABC and api_key=DEF",
      "password=hunter2",
      "completely safe content",
    ]);
    expect(r.redacted[0]).not.toContain("ABC");
    expect(r.redacted[0]).not.toContain("DEF");
    expect(r.redacted[1]).not.toContain("hunter2");
    expect(r.redacted[2]).toBe("completely safe content");
    expect(r.matchCount).toBeGreaterThanOrEqual(3);
  });
});
