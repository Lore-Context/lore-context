# 变更日志

> 🤖 本文档由英文版机器翻译生成。欢迎通过 PR 改进 — 参见[翻译贡献指南](../README.md)。

Lore Context 的所有重要变更均记录于此。格式基于
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)，本项目
遵循 [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)。

## [v0.4.0-alpha] — 2026-04-28

首个公开 alpha 版本。完成了将审计失败的 MVP 转变为候选 alpha 版本的生产加固冲刺。所有 P0 审计项已清除，13 个 P1 项中已清除 12 个（1 个部分完成，见说明），117+ 个测试通过，完整 monorepo 构建干净。

### 新增

- **`packages/eval/src/runner.ts`** — 真实的 `EvalRunner`（`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`）。评测现在可以针对用户自有数据集运行端到端检索评测，并将运行结果持久化为 JSON 以便跨时间回归检测。
- **`packages/governance/src/state.ts`** — 六状态治理状态机
  （`candidate / active / flagged / redacted / superseded / deleted`），含显式合法转换表。非法转换会抛出异常。
- **`packages/governance/src/audit.ts`** — 不可变审计日志追加助手，与 `@lore/shared` 的 `AuditLog` 类型集成。
- **`packages/governance/detectPoisoning`** — 记忆投毒检测启发式算法，使用同源主导（>80%）和命令动词模式匹配。
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — 基于 semver 的上游版本探测，使用手写比较（无新依赖）。支持 `LORE_AGENTMEMORY_REQUIRED=0` 静默跳过降级模式。
- **`packages/mif`** — 在 `LoreMemoryItem` 中新增 `supersedes: string[]` 和 `contradicts: string[]` 字段。JSON 和 Markdown 格式均保留往返完整性。
- **`apps/api/src/logger.ts`** — 结构化 JSON 日志，含敏感字段自动脱敏（`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`）。`requestId` 贯穿每个请求的完整链路。
- **`apps/dashboard/middleware.ts`** — HTTP Basic Auth 中间件。在生产环境下，未提供 `DASHBOARD_BASIC_AUTH_USER` 和 `DASHBOARD_BASIC_AUTH_PASS` 时拒绝启动。
- **`scripts/check-env.mjs`** — 生产模式环境变量验证器。若任何环境变量值匹配占位符模式（`read-local`、`write-local`、`admin-local`、`change-me`、`demo`、`test`、`dev`、`password`），则拒绝启动应用。
- **速率限制** — 按 IP 和按 key 双桶令牌限制器，含认证失败退避（60 秒内 5 次失败 → 锁定 30 秒 → 返回 429）。可通过 `LORE_RATE_LIMIT_PER_IP`、`LORE_RATE_LIMIT_PER_KEY`、`LORE_RATE_LIMIT_DISABLED` 配置。
- **优雅关闭** — SIGTERM/SIGINT 处理器在 10 秒内排空进行中的请求，刷新待处理的 Postgres 写入，关闭连接池，15 秒后强制退出。
- **数据库索引** — 在 `memory_records`、`context_traces`、`audit_logs`、`event_log`、`eval_runs` 的 `(project_id)` / `(status)` / `(created_at)` 上建立 B-tree 索引。在 jsonb 的 `content` 和 `metadata` 列上建立 GIN 索引。
- **MCP zod 输入验证** — 每个 MCP 工具现在都针对工具专用 zod schema 运行 `safeParse`；验证失败时返回带脱敏问题列表的 JSON-RPC `-32602`。
- **MCP `destructiveHint` + 必填 `reason`** — 每个变更工具
  （`memory_forget`、`memory_update`、`memory_supersede`、`memory_redact`）要求 `reason` 至少 8 个字符，并暴露 `destructiveHint: true`。
- 在 `apps/api`、`apps/mcp-server`、`packages/eval`、`packages/governance`、`packages/mif`、`packages/agentmemory-adapter` 中新增 117+ 个测试用例。
- 多语言文档：`docs/i18n/<lang>/` 下 17 种语言的 README。
- `CHANGELOG.md`（本文件）。
- `docs/getting-started.md` — 5 分钟开发者快速入门。
- `docs/api-reference.md` — REST API 端点参考。
- `docs/i18n/README.md` — 翻译贡献指南。

### 变更

