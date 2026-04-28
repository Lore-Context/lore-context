> 🤖 Этот документ был переведён машинным способом с английского. Приветствуются улучшения через PR — см. [руководство по переводу](../README.md).

# Приватное развёртывание

> **Генерируйте ключи с помощью `openssl rand -hex 32` — никогда не используйте приведённые ниже заглушки в продакшне.**

Этот пакет упаковывает Lore для приватного демо или внутреннего развёртывания команды без
изменения путей кода приложения. Пакет развёртывания состоит из:

- `apps/api/Dockerfile`: образ REST API.
- `apps/dashboard/Dockerfile`: автономный образ Next.js dashboard.
- `Dockerfile`: опциональный образ MCP лаунчера для stdio клиентов.
- `docs/deployment/compose.private-demo.yml`: готовый к копированию compose стек для
  Postgres, API, dashboard и MCP сервиса по запросу.
- `examples/demo-dataset/**`: сид-данные для потоков file-store, import и eval.

## Рекомендуемая топология

- `postgres`: устойчивое хранилище для общих или многооператорских демо.
- `api`: Lore REST API во внутренней мостовой сети, по умолчанию опубликован на loopback.
- `dashboard`: операторский UI, по умолчанию опубликован на loopback и проксирующий к
  API через `LORE_API_URL`.
- `mcp`: опциональный stdio контейнер для операторов Claude, Cursor и Qwen, которые хотят
  контейнеризованный лаунчер вместо `node apps/mcp-server/dist/index.js` на хосте.

Compose стек намеренно держит публичное воздействие узким. Postgres, API и dashboard
привязаны к `127.0.0.1` по умолчанию через вариабельные маппинги портов.

## Предполётная проверка

1. Скопируйте `.env.example` в приватный файл среды выполнения, например `.env.private`.
2. Замените `POSTGRES_PASSWORD`.
3. Предпочтительно использовать `LORE_API_KEYS` вместо одиночного `LORE_API_KEY`.
4. Установите `DASHBOARD_LORE_API_KEY` на ключ `admin` для полного операторского
   рабочего процесса, или на ограниченный ключ `reader` для демо только для чтения.
   Установите `MCP_LORE_API_KEY` на ключ `writer` или `reader` в зависимости от того,
   должен ли клиент изменять память.

Пример разделения ролей:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
```

## Запуск стека

Соберите и запустите приватный демо стек из корня репозитория:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Проверки работоспособности:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Загрузка демо-данных

Для стека compose на основе Postgres импортируйте упакованные демо-записи памяти после
того, как API станет работоспособным:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Запустите упакованный eval запрос:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Если вместо этого вы хотите демо без базы данных на одном хосте, укажите API на
снимок файлового хранилища:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Паттерны MCP лаунчера

Предпочтительный паттерн:

- Запускайте MCP лаунчер близко к клиенту.
- Укажите `LORE_API_URL` на приватный URL API.
- Предоставьте лаунчеру минимально подходящий API-ключ.

Лаунчер на хосте:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Контейнеризованный лаунчер:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Контейнеризованный лаунчер полезен для воспроизводимой настройки рабочей станции, но
он по-прежнему является stdio процессом, а не долгоживущим публичным сетевым сервисом.

## Настройки безопасности по умолчанию

- Держите `API_BIND_HOST`, `DASHBOARD_BIND_HOST` и `POSTGRES_BIND_HOST` на `127.0.0.1`,
  если перед стеком уже не находится аутентифицированный обратный прокси.
- Предпочтительно использовать `LORE_API_KEYS` с разделением `reader` / `writer` / `admin`
  вместо повторного использования одного глобального admin-ключа везде.
- Используйте ограниченные по проекту ключи для демо-клиентов. Упакованный демо ID проекта
  — `demo-private`.
- Держите `AGENTMEMORY_URL` на loopback и не открывайте raw `agentmemory` напрямую.
- Оставьте `LORE_AGENTMEMORY_REQUIRED=0`, если только приватное развёртывание действительно
  не зависит от живой среды выполнения agentmemory.
- Держите `LORE_POSTGRES_AUTO_SCHEMA=true` только для контролируемых внутренних сред. Как
  только бутстрапинг схемы станет частью вашего процесса релиза, можно зафиксировать
  его на `false`.

## Файлы для повторного использования

- Пример Compose: [compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- Образ API: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Образ Dashboard: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- Образ MCP: [Dockerfile](../../../Dockerfile)
- Демо-данные: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
