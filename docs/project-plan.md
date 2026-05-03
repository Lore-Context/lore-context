# Lore Context 项目计划书

Last updated: 2026-05-03

## 0. 负责人结论

`v0.6.0-alpha` 已完成公开 OSS alpha 发布和生产闭环；`v1.0.0-rc.0` 是历史闭源 personal cloud beta release candidate；`v1.0.0-rc.2 Public SaaS Beta Readiness` 已在公开仓库完成 tag、PR、GitHub Release、Cloudflare Pages 官网和 AWS API/Dashboard 生产部署验证。`v1.0.0-rc.2` 不是 stable GA；当前项目状态是“Public SaaS beta readiness 已上线，继续保持 invite/cap 控制，进入真实 beta 用户验证”。

完整 rc.2 lane 计划见 [`.omx/plans/lore-v1-rc2-public-saas-beta-readiness-plan.md`](../.omx/plans/lore-v1-rc2-public-saas-beta-readiness-plan.md)。

v1.0 / rc.2 生产发布事实：

- Public repo: `Lore-Context/lore-context`。
- Public SaaS beta readiness version line: `1.0.0-rc.2`。
- Public `main`: rc.2 release closure line includes Google-only onboarding, dashboard session cookies, CSRF-protected install-token issuance, Memory Inbox controls, capture automation, safety rails, observability/docs updates, and production deployment evidence.
- Release tag: `v1.0.0-rc.2` public pre-release tag.
- Website: Cloudflare Pages production deployment `https://97e0dc8c.lore-context.pages.dev`；`https://lorecontext.com/` 和 `https://www.lorecontext.com/` 均显示 `All your agents. One shared memory.`，首页 CTA 为 `Request beta access`，`/download` 正常重定向到 beta access 页面，`/llms.txt`、`/llms-full.txt`、`robots.txt` 均通过公网验证。
- AWS production: 新加坡 AWS runtime 运行 Docker Compose API、Dashboard、Postgres/pgvector；私有 instance ID、SSM command IDs、release host path 与账号细节仅记录在闭源 operator notes，不进入公开 track。
- AWS verification: rehearsal、deploy、post-deploy、env alignment、Google OAuth app-domain callback、OpenAPI 和外部 smoke 均通过；API、Dashboard、Postgres containers healthy。
- API proof: 外部 OpenAPI reports `1.0.0-rc.2` with 72 paths and retains v0.9 capture/connector foundations plus v1.0 Google start/callback、account、Memory Inbox、recall trace、usage、operator、hosted MCP surfaces。
- Public SaaS P0: 本地和生产均已实现 app-domain Google sign-in、dashboard session cookie、CSRF-protected self-service install-token issuance、dashboard redeem 到真实 `lct_device_` / `lct_service_` token 的闭环；2026-05-03 公网验证 `https://app.lorecontext.com/` 返回 `200`、`https://app.lorecontext.com/api/lore/auth/google/start` 返回 `200` 并生成真实 Google authorization-code URL，callback redirect URI 为 `https://app.lorecontext.com/api/lore/auth/google/callback`，`https://api.lorecontext.com/openapi.json` 返回 OpenAPI `3.1.0` (`1.0.0-rc.2`)，未授权 `https://api.lorecontext.com/v1/cloud/whoami` 返回 `401 cloud.token_required`。Public access 仍受 invite/cap 控制；这不是 stable GA 或开放 billing 发布。
- Core scope: Google-only onboarding、personal vault、agent connect、browser extension capture、connector framework、Memory Inbox、source-aware recall、Evidence Ledger traces、usage/cost guardrails、production website redesign。
- Public boundary: `v1.0.0-rc.2` 是 public SaaS beta readiness pre-release，不等于 public SaaS GA；billing、team/shared vault、BYOC/BYOK 和合规认证声明仍是后续阶段。

v0.8 闭源生产事实：

