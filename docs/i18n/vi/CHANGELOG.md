> 🤖 Tài liệu này được dịch máy từ bản tiếng Anh. Hoan nghênh cải thiện qua PR — xem [hướng dẫn đóng góp dịch thuật](../README.md).

# Nhật ký thay đổi

Tất cả các thay đổi đáng chú ý của Lore Context được ghi lại ở đây. Định dạng dựa trên
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) và dự án này
tuân thủ [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v0.4.0-alpha] — 2026-04-28

Alpha công khai đầu tiên. Kết thúc sprint tăng cường sản xuất đã biến
MVP bị kiểm toán thất bại thành release-candidate alpha. Tất cả P0 audit item đã được xử lý, 12 trong số 13 P1 item
đã được xử lý (một phần — xem Ghi chú), 117+ test đang pass, toàn bộ monorepo build sạch.

### Đã thêm

- **`packages/eval/src/runner.ts`** — `EvalRunner` thực tế (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). Eval giờ có thể chạy đánh giá truy xuất end-to-end trên
  bộ dữ liệu của người dùng và lưu trữ các lần chạy dưới dạng JSON để phát hiện hồi quy theo thời gian.
- **`packages/governance/src/state.ts`** — máy trạng thái quản trị sáu trạng thái
  (`candidate / active / flagged / redacted / superseded / deleted`) với bảng chuyển đổi hợp pháp rõ ràng. Các chuyển đổi bất hợp pháp sẽ throw.
- **`packages/governance/src/audit.ts`** — helper append nhật ký kiểm toán bất biến tích hợp
  với kiểu `AuditLog` của `@lore/shared`.
- **`packages/governance/detectPoisoning`** — heuristic phát hiện đầu độc bộ nhớ
  sử dụng ưu thế cùng nguồn (>80%) và khớp mẫu động từ mệnh lệnh.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — thăm dò phiên bản upstream
  dựa trên semver với so sánh tự viết tay (không có phụ thuộc mới). Tuân thủ
  `LORE_AGENTMEMORY_REQUIRED=0` cho chế độ giảm thiểu bỏ qua yên lặng.
- **`packages/mif`** — các trường `supersedes: string[]` và `contradicts: string[]` được thêm
  vào `LoreMemoryItem`. Round-trip được bảo toàn qua cả định dạng JSON và Markdown.
- **`apps/api/src/logger.ts`** — logger JSON có cấu trúc với tự động che giấu
  các trường nhạy cảm (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). `requestId` chảy qua mọi request.
- **`apps/dashboard/middleware.ts`** — phần mềm trung gian HTTP Basic Auth. Khởi động sản xuất
  từ chối bắt đầu nếu không có `DASHBOARD_BASIC_AUTH_USER` và `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — validator env chế độ sản xuất. Từ chối khởi động
  ứng dụng nếu bất kỳ giá trị env nào khớp mẫu placeholder (`read-local`,
  `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Giới hạn tốc độ** — bộ giới hạn token thùng kép per-IP và per-key với backoff khi xác thực thất bại
  (5 lần thất bại trong 60 giây → khóa 30 giây → phản hồi 429). Có thể cấu hình qua
  `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`.
- **Tắt máy nhẹ nhàng** — xử lý SIGTERM/SIGINT drain các request đang bay trong tối đa 10 giây,
  flush các ghi Postgres đang chờ, đóng pool, buộc thoát ở 15 giây.
