// 1Password 1PIF parser for Lore Secret Vault v2.0.5 import flow.
//
// The 1Password Interchange Format (1PIF) is a text file containing one JSON
// item per line separated by a magic UUID delimiter:
//   `***5642bee8-a5ff-11dc-8314-0800200c9a66***`
//
// Each line is a JSON object. Per spec §V2.0.5-I1 we extract:
//   - label  ← title
//   - value  ← secureContents.password OR secureContents.fields[type=P|password].value
//   - tags   ← sections names + categoryUUID lookup
//   - category derived from typeName (e.g. webforms.WebForm → "password",
//     wallet.financial.CreditCard → "card", securenotes.SecureNote → "note")
//
// We also accept a "modernized" form: a plain JSON array of items (skipping
// the magic delimiter framing). This matches how 1Password's CLI `op export`
// emits items for some recent versions.

import type { ImportedSecret } from "./env-parser.js";

const ONEPIF_DELIMITER = "***5642bee8-a5ff-11dc-8314-0800200c9a66***";

interface OnePIFField {
  name?: string;
  designation?: string;
  type?: string;
  value?: string;
}

interface OnePIFSecureContents {
  password?: string;
  notesPlain?: string;
  fields?: OnePIFField[];
  sections?: Array<{ name?: string; title?: string }>;
}

interface OnePIFItem {
  uuid?: string;
  title?: string;
  typeName?: string;
  secureContents?: OnePIFSecureContents;
  trashed?: boolean;
  category?: string;
}

export interface ParsedOnePIF {
  secrets: ImportedSecret[];
  skipped: number;
  warnings: string[];
}

function categoryFromTypeName(typeName: string | undefined): string {
  if (!typeName) return "password";
  if (typeName.includes("Password")) return "password";
  if (typeName.includes("WebForm")) return "password";
  if (typeName.includes("Login")) return "password";
  if (typeName.includes("CreditCard")) return "card";
  if (typeName.includes("BankAccount")) return "card";
  if (typeName.includes("SshKey")) return "ssh_key";
  if (typeName.includes("ApiCredential")) return "api_key";
  if (typeName.includes("SecureNote")) return "note";
  return "password";
}

function extractValue(secureContents: OnePIFSecureContents | undefined): string | undefined {
  if (!secureContents) return undefined;
  if (typeof secureContents.password === "string" && secureContents.password.length > 0) {
    return secureContents.password;
  }
  if (Array.isArray(secureContents.fields)) {
    for (const f of secureContents.fields) {
      if (typeof f.value !== "string" || f.value.length === 0) continue;
      const designation = (f.designation ?? "").toLowerCase();
      if (designation === "password") return f.value;
      const type = (f.type ?? "").toUpperCase();
      if (type === "P" || type === "PASSWORD") return f.value;
    }
  }
  if (typeof secureContents.notesPlain === "string" && secureContents.notesPlain.length > 0) {
    return secureContents.notesPlain;
  }
  return undefined;
}

function extractTags(item: OnePIFItem): string[] {
  const tags = new Set<string>();
  if (Array.isArray(item.secureContents?.sections)) {
    for (const s of item.secureContents!.sections!) {
      const label = (s.title ?? s.name ?? "").trim();
      if (label.length > 0) tags.add(label);
    }
  }
  if (typeof item.category === "string" && item.category.length > 0) {
    tags.add(item.category);
  }
  return [...tags];
}

function parseOnePIFItem(json: string, lineNo: number, warnings: string[]): OnePIFItem | undefined {
  try {
    const obj = JSON.parse(json) as OnePIFItem;
    return obj;
  } catch {
    warnings.push(`line ${lineNo}: not a JSON object, skipped`);
    return undefined;
  }
}

export function parseOnePIF(content: string): ParsedOnePIF {
  const secrets: ImportedSecret[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { secrets, skipped, warnings: ["empty input"] };
  }

  // Strategy A: modern JSON array
  if (trimmed.startsWith("[")) {
    let items: OnePIFItem[];
    try {
      items = JSON.parse(trimmed) as OnePIFItem[];
    } catch (err) {
      return { secrets, skipped, warnings: [`JSON array parse failed: ${(err as Error).message}`] };
    }
    if (!Array.isArray(items)) {
      return { secrets, skipped, warnings: ["expected JSON array, got non-array"] };
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = itemToSecret(item, `array index ${i}`, warnings);
      if (result === "skipped_trashed" || result === "skipped_no_value") {
        skipped++;
        continue;
      }
      if (result) secrets.push(result);
    }
    return { secrets, skipped, warnings };
  }

  // Strategy B: classic 1PIF with magic delimiter
  const lines = trimmed.split(/\r?\n/);
  let lineNo = 0;
  for (const line of lines) {
    lineNo++;
    const l = line.trim();
    if (l.length === 0) continue;
    if (l === ONEPIF_DELIMITER) continue;
    if (l.startsWith("***")) continue; // any delimiter-like line
    const item = parseOnePIFItem(l, lineNo, warnings);
    if (!item) {
      skipped++;
      continue;
    }
    const result = itemToSecret(item, `line ${lineNo}`, warnings);
    if (result === "skipped_trashed" || result === "skipped_no_value") {
      skipped++;
      continue;
    }
    if (result) secrets.push(result);
  }

  return { secrets, skipped, warnings };
}

function itemToSecret(
  item: OnePIFItem,
  where: string,
  warnings: string[]
): ImportedSecret | "skipped_trashed" | "skipped_no_value" | undefined {
  if (item.trashed === true) return "skipped_trashed";
  const title = (item.title ?? "").trim();
  if (title.length === 0) {
    warnings.push(`${where}: missing title, skipped`);
    return undefined;
  }
  const value = extractValue(item.secureContents);
  if (value === undefined) return "skipped_no_value";
  return {
    label: title,
    value,
    category: categoryFromTypeName(item.typeName),
    description: item.uuid,
    tags: extractTags(item)
  };
}

export const ONEPIF_INTERNALS = { ONEPIF_DELIMITER };
