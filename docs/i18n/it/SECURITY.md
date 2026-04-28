> 🤖 Questo documento è stato tradotto automaticamente dall'inglese. I miglioramenti tramite PR sono benvenuti — consulta la [guida ai contributi di traduzione](../README.md).

# Policy di sicurezza

Lore Context gestisce memoria, tracce, audit log e credenziali di integrazione. Tratta
le segnalazioni di sicurezza come alta priorità.

## Segnalazione di una vulnerabilità

Non aprire una segnalazione pubblica per vulnerabilità sospette, secret trapelati, bypass
di autenticazione, esposizione di dati o problemi di isolamento dei tenant.

Percorso di segnalazione preferito:

1. Usa il **GitHub private vulnerability reporting** per questo repository quando disponibile.
2. Se la segnalazione privata non è disponibile, contatta i maintainer privatamente e
   includi:
   - versione o commit interessato,
   - passaggi per la riproduzione,
   - impatto previsto,
   - se sono coinvolti secret reali o dati personali.

Puntiamo a confermare i rapporti credibili entro 72 ore.

## Versioni supportate

Lore Context è attualmente software alpha pre-1.0. Le correzioni di sicurezza puntano prima al branch `main`.
I rilasci taggati possono ricevere patch mirate quando una versione pubblica è
attivamente utilizzata dagli operatori downstream.

| Versione | Supportata |
|---|---|
| v0.4.x-alpha | ✅ Attiva |
| v0.3.x e precedenti | ❌ Solo pre-release interno |

## Hardening integrato (v0.4.0-alpha)

L'alpha include i seguenti controlli di difesa in profondità. Gli operatori dovrebbero
verificare che siano attivi nel proprio deployment.

### Autenticazione

- **Token bearer con chiave API** (`Authorization: Bearer <key>` o
  intestazione `x-lore-api-key`).
- **Separazione dei ruoli**: `reader` / `writer` / `admin`.
- **Scoping per progetto**: le voci JSON di `LORE_API_KEYS` possono includere una
  allow-list `projectIds: ["..."]`; le mutazioni richiedono un `project_id` corrispondente.
- **La modalità chiavi vuote fallisce in modo chiuso in produzione**: con `NODE_ENV=production` e nessuna
  chiave configurata, l'API rifiuta tutte le richieste.
- **Bypass loopback rimosso**: le versioni precedenti si fidavano di `Host: 127.0.0.1`; v0.4 usa
  solo l'indirizzo remoto a livello di socket.

### Limite di frequenza

- **Limitatore a doppio bucket per IP e per chiave** con backoff in caso di errori di autenticazione.
- **Valori predefiniti**: 60 req/min per IP per i percorsi non autenticati, 600 req/min per chiave autenticata.
- **5 errori di autenticazione in 60s → blocco di 30s** (restituisce 429).
- Configurabile: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (solo sviluppo).

### Protezione del dashboard

- **Middleware HTTP Basic Auth** (`apps/dashboard/middleware.ts`).
- **L'avvio in produzione rifiuta di iniziare** senza
  `DASHBOARD_BASIC_AUTH_USER` e `DASHBOARD_BASIC_AUTH_PASS`.
- `LORE_DASHBOARD_DISABLE_AUTH=1` è rispettato solo fuori dalla produzione.
- Il fallback alla chiave admin lato server **rimosso**: un utente deve essere autenticato tramite
  Basic Auth prima che il proxy del dashboard inietti le credenziali dell'API upstream.

### Hardening dei container

- Tutti i Dockerfile eseguono come utente non-root `node`.
- `apps/api/Dockerfile` e `apps/dashboard/Dockerfile` dichiarano `HEALTHCHECK`
  su `/health`.
- `apps/mcp-server` è solo stdio — nessun listener di rete — e non dichiara un
  `HEALTHCHECK`.

### Gestione dei secret

- **Zero credenziali hardcoded.** Tutti i valori predefiniti di `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml` e `.env.example` usano la forma
  `${VAR:?must be set}` — l'avvio fallisce immediatamente senza valori espliciti.
- `scripts/check-env.mjs` rifiuta i valori segnaposto
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) quando `NODE_ENV=production`.
- Tutta la documentazione di deployment e i README di esempio sono stati ripuliti dalle credenziali
  demo letterali.

### Governance

