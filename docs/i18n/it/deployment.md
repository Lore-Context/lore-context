> 🤖 Questo documento è stato tradotto automaticamente dall'inglese. I miglioramenti tramite PR sono benvenuti — consulta la [guida ai contributi di traduzione](../README.md).

# Deployment privato

> **Genera le chiavi con `openssl rand -hex 32` — non usare mai i segnaposto qui sotto in produzione.**

Questo pacchetto include Lore per una demo privata o un rollout interno al team senza modificare i
percorsi del codice dell'applicazione. Il bundle di deployment consiste in:

- `apps/api/Dockerfile`: immagine dell'API REST.
- `apps/dashboard/Dockerfile`: immagine standalone del dashboard Next.js.
- `Dockerfile`: immagine opzionale del launcher MCP per client stdio.
- `docs/deployment/compose.private-demo.yml`: stack compose copia-incolla per Postgres, API, dashboard e un servizio MCP on-demand.
- `examples/demo-dataset/**`: dati seed per i flussi di file-store, import e eval.

## Topologia consigliata

- `postgres`: store durevole per demo condivise o multi-operatore.
- `api`: API REST Lore su una rete bridge interna, pubblicata sul loopback per impostazione predefinita.
- `dashboard`: UI dell'operatore, pubblicata sul loopback per impostazione predefinita e che fa proxy verso l'API tramite `LORE_API_URL`.
- `mcp`: contenitore stdio opzionale per gli operatori Claude, Cursor e Qwen che vogliono un launcher containerizzato invece di `node apps/mcp-server/dist/index.js` sull'host.

Lo stack compose mantiene intenzionalmente l'esposizione pubblica ridotta. Postgres, API e dashboard si collegano tutti a `127.0.0.1` per impostazione predefinita tramite mappature di porte variabilizzate.

## Pre-volo

1. Copia `.env.example` in un file di runtime privato come `.env.private`.
2. Sostituisci `POSTGRES_PASSWORD`.
3. Preferisci `LORE_API_KEYS` rispetto a un singolo `LORE_API_KEY`.
4. Imposta `DASHBOARD_LORE_API_KEY` su una chiave `admin` per il flusso di lavoro completo dell'operatore, o su una chiave `reader` con scope per demo di sola lettura. Imposta `MCP_LORE_API_KEY` su una chiave `writer` o `reader` a seconda che il client debba mutare la memoria.

Esempio di separazione dei ruoli:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
DASHBOARD_BASIC_AUTH_USER=admin
DASHBOARD_BASIC_AUTH_PASS=<YOUR_DASHBOARD_PASSWORD>
```

## Avvio dello stack

Costruisci e avvia lo stack demo privato dalla root del repository:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Controlli di salute:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl -u "${DASHBOARD_BASIC_AUTH_USER}:${DASHBOARD_BASIC_AUTH_PASS}" \
  http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Carica i dati demo

Per lo stack compose supportato da Postgres, importa le memorie demo dopo che l'API è sana:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Esegui la richiesta eval:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Se vuoi invece una demo su singolo host senza database, punta l'API allo snapshot del file-store:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Pattern del launcher MCP

Pattern preferito:

- Esegui il launcher MCP vicino al client.
- Punta `LORE_API_URL` all'URL dell'API privata.
- Fornisci la chiave API più piccola adatta al launcher.

Launcher basato sull'host:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Launcher containerizzato:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Il launcher containerizzato è utile per la configurazione riproducibile della workstation, ma è ancora un processo stdio, non un servizio di rete pubblico a lunga durata.

## Impostazioni predefinite di sicurezza

- Mantieni `API_BIND_HOST`, `DASHBOARD_BIND_HOST` e `POSTGRES_BIND_HOST` su `127.0.0.1` a meno che un reverse proxy autenticato non sia già davanti allo stack.
- Preferisci `LORE_API_KEYS` con separazione `reader` / `writer` / `admin` invece di riutilizzare ovunque una singola chiave admin globale.
- Usa chiavi con scope di progetto per i client demo. L'id progetto demo è `demo-private`.
- Mantieni `AGENTMEMORY_URL` sul loopback e non esporre `agentmemory` raw direttamente.
- Lascia `LORE_AGENTMEMORY_REQUIRED=0` a meno che il deployment privato non dipenda davvero da un runtime agentmemory live.
- Mantieni `LORE_POSTGRES_AUTO_SCHEMA=true` solo per ambienti interni controllati. Una volta che il bootstrap dello schema fa parte del tuo processo di rilascio, puoi bloccarlo su `false`.

## File da riutilizzare

- Esempio Compose: [compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- Immagine API: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Immagine Dashboard: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- Immagine MCP: [Dockerfile](../../../Dockerfile)
- Dati demo: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
