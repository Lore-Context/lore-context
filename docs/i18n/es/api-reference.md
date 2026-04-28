> 🤖 Este documento fue traducido por máquina del inglés. Las mejoras vía PR son bienvenidas — consulte la [guía de contribución de traducciones](../README.md).

# Referencia de API

Lore Context expone una API REST bajo `/v1/*` y un servidor MCP stdio. Este documento
cubre la superficie REST. Los nombres de las herramientas MCP se listan al final.

Todos los ejemplos asumen:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Convenciones

- Todos los endpoints aceptan y retornan JSON.
- Autenticación: encabezado `Authorization: Bearer <key>` (o `x-lore-api-key`).
  `/health` es la única ruta no autenticada.
- Roles: `reader < writer < admin`. Cada endpoint lista su rol mínimo.
- Errores: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Límites de tasa: encabezados `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset` en cada respuesta. `429 Too Many Requests` incluye un encabezado
  `Retry-After`.
- Todas las mutaciones se registran en el registro de auditoría. Acceso solo admin via
  `/v1/governance/audit-log`.

## Salud y Disponibilidad

### `GET /health`
- **Auth**: ninguna
- **Respuesta 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Contexto

### `POST /v1/context/query`
Compone contexto a partir de memoria + web + repositorio + trazas de herramientas.

- **Auth**: reader+
- **Cuerpo**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Respuesta 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Memoria

### `POST /v1/memory/write`
- **Auth**: writer+ (los escritores con alcance de proyecto deben incluir `project_id` coincidente)
- **Cuerpo**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Respuesta 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Auth**: reader+
- **Respuesta 200**: registro completo de memoria incluyendo estado de gobernanza.

### `POST /v1/memory/:id/update`
Parche de una memoria en su lugar (solo correcciones menores).
- **Auth**: writer+
- **Cuerpo**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Crea una nueva memoria que reemplaza a una antigua.
- **Auth**: writer+
- **Cuerpo**: `{ "content": string, "reason": string }`
- **Respuesta 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Eliminación suave por defecto; admin puede realizar eliminación permanente.
- **Auth**: writer+ (suave) / admin (permanente)
- **Cuerpo**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Búsqueda directa sin composición.
- **Auth**: reader+
- **Cuerpo**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Auth**: reader+
- **Consulta**: `project_id` (REQUERIDO para claves con alcance), `state`, `limit`, `offset`
- **Respuesta 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Exporta memoria como MIF v0.2 JSON.
- **Auth**: admin
- **Consulta**: `project_id`, `format` (`json` o `markdown`)
- **Respuesta 200**: sobre MIF con `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Importa un sobre MIF v0.1 o v0.2.
- **Auth**: admin (o escritor con alcance con `project_id` explícito)
- **Cuerpo**: sobre MIF como cadena JSON u objeto
- **Respuesta 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Gobernanza

### `GET /v1/governance/review-queue`
- **Auth**: admin
- **Respuesta 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Promueve candidate/flagged → active.
- **Auth**: admin
- **Cuerpo**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Promueve candidate/flagged → deleted.
- **Auth**: admin
- **Cuerpo**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Auth**: admin
- **Consulta**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Respuesta 200**: `{ "entries": AuditLog[], "total": number }`

## Evaluación

### `GET /v1/eval/providers`
- **Auth**: reader+
- **Respuesta 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Auth**: writer+ (los escritores con alcance de proyecto deben incluir `project_id` coincidente)
- **Cuerpo**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Respuesta 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Recupera una ejecución de evaluación guardada.
- **Auth**: reader+

### `GET /v1/eval/report`
Renderiza la última evaluación como Markdown o JSON.
- **Auth**: reader+
- **Consulta**: `project_id`, `format` (`md`|`json`)

## Eventos y Trazas

### `POST /v1/events/ingest`
Empuja telemetría del agente hacia Lore.
- **Auth**: writer+
- **Cuerpo**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Auth**: reader+
- **Consulta**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Inspecciona una única traza de consulta de contexto.
- **Auth**: reader+

### `POST /v1/traces/:trace_id/feedback`
Registra retroalimentación sobre una consulta de contexto.
- **Auth**: writer+
- **Cuerpo**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Integraciones

### `GET /v1/integrations/agentmemory/health`
Verifica la compatibilidad de upstream agentmemory + versión.
- **Auth**: reader+
- **Respuesta 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Extrae memoria de agentmemory hacia Lore.
- **Auth**: admin (sin alcance — la sincronización cruza proyectos)
- **Cuerpo**: `{ "project_id"?: string, "dry_run"?: boolean }`

## Servidor MCP (stdio)

El servidor MCP expone las siguientes herramientas. El `inputSchema` de cada herramienta es
un JSON Schema validado por zod. Las herramientas mutantes requieren una cadena `reason` de
al menos 8 caracteres.

| Herramienta | Muta | Descripción |
|---|---|---|
| `context_query` | no | Compone contexto para una consulta |
| `memory_write` | sí | Escribe una nueva memoria |
| `memory_search` | no | Búsqueda directa sin composición |
| `memory_get` | no | Recupera por id |
| `memory_list` | no | Lista memorias con filtros |
| `memory_update` | sí | Parche en su lugar |
| `memory_supersede` | sí | Reemplaza con nueva versión |
| `memory_forget` | sí | Eliminación suave o permanente |
| `memory_export` | no | Exporta sobre MIF |
| `eval_run` | no | Ejecuta evaluación contra conjunto de datos |
| `trace_get` | no | Inspecciona traza por id |

Códigos de error JSON-RPC:
- `-32602` Parámetros inválidos (fallo de validación zod)
- `-32603` Error interno (saneado; el original se escribe en stderr)

Ejecutar con el transporte SDK oficial:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Una especificación formal OpenAPI 3.0 está planificada para v0.5. Hasta entonces, esta
referencia en prosa es autoritativa.
