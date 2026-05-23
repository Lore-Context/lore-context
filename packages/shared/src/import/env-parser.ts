// .env file parser for Lore Secret Vault v2.0.5 import flow.
// Parses dotenv format: KEY=value | KEY="value" | KEY='value' | export KEY=value
// Comments (# ...) and blank lines are skipped.
// Each entry gets category="env_var" auto-set per spec §V2.0.5-I3.

export interface ImportedSecret {
  label: string;
  value: string;
  category: string;
  description?: string;
  tags: string[];
}

export interface EnvParseResult {
  secrets: ImportedSecret[];
  warnings: string[]; // lines that looked malformed but were not fatal
}

const ENV_LINE = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

function unquote(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      const inner = trimmed.slice(1, -1);
      if (first === '"') {
        // Double-quoted values support \n, \r, \t, \\, \"
        return inner.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
          .replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
      // Single-quoted values are taken verbatim
      return inner;
    }
  }
  // Inline comment after unquoted value: strip ` # comment` but only if a space
  // precedes the '#' — otherwise it might be part of the value.
  const hashIdx = trimmed.search(/\s#/);
  if (hashIdx >= 0) {
    return trimmed.slice(0, hashIdx).trim();
  }
  return trimmed;
}

export function parseEnv(content: string): EnvParseResult {
  const secrets: ImportedSecret[] = [];
  const warnings: string[] = [];
  const lines = content.split(/\r?\n/);

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const rawLine = lines[lineNo];
    const line = rawLine.replace(/^﻿/, "").trim(); // strip BOM
    if (line.length === 0) continue;
    if (line.startsWith("#")) continue;

    const match = ENV_LINE.exec(line);
    if (!match) {
      warnings.push(`line ${lineNo + 1}: not a KEY=VALUE assignment, skipped`);
      continue;
    }
    const [, key, rawValue] = match;
    const value = unquote(rawValue);
    secrets.push({
      label: key,
      value,
      category: "env_var",
      tags: []
    });
  }

  return { secrets, warnings };
}
