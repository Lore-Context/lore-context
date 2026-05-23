<div align="center">

# Lore Context

**Управляющий уровень для памяти, оценки и управления AI-агентов.**

Знайте, что каждый агент запомнил, использовал и должен забыть — прежде чем память станет производственным риском.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Начало работы](../../getting-started.md) · [Быстрый старт на сайте](https://lorecontext.com/quickstart/) · [Методология бенчмарков](https://lorecontext.com/benchmark/) · [Справочник API](../../api-reference.md) · [Архитектура](../../architecture.md) · [План проекта](../../project-plan.md) · [Статус релиза](../../release-status.md) · [Дорожная карта](../../roadmap.md) · [Интеграции](../../integrations/README.md) · [Развёртывание](../../deployment/README.md) · [История изменений](../../../CHANGELOG.md)

🌐 **Читать на вашем языке**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Локализованная документация может отставать от текущих английских примечаний к релизу; каноническая документация v2.1 — это английский README и набор `docs/`.

</div>

---

> Этот документ создан машинным переводом с английского, может отставать от последнего релиза, и мы приветствуем PR — см. руководство для участников переводов: [../README.md](../README.md).

## Что такое Lore Context

Lore Context — это **управляющий уровень с открытым ядром** для памяти AI-агентов: он компонует контекст из памяти, поиска, графов репозитория и трасс инструментов; оценивает качество извлечения на ваших собственных наборах данных; маршрутизирует на проверку управления чувствительный контент; и экспортирует память в переносимый формат обмена, который вы можете переносить между бэкендами.

Он не пытается стать ещё одной базой данных памяти. Уникальная ценность — в том, что находится поверх памяти:

- **Context Query** — единственная конечная точка компонует память + web + repo + трассы инструментов, возвращает оценённый блок контекста с происхождением.
- **Memory Eval** — запускает Recall@K, Precision@K, MRR, stale-hit-rate, p95 latency на ваших наборах данных; сохраняет запуски и сравнивает их для обнаружения регрессий.
- **Governance Review** — шестисостояния жизненного цикла (`candidate / active / flagged / redacted / superseded / deleted`), сканирование тегов риска, эвристики отравления, неизменяемый журнал аудита.
- **Переносимость в стиле MIF** — экспорт/импорт JSON + Markdown с сохранением `provenance / validity / confidence / source_refs / supersedes / contradicts`. Работает как формат миграции между бэкендами памяти.
- **Repo Graph** — детерминированное индексирование репозитория (файлы, символы, импорты, вызовы, маршруты, тесты), предоставляемое через маршруты API и инструменты MCP только для чтения, чтобы агенты строили ответы о репозитории на основе стабильного контракта контекста проекта.
- **Multi-Agent Adapter** — первоклассная интеграция `agentmemory` с зондом версии + откатом в режим деградации; чистый контракт адаптера для дополнительных сред выполнения.

## Когда использовать

| Используйте Lore Context, когда... | Используйте базу данных памяти (agentmemory, Mem0, Supermemory), когда... |
|---|---|
| Вам нужно **доказать**, что ваш агент запомнил, почему и было ли это использовано | Вам нужно просто хранилище памяти |
| Вы запускаете несколько агентов (Claude Code, Cursor, Qwen, Hermes, Dify) и хотите общий надёжный контекст | Вы создаёте одного агента и согласны с уровнем памяти, привязанным к поставщику |
| Вам требуется локальное или приватное развёртывание для соответствия требованиям | Вы предпочитаете hosted SaaS |
| Вам нужна оценка на ваших собственных наборах данных, а не бенчмарки поставщика | Бенчмарки поставщика являются достаточным сигналом |
| Вы хотите переносить память между системами | Вы не планируете когда-либо менять бэкенды |

## Быстрый старт

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

Для быстрого старта на публичном сайте см.
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Для полной
настройки (Postgres, Docker Compose, Dashboard, интеграция MCP) см.
[docs/getting-started.md](../../getting-started.md).

Канонический быстрый старт для alpha — `git clone` + `pnpm quickstart`. Lore в
настоящее время не публикует и не заявляет о публичном npm-пакете
`@lore-context/quickstart`. MCP stdio-сервер публикуется отдельно как
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
для распространения в реестре и клиентах, а SDK middleware поставляется как
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) и `lore-context-middleware` (PyPI).

Для обнаружения AI-агентами сайт публикует `/llms.txt` и `/llms-full.txt`
только из публичной документации. Запись в официальном реестре MCP опубликована,
а дополнительные черновики дистрибуции находятся в [docs/distribution](../../distribution/).
Черновики запуска находятся в [docs/launch](../../launch/), а приём партнёров по
дизайну — в [docs/design-partners](../../design-partners/). Публичная страница
бенчмарков — это воспроизводимая методология и небольшой отчёт об опытном запуске,
а не заявление о победе в конкурентном бенчмарке.

