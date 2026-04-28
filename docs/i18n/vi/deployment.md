> 🤖 Tài liệu này được dịch máy từ bản tiếng Anh. Hoan nghênh cải thiện qua PR — xem [hướng dẫn đóng góp dịch thuật](../README.md).

# Triển khai riêng tư

> **Tạo key với `openssl rand -hex 32` — đừng bao giờ sử dụng các placeholder bên dưới trong sản xuất.**

Phần này đóng gói Lore cho một demo riêng tư hoặc triển khai nhóm nội bộ mà không thay đổi các đường code ứng dụng. Bundle triển khai bao gồm:

- `apps/api/Dockerfile`: Image REST API.
- `apps/dashboard/Dockerfile`: Image dashboard Next.js độc lập.
- `Dockerfile`: Image launcher MCP tùy chọn cho client stdio.
- `docs/deployment/compose.private-demo.yml`: Stack compose copy-paste cho Postgres, API, dashboard và dịch vụ MCP theo yêu cầu.
- `examples/demo-dataset/**`: Dữ liệu seed cho các luồng file-store, nhập và eval.

## Topology được khuyến nghị

- `postgres`: Store bền vững cho demo chia sẻ hoặc đa vận hành viên.
- `api`: Lore REST API trên mạng bridge nội bộ, mặc định được publish lên loopback.
- `dashboard`: UI vận hành viên, mặc định được publish lên loopback và proxy đến API qua `LORE_API_URL`.
- `mcp`: Container stdio tùy chọn cho các vận hành viên Claude, Cursor và Qwen muốn launcher được containerize thay vì `node apps/mcp-server/dist/index.js` trên host.

Stack compose cố tình giữ cho exposure công khai hẹp. Postgres, API và dashboard đều bind lên `127.0.0.1` mặc định qua các port mapping được biến hóa.

## Kiểm tra trước

1. Sao chép `.env.example` vào một file runtime riêng tư như `.env.private`.
2. Thay thế `POSTGRES_PASSWORD`.
3. Ưu tiên `LORE_API_KEYS` thay vì một `LORE_API_KEY` đơn lẻ.
4. Đặt `DASHBOARD_LORE_API_KEY` thành key `admin` cho quy trình vận hành viên đầy đủ, hoặc key `reader` theo phạm vi cho demo chỉ đọc. Đặt `MCP_LORE_API_KEY` thành key `writer` hoặc `reader` tùy thuộc vào việc client có nên thay đổi bộ nhớ không.

Ví dụ phân tách vai trò:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
```

## Khởi động Stack

Build và khởi động stack demo riêng tư từ root repo:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Kiểm tra sức khỏe:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Seed dữ liệu demo

Cho stack compose được hỗ trợ bởi Postgres, nhập các bộ nhớ demo đã đóng gói sau khi API sức khỏe:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Chạy request eval đã đóng gói:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Nếu bạn muốn demo single-host không có cơ sở dữ liệu, hãy trỏ API đến snapshot file-store:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Mẫu Launcher MCP

Mẫu ưa thích:

- Chạy launcher MCP gần với client.
- Trỏ `LORE_API_URL` đến URL API riêng tư.
- Cung cấp API key nhỏ nhất phù hợp cho launcher.

Launcher dựa trên host:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Launcher được containerize:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Launcher được containerize hữu ích cho thiết lập workstation có thể tái tạo, nhưng nó vẫn là
một process stdio, không phải dịch vụ mạng công khai tồn tại lâu dài.

## Mặc định bảo mật

- Giữ `API_BIND_HOST`, `DASHBOARD_BIND_HOST` và `POSTGRES_BIND_HOST` trên `127.0.0.1` trừ khi một reverse proxy đã được xác thực đã ở trước stack.
- Ưu tiên `LORE_API_KEYS` với phân tách `reader` / `writer` / `admin` thay vì tái sử dụng một admin key toàn cục duy nhất ở mọi nơi.
- Sử dụng key theo phạm vi dự án cho client demo. ID dự án demo đã đóng gói là `demo-private`.
- Giữ `AGENTMEMORY_URL` trên loopback và đừng expose `agentmemory` thô trực tiếp.
- Để `LORE_AGENTMEMORY_REQUIRED=0` trừ khi triển khai riêng tư thực sự phụ thuộc vào runtime agentmemory trực tiếp.
- Giữ `LORE_POSTGRES_AUTO_SCHEMA=true` chỉ cho các môi trường nội bộ được kiểm soát. Một khi bootstrapping schema là một phần của quy trình phát hành, bạn có thể pin nó thành `false`.

## Các file để tái sử dụng

- Mẫu Compose: [compose.private-demo.yml](../../../docs/deployment/compose.private-demo.yml)
- Image API: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Image Dashboard: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- Image MCP: [Dockerfile](../../../Dockerfile)
- Dữ liệu demo: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
