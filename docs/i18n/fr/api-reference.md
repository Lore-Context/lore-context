> 🤖 Ce document a été traduit automatiquement de l'anglais. Les améliorations via PR sont les bienvenues — consultez le [guide de contribution aux traductions](../README.md).

# Référence API

Lore Context expose une REST API sous `/v1/*` et un serveur MCP stdio. Ce document
couvre la surface REST. Les noms des outils MCP sont listés à la fin.

Tous les exemples supposent :

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Conventions

- Tous les points d'accès acceptent et retournent du JSON.
- Authentification : en-tête `Authorization: Bearer <key>` (ou `x-lore-api-key`).
  `/health` est la seule route non authentifiée.
- Rôles : `reader < writer < admin`. Chaque point d'accès liste son rôle minimum.
- Erreurs : `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Limitation de débit : en-têtes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  sur chaque réponse. `429 Too Many Requests` inclut un en-tête `Retry-After`.
- Toutes les mutations sont enregistrées dans le journal d'audit. Accès admin uniquement via
  `/v1/governance/audit-log`.

## Santé et disponibilité

### `GET /health`
- **Auth** : aucune
- **Réponse 200** : `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Contexte

### `POST /v1/context/query`
Composer le contexte à partir de mémoire + web + dépôt + traces d'outils.

- **Auth** : reader+
- **Corps** : `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Réponse 200** : `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Mémoire

### `POST /v1/memory/write`
- **Auth** : writer+ (les writers à portée de projet doivent inclure un `project_id` correspondant)
- **Corps** : `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Réponse 200** : `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Auth** : reader+
- **Réponse 200** : enregistrement de mémoire complet incluant l'état de gouvernance.

### `POST /v1/memory/:id/update`
Patcher une mémoire en place (petites corrections uniquement).
- **Auth** : writer+
- **Corps** : `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Créer une nouvelle mémoire qui remplace une ancienne.
- **Auth** : writer+
- **Corps** : `{ "content": string, "reason": string }`
- **Réponse 200** : `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Suppression douce par défaut ; l'admin peut effectuer une suppression définitive.
- **Auth** : writer+ (douce) / admin (définitive)
- **Corps** : `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Recherche directe sans composition.
- **Auth** : reader+
- **Corps** : `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Auth** : reader+
- **Paramètres** : `project_id` (REQUIS pour les clés à portée limitée), `state`, `limit`, `offset`
- **Réponse 200** : `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Exporter la mémoire en JSON MIF v0.2.
- **Auth** : admin
- **Paramètres** : `project_id`, `format` (`json` ou `markdown`)
- **Réponse 200** : enveloppe MIF avec `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Importer une enveloppe MIF v0.1 ou v0.2.
- **Auth** : admin (ou writer à portée limitée avec `project_id` explicite)
- **Corps** : enveloppe MIF en chaîne JSON ou objet
- **Réponse 200** : `{ "imported": number, "skipped": number, "errors": [...] }`

## Gouvernance

### `GET /v1/governance/review-queue`
- **Auth** : admin
- **Réponse 200** : `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Promouvoir candidate/flagged → active.
- **Auth** : admin
- **Corps** : `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Promouvoir candidate/flagged → deleted.
- **Auth** : admin
- **Corps** : `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Auth** : admin
- **Paramètres** : `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Réponse 200** : `{ "entries": AuditLog[], "total": number }`

## Évaluation

### `GET /v1/eval/providers`
- **Auth** : reader+
- **Réponse 200** : `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Auth** : writer+ (les writers à portée de projet doivent inclure un `project_id` correspondant)
- **Corps** : `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Réponse 200** : `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Récupérer une exécution d'évaluation sauvegardée.
- **Auth** : reader+

### `GET /v1/eval/report`
Afficher la dernière évaluation en Markdown ou JSON.
- **Auth** : reader+
- **Paramètres** : `project_id`, `format` (`md`|`json`)

## Événements et traces

### `POST /v1/events/ingest`
Pousser la télémétrie d'agent dans Lore.
- **Auth** : writer+
- **Corps** : `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Auth** : reader+
- **Paramètres** : `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Inspecter une trace de requête de contexte unique.
- **Auth** : reader+

### `POST /v1/traces/:trace_id/feedback`
Enregistrer un retour sur une requête de contexte.
- **Auth** : writer+
- **Corps** : `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Intégrations

### `GET /v1/integrations/agentmemory/health`
Vérifier l'amont agentmemory + la compatibilité de version.
- **Auth** : reader+
- **Réponse 200** : `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Tirer la mémoire d'agentmemory dans Lore.
- **Auth** : admin (non limité — la synchronisation traverse les projets)
- **Corps** : `{ "project_id"?: string, "dry_run"?: boolean }`

## Serveur MCP (stdio)

Le serveur MCP expose les outils suivants. Le `inputSchema` de chaque outil est un schéma JSON
validé par zod. Les outils mutants nécessitent une chaîne `reason` d'au moins 8 caractères.

| Outil | Mutant | Description |
|---|---|---|
| `context_query` | non | Composer le contexte pour une requête |
| `memory_write` | oui | Écrire une nouvelle mémoire |
| `memory_search` | non | Recherche directe sans composition |
| `memory_get` | non | Récupérer par identifiant |
| `memory_list` | non | Lister les mémoires avec filtres |
| `memory_update` | oui | Patcher en place |
| `memory_supersede` | oui | Remplacer par une nouvelle version |
| `memory_forget` | oui | Suppression douce ou définitive |
| `memory_export` | non | Exporter une enveloppe MIF |
| `eval_run` | non | Exécuter une évaluation contre un jeu de données |
| `trace_get` | non | Inspecter une trace par identifiant |

Codes d'erreur JSON-RPC :
- `-32602` Paramètres invalides (échec de validation zod)
- `-32603` Erreur interne (nettoyée ; originale écrite sur stderr)

Exécuter avec le transport SDK officiel :
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Une spécification formelle OpenAPI 3.0 est prévue pour v0.5. En attendant, cette référence en prose fait autorité.