- **`packages/mif`** 信封版本 `"0.1"` → `"0.2"`。向后兼容导入。
- **`LORE_POSTGRES_AUTO_SCHEMA`** 默认值 `true` → `false`。生产部署必须显式启用 schema 自动应用或运行 `pnpm db:schema`。
- **`apps/api`** 请求体解析器现在是流式的，并有硬性载荷大小限制（`LORE_MAX_JSON_BYTES`，默认 1 MiB）。超大请求返回 413。
- **回环认证**变更：移除对 URL `Host` 头的依赖；回环检测现在只使用 `req.socket.remoteAddress`。在生产环境下，若未配置 API key，API 安全失败并拒绝所有请求（原来是：静默授予 admin）。
- **作用域 API key** 现在必须为 `/v1/memory/list`、`/v1/eval/run` 和 `/v1/memory/import` 提供 `project_id`（原来是：未定义的 `project_id` 会绕过检查）。
- **所有 Dockerfile** 现在以非 root `node` 用户运行。`apps/api/Dockerfile` 和 `apps/dashboard/Dockerfile` 声明了 `HEALTHCHECK`。
- **`docker-compose.yml`** 的 `POSTGRES_PASSWORD` 现在使用 `${POSTGRES_PASSWORD:?must be set}` — 未显式设置密码时快速失败启动。
- **`docs/deployment/compose.private-demo.yml`** — 同样使用必填或失败模式。
- **`.env.example`** — 所有演示默认值已移除，替换为 `# REQUIRED` 占位符。为速率限制、请求超时、载荷限制、agentmemory 必填模式、仪表盘 Basic Auth 记录了新变量。

### 修复

- **回环绕过认证漏洞**（P0）。攻击者可以发送 `Host: 127.0.0.1` 来伪造回环检测，在没有 API key 的情况下获得 admin 角色。
- **仪表盘代理中的混淆代理问题**（P0）。仪表盘代理为未认证请求注入了 `LORE_API_KEY`，向任何能访问 3001 端口的人授予了 admin 权限。
- **暴力破解防御**（P0）。README/`.env.example` 中展示的演示 key（`admin-local`、`read-local`、`write-local`）可被无限枚举；速率限制和移除默认值现在防御此类攻击。
- **`LORE_API_KEYS` 格式错误时 JSON 解析崩溃** — 进程现在以清晰的错误信息退出，而不是抛出堆栈跟踪。
- **大请求体导致 OOM** — 超过配置限制的请求体现在返回 413，而不是使 Node 进程崩溃。
- **MCP 错误泄露** — 包含原始 SQL、文件路径或堆栈跟踪的上游 API 错误，现在在到达 MCP 客户端之前脱敏为 `{code, generic-message}`。
- **仪表盘 JSON 解析崩溃** — 无效的 JSON 响应不再使 UI 崩溃；错误以用户可见的状态呈现。
- **MCP `memory_update` / `memory_supersede`** 之前不要求 `reason`；现在通过 zod schema 强制执行。
- **Postgres 连接池**：`statement_timeout` 现在设置为 15 秒；此前对格式错误的 jsonb 查询存在无限查询时间风险。

### 安全

- 所有 P0 审计发现（回环绕过 / 仪表盘认证 / 速率限制 / 演示密钥）均已清除。完整审计追踪见 `Lore_Context_项目计划书_2026-04-27.md` 和 `.omc/plans/lore-prelaunch-fixes-2026-04-28.md`。
- `pnpm audit --prod` 在发布时报告零已知漏洞。
- 演示凭证已从所有部署模板和示例 README 中移除。
- 容器镜像默认以非 root 用户运行。

### 说明 / 已知限制

- **P1-1 部分完成**：`/v1/context/query` 保留宽松的作用域 key 行为，以避免破坏现有消费者测试。其他受影响路由（`/v1/memory/list`、`/v1/eval/run`、`/v1/memory/import`）强制执行 `project_id`。已追踪至 v0.5。
- **托管多租户云同步**未在 v0.4.0-alpha 中实现。仅支持本地和 Compose 私有部署。
- **翻译质量**：README 本地化由 LLM 生成并明确标注；欢迎社区 PR 完善各语言版本（参见 [`docs/i18n/README.md`](../README.md)）。
- **OpenAPI / Swagger 规范**尚未打包。REST 接口以散文形式记录在 [`docs/api-reference.md`](api-reference.md) 中。已追踪至 v0.5。

### 致谢

本次发布是针对结构化审计计划进行单日生产加固冲刺的结果，涉及并行子智能体执行。计划和审计产物保存在 `.omc/plans/` 下。

## [v0.0.0] — 预发布

内部开发里程碑，未公开发布。已实现：

- 工作区包脚手架（TypeScript monorepo，pnpm workspaces）。
- 共享 TypeScript 构建/测试流水线。
- `@lore/shared` 中的记忆 / 上下文 / 评测 / 审计类型系统。
- `agentmemory` 适配器边界。
- 本地 REST API，含上下文路由器和组合器。
- JSON 文件持久化 + 可选的 Postgres 运行时存储，含增量 upsert。
- 记忆详情 / 编辑 / 替代 / 遗忘流程，含显式硬删除。
- 真实记忆使用统计（`useCount`、`lastUsedAt`）。
- 追踪反馈（`useful` / `wrong` / `outdated` / `sensitive`）。
- MIF 风格 JSON + Markdown 导入/导出，含治理字段。
- 密钥扫描正则集。
- 直接基于会话的评测指标；提供商比较评测运行；评测运行列表。
- 含 reader/writer/admin 角色分离的 API key 保护。
- 治理审核队列；审计日志 API。
- API 服务的仪表盘 HTML；独立 Next.js 仪表盘。
- 演示种子数据；集成配置生成。
- 私有 Docker/Compose 打包。
- Legacy + 官方 SDK stdio MCP 传输。

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
