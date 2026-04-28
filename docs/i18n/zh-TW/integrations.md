> 🤖 本文件由英文版機器翻譯產生。歡迎透過 PR 改進 — 參見[翻譯貢獻指南](../README.md)。

# 整合指南

這些指南記錄了針對目前本地 MVP 的 Lore Context 整合合約。

## 目前儲存庫狀態

- 儲存庫現在包含本地 REST API、上下文路由器/組合器、可選的 JSON 檔案持久化、可選的 Postgres 執行環境儲存、追蹤、記憶體匯入/匯出、eval 提供者比較、API 服務的儀表板 HTML、獨立 Next.js 儀表板，以及 `agentmemory` 適配器邊界。
- `apps/mcp-server/src/index.ts` 提供可執行的 stdio JSON-RPC MCP 啟動器，透過 `LORE_API_URL` 將工具代理至 Lore REST API，並在設定時以 Bearer token 轉發 `LORE_API_KEY`。它支援傳統的內建 stdio 迴圈和官方 `@modelcontextprotocol/sdk` stdio 傳輸（透過 `LORE_MCP_TRANSPORT=sdk`）。
- 以下文件是整合合約。API 優先的整合今天可以使用本地 REST 伺服器；具備 MCP 能力的客戶端在 `pnpm build` 後可以使用本地 stdio 啟動器。

## 共用設計

- 具備 MCP 能力的客戶端應連接至小型 Lore MCP 伺服器，而非直接連接原始 `agentmemory`。
- API 優先的客戶端應呼叫 Lore REST 端點，以 `POST /v1/context/query` 作為主要讀取路徑。
- `POST /v1/context/query` 接受 `mode`、`sources`、`freshness`、`token_budget`、`writeback_policy` 和 `include_sources`，讓客戶端在需要時可強制或停用記憶體/網頁/儲存庫/工具追蹤路由。
- Lore 透過 `packages/agentmemory-adapter` 包裝本地 `agentmemory` 執行環境。
- 本地 `agentmemory` 預期位於 `http://127.0.0.1:3111`。

## 可用的 MCP 介面

- `context_query`
- `memory_write`
- `memory_search`
- `memory_forget`
- `memory_list`
- `memory_get`
- `memory_update`
- `memory_supersede`
- `memory_export`
- `eval_run`
- `trace_get`

## 可用的 REST 介面

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list`，含可選的 `project_id`、`scope`、`status`、`memory_type`、`q` 和 `limit`
- `GET /v1/memory/:id`
- `PATCH /v1/memory/:id`
- `POST /v1/memory/:id/supersede`
- `GET /v1/memory/export`
- `POST /v1/memory/import`
- `GET /v1/governance/review-queue`
- `POST /v1/governance/memory/:id/approve`
- `POST /v1/governance/memory/:id/reject`
- `POST /v1/events/ingest`
- `POST /v1/eval/run`
- `GET /v1/eval/providers`
- `GET /v1/eval/runs`
- `GET /v1/eval/runs/:id`
- `GET /v1/traces`
- `GET /v1/traces/:id`
- `POST /v1/traces/:id/feedback`
- `GET /v1/audit-logs`

## 本地 API 煙霧測試

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

自動化煙霧測試路徑：

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## 本地 MCP 煙霧測試

MCP 啟動器從 stdin 讀取以換行符分隔的 JSON-RPC，並僅將 JSON-RPC 訊息寫入 stdout：

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

請勿從 MCP 客戶端透過 `pnpm start` 啟動，因為套件管理器的橫幅會污染 stdout。

## 私有部署對齊

[deployment.md](deployment.md) 中的私有示範打包假設：

- Lore API 和儀表板以長期容器執行。
- Postgres 是共享示範的預設持久儲存。
- MCP 啟動器保持為靠近客戶端的 stdio 程序，或按需作為可選的 `mcp` Compose 服務執行。
- 示範播種來自 [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json)，eval 煙霧測試來自 [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json)。

對於私有部署，請將客戶端啟動器指向私有 API URL，並提供最小適當的角色：

- `reader`：儀表板和唯讀副駕駛。
- `writer`：應寫入記憶體、回饋或 eval 執行的代理。
- `admin`：匯入、匯出、治理、稽核和遺忘流程。

## 感知部署的客戶端範本

### Claude Code

優先使用針對私有 API 的工作站本地 stdio 程序：

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY=write-local \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

若您使用打包的 MCP 容器而非 `node .../dist/index.js`，請保持相同的 `LORE_API_URL` / `LORE_API_KEY` 對，並透過 `docker compose run --rm mcp` 執行 stdio 啟動器。

### Cursor

Cursor 風格的 MCP JSON 應保持啟動器為本地，僅更改 API 目標和 key：

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "read-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

僅在 Cursor 工作流程有意寫回持久專案記憶體時使用 `writer` key。

### Qwen Code

Qwen 風格的 `mcpServers` JSON 遵循相同邊界：

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "write-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

對純搜尋檢索助理使用 `reader`，對需要 `memory_write`、`memory_update` 或追蹤回饋工具的代理流程使用 `writer`。

## 安全預設值

- 本地 MCP 優先使用 `stdio`；僅在需要遠端傳輸時使用已驗證的可串流 HTTP。
- 將 SSE 視為傳統相容性，而非預設路徑。
- 使用 `includeTools` 或客戶端等效項將工具列入白名單。
- 預設不啟用廣泛信任模式。
- 對變更操作要求提供 `reason`。
- 讓 `memory_forget` 保持在軟刪除，除非管理員刻意為受控移除設定 `hard_delete: true`。
- 對共享本地或遠端 API 暴露使用 `LORE_API_KEYS` 角色分離：唯讀客戶端使用 `reader`，代理回寫使用 `writer`，僅同步/匯入/匯出/遺忘/治理/稽核操作使用 `admin`。添加 `projectIds` 以將客戶端 key 的範圍限定至其可查看或變更的專案。
- 將 `agentmemory` 綁定至 `127.0.0.1`。
- 不要公開暴露原始 `agentmemory` 查看器或控制台。
- 目前即時的 `agentmemory` 0.9.3 合約：`remember`、`export`、`audit` 和 `forget(memoryId)` 可用於 Lore 同步/合約測試；`smart-search` 搜尋觀察記錄，不應被視為新記憶記錄可直接搜尋的證明。
