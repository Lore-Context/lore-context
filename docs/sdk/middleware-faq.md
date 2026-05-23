# SDK Middleware FAQ

Common pitfalls and how to handle them.

## "My token budget keeps getting overrun by inject"

The middleware caps inject at the per-tier maximum (see [middleware-modes.md](./middleware-modes.md) for the table). If your `recallMaxTokens` setting exceeds the cap:

- **Server is authoritative** — server-side caps `token_budget` to `min(your_value, tier_max)` before running search; you can't bypass this client-side.
- **Middleware emits a one-time warning** per `LoreContextApiClient` instance the first time the cap is enforced (so you can tune in dev without spam in prod).
- **Fix**: either downgrade `recallMaxTokens` to the tier cap, or upgrade tier.

The truncation strategy keeps highest-score canonical episodes; lower-relevance memories are dropped first.

## "I'm seeing the same memory get captured repeatedly"

Two layers of dedup:

1. **Middleware pre-filter**: rejects retain payloads containing `<memory_capture>` or `<recalled>` markers. These appear in injected blocks, so the dedup catches the trivial "AI quoted the injected memory back" case.
2. **Server-side dedup**: every retain POST carries an `idempotency_key` (per-call UUID) AND the server applies cosine ≥ `LORE_MEMORY_DEDUP_COSINE` (currently 0.95) using `text-embedding-3-small`. Near-duplicates are merged with the existing record.

Combined effect: in S8 regression test, 10-turn conversations with marker-polluted assistant replies produce 7 records, not 10.

## "Streaming responses — does retain fire on chunk or stream-complete?"

Stream-complete only. Specifically:

- All chunks are yielded to your code verbatim — accumulation happens in a wrapper async generator
- On the iterator's natural end (finish_reason: stop or stream done), a single retain POST fires with the joined `assistant_msg`
- On stream **error** mid-flight, retain is skipped with `reason: "stream_error"`
- Idempotency key is the same one generated at `pre_llm_call` time, so even if your code re-runs the stream consumer, the server-side dedup catches repeats

## "What if I'm wrapping the client multiple places in my code?"

Wrap once at boot:

```typescript
// app-bootstrap.ts
export const llm = withMemoryHooks(new OpenAI(...), lore, opts);
```

Then share the wrapped client. Wrapping the same client twice throws `LoreMiddlewareDoubleWrapError`. If you accidentally do it, the error message points at the offender — fix at the second call site.

## "I'm using `client.with_options(timeout: 30000)` — does middleware survive?"

Yes. Both TS Proxy and Python `_WrappedOpenAI.with_options()` re-wrap the returned client with the same middleware options. Marker is preserved; double-wrap detection still triggers on subsequent explicit `withMemoryHooks` calls.

## "Cost estimate per turn?"

| Component | Typical (Plus tier, hybrid mode) | Worst case |
|---|---|---|
| Inject lookup (canonical_index fast-path → Cohere rerank cached) | ~$0.0001 | ~$0.001 |
| Retain POST (memory_write + async graph_extractor + embedding) | ~$0.0005 (DeepSeek v4-flash batched) | ~$0.002 |
| Telemetry metric ingest | negligible | negligible |
| **Per-turn total** | **~$0.0006** | **~$0.003** |

100-turn conversation: ~$0.06 typical, $0.30 worst.

## "How does the middleware interact with my OpenAI / Anthropic SDK timeout setting?"

The inject 2s timeout is **independent** of your underlying SDK timeout. The middleware uses its own internal abort signal, so:

- Your `OpenAI({ timeout: 30000 })` config applies to the actual LLM call only
- Inject's 2s budget is enforced inside the middleware; on timeout, inject is silently skipped and the LLM call proceeds with original messages

## "I keep getting `LoreMiddlewareDoubleWrapError`"

You're wrapping an already-wrapped client. Common sources:

- Module re-evaluation in dev (e.g., Next.js HMR) creating multiple wraps of the same singleton
- A factory function that's both passed the wrapped result AND wrapping itself

Fix: wrap exactly once at the highest stable point in your dependency graph. The marker survives `with_options()` calls; it does NOT survive constructing a brand-new `OpenAI()` instance.

## "Anthropic system param — array form vs string form?"

Both supported transparently. The middleware preserves whatever form you passed in:

- `system: undefined` → middleware sets it to the injected block as a string
- `system: "You are…"` → middleware appends with `\n\n` separator, result is still a string
- `system: [{ type: "text", text: "…", cache_control: {...} }]` → middleware appends a new `{ type: "text", text: injectedBlock }` entry, preserving your `cache_control` on the original entries

The array form is useful if you're using Anthropic's prompt caching — only the first array entry gets cached, so the injected block (which changes per query) goes at the end where it won't bust the cache.

## "Where do I report bugs?"

GitHub issues: https://github.com/Lore-Context/lore-cloud/issues — tag with `middleware` label.