- **Chỉ mục cơ sở dữ liệu** — Chỉ mục B-tree trên `(project_id)` / `(status)` /
  `(created_at)` cho `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. Chỉ mục GIN trên jsonb `content` và `metadata`.
- **Xác thực đầu vào zod MCP** — mọi công cụ MCP giờ chạy `safeParse` với
  schema zod per-tool; lỗi trả về JSON-RPC `-32602` với danh sách vấn đề đã làm sạch.
- **MCP `destructiveHint` + `reason` bắt buộc** — mọi công cụ thay đổi
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) yêu cầu một
  `reason` ít nhất 8 ký tự và hiển thị `destructiveHint: true`.
- 117+ test case mới trên `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Tài liệu đa ngôn ngữ: README trong 17 ngôn ngữ trong `docs/i18n/<lang>/`.
- `CHANGELOG.md` (file này).
- `docs/getting-started.md` — hướng dẫn khởi động nhanh cho developer trong 5 phút.
- `docs/api-reference.md` — tham chiếu endpoint REST API.
- `docs/i18n/README.md` — hướng dẫn đóng góp dịch thuật.

### Đã thay đổi

- **`packages/mif`** phiên bản envelope `"0.1"` → `"0.2"`. Import tương thích ngược.
- **`LORE_POSTGRES_AUTO_SCHEMA`** mặc định `true` → `false`. Các triển khai sản xuất
  phải opt-in rõ ràng vào auto-apply schema hoặc chạy `pnpm db:schema`.
- **`apps/api`** body parser request giờ là streaming với giới hạn kích thước payload cứng
  (`LORE_MAX_JSON_BYTES`, mặc định 1 MiB). Request quá lớn trả về 413.
- **Xác thực Loopback** đã thay đổi: loại bỏ phụ thuộc vào header URL `Host`; phát hiện loopback
  giờ chỉ sử dụng `req.socket.remoteAddress`. Trong sản xuất không có API key
  được cấu hình, API thất bại đóng và từ chối request (trước đây: im lặng cấp admin).
- **API key theo phạm vi** giờ phải cung cấp `project_id` cho `/v1/memory/list`,
  `/v1/eval/run`, và `/v1/memory/import` (trước đây: `project_id` undefined bị bỏ qua).
- **Tất cả Dockerfile** giờ chạy với user `node` không phải root. `apps/api/Dockerfile` và
  `apps/dashboard/Dockerfile` khai báo `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` giờ sử dụng `${POSTGRES_PASSWORD:?must
  be set}` — khởi động thất bại nhanh nếu không có mật khẩu rõ ràng.
- **`docs/deployment/compose.private-demo.yml`** — cùng mẫu bắt buộc-hoặc-thất bại.
- **`.env.example`** — tất cả giá trị mặc định demo đã bị xóa và thay thế bằng placeholder `# REQUIRED`.
  Biến mới được ghi lại cho giới hạn tốc độ, request timeout, giới hạn payload,
  chế độ bắt buộc agentmemory, basic auth dashboard.

### Đã sửa

- **Lỗ hổng bypass auth Loopback** (P0). Kẻ tấn công có thể gửi `Host: 127.0.0.1`
  để giả mạo phát hiện loopback và lấy role admin mà không cần API key.
- **Confused-deputy trong dashboard proxy** (P0). Dashboard proxy inject
  `LORE_API_KEY` cho các request không được xác thực, cấp quyền admin cho bất kỳ ai
  có thể tiếp cận port 3001.
- **Phòng thủ brute-force** (P0). Key demo (`admin-local`, `read-local`, `write-local`)
  hiển thị trong README/`.env.example` có thể bị liệt kê vô tận; giới hạn tốc độ và
  xóa các giá trị mặc định giờ bảo vệ chống lại điều này.
- **JSON parse crash với `LORE_API_KEYS` dị dạng** — process giờ thoát với lỗi rõ ràng
  thay vì ném stack trace.
- **OOM qua body request lớn** — body vượt giới hạn đã cấu hình giờ trả về 413
  thay vì làm crash Node process.
- **Rò rỉ lỗi MCP** — lỗi API upstream bao gồm SQL thô, đường dẫn file, hoặc
  stack trace giờ được làm sạch thành `{code, generic-message}` trước khi tiếp cận MCP client.
- **Dashboard JSON parse crash** — phản hồi JSON không hợp lệ không còn làm crash UI;
  các lỗi được hiển thị dưới dạng trạng thái hiển thị với người dùng.