- Private repo: `Lore-Context/lore-cloud`。
- Private cloud version line: `0.8.0-beta.0`。
- Private `main`: v0.8 closure line 包含 post-deploy evidence。
- Release tag: `v0.8.0-beta` 指向闭源部署版本（私有 SHA 不进入公开 track）。
- Private CI: run `25164511648` 和 post-deploy evidence run `25165067958` passed。
- AWS production: 新加坡 AWS runtime 通过 Docker Compose 运行 API、Dashboard、Postgres/pgvector，并通过 Cloudflare Tunnel / Access 对外暴露。
- AWS deployed source: 闭源 `production-v0.8` 部署版本，具体 SHA 留存在闭源 operator notes。
- AWS verification: deploy 与 post-deploy verify 均通过；具体 SSM command IDs 不在 public track 暴露，留存在闭源 operator notes。
- API: `https://api.lorecontext.com/health` 受 bearer auth 保护；发布闭环用 SSM 内部检查和外部受保护状态一起验证。
- Dashboard: `https://app.lorecontext.com/` 受 Cloudflare Access 保护。
- Website: Cloudflare Pages deployment `https://ae146d38.lore-context.pages.dev`；`https://lorecontext.com/en/` 和 `https://www.lorecontext.com/en/` 均显示 `v0.8 cloud beta`。
- v0.8 proof: 本地集成分支通过 `pnpm build`、`pnpm test`、`pnpm openapi:check`、`pnpm smoke:api`、`pnpm smoke:mcp`、`pnpm smoke:dashboard`、`pnpm --filter @lore/website test`、`pnpm audit --prod`；生产 OpenAPI 内部验证为 `0.8.0-beta`，并暴露 persistent `/v1/cloud/*` 和 `/v1/capture/sessions` beta 路径。
- Public boundary: v0.8 personal cloud beta 不等于 public SaaS GA；公开开源 release 仍保持 `v0.6.0-alpha`，除非后续单独做 public release。

v1.0 产品决策：

- 当前版本为 `v1.0 Personal Cloud Beta RC`，不是 stable GA。
- 主线从“自动捕获”升级为“普通用户 3 分钟内 sign in / connect / first memory / first recall”。
- P0 包含 Google-only sign-in、personal vault、connected agents、Memory Inbox、browser extension capture、shared recall、Evidence Ledger、pricing/privacy/public website 闭环。
- 暂不做 full Team workspace、BYOC、完整 ADP/E2E 加密、Stripe billing、public stable GA 或大量浅层 connectors。

当前公开事实：

- GitHub Release: `v1.0.0-rc.2` pre-release，发布时间 `2026-05-03`；`v0.6.0-alpha` remains the historical public OSS alpha release.
- Release tag: `v1.0.0-rc.2` 指向 rc.2 public SaaS beta readiness source；`v0.6.0-alpha` remains at release commit `4f0eadf369e99e364bd06b7d3228b84a9f7501b9`。
- Public `main`: includes rc.2 merge, CI, production deployment closure, docs/website release metadata, plus the earlier distribution, npm MCP package, MCP Registry, Cursor/Qwen adoption validation, marketplace asset, and HN launch-readiness work.
- Closed `lore-cloud` main: historical v1.0 personal cloud beta closure line remains a private operator baseline; current public-safe production evidence is recorded in [release-status.md](release-status.md)。
- MCP distribution baseline: `1914718c3136fab2f7eed167445e97a910b62bb0`，GitHub Actions run `25110357633` passed。
- Adoption closure source: `1a64980682216d715d0da40a37ee03b0a752f9e9`，GitHub Actions run `25112973276` passed。
- MCP Registry: `io.github.Lore-Context/lore-context-mcp` 已在 Official MCP Registry 发布，状态 `active`，发布时间 `2026-04-29T16:23:19.42298Z`；Registry 当前列出 npm `@lore-context/server@0.6.0-alpha.1` 和 GHCR OCI `ghcr.io/lore-context/lore-context-mcp:0.6.0-alpha.1` 两条公共安装路径。
- npm MCP server package: `@lore-context/server@0.6.0-alpha.1` 已发布；fresh install 后 `lore-context-server` 通过 MCP SDK `tools/list` 返回 11 个工具。
- Website: `https://lorecontext.com/` 和 `https://www.lorecontext.com/` 已显示 `All your agents. One shared memory.`；live CTA 已改为普通用户优先的 `Request beta access` 入口，当前公开 pre-release 边界是 `v1.0.0-rc.2` Public SaaS Beta Readiness。
- AI-readable docs: `https://lorecontext.com/llms.txt` 和 `https://lorecontext.com/llms-full.txt` 已上线，且已与当前 website build 产物重新部署一致；`robots.txt` 包含 LLMs 指针。
- HN launch website surfaces: `/quickstart/`、`/blog/v0-6-distribution-and-trust-sprint/`、`/benchmark/` 已部署到生产官网并通过 `lorecontext.com` / `www.lorecontext.com` 验证；源码移除了未被公开报告支撑的 benchmark-win 数字。
- Public API health: `https://api.lorecontext.com/health` 返回 `ok`；外部 `/openapi.json` 返回 `1.0.0-rc.2` / 72 paths 用于 API discovery；beta 数据面仍需 bearer/session/Access 保护。
- AWS-backed production runtime: 当前线上 API/Dashboard/Postgres 均 healthy；Google OAuth start 使用 app-domain callback，callback error path、unauthenticated cloud protection 和 OpenAPI 版本已通过公网验证。私有 AWS instance、SSM command 和账号细节只记录在闭源 operator notes。

