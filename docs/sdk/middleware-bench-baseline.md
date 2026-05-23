# Middleware Bench Baseline (v2.0.3 Z2 floor calibration)

> Records the v2.0.2 baseline measurement and the rationale for v2.0.3's Z2 acceptance floors.
> Status: **v0 targets, re-calibrated after 7 days of production data per plan §10 carry-forward.**

## Setup

200 multi-turn conversation scripts drawn from `packages/eval/fixtures/middleware-bench-corpus.jsonl` (fixture-based; no live LLM cost). Each script:

- 10 user turns / 10 assistant turns
- 5 ground-truth-relevant memory records pre-seeded per vault
- 50/50 split: turns that should fire inject (because the user message references a seeded memory) vs turns that shouldn't

Bench measures three metrics per turn, averaged across 200 conversations:

1. **inject-relevance**: mean cosine of the injected `contextBlock` against the ground-truth-relevant memory set
2. **retain-precision**: fraction of retained turns that, by manual label, are "facts worth keeping" (not chit-chat)
3. **cost-per-turn**: simulated total dollar cost (canonical_index lookup + Cohere rerank + retain POST + telemetry)

## v2.0.2 baseline (pre-middleware)

| Metric | v2.0.2 (instructions-injection only at session start) |
|---|---|
| inject-relevance | 0.55 (canonical_index-only, no per-turn refresh) |
| retain-precision | N/A (v2.0.2 has no auto-retain) |
| cost-per-turn | $0.0001 (just the one-shot canonical_index lookup at session start) |

## v2.0.3 targets

| Metric | v0 floor | Rationale |
|---|---|---|
| inject-relevance | ≥ 0.60 | Baseline 0.55 + 5pp; middleware does per-turn lookup so this should beat session-start-only |
| retain-precision | ≥ 0.70 | Inaugural target — no baseline since v2.0.2 has no auto-retain. Loose enough to ship; tighten after 7 days. |
| cost-per-turn | ≤ $0.003 | Matches §8 worst-case (every turn hits cold canonical_index + full graph extract). Generous ceiling so the gate isn't flaky on cold cache; tighter typical bound (~$0.0006) is monitored separately. |

## How the gate fires

```bash
pnpm bench:v13:gate
```

The `middleware-quality-gate` sub-suite (added in v2.0.3) emits JSON:

```json
{
  "inject_relevance_mean": 0.62,
  "retain_precision": 0.74,
  "cost_per_turn_usd": 0.0008,
  "asserts": {
    "inject_relevance >= 0.60": true,
    "retain_precision >= 0.70": true,
    "cost_per_turn <= 0.003": true
  }
}
```

If any `asserts.*` is false, the gate exits non-zero and blocks publish (per Z2 acceptance).

## When to recalibrate

- Immediately after first 7 days of production traffic (per §10 carry-forward)
- After any change to the canonical_index ranking algorithm (Lane I evolutions)
- After embedding model swap (e.g., when text-embedding-3-small → text-embedding-3-large)
- After Cohere reranker version change

When recalibrating, run the bench against the previous gate-passing version, set the new floor at `mean − 5%`, and update this doc.

## Known limitations

- **Fixture corpus is synthetic.** The 200 conversations are generated, not collected from production. Real-world distribution will differ. After production traffic exists, augment with `packages/eval/fixtures/middleware-bench-corpus-prod-sampled.jsonl`.
- **cost-per-turn is simulated.** The sub-suite doesn't actually call live LLMs (would cost ~$5/run); instead it uses fixed per-model unit costs from `packages/eval/src/cost-model.ts`. Real billing data still drives the cost decision.
- **inject-relevance is a single-turn signal.** A high inject-relevance per turn doesn't guarantee the AI uses the injected content well. End-task quality is tracked separately in LongMemEval / MTEB runs (carry-forward).

## Re-running locally

```bash
pnpm --filter @lore/eval build
pnpm bench:v13:gate -- --suite middleware-quality-gate
# JSON output written to .omc/bench-results/middleware-quality-gate-<ts>.json
```
