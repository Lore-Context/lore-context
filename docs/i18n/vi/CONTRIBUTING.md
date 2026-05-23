> 🤖 Tài liệu này được dịch máy từ bản tiếng Anh. Hoan nghênh cải thiện qua PR — xem [hướng dẫn đóng góp dịch thuật](../README.md).

# Đóng góp vào Lore Context

Cảm ơn bạn đã cải thiện Lore Context. Dự án này là mặt phẳng điều khiển ngữ cảnh AI agent ở giai đoạn alpha, vì vậy các thay đổi nên bảo toàn vận hành ưu tiên cục bộ, khả năng kiểm toán và an toàn triển khai.

## Quy tắc ứng xử

Dự án này tuân theo [Contributor Covenant](../../CODE_OF_CONDUCT.md). Khi tham gia,
bạn đồng ý tuân thủ nó.

## Thiết lập phát triển

Yêu cầu:

- Node.js 22 hoặc mới hơn
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (Tùy chọn) Docker cho đường Postgres
- (Tùy chọn) `psql` nếu bạn muốn tự áp dụng schema

Các lệnh phổ biến:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # yêu cầu docker compose up -d postgres
pnpm run doctor
```

Để làm việc theo từng gói:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore-context/server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Kỳ vọng Pull Request

- **Giữ các thay đổi tập trung và có thể đảo ngược.** Một mối quan tâm mỗi PR; một PR mỗi mối quan tâm.
- **Thêm test** cho các thay đổi hành vi. Ưu tiên các assertion thực so với snapshot.
- **Chạy `pnpm build` và `pnpm test`** trước khi yêu cầu xem xét. CI cũng chạy chúng,
  nhưng cục bộ nhanh hơn.
- **Chạy smoke test liên quan** khi thay đổi API, dashboard, MCP, Postgres,
  nhập/xuất, eval hoặc hành vi triển khai.
- **Đừng commit** đầu ra build được tạo, store cục bộ, file `.env`,
  thông tin đăng nhập hoặc dữ liệu khách hàng riêng tư. `.gitignore` bao gồm hầu hết các đường dẫn;
  nếu bạn tạo artifact mới, hãy đảm bảo chúng bị loại trừ.
- **Ở trong phạm vi PR của bạn.** Đừng tái cấu trúc code không liên quan khi đi qua.

## Guardrail kiến trúc

Đây là những điều không thể thương lượng cho v0.4.x. Nếu PR vi phạm một trong số này, hãy mong đợi yêu cầu
tách hoặc làm lại:

- **Ưu tiên cục bộ vẫn là chính.** Tính năng mới phải hoạt động mà không cần dịch vụ được lưu trữ
  hoặc phụ thuộc SaaS bên thứ ba.
- **Không có bề mặt xác thực mới bị bypass.** Mọi route đều được giữ bởi API key + role.
  Loopback không phải là trường hợp đặc biệt trong sản xuất.
- **Không có exposure `agentmemory` thô.** Các caller bên ngoài tiếp cận bộ nhớ chỉ qua các endpoint Lore.
- **Tính toàn vẹn nhật ký kiểm toán.** Mọi thay đổi ảnh hưởng đến trạng thái bộ nhớ đều ghi một entry kiểm toán.
- **Thất bại đóng khi thiếu config.** Khởi động chế độ sản xuất từ chối bắt đầu nếu
  env var bắt buộc là placeholder hoặc thiếu.

## Commit message

Lore Context sử dụng định dạng commit nhỏ, có quan điểm lấy cảm hứng từ hướng dẫn
kernel Linux.

### Định dạng

```text
<type>: <tóm tắt ngắn ở thể mệnh lệnh>

<nội dung tùy chọn giải thích tại sao thay đổi này cần thiết và những đánh đổi nào áp dụng>

<trailer tùy chọn>
```

### Các loại

- `feat` — khả năng hiển thị với người dùng mới hoặc endpoint API
- `fix` — sửa bug
- `refactor` — tái cấu trúc code không có thay đổi hành vi
- `chore` — vệ sinh kho lưu trữ (deps, tooling, di chuyển file)
- `docs` — chỉ tài liệu
- `test` — chỉ thay đổi test
- `perf` — cải thiện hiệu suất với tác động đo lường được
- `revert` — hoàn nguyên commit trước

### Phong cách

- **Chữ thường** loại và từ đầu tiên của tóm tắt.
- **Không có dấu chấm cuối** trong dòng tóm tắt.
- **≤72 ký tự** trong dòng tóm tắt; xuống dòng body ở 80.
- **Thể mệnh lệnh**: "fix loopback bypass", không phải "fixed" hay "fixes".
- **Tại sao hơn là gì**: diff cho thấy những gì đã thay đổi; body nên giải thích tại sao.
- **Không bao gồm** trailer `Co-Authored-By`, ghi nhận AI, hoặc
  dòng signed-off-by trừ khi được người dùng yêu cầu rõ ràng.

### Trailer hữu ích

Khi có liên quan, hãy thêm trailer để nắm bắt ràng buộc và bối cảnh người xem xét:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Ví dụ

```text
fix: loopback bypass — remove host-header trust, fail closed in production

Previous versions trusted the Host header for loopback detection, allowing a
remote attacker to spoof "Host: 127.0.0.1" and obtain admin role with no API
key when LORE_API_KEYS was unset. Loopback detection now uses
req.socket.remoteAddress only, and production with empty keys returns 401.

Constraint: Local development without keys still works on loopback
Confidence: high
Scope-risk: narrow (auth path only)
Tested: pnpm test (added loopback-bypass test case), pnpm smoke:api
```

## Granularidade commit

- Một thay đổi logic mỗi commit. Người xem xét có thể hoàn nguyên nguyên tử mà không có
  thiệt hại phụ.
- Gộp các fixup nhỏ (`typo`, `lint`, `prettier`) vào commit cha
  trước khi mở hoặc cập nhật PR.
- Tái cấu trúc nhiều file là ổn trong một commit nếu chúng chia sẻ một
  lý do duy nhất.

## Quy trình xem xét

- Người duy trì sẽ xem xét PR của bạn trong vòng 7 ngày trong hoạt động điển hình.
- Giải quyết tất cả comment blocking trước khi yêu cầu xem xét lại.
- Đối với các comment không blocking, trả lời inline với lý do hoặc follow-up
  issue là chấp nhận được.
- Người duy trì có thể thêm nhãn `merge-queue` khi PR được phê duyệt; đừng
  rebase hoặc force-push sau khi nhãn đó được áp dụng.

## Dịch tài liệu

Nếu bạn muốn cải thiện README đã dịch hoặc file tài liệu, xem
[hướng dẫn đóng góp i18n](../../i18n/README.md).

## Báo cáo bug

- Gửi issue công khai tại https://github.com/Lore-Context/lore-context/issues
  trừ khi bug là lỗ hổng bảo mật.
- Đối với các vấn đề bảo mật, hãy tuân theo [SECURITY.md](SECURITY.md).
- Bao gồm: phiên bản hoặc commit, môi trường, tái tạo, mong đợi so với thực tế,
  nhật ký (với nội dung nhạy cảm đã được che giấu).

## Lời cảm ơn

Lore Context là một dự án nhỏ đang cố gắng làm điều gì đó hữu ích cho
cơ sở hạ tầng AI agent. Mỗi PR có phạm vi tốt đều đưa nó tiến lên.
