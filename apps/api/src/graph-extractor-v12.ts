// Lore Context v1.2 — Lane C deterministic graph extractor.
// Extended in v1.3 Lane D: pattern families lifted from 8 to 30+, opt-in NER
// plugin seam, stop-word filter + simple morphological normalization for
// English (Mandarin tokens kept whole), and a worker-scoped entity dictionary
// loader so repeated mentions across items collapse to the same canonical
// entity id.
//
// Plan §9.2 step (b) (v1.2): "deterministic extractor first — subject /
// predicate / object from structured fields; reuse `packages/profile/src/
// edges.ts` ideas for supersedes/contradicts/updates."
//
// Plan §3 Lane D items 1, 4 (v1.3): expand regex coverage with temporal /
// causal / comparison / possessive / location families AND expose a NER
// plugin seam so a future spaCy/Stanza/hosted entity API can be plugged in
// without changing extractor consumers.
//
// This module produces *drafts* — entity, relation, and evidence shapes that a
// graph provider can persist. It never calls an LLM. When the upstream item
// already has structured `subject` / `predicate` / `object`, those win; when
// not, we fall back to a regex-driven family of patterns that match the
// same v1.1 conventions used in `packages/profile/src/edges.ts` (correction,
// negation, polarity, extension markers).
//
// Determinism is non-negotiable: the same input always returns the same
// drafts in the same order. Entity ids and relation ids are derived from
// `(vault, canonical_name, entity_type)` and `(vault, source, predicate,
// target, fact_hash)` respectively so backfill is idempotent.

import { stableMemoryId } from "@lore/shared";
import type { MemoryItemV12Record } from "./db/memory-store-v12.js";
import type { NERPlugin, NamedEntity } from "./ner-plugin-v13.js";

export interface EntityDraft {
  /** Deterministic id derived from `(vaultId, canonicalName, entityType)`. */
  id: string;
  vaultId: string;
  name: string;
  canonicalName: string;
  entityType: string;
  aliases: string[];
  confidence: number;
}

export interface RelationDraft {
  /** Deterministic id; safe to use as upsert key. */
  id: string;
  vaultId: string;
  sourceEntity: EntityDraft;
  targetEntity: EntityDraft;
  relationType: string;
  fact: string;
  confidence: number;
  /** Conflict semantics inferred from polarity / correction markers; helps the
   *  graph provider decide when to invalidate prior relations. */
  semantics: "default" | "supersedes" | "contradicts" | "updates";
  /** Hint that the relation is a *negation* of another fact. */
  negated: boolean;
  /** Family the pattern came from — useful for ops dashboards / Lane E
   *  measurement. `structured` is reserved for items with explicit subject /
   *  predicate / object fields. */
  family?: RelationFamily;
}

export type RelationFamily =
  | "structured"
  | "core"
  | "temporal"
  | "causal"
  | "comparison"
  | "possessive"
  | "location";

export interface EvidenceDraft {
  /** Deterministic id derived from `(vault, relationId, itemId)`. */
  id: string;
  vaultId: string;
  itemId: string;
  episodeId?: string | null;
  evidenceText: string;
  confidence: number;
}

export interface ExtractionResult {
  entities: EntityDraft[];
  relations: RelationDraft[];
  evidence: EvidenceDraft[];
}

