// Lore Context v1.3 — Lane C WikiCompilerV13.
//
// Replaces the LORE_WIKI_COMPILER deferral at memory-store-v12.ts:214 with a
// real compiler. Triggered by SQS queue `lore-wiki-compile-v13`; for each
// high-confidence entity (heuristic: >= 3 supporting evidence items, all with
// confidence >= 0.7, none on a `superseded`/`invalidated`/`expired` relation)
// it produces or refreshes a `memory_wiki_pages` row.
//
// Body assembly is **template-only** in v1.3.0-beta. The structured Markdown
// digest is the entity's most recent valid relations + evidence quotes. An
// optional `WikiBodyRewriter` seam exists for the LORE_WIKI_LLM_REWRITER flag;
// the default rewriter is identity (template body passes through unchanged).
//
// Lifecycle propagation (plan §3 Lane C item 3):
//   * Existing page becomes `stale` when supporting evidence drops below the
//     high-confidence threshold (< 3 evidence items, or any with conf < 0.7).
//   * Existing page becomes `archived` when every relation for the entity is
//     `superseded` or `expired` (entity is fully invalidated).
//   * The inverse path — marking pages stale on individual item lifecycle
//     transitions — already lives in memory-store-v12.ts:1571.
//
// Security invariants:
//   * Every method takes a vaultId from the SQS message; cross-vault writes
//     are rejected by the underlying store.
//   * Compiler does not generate wiki pages for entities owned by a vault
//     other than the job's vault.

import { stableMemoryId } from "@lore/shared";
import {
  createGatewayWithFallback,
  type LlmRequest,
  type FallbackOrchestrator,
} from "@lore/model-gateway";
import type {
  MemoryEntityV12Record,
  MemoryRelationEvidenceV12Record,
  MemoryRelationV12Record,
  MemoryWikiPageV12Record,
  MemoryWikiPageV12Status
} from "../db/memory-store-v12.js";

// ---------------------------------------------------------------------------
// High-confidence threshold (plan §3 Lane C item 1).
// ---------------------------------------------------------------------------

export const WIKI_HIGH_CONFIDENCE_MIN_EVIDENCE = 3;
export const WIKI_HIGH_CONFIDENCE_MIN_CONFIDENCE = 0.7;

// Statuses considered "dead" for the archived check. A relation is treated as
// invalidated whenever it is no longer active.
const DEAD_RELATION_STATUSES = new Set<string>(["superseded", "expired", "invalidated"]);

// ---------------------------------------------------------------------------
// Compiler context — narrow store seam plus optional dependencies.
// ---------------------------------------------------------------------------

export interface WikiCompilerStoreV13 {
  /** Look up an entity by id within a vault. Returns undefined when missing. */
  getEntityV12(vaultId: string, entityId: string): Promise<MemoryEntityV12Record | undefined>;

  /**
   * List relations whose source or target is the entity. The compiler reads
   * relations regardless of status because it must distinguish "active high
   * confidence" (compile) from "all dead" (archive).
   */
  listRelationsForEntityV13(vaultId: string, entityId: string): Promise<MemoryRelationV12Record[]>;

  /**
   * List evidence rows for the supplied relation ids, vault-scoped. The
   * compiler iterates relations one-by-one; this is one round-trip per call.
   */
  listEvidenceForRelationV13(vaultId: string, relationId: string): Promise<MemoryRelationEvidenceV12Record[]>;

  /** Read an existing wiki page by id (returns undefined when not found). */
  getWikiPageV13(vaultId: string, pageId: string): Promise<MemoryWikiPageV12Record | undefined>;

  /** Upsert a wiki page row. Idempotent on `id`. Embedding is optional. */
  upsertWikiPageV13(record: MemoryWikiPageV12Record & { wikiEmbedding?: number[] | null }): Promise<MemoryWikiPageV12Record>;

