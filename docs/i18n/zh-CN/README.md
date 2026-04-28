<div align="center">

# Lore Context

**AI 智能体记忆、评测与治理的控制平面。**

掌握每个智能体记住了什么、使用了什么、应该遗忘什么——在记忆成为生产风险之前。

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[快速入门](getting-started.md) · [API 参考](api-reference.md) · [架构](architecture.md) · [集成](integrations.md) · [部署](deployment.md) · [变更日志](CHANGELOG.md)

🌐 **选择语言**: [English](../../../README.md) · [简体中文](README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

> 🤖 本文档由英文版机器翻译生成。欢迎通过 PR 改进 — 参见[翻译贡献指南](../README.md)。

---

## 什么是 Lore Context

Lore Context 是 AI 智能体记忆的**开放核心控制平面**：它跨记忆、搜索和工具追踪组合上下文；在你自己的数据集上评测检索质量；将敏感内容路由至治理审核；并将记忆导出为可在后端之间迁移的便携互换格式。

它不尝试成为另一个记忆数据库。独特价值在于位于记忆之上的层：

- **上下文查询（Context Query）** — 单一端点组合记忆 + 网络 + 仓库 + 工具追踪，返回带来源标注的分级上下文块。
- **记忆评测（Memory Eval）** — 在你自己拥有的数据集上运行 Recall@K、Precision@K、MRR、过期命中率、p95 延迟；持久化运行结果并进行差异比对以检测回归。
- **治理审核（Governance Review）** — 六状态生命周期（`candidate / active / flagged / redacted / superseded / deleted`）、风险标签扫描、投毒启发式检测、不可变审计日志。
- **MIF 可移植性** — JSON + Markdown 导出/导入，保留 `provenance / validity / confidence / source_refs / supersedes / contradicts`。可作为记忆后端之间的迁移格式。
- **多智能体适配器** — 原生 `agentmemory` 集成，含版本探测 + 降级模式回退；为其他运行时提供干净的适配器契约。

## 使用场景

| 使用 Lore Context 的情形 | 使用记忆数据库（agentmemory、Mem0、Supermemory）的情形 |
|---|---|
| 需要**证明**你的智能体记住了什么、原因是什么、是否被使用 | 只需原始记忆存储 |
| 运行多个智能体（Claude Code、Cursor、Qwen、Hermes、Dify）并希望共享可信上下文 | 构建单一智能体且接受厂商锁定的记忆层 |
| 需要本地或私有部署以满足合规要求 | 偏好托管 SaaS |
| 需要在自有数据集上进行评测，而非厂商基准 | 厂商基准已足够 |
| 需要在系统间迁移记忆 | 不打算切换后端 |

## 快速开始

```bash
# 1. 克隆 + 安装
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. 生成真实 API key（不要在任何超出纯本地开发的环境中使用占位符）
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. 启动 API（文件存储，无需 Postgres）
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. 写入一条记忆
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. 查询上下文
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

完整设置（Postgres、Docker Compose、Dashboard、MCP 集成），参见 [docs/getting-started.md](getting-started.md)。

## 架构

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

详细信息参见 [docs/architecture.md](architecture.md)。

## v0.4.0-alpha 功能一览

| 功能 | 状态 | 位置 |
|---|---|---|
| REST API，含 API key 认证（reader/writer/admin） | ✅ 生产可用 | `apps/api` |
| MCP stdio 服务器（legacy + 官方 SDK 传输） | ✅ 生产可用 | `apps/mcp-server` |
| Next.js 仪表盘，含 HTTP Basic Auth 守卫 | ✅ 生产可用 | `apps/dashboard` |
| Postgres + pgvector 增量持久化 | ✅ 可选 | `apps/api/src/db/` |
| 治理状态机 + 审计日志 | ✅ 生产可用 | `packages/governance` |
| 评测运行器（Recall@K / Precision@K / MRR / staleHit / p95） | ✅ 生产可用 | `packages/eval` |
| MIF v0.2 导入/导出，含 `supersedes` + `contradicts` | ✅ 生产可用 | `packages/mif` |
| `agentmemory` 适配器，含版本探测 + 降级模式 | ✅ 生产可用 | `packages/agentmemory-adapter` |
| 速率限制（按 IP + 按 key，含退避策略） | ✅ 生产可用 | `apps/api` |
| 结构化 JSON 日志，含敏感字段脱敏 | ✅ 生产可用 | `apps/api/src/logger.ts` |
| Docker Compose 私有部署 | ✅ 生产可用 | `docker-compose.yml` |
| 演示数据集 + 冒烟测试 + Playwright UI 测试 | ✅ 生产可用 | `examples/`, `scripts/` |
| 托管多租户云同步 | ⏳ 路线图 | — |

完整 v0.4.0-alpha 发布说明参见 [CHANGELOG.md](CHANGELOG.md)。

## 集成

Lore Context 支持 MCP 和 REST，可与大多数智能体 IDE 及聊天前端集成：

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
| 其他 / 通用 MCP | [docs/integrations/README.md](integrations.md) |

## 部署

| 模式 | 适用场景 | 文档 |
|---|---|---|
| **本地文件存储** | 单人开发、原型、冒烟测试 | 本文档，上方快速开始 |
| **本地 Postgres+pgvector** | 生产级单节点、大规模语义搜索 | [docs/deployment/README.md](deployment.md) |
| **Docker Compose 私有部署** | 自托管团队部署、隔离网络 | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **云托管** | v0.6 版本推出 | — |

所有部署路径都需要显式配置密钥：`POSTGRES_PASSWORD`、`LORE_API_KEYS`、`DASHBOARD_BASIC_AUTH_USER/PASS`。`scripts/check-env.mjs` 脚本在生产启动时拒绝任何匹配占位符模式的值。

## 安全

v0.4.0-alpha 实现了适合非公开 alpha 部署的纵深防御安全态势：

- **认证**：API key Bearer token，含角色分离（`reader`/`writer`/`admin`）和按项目作用域限定。空 key 模式在生产环境下安全失败（fail closed）。
- **速率限制**：按 IP + 按 key 双桶机制，含认证失败退避（60 秒内 5 次失败后 429，锁定 30 秒）。
- **仪表盘**：HTTP Basic Auth 中间件。在生产环境下，未配置 `DASHBOARD_BASIC_AUTH_USER/PASS` 时拒绝启动。
- **容器**：所有 Dockerfile 以非 root `node` 用户运行；api + dashboard 含 HEALTHCHECK。
- **密钥**：零硬编码凭证；所有默认值均为必填或失败变量。`scripts/check-env.mjs` 在生产环境拒绝占位符值。
- **治理**：写入时进行 PII / API key / JWT / 私钥正则扫描；高风险内容自动路由至审核队列；每次状态转换追加不可变审计日志。
- **记忆投毒**：基于共识 + 命令动词模式的启发式检测。
- **MCP**：对每个工具输入进行 zod schema 验证；变更工具需要 `reason`（≥8 字符）并暴露 `destructiveHint: true`；上游错误在返回客户端前脱敏。
- **日志**：结构化 JSON，自动脱敏 `content`、`query`、`memory`、`value`、`password`、`secret`、`token`、`key` 字段。

漏洞披露：[SECURITY.md](SECURITY.md)。

## 项目结构

```text
apps/
  api/                # REST API + Postgres + 治理 + 评测（TypeScript）
  dashboard/          # Next.js 16 仪表盘，含 Basic Auth 中间件
  mcp-server/         # MCP stdio 服务器（legacy + 官方 SDK 传输）
  web/                # 服务端 HTML 渲染器（无 JS 回退 UI）
  website/            # 营销网站（单独处理）
packages/
  shared/             # 共享类型、错误、ID/token 工具
  agentmemory-adapter # agentmemory 适配器 + 版本探测
  search/             # 可插拔搜索提供商（BM25 / 混合）
  mif/                # 记忆互换格式（v0.2）
  eval/               # EvalRunner + 指标原语
  governance/         # 状态机 + 风险扫描 + 投毒检测 + 审计
docs/
  i18n/<lang>/        # 17 种语言的本地化文档
  integrations/       # 11 个智能体 IDE 集成指南
  deployment/         # 本地 + Postgres + Docker Compose 部署
  legal/              # 隐私 / 条款 / Cookie（新加坡法律）
scripts/
  check-env.mjs       # 生产模式环境变量验证
  smoke-*.mjs         # 端到端冒烟测试
  apply-postgres-schema.mjs
```

## 环境要求

- Node.js `>=22`
- pnpm `10.30.1`
- （可选）Postgres 16 + pgvector，用于语义搜索级别的记忆存储

## 贡献

欢迎贡献。请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发工作流、提交信息规范和审核预期。

文档翻译贡献，参见 [i18n 贡献指南](../README.md)。

## 运营方

Lore Context 由 **REDLAND PTE. LTD.**（新加坡，UEN 202304648K）运营。公司简介、法律条款和数据处理文档见 [`docs/legal/`](../../legal/)。

## 许可证

Lore Context 仓库采用 [Apache License 2.0](../../../LICENSE) 授权。`packages/*` 下的各包声明 MIT 许可以便下游使用。上游归因见 [NOTICE](../../../NOTICE)。

## 致谢

Lore Context 基于 [agentmemory](https://github.com/agentmemory/agentmemory) 作为本地记忆运行时。上游契约详情和版本兼容策略见 [UPSTREAM.md](../../../UPSTREAM.md)。
