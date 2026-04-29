# Lore Context 项目计划书

Last updated: 2026-04-29

## 0. 负责人结论

Lore Context 已完成 `v0.6.0-alpha` 发布包。当前公开仓库、官网、OpenAPI、quickstart activation report、MCP server、Dashboard、Evidence Ledger、Eval、MIF、Governance、Postgres/pgvector、Docker Compose 私有部署路径、AI-readable docs、distribution pack 和 design partner intake 都已经进入可试用状态。

下一阶段不应该急着做公开 SaaS、billing 或更复杂的 memory backend。2026 年的市场信号很清楚：基础 agent memory 正在被平台和 memory vendor 商品化。Lore 要赢，需要把 `v0.6.0-alpha` 发布后的验证重点放在 **Distribution and Trust Sprint** 的真实采用证据上：

**让开发者在 10 分钟内看到可审计的 agent memory 证据，并让 AI 工具、MCP registry、搜索入口和技术社区都能正确发现 Lore。**

一句话定位保持不变：

**Lore 不是另一个记忆数据库，而是让团队能审计、治理、评估、迁移 agent memory 的可信上下文控制平面。**

## 1. 当前项目状态

### 1.1 已发布事实

| 项目面 | 当前状态 |
|---|---|
| 公开版本 | `v0.6.0-alpha` pre-release |
| 根版本 | `0.6.0-alpha.0` |
| 公开仓库 | `Lore-Context/lore-context`，public |
| 当前公开线 | `origin/main` |
| 公开 tag | `v0.6.0-alpha` |
| GitHub Release | `https://github.com/Lore-Context/lore-context/releases/tag/v0.6.0-alpha` |
| 官网 | `https://lorecontext.com/` 和 `https://www.lorecontext.com/` 已上线 |
| 私有云端组件 | 存在，但不属于公开仓库发布面 |
| 当前核心能力 | REST API、MCP stdio、Next Dashboard、OpenAPI、quickstart activation report、Evidence Ledger、Eval、Governance、MIF、Postgres/pgvector、Docker Compose、17 locale docs、AI-readable docs、public-safe eval report、distribution pack |
| 当前公开非目标 | public hosted SaaS、billing、managed cloud sync、remote MCP HTTP default |

### 1.2 已完成能力

- REST API with API-key auth, role separation, rate limiting, structured logging, graceful shutdown.
- OpenAPI 3.1 at `GET /openapi.json` and `pnpm openapi:check`.
- `pnpm quickstart` for environment checks, random key preview, first-query curl, and Claude Code / Cursor / Qwen Code MCP snippets.
- MCP stdio server using both legacy and official SDK transports.
- Dashboard behind HTTP Basic Auth.
- Evidence Ledger API and Dashboard summary for retrieved / used / ignored / missing / stale / conflicting / risky memory evidence.
- JSON-file and Postgres+pgvector persistence.
- Governance state machine, risk scanning, poisoning heuristics, immutable audit log.
- Eval runner and JSON/Markdown report export.
- MIF v0.2 import/export with `supersedes` and `contradicts`.
- Docker Compose private deployment path.
- Public website and static docs across 17 locales.

### 1.3 未完成验证

These are now adoption-validation items, not v0.5 release blockers:

- clean checkout 的真实 10-minute activation 人工计时；
- first Evidence Ledger view 的真人完成率；
- Claude Code / Cursor / Qwen Code 三条 golden path 的 fresh-user copy-paste 验证；
- public-safe eval report 在真实设计伙伴数据上的脱敏验证；
- 5-10 个 design partner 的真实工作流验证；
- public/private 本地 checkout 的长期制度化拆分；
- 私有云端 alpha runbook、backup/restore、observability 的当前状态复核。

### 1.4 发布边界注意事项

公开 release 只包含 Lore 源码、公开 docs、demo dataset、website、integration
templates 和 release notes。外部调研快照、内部计划、私有 runbook、客户数据、
生产 memory export、hosted/cloud 配置和 secret-bearing material 不进入公开仓库发布面。

