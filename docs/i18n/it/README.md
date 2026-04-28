<div align="center">

> 🤖 Questo documento è stato tradotto automaticamente dall'inglese. I miglioramenti tramite PR sono benvenuti — consulta la [guida ai contributi di traduzione](../README.md).

# Lore Context

**Il piano di controllo per memoria, valutazione e governance degli agenti AI.**

Sappi cosa ogni agente ha ricordato, utilizzato e dovrebbe dimenticare — prima che la memoria diventi un rischio in produzione.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Guida introduttiva](getting-started.md) · [Riferimento API](api-reference.md) · [Architettura](architecture.md) · [Integrazioni](integrations.md) · [Deployment](deployment.md) · [Changelog](CHANGELOG.md)

🌐 **Leggi questo nella tua lingua**: [English](../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Italiano](./README.md)

</div>

---

## Cos'è Lore Context

Lore Context è un **piano di controllo open-core** per la memoria degli agenti AI: compone il contesto attraverso memoria, ricerca e tracce degli strumenti; valuta la qualità del recupero sui tuoi dataset; instrada la revisione della governance per i contenuti sensibili; ed esporta la memoria come formato di interscambio portabile trasferibile tra backend.

Non cerca di essere un altro database di memoria. Il valore unico risiede in ciò che si trova sopra la memoria:

- **Context Query** — un singolo endpoint compone memoria + web + repo + tracce degli strumenti, restituisce un blocco di contesto classificato con provenienza.
- **Memory Eval** — esegue Recall@K, Precision@K, MRR, stale-hit-rate, latenza p95 su dataset di tua proprietà; persiste le esecuzioni e le confronta per il rilevamento delle regressioni.
- **Governance Review** — ciclo di vita a sei stati (`candidate / active / flagged / redacted / superseded / deleted`), scansione di tag di rischio, euristica di avvelenamento, audit log immutabile.
- **Portabilità MIF** — export/import JSON + Markdown con conservazione di `provenance / validity / confidence / source_refs / supersedes / contradicts`. Funziona come formato di migrazione tra backend di memoria.
- **Adapter Multi-Agent** — integrazione `agentmemory` di primo livello con probe di versione + fallback in modalità degradata; contratto adapter pulito per ulteriori runtime.

## Quando usarlo

| Usa Lore Context quando... | Usa un database di memoria (agentmemory, Mem0, Supermemory) quando... |
|---|---|
| Devi **dimostrare** cosa ha ricordato il tuo agente, perché, e se è stato utilizzato | Hai bisogno solo di archiviazione grezza della memoria |
| Esegui più agenti (Claude Code, Cursor, Qwen, Hermes, Dify) e vuoi un contesto condiviso affidabile | Stai costruendo un singolo agente e accetti un livello di memoria vincolato al fornitore |
| Hai bisogno di deployment locale o privato per la conformità | Preferisci un SaaS ospitato |
| Hai bisogno di valutazione sui tuoi dataset, non sui benchmark del fornitore | I benchmark del fornitore sono un segnale sufficiente |
| Vuoi migrare la memoria tra sistemi | Non prevedi di cambiare backend |

## Avvio rapido

```bash
# 1. Clone + install
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Genera una chiave API reale (non usare segnaposto in ambienti diversi dallo sviluppo locale)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. Avvia l'API (basata su file, nessun Postgres richiesto)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Scrivi una memoria
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Interroga il contesto
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Per la configurazione completa (Postgres, Docker Compose, Dashboard, integrazione MCP), vedi [docs/getting-started.md](getting-started.md).

## Architettura

```text
                       ┌─────────────────────────────────────────────┐
   MCP clients ──────► │ apps/api  (REST + auth + rate limit + logs) │
   (Claude Code,       │   ├── context router (memory/web/repo/tool) │
    Cursor, Qwen,      │   ├── context composer                      │
    Dify, Hermes...)   │   ├── governance + audit                    │
                       │   ├── eval runner                           │
                       │   └── MIF import/export                     │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adapter     packages/search
           (incremental        (version-probed,        (BM25 / hybrid
            persistence)        degraded-mode safe)     pluggable)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   protected by Basic Auth   │
                       │   memory · traces · eval    │
                       │   governance review queue   │
                       └─────────────────────────────┘
