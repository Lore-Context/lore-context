// Lore Context v1.3 — Lane D §3 item 2: opt-in LLM graph extractor.
//
// Plan §3 Lane D item 2:
//   - Same `MemoryItem -> {entities, relations, evidence}` interface as the
//     regex extractor.
//   - Pluggable provider (OpenAI / Claude / local). Defaults to a small
//     local model (Qwen2.5-7B-Instruct or similar) so the default
//     deployment stays self-contained.
//   - JSON-schema-constrained output for determinism.
//   - Off by default behind `LORE_GRAPH_LLM_EXTRACTOR`.
//
// This module is independent of `graph-extractor-v12.ts`. The regex
// extractor must keep working when no LLM is reachable; the combiner in
// `graph-extractor-combine-v13.ts` is the only consumer that joins both.
//
// Determinism: the LLM is asked for JSON-schema-shaped output. Any malformed
// or schema-violating response yields an empty result rather than tainting
// the graph. The extractor never throws on a model failure — it logs and
// returns `{entities: [], relations: [], evidence: []}`.
//
// Vault scoping: every produced draft inherits `item.vaultId`. We never
// surface the LLM's own free-text claims as evidence verbatim; instead the
// evidence text is anchored to the original item content.

import { stableMemoryId } from "@lore/shared";
import {
  createGatewayWithFallback,
  type LlmRequest,
  type LlmResponse,
} from "@lore/model-gateway";
import type { MemoryItemV12Record } from "./db/memory-store-v12.js";
import {
  canonicalizeEntityName,
  type EntityDraft,
  type EvidenceDraft,
  type ExtractionResult,
  type RelationDraft
} from "./graph-extractor-v12.js";
import { readButlerFlags } from "./butler-flags.js";

export type LLMGraphProvider = "openai" | "claude" | "local";

export interface LLMGraphExtractorOptions {
  /** Provider id. Defaults from env `LORE_GRAPH_LLM_PROVIDER` then `local`. */
  provider?: LLMGraphProvider;
  /** Override the model id sent to the provider. */
  model?: string;
  /** Override the endpoint URL. Useful for local Ollama / LM Studio. */
  endpoint?: string;
  /** API key. Defaults to provider-specific env var; ignored for `local`. */
  apiKey?: string;
  /** Test seam — inject `fetch` so unit tests don't hit the live model. */
  fetchImpl?: typeof fetch;
  /** Force-enable even when the env flag is unset (used by tests). */
  enabled?: boolean;
  /** Hard ceiling on entities produced per item — defends the graph from
   *  runaway model output. Default 16. */
  maxEntitiesPerItem?: number;
  /** Hard ceiling on relations produced per item. Default 16. */
  maxRelationsPerItem?: number;
  /**
   * v1.4 Lane C Phase 2 — optional FallbackOrchestrator invoke seam.
   *
   * When provided, the extractor calls this instead of the built-in
   * fetchImpl path. Enables opt-in fallback chain (anthropic→openai→local-qwen)
   * controlled by LORE_LLM_PROVIDER_CHAIN. When absent, existing single-provider
   * fetchImpl path runs unchanged (backward compatible).
   */
  llmInvoke?: (req: LlmRequest) => Promise<LlmResponse>;
}

interface LLMExtractedEntity {
  name?: unknown;
  type?: unknown;
  canonical?: unknown;
}

interface LLMExtractedRelation {
  source?: unknown;
  target?: unknown;
  type?: unknown;
  fact?: unknown;
  evidence?: unknown;
}

interface LLMExtractedPayload {
  entities?: LLMExtractedEntity[];
  relations?: LLMExtractedRelation[];
}

const ENTITY_TYPE_ALLOWLIST = new Set([
  "person", "org", "loc", "product", "concept", "url", "file", "email",
  "acronym", "other"
]);

const DEFAULT_PROMPT = [
  "You are a deterministic information extractor.",
  "Read the user-provided text and emit STRICT JSON matching this shape:",
  "{",
  "  \"entities\": [{\"name\": string, \"type\": string, \"canonical\": string}],",
  "  \"relations\": [{\"source\": string, \"target\": string, \"type\": string,",
  "                  \"fact\": string, \"evidence\": string}]",
  "}",
  "type MUST be one of: PERSON, ORG, LOC, PRODUCT, CONCEPT, URL, FILE, EMAIL, ACRONYM, OTHER.",
  "Do not invent facts not present in the text. Output ONLY JSON, no prose."
].join("\n");

interface ProviderRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function envFlag(name: string, fallback = ""): string {
  const value = (typeof process !== "undefined" ? process.env?.[name] : undefined) ?? fallback;
  return value;
}

