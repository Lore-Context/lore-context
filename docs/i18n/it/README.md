<div align="center">

# Lore Context

**Il piano di controllo per la memoria, la valutazione e la governance degli agenti di IA.**

Scopri cosa ha ricordato ogni agente, cosa ha usato e cosa dovrebbe dimenticare — prima che la memoria diventi un rischio in produzione.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Per iniziare](../../getting-started.md) · [Avvio rapido sul sito](https://lorecontext.com/quickstart/) · [Metodologia dei benchmark](https://lorecontext.com/benchmark/) · [Riferimento API](../../api-reference.md) · [Architettura](../../architecture.md) · [Piano del progetto](../../project-plan.md) · [Stato della versione](../../release-status.md) · [Roadmap](../../roadmap.md) · [Integrazioni](../../integrations/README.md) · [Distribuzione](../../deployment/README.md) · [Changelog](../../../CHANGELOG.md)

🌐 **Leggi questo nella tua lingua**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

I documenti localizzati potrebbero non essere aggiornati rispetto alle note della versione corrente in inglese; i documenti canonici della v2.1 sono il README in inglese e il set di `docs/`.

</div>

---

> Questo documento è una traduzione automatica dall'inglese, potrebbe non riflettere l'ultima versione. I contributi sono benvenuti — consulta la [guida per i collaboratori alle traduzioni](../README.md).

## Che cos'è Lore Context

Lore Context è un **piano di controllo a nucleo aperto** per la memoria degli agenti di IA: compone il contesto attraverso memoria, ricerca, grafi di repository e tracce di strumenti; valuta la qualità del recupero sui tuoi dataset; instrada la revisione della governance per i contenuti sensibili; ed esporta la memoria come formato di interscambio portabile che puoi spostare tra backend.

Non vuole essere un altro database di memoria. Il valore unico è ciò che si trova sopra la memoria:

- **Context Query** — un singolo endpoint che compone memoria + web + repository + tracce di strumenti, restituendo un blocco di contesto classificato con provenienza.
- **Memory Eval** — esegue Recall@K, Precision@K, MRR, tasso di hit obsoleti, latenza p95 su dataset di tua proprietà; persiste le esecuzioni e le confronta per il rilevamento di regressioni.
- **Governance Review** — ciclo di vita a sei stati (`candidate / active / flagged / redacted / superseded / deleted`), scansione di tag di rischio, euristiche di avvelenamento, log di audit immutabile.
- **Portabilità simile a MIF** — esportazione/importazione JSON + Markdown preservando `provenance / validity / confidence / source_refs / supersedes / contradicts`. Funziona come formato di migrazione tra backend di memoria.
- **Repo Graph** — indicizzazione deterministica di repository (file, simboli, importazioni, chiamate, route, test) esposta come route API e strumenti MCP in sola lettura affinché gli agenti fondino le risposte del repository su un contratto stabile di contesto del progetto.
- **Multi-Agent Adapter** — integrazione di prima classe con `agentmemory` con sonda di versione + fallback in modalità degradata; contratto di adattatore pulito per ulteriori runtime.

## Quando usarlo

| Usa Lore Context quando... | Usa un database di memoria (agentmemory, Mem0, Supermemory) quando... |
|---|---|
| Devi **dimostrare** cosa ha ricordato il tuo agente, perché e se è stato utilizzato | Hai solo bisogno di archiviazione grezza della memoria |
| Esegui più agenti (Claude Code, Cursor, Qwen, Hermes, Dify) e vuoi un contesto condiviso affidabile | Stai costruendo un singolo agente e accetti un livello di memoria bloccato dal fornitore |
| Richiedi distribuzione locale o privata per conformità | Preferisci un SaaS ospitato |
| Hai bisogno di valutazione sui tuoi dataset, non sui benchmark dei fornitori | I benchmark del fornitore sono un segnale sufficiente |
| Vuoi migrare la memoria tra sistemi | Non prevedi di cambiare mai backend |

## Avvio rapido

```bash
# 1. Clonare + installare
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Eseguire l'assistente di avvio rapido e ispezionare il report di attivazione
pnpm quickstart -- --dry-run --activation-report

# 3. Generare una vera chiave API (non usare segnaposto in nessun ambiente oltre allo sviluppo locale)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Avviare l'API (con file di backup, nessun Postgres richiesto)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Scrivere un ricordo
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Interrogare il contesto, poi ispezionare il traceId restituito nell'Evidence Ledger
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Per l'avvio rapido del sito web pubblico, consulta
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Per la
configurazione completa (Postgres, Docker Compose, Dashboard, integrazione MCP), consulta
[docs/getting-started.md](../../getting-started.md).

L'avvio rapido alfa canonico è `git clone` + `pnpm quickstart`. Lore
attualmente non pubblica né rivendica un pacchetto npm pubblico `@lore-context/quickstart`.
Il server MCP stdio è pubblicato separatamente come
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
per la distribuzione nei registry e nei client, e il middleware dell'SDK è distribuito come
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) e `lore-context-middleware` (PyPI).

Per la scoperta leggibile dall'IA, il sito web pubblica `/llms.txt` e `/llms-full.txt`
solo dalla documentazione pubblica. La voce nel Registro Ufficiale MCP è pubblicata,
e le bozze di distribuzione aggiuntive si trovano in [docs/distribution](../../distribution/).
Le bozze di lancio si trovano in [docs/launch](../../launch/), e l'acquisizione di partner di
design in [docs/design-partners](../../design-partners/). La pagina dei benchmark pubblica è
una metodologia riproducibile e un piccolo report di esecuzione di smoke test, non una rivendicazione di vittoria competitiva nei benchmark.

## Architettura

```text
                       ┌───────────────────────────────────────────────┐
  MCP/REST clients ─► │ apps/api  (auth + rate limit + evidence)       │
  (Claude Code,       │   ├── Memory Inbox / lifecycle / audit         │
   Codex, Cursor,     │   ├── capture ingestion + recall hydration     │
   OpenCode...)       │   ├── context query (memory/web/repo/traces)   │
                       │   ├── repo graph query / symbol / impact       │
                       │   ├── Google sign-in + hosted MCP metadata     │
                       │   └── OpenAPI + usage + operator surfaces      │
                       └───────────────┬───────────────────────────────┘
                                       │
                         capture / embedding / graph jobs
                                       ▼
                       ┌───────────────────────────────────────────────┐
                       │ memory-worker  (AWS SQS + DLQ fan-out)        │
                       │   ├── auto redaction / curation / save        │
                       │   ├── dreaming butler (prune/merge/resolve)    │
                       │   ├── private Qwen3 embedding service         │
                       │   └── Qdrant dense+sparse indexing            │
                       └───────────────┬───────────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
          RDS PostgreSQL 16      Qdrant derived index   apps/dashboard
          truth store + audit    lore_memories_v12      user-facing SaaS
```

Per i dettagli, consulta [docs/architecture.md](../../architecture.md).

## Novità nella v2.1.0

`v2.1.0` è la versione di **Repo Graph API e Strumenti MCP**. Rende il grafo di repository
di Lore una superficie di prima classe per la memoria degli agenti: indicizzazione deterministica
di repository TypeScript/JavaScript per file, simboli, importazioni, chiamate, route, test e
suggerimenti di processo, esposta tramite route API e strumenti MCP in sola lettura affinché
gli agenti fondino le risposte del repository su un contratto stabile di contesto del progetto
anziché sulla ricerca di testo ad hoc.

La v2.1.0 è distribuita in produzione AWS e sul sito web pubblico. Si basa sul motore di
memoria ibrida (archivio di verità RDS, fan-out dei worker AWS SQS, indice derivato Qdrant,
servizio di embedding Qwen3 privato, `HybridSearchOrchestrator` a 7 flussi), il worker di
consolidamento della memoria dreaming butler, il ciclo di auto-miglioramento della memoria
degli agenti, i pacchetti middleware SDK pubblicati e il substrato SaaS commerciale distribuito
nella linea v1.7–v2.0.

| Capacità | Stato | Dove |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Produzione | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Indicizzatore di grafi di conoscenza del codice | ✅ Produzione | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query che compone memoria + web + repository + tracce di strumenti | ✅ Produzione | `apps/api`, `docs/api-reference.md` |
| `HybridSearchOrchestrator` a 7 flussi (FTS / pgvector / Qdrant denso+sparso / grafo / temporale / wiki) | ✅ Produzione | `packages/search` |
| Re-classificatore cross-encoder (post-fusione, opt-in) | ✅ Produzione | `apps/api/src/rerankers/` |
| Consolidamento della memoria dreaming butler (potatura / unione / risoluzione / emersione) | ✅ Produzione, con flag | `apps/api/src/workers/butler-v18.ts` |
| Ciclo di auto-miglioramento della memoria degli agenti + ricette di contesto | ✅ Produzione, promozione con approvazione umana | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| Middleware SDK (auto-inject + auto-retain per client OpenAI / Anthropic) | ✅ Pubblicato | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Vault segreti per agenti di IA (nativo MCP, autorizzazione a tre pulsanti) | ✅ Beta, in attesa di audit crittografico | `apps/mcp-server`, `apps/api` |
| Motore di memoria cloud: archivio di verità RDS + fan-out SQS + indice Qdrant | ✅ Produzione | `apps/api`, `apps/api/src/worker.ts` |
| Servizio vettoriale privato Qwen3-Embedding-0.6B a 1024 dimensioni | ✅ Produzione | `apps/api/src/embedding.ts` |
| Ingestione automatica delle acquisizioni ed eccezioni di Memory Inbox | ✅ Produzione | `apps/api`, `packages/capture` |
| Accesso con Google + avvio del vault personale | ✅ Produzione | `apps/api`, `apps/dashboard` |
| SaaS commerciale: abbonamenti individuali, fatturazione, controllo delle quote | ✅ Produzione | cloud ospitato (`Lore-Context/lore-cloud`) |
| API REST con autenticazione tramite chiave API (lettore/scrittore/amministratore) | ✅ Produzione | `apps/api` |
| Contratto OpenAPI 3.1 su `/openapi.json` (riporta `2.1.0`) | ✅ Produzione | `apps/api/src/openapi.ts` |
| Server MCP stdio (trasporto SDK legacy + ufficiale) | ✅ Produzione | `apps/mcp-server` |
| Dashboard Next.js con sessione Google + HTTP Basic Auth per operatori | ✅ Produzione | `apps/dashboard` |
| API dell'Evidence Ledger + riepilogo nel dashboard | ✅ Produzione | `apps/api`, `apps/dashboard` |
| Macchina a stati di governance + log di audit | ✅ Produzione | `packages/governance` |
| Esecutore di valutazione (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Produzione | `packages/eval` |
| Importazione/esportazione MIF v0.2 con `supersedes` + `contradicts` | ✅ Produzione | `packages/mif` |
| Gateway dei modelli (instradamento attività→modello multi-provider) | ✅ Produzione | `packages/model-gateway` |
| Adattatore `agentmemory` con sonda di versione + modalità degradata | ✅ Produzione | `packages/agentmemory-adapter` |
| Limitazione della velocità, logging JSON strutturato con redazione dei campi | ✅ Produzione | `apps/api` |
| Distribuzione privata con Docker Compose | ✅ Produzione | `docker-compose.yml` |
| Assistente di adozione locale `pnpm quickstart` + report di attivazione | ✅ Produzione | `scripts/lore-quickstart.mjs` |
| Registro Ufficiale MCP + docs di distribuzione / lancio / partner di design | ✅ Produzione | `server.json`, `docs/distribution/`, `docs/launch/` |

Consulta [CHANGELOG.md](../../../CHANGELOG.md) per la cronologia completa delle versioni.

## Stato attuale della versione

`v2.1.0` è la linea corrente di codice sorgente, produzione ospitata e versione. È stata
distribuita in produzione AWS e sul sito web pubblico tramite il flusso di rilascio ottimizzato:
artefatti immutabili arm64-first, smoke test dell'API di staging, distribuzione dell'API di
produzione, distribuzione isolata del sito web, audit post-rilascio e chiusura tag/versione.
Le verifiche esterne confermano che `https://api.lorecontext.com/health` restituisce `status=ok`,
`/openapi.json` riporta `2.1.0` e `https://lorecontext.com/status.html` contiene `v2.1.0`.

La produzione mantiene la forma v1.1+ RDS / SQS / memory-worker / Qdrant cloud, usa
`lore_memories_v12` come collezione Qdrant, mantiene pgvector a 1024 dimensioni per il
percorso Postgres e aggiunge lo schema additivo del grafo di repository
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Consulta [docs/release-status.md](../../release-status.md) per lo snapshot dello stato
pubblico corrente e [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
per le note complete sulla versione.

## Focus della versione

La versione v2.1 rende il grafo di repository di Lore una superficie di prima classe per
la memoria degli agenti. L'obiettivo è consentire agli agenti di rispondere "dove è definito X",
"cosa chiama questo" e "cosa si rompe se cambio questo" con un contratto deterministico e stabile
di contesto del progetto anziché con ricerche di testo ad hoc:

- `@lore/repo-graph` — indicizzazione deterministica di repository TypeScript/JavaScript
  per file, simboli, importazioni, chiamate, route, test e suggerimenti di processo.
- Route API: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact` e `POST /v1/repo/detect-changes`.
- Strumenti MCP: `repo.graph_query`, `repo.symbol_context`, `repo.impact` e
  `repo.detect_changes` (sola lettura).
- `context_query(repo)` ora usa evidenze del grafo di repository supportate dal provider
  quando disponibili, con un fallback onesto "non disponibile" quando l'archiviazione
  del grafo di repository non è configurata.
- Lo schema Postgres del grafo di repository è additivo — si sovrappone allo schema di
  produzione esistente e viene applicato durante la configurazione dello schema di produzione/staging.

Le versioni del pacchetto root e API riportano `2.1.0` affinché `/openapi.json` corrisponda
al tag di versione. Il treno delle versioni usa le salvaguardie di distribuzione separata
API/sito web ottimizzate introdotte dopo la v2.0.9.

Consulta [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md) e [docs/release-governance.md](../../release-governance.md).

## Integrazioni

Lore Context parla MCP e REST e si integra con la maggior parte degli IDE per agenti e frontend di chat:

| Strumento | Guida alla configurazione |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../integrations/openwebui.md) |
| Altro / MCP generico | [docs/integrations/README.md](../../integrations/README.md) |

## Distribuzione

| Modalità | Quando usare | Documentazione |
|---|---|---|
| **Backup su file locale** | Sviluppo singolo, prototipo, smoke test | Questo README, Avvio rapido sopra |
| **Postgres+pgvector locale** | Fallback locale a nodo singolo e test di migrazione | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose privato** | Distribuzione di team self-hosted, rete isolata | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Cloud ospitato** | RDS / SQS / memory-worker / Qdrant / embedding privato più lo stack di recupero ibrido aumentato con grafo e il substrato SaaS commerciale | [docs/release-status.md](../../release-status.md) |

Tutti i percorsi di distribuzione richiedono segreti espliciti. I percorsi locali/privati richiedono
`POSTGRES_PASSWORD`, `LORE_API_KEYS` e autenticazione del dashboard. Le distribuzioni ospitate
richiedono anche RDS, SQS, Qdrant, servizio di embedding, OAuth, configurazione del tunnel e
le esportazioni dell'ambiente di runtime di produzione. Lo script `scripts/check-env.mjs`
rifiuta l'avvio in produzione se un valore corrisponde a un pattern segnaposto.

## Sicurezza

La v2.1.0 mantiene la postura di distribuzione locale/privata e le salvaguardie del cloud
ospitato per l'accesso degli utenti ordinari:

- **Autenticazione**: token bearer con chiave API con separazione dei ruoli (`reader`/`writer`/`admin`) e scoping per progetto. La modalità chiavi vuote fallisce in modo chiuso in produzione.
- **Limitazione della velocità**: doppio bucket per IP + per chiave con backoff in caso di errori di autenticazione (429 dopo 5 fallimenti in 60s, blocco di 30s).
- **Dashboard**: flusso di sessione Google per il prodotto ospitato; HTTP Basic Auth disponibile per le distribuzioni di operatori locali/privati.
- **Container**: tutti i Dockerfile vengono eseguiti come utente non-root `node`; HEALTHCHECK su api + dashboard.
- **Segreti**: zero credenziali hardcoded; tutti i valori predefiniti sono variabili obbligatorie o che falliscono. `scripts/check-env.mjs` rifiuta i valori segnaposto in produzione.
- **Governance**: scansione regex di PII / chiave API / JWT / chiave privata sulle scritture; contenuto con tag di rischio instradato automaticamente alla coda di revisione; log di audit immutabile su ogni transizione di stato.
- **Avvelenamento della memoria**: rilevamento euristico su pattern di consenso + verbi imperativi.
- **MCP**: validazione dello schema zod su ogni input degli strumenti; gli strumenti mutanti richiedono `reason` (≥8 caratteri) e mostrano `destructiveHint: true`; errori upstream sanitizzati prima della restituzione al client.
- **Isolamento dei worker**: i job di acquisizione, embedding, grafo, connettore e backfill vengono eseguiti tramite code AWS SQS con DLQ; Qdrant è un indice derivato e RDS rimane autoritativo.
- **Logging**: JSON strutturato con redazione automatica dei campi `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Divulgazioni di vulnerabilità: [SECURITY.md](../../../SECURITY.md).

## Struttura del progetto

```text
apps/
  api/                # Piano di controllo REST + Postgres + governance + eval + grafo di repo
  dashboard/          # Dashboard Next.js con sessione Google + HTTP Basic Auth per operatori
  mcp-server/         # Server MCP stdio (trasporti SDK legacy + ufficiale)
  cli/                # CLI di lore (doctor, wiki-recompile, importazione/esportazione dataset)
  browser-extension/  # Scaffold della superficie di acquisizione
  web/                # Renderer HTML lato server (UI di fallback senza JS)
  website/            # Sito di marketing (gestito separatamente)
packages/
  shared/             # Tipi condivisi, errori, utilità ID/token
  agentmemory-adapter # Bridge verso agentmemory upstream + sonda di versione
  search/             # HybridSearchOrchestrator a 7 flussi + adattatore ricette
  repo-graph/         # Indicizzazione deterministica di repository (v2.1)
  code-indexer/       # Indicizzatore di grafi di conoscenza del codice (TypeScript/JavaScript)
  code-indexer-python # Indicizzatore di grafi di conoscenza del codice (Python)
  capture/            # Primitive di ingestione delle acquisizioni
  connectors/         # Connettori di fonti esterne
  model-gateway/      # Instradamento attività→modello multi-provider
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + primitive di metriche + ricette di contesto
  governance/         # Macchina a stati + scansione dei rischi + avvelenamento + audit
  profile/            # Tipi di vault / profilo account
  sdk-typescript/     # SDK client TypeScript
  sdk-python/         # SDK client Python
  sdk-go/ sdk-java/ sdk-dotnet/   # SDK per linguaggi aggiuntivi
  sdk-middleware-typescript/      # Middleware auto-inject + auto-retain (npm)
  sdk-middleware-python/          # Middleware auto-inject + auto-retain (PyPI)
docs/
  i18n/<lang>/        # README localizzato in 17 lingue
  integrations/       # Guide all'integrazione con IDE per agenti
  deployment/         # Runbook per locale, Docker Compose e automazione della produzione
  legal/              # Privacy / Termini / Cookie (diritto di Singapore)
scripts/
  check-env.mjs       # Validazione dell'ambiente in modalità produzione
  smoke-*.mjs         # Test smoke end-to-end
  apply-postgres-schema.mjs
```

## Requisiti

- Node.js `>=22`
- pnpm `10.30.1`
- (Fallback locale opzionale) Postgres 16 con pgvector
- (Ospitato/avanzato) RDS PostgreSQL 16, AWS SQS, Qdrant e servizio di embedding privato

## Contribuire

I contributi sono benvenuti. Leggi [CONTRIBUTING.md](../../../CONTRIBUTING.md) per il flusso di lavoro di sviluppo, il protocollo dei messaggi di commit e le aspettative di revisione.

Per le traduzioni della documentazione, consulta la [guida per i collaboratori i18n](../README.md).

## Gestito da

Lore Context è gestito da **REDLAND PTE. LTD.** (Singapore, UEN 202304648K). Il profilo aziendale, i termini legali e il trattamento dei dati sono documentati in [`docs/legal/`](../../legal/).

## Licenza

Il repository di Lore Context è concesso in licenza sotto [Apache License 2.0](../../../LICENSE). I singoli pacchetti sotto `packages/*` dichiarano MIT per facilitare il consumo downstream. Consulta [NOTICE](../../../NOTICE) per l'attribuzione dei progetti upstream.

## Ringraziamenti

Lore Context è costruito sopra [agentmemory](https://github.com/agentmemory/agentmemory) come runtime di memoria locale. I dettagli del contratto upstream e la politica di compatibilità delle versioni sono documentati in [UPSTREAM.md](../../../UPSTREAM.md).
