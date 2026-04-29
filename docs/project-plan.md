# Lore Context 项目计划书

Last updated: 2026-04-29

## 0. 负责人结论

`v0.6.0-alpha` 已完成公开发布和生产闭环。当前项目状态不是“准备 v0.6”，而是“v0.6 已上线，进入采用验证和 v0.7 决策”。

当前公开事实：

- GitHub Release: `v0.6.0-alpha` pre-release，发布时间 `2026-04-29T08:50:21Z`。
- Release tag: `v0.6.0-alpha` 指向 release commit `4f0eadf369e99e364bd06b7d3228b84a9f7501b9`。
- Public `main`: release tag 之后已有文档、分发、MCP Registry、Cursor adoption validation 和 marketplace asset 闭环提交。
- MCP distribution baseline: `1914718c3136fab2f7eed167445e97a910b62bb0`，GitHub Actions run `25110357633` passed。
- Adoption closure source: `1a64980682216d715d0da40a37ee03b0a752f9e9`，GitHub Actions run `25112973276` passed。
- MCP Registry: `io.github.Lore-Context/lore-context-mcp` 已在 Official MCP Registry 发布，状态 `active`，发布时间 `2026-04-29T13:16:42Z`；GHCR 镜像 `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.0` 已公开。
- Website: `https://lorecontext.com/` 和 `https://www.lorecontext.com/` 已显示 `v0.6.0-alpha`。
- AI-readable docs: `https://lorecontext.com/llms.txt` 和 `https://lorecontext.com/llms-full.txt` 已上线，且已与当前 website build 产物重新部署一致；`robots.txt` 包含 LLMs 指针。
- HN launch website surfaces: 官网源码已补齐 `/quickstart/`、`/blog/v0-6-distribution-and-trust-sprint/`、`/benchmark/`，并移除了未被公开报告支撑的 benchmark-win 数字。
- Public API health: `https://api.lorecontext.com/health` 返回 `status: ok`。

公开状态快照记录在 [release-status.md](release-status.md)。发布后的采用验证证据记录在
[adoption-validation.md](adoption-validation.md)。

下一阶段不应该立即转向 public SaaS、billing 或 managed cloud sync。v0.6 的价值是分发和信任闭环已经建立；接下来要验证真实采用：

**让开发者在 10 分钟内跑到第一条 `context.query`，在 15 分钟内看到第一条 Evidence Ledger，并确认他们愿意为私有部署、支持、治理和云端托管付费。**

一句话定位保持不变：

**Lore 不是另一个记忆数据库，而是让团队能审计、治理、评估、迁移 agent memory 的可信上下文控制平面。**

## 1. 当前项目状态

| 项目面 | 当前状态 |
|---|---|
| 公开版本 | `v0.6.0-alpha` pre-release |
| 根版本 | `0.6.0-alpha.0` |
| 公开仓库 | `Lore-Context/lore-context` |
| 当前公开线 | `main`，release tag 之后包含 release-closure、integration validation、MCP distribution、Cursor adoption validation 和 marketplace asset commits |
| 公开 tag | `v0.6.0-alpha` at `4f0eadf369e99e364bd06b7d3228b84a9f7501b9` |
| GitHub Release | `https://github.com/Lore-Context/lore-context/releases/tag/v0.6.0-alpha` |
| MCP distribution baseline | run `25110357633`, success on `1914718c3136fab2f7eed167445e97a910b62bb0` |
| Adoption closure CI | run `25112973276`, success on `1a64980682216d715d0da40a37ee03b0a752f9e9` |
| 官网 | `https://lorecontext.com/` and `https://www.lorecontext.com/` live |
| AI-readable docs | `/llms.txt`, `/llms-full.txt`, `robots.txt` live |
| HN launch pages | `/quickstart/`, `/blog/v0-6-distribution-and-trust-sprint/`, `/benchmark/` in current website release train |
| Public API | `https://api.lorecontext.com/health` returns ok |
| MCP Registry | Official Registry active for `io.github.Lore-Context/lore-context-mcp`; publish workflow run `25111065964`, success |
| HN launch | deferred by HN new-account Show HN restriction; draft preserved for retry |
| 私有云端组件 | 存在并在闭源仓库维护，不属于公开 alpha 承诺 |
| 当前公开非目标 | public hosted SaaS, billing, managed cloud sync, remote MCP HTTP default |

### 1.1 v0.6 已交付能力

