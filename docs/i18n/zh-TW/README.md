<div align="center">

# Lore Context

**AI 智慧代理記憶、評測與治理的控制平面。**

掌握每個智慧代理記住了什麼、使用了什麼、以及應該遺忘什麼——在記憶成為生產風險之前。

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[快速開始](../../getting-started.md) · [網站快速入門](https://lorecontext.com/quickstart/) · [基準測試方法論](https://lorecontext.com/benchmark/) · [API 參考](../../api-reference.md) · [架構](../../architecture.md) · [專案計畫](../../project-plan.md) · [發布狀態](../../release-status.md) · [路線圖](../../roadmap.md) · [整合](../../integrations/README.md) · [部署](../../deployment/README.md) · [變更日誌](../../../CHANGELOG.md)

🌐 **選擇您的語言**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

本地化文件可能落後於當前英文版本；v2.1 的權威文件為英文 README 及 `docs/` 目錄。

</div>

---

> 🤖 本文件由英文版機器翻譯產生，可能滯後於最新發布。歡迎透過 PR 改進 — 參見[翻譯貢獻指南](../README.md)。

## Lore Context 是什麼

Lore Context 是一個用於 AI 智慧代理記憶的**開放核心控制平面**：它跨記憶、搜尋、程式碼倉庫圖譜和工具呼叫鏈路組合上下文；在您自己的資料集上評測檢索品質；為敏感內容路由治理審查；並將記憶匯出為可在後端之間遷移的可攜式交換格式。

它並不試圖成為另一個記憶資料庫。獨特價值在於疊加在記憶之上的層次：

- **Context Query** — 單一端點組合記憶 + 網頁 + 程式碼倉庫 + 工具呼叫鏈路，返回帶來源標注的分級上下文區塊。
- **Memory Eval** — 在您自己擁有的資料集上執行 Recall@K、Precision@K、MRR、stale-hit-rate、p95 延遲；持久化執行結果並進行差異比較，用於回歸偵測。
- **Governance Review** — 六狀態生命週期（`candidate / active / flagged / redacted / superseded / deleted`）、風險標籤掃描、投毒啟發式偵測、不可篡改稽核日誌。
- **類 MIF 可攜性** — JSON + Markdown 匯出/匯入，保留 `provenance / validity / confidence / source_refs / supersedes / contradicts`。可作為記憶後端之間的遷移格式。
- **Repo Graph** — 確定性程式碼倉庫索引（檔案、符號、匯入、呼叫、路由、測試），透過 API 路由和唯讀 MCP 工具暴露，讓智慧代理基於穩定的專案上下文契約來回答程式碼倉庫問題。
- **Multi-Agent Adapter** — 一流的 `agentmemory` 整合，支援版本探測 + 降級模式回退；為額外執行環境提供清晰的適配器契約。

## 何時使用

| 使用 Lore Context，當... | 使用記憶資料庫（agentmemory、Mem0、Supermemory），當... |
|---|---|
| 您需要**證明**您的智慧代理記住了什麼、原因是什麼、以及是否被使用 | 您只需要原始記憶儲存 |
| 您執行多個智慧代理（Claude Code、Cursor、Qwen、Hermes、Dify）並希望共享可信上下文 | 您在建構單一智慧代理，且可以接受供應商鎖定的記憶層 |
| 您需要本地或私有部署以滿足合規要求 | 您偏好託管 SaaS |
| 您需要在自己的資料集上進行評測，而非依賴供應商基準測試 | 供應商基準測試已足夠作為訊號 |
| 您希望在系統之間遷移記憶 | 您不打算更換後端 |

## 快速開始

```bash
# 1. 複製 + 安裝
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. 執行快速入門助手並檢視啟動報告
pnpm quickstart -- --dry-run --activation-report

# 3. 產生真實的 API 金鑰（除純本地開發外，請勿使用佔位符）
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. 啟動 API（檔案儲存，無需 Postgres）
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. 寫入一條記憶
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. 查詢上下文，然後在 Evidence Ledger 中檢查返回的 traceId
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

公共網站快速入門，請參見 [lorecontext.com/quickstart](https://lorecontext.com/quickstart/)。完整配置（Postgres、Docker Compose、Dashboard、MCP 整合），請參見 [docs/getting-started.md](../../getting-started.md)。

標準 alpha 快速入門為 `git clone` + `pnpm quickstart`。Lore 目前不發布也不聲稱存在公共 `@lore-context/quickstart` npm 套件。MCP stdio 伺服器作為 [`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server) 單獨發布，用於登錄檔和客戶端分發；SDK 中介軟體以 [`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)（npm）和 `lore-context-middleware`（PyPI）形式發布。

為支援 AI 可讀發現，網站僅從公共文件發布 `/llms.txt` 和 `/llms-full.txt`。官方 MCP Registry 條目已發布，其他分發草稿位於 [docs/distribution](../../distribution/)。發布草稿位於 [docs/launch](../../launch/)，設計合作夥伴接洽文件位於 [docs/design-partners](../../design-partners/)。公共基準測試頁面是可重現的方法論和小型冒煙執行報告，而非競爭性基準測試勝出聲明。

## 架構

```text
                       ┌───────────────────────────────────────────────┐
  MCP/REST clients ─► │ apps/api  (auth + rate limit + evidence)       │
  (Claude Code,       │   ├── Memory Inbox / lifecycle / audit         │
   Codex, Cursor,     │   ├── capture ingestion + recall hydration     │
   OpenCode...)       │   ├── context query (memory/web/repo/traces)   │
                       │   ├── repo graph query / symbol / impact       │
                       │   ├── Google sign-in + hosted MCP metadata     │
                       │   └── OpenAPI + usage + operator surfaces      │
                       └───────────────┬───────────────────────────────┘
                                       │
                         capture / embedding / graph jobs
                                       ▼
                       ┌───────────────────────────────────────────────┐
                       │ memory-worker  (AWS SQS + DLQ fan-out)        │
                       │   ├── auto redaction / curation / save        │
                       │   ├── dreaming butler (prune/merge/resolve)    │
                       │   ├── private Qwen3 embedding service         │
                       │   └── Qdrant dense+sparse indexing            │
                       └───────────────┬───────────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
          RDS PostgreSQL 16      Qdrant derived index   apps/dashboard
          truth store + audit    lore_memories_v12      user-facing SaaS
```

詳情請參見 [docs/architecture.md](../../architecture.md)。

## v2.1.0 新增內容

`v2.1.0` 是 **Repo Graph API 和 MCP 工具**版本。它將 Lore 自身的程式碼倉庫圖譜作為一級智慧代理記憶面：對檔案、符號、匯入、呼叫、路由、測試和流程提示進行確定性的 TypeScript/JavaScript 倉庫索引，透過 API 路由和唯讀 MCP 工具暴露，讓智慧代理基於穩定的專案上下文契約來回答程式碼倉庫問題，而非依賴臨時文字搜尋。

v2.1.0 已部署至 AWS 生產環境和公共網站。它基於混合記憶引擎（RDS 真實儲存、AWS SQS worker 扇出、Qdrant 派生索引、私有 Qwen3 嵌入服務、7 流 `HybridSearchOrchestrator`）、夢境管家記憶整合 worker、智慧代理記憶自我改進迴圈、已發布的 SDK 中介軟體套件，以及跨 v1.7–v2.0 版本線交付的商業 SaaS 基礎設施建構而成。

| 能力 | 狀態 | 位置 |
|---|---|---|
| Repo graph API + MCP 工具（`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`） | ✅ 生產 | `packages/repo-graph`、`apps/api`、`apps/mcp-server` |
| 程式碼知識圖譜索引器 | ✅ 生產 | `packages/code-indexer`、`packages/code-indexer-python` |
| Context Query 組合記憶 + 網頁 + 程式碼倉庫 + 工具呼叫鏈路 | ✅ 生產 | `apps/api`、`docs/api-reference.md` |
| 7 流 `HybridSearchOrchestrator`（FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki） | ✅ 生產 | `packages/search` |
| 交叉編碼器重排器（後融合，可選啟用） | ✅ 生產 | `apps/api/src/rerankers/` |
| 夢境管家記憶整合（prune / merge / resolve / surface） | ✅ 生產，標誌門控 | `apps/api/src/workers/butler-v18.ts` |
| 智慧代理記憶自我改進迴圈 + 上下文配方 | ✅ 生產，人工門控晉級 | `packages/eval`、`packages/search`、`ops/context-recipes/` |
| SDK 中介軟體（OpenAI / Anthropic 客戶端自動注入 + 自動保留） | ✅ 已發布 | `packages/sdk-middleware-typescript`、`packages/sdk-middleware-python` |
| AI 智慧代理金鑰保險庫（MCP 原生，三按鈕授權） | ✅ Beta，待加密稽核 | `apps/mcp-server`、`apps/api` |
| 雲端記憶引擎：RDS 真實儲存 + SQS worker 扇出 + Qdrant 索引 | ✅ 生產 | `apps/api`、`apps/api/src/worker.ts` |
| 私有 Qwen3-Embedding-0.6B 1024 維向量服務 | ✅ 生產 | `apps/api/src/embedding.ts` |
| 自動 capture 攝取和 Memory Inbox 例外 | ✅ 生產 | `apps/api`、`packages/capture` |
| Google 登入 + 個人保險庫引導 | ✅ 生產 | `apps/api`、`apps/dashboard` |
| 商業 SaaS：個人訂閱、計費、配額門控 | ✅ 生產 | 託管雲（`Lore-Context/lore-cloud`） |
| 帶 API 金鑰認證的 REST API（reader/writer/admin） | ✅ 生產 | `apps/api` |
| `/openapi.json` 處的 OpenAPI 3.1 合約（報告 `2.1.0`） | ✅ 生產 | `apps/api/src/openapi.ts` |
| MCP stdio 伺服器（舊版 + 官方 SDK 傳輸） | ✅ 生產 | `apps/mcp-server` |
| 帶 Google 工作階段 + operator Basic Auth 的 Next.js 儀表板 | ✅ 生產 | `apps/dashboard` |
| Evidence Ledger API + 儀表板摘要 | ✅ 生產 | `apps/api`、`apps/dashboard` |
| 治理狀態機 + 稽核日誌 | ✅ 生產 | `packages/governance` |
| Eval runner（Recall@K / Precision@K / MRR / staleHit / p95） | ✅ 生產 | `packages/eval` |
| MIF v0.2 匯入/匯出，含 `supersedes` + `contradicts` | ✅ 生產 | `packages/mif` |
| 模型閘道（多供應商任務→模型路由） | ✅ 生產 | `packages/model-gateway` |
| 帶版本探測 + 降級模式的 `agentmemory` 適配器 | ✅ 生產 | `packages/agentmemory-adapter` |
| 速率限制、帶欄位脫敏的結構化 JSON 日誌 | ✅ 生產 | `apps/api` |
| Docker Compose 私有部署 | ✅ 生產 | `docker-compose.yml` |
| `pnpm quickstart` 本地採用助手 + 啟動報告 | ✅ 生產 | `scripts/lore-quickstart.mjs` |
| 官方 MCP Registry + 分發 / 發布 / 設計合作夥伴文件 | ✅ 生產 | `server.json`、`docs/distribution/`、`docs/launch/` |

完整發布歷史請參見 [CHANGELOG.md](../../../CHANGELOG.md)。

## 當前發布狀態

`v2.1.0` 是當前原始碼、託管生產環境和發布版本線。它透過優化的發布流程部署至 AWS 生產環境和公共網站：不可變 arm64-first 製品、staging API 冒煙測試、生產 API 部署、獨立網站部署、發布後稽核，以及 tag/release 收尾。外部檢查確認 `https://api.lorecontext.com/health` 返回 `status=ok`，`/openapi.json` 報告 `2.1.0`，`https://lorecontext.com/status.html` 包含 `v2.1.0`。

生產環境保持 v1.1+ 的 RDS / SQS / memory-worker / Qdrant 雲端形態，使用 `lore_memories_v12` 作為 Qdrant 集合，保持 Postgres 路徑的 1024 維 pgvector，並新增附加式 repo graph 模式（`apps/api/src/db/schema-v21-repo-graph.sql`）。

當前公開安全狀態快照請參見 [docs/release-status.md](../../release-status.md)，完整發布說明請參見 [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)。

## 發布重點

v2.1 版本將 Lore 的程式碼倉庫圖譜作為一級智慧代理記憶面。目標是讓智慧代理能夠針對確定性、穩定的專案上下文契約回答「X 在哪裡定義」、「什麼呼叫了這個」以及「我修改這個會破壞什麼」，而非依賴臨時文字搜尋：

- `@lore/repo-graph` — 對檔案、符號、匯入、呼叫、路由、測試和流程提示進行確定性的 TypeScript/JavaScript 倉庫索引。
- API 路由：`POST /v1/repo/graph/query`、`POST /v1/repo/symbol/context`、`POST /v1/repo/impact` 和 `POST /v1/repo/detect-changes`。
- MCP 工具：`repo.graph_query`、`repo.symbol_context`、`repo.impact` 和 `repo.detect_changes`（唯讀）。
- `context_query(repo)` 現在在可用時使用供應商支援的 repo graph 證據，並在未配置 repo graph 儲存時誠實地提供不可用回退。
- Repo graph Postgres 模式為附加式——它疊加在現有生產模式之上，並在生產/staging 模式設置期間應用。

根套件和 API 套件版本均報告 `2.1.0`，使 `/openapi.json` 與發布標籤匹配。發布列車使用 v2.0.9 之後引入的優化拆分 API/網站部署護欄。

請參見 [docs/project-plan.md](../../project-plan.md)、[docs/roadmap.md](../../roadmap.md) 和 [docs/release-governance.md](../../release-governance.md)。

## 整合

Lore Context 支援 MCP 和 REST，可與大多數智慧代理 IDE 和聊天前端整合：

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
| 其他 / 通用 MCP | [docs/integrations/README.md](../../integrations/README.md) |

## 部署

| 模式 | 適用場景 | 文件 |
|---|---|---|
| **本地檔案儲存** | 獨立開發、原型驗證、冒煙測試 | 本 README，上方快速開始 |
| **本地 Postgres+pgvector** | 單節點本地回退和遷移測試 | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose 私有** | 自託管團隊部署、隔離網路 | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **託管雲端** | RDS / SQS / memory-worker / Qdrant / 私有嵌入，加上圖譜增強混合召回堆疊和商業 SaaS 基礎設施 | [docs/release-status.md](../../release-status.md) |

所有部署路徑均需要顯式金鑰。本地/私有路徑需要 `POSTGRES_PASSWORD`、`LORE_API_KEYS` 和儀表板認證。託管部署還需要 RDS、SQS、Qdrant、嵌入服務、OAuth、通道配置和生產執行環境匯出。`scripts/check-env.mjs` 腳本在任何值匹配佔位符模式時拒絕生產啟動。

## 安全性

v2.1.0 為一般使用者存取保持了本地/私有部署態勢和託管雲端護欄：

- **認證**：API 金鑰不記名令牌，具有角色分離（`reader`/`writer`/`admin`）和按專案範圍。生產環境下，空金鑰模式失敗關閉。
- **速率限制**：每 IP + 每金鑰雙桶，帶認證失敗退避（60 秒內 5 次失敗後 429，30 秒鎖定）。
- **儀表板**：託管產品使用 Google 工作階段流；本地/私有 operator 部署仍可使用 HTTP Basic Auth。
- **容器**：所有 Dockerfile 以非 root `node` 使用者執行；api + dashboard 均有 HEALTHCHECK。
- **金鑰**：零硬編碼憑證；所有預設值均為必填或失敗變數。`scripts/check-env.mjs` 在生產環境中拒絕佔位符值。
- **治理**：寫入時進行 PII / API key / JWT / 私鑰正則掃描；風險標記內容自動路由到審查佇列；每次狀態轉換均記錄不可篡改稽核日誌。
- **記憶投毒**：對共識 + 命令式動詞模式進行啟發式偵測。
- **MCP**：每個工具輸入均使用 zod 模式驗證；變更工具需要 `reason`（≥8 個字元）並暴露 `destructiveHint: true`；上游錯誤在返回客戶端前經過清理。
- **Worker 隔離**：capture、嵌入、圖譜、連接器和回填任務透過帶 DLQ 的 AWS SQS 佇列執行；Qdrant 是派生索引，RDS 保持權威性。
- **日誌**：結構化 JSON，自動脫敏 `content`、`query`、`memory`、`value`、`password`、`secret`、`token`、`key` 欄位。

漏洞披露：[SECURITY.md](../../../SECURITY.md)。

## 專案結構

```text
apps/
  api/                # REST 控制平面 + Postgres + 治理 + eval + repo graph
  dashboard/          # 帶 Google 工作階段 + operator Basic Auth 的 Next.js 儀表板
  mcp-server/         # MCP stdio 伺服器（舊版 + 官方 SDK 傳輸）
  cli/                # lore CLI（doctor、wiki-recompile、資料集匯入/匯出）
  browser-extension/  # Capture 介面鷹架
  web/                # 伺服器端 HTML 渲染器（無 JS 回退 UI）
  website/            # 行銷網站（單獨處理）
packages/
  shared/             # 共享型別、錯誤、ID/令牌工具
  agentmemory-adapter # 上游 agentmemory 橋接 + 版本探測
  search/             # 7 流 HybridSearchOrchestrator + 配方適配器
  repo-graph/         # 確定性倉庫索引（v2.1）
  code-indexer/       # 程式碼知識圖譜索引器（TypeScript/JavaScript）
  code-indexer-python # 程式碼知識圖譜索引器（Python）
  capture/            # Capture 攝取原語
  connectors/         # 外部來源連接器
  model-gateway/      # 多供應商任務→模型路由
  mif/                # 記憶交換格式（v0.2）
  eval/               # EvalRunner + 指標原語 + 上下文配方
  governance/         # 狀態機 + 風險掃描 + 投毒偵測 + 稽核
  profile/            # 保險庫 / 帳戶 profile 型別
  sdk-typescript/     # TypeScript 客戶端 SDK
  sdk-python/         # Python 客戶端 SDK
  sdk-go/ sdk-java/ sdk-dotnet/   # 其他語言 SDK
  sdk-middleware-typescript/      # 自動注入 + 自動保留中介軟體（npm）
  sdk-middleware-python/          # 自動注入 + 自動保留中介軟體（PyPI）
docs/
  i18n/<lang>/        # 17 種語言的本地化 README
  integrations/       # 智慧代理 IDE 整合指南
  deployment/         # 本地、Docker Compose 和生產自動化 runbook
  legal/              # 隱私 / 條款 / Cookie（新加坡法律）
scripts/
  check-env.mjs       # 生產模式環境變數驗證
  smoke-*.mjs         # 端對端冒煙測試
  apply-postgres-schema.mjs
```

## 系統需求

- Node.js `>=22`
- pnpm `10.30.1`
- （可選本地回退）帶 pgvector 的 Postgres 16
- （託管/進階）RDS PostgreSQL 16、AWS SQS、Qdrant 和私有嵌入服務

## 貢獻

歡迎貢獻。請閱讀 [CONTRIBUTING.md](../../../CONTRIBUTING.md) 了解開發工作流程、提交訊息協議和審查期望。

文件翻譯請參見 [i18n 貢獻指南](../README.md)。

## 營運方

Lore Context 由 **REDLAND PTE. LTD.**（新加坡，UEN 202304648K）營運。公司簡介、法律條款和資料處理文件位於 [`docs/legal/`](../../legal/)。

## 授權條款

Lore Context 程式碼倉庫基於 [Apache License 2.0](../../../LICENSE) 授權。`packages/*` 下的各個套件聲明為 MIT 以便下游使用。上游歸屬請參見 [NOTICE](../../../NOTICE)。

## 致謝

Lore Context 基於 [agentmemory](https://github.com/agentmemory/agentmemory) 作為本地記憶執行環境建構而成。上游契約詳情和版本相容性策略記錄於 [UPSTREAM.md](../../../UPSTREAM.md)。