- **MCP `memory_update` / `memory_supersede`** trước đây không yêu cầu `reason`;
  điều này giờ được thi hành bởi schema zod.
- **Postgres pool**: `statement_timeout` giờ được đặt thành 15 giây; trước đây có rủi ro
  query-time không giới hạn dưới các truy vấn jsonb dị dạng.

### Bảo mật

- Tất cả P0 audit finding (bypass loopback / auth dashboard / giới hạn tốc độ / secret demo)
  đã được xử lý. Xem `Lore_Context_项目计划书_2026-04-27.md` và
  `.omc/plans/lore-prelaunch-fixes-2026-04-28.md` để biết audit trail đầy đủ.
- `pnpm audit --prod` báo cáo không có lỗ hổng đã biết tại thời điểm phát hành.
- Thông tin đăng nhập demo đã bị xóa khỏi tất cả template triển khai và README ví dụ.
- Image container giờ chạy mặc định không phải root.

### Ghi chú / Hạn chế đã biết

- **P1-1 một phần**: `/v1/context/query` giữ lại hành vi key theo phạm vi dễ dãi để
  tránh phá vỡ test consumer hiện có. Các route khác bị ảnh hưởng (`/v1/memory/list`,
  `/v1/eval/run`, `/v1/memory/import`) thi hành `project_id`. Được theo dõi cho v0.5.
- **Đồng bộ cloud đa tenant được lưu trữ** chưa được triển khai trong v0.4.0-alpha. Chỉ triển khai
  cục bộ và Compose-private.
- **Chất lượng dịch thuật**: Các bản địa hóa README được tạo bởi LLM và được dán nhãn rõ ràng;
  PR cộng đồng để tinh chỉnh từng locale được chào đón (xem
  [`docs/i18n/README.md`](../../i18n/README.md)).
- **Spec OpenAPI / Swagger** chưa được đóng gói. Bề mặt REST được ghi lại dưới dạng
  prose trong [`docs/api-reference.md`](../../api-reference.md). Được theo dõi cho v0.5.

### Lời cảm ơn

Bản phát hành này là kết quả của một sprint tăng cường sản xuất trong một ngày liên quan đến
thực thi sub-agent song song dựa trên kế hoạch kiểm toán có cấu trúc. Kế hoạch và artifact kiểm toán
được lưu trữ trong `.omc/plans/`.

## [v0.0.0] — pre-release

Các cột mốc phát triển nội bộ, chưa được phát hành công khai. Đã triển khai:

- Scaffold gói workspace (TypeScript monorepo, pnpm workspaces).
- Pipeline build/test TypeScript dùng chung.
- Hệ thống kiểu bộ nhớ / ngữ cảnh / eval / kiểm toán trong `@lore/shared`.
- Ranh giới adapter `agentmemory`.
- REST API cục bộ với context router và composer.
- Lưu trữ file JSON + runtime store Postgres tùy chọn với upsert tăng dần.
- Luồng chi tiết / chỉnh sửa / supersede / forget bộ nhớ với hard delete rõ ràng.
- Kế toán sử dụng bộ nhớ thực tế (`useCount`, `lastUsedAt`).
- Phản hồi trace (`useful` / `wrong` / `outdated` / `sensitive`).
- Nhập/xuất JSON + Markdown kiểu MIF với các trường quản trị.
- Bộ regex quét secret.
- Chỉ số eval trực tiếp dựa trên session; eval so sánh nhà cung cấp; liệt kê lần chạy eval.
- Bảo vệ API-key với phân tách vai trò reader/writer/admin.
- Hàng đợi xem xét quản trị; API nhật ký kiểm toán.
- Dashboard HTML phục vụ API; dashboard Next.js độc lập.
- Dữ liệu seed demo; tạo cấu hình tích hợp.
- Đóng gói Docker/Compose riêng tư.
- Transport stdio MCP legacy + SDK chính thức.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
