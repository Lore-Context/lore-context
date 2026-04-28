> 🤖 Цей документ перекладено машинним способом з англійської. Вітаємо покращення через PR — див. [посібник з перекладу](../README.md).

# Довідник API

Lore Context надає REST API за адресою `/v1/*` та stdio MCP сервер. Цей документ
охоплює REST поверхню. Назви інструментів MCP наведені наприкінці.

Усі приклади припускають:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Угоди

- Всі ендпоінти приймають та повертають JSON.
- Автентифікація: заголовок `Authorization: Bearer <key>` (або `x-lore-api-key`).
  `/health` — єдиний маршрут без автентифікації.
- Ролі: `reader < writer < admin`. Кожен ендпоінт вказує мінімальну роль.
- Помилки: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Обмеження частоти: заголовки `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset` у кожній відповіді. `429 Too Many Requests` містить заголовок
  `Retry-After`.
- Всі мутації записуються в журнал аудиту. Доступ лише для admin через
  `/v1/governance/audit-log`.

## Стан та готовність

### `GET /health`
- **Автентифікація**: без автентифікації
- **Відповідь 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Контекст

### `POST /v1/context/query`
Скласти контекст з пам'яті + вебу + репозиторію + трас інструментів.

- **Автентифікація**: reader+
- **Тіло**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Відповідь 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Пам'ять

### `POST /v1/memory/write`
- **Автентифікація**: writer+ (writer з обмеженням до проекту повинен вказати відповідний `project_id`)
- **Тіло**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Відповідь 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Автентифікація**: reader+
- **Відповідь 200**: повний запис пам'яті включно зі станом управління.

### `POST /v1/memory/:id/update`
Патч пам'яті на місці (лише невеликі виправлення).
- **Автентифікація**: writer+
- **Тіло**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Створити нову пам'ять, що замінює стару.
- **Автентифікація**: writer+
- **Тіло**: `{ "content": string, "reason": string }`
- **Відповідь 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
М'яке видалення за замовчуванням; admin може жорстко видалити.
- **Автентифікація**: writer+ (м'яке) / admin (жорстке)
- **Тіло**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Прямий пошук без компоновки.
- **Автентифікація**: reader+
- **Тіло**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Автентифікація**: reader+
- **Запит**: `project_id` (ОБОВ'ЯЗКОВО для ключів з обмеженням), `state`, `limit`, `offset`
- **Відповідь 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Експорт пам'яті як MIF v0.2 JSON.
- **Автентифікація**: admin
- **Запит**: `project_id`, `format` (`json` або `markdown`)
- **Відповідь 200**: MIF конверт з `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Імпорт конверту MIF v0.1 або v0.2.
- **Автентифікація**: admin (або writer з обмеженням та явним `project_id`)
- **Тіло**: MIF конверт як JSON рядок або об'єкт
- **Відповідь 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Управління

### `GET /v1/governance/review-queue`
- **Автентифікація**: admin
- **Відповідь 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Просунути candidate/flagged → active.
- **Автентифікація**: admin
- **Тіло**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Просунути candidate/flagged → deleted.
- **Автентифікація**: admin
- **Тіло**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Автентифікація**: admin
- **Запит**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Відповідь 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **Автентифікація**: reader+
- **Відповідь 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Автентифікація**: writer+ (writer з обмеженням до проекту повинен вказати відповідний `project_id`)
- **Тіло**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Відповідь 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Отримати збережений запуск eval.
- **Автентифікація**: reader+

### `GET /v1/eval/report`
Відобразити останній eval як Markdown або JSON.
- **Автентифікація**: reader+
- **Запит**: `project_id`, `format` (`md`|`json`)

## Події та траси

### `POST /v1/events/ingest`
Передати телеметрію агента в Lore.
- **Автентифікація**: writer+
- **Тіло**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Автентифікація**: reader+
- **Запит**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Перевірити одну трасу запиту контексту.
- **Автентифікація**: reader+

### `POST /v1/traces/:trace_id/feedback`
Записати зворотний зв'язок щодо запиту контексту.
- **Автентифікація**: writer+
- **Тіло**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Інтеграції

### `GET /v1/integrations/agentmemory/health`
Перевірити upstream agentmemory + сумісність версій.
- **Автентифікація**: reader+
- **Відповідь 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Витягнути пам'ять з agentmemory в Lore.
- **Автентифікація**: admin (без обмеження — синхронізація перетинає проекти)
- **Тіло**: `{ "project_id"?: string, "dry_run"?: boolean }`

## MCP Сервер (stdio)

MCP сервер надає такі інструменти. `inputSchema` кожного інструменту є zod-валідованою
JSON Schema. Мутаційні інструменти вимагають рядок `reason` щонайменше 8 символів.

| Інструмент | Мутує | Опис |
|---|---|---|
| `context_query` | ні | Скласти контекст для запиту |
| `memory_write` | так | Записати нову пам'ять |
| `memory_search` | ні | Прямий пошук без компоновки |
| `memory_get` | ні | Отримати за id |
| `memory_list` | ні | Перелічити пам'яті з фільтрами |
| `memory_update` | так | Патч на місці |
| `memory_supersede` | так | Замінити новою версією |
| `memory_forget` | так | М'яке або жорстке видалення |
| `memory_export` | ні | Експортувати MIF конверт |
| `eval_run` | ні | Запустити eval проти набору даних |
| `trace_get` | ні | Перевірити трасу за id |

Коди помилок JSON-RPC:
- `-32602` Невалідні параметри (невдача zod валідації)
- `-32603` Внутрішня помилка (очищена; оригінал записано в stderr)

Запуск з офіційним SDK транспортом:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Формальна специфікація OpenAPI 3.0 відстежується для v0.5. До того часу цей
прозаїчний довідник є авторитетним.
