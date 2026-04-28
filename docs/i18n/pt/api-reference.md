> 🤖 Este documento foi traduzido por máquina do inglês. Melhorias via PR são bem-vindas — consulte o [guia de contribuição de tradução](../README.md).

# Referência da API

O Lore Context expõe uma REST API em `/v1/*` e um servidor MCP stdio. Este documento
cobre a superfície REST. Os nomes das ferramentas MCP são listados ao final.

Todos os exemplos assumem:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Convenções

- Todos os endpoints aceitam e retornam JSON.
- Autenticação: header `Authorization: Bearer <key>` (ou `x-lore-api-key`).
  `/health` é a única rota não autenticada.
- Papéis: `reader < writer < admin`. Cada endpoint lista seu papel mínimo.
- Erros: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Limites de taxa: headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset` em cada resposta. `429 Too Many Requests` inclui um header
  `Retry-After`.
- Todas as mutações são registradas no log de auditoria. Acesso somente admin via
  `/v1/governance/audit-log`.

## Saúde e Prontidão

### `GET /health`
- **Auth**: nenhuma
- **Resposta 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Contexto

### `POST /v1/context/query`
Compõe contexto de memória + web + repositório + rastros de ferramentas.

- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Resposta 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Memória

### `POST /v1/memory/write`
- **Auth**: writer+ (writers com escopo devem incluir `project_id` correspondente)
- **Body**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Resposta 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Auth**: reader+
- **Resposta 200**: registro completo de memória incluindo estado de governança.

### `POST /v1/memory/:id/update`
Atualiza uma memória no local (apenas pequenas correções).
- **Auth**: writer+
- **Body**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Cria uma nova memória que substitui uma antiga.
- **Auth**: writer+
- **Body**: `{ "content": string, "reason": string }`
- **Resposta 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Soft delete por padrão; admin pode fazer hard delete.
- **Auth**: writer+ (soft) / admin (hard)
- **Body**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Busca direta sem composição.
- **Auth**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Auth**: reader+
- **Query**: `project_id` (OBRIGATÓRIO para chaves com escopo), `state`, `limit`,
  `offset`
- **Resposta 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Exporta memória como MIF v0.2 JSON.
- **Auth**: admin
- **Query**: `project_id`, `format` (`json` ou `markdown`)
- **Resposta 200**: envelope MIF com `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Importa um envelope MIF v0.1 ou v0.2.
- **Auth**: admin (ou writer com escopo com `project_id` explícito)
- **Body**: envelope MIF como string JSON ou objeto
- **Resposta 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Governança

### `GET /v1/governance/review-queue`
- **Auth**: admin
- **Resposta 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Promove candidate/flagged → active.
- **Auth**: admin
- **Body**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Promove candidate/flagged → deleted.
- **Auth**: admin
- **Body**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Auth**: admin
- **Query**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Resposta 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **Auth**: reader+
- **Resposta 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Auth**: writer+ (writers com escopo devem incluir `project_id` correspondente)
- **Body**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Resposta 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Recupera uma execução de eval salva.
- **Auth**: reader+

### `GET /v1/eval/report`
Renderiza o eval mais recente como Markdown ou JSON.
- **Auth**: reader+
- **Query**: `project_id`, `format` (`md`|`json`)

## Eventos e Rastros

### `POST /v1/events/ingest`
Envia telemetria do agente para o Lore.
- **Auth**: writer+
- **Body**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Auth**: reader+
- **Query**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Inspeciona um único rastro de consulta de contexto.
- **Auth**: reader+

### `POST /v1/traces/:trace_id/feedback`
Registra feedback em uma consulta de contexto.
- **Auth**: writer+
- **Body**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Integrações

### `GET /v1/integrations/agentmemory/health`
Verifica o upstream agentmemory + compatibilidade de versão.
- **Auth**: reader+
- **Resposta 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Puxa memória do agentmemory para o Lore.
- **Auth**: admin (sem escopo — a sincronização cruza projetos)
- **Body**: `{ "project_id"?: string, "dry_run"?: boolean }`

## Servidor MCP (stdio)

O servidor MCP expõe as seguintes ferramentas. O `inputSchema` de cada ferramenta é um
JSON Schema validado por zod. Ferramentas mutantes exigem uma string `reason` de pelo
menos 8 caracteres.

| Ferramenta | Muta | Descrição |
|---|---|---|
| `context_query` | não | Compõe contexto para uma consulta |
| `memory_write` | sim | Grava uma nova memória |
| `memory_search` | não | Busca direta sem composição |
| `memory_get` | não | Recupera por id |
| `memory_list` | não | Lista memórias com filtros |
| `memory_update` | sim | Atualiza no local |
| `memory_supersede` | sim | Substitui com nova versão |
| `memory_forget` | sim | Soft ou hard delete |
| `memory_export` | não | Exporta envelope MIF |
| `eval_run` | não | Executa eval contra dataset |
| `trace_get` | não | Inspeciona rastro por id |

Códigos de erro JSON-RPC:
- `-32602` Parâmetros inválidos (falha de validação zod)
- `-32603` Erro interno (sanitizado; original gravado em stderr)

Execute com o transporte do SDK oficial:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Uma especificação formal OpenAPI 3.0 está prevista para v0.5. Até lá, esta referência
em prosa é autoritativa.
