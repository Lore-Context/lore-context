import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

type Fixture = {
  id: string;
  method: string;
  path: string;
  tsMethod: string;
  pyMethod: string;
};

const fixtures = JSON.parse(
  readFileSync(
    path.resolve(process.cwd(), "..", "..", "scripts", "sdk", "request-shape-fixtures.json"),
    "utf8",
  ),
) as Fixture[];

const tsClientSource = readFileSync(
  path.resolve(process.cwd(), "Client.ts"),
  "utf8",
);

describe("TS SDK request-shape parity fixture", () => {
  for (const fixture of fixtures) {
    it(`${fixture.id} surface is present in TS client`, () => {
      const methodNeedle = new RegExp(`\\b${fixture.tsMethod}\\b`);
      expect(tsClientSource).toMatch(methodNeedle);
      expect(tsClientSource).toContain(`"${fixture.path}"`);
      expect(tsClientSource).toContain(`method: "${fixture.method}"`);
    });
  }
});