function isExtractorEnabled(force?: boolean): boolean {
  if (force === true) return true;
  if (force === false) return false;
  const flag = envFlag("LORE_GRAPH_LLM_EXTRACTOR");
  // Default ON — set LORE_GRAPH_LLM_EXTRACTOR=0 to disable.
  if (flag === "") return true;
  const normalized = flag.toLowerCase();
  return normalized !== "0" && normalized !== "false" && normalized !== "no" && normalized !== "off";
}

function defaultProvider(): LLMGraphProvider {
  const raw = envFlag("LORE_GRAPH_LLM_PROVIDER", "local").toLowerCase();
  if (raw === "openai" || raw === "claude" || raw === "local") return raw;
  return "local";
}

function buildProviderRequest(
  provider: LLMGraphProvider,
  options: LLMGraphExtractorOptions,
  text: string
): ProviderRequest {
  const model = options.model ?? defaultModel(provider);
  const endpoint = options.endpoint ?? defaultEndpoint(provider);
  const apiKey = options.apiKey ?? defaultApiKey(provider);

  if (provider === "openai") {
    return {
      url: endpoint,
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          { role: "system", content: DEFAULT_PROMPT },
          { role: "user", content: text }
        ]
      })
    };
  }
  if (provider === "claude") {
    return {
      url: endpoint,
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        ...(apiKey ? { "x-api-key": apiKey } : {})
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0,
        system: DEFAULT_PROMPT,
        messages: [{ role: "user", content: text }]
      })
    };
  }
  // local — assume Ollama / LM Studio compatible endpoint with /api/chat.
  return {
    url: endpoint,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      options: { temperature: 0 },
      messages: [
        { role: "system", content: DEFAULT_PROMPT },
        { role: "user", content: text }
      ]
    })
  };
}

function defaultModel(provider: LLMGraphProvider): string {
  if (provider === "openai") return envFlag("LORE_GRAPH_LLM_MODEL", "gpt-4o-mini");
  if (provider === "claude") return envFlag("LORE_GRAPH_LLM_MODEL", "claude-haiku-4-5");
  return envFlag("LORE_GRAPH_LLM_MODEL", "qwen2.5:7b-instruct");
}

function defaultEndpoint(provider: LLMGraphProvider): string {
  if (provider === "openai") {
    return envFlag("LORE_GRAPH_LLM_ENDPOINT", "https://api.openai.com/v1/chat/completions");
  }
  if (provider === "claude") {
    return envFlag("LORE_GRAPH_LLM_ENDPOINT", "https://api.anthropic.com/v1/messages");
  }
  return envFlag("LORE_GRAPH_LLM_ENDPOINT", "http://localhost:11434/api/chat");
}

function defaultApiKey(provider: LLMGraphProvider): string | undefined {
  if (provider === "openai") return envFlag("OPENAI_API_KEY") || undefined;
  if (provider === "claude") return envFlag("ANTHROPIC_API_KEY") || undefined;
  return undefined;
}

function extractTextFromProviderResponse(
  provider: LLMGraphProvider,
  payload: unknown
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (provider === "openai") {
    const choices = obj.choices as Array<{ message?: { content?: unknown } }> | undefined;
    const content = choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
  }
  if (provider === "claude") {
    const blocks = obj.content as Array<{ type?: string; text?: unknown }> | undefined;
    if (!blocks || blocks.length === 0) return null;
    const first = blocks.find((b) => b?.type === "text" && typeof b.text === "string");
    return typeof first?.text === "string" ? first.text : null;
  }
  // local (Ollama-compatible)
  const message = obj.message as { content?: unknown } | undefined;
  if (message && typeof message.content === "string") return message.content;
  if (typeof obj.response === "string") return obj.response;
  return null;
}

/**
 * Validate + clamp LLM output against the JSON schema. Returns `null` when
 * the payload is missing required fields or malformed (the caller treats
 * `null` as "no extraction").
 */
function validatePayload(raw: unknown): LLMExtractedPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const entities = Array.isArray(obj.entities) ? (obj.entities as LLMExtractedEntity[]) : [];
  const relations = Array.isArray(obj.relations) ? (obj.relations as LLMExtractedRelation[]) : [];
  // Schema requires both keys to be arrays. If both are missing entirely the
  // payload is invalid.
  if (!Array.isArray(obj.entities) && !Array.isArray(obj.relations)) return null;
  return { entities, relations };
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

function hashFact(value: string): string {
  return stableMemoryId("fact", value).slice(4);
}

function evidenceIdFor(vaultId: string, relationId: string, itemId: string): string {
  return stableMemoryId("evd", `${vaultId}|${relationId}|${itemId}`);
}

function normalizeType(type: unknown): string {
  const raw = (typeof type === "string" ? type : "concept").toLowerCase().trim();
  if (ENTITY_TYPE_ALLOWLIST.has(raw)) return raw;
  // Best-effort mapping for common synonyms.
  if (raw === "organization" || raw === "organisation") return "org";
  if (raw === "location" || raw === "place") return "loc";
  if (raw === "tool") return "product";
  return "concept";
}