公开状态快照记录在 [release-status.md](release-status.md)。发布后的采用验证证据记录在
[adoption-validation.md](adoption-validation.md)。

下一阶段不应该立即转向 stable GA 或无边界 public self-serve SaaS。v0.9 的价值是“闭源 auto-capture beta 已可部署、可验证、可受保护地上线”；接下来要验证真实用户采用和成本/隐私闭环：

**让 beta 用户在 10 分钟内完成 account / connect agent / first captured memory / first shared recall，并确认他们愿意长期保留 Lore 作为跨 agent 共享记忆层。**

一句话定位保持不变：

**Lore 不是另一个记忆数据库，而是让团队能审计、治理、评估、迁移 agent memory 的可信上下文控制平面。**

## 1. 当前项目状态

| 项目面 | 当前状态 |
|---|---|
| 公开版本 | `v1.0.0-rc.2` pre-release |
| 云端版本 | `1.0.0-rc.2` |
| 公开根版本 | `1.0.0-rc.2` |
| 公开仓库 | `Lore-Context/lore-context` |
| 当前公开线 | `main`；包含 `v1.0.0-rc.2` public SaaS beta readiness closure、release metadata、production deploy evidence，以及 earlier release-closure、integration validation、npm MCP package、MCP distribution、Cursor/Qwen adoption validation、marketplace asset、HN launch-readiness commits |
| 公开 tag | `v1.0.0-rc.2` |
| GitHub Release | `https://github.com/Lore-Context/lore-context/releases/tag/v1.0.0-rc.2` |
| MCP distribution baseline | run `25110357633`, success on `1914718c3136fab2f7eed167445e97a910b62bb0` |
| Adoption closure CI | run `25112973276`, success on `1a64980682216d715d0da40a37ee03b0a752f9e9` |
| Launch-readiness CI | run `25115346417`, success on `f7fe14234ca89c02397da230de3e27f90576c469` |
| npm-backed Registry closure CI | run `25120831678`, success on `8637e37546b24caba4f170182beca613f0ba6d09` |
| Closed repo current baseline | `lore-cloud` v1.0 personal cloud beta closure line with post-closure OAuth/website source fixes; stable RC tag baseline remains in closed operator notes |
| Release | `v1.0.0-rc.2` public SaaS beta readiness pre-release |
| 官网 | `https://lorecontext.com/` and `https://www.lorecontext.com/` live with `All your agents. One shared memory.` |
| AI-readable docs | `/llms.txt`, `/llms-full.txt`, `robots.txt` live |
| HN launch pages | `/quickstart/`, `/blog/v0-6-distribution-and-trust-sprint/`, `/benchmark/` live on production domains |
| Public API | `https://api.lorecontext.com/health` returns `ok`; external `/openapi.json` reports `1.0.0-rc.2`; beta data surfaces remain auth-gated |
| AWS/API runtime | `v1.0.0-rc.2` release line; API, Dashboard, Postgres healthy. Specific release SHA and host paths stay in closed operator notes |
| MCP Registry | Official Registry active for `io.github.Lore-Context/lore-context-mcp`; npm + OCI package entries live; publish workflow run `25120707303`, success |
| npm MCP server package | `@lore-context/server@0.6.0-alpha.1` public; fresh install + MCP `tools/list` verified |
| HN launch | deferred by HN new-account Show HN restriction; draft preserved for retry |
| 云端组件 | v1.0.0-rc.2 public SaaS beta readiness 已在 AWS 生产闭环；仍受 invite/cap 控制 |
| 当前公开非目标 | stable GA, public billing, team/shared vault, BYOC/BYOK, compliance certification claims |

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
| Official MCP Registry | 完成；`server.json` 通过校验，npm package 和 GHCR OCI 镜像均公开，workflow `25120707303` 成功发布到 Registry，Registry API 返回 `active` / `isLatest: true` | 后续只需在新版本发布时重复 workflow |
| npm MCP server package | 完成；`@lore-context/server@0.6.0-alpha.1` 已发布到 npm，`npm view` / dist-tags / fresh install / MCP `tools/list` 均通过 | 后续把 npx 安装路径纳入 marketplace 和 fresh-user 文档 |
| Show HN launch | deferred；HN 新账号暂时限制 Show HN，未发布帖子 | 等账号有正常社区活动后重试，不绕过限制 |
| HN launch website readiness | 已完成；quickstart/blog/benchmark 页面在线上，且文案不再声明未证实 benchmark win | 后续每次官网部署后重复生产域名、sitemap 和移动端 smoke 复核 |
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

