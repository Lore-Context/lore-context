// V2.0.5-I1 acceptance: 1Password 1PIF with 50 items round-trips cleanly.

import { describe, expect, it } from "vitest";
import { ONEPIF_INTERNALS, parseOnePIF } from "../../src/import/onepassword-parser.js";

function classicItem(idx: number): string {
  const item = {
    uuid: `uuid-${idx}`,
    title: `Service ${idx}`,
    typeName: "webforms.WebForm",
    secureContents: {
      password: `pa$$word_${idx}`,
      fields: [
        { name: "username", designation: "username", type: "T", value: `user${idx}` },
        { name: "password", designation: "password", type: "P", value: `pa$$word_${idx}` }
      ],
      sections: [{ name: "main", title: "Main" }]
    }
  };
  return JSON.stringify(item);
}

describe("parseOnePIF — classic 1PIF format", () => {
  it("parses single-item 1PIF with magic delimiter framing", () => {
    const content = [ONEPIF_INTERNALS.ONEPIF_DELIMITER, classicItem(1), ONEPIF_INTERNALS.ONEPIF_DELIMITER].join("\n");
    const { secrets, skipped, warnings } = parseOnePIF(content);
    expect(secrets.length).toBe(1);
    expect(secrets[0].label).toBe("Service 1");
    expect(secrets[0].value).toBe("pa$$word_1");
    expect(secrets[0].category).toBe("password");
    expect(secrets[0].tags).toContain("Main");
    expect(skipped).toBe(0);
    expect(warnings).toEqual([]);
  });

  it("V2.0.5-I1: imports 50 items cleanly with full round-trip data", () => {
    const lines: string[] = [];
    for (let i = 0; i < 50; i++) {
      lines.push(ONEPIF_INTERNALS.ONEPIF_DELIMITER);
      lines.push(classicItem(i));
    }
    lines.push(ONEPIF_INTERNALS.ONEPIF_DELIMITER);
    const { secrets, skipped, warnings } = parseOnePIF(lines.join("\n"));
    expect(secrets.length).toBe(50);
    expect(skipped).toBe(0);
    expect(warnings).toEqual([]);
    // Round-trip data: every secret has the same value as the input
    for (let i = 0; i < 50; i++) {
      expect(secrets[i].label).toBe(`Service ${i}`);
      expect(secrets[i].value).toBe(`pa$$word_${i}`);
    }
  });

  it("skips trashed items", () => {
    const trashed = {
      uuid: "u-trash",
      title: "Old Service",
      typeName: "webforms.WebForm",
      secureContents: { password: "should-not-appear" },
      trashed: true
    };
    const live = JSON.parse(classicItem(1));
    const content = [
      ONEPIF_INTERNALS.ONEPIF_DELIMITER,
      JSON.stringify(trashed),
      ONEPIF_INTERNALS.ONEPIF_DELIMITER,
      JSON.stringify(live),
      ONEPIF_INTERNALS.ONEPIF_DELIMITER
    ].join("\n");
    const { secrets, skipped } = parseOnePIF(content);
    expect(secrets.length).toBe(1);
    expect(skipped).toBe(1);
  });

  it("skips items with no extractable value", () => {
    const empty = JSON.stringify({
      uuid: "u-empty",
      title: "Empty Service",
      typeName: "webforms.WebForm",
      secureContents: {}
    });
    const content = [ONEPIF_INTERNALS.ONEPIF_DELIMITER, empty, ONEPIF_INTERNALS.ONEPIF_DELIMITER].join("\n");
    const { secrets, skipped } = parseOnePIF(content);
    expect(secrets.length).toBe(0);
    expect(skipped).toBe(1);
  });

  it("warns on non-JSON line but does not throw", () => {
    const content = [
      ONEPIF_INTERNALS.ONEPIF_DELIMITER,
      "<not-json>",
      ONEPIF_INTERNALS.ONEPIF_DELIMITER,
      classicItem(1),
      ONEPIF_INTERNALS.ONEPIF_DELIMITER
    ].join("\n");
    const { secrets, warnings, skipped } = parseOnePIF(content);
    expect(secrets.length).toBe(1);
    expect(skipped).toBe(1);
    expect(warnings.length).toBe(1);
  });

  it("falls back to fields[type=P] when secureContents.password is absent", () => {
    const item = JSON.stringify({
      uuid: "u-fields-only",
      title: "API Service",
      typeName: "apiCredential.ApiCredential",
      secureContents: {
        fields: [
          { name: "token", type: "P", value: "ghp_xyz_token" }
        ]
      }
    });
    const content = [ONEPIF_INTERNALS.ONEPIF_DELIMITER, item, ONEPIF_INTERNALS.ONEPIF_DELIMITER].join("\n");
    const { secrets } = parseOnePIF(content);
    expect(secrets.length).toBe(1);
    expect(secrets[0].value).toBe("ghp_xyz_token");
    expect(secrets[0].category).toBe("api_key");
  });

  it("falls back to notesPlain for SecureNote items", () => {
    const item = JSON.stringify({
      uuid: "u-note",
      title: "My Secure Note",
      typeName: "securenotes.SecureNote",
      secureContents: { notesPlain: "the note body" }
    });
    const content = [ONEPIF_INTERNALS.ONEPIF_DELIMITER, item, ONEPIF_INTERNALS.ONEPIF_DELIMITER].join("\n");
    const { secrets } = parseOnePIF(content);
    expect(secrets.length).toBe(1);
    expect(secrets[0].value).toBe("the note body");
    expect(secrets[0].category).toBe("note");
  });

  it("maps typeName to category", () => {
    const cases: Array<[string, string]> = [
      ["webforms.WebForm", "password"],
      ["wallet.financial.CreditCard", "card"],
      ["wallet.onlineservices.SshKey", "ssh_key"],
      ["apiCredential.ApiCredential", "api_key"],
      ["securenotes.SecureNote", "note"]
    ];
    for (const [typeName, expected] of cases) {
      const item = JSON.stringify({
        uuid: `u-${expected}`,
        title: `Item for ${expected}`,
        typeName,
        secureContents: { password: "x", notesPlain: "x" }
      });
      const content = [ONEPIF_INTERNALS.ONEPIF_DELIMITER, item, ONEPIF_INTERNALS.ONEPIF_DELIMITER].join("\n");
      const { secrets } = parseOnePIF(content);
      expect(secrets[0].category).toBe(expected);
    }
  });
});

describe("parseOnePIF — modernized JSON array form", () => {
  it("parses a JSON array of items (no delimiter framing)", () => {
    const items = [];
    for (let i = 0; i < 5; i++) {
      items.push(JSON.parse(classicItem(i)));
    }
    const { secrets, warnings } = parseOnePIF(JSON.stringify(items));
    expect(secrets.length).toBe(5);
    expect(warnings).toEqual([]);
  });
});

describe("parseOnePIF — edge cases", () => {
  it("returns empty + warning on empty input", () => {
    const { secrets, warnings } = parseOnePIF("");
    expect(secrets).toEqual([]);
    expect(warnings).toContain("empty input");
  });

  it("returns warnings on malformed JSON array", () => {
    const { warnings } = parseOnePIF("[ not valid json");
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/parse failed/);
  });

  it("preserves uuid as description field", () => {
    const item = classicItem(7);
    const content = [ONEPIF_INTERNALS.ONEPIF_DELIMITER, item, ONEPIF_INTERNALS.ONEPIF_DELIMITER].join("\n");
    const { secrets } = parseOnePIF(content);
    expect(secrets[0].description).toBe("uuid-7");
  });
});
