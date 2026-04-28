# 私有部署

> 🤖 本文档由英文版机器翻译生成。欢迎通过 PR 改进 — 参见[翻译贡献指南](../README.md)。

> **使用 `openssl rand -hex 32` 生成 key — 绝不在生产环境使用下方的占位符。**

本文将 Lore 打包用于私有演示或内部团队发布，无需修改应用代码路径。部署包由以下部分组成：

- `apps/api/Dockerfile`：REST API 镜像。
- `apps/dashboard/Dockerfile`：独立的 Next.js 仪表盘镜像。
- `Dockerfile`：供 stdio 客户端使用的可选 MCP 启动器镜像。
- `docs/deployment/compose.private-demo.yml`：包含 Postgres、API、仪表盘和按需 MCP 服务的即用 Compose 栈。
- `examples/demo-dataset/**`：用于文件存储、导入和评测流程的种子数据。

## 推荐拓扑

- `postgres`：用于共享或多运营商演示的持久化存储。
- `api`：Lore REST API，运行在内部桥接网络上，默认发布到回环地址。
- `dashboard`：运营商 UI，默认发布到回环地址，通过 `LORE_API_URL` 代理到 API。
- `mcp`：可选 stdio 容器，供希望使用容器化启动器（而非在主机上运行 `node apps/mcp-server/dist/index.js`）的 Claude、Cursor 和 Qwen 运营商使用。

Compose 栈有意保持公开暴露范围窄。Postgres、API 和仪表盘默认通过变量化的端口映射绑定到 `127.0.0.1`。

## 预检

1. 将 `.env.example` 复制到私有运行时文件，例如 `.env.private`。
2. 替换 `POSTGRES_PASSWORD`。
3. 优先使用 `LORE_API_KEYS` 而非单一 `LORE_API_KEY`。
4. 将 `DASHBOARD_LORE_API_KEY` 设置为 `admin` key 以获得完整运营商工作流，或设置为作用域 `reader` key 用于只读演示。将 `MCP_LORE_API_KEY` 设置为 `writer` 或 `reader` key，取决于客户端是否应变更记忆。

角色分离示例：

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
DASHBOARD_BASIC_AUTH_USER=admin
DASHBOARD_BASIC_AUTH_PASS=<YOUR_DASHBOARD_PASSWORD>
```

## 启动栈

从仓库根目录构建并启动私有演示栈：

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

健康检查：

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl -u "${DASHBOARD_BASIC_AUTH_USER}:${DASHBOARD_BASIC_AUTH_PASS}" \
  http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## 填充演示数据

对于 Postgres 支持的 Compose 栈，在 API 健康后导入打包的演示记忆：

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

运行打包的评测请求：

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

如果你想要无数据库的单机演示，将 API 指向文件存储快照：

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## MCP 启动器模式

推荐模式：

- 在靠近客户端的位置运行 MCP 启动器。
- 将 `LORE_API_URL` 指向私有 API URL。
- 向启动器提供最小权限的 API key。

主机启动器：

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

容器化启动器：

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

容器化启动器对于可重现的工作站配置很有用，但它仍然是 stdio 进程，而不是长期运行的公共网络服务。

## 安全默认值

- 除非前面已有经认证的反向代理，否则保持 `API_BIND_HOST`、`DASHBOARD_BIND_HOST` 和 `POSTGRES_BIND_HOST` 在 `127.0.0.1`。
- 优先使用含 `reader` / `writer` / `admin` 分离的 `LORE_API_KEYS`，而非在所有地方复用单一全局 admin key。
- 对演示客户端使用项目作用域 key。打包的演示项目 id 是 `demo-private`。
- 保持 `AGENTMEMORY_URL` 在回环地址，不要直接暴露原始 `agentmemory`。
- 除非私有部署真的依赖实时 agentmemory 运行时，否则保持 `LORE_AGENTMEMORY_REQUIRED=0`。
- 仅在受控内部环境中保持 `LORE_POSTGRES_AUTO_SCHEMA=true`。一旦 schema 初始化成为你发布流程的一部分，可以固定为 `false`。

## 可复用文件

- Compose 示例：[compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- API 镜像：[apps/api/Dockerfile](../../../apps/api/Dockerfile)
- 仪表盘镜像：[apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- MCP 镜像：[Dockerfile](../../../Dockerfile)
- 演示数据：[examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
