> 🤖 Цей документ перекладено машинним способом з англійської. Вітаємо покращення через PR — див. [посібник з перекладу](../README.md).

<div align="center">

# Lore Context

**Площина управління пам'яттю, оцінюванням та управлінням AI-агентів.**

Знайте, що кожен агент запам'ятав, використав і має забути — до того, як пам'ять стане виробничим ризиком.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Початок роботи](../../getting-started.md) · [Довідник API](../../api-reference.md) · [Архітектура](../../architecture.md) · [Інтеграції](../../integrations/README.md) · [Розгортання](../../deployment/README.md) · [Журнал змін](../../../CHANGELOG.md)

🌐 **Читайте цей документ своєю мовою**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](./README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## Що таке Lore Context

Lore Context — це **open-core площина управління** пам'яттю AI-агентів: вона компонує контекст з пам'яті, пошуку та трас інструментів; оцінює якість отримання даних на власних наборах даних; скеровує контент на перевірку управлінням для чутливого вмісту; та експортує пам'ять у портативному форматі обміну, який можна переміщати між бекендами.

Вона не намагається бути ще однією базою даних пам'яті. Унікальна цінність полягає в тому, що знаходиться поверх пам'яті:

- **Context Query** — єдина точка доступу компонує пам'ять + веб + репозиторій + траси інструментів, повертає оцінений блок контексту з провенансом.
- **Memory Eval** — запускає Recall@K, Precision@K, MRR, stale-hit-rate, p95 затримку на наборах даних, якими ви володієте; зберігає запуски та виявляє регресії через порівняння.
- **Governance Review** — шестистанний життєвий цикл (`candidate / active / flagged / redacted / superseded / deleted`), сканування тегів ризику, евристика отруєння, незмінний журнал аудиту.
- **MIF-подібна портативність** — JSON + Markdown експорт/імпорт зі збереженням `provenance / validity / confidence / source_refs / supersedes / contradicts`. Працює як формат міграції між бекендами пам'яті.
- **Multi-Agent Adapter** — перший клас інтеграції `agentmemory` з перевіркою версії та запасним режимом деградації; чистий контракт адаптера для додаткових середовищ виконання.

## Коли використовувати

| Використовуйте Lore Context, якщо... | Використовуйте базу даних пам'яті (agentmemory, Mem0, Supermemory), якщо... |
|---|---|
| Вам потрібно **довести** що ваш агент запам'ятав, чому і чи це використовувалось | Вам потрібне лише сире зберігання пам'яті |
| Ви запускаєте кілька агентів (Claude Code, Cursor, Qwen, Hermes, Dify) і хочете спільний надійний контекст | Ви будуєте одного агента і згодні з прив'язкою до постачальника пам'яті |
| Вам потрібне локальне або приватне розгортання для відповідності вимогам | Ви віддаєте перевагу хостингу SaaS |
| Вам потрібне оцінювання на власних наборах даних, а не тестах постачальника | Тести постачальника є достатнім сигналом |
| Ви хочете перенести пам'ять між системами | Ви не плануєте змінювати бекенди |

## Швидкий старт

```bash
# 1. Клонувати + встановити
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Згенерувати реальний API-ключ (не використовуйте заповнювачі в будь-якому середовищі, крім локальної розробки)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. Запустити API (на основі файлів, Postgres не потрібен)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Записати пам'ять
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Запитати контекст
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Для повного налаштування (Postgres, Docker Compose, Dashboard, MCP інтеграція) дивіться [docs/getting-started.md](../../getting-started.md).

## Архітектура

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

Детальніше дивіться [docs/architecture.md](../../architecture.md).

## Що є у v0.4.0-alpha

| Можливість | Статус | Де |
|---|---|---|
| REST API з автентифікацією за API-ключем (reader/writer/admin) | ✅ Виробництво | `apps/api` |
| MCP stdio сервер (legacy + офіційний SDK транспорт) | ✅ Виробництво | `apps/mcp-server` |
| Next.js дашборд з HTTP Basic Auth | ✅ Виробництво | `apps/dashboard` |
| Postgres + pgvector інкрементальне збереження | ✅ Опціонально | `apps/api/src/db/` |
| Автомат станів управління + журнал аудиту | ✅ Виробництво | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Виробництво | `packages/eval` |
| MIF v0.2 імпорт/експорт з `supersedes` + `contradicts` | ✅ Виробництво | `packages/mif` |
| Адаптер `agentmemory` з перевіркою версії + режимом деградації | ✅ Виробництво | `packages/agentmemory-adapter` |
| Обмеження частоти (per-IP + per-key з відступом) | ✅ Виробництво | `apps/api` |
| Структуроване JSON логування з редакцією чутливих полів | ✅ Виробництво | `apps/api/src/logger.ts` |
| Docker Compose приватне розгортання | ✅ Виробництво | `docker-compose.yml` |
| Демонаборі даних + димові тести + Playwright UI тест | ✅ Виробництво | `examples/`, `scripts/` |
| Хостований багатоорендний хмарний синхронізацію | ⏳ Дорожня карта | — |

Дивіться [CHANGELOG.md](../../../CHANGELOG.md) для повних приміток до випуску v0.4.0-alpha.

## Інтеграції

Lore Context підтримує MCP та REST і інтегрується з більшістю IDE агентів та чат-інтерфейсів:

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

| Режим | Використовуйте, якщо | Документація |
|---|---|---|
| **Локальний на основі файлів** | Одиночна розробка, прототип, димове тестування | Цей README, Швидкий старт вище |
| **Локальний Postgres+pgvector** | Одновузлове виробниче рішення, семантичний пошук у масштабі | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose приватний** | Самостійне командне розгортання, ізольована мережа | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Хмарне керований** | З'явиться у v0.6 | — |

Всі шляхи розгортання вимагають явних секретів: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. Скрипт `scripts/check-env.mjs` відмовляє в запуску виробництва, якщо будь-яке значення відповідає шаблону заповнювача.

## Безпека

v0.4.0-alpha реалізує поглиблений захист, відповідний для не публічних альфа-розгортань:

- **Автентифікація**: Токени-носії API-ключів з розподілом ролей (`reader`/`writer`/`admin`) та обмеженням до проекту. Режим порожніх ключів блокується у виробництві.
- **Обмеження частоти**: подвійний кошик per-IP + per-key з відступом при помилці автентифікації (429 після 5 невдалих спроб за 60с, блокування на 30с).
- **Дашборд**: Проміжне ПЗ HTTP Basic Auth. Відмовляє в запуску у виробництві без `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Контейнери**: всі Dockerfiles запускаються від непривілейованого користувача `node`; HEALTHCHECK на api + dashboard.
- **Секрети**: нуль жорстко закодованих облікових даних; всі значення за замовчуванням є обов'язковими або відмовними змінними. `scripts/check-env.mjs` відхиляє значення заповнювачів у виробництві.
- **Управління**: сканування PII / API key / JWT / private-key regex при записі; контент з тегом ризику автоматично скеровується до черги перегляду; незмінний журнал аудиту при кожному переході стану.
- **Отруєння пам'яті**: евристичне виявлення на основі домінування одного джерела та шаблонів наказових дієслів.
- **MCP**: zod валідація схеми для кожного вхідного інструменту; мутаційні інструменти вимагають `reason` (≥8 символів) і відображають `destructiveHint: true`; помилки від джерела очищуються перед поверненням клієнту.
- **Логування**: структурований JSON з автоматичною редакцією полів `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Розкриття вразливостей: [SECURITY.md](../../../SECURITY.md).

## Структура проекту

```text
apps/
  api/                # REST API + Postgres + governance + eval (TypeScript)
  dashboard/          # Next.js 16 дашборд з проміжним ПЗ Basic Auth
  mcp-server/         # MCP stdio сервер (legacy + офіційний SDK транспорт)
  web/                # Серверний HTML рендерер (резервний UI без JS)
  website/            # Маркетинговий сайт (обробляється окремо)
packages/
  shared/             # Спільні типи, помилки, утиліти ID/токен
  agentmemory-adapter # Міст до upstream agentmemory + перевірка версії
  search/             # Підключні провайдери пошуку (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + примітиви метрик
  governance/         # Автомат станів + сканування ризику + отруєння + аудит
docs/
  i18n/<lang>/        # Локалізовані README на 17 мовах
  integrations/       # 11 посібників інтеграції agent-IDE
  deployment/         # Локальне + Postgres + Docker Compose
  legal/              # Конфіденційність / Умови / Cookies (законодавство Сінгапуру)
scripts/
  check-env.mjs       # Валідація середовища для виробничого режиму
  smoke-*.mjs         # Наскрізні димові тести
  apply-postgres-schema.mjs
```

## Вимоги

- Node.js `>=22`
- pnpm `10.30.1`
- (Опціонально) Postgres 16 з pgvector для пам'яті рівня семантичного пошуку

## Участь у розробці

Внески вітаються. Будь ласка, прочитайте [CONTRIBUTING.md](../../../CONTRIBUTING.md) для ознайомлення з робочим процесом розробки, протоколом повідомлень комітів та очікуваннями перевірки.

Для перекладів документації дивіться [посібник учасника i18n](../README.md).

## Оператор

Lore Context керується **REDLAND PTE. LTD.** (Сінгапур, UEN 202304648K). Профіль компанії, юридичні умови та обробка даних задокументовані в [`docs/legal/`](../../legal/).

## Ліцензія

Репозиторій Lore Context ліцензований за [Apache License 2.0](../../../LICENSE). Окремі пакунки в `packages/*` оголошують MIT для можливості використання нижче за ланцюгом. Дивіться [NOTICE](../../../NOTICE) для атрибуції upstream.

## Подяки

Lore Context побудований на основі [agentmemory](https://github.com/agentmemory/agentmemory) як локальний рушій пам'яті. Деталі upstream контракту та політика сумісності версій задокументовані в [UPSTREAM.md](../../../UPSTREAM.md).
