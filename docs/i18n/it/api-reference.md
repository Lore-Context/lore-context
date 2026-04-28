> 🤖 Questo documento è stato tradotto automaticamente dall'inglese. I miglioramenti tramite PR sono benvenuti — consulta la [guida ai contributi di traduzione](../README.md).

# Riferimento API

Lore Context espone un'API REST sotto `/v1/*` e un server MCP stdio. Questo documento
copre la superficie REST. I nomi degli strumenti MCP sono elencati alla fine.

Tutti gli esempi assumono:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Convenzioni

- Tutti gli endpoint accettano e restituiscono JSON.
- Autenticazione: intestazione `Authorization: Bearer <key>` (o `x-lore-api-key`).
  `/health` è l'unica route non autenticata.
- Ruoli: `reader < writer < admin`. Ogni endpoint elenca il suo ruolo minimo.
- Errori: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Limiti di frequenza: intestazioni `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  su ogni risposta. `429 Too Many Requests` include un'intestazione `Retry-After`.
- Tutte le mutazioni sono registrate nell'audit log. Accesso solo admin tramite
  `/v1/governance/audit-log`.

## Salute e disponibilità

### `GET /health`
- **Autenticazione**: nessuna
- **Risposta 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Contesto

### `POST /v1/context/query`
Componi contesto da memoria + web + repo + tracce degli strumenti.

- **Autenticazione**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Risposta 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Memoria

### `POST /v1/memory/write`
- **Autenticazione**: writer+ (i writer con scope di progetto devono includere `project_id` corrispondente)
- **Body**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Risposta 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Autenticazione**: reader+
- **Risposta 200**: record memoria completo incluso lo stato di governance.

### `POST /v1/memory/:id/update`
Patch di una memoria in place (solo piccole correzioni).
- **Autenticazione**: writer+
- **Body**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Crea una nuova memoria che sostituisce una vecchia.
- **Autenticazione**: writer+
- **Body**: `{ "content": string, "reason": string }`
- **Risposta 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Soft delete per impostazione predefinita; l'admin può fare hard delete.
- **Autenticazione**: writer+ (soft) / admin (hard)
- **Body**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Ricerca diretta senza composizione.
- **Autenticazione**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Autenticazione**: reader+
- **Query**: `project_id` (OBBLIGATORIO per le chiavi con scope), `state`, `limit`, `offset`
- **Risposta 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Esporta la memoria come JSON MIF v0.2.
- **Autenticazione**: admin
- **Query**: `project_id`, `format` (`json` o `markdown`)
- **Risposta 200**: envelope MIF con `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Importa un envelope MIF v0.1 o v0.2.
- **Autenticazione**: admin (o writer con scope con `project_id` esplicito)
- **Body**: envelope MIF come stringa JSON o oggetto
- **Risposta 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Governance

### `GET /v1/governance/review-queue`
- **Autenticazione**: admin
- **Risposta 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Promuovi candidate/flagged → active.
- **Autenticazione**: admin
- **Body**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Promuovi candidate/flagged → deleted.
- **Autenticazione**: admin
- **Body**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Autenticazione**: admin
- **Query**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Risposta 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **Autenticazione**: reader+
- **Risposta 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Autenticazione**: writer+ (i writer con scope di progetto devono includere `project_id` corrispondente)
- **Body**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Risposta 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Recupera un'esecuzione eval salvata.
- **Autenticazione**: reader+

### `GET /v1/eval/report`
Render dell'eval più recente come Markdown o JSON.
- **Autenticazione**: reader+
- **Query**: `project_id`, `format` (`md`|`json`)

## Eventi e tracce

### `POST /v1/events/ingest`
Invia telemetria dell'agente in Lore.
- **Autenticazione**: writer+
- **Body**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Autenticazione**: reader+
- **Query**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Ispeziona una singola traccia di context-query.
- **Autenticazione**: reader+

### `POST /v1/traces/:trace_id/feedback`
Registra il feedback su una query di contesto.
- **Autenticazione**: writer+
- **Body**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Integrazioni

### `GET /v1/integrations/agentmemory/health`
Controlla la compatibilità upstream + versione di agentmemory.
- **Autenticazione**: reader+
- **Risposta 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Recupera la memoria da agentmemory in Lore.
- **Autenticazione**: admin (senza scope — la sincronizzazione attraversa i progetti)
- **Body**: `{ "project_id"?: string, "dry_run"?: boolean }`

## Server MCP (stdio)

Il server MCP espone i seguenti strumenti. L'`inputSchema` di ogni strumento è uno
JSON Schema validato con zod. Gli strumenti mutanti richiedono una stringa `reason` di almeno 8 caratteri.

| Strumento | Muta | Descrizione |
|---|---|---|
| `context_query` | no | Componi contesto per una query |
| `memory_write` | sì | Scrivi una nuova memoria |
| `memory_search` | no | Ricerca diretta senza composizione |
| `memory_get` | no | Recupera per id |
| `memory_list` | no | Elenca le memorie con filtri |
| `memory_update` | sì | Patch in place |
| `memory_supersede` | sì | Sostituisci con una nuova versione |
| `memory_forget` | sì | Soft o hard delete |
| `memory_export` | no | Esporta envelope MIF |
| `eval_run` | no | Esegui eval su dataset |
| `trace_get` | no | Ispeziona traccia per id |

Codici di errore JSON-RPC:
- `-32602` Parametri non validi (fallimento di validazione zod)
- `-32603` Errore interno (sanitizzato; originale scritto su stderr)

Esegui con il trasporto SDK ufficiale:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Una specifica OpenAPI 3.0 formale è prevista per v0.5. Fino ad allora, questo riferimento in prosa è
autorevole.