function buildLLMEntity(
  vaultId: string,
  raw: LLMExtractedEntity,
  baseConfidence: number
): EntityDraft | null {
  const surface = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!surface) return null;
  const entityType = normalizeType(raw.type);
  const canonicalRaw = typeof raw.canonical === "string" && raw.canonical.trim()
    ? raw.canonical.trim()
    : surface;
  const canonical = canonicalizeEntityName(canonicalRaw) || surface.toLowerCase();
  if (!canonical) return null;
  return {
    id: entityIdFor(vaultId, canonical, entityType),
    vaultId,
    name: surface,
    canonicalName: canonical,
    entityType,
    aliases: surface !== canonical ? [surface] : [],
    confidence: baseConfidence
  };
}

function buildLLMRelation(
  vaultId: string,
  raw: LLMExtractedRelation,
  entityIndex: Map<string, EntityDraft>,
  surfaceIndex: Map<string, EntityDraft>,
  baseConfidence: number
): RelationDraft | null {
  const source = typeof raw.source === "string" ? raw.source.trim() : "";
  const target = typeof raw.target === "string" ? raw.target.trim() : "";
  const relationType = typeof raw.type === "string" ? raw.type.trim() : "";
  if (!source || !target || !relationType) return null;
  const factText = typeof raw.fact === "string" && raw.fact.trim()
    ? raw.fact.trim()
    : `${source} ${relationType} ${target}`;

  // Prefer the canonical the LLM declared in `entities` for this surface form
  // (so "Claude 4.7" -> "claude-4-7" survives instead of getting re-canonicalized
  // here to "claude-4.7"). Fall back to the local canonicalizer.
  const sourceFromSurface = surfaceIndex.get(source.toLowerCase());
  const targetFromSurface = surfaceIndex.get(target.toLowerCase());
  const sourceCanonical = sourceFromSurface?.canonicalName
    ?? (canonicalizeEntityName(source) || source.toLowerCase());
  const targetCanonical = targetFromSurface?.canonicalName
    ?? (canonicalizeEntityName(target) || target.toLowerCase());
  if (!sourceCanonical || !targetCanonical) return null;

  let sourceEntity = entityIndex.get(sourceCanonical);
  let targetEntity = entityIndex.get(targetCanonical);
  if (!sourceEntity) {
    sourceEntity = {
      id: entityIdFor(vaultId, sourceCanonical, "concept"),
      vaultId,
      name: source,
      canonicalName: sourceCanonical,
      entityType: "concept",
      aliases: [],
      confidence: baseConfidence
    };
    entityIndex.set(sourceCanonical, sourceEntity);
  }
  if (!targetEntity) {
    targetEntity = {
      id: entityIdFor(vaultId, targetCanonical, "concept"),
      vaultId,
      name: target,
      canonicalName: targetCanonical,
      entityType: "concept",
      aliases: [],
      confidence: baseConfidence
    };
    entityIndex.set(targetCanonical, targetEntity);
  }

  const relationId = relationIdFor(
    vaultId,
    sourceCanonical,
    relationType,
    targetCanonical,
    hashFact(factText)
  );

  return {
    id: relationId,
    vaultId,
    sourceEntity,
    targetEntity,
    relationType,
    fact: factText,
    confidence: baseConfidence,
    semantics: "default",
    negated: false,
    family: "core"
  };
}

export interface LLMExtractor {
  /** Returns true when env flag (or `enabled` override) makes the extractor
   *  active. Off-by-default deployments yield `false`. */
  isEnabled(): boolean;
  /** Run the extractor. Always returns a result — empty when disabled,
   *  empty when the model fails or returns malformed JSON. Never throws. */
  extract(item: MemoryItemV12Record): Promise<ExtractionResult>;
}

export class LLMGraphExtractor implements LLMExtractor {
  private readonly options: LLMGraphExtractorOptions;
  private readonly fetchImpl: typeof fetch;
  private readonly provider: LLMGraphProvider;
  private readonly llmInvoke: ((req: LlmRequest) => Promise<LlmResponse>) | undefined;

  constructor(options: LLMGraphExtractorOptions = {}) {
    this.options = options;
    this.provider = options.provider ?? defaultProvider();
    this.fetchImpl =
      options.fetchImpl ??
      (typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined as unknown as typeof fetch);
    this.llmInvoke = options.llmInvoke;
  }

  isEnabled(): boolean {
    return isExtractorEnabled(this.options.enabled);
  }

