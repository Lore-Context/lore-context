# Design Partner Session Tracker

Last updated: 2026-05-01

Use this tracker for public-safe adoption evidence. Do not include customer
secrets, production traces, raw private memory records, private datasets, or
partner names unless the partner has explicitly approved being named.

## Target

Run 20-50 private beta activation sessions before choosing the `v0.9` lane.

An activation-positive session requires:

- activation score of 12 or higher in `activation-scorecard.md`;
- no unresolved security-boundary issue;
- first `context.query` and first Evidence Ledger view reached during the
  session or documented as the exact blocker;
- for v0.8 beta users, first connected agent, first captured memory, first
  Memory Inbox action, and first cross-agent recall are recorded;
- a clear next-step decision: continue, retry after blocker, or stop.

## Sessions

| Slot | Status | Workflow | Agent/client | Score | First context | First ledger | Main blocker | Follow-up |
|---|---|---|---|---:|---|---|---|---|
| 1 | pending | TBD | TBD | - | - | - | - | - |
| 2 | pending | TBD | TBD | - | - | - | - | - |
| 3 | pending | TBD | TBD | - | - | - | - | - |
| 4 | optional | TBD | TBD | - | - | - | - | - |
| 5 | optional | TBD | TBD | - | - | - | - | - |

## Internal Dogfood Evidence

Dogfood sessions do not count as design partner sessions, but they can de-risk
the script before a partner call.

| Date | Workflow | Agent/client | Evidence | Follow-up |
|---|---|---|---|---|
| 2026-04-29 | Cursor prompt-level MCP validation | Cursor Agent CLI `2026.04.28-e984b46` | `context_query` returned trace `ctx_479d26d6-d0b2-48ba-9bbe-7b0ac943c145` with `MATCHED=true`; `trace_get` returned 2 retrieved / 2 used rows | Repeat with a fresh user and record whether interactive MCP approval is clear |

## Notes Template

```text
Partner label:
Date:
Workflow:
Agent/client:
Memory backend today:
Activation score:
First context time:
First Evidence Ledger time:
Install blocker:
MCP blocker:
Evidence Ledger reaction:
Governance reaction:
Eval reaction:
Deployment confidence:
Security boundary issue:
Willingness-to-pay signal:
Second-day retention check:
Follow-up:
```
