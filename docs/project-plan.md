# Lore Context 项目计划书

Last updated: 2026-04-29

## 0. 负责人结论

Lore Context 已完成 `v0.5.0-alpha` 公开 Alpha Adoption Sprint：官网上线，公开仓库发布，闭源仓库建立，核心 API / MCP / Dashboard / Postgres / Governance / Eval / MIF / Docker Compose 能跑通，并新增 OpenAPI、quickstart、三条黄金集成路径和 Evidence Ledger。

下一阶段从“能发布”转为“验证真实采用”：

**v0.5 Design Partner Activation**

目标不是继续堆 memory 功能，而是让 5-10 个真实 agent 重度用户在 10 分钟内跑通 Lore，并愿意把一个真实 agent 工作流接进来。

一句话战略：

**基础 memory 正在被平台和 memory vendor 商品化。Lore 要赢，必须赢在团队级可信上下文控制平面：可证明、可评估、可迁移、可审计、可治理。**

## 1. 当前项目状态

### 1.1 已发布状态

| 项目面 | 当前状态 |
|---|---|
| 官网 | `https://www.lorecontext.com/` 已上线 |
| 公开仓库 | `Lore-Context/lore-context`，public |
| 闭源仓库 | `Lore-Context/lore-cloud`，private |
| 公开版本 | `v0.5.0-alpha` pre-release |
| CI | 公开仓库最近一次 `main` push CI 成功 |
| 核心能力 | REST API、MCP stdio、Next Dashboard、Postgres+pgvector、governance、eval、MIF、rate limit、structured logging、Docker Compose |
| 当前公开非目标 | hosted multi-tenant cloud sync、remote billing、public SaaS |

### 1.2 发布治理风险

当前本地 checkout 同时挂了公开远端 `origin` 和闭源远端 `closed`，且本地 `main` 相对 `origin/main` 处于双向分叉状态。后续必须把公开线和闭源线制度化，否则存在三个风险：

1. 内部部署、客户配置、商业计划误推到公开仓库。
2. 公开仓库和闭源仓库历史继续分叉，难以追踪哪条线是 release source of truth。
3. `v0.5` 开发过程中，open-core 与 hosted/private alpha 的边界变模糊。

`v0.5` 的第一项工作必须是发布治理，不是功能开发。

### 1.3 v0.5 发布状态

截至 2026-04-29，`v0.5.0-alpha` 已落地并准备公开发布：

- 已新增 OpenAPI 3.1 文档源和 `GET /openapi.json`。
- 已新增 `pnpm openapi:check`，用于验证 v0.5 必备路径和 auth scheme。
- 已新增 Evidence Ledger API：
  - `GET /v1/evidence/ledger/:trace_id`
  - `GET /v1/evidence/ledgers?project_id=&limit=`
- Dashboard Recent Traces 已显示 Evidence Ledger 摘要。
- 已新增 `pnpm quickstart -- --dry-run`，用于本地环境检查、随机 key 生成预览、first query curl 和三套 MCP config 输出。
- Claude Code / Cursor / Qwen Code 文档已补充 v0.5 smoke 与 troubleshooting。
- 已补充 `CHANGELOG.md`、README、Roadmap、Architecture、Deployment、API reference 和官网文档的 v0.5 发布状态。

发布后仍未完成：

- clean checkout 的真实 10-minute activation 人工计时；
- public/private 本地 checkout 拆分；
- private `lore-cloud` runbook；
- public-safe eval report 的进一步脱敏测试；
- 5-10 个 design partner 的真实工作流验证。

## 2. 外部市场更新

### 2.1 平台方正在内建基础 memory

- GitHub Copilot Memory 已经是 public preview，面向 Copilot Pro / Pro+ / Business / Enterprise，并允许 repository owner 查看和删除 memory；GitHub 文档也明确 memory 会 28 天自动删除以避免 stale information。
- Cloudflare Agent Memory 已进入 private beta，提供 profile 级 ingest / remember / recall / list / forget，并强调 memory profile 可被 agent、团队和工具共享。

结论：平台会吃掉“基础记忆”和“代码仓库局部 memory”需求。Lore 不应该宣传成 Copilot Memory 替代品。

### 2.2 独立 memory vendor 已经把基础能力价格压低

