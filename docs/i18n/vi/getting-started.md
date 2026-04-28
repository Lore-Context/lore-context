> 🤖 Tài liệu này được dịch máy từ bản tiếng Anh. Hoan nghênh cải thiện qua PR — xem [hướng dẫn đóng góp dịch thuật](../README.md).

# Bắt đầu

Hướng dẫn này đưa bạn từ đầu đến một phiên bản Lore Context đang chạy với bộ nhớ đã được ghi,
ngữ cảnh đã được truy vấn và dashboard có thể truy cập. Dự tính ~15 phút tổng cộng, ~5 phút cho
đường cốt lõi.

## Điều kiện tiên quyết

- **Node.js** `>=22` (sử dụng `nvm`, `mise` hoặc trình quản lý gói của distro bạn)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Tùy chọn) **Docker + Docker Compose** cho đường Postgres+pgvector
- (Tùy chọn) **psql** nếu bạn muốn tự áp dụng schema

## 1. Clone và cài đặt

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Nếu `pnpm test` không xanh, đừng tiếp tục — hãy mở issue với nhật ký thất bại.

## 2. Tạo secret thực

Lore Context từ chối khởi động trong sản xuất với các giá trị placeholder. Tạo các key thực
ngay cả cho phát triển cục bộ để giữ thói quen nhất quán.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Cho các thiết lập cục bộ đa vai trò:

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

## 3. Khởi động API (dựa trên file, không có cơ sở dữ liệu)

Đường đơn giản nhất sử dụng file JSON cục bộ làm storage backend. Phù hợp cho
phát triển solo và smoke testing.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Trong một shell khác, xác minh sức khỏe:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Mong đợi: `{"status":"ok",...}`.

## 4. Ghi bộ nhớ đầu tiên của bạn

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

Mong đợi: phản hồi `200` với `id` của bộ nhớ mới và `governance.state` là `active`
hoặc `candidate` (cái sau nếu nội dung khớp mẫu rủi ro như một secret).

## 5. Tổng hợp ngữ cảnh

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

Bạn sẽ thấy bộ nhớ của mình được trích dẫn trong mảng `evidence.memory`, cộng thêm `traceId` mà
bạn có thể sử dụng sau để kiểm tra định tuyến và phản hồi.

## 6. Khởi động dashboard

Trong một terminal mới:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Mở http://127.0.0.1:3001 trong trình duyệt của bạn. Trình duyệt sẽ nhắc Basic Auth
thông tin đăng nhập. Sau khi xác thực, dashboard hiển thị kiểm kê bộ nhớ, dấu vết, kết quả eval
và hàng đợi xem xét quản trị.

## 7. (Tùy chọn) Kết nối Claude Code qua MCP

Thêm điều này vào phần MCP servers của `claude_desktop_config.json` của Claude Code:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<dán $LORE_API_KEY của bạn ở đây>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Khởi động lại Claude Code. Các công cụ MCP Lore Context (`context_query`, `memory_write`, v.v.)
trở nên có sẵn.

Cho các IDE agent khác (Cursor, Qwen, Dify, FastGPT, v.v.), xem ma trận tích hợp trong
[integrations.md](integrations.md).

## 8. (Tùy chọn) Chuyển sang Postgres + pgvector

Khi bạn vượt quá lưu trữ file JSON:

```bash
docker compose up -d postgres
pnpm db:schema   # áp dụng apps/api/src/db/schema.sql qua psql
```

Sau đó khởi động API với `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Chạy `pnpm smoke:postgres` để xác minh round trip ghi-khởi động lại-đọc tồn tại.

## 9. (Tùy chọn) Seed bộ dữ liệu demo và chạy eval

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Báo cáo eval nằm trong `output/eval-reports/` dưới dạng Markdown và JSON.

## Các bước tiếp theo

- **Triển khai sản xuất** — [deployment.md](deployment.md)
- **Tham chiếu API** — [api-reference.md](api-reference.md)
- **Tìm hiểu sâu kiến trúc** — [architecture.md](architecture.md)
- **Quy trình xem xét quản trị** — xem phần `Luồng quản trị` trong
  [architecture.md](architecture.md)
- **Tính di động bộ nhớ (MIF)** — `pnpm --filter @lore/mif test` hiển thị ví dụ round-trip
- **Đóng góp** — [CONTRIBUTING.md](CONTRIBUTING.md)

## Các bẫy phổ biến

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Một process khác đang dùng port 3000 | `lsof -i :3000` để tìm nó; hoặc đặt `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Chế độ sản xuất không có `DASHBOARD_BASIC_AUTH_USER/PASS` | Export env var hoặc truyền `LORE_DASHBOARD_DISABLE_AUTH=1` (chỉ dev) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Bất kỳ env nào khớp `admin-local` / `change-me` / `demo` v.v. | Tạo giá trị thực qua `openssl rand -hex 32` |
| `429 Too Many Requests` | Giới hạn tốc độ được kích hoạt | Chờ cửa sổ cool-off (mặc định 30 giây sau 5 lỗi xác thực); hoặc đặt `LORE_RATE_LIMIT_DISABLED=1` trong dev |
| `agentmemory adapter unhealthy` | Runtime agentmemory cục bộ không chạy | Khởi động agentmemory hoặc đặt `LORE_AGENTMEMORY_REQUIRED=0` để bỏ qua yên lặng |
| MCP client thấy `-32602 Invalid params` | Đầu vào công cụ thất bại xác thực schema zod | Kiểm tra mảng `invalid_params` trong body lỗi |
| Dashboard 401 trên mọi trang | Thông tin đăng nhập Basic Auth sai | Re-export env var và khởi động lại process dashboard |

## Nhận trợ giúp

- Gửi bug: https://github.com/Lore-Context/lore-context/issues
- Tiết lộ bảo mật: xem [SECURITY.md](SECURITY.md)
- Đóng góp tài liệu: xem [CONTRIBUTING.md](CONTRIBUTING.md)
