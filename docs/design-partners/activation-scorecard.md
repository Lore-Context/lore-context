# Activation Scorecard

Use this scorecard after a design partner or internal dogfood session.

| Area | Score | Evidence |
|---|---:|---|
| Install completed | 0-2 | `pnpm install`, Node version, package manager output |
| Quickstart clarity | 0-2 | `pnpm quickstart -- --dry-run --activation-report` output |
| API first value | 0-2 | context query returns `traceId` and useful context |
| Evidence Ledger clarity | 0-2 | reviewer can explain used/ignored rows |
| Governance clarity | 0-2 | risky memory routes to review and can be approved/rejected |
| Eval clarity | 0-2 | public-safe report generated and understood |
| MCP integration clarity | 0-2 | target client can list Lore tools |
| Deployment confidence | 0-2 | user knows local/private deployment boundary |

## Scoring

- 0: failed or unclear.
- 1: worked with help.
- 2: worked without help and user understood why it mattered.

## Pass Threshold

The session is activation-positive when total score is 12 or higher and no
security boundary issue appears.

## Notes Template

```text
Partner:
Date:
Workflow:
Agents used:
Memory backend today:
Activation score:
Blockers:
Evidence Ledger reaction:
Governance reaction:
Eval reaction:
Follow-up:
```