- **Scansione di tag di rischio su ogni scrittura in memoria**: chiavi API, chiavi AWS, token JWT,
  chiavi private, password, email, numeri di telefono rilevati.
- **State machine a sei stati** con tabella di transizione legale esplicita; le
  transizioni illegali generano un'eccezione.
- **Euristica di avvelenamento della memoria**: dominanza di stessa fonte + corrispondenza di pattern con verbi imperativi
  → flag `suspicious`.
- **Audit log immutabile** aggiunto ad ogni transizione di stato.
- Il contenuto ad alto rischio viene automaticamente instradato a `candidate` / `flagged` e trattenuto dalla
  composizione del contesto fino alla revisione.

### Hardening MCP

- Ogni input degli strumenti MCP è **validato su uno schema zod** prima dell'invocazione.
  I fallimenti di validazione restituiscono JSON-RPC `-32602` con la lista dei problemi sanitizzati.
- **Tutti gli strumenti mutanti** richiedono una stringa `reason` di almeno 8 caratteri e
  mostrano `destructiveHint: true` nel loro schema.
- Gli errori dell'API upstream vengono **sanitizzati** prima di essere restituiti ai client MCP —
  SQL grezzo, percorsi di file e stack trace vengono rimossi.

### Logging

- **Output JSON strutturato** con correlazione `requestId` attraverso la catena di gestori.
- **Auto-redazione** dei campi corrispondenti a `content`, `query`, `memory`, `value`,
  `password`, `secret`, `token`, `key`. Il contenuto effettivo dei record di memoria e
  delle query non viene mai scritto nei log.

### Confini dei dati

- L'adapter `agentmemory` verifica la versione upstream all'avvio e avvisa in caso di
  incompatibilità. `LORE_AGENTMEMORY_REQUIRED=0` passa l'adapter alla modalità degradata silenziosa
  se l'upstream non è raggiungibile.
- Il parser del corpo delle richieste di `apps/api` applica un limite `LORE_MAX_JSON_BYTES` (predefinito 1
  MiB); le richieste sovradimensionate restituiscono 413.
- Il pool di connessioni Postgres imposta `statement_timeout: 15000` per limitare il tempo delle query.
- `LORE_REQUEST_TIMEOUT_MS` (predefinito 30s) limita ogni gestore delle richieste;
  i timeout restituiscono 504.

## Indicazioni per il deployment

- Non esporre Lore da remoto senza `LORE_API_KEYS` configurati.
- Preferire chiavi `reader` / `writer` / `admin` con separazione dei ruoli.
- **Impostare sempre** `DASHBOARD_BASIC_AUTH_USER` e `DASHBOARD_BASIC_AUTH_PASS` in
  produzione.
- **Generare le chiavi con `openssl rand -hex 32`**. Non usare mai i valori segnaposto
  mostrati negli esempi.
- Mantenere gli endpoint raw `agentmemory` privati; accedervi solo attraverso Lore.
- Mantenere il dashboard, la governance, le route di import/export, sync e audit dietro un
  layer di controllo degli accessi di rete (Cloudflare Access, AWS ALB, Tailscale ACL,
  simili) per qualsiasi esposizione non-loopback.
- **Eseguire `node scripts/check-env.mjs` prima di avviare l'API in produzione.**
- **Non committare mai** file `.env` di produzione, chiavi API del provider, credenziali cloud,
  dati eval contenenti contenuto dei clienti o export privati di memoria.

## Tempistiche di divulgazione

Per le vulnerabilità ad alto impatto confermate:

- 0 giorni: rapporto confermato.
- 7 giorni: triage e classificazione della gravità condivisi con il segnalante.
- 30 giorni: divulgazione pubblica coordinata (o estesa per accordo reciproco).
- 30+ giorni: emissione CVE per gravità media+ se applicabile.

Per i problemi di minore gravità, aspettarsi una risoluzione nel prossimo rilascio minore.

## Roadmap dell'hardening

Elementi pianificati per i rilasci successivi:

- **v0.5**: specifica OpenAPI / Swagger; integrazione CI di `pnpm audit --high`,
  analisi statica CodeQL e dependabot.
- **v0.6**: immagini container firmate con Sigstore, provenienza SLSA, pubblicazione npm tramite
  GitHub OIDC invece di token di lunga durata.
- **v0.7**: crittografia at-rest per il contenuto della memoria con flag `risk_tags` tramite
  crittografia a busta KMS.
