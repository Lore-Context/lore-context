> 🤖 Questo documento è stato tradotto automaticamente dall'inglese. I miglioramenti tramite PR sono benvenuti — consulta la [guida ai contributi di traduzione](../README.md).

# Contribuire a Lore Context

Grazie per migliorare Lore Context. Questo progetto è un piano di controllo del contesto
per agenti AI in fase alpha, quindi le modifiche devono preservare il funzionamento local-first,
l'auditabilità e la sicurezza del deployment.

## Codice di condotta

Questo progetto segue il [Contributor Covenant](../../CODE_OF_CONDUCT.md). Partecipando
accetti di rispettarlo.

## Configurazione dello sviluppo

Requisiti:

- Node.js 22 o versione successiva
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (Opzionale) Docker per il percorso Postgres
- (Opzionale) `psql` se preferisci applicare lo schema manualmente

Comandi comuni:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # requires docker compose up -d postgres
pnpm run doctor
```

Per il lavoro per singolo package:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore-context/server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Aspettative per le Pull Request

- **Mantieni le modifiche mirate e reversibili.** Un problema per PR; una PR per problema.
- **Aggiungi test** per le modifiche al comportamento. Preferisci asserzioni reali rispetto agli snapshot.
- **Esegui `pnpm build` e `pnpm test`** prima di richiedere la revisione. La CI li esegue anch'essa,
  ma localmente è più veloce.
- **Esegui lo smoke test pertinente** quando si modifica il comportamento di API, dashboard, MCP, Postgres,
  import/export, eval o deployment.
- **Non committare** l'output di build generato, store locali, file `.env`,
  credenziali o dati privati dei clienti. Il `.gitignore` copre la maggior parte dei percorsi;
  se crei nuovi artefatti, assicurati che siano esclusi.
- **Rimani nell'ambito della tua PR.** Non fare refactoring del codice non correlato di passaggio.

## Guardrail architetturali

Questi sono non negoziabili per v0.4.x. Se una PR ne viola uno, aspettati una richiesta di
suddivisione o rielaborazione:

- **Il local-first rimane primario.** Una nuova funzionalità deve funzionare senza un servizio
  ospitato o una dipendenza SaaS di terze parti.
- **Nessun nuovo bypass della superficie di autenticazione.** Ogni route rimane bloccata da chiave API + ruolo.
  Il loopback non è un caso speciale in produzione.
- **Nessuna esposizione raw di `agentmemory`.** I chiamanti esterni raggiungono la memoria solo attraverso gli
  endpoint Lore.
- **Integrità dell'audit log.** Ogni mutazione che influisce sullo stato della memoria scrive una
  voce di audit.
- **Fallisce in modo chiuso su configurazione mancante.** L'avvio in modalità produzione rifiuta di iniziare se
  le variabili di ambiente richieste sono segnaposto o mancanti.

## Messaggi di commit

Lore Context usa un formato di commit piccolo e opinionato ispirato alle linee guida del kernel Linux.

### Formato

```text
<type>: <short summary in imperative mood>

<optional body explaining why this change is needed and what tradeoffs apply>

<optional trailers>
```

### Tipi

- `feat` — nuova funzionalità visibile all'utente o endpoint API
- `fix` — correzione di bug
- `refactor` — ristrutturazione del codice senza cambiamenti di comportamento
- `chore` — igiene del repository (dipendenze, strumenti, spostamento file)
- `docs` — solo documentazione
- `test` — modifiche solo ai test
- `perf` — miglioramento delle prestazioni con impatto misurabile
- `revert` — annullamento di un commit precedente

### Stile

- **Minuscolo** per il tipo e la prima parola del riassunto.
- **Nessun punto finale** nella riga del riassunto.
- **≤72 caratteri** nella riga del riassunto; testo a capo del corpo a 80.
- **Modo imperativo**: "fix loopback bypass", non "fixed" o "fixes".
- **Perché più che cosa**: il diff mostra cosa è cambiato; il corpo dovrebbe spiegare perché.
- **Non includere** trailer `Co-Authored-By`, attribuzione AI o
  righe signed-off-by a meno che non siano esplicitamente richieste dall'utente.

### Trailer utili

Se pertinenti, aggiungi trailer per catturare vincoli e contesto del revisore:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Esempio

```text
fix: loopback bypass — remove host-header trust, fail closed in production

Previous versions trusted the Host header for loopback detection, allowing a
remote attacker to spoof "Host: 127.0.0.1" and obtain admin role with no API
key when LORE_API_KEYS was unset. Loopback detection now uses
req.socket.remoteAddress only, and production with empty keys returns 401.

Constraint: Local development without keys still works on loopback
Confidence: high
Scope-risk: narrow (auth path only)
Tested: pnpm test (added loopback-bypass test case), pnpm smoke:api
```

## Granularità dei commit

- Una modifica logica per commit. I revisori possono fare revert in modo atomico senza
  danni collaterali.
- Unisci i fixup banali (`typo`, `lint`, `prettier`) nel commit padre
  prima di aprire o aggiornare una PR.
- I refactoring multi-file vanno bene in un singolo commit se condividono una singola
  motivazione.

## Processo di revisione

- Un maintainer esaminerà la tua PR entro 7 giorni durante l'attività tipica.
- Affronta tutti i commenti bloccanti prima di richiedere nuovamente la revisione.
- Per i commenti non bloccanti, rispondere inline con la motivazione o un problema di follow-up
  è accettabile.
- I maintainer possono aggiungere un'etichetta `merge-queue` una volta che la PR è approvata; non
  fare rebase o force-push dopo che questa etichetta è stata applicata.

## Traduzioni della documentazione

Se vuoi migliorare un README tradotto o un file di documentazione, vedi la
[guida ai contributi i18n](../README.md).

## Segnalazione di bug

- Apri una segnalazione pubblica su https://github.com/Lore-Context/lore-context/issues
  a meno che il bug non sia una vulnerabilità di sicurezza.
- Per i problemi di sicurezza, segui [SECURITY.md](SECURITY.md).
- Includi: versione o commit, ambiente, riproduzione, previsto vs effettivo,
  log (con contenuto sensibile redatto).

## Grazie

Lore Context è un piccolo progetto che cerca di fare qualcosa di utile per l'infrastruttura
degli agenti AI. Ogni PR ben delimitata lo fa progredire.
