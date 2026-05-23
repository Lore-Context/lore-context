// Lore Context v1.8 — Lane M §2 V1.8-M3: Claude Sonnet 4.6 contradiction detector.
//
// Classifies whether two memory records are logically contradictory by calling
// the `conflict_detector` task route (OpenRouter → anthropic/claude-sonnet-4.6
// → anthropic:claude-sonnet-4.6 → deterministic-only fallback).
//
// Cost guardrail: only 10% of candidate pairs are sampled per butler run.
// Sampling is deterministic — the same (recordA.id + recordB.id) pair always
// produces the same sampling decision so test runs are reproducible.
//
// Cache: result is stored in Redis at
//   lore:conflict:<sha256(recordA.id + recordB.id)>
// with a 24-hour TTL so repeated checks within a day skip the LLM entirely.
//
// Input sanitization: content matching `/<\|.*\|>/` or leading `system:` is
// stripped before the LLM prompt is assembled; stripped fragments are logged
// as `conflict_detector_input_sanitized` audit events so security-reviewer can
// audit them later.
//
// Never throws — provider errors and parse failures surface as a typed
// `reason` field in the returned result.

import { createHash } from "node:crypto";
import {
  type LlmRequest,
  type LlmResponse,
} from "@lore/model-gateway";
import { log } from "./logger.js";
import { readButlerFlags } from "./butler-flags.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MemoryRecord {
  id: string;
  content: string;
  vaultId?: string;
}

export interface ConflictDetectionResult {
  is_conflict: boolean;
  severity: "low" | "medium" | "high";
  reason: string;
}

// ---------------------------------------------------------------------------
// Redis cache interface (structural — matches RedisClient in embedding-cache)
// ---------------------------------------------------------------------------

