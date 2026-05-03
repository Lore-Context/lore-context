# Evidence Ledger Deep Dive

Status: draft article source.

## Thesis

Agent memory needs an audit surface, not just a vector search result. Evidence
Ledger is Lore's answer to the question: "Why did this agent use that memory?"

## Reader Problem

Long-term memory changes agent behavior after the original conversation is gone.
When an answer looks wrong, a team needs to inspect the retrieval path quickly:

- the query that triggered retrieval;
- the memories that were considered;
- the memory rows that were used;
- the rows that were ignored;
- freshness, policy, score, and governance state;
- feedback attached after the answer.

## Lore Path

1. Agent calls `POST /v1/context/query`.
2. Lore searches scoped memories.
3. The composer ranks candidate rows.
4. Governance and freshness rules annotate the result.
5. The response returns a `traceId`.
6. `GET /v1/evidence/ledger/:trace_id` shows the used and ignored rows.

## Demo Command

```bash
pnpm build
pnpm seed:demo
pnpm smoke:api
```

The smoke path verifies that a context query records a composed memory use and
that the Evidence Ledger includes a `used` row.

## What This Enables

- Debugging stale memory regressions.
- Explaining agent answers to a teammate.
- Auditing whether sensitive memories were excluded.
- Comparing retrieval policy changes against concrete traces.

## Boundaries

Evidence Ledger is not a compliance certification by itself. It is a traceable
product surface that teams can combine with access control, audit logs, review
workflow, and private deployment controls.
