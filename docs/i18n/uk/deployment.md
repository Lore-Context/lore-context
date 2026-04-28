> 🤖 Цей документ перекладено машинним способом з англійської. Вітаємо покращення через PR — див. [посібник з перекладу](../README.md).

# Приватне розгортання

> **Генеруйте ключі за допомогою `openssl rand -hex 32` — ніколи не використовуйте наведені нижче заповнювачі у виробництві.**

Цей набір пакує Lore для приватної демонстрації або внутрішнього командного розгортання
без зміни шляхів коду застосунку. Пакет розгортання складається з:

- `apps/api/Dockerfile`: образ REST API.
- `apps/dashboard/Dockerfile`: автономний образ Next.js дашборду.
- `Dockerfile`: опціональний образ MCP лаунчера для stdio клієнтів.
- `docs/deployment/compose.private-demo.yml`: стек compose для копіювання та вставки
  для Postgres, API, дашборду та MCP сервісу на вимогу.
- `examples/demo-dataset/**`: тестові дані для потоків file-store, import та eval.

## Рекомендована топологія

- `postgres`: довготривале сховище для спільних або багатооператорних демонстрацій.
- `api`: Lore REST API у внутрішній мостовій мережі, за замовчуванням опублікований
  до loopback.
- `dashboard`: операторський UI, за замовчуванням опублікований до loopback та
  проксованого до API через `LORE_API_URL`.
- `mcp`: опціональний stdio контейнер для операторів Claude, Cursor та Qwen, які
  хочуть контейнеризований лаунчер замість `node apps/mcp-server/dist/index.js` на
  хості.

Стек compose навмисно тримає публічне відкриття вузьким. Postgres, API та дашборд
за замовчуванням прив'язані до `127.0.0.1` через параметризовані відображення портів.

## Попередня перевірка

1. Скопіюйте `.env.example` у приватний файл виконання, наприклад `.env.private`.
2. Замініть `POSTGRES_PASSWORD`.
3. Віддавайте перевагу `LORE_API_KEYS` над одинарним `LORE_API_KEY`.
4. Встановіть `DASHBOARD_LORE_API_KEY` на ключ `admin` для повного операторського
   процесу, або на ключ `reader` для демонстрацій лише для читання. Встановіть
   `MCP_LORE_API_KEY` на ключ `writer` або `reader` залежно від того, чи повинен
   клієнт мутувати пам'ять.

Приклад розподілу ролей:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
```

## Запуск стеку

Зберіть та запустіть приватний демонстраційний стек з кореня репозиторію:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Перевірка стану:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Завантаження демо-даних

Для стеку compose з Postgres, імпортуйте упаковані демо-пам'яті після того, як API
буде здоровим:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Виконайте упакований eval запит:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Якщо ви хочете демонстрацію на одному хості без бази даних, вкажіть API на знімок
file-store:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Шаблони MCP лаунчера

Рекомендований шаблон:

- Запускайте MCP лаунчер близько до клієнта.
- Вказуйте `LORE_API_URL` на приватну URL API.
- Надавайте лаунчеру найменший підхожий API ключ.

Лаунчер на хості:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Контейнеризований лаунчер:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Контейнеризований лаунчер корисний для відтворюваного налаштування робочої станції,
але він все одно є stdio процесом, а не тривало працюючим публічним мережевим
сервісом.

## Захисні параметри за замовчуванням

- Тримайте `API_BIND_HOST`, `DASHBOARD_BIND_HOST` та `POSTGRES_BIND_HOST` на
  `127.0.0.1`, якщо перед стеком ще немає автентифікованого зворотного проксі.
- Віддавайте перевагу `LORE_API_KEYS` з розподілом `reader` / `writer` / `admin`
  замість повторного використання одного глобального адміністративного ключа скрізь.
- Використовуйте ключі з обмеженням до проекту для демо-клієнтів. Ідентифікатор
  упакованого демо-проекту — `demo-private`.
- Тримайте `AGENTMEMORY_URL` на loopback та не відкривайте raw `agentmemory` напряму.
- Залишайте `LORE_AGENTMEMORY_REQUIRED=0`, якщо приватне розгортання дійсно не
  залежить від живого rушія agentmemory.
- Тримайте `LORE_POSTGRES_AUTO_SCHEMA=true` лише для контрольованих внутрішніх
  середовищ. Як тільки завантаження схеми стає частиною вашого процесу випуску,
  можна закріпити його на `false`.

## Файли для повторного використання

- Приклад Compose: [compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- Образ API: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Образ дашборду: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- Образ MCP: [Dockerfile](../../../Dockerfile)
- Демо-дані: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
