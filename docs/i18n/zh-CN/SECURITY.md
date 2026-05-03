# 安全策略

> 🤖 本文档由英文版机器翻译生成。欢迎通过 PR 改进 — 参见[翻译贡献指南](../README.md)。

Lore Context 处理记忆、追踪、审计日志和集成凭证。安全报告视为高优先级处理。

## 报告漏洞

不要为疑似漏洞、泄露的密钥、认证绕过、数据暴露或租户隔离问题创建公开 issue。

首选报告方式：

1. 在可用时使用本仓库的 **GitHub 私有漏洞报告**功能。
2. 若私有报告不可用，请私下联系维护者，并包含：
   - 受影响的版本或提交，
   - 复现步骤，
   - 预期影响，
   - 是否涉及真实密钥或个人数据。

我们的目标是在 72 小时内确认可信报告。

## 支持的版本

Lore Context 目前是 1.0 前的 alpha 软件。安全修复优先针对 `main` 分支。当公开版本被下游运营商活跃使用时，已标记的发布版本可能会收到定向补丁。

| 版本 | 支持状态 |
|---|---|
| v0.4.x-alpha | ✅ 活跃支持 |
| v0.3.x 及更早版本 | ❌ 仅内部预发布 |

## 内置加固（v0.4.0-alpha）

alpha 版本包含以下纵深防御控制措施。运营商应验证这些措施在其部署中处于激活状态。

### 认证

- **API key Bearer token**（`Authorization: Bearer <key>` 或 `x-lore-api-key` 头）。
- **角色分离**：`reader` / `writer` / `admin`。
- **按项目作用域限定**：`LORE_API_KEYS` JSON 条目可包含 `projectIds: ["..."]` 白名单；变更操作需要匹配的 `project_id`。
- **空 key 模式在生产环境安全失败**：当 `NODE_ENV=production` 且未配置 key 时，API 拒绝所有请求。
- **回环绕过已移除**：旧版本信任 `Host: 127.0.0.1`；v0.4 只使用套接字级别的远程地址。

### 速率限制

- **按 IP 和按 key 双桶限制器**，含认证失败退避。
- **默认值**：未认证路径每 IP 60 次/分钟，已认证 key 每 key 600 次/分钟。
- **60 秒内 5 次认证失败 → 锁定 30 秒**（返回 429）。
- 可配置：`LORE_RATE_LIMIT_PER_IP`、`LORE_RATE_LIMIT_PER_KEY`、`LORE_RATE_LIMIT_DISABLED=1`（仅限开发环境）。

### 仪表盘保护

- **HTTP Basic Auth 中间件**（`apps/dashboard/middleware.ts`）。
- **在生产环境下**，未提供 `DASHBOARD_BASIC_AUTH_USER` 和 `DASHBOARD_BASIC_AUTH_PASS` 时**拒绝启动**。
- `LORE_DASHBOARD_DISABLE_AUTH=1` 仅在生产环境之外有效。
- 服务端 admin key 回退**已移除**：用户必须通过 Basic Auth 认证后，仪表盘代理才会注入上游 API 凭证。

### 容器加固

- 所有 Dockerfile 以非 root `node` 用户运行。
- `apps/api/Dockerfile` 和 `apps/dashboard/Dockerfile` 声明了针对 `/health` 的 `HEALTHCHECK`。
- `apps/mcp-server` 仅限 stdio — 无网络监听器 — 不声明 `HEALTHCHECK`。

### 密钥管理

- **零硬编码凭证。** 所有 `docker-compose.yml`、`docs/deployment/compose.private-demo.yml` 和 `.env.example` 默认值使用 `${VAR:?must be set}` 形式 — 未提供显式值时快速失败启动。
- `scripts/check-env.mjs` 在 `NODE_ENV=production` 时拒绝占位符值
  （`read-local`、`write-local`、`admin-local`、`change-me`、`demo`、`test`、`dev`、`password`）。
- 所有部署文档和示例 README 均已清除字面演示凭证。

### 治理

- **每次记忆写入时进行风险标签扫描**：检测 API key、AWS key、JWT token、私钥、密码、邮箱、电话号码。
- **六状态状态机**，含显式合法转换表；非法转换会抛出异常。
- **记忆投毒启发式算法**：同源主导 + 命令动词模式匹配 → `suspicious` 标记。
- **不可变审计日志**在每次状态转换时追加。
- 高风险内容自动路由至 `candidate` / `flagged`，在审核前不参与上下文组合。

### MCP 加固

- 每个 MCP 工具输入在调用前都会**针对 zod schema 进行验证**。验证失败时返回带脱敏问题列表的 JSON-RPC `-32602`。
- **所有变更工具**要求 `reason` 字符串至少 8 个字符，并在其 schema 中暴露 `destructiveHint: true`。
- 上游 API 错误在返回 MCP 客户端之前**脱敏** — 原始 SQL、文件路径和堆栈跟踪均被清除。

### 日志

- **结构化 JSON 输出**，`requestId` 贯穿整个处理链路的关联。
- **自动脱敏**匹配 `content`、`query`、`memory`、`value`、`password`、`secret`、`token`、`key` 的字段。记忆记录和查询的实际内容永远不会写入日志。

### 数据边界

- `agentmemory` 适配器在初始化时探测上游版本，并在不兼容时发出警告。`LORE_AGENTMEMORY_REQUIRED=0` 可在上游不可达时将适配器切换为静默降级模式。
- `apps/api` 请求体解析器强制执行 `LORE_MAX_JSON_BYTES` 上限（默认 1 MiB）；超大请求返回 413。
- Postgres 连接池设置 `statement_timeout: 15000` 以限制查询时间。
- `LORE_REQUEST_TIMEOUT_MS`（默认 30 秒）为每个请求处理器设置上限；超时返回 504。

## 部署指南

- 不要在未配置 `LORE_API_KEYS` 的情况下远程暴露 Lore。
- 优先使用角色分离的 `reader` / `writer` / `admin` key。
- 在生产环境中**务必设置** `DASHBOARD_BASIC_AUTH_USER` 和 `DASHBOARD_BASIC_AUTH_PASS`。
- **使用 `openssl rand -hex 32` 生成 key**。绝不使用示例中显示的占位符值。
- 保持原始 `agentmemory` 端点私有；只通过 Lore 访问它们。
- 对于任何非回环暴露，将仪表盘、治理、导入/导出、同步和审计路由置于网络访问控制层（Cloudflare Access、AWS ALB、Tailscale ACL 或类似方案）之后。
- **在生产环境启动 API 之前运行 `node scripts/check-env.mjs`。**
- **绝不提交**生产 `.env` 文件、提供商 API key、云凭证、包含客户内容的评测数据或私有记忆导出。

## 披露时间线

对于已确认的高影响漏洞：

- 第 0 天：确认报告。
- 第 7 天：与报告者共享分类和严重性分级。
- 第 30 天：协调公开披露（或经双方同意延期）。
- 第 30 天以上：如适用，对中等及以上严重性问题发布 CVE。

对于较低严重性问题，预计在下一个小版本发布时解决。

## 加固路线图

后续版本计划中的项目：

- **v0.5**：OpenAPI / Swagger 规范；CI 集成 `pnpm audit --high`、CodeQL 静态分析和 dependabot。
- **v0.6**：Sigstore 签名容器镜像、SLSA 溯源、通过 GitHub OIDC 而非长期 token 进行 npm 发布。
- **Future hosted hardening**：通过 KMS 信封加密对 `risk_tags` 标记的记忆内容进行静态加密。
