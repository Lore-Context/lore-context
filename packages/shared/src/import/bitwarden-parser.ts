// Bitwarden JSON export parser for Lore Secret Vault v2.0.5 import flow.
//
// Bitwarden's JSON export shape (unencrypted):
//   { "encrypted": false, "folders": [...], "items": [...] }
// Each item has:
//   { id, type, name, login?, secureNote?, card?, identity?, fields?, notes? }
//   type: 1=login, 2=secureNote, 3=card, 4=identity
//
// Per spec §V2.0.5-I2:
//   - For type=1 (login), extract login.password as value
//   - For type=2 (secureNote), extract notes as value
//   - For type=3 (card), extract card.number as value
//   - Duplicate label detection at the caller (engine compares parsed labels)
//   - We also surface fields[] from the item as custom-field tags

import type { ImportedSecret } from "./env-parser.js";

interface BWLogin {
  username?: string;
  password?: string;
  uris?: Array<{ uri?: string }>;
  totp?: string | null;
}

interface BWCard {
  cardholderName?: string;
  brand?: string;
  number?: string;
  expMonth?: string;
  expYear?: string;
  code?: string;
}

interface BWField {
  name?: string;
  value?: string;
  type?: number; // 0=text, 1=hidden, 2=boolean, 3=linked
}

interface BWItem {
  id?: string;
  type?: number;
  name?: string;
  notes?: string | null;
  login?: BWLogin;
  card?: BWCard;
  fields?: BWField[];
  folderId?: string | null;
  favorite?: boolean;
  organizationId?: string | null;
}

interface BWExport {
  encrypted?: boolean;
  folders?: Array<{ id: string; name: string }>;
  items?: BWItem[];
}

export interface ParsedBitwarden {
  secrets: ImportedSecret[];
  duplicates: string[]; // labels that appeared more than once
  skipped: number; // items with no extractable value
  warnings: string[];
}

const TYPE_LOGIN = 1;
const TYPE_SECURE_NOTE = 2;
const TYPE_CARD = 3;
const TYPE_IDENTITY = 4;

function categoryFor(item: BWItem): string {
  switch (item.type) {
    case TYPE_LOGIN:
      return "password";
    case TYPE_SECURE_NOTE:
      return "note";
    case TYPE_CARD:
      return "card";
    case TYPE_IDENTITY:
      return "identity";
    default:
      return "password";
  }
}

function extractValue(item: BWItem): string | undefined {
  if (item.type === TYPE_LOGIN && item.login?.password) return item.login.password;
  if (item.type === TYPE_SECURE_NOTE && typeof item.notes === "string" && item.notes.length > 0) {
    return item.notes;
  }
  if (item.type === TYPE_CARD && item.card?.number) return item.card.number;
  // Fallback: first hidden field
  if (Array.isArray(item.fields)) {
    for (const f of item.fields) {
      if ((f.type === 1 || f.type === 0) && typeof f.value === "string" && f.value.length > 0) {
        return f.value;
      }
    }
  }
  return undefined;
}

function tagsFor(item: BWItem, folderMap: Map<string, string>): string[] {
  const tags = new Set<string>();
  if (item.folderId && folderMap.has(item.folderId)) {
    const folder = folderMap.get(item.folderId)!;
    if (folder.length > 0) tags.add(folder);
  }
  if (item.favorite) tags.add("favorite");
  if (Array.isArray(item.fields)) {
    for (const f of item.fields) {
      const name = (f.name ?? "").trim();
      if (name.length > 0 && name.length <= 40) tags.add(`field:${name}`);
    }
  }
  return [...tags];
}

export function parseBitwarden(content: string): ParsedBitwarden {
  const warnings: string[] = [];
  let parsed: BWExport;
  try {
    parsed = JSON.parse(content) as BWExport;
  } catch (err) {
    return {
      secrets: [],
      duplicates: [],
      skipped: 0,
      warnings: [`bitwarden JSON parse failed: ${(err as Error).message}`]
    };
  }

  if (parsed.encrypted === true) {
    return {
      secrets: [],
      duplicates: [],
      skipped: 0,
      warnings: ["bitwarden export is ENCRYPTED — decrypt in Bitwarden before importing"]
    };
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const folderMap = new Map<string, string>();
  for (const f of parsed.folders ?? []) {
    if (f.id && typeof f.name === "string") folderMap.set(f.id, f.name);
  }

  const secrets: ImportedSecret[] = [];
  const seen = new Map<string, number>();
  const duplicates = new Set<string>();
  let skipped = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = (item.name ?? "").trim();
    if (label.length === 0) {
      warnings.push(`item index ${i}: missing name, skipped`);
      skipped++;
      continue;
    }
    const value = extractValue(item);
    if (value === undefined) {
      skipped++;
      continue;
    }
    const labelKey = label.toLowerCase();
    const prev = seen.get(labelKey);
    if (prev !== undefined) {
      duplicates.add(label);
      warnings.push(`duplicate label "${label}" at index ${i} (first seen at index ${prev}); skipped`);
      skipped++;
      continue;
    }
    seen.set(labelKey, i);

    secrets.push({
      label,
      value,
      category: categoryFor(item),
      description: item.id,
      tags: tagsFor(item, folderMap)
    });
  }

  return { secrets, duplicates: [...duplicates], skipped, warnings };
}

export const BITWARDEN_TYPES = {
  TYPE_LOGIN,
  TYPE_SECURE_NOTE,
  TYPE_CARD,
  TYPE_IDENTITY
};
