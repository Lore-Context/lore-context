> 🤖 本文件由英文版機器翻譯產生。歡迎透過 PR 改進 — 參見[翻譯貢獻指南](../README.md)。

# API 參考

Lore Context 在 `/v1/*` 下公開 REST API，以及一個 stdio MCP 伺服器。本文件涵蓋 REST 介面。MCP 工具名稱列在最後。

所有範例假設：

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## 慣例

- 所有端點接受並返回 JSON。
- 驗證：`Authorization: Bearer <key>` 標頭（或 `x-lore-api-key`）。
  `/health` 是唯一不需驗證的路由。
- 角色：`reader < writer < admin`。每個端點列出其最低所需角色。
- 錯誤：`{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`。
- 速率限制：每個回應都有 `X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`
  標頭。`429 Too Many Requests` 包含 `Retry-After` 標頭。
- 所有變更都記錄在稽核日誌中。管理員透過
  `/v1/governance/audit-log` 存取。

## 健康與就緒

### `GET /health`
- **驗證**：無
- **回應 200**：`{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## 上下文

### `POST /v1/context/query`
從記憶體 + 網頁 + 儲存庫 + 工具追蹤組合上下文。

- **驗證**：reader+
- **本文**：`{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **回應 200**：`{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## 記憶體

### `POST /v1/memory/write`
- **驗證**：writer+（有專案範圍的 writer 必須包含相符的 `project_id`）
- **本文**：`{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **回應 200**：`{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **驗證**：reader+
- **回應 200**：包含治理狀態的完整記憶體記錄。

### `POST /v1/memory/:id/update`
就地修補記憶體（僅小幅修正）。
- **驗證**：writer+
- **本文**：`{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
建立取代舊記憶體的新記憶體。
- **驗證**：writer+
- **本文**：`{ "content": string, "reason": string }`
- **回應 200**：`{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
預設為軟刪除；管理員可執行硬刪除。
- **驗證**：writer+（軟）/ admin（硬）
- **本文**：`{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
不帶組合的直接搜尋。
- **驗證**：reader+
- **本文**：`{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **驗證**：reader+
- **查詢參數**：`project_id`（有範圍 key 必填）、`state`、`limit`、`offset`
- **回應 200**：`{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
以 MIF v0.2 JSON 格式匯出記憶體。
- **驗證**：admin
- **查詢參數**：`project_id`、`format`（`json` 或 `markdown`）
- **回應 200**：MIF 信封，含 `provenance`、`validity`、`confidence`、
  `source_refs`、`supersedes`、`contradicts`。

### `POST /v1/memory/import`
匯入 MIF v0.1 或 v0.2 信封。
- **驗證**：admin（或含明確 `project_id` 的有範圍 writer）
- **本文**：MIF 信封，為 JSON 字串或物件
- **回應 200**：`{ "imported": number, "skipped": number, "errors": [...] }`

## 治理

### `GET /v1/governance/review-queue`
- **驗證**：admin
- **回應 200**：`{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
將 candidate/flagged 提升為 active。
- **驗證**：admin
- **本文**：`{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
將 candidate/flagged 提升為 deleted。
- **驗證**：admin
- **本文**：`{ "reason": string }`

### `GET /v1/governance/audit-log`
- **驗證**：admin
- **查詢參數**：`project_id`、`actor`、`from`、`to`、`limit`、`offset`
- **回應 200**：`{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **驗證**：reader+
- **回應 200**：`{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **驗證**：writer+（有專案範圍的 writer 必須包含相符的 `project_id`）
- **本文**：`{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **回應 200**：`{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
取得已儲存的 eval 執行結果。
- **驗證**：reader+

### `GET /v1/eval/report`
以 Markdown 或 JSON 格式渲染最新的 eval 結果。
- **驗證**：reader+
- **查詢參數**：`project_id`、`format`（`md`|`json`）

## 事件與追蹤

### `POST /v1/events/ingest`
將代理遙測推送至 Lore。
- **驗證**：writer+
- **本文**：`{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **驗證**：reader+
- **查詢參數**：`project_id`、`traceId`、`from`、`to`、`limit`

### `GET /v1/traces/:trace_id`
檢視單一上下文查詢追蹤。
- **驗證**：reader+

### `POST /v1/traces/:trace_id/feedback`
記錄對上下文查詢的回饋。
- **驗證**：writer+
- **本文**：`{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## 整合

### `GET /v1/integrations/agentmemory/health`
檢查 agentmemory 上游 + 版本相容性。
- **驗證**：reader+
- **回應 200**：`{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
從 agentmemory 拉取記憶體至 Lore。
- **驗證**：admin（無範圍 — 同步跨越專案）
- **本文**：`{ "project_id"?: string, "dry_run"?: boolean }`

## MCP 伺服器（stdio）

MCP 伺服器公開以下工具。每個工具的 `inputSchema` 都是 zod 驗證的 JSON Schema。變更工具需要至少 8 個字元的 `reason` 字串。

| 工具 | 是否變更 | 說明 |
|---|---|---|
| `context_query` | 否 | 為查詢組合上下文 |
| `memory_write` | 是 | 寫入新記憶體 |
| `memory_search` | 否 | 不帶組合的直接搜尋 |
| `memory_get` | 否 | 透過 id 取得記憶體 |
| `memory_list` | 否 | 列出帶過濾條件的記憶體 |
| `memory_update` | 是 | 就地修補 |
| `memory_supersede` | 是 | 以新版本取代 |
| `memory_forget` | 是 | 軟刪除或硬刪除 |
| `memory_export` | 否 | 匯出 MIF 信封 |
| `eval_run` | 否 | 對資料集執行 eval |
| `trace_get` | 否 | 透過 id 檢視追蹤 |

JSON-RPC 錯誤代碼：
- `-32602` 無效參數（zod 驗證失敗）
- `-32603` 內部錯誤（已清理；原始錯誤寫入 stderr）

使用官方 SDK 傳輸執行：
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

正式的 OpenAPI 3.0 規格追蹤於 v0.5。在此之前，本散文參考為權威文件。