### 1.5 v0.6 当前执行状态

`v0.6` 已完成实现和本地 release gate 修复，进入公开发布与发布后采用验证：

| 工作包 | 当前状态 | 主要落点 |
|---|---|---|
| AI-readable discovery | 已实现并通过 website test | `apps/website/src/site.mjs`, `/llms.txt`, `/llms-full.txt`, canonical/OG/Twitter metadata |
| Activation evidence | 已实现并通过 dry-run + real first-value timing path；端口占用时 fail closed | `scripts/lore-quickstart.mjs`, `pnpm quickstart -- --dry-run --activation-report`, `LORE_API_URL=http://127.0.0.1:3099 pnpm quickstart -- --activation-report --skip-build --skip-seed` |
| Trust demo coverage | 已扩展 smoke | `scripts/smoke-api.mjs` now verifies public-safe eval report and MIF JSON export |
| Public-safe eval report CLI | 已实现 | `scripts/export-eval-report.mjs --public-safe` |
| Distribution docs | 已补齐 draft source and per-surface/plugin/security drafts | `docs/distribution/` |
| Launch content pack | 已补齐 draft source | `docs/launch/` |
| Design partner intake | 已补齐 draft source | `docs/design-partners/`, `.github/ISSUE_TEMPLATE/design-partner.yml` |

当前已验证命令：

```bash
pnpm --filter @lore/website test
pnpm quickstart -- --dry-run --activation-report
pnpm build
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm openapi:check
pnpm test
pnpm audit --prod
```

发布后仍未完成：

- clean checkout 10-minute activation 真人计时；
- marketplace/HN/Reddit/Discord/email 的人工发布；
- design partner 真实会话和 scorecard 数据。

## 2. 市场更新

### 2.1 基础 memory 正在平台化

- GitHub Copilot Memory 已是 public preview，并支持 repository owner 查看/删除 memory；GitHub 文档说明 memory 会 28 天自动删除以降低 stale information 风险。
- Cloudflare Agent Memory 已进入 private beta，用 profile 暴露 ingest / remember / recall / list / forget，并强调 shared memory across agents, people, and tools。
- Cloudflare 同时在 remote MCP server、OAuth、skills/plugin 安装路径上做平台级分发。

结论：平台会吃掉“基础记忆”和“本平台内 agent memory”需求。Lore 不应该宣传成 GitHub/Cloudflare memory 替代品，而应该成为跨平台 memory trust plane。

### 2.2 独立 memory vendor 已经很强

当前竞品格局：

| 玩家 | 当前信号 | 对 Lore 的含义 |
|---|---|---|
| Mem0 | GitHub 高星，OSS 强调 self-hosted、full control、server+dashboard、audit log、Postgres/pgvector | 不要正面打“memory database”；用 evidence/governance/eval/portability 拉开维度 |
| Letta | MemFS 把 agent memory 做成 git-backed context repository，由 agent 自主管理 markdown memory | Lore 应该强调外部控制平面和团队审计，而不是 agent 自我记忆框架 |
| Zep / Graphiti | local temporal knowledge graph MCP，跨 MCP client，本地隐私 | Lore 应该能解释和评估 graph memory，而不是复制 graph engine |
| Supermemory | 免费层和 $19/月 Pro 已包含插件生态，支持 Claude Code / Cursor / OpenCode / OpenClaw / Codex | Lore 不能靠低价 memory SaaS 取胜；要靠可信控制面和 private deployment |
| Cognee | 高星、活跃、主打开源 memory/RAG 结构化 | Lore 需要更清楚表达自己不是另一个 RAG/memory framework |

### 2.3 分发入口正在迁移

2026 年的 developer discovery 已经不只是 Google 和 GitHub README：

