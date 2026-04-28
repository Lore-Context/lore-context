# API 参考

> 🤖 本文档由英文版机器翻译生成。欢迎通过 PR 改进 — 参见[翻译贡献指南](../README.md)。

Lore Context 在 `/v1/*` 下暴露 REST API，并提供 stdio MCP 服务器。本文档覆盖 REST 接口。MCP 工具名称列于文末。

所有示例假设：

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## 约定

- 所有端点接受并返回 JSON。
- 认证：`Authorization: Bearer <key>` 头（或 `x-lore-api-key`）。`/health` 是唯一无需认证的路由。
- 角色：`reader < writer < admin`。每个端点列出其最低角色要求。
- 错误：`{ "error": { "code": string, "message": string, "status": number, "requestId": string } }`。
- 速率限制：每个响应包含 `X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset` 头。`429 Too Many Requests` 包含 `Retry-After` 头。
- 所有变更操作都记录在审计日志中。仅 admin 可通过 `/v1/governance/audit-log` 访问。

## 健康与就绪

### `GET /health`
- **认证**：无
- **响应 200**：`{ "status": "ok", "version": "0.4.0-alpha", "uptime": number, "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## 上下文

### `POST /v1/context/query`
从记忆 + 网络 + 仓库 + 工具追踪组合上下文。

- **认证**：reader+
- **请求体**：`{ "query": string, "project_id"?: string, "token_budget"?: number, "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **响应 200**：`{ "context": string, "evidence": { "memory": [...], "web": [...], "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number, "tokens_used": number, "latency_ms": number, "traceId": string }`

## 记忆

### `POST /v1/memory/write`
- **认证**：writer+（作用域 writer 必须包含匹配的 `project_id`）
- **请求体**：`{ "content": string, "memory_type": string, "project_id": string, "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number, "source_refs"?: string[], "metadata"?: object }`
- **响应 200**：`{ "id": string, "governance": { "state": GovState, "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **认证**：reader+
- **响应 200**：包含治理状态的完整记忆记录。

### `POST /v1/memory/:id/update`
原地修补记忆（仅限小修正）。
- **认证**：writer+
- **请求体**：`{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
创建一条替代旧记忆的新记忆。
- **认证**：writer+
- **请求体**：`{ "content": string, "reason": string }`
- **响应 200**：`{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
默认软删除；admin 可硬删除。
- **认证**：writer+（软删除）/ admin（硬删除）
- **请求体**：`{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
不经组合的直接搜索。
- **认证**：reader+
- **请求体**：`{ "query": string, "project_id"?: string, "limit"?: number, "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **认证**：reader+
- **查询参数**：`project_id`（作用域 key 必填）、`state`、`limit`、`offset`
- **响应 200**：`{ "memories": [...], "total": number, "limit": number, "offset": number }`

### `GET /v1/memory/export`
以 MIF v0.2 JSON 格式导出记忆。
- **认证**：admin
- **查询参数**：`project_id`、`format`（`json` 或 `markdown`）
- **响应 200**：含 `provenance`、`validity`、`confidence`、`source_refs`、`supersedes`、`contradicts` 的 MIF 信封。

### `POST /v1/memory/import`
导入 MIF v0.1 或 v0.2 信封。
- **认证**：admin（或含显式 `project_id` 的作用域 writer）
- **请求体**：JSON 字符串或对象形式的 MIF 信封
- **响应 200**：`{ "imported": number, "skipped": number, "errors": [...] }`

## 治理

### `GET /v1/governance/review-queue`
- **认证**：admin
- **响应 200**：`{ "items": [{ "memory_id": string, "risk_tags": string[], "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
将 candidate/flagged 提升为 active。
- **认证**：admin
- **请求体**：`{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
将 candidate/flagged 提升为 deleted。
- **认证**：admin
- **请求体**：`{ "reason": string }`

### `GET /v1/governance/audit-log`
- **认证**：admin
- **查询参数**：`project_id`、`actor`、`from`、`to`、`limit`、`offset`
- **响应 200**：`{ "entries": AuditLog[], "total": number }`

## 评测

### `GET /v1/eval/providers`
- **认证**：reader+
- **响应 200**：`{ "providers": [{ "id": "lore-local"|"agentmemory-export"|"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **认证**：writer+（作用域 writer 必须包含匹配的 `project_id`）
- **请求体**：`{ "dataset_id": string, "provider_ids": string[], "k": number, "project_id": string }`
- **响应 200**：`{ "run_id": string, "metrics": { "recallAtK": number, "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms": number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
获取已保存的评测运行。
- **认证**：reader+

### `GET /v1/eval/report`
以 Markdown 或 JSON 格式渲染最新评测。
- **认证**：reader+
- **查询参数**：`project_id`、`format`（`md`|`json`）

## 事件与追踪

### `POST /v1/events/ingest`
将智能体遥测数据推送到 Lore。
- **认证**：writer+
- **请求体**：`{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **认证**：reader+
- **查询参数**：`project_id`、`traceId`、`from`、`to`、`limit`

### `GET /v1/traces/:trace_id`
检查单条上下文查询追踪。
- **认证**：reader+

### `POST /v1/traces/:trace_id/feedback`
记录对上下文查询的反馈。
- **认证**：writer+
- **请求体**：`{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## 集成

### `GET /v1/integrations/agentmemory/health`
检查 agentmemory 上游 + 版本兼容性。
- **认证**：reader+
- **响应 200**：`{ "reachable": boolean, "upstreamVersion": string, "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
从 agentmemory 拉取记忆到 Lore。
- **认证**：admin（无作用域 — 同步跨越项目）
- **请求体**：`{ "project_id"?: string, "dry_run"?: boolean }`

## MCP 服务器（stdio）

MCP 服务器暴露以下工具。每个工具的 `inputSchema` 是经 zod 验证的 JSON Schema。变更工具要求 `reason` 字符串至少 8 个字符。

| 工具 | 是否变更 | 描述 |
|---|---|---|
| `context_query` | 否 | 为查询组合上下文 |
| `memory_write` | 是 | 写入新记忆 |
| `memory_search` | 否 | 不经组合的直接搜索 |
| `memory_get` | 否 | 按 id 获取 |
| `memory_list` | 否 | 带过滤条件列出记忆 |
| `memory_update` | 是 | 原地修补 |
| `memory_supersede` | 是 | 替换为新版本 |
| `memory_forget` | 是 | 软删除或硬删除 |
| `memory_export` | 否 | 导出 MIF 信封 |
| `eval_run` | 否 | 针对数据集运行评测 |
| `trace_get` | 否 | 按 id 检查追踪 |

JSON-RPC 错误码：
- `-32602` 无效参数（zod 验证失败）
- `-32603` 内部错误（已脱敏；原始内容写入 stderr）

使用官方 SDK 传输运行：
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

正式的 OpenAPI 3.0 规范计划在 v0.5 推出。在此之前，本散文参考是权威文档。
