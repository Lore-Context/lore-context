# 集成指南

> 🤖 本文档由英文版机器翻译生成。欢迎通过 PR 改进 — 参见[翻译贡献指南](../README.md)。

这些指南记录了 Lore Context 针对当前本地 MVP 的集成契约。

## 当前仓库状态

- 仓库现在包含本地 REST API、上下文路由器/组合器、可选 JSON 文件持久化、可选 Postgres 运行时存储、追踪、记忆导入/导出、评测提供商比较、API 服务的仪表盘 HTML、独立 Next.js 仪表盘和 `agentmemory` 适配器边界。
- `apps/mcp-server/src/index.ts` 提供了一个可运行的 stdio JSON-RPC MCP 启动器，通过 `LORE_API_URL` 将工具代理到 Lore REST API，并在配置时将 `LORE_API_KEY` 作为 Bearer token 转发。它支持 legacy 内置 stdio 循环和通过 `LORE_MCP_TRANSPORT=sdk` 启用的官方 `@modelcontextprotocol/sdk` stdio 传输。
- 以下文档是集成契约。API 优先的集成今天就可以使用本地 REST 服务器；支持 MCP 的客户端可以在 `pnpm build` 后使用本地 stdio 启动器。

## 共同设计

- 支持 MCP 的客户端应连接到小型 Lore MCP 服务器，而不是直接连接到原始 `agentmemory`。
- API 优先的客户端应调用 Lore REST 端点，以 `POST /v1/context/query` 作为主读路径。
- `POST /v1/context/query` 接受 `mode`、`sources`、`freshness`、`token_budget`、`writeback_policy` 和 `include_sources`，以便客户端在需要时强制或禁用记忆/网络/仓库/工具追踪路由。
- Lore 通过 `packages/agentmemory-adapter` 包装本地 `agentmemory` 运行时。
- 本地 `agentmemory` 预期在 `http://127.0.0.1:3111`。

## 可用 MCP 接口

- `context_query`
- `memory_write`
- `memory_search`
- `memory_forget`
- `memory_list`
- `memory_get`
- `memory_update`
- `memory_supersede`
- `memory_export`
- `eval_run`
- `trace_get`

## 可用 REST 接口

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list`，含可选的 `project_id`、`scope`、`status`、`memory_type`、`q` 和 `limit`
- `GET /v1/memory/:id`
- `PATCH /v1/memory/:id`
- `POST /v1/memory/:id/supersede`
- `GET /v1/memory/export`
- `POST /v1/memory/import`
- `GET /v1/governance/review-queue`
- `POST /v1/governance/memory/:id/approve`
- `POST /v1/governance/memory/:id/reject`
- `POST /v1/events/ingest`
- `POST /v1/eval/run`
- `GET /v1/eval/providers`
- `GET /v1/eval/runs`
- `GET /v1/eval/runs/:id`
- `GET /v1/traces`
- `GET /v1/traces/:id`
- `POST /v1/traces/:id/feedback`
- `GET /v1/audit-logs`

## 本地 API 冒烟测试

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

自动化冒烟路径：

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## 本地 MCP 冒烟测试

MCP 启动器从 stdin 读取换行符分隔的 JSON-RPC，并只向 stdout 写入 JSON-RPC 消息：

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

不要通过 MCP 客户端使用 `pnpm start` 启动，因为包管理器横幅会污染 stdout。

## 与私有部署的对齐

[docs/deployment/README.md](deployment.md) 中的私有演示打包假设：

- Lore API 和仪表盘作为长期运行的容器运行。
- Postgres 是共享演示的默认持久化存储。
- MCP 启动器保持靠近客户端的 stdio 进程，或按需作为可选 `mcp` Compose 服务运行。
- 演示数据来自 [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json)，评测冒烟测试来自 [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json)。

对于私有部署，将客户端启动器指向私有 API URL，并提供最小权限角色：

- `reader`：仪表盘和只读副驾驶。
- `writer`：需要写入记忆、反馈或运行评测的智能体。
- `admin`：导入、导出、治理、审计和遗忘流程。

## 部署感知客户端模板

### Claude Code

优先使用针对私有 API 的工作站本地 stdio 进程：

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY=write-local \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

如果你使用打包的 MCP 容器而非 `node .../dist/index.js`，保持相同的 `LORE_API_URL` / `LORE_API_KEY` 组合，并通过 `docker compose run --rm mcp` 运行 stdio 启动器。

### Cursor

Cursor 风格的 MCP JSON 应保持启动器本地化，只修改 API 目标和 key：

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "read-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

只有当 Cursor 工作流有意写回持久项目记忆时，才使用 `writer` key。

### Qwen Code

Qwen 风格的 `mcpServers` JSON 遵循相同边界：

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "write-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

对仅搜索检索助手使用 `reader`，对需要 `memory_write`、`memory_update` 或追踪反馈工具的智能体工作流使用 `writer`。

## 安全默认值

- 本地 MCP 优先使用 `stdio`；只有在需要远程传输时才使用经认证的可流式 HTTP。
- 将 SSE 视为 legacy 兼容性，而非默认路径。
- 使用 `includeTools` 或客户端等效项将工具列入白名单。
- 默认不启用宽泛的信任模式。
- 对变更操作要求 `reason`。
- 除非 admin 明确为受控删除设置 `hard_delete: true`，否则保持 `memory_forget` 使用软删除。
- 对共享本地或远程 API 暴露使用 `LORE_API_KEYS` 角色分离：只读客户端使用 `reader`，智能体写回使用 `writer`，同步/导入/导出/遗忘/治理/审计操作仅使用 `admin`。添加 `projectIds` 将客户端 key 的作用域限定到其可见或变更的项目。
- 保持 `agentmemory` 绑定到 `127.0.0.1`。
- 不要公开暴露原始 `agentmemory` 查看器或控制台。
- 当前实时 `agentmemory` 0.9.3 契约：`remember`、`export`、`audit` 和 `forget(memoryId)` 可用于 Lore 同步/契约测试；`smart-search` 搜索的是观察记录，不应视为新写入的记忆记录可直接搜索的证明。
