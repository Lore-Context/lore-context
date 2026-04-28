> 🤖 Этот документ был переведён машинным способом с английского. Приветствуются улучшения через PR — см. [руководство по переводу](../README.md).

# Руководства по интеграции

Эти руководства документируют контракт интеграции Lore Context с текущим локальным MVP.

## Текущее состояние репозитория

- Репозиторий теперь включает локальный REST API, маршрутизатор/составитель контекста,
  опциональную JSON-файловую персистентность, опциональное хранилище Postgres, трассы,
  импорт/экспорт памяти, сравнение eval провайдеров, API-обслуживаемый HTML dashboard,
  автономный Next.js dashboard и граничный адаптер `agentmemory`.
- `apps/mcp-server/src/index.ts` предоставляет запускаемый stdio JSON-RPC MCP лаунчер,
  который проксирует инструменты к Lore REST API через `LORE_API_URL` и пересылает
  `LORE_API_KEY` как Bearer-токен при настройке. Поддерживает как legacy встроенный
  stdio цикл, так и официальный stdio транспорт `@modelcontextprotocol/sdk` через
  `LORE_MCP_TRANSPORT=sdk`.
- Документы ниже являются контрактами интеграции. Интеграции с приоритетом API могут
  использовать локальный REST сервер сегодня; MCP-совместимые клиенты могут использовать
  локальный stdio лаунчер после `pnpm build`.

## Общий дизайн

- MCP-совместимые клиенты должны подключаться к небольшому Lore MCP серверу, а не
  напрямую к raw `agentmemory`.
- Клиенты с приоритетом API должны вызывать конечные точки Lore REST, используя
  `POST /v1/context/query` как основной путь чтения.
- `POST /v1/context/query` принимает `mode`, `sources`, `freshness`, `token_budget`,
  `writeback_policy` и `include_sources`, чтобы клиенты могли принудительно включать
  или отключать маршрутизацию памяти/веб/репозитория/трасс при необходимости.
- Lore оборачивает локальную среду выполнения `agentmemory` через
  `packages/agentmemory-adapter`.
- Локальный `agentmemory` ожидается на `http://127.0.0.1:3111`.

## Доступная MCP поверхность

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

## Доступная REST поверхность

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` с опциональными `project_id`, `scope`, `status`, `memory_type`, `q` и `limit`
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

## Локальный дымовой тест API

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Автоматизированный путь дымового теста:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Локальный дымовой тест MCP

MCP лаунчер считывает JSON-RPC с разделением по новой строке из stdin и записывает
только JSON-RPC сообщения в stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Не запускайте это через `pnpm start` из MCP клиента, потому что баннеры менеджера
пакетов загрязнят stdout.

## Соответствие приватному развёртыванию

Приватная демо-упаковка в [docs/deployment/README.md](deployment.md) предполагает:

- Lore API и dashboard работают как долгоживущие контейнеры.
- Postgres является хранилищем по умолчанию для общих демо.
- MCP лаунчер остаётся stdio процессом близко к клиенту, или запускается как
  опциональный `mcp` compose сервис по запросу.
- Сидирование демо приходит из [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json), а дымовой eval — из [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json).

Для приватных развёртываний указывайте клиентские лаунчеры на приватный URL API и
предоставляйте минимальную подходящую роль:

- `reader`: dashboard и только-читающие помощники.
- `writer`: агенты, которые должны записывать память, обратную связь или eval запуски.
- `admin`: потоки import, export, governance, аудита и удаления памяти.

## Шаблоны клиентов с учётом развёртывания

### Claude Code

Предпочтительно использовать локальный stdio процесс на рабочей станции, нацеленный
на приватный API:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY="${WRITE_KEY:?set WRITE_KEY}" \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

Если вместо `node .../dist/index.js` используется упакованный MCP контейнер, сохраните
ту же пару `LORE_API_URL` / `LORE_API_KEY` и запускайте stdio лаунчер через
`docker compose run --rm mcp`.

### Cursor

MCP JSON в стиле Cursor должен держать лаунчер локальным и менять только цель API и ключ:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_READER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Используйте ключ `writer` только когда рабочие процессы Cursor намеренно записывают
обратно устойчивую память проекта.

### Qwen Code

`mcpServers` JSON в стиле Qwen следует той же границе:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_WRITER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Используйте `reader` для помощников только с поиском и `writer` для агентских потоков,
которым нужны инструменты `memory_write`, `memory_update` или обратной связи по трассам.

## Безопасные настройки по умолчанию

- Предпочтительно использовать `stdio` локально для MCP; используйте аутентифицированный
  streamable HTTP только когда требуется удалённый транспорт.
- Рассматривайте SSE как устаревшую совместимость, а не путь по умолчанию.
- Разрешайте инструменты через `includeTools` или эквивалент клиента.
- Не включайте широкие режимы доверия по умолчанию.
- Требуйте `reason` для мутирующих операций.
- Держите `memory_forget` на мягком удалении, если только admin намеренно не устанавливает
  `hard_delete: true` для контролируемого удаления.
- Используйте разделение ролей `LORE_API_KEYS` для общего локального или удалённого
  раскрытия API: `reader` для только-читающих клиентов, `writer` для агентской записи
  обратно, и `admin` только для операций синхронизации/import/export/удаления памяти/
  governance/аудита. Добавляйте `projectIds` для ограничения клиентских ключей по
  проектам, которые они могут видеть или изменять.
- Держите `agentmemory` привязанным к `127.0.0.1`.
- Не открывайте публично raw `agentmemory` viewer или консоль.
- Текущий live контракт `agentmemory` 0.9.3: `remember`, `export`, `audit` и
  `forget(memoryId)` применимы для тестов синхронизации/контракта Lore; `smart-search`
  ищет наблюдения и не должен рассматриваться как доказательство того, что свежезапомненные
  записи памяти напрямую доступны для поиска.
