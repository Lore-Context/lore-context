> 🤖 Этот документ был переведён машинным способом с английского. Приветствуются улучшения через PR — см. [руководство по переводу](../README.md).

# Справочник API

Lore Context предоставляет REST API под `/v1/*` и stdio MCP сервер. Этот документ
описывает REST поверхность. Имена MCP инструментов перечислены в конце.

Все примеры предполагают:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Соглашения

- Все конечные точки принимают и возвращают JSON.
- Аутентификация: заголовок `Authorization: Bearer <key>` (или `x-lore-api-key`).
  `/health` — единственный неаутентифицированный маршрут.
- Роли: `reader < writer < admin`. Каждая конечная точка указывает минимальную роль.
- Ошибки: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Ограничения частоты: заголовки `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset` в каждом ответе. `429 Too Many Requests` включает заголовок
  `Retry-After`.
- Все мутации записываются в аудит-журнал. Доступ только для admin через
  `/v1/governance/audit-log`.

## Работоспособность и готовность

### `GET /health`
- **Аутентификация**: нет
- **Ответ 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Контекст

### `POST /v1/context/query`
Составить контекст из памяти + веб + репозиторий + трассы инструментов.

- **Аутентификация**: reader+
- **Тело**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Ответ 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Память

### `POST /v1/memory/write`
- **Аутентификация**: writer+ (писатели с ограничением по проекту должны включать совпадающий `project_id`)
- **Тело**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Ответ 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Аутентификация**: reader+
- **Ответ 200**: полная запись памяти, включая состояние управления.

### `POST /v1/memory/:id/update`
Исправить память на месте (только небольшие исправления).
- **Аутентификация**: writer+
- **Тело**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Создать новую память, заменяющую старую.
- **Аутентификация**: writer+
- **Тело**: `{ "content": string, "reason": string }`
- **Ответ 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Мягкое удаление по умолчанию; admin может выполнить жёсткое удаление.
- **Аутентификация**: writer+ (мягкое) / admin (жёсткое)
- **Тело**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Прямой поиск без составления.
- **Аутентификация**: reader+
- **Тело**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Аутентификация**: reader+
- **Параметры запроса**: `project_id` (ОБЯЗАТЕЛЬНО для ограниченных ключей), `state`, `limit`, `offset`
- **Ответ 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Экспорт памяти как MIF v0.2 JSON.
- **Аутентификация**: admin
- **Параметры запроса**: `project_id`, `format` (`json` или `markdown`)
- **Ответ 200**: MIF конверт с `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Импорт конверта MIF v0.1 или v0.2.
- **Аутентификация**: admin (или ограниченный писатель с явным `project_id`)
- **Тело**: MIF конверт как JSON-строка или объект
- **Ответ 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Управление

### `GET /v1/governance/review-queue`
- **Аутентификация**: admin
- **Ответ 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Перевести candidate/flagged → active.
- **Аутентификация**: admin
- **Тело**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Перевести candidate/flagged → deleted.
- **Аутентификация**: admin
- **Тело**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Аутентификация**: admin
- **Параметры запроса**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Ответ 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **Аутентификация**: reader+
- **Ответ 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Аутентификация**: writer+ (писатели с ограничением по проекту должны включать совпадающий `project_id`)
- **Тело**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Ответ 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Получить сохранённый eval-запуск.
- **Аутентификация**: reader+

### `GET /v1/eval/report`
Отрендерить последний eval как Markdown или JSON.
- **Аутентификация**: reader+
- **Параметры запроса**: `project_id`, `format` (`md`|`json`)

## События и трассы

### `POST /v1/events/ingest`
Передать телеметрию агента в Lore.
- **Аутентификация**: writer+
- **Тело**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Аутентификация**: reader+
- **Параметры запроса**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Инспектировать одну трассу контекстного запроса.
- **Аутентификация**: reader+

### `POST /v1/traces/:trace_id/feedback`
Записать обратную связь по контекстному запросу.
- **Аутентификация**: writer+
- **Тело**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Интеграции

### `GET /v1/integrations/agentmemory/health`
Проверить работоспособность upstream agentmemory + совместимость версий.
- **Аутентификация**: reader+
- **Ответ 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Получить память из agentmemory в Lore.
- **Аутентификация**: admin (без ограничений — синхронизация охватывает проекты)
- **Тело**: `{ "project_id"?: string, "dry_run"?: boolean }`

## MCP Сервер (stdio)

MCP сервер предоставляет следующие инструменты. `inputSchema` каждого инструмента —
это JSON Schema, валидированная zod. Мутирующие инструменты требуют строку `reason`
не менее 8 символов.

| Инструмент | Мутирует | Описание |
|---|---|---|
| `context_query` | нет | Составить контекст для запроса |
| `memory_write` | да | Записать новую память |
| `memory_search` | нет | Прямой поиск без составления |
| `memory_get` | нет | Получить по id |
| `memory_list` | нет | Перечислить записи памяти с фильтрами |
| `memory_update` | да | Исправить на месте |
| `memory_supersede` | да | Заменить новой версией |
| `memory_forget` | да | Мягкое или жёсткое удаление |
| `memory_export` | нет | Экспортировать MIF конверт |
| `eval_run` | нет | Запустить eval на наборе данных |
| `trace_get` | нет | Инспектировать трассу по id |

Коды ошибок JSON-RPC:
- `-32602` Недопустимые параметры (ошибка zod-валидации)
- `-32603` Внутренняя ошибка (санированная; оригинал записан в stderr)

Запуск с официальным SDK транспортом:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Формальная спецификация OpenAPI 3.0 отслеживается для v0.5. До тех пор этот прозаический
справочник является авторитетным.