  async extract(item: MemoryItemV12Record): Promise<ExtractionResult> {
    const empty: ExtractionResult = { entities: [], relations: [], evidence: [] };
    if (!this.isEnabled()) return empty;
    if (!item.vaultId) {
      throw new Error("graph-extractor-llm-v13: item is missing vaultId");
    }
    const text = (item.content ?? "").trim();
    if (!text) return empty;

    const baseConfidence = item.confidence ?? 0.6; // LLM output deliberately
    // *less* confident than regex — the combiner uses regex-first wins anyway.
    const maxEntities = this.options.maxEntitiesPerItem ?? 16;
    const maxRelations = this.options.maxRelationsPerItem ?? 16;

    let modelText: string | null = null;
    try {
      if (this.llmInvoke) {
        // v1.4 Lane C Phase 2 — FallbackOrchestrator path (opt-in via LORE_LLM_PROVIDER_CHAIN).
        // The orchestrator handles provider selection and chain cuts internally.
        const llmReq: LlmRequest = {
          requestId: stableMemoryId("greq", `${item.id}|${item.vaultId}`),
          systemPrompt: DEFAULT_PROMPT,
          prompt: text,
          maxTokens: 1024,
          temperature: 0,
          enablePromptCache: readButlerFlags().openrouterPromptCache,
        };
        const llmResp = await this.llmInvoke(llmReq);
        modelText = llmResp.text;
      } else {
        // Original single-provider fetch path — unchanged for backward compatibility.
        if (typeof this.fetchImpl !== "function") return empty;
        const req = buildProviderRequest(this.provider, this.options, text);
        const response = await this.fetchImpl(req.url, {
          method: "POST",
          headers: req.headers,
          body: req.body
        });
        if (!response || !response.ok) return empty;
        const responseJson = await response.json().catch(() => null);
        modelText = extractTextFromProviderResponse(this.provider, responseJson);
      }
    } catch {
      return empty;
    }
    if (!modelText) return empty;

    let parsed: unknown;
    try {
      parsed = JSON.parse(modelText);
    } catch {
      return empty;
    }
    const validated = validatePayload(parsed);
    if (!validated) return empty;

    const result: ExtractionResult = { entities: [], relations: [], evidence: [] };
    const entityIndex = new Map<string, EntityDraft>();
    const surfaceIndex = new Map<string, EntityDraft>();
    for (const raw of (validated.entities ?? []).slice(0, maxEntities)) {
      const entity = buildLLMEntity(item.vaultId, raw, baseConfidence);
      if (!entity) continue;
      if (!entityIndex.has(entity.canonicalName)) {
        entityIndex.set(entity.canonicalName, entity);
        result.entities.push(entity);
      }
      // Surface index lets relation source/target lookup find the LLM's
      // declared canonical form even when its surface form doesn't
      // canonicalize the same way as the local helper.
      surfaceIndex.set(entity.name.toLowerCase(), entity);
    }
    for (const raw of (validated.relations ?? []).slice(0, maxRelations)) {
      const relation = buildLLMRelation(item.vaultId, raw, entityIndex, surfaceIndex, baseConfidence);
      if (!relation) continue;
      // Make sure both endpoints exist in the entities array.
      for (const ent of [relation.sourceEntity, relation.targetEntity]) {
        if (!result.entities.find((e) => e.canonicalName === ent.canonicalName)) {
          result.entities.push(ent);
        }
      }
      result.relations.push(relation);
      const evidenceText = typeof raw.evidence === "string" && raw.evidence.trim()
        ? raw.evidence.trim()
        : text;
      const evidence: EvidenceDraft = {
        id: evidenceIdFor(item.vaultId, relation.id, item.id),
        vaultId: item.vaultId,
        itemId: item.id,
        episodeId: item.episodeId ?? null,
        evidenceText,
        confidence: baseConfidence
      };
      result.evidence.push(evidence);
    }
    return result;
  }
}

/**
 * Convenience factory — used by the worker to build a default extractor that
 * respects env flags and wires the runtime `fetch`. Tests should construct
 * `new LLMGraphExtractor({...})` directly with `fetchImpl` injected.
 *
 * v1.4 Lane C Phase 2: when LORE_LLM_PROVIDER_CHAIN is set, wires the
 * FallbackOrchestrator as the llmInvoke seam (opt-in). When unset, returns
 * the original single-provider extractor (default behavior unchanged).
 */
export function createDefaultLLMGraphExtractor(): LLMGraphExtractor {
  const useFallback = !!(
    typeof process !== "undefined" && process.env?.LORE_LLM_PROVIDER_CHAIN
  );
  if (useFallback) {
    const orchestrator = createGatewayWithFallback(
      typeof process !== "undefined" ? process.env as Record<string, string | undefined> : {}
    );
    return new LLMGraphExtractor({ llmInvoke: (req) => orchestrator.invoke(req) });
  }
  return new LLMGraphExtractor({});
}
