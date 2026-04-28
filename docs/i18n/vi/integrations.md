> 🤖 Tài liệu này được dịch máy từ bản tiếng Anh. Hoan nghênh cải thiện qua PR — xem [hướng dẫn đóng góp dịch thuật](../README.md).

# Hướng dẫn tích hợp

Các hướng dẫn này ghi lại hợp đồng tích hợp Lore Context so với MVP cục bộ hiện tại.

## Trạng thái repo hiện tại

- Repo giờ bao gồm REST API cục bộ, context router/composer, lưu trữ file JSON tùy chọn, runtime store Postgres tùy chọn, dấu vết, nhập/xuất bộ nhớ, so sánh nhà cung cấp eval, dashboard HTML phục vụ API, dashboard Next.js độc lập và ranh giới adapter `agentmemory`.
- `apps/mcp-server/src/index.ts` cung cấp launcher MCP JSON-RPC stdio có thể chạy được, proxy công cụ đến Lore REST API qua `LORE_API_URL` và chuyển tiếp `LORE_API_KEY` dưới dạng Bearer token khi được cấu hình. Nó hỗ trợ vòng lặp stdio tích hợp legacy và transport stdio `@modelcontextprotocol/sdk` chính thức qua `LORE_MCP_TRANSPORT=sdk`.
- Các tài liệu dưới đây là hợp đồng tích hợp. Các tích hợp API-first có thể sử dụng server REST cục bộ hôm nay; các client có khả năng MCP có thể sử dụng launcher stdio cục bộ sau `pnpm build`.

## Thiết kế chung

- Các client có khả năng MCP nên kết nối với MCP server Lore nhỏ, không phải `agentmemory` thô.
- Các client API-first nên gọi các endpoint Lore REST, với `POST /v1/context/query` là đường đọc chính.
- `POST /v1/context/query` chấp nhận `mode`, `sources`, `freshness`, `token_budget`, `writeback_policy` và `include_sources` để client có thể buộc hoặc tắt định tuyến memory/web/repo/tool-trace khi cần.
- Lore bọc runtime `agentmemory` cục bộ qua `packages/agentmemory-adapter`.
- `agentmemory` cục bộ được mong đợi tại `http://127.0.0.1:3111`.

## Bề mặt MCP có sẵn

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

## Bề mặt REST có sẵn

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` với `project_id`, `scope`, `status`, `memory_type`, `q` và `limit` tùy chọn
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

## Smoke API cục bộ

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Đường smoke tự động là:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Smoke MCP cục bộ

Launcher MCP đọc JSON-RPC được phân cách bởi newline qua stdin và chỉ ghi các thông điệp JSON-RPC lên stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Đừng khởi chạy điều này qua `pnpm start` từ MCP client vì các banner trình quản lý gói sẽ làm ô nhiễm stdout.

## Căn chỉnh triển khai riêng tư

Đóng gói demo riêng tư trong [deployment.md](deployment.md) giả sử:

- Lore API và dashboard chạy như các container tồn tại lâu dài.
- Postgres là store bền vững mặc định cho các demo chia sẻ.
- Launcher MCP vẫn là process stdio gần với client, hoặc chạy như dịch vụ compose `mcp` tùy chọn theo yêu cầu.
- Seeding demo đến từ `examples/demo-dataset/import/lore-demo-memories.json`, trong khi smoke eval đến từ `examples/demo-dataset/eval/lore-demo-eval-request.json`.

Cho các triển khai riêng tư, hãy trỏ các launcher client đến URL API riêng tư và cung cấp vai trò nhỏ nhất phù hợp:

- `reader`: dashboard và copilot chỉ đọc.
- `writer`: agent nên ghi bộ nhớ, phản hồi hoặc eval run.
- `admin`: luồng nhập, xuất, quản trị, kiểm toán và forget.

## Mẫu client nhận thức triển khai

### Claude Code

Ưu tiên process stdio cục bộ trên workstation nhắm đến API riêng tư:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY="${WRITE_KEY:?set WRITE_KEY}" \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

Nếu bạn sử dụng container MCP đã đóng gói thay vì `node .../dist/index.js`, hãy giữ cùng cặp `LORE_API_URL` / `LORE_API_KEY` và chạy launcher stdio qua `docker compose run --rm mcp`.

### Cursor

JSON MCP kiểu Cursor nên giữ launcher cục bộ và chỉ thay đổi target API và key:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_READER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Sử dụng key `writer` chỉ khi các quy trình Cursor cố tình ghi lại bộ nhớ dự án bền vững.

### Qwen Code

JSON `mcpServers` kiểu Qwen tuân theo cùng ranh giới:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_WRITER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Sử dụng `reader` cho các trợ lý truy xuất chỉ tìm kiếm và `writer` cho các luồng agentic cần công cụ `memory_write`, `memory_update` hoặc `trace` feedback.

## Mặc định an toàn

- Ưu tiên `stdio` cục bộ cho MCP; chỉ sử dụng HTTP streamable đã xác thực khi transport từ xa là bắt buộc.
- Coi SSE là tương thích legacy, không phải đường mặc định.
- Whitelist các công cụ với `includeTools` hoặc tương đương client.
- Đừng bật chế độ tin tưởng rộng theo mặc định.
- Yêu cầu `reason` trên các thao tác thay đổi.
- Giữ `memory_forget` trên soft delete trừ khi admin cố tình đặt `hard_delete: true` cho việc xóa có kiểm soát.
- Sử dụng phân tách vai trò `LORE_API_KEYS` cho exposure API cục bộ hoặc từ xa dùng chung: `reader` cho client chỉ đọc, `writer` cho writeback agent và `admin` chỉ cho các thao tác sync/nhập/xuất/forget/quản trị/kiểm toán. Thêm `projectIds` để phạm vi key client vào các dự án chúng có thể xem hoặc thay đổi.
- Giữ `agentmemory` bind lên `127.0.0.1`.
- Đừng expose viewer hoặc console `agentmemory` thô công khai.
- Hợp đồng `agentmemory` 0.9.3 trực tiếp hiện tại: `remember`, `export`, `audit` và `forget(memoryId)` có thể sử dụng cho các test sync/hợp đồng Lore; `smart-search` tìm kiếm các observation và không nên được coi là bằng chứng rằng các bản ghi bộ nhớ mới được ghi nhớ có thể tìm kiếm trực tiếp.
