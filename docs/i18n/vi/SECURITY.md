> 🤖 Tài liệu này được dịch máy từ bản tiếng Anh. Hoan nghênh cải thiện qua PR — xem [hướng dẫn đóng góp dịch thuật](../README.md).

# Chính sách bảo mật

Lore Context xử lý bộ nhớ, dấu vết, nhật ký kiểm toán và thông tin đăng nhập tích hợp. Hãy
coi các báo cáo bảo mật là ưu tiên cao.

## Báo cáo lỗ hổng

Đừng mở issue công khai cho các lỗ hổng nghi ngờ, secret bị rò rỉ, bypass xác thực,
lộ lộ dữ liệu hoặc các vấn đề cách ly tenant.

Đường báo cáo ưa thích:

1. Sử dụng **báo cáo lỗ hổng riêng tư GitHub** cho kho lưu trữ này khi có sẵn.
2. Nếu báo cáo riêng tư không có sẵn, hãy liên hệ với người duy trì riêng tư và
   bao gồm:
   - phiên bản hoặc commit bị ảnh hưởng,
   - các bước tái tạo,
   - tác động dự kiến,
   - liệu có liên quan secret thực sự hoặc dữ liệu cá nhân không.

Chúng tôi hướng đến xác nhận các báo cáo có giá trị trong vòng 72 giờ.

## Các phiên bản được hỗ trợ

Lore Context hiện là phần mềm alpha pre-1.0. Các bản vá bảo mật nhắm vào nhánh `main`
trước. Các bản phát hành được gắn thẻ có thể nhận được các bản vá có mục tiêu khi một bản phát hành công khai đang
được các nhà vận hành hạ nguồn sử dụng tích cực.

| Phiên bản | Được hỗ trợ |
|---|---|
| v0.4.x-alpha | ✅ Đang hoạt động |
| v0.3.x và cũ hơn | ❌ Chỉ pre-release nội bộ |

## Tăng cường tích hợp (v0.4.0-alpha)

Alpha được trang bị các biện pháp kiểm soát phòng thủ theo chiều sâu sau đây. Các nhà vận hành nên
xác minh những điều này đang hoạt động trong triển khai của họ.

### Xác thực

- **Bearer token API-key** (`Authorization: Bearer <key>` hoặc
  header `x-lore-api-key`).
- **Phân tách vai trò**: `reader` / `writer` / `admin`.
- **Phạm vi theo dự án**: Các entry JSON trong `LORE_API_KEYS` có thể bao gồm
  allow-list `projectIds: ["..."]`; các thay đổi yêu cầu `project_id` khớp.
- **Chế độ không có key thất bại đóng trong sản xuất**: với `NODE_ENV=production` và không có
  key được cấu hình, API từ chối tất cả request.
- **Bypass loopback đã bị xóa**: các phiên bản trước tin tưởng `Host: 127.0.0.1`; v0.4 sử dụng
  địa chỉ remote ở cấp socket.

### Giới hạn tốc độ

- **Bộ giới hạn thùng kép per-IP và per-key** với backoff khi xác thực thất bại.
- **Mặc định**: 60 req/phút per IP cho các đường không xác thực, 600 req/phút per key được xác thực.
- **5 lần xác thực thất bại trong 60 giây → khóa 30 giây** (trả về 429).
- Có thể cấu hình: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (chỉ dev).

### Bảo vệ Dashboard

- **Phần mềm trung gian HTTP Basic Auth** (`apps/dashboard/middleware.ts`).
- **Khởi động sản xuất từ chối bắt đầu** nếu không có
  `DASHBOARD_BASIC_AUTH_USER` và `DASHBOARD_BASIC_AUTH_PASS`.
- `LORE_DASHBOARD_DISABLE_AUTH=1` chỉ được chấp nhận ngoài sản xuất.
- Dự phòng admin-key phía server **đã bị xóa**: người dùng phải được xác thực qua
  Basic Auth trước khi dashboard proxy inject thông tin đăng nhập API upstream.

### Tăng cường Container

- Tất cả Dockerfile chạy với user `node` không phải root.
- `apps/api/Dockerfile` và `apps/dashboard/Dockerfile` khai báo `HEALTHCHECK`
  trên `/health`.
- `apps/mcp-server` chỉ là stdio — không có network listener — và không khai báo
  `HEALTHCHECK`.

### Quản lý Secret

- **Không có thông tin đăng nhập hardcode.** Tất cả `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml`, và các giá trị mặc định `.env.example` sử dụng
  dạng `${VAR:?must be set}` — khởi động thất bại nhanh nếu không có giá trị rõ ràng.
- `scripts/check-env.mjs` từ chối các giá trị placeholder
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) khi `NODE_ENV=production`.
- Tất cả tài liệu triển khai và README ví dụ đã được làm sạch các thông tin đăng nhập demo trực tiếp.

### Quản trị

