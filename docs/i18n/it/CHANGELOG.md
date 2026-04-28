> 🤖 Questo documento è stato tradotto automaticamente dall'inglese. I miglioramenti tramite PR sono benvenuti — consulta la [guida ai contributi di traduzione](../README.md).

# Changelog

Tutte le modifiche rilevanti a Lore Context sono documentate qui. Il formato è basato su
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) e questo progetto
aderisce al [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v0.4.0-alpha] — 2026-04-28

Prima alpha pubblica. Chiude lo sprint di consolidamento in produzione che ha trasformato il
MVP non superato all'audit in un alpha release-candidate. Tutti i P0 dell'audit risolti, 12 su 13
P1 risolti (uno parziale — vedi Note), 117+ test superati, build monorepo pulita.

### Aggiunto

- **`packages/eval/src/runner.ts`** — `EvalRunner` reale (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). Eval può ora eseguire una valutazione di recupero end-to-end su
  un dataset di proprietà dell'utente e persistere le esecuzioni come JSON per il rilevamento delle regressioni nel tempo.
- **`packages/governance/src/state.ts`** — state machine di governance a sei stati
  (`candidate / active / flagged / redacted / superseded / deleted`) con tabella di transizione
  legale esplicita. Le transizioni illegali generano un'eccezione.
- **`packages/governance/src/audit.ts`** — helper di aggiunta all'audit log immutabile integrato
  con il tipo `AuditLog` di `@lore/shared`.
- **`packages/governance/detectPoisoning`** — euristica per il rilevamento dell'avvelenamento
  della memoria tramite dominanza di stessa fonte (>80%) e corrispondenza di pattern con verbi imperativi.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — probe di versione upstream
  basato su semver con confronto hand-rolled (nessuna nuova dipendenza). Rispetta
  `LORE_AGENTMEMORY_REQUIRED=0` per la modalità degradata con skip silenzioso.
- **`packages/mif`** — campi `supersedes: string[]` e `contradicts: string[]` aggiunti
  a `LoreMemoryItem`. Round-trip preservato nei formati JSON e Markdown.
- **`apps/api/src/logger.ts`** — logger JSON strutturato con auto-redazione dei
  campi sensibili (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). `requestId` fluisce attraverso ogni richiesta.
- **`apps/dashboard/middleware.ts`** — middleware HTTP Basic Auth. L'avvio in produzione
  rifiuta di iniziare senza `DASHBOARD_BASIC_AUTH_USER` e `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — validatore env in modalità produzione. Rifiuta di avviare
  l'app se qualsiasi valore di ambiente corrisponde a un pattern segnaposto (`read-local`,
  `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Limite di frequenza** — limitatore a doppio bucket per IP e per chiave con backoff
  in caso di errori di autenticazione (5 fallimenti in 60s → blocco di 30s → risposta 429).
  Configurabile tramite `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`.
- **Spegnimento controllato** — i gestori SIGTERM/SIGINT drenano le richieste in corso fino a 10s,
  svuotano le scritture Postgres in attesa, chiudono il pool, forzano l'uscita a 15s.
- **Indici del database** — indici B-tree su `(project_id)` / `(status)` /
  `(created_at)` per `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. Indici GIN su jsonb `content` e `metadata`.
- **Validazione input MCP con zod** — ogni strumento MCP ora esegue `safeParse` su uno
  schema zod per strumento; i fallimenti restituiscono JSON-RPC `-32602` con problemi sanitizzati.
- **`destructiveHint` MCP + `reason` obbligatorio** — ogni strumento mutante
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) richiede un
  `reason` di almeno 8 caratteri e mostra `destructiveHint: true`.
- 117+ nuovi casi di test in `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Documentazione multilingue: README in 17 lingue in `docs/i18n/<lang>/`.
- `CHANGELOG.md` (questo file).
- `docs/getting-started.md` — quickstart per sviluppatori in 5 minuti.
- `docs/api-reference.md` — riferimento agli endpoint dell'API REST.
- `docs/i18n/README.md` — guida ai contributi per la traduzione.

### Modificato

- **`packages/mif`** versione envelope `"0.1"` → `"0.2"`. Import retrocompatibile.
- **`LORE_POSTGRES_AUTO_SCHEMA`** valore predefinito `true` → `false`. I deployment in produzione
  devono optare esplicitamente per l'applicazione automatica dello schema o eseguire `pnpm db:schema`.
- **`apps/api`** il parser del corpo delle richieste è ora in streaming con un limite rigido sulla dimensione del payload
  (`LORE_MAX_JSON_BYTES`, predefinito 1 MiB). Le richieste sovradimensionate restituiscono 413.
- **Autenticazione loopback** modificata: rimossa la dipendenza dall'intestazione URL `Host`; il
  rilevamento del loopback ora usa solo `req.socket.remoteAddress`. In produzione senza chiavi API
  configurate, l'API fallisce in modo chiuso e rifiuta le richieste (era: concedeva silenziosamente admin).
- **Le chiavi API con scope** devono ora fornire `project_id` per `/v1/memory/list`,
  `/v1/eval/run` e `/v1/memory/import` (era: `project_id` indefinito causava un cortocircuito).
