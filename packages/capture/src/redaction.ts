import type { CaptureTurn, RedactionStats } from "./types.js";

// Redaction rules for v0.7 capture.
// Goal: strip obvious secrets and `<private>` envelopes BEFORE the payload
// crosses any local-to-cloud boundary. Server-side redaction runs again as a
// second defense; never rely on either alone.
//
// Patterns are intentionally conservative — false-positives are preferable to
// leaking a real key. Add new patterns as fixtures + tests, not as one-offs.

export interface RedactionResult {
  text: string;
  // True if the text was modified at all.
  modified: boolean;
  // True if a `<private>` envelope removed content from this string.
  privateRemoved: boolean;
  // Number of secret-style matches replaced.
  secretsRemoved: number;
}

const PRIVATE_BLOCK = /<private>[\s\S]*?<\/private>/gi;

// Conservative key/secret patterns. Each one ends with a context anchor or a
// length floor to avoid eating ordinary identifiers.
const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "anthropic", re: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: "openai", re: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { name: "github-pat", re: /gh[pousr]_[A-Za-z0-9]{20,}/g },
  { name: "aws-access-key", re: /AKIA[0-9A-Z]{16}/g },
  { name: "google-api", re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: "slack", re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: "bearer", re: /(?<=Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/gi },
  // Generic long base64-looking secrets in `KEY=value` form.
  {
    name: "env-secret",
    re: /\b(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE[_-]?KEY)\s*[:=]\s*["']?[A-Za-z0-9._\-+/=]{16,}["']?/gi
  },
  // PEM-style private keys.
  { name: "pem", re: /-----BEGIN [A-Z ]*?PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*?PRIVATE KEY-----/g }
];

export function redactText(input: string): RedactionResult {
  let modified = false;
  let privateRemoved = false;
  let secretsRemoved = 0;
  let text = input;

  if (PRIVATE_BLOCK.test(text)) {
    privateRemoved = true;
    modified = true;
    text = text.replace(PRIVATE_BLOCK, "[PRIVATE_REMOVED]");
  }

  for (const pattern of SECRET_PATTERNS) {
    let matches = 0;
    text = text.replace(pattern.re, () => {
      matches += 1;
      return `[REDACTED:${pattern.name}]`;
    });
    if (matches > 0) {
      secretsRemoved += matches;
      modified = true;
    }
  }

  return { text, modified, privateRemoved, secretsRemoved };
}

export function redactTurns(turns: CaptureTurn[]): { turns: CaptureTurn[]; stats: RedactionStats } {
  const out: CaptureTurn[] = [];
  let secretsRemoved = 0;
  let privateBlocksStripped = 0;
  let turnsAffected = 0;

  for (const turn of turns) {
    const result = redactText(turn.text);
    let nextText = result.text;
    let isPrivate = turn.private ?? false;

    // If the entire turn was a `<private>` envelope, drop the body and mark
    // the turn so downstream summarizers know it carried no usable content.
    const trimmed = nextText.trim();
    if (result.privateRemoved && (trimmed === "" || trimmed === "[PRIVATE_REMOVED]")) {
      isPrivate = true;
      nextText = "";
    }

    if (result.modified) {
      turnsAffected += 1;
      secretsRemoved += result.secretsRemoved;
      if (result.privateRemoved) privateBlocksStripped += 1;
    }

    out.push({
      ...turn,
      text: nextText,
      redacted: result.modified || turn.redacted === true,
      private: isPrivate
    });
  }

  return {
    turns: out,
    stats: { secretsRemoved, privateBlocksStripped, turnsAffected }
  };
}