- AI-readable docs：`llms.txt` / `llms-full.txt` / markdown docs index 正在成为 AI agent 读取产品文档的低成本入口。
- MCP Registry：官方 registry preview 已经把公开 MCP servers 的发现、分发和子 registry 作为标准路径。
- Agent skills/plugins：Cloudflare 已经同时覆盖 Claude Code、Cursor、OpenCode、Codex 等 agent skill/plugin 安装路径。
- Marketplace：Vercel、Cloudflare、MCP 生态、IDE/agent plugin marketplace 都在把 AI infra 变成可安装组件。

结论：`v0.6` 的高 ROI 不是先做更多后台功能，而是让 Lore 被 AI 工具和开发者入口正确发现、安装、验证、引用。

## 3. 产品定位

### 3.1 Lore 是什么

Lore Context 是 AI-agent memory 之上的可信上下文控制平面：

- 组合 memory、search、repo、tool trace；
- 记录 memory 是否被检索、是否被注入、是否被忽略；
- 识别 stale、conflict、sensitive、poisoning 风险；
- 在用户自己的数据集上评估 recall / precision / stale-hit / latency；
- 提供 MIF import/export，降低 memory backend 切换成本；
- 为团队和私有部署提供 audit、review、forget、role boundary。

### 3.2 Lore 不是什么

当前阶段继续不做：

- 通用 memory database；
- Mem0 / Supermemory / Zep / Letta clone；
- 全量 RAG / 知识库平台；
- public hosted SaaS；
- Stripe / billing；
- 多区域云同步；
- enterprise SSO；
- 自动群发 outreach。

### 3.3 首批用户

1. 同时使用 Claude Code、Cursor、Qwen Code、OpenCode、Codex 或 Hermes 的 agent 重度用户。
2. 担心 agent memory 过期、污染、泄露、不可迁移的技术负责人。
3. 愿意参与 private alpha 的 3-5 个设计伙伴。
4. 需要把 AI memory 引入合规/安全流程的 infra/security lead。

## 4. v0.6 推荐方向

### 4.1 Release theme

`v0.6.0-alpha` 推荐主题：

**Distribution and Trust Sprint**

目标：

1. 把 v0.5 的“能跑通”变成 v0.6 的“容易被发现、容易安装、容易验证、容易分享”。
2. 让 Evidence Ledger、Eval report、Governance audit、MIF portability 形成一个完整 trust demo。
3. 准备 Show HN / marketplace / MCP registry / technical benchmark 的公开 launch package，但不伪造 benchmark，也不夸大 alpha 状态。

### 4.2 v0.6 implementation architecture

`v0.6` 的架构不是新增一个大系统，而是在 v0.5 substrate 上增加一层可发现、可验证、可交付的 adoption loop：

```text
AI tools / developers / MCP registry
  |
  | discover
  v
apps/website generated docs
  |-- /llms.txt
  |-- /llms-full.txt
  |-- SEO / Open Graph / sitemap / robots
  |
  | install and verify
  v
scripts/lore-quickstart.mjs
  |-- environment checks
  |-- no-global-mutation config snippets
  |-- local activation timing report
  |-- first memory write / context query / ledger fetch
  |
  | prove trust
  v
trust demo pack
  |-- examples/demo-dataset
  |-- Evidence Ledger trace
  |-- public-safe Eval report
  |-- Governance audit event
  |-- MIF export
  |
  | distribute and launch
  v
docs/distribution + docs/launch + docs/design-partners
  |-- MCP Registry metadata draft
  |-- marketplace/plugin drafts
  |-- Show HN draft
  |-- benchmark methodology
  |-- design partner activation scorecard
```

实现原则：

- public docs bundle 只能从公开 docs allowlist 生成，不能扫内部计划目录、私有 runbook 或未跟踪调研目录。
- quickstart 可以写本地项目文件，但默认不写用户全局 Claude/Cursor/Qwen/OpenCode/Codex 配置。
- trust demo 必须由脚本可重复跑出，不能只写营销文案。
- marketplace 和 outreach 只准备 metadata，不自动提交或群发。
- 所有 benchmark claim 必须有脚本输出或公开来源支撑。