- Supermemory 免费层已包含 1M tokens/月、10K search queries/月、unlimited storage/users，Pro 为 19 美元/月，并包含 Claude Code、Cursor、OpenCode、OpenClaw、Codex 插件。
- Mem0 将 open source 定位为 self-hosted / full control，把 managed platform 的价值放在 5 分钟上线、managed infra、analytics、enterprise controls、dashboard。
- Zep / Graphiti MCP 已将 local temporal knowledge graph memory 打包成跨 MCP client 的本地体验。

结论：Lore 不要和这些产品比“谁存得更多、搜得更准”。我们要把竞争维度移到 evidence、governance、eval、portability。

### 2.3 `v0.5` 产品判断

`v0.5` 发布后必须回答一个 adoption 问题：

> 一个重度 agent 用户，能否在 10 分钟内把 Claude Code / Cursor / Qwen Code 接进 Lore，并看到一次 context query 的完整 evidence ledger？

如果不能，继续做云同步、billing、复杂 multi-tenant 都太早。

## 3. 产品定位

### 3.1 Lore 是什么

Lore Context 是 AI-agent memory 之上的可信上下文控制平面：

- 组合 memory、search、repo、tool trace；
- 记录 memory 是否被检索、是否被注入、是否被忽略；
- 识别 stale、conflict、sensitive、poisoning 风险；
- 在用户自己的数据集上评估 recall / precision / stale-hit / latency；
- 提供 MIF-like import/export，降低 memory backend 切换成本；
- 为团队和私有部署提供 audit、review、forget、role boundary。

### 3.2 Lore 不是什么

`v0.5` 继续不做：

- 通用 memory database；
- Supermemory / Mem0 / agentmemory clone；
- 全量 RAG / 知识库平台；
- 公开 hosted SaaS；
- 付费 billing；
- 多区域云同步；
- 复杂 enterprise SSO。

### 3.3 首批用户

`v0.5` 只服务三类用户：

1. 同时使用 Claude Code、Cursor、Qwen Code 的 agent 重度用户。
2. 在团队中担心 agent memory 过期、污染、泄露或不可迁移的技术负责人。
3. 愿意参与 private alpha 的 3-5 个设计伙伴。

## 4. v0.5 范围

### 4.1 v0.5 目标

`v0.5.0-alpha` 的发布目标与当前实现状态：

1. **10-minute activation**：从 clone 到第一次 `context.query` 成功，目标小于 10 分钟。代码路径已准备，仍需真人计时。
2. **3 条 golden paths**：Claude Code、Cursor、Qwen Code 均已有 copy-paste 配置、验证命令、故障排查。
3. **Evidence Ledger**：Dashboard 中能解释一次 context query 使用了什么、忽略了什么、为什么有风险、如何纠正或删除。
4. **OpenAPI + config generation**：REST API 可由机器读取，集成配置可自动生成并验证。
5. **Private Alpha 准备**：公开仓库只记录方向；tenant/auth/deploy/backup/observability 的具体 runbook 仍属于闭源 `lore-cloud`。

### 4.2 v0.5 非目标

- 不做 public SaaS signup。
- 不做 Stripe / billing。
- 不做 remote MCP HTTP 作为默认路径。
- 不新增大规模依赖。
- 不把闭源 IaC、客户配置、内部 runbook 放入公开仓库。
- 不对 Dify / FastGPT / OpenWebUI / Hermes / Cherry Studio 做深度端到端体验；它们继续保持文档级支持。

## 5. v0.5 架构设计

### 5.1 总体架构

```text
Developer / Operator
  |
  | 10-minute quickstart
  v
docs/getting-started.md + scripts/lore-quickstart.mjs
  |
  +--> generate .env.local, API keys, MCP config snippets
  +--> seed demo dataset
  +--> run local API + dashboard smoke
  |
  v
Claude Code / Cursor / Qwen Code
  |
  | MCP stdio / REST
  v
apps/mcp-server  ----->  apps/api
                          |
                          +--> context.query
                          +--> evidence ledger read model
                          +--> memory write/update/forget
                          +--> eval run + report export
                          +--> governance review queue
                          |
                          v
              JSON-file or Postgres+pgvector store
                          |
                          v
               apps/dashboard Evidence Ledger UI
```

### 5.2 OpenAPI 技术路径

`v0.5` 不引入 heavyweight API framework。推荐实现：

