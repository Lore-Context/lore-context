> 🤖 本文件由英文版機器翻譯產生。歡迎透過 PR 改進 — 參見[翻譯貢獻指南](../README.md)。

# 貢獻至 Lore Context

感謝您改進 Lore Context。本專案是 alpha 階段的 AI 代理上下文控制平面，因此變更應保持本地優先操作、可稽核性和部署安全性。

## 行為準則

本專案遵循[貢獻者公約](../../CODE_OF_CONDUCT.md)。參與即表示您同意遵守。

## 開發設定

需求：

- Node.js 22 或更新版本
- pnpm 10.30.1（`corepack prepare pnpm@10.30.1 --activate`）
- （可選）Docker，用於 Postgres 路徑
- （可選）`psql`，若您偏好自行套用 schema

常用指令：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # 需要 docker compose up -d postgres
pnpm run doctor
```

針對各套件的工作：

```bash
pnpm --filter @lore/api test
pnpm --filter @lore-context/server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Pull Request 期望

- **保持變更專注且可還原。** 每個 PR 一個關注點；每個關注點一個 PR。
- **為行為變更添加測試。** 優先使用真實斷言而非快照。
- **在請求審查前執行 `pnpm build` 和 `pnpm test`。** CI 也會執行，但本地更快。
- **更改 API、儀表板、MCP、Postgres、匯入/匯出、eval 或部署行為時，執行相關的煙霧測試。**
- **請勿提交**產生的建置輸出、本地儲存、`.env` 檔案、憑證或私有客戶資料。`.gitignore` 涵蓋了大多數路徑；若您建立新工件，請確保它們已被排除。
- **保持在您 PR 的範圍內。** 不要順手重構不相關的程式碼。

## 架構護欄

這些是 v0.4.x 的不可協商項目。若 PR 違反其中一項，預期會收到拆分或重工的請求：

- **本地優先仍為主要原則。** 新功能必須在沒有託管服務或第三方 SaaS 依賴的情況下運作。
- **無新的驗證介面繞過。** 每個路由都保持由 API key + 角色進行閘控。回送在生產環境中不是特殊情況。
- **無原始 `agentmemory` 暴露。** 外部呼叫者僅透過 Lore 端點存取記憶體。
- **稽核日誌完整性。** 每個影響記憶體狀態的變更都會寫入稽核條目。
- **缺少設定時封閉失敗。** 若必填環境變數為佔位符或缺失，生產模式啟動會拒絕開始。

## 提交訊息

Lore Context 使用受 Linux 核心指南啟發的簡潔且有主見的提交格式。

### 格式

```text
<type>: <short summary in imperative mood>

<optional body explaining why this change is needed and what tradeoffs apply>

<optional trailers>
```

### 類型

- `feat` — 新的使用者可見功能或 API 端點
- `fix` — 錯誤修復
- `refactor` — 無行為變更的程式碼重構
- `chore` — 儲存庫維護（依賴、工具、檔案移動）
- `docs` — 僅文件
- `test` — 僅測試變更
- `perf` — 具可測量影響的效能改進
- `revert` — 還原先前的提交

### 風格

- 類型和摘要第一個字使用**小寫**。
- 摘要行**無結尾句號**。
- 摘要行**不超過 72 個字元**；正文在 80 個字元處換行。
- **命令式語氣**："fix loopback bypass"，而非 "fixed" 或 "fixes"。
- **重在原因而非內容**：差異顯示了變更內容；正文應解釋原因。
- **不要包含** `Co-Authored-By` 結尾、AI 歸因或 signed-off-by 行，除非使用者明確要求。

### 有用的結尾

在相關時，添加結尾以捕捉限制和審查者上下文：

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### 範例

```text
fix: loopback bypass — remove host-header trust, fail closed in production

Previous versions trusted the Host header for loopback detection, allowing a
remote attacker to spoof "Host: 127.0.0.1" and obtain admin role with no API
key when LORE_API_KEYS was unset. Loopback detection now uses
req.socket.remoteAddress only, and production with empty keys returns 401.

Constraint: Local development without keys still works on loopback
Confidence: high
Scope-risk: narrow (auth path only)
Tested: pnpm test (added loopback-bypass test case), pnpm smoke:api
```

## 提交粒度

- 每個提交一個邏輯變更。審查者可以原子性地還原，而不產生附帶損害。
- 在開啟或更新 PR 之前，將瑣碎的修正（`typo`、`lint`、`prettier`）壓縮至父提交中。
- 若多檔案重構有單一原因，可以放在一個提交中。

## 審查流程

- 在典型活動期間，維護者會在 7 天內審查您的 PR。
- 在重新請求審查之前，先解決所有阻塞性意見。
- 對於非阻塞性意見，以理由進行內嵌回覆或開立後續議題是可接受的。
- 一旦 PR 獲批，維護者可能會添加 `merge-queue` 標籤；標籤添加後請勿 rebase 或強制推送。

## 文件翻譯

若您想改進已翻譯的 README 或文件檔案，請參見[i18n 貢獻指南](../README.md)。

## 回報錯誤

- 在 https://github.com/Lore-Context/lore-context/issues 開立公開議題，除非該錯誤是安全漏洞。
- 安全問題請遵循 [SECURITY.md](SECURITY.md)。
- 請包含：版本或提交、環境、重現步驟、預期與實際結果、日誌（敏感內容已遮蔽）。

## 致謝

Lore Context 是一個小型專案，致力於為 AI 代理基礎設施做一些有用的事。每個範圍明確的 PR 都使它更進一步。