### 4.3 AI-executable work packages

执行时建议按以下文件边界拆分，避免多个 agent 抢同一片代码：

| Package | Goal | Primary files | Exit evidence |
|---|---|---|---|
| A. Website discovery | 生成 `llms.txt` / docs bundle / metadata verify | `apps/website/src/site.mjs`, `apps/website/scripts/*`, `docs/getting-started.md`, `docs/integrations/README.md` | `pnpm --filter @lore/website test` |
| B. Activation report | quickstart 输出本地 timing report，保持 no-global-mutation | `scripts/lore-quickstart.mjs`, `scripts/generate-integration-config.mjs`, golden integration docs | `pnpm quickstart -- --dry-run` |
| C. Trust demo | 一条 demo 串起 query、ledger、eval、governance、MIF | `examples/demo-dataset/`, `scripts/seed-demo.mjs`, `scripts/smoke-api.mjs`, `scripts/export-eval-report.mjs`, `packages/eval` | `pnpm smoke:api`, `pnpm eval:report -- --project-id demo-private --public-safe --out output/eval-reports/demo.md` |
| D. Dashboard evidence | 确认 dashboard 展示 trust demo 的 ledger/eval 摘要 | `apps/dashboard/app/page.tsx`, `scripts/smoke-dashboard.mjs` | `pnpm smoke:dashboard` |
| E. Distribution docs | MCP registry 和 marketplace metadata 草稿 | `docs/distribution/*`, `README.md`, `apps/mcp-server/package.json` | markdown review + no auto-submit wording |
| F. Launch and partner docs | Show HN、deep dives、benchmark methodology、design partner scorecard | `docs/launch/*`, `docs/design-partners/*`, `.github/ISSUE_TEMPLATE/design-partner.yml` | docs exist, alpha status visible, no unsupported claims |

Internal execution handoff files live outside the public documentation surface.
Agents should stop at implementation completion and verification evidence. Human
operators still decide whether to submit marketplace listings, post HN/Reddit,
contact design partners, or tag/release.

### 4.4 v0.6 P0 工作流

#### P0-1: AI-readable docs and discovery

文件/模块：

- `apps/website/src/site.mjs`
- `apps/website/scripts/verify.mjs`
- `apps/website/dist/robots.txt`
- `apps/website/dist/sitemap.xml`
- new `apps/website/dist/llms.txt` and optional `llms-full.txt`
- `docs/getting-started.md`
- `docs/integrations/README.md`

交付：

- 官网生成 `llms.txt`，只列最关键的 docs、quickstart、OpenAPI、integrations、security/governance。
- 生成 `llms-full.txt` 或 docs bundle，供 AI coding tools 直接 ingest。
- 每个 docs 页面补齐 title / description / Open Graph / canonical / hreflang 验证。
- `robots.txt` 明确公开 docs、sitemap、llms 文件。

验收：

- `pnpm --filter @lore/website test` 验证 `llms.txt`、sitemap、17 locales、metadata。
- `curl https://lorecontext.com/llms.txt` 能让 AI agent 在 1-2 屏内找到 quickstart、OpenAPI、MCP setup、Evidence Ledger。

#### P0-2: One-command activation package

文件/模块：

- `scripts/lore-quickstart.mjs`
- `scripts/generate-integration-config.mjs`
- `package.json`
- `docs/getting-started.md`
- `docs/integrations/claude-code.md`
- `docs/integrations/cursor.md`
- `docs/integrations/qwen-code.md`

交付：

- 将 quickstart 文档压缩成 one-command first path：`pnpm quickstart -- --write-env` 仍保留；同时评估 `npx -y @lore-context/quickstart` 或 `pnpm dlx` 包装器。
- 记录 clean-checkout timing：clone、install、quickstart、API healthy、first memory write、first context query、first ledger view。
- 输出一个本地 `data/activation-report.json`，只含时间戳和本地步骤，不自动上传。

