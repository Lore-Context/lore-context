> 🤖 Questo documento è stato tradotto automaticamente dall'inglese. I miglioramenti tramite PR sono benvenuti — consulta la [guida ai contributi di traduzione](../README.md).

# Guide alle integrazioni

Queste guide documentano il contratto di integrazione di Lore Context rispetto all'MVP locale attuale.

## Stato attuale del repository

- Il repository include ora un'API REST locale, context router/composer, persistenza opzionale su file JSON, store runtime Postgres opzionale, tracce, import/export memoria, confronto provider eval, dashboard HTML servita dall'API, dashboard Next.js standalone e un confine dell'adapter `agentmemory`.
- `apps/mcp-server/src/index.ts` fornisce un launcher MCP stdio JSON-RPC eseguibile che fa proxy degli strumenti verso l'API REST Lore tramite `LORE_API_URL` e inoltra `LORE_API_KEY` come token Bearer quando configurato. Supporta il loop stdio built-in legacy e il trasporto stdio ufficiale `@modelcontextprotocol/sdk` tramite `LORE_MCP_TRANSPORT=sdk`.
- I documenti di seguito sono contratti di integrazione. Le integrazioni API-first possono usare il server REST locale oggi; i client con capacità MCP possono usare il launcher stdio locale dopo `pnpm build`.

## Design condiviso

- I client con capacità MCP dovrebbero connettersi a un piccolo server MCP Lore, non a `agentmemory` raw.
- I client API-first dovrebbero chiamare gli endpoint REST Lore, con `POST /v1/context/query` come percorso di lettura principale.
- `POST /v1/context/query` accetta `mode`, `sources`, `freshness`, `token_budget`, `writeback_policy` e `include_sources` così i client possono forzare o disabilitare il routing memoria/web/repo/tracce-strumenti quando necessario.
- Lore avvolge il runtime `agentmemory` locale tramite `packages/agentmemory-adapter`.
- `agentmemory` locale è atteso su `http://127.0.0.1:3111`.

## Superficie MCP disponibile

- `context_query`
- `memory_write`
- `memory_search`
- `memory_forget`
- `memory_list`
- `memory_get`
- `memory_update`
- `memory_supersede`
- `memory_export`
- `eval_run`
- `trace_get`

## Superficie REST disponibile

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` con `project_id`, `scope`, `status`, `memory_type`, `q` e `limit` opzionali
- `GET /v1/memory/:id`
- `PATCH /v1/memory/:id`
- `POST /v1/memory/:id/supersede`
- `GET /v1/memory/export`
- `POST /v1/memory/import`
- `GET /v1/governance/review-queue`
- `POST /v1/governance/memory/:id/approve`
- `POST /v1/governance/memory/:id/reject`
- `POST /v1/events/ingest`
- `POST /v1/eval/run`
- `GET /v1/eval/providers`
- `GET /v1/eval/runs`
- `GET /v1/eval/runs/:id`
- `GET /v1/traces`
- `GET /v1/traces/:id`
- `POST /v1/traces/:id/feedback`
- `GET /v1/audit-logs`

## Smoke API locale

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Il percorso di smoke automatizzato è:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Smoke MCP locale

Il launcher MCP legge JSON-RPC delimitato da newline su stdin e scrive solo messaggi JSON-RPC su stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Non avviare tramite `pnpm start` da un client MCP perché i banner del gestore di package inquinerebbero stdout.

## Allineamento al deployment privato

Il packaging demo privato in [docs/deployment/README.md](deployment.md) assume:

- L'API Lore e il dashboard eseguono come container a lunga durata.
- Postgres è lo store durevole predefinito per le demo condivise.
- Il launcher MCP rimane un processo stdio vicino al client, o esegue come servizio compose `mcp` opzionale su richiesta.
- Il seeding demo proviene da [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json), mentre lo smoke eval proviene da [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json).

Per i deployment privati, punta i launcher client all'URL dell'API privata e fornisci il ruolo più piccolo adatto:

- `reader`: dashboard e copilot di sola lettura.
- `writer`: agenti che devono scrivere memoria, feedback o esecuzioni eval.
- `admin`: flussi di import, export, governance, audit e dimenticanza.

## Template client consapevoli del deployment

### Claude Code

Preferisci un processo stdio locale alla workstation che punta all'API privata:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY="${WRITE_KEY:?set WRITE_KEY}" \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

Se usi il container MCP invece di `node .../dist/index.js`, mantieni la stessa coppia `LORE_API_URL` / `LORE_API_KEY` ed esegui il launcher stdio tramite `docker compose run --rm mcp`.

### Cursor

Il JSON MCP in stile Cursor deve mantenere il launcher locale e cambiare solo il target dell'API e la chiave:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_READER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Usa una chiave `writer` solo quando i flussi di lavoro Cursor scrivono intenzionalmente memoria duratura del progetto.

### Qwen Code

Il JSON `mcpServers` in stile Qwen segue lo stesso confine:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_WRITER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Usa `reader` per assistenti di recupero di sola ricerca e `writer` per flussi agentici che necessitano degli strumenti `memory_write`, `memory_update` o di feedback di traccia.

## Impostazioni predefinite sicure

- Preferisci `stdio` localmente per MCP; usa HTTP streamable autenticato solo quando è richiesto il trasporto remoto.
- Tratta SSE come compatibilità legacy, non il percorso predefinito.
- Whitelist degli strumenti con `includeTools` o equivalente del client.
- Non abilitare modalità di fiducia estesa per impostazione predefinita.
- Richiedi `reason` sulle operazioni mutanti.
- Mantieni `memory_forget` su soft delete a meno che un admin non imposti deliberatamente `hard_delete: true` per la rimozione controllata.
- Usa la separazione dei ruoli `LORE_API_KEYS` per l'esposizione API locale o remota condivisa: `reader` per i client di sola lettura, `writer` per il writeback dell'agente e `admin` solo per le operazioni di sync/import/export/forget/governance/audit. Aggiungi `projectIds` per limitare le chiavi client ai progetti che possono vedere o mutare.
- Mantieni `agentmemory` collegato a `127.0.0.1`.
- Non esporre pubblicamente il viewer o la console raw di `agentmemory`.
- Contratto `agentmemory` 0.9.3 attuale: `remember`, `export`, `audit` e `forget(memoryId)` sono utilizzabili per i test di sincronizzazione/contratto Lore; `smart-search` cerca le osservazioni e non dovrebbe essere trattato come prova che i record di memoria appena ricordati siano direttamente ricercabili.
