# Benchmark Methodology

Status: public-safe methodology with one reviewed lab report:
[`memory-benchmark-report-2026-04-29.md`](memory-benchmark-report-2026-04-29.md).
The report supports narrow local retrieval and latency claims only. It does not
approve universal benchmark-win claims against Mem0, Zep, Letta, or Memobase.

## Goal

Measure whether Lore's control-plane features improve the operational quality of
agent memory without pretending that a single benchmark proves universal memory
quality.

## Systems

Candidate systems may include Lore local, agentmemory baseline, Mem0, Letta, Zep,
Cognee, or a mocked external backend. A system should only be included when the
configuration is documented and reproducible.

## Dataset Rules

- Public datasets only, or synthetic datasets committed under `examples/`.
- No customer data, private traces, secrets, or personal data.
- Each question must have explicit gold session IDs or gold memory IDs.
- Stale facts and contradicted facts should be represented deliberately.
- Data generation prompts, if used, must be committed with the dataset.

## Metrics

| Metric | Why it matters |
|---|---|
| Recall@5 | Did the system retrieve the needed memory? |
| Precision@5 | Did the top results stay focused? |
| MRR | How early did the first correct memory appear? |
| Stale hit rate | Did obsolete facts appear in the retrieved set? |
| P95 latency | Does the path stay usable for agent loops? |
| Audit completeness | Can a reviewer explain used and ignored rows? |

## Fairness Rules

- Use the same question set across systems.
- Keep embedding and reranker configuration explicit.
- Separate storage quality from control-plane explainability.
- Report failures and unsupported features instead of silently omitting them.
- Publish raw metrics, not only charts.
- Do not use marketing language such as "wins" unless the result is statistically and operationally meaningful.
- Keep retrieval-only hit rates separate from generated-answer / LLM-as-Judge
  scores. They are different metrics and must not be placed in one ranking.

## Lore-Specific Evidence

Lore reports should include:

- `GET /v1/eval/report` markdown output;
- Evidence Ledger trace for at least one representative query;
- redacted or synthetic MIF sample only, preferably from the committed demo dataset;
- version, commit SHA, Node version, and command list.

Never publish production, customer, partner, or project memory exports. MIF is
content-bearing by design, so portability examples must use demo data or a
manually redacted fixture whose redaction was reviewed before publication.

## Minimum Command Shape

```bash
pnpm build
pnpm seed:demo
pnpm eval:report -- --project-id demo-private --public-safe --out output/eval-reports/demo.md
pnpm smoke:api
```

## Approval Gate

Before publishing a benchmark post:

- another reviewer can reproduce the run from a clean checkout;
- raw outputs are archived under an intentional public path;
- limitations are listed near the top of the post;
- competitor descriptions are factual and non-derogatory.

Current approved public-safe data:

- `docs/launch/memory-benchmark-report-2026-04-29.md`
- `docs/launch/benchmark-results/lore-vs-mem0-locomo-200-summary-2026-04-29.json`

Current non-approved data:

- Raw LoCoMo conversations/questions from the local lorecmo workspace.
- Any SOTA, "beats", or generated-answer accuracy claim derived from the
  retrieval-only report.