## Архитектура

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

Подробнее см. [docs/architecture.md](../../architecture.md).

## Что нового в v2.1.0

`v2.1.0` — это релиз **Repo Graph API and MCP Tools**. Он делает собственный
граф репозитория Lore первоклассной поверхностью памяти агента: детерминированное
индексирование репозитория TypeScript/JavaScript для файлов, символов, импортов,
вызовов, маршрутов, тестов и подсказок о процессах, предоставляемое через маршруты
API и инструменты MCP только для чтения, чтобы агенты строили ответы о репозитории
на основе стабильного контракта контекста проекта вместо специального текстового поиска.

v2.1.0 развёрнут в AWS production и на публичном сайте. Он построен на гибридном
движке памяти (RDS truth store, AWS SQS worker fan-out, Qdrant derived index, приватный
сервис встраивания Qwen3, 7-поточный `HybridSearchOrchestrator`), рабочем процессе
консолидации памяти dreaming butler, цикле самоулучшения памяти агента, опубликованных
пакетах SDK middleware и коммерческой SaaS-подложке, поставленных в линейке v1.7–v2.0.

| Возможность | Статус | Где |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Production | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Индексатор графа знаний о коде | ✅ Production | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query, компонующий память + web + repo + трассы инструментов | ✅ Production | `apps/api`, `docs/api-reference.md` |
| 7-поточный `HybridSearchOrchestrator` (FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ Production | `packages/search` |
| Cross-encoder реранкер (после слияния, по выбору) | ✅ Production | `apps/api/src/rerankers/` |
| Консолидация памяти dreaming butler (prune / merge / resolve / surface) | ✅ Production, с флагом | `apps/api/src/workers/butler-v18.ts` |
| Цикл самоулучшения памяти агента + рецепты контекста | ✅ Production, с проверкой человека | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| SDK middleware (auto-inject + auto-retain для клиентов OpenAI / Anthropic) | ✅ Опубликован | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Секретное хранилище для AI-агентов (MCP-native, авторизация в три кнопки) | ✅ Beta, ожидает криптоаудита | `apps/mcp-server`, `apps/api` |
| Облачный движок памяти: RDS truth store + SQS worker fan-out + Qdrant index | ✅ Production | `apps/api`, `apps/api/src/worker.ts` |
| Приватный сервис векторов Qwen3-Embedding-0.6B 1024-dim | ✅ Production | `apps/api/src/embedding.ts` |
| Автоматическое поглощение захватов и исключения Memory Inbox | ✅ Production | `apps/api`, `packages/capture` |
| Google sign-in + начальная загрузка личного хранилища | ✅ Production | `apps/api`, `apps/dashboard` |
| Коммерческий SaaS: индивидуальные подписки, биллинг, квотирование | ✅ Production | hosted cloud (`Lore-Context/lore-cloud`) |
| REST API с аутентификацией по API-ключу (reader/writer/admin) | ✅ Production | `apps/api` |
| Контракт OpenAPI 3.1 по адресу `/openapi.json` (сообщает `2.1.0`) | ✅ Production | `apps/api/src/openapi.ts` |
| MCP stdio-сервер (legacy + официальный SDK-транспорт) | ✅ Production | `apps/mcp-server` |
| Next.js dashboard с сессией Google + оператор Basic Auth | ✅ Production | `apps/dashboard` |
| Evidence Ledger API + сводка на Dashboard | ✅ Production | `apps/api`, `apps/dashboard` |
| Конечный автомат управления + журнал аудита | ✅ Production | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Production | `packages/eval` |
| Импорт/экспорт MIF v0.2 с `supersedes` + `contradicts` | ✅ Production | `packages/mif` |
| Шлюз моделей (маршрутизация задача→модель от нескольких поставщиков) | ✅ Production | `packages/model-gateway` |
| Адаптер `agentmemory` с зондом версии + режим деградации | ✅ Production | `packages/agentmemory-adapter` |
| Ограничение скорости, структурированное JSON-логирование с редактированием полей | ✅ Production | `apps/api` |
| Приватное развёртывание через Docker Compose | ✅ Production | `docker-compose.yml` |
| Помощник локального внедрения `pnpm quickstart` + отчёт об активации | ✅ Production | `scripts/lore-quickstart.mjs` |
| Официальный реестр MCP + документация по дистрибуции / запуску / партнёрам по дизайну | ✅ Production | `server.json`, `docs/distribution/`, `docs/launch/` |

Полная история релизов — в [CHANGELOG.md](../../../CHANGELOG.md).

## Текущий статус релиза

`v2.1.0` — текущий исходный код, размещённый production и линия релиза. Он
развёрнут в AWS production и на публичном сайте через оптимизированный процесс
релиза: неизменяемые артефакты arm64-first, smoke-тест staging API, развёртывание
production API, изолированное развёртывание сайта, аудит после релиза и закрытие
тега/релиза. Внешние проверки подтверждают, что `https://api.lorecontext.com/health`
возвращает `status=ok`, `/openapi.json` сообщает `2.1.0`, и
`https://lorecontext.com/status.html` содержит `v2.1.0`.

Production сохраняет форму RDS / SQS / memory-worker / Qdrant cloud от v1.1+,
использует `lore_memories_v12` в качестве коллекции Qdrant, сохраняет 1024-dim
pgvector для пути Postgres и добавляет аддитивную схему репозиторного графа
(`apps/api/src/db/schema-v21-repo-graph.sql`).

См. [docs/release-status.md](../../release-status.md) для текущего публично
безопасного снимка статуса и [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
для полных примечаний к релизу.

## Фокус релиза

Релиз v2.1 делает граф репозитория Lore первоклассной поверхностью памяти агента.
Цель — позволить агентам отвечать на вопросы «где определён X», «что вызывает это»
и «что сломается при изменении этого» по детерминированному стабильному контракту
контекста проекта, а не по специальному текстовому поиску:

- `@lore/repo-graph` — детерминированное индексирование репозитория TypeScript/JavaScript
  для файлов, символов, импортов, вызовов, маршрутов, тестов и подсказок о процессах.
- Маршруты API: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact` и `POST /v1/repo/detect-changes`.
- Инструменты MCP: `repo.graph_query`, `repo.symbol_context`, `repo.impact` и
  `repo.detect_changes` (только для чтения).
- `context_query(repo)` теперь использует доказательства графа репозитория от
  поставщика, когда они доступны, с честным откатом «недоступно», когда хранилище
  репозиторного графа не настроено.
- Схема Postgres репозиторного графа является аддитивной — она располагается поверх
  существующей production-схемы и применяется при настройке production/staging-схемы.

Версии корневого пакета и пакета API сообщают `2.1.0`, чтобы `/openapi.json`
соответствовал тегу релиза. Поезд релиза использует оптимизированные
разграничительные меры развёртывания API/сайта, введённые после v2.0.9.

См. [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md)
и [docs/release-governance.md](../../release-governance.md).

## Интеграции

Lore Context поддерживает MCP и REST и интегрируется с большинством IDE агентов
и фронтендов чатов:

| Инструмент | Руководство по настройке |
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
| Другие / общий MCP | [docs/integrations/README.md](../../integrations/README.md) |

## Развёртывание

| Режим | Когда использовать | Документация |
|---|---|---|
| **Локальное с файловым хранилищем** | Разработка соло, прототипы, smoke-тесты | Этот README, быстрый старт выше |
| **Локальный Postgres+pgvector** | Однонодовый локальный откат и тестирование миграций | [docs/deployment/README.md](../../deployment/README.md) |
| **Приватный Docker Compose** | Самостоятельное развёртывание команды, изолированная сеть | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Hosted cloud** | RDS / SQS / memory-worker / Qdrant / приватное встраивание плюс гибридный recall-стек с аугментацией графов и коммерческая SaaS-подложка | [docs/release-status.md](../../release-status.md) |

Все пути развёртывания требуют явных секретов. Локальные/приватные пути требуют
`POSTGRES_PASSWORD`, `LORE_API_KEYS` и аутентификации dashboard. Hosted-развёртывания
также требуют RDS, SQS, Qdrant, сервиса встраивания, OAuth, конфигурации туннеля
и production runtime exports. Скрипт `scripts/check-env.mjs` отказывает в запуске
production, если любое значение соответствует шаблону-заглушке.

## Безопасность

v2.1.0 сохраняет защитную позицию для локального/приватного развёртывания и
облачные меры защиты для обычного доступа пользователей:

- **Аутентификация**: Bearer-токены API-ключей с разделением ролей (`reader`/`writer`/`admin`) и областью видимости по проекту. Режим с пустыми ключами закрывается в production.
- **Ограничение скорости**: двойные корзины per-IP + per-key с откатом при сбое аутентификации (429 после 5 неудач за 60с, блокировка на 30с).
- **Dashboard**: поток сессии Google для hosted-продукта; HTTP Basic Auth доступен для локальных/приватных операторских развёртываний.
- **Контейнеры**: все Dockerfiles запускаются от непривилегированного пользователя `node`; HEALTHCHECK для api + dashboard.
- **Секреты**: нулевые захардкоженные учётные данные; все значения по умолчанию — обязательные переменные или отказ. `scripts/check-env.mjs` отвергает значения-заглушки в production.
- **Управление**: сканирование регулярными выражениями PII / API-ключей / JWT / приватных ключей при записи; контент с тегами риска автоматически направляется в очередь проверки; неизменяемый журнал аудита при каждом переходе состояний.
- **Отравление памяти**: эвристическое обнаружение по паттернам консенсуса + императивных глаголов.
- **MCP**: валидация схемы zod для каждого входа инструмента; мутирующие инструменты требуют `reason` (≥8 символов) и предоставляют `destructiveHint: true`; ошибки upstream санируются перед возвратом клиенту.
- **Изоляция worker**: задания захвата, встраивания, графа, коннектора и бэкфила проходят через очереди AWS SQS с DLQ; Qdrant является производным индексом, а RDS остаётся авторитетным.
- **Логирование**: структурированный JSON с автоматическим редактированием полей `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Раскрытие уязвимостей: [SECURITY.md](../../../SECURITY.md).

## Структура проекта

```text
apps/
  api/                # REST управляющий уровень + Postgres + управление + eval + repo graph
  dashboard/          # Next.js dashboard с сессией Google + оператор Basic Auth
  mcp-server/         # MCP stdio-сервер (legacy + официальные SDK-транспорты)
  cli/                # lore CLI (doctor, wiki-recompile, импорт/экспорт датасетов)
  browser-extension/  # Скаффолд поверхности захвата
  web/                # Рендерер HTML на стороне сервера (резервный UI без JS)
  website/            # Маркетинговый сайт (обрабатывается отдельно)
packages/
  shared/             # Общие типы, ошибки, утилиты ID/токенов
  agentmemory-adapter # Мост к upstream agentmemory + зонд версии
  search/             # 7-поточный HybridSearchOrchestrator + адаптер рецептов
  repo-graph/         # Детерминированное индексирование репозитория (v2.1)
  code-indexer/       # Индексатор графа знаний о коде (TypeScript/JavaScript)
  code-indexer-python # Индексатор графа знаний о коде (Python)
  capture/            # Примитивы поглощения захватов
  connectors/         # Коннекторы внешних источников
  model-gateway/      # Маршрутизация задача→модель от нескольких поставщиков
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + метрические примитивы + рецепты контекста
  governance/         # Конечный автомат + сканирование рисков + отравление + аудит
  profile/            # Типы хранилища / профиля аккаунта
  sdk-typescript/     # TypeScript клиентский SDK
  sdk-python/         # Python клиентский SDK
  sdk-go/ sdk-java/ sdk-dotnet/   # SDK для дополнительных языков
  sdk-middleware-typescript/      # Auto-inject + auto-retain middleware (npm)
  sdk-middleware-python/          # Auto-inject + auto-retain middleware (PyPI)
docs/
  i18n/<lang>/        # Локализованный README на 17 языках
  integrations/       # Руководства по интеграции агент-IDE
  deployment/         # Локальные, Docker Compose и production runbooks автоматизации
  legal/              # Конфиденциальность / Условия / Cookies (закон Сингапура)
scripts/
  check-env.mjs       # Валидация env в production-режиме
  smoke-*.mjs         # Сквозные smoke-тесты
  apply-postgres-schema.mjs
```

## Требования

- Node.js `>=22`
- pnpm `10.30.1`
- (Необязательный локальный откат) Postgres 16 с pgvector
- (Hosted/расширенный) RDS PostgreSQL 16, AWS SQS, Qdrant и приватный сервис встраивания

## Вклад в проект

Мы приветствуем вклад. Пожалуйста, прочтите [CONTRIBUTING.md](../../../CONTRIBUTING.md)
для ознакомления с рабочим процессом разработки, протоколом сообщений коммитов
и ожиданиями проверки.

Для переводов документации см. [руководство для участников i18n](../README.md).

## Управляется компанией

Lore Context управляется компанией **REDLAND PTE. LTD.** (Сингапур, UEN 202304648K). Профиль компании, юридические условия и обработка данных задокументированы в [`docs/legal/`](../../legal/).

## Лицензия

Репозиторий Lore Context лицензирован под [Apache License 2.0](../../../LICENSE). Отдельные пакеты под `packages/*` объявляют MIT для возможности использования в downstream-проектах. См. [NOTICE](../../../NOTICE) для атрибуции upstream.

## Благодарности

Lore Context построен поверх [agentmemory](https://github.com/agentmemory/agentmemory) как локальная среда выполнения памяти. Детали контракта upstream и политика совместимости версий задокументированы в [UPSTREAM.md](../../../UPSTREAM.md).