阶段名：`v1.0 personal cloud beta validation`

目标：

- 证明普通 beta 用户可以在 3-10 分钟内完成 Google sign-in、agent connect、first captured memory、first shared recall。
- 证明 Memory Inbox、Profile、Evidence Ledger、pause/export/delete 不是 UI 装饰，而是生产 API 和 Dashboard 都能执行的控制面。
- 证明低价/高免费额度策略不会造成不可控存储、推理和支持成本。
- 用 20-50 人 private beta 决定下一轮是扩大 connectors/browser extension、team/shared vault、ADP/BYOK 隐私增强，还是 enterprise/BYOC hardening。

### 3.2 立即行动清单

| 优先级 | 工作 | 成功证据 |
|---|---|---|
| P0 | Beta invite / onboarding | 20-50 个 beta slot；每个用户记录 sign in -> connect -> capture -> recall funnel |
| P0 | Google OAuth closure | Start URL、browser callback、Safari real Google sign-in、session cookie persistence、`/v1/me` production verified；logout multi-cookie clearing verified through Node/Cloudflare and covered by API regression test |
| P0 | Real local bridge validation | macOS Keychain、Claude Code/Codex config backup/rollback、disconnect/status 在真实用户机器验证 |
| P0 | Capture and Memory Inbox quality | 至少 10 个真实 session 进入 Memory Inbox，用户能 approve/reject/delete，且 source refs 正确 |
| P0 | Cross-agent recall proof | 同一个 vault 的记忆被至少 Claude Code + Codex 复用，Evidence Ledger 记录 retrieved/used/ignored |
| P0 | Privacy control proof | pause/private mode/MIF export/delete memory/delete source/delete vault 全部有生产验证记录 |
| P1 | Usage/cost guardrails | usage meter、caps、operator cost/user view 能发现异常用量，无 surprise overage |
| P1 | Support / incident playbook | 私有 beta 支持、回滚、数据删除、访问撤销流程走通 |
| P1 | Public docs boundary refresh | 官网展示 private beta 当前线，但不声明 public SaaS GA 或未经验证的 public signup |

### 3.3 下一轮候选路线

v1.0 已经把 adoption flywheel 的基础路径上线：用户登录后，Lore 主动从
agent session、网页 AI 对话和第一批连接器里捕获有价值的记忆，再通过
Memory Inbox、pause/private mode、delete/export 和 Evidence Ledger 保持控制与信任。

下一轮不按内部想象堆功能，按 beta 数据排序：

1. **Activation hardening**: 缩短 sign in -> connect -> first memory -> first recall 的时间，修掉真实机器上的安装、Keychain、agent config、浏览器扩展失败点。
2. **Connector depth**: 根据 beta 用户真实来源优先加深 Google Drive、Notion、Slack、GitHub 中 1-2 个，而不是一次性铺很多浅连接器。
3. **Recall quality**: 强化 source-aware ranking、stale policy、cross-agent trace、used/ignored explanation 和 feedback loop。
4. **Privacy/recovery**: 强化 pause/private mode、delete/export、account recovery、vault delete、operator audit。
5. **Usage economics**: 把 free/paid caps、retention、raw archive policy、support 成本用真实数据校准。
6. **Team or ADP/BYOK**: 只有当 beta 数据证明团队共享或高级隐私是主要付费理由时才进入 P0。

