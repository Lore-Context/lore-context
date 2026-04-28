> 🤖 Tài liệu này được dịch máy từ bản tiếng Anh. Hoan nghênh cải thiện qua PR — xem [hướng dẫn đóng góp dịch thuật](../README.md).

# Tham chiếu API

Lore Context expose một REST API dưới `/v1/*` và một MCP server stdio. Tài liệu này
bao gồm bề mặt REST. Tên công cụ MCP được liệt kê ở cuối.

Tất cả các ví dụ giả sử:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Quy ước

- Tất cả các endpoint chấp nhận và trả về JSON.
- Xác thực: header `Authorization: Bearer <key>` (hoặc `x-lore-api-key`).
  `/health` là route duy nhất không cần xác thực.
- Vai trò: `reader < writer < admin`. Mỗi endpoint liệt kê vai trò tối thiểu của nó.
- Lỗi: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Giới hạn tốc độ: Header `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  trên mọi phản hồi. `429 Too Many Requests` bao gồm header `Retry-After`.
- Tất cả các thay đổi được ghi trong nhật ký kiểm toán. Chỉ admin truy cập qua
  `/v1/governance/audit-log`.

## Sức khỏe và sẵn sàng

### `GET /health`
- **Auth**: không có
- **Phản hồi 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Ngữ cảnh

### `POST /v1/context/query`
Tổng hợp ngữ cảnh từ bộ nhớ + web + repo + dấu vết công cụ.

- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Phản hồi 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Bộ nhớ

### `POST /v1/memory/write`
- **Auth**: writer+ (writer theo phạm vi phải bao gồm `project_id` khớp)
- **Body**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Phản hồi 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Auth**: reader+
- **Phản hồi 200**: bản ghi bộ nhớ đầy đủ bao gồm trạng thái quản trị.

### `POST /v1/memory/:id/update`
Patch bộ nhớ tại chỗ (chỉ sửa nhỏ).
- **Auth**: writer+
- **Body**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Tạo bộ nhớ mới thay thế cái cũ.
- **Auth**: writer+
- **Body**: `{ "content": string, "reason": string }`
- **Phản hồi 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Soft delete mặc định; admin có thể hard delete.
- **Auth**: writer+ (soft) / admin (hard)
- **Body**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Tìm kiếm trực tiếp không có tổng hợp.
- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Auth**: reader+
- **Query**: `project_id` (BẮT BUỘC cho các key theo phạm vi), `state`, `limit`, `offset`
- **Phản hồi 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Xuất bộ nhớ dưới dạng MIF v0.2 JSON.
- **Auth**: admin
- **Query**: `project_id`, `format` (`json` hoặc `markdown`)
- **Phản hồi 200**: Envelope MIF với `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Nhập envelope MIF v0.1 hoặc v0.2.
- **Auth**: admin (hoặc writer theo phạm vi với `project_id` rõ ràng)
- **Body**: Envelope MIF dưới dạng chuỗi JSON hoặc object
- **Phản hồi 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Quản trị

### `GET /v1/governance/review-queue`
- **Auth**: admin
- **Phản hồi 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Thăng cấp candidate/flagged → active.
- **Auth**: admin
- **Body**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Thăng cấp candidate/flagged → deleted.
- **Auth**: admin
- **Body**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Auth**: admin
- **Query**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Phản hồi 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **Auth**: reader+
- **Phản hồi 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Auth**: writer+ (writer theo phạm vi phải bao gồm `project_id` khớp)
- **Body**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Phản hồi 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Lấy một lần chạy eval đã lưu.
- **Auth**: reader+

### `GET /v1/eval/report`
Render eval mới nhất dưới dạng Markdown hoặc JSON.
- **Auth**: reader+
- **Query**: `project_id`, `format` (`md`|`json`)

## Sự kiện và Dấu vết

### `POST /v1/events/ingest`
Đẩy telemetry agent vào Lore.
- **Auth**: writer+
- **Body**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Auth**: reader+
- **Query**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Kiểm tra một trace truy vấn ngữ cảnh đơn lẻ.
- **Auth**: reader+

### `POST /v1/traces/:trace_id/feedback`
Ghi phản hồi về truy vấn ngữ cảnh.
- **Auth**: writer+
- **Body**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Tích hợp

### `GET /v1/integrations/agentmemory/health`
Kiểm tra upstream agentmemory + tương thích phiên bản.
- **Auth**: reader+
- **Phản hồi 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Kéo bộ nhớ từ agentmemory vào Lore.
- **Auth**: admin (không theo phạm vi — sync vượt qua các dự án)
- **Body**: `{ "project_id"?: string, "dry_run"?: boolean }`

## MCP Server (stdio)

MCP server expose các công cụ sau. `inputSchema` của mỗi công cụ là
JSON Schema được xác thực bằng zod. Các công cụ thay đổi yêu cầu chuỗi `reason` ít nhất 8 ký tự.

| Công cụ | Thay đổi | Mô tả |
|---|---|---|
| `context_query` | không | Tổng hợp ngữ cảnh cho truy vấn |
| `memory_write` | có | Ghi bộ nhớ mới |
| `memory_search` | không | Tìm kiếm trực tiếp không có tổng hợp |
| `memory_get` | không | Lấy theo id |
| `memory_list` | không | Liệt kê bộ nhớ với bộ lọc |
| `memory_update` | có | Patch tại chỗ |
| `memory_supersede` | có | Thay thế bằng phiên bản mới |
| `memory_forget` | có | Soft hoặc hard delete |
| `memory_export` | không | Xuất envelope MIF |
| `eval_run` | không | Chạy eval trên bộ dữ liệu |
| `trace_get` | không | Kiểm tra trace theo id |

Mã lỗi JSON-RPC:
- `-32602` Tham số không hợp lệ (lỗi xác thực zod)
- `-32603` Lỗi nội bộ (đã làm sạch; bản gốc được ghi vào stderr)

Chạy với transport SDK chính thức:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Spec OpenAPI 3.0 chính thức được theo dõi cho v0.5. Cho đến lúc đó, tham chiếu prose này là
có thẩm quyền.
