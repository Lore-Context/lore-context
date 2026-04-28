> 🤖 Ten dokument został przetłumaczony maszynowo z języka angielskiego. Ulepszenia poprzez PR są mile widziane — zobacz [przewodnik dla tłumaczy](../README.md).

# Dokumentacja API

Lore Context udostępnia REST API pod `/v1/*` oraz serwer MCP stdio. Ten dokument
obejmuje powierzchnię REST. Nazwy narzędzi MCP wymienione są na końcu.

Wszystkie przykłady zakładają:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Konwencje

- Wszystkie punkty końcowe przyjmują i zwracają JSON.
- Uwierzytelnianie: nagłówek `Authorization: Bearer <key>` (lub `x-lore-api-key`).
  `/health` to jedyna trasa nieuwierzytelniona.
- Role: `reader < writer < admin`. Każdy punkt końcowy wymienia minimalną rolę.
- Błędy: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Limity szybkości: nagłówki `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  przy każdej odpowiedzi. `429 Too Many Requests` zawiera nagłówek `Retry-After`.
- Wszystkie mutacje są rejestrowane w dzienniku audytu. Dostęp wyłącznie dla admina przez
  `/v1/governance/audit-log`.

## Stan i gotowość

### `GET /health`
- **Uwierzytelnianie**: brak
- **Odpowiedź 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Kontekst

### `POST /v1/context/query`
Komponuj kontekst z pamięci + sieci + repozytorium + śladów narzędzi.

- **Uwierzytelnianie**: reader+
- **Treść**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Odpowiedź 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Pamięć

### `POST /v1/memory/write`
- **Uwierzytelnianie**: writer+ (zakresowi pisarze muszą podać pasujący `project_id`)
- **Treść**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Odpowiedź 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Uwierzytelnianie**: reader+
- **Odpowiedź 200**: pełny rekord pamięci włącznie ze stanem zarządzania.

### `POST /v1/memory/:id/update`
Łataj pamięć w miejscu (tylko małe korekty).
- **Uwierzytelnianie**: writer+
- **Treść**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Utwórz nową pamięć zastępującą starą.
- **Uwierzytelnianie**: writer+
- **Treść**: `{ "content": string, "reason": string }`
- **Odpowiedź 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Domyślnie miękkie usunięcie; admin może twardo usunąć.
- **Uwierzytelnianie**: writer+ (miękkie) / admin (twarde)
- **Treść**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Bezpośrednie wyszukiwanie bez kompozycji.
- **Uwierzytelnianie**: reader+
- **Treść**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Uwierzytelnianie**: reader+
- **Zapytanie**: `project_id` (WYMAGANE dla kluczy zakresowych), `state`, `limit`, `offset`
- **Odpowiedź 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Eksportuj pamięć jako MIF v0.2 JSON.
- **Uwierzytelnianie**: admin
- **Zapytanie**: `project_id`, `format` (`json` lub `markdown`)
- **Odpowiedź 200**: koperta MIF z `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Importuj kopertę MIF v0.1 lub v0.2.
- **Uwierzytelnianie**: admin (lub zakresowy pisarz z jawnym `project_id`)
- **Treść**: koperta MIF jako ciąg JSON lub obiekt
- **Odpowiedź 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Zarządzanie

### `GET /v1/governance/review-queue`
- **Uwierzytelnianie**: admin
- **Odpowiedź 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Promuj candidate/flagged → active.
- **Uwierzytelnianie**: admin
- **Treść**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Promuj candidate/flagged → deleted.
- **Uwierzytelnianie**: admin
- **Treść**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Uwierzytelnianie**: admin
- **Zapytanie**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Odpowiedź 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **Uwierzytelnianie**: reader+
- **Odpowiedź 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Uwierzytelnianie**: writer+ (zakresowi pisarze muszą podać pasujący `project_id`)
- **Treść**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Odpowiedź 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Pobierz zapisany przebieg eval.
- **Uwierzytelnianie**: reader+

### `GET /v1/eval/report`
Renderuj najnowszy eval jako Markdown lub JSON.
- **Uwierzytelnianie**: reader+
- **Zapytanie**: `project_id`, `format` (`md`|`json`)

## Zdarzenia i ślady

### `POST /v1/events/ingest`
Przekaż telemetrię agenta do Lore.
- **Uwierzytelnianie**: writer+
- **Treść**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Uwierzytelnianie**: reader+
- **Zapytanie**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Inspekcja pojedynczego śladu zapytania kontekstowego.
- **Uwierzytelnianie**: reader+

### `POST /v1/traces/:trace_id/feedback`
Zarejestruj informację zwrotną o zapytaniu kontekstowym.
- **Uwierzytelnianie**: writer+
- **Treść**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Integracje

### `GET /v1/integrations/agentmemory/health`
Sprawdź upstream agentmemory i kompatybilność wersji.
- **Uwierzytelnianie**: reader+
- **Odpowiedź 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Pobierz pamięć z agentmemory do Lore.
- **Uwierzytelnianie**: admin (nieskopowane — synchronizacja przekracza projekty)
- **Treść**: `{ "project_id"?: string, "dry_run"?: boolean }`

## Serwer MCP (stdio)

Serwer MCP udostępnia następujące narzędzia. `inputSchema` każdego narzędzia to walidowany przez zod
JSON Schema. Narzędzia mutujące wymagają ciągu `reason` co najmniej 8 znaków.

| Narzędzie | Mutuje | Opis |
|---|---|---|
| `context_query` | nie | Komponuj kontekst dla zapytania |
| `memory_write` | tak | Zapisz nową pamięć |
| `memory_search` | nie | Bezpośrednie wyszukiwanie bez kompozycji |
| `memory_get` | nie | Pobierz po id |
| `memory_list` | nie | Lista pamięci z filtrami |
| `memory_update` | tak | Łataj w miejscu |
| `memory_supersede` | tak | Zastąp nową wersją |
| `memory_forget` | tak | Miękkie lub twarde usunięcie |
| `memory_export` | nie | Eksportuj kopertę MIF |
| `eval_run` | nie | Uruchom eval na zbiorze danych |
| `trace_get` | nie | Inspekcja śladu po id |

Kody błędów JSON-RPC:
- `-32602` Nieprawidłowe parametry (błąd walidacji zod)
- `-32603` Błąd wewnętrzny (sanityzowany; oryginał zapisany na stderr)

Uruchom z oficjalnym transportem SDK:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Formalna specyfikacja OpenAPI 3.0 jest zaplanowana dla v0.5. Do tego czasu ta dokumentacja w prozie jest
autorytatywna.
