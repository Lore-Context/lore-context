# Lore Context Website Design Handoff

Date: 2026-04-28
Source: Claude Design project `Lore Context Website v2`
Implementation target: `apps/website`

## Positioning

Lore Context is the control plane for AI-agent memory, eval, and governance.
The website should not feel like a generic AI SaaS landing page. It should feel
like a quiet, technical infrastructure product for teams that need evidence
before agent memory becomes production risk.

Primary audience:

- Technical founders building agent workflows.
- Small automation teams using Claude Code, Cursor, Qwen Code, Hermes, Dify,
  FastGPT, Roo Code, OpenWebUI, and local agents.
- Privacy-conscious engineering teams that need local or private deployment.

Primary message:

> Know what every agent remembered, used, and should forget before memory
> becomes production risk.

## Visual Direction

The final visual direction is a premium infrastructure surface:

- Off-white and graphite base.
- Electric cyan for active context signals.
- Signal green for healthy/approved memory.
- Amber for stale/conflict warnings.
- Restrained red for sensitive/rejected states.
- Dense but readable typography.
- No purple gradients, stock AI imagery, decorative orbs, or generic SaaS hero
  cards.

The hero should not rely on a grid as the main image. The grid is only a subtle
measurement layer. The primary visual is the `Context Ledger / Memory Evidence`
console with provenance paths, governance status, and eval metrics.

## Hero Composition

Required hero elements:

- Brand: `Lore Context`
- Version/status: `v0.4.2 - alpha`
- Nav: `Problem`, `System`, `Features`, `Eval`, `Integrations`, `Docs`
- CTAs: `Docs`, `GitHub`, `Run local alpha`
- Evidence chips: `LOCAL ALPHA OPEN`, `REST API`, `MCP STDIO`, `POSTGRES 16`,
  `DASHBOARD`, `PRIVATE DEPLOY`
- H1: `Lore Context.`
- Statement: `The control plane for AI-agent memory, eval, and governance.`
- Support copy: `Know what every agent remembered, used, and should forget
  before memory becomes production risk.`
- Command hint: `pnpm seed:demo && pnpm smoke:dashboard`
- Metrics strip: `Recall@5`, `Precision@5`, `Stale-hit`, `p95 latency`

The right-side product surface should contain:

- Context ledger rows with source, memory id, evidence, used_in_response,
  stale_score, sensitivity, and review_status.
- Status pills such as `approved`, `flagged`, `redact`, `review`.
- A governance gate label between the composer and memory nodes.
- Provenance graph lines contained inside the product surface, away from the H1.
- Eval bars and sparkline-like metric details.

## Motion Guidelines

Motion should communicate that evidence is being processed, not that the page is
trying to entertain.

Allowed micro-motion:

- Slow pulse on the active provenance node.
- Soft scanning highlight across one ledger row.
- Subtle reveal / breathing on eval metric bars.
- Tiny blinking cursor in the command hint.
- Hover states for the CTA and evidence chips.

Disallowed:

- Parallax.
- Bouncing elements.
- Floating blobs.
- Decorative orbs.
- Full-page animation loops that distract from the copy.

All motion must respect `prefers-reduced-motion`.

## Page Structure

1. Hero / control plane
2. Problem band: `Agents remember. Teams need proof.`
3. Product system pipeline:
   `MCP clients -> context.query -> composer -> eval/trace/governance -> Postgres + agentmemory adapter`
4. Feature grid:
   `Context Query`, `Memory Eval Playground`, `Memory Observability`,
   `Governance Review`, `MIF-like Portability`, `Private Deployment`
5. Alpha status:
   `REST API`, `MCP stdio SDK transport`, `Next Dashboard`, `Postgres incremental persistence`,
   `demo dataset`, `Playwright smoke`, `Docker Compose`
6. Eval proof report with user-owned dataset metrics.
7. Integration strip:
   `Claude Code`, `Cursor`, `Qwen Code`, `OpenClaw`, `Hermes`, `Dify`,
   `FastGPT`, `Roo Code`, `OpenWebUI`, `Local agents`
8. Final CTA:
   `Start with a local alpha. Prove memory quality before you scale it.`

## Implementation Notes

- The production handoff is implemented as a standalone static website under
  `apps/website`.
- No new runtime dependencies are required.
- The page is self-contained and suitable for Cloudflare Pages or any static
  host.
- The implementation keeps the Claude Design direction but makes the hero code
  explicit, inspectable, and easy to port into another framework later.