- 新增 `apps/api/src/openapi.ts`，用 TypeScript 常量维护 OpenAPI 3.1 document。
- 新增 `GET /openapi.json`。
- 新增 `scripts/verify-openapi.mjs`，验证：
  - 所有公开 REST route 均被文档覆盖；
  - request/response examples 可以 JSON.parse；
  - security scheme 包含 bearer auth；
  - v0.5 golden path endpoints 包含 `context.query`、memory write/search/list/get/forget、trace detail、eval run、evidence ledger。
- 不在 v0.5 阶段引入 Swagger UI runtime。官网/docs 可链接 `openapi.json`。

验收标准：

- `curl http://127.0.0.1:3000/openapi.json` 返回合法 OpenAPI JSON。
- `pnpm test` 覆盖 `/openapi.json`。
- `pnpm run doctor` 或新增 `pnpm openapi:check` 能在 CI 验证 route coverage。

### 5.3 Quickstart 技术路径

新增 `scripts/lore-quickstart.mjs`，目标是把新用户的本地步骤缩短为：

```bash
pnpm install
pnpm quickstart
```

脚本职责：

1. 检查 Node >= 22、pnpm 版本、端口占用。
2. 生成 `.env.local` 或 `data/dev.env`，使用 `crypto.randomBytes` 生成 reader/writer/admin keys。
3. 运行 `pnpm build`。
4. 启动 API 临时 smoke 或提示用户运行长期服务。
5. seed `demo-private` 数据。
6. 输出 Claude Code / Cursor / Qwen Code 三套可复制 MCP config。

限制：

- 不自动写入用户全局 IDE 配置。
- 不启动生产模式。
- 不生成任何固定 demo key。

验收标准：

- 在 clean checkout 中，`pnpm quickstart` 结束后能打印 `context.query` curl 和 3 个 MCP config。
- 所有生成 key 都不是 placeholder。
- quickstart 失败时输出明确 remediation。

### 5.4 Evidence Ledger 技术路径

当前 `ContextTrace` 已记录：

- `retrievedMemoryIds`
- `composedMemoryIds`
- `ignoredMemoryIds`
- `warnings`
- `latencyMs`
- `tokenBudget`
- `tokensUsed`
- feedback

`v0.5` 不需要先改数据库大结构，可以新增 trace-centric read model：

```ts
interface EvidenceLedger {
  traceId: string;
  query: string;
  projectId?: string;
  route: ContextRoute;
  summary: {
    retrieved: number;
    composed: number;
    ignored: number;
    warnings: number;
    riskTags: string[];
    staleCount: number;
    conflictCount: number;
  };
  rows: EvidenceLedgerRow[];
  actions: EvidenceLedgerAction[];
}

interface EvidenceLedgerRow {
  memoryId: string;
  contentPreview: string;
  disposition: "used" | "ignored" | "blocked";
  status: MemoryStatus;
  confidence: number;
  sourceRefs: SourceRef[];
  riskTags: string[];
  warnings: string[];
  lastUsedAt?: string | null;
  supersededBy?: string | null;
}
```

新增 API：

- `GET /v1/evidence/ledger/:trace_id`
- `GET /v1/evidence/ledgers?project_id=&limit=`

Dashboard 新增 Evidence Ledger 页面/面板：

- 每条 context query 一张 ledger；
- 显示 used / ignored / warnings / feedback；
- 支持对 memory 执行：view、mark wrong、mark outdated、forget、supersede；
- 对 sensitive/redacted/candidate 只显示安全摘要。

验收标准：

- 跑 `pnpm smoke:api` 后能通过 trace id 获取 ledger。
- Dashboard smoke 能看到 ledger rows。
- Ledger 不泄露 hard-deleted memory 原文。

### 5.5 三条 golden integration paths

只打穿：

1. Claude Code
2. Cursor
3. Qwen Code

每条路径必须包含：

- copy-paste MCP config；
- minimal API startup command；
- `memory_write` smoke；
- `context_query` smoke；
- how to disable mutating tools；
- troubleshooting：
  - stdout 被 package-manager banner 污染；
  - API key 401/403；
  - port 3000 already in use；
  - agentmemory offline degraded；
  - scoped project id missing。

验收标准：

- `pnpm config:integrations` 输出三套 configs。
- 文档中每套 config 都包含 `LORE_API_URL`、`LORE_API_KEY`、`LORE_MCP_TRANSPORT=sdk`。
- `pnpm smoke:mcp` 继续验证 legacy + official SDK stdio。

### 5.6 Eval report 技术路径

把现有 `pnpm eval:report` 产品化：

