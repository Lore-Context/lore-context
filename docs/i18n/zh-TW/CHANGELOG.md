> 🤖 本文件由英文版機器翻譯產生。歡迎透過 PR 改進 — 參見[翻譯貢獻指南](../README.md)。

# 更新日誌

Lore Context 的所有重要變更都記錄於此。格式基於
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)，本專案遵循
[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)。

## [v0.4.0-alpha] — 2026-04-28

首個公開 alpha 版本。完成了將稽核失敗的 MVP 轉化為發布候選 alpha 的生產強化衝刺。所有 P0 稽核項目已清除，13 個 P1 項目中的 12 個已清除（一個部分完成 — 見備註），117+ 個測試通過，完整 monorepo 建置乾淨。

### 新增

- **`packages/eval/src/runner.ts`** — 真實的 `EvalRunner`（`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`）。Eval 現在可以對使用者自有的資料集執行端到端檢索評估，並將執行結果持久化為 JSON 以進行跨時間回歸偵測。
- **`packages/governance/src/state.ts`** — 六狀態治理狀態機
  （`candidate / active / flagged / redacted / superseded / deleted`），含明確的合法轉換表。非法轉換會拋出例外。
- **`packages/governance/src/audit.ts`** — 不可變稽核日誌附加輔助函式，整合了
  `@lore/shared` 的 `AuditLog` 型別。
- **`packages/governance/detectPoisoning`** — 記憶體投毒偵測啟發式方法，使用同源主導性（>80%）和命令式動詞模式匹配。
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — 基於 semver 的上游版本探測，使用手工實作的比較（無新依賴）。遵循 `LORE_AGENTMEMORY_REQUIRED=0` 以進行靜默跳過的降級模式。
- **`packages/mif`** — `supersedes: string[]` 和 `contradicts: string[]` 欄位已添加至 `LoreMemoryItem`。在 JSON 和 Markdown 格式中均能保持往返一致性。
- **`apps/api/src/logger.ts`** — 結構化 JSON 日誌器，自動遮蔽敏感欄位（`content` / `query` / `memory` / `value` / `password` / `secret` / `token` / `key`）。`requestId` 貫穿每個請求。
- **`apps/dashboard/middleware.ts`** — HTTP Basic Auth 中介軟體。在生產環境中，若未設定 `DASHBOARD_BASIC_AUTH_USER` 和 `DASHBOARD_BASIC_AUTH_PASS` 則拒絕啟動。
- **`scripts/check-env.mjs`** — 生產模式環境驗證器。若任何環境值符合佔位符模式（`read-local`、`write-local`、`admin-local`、`change-me`、`demo`、`test`、`dev`、`password`）則拒絕啟動應用程式。
- **速率限制** — 每 IP 和每 key 雙桶 token 限制器，含驗證失敗退避（60 秒內 5 次失敗 → 30 秒鎖定 → 429 回應）。可透過 `LORE_RATE_LIMIT_PER_IP`、`LORE_RATE_LIMIT_PER_KEY`、`LORE_RATE_LIMIT_DISABLED` 設定。
- **優雅關閉** — SIGTERM/SIGINT 處理器可排空進行中的請求（最長 10 秒）、沖刷待處理的 Postgres 寫入、關閉連線池、於 15 秒後強制退出。
- **資料庫索引** — `memory_records`、`context_traces`、`audit_logs`、`event_log`、`eval_runs` 上的 B-tree 索引（`project_id`）/（`status`）/（`created_at`）。jsonb `content` 和 `metadata` 的 GIN 索引。
- **MCP zod 輸入驗證** — 每個 MCP 工具現在都會對每工具的 zod schema 執行 `safeParse`；驗證失敗返回 JSON-RPC `-32602` 及清理後的問題列表。
- **MCP `destructiveHint` + 必填 `reason`** — 每個變更工具（`memory_forget`、`memory_update`、`memory_supersede`、`memory_redact`）都需要至少 8 個字元的 `reason`，並標示 `destructiveHint: true`。
- 117+ 個新測試案例，涵蓋 `apps/api`、`apps/mcp-server`、`packages/eval`、`packages/governance`、`packages/mif`、`packages/agentmemory-adapter`。
- 多語言文件：`docs/i18n/<lang>/` 下有 17 種語言的 README。
- `CHANGELOG.md`（本檔案）。
- `docs/getting-started.md` — 5 分鐘開發者快速開始。
- `docs/api-reference.md` — REST API 端點參考。
- `docs/i18n/README.md` — 翻譯貢獻指南。

### 變更

