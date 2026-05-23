// Lore Context v1.3 — Lane D §3 item 4: NER plugin seam.
//
// Plan §3 Lane D item 4: "an interface so a future external NER (spaCy,
// Stanza, or a hosted entity API) can be added without changing extractor
// consumers."
//
// The plugin is intentionally minimal: the extractor calls
// `plugin.extract(text, context)` and merges any returned `NamedEntity` rows
// into its own entity drafts. The default `NoOpNERPlugin` returns `[]` so
// the v1.3 default deployment behaves exactly like v1.2 — no live NER, no
// new external dependency.
//
// Determinism: plugins MUST return rows in a stable order for identical input
// (the extractor relies on this for replayable graph state). Plugins MUST be
// vault-aware in a custodial sense — `context.vaultId` is supplied so the
// plugin can scope any caching it does — but the plugin MUST NOT make a
// network call that leaks `text` outside the user's vault unless explicitly
// enabled by an env flag.

export type NamedEntityType =
  | "PERSON"
  | "ORG"
  | "LOC"
  | "PRODUCT"
  | "CONCEPT"
  | "OTHER";

export interface NamedEntity {
  /** Surface form as it appeared in the input text. Used for evidence. */
  surface: string;
  /** Canonical form (e.g. "Anthropic" for "anthropic", "Anthropic, PBC"). */
  canonical: string;
  /** NER tag. Mapped to `entity_type` on `EntityDraft` (lowercased). */
  type: NamedEntityType;
}

export interface NERContext {
  /** Vault id for caching / RBAC. Plugins MUST treat this as opaque. */
  vaultId: string;
  /** Optional: extra metadata the worker can pass through (e.g. source). */
  meta?: Record<string, unknown>;
}

export interface NERPlugin {
  /** Stable identifier ("noop", "spacy-en-core-web-sm", "anthropic-ner-2025"). */
  readonly name: string;
  /** Extract named entities from a single text span. Implementations should
   *  treat empty input as an empty result, not as an error. */
  extract(text: string, context: NERContext): Promise<NamedEntity[]>;
}

/**
 * Default plugin — extracts nothing, never throws. The graph extractor
 * behaves exactly as it did in v1.2 when this is the registered plugin.
 *
 * Deployments that want LLM-grade entity extraction can either:
 *  - flip `LORE_GRAPH_LLM_EXTRACTOR=1` and rely on the LLM extractor's
 *    own entity output (no NER plugin needed), OR
 *  - implement a real NERPlugin (spaCy / Stanza / hosted API) and register
 *    it with the worker. The two paths are independent.
 */
export class NoOpNERPlugin implements NERPlugin {
  readonly name = "noop";

  async extract(_text: string, _context: NERContext): Promise<NamedEntity[]> {
    return [];
  }
}

/**
 * Helper for tests + simple deployments — wrap a synchronous function as a
 * plugin without writing a class.
 */
export function makeFunctionalNERPlugin(
  name: string,
  fn: (text: string, context: NERContext) => NamedEntity[] | Promise<NamedEntity[]>
): NERPlugin {
  return {
    name,
    async extract(text: string, context: NERContext): Promise<NamedEntity[]> {
      const out = await fn(text, context);
      return Array.isArray(out) ? out : [];
    }
  };
}
