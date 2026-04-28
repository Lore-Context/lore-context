<div align="center">

> 🤖 Этот документ был переведён машинным способом с английского. Приветствуются улучшения через PR — см. [руководство по переводу](../README.md).

# Lore Context

**Управляющий уровень для памяти, оценки качества и управления AI-агентов.**

Знайте, что каждый агент запомнил, использовал и должен забыть — прежде чем память станет производственным риском.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Начало работы](getting-started.md) · [Справочник API](api-reference.md) · [Архитектура](architecture.md) · [Интеграции](integrations.md) · [Развёртывание](deployment.md) · [Журнал изменений](CHANGELOG.md)

🌐 **Читайте на вашем языке**: [English](../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](./README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## Что такое Lore Context

Lore Context — это **open-core управляющий уровень** для памяти AI-агентов: он объединяет контекст из памяти, поиска и трасс инструментов; оценивает качество извлечения на ваших собственных наборах данных; направляет контент на управленческую проверку при наличии чувствительного содержимого; и экспортирует память в переносимый формат обмена, который можно перемещать между бэкендами.

Он не претендует на роль ещё одной базы данных памяти. Уникальная ценность заключается в том, что располагается поверх памяти:

- **Context Query** — единственная точка входа, объединяющая память + веб + репозиторий + трассы инструментов; возвращает оценённый блок контекста с указанием источника.
- **Memory Eval** — запускает Recall@K, Precision@K, MRR, stale-hit-rate, p95 латентность на наборах данных, которыми вы владеете; сохраняет запуски и сравнивает их для обнаружения регрессий.
- **Governance Review** — шестисостояний жизненный цикл (`candidate / active / flagged / redacted / superseded / deleted`), сканирование тегов риска, эвристика отравления памяти, неизменяемый аудит-журнал.
- **MIF-подобная переносимость** — экспорт/импорт JSON + Markdown с сохранением `provenance / validity / confidence / source_refs / supersedes / contradicts`. Работает как формат миграции между бэкендами памяти.
- **Multi-Agent Adapter** — первоклассная интеграция `agentmemory` с зондированием версии и переходом в режим деградации; чистый контракт адаптера для дополнительных сред выполнения.

## Когда использовать

| Используйте Lore Context, когда... | Используйте базу данных памяти (agentmemory, Mem0, Supermemory), когда... |
|---|---|
| Вам нужно **доказать**, что агент запомнил, почему и было ли это использовано | Вам нужно просто хранилище памяти |
| Вы запускаете нескольких агентов (Claude Code, Cursor, Qwen, Hermes, Dify) и хотите общий надёжный контекст | Вы строите одного агента и вас устраивает уровень памяти, привязанный к поставщику |
| Вам требуется локальное или приватное развёртывание для соответствия требованиям | Вы предпочитаете размещённый SaaS |
| Вам нужна оценка на ваших собственных наборах данных, а не на бенчмарках поставщика | Бенчмарки поставщика дают достаточный сигнал |
| Вы хотите перенести память между системами | Вы не планируете менять бэкенды |

## Быстрый старт

```bash
# 1. Клонирование + установка
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Сгенерируйте настоящий API-ключ (не используйте заглушки ни в какой среде, кроме локальной разработки)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. Запустите API (на основе файла, Postgres не требуется)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Запишите память
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Запросите контекст
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Для полной настройки (Postgres, Docker Compose, Dashboard, интеграция MCP) см. [docs/getting-started.md](getting-started.md).

## Архитектура

```text
                       ┌─────────────────────────────────────────────┐
   MCP clients ──────► │ apps/api  (REST + auth + rate limit + logs) │
   (Claude Code,       │   ├── context router (memory/web/repo/tool) │
    Cursor, Qwen,      │   ├── context composer                      │
    Dify, Hermes...)   │   ├── governance + audit                    │
                       │   ├── eval runner                           │
                       │   └── MIF import/export                     │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adapter     packages/search
           (incremental        (version-probed,        (BM25 / hybrid
            persistence)        degraded-mode safe)     pluggable)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   protected by Basic Auth   │
                       │   memory · traces · eval    │
                       │   governance review queue   │
                       └─────────────────────────────┘
```

Подробности см. в [docs/architecture.md](architecture.md).

## Что нового в v0.4.0-alpha

| Возможность | Статус | Расположение |
|---|---|---|
| REST API с аутентификацией по API-ключу (reader/writer/admin) | ✅ Производство | `apps/api` |
| MCP stdio сервер (legacy + официальный SDK транспорт) | ✅ Производство | `apps/mcp-server` |
| Next.js dashboard с ограничением HTTP Basic Auth | ✅ Производство | `apps/dashboard` |
| Postgres + pgvector инкрементальная персистентность | ✅ Опционально | `apps/api/src/db/` |
| Конечный автомат управления + аудит-журнал | ✅ Производство | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Производство | `packages/eval` |
| MIF v0.2 импорт/экспорт с `supersedes` + `contradicts` | ✅ Производство | `packages/mif` |
| Адаптер `agentmemory` с зондированием версии + режим деградации | ✅ Производство | `packages/agentmemory-adapter` |
| Ограничение частоты (per-IP + per-key с backoff) | ✅ Производство | `apps/api` |
| Структурированное JSON-логирование с редактированием чувствительных полей | ✅ Производство | `apps/api/src/logger.ts` |
| Docker Compose приватное развёртывание | ✅ Производство | `docker-compose.yml` |
| Демо-набор данных + дымовые тесты + UI-тест Playwright | ✅ Производство | `examples/`, `scripts/` |
| Размещённая мультитенантная облачная синхронизация | ⏳ Roadmap | — |

Полные примечания к релизу v0.4.0-alpha см. в [CHANGELOG.md](CHANGELOG.md).

## Интеграции

Lore Context поддерживает MCP и REST и интегрируется с большинством агентских IDE и чат-интерфейсов:

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
| Другое / универсальный MCP | [docs/integrations/README.md](integrations.md) |

## Развёртывание

| Режим | Используйте, когда | Документация |
|---|---|---|
| **Локальный на основе файла** | Одиночная разработка, прототип, дымовые тесты | Этот README, Быстрый старт выше |
| **Локальный Postgres+pgvector** | Продакшн-уровень на одном узле, семантический поиск в масштабе | [docs/deployment/README.md](deployment.md) |
| **Docker Compose приватный** | Self-hosted развёртывание команды, изолированная сеть | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Облачный управляемый** | Появится в v0.6 | — |

Для всех путей развёртывания требуются явные секреты: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. Скрипт `scripts/check-env.mjs` отклоняет запуск в продакшне, если любое значение соответствует шаблону заглушки.

## Безопасность

v0.4.0-alpha реализует эшелонированную защиту, подходящую для непубличных alpha-развёртываний:

- **Аутентификация**: Bearer-токены API-ключей с разделением ролей (`reader`/`writer`/`admin`) и ограничением по проекту. Режим с пустыми ключами завершается ошибкой в продакшне.
- **Ограничение частоты**: двойной бакет per-IP + per-key с backoff при ошибках аутентификации (429 после 5 неудач за 60 с, блокировка на 30 с).
- **Dashboard**: промежуточное ПО HTTP Basic Auth. Отказывается запускаться в продакшне без `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Контейнеры**: все Dockerfile запускаются от непривилегированного пользователя `node`; HEALTHCHECK на api + dashboard.
- **Секреты**: никаких жёстко закодированных учётных данных; все значения по умолчанию — обязательные или вызывающие ошибку переменные. `scripts/check-env.mjs` отвергает значения-заглушки в продакшне.
- **Управление**: сканирование PII / API-ключей / JWT / приватных ключей при записи; контент с тегами риска автоматически направляется в очередь проверки; неизменяемый аудит-журнал при каждом переходе состояния.
- **Отравление памяти**: эвристическое обнаружение на основе доминирования одного источника + паттернов императивных глаголов.
- **MCP**: zod-валидация схемы для каждого ввода инструмента; мутирующие инструменты требуют `reason` (≥8 символов) и указывают `destructiveHint: true`; ошибки upstream санируются перед возвратом клиенту.
- **Логирование**: структурированный JSON с автоматическим редактированием полей `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Раскрытие уязвимостей: [SECURITY.md](SECURITY.md).

## Структура проекта

```text
apps/
  api/                # REST API + Postgres + governance + eval (TypeScript)
  dashboard/          # Next.js 16 dashboard с промежуточным ПО Basic Auth
  mcp-server/         # MCP stdio сервер (legacy + официальный SDK транспорт)
  web/                # Серверный HTML рендерер (UI без JS как запасной вариант)
  website/            # Маркетинговый сайт (обрабатывается отдельно)
packages/
  shared/             # Общие типы, ошибки, утилиты ID/токенов
  agentmemory-adapter # Мост к upstream agentmemory + зондирование версии
  search/             # Подключаемые провайдеры поиска (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + примитивы метрик
  governance/         # Конечный автомат + сканирование рисков + отравление + аудит
docs/
  i18n/<lang>/        # Локализованный README на 17 языках
  integrations/       # 11 руководств по интеграции агент-IDE
  deployment/         # Локальный + Postgres + Docker Compose
  legal/              # Конфиденциальность / Условия / Cookies (законодательство Сингапура)
scripts/
  check-env.mjs       # Валидация env в режиме продакшн
  smoke-*.mjs         # Сквозные дымовые тесты
  apply-postgres-schema.mjs
```

## Требования

- Node.js `>=22`
- pnpm `10.30.1`
- (Опционально) Postgres 16 с pgvector для памяти уровня семантического поиска

## Участие в разработке

Вклад приветствуется. Пожалуйста, прочитайте [CONTRIBUTING.md](CONTRIBUTING.md) для ознакомления с рабочим процессом разработки, протоколом сообщений коммитов и ожиданиями от проверки кода.

Для переводов документации см. [руководство участника i18n](../README.md).

## Оператор

Lore Context управляется компанией **REDLAND PTE. LTD.** (Сингапур, UEN 202304648K). Профиль компании, юридические условия и обработка данных задокументированы в [`docs/legal/`](../../legal/).

## Лицензия

Репозиторий Lore Context лицензирован в соответствии с [Apache License 2.0](../../LICENSE). Отдельные пакеты в `packages/*` декларируют MIT для возможности использования нижестоящими потребителями. Атрибуция upstream указана в [NOTICE](../../NOTICE).

## Благодарности

Lore Context построен поверх [agentmemory](https://github.com/agentmemory/agentmemory) как локальная среда выполнения памяти. Детали контракта upstream и политика совместимости версий задокументированы в [UPSTREAM.md](../../UPSTREAM.md).