验收：

- fresh clone 到 first `context.query` < 10 分钟。
- first Evidence Ledger view < 15 分钟。
- quickstart 不写用户全局 Claude/Cursor/Qwen config。

#### P0-3: Trust demo pack

文件/模块：

- `examples/demo-dataset/`
- `scripts/export-eval-report.mjs`
- `packages/eval`
- `apps/dashboard/app/page.tsx`
- `docs/api-reference.md`

交付：

- 一个可重复 demo：memory write -> context query -> Evidence Ledger -> eval report -> governance review -> MIF export。
- public-safe eval report 默认 redacted；明确 dataset id、provider id、run id、timestamp、query policy。
- Dashboard 能用一个 trace 展示 used / ignored / risky / stale / conflict。

验收：

- `pnpm smoke:api && pnpm smoke:dashboard && pnpm eval:report -- --project-id demo-private --public-safe --out output/eval-reports/demo.md` 产出可公开展示的证据链。
- 报告不包含 API key、raw secret、hard-deleted content。

#### P0-4: MCP registry and marketplace metadata

文件/模块：

- new `docs/distribution/`
- new `docs/distribution/mcp-registry.md`
- new `docs/distribution/marketplace-metadata.md`
- `apps/mcp-server/package.json`
- `README.md`

交付：

- 官方 MCP Registry submission metadata draft。
- Claude Code / Cursor / OpenCode / Codex skill/plugin metadata draft。
- Vercel / Cloudflare / LangChain / marketplace listing copy drafts where applicable。
- Security note for MCP stdio and any future remote MCP path.

验收：

- 每个 listing 有 name、short description、long description、install command、logo/icon requirement、security posture、demo link、support link。
- 人工发布前必须 review；不允许 agent 自动提交 marketplace/outreach。

#### P0-5: Launch content pack

文件/模块：

- new `docs/launch/`
- new `docs/launch/show-hn-draft.md`
- new `docs/launch/benchmark-methodology.md`
- new `docs/launch/evidence-ledger-deep-dive.md`
- new `docs/launch/governance-deep-dive.md`

交付：

- Show HN 草稿：第一人称、透明 alpha、突出 evidence ledger。
- Benchmark methodology：先公开方法，不先夸结果；对比维度包括 activation、auditability、stale handling、portability，而不只是 Recall@K。
- 2 篇技术长文草稿：Evidence Ledger、Governance state machine。

验收：

- 所有 benchmark claim 都能由脚本输出或公开 source 支撑。
- 不贬低 Mem0 / Letta / Zep / Supermemory。
- 不隐藏 alpha 状态。

#### P0-6: Design partner intake and feedback loop

文件/模块：

- new `docs/design-partners/`
- new `docs/design-partners/intake.md`
- new `docs/design-partners/activation-scorecard.md`
- new `.github/ISSUE_TEMPLATE/design-partner.yml`

交付：

- 5-10 个 agent-heavy 用户的筛选标准。
- activation scorecard：clone time、install time、first query、first ledger view、integration path、eval report、second-day return、willingness to pay。
- GitHub issue/discussion 模板，方便收集结构化反馈。

验收：

- scorecard 可直接用于人工访谈或设计伙伴 onboarding。
- 不收集 secret、customer data、raw memory content。

### 4.5 v0.6 P1 工作流

- Design partner intake：GitHub Discussion 模板、feedback form、activation scorecard。
- Security hardening for MCP distribution：threat model、read-only mode、tool permission docs。
- OpenAPI client examples：TypeScript curl-equivalent snippets and minimal examples。
- Website hero/demo polish：60s demo asset or GIF, no fake customer logos.
- 私有云端 alpha runbook refresh：tenant model、backup/restore、observability、customer-data policy。

