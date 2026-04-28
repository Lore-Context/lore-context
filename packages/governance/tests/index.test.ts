import { describe, expect, it } from "vitest";
import { redactSensitiveContent, scanRiskTags, shouldRequireReview } from "../src/index.js";

describe("scanRiskTags", () => {
  it("marks likely API keys", () => {
    expect(scanRiskTags("token sk_1234567890abcdef")).toContain("api_key");
    expect(scanRiskTags("token sk-1234567890abcdef")).toContain("api_key");
  });

  it("returns no tags for normal text", () => {
    expect(scanRiskTags("default to local-only development")).toEqual([]);
  });

  it("marks AWS access keys and requires review", () => {
    const awsKeyFixture = "AKIA" + "1234567890ABCDEF";
    const tags = scanRiskTags(`key ${awsKeyFixture}`);
    expect(tags).toContain("aws_access_key");
    expect(shouldRequireReview(tags)).toBe(true);
  });

  it("redacts sensitive patterns", () => {
    expect(redactSensitiveContent("password=super-secret-value")).toBe("<redacted:password>");
    expect(redactSensitiveContent("tokens sk_1234567890abcdef and sk-abcdef1234567890")).toBe("tokens <redacted:api_key> and <redacted:api_key>");
  });
});
