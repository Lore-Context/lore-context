const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["api_key", /\b(?:sk|pk|rk)[_-][A-Za-z0-9]{16,}\b/g],
  ["aws_access_key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["jwt", /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g],
  ["private_key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ["password", /\b(?:password|passwd|pwd|secret)\s*[:=]\s*\S{8,}/gi],
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["phone", /\b(?:\+?\d[\s-]?){10,15}\b/g]
];

export function scanRiskTags(content: string): string[] {
  return [
    ...new Set(
      SECRET_PATTERNS.filter(([, pattern]) => {
        pattern.lastIndex = 0;
        return pattern.test(content);
      }).map(([tag]) => tag)
    )
  ];
}

export function redactSensitiveContent(content: string): string {
  return SECRET_PATTERNS.reduce((redacted, [tag, pattern]) => {
    pattern.lastIndex = 0;
    return redacted.replace(pattern, `<redacted:${tag}>`);
  }, content);
}

export function shouldRequireReview(riskTags: string[]): boolean {
  return riskTags.some((tag) => ["api_key", "aws_access_key", "jwt", "private_key", "password"].includes(tag));
}
