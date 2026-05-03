// Pre-model redaction. Applied inside CloudProvider before any text is sent to
// a remote provider. Capture pipelines may already redact, but this layer is
// non-negotiable: callers must not be able to leak credentials into a remote
// model just because they forgot to redact upstream.

export interface RedactionPattern {
  name: string;
  regex: RegExp;
  replacement: string;
}

export const DEFAULT_REDACTION_PATTERNS: RedactionPattern[] = [
  { name: "openai_key", regex: /\bsk-[A-Za-z0-9_-]{16,}\b/g, replacement: "[REDACTED:openai_key]" },
  { name: "anthropic_key", regex: /\bsk-ant-[A-Za-z0-9_-]{16,}\b/g, replacement: "[REDACTED:anthropic_key]" },
  { name: "github_token", regex: /\bghp_[A-Za-z0-9]{20,}\b/g, replacement: "[REDACTED:github_token]" },
  { name: "github_oauth", regex: /\bgho_[A-Za-z0-9]{20,}\b/g, replacement: "[REDACTED:github_oauth]" },
  { name: "lore_service_token", regex: /\blct_service_[A-Za-z0-9_-]{8,}\b/g, replacement: "[REDACTED:lore_service_token]" },
  { name: "bearer_jwt", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{4,}\b/g, replacement: "[REDACTED:jwt]" },
  { name: "authorization_header", regex: /\bauthorization\s*:\s*Bearer\s+[A-Za-z0-9._-]+/gi, replacement: "authorization: Bearer [REDACTED]" },
  { name: "password_kv", regex: /\bpassword\s*[:=]\s*\S+/gi, replacement: "password=[REDACTED]" },
  { name: "secret_kv", regex: /\bsecret\s*[:=]\s*\S+/gi, replacement: "secret=[REDACTED]" },
  { name: "api_key_kv", regex: /\bapi[_-]?key\s*[:=]\s*\S+/gi, replacement: "api_key=[REDACTED]" },
  { name: "token_kv", regex: /\btoken\s*[:=]\s*\S+/gi, replacement: "token=[REDACTED]" },
];

export interface RedactionResult {
  redacted: string;
  matchCount: number;
  patterns: string[];
}

export function redactInputForModel(
  text: string,
  patterns: RedactionPattern[] = DEFAULT_REDACTION_PATTERNS,
): RedactionResult {
  if (!text) return { redacted: text ?? "", matchCount: 0, patterns: [] };
  let redacted = text;
  let matchCount = 0;
  const matched: string[] = [];
  for (const p of patterns) {
    const before = redacted;
    redacted = redacted.replace(p.regex, () => {
      matchCount++;
      return p.replacement;
    });
    if (before !== redacted) matched.push(p.name);
  }
  return { redacted, matchCount, patterns: matched };
}

export function redactInputsForModel(
  texts: string[],
  patterns?: RedactionPattern[],
): { redacted: string[]; matchCount: number; patterns: string[] } {
  const results = texts.map((t) => redactInputForModel(t, patterns));
  const merged = new Set<string>();
  let total = 0;
  for (const r of results) {
    total += r.matchCount;
    r.patterns.forEach((p) => merged.add(p));
  }
  return {
    redacted: results.map((r) => r.redacted),
    matchCount: total,
    patterns: [...merged],
  };
}