  /** Update only the status (and updated_at) of an existing wiki page. */
  setWikiPageStatusV13(vaultId: string, pageId: string, status: MemoryWikiPageV12Status, updatedAt: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Pluggable rewriter seam (plan §3 Lane C item 2).
// ---------------------------------------------------------------------------

export interface WikiCompilerContext {
  entity: MemoryEntityV12Record;
  relations: MemoryRelationV12Record[];
  evidence: MemoryRelationEvidenceV12Record[];
}

export interface WikiBodyRewriter {
  rewrite(template: string, context: WikiCompilerContext): Promise<string>;
}

/** Default rewriter — returns the template unchanged. Used when the
 *  LORE_WIKI_LLM_REWRITER flag is OFF. */
export const identityWikiBodyRewriter: WikiBodyRewriter = {
  async rewrite(template: string): Promise<string> {
    return template;
  }
};

// ---------------------------------------------------------------------------
// Stub LLM rewriter — gated behind LORE_WIKI_LLM_REWRITER=1. Single HTTP POST
// to a configurable provider; returns the template untouched on any failure
// so the compiler never blocks on an upstream outage.
// ---------------------------------------------------------------------------

export interface LLMWikiBodyRewriterConfig {
  fetchImpl: typeof fetch;
  endpoint: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
  /**
   * v1.4 Lane C Phase 2 — optional FallbackOrchestrator seam.
   *
   * When provided, rewrite() calls orchestrator.invoke() instead of the
   * built-in fetchImpl path. Enables opt-in fallback chain (anthropic→openai→
   * local-qwen) controlled by LORE_LLM_PROVIDER_CHAIN. When absent, the
   * existing single-endpoint fetchImpl path runs unchanged (backward compatible).
   */
  orchestrator?: FallbackOrchestrator;
}

export class LLMWikiBodyRewriter implements WikiBodyRewriter {
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly orchestrator: FallbackOrchestrator | undefined;

  constructor(config: LLMWikiBodyRewriterConfig) {
    this.fetchImpl = config.fetchImpl;
    this.endpoint = config.endpoint;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 5000;
    this.orchestrator = config.orchestrator;
  }

  async rewrite(template: string, context: WikiCompilerContext): Promise<string> {
    if (this.orchestrator) {
      return this._rewriteViaOrchestrator(template, context);
    }
    return this._rewriteViaFetch(template, context);
  }

  /** v1.4 Lane C Phase 2 — FallbackOrchestrator path (opt-in via LORE_LLM_PROVIDER_CHAIN). */
  private async _rewriteViaOrchestrator(
    template: string,
    context: WikiCompilerContext
  ): Promise<string> {
    try {
      const req: LlmRequest = {
        requestId: stableMemoryId("wreq", `${context.entity.id}|wiki-rewrite`),
        systemPrompt:
          "You are a wiki body rewriter. Improve the readability and completeness of the following wiki page draft. Return only the improved wiki body, no preamble.",
        prompt: template,
        maxTokens: 2048,
        temperature: 0.3,
      };
      const resp = await this.orchestrator!.invoke(req);
      return typeof resp.text === "string" && resp.text.trim().length > 0
        ? resp.text.trim()
        : template;
    } catch {
      // Never block the compiler on rewriter outages — fall back to template.
      return template;
    }
  }

  /** Original single-endpoint fetch path — unchanged for backward compatibility. */
  private async _rewriteViaFetch(
    template: string,
    context: WikiCompilerContext
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: this.model,
          template,
          entity: { id: context.entity.id, name: context.entity.name }
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        return template;
      }
      const payload = (await response.json()) as { body?: string };
      return typeof payload.body === "string" && payload.body.length > 0
        ? payload.body
        : template;
    } catch {
      // Never block the compiler on rewriter outages — fall back to template.
      return template;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------------------------------------------------------------------------
// v1.4 Lane C Phase 2 — factory that wires FallbackOrchestrator when
// LORE_LLM_PROVIDER_CHAIN is set, otherwise returns the identity rewriter.
// ---------------------------------------------------------------------------

/**
 * Build a WikiBodyRewriter appropriate for the current environment.
 *
 * When LORE_LLM_PROVIDER_CHAIN is set: returns an LLMWikiBodyRewriter backed
 * by a FallbackOrchestrator (anthropic→openai→local-qwen chain).
 *
 * When unset (default): returns identityWikiBodyRewriter so the wiki compiler
 * keeps its current template-only behavior unchanged.
 */
export function createWikiRewriterWithFallback(
  env: NodeJS.ProcessEnv = process.env
): WikiBodyRewriter {
  const chain = env.LORE_LLM_PROVIDER_CHAIN;
  if (!chain) return identityWikiBodyRewriter;

  const orchestrator = createGatewayWithFallback(
    env as Record<string, string | undefined>
  );
  // fetchImpl and endpoint are required by config but unused when orchestrator
  // is provided — we supply minimal stubs so the type check is satisfied.
  return new LLMWikiBodyRewriter({
    fetchImpl: fetch,
    endpoint: "",
    model: "",
    orchestrator,
  });
}

// ---------------------------------------------------------------------------
// Optional embedding seam (mirrors the v1.2 PostgresHybridMemorySearchProvider
// pattern). When provided, the compiler embeds the body and writes the
// `wiki_embedding` column. When absent, the column stays NULL and the
// pgvector candidate path simply falls back to FTS-only.
// ---------------------------------------------------------------------------

export type WikiEmbeddingFn = (text: string) => Promise<number[]>;

// ---------------------------------------------------------------------------
// Compiler input + result.
// ---------------------------------------------------------------------------

export interface WikiCompileInputV13 {
  vaultId: string;
  entityId: string;
  /** Optional override (defaults to `now()` resolved by the worker config). */
  now?: string;
  /** Optional project id propagated to the wiki page row. */
  projectId?: string | null;
}

export type WikiCompileActionV13 = "created" | "refreshed" | "stale" | "archived" | "skipped";

export interface WikiCompileResultV13 {
  vaultId: string;
  entityId: string;
  pageId: string;
  action: WikiCompileActionV13;
  status: MemoryWikiPageV12Status;
  evidenceCount: number;
  /** Number of active relations contributing to the page body. */
  activeRelationCount: number;
}

// ---------------------------------------------------------------------------
// Configuration.
// ---------------------------------------------------------------------------

export interface WikiCompilerV13Config {
  store: WikiCompilerStoreV13;
  /** Optional rewriter — defaults to identity. */
  rewriter?: WikiBodyRewriter;
  /** Optional embedding fn — when omitted, wiki_embedding stays NULL. */
  embeddingFn?: WikiEmbeddingFn;
  /** Override `now()` for deterministic tests. */
  now?: () => Date;
  /** Override the high-confidence evidence count threshold (default 3). */
  minEvidenceCount?: number;
  /** Override the per-evidence confidence threshold (default 0.7). */
  minEvidenceConfidence?: number;
}

// ---------------------------------------------------------------------------
// Page id derivation — deterministic so re-running compile on the same entity
// returns the same row. Key includes vault to keep cross-vault rows isolated.
// ---------------------------------------------------------------------------

export function wikiPageIdFor(vaultId: string, entityId: string): string {
  return stableMemoryId("wiki", `${vaultId}|${entityId}`);
}

// ---------------------------------------------------------------------------
// WikiCompilerV13.
// ---------------------------------------------------------------------------

export class WikiCompilerV13 {
  private readonly store: WikiCompilerStoreV13;
  private readonly rewriter: WikiBodyRewriter;
  private readonly embeddingFn: WikiEmbeddingFn | undefined;
  private readonly now: () => Date;
  private readonly minEvidenceCount: number;
  private readonly minEvidenceConfidence: number;

  constructor(config: WikiCompilerV13Config) {
    this.store = config.store;
    this.rewriter = config.rewriter ?? identityWikiBodyRewriter;
    this.embeddingFn = config.embeddingFn;
    this.now = config.now ?? (() => new Date());
    this.minEvidenceCount = config.minEvidenceCount ?? WIKI_HIGH_CONFIDENCE_MIN_EVIDENCE;
    this.minEvidenceConfidence = config.minEvidenceConfidence ?? WIKI_HIGH_CONFIDENCE_MIN_CONFIDENCE;
  }

  /**
   * Compile (or lifecycle-propagate) a wiki page for a single entity. The
   * caller (worker) is expected to invoke this once per SQS message; running
   * it twice on the same input is idempotent.
   */
  async compile(input: WikiCompileInputV13): Promise<WikiCompileResultV13> {
    if (!input.vaultId) {
      throw new Error("WikiCompilerV13.compile requires a vaultId from the authenticated session");
    }
    if (!input.entityId) {
      throw new Error("WikiCompilerV13.compile requires an entityId");
    }

    const nowIso = (input.now ?? this.now().toISOString());
    const pageId = wikiPageIdFor(input.vaultId, input.entityId);

    const entity = await this.store.getEntityV12(input.vaultId, input.entityId);
    if (!entity) {
      // Vault-scoped lookup miss — entity does not exist in this vault.
      return {
        vaultId: input.vaultId,
        entityId: input.entityId,
        pageId,
        action: "skipped",
        status: "active",
        evidenceCount: 0,
        activeRelationCount: 0
      };
    }

    const allRelations = await this.store.listRelationsForEntityV13(input.vaultId, input.entityId);
    const activeRelations = allRelations.filter((r) => (r.status ?? "active") === "active");

    // Walk evidence for active relations only (stale evidence does not count
    // toward the high-confidence threshold).
    const evidence: MemoryRelationEvidenceV12Record[] = [];
    for (const relation of activeRelations) {
      const rows = await this.store.listEvidenceForRelationV13(input.vaultId, relation.id);
      evidence.push(...rows);
    }

    // ------------------------------------------------------------------
    // Lifecycle propagation paths (plan §3 Lane C item 3):
    //   * No active relations + at least one dead relation → archived.
    //   * Below threshold → stale (if a page already exists; skipped otherwise).
    //   * At/above threshold → compile (create or refresh).
    // ------------------------------------------------------------------

    if (allRelations.length > 0 && activeRelations.length === 0) {
      const allDead = allRelations.every((r) => DEAD_RELATION_STATUSES.has(r.status ?? "active"));
      if (allDead) {
        const existing = await this.store.getWikiPageV13(input.vaultId, pageId);
        if (existing) {
          await this.store.setWikiPageStatusV13(input.vaultId, pageId, "archived", nowIso);
          return {
            vaultId: input.vaultId,
            entityId: input.entityId,
            pageId,
            action: "archived",
            status: "archived",
            evidenceCount: 0,
            activeRelationCount: 0
          };
        }
      }
    }

    const passingEvidence = evidence.filter(
      (ev) => (ev.confidence ?? 0) >= this.minEvidenceConfidence
    );
    const meetsThreshold = passingEvidence.length >= this.minEvidenceCount;

    if (!meetsThreshold) {
      const existing = await this.store.getWikiPageV13(input.vaultId, pageId);
      if (existing && (existing.status ?? "active") === "active") {
        await this.store.setWikiPageStatusV13(input.vaultId, pageId, "stale", nowIso);
        return {
          vaultId: input.vaultId,
          entityId: input.entityId,
          pageId,
          action: "stale",
          status: "stale",
          evidenceCount: passingEvidence.length,
          activeRelationCount: activeRelations.length
        };
      }
      return {
        vaultId: input.vaultId,
        entityId: input.entityId,
        pageId,
        action: "skipped",
        status: existing?.status ?? "active",
        evidenceCount: passingEvidence.length,
        activeRelationCount: activeRelations.length
      };
    }

    // ------------------------------------------------------------------
    // Threshold met — assemble template body and (optionally) embed it.
    // ------------------------------------------------------------------
    const ctx: WikiCompilerContext = { entity, relations: activeRelations, evidence: passingEvidence };
    const template = renderTemplate(ctx);
    const body = await this.rewriter.rewrite(template, ctx);

    let wikiEmbedding: number[] | null = null;
    if (this.embeddingFn) {
      try {
        wikiEmbedding = await this.embeddingFn(body);
      } catch {
        wikiEmbedding = null;
      }
    }

    const sourceItemIds = collectSourceItemIds(passingEvidence);
    const existing = await this.store.getWikiPageV13(input.vaultId, pageId);

    const stored = await this.store.upsertWikiPageV13({
      id: pageId,
      vaultId: input.vaultId,
      projectId: input.projectId ?? existing?.projectId ?? null,
      topic: entity.name,
      body,
      confidence: averageRelationConfidence(activeRelations),
      sourceItemIds,
      entityIds: [entity.id],
      status: "active",
      generatedBy: "wiki-compiler-v13",
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
      wikiEmbedding
    });

    return {
      vaultId: input.vaultId,
      entityId: input.entityId,
      pageId,
      action: existing ? "refreshed" : "created",
      status: stored.status ?? "active",
      evidenceCount: passingEvidence.length,
      activeRelationCount: activeRelations.length
    };
  }
}

// ---------------------------------------------------------------------------
// Template assembly — deterministic Markdown digest. Sort by relation id /
// evidence id so re-running on the same input produces the same output.
// ---------------------------------------------------------------------------

function renderTemplate(ctx: WikiCompilerContext): string {
  const { entity, relations, evidence } = ctx;
  const lines: string[] = [];
  lines.push(`# ${entity.name}`);
  lines.push("");
  lines.push(`Type: ${entity.entityType}`);
  if (entity.aliases && entity.aliases.length > 0) {
    lines.push(`Aliases: ${[...entity.aliases].sort().join(", ")}`);
  }
  lines.push("");
  lines.push("## Relations");
  if (relations.length === 0) {
    lines.push("(no active relations)");
  } else {
    const sorted = [...relations].sort((a, b) => a.id.localeCompare(b.id));
    for (const rel of sorted) {
      lines.push(`- ${rel.relationType}: ${rel.fact}`);
    }
  }
  lines.push("");
  lines.push("## Evidence");
  if (evidence.length === 0) {
    lines.push("(no evidence)");
  } else {
    const sorted = [...evidence].sort((a, b) => a.id.localeCompare(b.id));
    for (const ev of sorted) {
      const conf = (ev.confidence ?? 0).toFixed(2);
      lines.push(`- (${conf}) ${ev.evidenceText}`);
    }
  }
  return lines.join("\n");
}

function averageRelationConfidence(relations: MemoryRelationV12Record[]): number {
  if (relations.length === 0) return 0.75;
  const sum = relations.reduce((acc, r) => acc + (r.confidence ?? 0), 0);
  return sum / relations.length;
}

function collectSourceItemIds(evidence: MemoryRelationEvidenceV12Record[]): string[] {
  const seen = new Set<string>();
  for (const ev of evidence) {
    if (ev.itemId) seen.add(ev.itemId);
  }
  return [...seen].sort();
}

// ---------------------------------------------------------------------------
// Feature-flag helper — read LORE_WIKI_LLM_REWRITER from env (default ON).
// Set LORE_WIKI_LLM_REWRITER=0 to disable.
// ---------------------------------------------------------------------------

export function isWikiLlmRewriterEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.LORE_WIKI_LLM_REWRITER;
  if (typeof raw !== "string") return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== "0" && normalized !== "false" && normalized !== "no" && normalized !== "off";
}

// ---------------------------------------------------------------------------
// SQS queue name constant (plan §3 Lane C item 1).
// ---------------------------------------------------------------------------

export const WIKI_COMPILE_QUEUE_NAME_V13 = "lore-wiki-compile-v13";
