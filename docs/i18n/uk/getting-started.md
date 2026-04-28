> 🤖 Цей документ перекладено машинним способом з англійської. Вітаємо покращення через PR — див. [посібник з перекладу](../README.md).

# Початок роботи

Цей посібник проведе вас від нуля до запущеного екземпляру Lore Context з записаною
пам'яттю, запитаним контекстом та доступним дашбордом. Плануйте ~15 хвилин загалом,
~5 хвилин для основного шляху.

## Передумови

- **Node.js** `>=22` (використовуйте `nvm`, `mise` або менеджер пакунків вашого
  дистрибутиву)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Опціонально) **Docker + Docker Compose** для шляху Postgres+pgvector
- (Опціонально) **psql**, якщо ви бажаєте застосувати схему самостійно

## 1. Клонувати та встановити

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Якщо `pnpm test` не зелений, не продовжуйте — відкрийте тікет з журналом невдачі.

## 2. Згенерувати реальні секрети

Lore Context відмовляє в запуску у виробництві із значеннями-заповнювачами. Генеруйте
реальні ключі навіть для локальної розробки, щоб зберегти послідовність своїх звичок.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Для локальних налаштувань з кількома ролями:

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

## 3. Запустити API (на основі файлів, без бази даних)

Найпростіший шлях використовує локальний JSON файл як бекенд зберігання. Підходить
для одиночної розробки та димового тестування.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

В іншій оболонці перевірте стан:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Очікується: `{"status":"ok",...}`.

## 4. Записати першу пам'ять

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

Очікується: відповідь `200` з `id` нової пам'яті та `governance.state` рівним
`active` або `candidate` (останній, якщо контент відповідає шаблону ризику, наприклад,
секрету).

## 5. Скласти контекст

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

Ви повинні побачити свою пам'ять у масиві `evidence.memory`, плюс `traceId`, який
пізніше можна використати для перевірки маршрутизації та зворотного зв'язку.

## 6. Запустити дашборд

У новому терміналі:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Відкрийте http://127.0.0.1:3001 у своєму браузері. Браузер запросить облікові дані
Basic Auth. Після автентифікації дашборд відображає інвентаризацію пам'яті, траси,
результати eval та чергу перевірки управління.

## 7. (Опціонально) Підключити Claude Code через MCP

Додайте це до розділу MCP servers у `claude_desktop_config.json` Claude Code:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<вставте ваш $LORE_API_KEY тут>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Перезапустіть Claude Code. Інструменти Lore Context MCP (`context_query`,
`memory_write` тощо) стають доступними.

Для інших IDE агентів (Cursor, Qwen, Dify, FastGPT тощо) дивіться матрицю
інтеграцій у [docs/integrations/README.md](integrations.md).

## 8. (Опціонально) Перейти на Postgres + pgvector

Коли ви переростаєте зберігання на JSON-файлах:

```bash
docker compose up -d postgres
pnpm db:schema   # застосовує apps/api/src/db/schema.sql через psql
```

Потім запустіть API з `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Виконайте `pnpm smoke:postgres`, щоб перевірити, що кругова поїздка запис-перезапуск-
читання виживає.

## 9. (Опціонально) Завантажити демонабір даних та запустити eval

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Звіт eval зберігається в `output/eval-reports/` у форматах Markdown та JSON.

## Наступні кроки

- **Виробниче розгортання** — [docs/deployment/README.md](deployment.md)
- **Довідник API** — [docs/api-reference.md](api-reference.md)
- **Поглиблене вивчення архітектури** — [docs/architecture.md](architecture.md)
- **Робочий процес перевірки управління** — дивіться розділ `Потік управління` в
  [docs/architecture.md](architecture.md)
- **Портативність пам'яті (MIF)** — `pnpm --filter @lore/mif test` показує приклади
  кругових поїздок
- **Участь у розробці** — [CONTRIBUTING.md](CONTRIBUTING.md)

## Поширені помилки

| Симптом | Причина | Виправлення |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Інший процес на порті 3000 | `lsof -i :3000` для пошуку; або встановіть `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Виробничий режим без `DASHBOARD_BASIC_AUTH_USER/PASS` | Експортуйте змінні середовища або передайте `LORE_DASHBOARD_DISABLE_AUTH=1` (лише розробка) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Будь-яке env відповідає `admin-local` / `change-me` / `demo` тощо | Генеруйте реальні значення через `openssl rand -hex 32` |
| `429 Too Many Requests` | Спрацювало обмеження частоти | Зачекайте вікно охолодження (за замовчуванням 30с після 5 невдалих автентифікацій); або встановіть `LORE_RATE_LIMIT_DISABLED=1` у розробці |
| `agentmemory adapter unhealthy` | Локальний рушій agentmemory не запущено | Запустіть agentmemory або встановіть `LORE_AGENTMEMORY_REQUIRED=0` для тихого пропуску |
| MCP клієнт бачить `-32602 Invalid params` | Вхідні дані інструменту не пройшли zod валідацію схеми | Перевірте масив `invalid_params` у тілі помилки |
| Дашборд 401 на кожній сторінці | Неправильні облікові дані Basic Auth | Повторно експортуйте змінні середовища та перезапустіть процес дашборду |

## Отримання допомоги

- Подати помилку: https://github.com/Lore-Context/lore-context/issues
- Розкриття безпеки: дивіться [SECURITY.md](SECURITY.md)
- Участь у документації: дивіться [CONTRIBUTING.md](CONTRIBUTING.md)
