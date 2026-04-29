# Show HN Draft

Status: draft, human must edit and post.

## Title

Show HN: Lore Context - an auditable control plane for AI-agent memory

## Draft

Hi HN,

I am building Lore Context, an open-source control plane for AI-agent memory.

The problem I kept running into was not "where do I store memories?" It was:

- Which memories did the agent retrieve for this answer?
- Which ones actually made it into the final context?
- Which were ignored because they were stale or risky?
- Can a team review dangerous writeback before it becomes shared memory?
- Can we move memory out later without rewriting the whole stack?

Lore sits above the memory backend. The current alpha exposes a REST API and MCP
stdio server, records Evidence Ledger traces for context queries, routes risky
memory writes through governance review, runs retrieval evals on your own data,
and exports/imports a MIF-style JSON/Markdown format.

The project is intentionally local-first right now. The fastest path is:

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install
pnpm quickstart -- --dry-run --activation-report
pnpm build
pnpm seed:demo
pnpm smoke:api
```

What is included:

- REST API and OpenAPI 3.1 contract
- MCP stdio tools for context query, memory write/search/export, eval, and trace inspection
- dashboard for memory inventory, eval runs, traces, and governance review queue
- Evidence Ledger for used/ignored memory rows
- eval report with Recall@5, Precision@5, MRR, stale-hit rate, and p95 latency
- MIF-style import/export with provenance and relationship fields

What is not included:

- public hosted SaaS
- billing
- managed cloud sync
- benchmark win claims

I would especially like feedback from people running coding agents, support
agents, or internal copilots where memory is already moving from toy feature to
operational risk.

Repository: https://github.com/Lore-Context/lore-context
Website: https://lorecontext.com

## Posting Checklist

- Verify `pnpm build`, `pnpm smoke:api`, `pnpm smoke:mcp`, and website test.
- Update the first paragraph with a real personal reason before posting.
- Confirm the repository README still matches the claims above.
- Be available for the comment thread after posting.

