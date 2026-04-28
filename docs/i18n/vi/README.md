<div align="center">

> 🤖 Tài liệu này được dịch máy từ bản tiếng Anh. Hoan nghênh cải thiện qua PR — xem [hướng dẫn đóng góp dịch thuật](../README.md).

# Lore Context

**Mặt phẳng điều khiển cho bộ nhớ, đánh giá và quản trị của AI agent.**

Biết chính xác những gì mỗi agent đã ghi nhớ, đã sử dụng, và cần xóa — trước khi bộ nhớ trở thành rủi ro vận hành.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Bắt đầu](getting-started.md) · [Tham chiếu API](api-reference.md) · [Kiến trúc](architecture.md) · [Tích hợp](integrations.md) · [Triển khai](deployment.md) · [Nhật ký thay đổi](CHANGELOG.md)

🌐 **Đọc tài liệu bằng ngôn ngữ của bạn**: [English](../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](./README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## Lore Context là gì

Lore Context là một **mặt phẳng điều khiển open-core** cho bộ nhớ của AI agent: nó tổng hợp ngữ cảnh từ bộ nhớ, tìm kiếm và dấu vết công cụ; đánh giá chất lượng truy xuất trên bộ dữ liệu của bạn; định tuyến xem xét quản trị cho nội dung nhạy cảm; và xuất bộ nhớ dưới dạng định dạng trao đổi di động có thể chuyển đổi giữa các backend.

Nó không cố gắng trở thành một cơ sở dữ liệu bộ nhớ khác. Giá trị độc đáo nằm ở những gì nằm trên bộ nhớ:

- **Context Query** — một endpoint duy nhất tổng hợp bộ nhớ + web + repo + dấu vết công cụ, trả về một khối ngữ cảnh đã được phân loại với nguồn gốc rõ ràng.
- **Memory Eval** — chạy Recall@K, Precision@K, MRR, tỷ lệ truy cập cũ, độ trễ p95 trên các bộ dữ liệu bạn sở hữu; lưu trữ các lần chạy và so sánh để phát hiện hồi quy.
- **Governance Review** — vòng đời sáu trạng thái (`candidate / active / flagged / redacted / superseded / deleted`), quét thẻ rủi ro, phát hiện đầu độc, nhật ký kiểm toán bất biến.
- **Tính di động kiểu MIF** — xuất/nhập JSON + Markdown với `provenance / validity / confidence / source_refs / supersedes / contradicts`. Hoạt động như định dạng di chuyển giữa các backend bộ nhớ.
- **Multi-Agent Adapter** — tích hợp `agentmemory` hạng nhất với thăm dò phiên bản + dự phòng chế độ giảm thiểu; hợp đồng adapter rõ ràng cho các runtime bổ sung.

## Khi nào nên sử dụng

| Sử dụng Lore Context khi... | Sử dụng cơ sở dữ liệu bộ nhớ (agentmemory, Mem0, Supermemory) khi... |
|---|---|
| Bạn cần **chứng minh** agent đã ghi nhớ gì, tại sao, và liệu nó có được sử dụng không | Bạn chỉ cần lưu trữ bộ nhớ thô |
| Bạn chạy nhiều agent (Claude Code, Cursor, Qwen, Hermes, Dify) và muốn ngữ cảnh đáng tin cậy được chia sẻ | Bạn đang xây dựng một agent duy nhất và chấp nhận tầng bộ nhớ gắn với nhà cung cấp |
| Bạn yêu cầu triển khai cục bộ hoặc riêng tư để tuân thủ | Bạn muốn SaaS được lưu trữ |
| Bạn cần đánh giá trên bộ dữ liệu của mình, không phải chuẩn đánh giá của nhà cung cấp | Chuẩn đánh giá của nhà cung cấp là tín hiệu đủ |
| Bạn muốn di chuyển bộ nhớ giữa các hệ thống | Bạn không có kế hoạch chuyển đổi backend |

## Bắt đầu nhanh

```bash
# 1. Clone + cài đặt
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Tạo API key thực (không sử dụng placeholder trong bất kỳ môi trường nào ngoài dev cục bộ)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. Khởi động API (dựa trên file, không cần Postgres)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Ghi bộ nhớ
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Truy vấn ngữ cảnh
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Để thiết lập đầy đủ (Postgres, Docker Compose, Dashboard, tích hợp MCP), xem [docs/getting-started.md](getting-started.md).

## Kiến trúc

```text
                       ┌─────────────────────────────────────────────┐
   MCP clients ──────► │ apps/api  (REST + auth + rate limit + logs) │
   (Claude Code,       │   ├── context router (memory/web/repo/tool) │
    Cursor, Qwen,      │   ├── context composer                      │
    Dify, Hermes...)   │   ├── governance + audit                    │
                       │   ├── eval runner                           │
                       │   └── MIF import/export                     │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adapter     packages/search
           (incremental        (version-probed,        (BM25 / hybrid
            persistence)        degraded-mode safe)     pluggable)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   protected by Basic Auth   │
                       │   memory · traces · eval    │
                       │   governance review queue   │
                       └─────────────────────────────┘
```

Để biết chi tiết, xem [docs/architecture.md](architecture.md).

## Những gì có trong v0.4.0-alpha

| Khả năng | Trạng thái | Vị trí |
|---|---|---|
| REST API với xác thực API-key (reader/writer/admin) | ✅ Sản xuất | `apps/api` |
| MCP stdio server (transport SDK legacy + chính thức) | ✅ Sản xuất | `apps/mcp-server` |
| Dashboard Next.js với HTTP Basic Auth | ✅ Sản xuất | `apps/dashboard` |
| Postgres + pgvector lưu trữ tăng dần | ✅ Tùy chọn | `apps/api/src/db/` |
| Máy trạng thái quản trị + nhật ký kiểm toán | ✅ Sản xuất | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Sản xuất | `packages/eval` |
| Nhập/xuất MIF v0.2 với `supersedes` + `contradicts` | ✅ Sản xuất | `packages/mif` |
| Adapter `agentmemory` với thăm dò phiên bản + chế độ giảm thiểu | ✅ Sản xuất | `packages/agentmemory-adapter` |
| Giới hạn tốc độ (per-IP + per-key với backoff) | ✅ Sản xuất | `apps/api` |
| Ghi nhật ký JSON có cấu trúc với che giấu trường nhạy cảm | ✅ Sản xuất | `apps/api/src/logger.ts` |
| Triển khai riêng tư Docker Compose | ✅ Sản xuất | `docker-compose.yml` |
| Bộ dữ liệu demo + smoke test + UI test Playwright | ✅ Sản xuất | `examples/`, `scripts/` |
| Đồng bộ cloud đa tenant được lưu trữ | ⏳ Lộ trình | — |

Xem [CHANGELOG.md](CHANGELOG.md) để biết ghi chú phát hành đầy đủ v0.4.0-alpha.

## Tích hợp

Lore Context hỗ trợ MCP và REST và tích hợp với hầu hết các IDE agent và giao diện chat:

| Công cụ | Hướng dẫn thiết lập |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../integrations/openwebui.md) |
| Khác / MCP chung | [integrations.md](integrations.md) |

## Triển khai

| Chế độ | Khi nào dùng | Tài liệu |
|---|---|---|
| **File cục bộ** | Dev solo, prototype, smoke test | README này, Bắt đầu nhanh ở trên |
| **Postgres+pgvector cục bộ** | Node đơn cấp sản xuất, tìm kiếm ngữ nghĩa quy mô lớn | [deployment.md](deployment.md) |
| **Docker Compose riêng tư** | Triển khai nhóm tự lưu trữ, mạng cách ly | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Được quản lý trên cloud** | Ra mắt trong v0.6 | — |

Tất cả các đường triển khai đều yêu cầu secrets rõ ràng: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. Script `scripts/check-env.mjs` từ chối khởi động sản xuất nếu bất kỳ giá trị nào khớp với mẫu placeholder.

## Bảo mật

v0.4.0-alpha triển khai tư thế phòng thủ theo chiều sâu phù hợp cho các triển khai alpha không công khai:

- **Xác thực**: Bearer token API-key với phân tách vai trò (`reader`/`writer`/`admin`) và phạm vi theo dự án. Chế độ không có key thất bại đóng trong sản xuất.
- **Giới hạn tốc độ**: Thùng kép per-IP + per-key với backoff khi xác thực thất bại (429 sau 5 lần thất bại trong 60 giây, khóa 30 giây).
- **Dashboard**: Phần mềm trung gian HTTP Basic Auth. Từ chối khởi động trong sản xuất nếu không có `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Container**: Tất cả Dockerfile chạy với user `node` không phải root; HEALTHCHECK trên api + dashboard.
- **Secrets**: Không có thông tin đăng nhập hardcode; tất cả giá trị mặc định là biến bắt buộc-hoặc-thất bại. `scripts/check-env.mjs` từ chối các giá trị placeholder trong sản xuất.
- **Quản trị**: Quét regex PII / API key / JWT / private-key khi ghi; nội dung được gắn thẻ rủi ro tự động định tuyến đến hàng đợi xem xét; nhật ký kiểm toán bất biến trên mọi chuyển đổi trạng thái.
- **Đầu độc bộ nhớ**: Phát hiện heuristic trên mẫu đồng thuận + động từ mệnh lệnh.
- **MCP**: Xác thực schema zod trên mọi đầu vào công cụ; công cụ thay đổi yêu cầu `reason` (≥8 ký tự) và hiển thị `destructiveHint: true`; lỗi upstream được làm sạch trước khi trả về client.
- **Ghi nhật ký**: JSON có cấu trúc với tự động che giấu các trường `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Tiết lộ lỗ hổng: [SECURITY.md](SECURITY.md).

## Cấu trúc dự án

```text
apps/
  api/                # REST API + Postgres + governance + eval (TypeScript)
  dashboard/          # Dashboard Next.js 16 với phần mềm trung gian Basic Auth
  mcp-server/         # MCP stdio server (transport SDK legacy + chính thức)
  web/                # Bộ render HTML phía server (UI dự phòng không-JS)
  website/            # Trang marketing (xử lý riêng)
packages/
  shared/             # Kiểu dùng chung, lỗi, tiện ích ID/token
  agentmemory-adapter # Cầu nối đến agentmemory upstream + thăm dò phiên bản
  search/             # Nhà cung cấp tìm kiếm có thể cắm (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + nguyên thủy chỉ số
  governance/         # Máy trạng thái + quét rủi ro + phát hiện đầu độc + kiểm toán
docs/
  i18n/<lang>/        # README đã được bản địa hóa trong 17 ngôn ngữ
  integrations/       # 11 hướng dẫn tích hợp IDE agent
  deployment/         # Cục bộ + Postgres + Docker Compose
  legal/              # Riêng tư / Điều khoản / Cookie (luật Singapore)
scripts/
  check-env.mjs       # Xác thực env chế độ sản xuất
  smoke-*.mjs         # Smoke test end-to-end
  apply-postgres-schema.mjs
```

## Yêu cầu

- Node.js `>=22`
- pnpm `10.30.1`
- (Tùy chọn) Postgres 16 với pgvector cho bộ nhớ cấp tìm kiếm ngữ nghĩa

## Đóng góp

Chào đón các đóng góp. Vui lòng đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết quy trình phát triển, giao thức commit message và kỳ vọng xem xét.

Để dịch tài liệu, xem [hướng dẫn đóng góp i18n](../../i18n/README.md).

## Vận hành bởi

Lore Context được vận hành bởi **REDLAND PTE. LTD.** (Singapore, UEN 202304648K). Hồ sơ công ty, điều khoản pháp lý và xử lý dữ liệu được ghi lại trong [`docs/legal/`](../../legal/).

## Giấy phép

Kho lưu trữ Lore Context được cấp phép theo [Apache License 2.0](../../../LICENSE). Các gói riêng lẻ trong `packages/*` khai báo MIT để cho phép sử dụng xuôi dòng. Xem [NOTICE](../../../NOTICE) để biết ghi nhận nguồn gốc upstream.

## Lời cảm ơn

Lore Context được xây dựng dựa trên [agentmemory](https://github.com/agentmemory/agentmemory) như một runtime bộ nhớ cục bộ. Chi tiết hợp đồng upstream và chính sách tương thích phiên bản được ghi lại trong [UPSTREAM.md](../../../UPSTREAM.md).