const NEGATION_PATTERNS = [/\bnot\b/i, /\bnever\b/i, /\bno longer\b/i, /\bdon'?t\b/i, /\bdo not\b/i];
const CORRECTION_PATTERNS = [/\bactually\b/i, /\bcorrection\b/i, /\bupdate(?:d)?\b/i, /\bnow i\b/i, /\binstead\b/i];

// Lane D: explicit small English stop-word set. Mandarin tokens have no
// stemming applied (multi-byte tokens are kept whole — see
// `morphologicalNormalize`).
const STOP_WORDS = new Set([
  "the", "a", "an", "this", "that", "these", "those", "and", "or", "but",
  "we", "i", "they", "he", "she", "it", "you", "is", "are", "was", "were",
  "be", "been", "being", "to", "of", "in", "on", "for", "with", "by", "as"
]);

// Lane D: pattern families. Order matters: longer / more-specific patterns
// must precede shorter ones (e.g. "from X to Y" before "in X"). The combiner
// in `pickRelationFromContent` returns the first family match.
interface PatternEntry {
  regex: RegExp;
  /** What relationType to emit when this pattern matches. May be derived from
   *  capture groups for families like temporal that need to disambiguate
   *  since/until/before/after. */
  relationType: string | ((match: RegExpExecArray) => string);
  family: RelationFamily;
  /** Capture group index for the subject. Default 1. */
  subjectGroup?: number;
  /** Capture group index for the object. Default 2. */
  objectGroup?: number;
}

const PATTERN_FAMILIES: PatternEntry[] = [
  // ---- Core SVO (kept from v1.2; do not remove) ---------------------------
  { regex: /^(.+?)\s+is\s+(.+)$/i, relationType: "is", family: "core" },
  { regex: /^(.+?)\s+are\s+(.+)$/i, relationType: "is", family: "core" },
  { regex: /^(.+?)\s+was\s+(.+)$/i, relationType: "was", family: "core" },
  { regex: /^(.+?)\s+were\s+(.+)$/i, relationType: "was", family: "core" },
  { regex: /^(.+?)\s+uses\s+(.+)$/i, relationType: "uses", family: "core" },
  { regex: /^(.+?)\s+used\s+(.+)$/i, relationType: "uses", family: "core" },
  { regex: /^(.+?)\s+owns\s+(.+)$/i, relationType: "owns", family: "core" },
  { regex: /^(.+?)\s+depends on\s+(.+)$/i, relationType: "depends_on", family: "core" },
  { regex: /^(.+?)\s+supersedes\s+(.+)$/i, relationType: "supersedes", family: "core" },
  { regex: /^(.+?)\s+requires\s+(.+)$/i, relationType: "requires", family: "core" },
  { regex: /^(.+?)\s+produces\s+(.+)$/i, relationType: "produces", family: "core" },
  { regex: /^(.+?)\s+manages\s+(.+)$/i, relationType: "manages", family: "core" },

  // ---- Temporal -----------------------------------------------------------
  // "from X to Y" — emits two relations conceptually but we encode the X→Y
  // edge as predicate `from_to`; downstream temporal_memory_v12 already
  // handles ranges via valid_from / valid_until. We deliberately keep this
  // as a single relation here (extractor stays single-edge per call).
  {
    regex: /^(.+?)\s+from\s+(.+?)\s+to\s+(.+)$/i,
    relationType: "from_to",
    family: "temporal",
    subjectGroup: 1,
    objectGroup: 2 // object captures the "from" anchor; the "to" anchor is
    // surfaced in the fact text rather than as a structured second target.
  },
  { regex: /^(.+?)\s+since\s+(.+)$/i, relationType: "since", family: "temporal" },
  { regex: /^(.+?)\s+until\s+(.+)$/i, relationType: "until", family: "temporal" },
  { regex: /^(.+?)\s+before\s+(.+)$/i, relationType: "before", family: "temporal" },
  { regex: /^(.+?)\s+after\s+(.+)$/i, relationType: "after", family: "temporal" },
  { regex: /^(.+?)\s+during\s+(.+)$/i, relationType: "during", family: "temporal" },
  { regex: /^(.+?)\s+started\s+on\s+(.+)$/i, relationType: "started_on", family: "temporal" },
  { regex: /^(.+?)\s+ended\s+on\s+(.+)$/i, relationType: "ended_on", family: "temporal" },

  // ---- Causal -------------------------------------------------------------
  { regex: /^(.+?)\s+because\s+of\s+(.+)$/i, relationType: "because_of", family: "causal" },
  { regex: /^(.+?)\s+because\s+(.+)$/i, relationType: "because", family: "causal" },
  { regex: /^(.+?)\s+due\s+to\s+(.+)$/i, relationType: "due_to", family: "causal" },
  { regex: /^(.+?)\s+caused\s+by\s+(.+)$/i, relationType: "caused_by", family: "causal" },
  { regex: /^(.+?)\s+leads\s+to\s+(.+)$/i, relationType: "leads_to", family: "causal" },
  { regex: /^(.+?)\s+results\s+in\s+(.+)$/i, relationType: "results_in", family: "causal" },

  // ---- Comparison ---------------------------------------------------------
  { regex: /^(.+?)\s+better\s+than\s+(.+)$/i, relationType: "better_than", family: "comparison" },
  { regex: /^(.+?)\s+worse\s+than\s+(.+)$/i, relationType: "worse_than", family: "comparison" },
  { regex: /^(.+?)\s+replaces\s+(.+)$/i, relationType: "replaces", family: "comparison" },
  { regex: /^(.+?)\s+supersedes\s+(.+)$/i, relationType: "supersedes", family: "comparison" },
  { regex: /^(.+?)\s+similar\s+to\s+(.+)$/i, relationType: "similar_to", family: "comparison" },

  // ---- Possessive ---------------------------------------------------------
  // "X belongs to Y" — explicit form first.
  { regex: /^(.+?)\s+belongs\s+to\s+(.+)$/i, relationType: "belongs_to", family: "possessive" },
  { regex: /^(.+?)\s+has\s+(.+)$/i, relationType: "has", family: "possessive" },
  // "X's Y is Z" — capture the possessor + possessed; treat possessor as
  // subject, possessed as object via predicate `has`. Apostrophe variants
  // (curly + straight) both supported.
  { regex: /^(.+?)['’]s\s+(.+)$/i, relationType: "has", family: "possessive" },

  // ---- Location -----------------------------------------------------------
  { regex: /^(.+?)\s+located\s+in\s+(.+)$/i, relationType: "located_in", family: "location" },
  { regex: /^(.+?)\s+based\s+in\s+(.+)$/i, relationType: "based_in", family: "location" },
  { regex: /^(.+?)\s+at\s+(.+)$/i, relationType: "at", family: "location" },
  { regex: /^(.+?)\s+in\s+(.+)$/i, relationType: "in", family: "location" }
];

export const REGEX_PATTERN_COUNT = PATTERN_FAMILIES.length;

export function canonicalizeEntityName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-./:一-鿿]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Lane D — simple morphological normalization for English entity names.
 * Strips a single trailing `s`, `es`, `ed`, or `ing` so that "Companies" /
 * "company", "running" / "run", "decided" / "decide" collapse to the same
 * canonical token. Mandarin (CJK) and any non-ASCII tokens are returned
 * unchanged because no portable stemming rule exists at this layer.
 *
 * This is intentionally crude: stemming is destructive and the original
 * surface form is always preserved on `EntityDraft.name` (and as an alias
 * when distinct), so the dictionary lookup can still find the variant.
 */
export function morphologicalNormalize(token: string): string {
  if (!token) return token;
  // Mandarin / non-ASCII: preserve full token.
  if (/[^\x00-\x7f]/.test(token)) return token;
  const lower = token.toLowerCase();
  if (lower.length <= 3) return lower;
  if (lower.endsWith("ies") && lower.length > 4) {
    return lower.slice(0, -3) + "y"; // companies -> company
  }
  if (lower.endsWith("ing") && lower.length > 5) {
    return lower.slice(0, -3); // running -> runn (close enough for cluster)
  }
  if (lower.endsWith("ed") && lower.length > 4) {
    return lower.slice(0, -2); // decided -> decid
  }
  if (lower.endsWith("es") && lower.length > 4) {
    return lower.slice(0, -2); // boxes -> box
  }
  if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 3) {
    return lower.slice(0, -1); // companies-vs-company already handled above
  }
  return lower;
}

function entityIdFor(vaultId: string, canonicalName: string, entityType: string): string {
  return stableMemoryId("ent", `${vaultId}|${entityType}|${canonicalName}`);
}

function relationIdFor(
  vaultId: string,
  sourceCanonical: string,
  relationType: string,
  targetCanonical: string,
  factHash: string
): string {
  return stableMemoryId(
    "rel",
    `${vaultId}|${sourceCanonical}|${relationType}|${targetCanonical}|${factHash}`
  );
}

function buildEntity(
  vaultId: string,
  rawName: string,
  entityType: string,
  confidence: number,
  dictionary?: EntityDictionary
): EntityDraft {
  const cleaned = rawName.trim().replace(/^[-.,;:!?\s]+|[-.,;:!?\s]+$/g, "");
  const canonicalCandidate = canonicalizeEntityName(cleaned);
  // Apply morphological normalization to the canonical key (NOT the surface
  // form) so "Companies" and "company" collapse to the same id.
  const normalizedCanonical = canonicalCandidate
    .split("-")
    .map((segment) => morphologicalNormalize(segment))
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const canonicalName = normalizedCanonical || canonicalCandidate || cleaned.toLowerCase();
  // Lane D: if a dictionary is provided AND it already knows this canonical
  // name, reuse the existing entity id so writes from this run collapse with
  // entities written by prior runs.
  let id = entityIdFor(vaultId, canonicalName, entityType);
  if (dictionary) {
    const known = dictionary.get(canonicalName);
    if (known) id = known;
  }
  return {
    id,
    vaultId,
    name: cleaned,
    canonicalName,
    entityType,
    aliases: cleaned !== canonicalName ? [cleaned] : [],
    confidence
  };
}

function classifyEntityType(name: string): string {
  const trimmed = name.trim();
  if (/^https?:\/\//i.test(trimmed)) return "url";
  if (/[/\\][\w.-]+\.[a-z0-9]+$/i.test(trimmed)) return "file";
  if (/^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(trimmed)) return "email";
  if (/^[A-Z]{2,}$/.test(trimmed)) return "acronym";
  if (/^[A-Z][\w-]*$/.test(trimmed)) return "concept";
  return "concept";
}

function isInformative(token: string): boolean {
  if (!token) return false;
  const lower = token.toLowerCase().trim();
  if (!lower) return false;
  if (STOP_WORDS.has(lower)) return false;
  if (lower.length < 2) return false;
  return true;
}

function hasNegation(text: string): boolean {
  return NEGATION_PATTERNS.some((p) => p.test(text));
}

function hasCorrection(text: string): boolean {
  return CORRECTION_PATTERNS.some((p) => p.test(text));
}

function hashFact(value: string): string {
  // Reuse stableMemoryId so we get a deterministic, short, character-safe hash
  // suitable as a relation id segment.
  return stableMemoryId("fact", value).slice(4);
}

function buildEvidenceId(vaultId: string, relationId: string, itemId: string): string {
  return stableMemoryId("evd", `${vaultId}|${relationId}|${itemId}`);
}

interface PatternMatch {
  relationType: string;
  subject: string;
  object: string;
  family: RelationFamily;
}

function pickRelationFromContent(content: string): PatternMatch | null {
  const trimmed = content.trim().replace(/[.!?]+$/, "");
  if (!trimmed) return null;
  for (const entry of PATTERN_FAMILIES) {
    const match = entry.regex.exec(trimmed);
    if (!match) continue;
    const subject = match[entry.subjectGroup ?? 1]?.trim();
    const object = match[entry.objectGroup ?? 2]?.trim();
    if (!subject || !object) continue;
    if (!isInformative(subject) || !isInformative(object)) continue;
    const relationType =
      typeof entry.relationType === "function" ? entry.relationType(match) : entry.relationType;
    return { relationType, subject, object, family: entry.family };
  }
  return null;
}

function deriveSemantics(content: string, negated: boolean): RelationDraft["semantics"] {
  if (hasCorrection(content)) {
    return negated ? "supersedes" : "updates";
  }
  if (negated) return "contradicts";
  return "default";
}

// ---------------------------------------------------------------------------
// Entity dictionary loader (Lane D §3 item 1).
//
// `loadEntityDictionary(pool, vaultId)` is invoked ONCE per worker run by the
// graph worker. The dictionary maps canonical entity names to their existing
// `memory_entities.id`, so when the regex extractor processes a fresh batch
// of items it can reuse the existing entity id for repeated mentions and
// avoid creating duplicate rows.
//
// Cache invalidation: the dictionary is loaded once per worker run and is NOT
// refreshed mid-run. A worker run is short-lived (process one SQS batch then
// exit / continue polling) so staleness is bounded by the run duration. If
// the worker is long-running, the caller should reload between batches —
// this is documented here rather than enforced because the caller controls
// the batching cadence.
// ---------------------------------------------------------------------------

export type EntityDictionary = ReadonlyMap<string, string>;

interface EntityDictionaryRow {
  id: string;
  canonical_name: string;
}

interface EntityDictionarySource {
  query: (
    sql: string,
    params: unknown[]
  ) => Promise<{ rows: EntityDictionaryRow[] }>;
}

/**
 * Load the canonical-name → entity_id map for a single vault. The caller
 * passes a `pg.Pool`-shaped object (anything with `.query(sql, params)`),
 * which keeps this module test-friendly without requiring a live DB.
 */
export async function loadEntityDictionary(
  pool: EntityDictionarySource,
  vaultId: string
): Promise<EntityDictionary> {
  if (!vaultId) {
    throw new Error("loadEntityDictionary requires a vaultId");
  }
  const res = await pool.query(
    `SELECT id, canonical_name
       FROM memory_entities
      WHERE vault_id = $1`,
    [vaultId]
  );
  const map = new Map<string, string>();
  for (const row of res.rows) {
    if (!row || !row.canonical_name || !row.id) continue;
    if (!map.has(row.canonical_name)) {
      map.set(row.canonical_name, row.id);
    }
  }
  return map;
}

/**
 * Test/runtime helper — build an in-memory dictionary from EntityDraft-like
 * inputs. Used by the combiner and by tests to simulate a multi-item run
 * without touching pg.
 */
export function buildEntityDictionary(
  entries: ReadonlyArray<{ canonicalName: string; id: string }>
): EntityDictionary {
  const map = new Map<string, string>();
  for (const entry of entries) {
    if (!entry?.canonicalName || !entry?.id) continue;
    if (!map.has(entry.canonicalName)) {
      map.set(entry.canonicalName, entry.id);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Public extract API
// ---------------------------------------------------------------------------

export interface ExtractFromItemOptions {
  /** Optional worker-scoped dictionary so repeated mentions across items
   *  collapse to the same entity_id. */
  dictionary?: EntityDictionary;
  /** Optional NER plugin (Lane D §3 item 4 seam). When supplied, recognized
   *  entities are merged into the result alongside the regex-extracted SVO
   *  entities. The regex pipeline is unchanged when no plugin is registered. */
  nerPlugin?: NERPlugin;
}

/**
 * Extract entity / relation / evidence drafts from a single item. Structured
 * fields take precedence; only when they are missing do we fall back to the
 * regex-driven SVO parser. Returns an empty result rather than throwing for
 * un-extractable content so the worker can still record an episode without a
 * relation.
 */
export function extractFromItem(
  item: MemoryItemV12Record,
  options: ExtractFromItemOptions = {}
): ExtractionResult {
  const result: ExtractionResult = { entities: [], relations: [], evidence: [] };
  if (!item.vaultId) {
    throw new Error("graph-extractor-v12: item is missing vaultId");
  }

  const content = item.content ?? "";
  const negated = hasNegation(content);
  const baseConfidence = item.confidence ?? 0.75;
  const dictionary = options.dictionary;

  let subject = item.subject?.trim() ?? "";
  let predicate = item.predicate?.trim() ?? "";
  let object = item.object?.trim() ?? "";
  let family: RelationFamily = "structured";

  if (!(subject && predicate && object)) {
    const inferred = pickRelationFromContent(content);
    if (inferred) {
      subject ||= inferred.subject;
      predicate ||= inferred.relationType;
      object ||= inferred.object;
      family = inferred.family;
    }
  }

  if (!(subject && predicate && object)) {
    return result;
  }

  const sourceEntity = buildEntity(
    item.vaultId,
    subject,
    classifyEntityType(subject),
    baseConfidence,
    dictionary
  );
  const targetEntity = buildEntity(
    item.vaultId,
    object,
    classifyEntityType(object),
    baseConfidence,
    dictionary
  );

  if (!sourceEntity.canonicalName || !targetEntity.canonicalName) {
    return result;
  }

  const factText = `${subject} ${predicate} ${object}`.replace(/\s+/g, " ").trim();
  const semantics = deriveSemantics(content, negated);
  const relationId = relationIdFor(
    item.vaultId,
    sourceEntity.canonicalName,
    predicate,
    targetEntity.canonicalName,
    hashFact(factText)
  );

  const relation: RelationDraft = {
    id: relationId,
    vaultId: item.vaultId,
    sourceEntity,
    targetEntity,
    relationType: predicate,
    fact: factText,
    confidence: baseConfidence,
    semantics,
    negated,
    family
  };

  result.entities.push(sourceEntity, targetEntity);
  result.relations.push(relation);
  result.evidence.push({
    id: buildEvidenceId(item.vaultId, relation.id, item.id),
    vaultId: item.vaultId,
    itemId: item.id,
    episodeId: item.episodeId ?? null,
    evidenceText: content || factText,
    confidence: baseConfidence
  });

  // Optional NER plugin: append any standalone named entities that are NOT
  // already in `result.entities`. Plugin output is additive — it never
  // overrides regex-extracted SVO entities.
  if (options.nerPlugin) {
    const seen = new Set(result.entities.map((e) => e.canonicalName));
    let nerHits: NamedEntity[] = [];
    try {
      // The plugin is async by interface, but we deliberately don't await
      // here so the synchronous fast-path remains synchronous. Instead the
      // sync extractor only consumes plugins that expose a sync helper. To
      // keep the seam clean, we expose a separate `extractFromItemAsync`
      // below for plugin-driven usage; this branch is reachable only when
      // a plugin opts into the synchronous shape via `extractSync`.
      const sync = (options.nerPlugin as NERPlugin & {
        extractSync?: (text: string) => NamedEntity[];
      }).extractSync;
      if (typeof sync === "function") {
        nerHits = sync(content);
      }
    } catch {
      nerHits = [];
    }
    for (const hit of nerHits) {
      const canonical = canonicalizeEntityName(hit.canonical || hit.surface);
      if (!canonical || seen.has(canonical)) continue;
      const entity = buildEntity(item.vaultId, hit.surface, hit.type.toLowerCase(), baseConfidence, dictionary);
      result.entities.push(entity);
      seen.add(entity.canonicalName);
    }
  }

  return result;
}

/**
 * Async variant that awaits an attached `NERPlugin.extract`. The synchronous
 * `extractFromItem` is unchanged for callers that don't need NER. Both
 * variants share the same deterministic regex + dictionary plumbing.
 */
export async function extractFromItemAsync(
  item: MemoryItemV12Record,
  options: ExtractFromItemOptions = {}
): Promise<ExtractionResult> {
  const base = extractFromItem(item, { dictionary: options.dictionary });
  if (!options.nerPlugin) return base;

  const content = item.content ?? "";
  let nerHits: NamedEntity[] = [];
  try {
    nerHits = await options.nerPlugin.extract(content, { vaultId: item.vaultId });
  } catch {
    nerHits = [];
  }
  if (nerHits.length === 0) return base;

  const seen = new Set(base.entities.map((e) => e.canonicalName));
  const baseConfidence = item.confidence ?? 0.75;
  for (const hit of nerHits) {
    const canonical = canonicalizeEntityName(hit.canonical || hit.surface);
    if (!canonical || seen.has(canonical)) continue;
    const entity = buildEntity(
      item.vaultId,
      hit.surface,
      (hit.type || "concept").toLowerCase(),
      baseConfidence,
      options.dictionary
    );
    if (seen.has(entity.canonicalName)) continue;
    base.entities.push(entity);
    seen.add(entity.canonicalName);
  }
  return base;
}

// Re-export internals for the combiner + tests. Kept named to avoid
// accidental misuse (only the combiner imports `STOP_WORDS`).
export const __internals = {
  STOP_WORDS,
  PATTERN_FAMILIES
};
