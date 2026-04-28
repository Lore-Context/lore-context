> 🤖 Questo documento è stato tradotto automaticamente dall'inglese. I miglioramenti tramite PR sono benvenuti — consulta la [guida ai contributi di traduzione](../README.md).

# Guida introduttiva

Questa guida ti porta da zero a un'istanza Lore Context funzionante con memoria scritta,
contesto interrogato e dashboard raggiungibile. Pianifica ~15 minuti in totale, ~5 minuti per il
percorso principale.

## Prerequisiti

- **Node.js** `>=22` (usa `nvm`, `mise` o il gestore di package della tua distro)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Opzionale) **Docker + Docker Compose** per il percorso Postgres+pgvector
- (Opzionale) **psql** se preferisci applicare lo schema manualmente

## 1. Clone e installazione

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Se `pnpm test` non è verde, non continuare — apri una segnalazione con il log del fallimento.

## 2. Genera secret reali

Lore Context rifiuta di avviarsi in produzione con valori segnaposto. Genera chiavi reali
anche per lo sviluppo locale per mantenere le tue abitudini coerenti.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Per configurazioni locali multi-ruolo:

```bash
export READER_KEY=$(openssl rand -hex 32)
export WRITER_KEY=$(openssl rand -hex 32)
export ADMIN_KEY=$(openssl rand -hex 32)
export LORE_API_KEYS='[
  {"key":"'"$READER_KEY"'","role":"reader","projectIds":["demo"]},
  {"key":"'"$WRITER_KEY"'","role":"writer","projectIds":["demo"]},
  {"key":"'"$ADMIN_KEY"'","role":"admin"}
]'
```

## 3. Avvia l'API (basata su file, nessun database)

Il percorso più semplice usa un file JSON locale come backend di archiviazione. Adatto per lo sviluppo
individuale e lo smoke testing.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

In un'altra shell, verifica la salute:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Atteso: `{"status":"ok",...}`.

## 4. Scrivi la tua prima memoria

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{
    "content": "Use Postgres pgvector for Lore Context production storage.",
    "memory_type": "project_rule",
    "project_id": "demo",
    "scope": "project"
  }' | jq
```

Atteso: una risposta `200` con l'`id` della nuova memoria e `governance.state` di
`active` o `candidate` (quest'ultimo se il contenuto corrisponde a un pattern di rischio come un
secret).

## 5. Componi il contesto

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{
    "query": "production storage",
    "project_id": "demo",
    "token_budget": 1200
  }' | jq
```

Dovresti vedere la tua memoria citata nell'array `evidence.memory`, oltre a un `traceId` che
puoi successivamente usare per ispezionare il routing e il feedback.

## 6. Avvia il dashboard

In un nuovo terminale:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Apri http://127.0.0.1:3001 nel tuo browser. Il browser chiederà le credenziali Basic Auth.
Una volta autenticato, il dashboard mostra l'inventario della memoria, le tracce, i risultati eval
e la coda di revisione governance.

## 7. (Opzionale) Connetti Claude Code tramite MCP

Aggiungi questo alla sezione MCP servers di `claude_desktop_config.json` di Claude Code:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<incolla qui il tuo $LORE_API_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Riavvia Claude Code. Gli strumenti MCP di Lore Context (`context_query`, `memory_write`, ecc.)
diventano disponibili.

Per altri IDE per agenti (Cursor, Qwen, Dify, FastGPT, ecc.), vedi la matrice di integrazione in
[docs/integrations/README.md](integrations.md).

## 8. (Opzionale) Passa a Postgres + pgvector

Quando superi l'archiviazione su file JSON:

```bash
docker compose up -d postgres
pnpm db:schema   # applies apps/api/src/db/schema.sql via psql
```

Poi avvia l'API con `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Esegui `pnpm smoke:postgres` per verificare che un round trip scrittura-riavvio-lettura sopravviva.

## 9. (Opzionale) Carica il dataset demo ed esegui una valutazione

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Il report eval viene salvato in `output/eval-reports/` come Markdown e JSON.

## Passi successivi

- **Deployment in produzione** — [docs/deployment/README.md](deployment.md)
- **Riferimento API** — [docs/api-reference.md](api-reference.md)
- **Approfondimento architetturale** — [docs/architecture.md](architecture.md)
- **Flusso di revisione governance** — vedi la sezione `Flusso di governance` in
  [docs/architecture.md](architecture.md)
- **Portabilità della memoria (MIF)** — `pnpm --filter @lore/mif test` mostra esempi di round-trip
- **Contribuire** — [CONTRIBUTING.md](CONTRIBUTING.md)

## Problemi comuni

| Sintomo | Causa | Soluzione |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Un altro processo è sulla porta 3000 | `lsof -i :3000` per trovarlo; o imposta `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Modalità produzione senza `DASHBOARD_BASIC_AUTH_USER/PASS` | Esporta le variabili di ambiente o passa `LORE_DASHBOARD_DISABLE_AUTH=1` (solo sviluppo) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Qualsiasi env corrispondeva a `admin-local` / `change-me` / `demo` ecc | Genera valori reali tramite `openssl rand -hex 32` |
| `429 Too Many Requests` | Limite di frequenza attivato | Attendi la finestra di cooldown (predefinito 30s dopo 5 errori di autenticazione); o imposta `LORE_RATE_LIMIT_DISABLED=1` in sviluppo |
| `agentmemory adapter unhealthy` | Runtime agentmemory locale non in esecuzione | Avvia agentmemory o imposta `LORE_AGENTMEMORY_REQUIRED=0` per skip silenzioso |
| Il client MCP vede `-32602 Invalid params` | L'input dello strumento non ha superato la validazione dello schema zod | Controlla l'array `invalid_params` nel corpo dell'errore |
| Dashboard 401 su ogni pagina | Credenziali Basic Auth errate | Re-esporta le variabili di ambiente e riavvia il processo del dashboard |

## Ottenere aiuto

- Segnala un bug: https://github.com/Lore-Context/lore-context/issues
- Segnalazione di sicurezza: vedi [SECURITY.md](SECURITY.md)
- Contribuisci alla documentazione: vedi [CONTRIBUTING.md](CONTRIBUTING.md)