```

Per i dettagli, vedi [docs/architecture.md](architecture.md).

## Cosa c'è in v0.4.0-alpha

| Funzionalità | Stato | Dove |
|---|---|---|
| API REST con autenticazione tramite chiave API (reader/writer/admin) | ✅ Produzione | `apps/api` |
| Server MCP stdio (trasporto legacy + SDK ufficiale) | ✅ Produzione | `apps/mcp-server` |
| Dashboard Next.js con HTTP Basic Auth | ✅ Produzione | `apps/dashboard` |
| Persistenza incrementale Postgres + pgvector | ✅ Opzionale | `apps/api/src/db/` |
| State machine di governance + audit log | ✅ Produzione | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Produzione | `packages/eval` |
| Import/export MIF v0.2 con `supersedes` + `contradicts` | ✅ Produzione | `packages/mif` |
| Adapter `agentmemory` con probe di versione + modalità degradata | ✅ Produzione | `packages/agentmemory-adapter` |
| Limite di frequenza (per IP + per chiave con backoff) | ✅ Produzione | `apps/api` |
| Logging JSON strutturato con redazione dei campi sensibili | ✅ Produzione | `apps/api/src/logger.ts` |
| Deployment privato con Docker Compose | ✅ Produzione | `docker-compose.yml` |
| Dataset demo + smoke test + test UI Playwright | ✅ Produzione | `examples/`, `scripts/` |
| Sincronizzazione cloud multi-tenant ospitata | ⏳ Roadmap | — |

Vedi [CHANGELOG.md](CHANGELOG.md) per le note di rilascio complete di v0.4.0-alpha.

## Integrazioni

Lore Context parla MCP e REST e si integra con la maggior parte degli IDE per agenti e i frontend di chat:

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
| Altro / MCP generico | [docs/integrations/README.md](integrations.md) |

## Deployment

| Modalità | Usare quando | Doc |
|---|---|---|
| **File locale** | Sviluppo individuale, prototipo, smoke testing | Questo README, Avvio rapido sopra |
| **Postgres+pgvector locale** | Nodo singolo di livello produzione, ricerca semantica su larga scala | [docs/deployment/README.md](deployment.md) |
| **Docker Compose privato** | Deployment team self-hosted, rete isolata | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Cloud gestito** | In arrivo in v0.6 | — |

Tutti i percorsi di deployment richiedono secret espliciti: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. Lo script `scripts/check-env.mjs` rifiuta l'avvio in produzione se qualsiasi valore corrisponde a un pattern segnaposto.

## Sicurezza

v0.4.0-alpha implementa una postura di difesa in profondità appropriata per deployment alpha non pubblici:

- **Autenticazione**: token bearer con chiave API con separazione dei ruoli (`reader`/`writer`/`admin`) e scoping per progetto. La modalità chiavi vuote fallisce in modo chiuso in produzione.
- **Limite di frequenza**: doppio bucket per IP + per chiave con backoff in caso di errori di autenticazione (429 dopo 5 fallimenti in 60s, blocco di 30s).
- **Dashboard**: middleware HTTP Basic Auth. Rifiuta di avviarsi in produzione senza `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Container**: tutti i Dockerfile eseguono come utente non-root `node`; HEALTHCHECK su api + dashboard.
- **Secret**: zero credenziali hardcoded; tutti i valori predefiniti sono variabili obbligatorie o che falliscono. `scripts/check-env.mjs` rifiuta i valori segnaposto in produzione.
- **Governance**: scansione regex PII / chiave API / JWT / chiave privata sulle scritture; contenuto con tag di rischio automaticamente instradato alla coda di revisione; audit log immutabile su ogni transizione di stato.
- **Avvelenamento della memoria**: rilevamento euristico su pattern di consenso + verbo imperativo.
- **MCP**: validazione dello schema zod su ogni input degli strumenti; gli strumenti mutanti richiedono `reason` (≥8 caratteri) e mostrano `destructiveHint: true`; gli errori upstream vengono sanitizzati prima del ritorno al client.
- **Logging**: JSON strutturato con auto-redazione dei campi `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Segnalazione vulnerabilità: [SECURITY.md](SECURITY.md).

## Struttura del progetto

```text
apps/
  api/                # API REST + Postgres + governance + eval (TypeScript)
  dashboard/          # Dashboard Next.js 16 con middleware Basic Auth
  mcp-server/         # Server MCP stdio (trasporti legacy + SDK ufficiale)
  web/                # Renderer HTML lato server (UI di fallback senza JS)
  website/            # Sito di marketing (gestito separatamente)
packages/
  shared/             # Tipi condivisi, errori, utilità ID/token
  agentmemory-adapter # Bridge verso agentmemory upstream + probe di versione
  search/             # Provider di ricerca modulari (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + primitive metriche
  governance/         # State machine + scansione rischi + avvelenamento + audit
docs/
  i18n/<lang>/        # README localizzato in 17 lingue
  integrations/       # 11 guide di integrazione agente-IDE
  deployment/         # Locale + Postgres + Docker Compose
  legal/              # Privacy / Termini / Cookie (legge singaporiana)
scripts/
  check-env.mjs       # Validazione env in modalità produzione
  smoke-*.mjs         # Smoke test end-to-end
  apply-postgres-schema.mjs
```

## Requisiti

- Node.js `>=22`
- pnpm `10.30.1`
- (Opzionale) Postgres 16 con pgvector per memoria di qualità ricerca semantica

## Contribuire

I contributi sono benvenuti. Leggi [CONTRIBUTING.md](CONTRIBUTING.md) per il flusso di lavoro di sviluppo, il protocollo dei messaggi di commit e le aspettative di revisione.

Per le traduzioni della documentazione, vedi la [guida ai contributi i18n](../README.md).

## Gestito da

Lore Context è gestito da **REDLAND PTE. LTD.** (Singapore, UEN 202304648K). Il profilo aziendale, i termini legali e la gestione dei dati sono documentati in [`docs/legal/`](../../legal/).

## Licenza

Il repository Lore Context è concesso in licenza sotto [Apache License 2.0](../../../LICENSE). I singoli package in `packages/*` dichiarano MIT per abilitare il consumo downstream. Vedi [NOTICE](../../../NOTICE) per l'attribuzione upstream.

## Riconoscimenti

Lore Context è costruito su [agentmemory](https://github.com/agentmemory/agentmemory) come runtime di memoria locale. I dettagli del contratto upstream e la policy di compatibilità delle versioni sono documentati in [UPSTREAM.md](../../../UPSTREAM.md).