## 4. Release gates

v1.0 闭环使用的 release gate：

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
git diff --check
```

发布后状态复核：

- Public release tag `v1.0.0-rc.2` is the public SaaS beta readiness pre-release tag.
- Public PR merge and GitHub CI passed before production deployment; historical closed `v1.0.0-rc.0` remains a private operator baseline only.
- Cloudflare Pages production domains verified after deploy `97e0dc8c`; custom domains show `All your agents. One shared memory.`, root CTA is `Request beta access`, `/download` resolves to the beta access page, and `/llms.txt` / `/llms-full.txt` / `robots.txt` return `200`.
- AWS production rehearsal, deploy, env alignment, and post-deploy checks all passed; private SSM command IDs stay in closed operator notes.
- Google sign-in start verified through the app-domain proxy with redirect URI `https://app.lorecontext.com/api/lore/auth/google/callback`; callback denial redirects safely to `/?auth_error=400`.
- External OpenAPI verifies `1.0.0-rc.2` with 72 paths, including Google sign-in start/callback, Memory Inbox, recall traces, capture, source, connector, usage, operator, and hosted MCP surfaces.
- External API health, Dashboard root, and unauthenticated cloud protection verified.
- npm-backed Registry closure commit `8637e37546b24caba4f170182beca613f0ba6d09` verified by CI run `25120831678`.
- `/llms.txt`, `/llms-full.txt`, and `robots.txt` verified.
- Clean checkout activation machine timing captured.
- Claude Code actual-client path verified.
- Cursor actual-client prompt-level context query and trace retrieval verified.
- Qwen Code actual-client context query verified.
- MCP Registry publish verified: GHCR package is public, anonymous Docker
  manifest lookup succeeds, and GitHub Actions run `25120707303` published
  `io.github.Lore-Context/lore-context-mcp` as an active Registry listing.
- npm MCP server package verified: `@lore-context/server@0.6.0-alpha.1`
  resolves through `npm view`, installs from a fresh temporary directory, and
  returns 11 MCP tools over SDK stdio.
- Private cloud and AWS production evidence are tracked in `lore-cloud` / internal operator notes; public docs only expose public-safe boundary facts.

## 5. ADR: v1.0 之后的方向

Decision:

- `v0.6.0-alpha` 已作为 Distribution and Trust Sprint 发布。
- `v0.8.0-beta` 已作为 closed-source Personal Cloud Beta 部署闭环。
- `v1.0.0-rc.0` 已作为 historical closed-source Personal Cloud Beta RC 部署闭环。
- `v1.0.0-rc.2` 已作为 Public SaaS Beta Readiness pre-release 部署闭环。
- 现在进入 invite/cap beta validation，不立即升级 stable GA，不做无边界 public signup/billing rollout。

Drivers:

- 平台和 memory vendor 正在快速商品化基础 memory。
- Lore 的稀缺价值是 evidence、governance、eval、portability、private deployment。
- v0.6 已经补齐可发现、可安装、可验证、可分享的公开路径。
- v1.0 已经补齐 Google-first 普通用户入口、personal vault、Memory Inbox、shared recall、browser capture、官网和生产部署闭环。
- 下一步应该用真实 beta 用户数据选择 activation/connector/recall/privacy/team 的优先级，而不是靠内部假设继续堆功能。

Rejected:

1. 立即做 public hosted SaaS。
   - Rejected because v1.0 仍是 private beta RC；真实用户留存、成本和支持证据不足。
2. 立即做 billing。
   - Rejected because payment UI 可以设计，但收费前必须先验证 usage caps、support burden 和退款/删除流程。
3. 立即做大量 shallow integrations。
   - Rejected because v1.0 的 wedge 是 Google sign-in + agent capture + shared recall；连接器应由 beta 证据排序。

Consequences:

- 下一轮主工作是 activation hardening、connector depth、recall quality、usage/cost/privacy evidence。
- 私有云端和 AWS 生产闭环继续保留，公开文档只描述 public-safe 状态。
- 如果 v1.0 beta validation 没有真实 activation、cross-agent recall、privacy control 和 usage cap 证据，不升级 GA，只继续发布 honest private beta。
- 所有 marketplace、HN、Reddit、Discord、partner outreach 仍必须人审。
