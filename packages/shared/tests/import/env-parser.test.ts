// V2.0.5-I3 acceptance: .env import auto-sets category=env_var.

import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/import/env-parser.js";

describe("parseEnv", () => {
  it("parses simple KEY=value lines", () => {
    const { secrets, warnings } = parseEnv("FOO=bar\nBAZ=qux");
    expect(warnings).toEqual([]);
    expect(secrets).toEqual([
      { label: "FOO", value: "bar", category: "env_var", tags: [] },
      { label: "BAZ", value: "qux", category: "env_var", tags: [] }
    ]);
  });

  it("V2.0.5-I3: auto-sets category=env_var for every entry", () => {
    const { secrets } = parseEnv("AWS_ACCESS_KEY_ID=AKIA1234\nAWS_SECRET=xyz");
    expect(secrets.every((s) => s.category === "env_var")).toBe(true);
  });

  it("handles double-quoted values with escape sequences", () => {
    const { secrets } = parseEnv('MSG="line1\\nline2"\nQ="he said \\"hi\\""');
    expect(secrets[0].value).toBe("line1\nline2");
    expect(secrets[1].value).toBe('he said "hi"');
  });

  it("handles single-quoted values verbatim (no escape processing)", () => {
    const { secrets } = parseEnv("LITERAL='hello\\nworld'");
    expect(secrets[0].value).toBe("hello\\nworld");
  });

  it("strips inline comments after unquoted values", () => {
    const { secrets } = parseEnv("KEY=value # inline note");
    expect(secrets[0].value).toBe("value");
  });

  it("preserves '#' inside quoted values", () => {
    const { secrets } = parseEnv('URL="https://x.com/#anchor"');
    expect(secrets[0].value).toBe("https://x.com/#anchor");
  });

  it("ignores comment lines and blanks", () => {
    const input = ["# top-of-file comment", "", "FOO=1", "  # inner comment", "BAR=2"].join("\n");
    const { secrets, warnings } = parseEnv(input);
    expect(warnings).toEqual([]);
    expect(secrets.map((s) => s.label)).toEqual(["FOO", "BAR"]);
  });

  it("supports 'export KEY=value' shell-style prefix", () => {
    const { secrets } = parseEnv("export DEBUG=1\nexport NODE_ENV=production");
    expect(secrets.map((s) => s.label)).toEqual(["DEBUG", "NODE_ENV"]);
  });

  it("emits warning for malformed lines but does not throw", () => {
    const { secrets, warnings } = parseEnv("FOO=1\n!!notenv!!\nBAR=2");
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/line 2/);
    expect(secrets.map((s) => s.label)).toEqual(["FOO", "BAR"]);
  });

  it("strips UTF-8 BOM from first line", () => {
    const input = "﻿FOO=bar";
    const { secrets } = parseEnv(input);
    expect(secrets[0].label).toBe("FOO");
    expect(secrets[0].value).toBe("bar");
  });

  it("handles empty value", () => {
    const { secrets } = parseEnv("EMPTY=");
    expect(secrets).toEqual([{ label: "EMPTY", value: "", category: "env_var", tags: [] }]);
  });

  it("handles values containing '='", () => {
    const { secrets } = parseEnv("URL=postgres://user:pass@host/db?ssl=true");
    expect(secrets[0].value).toBe("postgres://user:pass@host/db?ssl=true");
  });

  it("handles 100-row realistic input cleanly", () => {
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) {
      lines.push(`SECRET_${i}=value_${i}_${Math.random().toString(36).slice(2)}`);
    }
    const { secrets, warnings } = parseEnv(lines.join("\n"));
    expect(secrets.length).toBe(100);
    expect(warnings).toEqual([]);
    expect(secrets.every((s) => s.category === "env_var")).toBe(true);
  });
});
