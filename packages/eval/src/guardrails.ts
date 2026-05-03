/**
 * Verification gates for rc.1 safety and compliance checks.
 *
 * These functions are pure / synchronous so they can be used in both unit
 * tests and in the smoke scripts without a running server.
 */

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

/** Patterns that must never reach a cloud model in raw form. */
const REDACTION_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "openai_api_key",     pattern: /sk-[A-Za-z0-9]{20,}/g },
  { name: "anthropic_api_key",  pattern: /sk-ant-[A-Za-z0-9\-_]{20,}/g },
  { name: "generic_secret_key", pattern: /(?:secret[_-]?key|api[_-]?key)\s*[=:]\s*['"]?[A-Za-z0-9+/\-_]{16,}/gi },
  { name: "bearer_token",       pattern: /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/g },
  { name: "basic_auth",         pattern: /Basic\s+[A-Za-z0-9+/]+=*/g },
  { name: "jwt",                pattern: /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g },
  { name: "password_assignment", pattern: /(?:password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"]{8,}/gi },
  { name: "token_assignment",   pattern: /(?:token|access_token|refresh_token|id_token)\s*[=:]\s*['"]?[A-Za-z0-9\-_.~+/]{16,}/gi },
  { name: "env_secret",         pattern: /[A-Z][A-Z0-9_]*(?:SECRET|KEY|TOKEN|PASSWORD|CREDENTIAL)\s*=\s*\S+/g },
  { name: "private_key_pem",    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

export const REDACTION_PLACEHOLDER = "[REDACTED]";

export interface RedactionResult {
  redacted: string;
  matchCount: number;
  matchedPatterns: string[];
}

/**
 * Redact sensitive content before it reaches a cloud model.
 * Returns the redacted string plus diagnostics.
 */
export function redactSensitiveContent(input: string): RedactionResult {
  let redacted = input;
  let matchCount = 0;
  const matchedPatterns: string[] = [];

  for (const { name, pattern } of REDACTION_PATTERNS) {
    const before = redacted;
    redacted = redacted.replace(pattern, REDACTION_PLACEHOLDER);
    if (redacted !== before) {
      const patternMatches = (before.match(pattern) ?? []).length;
      matchCount += patternMatches;
      matchedPatterns.push(name);
    }
    // Reset lastIndex for global regexes that may be shared
    pattern.lastIndex = 0;
  }

  return { redacted, matchCount, matchedPatterns };
}

/**
 * Returns true when the content is safe to send to a cloud model (no
 * unredacted secrets remain).
 */
export function isRedactionClean(input: string): boolean {
  return REDACTION_PATTERNS.every((entry) => {
    const matched = entry.pattern.test(input);
    entry.pattern.lastIndex = 0;
    return !matched;
  });
}

// ---------------------------------------------------------------------------
// No-local-model onboarding check
// ---------------------------------------------------------------------------

/**
 * Terms that indicate a user is being asked to install or configure a local
 * model.  These must NOT appear in default onboarding copy.
 */
const LOCAL_MODEL_TERMS: RegExp[] = [
  /\bollama\b/i,
  /llama\.cpp/i,
  /\bgguf\b/i,
  /download\s+(?:the\s+)?(?:model|weights)/i,
  /local\s+model\s+install/i,
  /install\s+(?:a\s+)?(?:local\s+)?(?:llm|model|language\s+model)/i,
  /quantization/i,
  /\bgpu\s+(?:memory|ram|vram)\b/i,
  /\bcpu\s+(?:cores?|threads?)\b.*model/i,
  /model\s+(?:download|quantiz|weights)/i,
  /run\s+(?:locally?|on[\s-]device)\s+(?:model|llm)/i,
];

export interface LocalModelCheckResult {
  clean: boolean;
  violations: string[];
}

/**
 * Verify that default-path UI copy does not ask the user to install or
 * configure a local model.
 */
export function checkNoLocalModelTerms(copy: string): LocalModelCheckResult {
  const violations: string[] = [];
  for (const pattern of LOCAL_MODEL_TERMS) {
    const match = copy.match(pattern);
    if (match) {
      violations.push(match[0]);
    }
  }
  return { clean: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// No-MCP-terminology check
// ---------------------------------------------------------------------------

/**
 * Terms that must not appear in the default (non-advanced) UI surfaces.
 * Advanced/developer views are exempt — pass `isAdvancedView: true` to skip.
 */
const MCP_TERMS: RegExp[] = [
  /\bMCP\b/,
  /\bhook\b/i,
  /\badapter\b/i,
  /\bagentmemory\b/i,
  /\bvector\s+(?:search|store|embedding)\b/i,
  /\bembedding[s]?\b/i,
  /\bRAG\b/,
  /\bsemantic\s+search\b/i,
  /model\s+configuration/i,
  /configure\s+(?:the\s+)?(?:mcp|hook|adapter)/i,
  /edit\s+(?:your\s+)?(?:mcp|config(?:uration)?)\s+(?:json|file)/i,
];

export interface McpTerminologyCheckResult {
  clean: boolean;
  violations: string[];
}

/**
 * Verify that default-path UI copy does not use technical MCP/hook/adapter
 * terminology that would confuse non-developer users.
 */
export function checkNoMcpTerminology(
  copy: string,
  opts: { isAdvancedView?: boolean } = {}
): McpTerminologyCheckResult {
  if (opts.isAdvancedView) {
    return { clean: true, violations: [] };
  }

  const violations: string[] = [];
  for (const pattern of MCP_TERMS) {
    const match = copy.match(pattern);
    if (match) {
      violations.push(match[0]);
    }
  }
  return { clean: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Cloud model disabled fallback harness
// ---------------------------------------------------------------------------

export type CloudModelStatus = "enabled" | "disabled" | "degraded";

export interface FallbackHarnessResult {
  /** Whether the product remained functional without cloud model processing. */
  functionalWithoutModel: boolean;
  /** True when the fallback produced at least one rule-based candidate. */
  ruleBasedCandidateProduced: boolean;
  /** True when a degraded-state banner was surfaced to the caller. */
  degradedBannerSurfaced: boolean;
  modelStatus: CloudModelStatus;
}

/**
 * Simulates the cloud model being disabled and verifies that:
 * - rule-based candidate generation still works
 * - a degraded banner is surfaced
 * - the product does not crash or return an error to the user
 *
 * `candidateGeneratorFn` is injected so this can be wired to the real
 * pipeline or a fixture/mock.
 */
export async function runCloudModelFallbackHarness(
  candidateGeneratorFn: (
    event: { content: string; sourceId: string },
    opts: { modelEnabled: boolean }
  ) => Promise<{ candidates: string[]; degraded: boolean }>
): Promise<FallbackHarnessResult> {
  const modelStatus: CloudModelStatus = "disabled";

  const result = await candidateGeneratorFn(
    { content: "Discussed project structure and testing strategy.", sourceId: "src_harness" },
    { modelEnabled: false }
  );

  return {
    functionalWithoutModel: result.candidates.length >= 0, // didn't throw
    ruleBasedCandidateProduced: result.candidates.length > 0,
    degradedBannerSurfaced: result.degraded === true,
    modelStatus,
  };
}