- 输出 Markdown + JSON；
- report header 包含 dataset id、provider id、run id、timestamp、query policy、project id；
- 支持 `--public-safe`，默认隐藏 raw memory content，只输出 metrics + redacted examples；
- Dashboard 增加 latest eval card 和 download link。

验收标准：

- `pnpm eval:report -- --project-id demo-private --public-safe` 输出可分享 Markdown。
- 报告不包含 API key、raw secret、hard-deleted content。

### 5.7 闭源 `lore-cloud` 技术路径

`v0.5` 期间闭源仓库只做 private alpha readiness：

- tenant model：organization / project / user / API key scope；
- auth boundary：dashboard auth、API key lifecycle、admin invite policy；
- deployment runbook：Cloudflare Access + AWS single-host Compose；
- backup/restore：Postgres dump、restore drill、retention policy；
- observability：health checks、structured logs、basic metrics、alert checklist；
- customer data policy：where memory/eval/traces live, deletion path, support access.

明确不做：

- Stripe；
- self-serve signup；
- public hosted dashboard；
- enterprise SSO；
- multi-region active-active。

验收标准：

- 一个设计伙伴能拿到 private hosted URL；
- API 和 dashboard 都在 Cloudflare Access / API key 后面；
- restore drill 能从 backup 恢复 demo-private project；
- runbook 能让第二个 operator 复现部署。

## 6. 30 天执行计划

### Week 1: 发布治理与 Alpha 可用性

P0:

- 固定 public/private repo 工作流。
- 创建两个本地 checkout 或 worktree：
  - `lore-context-public` 只推 `origin`；
  - `lore-cloud-private` 只推 `closed`。
- 公开仓库开启 branch protection、required CI、secret scanning。
- 新增 OpenAPI document + `/openapi.json`。
- 新增 `pnpm quickstart`。
- 更新 Claude Code / Cursor / Qwen Code 三条集成文档。

验收：

- clean checkout 中 10 分钟内完成 first `context.query`。
- `pnpm build && pnpm test && pnpm smoke:api && pnpm smoke:mcp` 通过。
- public repo 不包含 internal launch plans、customer configs、cloud secrets。

### Week 2: 用户验证

P0:

- 找 5-10 个 AI agent 重度用户。
- 每个用户只验证一个真实 workflow。
- 记录 activation funnel：
  - clone start time；
  - install complete；
  - API healthy；
  - first memory write；
  - first context query；
  - first ledger view；
  - second-day return。
- 收集付费意愿：
  - hosted sync；
  - private deployment；
  - support；
  - audit/export reports。

验收：

- 至少 5 个用户完成 first context query。
- 至少 3 个用户完成一次 integration path。
- 至少 2 个用户愿意继续使用一周。

### Week 3: v0.5 产品化

P0:

- Evidence Ledger API + Dashboard。
- Eval report public-safe export。
- Memory stale/conflict review queue 更清晰。
- 文档补足 troubleshooting。

验收：

- Dashboard 能解释一条 trace 的 used / ignored / risky memory。
- Eval report 可分享且不泄露敏感内容。
- `v0.5.0-alpha` release notes 清楚说明 adoption improvements。

### Week 4: 商业 Alpha

P0:

- 闭源 `lore-cloud` 完成 private hosted alpha runbook。
- 只邀请 3-5 个设计伙伴。
- 不公开定价，不接 Stripe。
- 准备 1-2 个 case study outline，不暴露客户数据。

验收：

- private hosted alpha 能跑 demo-private workflow。
- backup/restore drill 通过。
- 设计伙伴能在 hosted 环境中完成 first context query。

## 7. 文件级实施计划

### Public repo: `lore-context`

| 工作 | 文件/模块 |
|---|---|
| 项目计划 | `docs/project-plan.md` |
| 路线图 | `docs/roadmap.md` |
| 发布治理 | `docs/release-governance.md` |
| 架构更新 | `docs/architecture.md` |
| README 导航 | `README.md` |
| OpenAPI | `apps/api/src/openapi.ts`, `apps/api/src/index.ts`, `apps/api/tests/index.test.ts` |
| Quickstart | `scripts/lore-quickstart.mjs`, `package.json` |
| Config generation | `scripts/generate-integration-config.mjs`, `docs/integrations/*.md` |
| Evidence Ledger | `packages/shared/src/index.ts`, `apps/api/src/index.ts`, `apps/dashboard/app/page.tsx` |
| Eval report | `scripts/export-eval-report.mjs`, `packages/eval`, `apps/dashboard/app/page.tsx` |

