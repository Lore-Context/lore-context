<div align="center">

# Lore Context

**Площина управління пам'яттю, оцінюванням та управлінням AI-агентів.**

Знайте, що кожен агент запам'ятав, використав і має забути — до того, як пам'ять стане виробничим ризиком.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Початок роботи](../../getting-started.md) · [Швидкий старт на сайті](https://lorecontext.com/quickstart/) · [Методологія бенчмарків](https://lorecontext.com/benchmark/) · [Довідник API](../../api-reference.md) · [Архітектура](../../architecture.md) · [План проекту](../../project-plan.md) · [Статус релізу](../../release-status.md) · [Дорожня карта](../../roadmap.md) · [Інтеграції](../../integrations/README.md) · [Розгортання](../../deployment/README.md) · [Журнал змін](../../../CHANGELOG.md)

🌐 **Читайте цей документ своєю мовою**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Локалізована документація може відставати від поточних англійських приміток до релізу; канонічна документація v2.1 — це англійський README та набір `docs/`.

</div>

---

> Цей документ перекладено машинним способом з англійської, може відставати від останнього релізу, і ми вітаємо PR — див. посібник для учасників перекладів: [../README.md](../README.md).

## Що таке Lore Context

Lore Context — це **open-core площина управління** пам'яттю AI-агентів: вона компонує контекст з пам'яті, пошуку, графів репозиторію та трас інструментів; оцінює якість отримання даних на власних наборах даних; скеровує контент на перевірку управлінням для чутливого вмісту; та експортує пам'ять у портативному форматі обміну, який можна переміщати між бекендами.

Вона не намагається бути ще однією базою даних пам'яті. Унікальна цінність полягає в тому, що знаходиться поверх пам'яті:

- **Context Query** — єдина точка доступу компонує пам'ять + веб + repo + траси інструментів, повертає оцінений блок контексту з провенансом.
- **Memory Eval** — запускає Recall@K, Precision@K, MRR, stale-hit-rate, p95 затримку на наборах даних, якими ви володієте; зберігає запуски та виявляє регресії через порівняння.
- **Governance Review** — шестистанний життєвий цикл (`candidate / active / flagged / redacted / superseded / deleted`), сканування тегів ризику, евристика отруєння, незмінний журнал аудиту.
- **MIF-подібна портативність** — JSON + Markdown експорт/імпорт зі збереженням `provenance / validity / confidence / source_refs / supersedes / contradicts`. Працює як формат міграції між бекендами пам'яті.
- **Repo Graph** — детерміноване індексування репозиторію (файли, символи, імпорти, виклики, маршрути, тести), що надається через маршрути API та інструменти MCP лише для читання, щоб агенти будували відповіді про репозиторій на основі стабільного контракту контексту проекту.
- **Multi-Agent Adapter** — першокласна інтеграція `agentmemory` з перевіркою версії та запасним режимом деградації; чистий контракт адаптера для додаткових середовищ виконання.

## Коли використовувати

| Використовуйте Lore Context, якщо... | Використовуйте базу даних пам'яті (agentmemory, Mem0, Supermemory), якщо... |
|---|---|
| Вам потрібно **довести**, що ваш агент запам'ятав, чому і чи це використовувалось | Вам потрібне лише сире зберігання пам'яті |
| Ви запускаєте кілька агентів (Claude Code, Cursor, Qwen, Hermes, Dify) і хочете спільний надійний контекст | Ви будуєте одного агента і згодні з прив'язкою до постачальника пам'яті |
| Вам потрібне локальне або приватне розгортання для відповідності вимогам | Ви віддаєте перевагу хостингу SaaS |
| Вам потрібне оцінювання на власних наборах даних, а не тестах постачальника | Тести постачальника є достатнім сигналом |
| Ви хочете перенести пам'ять між системами | Ви не плануєте змінювати бекенди |

## Швидкий старт

```bash
# 1. Clone + install
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Run the quickstart helper and inspect the activation report
pnpm quickstart -- --dry-run --activation-report

# 3. Generate a real API key (do not use placeholders in any environment beyond local-only dev)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Start the API (file-backed, no Postgres required)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Write a memory
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Query context, then inspect the returned traceId in the Evidence Ledger
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Для швидкого старту на публічному сайті дивіться
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Для повного
налаштування (Postgres, Docker Compose, Dashboard, інтеграція MCP) дивіться
[docs/getting-started.md](../../getting-started.md).

Канонічний швидкий старт для alpha — `git clone` + `pnpm quickstart`. Lore
наразі не публікує та не заявляє про публічний npm-пакет
`@lore-context/quickstart`. MCP stdio-сервер публікується окремо як
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
для розповсюдження в реєстрі та клієнтах, а SDK middleware постачається як
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) та `lore-context-middleware` (PyPI).

Для виявлення AI-агентами сайт публікує `/llms.txt` та `/llms-full.txt`
лише з публічної документації. Запис в офіційному реєстрі MCP опубліковано,
а додаткові чернетки дистрибуції знаходяться в [docs/distribution](../../distribution/).
Чернетки запуску знаходяться в [docs/launch](../../launch/), а прийом партнерів з
дизайну — в [docs/design-partners](../../design-partners/). Публічна сторінка
бенчмарків — це відтворювана методологія та невеликий звіт про пробний запуск,
а не заявка про перемогу в конкурентному бенчмарку.

## Архітектура

```text
                       ┌───────────────────────────────────────────────┐
  MCP/REST clients ─► │ apps/api  (auth + rate limit + evidence)       │
  (Claude Code,       │   ├── Memory Inbox / lifecycle / audit         │
   Codex, Cursor,     │   ├── capture ingestion + recall hydration     │
   OpenCode...)       │   ├── context query (memory/web/repo/traces)   │
                       │   ├── repo graph query / symbol / impact       │
                       │   ├── Google sign-in + hosted MCP metadata     │
                       │   └── OpenAPI + usage + operator surfaces      │
                       └───────────────┬───────────────────────────────┘
                                       │
                         capture / embedding / graph jobs
                                       ▼
                       ┌───────────────────────────────────────────────┐
                       │ memory-worker  (AWS SQS + DLQ fan-out)        │
                       │   ├── auto redaction / curation / save        │
                       │   ├── dreaming butler (prune/merge/resolve)    │
                       │   ├── private Qwen3 embedding service         │
                       │   └── Qdrant dense+sparse indexing            │
                       └───────────────┬───────────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
          RDS PostgreSQL 16      Qdrant derived index   apps/dashboard
          truth store + audit    lore_memories_v12      user-facing SaaS
```

Детальніше дивіться [docs/architecture.md](../../architecture.md).

## Що нового у v2.1.0

`v2.1.0` — це реліз **Repo Graph API and MCP Tools**. Він робить власний
граф репозиторію Lore першокласною поверхнею пам'яті агента: детерміноване
індексування репозиторію TypeScript/JavaScript для файлів, символів, імпортів,
викликів, маршрутів, тестів та підказок про процеси, що надається через маршрути
API та інструменти MCP лише для читання, щоб агенти будували відповіді про
репозиторій на основі стабільного контракту контексту проекту замість спеціального
текстового пошуку.

v2.1.0 розгорнуто в AWS production та на публічному сайті. Він побудований на
гібридному рушії пам'яті (RDS truth store, AWS SQS worker fan-out, Qdrant derived
index, приватний сервіс вбудовування Qwen3, 7-потоковий `HybridSearchOrchestrator`),
робочому процесі консолідації пам'яті dreaming butler, циклі самовдосконалення
пам'яті агента, опублікованих пакетах SDK middleware та комерційній SaaS-підкладці,
що постачалися в лінійці v1.7–v2.0.

| Можливість | Статус | Де |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Production | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Індексатор графу знань про код | ✅ Production | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query, що компонує пам'ять + web + repo + траси інструментів | ✅ Production | `apps/api`, `docs/api-reference.md` |
| 7-потоковий `HybridSearchOrchestrator` (FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ Production | `packages/search` |
| Cross-encoder ранжувальник (після злиття, за вибором) | ✅ Production | `apps/api/src/rerankers/` |
| Консолідація пам'яті dreaming butler (prune / merge / resolve / surface) | ✅ Production, з прапором | `apps/api/src/workers/butler-v18.ts` |
| Цикл самовдосконалення пам'яті агента + рецепти контексту | ✅ Production, з перевіркою людини | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| SDK middleware (auto-inject + auto-retain для клієнтів OpenAI / Anthropic) | ✅ Опубліковано | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Секретне сховище для AI-агентів (MCP-native, авторизація в три кнопки) | ✅ Beta, очікує криптоаудиту | `apps/mcp-server`, `apps/api` |
| Хмарний рушій пам'яті: RDS truth store + SQS worker fan-out + Qdrant index | ✅ Production | `apps/api`, `apps/api/src/worker.ts` |
| Приватний сервіс векторів Qwen3-Embedding-0.6B 1024-dim | ✅ Production | `apps/api/src/embedding.ts` |
| Автоматичне поглинання захоплень та виключення Memory Inbox | ✅ Production | `apps/api`, `packages/capture` |
| Google sign-in + початкове завантаження особистого сховища | ✅ Production | `apps/api`, `apps/dashboard` |
| Комерційний SaaS: індивідуальні підписки, білінг, квотування | ✅ Production | hosted cloud (`Lore-Context/lore-cloud`) |
| REST API з автентифікацією за API-ключем (reader/writer/admin) | ✅ Production | `apps/api` |
| Контракт OpenAPI 3.1 за адресою `/openapi.json` (повідомляє `2.1.0`) | ✅ Production | `apps/api/src/openapi.ts` |
| MCP stdio-сервер (legacy + офіційний SDK-транспорт) | ✅ Production | `apps/mcp-server` |
| Next.js dashboard з сесією Google + оператор Basic Auth | ✅ Production | `apps/dashboard` |
| Evidence Ledger API + зведення на Dashboard | ✅ Production | `apps/api`, `apps/dashboard` |
| Автомат станів управління + журнал аудиту | ✅ Production | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Production | `packages/eval` |
| Імпорт/експорт MIF v0.2 з `supersedes` + `contradicts` | ✅ Production | `packages/mif` |
| Шлюз моделей (маршрутизація завдання→модель від кількох постачальників) | ✅ Production | `packages/model-gateway` |
| Адаптер `agentmemory` з перевіркою версії + режим деградації | ✅ Production | `packages/agentmemory-adapter` |
| Обмеження швидкості, структуроване JSON-логування з редакцією полів | ✅ Production | `apps/api` |
| Приватне розгортання через Docker Compose | ✅ Production | `docker-compose.yml` |
| Помічник локального впровадження `pnpm quickstart` + звіт про активацію | ✅ Production | `scripts/lore-quickstart.mjs` |
| Офіційний реєстр MCP + документація з дистрибуції / запуску / партнерів з дизайну | ✅ Production | `server.json`, `docs/distribution/`, `docs/launch/` |

Повна історія релізів — у [CHANGELOG.md](../../../CHANGELOG.md).

## Поточний статус релізу

`v2.1.0` — поточний вихідний код, розміщений production та лінія релізу. Він
розгорнутий в AWS production та на публічному сайті через оптимізований процес
релізу: незмінні артефакти arm64-first, smoke-тест staging API, розгортання
production API, ізольоване розгортання сайту, аудит після релізу та закриття
тегу/релізу. Зовнішні перевірки підтверджують, що `https://api.lorecontext.com/health`
повертає `status=ok`, `/openapi.json` повідомляє `2.1.0`, і
`https://lorecontext.com/status.html` містить `v2.1.0`.

Production зберігає форму RDS / SQS / memory-worker / Qdrant cloud від v1.1+,
використовує `lore_memories_v12` як колекцію Qdrant, зберігає 1024-dim
pgvector для шляху Postgres та додає адитивну схему репозиторного графу
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Дивіться [docs/release-status.md](../../release-status.md) для поточного
публічно безпечного знімку статусу та [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
для повних приміток до релізу.

## Фокус релізу

Реліз v2.1 робить граф репозиторію Lore першокласною поверхнею пам'яті агента.
Мета — дозволити агентам відповідати на питання «де визначено X», «що викликає це»
та «що зламається при зміні цього» за детермінованим стабільним контрактом контексту
проекту, а не за спеціальним текстовим пошуком:

- `@lore/repo-graph` — детерміноване індексування репозиторію TypeScript/JavaScript
  для файлів, символів, імпортів, викликів, маршрутів, тестів та підказок про процеси.
- Маршрути API: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact` та `POST /v1/repo/detect-changes`.
- Інструменти MCP: `repo.graph_query`, `repo.symbol_context`, `repo.impact` та
  `repo.detect_changes` (лише для читання).
- `context_query(repo)` тепер використовує докази графу репозиторію від
  постачальника, коли вони доступні, з чесним відкатом «недоступно», коли сховище
  репозиторного графу не налаштовано.
- Схема Postgres репозиторного графу є адитивною — вона розташовується поверх
  існуючої production-схеми та застосовується під час налаштування production/staging-схеми.

Версії кореневого пакету та пакету API повідомляють `2.1.0`, щоб `/openapi.json`
відповідав тегу релізу. Поїзд релізу використовує оптимізовані запобіжні заходи
розгортання API/сайту, введені після v2.0.9.

Дивіться [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md)
та [docs/release-governance.md](../../release-governance.md).

## Інтеграції

Lore Context підтримує MCP та REST і інтегрується з більшістю IDE агентів
та фронтендів чатів:

| Інструмент | Посібник налаштування |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../integrations/openwebui.md) |
| Інші / загальний MCP | [docs/integrations/README.md](../../integrations/README.md) |

## Розгортання

| Режим | Коли використовувати | Документація |
|---|---|---|
| **Локальне з файловим сховищем** | Розробка соло, прототипи, smoke-тести | Цей README, швидкий старт вище |
| **Локальний Postgres+pgvector** | Однонодовий локальний відкат та тестування міграцій | [docs/deployment/README.md](../../deployment/README.md) |
| **Приватний Docker Compose** | Самостійне розгортання команди, ізольована мережа | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Hosted cloud** | RDS / SQS / memory-worker / Qdrant / приватне вбудовування плюс гібридний recall-стек з аугментацією графів та комерційна SaaS-підкладка | [docs/release-status.md](../../release-status.md) |

Всі шляхи розгортання вимагають явних секретів. Локальні/приватні шляхи вимагають
`POSTGRES_PASSWORD`, `LORE_API_KEYS` та автентифікації dashboard. Hosted-розгортання
також вимагають RDS, SQS, Qdrant, сервісу вбудовування, OAuth, конфігурації тунелю
та production runtime exports. Скрипт `scripts/check-env.mjs` відмовляє у запуску
production, якщо будь-яке значення відповідає шаблону-заглушці.

## Безпека

v2.1.0 зберігає захисну позицію для локального/приватного розгортання та
хмарні запобіжні заходи для звичайного доступу користувачів:

- **Автентифікація**: Bearer-токени API-ключів з розподілом ролей (`reader`/`writer`/`admin`) та областю видимості за проектом. Режим з порожніми ключами закривається в production.
- **Обмеження швидкості**: подвійні кошики per-IP + per-key з відкатом при збої автентифікації (429 після 5 невдач за 60с, блокування на 30с).
- **Dashboard**: потік сесії Google для hosted-продукту; HTTP Basic Auth доступний для локальних/приватних операторських розгортань.
- **Контейнери**: всі Dockerfiles запускаються від непривілейованого користувача `node`; HEALTHCHECK для api + dashboard.
- **Секрети**: нульові захардкоджені облікові дані; всі значення за замовчуванням — обов'язкові змінні або відмова. `scripts/check-env.mjs` відхиляє значення-заглушки в production.
- **Управління**: сканування регулярними виразами PII / API-ключів / JWT / приватних ключів при записі; контент з тегами ризику автоматично скеровується в чергу перевірки; незмінний журнал аудиту при кожному переході станів.
- **Отруєння пам'яті**: евристичне виявлення за паттернами консенсусу + наказових дієслів.
- **MCP**: валідація схеми zod для кожного входу інструменту; мутуючі інструменти вимагають `reason` (≥8 символів) та надають `destructiveHint: true`; помилки upstream санують перед поверненням клієнту.
- **Ізоляція worker**: завдання захоплення, вбудовування, графу, конектора та бекфілу проходять через черги AWS SQS з DLQ; Qdrant є похідним індексом, а RDS залишається авторитетним.
- **Логування**: структурований JSON з автоматичним редагуванням полів `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Розкриття вразливостей: [SECURITY.md](../../../SECURITY.md).

## Структура проекту

```text
apps/
  api/                # REST управляюча площина + Postgres + управління + eval + repo graph
  dashboard/          # Next.js dashboard з сесією Google + оператор Basic Auth
  mcp-server/         # MCP stdio-сервер (legacy + офіційні SDK-транспорти)
  cli/                # lore CLI (doctor, wiki-recompile, імпорт/експорт датасетів)
  browser-extension/  # Скаффолд поверхні захоплення
  web/                # Рендерер HTML на стороні сервера (резервний UI без JS)
  website/            # Маркетинговий сайт (обробляється окремо)
packages/
  shared/             # Спільні типи, помилки, утиліти ID/токенів
  agentmemory-adapter # Міст до upstream agentmemory + перевірка версії
  search/             # 7-потоковий HybridSearchOrchestrator + адаптер рецептів
  repo-graph/         # Детерміноване індексування репозиторію (v2.1)
  code-indexer/       # Індексатор графу знань про код (TypeScript/JavaScript)
  code-indexer-python # Індексатор графу знань про код (Python)
  capture/            # Примітиви поглинання захоплень
  connectors/         # Конектори зовнішніх джерел
  model-gateway/      # Маршрутизація завдання→модель від кількох постачальників
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + метричні примітиви + рецепти контексту
  governance/         # Автомат станів + сканування ризиків + отруєння + аудит
  profile/            # Типи сховища / профілю акаунту
  sdk-typescript/     # TypeScript клієнтський SDK
  sdk-python/         # Python клієнтський SDK
  sdk-go/ sdk-java/ sdk-dotnet/   # SDK для додаткових мов
  sdk-middleware-typescript/      # Auto-inject + auto-retain middleware (npm)
  sdk-middleware-python/          # Auto-inject + auto-retain middleware (PyPI)
docs/
  i18n/<lang>/        # Локалізований README на 17 мовах
  integrations/       # Посібники з інтеграції агент-IDE
  deployment/         # Локальні, Docker Compose та production runbooks автоматизації
  legal/              # Конфіденційність / Умови / Cookies (закон Сингапуру)
scripts/
  check-env.mjs       # Валідація env у production-режимі
  smoke-*.mjs         # Наскрізні smoke-тести
  apply-postgres-schema.mjs
```

## Вимоги

- Node.js `>=22`
- pnpm `10.30.1`
- (Необов'язковий локальний відкат) Postgres 16 з pgvector
- (Hosted/розширений) RDS PostgreSQL 16, AWS SQS, Qdrant та приватний сервіс вбудовування

## Участь у розробці

Внески вітаються. Будь ласка, прочитайте [CONTRIBUTING.md](../../../CONTRIBUTING.md)
для ознайомлення з робочим процесом розробки, протоколом повідомлень комітів
та очікуваннями перевірки.

Для перекладів документації дивіться [посібник для учасників i18n](../README.md).

## Управляється компанією

Lore Context управляється компанією **REDLAND PTE. LTD.** (Сингапур, UEN 202304648K). Профіль компанії, юридичні умови та обробка даних задокументовані в [`docs/legal/`](../../legal/).

## Ліцензія

Репозиторій Lore Context ліцензований за [Apache License 2.0](../../../LICENSE). Окремі пакети в `packages/*` оголошують MIT для можливості використання нижче за ланцюгом. Дивіться [NOTICE](../../../NOTICE) для атрибуції upstream.

## Подяки

Lore Context побудований на основі [agentmemory](https://github.com/agentmemory/agentmemory) як локальний рушій пам'яті. Деталі upstream контракту та політика сумісності версій задокументовані в [UPSTREAM.md](../../../UPSTREAM.md).
