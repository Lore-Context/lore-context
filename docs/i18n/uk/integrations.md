> 🤖 Цей документ перекладено машинним способом з англійської. Вітаємо покращення через PR — див. [посібник з перекладу](../README.md).

# Посібники з інтеграції

Ці посібники документують контракт інтеграції Lore Context з поточним локальним MVP.

## Поточний стан репозиторію

- Репозиторій тепер включає локальний REST API, маршрутизатор/компоновник контексту,
  опціональне збереження JSON-файлів, опціональне Postgres сховище, траси,
  імпорт/експорт пам'яті, порівняння eval провайдерів, HTML дашборд через API,
  автономний Next.js дашборд та межу адаптера `agentmemory`.
- `apps/mcp-server/src/index.ts` надає запускний stdio JSON-RPC MCP лаунчер, що
  проксує інструменти до Lore REST API через `LORE_API_URL` та пересилає
  `LORE_API_KEY` як Bearer токен при налаштуванні. Він підтримує застарілий вбудований
  stdio цикл та офіційний `@modelcontextprotocol/sdk` stdio транспорт через
  `LORE_MCP_TRANSPORT=sdk`.
- Наведені нижче документи є контрактами інтеграції. API-орієнтовані інтеграції
  можуть сьогодні використовувати локальний REST сервер; MCP-здатні клієнти можуть
  використовувати локальний stdio лаунчер після `pnpm build`.

## Спільний дизайн

- MCP-здатні клієнти повинні підключатися до невеликого Lore MCP сервера, а не до
  raw `agentmemory`.
- API-орієнтовані клієнти повинні викликати REST ендпоінти Lore, де
  `POST /v1/context/query` є основним шляхом читання.
- `POST /v1/context/query` приймає `mode`, `sources`, `freshness`, `token_budget`,
  `writeback_policy` та `include_sources`, щоб клієнти могли примусово вмикати або
  вимикати маршрутизацію пам'яті/вебу/репозиторію/трас при необхідності.
- Lore обгортає локальний рушій `agentmemory` через `packages/agentmemory-adapter`.
- Локальний `agentmemory` очікується на `http://127.0.0.1:3111`.

## Доступна MCP поверхня

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

## Доступна REST поверхня

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` з опціональними `project_id`, `scope`, `status`,
  `memory_type`, `q` та `limit`
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

## Локальний API Smoke

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Автоматизований шлях димового тестування:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Локальний MCP Smoke

MCP лаунчер читає JSON-RPC з розділювачем нового рядка зі stdin та записує лише
JSON-RPC повідомлення в stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Не запускайте це через `pnpm start` з MCP клієнта, оскільки банери менеджера
пакунків забруднять stdout.

## Узгодження з приватним розгортанням

Приватне демонстраційне пакування у [docs/deployment/README.md](deployment.md)
передбачає:

- Lore API та дашборд запускаються як тривало працюючі контейнери.
- Postgres є типовим довготривалим сховищем для спільних демонстрацій.
- MCP лаунчер залишається stdio процесом близько до клієнта або запускається як
  опціональний `mcp` compose сервіс на вимогу.
- Завантаження демо-даних відбувається з
  `examples/demo-dataset/import/lore-demo-memories.json`, тоді як димове тестування
  eval — з `examples/demo-dataset/eval/lore-demo-eval-request.json`.

Для приватних розгортань вказуйте лаунчери клієнтів на приватну URL API та надавайте
найменшу роль, що підходить:

- `reader`: дашборд та помічники лише для читання.
- `writer`: агенти, що повинні записувати пам'ять, зворотний зв'язок або запуски eval.
- `admin`: потоки імпорту, експорту, управління, аудиту та забування.

## Шаблони клієнтів з урахуванням розгортання

### Claude Code

Перевагу надавайте локальному stdio процесу на робочій станції, що вказує на
приватний API:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY=write-local \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

Якщо ви використовуєте упакований MCP контейнер замість `node .../dist/index.js`,
тримайте ту саму пару `LORE_API_URL` / `LORE_API_KEY` та запускайте stdio лаунчер
через `docker compose run --rm mcp`.

### Cursor

MCP JSON у стилі Cursor повинен тримати лаунчер локально та лише змінювати цільовий
API та ключ:

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

Використовуйте ключ `writer` лише тоді, коли процеси Cursor навмисно записують
тривалу пам'ять проекту.

### Qwen Code

JSON `mcpServers` у стилі Qwen дотримується тих самих меж:

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

Використовуйте `reader` для помічників пошуку та `writer` для агентних потоків,
що потребують інструментів `memory_write`, `memory_update` або зворотного зв'язку
трас.

## Безпечні параметри за замовчуванням

- Віддавайте перевагу локальному `stdio` для MCP; використовуйте автентифікований
  потоковий HTTP лише коли потрібен дистанційний транспорт.
- Вважайте SSE застарілою сумісністю, а не стандартним шляхом.
- Додавайте інструменти до білого списку через `includeTools` або еквівалент клієнта.
- Не вмикайте широкі режими довіри за замовчуванням.
- Вимагайте `reason` для мутаційних операцій.
- Тримайте `memory_forget` на м'якому видаленні, якщо admin навмисно не встановлює
  `hard_delete: true` для контрольованого видалення.
- Використовуйте розподіл ролей `LORE_API_KEYS` для спільного локального або
  дистанційного відкриття API: `reader` для клієнтів лише для читання, `writer` для
  зворотного запису агентів та `admin` лише для операцій синхронізації/імпорту/
  експорту/забування/управління/аудиту. Додавайте `projectIds` для обмеження ключів
  клієнтів до проектів, які вони можуть бачити або мутувати.
- Тримайте `agentmemory` прив'язаним до `127.0.0.1`.
- Не відкривайте raw переглядач `agentmemory` або консоль публічно.
- Поточний живий контракт `agentmemory` 0.9.3: `remember`, `export`, `audit` та
  `forget(memoryId)` придатні для тестів синхронізації/контракту Lore;
  `smart-search` шукає спостереження та не слід вважати доказом того, що щойно
  запам'ятовані записи безпосередньо доступні для пошуку.
