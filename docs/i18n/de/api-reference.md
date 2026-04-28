> 🤖 Dieses Dokument wurde maschinell aus dem Englischen übersetzt. Verbesserungen per PR sind willkommen — siehe [Übersetzungs-Beitragsleitfaden](../README.md).

# API-Referenz

Lore Context stellt eine REST API unter `/v1/*` und einen stdio MCP-Server bereit. Dieses Dokument
deckt die REST-Oberfläche ab. MCP-Tool-Namen sind am Ende aufgeführt.

Alle Beispiele setzen voraus:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Konventionen

- Alle Endpunkte akzeptieren und geben JSON zurück.
- Authentifizierung: `Authorization: Bearer <key>`-Header (oder `x-lore-api-key`).
  `/health` ist die einzige nicht-authentifizierte Route.
- Rollen: `reader < writer < admin`. Jeder Endpunkt listet seine Mindestrole.
- Fehler: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Ratenbegrenzungen: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  Header bei jeder Antwort. `429 Too Many Requests` enthält einen `Retry-After`-Header.
- Alle Mutationen werden im Audit-Protokoll aufgezeichnet. Nur-Admin-Zugriff über
  `/v1/governance/audit-log`.

## Health und Readiness

### `GET /health`
- **Auth**: keine
- **Antwort 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Kontext

### `POST /v1/context/query`
Kontext aus Speicher + Web + Repository + Tool-Traces zusammenstellen.

- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Antwort 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Speicher

### `POST /v1/memory/write`
- **Auth**: writer+ (projektbezogene Writer müssen passende `project_id` angeben)
- **Body**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Antwort 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Auth**: reader+
- **Antwort 200**: vollständiger Speicher-Datensatz einschließlich Governance-Zustand.

### `POST /v1/memory/:id/update`
Speicher in-place patchen (nur kleine Korrekturen).
- **Auth**: writer+
- **Body**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Einen neuen Speicher erstellen, der einen alten ersetzt.
- **Auth**: writer+
- **Body**: `{ "content": string, "reason": string }`
- **Antwort 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Standardmäßig Soft-Delete; Admin kann Hard-Delete durchführen.
- **Auth**: writer+ (soft) / admin (hard)
- **Body**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Direkte Suche ohne Komposition.
- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Auth**: reader+
- **Query**: `project_id` (PFLICHT für bereichsbezogene Schlüssel), `state`, `limit`, `offset`
- **Antwort 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Speicher als MIF v0.2 JSON exportieren.
- **Auth**: admin
- **Query**: `project_id`, `format` (`json` oder `markdown`)
- **Antwort 200**: MIF-Envelope mit `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Eine MIF v0.1 oder v0.2 Envelope importieren.
- **Auth**: admin (oder bereichsbezogener Writer mit expliziter `project_id`)
- **Body**: MIF-Envelope als JSON-String oder Objekt
- **Antwort 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Governance

### `GET /v1/governance/review-queue`
- **Auth**: admin
- **Antwort 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
candidate/flagged → active befördern.
- **Auth**: admin
- **Body**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
candidate/flagged → deleted befördern.
- **Auth**: admin
- **Body**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Auth**: admin
- **Query**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Antwort 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **Auth**: reader+
- **Antwort 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Auth**: writer+ (projektbezogene Writer müssen passende `project_id` angeben)
- **Body**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Antwort 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Einen gespeicherten Eval-Durchlauf abrufen.
- **Auth**: reader+

### `GET /v1/eval/report`
Das neueste Eval als Markdown oder JSON rendern.
- **Auth**: reader+
- **Query**: `project_id`, `format` (`md`|`json`)

## Events und Traces

### `POST /v1/events/ingest`
Agenten-Telemetrie in Lore einpflegen.
- **Auth**: writer+
- **Body**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Auth**: reader+
- **Query**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Einen einzelnen Kontext-Abfrage-Trace inspizieren.
- **Auth**: reader+

### `POST /v1/traces/:trace_id/feedback`
Feedback zu einer Kontext-Abfrage aufzeichnen.
- **Auth**: writer+
- **Body**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Integrationen

### `GET /v1/integrations/agentmemory/health`
agentmemory-Upstream + Versionskompatibilität prüfen.
- **Auth**: reader+
- **Antwort 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Speicher von agentmemory in Lore ziehen.
- **Auth**: admin (unbereichtsbezogen — Sync überschreitet Projekte)
- **Body**: `{ "project_id"?: string, "dry_run"?: boolean }`

## MCP-Server (stdio)

Der MCP-Server stellt die folgenden Tools bereit. Das `inputSchema` jedes Tools ist ein zod-validiertes
JSON Schema. Mutierende Tools erfordern einen `reason`-String von mindestens 8 Zeichen.

| Tool | Mutiert | Beschreibung |
|---|---|---|
| `context_query` | nein | Kontext für eine Abfrage zusammenstellen |
| `memory_write` | ja | Neuen Speicher schreiben |
| `memory_search` | nein | Direkte Suche ohne Komposition |
| `memory_get` | nein | Nach ID abrufen |
| `memory_list` | nein | Speicher mit Filtern auflisten |
| `memory_update` | ja | In-place patchen |
| `memory_supersede` | ja | Mit neuer Version ersetzen |
| `memory_forget` | ja | Soft- oder Hard-Delete |
| `memory_export` | nein | MIF-Envelope exportieren |
| `eval_run` | nein | Eval gegen Datensatz ausführen |
| `trace_get` | nein | Trace nach ID inspizieren |

JSON-RPC Fehlercodes:
- `-32602` Ungültige Parameter (zod-Validierungsfehler)
- `-32603` Interner Fehler (bereinigt; Original auf stderr geschrieben)

Mit dem offiziellen SDK-Transport ausführen:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Eine formale OpenAPI 3.0-Spezifikation ist für v0.5 geplant. Bis dahin ist diese Prosa-Referenz maßgeblich.
