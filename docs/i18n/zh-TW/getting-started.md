> 🤖 本文件由英文版機器翻譯產生。歡迎透過 PR 改進 — 參見[翻譯貢獻指南](../README.md)。

# 快速開始

本指南帶您從零開始，完成寫入記憶體、查詢上下文並可存取儀表板的 Lore Context 執行實例。總計約需 15 分鐘，核心路徑約需 5 分鐘。

## 先決條件

- **Node.js** `>=22`（使用 `nvm`、`mise` 或您的發行版套件管理器）
- **pnpm** `10.30.1`（`corepack enable && corepack prepare pnpm@10.30.1 --activate`）
- （可選）**Docker + Docker Compose**，用於 Postgres+pgvector 路徑
- （可選）**psql**，若您偏好自行套用 schema

## 1. 複製並安裝

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

若 `pnpm test` 未通過，請勿繼續 — 請開立議題並附上失敗日誌。

## 2. 產生真實的機密資訊

Lore Context 拒絕在生產環境中以佔位符值啟動。即使在本地開發中也要產生真實的 key，以保持良好的習慣。

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

對於多角色本地設定：

```bash
export READER_KEY=$(openssl rand -hex 32)
export WRITER_KEY=$(openssl rand -hex 32)
export ADMIN_KEY=$(openssl rand -hex 32)
export LORE_API_KEYS='[
  {"key":"'"$READER_KEY"'","role":"reader","projectIds":["demo"]},
  {"key":"'"$WRITER_KEY"'","role":"writer","projectIds":["demo"]},
  {"key":"'"$ADMIN_KEY"'","role":"admin"}
]'
```

## 3. 啟動 API（檔案型儲存，無資料庫）

最簡單的路徑使用本地 JSON 檔案作為儲存後端。適合個人開發和煙霧測試。

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

在另一個終端中，驗證健康狀態：

```bash
curl -s http://127.0.0.1:3000/health | jq
```

預期結果：`{"status":"ok",...}`。

## 4. 寫入您的第一筆記憶體

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{
    "content": "Use Postgres pgvector for Lore Context production storage.",
    "memory_type": "project_rule",
    "project_id": "demo",
    "scope": "project"
  }' | jq
```

預期結果：一個 `200` 回應，包含新記憶體的 `id` 和 `governance.state`，值為 `active` 或 `candidate`（若內容符合風險模式如機密資訊，則為後者）。

## 5. 組合上下文

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{
    "query": "production storage",
    "project_id": "demo",
    "token_budget": 1200
  }' | jq
```

您應該會在 `evidence.memory` 陣列中看到您的記憶體被引用，以及一個 `traceId`，您稍後可以用它來檢視路由和回饋。

## 6. 啟動儀表板

在新的終端中：

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

在瀏覽器中開啟 http://127.0.0.1:3001。瀏覽器會提示輸入 Basic Auth 憑證。驗證後，儀表板會顯示記憶體清單、追蹤、eval 結果和治理審查佇列。

## 7. （可選）透過 MCP 連接 Claude Code

將以下內容添加至 Claude Code 的 `claude_desktop_config.json` MCP 伺服器區段：

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<paste your $LORE_API_KEY here>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

重新啟動 Claude Code。Lore Context MCP 工具（`context_query`、`memory_write` 等）即可使用。

對於其他代理 IDE（Cursor、Qwen、Dify、FastGPT 等），請參見[整合](integrations.md)中的整合矩陣。

## 8. （可選）切換至 Postgres + pgvector

當您超出 JSON 檔案儲存的限制時：

```bash
docker compose up -d postgres
pnpm db:schema   # 透過 psql 套用 apps/api/src/db/schema.sql
```

然後使用 `LORE_STORE_DRIVER=postgres` 啟動 API：

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

執行 `pnpm smoke:postgres` 以驗證寫入-重啟-讀取的往返是否可存活。

## 9. （可選）播種示範資料集並執行 eval

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

eval 報告以 Markdown 和 JSON 格式保存在 `output/eval-reports/` 中。

## 後續步驟

- **生產部署** — [deployment.md](deployment.md)
- **API 參考** — [api-reference.md](api-reference.md)
- **架構深入探討** — [architecture.md](architecture.md)
- **治理審查工作流程** — 請參見 [architecture.md](architecture.md) 中的「治理流程」區段
- **記憶體可攜性（MIF）** — `pnpm --filter @lore/mif test` 展示了往返範例
- **貢獻** — [CONTRIBUTING.md](CONTRIBUTING.md)

## 常見問題

| 症狀 | 原因 | 修復方式 |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | 另一個程序佔用了 3000 埠 | `lsof -i :3000` 找到它；或設定 `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | 生產模式下未設定 `DASHBOARD_BASIC_AUTH_USER/PASS` | 匯出環境變數或傳遞 `LORE_DASHBOARD_DISABLE_AUTH=1`（僅供開發） |
| `[check-env] ERROR: ... contain placeholder/demo values` | 任何環境值符合 `admin-local` / `change-me` / `demo` 等 | 透過 `openssl rand -hex 32` 產生真實值 |
| `429 Too Many Requests` | 觸發速率限制 | 等待冷卻時間（預設：5 次驗證失敗後 30 秒）；或在開發中設定 `LORE_RATE_LIMIT_DISABLED=1` |
| `agentmemory adapter unhealthy` | 本地 agentmemory 執行環境未執行 | 啟動 agentmemory 或設定 `LORE_AGENTMEMORY_REQUIRED=0` 以靜默跳過 |
| MCP 客戶端看到 `-32602 Invalid params` | 工具輸入未通過 zod schema 驗證 | 檢查錯誤本文中的 `invalid_params` 陣列 |
| 儀表板每頁都顯示 401 | Basic Auth 憑證錯誤 | 重新匯出環境變數並重啟儀表板程序 |

## 取得協助

- 回報錯誤：https://github.com/Lore-Context/lore-context/issues
- 安全揭露：請參見 [SECURITY.md](SECURITY.md)
- 貢獻文件：請參見 [CONTRIBUTING.md](CONTRIBUTING.md)