### Private repo: `lore-cloud`

| 工作 | 文件/模块 |
|---|---|
| Private alpha runbook | `runbooks/private-alpha.md` |
| Tenant model | `docs/tenant-model.md` |
| Deployment architecture | `infra/README.md` or `docs/aws-cloudflare.md` |
| Backup/restore | `runbooks/backup-restore.md` |
| Observability | `runbooks/observability.md` |
| Customer data policy | `docs/customer-data-policy.md` |

## 8. v0.5 验收标准

`v0.5.0-alpha` 可以发布的条件：

1. Public repo:
   - `pnpm build` pass；
   - `pnpm test` pass；
   - `pnpm smoke:api` pass；
   - `pnpm smoke:mcp` pass；
   - `pnpm smoke:dashboard` pass；
   - `pnpm quickstart` pass in clean checkout；
   - `/openapi.json` pass schema/documentation coverage check。
2. Integrations:
   - Claude Code copy-paste config verified；
   - Cursor copy-paste config verified；
   - Qwen Code copy-paste config verified。
3. Evidence:
   - At least one smoke trace has ledger view；
   - Ledger shows retrieved / used / ignored / warning rows；
   - Trace feedback writes audit log。
4. Docs:
   - README links to plan, roadmap, OpenAPI, quickstart, three golden paths；
   - troubleshooting covers top 5 setup failures；
   - `docs/project-plan.md` reflects actual shipped state.
5. Private alpha:
   - `lore-cloud` has private alpha runbook；
   - backup/restore drill documented；
   - no billing code required.

## 9. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Public/private repo mix-up | Leaks internal plans or secrets | Separate checkout/worktree, branch protection, secret scan, no dual-remote day-to-day pushing |
| v0.5 scope creep | Misses adoption target | Freeze cloud sync/billing/extra integrations until after `v0.5.0-alpha` |
| Evidence Ledger leaks sensitive content | Trust failure | Redacted row rendering, hard-delete scrub, tests with secret fixtures |
| OpenAPI drifts from routes | Bad developer experience | Route coverage test in CI |
| Quickstart writes global config unexpectedly | User trust issue | Print config snippets; do not mutate global Claude/Cursor/Qwen files |
| Translation quality hurts credibility | Website trust issue | Label alpha translations, improve only high-traffic locales first |
| Competitors add governance/eval quickly | Differentiation narrows | Move fast on evidence ledger + user-owned eval reports |

## 10. Metrics

Activation:

- Time from clone to first `context.query`: target `<10 minutes`.
- Time from clone to first Evidence Ledger view: target `<15 minutes`.
- Quickstart success rate with 5 users: target `>=80%`.

Engagement:

- Users who run an eval after first query: target `>=40%`.
- Users who return next day: target `>=30%`.
- Users who connect an IDE agent instead of only curl: target `>=50%`.

Commercial signal:

- Design partners willing to try hosted/private alpha: target `3`.
- Design partners willing to discuss paid private deployment/support: target `2`.

Quality:

- `pnpm build/test/smoke:*` pass before release.
- Zero known P0 security issues.
- No placeholder secrets or internal launch plans in public repo.

## 11. ADR: v0.5 direction

Decision:

- Ship `v0.5 Alpha Adoption Sprint` focused on developer activation, three golden integrations, Evidence Ledger, OpenAPI, quickstart, and private alpha readiness.

Drivers:

- Platform and vendor memory are commoditizing basic storage/retrieval.
- Lore's moat is proof, governance, eval, portability, and team trust.
- The product must prove real workflow adoption before cloud sync or billing.

Alternatives considered:

1. Build hosted multi-tenant sync in v0.5.
   - Rejected: too early before activation and trust evidence.
2. Add many integrations at shallow depth.
   - Rejected: increases docs surface but does not prove adoption.
3. Compete on memory retrieval benchmarks.
   - Rejected: benchmark claims are crowded and easy to overfit; user-owned eval is more credible.

Consequences:

- v0.5 may look less feature-heavy than competitors, but it should be easier to try and more trustable.
- Cloud monetization is deferred until private alpha evidence exists.
- Evidence Ledger becomes the core product surface for future hosted plans.

Follow-ups:

- After v0.5, decide whether `v0.6` prioritizes hosted sync, remote MCP HTTP, or enterprise private deployment based on design partner evidence.
