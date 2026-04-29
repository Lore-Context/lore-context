# Marketplace Metadata Pack

Status: draft source, not submitted.

This file keeps copy consistent across agent marketplaces and directories. Each
marketplace has different schema rules, so treat the sections below as source
material, not final uploaded JSON.

## Canonical Short Copy

Lore Context is a local-first control plane for AI-agent memory. It gives agents
a governed path to query context, write durable memory, inspect Evidence Ledger
traces, run retrieval evals, and export memory through a portable MIF-style
format.

## Canonical Long Copy

Lore Context sits above memory backends. Instead of only storing memories, it
answers the operational questions teams hit when agents start sharing durable
context: which memories were retrieved, which were used, why were others
ignored, did a risky write require review, did retrieval quality regress, and
can the corpus move to another backend later?

The public alpha includes a REST API, MCP stdio server, local dashboard,
governance review queue, audit logs, eval runner, Evidence Ledger, MIF-style
import/export, demo dataset, and reproducible smoke checks.

## Tags

`agent-memory`, `mcp`, `governance`, `eval`, `observability`, `local-first`,
`open-source`, `typescript`, `postgres`, `ai-agents`

## Marketplace Notes

| Surface | Recommended status | Notes |
|---|---:|---|
| MCP registry / MCP hub | Ready after schema validation | Use [mcp-registry.md](mcp-registry.md). |
| LangChain Hub | Draft | Position as external memory governance/control-plane integration, not a LangChain package. |
| LlamaIndex ecosystem | Draft | Use API-first examples only unless a real adapter is added. |
| Vercel / agent gallery | Draft | Website is static; do not imply Vercel-hosted SaaS. |
| Cloudflare AI directory | Draft | Public website is on Cloudflare Pages; runtime remains self-hosted. |
| Replit template | Later | Needs a maintained one-click template before submission. |
| StackBlitz / Gitpod | Later | Needs verified browser/container startup path. |
| GitHub topic discovery | Ready | Keep topics aligned with tags above. |

## Screenshot / Demo Requirements

Do not submit a listing with placeholder visuals. Use at least one of:

- dashboard screenshot showing trace, eval, and review queue with demo data;
- terminal GIF showing quickstart, seed, and context query;
- static architecture diagram from the public docs;
- Evidence Ledger screenshot with demo trace only.

## Do Not Say

- "Production SaaS is available."
- "Managed cloud sync is public."
- "Lore beats Mem0, Letta, or Zep" without a linked reproducible benchmark.
- "Autonomous outreach or marketplace submission is supported."

