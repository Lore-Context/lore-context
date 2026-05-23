import { describe, expect, it } from "vitest";
import { redactText, redactTurns } from "../src/redaction.js";

describe("redactText", () => {
  it("removes <private> envelopes case-insensitively", () => {
    const result = redactText("public <PRIVATE>secret</PRIVATE> tail");
    expect(result.privateRemoved).toBe(true);
    expect(result.text).toContain("[PRIVATE_REMOVED]");
    expect(result.text).not.toContain("secret");
  });

  it("redacts anthropic, github, openai keys", () => {
    const r1 = redactText("token sk-ant-AAAAAAAAAAAAAAAAAAAAAAAAAA tail");
    expect(r1.secretsRemoved).toBeGreaterThanOrEqual(1);
    expect(r1.text).toContain("[REDACTED:anthropic]");

    const r2 = redactText("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345");
    expect(r2.text).toContain("[REDACTED:github-pat]");

    const r3 = redactText("Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    expect(r3.text).toContain("[REDACTED:bearer]");
  });

  it("redacts KEY=value style env secrets", () => {
    const r = redactText('export API_KEY="abcdef0123456789abcdef"');
    expect(r.secretsRemoved).toBe(1);
    expect(r.text).toContain("[REDACTED:env-secret]");
  });

  it("leaves benign text untouched", () => {
    const r = redactText("Just a regular sentence about TypeScript.");
    expect(r.modified).toBe(false);
    expect(r.text).toBe("Just a regular sentence about TypeScript.");
  });
});

describe("redactTurns", () => {
  it("aggregates stats and marks turns appropriately", () => {
    const { turns, stats } = redactTurns([
      { index: 0, role: "user", text: "Hi" },
      { index: 1, role: "user", text: "<private>plan</private>" },
      { index: 2, role: "assistant", text: "key sk-ant-AAAAAAAAAAAAAAAAAAAAAAAAAA done" }
    ]);

    expect(stats.privateBlocksStripped).toBe(1);
    expect(stats.secretsRemoved).toBe(1);
    expect(stats.turnsAffected).toBe(2);

    expect(turns[0].redacted).toBeFalsy();
    expect(turns[1].private).toBe(true);
    expect(turns[1].text).toBe("");
    expect(turns[2].text).toContain("[REDACTED:anthropic]");
  });
});
