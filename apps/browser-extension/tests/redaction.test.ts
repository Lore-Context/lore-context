import { describe, expect, it } from "vitest";
import { maskToken, redactForLog, redactString, summarizeForUpload } from "../src/redaction.js";

describe("redactString", () => {
  it("masks OpenAI keys", () => {
    expect(redactString("token sk-abcdefghijklmnop12345")).toContain("<redacted:openai-key>");
  });
  it("masks Lore device tokens", () => {
    expect(redactString("token lct_device_abcdef1234567890ABCDEF")).toContain("<redacted:lore-token>");
  });
  it("masks AWS access keys", () => {
    const aws = "AKIA" + "1234567890ABCDEF";
    expect(redactString(`key ${aws}`)).toContain("<redacted:aws-key>");
  });
  it("masks Bearer tokens", () => {
    expect(redactString("Authorization: Bearer abcdef1234567890")).toContain("<redacted:bearer>");
  });
  it("leaves benign content alone", () => {
    expect(redactString("hello world")).toBe("hello world");
  });
});

describe("redactForLog", () => {
  it("masks token-named fields regardless of content", () => {
    const input = { deviceToken: "lct_device_abcdef1234567890ABCD", note: "ok" };
    const out = redactForLog(input) as Record<string, string>;
    expect(out.deviceToken).toMatch(/\*\*\*\*…[A-Za-z0-9]{4}/);
    expect(out.note).toBe("ok");
  });
  it("recurses into nested objects and arrays", () => {
    const out = redactForLog({ items: [{ access_token: "ghp_abcdef1234567890XYZ" }] }) as { items: Array<{ access_token: string }> };
    expect(out.items[0].access_token).toMatch(/\*\*\*\*…/);
  });
});

describe("maskToken", () => {
  it("keeps a recognizable prefix and last 4", () => {
    expect(maskToken("lct_device_abcdef1234567890ABCD")).toMatch(/^lct_device_\*\*\*\*…[A-Za-z0-9]{4}$/);
  });
  it("returns *** for short or empty tokens", () => {
    expect(maskToken("")).toBe("***");
    expect(maskToken("abc")).toBe("***");
  });
});

describe("summarizeForUpload", () => {
  it("redacts secrets and collapses whitespace", () => {
    const summary = summarizeForUpload("hello\n\nsk-abcdefghijklmnop12345 world");
    expect(summary).not.toContain("sk-abcdefghijklmnop12345");
    expect(summary).not.toContain("\n\n");
  });
  it("strips <private> blocks", () => {
    expect(summarizeForUpload("a <private>secret</private> b")).toContain("<redacted:private>");
  });
  it("truncates to maxChars", () => {
    const summary = summarizeForUpload("a".repeat(500), 50);
    expect(summary.length).toBeLessThanOrEqual(50);
  });
});