- REST API with API-key auth, role separation, rate limiting, structured logging, graceful shutdown.
- OpenAPI 3.1 at `GET /openapi.json` and `pnpm openapi:check`.
- `pnpm quickstart -- --dry-run --activation-report` for redacted activation proof.
- MCP stdio server using both legacy and official SDK transports.
- Dashboard behind HTTP Basic Auth.
- Evidence Ledger API and Dashboard summary for retrieved / used / ignored / missing / stale / conflicting / risky memory evidence.
- JSON-file and Postgres+pgvector persistence.
- Governance state machine, risk scanning, poisoning heuristics, immutable audit log.
- Eval runner and JSON/Markdown report export.
- Public-safe eval report CLI.
- MIF v0.2 import/export with `supersedes` and `contradicts`.
- Docker Compose private deployment path.
- Public website and static docs across 17 locales.
- AI-readable docs at `/llms.txt` and `/llms-full.txt`.
- Distribution metadata drafts under `docs/distribution/`.
- Launch drafts under `docs/launch/`.
- Design partner intake and activation scorecard under `docs/design-partners/`.
- Public launch pages for quickstart, v0.6 changelog narrative, and benchmark
  methodology.

### 1.2 v0.6 发布边界

公开 release 只包含 Lore open-core source、public docs、website、demo dataset、integration templates、distribution drafts、launch drafts 和 release notes。

不属于公开 release 承诺：

- hosted multi-tenant SaaS;
- billing / Stripe;
- managed cloud sync;
- remote MCP HTTP as default path;
- autonomous marketplace / HN / Reddit / Discord submission;
- private cloud runbooks, customer data, production memory exports, secrets, tenant administration.

### 1.3 Adoption validation 当前状态

这些是 v0.6 之后的 adoption-validation 项，不是 v0.6 发布 blocker。当前状态：

| 验证项 | 当前状态 | 下一步 |
|---|---|---|
| clean checkout activation timing | 完成；fresh clone 到 first `context.query` 和 first Evidence Ledger 均为 `10.13s` | 用真实用户 session 复核可重复性 |
| Claude Code golden path | 完成；真实 `claude mcp add/list/get` 跑通，并修复了参数顺序文档问题 | 收集用户按文档自助跑通证据 |
| Cursor golden path | 完成；`cursor-agent` 登录后，真实 prompt-level `context_query` 返回 trace `ctx_479d26d6-d0b2-48ba-9bbe-7b0ac943c145` 且匹配 seeded memory；`trace_get` 返回 2 retrieved / 2 used | 后续用真实用户重复验证 |
| Qwen Code golden path | 完成；`@qwen-code/qwen-code` `0.15.5` 已安装，`qwen mcp list` 连接项目 `.qwen/settings.json`，非交互 Qwen Code 成功调用 `mcp__lore__context_query` | 后续用真实用户重复验证 |
| Official MCP Registry | 完成；`server.json` 通过校验，GHCR OCI 镜像公开，workflow `25111065964` 成功发布到 Registry，Registry API 返回 `active` / `isLatest: true` | 后续只需在新版本发布时重复 workflow |
| Show HN launch | deferred；HN 新账号暂时限制 Show HN，未发布帖子 | 等账号有正常社区活动后重试，不绕过限制 |
| HN launch website readiness | 源码已补齐 quickstart/blog/benchmark 页面，且文案不再声明未证实 benchmark win | 部署后复核生产域名、sitemap 和移动端 smoke |
| public-safe eval report on partner data | 未完成 | 等 design partner 提供 sanitized data 或使用公开 fixture |
| design partner workflow validation | 未完成 | 目标 3-5 个 activation scorecard |
| second-day retention | 未完成 | design partner session 后第二天复查 |
| willingness-to-pay signal | 未完成 | 在 partner follow-up 中记录 private deployment / support / hosted cloud 付费意愿 |
| private cloud runbook / backup / observability | 持续复核 | 保留在闭源仓库和内部 operator notes |

## 2. 市场判断

2026 年 agent memory 市场已经分层：

- 基础 memory 正在被平台吸收，例如 GitHub Copilot Memory 和 Cloudflare Agent Memory。
- 独立 memory vendor 已经很强，例如 Mem0、Letta、Zep/Graphiti、Cognee、Supermemory。
- 分发入口正在迁移到 AI-readable docs、MCP Registry、agent skills/plugins、IDE/agent marketplaces 和社区 launch。

结论：

Lore 不应把自己定位成“更便宜的 memory database”。v0.6 已经把产品推到更清晰的位置：

**agent memory trust control plane**。

