<div align="center">

> 🤖 本文件由英文版機器翻譯產生。歡迎透過 PR 改進 — 參見[翻譯貢獻指南](../README.md)。

# Lore Context

**AI 代理記憶體、評估與治理的控制平面。**

掌握每個代理記住了什麼、使用了什麼、以及應該遺忘什麼 — 在記憶體成為生產風險之前。

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[快速開始](getting-started.md) · [API 參考](api-reference.md) · [架構](architecture.md) · [整合](integrations.md) · [部署](deployment.md) · [更新日誌](CHANGELOG.md)

🌐 **以您的語言閱讀**：[English](../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](./README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## 什麼是 Lore Context

Lore Context 是 AI 代理記憶體的**開放核心控制平面**：它將記憶體、搜尋與工具追蹤的上下文組合在一起；在您自己的資料集上評估檢索品質；將敏感內容路由至治理審查；並以可攜式交換格式匯出記憶體，讓您可在不同後端之間遷移。

它不試圖成為另一個記憶體資料庫。獨特價值在於記憶體之上的那一層：

- **Context Query** — 單一端點組合記憶體 + 網頁 + 儲存庫 + 工具追蹤，返回帶有來源資訊的分級上下文區塊。
- **Memory Eval** — 在您自有的資料集上執行 Recall@K、Precision@K、MRR、stale-hit-rate、p95 延遲；持久化執行結果並進行差異比較以偵測回歸。
- **Governance Review** — 六狀態生命週期（`candidate / active / flagged / redacted / superseded / deleted`）、風險標籤掃描、投毒啟發式偵測、不可變稽核日誌。
- **MIF 可攜性** — JSON + Markdown 匯出/匯入，保留 `provenance / validity / confidence / source_refs / supersedes / contradicts`。可用作記憶體後端之間的遷移格式。
- **Multi-Agent Adapter** — 一流的 `agentmemory` 整合，含版本探測 + 降級模式回退；為其他執行環境提供簡潔的適配器合約。

## 使用時機

| 使用 Lore Context 當... | 使用記憶體資料庫（agentmemory、Mem0、Supermemory）當... |
|---|---|
| 您需要**證明**代理記住了什麼、為什麼記、以及是否被使用 | 您只需要原始記憶體儲存 |
| 您執行多個代理（Claude Code、Cursor、Qwen、Hermes、Dify）並希望共享可信上下文 | 您正在建立單一代理，且接受廠商鎖定的記憶體層 |
| 您需要本地或私有部署以符合合規要求 | 您偏好託管的 SaaS |
| 您需要在自己的資料集上進行評估，而非廠商基準測試 | 廠商基準測試的訊號已足夠 |
| 您想在系統之間遷移記憶體 | 您不打算切換後端 |

## 快速開始

```bash
# 1. 複製並安裝
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. 產生真實的 API key（在純本地開發以外的任何環境中，請勿使用佔位符）
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. 啟動 API（檔案型儲存，不需要 Postgres）
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. 寫入一筆記憶體
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. 查詢上下文
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

如需完整設定（Postgres、Docker Compose、Dashboard、MCP 整合），請參見 [docs/getting-started.md](../../getting-started.md)。

## 架構

```text
                       ┌─────────────────────────────────────────────┐
   MCP clients ──────► │ apps/api  (REST + auth + rate limit + logs) │
   (Claude Code,       │   ├── context router (memory/web/repo/tool) │
    Cursor, Qwen,      │   ├── context composer                      │
    Dify, Hermes...)   │   ├── governance + audit                    │
                       │   ├── eval runner                           │
                       │   └── MIF import/export                     │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adapter     packages/search
           (incremental        (version-probed,        (BM25 / hybrid
            persistence)        degraded-mode safe)     pluggable)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   protected by Basic Auth   │
                       │   memory · traces · eval    │
                       │   governance review queue   │
                       └─────────────────────────────┘
```

詳細內容請參見 [docs/architecture.md](architecture.md)。

## v0.4.0-alpha 包含的功能

| 功能 | 狀態 | 位置 |
|---|---|---|
| REST API 含 API-key 驗證（reader/writer/admin） | ✅ 生產就緒 | `apps/api` |
| MCP stdio 伺服器（傳統 + 官方 SDK 傳輸） | ✅ 生產就緒 | `apps/mcp-server` |
| Next.js 儀表板含 HTTP Basic Auth 閘道 | ✅ 生產就緒 | `apps/dashboard` |
| Postgres + pgvector 增量持久化 | ✅ 可選 | `apps/api/src/db/` |
| 治理狀態機 + 稽核日誌 | ✅ 生產就緒 | `packages/governance` |
| Eval runner（Recall@K / Precision@K / MRR / staleHit / p95） | ✅ 生產就緒 | `packages/eval` |
| MIF v0.2 匯入/匯出，含 `supersedes` + `contradicts` | ✅ 生產就緒 | `packages/mif` |
| `agentmemory` 適配器，含版本探測 + 降級模式 | ✅ 生產就緒 | `packages/agentmemory-adapter` |
| 速率限制（每 IP + 每 key，含退避） | ✅ 生產就緒 | `apps/api` |
| 結構化 JSON 日誌，含敏感欄位自動遮蔽 | ✅ 生產就緒 | `apps/api/src/logger.ts` |
| Docker Compose 私有部署 | ✅ 生產就緒 | `docker-compose.yml` |
| 示範資料集 + 煙霧測試 + Playwright UI 測試 | ✅ 生產就緒 | `examples/`, `scripts/` |
| 託管多租戶雲端同步 | ⏳ 路線圖 | — |

完整 v0.4.0-alpha 發布說明請參見 [CHANGELOG.md](CHANGELOG.md)。

## 整合

Lore Context 支援 MCP 和 REST，並可與大多數代理 IDE 和聊天前端整合：

| 工具 | 設定指南 |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../integrations/openwebui.md) |
| 其他 / 通用 MCP | [docs/integrations/README.md](integrations.md) |

## 部署

| 模式 | 使用時機 | 文件 |
|---|---|---|
| **本地檔案型** | 個人開發、原型、煙霧測試 | 本 README，上方快速開始 |
| **本地 Postgres+pgvector** | 生產等級單節點，大規模語意搜尋 | [deployment.md](deployment.md) |
| **Docker Compose 私有** | 自託管團隊部署，隔離網路 | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **雲端託管** | v0.6 推出 | — |

所有部署路徑都需要明確的機密資訊：`POSTGRES_PASSWORD`、`LORE_API_KEYS`、`DASHBOARD_BASIC_AUTH_USER/PASS`。`scripts/check-env.mjs` 腳本會在任何值符合佔位符模式時拒絕生產環境啟動。

## 安全性

v0.4.0-alpha 實作了適合非公開 alpha 部署的縱深防禦安全態勢：

- **驗證**：API-key bearer token，含角色分離（`reader`/`writer`/`admin`）和每專案範圍限定。空 key 模式在生產環境中為封閉失敗。
- **速率限制**：每 IP + 每 key 雙桶，含驗證失敗退避（60 秒內 5 次失敗後 429，30 秒鎖定）。
- **儀表板**：HTTP Basic Auth 中介軟體。在生產環境中，若未設定 `DASHBOARD_BASIC_AUTH_USER/PASS` 則拒絕啟動。
- **容器**：所有 Dockerfile 以非 root `node` 使用者執行；api + dashboard 均有 HEALTHCHECK。
- **機密資訊**：零硬編碼憑證；所有預設值為必填或失敗變數。`scripts/check-env.mjs` 在生產環境中拒絕佔位符值。
- **治理**：寫入時進行 PII / API key / JWT / 私鑰正則掃描；高風險內容自動路由至審查佇列；每次狀態轉換均記錄不可變稽核日誌。
- **記憶體投毒**：對共識 + 命令式動詞模式的啟發式偵測。
- **MCP**：對每個工具輸入進行 zod schema 驗證；變更工具需要 `reason`（至少 8 個字元）並標示 `destructiveHint: true`；上游錯誤在返回客戶端前經過清理。
- **日誌**：結構化 JSON，自動遮蔽 `content`、`query`、`memory`、`value`、`password`、`secret`、`token`、`key` 欄位。

漏洞揭露：[SECURITY.md](SECURITY.md)。

## 專案結構

```text
apps/
  api/                # REST API + Postgres + governance + eval（TypeScript）
  dashboard/          # Next.js 16 儀表板，含 Basic Auth 中介軟體
  mcp-server/         # MCP stdio 伺服器（傳統 + 官方 SDK 傳輸）
  web/                # 伺服器端 HTML 渲染器（無 JS 回退 UI）
  website/            # 行銷網站（另行處理）
packages/
  shared/             # 共用型別、錯誤、ID/token 工具
  agentmemory-adapter # 橋接至上游 agentmemory + 版本探測
  search/             # 可插拔搜尋提供者（BM25 / hybrid）
  mif/                # 記憶體交換格式（v0.2）
  eval/               # EvalRunner + 指標基元
  governance/         # 狀態機 + 風險掃描 + 投毒 + 稽核
docs/
  i18n/<lang>/        # 17 種語言的本地化 README
  integrations/       # 11 個代理 IDE 整合指南
  deployment/         # 本地 + Postgres + Docker Compose
  legal/              # 隱私 / 條款 / Cookie（新加坡法律）
scripts/
  check-env.mjs       # 生產模式環境驗證
  smoke-*.mjs         # 端到端煙霧測試
  apply-postgres-schema.mjs
```

## 系統需求

- Node.js `>=22`
- pnpm `10.30.1`
- （可選）Postgres 16 + pgvector，用於語意搜尋等級的記憶體

## 貢獻

歡迎貢獻。請閱讀 [CONTRIBUTING.md](CONTRIBUTING.md) 了解開發工作流程、提交訊息協議和審查期望。

如需文件翻譯，請參見 [i18n 貢獻指南](../README.md)。

## 營運方

Lore Context 由 **REDLAND PTE. LTD.**（新加坡，UEN 202304648K）營運。公司資料、法律條款和資料處理方式記錄在 [`docs/legal/`](../../legal/) 下。

## 授權

Lore Context 儲存庫依據 [Apache License 2.0](../../LICENSE) 授權。`packages/*` 下的各套件宣告 MIT 以便下游使用。上游歸因請見 [NOTICE](../../NOTICE)。

## 致謝

Lore Context 以 [agentmemory](https://github.com/agentmemory/agentmemory) 作為本地記憶體執行環境。上游合約詳情和版本相容性政策記錄在 [UPSTREAM.md](../../UPSTREAM.md)。
