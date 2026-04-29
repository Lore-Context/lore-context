# Distribution Assets

Status: public-safe demo assets for human-reviewed marketplace submissions.

These images use the packaged `demo-private` dataset only. They do not contain
customer names, production traces, private hostnames, API keys, or real partner
data.

## Screenshots

| Asset | Use |
|---|---|
| `lore-dashboard-evidence-ledger-demo.png` | Full dashboard overview with memory, eval, and trace counts. |
| `lore-evidence-ledger-card-demo.png` | Focused Recent Traces / Evidence Ledger card for marketplace listing images. |
| `lore-evidence-ledger-traces-demo.png` | Wider dashboard view showing Evidence Ledger rows, eval, and audit context. |

## Capture Evidence

Captured on 2026-04-29 from a local dashboard using:

- API: `PORT=31437 LORE_STORE_PATH=/tmp/lore-marketplace-store.json pnpm start:api`
- Dashboard: `DASHBOARD_BASIC_AUTH_USER=demo DASHBOARD_BASIC_AUTH_PASS=demo LORE_API_URL=http://127.0.0.1:31437 pnpm --dir apps/dashboard exec next start -p 31438`
- Dataset: `examples/demo-dataset/store/lore-demo-store.json`

Before using these assets externally, check that the marketplace does not
require a different aspect ratio or maximum file size.