- **`packages/mif`** 信封版本 `"0.1"` → `"0.2"`。向後相容匯入。
- **`LORE_POSTGRES_AUTO_SCHEMA`** 預設值 `true` → `false`。生產部署必須明確選擇自動套用 schema 或執行 `pnpm db:schema`。
- **`apps/api`** 請求本文解析器現在為串流式，含硬性酬載大小限制（`LORE_MAX_JSON_BYTES`，預設 1 MiB）。超大請求返回 413。
- **回送驗證**已變更：移除對 URL `Host` 標頭的依賴；回送偵測現在僅使用 `req.socket.remoteAddress`。在生產環境中，若未設定 API key，API 會封閉失敗並拒絕請求（之前：靜默授予管理員權限）。
- **有範圍的 API key** 現在必須為 `/v1/memory/list`、`/v1/eval/run` 和 `/v1/memory/import` 提供 `project_id`（之前：未定義的 `project_id` 會繞過）。
- **所有 Dockerfile** 現在以非 root `node` 使用者執行。`apps/api/Dockerfile` 和 `apps/dashboard/Dockerfile` 宣告了 `HEALTHCHECK`。
- **`docker-compose.yml`** 的 `POSTGRES_PASSWORD` 現在使用 `${POSTGRES_PASSWORD:?must be set}` — 未提供明確密碼時快速失敗啟動。
- **`docs/deployment/compose.private-demo.yml`** — 相同的必填或失敗模式。
- **`.env.example`** — 所有示範預設值已移除，替換為 `# REQUIRED` 佔位符。為速率限制、請求逾時、酬載限制、agentmemory 必填模式、儀表板 basic auth 新增了文件變數。

### 修復

- **回送繞過驗證漏洞**（P0）。攻擊者可以發送 `Host: 127.0.0.1` 以偽造回送偵測，在未提供 API key 的情況下獲取管理員角色。
- **儀表板代理的混淆代理漏洞**（P0）。儀表板代理對未驗證的請求注入 `LORE_API_KEY`，使任何能到達 3001 埠的人獲得管理員權限。
- **暴力破解防禦**（P0）。README/`.env.example` 中展示的示範 key（`admin-local`、`read-local`、`write-local`）可被無限次枚舉；速率限制和移除預設值現在可防禦此問題。
- **格式錯誤的 `LORE_API_KEYS` 引發的 JSON 解析崩潰** — 程序現在以清晰的錯誤訊息退出，而不是拋出堆疊追蹤。
- **大型請求本文導致的記憶體溢位** — 超過設定限制的本文現在返回 413，而不是崩潰 Node 程序。
- **MCP 錯誤洩漏** — 包含原始 SQL、檔案路徑或堆疊追蹤的上游 API 錯誤現在在到達 MCP 客戶端之前被清理為 `{code, generic-message}`。
- **儀表板 JSON 解析崩潰** — 無效的 JSON 回應不再使 UI 崩潰；錯誤以使用者可見的狀態呈現。
- **MCP `memory_update` / `memory_supersede`** 之前不需要 `reason`；現在由 zod schema 強制執行。
- **Postgres 連線池**：`statement_timeout` 現在設定為 15 秒；之前在格式錯誤的 jsonb 查詢下存在無界查詢時間風險。

### 安全性

- 所有 P0 稽核發現（回送繞過 / 儀表板驗證 / 速率限制 / 示範機密資訊）均已清除。詳見 `Lore_Context_项目计划书_2026-04-27.md` 和 `.omc/plans/lore-prelaunch-fixes-2026-04-28.md` 的完整稽核記錄。
- `pnpm audit --prod` 在發布時回報零已知漏洞。
- 示範憑證已從所有部署範本和範例 README 中移除。
- 容器映像現在預設以非 root 使用者執行。

### 備註 / 已知限制

- **部分 P1-1**：`/v1/context/query` 保留寬鬆的有範圍 key 行為，以避免破壞現有消費者測試。其他受影響的路由（`/v1/memory/list`、`/v1/eval/run`、`/v1/memory/import`）強制執行 `project_id`。追蹤於 v0.5。
- **託管多租戶雲端同步**在 v0.4.0-alpha 中未實作。僅支援本地和 Compose 私有部署。
- **翻譯品質**：README 本地化由 LLM 產生並已清楚標示；歡迎社群 PR 改進每個語言版本（見 [`docs/i18n/README.md`](../README.md)）。
- **OpenAPI / Swagger 規格**尚未打包。REST 介面以散文形式記錄在 [`docs/api-reference.md`](../../api-reference.md) 中。追蹤於 v0.5。

### 致謝

本次發布是針對結構化稽核計劃進行平行子代理執行的單日生產強化衝刺的成果。計劃和稽核工件保存在 `.omc/plans/` 下。

## [v0.0.0] — 預發布

內部開發里程碑，未公開發布。已實作：

- 工作區套件腳手架（TypeScript monorepo，pnpm workspaces）。
- 共用 TypeScript 建置/測試管道。
- `@lore/shared` 中的記憶體 / 上下文 / eval / 稽核型別系統。
- `agentmemory` 適配器邊界。
- 含上下文路由器和組合器的本地 REST API。
- JSON 檔案持久化 + 可選的 Postgres 執行環境儲存，含增量 upsert。
- 含明確硬刪除的記憶體詳情 / 編輯 / 取代 / 遺忘流程。
- 真實的記憶體使用計帳（`useCount`、`lastUsedAt`）。
- 追蹤回饋（`useful` / `wrong` / `outdated` / `sensitive`）。
- 類 MIF 的 JSON + Markdown 匯入/匯出，含治理欄位。
- 機密掃描正則集。
- 直接基於會話的 eval 指標；提供者比較 eval 執行；eval 執行列表。
- API key 保護，含 reader/writer/admin 角色分離。
- 治理審查佇列；稽核日誌 API。
- API 服務的儀表板 HTML；獨立 Next.js 儀表板。
- 示範種子資料；整合設定產生。
- 私有 Docker/Compose 打包。
- 傳統 + 官方 SDK stdio MCP 傳輸。

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
