# Lore Context Memory Benchmark Report

Date: 2026-04-29 / 2026-04-30 Asia/Jakarta  
Status: public-safe lab report, not a universal leaderboard claim  
Repository commit: `3f782b224119be5705151d66a1a65d64567ee2e3`  
Public-safe summary data: [`benchmark-results/lore-vs-mem0-locomo-200-summary-2026-04-29.json`](benchmark-results/lore-vs-mem0-locomo-200-summary-2026-04-29.json)

## Executive Summary

We audited the incomplete lorecmo benchmark artifacts and reran the two systems
that were locally available: Lore Context and a self-hosted Mem0 OSS setup. The
test used a LoCoMo-derived 200-question sample and measured a retrieval-only
`hit@5` proxy, not generated-answer accuracy.

The publishable claim is narrow:

> In a local LoCoMo-200 retrieval-only harness, Lore Context v0.6 returned
> matching top-5 context for 47.5% of questions with 29.1 ms P95 query latency.
> A non-optimized self-hosted Mem0 OSS run in the same harness returned 31.5%
> hit@5 with 709.8 ms P95 query latency. These results are not comparable to
> LLM-as-Judge LoCoMo leaderboard scores.

Do not publish this as "Lore beats Mem0, Zep, Letta, or Memobase." The result
does show that Lore's local control-plane retrieval path is fast enough for
agent loops and that the current v0.6 retrieval behavior is measurable against
a mainstream memory benchmark.

## What Was Recovered From lorecmo

lorecmo left two benchmark batches:

| Batch | Files | Verdict |
|---|---|---|
| v0.6 smoke | `benchmark-v0.6/benchmark-report-2026-04-29.md`, `eval-raw-data-2026-04-29.json` | Useful only as a four-item smoke test. Not publishable as a benchmark. |
| LoCoMo-200 run | `benchmark-v0.7-real/datasets`, `results`, `reports`, `run_lore_benchmark.py`, `run_mem0_benchmark.py` | Useful after correction. The report label said v0.7, but the tested product state is the v0.6 local codebase. |

The recovered v0.7-real report was incomplete for public release because it
mixed retrieval-only measurements with public LLM-as-Judge scores and used
stronger comparative language than the evidence supports.

## Dataset

Dataset: LoCoMo, from the ACL 2024 paper "Evaluating Very Long-Term
Conversational Memory of LLM Agents." The paper describes 10 conversations with
an average of 27.2 sessions, 21.6 turns per session, and 16,618.1 tokens per
conversation, and states that LoCoMo is released under CC BY-NC 4.0.

This report does not redistribute LoCoMo conversations or questions. It only
publishes aggregate results.

Local sample:

| Category | Questions |
|---|---:|
| Single-hop | 41 |
| Multi-hop | 41 |
| Temporal | 36 |
| Adversarial | 41 |
| Open-ended | 41 |
| Total | 200 |

## Metric

Primary metric: retrieval-only `hit@5`.

For normal questions, a hit means the gold answer, or enough gold-answer tokens,
appeared in the top-5 retrieved context. For adversarial/unanswerable questions,
the runner used an abstention-style proxy. This makes the adversarial and
open-ended categories less reliable than single-hop, multi-hop, and temporal
categories.

This is not the same as LoCoMo answer accuracy. Zep, Letta, Mem0, and several
other public reports use generated answers plus LLM-as-Judge grading. Those
scores are listed later only as external reference points.

## Local Same-Harness Results

Environment:

- Lore API: local `apps/api/dist/index.js` on `http://127.0.0.1:3500`
- Lore project label: `benchmark-v0.7` inherited from the lorecmo workspace
- Lore release under test: v0.6 local codebase at the recorded commit
- Mem0: self-hosted Mem0 OSS v2.0.1 library runner
- Mem0 LLM: `xiaomi/mimo-v2.5` through OpenRouter
- Mem0 embedder: `text-embedding-3-small` through OpenRouter
- Mem0 vector store: local Qdrant

### Overall

| System | Retrieval hit@5 | Hits | Errors | P50 latency | P95 latency | P99 latency |
|---|---:|---:|---:|---:|---:|---:|
| Lore Context v0.6 local | 47.5% | 95/200 | 6 | 18.2 ms | 29.1 ms | 59.0 ms |
| Mem0 OSS v2.0.1, non-optimized local run | 31.5% | 63/200 | 0 | 342.3 ms | 709.8 ms | 2087.8 ms |

### Category Breakdown

