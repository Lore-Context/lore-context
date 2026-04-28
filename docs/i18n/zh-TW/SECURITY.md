> 🤖 本文件由英文版機器翻譯產生。歡迎透過 PR 改進 — 參見[翻譯貢獻指南](../README.md)。

# 安全政策

Lore Context 處理記憶體、追蹤、稽核日誌和整合憑證。請將安全回報視為高優先事項。

## 回報漏洞

請勿針對疑似漏洞、洩漏的機密資訊、驗證繞過、資料暴露或租戶隔離問題開立公開議題。

建議的回報途徑：

1. 如有條件，請使用本儲存庫的 **GitHub 私人漏洞回報**。
2. 若無法使用私人回報，請私下聯繫維護者並提供：
   - 受影響的版本或提交，
   - 重現步驟，
   - 預期影響，
   - 是否涉及真實的機密資訊或個人資料。

我們的目標是在 72 小時內確認可信的回報。

## 支援版本

Lore Context 目前為 1.0 前的 alpha 軟體。安全修復優先針對 `main` 分支。當公開發布版本被下游運營商積極使用時，已標記的發布版本可能會收到針對性修補程式。

| 版本 | 支援狀態 |
|---|---|
| v0.4.x-alpha | ✅ 積極維護 |
| v0.3.x 及更早 | ❌ 僅供預發布內部使用 |

## 內建強化措施（v0.4.0-alpha）

alpha 版本附帶以下縱深防禦控制措施。運營商應驗證這些措施在其部署中是否啟用。

### 驗證

- **API-key bearer token**（`Authorization: Bearer <key>` 或
  `x-lore-api-key` 標頭）。
- **角色分離**：`reader` / `writer` / `admin`。
- **每專案範圍限定**：`LORE_API_KEYS` JSON 條目可包含 `projectIds: ["..."]` 允許清單；變更操作需要相符的 `project_id`。
- **生產環境空 key 模式封閉失敗**：在 `NODE_ENV=production` 且未設定 key 的情況下，API 拒絕所有請求。
- **已移除回送繞過**：舊版本信任 `Host: 127.0.0.1`；v0.4 僅使用 socket 層級的遠端位址。

### 速率限制

- **每 IP 和每 key 雙桶限制器**，含驗證失敗退避。
- **預設值**：未驗證路徑每 IP 每分鐘 60 次請求，已驗證 key 每分鐘 600 次請求。
- **60 秒內 5 次驗證失敗 → 30 秒鎖定**（返回 429）。
- 可設定：`LORE_RATE_LIMIT_PER_IP`、`LORE_RATE_LIMIT_PER_KEY`、
  `LORE_RATE_LIMIT_DISABLED=1`（僅供開發使用）。

### 儀表板保護

- **HTTP Basic Auth 中介軟體**（`apps/dashboard/middleware.ts`）。
- **生產環境啟動拒絕**，若未設定
  `DASHBOARD_BASIC_AUTH_USER` 和 `DASHBOARD_BASIC_AUTH_PASS`。
- `LORE_DASHBOARD_DISABLE_AUTH=1` 僅在生產環境以外有效。
- 伺服器端管理員 key 回退**已移除**：使用者必須透過 Basic Auth 驗證後，儀表板代理才會注入上游 API 憑證。

### 容器強化

- 所有 Dockerfile 以非 root `node` 使用者執行。
- `apps/api/Dockerfile` 和 `apps/dashboard/Dockerfile` 針對 `/health` 宣告了 `HEALTHCHECK`。
- `apps/mcp-server` 僅為 stdio — 無網路監聽器 — 且不宣告 `HEALTHCHECK`。

### 機密資訊管理

- **零硬編碼憑證。** 所有 `docker-compose.yml`、
  `docs/deployment/compose.private-demo.yml` 和 `.env.example` 預設值使用
  `${VAR:?must be set}` 形式 — 未提供明確值時快速失敗啟動。
