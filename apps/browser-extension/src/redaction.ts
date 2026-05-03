/**
 * Token-safe logging helpers for the extension.
 *
 * v1.0 Chrome Web Store review will reject extensions that surface secrets
 * in `console.log`. Every code path that prints state or events must run
 * through `redactForLog`.
 */

const SECRET_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /\bsk-[A-Za-z0-9]{16,}\b/g, label: "<redacted:openai-key>" },
  { pattern: /\blct_[a-z]+_[A-Za-z0-9]{16,}\b/g, label: "<redacted:lore-token>" },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/g, label: "<redacted:aws-key>" },
  { pattern: /\bghp_[A-Za-z0-9]{16,}\b/g, label: "<redacted:github-pat>" },
  { pattern: /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, label: "<redacted:jwt>" },
  { pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/gi, label: "<redacted:bearer>" }
];

const TOKEN_FIELD_NAMES = new Set([
  "deviceToken",
  "device_token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiKey",
  "api_key",
  "authorization",
  "Authorization"
]);

export function redactString(text: string): string {
  let out = text;
  for (const { pattern, label } of SECRET_PATTERNS) {
    out = out.replace(pattern, label);
  }
  return out;
}

export function redactForLog(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactForLog);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (TOKEN_FIELD_NAMES.has(k)) {
        out[k] = maskToken(typeof v === "string" ? v : "");
      } else {
        out[k] = redactForLog(v);
      }
    }
    return out;
  }
  return value;
}

/**
 * Mask a token for UI display: keep the prefix and last 4 chars.
 *   lct_device_abcdef1234567890 -> lct_device_****…7890
 */
export function maskToken(token: string): string {
  if (!token || token.length < 8) return "***";
  const last = token.slice(-4);
  const prefix = token.match(/^[a-z]+_[a-z]+_/i)?.[0] ?? token.slice(0, 4);
  return `${prefix}****…${last}`;
}

/**
 * Compress conversation text into a short summary for summary_only capture.
 * v1.0 keeps the heuristic deterministic so DOM scraping cannot smuggle
 * arbitrary content through; the cloud extractor will run a proper model.
 */
export function summarizeForUpload(text: string, maxChars = 280): string {
  const cleaned = redactString(text)
    .replace(/<private>[\s\S]*?<\/private>/gi, "<redacted:private>")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars - 1)}…`;
}
