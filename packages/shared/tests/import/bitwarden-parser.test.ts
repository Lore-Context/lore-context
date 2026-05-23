// V2.0.5-I2 acceptance: Bitwarden JSON with 100 items imports cleanly with
// duplicate-label detection.

import { describe, expect, it } from "vitest";
import { BITWARDEN_TYPES, parseBitwarden } from "../../src/import/bitwarden-parser.js";

function loginItem(idx: number, name?: string): Record<string, unknown> {
  return {
    id: `bw-${idx}`,
    type: BITWARDEN_TYPES.TYPE_LOGIN,
    name: name ?? `Service ${idx}`,
    login: {
      username: `user${idx}@example.com`,
      password: `bw_pa$$_${idx}`
    },
    folderId: idx % 3 === 0 ? "folder-prod" : null,
    favorite: idx === 7
  };
}

function noteItem(idx: number): Record<string, unknown> {
  return {
    id: `bw-note-${idx}`,
    type: BITWARDEN_TYPES.TYPE_SECURE_NOTE,
    name: `Note ${idx}`,
    notes: `secret-note-body-${idx}`
  };
}

function cardItem(idx: number): Record<string, unknown> {
  return {
    id: `bw-card-${idx}`,
    type: BITWARDEN_TYPES.TYPE_CARD,
    name: `Card ${idx}`,
    card: { number: `4111-1111-1111-${idx.toString().padStart(4, "0")}` }
  };
}

function exportFile(items: Array<Record<string, unknown>>): string {
  return JSON.stringify({
    encrypted: false,
    folders: [{ id: "folder-prod", name: "Production" }],
    items
  });
}

describe("parseBitwarden — V2.0.5-I2 acceptance", () => {
  it("imports a 100-item login export cleanly", () => {
    const items: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 100; i++) {
      items.push(loginItem(i));
    }
    const { secrets, duplicates, skipped, warnings } = parseBitwarden(exportFile(items));
    expect(secrets.length).toBe(100);
    expect(duplicates).toEqual([]);
    expect(skipped).toBe(0);
    expect(warnings).toEqual([]);
    expect(secrets[0].value).toBe("bw_pa$$_0");
    expect(secrets[99].value).toBe("bw_pa$$_99");
    // folder tag applied to every 3rd item
    expect(secrets[0].tags).toContain("Production");
    expect(secrets[1].tags).not.toContain("Production");
  });

  it("V2.0.5-I2: detects duplicate labels with case-insensitive compare", () => {
    const items = [loginItem(1, "GitHub"), loginItem(2, "github"), loginItem(3, "GitLab")];
    const { secrets, duplicates, skipped, warnings } = parseBitwarden(exportFile(items));
    expect(secrets.length).toBe(2); // GitHub + GitLab; second "github" is duplicate
    expect(duplicates).toEqual(["github"]);
    expect(skipped).toBe(1);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/duplicate/);
  });
});

describe("parseBitwarden — item type coverage", () => {
  it("extracts secureNote items via notes field", () => {
    const items = [noteItem(1), noteItem(2)];
    const { secrets } = parseBitwarden(exportFile(items));
    expect(secrets.length).toBe(2);
    expect(secrets[0].value).toBe("secret-note-body-1");
    expect(secrets[0].category).toBe("note");
  });

  it("extracts card items via card.number", () => {
    const items = [cardItem(1)];
    const { secrets } = parseBitwarden(exportFile(items));
    expect(secrets.length).toBe(1);
    expect(secrets[0].value).toBe("4111-1111-1111-0001");
    expect(secrets[0].category).toBe("card");
  });

  it("falls back to fields[] hidden values for items without login/notes/card", () => {
    const items = [{
      id: "bw-x",
      type: BITWARDEN_TYPES.TYPE_LOGIN,
      name: "Custom Token",
      login: { password: "" }, // empty primary
      fields: [
        { name: "token", value: "ghp_from_field", type: 1 }
      ]
    }];
    const { secrets } = parseBitwarden(exportFile(items));
    expect(secrets.length).toBe(1);
    expect(secrets[0].value).toBe("ghp_from_field");
  });

  it("applies favorite tag", () => {
    const items: Array<Record<string, unknown>> = [];
    for (let i = 0; i <= 10; i++) {
      items.push(loginItem(i)); // idx 7 is favorite=true
    }
    const { secrets } = parseBitwarden(exportFile(items));
    const fav = secrets.find((s) => s.label === "Service 7");
    expect(fav).toBeDefined();
    expect(fav!.tags).toContain("favorite");
  });

  it("applies custom field tags", () => {
    const items = [{
      id: "bw-fielded",
      type: BITWARDEN_TYPES.TYPE_LOGIN,
      name: "Custom Service",
      login: { password: "x" },
      fields: [
        { name: "expires", value: "2026", type: 0 },
        { name: "env", value: "prod", type: 0 }
      ]
    }];
    const { secrets } = parseBitwarden(exportFile(items));
    expect(secrets[0].tags).toContain("field:expires");
    expect(secrets[0].tags).toContain("field:env");
  });
});

describe("parseBitwarden — error handling", () => {
  it("rejects encrypted export", () => {
    const enc = JSON.stringify({ encrypted: true, items: [] });
    const { secrets, warnings } = parseBitwarden(enc);
    expect(secrets).toEqual([]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/ENCRYPTED/);
  });

  it("warns on invalid JSON", () => {
    const { secrets, warnings } = parseBitwarden("not json");
    expect(secrets).toEqual([]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/parse failed/);
  });

  it("skips items with empty name", () => {
    const items = [
      { id: "bw-1", type: 1, name: "", login: { password: "x" } },
      { id: "bw-2", type: 1, name: "Valid", login: { password: "y" } }
    ];
    const { secrets, skipped, warnings } = parseBitwarden(exportFile(items));
    expect(secrets.length).toBe(1);
    expect(skipped).toBe(1);
    expect(warnings.length).toBe(1);
  });

  it("skips items with no extractable value", () => {
    const items = [
      { id: "bw-empty", type: 1, name: "Empty Login", login: {} }
    ];
    const { secrets, skipped } = parseBitwarden(exportFile(items));
    expect(secrets.length).toBe(0);
    expect(skipped).toBe(1);
  });

  it("treats missing items array as empty", () => {
    const { secrets } = parseBitwarden(JSON.stringify({ encrypted: false }));
    expect(secrets).toEqual([]);
  });
});

describe("parseBitwarden — description preservation", () => {
  it("preserves Bitwarden item id as description for round-trip linkage", () => {
    const items = [loginItem(42)];
    const { secrets } = parseBitwarden(exportFile(items));
    expect(secrets[0].description).toBe("bw-42");
  });
});
