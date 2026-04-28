> 🤖 Этот документ был переведён машинным способом с английского. Приветствуются улучшения через PR — см. [руководство по переводу](../README.md).

# Начало работы

Это руководство проведёт вас от нуля до работающего экземпляра Lore Context с записанной
памятью, запрошенным контекстом и доступным dashboard. Запланируйте ~15 минут всего,
~5 минут для основного пути.

## Предварительные требования

- **Node.js** `>=22` (используйте `nvm`, `mise` или менеджер пакетов вашего дистрибутива)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Опционально) **Docker + Docker Compose** для пути Postgres+pgvector
- (Опционально) **psql**, если вы предпочитаете применять схему самостоятельно

## 1. Клонирование и установка

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Если `pnpm test` не зелёный, не продолжайте — создайте задачу с журналом ошибки.

## 2. Генерация настоящих секретов

Lore Context отказывается запускаться в продакшне с значениями-заглушками. Генерируйте
настоящие ключи даже для локальной разработки, чтобы сохранить согласованность привычек.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Для локальных настроек с несколькими ролями:

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

## 3. Запуск API (на основе файла, без базы данных)

Самый простой путь использует локальный JSON-файл в качестве бэкенда хранения. Подходит
для одиночной разработки и дымового тестирования.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

В другом терминале проверьте работоспособность:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Ожидаемо: `{"status":"ok",...}`.

## 4. Запишите первую память

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

Ожидаемо: ответ `200` с `id` новой памяти и `governance.state` либо
`active`, либо `candidate` (последнее — если содержимое совпало с паттерном риска,
например секретом).

## 5. Составьте контекст

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

Вы должны увидеть вашу память, упомянутую в массиве `evidence.memory`, плюс `traceId`,
который впоследствии можно использовать для инспекции маршрутизации и обратной связи.

## 6. Запустите dashboard

В новом терминале:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Откройте http://127.0.0.1:3001 в браузере. Браузер запросит учётные данные Basic Auth.
После аутентификации dashboard отображает инвентарь памяти, трассы, результаты eval
и очередь проверки управления.

## 7. (Опционально) Подключите Claude Code через MCP

Добавьте это в секцию MCP серверов `claude_desktop_config.json` Claude Code:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<вставьте ваш $LORE_API_KEY здесь>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Перезапустите Claude Code. Инструменты Lore Context MCP (`context_query`, `memory_write` и др.)
станут доступны.

Для других агентских IDE (Cursor, Qwen, Dify, FastGPT и др.) см. матрицу интеграции в
[docs/integrations/README.md](integrations.md).

## 8. (Опционально) Переключитесь на Postgres + pgvector

Когда вы выйдете за пределы хранилища на основе JSON-файла:

```bash
docker compose up -d postgres
pnpm db:schema   # применяет apps/api/src/db/schema.sql через psql
```

Затем запустите API с `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Запустите `pnpm smoke:postgres`, чтобы убедиться, что цикл запись-перезапуск-чтение выполняется.

## 9. (Опционально) Загрузите демо-набор данных и запустите eval

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Отчёт eval находится в `output/eval-reports/` в форматах Markdown и JSON.

## Следующие шаги

- **Развёртывание в продакшне** — [docs/deployment/README.md](deployment.md)
- **Справочник API** — [docs/api-reference.md](api-reference.md)
- **Глубокое погружение в архитектуру** — [docs/architecture.md](architecture.md)
- **Рабочий процесс проверки управления** — см. раздел `Governance Flow` в
  [docs/architecture.md](architecture.md)
- **Переносимость памяти (MIF)** — `pnpm --filter @lore/mif test` показывает примеры цикла
- **Участие в разработке** — [CONTRIBUTING.md](CONTRIBUTING.md)

## Распространённые проблемы

| Симптом | Причина | Решение |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Другой процесс занимает порт 3000 | `lsof -i :3000` для его поиска; или установите `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Режим продакшн без `DASHBOARD_BASIC_AUTH_USER/PASS` | Экспортируйте переменные окружения или передайте `LORE_DASHBOARD_DISABLE_AUTH=1` (только для разработки) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Любая переменная совпала с `admin-local` / `change-me` / `demo` и т. д. | Сгенерируйте настоящие значения через `openssl rand -hex 32` |
| `429 Too Many Requests` | Сработало ограничение частоты | Подождите период охлаждения (по умолчанию 30 с после 5 ошибок аутентификации); или установите `LORE_RATE_LIMIT_DISABLED=1` в разработке |
| `agentmemory adapter unhealthy` | Локальная среда выполнения agentmemory не запущена | Запустите agentmemory или установите `LORE_AGENTMEMORY_REQUIRED=0` для тихого пропуска |
| MCP клиент видит `-32602 Invalid params` | Ввод инструмента не прошёл zod-валидацию схемы | Проверьте массив `invalid_params` в теле ошибки |
| Dashboard 401 на каждой странице | Неверные учётные данные Basic Auth | Повторно экспортируйте переменные окружения и перезапустите процесс dashboard |

## Получение помощи

- Создайте задачу: https://github.com/Lore-Context/lore-context/issues
- Раскрытие уязвимостей безопасности: см. [SECURITY.md](SECURITY.md)
- Участие в документации: см. [CONTRIBUTING.md](CONTRIBUTING.md)