核心差异化继续是：

1. Evidence Ledger: 解释 agent 用了什么记忆、没用什么记忆、为什么。
2. Governance: memory lifecycle、risk scanning、audit log。
3. Eval: 在用户自己的数据上评估 recall、precision、MRR、stale-hit、latency。
4. MIF: memory backend 迁移和可移植。
5. Private deployment: 团队可以在自己的边界里运行。

## 3. 下一阶段计划

### 3.1 当前阶段

阶段名：`v0.6 adoption validation`

目标：

- 证明开发者可以快速发现、安装、验证 Lore。
- 证明 Evidence Ledger / Eval / Governance / MIF 不是营销概念，而是用户能在自己的工作流中看到的证据。
- 用设计伙伴反馈决定 `v0.7` 是 private hosted alpha、remote MCP HTTP，还是 enterprise/private-deployment hardening。

### 3.2 立即行动清单

| 优先级 | 工作 | 成功证据 |
|---|---|---|
| P0 | Design partner intake | 3-5 个目标用户进入 activation scorecard |
| P0 | Marketplace / MCP hub metadata 人审 | Official MCP Registry 已完成；demo screenshot 素材已生成；其他 marketplace/hub 需人工最终提交 |
| P0 | Show HN retry preparation | draft 已保存；账号限制解除后由人审重试 |
| P0 | HN launch website redeploy verification | `/quickstart/`, `/blog/v0-6-distribution-and-trust-sprint/`, `/benchmark/`, sitemap 和首页首屏线上一致 |
| P0 | clean checkout activation timing follow-up | 已有机器验证；再补真实用户计时 |
| P1 | public-safe eval report on partner data | 无 secret、raw memory、hard-deleted content |
| P1 | private alpha runbook refresh | backup/restore、observability、customer data policy 复核完成 |

### 3.3 v0.7 候选路线

根据 v0.6 adoption evidence 决策：

1. **Private hosted alpha**: 如果设计伙伴明确要求托管和支持，并愿意付费。
2. **Remote MCP HTTP**: 如果 MCP stdio adoption 足够强，但多机/远程 agent 需求成为 blocker。
3. **Enterprise/private-deployment hardening**: 如果用户主要关心审计、备份、恢复、运维、合规。
4. **Benchmark/report lane**: 如果 launch 后技术社区要求更强的公开评测证据。

## 4. Release gates

v0.6 实现阶段已经使用的 release gate：

```bash
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm openapi:check
pnpm quickstart -- --dry-run --activation-report
pnpm --filter @lore/website test
pnpm audit --prod
```

发布后状态复核：

- GitHub release and tag verified.
- Public `main` CI verified.
- Website production domains verified.
- `/llms.txt`, `/llms-full.txt`, and `robots.txt` verified.
- Public API health verified.
- Clean checkout activation machine timing captured.
- Claude Code actual-client path verified.
- Cursor actual-client prompt-level context query and trace retrieval verified.
- Qwen Code actual-client context query verified.
- MCP Registry publish verified: GHCR package is public, anonymous Docker
  manifest lookup succeeds, and GitHub Actions run `25111065964` published
  `io.github.Lore-Context/lore-context-mcp` as an active Registry listing.
- Private cloud and AWS production evidence are tracked in internal operator notes, not public docs.

## 5. ADR: v0.6 之后的方向

Decision:

- `v0.6.0-alpha` 已作为 Distribution and Trust Sprint 发布。
- 现在进入 adoption validation，不立即开启 public SaaS/billing sprint。

Drivers:

- 平台和 memory vendor 正在快速商品化基础 memory。
- Lore 的稀缺价值是 evidence、governance、eval、portability、private deployment。
- v0.6 已经补齐可发现、可安装、可验证、可分享的路径。
- 下一步应该用真实用户数据选择 v0.7，而不是靠内部假设继续堆功能。

Rejected:

1. 立即做 public hosted SaaS。
   - Rejected because activation and willingness-to-pay evidence are still insufficient.
2. 立即做 billing。
   - Rejected because there is not enough design partner evidence.
3. 立即做大量 shallow integrations。
   - Rejected because v0.6 已经有 distribution drafts，下一步需要验证有效性。

Consequences:

- v0.7 之前的主工作不是大规模 backend expansion，而是 adoption evidence。
- 私有云端和 AWS 生产闭环继续保留，但公开文档只描述 public-safe 状态。
- 所有 marketplace、HN、Reddit、Discord、partner outreach 仍必须人审。
