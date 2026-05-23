<div align="center">

# Lore Context

**Mặt phẳng điều khiển cho bộ nhớ, đánh giá và quản trị tác nhân AI.**

Biết những gì mỗi tác nhân đã ghi nhớ, sử dụng và nên quên — trước khi bộ nhớ trở thành rủi ro sản xuất.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Bắt đầu](../../getting-started.md) · [Quickstart trên Website](https://lorecontext.com/quickstart/) · [Phương pháp Benchmark](https://lorecontext.com/benchmark/) · [Tham chiếu API](../../api-reference.md) · [Kiến trúc](../../architecture.md) · [Kế hoạch Dự án](../../project-plan.md) · [Trạng thái Phát hành](../../release-status.md) · [Lộ trình](../../roadmap.md) · [Tích hợp](../../integrations/README.md) · [Triển khai](../../deployment/README.md) · [Nhật ký thay đổi](../../../CHANGELOG.md)

🌐 **Đọc tài liệu này bằng ngôn ngữ của bạn**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Các tài liệu đã bản địa hóa có thể chưa cập nhật so với ghi chú phát hành tiếng Anh hiện tại; tài liệu chuẩn cho v2.1 là README tiếng Anh và bộ `docs/`.

</div>

---

> Tài liệu này được dịch máy từ bản tiếng Anh, có thể chưa phản ánh bản phát hành mới nhất. PR luôn được chào đón — xem [hướng dẫn đóng góp bản dịch](../README.md).

## Lore Context là gì

Lore Context là một **mặt phẳng điều khiển mã nguồn mở cốt lõi** cho bộ nhớ tác nhân AI: nó kết hợp ngữ cảnh từ bộ nhớ, tìm kiếm, đồ thị kho lưu trữ và nhật ký công cụ; đánh giá chất lượng truy xuất trên dữ liệu của bạn; định tuyến đánh giá quản trị cho nội dung nhạy cảm; và xuất bộ nhớ dưới dạng định dạng trao đổi di động mà bạn có thể chuyển giữa các backend.

Nó không cố gắng trở thành một cơ sở dữ liệu bộ nhớ khác. Giá trị độc đáo nằm ở những gì đặt trên bộ nhớ:

- **Context Query** — endpoint duy nhất kết hợp bộ nhớ + web + repo + nhật ký công cụ, trả về khối ngữ cảnh được phân loại với nguồn gốc.
- **Memory Eval** — chạy Recall@K, Precision@K, MRR, stale-hit-rate, độ trễ p95 trên các tập dữ liệu bạn sở hữu; lưu trữ các lần chạy và so sánh chúng để phát hiện hồi quy.
- **Governance Review** — vòng đời sáu trạng thái (`candidate / active / flagged / redacted / superseded / deleted`), quét thẻ rủi ro, heuristic đầu độc, nhật ký kiểm tra bất biến.
- **Khả năng di động giống MIF** — xuất/nhập JSON + Markdown bảo toàn `provenance / validity / confidence / source_refs / supersedes / contradicts`. Hoạt động như định dạng di chuyển giữa các backend bộ nhớ.
- **Repo Graph** — lập chỉ mục kho lưu trữ xác định (tệp, ký hiệu, nhập khẩu, lệnh gọi, tuyến đường, kiểm tra) được hiển thị dưới dạng các tuyến API và công cụ MCP chỉ đọc để các tác nhân căn cứ câu trả lời kho lưu trữ vào hợp đồng ngữ cảnh dự án ổn định.
- **Multi-Agent Adapter** — tích hợp `agentmemory` hạng nhất với kiểm tra phiên bản + dự phòng chế độ giảm chức năng; hợp đồng adapter sạch cho các runtime bổ sung.

## Khi nào nên sử dụng

| Dùng Lore Context khi... | Dùng cơ sở dữ liệu bộ nhớ (agentmemory, Mem0, Supermemory) khi... |
|---|---|
| Bạn cần **chứng minh** tác nhân của mình đã nhớ gì, tại sao và liệu nó có được sử dụng không | Bạn chỉ cần lưu trữ bộ nhớ thô |
| Bạn chạy nhiều tác nhân (Claude Code, Cursor, Qwen, Hermes, Dify) và muốn ngữ cảnh đáng tin cậy được chia sẻ | Bạn đang xây dựng một tác nhân duy nhất và OK với tầng bộ nhớ bị khóa nhà cung cấp |
| Bạn yêu cầu triển khai cục bộ hoặc riêng tư để tuân thủ | Bạn thích SaaS được lưu trữ |
| Bạn cần đánh giá trên tập dữ liệu của riêng mình, không phải benchmark của nhà cung cấp | Benchmark của nhà cung cấp là tín hiệu đủ |
| Bạn muốn di chuyển bộ nhớ giữa các hệ thống | Bạn không có kế hoạch chuyển đổi backend |

## Bắt đầu nhanh

```bash
# 1. Clone + cài đặt
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Chạy trình trợ giúp quickstart và kiểm tra báo cáo kích hoạt
pnpm quickstart -- --dry-run --activation-report

# 3. Tạo API key thực (không dùng placeholder trong bất kỳ môi trường nào ngoài dev chỉ cục bộ)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Khởi động API (dựa trên tệp, không cần Postgres)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Ghi một bộ nhớ
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Truy vấn ngữ cảnh, sau đó kiểm tra traceId được trả về trong Evidence Ledger
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Để xem quickstart trên website công khai, hãy truy cập
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Để thiết lập
đầy đủ (Postgres, Docker Compose, Dashboard, tích hợp MCP), xem
[docs/getting-started.md](../../getting-started.md).

Quickstart alpha chính thức là `git clone` + `pnpm quickstart`. Lore hiện
không xuất bản hay tuyên bố gói npm `@lore-context/quickstart` công khai.
Server MCP stdio được xuất bản riêng là
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
để phân phối registry và client, và middleware SDK được phát hành là
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) và `lore-context-middleware` (PyPI).

Để khám phá qua AI, website xuất bản `/llms.txt` và `/llms-full.txt`
chỉ từ tài liệu công khai. Mục nhập MCP Registry Chính thức đã được xuất bản,
và các bản thảo phân phối bổ sung nằm trong [docs/distribution](../../distribution/).
Bản thảo ra mắt nằm trong [docs/launch](../../launch/), và tiếp nhận đối tác thiết kế
trong [docs/design-partners](../../design-partners/). Trang benchmark công khai
là phương pháp có thể tái tạo và báo cáo chạy thử nhỏ, không phải tuyên bố
chiến thắng benchmark cạnh tranh.

## Kiến trúc

```text
                       ┌───────────────────────────────────────────────┐
  MCP/REST clients ─► │ apps/api  (auth + rate limit + evidence)       │
  (Claude Code,       │   ├── Memory Inbox / lifecycle / audit         │
   Codex, Cursor,     │   ├── capture ingestion + recall hydration     │
   OpenCode...)       │   ├── context query (memory/web/repo/traces)   │
                       │   ├── repo graph query / symbol / impact       │
                       │   ├── Google sign-in + hosted MCP metadata     │
                       │   └── OpenAPI + usage + operator surfaces      │
                       └───────────────┬───────────────────────────────┘
                                       │
                         capture / embedding / graph jobs
                                       ▼
                       ┌───────────────────────────────────────────────┐
                       │ memory-worker  (AWS SQS + DLQ fan-out)        │
                       │   ├── auto redaction / curation / save        │
                       │   ├── dreaming butler (prune/merge/resolve)    │
                       │   ├── private Qwen3 embedding service         │
                       │   └── Qdrant dense+sparse indexing            │
                       └───────────────┬───────────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
          RDS PostgreSQL 16      Qdrant derived index   apps/dashboard
          truth store + audit    lore_memories_v12      user-facing SaaS
```

Để biết chi tiết, xem [docs/architecture.md](../../architecture.md).

## Có gì mới trong v2.1.0

`v2.1.0` là bản phát hành **Repo Graph API và MCP Tools**. Nó biến đồ thị
kho lưu trữ của Lore thành bề mặt bộ nhớ tác nhân hạng nhất: lập chỉ mục
kho lưu trữ TypeScript/JavaScript xác định cho tệp, ký hiệu, nhập khẩu, lệnh gọi,
tuyến đường, kiểm tra và gợi ý quy trình, được hiển thị qua các tuyến API và
công cụ MCP chỉ đọc để các tác nhân căn cứ câu trả lời kho lưu trữ vào hợp đồng
ngữ cảnh dự án ổn định thay vì tìm kiếm văn bản đặc biệt.

v2.1.0 được triển khai lên AWS production và website công khai. Nó được xây dựng
trên engine bộ nhớ lai (kho thật RDS, fan-out worker AWS SQS, chỉ mục dẫn xuất
Qdrant, dịch vụ nhúng Qwen3 riêng tư, `HybridSearchOrchestrator` 7 luồng),
dreaming butler worker hợp nhất bộ nhớ, vòng lặp tự cải thiện bộ nhớ tác nhân,
các gói middleware SDK đã xuất bản và nền tảng SaaS thương mại được vận chuyển
qua dòng v1.7–v2.0.

| Tính năng | Trạng thái | Vị trí |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Production | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Bộ lập chỉ mục đồ thị tri thức mã | ✅ Production | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query kết hợp bộ nhớ + web + repo + nhật ký công cụ | ✅ Production | `apps/api`, `docs/api-reference.md` |
| `HybridSearchOrchestrator` 7 luồng (FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ Production | `packages/search` |
| Cross-encoder reranker (hậu hợp nhất, opt-in) | ✅ Production | `apps/api/src/rerankers/` |
| Dreaming butler hợp nhất bộ nhớ (prune / merge / resolve / surface) | ✅ Production, kích hoạt bằng flag | `apps/api/src/workers/butler-v18.ts` |
| Vòng lặp tự cải thiện bộ nhớ tác nhân + công thức ngữ cảnh | ✅ Production, thăng cấp do con người kiểm soát | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| SDK middleware (auto-inject + auto-retain cho client OpenAI / Anthropic) | ✅ Đã xuất bản | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Kho bí mật cho tác nhân AI (MCP-native, ủy quyền ba nút) | ✅ Beta, chờ kiểm toán mã hóa | `apps/mcp-server`, `apps/api` |
| Cloud Memory Engine: kho thật RDS + fan-out worker SQS + chỉ mục Qdrant | ✅ Production | `apps/api`, `apps/api/src/worker.ts` |
| Dịch vụ vector Qwen3-Embedding-0.6B 1024-dim riêng tư | ✅ Production | `apps/api/src/embedding.ts` |
| Nhập capture tự động và ngoại lệ Memory Inbox | ✅ Production | `apps/api`, `packages/capture` |
| Google sign-in + bootstrap kho cá nhân | ✅ Production | `apps/api`, `apps/dashboard` |
| SaaS thương mại: đăng ký cá nhân, thanh toán, kiểm soát hạn mức | ✅ Production | hosted cloud (`Lore-Context/lore-cloud`) |
| REST API với xác thực API-key (reader/writer/admin) | ✅ Production | `apps/api` |
| Hợp đồng OpenAPI 3.1 tại `/openapi.json` (báo cáo `2.1.0`) | ✅ Production | `apps/api/src/openapi.ts` |
| Server MCP stdio (legacy + transport SDK chính thức) | ✅ Production | `apps/mcp-server` |
| Dashboard Next.js với phiên Google + Basic Auth của nhà điều hành | ✅ Production | `apps/dashboard` |
| Evidence Ledger API + tóm tắt Dashboard | ✅ Production | `apps/api`, `apps/dashboard` |
| Máy trạng thái quản trị + nhật ký kiểm tra | ✅ Production | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Production | `packages/eval` |
| Nhập/xuất MIF v0.2 với `supersedes` + `contradicts` | ✅ Production | `packages/mif` |
| Model gateway (định tuyến task→model đa nhà cung cấp) | ✅ Production | `packages/model-gateway` |
| Adapter `agentmemory` với kiểm tra phiên bản + chế độ giảm chức năng | ✅ Production | `packages/agentmemory-adapter` |
| Giới hạn tốc độ, ghi nhật ký JSON có cấu trúc với biên tập trường | ✅ Production | `apps/api` |
| Triển khai riêng tư Docker Compose | ✅ Production | `docker-compose.yml` |
| Trình trợ giúp chấp nhận cục bộ `pnpm quickstart` + báo cáo kích hoạt | ✅ Production | `scripts/lore-quickstart.mjs` |
| MCP Registry Chính thức + tài liệu phân phối / ra mắt / đối tác thiết kế | ✅ Production | `server.json`, `docs/distribution/`, `docs/launch/` |

Xem [CHANGELOG.md](../../../CHANGELOG.md) để biết lịch sử phát hành đầy đủ.

## Trạng thái phát hành hiện tại

`v2.1.0` là mã nguồn hiện tại, production được lưu trữ và dòng phát hành. Nó đã
triển khai lên AWS production và website công khai thông qua quy trình phát hành
được tối ưu hóa: artifact arm64-first bất biến, API smoke staging, triển khai
API production, triển khai website độc lập, kiểm tra sau phát hành và đóng
tag/release. Các kiểm tra bên ngoài xác nhận `https://api.lorecontext.com/health`
trả về `status=ok`, `/openapi.json` báo cáo `2.1.0` và
`https://lorecontext.com/status.html` chứa `v2.1.0`.

Production giữ nguyên hình dạng RDS / SQS / memory-worker / Qdrant cloud từ v1.1+,
sử dụng `lore_memories_v12` làm collection Qdrant, giữ pgvector 1024-dim cho
đường Postgres và thêm schema đồ thị repo cộng thêm
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Xem [docs/release-status.md](../../release-status.md) để biết ảnh chụp nhanh
trạng thái an toàn công khai hiện tại và [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
để biết ghi chú phát hành đầy đủ.

## Trọng tâm phát hành

Phiên bản v2.1 biến đồ thị kho lưu trữ của Lore thành bề mặt bộ nhớ tác nhân
hạng nhất. Mục tiêu là cho phép các tác nhân trả lời "X được định nghĩa ở đâu",
"cái gì gọi hàm này" và "cái gì bị hỏng nếu tôi thay đổi điều này" dựa trên
hợp đồng ngữ cảnh dự án xác định, ổn định thay vì tìm kiếm văn bản đặc biệt:

- `@lore/repo-graph` — lập chỉ mục kho lưu trữ TypeScript/JavaScript xác định
  cho tệp, ký hiệu, nhập khẩu, lệnh gọi, tuyến đường, kiểm tra và gợi ý quy trình.
- Các tuyến API: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact` và `POST /v1/repo/detect-changes`.
- Các công cụ MCP: `repo.graph_query`, `repo.symbol_context`, `repo.impact` và
  `repo.detect_changes` (chỉ đọc).
- `context_query(repo)` giờ sử dụng bằng chứng đồ thị repo được hỗ trợ bởi nhà
  cung cấp khi có sẵn, với dự phòng trung thực không khả dụng khi lưu trữ đồ thị
  repo không được cấu hình.
- Schema Postgres đồ thị repo là cộng thêm — nó nằm trên schema production hiện có
  và được áp dụng trong quá trình thiết lập schema production/staging.

Các phiên bản gói root và API báo cáo `2.1.0` để `/openapi.json` khớp với
thẻ phát hành. Tàu phát hành sử dụng các biện pháp bảo vệ triển khai phân tách
API/website được tối ưu hóa được giới thiệu sau v2.0.9.

Xem [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md) và [docs/release-governance.md](../../release-governance.md).

## Tích hợp

Lore Context hỗ trợ MCP và REST và tích hợp với hầu hết các IDE tác nhân và giao diện chat:

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
| Khác / MCP chung | [docs/integrations/README.md](../../integrations/README.md) |

## Triển khai

| Chế độ | Khi nào dùng | Tài liệu |
|---|---|---|
| **Dựa trên tệp cục bộ** | Dev solo, prototype, smoke testing | README này, Bắt đầu nhanh ở trên |
| **Postgres+pgvector cục bộ** | Dự phòng cục bộ một nút và kiểm tra di chuyển | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose riêng tư** | Triển khai nhóm tự lưu trữ, mạng riêng biệt | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Hosted cloud** | RDS / SQS / memory-worker / Qdrant / nhúng riêng tư cộng với ngăn xếp thu hồi lai tăng cường đồ thị và nền tảng SaaS thương mại | [docs/release-status.md](../../release-status.md) |

Tất cả các đường triển khai yêu cầu bí mật rõ ràng. Các đường cục bộ/riêng tư yêu cầu
`POSTGRES_PASSWORD`, `LORE_API_KEYS` và xác thực dashboard. Các triển khai được lưu trữ
cũng cần RDS, SQS, Qdrant, dịch vụ nhúng, OAuth, cấu hình tunnel và
các xuất runtime production. Script `scripts/check-env.mjs` từ chối khởi động
production nếu bất kỳ giá trị nào khớp với mẫu placeholder.

## Bảo mật

v2.1.0 giữ nguyên tư thế triển khai cục bộ/riêng tư và các biện pháp bảo vệ
cloud được lưu trữ cho quyền truy cập người dùng thông thường:

- **Xác thực**: Token bearer API-key với phân tách vai trò (`reader`/`writer`/`admin`) và phạm vi theo dự án. Chế độ khóa trống đóng trong production.
- **Giới hạn tốc độ**: Bucket kép theo IP + theo khóa với backoff lỗi xác thực (429 sau 5 lần thất bại trong 60 giây, khóa 30 giây).
- **Dashboard**: Quy trình phiên Google cho sản phẩm được lưu trữ; HTTP Basic Auth vẫn khả dụng cho triển khai nhà điều hành cục bộ/riêng tư.
- **Container**: Tất cả Dockerfiles chạy với người dùng `node` không phải root; HEALTHCHECK trên api + dashboard.
- **Bí mật**: Không có thông tin xác thực được mã hóa cứng; tất cả các mặc định là biến bắt buộc hoặc thất bại. `scripts/check-env.mjs` từ chối giá trị placeholder trong production.
- **Quản trị**: Quét regex PII / API key / JWT / private-key khi ghi; nội dung được gắn thẻ rủi ro tự động chuyển đến hàng đợi xem xét; nhật ký kiểm tra bất biến trên mỗi chuyển đổi trạng thái.
- **Đầu độc bộ nhớ**: Phát hiện heuristic trên các mẫu đồng thuận + động từ mệnh lệnh.
- **MCP**: Xác thực schema zod trên mỗi đầu vào công cụ; các công cụ biến đổi yêu cầu `reason` (≥8 ký tự) và hiển thị `destructiveHint: true`; lỗi upstream được làm sạch trước khi trả về client.
- **Cô lập worker**: Các job capture, nhúng, đồ thị, connector và backfill chạy qua hàng đợi AWS SQS với DLQ; Qdrant là chỉ mục dẫn xuất và RDS vẫn là nguồn có thẩm quyền.
- **Ghi nhật ký**: JSON có cấu trúc với tự động biên tập các trường `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Tiết lộ lỗ hổng bảo mật: [SECURITY.md](../../../SECURITY.md).

## Cấu trúc dự án

```text
apps/
  api/                # REST control plane + Postgres + governance + eval + repo graph
  dashboard/          # Next.js dashboard with Google session + operator Basic Auth
  mcp-server/         # MCP stdio server (legacy + official SDK transports)
  cli/                # lore CLI (doctor, wiki-recompile, dataset import/export)
  browser-extension/  # Capture surface scaffold
  web/                # Server-side HTML renderer (no-JS fallback UI)
  website/            # Marketing site (handled separately)
packages/
  shared/             # Shared types, errors, ID/token utilities
  agentmemory-adapter # Bridge to upstream agentmemory + version probe
  search/             # 7-stream HybridSearchOrchestrator + recipe adapter
  repo-graph/         # Deterministic repository indexing (v2.1)
  code-indexer/       # Code knowledge graph indexer (TypeScript/JavaScript)
  code-indexer-python # Code knowledge graph indexer (Python)
  capture/            # Capture ingestion primitives
  connectors/         # External source connectors
  model-gateway/      # Multi-provider task→model routing
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + metric primitives + context recipes
  governance/         # State machine + risk scan + poisoning + audit
  profile/            # Vault / account profile types
  sdk-typescript/     # TypeScript client SDK
  sdk-python/         # Python client SDK
  sdk-go/ sdk-java/ sdk-dotnet/   # Additional language SDKs
  sdk-middleware-typescript/      # Auto-inject + auto-retain middleware (npm)
  sdk-middleware-python/          # Auto-inject + auto-retain middleware (PyPI)
docs/
  i18n/<lang>/        # Localized README in 17 languages
  integrations/       # Agent-IDE integration guides
  deployment/         # Local, Docker Compose, and production automation runbooks
  legal/              # Privacy / Terms / Cookies (Singapore law)
scripts/
  check-env.mjs       # Production-mode env validation
  smoke-*.mjs         # End-to-end smoke tests
  apply-postgres-schema.mjs
```

## Yêu cầu

- Node.js `>=22`
- pnpm `10.30.1`
- (Dự phòng cục bộ tùy chọn) Postgres 16 với pgvector
- (Được lưu trữ/nâng cao) RDS PostgreSQL 16, AWS SQS, Qdrant và dịch vụ nhúng riêng tư

## Đóng góp

Chào đón các đóng góp. Vui lòng đọc [CONTRIBUTING.md](../../../CONTRIBUTING.md) để biết quy trình
phát triển, giao thức thông báo commit và kỳ vọng đánh giá.

Để dịch tài liệu, xem [hướng dẫn đóng góp i18n](../README.md).

## Vận hành bởi

Lore Context được vận hành bởi **REDLAND PTE. LTD.** (Singapore, UEN 202304648K). Hồ sơ công ty, điều khoản pháp lý và xử lý dữ liệu được ghi lại trong [`docs/legal/`](../../legal/).

## Giấy phép

Kho lưu trữ Lore Context được cấp phép theo [Apache License 2.0](../../../LICENSE). Các gói riêng lẻ trong `packages/*` khai báo MIT để cho phép sử dụng xuôi dòng. Xem [NOTICE](../../../NOTICE) để biết thông tin ghi nhận nguồn gốc.

## Lời cảm ơn

Lore Context được xây dựng trên nền tảng [agentmemory](https://github.com/agentmemory/agentmemory) như một runtime bộ nhớ cục bộ. Chi tiết hợp đồng nguồn gốc và chính sách tương thích phiên bản được ghi lại trong [UPSTREAM.md](../../../UPSTREAM.md).
