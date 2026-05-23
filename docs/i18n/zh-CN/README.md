<div align="center">

# Lore Context

**AI 智能体记忆、评测与治理的控制平面。**

掌握每个智能体记住了什么、使用了什么、以及应该遗忘什么——在记忆成为生产风险之前。

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[快速开始](../../getting-started.md) · [网站快速入门](https://lorecontext.com/quickstart/) · [基准测试方法论](https://lorecontext.com/benchmark/) · [API 参考](../../api-reference.md) · [架构](../../architecture.md) · [项目计划](../../project-plan.md) · [发布状态](../../release-status.md) · [路线图](../../roadmap.md) · [集成](../../integrations/README.md) · [部署](../../deployment/README.md) · [变更日志](../../../CHANGELOG.md)

🌐 **选择你的语言**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

本地化文档可能滞后于当前英文版本；v2.1 的权威文档为英文 README 及 `docs/` 目录。

</div>

---

> 🤖 本文档由英文版机器翻译生成，可能滞后于最新发布。欢迎通过 PR 改进 — 参见[翻译贡献指南](../README.md)。

## Lore Context 是什么

Lore Context 是一个用于 AI 智能体记忆的**开放核心控制平面**：它跨记忆、搜索、代码仓库图谱和工具调用链路组合上下文；在你自己的数据集上评测检索质量；为敏感内容路由治理审查；并将记忆导出为可在后端之间迁移的便携式交换格式。

它并不试图成为另一个记忆数据库。独特价值在于叠加在记忆之上的层次：

- **Context Query** — 单一端点组合记忆 + 网页 + 代码仓库 + 工具调用链路，返回带来源标注的分级上下文块。
- **Memory Eval** — 在你自己拥有的数据集上运行 Recall@K、Precision@K、MRR、stale-hit-rate、p95 延迟；持久化运行结果并进行差异比较，用于回归检测。
- **Governance Review** — 六状态生命周期（`candidate / active / flagged / redacted / superseded / deleted`）、风险标签扫描、投毒启发式检测、不可篡改审计日志。
- **类 MIF 可移植性** — JSON + Markdown 导出/导入，保留 `provenance / validity / confidence / source_refs / supersedes / contradicts`。可作为记忆后端之间的迁移格式。
- **Repo Graph** — 确定性代码仓库索引（文件、符号、导入、调用、路由、测试），通过 API 路由和只读 MCP 工具暴露，让智能体基于稳定的项目上下文契约来回答代码仓库问题。
- **Multi-Agent Adapter** — 一流的 `agentmemory` 集成，支持版本探测 + 降级模式回退；为额外运行时提供清晰的适配器契约。

## 何时使用

| 使用 Lore Context，当... | 使用记忆数据库（agentmemory、Mem0、Supermemory），当... |
|---|---|
| 你需要**证明**你的智能体记住了什么、原因是什么、以及是否被使用 | 你只需要原始记忆存储 |
| 你运行多个智能体（Claude Code、Cursor、Qwen、Hermes、Dify）并希望共享可信上下文 | 你在构建单一智能体，且可以接受供应商锁定的记忆层 |
| 你需要本地或私有部署以满足合规要求 | 你偏好托管 SaaS |
| 你需要在自己的数据集上进行评测，而非依赖供应商基准测试 | 供应商基准测试已足够作为信号 |
| 你希望在系统之间迁移记忆 | 你不打算更换后端 |

## 快速开始

```bash
# 1. 克隆 + 安装
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. 运行快速入门助手并查看激活报告
pnpm quickstart -- --dry-run --activation-report

# 3. 生成真实的 API 密钥（除纯本地开发外，请勿使用占位符）
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. 启动 API（文件存储，无需 Postgres）
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. 写入一条记忆
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. 查询上下文，然后在 Evidence Ledger 中检查返回的 traceId
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

公共网站快速入门，请参见 [lorecontext.com/quickstart](https://lorecontext.com/quickstart/)。完整配置（Postgres、Docker Compose、Dashboard、MCP 集成），请参见 [docs/getting-started.md](../../getting-started.md)。

标准 alpha 快速入门为 `git clone` + `pnpm quickstart`。Lore 目前不发布也不声称存在公共 `@lore-context/quickstart` npm 包。MCP stdio 服务器作为 [`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server) 单独发布，用于注册表和客户端分发；SDK 中间件以 [`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)（npm）和 `lore-context-middleware`（PyPI）形式发布。

为支持 AI 可读发现，网站仅从公共文档发布 `/llms.txt` 和 `/llms-full.txt`。官方 MCP Registry 条目已发布，其他分发草稿位于 [docs/distribution](../../distribution/)。发布草稿位于 [docs/launch](../../launch/)，设计合作伙伴接洽文档位于 [docs/design-partners](../../design-partners/)。公共基准测试页面是可复现的方法论和小型冒烟运行报告，而非竞争性基准测试胜出声明。

## 架构

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

详情请参见 [docs/architecture.md](../../architecture.md)。

## v2.1.0 新增内容

`v2.1.0` 是 **Repo Graph API 和 MCP 工具**版本。它将 Lore 自身的代码仓库图谱作为一级智能体记忆面：对文件、符号、导入、调用、路由、测试和流程提示进行确定性的 TypeScript/JavaScript 仓库索引，通过 API 路由和只读 MCP 工具暴露，让智能体基于稳定的项目上下文契约来回答代码仓库问题，而非依赖临时文本搜索。

v2.1.0 已部署至 AWS 生产环境和公共网站。它基于混合记忆引擎（RDS 真实存储、AWS SQS worker 扇出、Qdrant 派生索引、私有 Qwen3 嵌入服务、7 流 `HybridSearchOrchestrator`）、梦境管家记忆整合 worker、智能体记忆自我改进循环、已发布的 SDK 中间件包，以及跨 v1.7–v2.0 版本线交付的商业 SaaS 基础设施构建而成。

| 能力 | 状态 | 位置 |
|---|---|---|
| Repo graph API + MCP 工具（`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`） | ✅ 生产 | `packages/repo-graph`、`apps/api`、`apps/mcp-server` |
| 代码知识图谱索引器 | ✅ 生产 | `packages/code-indexer`、`packages/code-indexer-python` |
| Context Query 组合记忆 + 网页 + 代码仓库 + 工具调用链路 | ✅ 生产 | `apps/api`、`docs/api-reference.md` |
| 7 流 `HybridSearchOrchestrator`（FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki） | ✅ 生产 | `packages/search` |
| 交叉编码器重排器（后融合，可选启用） | ✅ 生产 | `apps/api/src/rerankers/` |
| 梦境管家记忆整合（prune / merge / resolve / surface） | ✅ 生产，标志门控 | `apps/api/src/workers/butler-v18.ts` |
| 智能体记忆自我改进循环 + 上下文配方 | ✅ 生产，人工门控晋级 | `packages/eval`、`packages/search`、`ops/context-recipes/` |
| SDK 中间件（OpenAI / Anthropic 客户端自动注入 + 自动保留） | ✅ 已发布 | `packages/sdk-middleware-typescript`、`packages/sdk-middleware-python` |
| AI 智能体密钥保险库（MCP 原生，三按钮授权） | ✅ Beta，待加密审计 | `apps/mcp-server`、`apps/api` |
| 云记忆引擎：RDS 真实存储 + SQS worker 扇出 + Qdrant 索引 | ✅ 生产 | `apps/api`、`apps/api/src/worker.ts` |
| 私有 Qwen3-Embedding-0.6B 1024 维向量服务 | ✅ 生产 | `apps/api/src/embedding.ts` |
| 自动 capture 摄取和 Memory Inbox 异常 | ✅ 生产 | `apps/api`、`packages/capture` |
| Google 登录 + 个人保险库引导 | ✅ 生产 | `apps/api`、`apps/dashboard` |
| 商业 SaaS：个人订阅、计费、配额门控 | ✅ 生产 | 托管云（`Lore-Context/lore-cloud`） |
| 带 API 密钥认证的 REST API（reader/writer/admin） | ✅ 生产 | `apps/api` |
| `/openapi.json` 处的 OpenAPI 3.1 合约（报告 `2.1.0`） | ✅ 生产 | `apps/api/src/openapi.ts` |
| MCP stdio 服务器（旧版 + 官方 SDK 传输） | ✅ 生产 | `apps/mcp-server` |
| 带 Google 会话 + operator Basic Auth 的 Next.js 仪表盘 | ✅ 生产 | `apps/dashboard` |
| Evidence Ledger API + 仪表盘摘要 | ✅ 生产 | `apps/api`、`apps/dashboard` |
| 治理状态机 + 审计日志 | ✅ 生产 | `packages/governance` |
| Eval runner（Recall@K / Precision@K / MRR / staleHit / p95） | ✅ 生产 | `packages/eval` |
| MIF v0.2 导入/导出，含 `supersedes` + `contradicts` | ✅ 生产 | `packages/mif` |
| 模型网关（多提供商任务→模型路由） | ✅ 生产 | `packages/model-gateway` |
| 带版本探测 + 降级模式的 `agentmemory` 适配器 | ✅ 生产 | `packages/agentmemory-adapter` |
| 速率限制、带字段脱敏的结构化 JSON 日志 | ✅ 生产 | `apps/api` |
| Docker Compose 私有部署 | ✅ 生产 | `docker-compose.yml` |
| `pnpm quickstart` 本地采用助手 + 激活报告 | ✅ 生产 | `scripts/lore-quickstart.mjs` |
| 官方 MCP Registry + 分发 / 发布 / 设计合作伙伴文档 | ✅ 生产 | `server.json`、`docs/distribution/`、`docs/launch/` |

完整发布历史请参见 [CHANGELOG.md](../../../CHANGELOG.md)。

## 当前发布状态

`v2.1.0` 是当前源码、托管生产环境和发布版本线。它通过优化的发布流程部署至 AWS 生产环境和公共网站：不可变 arm64-first 制品、staging API 冒烟测试、生产 API 部署、独立网站部署、发布后审计，以及 tag/release 收尾。外部检查确认 `https://api.lorecontext.com/health` 返回 `status=ok`，`/openapi.json` 报告 `2.1.0`，`https://lorecontext.com/status.html` 包含 `v2.1.0`。

生产环境保持 v1.1+ 的 RDS / SQS / memory-worker / Qdrant 云形态，使用 `lore_memories_v12` 作为 Qdrant 集合，保持 Postgres 路径的 1024 维 pgvector，并新增附加式 repo graph 模式（`apps/api/src/db/schema-v21-repo-graph.sql`）。

当前公开安全状态快照请参见 [docs/release-status.md](../../release-status.md)，完整发布说明请参见 [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)。

## 发布重点

v2.1 版本将 Lore 的代码仓库图谱作为一级智能体记忆面。目标是让智能体能够针对确定性、稳定的项目上下文契约回答"X 在哪里定义"、"什么调用了这个"以及"我修改这个会破坏什么"，而非依赖临时文本搜索：

- `@lore/repo-graph` — 对文件、符号、导入、调用、路由、测试和流程提示进行确定性的 TypeScript/JavaScript 仓库索引。
- API 路由：`POST /v1/repo/graph/query`、`POST /v1/repo/symbol/context`、`POST /v1/repo/impact` 和 `POST /v1/repo/detect-changes`。
- MCP 工具：`repo.graph_query`、`repo.symbol_context`、`repo.impact` 和 `repo.detect_changes`（只读）。
- `context_query(repo)` 现在在可用时使用提供商支持的 repo graph 证据，并在未配置 repo graph 存储时诚实地提供不可用回退。
- Repo graph Postgres 模式为附加式——它叠加在现有生产模式之上，并在生产/staging 模式设置期间应用。

根包和 API 包版本均报告 `2.1.0`，使 `/openapi.json` 与发布标签匹配。发布列车使用 v2.0.9 之后引入的优化拆分 API/网站部署护栏。

请参见 [docs/project-plan.md](../../project-plan.md)、[docs/roadmap.md](../../roadmap.md) 和 [docs/release-governance.md](../../release-governance.md)。

## 集成

Lore Context 支持 MCP 和 REST，可与大多数智能体 IDE 和聊天前端集成：

| 工具 | 配置指南 |
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
| 其他 / 通用 MCP | [docs/integrations/README.md](../../integrations/README.md) |

## 部署

| 模式 | 适用场景 | 文档 |
|---|---|---|
| **本地文件存储** | 独立开发、原型验证、冒烟测试 | 本 README，上方快速开始 |
| **本地 Postgres+pgvector** | 单节点本地回退和迁移测试 | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose 私有** | 自托管团队部署、隔离网络 | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **托管云** | RDS / SQS / memory-worker / Qdrant / 私有嵌入，加上图谱增强混合召回栈和商业 SaaS 基础设施 | [docs/release-status.md](../../release-status.md) |

所有部署路径均需要显式密钥。本地/私有路径需要 `POSTGRES_PASSWORD`、`LORE_API_KEYS` 和仪表盘认证。托管部署还需要 RDS、SQS、Qdrant、嵌入服务、OAuth、隧道配置和生产运行时导出。`scripts/check-env.mjs` 脚本在任何值匹配占位符模式时拒绝生产启动。

## 安全

v2.1.0 为普通用户访问保持了本地/私有部署态势和托管云护栏：

- **认证**：API 密钥不记名令牌，具有角色分离（`reader`/`writer`/`admin`）和按项目范围。生产环境下，空密钥模式失败关闭。
- **速率限制**：每 IP + 每密钥双桶，带认证失败退避（60 秒内 5 次失败后 429，30 秒锁定）。
- **仪表盘**：托管产品使用 Google 会话流；本地/私有 operator 部署仍可使用 HTTP Basic Auth。
- **容器**：所有 Dockerfile 以非 root `node` 用户运行；api + dashboard 均有 HEALTHCHECK。
- **密钥**：零硬编码凭据；所有默认值均为必填或失败变量。`scripts/check-env.mjs` 在生产环境中拒绝占位符值。
- **治理**：写入时进行 PII / API key / JWT / 私钥正则扫描；风险标记内容自动路由到审查队列；每次状态转换均记录不可篡改审计日志。
- **记忆投毒**：对共识 + 命令式动词模式进行启发式检测。
- **MCP**：每个工具输入均使用 zod 模式验证；变更工具需要 `reason`（≥8 个字符）并暴露 `destructiveHint: true`；上游错误在返回客户端前经过清理。
- **Worker 隔离**：capture、嵌入、图谱、连接器和回填任务通过带 DLQ 的 AWS SQS 队列运行；Qdrant 是派生索引，RDS 保持权威性。
- **日志**：结构化 JSON，自动脱敏 `content`、`query`、`memory`、`value`、`password`、`secret`、`token`、`key` 字段。

漏洞披露：[SECURITY.md](../../../SECURITY.md)。

## 项目结构

```text
apps/
  api/                # REST 控制平面 + Postgres + 治理 + eval + repo graph
  dashboard/          # 带 Google 会话 + operator Basic Auth 的 Next.js 仪表盘
  mcp-server/         # MCP stdio 服务器（旧版 + 官方 SDK 传输）
  cli/                # lore CLI（doctor、wiki-recompile、数据集导入/导出）
  browser-extension/  # Capture 界面脚手架
  web/                # 服务器端 HTML 渲染器（无 JS 回退 UI）
  website/            # 营销网站（单独处理）
packages/
  shared/             # 共享类型、错误、ID/令牌工具
  agentmemory-adapter # 上游 agentmemory 桥接 + 版本探测
  search/             # 7 流 HybridSearchOrchestrator + 配方适配器
  repo-graph/         # 确定性仓库索引（v2.1）
  code-indexer/       # 代码知识图谱索引器（TypeScript/JavaScript）
  code-indexer-python # 代码知识图谱索引器（Python）
  capture/            # Capture 摄取原语
  connectors/         # 外部源连接器
  model-gateway/      # 多提供商任务→模型路由
  mif/                # 记忆交换格式（v0.2）
  eval/               # EvalRunner + 指标原语 + 上下文配方
  governance/         # 状态机 + 风险扫描 + 投毒检测 + 审计
  profile/            # 保险库 / 账户 profile 类型
  sdk-typescript/     # TypeScript 客户端 SDK
  sdk-python/         # Python 客户端 SDK
  sdk-go/ sdk-java/ sdk-dotnet/   # 其他语言 SDK
  sdk-middleware-typescript/      # 自动注入 + 自动保留中间件（npm）
  sdk-middleware-python/          # 自动注入 + 自动保留中间件（PyPI）
docs/
  i18n/<lang>/        # 17 种语言的本地化 README
  integrations/       # 智能体 IDE 集成指南
  deployment/         # 本地、Docker Compose 和生产自动化 runbook
  legal/              # 隐私 / 条款 / Cookie（新加坡法律）
scripts/
  check-env.mjs       # 生产模式环境变量验证
  smoke-*.mjs         # 端到端冒烟测试
  apply-postgres-schema.mjs
```

## 系统要求

- Node.js `>=22`
- pnpm `10.30.1`
- （可选本地回退）带 pgvector 的 Postgres 16
- （托管/高级）RDS PostgreSQL 16、AWS SQS、Qdrant 和私有嵌入服务

## 贡献

欢迎贡献。请阅读 [CONTRIBUTING.md](../../../CONTRIBUTING.md) 了解开发工作流、提交信息协议和审查期望。

文档翻译请参见 [i18n 贡献指南](../README.md)。

## 运营方

Lore Context 由 **REDLAND PTE. LTD.**（新加坡，UEN 202304648K）运营。公司简介、法律条款和数据处理文档位于 [`docs/legal/`](../../legal/)。

## 许可证

Lore Context 代码仓库基于 [Apache License 2.0](../../../LICENSE) 授权。`packages/*` 下的各个包声明为 MIT 以便下游使用。上游归属请参见 [NOTICE](../../../NOTICE)。

## 致谢

Lore Context 基于 [agentmemory](https://github.com/agentmemory/agentmemory) 作为本地记忆运行时构建而成。上游契约详情和版本兼容性策略记录于 [UPSTREAM.md](../../../UPSTREAM.md)。