- **Quét thẻ rủi ro trên mọi lần ghi bộ nhớ**: API key, AWS key, JWT token,
  private key, mật khẩu, email, số điện thoại được phát hiện.
- **Máy trạng thái sáu trạng thái** với bảng chuyển đổi hợp pháp rõ ràng; các chuyển đổi bất hợp pháp throw.
- **Heuristic đầu độc bộ nhớ**: ưu thế cùng nguồn + khớp mẫu động từ mệnh lệnh
  → cờ `suspicious`.
- **Nhật ký kiểm toán bất biến** được append trên mọi chuyển đổi trạng thái.
- Nội dung rủi ro cao tự động định tuyến đến `candidate` / `flagged` và giữ lại khỏi
  tổng hợp ngữ cảnh cho đến khi được xem xét.

### Tăng cường MCP

- Mọi đầu vào công cụ MCP đều được **xác thực với schema zod** trước khi gọi.
  Lỗi xác thực trả về JSON-RPC `-32602` với danh sách vấn đề đã làm sạch.
- **Tất cả công cụ thay đổi** yêu cầu chuỗi `reason` ít nhất 8 ký tự và
  hiển thị `destructiveHint: true` trong schema của chúng.
- Lỗi API upstream được **làm sạch** trước khi trả về cho MCP client —
  SQL thô, đường dẫn file và stack trace bị làm sạch.

### Ghi nhật ký

- **Đầu ra JSON có cấu trúc** với tương quan `requestId` qua chuỗi xử lý.
- **Tự động che giấu** các trường khớp với `content`, `query`, `memory`, `value`,
  `password`, `secret`, `token`, `key`. Nội dung thực tế của bản ghi bộ nhớ và
  truy vấn không bao giờ được ghi vào nhật ký.

### Ranh giới dữ liệu

- Adapter `agentmemory` thăm dò phiên bản upstream khi init và cảnh báo về
  không tương thích. `LORE_AGENTMEMORY_REQUIRED=0` chuyển adapter sang chế độ giảm thiểu yên lặng
  nếu upstream không thể tiếp cận.
- Body parser của `apps/api` thi hành giới hạn `LORE_MAX_JSON_BYTES` (mặc định 1
  MiB); các request quá lớn trả về 413.
- Connection pool Postgres đặt `statement_timeout: 15000` để giới hạn thời gian truy vấn.
- `LORE_REQUEST_TIMEOUT_MS` (mặc định 30 giây) giới hạn mọi request handler;
  timeout trả về 504.

## Hướng dẫn triển khai

- Đừng expose Lore từ xa mà không cấu hình `LORE_API_KEYS`.
- Ưu tiên **phân tách vai trò** `reader` / `writer` / `admin` key.
- **Luôn đặt** `DASHBOARD_BASIC_AUTH_USER` và `DASHBOARD_BASIC_AUTH_PASS` trong
  sản xuất.
- **Tạo key với `openssl rand -hex 32`**. Đừng bao giờ sử dụng các giá trị placeholder
  được hiển thị trong ví dụ.
- Giữ các endpoint `agentmemory` thô là riêng tư; chỉ truy cập chúng qua Lore.
- Giữ dashboard, quản trị, nhập/xuất, đồng bộ và các route kiểm toán sau một
  lớp kiểm soát truy cập mạng (Cloudflare Access, AWS ALB, Tailscale ACL,
  tương tự) cho bất kỳ exposure nào không phải loopback.
- **Chạy `node scripts/check-env.mjs` trước khi khởi động API trong sản xuất.**
- **Đừng bao giờ commit** file `.env` sản xuất, API key nhà cung cấp, thông tin đăng nhập cloud,
  dữ liệu eval chứa nội dung khách hàng, hoặc xuất bộ nhớ riêng tư.

## Dòng thời gian tiết lộ

Đối với các lỗ hổng có tác động cao đã xác nhận:

- 0 ngày: báo cáo được xác nhận.
- 7 ngày: phân loại và phân loại mức độ nghiêm trọng được chia sẻ với người báo cáo.
- 30 ngày: tiết lộ công khai có phối hợp (hoặc được gia hạn theo thỏa thuận chung).
- 30+ ngày: phát hành CVE cho mức độ nghiêm trọng trung bình trở lên nếu có thể áp dụng.

Đối với các vấn đề mức độ thấp hơn, hãy mong đợi giải quyết trong lần phát hành nhỏ tiếp theo.

## Lộ trình tăng cường

Các mục được lên kế hoạch cho các bản phát hành tiếp theo:

- **v0.5**: Spec OpenAPI / Swagger; CI tích hợp `pnpm audit --high`,
  phân tích tĩnh CodeQL và dependabot.
- **v0.6**: Image container được ký bởi Sigstore, nguồn gốc SLSA, npm publish qua
  GitHub OIDC thay vì token tồn tại lâu dài.
- **v0.7**: Mã hóa lúc nghỉ cho nội dung bộ nhớ được gắn cờ `risk_tags` qua mã hóa phong bì KMS.