### 4.6 v0.6 非目标

- 不做 public SaaS signup。
- 不接 Stripe。
- 不把 remote MCP HTTP 设为默认路径。
- 不承诺 cloud sync 已上线。
- 不伪造 benchmark 结果。
- 不让 agent 自动群发邮件、Reddit、HN、Discord 或 marketplace submission。

## 5. v0.6 验收指标

Activation:

- Fresh clone to first `context.query`: `<10 minutes`.
- Fresh clone to first Evidence Ledger view: `<15 minutes`.
- First 5 fresh-user quickstarts: `>=80%` success without maintainer help.

Discovery:

- `/llms.txt` and `/llms-full.txt` pass website verify and are live.
- MCP Registry metadata is ready for human submission.
- 4 marketplace/plugin metadata drafts are ready.

Trust:

- One reproducible trust demo produces Evidence Ledger + eval report + governance audit + MIF export.
- Public-safe eval report contains zero secrets/raw hard-deleted content.
- Benchmark methodology is public-safe and reproducible before any comparison claim.

Launch:

- Show HN draft ready.
- Evidence Ledger deep dive ready.
- Governance deep dive ready.
- No hidden alpha-state or fake customer/social proof.

## 6. 14-day execution plan

### Days 1-3: Discovery and activation foundation

- Add `llms.txt` / docs bundle generation.
- Add website metadata verification.
- Improve quickstart output into a measured activation report.
- Run one clean-checkout timing pass.

### Days 4-6: Trust demo

- Build reproducible demo dataset flow.
- Ensure Evidence Ledger + eval report + governance audit can be shown from one trace.
- Harden public-safe redaction checks.

### Days 7-9: Distribution metadata

- Prepare MCP Registry metadata.
- Prepare skill/plugin/marketplace metadata drafts.
- Document MCP security posture and read-only mode.

### Days 10-12: Launch content

- Draft Show HN post.
- Draft Evidence Ledger technical article.
- Draft Governance technical article.
- Draft benchmark methodology without unsupported claims.

### Days 13-14: Release candidate

- Run full release gate.
- Update README / roadmap / changelog for v0.6.
- Verify website desktop/mobile/static checks.
- Prepare `v0.6.0-alpha` release notes and human launch checklist.

## 7. Release gates

Before tagging `v0.6.0-alpha`:

```bash
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm openapi:check
pnpm quickstart -- --dry-run
pnpm --filter @lore/website test
pnpm audit --prod
```

Manual gates:

- Fresh clone timing recorded.
- One Evidence Ledger trace inspected in dashboard.
- One public-safe eval report inspected.
- `llms.txt` and docs metadata checked on live preview.
- Public repo scan confirms no private cloud/customer material.

## 8. ADR: v0.6 direction

Decision:

- Make `v0.6.0-alpha` a Distribution and Trust Sprint instead of a hosted cloud or billing sprint.

Drivers:

- Platform memory is arriving quickly.
- Vendor memory is already cheap and plugin-rich.
- Lore's defensible difference is evidence, governance, eval, portability, and private deployment.
- v0.5 shipped the substrate; v0.6 must prove discoverability and adoption.

Alternatives considered:

1. Build hosted sync first.
   - Rejected: without activation evidence, cloud sync adds operational load before product pull is proven.
2. Compete on raw memory benchmarks first.
   - Rejected: crowded, easy to overfit, and not Lore's strongest differentiation.
3. Add many shallow integrations.
   - Rejected: broad docs surface without deeper proof does not create trust.

Consequences:

- v0.6 will look more like launch infrastructure than backend expansion.
- This is acceptable because v0.5 already shipped the technical substrate.
- Hosted/private alpha work remains outside this public repository and should stay design-partner driven.

Follow-ups:

- After v0.6 launch, decide whether `v0.7` is private hosted alpha, remote MCP HTTP, or enterprise deployment hardening based on actual adoption metrics.
