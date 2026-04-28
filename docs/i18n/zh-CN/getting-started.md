# 快速入门

> 🤖 本文档由英文版机器翻译生成。欢迎通过 PR 改进 — 参见[翻译贡献指南](../README.md)。

本指南带你从零开始运行一个 Lore Context 实例，完成记忆写入、上下文查询和仪表盘访问。整体约需 15 分钟，核心路径约 5 分钟。

## 前置条件

- **Node.js** `>=22`（使用 `nvm`、`mise` 或你的发行版包管理器）
- **pnpm** `10.30.1`（`corepack enable && corepack prepare pnpm@10.30.1 --activate`）
- （可选）**Docker + Docker Compose**，用于 Postgres+pgvector 路径
- （可选）**psql**，如果你偏好自行应用 schema

## 1. 克隆并安装

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

如果 `pnpm test` 不是绿色，不要继续 — 用失败日志提交一个 issue。

## 2. 生成真实密钥

Lore Context 在生产环境下拒绝以占位符值启动。即使是本地开发也要生成真实 key，以保持习惯一致。

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

对于多角色本地配置：

```bash
export READER_KEY=$(openssl rand -hex 32)
export WRITER_KEY=$(openssl rand -hex 32)
export ADMIN_KEY=$(openssl rand -hex 32)
export LORE_API_KEYS='[
  {"key":"'"$READER_KEY"'","role":"reader","projectIds":["demo"]},
  {"key":"'"$WRITER_KEY"'","role":"writer","projectIds":["demo"]},
  {"key":"'"$ADMIN_KEY"'","role":"admin"}
]'
```

## 3. 启动 API（文件存储，无需数据库）

最简路径使用本地 JSON 文件作为存储后端。适合单人开发和冒烟测试。

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

在另一个终端中验证健康状态：

```bash
curl -s http://127.0.0.1:3000/health | jq
```

预期结果：`{"status":"ok",...}`。

## 4. 写入你的第一条记忆

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{
    "content": "Use Postgres pgvector for Lore Context production storage.",
    "memory_type": "project_rule",
    "project_id": "demo",
    "scope": "project"
  }' | jq
```

预期结果：一个 `200` 响应，包含新记忆的 `id` 和 `governance.state`，值为 `active` 或 `candidate`（若内容匹配了风险模式如密钥，则为后者）。

## 5. 组合上下文

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{
    "query": "production storage",
    "project_id": "demo",
    "token_budget": 1200
  }' | jq
```

你应该能在 `evidence.memory` 数组中看到你的记忆被引用，以及一个 `traceId`，你可以用它来检查路由和反馈。

## 6. 启动仪表盘

在新终端中：

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

在浏览器中打开 http://127.0.0.1:3001。浏览器会提示 Basic Auth 凭证。认证后，仪表盘呈现记忆清单、追踪、评测结果和治理审核队列。

## 7. （可选）通过 MCP 连接 Claude Code

将以下内容添加到 Claude Code 的 `claude_desktop_config.json` MCP servers 部分：

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<paste your $LORE_API_KEY here>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

重启 Claude Code。Lore Context MCP 工具（`context_query`、`memory_write` 等）即可使用。

对于其他智能体 IDE（Cursor、Qwen、Dify、FastGPT 等），参见 [docs/integrations/README.md](integrations.md) 中的集成矩阵。

## 8. （可选）切换到 Postgres + pgvector

当 JSON 文件存储不够用时：

```bash
docker compose up -d postgres
pnpm db:schema   # 通过 psql 应用 apps/api/src/db/schema.sql
```

然后使用 `LORE_STORE_DRIVER=postgres` 启动 API：

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

运行 `pnpm smoke:postgres` 验证写入-重启-读取往返是否正常。

## 9. （可选）填充演示数据集并运行评测

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

评测报告以 Markdown 和 JSON 格式输出到 `output/eval-reports/`。

## 后续步骤

- **生产部署** — [docs/deployment/README.md](deployment.md)
- **API 参考** — [docs/api-reference.md](api-reference.md)
- **架构深度解析** — [docs/architecture.md](architecture.md)
- **治理审核工作流** — 参见 [docs/architecture.md](architecture.md) 中的"治理流程"部分
- **记忆可移植性（MIF）** — `pnpm --filter @lore/mif test` 展示了往返示例
- **贡献** — [CONTRIBUTING.md](CONTRIBUTING.md)

## 常见问题

| 症状 | 原因 | 解决方法 |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | 另一个进程占用了 3000 端口 | `lsof -i :3000` 查找；或设置 `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | 生产模式下未设置 `DASHBOARD_BASIC_AUTH_USER/PASS` | 导出环境变量或传递 `LORE_DASHBOARD_DISABLE_AUTH=1`（仅限开发环境） |
| `[check-env] ERROR: ... contain placeholder/demo values` | 某个环境变量匹配了 `admin-local` / `change-me` / `demo` 等 | 通过 `openssl rand -hex 32` 生成真实值 |
| `429 Too Many Requests` | 速率限制触发 | 等待冷却窗口（默认 5 次认证失败后 30 秒）；或在开发环境设置 `LORE_RATE_LIMIT_DISABLED=1` |
| `agentmemory adapter unhealthy` | 本地 agentmemory 运行时未运行 | 启动 agentmemory 或设置 `LORE_AGENTMEMORY_REQUIRED=0` 静默跳过 |
| MCP 客户端收到 `-32602 Invalid params` | 工具输入未通过 zod schema 验证 | 检查错误体中的 `invalid_params` 数组 |
| 仪表盘每页都返回 401 | Basic Auth 凭证错误 | 重新导出环境变量并重启仪表盘进程 |

## 获取帮助

- 提交缺陷：https://github.com/Lore-Context/lore-context/issues
- 安全披露：参见 [SECURITY.md](SECURITY.md)
- 贡献文档：参见 [CONTRIBUTING.md](CONTRIBUTING.md)