export interface ConflictCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, exSeconds: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ConflictDetectorV18Options {
  /**
   * Fraction of pairs to evaluate. Defaults to LORE_CONFLICT_SAMPLE_RATE
   * env var, then 0.1 (10 %).
   */
  sampleRate?: number;
  /**
   * Inject a cache implementation. When absent, caching is skipped.
   * Production wiring passes a live Redis client.
   */
  cache?: ConflictCache;
  /**
   * Test seam — inject the LLM invoke function so unit tests never hit a
   * live model. When absent, the module builds a FallbackOrchestrator from
   * the task-router `conflict_detector` route.
   */
  llmInvoke?: (req: LlmRequest) => Promise<LlmResponse>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 h
const CACHE_KEY_PREFIX = "lore:conflict:";
const MAX_TOKENS = 256;
const TEMPERATURE = 0;

// Prompt injection patterns to strip from record content before LLM call.
const INJECTION_PATTERNS: RegExp[] = [
  /<\|.*?\|>/gs, // <|system|>, <|im_start|>, etc.
  /^system:\s*/im, // leading "system: " prefix
];

/**
 * Stable system prompt for the conflict-detection LLM call.
 *
 * Design goals:
 *   1. Always passed as the system message so OpenRouter / Anthropic can cache
 *      it as a prompt-cache prefix (saves tokens on every call within a phase).
 *   2. Length >= 300 tokens to qualify for prompt-cache savings (Lane P P1).
 *   3. Byte-for-byte identical across all calls within a butler phase so the
 *      cache key never changes (Lane P P5).
 *
 * Output contract:
 *   The model must return a single-line JSON object and nothing else:
 *   { "is_conflict": boolean, "severity": "low"|"medium"|"high", "reason": "<one sentence>" }
 *
 * Never add runtime-varying content here. All variable content belongs in
 * buildConflictDetectorUserPrompt().
 */
export const CONFLICT_DETECTOR_SYSTEM_PROMPT = `\
You are a logical contradiction detector for a personal knowledge-management system. \
Your sole responsibility is to determine whether two short memory statements are \
logically contradictory — meaning they cannot both be true at the same time under \
any reasonable interpretation.

Definitions:
- A contradiction exists when Statement A and Statement B assert mutually exclusive \
facts about the same subject. For example, "I prefer tea" and "I never drink tea" \
are contradictory. "I prefer tea" and "I sometimes drink coffee" are NOT contradictory.
- Severity levels:
    "high"   — direct logical negation; the statements flatly contradict each other \
(e.g. "I work in Berlin" vs "I have never lived in Germany").
    "medium" — probable conflict that likely cannot be resolved without more context \
(e.g. "My budget is $500/month" vs "I spend over $1000/month on hobbies").
    "low"    — possible tension but may reflect temporal change, context shift, or \
partial overlap rather than true contradiction (e.g. "I hate mornings" vs \
"I started a 6 AM workout routine last year").

Rules you must follow without exception:
1. Return ONLY a single-line raw JSON object — no markdown code fences, no prose, \
no trailing commas, no surrounding text.
2. The JSON object must contain exactly three fields: "is_conflict" (boolean), \
"severity" ("low", "medium", or "high"), and "reason" (one concise sentence \
of no more than 25 words explaining the decision).
3. If the statements are NOT contradictory, return \
{"is_conflict":false,"severity":"low","reason":"<explanation>"}.
4. If the statements ARE contradictory, set is_conflict=true and choose the \
appropriate severity level per the definitions above.
5. Base your decision only on the semantic content of the two statements. \
Do not invent external context that is not present in the statements.
6. Treat each pair independently; do not carry over reasoning from prior pairs.
7. The reason field must be a single sentence and must not contain JSON special \
characters that would require escaping (no double-quotes inside the reason value).
8. When in doubt, prefer is_conflict=false over a speculative positive — \
false negatives are safer than false positives in this system.
`.trim();

/**
 * Build the user-turn prompt for a conflict-detection call.
 *
 * Only contains the variable part (the two record contents). The stable
 * instruction context lives in CONFLICT_DETECTOR_SYSTEM_PROMPT so the
 * system message can be prompt-cached across calls.
 */
export function buildConflictDetectorUserPrompt(a: string, b: string): string {
  return `Statement A: ${a}\n\nStatement B: ${b}`;
}

// ---------------------------------------------------------------------------
// Deterministic sampler
// ---------------------------------------------------------------------------

/**
 * Returns a float in [0, 1) derived deterministically from a string key.
 * Uses the first 8 hex digits of a SHA-256 so the same pair always maps to
 * the same float — test runs are fully reproducible.
 */
function deterministicSample(key: string): number {
  const hex = createHash("sha256").update(key).digest("hex").slice(0, 8);
  return parseInt(hex, 16) / 0x100000000;
}

// ---------------------------------------------------------------------------
// Input sanitization
// ---------------------------------------------------------------------------

interface SanitizeResult {
  sanitized: string;
  wasDirty: boolean;
}

function sanitizeContent(raw: string): SanitizeResult {
  let out = raw;
  for (const pat of INJECTION_PATTERNS) {
    out = out.replace(pat, "");
  }
  return { sanitized: out.trim(), wasDirty: out !== raw };
}

// ---------------------------------------------------------------------------
// LLM response parsing
// ---------------------------------------------------------------------------

function parseConflictResponse(text: string): ConflictDetectionResult | null {
  let raw: unknown;
  try {
    // Model may wrap JSON in markdown fences — strip them first.
    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    raw = JSON.parse(stripped);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const isConflict = typeof obj.is_conflict === "boolean" ? obj.is_conflict : null;
  if (isConflict === null) return null;

  const severityRaw = obj.severity;
  const severity: "low" | "medium" | "high" =
    severityRaw === "medium" ? "medium" : severityRaw === "high" ? "high" : "low";

  const reason = typeof obj.reason === "string" && obj.reason.trim()
    ? obj.reason.trim()
    : "no-reason-provided";

  return { is_conflict: isConflict, severity, reason };
}

// ---------------------------------------------------------------------------
// ConflictDetectorV18
// ---------------------------------------------------------------------------

export class ConflictDetectorV18 {
  private readonly sampleRate: number;
  private readonly cache: ConflictCache | undefined;
  private readonly llmInvoke: (req: LlmRequest) => Promise<LlmResponse>;

  constructor(options: ConflictDetectorV18Options = {}) {
    this.sampleRate = options.sampleRate ?? readSampleRate();
    this.cache = options.cache;

    if (options.llmInvoke) {
      this.llmInvoke = options.llmInvoke;
    } else {
      // No llmInvoke injected — surface as llm-unavailable-fallback at call time.
      // Production callers wire llmInvoke via createGatewayWithFallback using the
      // `conflict_detector` task route (OpenRouter → anthropic/claude-sonnet-4.6).
      this.llmInvoke = async (_req: LlmRequest): Promise<LlmResponse> => {
        throw new Error(
          "[conflict-detector-v18] no llmInvoke injected. Wire via ConflictDetectorV18Options.llmInvoke for production use.",
        );
      };
    }
  }

  async detect(
    recordA: MemoryRecord,
    recordB: MemoryRecord,
  ): Promise<ConflictDetectionResult> {
    const pairKey = recordA.id + recordB.id;
    const cacheKey = CACHE_KEY_PREFIX + createHash("sha256").update(pairKey).digest("hex");

    // --- Cache hit ---
    if (this.cache) {
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          const parsed = parseConflictResponse(cached);
          if (parsed) return parsed;
        }
      } catch (err) {
        log.warn("[conflict-detector-v18] cache get failed; continuing without cache", {
          error: String(err),
        });
      }
    }

    // --- 10 % sampling ---
    const sample = deterministicSample(pairKey);
    if (sample >= this.sampleRate) {
      return { is_conflict: false, severity: "low", reason: "sampled-out" };
    }

    // --- Input sanitization ---
    const aSanitized = sanitizeContent(recordA.content);
    const bSanitized = sanitizeContent(recordB.content);

    if (aSanitized.wasDirty) {
      log.warn("[conflict-detector-v18] input sanitized: recordA content contained injection pattern", {
        event_type: "conflict_detector_input_sanitized",
        recordId: recordA.id,
      });
    }
    if (bSanitized.wasDirty) {
      log.warn("[conflict-detector-v18] input sanitized: recordB content contained injection pattern", {
        event_type: "conflict_detector_input_sanitized",
        recordId: recordB.id,
      });
    }

    // --- LLM call ---
    const requestId = createHash("sha256").update(`cdet:${pairKey}`).digest("hex").slice(0, 16);

    let result: ConflictDetectionResult;
    try {
      const req: LlmRequest = {
        requestId,
        systemPrompt: CONFLICT_DETECTOR_SYSTEM_PROMPT,
        prompt: buildConflictDetectorUserPrompt(aSanitized.sanitized, bSanitized.sanitized),
        maxTokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        enablePromptCache: readButlerFlags().openrouterPromptCache,
      };
      const resp = await this.llmInvoke(req);
      const parsed = parseConflictResponse(resp.text);
      if (!parsed) {
        log.warn("[conflict-detector-v18] LLM returned unparseable JSON; using parse-error fallback", {
          requestId,
          modelId: resp.modelId,
        });
        result = { is_conflict: false, severity: "low", reason: "parse-error-fallback" };
      } else {
        result = parsed;
      }
    } catch (err) {
      log.warn("[conflict-detector-v18] LLM call failed; using llm-unavailable-fallback", {
        requestId,
        error: String(err),
      });
      result = { is_conflict: false, severity: "low", reason: "llm-unavailable-fallback" };
    }

    // --- Cache write ---
    if (this.cache) {
      try {
        await this.cache.set(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);
      } catch (err) {
        log.warn("[conflict-detector-v18] cache set failed; result not cached", {
          error: String(err),
        });
      }
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSampleRate(): number {
  const raw = process.env.LORE_CONFLICT_SAMPLE_RATE ?? process.env.LORE_CONFLICT_DETECTOR_SAMPLE_RATE;
  if (!raw) return 0.1;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.1;
  return n;
}