- `scripts/check-env.mjs` 在 `NODE_ENV=production` 時拒絕佔位符值
  （`read-local`、`write-local`、`admin-local`、`change-me`、`demo`、`test`、
  `dev`、`password`）。
- 所有部署文件和範例 README 已清除字面示範憑證。

### 治理

- **每次記憶體寫入時的風險標籤掃描**：偵測 API key、AWS key、JWT token、私鑰、密碼、電子郵件、電話號碼。
- **六狀態狀態機**，含明確的合法轉換表；非法轉換會拋出例外。
- **記憶體投毒啟發式方法**：同源主導性 + 命令式動詞模式匹配 → `suspicious` 標記。
- **不可變稽核日誌**在每次狀態轉換時附加。
- 高風險內容自動路由至 `candidate` / `flagged`，在審查前不納入上下文組合。

### MCP 強化

- 每個 MCP 工具輸入在調用前都**針對 zod schema 進行驗證**。驗證失敗返回 JSON-RPC `-32602` 及清理後的問題列表。
- **所有變更工具**都需要至少 8 個字元的 `reason` 字串，並在其 schema 中標示 `destructiveHint: true`。
- 上游 API 錯誤在返回 MCP 客戶端之前**已清理** — 原始 SQL、檔案路徑和堆疊追蹤均被清除。

### 日誌

- **結構化 JSON 輸出**，含跨處理器鏈的 `requestId` 關聯。
- **自動遮蔽**符合 `content`、`query`、`memory`、`value`、`password`、`secret`、`token`、`key` 的欄位。記憶體記錄和查詢的實際內容從不寫入日誌。

### 資料邊界

- `agentmemory` 適配器在初始化時探測上游版本，並在不相容時發出警告。`LORE_AGENTMEMORY_REQUIRED=0` 在上游不可達時將適配器切換至靜默降級模式。
- `apps/api` 請求本文解析器強制執行 `LORE_MAX_JSON_BYTES` 上限（預設 1 MiB）；超大請求返回 413。
- Postgres 連線池設定 `statement_timeout: 15000` 以限制查詢時間。
- `LORE_REQUEST_TIMEOUT_MS`（預設 30 秒）限制每個請求處理器；逾時返回 504。

## 部署指引

- 請勿在未設定 `LORE_API_KEYS` 的情況下遠端暴露 Lore。
- 優先使用**角色分離**的 `reader` / `writer` / `admin` key。
- **在生產環境中務必設定** `DASHBOARD_BASIC_AUTH_USER` 和 `DASHBOARD_BASIC_AUTH_PASS`。
- **使用 `openssl rand -hex 32` 產生 key**。切勿使用範例中顯示的佔位符值。
- 保持原始 `agentmemory` 端點為私有；僅透過 Lore 存取它們。
- 針對任何非回送暴露，在儀表板、治理、匯入/匯出、同步和稽核路由後面保持網路存取控制層（Cloudflare Access、AWS ALB、Tailscale ACL 或類似工具）。
- **在生產環境中啟動 API 之前執行 `node scripts/check-env.mjs`。**
- **切勿提交**生產環境 `.env` 檔案、提供者 API key、雲端憑證、包含客戶內容的 eval 資料或私有記憶體匯出。

## 揭露時間表

對於確認的高影響漏洞：

- 第 0 天：確認收到回報。
- 第 7 天：分類和嚴重性分類結果與回報者共享。
- 第 30 天：協調公開揭露（或經雙方協議延期）。
- 第 30 天以上：如適用，對中等以上嚴重性發布 CVE。

對於低嚴重性問題，預期在下一個次要版本內解決。

## 強化路線圖

後續版本的計劃項目：

- **v0.5**：OpenAPI / Swagger 規格；CI 整合 `pnpm audit --high`、CodeQL 靜態分析和 dependabot。
- **v0.6**：Sigstore 簽名容器映像、SLSA 來源證明、透過 GitHub OIDC 而非長期 token 進行 npm 發布。
- **v0.7**：透過 KMS 信封加密對 `risk_tags` 標記的記憶體內容進行靜態加密。
