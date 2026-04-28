> 🤖 本文件由英文版機器翻譯產生。歡迎透過 PR 改進 — 參見[翻譯貢獻指南](../README.md)。

# 私有部署

> **使用 `openssl rand -hex 32` 產生 key — 切勿在生產環境中使用以下佔位符。**

本文件將 Lore 打包為私有示範或內部團隊發布，而不更改應用程式碼路徑。部署套件包含：

- `apps/api/Dockerfile`：REST API 映像。
- `apps/dashboard/Dockerfile`：獨立 Next.js 儀表板映像。
- `Dockerfile`：可選的 MCP 啟動器映像，用於 stdio 客戶端。
- `docs/deployment/compose.private-demo.yml`：Postgres、API、儀表板和按需 MCP 服務的複製貼上 Compose 堆疊。
- `examples/demo-dataset/**`：用於檔案儲存、匯入和 eval 流程的種子資料。

## 建議拓撲

- `postgres`：用於共享或多操作員示範的持久儲存。
- `api`：內部橋接網路上的 Lore REST API，預設發布至回送位址。
- `dashboard`：操作員 UI，預設發布至回送位址，並透過 `LORE_API_URL` 代理至 API。
- `mcp`：可選的 stdio 容器，供希望使用容器化啟動器而非主機上 `node apps/mcp-server/dist/index.js` 的 Claude、Cursor 和 Qwen 操作員使用。

Compose 堆疊刻意保持公開暴露範圍狹窄。Postgres、API 和儀表板預設透過可變埠映射綁定至 `127.0.0.1`。

## 前置準備

1. 將 `.env.example` 複製至私有執行環境檔案，例如 `.env.private`。
2. 替換 `POSTGRES_PASSWORD`。
3. 優先使用 `LORE_API_KEYS` 而非單一 `LORE_API_KEY`。
4. 將 `DASHBOARD_LORE_API_KEY` 設定為 `admin` key 以使用完整操作員工作流程，或設定為有範圍的 `reader` key 用於唯讀示範。將 `MCP_LORE_API_KEY` 設定為 `writer` 或 `reader` key，取決於客戶端是否應變更記憶體。

角色分離範例：

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
DASHBOARD_BASIC_AUTH_USER=admin
DASHBOARD_BASIC_AUTH_PASS=<YOUR_DASHBOARD_PASSWORD>
```

## 啟動堆疊

從儲存庫根目錄建置並啟動私有示範堆疊：

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

健康檢查：

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl -u "${DASHBOARD_BASIC_AUTH_USER}:${DASHBOARD_BASIC_AUTH_PASS}" \
  http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## 播種示範資料

對於 Postgres 支援的 Compose 堆疊，在 API 健康後匯入打包的示範記憶體：

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

執行打包的 eval 請求：

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

若您想要零資料庫的單主機示範，請將 API 指向檔案儲存快照：

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## MCP 啟動器模式

建議模式：

- 在靠近客戶端的位置執行 MCP 啟動器。
- 將 `LORE_API_URL` 指向私有 API URL。
- 向啟動器提供最小適當的 API key。

主機型啟動器：

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

容器化啟動器：

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

容器化啟動器適合可重現的工作站設定，但它仍然是 stdio 程序，而非長期執行的公開網路服務。

## 安全預設值

- 除非已在堆疊前設有已驗證的反向代理，否則請將 `API_BIND_HOST`、`DASHBOARD_BIND_HOST` 和 `POSTGRES_BIND_HOST` 保持在 `127.0.0.1`。
- 優先使用含 `reader` / `writer` / `admin` 分離的 `LORE_API_KEYS`，而非在所有地方重用單一全域管理員 key。
- 對示範客戶端使用有專案範圍的 key。打包的示範專案 id 為 `demo-private`。
- 將 `AGENTMEMORY_URL` 保持在回送位址，不要直接暴露原始 `agentmemory`。
- 除非私有部署真正依賴即時的 agentmemory 執行環境，否則保持 `LORE_AGENTMEMORY_REQUIRED=0`。
- 僅在受控內部環境中保持 `LORE_POSTGRES_AUTO_SCHEMA=true`。一旦 schema 引導成為發布流程的一部分，即可將其固定為 `false`。

## 可重用檔案

- Compose 範例：[compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- API 映像：[apps/api/Dockerfile](../../../apps/api/Dockerfile)
- 儀表板映像：[apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- MCP 映像：[Dockerfile](../../../Dockerfile)
- 示範資料：[examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