- **Tutti i Dockerfile** ora eseguono come utente non-root `node`. `apps/api/Dockerfile` e
  `apps/dashboard/Dockerfile` dichiarano `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` ora usa `${POSTGRES_PASSWORD:?must
  be set}` — l'avvio fallisce immediatamente senza una password esplicita.
- **`docs/deployment/compose.private-demo.yml`** — stesso pattern obbligatorio o fallimento.
- **`.env.example`** — tutti i valori predefiniti demo rimossi e sostituiti con segnaposto `# REQUIRED`.
  Nuove variabili documentate per limite di frequenza, timeout delle richieste, limite payload,
  modalità agentmemory obbligatorio, autenticazione basic auth del dashboard.

### Risolto

- **Vulnerabilità bypass autenticazione loopback** (P0). Un attaccante poteva inviare `Host: 127.0.0.1`
  per falsificare il rilevamento del loopback e ottenere il ruolo admin senza chiave API.
- **Confused-deputy nel proxy del dashboard** (P0). Il proxy del dashboard iniettava
  `LORE_API_KEY` per le richieste non autenticate, concedendo poteri admin a chiunque potesse
  raggiungere la porta 3001.
- **Difesa da forza bruta** (P0). Le chiavi demo (`admin-local`, `read-local`, `write-local`)
  mostrate in README/`.env.example` potevano essere enumerate indefinitamente; il limite di frequenza e
  la rimozione dei valori predefiniti ora difendono da questo.
- **Crash del parser JSON su `LORE_API_KEYS` malformato** — il processo ora esce con un messaggio
  di errore chiaro invece di generare uno stack trace.
- **OOM tramite corpo di richiesta di grandi dimensioni** — i corpi oltre il limite configurato restituiscono 413
  invece di causare il crash del processo Node.
- **Perdita di errori MCP** — gli errori dell'API upstream che includevano SQL grezzo, percorsi di file o
  stack trace vengono ora sanitizzati in `{code, generic-message}` prima di raggiungere i client MCP.
- **Crash del parser JSON del dashboard** — le risposte JSON non valide non causano più il crash dell'UI;
  gli errori vengono mostrati come stato visibile all'utente.
- **MCP `memory_update` / `memory_supersede`** in precedenza non richiedevano un
  `reason`; questo viene ora applicato dallo schema zod.
- **Pool Postgres**: `statement_timeout` ora impostato a 15s; precedentemente rischio di tempo di
  query illimitato su query jsonb malformate.

### Sicurezza

- Tutti i P0 dell'audit (bypass loopback / autenticazione dashboard / limite di frequenza / secret
  demo) risolti. Vedi public release notes per la traccia completa dell'audit.
- `pnpm audit --prod` non riporta vulnerabilità note al momento del rilascio.
- Credenziali demo rimosse da tutti i template di deployment e README di esempio.
- Le immagini dei container ora eseguono come non-root per impostazione predefinita.

### Note / Limitazioni note

- **P1-1 parziale**: `/v1/context/query` mantiene il comportamento permissivo con chiave con scope per
  evitare di interrompere i test consumer esistenti. Le altre route interessate (`/v1/memory/list`,
  `/v1/eval/run`, `/v1/memory/import`) applicano `project_id`. Tracciato per v0.5.
- **La sincronizzazione cloud multi-tenant ospitata** non è implementata in v0.4.0-alpha. Solo deployment
  locali e Compose-privati.
- **Qualità della traduzione**: le localizzazioni del README sono generate da LLM e chiaramente
  etichettate; le PR della community per perfezionare ogni locale sono benvenute (vedi
  [`docs/i18n/README.md`](../README.md)).
- **La specifica OpenAPI / Swagger** non è ancora disponibile come package. La superficie REST è documentata in
  prosa in [`docs/api-reference.md`](api-reference.md). Tracciato per v0.5.

### Riconoscimenti

Questo rilascio è il risultato di uno sprint di consolidamento in produzione di un giorno che ha coinvolto
l'esecuzione parallela di sub-agenti su un piano di audit strutturato. Il piano e gli artefatti dell'audit

## [v0.0.0] — pre-release

Milestone di sviluppo interno, non rilasciate pubblicamente. Implementato:

- Scaffold dei package del workspace (monorepo TypeScript, workspace pnpm).
- Pipeline di build/test TypeScript condivisa.
- Sistema di tipi memoria / contesto / eval / audit in `@lore/shared`.
- Confine dell'adapter `agentmemory`.
- API REST locale con context router e composer.
- Persistenza su file JSON + store runtime Postgres opzionale con upsert incrementale.
- Flussi di dettaglio / modifica / sostituzione / dimenticanza della memoria con hard delete esplicito.
- Contabilità reale dell'utilizzo della memoria (`useCount`, `lastUsedAt`).
- Feedback di traccia (`useful` / `wrong` / `outdated` / `sensitive`).
- Import/export JSON + Markdown simile a MIF con campi di governance.
- Set di regex per la scansione dei secret.
- Metriche eval dirette basate sulla sessione; esecuzioni eval di confronto provider; elenco delle esecuzioni eval.
- Protezione tramite chiave API con separazione dei ruoli reader/writer/admin.
- Coda di revisione governance; API del log di audit.
- Dashboard HTML servita dall'API; dashboard Next.js standalone.
- Dati seed demo; generazione della configurazione di integrazione.
- Packaging privato Docker/Compose.
- Trasporti MCP stdio legacy + SDK ufficiale.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
