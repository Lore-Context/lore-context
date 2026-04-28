# 贡献 Lore Context

> 🤖 本文档由英文版机器翻译生成。欢迎通过 PR 改进 — 参见[翻译贡献指南](../README.md)。

感谢你改进 Lore Context。本项目是一个 alpha 阶段的 AI 智能体上下文控制平面，因此变更应保持本地优先运作、可审计性和部署安全性。

## 行为准则

本项目遵循 [Contributor Covenant](../../../CODE_OF_CONDUCT.md)。参与即表示你同意遵守该准则。

## 开发环境搭建

环境要求：

- Node.js 22 或更新版本
- pnpm 10.30.1（`corepack prepare pnpm@10.30.1 --activate`）
- （可选）Docker，用于 Postgres 路径
- （可选）`psql`，如果你偏好自行应用 schema

常用命令：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # 需要 docker compose up -d postgres
pnpm run doctor
```

针对单个包的工作：

```bash
pnpm --filter @lore/api test
pnpm --filter @lore/mcp-server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Pull Request 预期

- **保持变更聚焦且可回滚。** 每个 PR 只处理一个关切点；每个关切点一个 PR。
- **为行为变更添加测试。** 优先使用真实断言而非快照。
- **在请求审核前运行 `pnpm build` 和 `pnpm test`。** CI 也会运行，但本地更快。
- **变更 API、仪表盘、MCP、Postgres、导入/导出、评测或部署行为时，运行相关冒烟测试。**
- **不要提交**生成的构建产物、本地存储、`.env` 文件、凭证或私有客户数据。`.gitignore` 覆盖了大多数路径；若你创建了新产物，确保它们被排除在外。
- **保持在你的 PR 范围内。** 不要顺手重构不相关的代码。

## 架构护栏

以下是 v0.4.x 的不可协商原则。如果 PR 违反其中一项，预期会收到拆分或返工的请求：

- **本地优先保持首要地位。** 新功能必须在没有托管服务或第三方 SaaS 依赖的情况下工作。
- **不新增认证面绕过。** 每个路由都必须通过 API key + 角色守卫。回环在生产环境中不是特殊情况。
- **不暴露原始 `agentmemory`。** 外部调用者只能通过 Lore 端点访问记忆。
- **审计日志完整性。** 每次影响记忆状态的变更都要写入审计条目。
- **缺失配置时安全失败。** 生产模式启动在必填环境变量为占位符或缺失时拒绝启动。

## 提交信息

Lore Context 使用受 Linux 内核指南启发的小型、有主见的提交格式。

### 格式

```text
<type>: <以命令语气写的简短摘要>

<可选正文，解释为什么需要此变更以及适用哪些权衡>

<可选尾部>
```

### 类型

- `feat` — 新的用户可见功能或 API 端点
- `fix` — 缺陷修复
- `refactor` — 代码重构，无行为变更
- `chore` — 仓库维护（依赖、工具、文件移动）
- `docs` — 仅文档变更
- `test` — 仅测试变更
- `perf` — 有可测量影响的性能改进
- `revert` — 回滚之前的提交

### 风格

- **小写**类型和摘要的第一个词。
- 摘要行**无结尾句号**。
- 摘要行**≤72 个字符**；正文在 80 个字符处换行。
- **命令语气**："fix loopback bypass"，而非 "fixed" 或 "fixes"。
- **重视原因而非内容**：diff 展示了什么变了；正文应解释为什么。
- **不包含** `Co-Authored-By` 尾部、AI 归因或 signed-off-by 行，除非用户明确要求。

### 有用的尾部

在相关时，添加尾部以记录约束和审核者上下文：

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### 示例

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

## 提交粒度

- 每个提交一个逻辑变更。审核者可以原子回滚而不产生附带损害。
- 在开启或更新 PR 之前，将琐碎的修正（`typo`、`lint`、`prettier`）压缩进父提交。
- 多文件重构如果出于同一原因，可以在单个提交中进行。

## 审核流程

- 维护者将在典型活跃期内 7 天内审核你的 PR。
- 在重新请求审核之前，解决所有阻塞性评论。
- 对于非阻塞性评论，内联回复理由或后续 issue 是可以接受的。
- 维护者在 PR 获得批准后可能会添加 `merge-queue` 标签；添加该标签后不要 rebase 或强制推送。

## 文档翻译

如果你想改进已翻译的 README 或文档文件，请参见 [i18n 贡献指南](../README.md)。

## 报告缺陷

- 在 https://github.com/Lore-Context/lore-context/issues 提交公开 issue，除非该缺陷是安全漏洞。
- 对于安全问题，请遵循 [SECURITY.md](SECURITY.md)。
- 包含：版本或提交、环境、复现步骤、预期与实际结果、日志（敏感内容已脱敏）。

## 致谢

Lore Context 是一个小型项目，致力于为 AI 智能体基础设施做一些有用的事情。每个范围合理的 PR 都推动它向前。
