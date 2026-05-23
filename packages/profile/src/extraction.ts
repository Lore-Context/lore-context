import { countApproxTokens, stableMemoryId, type MemoryRecord } from "@lore/shared";
import { scanRiskTags } from "@lore/governance";
import type {
  CanonicalTurn,
  MemoryCandidate,
  ProfileItem,
  ProfileItemType,
  SessionSummary
} from "./types.js";

/**
 * Deterministic extraction helpers.
 *
 * No model providers, no network. The shape of the output matches the cloud
 * extraction pipeline so a real model worker can be swapped in later without
 * changing downstream consumers.
 */

const MAX_SUMMARY_CHARS = 800;
const PRIVATE_BLOCK = /<private>[\s\S]*?<\/private>/gi;

const PREFERENCE_PATTERNS: ReadonlyArray<{ profileType: ProfileItemType; pattern: RegExp }> = [
  { profileType: "preference", pattern: /\bi (?:prefer|like|use|want|always use)\b/i },
  { profileType: "preference", pattern: /\bplease (?:always|never)\b/i },
  { profileType: "workflow", pattern: /\b(?:my )?workflow is\b/i },
  { profileType: "workflow", pattern: /\bi (?:always|usually|typically) (?:run|use|do)\b/i },
  { profileType: "identity", pattern: /\bi(?:'m| am)\s+(?:a|an|the)\b/i },
  { profileType: "identity", pattern: /\bmy name is\b/i },
  { profileType: "constraint", pattern: /\b(?:do not|don't|never)\s+(?:commit|push|delete|deploy)\b/i },
  { profileType: "active_context", pattern: /\b(?:currently|right now|today) (?:working on|focused on|building)\b/i },
  { profileType: "active_context", pattern: /\b(?:we are|i am) building\b/i }
];

const DECISION_PATTERNS = [
  /\bwe (?:decided|chose|picked)\b/i,
  /\bdecision[:\s]/i,
  /\b(?:final|chosen) approach\b/i,
  /\bgoing with\b/i
];

const TASK_PATTERNS = [
  /\btodo\b/i,
  /\bnext step\b/i,
  /\bremind me\b/i,
  /\bremember to\b/i,
  /\b(?:still|need to)\s+(?:do|finish|implement|fix)\b/i
];

const TEMPORARY_PATTERNS = [
  /\b(?:today|tonight|this week|this morning|this afternoon)\b/i,
  /\b(?:by tomorrow|by friday|before the weekend)\b/i
];

const ERROR_FIX_PATTERNS = [
  /\b(?:fixed|resolved|solved)\b.*\b(?:by|with)\b/i,
  /\berror[:\s].*(?:solution|fix)\b/i
];

const PRIVATE_OUT = "<redacted:private>";

/**
 * Strip <private>...</private> blocks and obvious secret patterns.
 * Mirrors what the cloud server-side redactor does, so candidates that escape
 * the local layer still get the same treatment.
 */
export function redactPrivateBlocks(text: string): string {
  return text.replace(PRIVATE_BLOCK, PRIVATE_OUT);
}

/**
 * Convert raw turns into canonical turns, dropping empty content and
 * stripping <private> blocks. Sequential whitespace collapses so dedup works.
 */
export function canonicalizeTurns(turns: CanonicalTurn[]): CanonicalTurn[] {
  return turns
    .map((turn) => ({
      role: turn.role,
      timestamp: turn.timestamp,
      content: redactPrivateBlocks(turn.content).replace(/\s+/g, " ").trim()
    }))
    .filter((turn) => turn.content.length > 0 && turn.content !== PRIVATE_OUT);
}

/**
 * Build a session summary from canonical turns. Without an LLM we use a
 * stable, deterministic recipe: first user turn intent + last assistant
 * conclusion-ish line, capped at MAX_SUMMARY_CHARS.
 */
export function summarizeSession(input: {
  sessionId: string;
  vaultId: string;
  projectId?: string;
  agentType?: string;
  turns: CanonicalTurn[];
  startedAt?: string;
  endedAt?: string;
}): SessionSummary {
  const turns = canonicalizeTurns(input.turns);
  const firstUser = turns.find((t) => t.role === "user");
  const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant");

  const intent = firstUser ? firstUser.content : "";
  const conclusion = lastAssistant ? lastAssistant.content : "";
  const merged = [intent && `intent: ${intent}`, conclusion && `result: ${conclusion}`]
    .filter(Boolean)
    .join(" — ");

  const summary = merged.length > MAX_SUMMARY_CHARS ? `${merged.slice(0, MAX_SUMMARY_CHARS - 1)}…` : merged;

  const aggregateText = turns.map((t) => t.content).join("\n");
  const riskTags = scanRiskTags(aggregateText);

  return {
    sessionId: input.sessionId,
    vaultId: input.vaultId,
    projectId: input.projectId,
    agentType: input.agentType,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    summary: summary || "(empty session)",
    turnCount: turns.length,
    riskTags
  };
}

interface ClassifiedTurn {
  turn: CanonicalTurn;
  classes: ProfileItemType[];
  isDecision: boolean;
  isTask: boolean;
  isTemporary: boolean;
  isErrorFix: boolean;
}

export function classifyTurn(turn: CanonicalTurn): ClassifiedTurn {
  const classes = new Set<ProfileItemType>();

  for (const { pattern, profileType } of PREFERENCE_PATTERNS) {
    if (pattern.test(turn.content)) {
      classes.add(profileType);
    }
  }

  return {
    turn,
    classes: Array.from(classes),
    isDecision: DECISION_PATTERNS.some((p) => p.test(turn.content)),
    isTask: TASK_PATTERNS.some((p) => p.test(turn.content)),
    isTemporary: TEMPORARY_PATTERNS.some((p) => p.test(turn.content)),
    isErrorFix: ERROR_FIX_PATTERNS.some((p) => p.test(turn.content))
  };
}

export function extractMemoryCandidates(input: {
  sessionId: string;
  vaultId: string;
  projectId?: string;
  agentType?: string;
  sourceProvider?: string;
  turns: CanonicalTurn[];
  now?: Date;
}): MemoryCandidate[] {
  const now = (input.now ?? new Date()).toISOString();
  const turns = canonicalizeTurns(input.turns);
  const candidates: MemoryCandidate[] = [];

  for (const turn of turns) {
    if (turn.role !== "user") continue;
    const classified = classifyTurn(turn);
    const riskTags = scanRiskTags(turn.content);

    if (classified.classes.length > 0) {
      const profileType = classified.classes[0];
      candidates.push(
        buildCandidate({
          content: turn.content,
          memoryType: profileType === "constraint" ? "project_rule" : "preference",
          scope: "user",
          confidence: 0.7,
          profileMapping: profileType,
          riskTags,
          input,
          now
        })
      );
    }

    if (classified.isDecision) {
      candidates.push(
        buildCandidate({
          content: turn.content,
          memoryType: "project_rule",
          scope: input.projectId ? "project" : "user",
          confidence: 0.65,
          riskTags,
          input,
          now
        })
      );
    }

    if (classified.isTask) {
      const validUntil = classified.isTemporary
        ? new Date((input.now ?? new Date()).getTime() + 1000 * 60 * 60 * 24 * 7).toISOString()
        : null;
      candidates.push(
        buildCandidate({
          content: turn.content,
          memoryType: "task_state",
          scope: input.projectId ? "project" : "user",
          confidence: 0.55,
          validUntil,
          riskTags,
          input,
          now
        })
      );
    }

    if (classified.isErrorFix) {
      candidates.push(
        buildCandidate({
          content: turn.content,
          memoryType: "procedure",
          scope: input.projectId ? "project" : "user",
          confidence: 0.6,
          riskTags,
          input,
          now
        })
      );
    }
  }

  return dedupeCandidates(candidates);
}

function buildCandidate(args: {
  content: string;
  memoryType: MemoryRecord["memoryType"];
  scope: MemoryRecord["scope"];
  confidence: number;
  validUntil?: string | null;
  profileMapping?: ProfileItemType;
  riskTags: string[];
  input: {
    sessionId: string;
    projectId?: string;
    sourceProvider?: string;
  };
  now: string;
}): MemoryCandidate {
  const id = stableMemoryId("memc", `${args.input.sessionId}|${args.content}`);
  return {
    id,
    content: args.content,
    memoryType: args.memoryType,
    scope: args.scope,
    visibility: args.scope === "user" ? "private" : args.scope === "project" ? "project" : "team",
    confidence: args.confidence,
    validFrom: args.now,
    validUntil: args.validUntil ?? null,
    sourceProvider: args.input.sourceProvider,
    sourceOriginalId: args.input.sessionId,
    sourceRefs: [
      {
        type: "conversation",
        id: args.input.sessionId,
        excerpt: args.content.slice(0, 240)
      }
    ],
    riskTags: args.riskTags,
    profileMapping: args.profileMapping,
    metadata: {
      projectId: args.input.projectId
    }
  };
}

function dedupeCandidates(candidates: MemoryCandidate[]): MemoryCandidate[] {
  const seen = new Map<string, MemoryCandidate>();
  for (const c of candidates) {
    const key = `${c.memoryType}|${c.scope}|${c.content.toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || existing.confidence < c.confidence) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

/**
 * Build profile items from a set of candidates. Only candidates with a
 * profileMapping become profile items; the rest stay in the memory store.
 */
export function buildProfileItems(input: {
  candidates: MemoryCandidate[];
  now?: Date;
}): ProfileItem[] {
  const now = (input.now ?? new Date()).toISOString();
  const items: ProfileItem[] = [];

  for (const c of input.candidates) {
    if (!c.profileMapping) continue;
    items.push({
      id: stableMemoryId("pi", `${c.profileMapping}|${c.content}`),
      type: c.profileMapping,
      value: c.content,
      confidence: c.confidence,
      sourceMemoryIds: [c.id],
      validUntil: c.validUntil ?? undefined,
      visibility: c.visibility === "private" ? "private" : c.visibility === "team" ? "team" : "readonly",
      status: "active",
      riskTags: c.riskTags,
      metadata: c.metadata,
      createdAt: now,
      updatedAt: now
    });
  }

  return items;
}

export function approxTokens(text: string): number {
  return countApproxTokens(text);
}
