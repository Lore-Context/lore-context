# Governance Deep Dive

Status: draft article source.

## Thesis

Memory writeback is a production risk. Lore treats memory as governed state
instead of a silent append-only notebook.

## State Model

Lore memory records move through explicit lifecycle states:

- `candidate` for records that require review;
- `active` for normal usable memory;
- `flagged` for policy or quality concerns;
- `redacted` for records whose content is hidden but audit history remains;
- `superseded` for replaced facts;
- `deleted` for forgotten records.

The public API also exposes governance actions for review queue, approval,
rejection, supersede, forget, audit logs, and export.

## Risk Handling

Risk scanning catches common classes before memory becomes durable shared
context:

- API-key-shaped strings;
- JWT/private-key patterns;
- sensitive personal information patterns;
- imperative memory-poisoning patterns;
- low-confidence or contradicted content.

## Operator Workflow

1. Agent proposes memory through MCP or REST.
2. Lore scans the content.
3. Safe memory can become active.
4. Risky memory enters review.
5. Reviewer approves, rejects, redacts, or supersedes.
6. Audit log records the transition.

## Verification

`pnpm smoke:api` verifies that risky memory enters the review queue, approval
confirms it, audit logs record the review action, and hard delete makes a memory
unreadable.

## Boundary

Governance is not a reason to expose Lore publicly without authentication. Keep
API keys scoped, dashboard protected, and remote deployment private until a
separate cloud release is designed and reviewed.