| Category | Lore hit@5 | Mem0 hit@5 |
|---|---:|---:|
| Single-hop | 19.5% (8/41) | 12.2% (5/41) |
| Multi-hop | 48.8% (20/41) | 22.0% (9/41) |
| Temporal | 19.4% (7/36) | 0.0% (0/36) |
| Adversarial | 51.2% (21/41) | 19.5% (8/41) |
| Open-ended | 95.1% (39/41) | 100.0% (41/41) |

### Mem0 Runner Caveats

The Mem0 result should not be treated as Mem0's best possible performance:

- optional `spaCy` NLP support was not installed;
- optional `fastembed` / BM25 keyword search was not installed;
- chunked ingestion emitted `NoneType` warnings on long conversation chunks;
- 142 memories were injected in 76.9 seconds, so the memory coverage may be
  weaker than a tuned official Mem0 setup.

The result is still useful as a local same-harness sanity check because the query
runner, dataset sample, and hit@5 scoring path were the same.

## External Published Reference Points

These numbers are not directly comparable to our retrieval-only hit@5 run.

| Source | System / config | Published metric |
|---|---|---:|
| Mem0 memory-benchmarks repo | Mem0 Platform, LoCoMo Top 200 | 91.6% overall, 1410/1540 |
| Mem0 April 2026 algorithm blog | Mem0 new algorithm, LoCoMo | 91.6% overall, mean 6,956 tokens/query |
| Zep retrieval tradeoff blog | Zep 30/30 config, LoCoMo | 80.32% accuracy, 189 ms retrieval P50 |
| Zep retrieval tradeoff blog | Zep 15/5 config, LoCoMo | 77.06% accuracy, 199 ms retrieval P50 |
| Letta blog | Letta Filesystem with `gpt-4o-mini` | 74.0% LoCoMo accuracy |
| Mem0 paper | Mem0 default | 66.88% overall LLM-as-Judge |
| Mem0 paper | Mem0 graph variant | 68.44% overall LLM-as-Judge |
| Vectorize Hindsight benchmark repo | Memobase v0.0.37 | 75.78% LoCoMo overall |
| Vectorize Hindsight benchmark repo | LangMem | 58.10% LoCoMo overall |

The main market signal is that LoCoMo has become a common memory benchmark, but
the ecosystem does not use one consistent harness. Retrieval-only hit rate,
generated answer accuracy, LLM-as-Judge score, retrieval depth, answer model,
judge model, and token budget all change the result.

## Publishable Claims

Safe to publish:

- Lore Context v0.6 has a measured local retrieval path: 47.5% hit@5 on our
  LoCoMo-200 retrieval harness.
- Lore Context v0.6 local API was low-latency in this run: 18.2 ms P50 and
  29.1 ms P95.
- Lore exposes Evidence Ledger and governance surfaces around the retrieval path,
  so operators can inspect why context was used or ignored.
- The current benchmark is a control-plane retrieval lab note, not a
  generated-answer leaderboard submission.

Do not publish:

- "Lore is state of the art on LoCoMo."
- "Lore beats Mem0/Zep/Letta/Memobase."
- "Lore scored 47.5% answer accuracy."
- Raw LoCoMo conversations or raw questions from the CC BY-NC dataset.

## Next Benchmark Work

Before making stronger claims, we need:

1. A public reproduction harness that fetches LoCoMo from its source and keeps
   the dataset out of the repo.
2. A tuned Mem0 OSS run using its official memory-benchmarks setup.
3. Zep and Letta runs with real API credentials or an explicit statement that
   only public published numbers are used.
4. A generated-answer LLM-as-Judge pass to compare against the public LoCoMo
   literature.
5. Reliability work on Lore's benchmark 429s before rerunning the report.

## Sources

- LoCoMo paper: <https://aclanthology.org/2024.acl-long.747.pdf>
- Mem0 paper: <https://arxiv.org/abs/2504.19413>
- Mem0 memory-benchmarks: <https://github.com/mem0ai/memory-benchmarks>
- Mem0 April 2026 algorithm note: <https://mem0.ai/blog/mem0-the-token-efficient-memory-algorithm>
- Zep retrieval tradeoff report: <https://blog.getzep.com/the-retrieval-tradeoff-what-50-experiments-taught-us-about-context-engineering/>
- Letta LoCoMo filesystem report: <https://www.letta.com/blog/benchmarking-ai-agent-memory>
- Vectorize Hindsight benchmark repo: <https://github.com/vectorize-io/hindsight-benchmarks>
